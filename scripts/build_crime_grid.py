"""
build_crime_grid.py
===================

WHAT THIS DOES (the short version)
----------------------------------
1. Downloads the last 12 months of crime incidents from a city's open
   data API.
2. Sorts each incident into a category (Violent, Property, ...), a time
   of day, and weekday vs. weekend.
3. Drops every incident onto a fine grid (a fishnet of small squares,
   150 m by default) and counts how many land in each square.
4. Saves ONLY those counts to  public/data/crime-grid.json .

The website reads that file to draw the Points, Fishnet, and Hot spot
views, and to run the filters. No exact incident locations are ever
published: the smallest unit anyone can see is one grid square.

HOW TO RUN IT
-------------
    python scripts/build_crime_grid.py            # uses the CITY config below
    python scripts/build_crime_grid.py --demo     # fake city, no internet needed

A GitHub Action runs this weekly (see .github/workflows/refresh-data.yml),
so normally you never run it by hand.

TO SWITCH CITIES
----------------
Edit the CITY dictionary below. Everything else adapts.

Only Python's standard library is used, so there is nothing to install.
"""

import argparse
import json
import math
import os
import random
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# ─────────────────────────────────────────────────────────────────────
# 1. CITY CONFIGURATION  ← the only part you normally edit
# ─────────────────────────────────────────────────────────────────────
# Kansas City, MO. KCPD publishes one dataset per calendar year
# ("KCPD Crime Data 2025", "KCPD Crime Data 2026", ...), so instead of
# one fixed endpoint the script looks up each year's dataset by name.
# That means nothing needs editing when January rolls around.
CITY = {
    "name": "Kansas City, MO",
    "source": "Kansas City Missouri Police Department via KC Open Data",
    "source_url": "https://data.kcmo.org/browse?q=KCPD%20Crime%20Data",

    # Which kind of API the city uses:
    #   "socrata"        → one dataset: data.<city>.gov/resource/xxxx-xxxx.json
    #   "socrata_yearly" → one Socrata dataset per year, found by name
    #   "arcgis"         → URLs ending in /FeatureServer/0 (Esri Hub portals)
    "api": "socrata_yearly",
    "domain": "data.kcmo.org",
    "dataset_name": "KCPD Crime Data {year}",

    # Column names in THAT city's dataset.
    "fields": {
        "date": "from_date",     # when the offense began (not when reported)
        "point": "location",     # a GeoJSON point holding longitude/latitude
        "offense": "ibrs",       # the NIBRS offense code, e.g. 120 = robbery
        "id": "report",          # report number, used to remove duplicates
    },
    "offense_is_nibrs": True,

    # Map extent: [west, south, east, north]. The whole city; the map
    # can pan and zoom, and it opens on the urban core.
    "bbox": [-94.62, 38.81, -94.37, 39.36],
    "extent_note": "Kansas City, Missouri",

    # How many months back to pull. The map shows the latest 12; the
    # Kansas City page needs two full years for trends and
    # year-over-year change, plus a month of slack for reporting lag.
    "months": 26,
    "map_months": 12,

    # Census block groups for the Neighborhoods view. FIPS codes:
    # Missouri = 29; Jackson 095, Clay 047, Platte 165, Cass 037;
    # Kansas City (place) = 38000. Set to None to skip.
    "block_groups": {
        "state": "29",
        "counties": ["095", "047", "165", "037"],
        "place": "38000",
        "tiger_year": 2024,
        "acs_year": 2023,
    },
}

# When a city publishes NIBRS codes, we categorize by code instead of by
# keyword. Codes come from the FBI's NIBRS offense list.
NIBRS = {
    "Violent":   {"09A", "09B", "09C", "100", "11A", "11B", "11C", "11D", "120", "13A", "13B", "13C", "36A", "36B", "64A", "64B"},
    "Vehicle":   {"240", "23F", "23G"},   # vehicle theft, theft from and of parts
    "Burglary":  {"220"},
    "Theft":     {"23A", "23B", "23C", "23D", "23E", "23H"},
    "Vandalism": {"290"},                 # destruction / damage / vandalism of property
    "Drugs & weapons": {"35A", "35B", "520"},
    "Fraud":     {"26A", "26B", "26C", "26D", "26E", "26F", "26G", "26H", "250", "270"},
}

