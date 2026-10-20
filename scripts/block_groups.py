"""
block_groups.py
===============

Joins crime incidents to Census block groups, the neighborhood-sized
areas (roughly 600 to 3,000 residents each) the Census Bureau reports
data for. Used by build_crime_grid.py.

WHAT IT DOES
------------
1. Downloads block-group boundaries (TIGER/Line) for the city's state,
   keeps the counties the city sits in, and keeps only block groups
   whose center falls inside the city limits.
2. Downloads each block group's population from the American Community
   Survey (ACS 5-year), so the site can show rates, not just counts.
3. Drops every incident into the block group that contains it (a
   "point-in-polygon" spatial join, the same thing ArcGIS's Spatial
   Join tool does).
4. Simplifies the boundaries so the file stays small enough for phones,
   and writes  public/data/crime-bg.json .

WHY RATES MATTER
----------------
A block group with 40 incidents and 500 residents is very different
from one with 40 incidents and 3,000 residents. Counts show where crime
is; rates show where risk to residents is higher. Rates mislead where
few people live (parks, industrial areas, downtown), so the site flags
block groups under 200 residents instead of ranking them.

Needs:  pip install shapely pyshp
"""

import io
import json
import os
import random
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

import shapefile                      # pyshp: reads .shp files
from shapely.geometry import Point, shape, box, MultiPoint
from shapely.ops import voronoi_diagram
from shapely.strtree import STRtree

UA = {"User-Agent": "geographyofcrime.com data refresh"}
MIN_POP_FOR_RATE = 200


def _get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()


def _read_zipped_shapefile(url: str):
    """Download a zipped shapefile and yield (attributes, shapely geometry)."""
    z = zipfile.ZipFile(io.BytesIO(_get(url)))
    stem = [n for n in z.namelist() if n.endswith(".shp")][0][:-4]
    rdr = shapefile.Reader(shp=io.BytesIO(z.read(stem + ".shp")),
                           dbf=io.BytesIO(z.read(stem + ".dbf")),
                           shx=io.BytesIO(z.read(stem + ".shx")))
    fields = [f[0] for f in rdr.fields[1:]]
    for sr in rdr.iterShapeRecords():
        yield dict(zip(fields, sr.record)), shape(sr.shape.__geo_interface__)


def load_census(bg_cfg: dict, bbox: list[float] | None = None) -> list[dict]:
    """Block groups inside the city (and the map extent, if given), with population."""
    st, year = bg_cfg["state"], bg_cfg["tiger_year"]
    base = f"https://www2.census.gov/geo/tiger/TIGER{year}"

    # City limits: the Census "place" polygon for the city.
    print("  downloading city boundary …", file=sys.stderr)
    city = next(g for a, g in _read_zipped_shapefile(f"{base}/PLACE/tl_{year}_{st}_place.zip")
                if a["PLACEFP"] == bg_cfg["place"])

    print("  downloading block groups …", file=sys.stderr)
    bgs = []
    for a, g in _read_zipped_shapefile(f"{base}/BG/tl_{year}_{st}_bg.zip"):
        pt = g.representative_point()
        in_extent = bbox is None or (bbox[0] <= pt.x <= bbox[2] and bbox[1] <= pt.y <= bbox[3])
        if a["COUNTYFP"] in bg_cfg["counties"] and city.contains(pt) and in_extent:
            bgs.append({"id": a["GEOID"], "geom": g, "pop": None})

    # Population: ACS table B01003 (total population), one county at a time.
    # Spaces must be sent as %20 (not "+"). A free key from
    # api.census.gov/data/key_signup.html, saved as the GitHub secret
    # CENSUS_API_KEY, raises the request limit. If the Census API fails,
    # the map still works: counts show, and rates are switched off.
    print("  downloading ACS population …", file=sys.stderr)
    pop = {}
    key = os.environ.get("CENSUS_API_KEY")
    for county in bg_cfg["counties"]:
        params = {"get": "B01003_001E", "for": "block group:*",
                  "in": f"state:{st} county:{county} tract:*"}
        if key:
            params["key"] = key
        url = f"https://api.census.gov/data/{bg_cfg['acs_year']}/acs/acs5?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        try:
            body = _get(url)
            rows = json.loads(body)
        except Exception as err:
            snippet = locals().get("body", b"")[:200]
            print(f"  ACS request failed for county {county}: {err} {snippet!r}", file=sys.stderr)
            continue
        head = rows[0]
        for r in rows[1:]:
            d = dict(zip(head, r))
            pop[d["state"] + d["county"] + d["tract"] + d["block group"]] = int(d["B01003_001E"])
    print(f"  population found for {len(pop):,} block groups", file=sys.stderr)
    for b in bgs:
        b["pop"] = pop.get(b["id"])
    print(f"  kept {len(bgs)} block groups inside the city", file=sys.stderr)
    return bgs


def demo_block_groups(bbox: list[float], n: int = 140, seed: int = 7) -> list[dict]:
    """Fake 'block groups' for the demo city: irregular cells from random seeds."""
    rnd = random.Random(seed)
    w, s, e, nn = bbox
    seeds = MultiPoint([(w + rnd.random() * (e - w), s + rnd.random() * (nn - s)) for _ in range(n)])
    frame = box(w, s, e, nn)
    cells = [c.intersection(frame) for c in voronoi_diagram(seeds, envelope=frame).geoms]
    return [{"id": f"DEMO{i:03d}", "geom": c, "pop": rnd.randrange(150, 3200)} for i, c in enumerate(cells) if not c.is_empty]


def join(incidents: list[tuple], bgs: list[dict], slots_of) -> None:
    """
    Point-in-polygon join. An STRtree is a spatial index: it checks only
    the few block groups near each point instead of all of them.
    `slots_of(incident)` returns the count slot for an incident.
    """
    tree = STRtree([b["geom"] for b in bgs])
    for b in bgs:
        b["counts"] = {}
    unmatched = 0
    for inc in incidents:
        lat, lon = inc[0], inc[1]
        hits = tree.query(Point(lon, lat), predicate="intersects")
        if len(hits) == 0:
            unmatched += 1
            continue
        c = bgs[hits[0]]["counts"]
        slot = slots_of(inc)
        c[slot] = c.get(slot, 0) + 1
    print(f"  joined to block groups; {unmatched:,} incidents fell outside them", file=sys.stderr)


def write(bgs: list[dict], out: Path, meta: dict) -> None:
    """Simplify (~25 m tolerance) and write compact JSON."""
    feats = []
    for b in bgs:
        g = b["geom"].simplify(0.00025, preserve_topology=True)
        polys = [g] if g.geom_type == "Polygon" else list(getattr(g, "geoms", []))
        rings = [[[round(x, 5), round(y, 5)] for x, y in p.exterior.coords] for p in polys if p.geom_type == "Polygon"]
        counts = []
        for slot in sorted(b["counts"]):
            counts += [slot, b["counts"][slot]]
        feats.append({"id": b["id"], "pop": b["pop"], "rings": rings, "counts": counts})
    out.write_text(json.dumps({"meta": {**meta, "minPopForRate": MIN_POP_FOR_RATE}, "bgs": feats},
                              separators=(",", ":")))
    print(f"Wrote {out} ({out.stat().st_size / 1024:.0f} KB, {len(feats)} block groups)", file=sys.stderr)
