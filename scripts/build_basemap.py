"""
build_basemap.py
================

Builds a light reference basemap for the crime map so viewers can tell
where they are: the Missouri River, major roads, and a few neighborhood
names. Data comes from OpenStreetMap through the Overpass API.

Output:  public/data/basemap.json  (small, simplified lines + labels)

Run:     python scripts/build_basemap.py
         (uses the same map extent as build_crime_grid.py)

Map data © OpenStreetMap contributors, available under the Open
Database License (ODbL). The credit appears on the map.
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import LineString, box
from shapely.ops import linemerge

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_crime_grid import CITY  # same extent as the crime map

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "basemap.json"
SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

# Neighborhood labels to show, if OpenStreetMap has a place with that
# name inside the extent. A short, curated list keeps the map readable.
LABELS = [
    "Downtown", "River Market", "Crossroads", "Crown Center", "Westport",
    "Country Club Plaza", "Midtown", "Brookside", "Waldo", "Northeast",
    "18th and Vine", "Swope Park", "Union Hill", "Marlborough", "Hyde Park",
    "Longfellow", "Ivanhoe", "Blue Hills", "Raytown", "Independence",
]


# Well-known places OpenStreetMap doesn't tag as a named place node.
MANUAL_LABELS = [
    {"name": "Downtown", "lon": -94.5810, "lat": 39.1000, "kind": "place"},
    {"name": "18th & Vine", "lon": -94.5620, "lat": 39.0911, "kind": "place"},
    {"name": "Crown Center", "lon": -94.5812, "lat": 39.0828, "kind": "place"},
]


def overpass(query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for url in SERVERS:
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": "geographyofcrime.com basemap"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as err:          # try the next server
            last = err
            print(f"  {url} failed: {err}", file=sys.stderr)
    raise SystemExit(f"Overpass unavailable: {last}")


def main():
    w, s, e, n = CITY["bbox"]
    frame = box(w, s, e, n)
    bb = f"{s},{w},{n},{e}"  # Overpass order: south, west, north, east
    q = f"""
    [out:json][timeout:120];
    (
      way["highway"~"^(motorway|trunk|primary)$"]({bb});
      way["waterway"="river"]({bb});
      node["place"~"^(suburb|neighbourhood|quarter|town|city)$"]["name"]({bb});
      node["leisure"="park"]["name"="Swope Park"]({bb});
      way["leisure"="park"]["name"="Swope Park"]({bb});
    );
    out geom tags;
    """
    print("Downloading OpenStreetMap features …", file=sys.stderr)
    data = overpass(q)

    roads = {"motorway": [], "trunk": [], "primary": []}
    rivers, labels, seen = [], [], set()
    for el in data["elements"]:
        t = el.get("tags", {})
        if el["type"] == "way" and "geometry" in el:
            line = LineString([(p["lon"], p["lat"]) for p in el["geometry"]]).intersection(frame)
            if line.is_empty:
                continue
            if t.get("waterway") == "river":
                rivers.append(line)
            elif t.get("highway") in roads:
                roads[t["highway"]].append(line)
            elif t.get("name") == "Swope Park" and "Swope Park" not in seen:
                c = line.centroid
                labels.append({"name": "Swope Park", "lon": round(c.x, 5), "lat": round(c.y, 5), "kind": "park"})
                seen.add("Swope Park")
        elif el["type"] == "node":
            name = t.get("name", "")
            match = next((L for L in LABELS if L.lower() == name.lower()), None)
            if match and match not in seen:
                labels.append({"name": match, "lon": round(el["lon"], 5), "lat": round(el["lat"], 5), "kind": "place"})
                seen.add(match)

    for m in MANUAL_LABELS:
        if m["name"] not in seen and w <= m["lon"] <= e and s <= m["lat"] <= n:
            labels.append(m); seen.add(m["name"])

    def pack(lines, tol):
        """Merge, simplify (~tol degrees), and round to 5 decimals."""
        if not lines:
            return []
        merged = linemerge([g for l in lines for g in (getattr(l, "geoms", None) or [l])])
        out = []
        for g in getattr(merged, "geoms", [merged]):
            g = g.simplify(tol)
            if g.length > 0:
                out.append([[round(x, 5), round(y, 5)] for x, y in g.coords])
        return out

    payload = {
        "attribution": "© OpenStreetMap contributors",
        "river": pack(rivers, 0.0003),
        "motorway": pack(roads["motorway"], 0.0002),
        "trunk": pack(roads["trunk"], 0.0002),
        "primary": pack(roads["primary"], 0.0002),
        "labels": labels,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(labels)} labels)", file=sys.stderr)


if __name__ == "__main__":
    main()