# Offense → category. Matching is by keyword, case-insensitive, so
# "MOTOR VEHICLE THEFT" matches "VEHICLE" before it matches "THEFT".
# Order matters: the FIRST category with a matching keyword wins.
CATEGORIES = [
    ("Violent",   ["HOMICIDE", "MURDER", "ASSAULT", "BATTERY", "ROBBERY", "SEXUAL", "RAPE", "KIDNAP"]),
    ("Vehicle",   ["MOTOR VEHICLE", "VEHICLE THEFT", "AUTO THEFT", "CARJACK"]),
    ("Burglary",  ["BURGLARY", "BREAKING", "B&E"]),
    ("Theft",     ["THEFT", "LARCENY", "SHOPLIFT", "PICKPOCKET"]),
    ("Vandalism", ["VANDALISM", "DESTRUCTION", "DAMAGE", "CRIMINAL DAMAGE"]),
    ("Drugs & weapons", ["NARCOTIC", "DRUG", "WEAPON"]),
    ("Fraud",     ["FRAUD", "FORGERY", "COUNTERFEIT", "EMBEZZLE", "DECEPTIVE", "IDENTITY"]),
    ("Other",     []),  # everything that matched nothing above
]

# Time-of-day bands (24-hour clock, start inclusive, end exclusive).
BANDS = [
    ("Overnight", 0, 6),
    ("Morning", 6, 12),
    ("Afternoon", 12, 18),
    ("Evening", 18, 24),
]

CELL_METERS = 150          # size of the fine grid squares
OUT_FILE = Path(__file__).resolve().parent.parent / "public" / "data" / "crime-grid.json"
BG_FILE = OUT_FILE.with_name("crime-bg.json")
PLACES_FILE = OUT_FILE.with_name("places.json")
# Read by the Kansas City page when the site builds, so it lives in src/.
STATS_FILE = Path(__file__).resolve().parent.parent / "src" / "data" / "kc-stats.json"
PAGE_SIZE = 50_000         # rows per API request


# ─────────────────────────────────────────────────────────────────────
# 2. DOWNLOADING
# ─────────────────────────────────────────────────────────────────────
def fetch_json(url: str) -> object:
    """GET a URL and parse the JSON response."""
    headers = {"User-Agent": "geographyofcrime.com data refresh"}
    # Socrata allows more requests with a free "app token". If you make
    # one, store it as a GitHub secret named SOCRATA_APP_TOKEN.
    token = os.environ.get("SOCRATA_APP_TOKEN")
    if token:
        headers["X-App-Token"] = token
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def fetch_socrata(cfg: dict, since: date) -> list[dict]:
    """
    Socrata APIs speak "SoQL", a small SQL-like language in the URL.
    We ask for only the 4 columns we need, only rows after `since`,
    and page through 50,000 rows at a time until nothing comes back.
    """
    f = cfg["fields"]
    rows, offset = [], 0
    while True:
        params = {
            "$select": f"{f['date']},{f['lat']},{f['lon']},{f['offense']}",
            "$where": f"{f['date']} >= '{since.isoformat()}T00:00:00' AND {f['lat']} IS NOT NULL",
            "$order": ":id",          # stable order so paging never skips rows
            "$limit": PAGE_SIZE,
            "$offset": offset,
        }
        url = cfg["endpoint"] + "?" + urllib.parse.urlencode(params)
        page = fetch_json(url)
        rows.extend(page)
        print(f"  fetched {len(rows):,} rows", file=sys.stderr)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def find_yearly_dataset(cfg: dict, year: int) -> str | None:
    """Look up a dataset's ID by its exact name using the Socrata catalog."""
    name = cfg["dataset_name"].format(year=year)
    url = f"https://{cfg['domain']}/api/catalog/v1?" + urllib.parse.urlencode(
        {"q": name, "only": "datasets", "domains": cfg["domain"], "limit": 20})
    for r in fetch_json(url).get("results", []):
        if r["resource"]["name"].strip().lower() == name.lower():
            return r["resource"]["id"]
    return None


