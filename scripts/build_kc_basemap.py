"""
Central Kansas City base map for the home-page hex graphic.

Downloads Census TIGER/Line roads and water for Jackson and Clay
counties, Missouri, and Wyandotte and Johnson counties, Kansas, clips them to central Kansas City (the Missouri
River south past the Country Club Plaza), simplifies, projects to a
flat drawing grid, and writes src/data/kc-basemap.json. The home page
draws the roads and river as a faint SVG under the crime hexagons.

  • Highways (MTFCC S1100) and major roads (S1200)
  • Local streets (S1400), very faint, for the street-grid texture
  • Rivers and lakes (Missouri River, Brush Creek …)

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
from shapely.geometry import box, shape
from shapely.ops import unary_union

YEAR = 2024
# Jackson and Clay (Missouri = 29), plus Wyandotte and Johnson (Kansas = 20):
# the west edge of the frame is Kansas City, Kansas, and the rivers meet there.
COUNTIES = ["29095", "29047", "20209", "20091"]
# Must match HERO_BBOX in src/components/KcHero.astro: [west, south, east, north].
BBOX = (-94.665, 39.012, -94.505, 39.128)
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "kc-basemap.json"
WIDTH = 1000
BASE = f"https://www2.census.gov/geo/tiger/TIGER{YEAR}"

W, S, E, N = BBOX
K = math.cos(math.radians((S + N) / 2))
SCALE = WIDTH / ((E - W) * K)
HEIGHT = round((N - S) * SCALE)
frame = box(*BBOX)


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


def to_xy(lon: float, lat: float) -> tuple[int, int]:
    # Whole drawing units: invisible at this size, much smaller file.
    return round((lon - W) * K * SCALE), round((N - lat) * SCALE)


def path_d(geom, tol: float) -> str:
    g = geom.intersection(frame).simplify(tol, preserve_topology=True)
    parts = []

    def ring(coords, close):
        pts = []
        for x, y in coords:
            p = to_xy(x, y)
            if not pts or p != pts[-1]:
                pts.append(p)
        if len(pts) > 1:
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

    if not g.is_empty:
        walk(g)
    return "".join(parts)


def main() -> None:
    hwy, major, local, water = [], [], [], []
    for c in COUNTIES:
        for rec, geom in read_zip(f"{BASE}/ROADS/tl_{YEAR}_{c}_roads.zip"):
            if not geom.intersects(frame):
                continue
            m = rec.get("MTFCC")
            if m == "S1100":
                hwy.append(geom)
            elif m == "S1200":
                major.append(geom)
            elif m == "S1400":
                local.append(geom)
        for rec, geom in read_zip(f"{BASE}/AREAWATER/tl_{YEAR}_{c}_areawater.zip"):
            if geom.intersects(frame) and float(rec.get("AWATER") or 0) > 20_000:
                water.append(geom)

    out = {
        "source": f"U.S. Census Bureau TIGER/Line {YEAR}: roads and area water (Jackson and Clay counties, MO; Wyandotte and Johnson counties, KS)",
        "bbox": BBOX,
        "width": WIDTH,
        "height": HEIGHT,
        "water": path_d(unary_union(water), 0.0003) if water else "",
        "local": path_d(unary_union(local), 0.0004) if local else "",
        "major": path_d(unary_union(major), 0.0003) if major else "",
        "highways": path_d(unary_union(hwy), 0.0003) if hwy else "",
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    sizes = ", ".join(f"{k} {len(out[k]) // 1024} KB" for k in ("water", "local", "major", "highways"))
    print(f"Wrote {OUT} ({WIDTH}×{HEIGHT}; {sizes})", file=sys.stderr)


if __name__ == "__main__":
    main()
