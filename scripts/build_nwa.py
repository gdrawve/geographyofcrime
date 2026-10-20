"""
Northwest Arkansas base map for the home-page graphic.

Downloads Census TIGER/Line layers for Benton and Washington counties
(roads, lakes, city boundaries), keeps the parts the graphic needs,
simplifies them, projects them to a flat drawing grid, and writes
src/data/nwa-basemap.json. The home page draws it as an SVG, so the
graphic is crisp at any size and needs no map tiles.

  • I-49 and other interstates/US highways (TIGER MTFCC S1100)
  • Major roads (S1200), drawn faintly for texture
  • Lakes larger than ~1 km² (Beaver Lake, Lake Fayetteville …)
  • City limits of Bentonville, Rogers, Springdale, Fayetteville

Run by .github/workflows/nwa-basemap.yml (manual). Python 3.12, shapely, pyshp.
"""

from __future__ import annotations

import io
import json
import math
import sys
import urllib.request
import zipfile
from pathlib import Path

import shapefile  # pyshp
from shapely.geometry import box, shape, mapping
from shapely.ops import unary_union

YEAR = 2024
COUNTIES = ["05007", "05143"]                     # Benton, Washington (Arkansas = 05)
BBOX = (-94.40, 35.98, -93.88, 36.50)            # west, south, east, north
CITIES = ["Bentonville", "Rogers", "Springdale", "Fayetteville"]
# Dots sit on each downtown (town square or main street), not the middle
# of the city limits. (lon, lat)
DOWNTOWNS = {
    "Bentonville": (-94.2088, 36.3729),   # Bentonville Square
    "Rogers": (-94.1185, 36.3320),        # Historic downtown Rogers
    "Springdale": (-94.1288, 36.1867),    # Emma Avenue
    "Fayetteville": (-94.1574, 36.0626),  # Fayetteville Square
}
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "nwa-basemap.json"
WIDTH = 1000                                     # drawing units across

BASE = f"https://www2.census.gov/geo/tiger/TIGER{YEAR}"


def read_zip(url: str):
    print(f"  {url}", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": "geographyofcrime.com"})
    with urllib.request.urlopen(req, timeout=180) as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    stem = [n for n in z.namelist() if n.endswith(".shp")][0][:-4]
    rd = shapefile.Reader(shp=io.BytesIO(z.read(stem + ".shp")), dbf=io.BytesIO(z.read(stem + ".dbf")))
    names = [f[0] for f in rd.fields[1:]]
    for sr in rd.iterShapeRecords():
        yield dict(zip(names, sr.record)), shape(sr.shape.__geo_interface__)


# Equirectangular projection scaled by cos(latitude): fine at this scale.
W, S, E, N = BBOX
K = math.cos(math.radians((S + N) / 2))
SCALE = WIDTH / ((E - W) * K)
HEIGHT = round((N - S) * SCALE)
frame = box(*BBOX)


def to_xy(lon: float, lat: float) -> tuple[float, float]:
    return round((lon - W) * K * SCALE, 1), round((N - lat) * SCALE, 1)


def path_d(geom, tol: float) -> str:
    """SVG path data for a (multi)line or (multi)polygon, simplified."""
    g = geom.intersection(frame).simplify(tol, preserve_topology=True)
    if g.is_empty:
        return ""
    parts = []
    def ring(coords, close):
        pts = [to_xy(x, y) for x, y in coords]
        if len(pts) < 2:
            return
        parts.append("M" + " L".join(f"{x},{y}" for x, y in pts) + ("Z" if close else ""))
    def walk(h):
        t = h.geom_type
        if t == "LineString":
            ring(h.coords, False)
        elif t == "Polygon":
            ring(h.exterior.coords, True)
            for i in h.interiors:
                ring(i.coords, True)
        elif hasattr(h, "geoms"):
            for x in h.geoms:
                walk(x)
    walk(g)
    return " ".join(parts)


def main() -> None:
    interstates, highways, major = [], [], []
    water = []
    for c in COUNTIES:
        for rec, geom in read_zip(f"{BASE}/ROADS/tl_{YEAR}_{c}_roads.zip"):
            name = (rec.get("FULLNAME") or "").strip()
            if rec.get("MTFCC") == "S1100":
                (interstates if name.startswith("I-") else highways).append(geom)
            elif rec.get("MTFCC") == "S1200" and geom.length > 0.03:
                # Only longer arterials (~3 km+): enough texture, small file.
                major.append(geom)
        for rec, geom in read_zip(f"{BASE}/AREAWATER/tl_{YEAR}_{c}_areawater.zip"):
            if float(rec.get("AWATER") or 0) > 1_000_000:   # lakes over ~1 km²
                water.append(geom)

    cities = {}
    for rec, geom in read_zip(f"{BASE}/PLACE/tl_{YEAR}_05_place.zip"):
        if rec.get("NAME") in CITIES:
            cities[rec["NAME"]] = geom

    out = {
        "source": f"U.S. Census Bureau TIGER/Line {YEAR}: roads, area water, places (Benton and Washington counties, AR)",
        "width": WIDTH,
        "height": HEIGHT,
        "bbox": BBOX,
        "water": path_d(unary_union(water), 0.0012) if water else "",
        "major": path_d(unary_union(major), 0.003) if major else "",
        "highways": path_d(unary_union(highways), 0.001) if highways else "",
        "interstate": path_d(unary_union(interstates), 0.0008) if interstates else "",
        "lakeLabel": to_xy(-94.03, 36.33),     # Beaver Lake, for the label
        "cities": [
            {
                "name": n,
                "outline": path_d(g, 0.001),
                "x": to_xy(*DOWNTOWNS[n])[0],
                "y": to_xy(*DOWNTOWNS[n])[1],
            }
            for n, g in sorted(cities.items(), key=lambda kv: -kv[1].centroid.y)
        ],
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(out['cities'])} cities, {WIDTH}×{HEIGHT})", file=sys.stderr)


if __name__ == "__main__":
    main()