def fetch_socrata_yearly(cfg: dict, since: date) -> list[dict]:
    """
    Pull every yearly dataset that overlaps the window (usually this year
    and last year), then flatten the GeoJSON point into lat/lon.
    """
    f = cfg["fields"]
    rows = []
    for year in range(since.year, date.today().year + 1):
        ds = find_yearly_dataset(cfg, year)
        if not ds:
            print(f"  no dataset found for {year}", file=sys.stderr)
            continue
        offset = 0
        while True:
            params = {
                "$select": f"{f['id']},{f['date']},{f['offense']},{f['point']}",
                "$where": f"{f['date']} >= '{since.isoformat()}T00:00:00' AND {f['point']} IS NOT NULL",
                "$order": ":id",
                "$limit": PAGE_SIZE,
                "$offset": offset,
            }
            page = fetch_json(f"https://{cfg['domain']}/resource/{ds}.json?" + urllib.parse.urlencode(params))
            for r in page:
                lon, lat = (r.get(f["point"]) or {}).get("coordinates", [None, None])
                rows.append({"id": r.get(f["id"]), "date": r.get(f["date"]),
                             "offense": r.get(f["offense"]), "lat": lat, "lon": lon})
            print(f"  {year}: fetched {len(rows):,} rows so far", file=sys.stderr)
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
    return rows


def fetch_arcgis(cfg: dict, since: date) -> list[dict]:
    """
    Esri FeatureServer APIs: the /query endpoint takes a SQL-ish `where`
    clause. outSR=4326 asks for plain latitude/longitude. Dates come back
    as milliseconds since 1970, which we convert later.
    """
    f = cfg["fields"]
    rows, offset = [], 0
    while True:
        params = {
            "where": f"{f['date']} >= DATE '{since.isoformat()}'",
            "outFields": f"{f['date']},{f['offense']}",
            "returnGeometry": "true",
            "outSR": 4326,
            "f": "json",
            "resultOffset": offset,
            "resultRecordCount": 2000,   # most Esri servers cap pages at 2,000
        }
        page = fetch_json(cfg["endpoint"].rstrip("/") + "/query?" + urllib.parse.urlencode(params))
        feats = page.get("features", [])
        for ft in feats:
            a, g = ft.get("attributes", {}), ft.get("geometry") or {}
            rows.append({f["date"]: a.get(f["date"]), f["offense"]: a.get(f["offense"]),
                         f["lat"]: g.get("y"), f["lon"]: g.get("x")})
        print(f"  fetched {len(rows):,} rows", file=sys.stderr)
        if not page.get("exceededTransferLimit") and len(feats) < 2000:
            return rows
        offset += len(feats)


