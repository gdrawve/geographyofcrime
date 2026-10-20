"""
build_basemap.py
================

The street map itself now comes from OpenFreeMap tiles. This script
only gathers neighborhood names from OpenStreetMap, so the site can say
"Top hot spot: near Westport" instead of giving coordinates.

Output:  public/data/places.json   ([{name, lon, lat}, ...])
Run:     python scripts/build_basemap.py

Place names © OpenStreetMap contributors (ODbL).
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_crime_grid import CITY  # same extent as the crime map

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "places.json"
SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

# Well-known places OpenStreetMap doesn't tag as a named place node.
MANUAL = [
    {"name": "Downtown", "lon": -94.5810, "lat": 39.1000},
    {"name": "18th & Vine", "lon": -94.5620, "lat": 39.0911},
    {"name": "Crown Center", "lon": -94.5812, "lat": 39.0828},
    {"name": "Country Club Plaza", "lon": -94.5925, "lat": 39.0422},
    {"name": "Swope Park", "lon": -94.5240, "lat": 39.0100},
]


def overpass(query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for url in SERVERS:
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": "geographyofcrime.com places"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as err:  # try the next server
            last = err
            print(f"  {url} failed: {err}", file=sys.stderr)
    raise SystemExit(f"Overpass unavailable: {last}")


def main():
    w, s, e, n = CITY["bbox"]
    q = f"""
    [out:json][timeout:120];
    node["place"~"^(suburb|neighbourhood|quarter)$"]["name"]({s},{w},{n},{e});
    out;
    """
    print("Downloading neighborhood names …", file=sys.stderr)
    places, seen = [], set()
    for m in MANUAL:
        places.append(m); seen.add(m["name"].lower())
    for el in overpass(q)["elements"]:
        name = el.get("tags", {}).get("name", "").strip()
        if name and name.lower() not in seen:
            places.append({"name": name, "lon": round(el["lon"], 5), "lat": round(el["lat"], 5)})
            seen.add(name.lower())
    OUT.write_text(json.dumps({"attribution": "© OpenStreetMap contributors", "places": places}, separators=(",", ":")))
    print(f"Wrote {OUT} ({len(places)} places)", file=sys.stderr)


if __name__ == "__main__":
    main()