# ─────────────────────────────────────────────────────────────────────
# 3. CLEANING AND CLASSIFYING
# ─────────────────────────────────────────────────────────────────────
def parse_when(value) -> datetime | None:
    """Accepts ISO text ("2026-03-04T21:15:00.000") or Esri epoch ms."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).replace(tzinfo=None)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "")[:19])
    except ValueError:
        return None


def categorize(offense: str, nibrs: bool = False) -> int:
    """Return the index of the first category whose keyword (or code) matches."""
    text = (offense or "").upper().strip()
    if nibrs:
        names = [c for c, _ in CATEGORIES]
        for cat, codes in NIBRS.items():
            if text in codes:
                return names.index(cat)
        return len(CATEGORIES) - 1
    for i, (_, keywords) in enumerate(CATEGORIES):
        if any(k in text for k in keywords):
            return i
    return len(CATEGORIES) - 1  # "Other"


def band_of(hour: int) -> int:
    for i, (_, start, end) in enumerate(BANDS):
        if start <= hour < end:
            return i
    return 0


# ─────────────────────────────────────────────────────────────────────
# 4. GRIDDING
# ─────────────────────────────────────────────────────────────────────
# Latitude/longitude are angles, not distances. To make square cells
# measured in meters, we convert each point to meters east and north of
# the box's south-west corner. At city scale, this simple conversion
# (an "equirectangular" projection) is accurate to well under 1%.
M_PER_DEG_LAT = 110_540


def to_meters(lat, lon, origin_lat, origin_lon, m_per_deg_lon):
    return (lon - origin_lon) * m_per_deg_lon, (lat - origin_lat) * M_PER_DEG_LAT


def grid_incidents(incidents: list[tuple], bbox: list[float]) -> dict:
    """
    incidents: list of (lat, lon, category_index, band_index, is_weekend)

    Each cell keeps a small array of counts, one slot per combination of
    category × time band × weekday/weekend. That lets the website filter
    instantly without ever needing the raw incidents.
    """
    west, south, east, north = bbox
    mid_lat = (south + north) / 2
    m_per_deg_lon = 111_320 * math.cos(math.radians(mid_lat))
    width_m, height_m = to_meters(north, east, south, west, m_per_deg_lon)
    cols, rows = math.ceil(width_m / CELL_METERS), math.ceil(height_m / CELL_METERS)

    slots = len(CATEGORIES) * len(BANDS) * 2
    cells = defaultdict(lambda: [0] * slots)
    # `*_` ignores any extra fields (the date) at the end of each tuple.
    for lat, lon, cat, band, weekend, *_ in incidents:
        x, y = to_meters(lat, lon, south, west, m_per_deg_lon)
        ix, iy = int(x // CELL_METERS), int(y // CELL_METERS)
        if 0 <= ix < cols and 0 <= iy < rows:
            # Slot layout: (category, band, weekend) flattened into one index.
            cells[(ix, iy)][(cat * len(BANDS) + band) * 2 + weekend] += 1

    # Compact "sparse" output. Most slots in most cells are zero, so we
    # write only the non-zero ones as (slot, count) pairs:
    #     [ix, iy, slot, count, slot, count, ...]
    # iy counts north from the bottom edge, like a map. This keeps a
    # big-city file small enough to load quickly on a phone.
    out = []
    for (ix, iy), counts in sorted(cells.items()):
        row = [ix, iy]
        for slot, c in enumerate(counts):
            if c:
                row += [slot, c]
        out.append(row)
    return {"cols": cols, "rows": rows, "cells": out}


# ─────────────────────────────────────────────────────────────────────
# 5. DEMO DATA (so the site works before a city is chosen)
# ─────────────────────────────────────────────────────────────────────
def demo_incidents() -> tuple[list[tuple], list[float]]:
    """
    A made-up 12 × 9 km city with realistic structure: a downtown, a
    nightlife strip, a shopping corridor, transit stops, and residential
    areas. Each crime type follows its own place and time pattern, so the
    filters show visibly different maps.
    """
    rnd = random.Random(1984)
    today = date.today()
    bbox = [-94.20, 36.02, -94.066, 36.10]  # roughly 12 × 9 km
    w, s, e, n = bbox

    def at(fx, fy, sd):
        return (s + (fy + rnd.gauss(0, sd)) * (n - s), w + (fx + rnd.gauss(0, sd * 0.75)) * (e - w))

    def hour_from(weights):  # weights over the 4 bands
        b = rnd.choices(range(4), weights)[0]
        return rnd.randrange(BANDS[b][1], BANDS[b][2])

    places = {
        "downtown":  (0.48, 0.55, 0.035),
        "nightlife": (0.53, 0.50, 0.012),
        "mall":      (0.78, 0.30, 0.018),
        "corridor":  None,  # handled as a line
        "transit1":  (0.30, 0.62, 0.010),
        "transit2":  (0.66, 0.70, 0.010),
        "apartments": (0.20, 0.25, 0.04),
    }
    out = []

    def add(n, cat, where, band_w, weekend_p):
        for _ in range(n):
            if where == "corridor":
                t = rnd.random()
                lat, lon = at(0.15 + t * 0.7, 0.20 + t * 0.15, 0.006)
            elif where == "anywhere":
                lat, lon = s + rnd.random() * (n_ - s), w + rnd.random() * (e - w)
            else:
                lat, lon = at(*places[where])
            hour = hour_from(band_w)
            weekend = int(rnd.random() < weekend_p)
            # A made-up date in the last two years that matches the
            # weekend flag, with a mild summer rise so trends have shape.
            while True:
                d = today - timedelta(days=rnd.randrange(1, 760))
                summer = 1 + 0.35 * math.cos((d.month - 7) / 12 * 2 * math.pi)
                if int(d.weekday() >= 5) == weekend and rnd.random() < summer / 1.35:
                    break
            when = datetime(d.year, d.month, d.day, hour, rnd.randrange(60))
            out.append((lat, lon, cat, band_of(hour), weekend, when))

    n_ = n
    V, VEH, BUR, TH, OTH = range(5)
    add(700, V, "nightlife", [4, 1, 1, 6], 0.55)
    add(350, V, "downtown", [2, 1, 2, 3], 0.4)
    add(300, V, "apartments", [2, 1, 2, 3], 0.35)
    add(900, TH, "mall", [0.2, 3, 5, 2], 0.4)
    add(600, TH, "corridor", [0.3, 3, 4, 2], 0.3)
    add(300, TH, "downtown", [0.5, 3, 4, 2], 0.25)
    add(250, VEH, "transit1", [4, 1, 1, 3], 0.3)
    add(250, VEH, "transit2", [4, 1, 1, 3], 0.3)
    add(150, VEH, "mall", [2, 1, 2, 3], 0.4)
    add(450, BUR, "apartments", [1, 4, 3, 1], 0.2)
    add(300, BUR, "anywhere", [1, 4, 3, 1], 0.2)
    add(500, OTH, "downtown", [2, 2, 2, 3], 0.35)
    add(600, OTH, "anywhere", [1, 1, 1, 1], 0.3)
    return out, bbox


# ─────────────────────────────────────────────────────────────────────
# 6. PUT IT TOGETHER
# ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--demo", action="store_true", help="build from simulated data, no internet")
    args = ap.parse_args()

    today = date.today()
    if args.demo:
        incidents, bbox = demo_incidents()
        meta = {"city": "Demo city", "source": "Simulated incidents for preview only",
                "sourceUrl": "", "start": (today - timedelta(days=365)).isoformat(),
                "end": today.isoformat(), "demo": True}
    else:
        cfg = CITY
        since = today - timedelta(days=round(cfg["months"] * 30.44))
        print(f"Downloading {cfg['name']} incidents since {since} …", file=sys.stderr)
        fetchers = {"socrata": fetch_socrata, "socrata_yearly": fetch_socrata_yearly, "arcgis": fetch_arcgis}
        raw = fetchers[cfg["api"]](cfg, since)
        # The yearly fetcher already renamed columns to date/offense/lat/lon.
        f = cfg["fields"] if cfg["api"] != "socrata_yearly" else {"date": "date", "offense": "offense", "lat": "lat", "lon": "lon"}
        (w, s, e, n) = cfg["bbox"]

        # Some cities (KC included) publish one row per person involved
        # in a report. Keep one row per report and offense code so a
        # robbery with three victims counts once.
        if cfg["fields"].get("id"):
            seen, unique = set(), []
            for r in raw:
                key = (r.get("id"), r.get("offense"))
                if key not in seen:
                    seen.add(key); unique.append(r)
            print(f"Removed {len(raw) - len(unique):,} duplicate person-rows", file=sys.stderr)
            raw = unique

        incidents, dropped = [], 0
        first = last = None
        for r in raw:
            when = parse_when(r.get(f["date"]))
            try:
                lat, lon = float(r.get(f["lat"])), float(r.get(f["lon"]))
            except (TypeError, ValueError):
                dropped += 1
                continue
            # Drop missing dates and points outside the city box
            # (e.g. geocoded to 0,0 or to the county seat).
            # Also drop future dates (typos) so the date range stays honest.
            if when is None or when > datetime.now() or not (s <= lat <= n and w <= lon <= e):
                dropped += 1
                continue
            first = when if first is None or when < first else first
            last = when if last is None or when > last else last
            incidents.append((lat, lon, categorize(r.get(f["offense"]), cfg.get("offense_is_nibrs", False)),
                              band_of(when.hour), int(when.weekday() >= 5), when))
        print(f"Kept {len(incidents):,} incidents, dropped {dropped:,}", file=sys.stderr)
        if len(incidents) < 100:
            # Safety net: never replace good data with a near-empty pull.
            sys.exit("Too few incidents returned; keeping the existing file.")
        bbox = cfg["bbox"]
        meta = {"city": cfg["name"], "extent": cfg.get("extent_note", ""), "source": cfg["source"], "sourceUrl": cfg["source_url"],
                "demo": False}

    # The map and neighborhoods show the latest 12 months only; the full
    # two-year pull feeds the trends on the Kansas City page.
    map_months = CITY.get("map_months", 12) if not args.demo else 12
    last_seen = max(inc[5] for inc in incidents)
    recent_from = datetime.combine(last_seen.date() - timedelta(days=round(map_months * 30.44)), datetime.min.time())
    all_incidents = incidents
    incidents = [inc for inc in all_incidents if inc[5] >= recent_from]
    meta["start"] = min(inc[5] for inc in incidents).date().isoformat()
    meta["end"] = last_seen.date().isoformat()
    print(f"Map window: {meta['start']} to {meta['end']} ({len(incidents):,} incidents)", file=sys.stderr)

    grid = grid_incidents(incidents, bbox)
    payload = {
        "meta": {
            **meta,
            "updated": today.isoformat(),
            "total": len(incidents),
            "cellMeters": CELL_METERS,
            "bbox": bbox,
            "cols": grid["cols"],
            "rows": grid["rows"],
            "categories": [c for c, _ in CATEGORIES],
            "bands": [b for b, _, _ in BANDS],
        },
        "cells": grid["cells"],
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    # separators=(",", ":") strips spaces to keep the file small.
    OUT_FILE.write_text(json.dumps(payload, separators=(",", ":")))

    # ── Neighborhoods: join the same incidents to block groups ──
    import block_groups as bgmod
    NB = len(BANDS)
    slot_of = lambda inc: (inc[2] * NB + inc[3]) * 2 + inc[4]
    if args.demo:
        bgs = bgmod.demo_block_groups(bbox)
    elif CITY.get("block_groups"):
        bgs = bgmod.load_census(CITY["block_groups"], bbox)
    else:
        bgs = None
    if bgs:
        bgmod.join(incidents, bgs, slot_of)
        src = "Simulated areas for preview" if args.demo else (
            f"U.S. Census Bureau TIGER/Line {CITY['block_groups']['tiger_year']} block groups; "
            f"population from ACS {CITY['block_groups']['acs_year']} 5-year (B01003)")
        bgmod.write(bgs, BG_FILE, {"boundarySource": src})

    # ── Kansas City page statistics (trends, hour × day, rankings) ──
    import crime_stats
    try:
        places = json.loads(PLACES_FILE.read_text())["places"]
    except (OSError, ValueError, KeyError):
        places = []
    stats = crime_stats.build(all_incidents, [c for c, _ in CATEGORIES], recent_from, grid["cells"],
                              bgs, places, payload["meta"])
    crime_stats.write(stats, STATS_FILE)
    print(f"Wrote {OUT_FILE} ({OUT_FILE.stat().st_size / 1024:.0f} KB, "
          f"{len(grid['cells']):,} occupied cells)", file=sys.stderr)


if __name__ == "__main__":
    main()
