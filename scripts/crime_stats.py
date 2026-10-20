"""
Kansas City "by the numbers": the summary statistics behind the /kansas-city/ page.

build_crime_grid.py calls build() after it has downloaded and cleaned the
incidents. Everything here is plain counting; there are no models.

What it produces (src/data/kc-stats.json):
  • monthly    – counts per crime type for the last 24 COMPLETE months
  • yoy        – last 12 complete months vs. the 12 before, by crime type
  • hourDay    – a 7 × 24 grid (Monday–Sunday × hour) for the last 12 months,
                 for all crime and for each crime type
  • concentration – how few 150 m grid cells hold half of all incidents
  • neighborhoods – block groups ranked by count and by rate per 1,000 residents,
                 each labeled with the nearest named neighborhood

Why "complete" months: police data arrives with a lag, so the newest
month is always partly empty. Counting it would look like a sudden drop.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import date, datetime
from pathlib import Path

# Block groups with very few residents give unstable rates (5 crimes in a
# block group of 40 people is "125 per 1,000"). The map uses 200; the
# ranking uses a stricter floor so the top-10 list isn't all small areas.
MIN_POP_FOR_RANK = 500


def _month_key(d: date | datetime) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _shift_month(y: int, m: int, delta: int) -> tuple[int, int]:
    """Move (year, month) by `delta` months, e.g. (2026, 1) - 1 → (2025, 12)."""
    i = y * 12 + (m - 1) + delta
    return i // 12, i % 12 + 1


def _last_complete_month(last: datetime) -> tuple[int, int]:
    """The newest month the data fully covers."""
    nxt = date.fromordinal(last.date().toordinal() + 1)
    if nxt.month != last.month:  # `last` is the final day of its month
        return last.year, last.month
    return _shift_month(last.year, last.month, -1)


def build(incidents: list[tuple], categories: list[str], recent_from: datetime,
          grid_cells: list[list[int]], bgs: list[dict] | None, places: list[dict],
          meta: dict) -> dict:
    """
    incidents: (lat, lon, cat, band, weekend, when) for the whole pull (~2 years)
    recent_from: start of the 12-month window the map uses
    grid_cells: the sparse 150 m grid rows [ix, iy, slot, count, ...] (last 12 months)
    bgs: block groups after block_groups.join() (counts = last 12 months), or None
    places: [{"name", "lat", "lon"}] neighborhood labels from OpenStreetMap
    """
    nc = len(categories)
    last = max(inc[5] for inc in incidents)

    # ── 1. Monthly series: 24 complete months ending with the newest full one ──
    ey, em = _last_complete_month(last)
    months = [_month_key(date(*_shift_month(ey, em, -k), 1)) for k in range(23, -1, -1)]
    idx = {m: i for i, m in enumerate(months)}
    monthly = [[0] * len(months) for _ in range(nc)]
    for inc in incidents:
        i = idx.get(_month_key(inc[5]))
        if i is not None:
            monthly[inc[2]][i] += 1

    # Days in each month, so the page can show a daily rate (Feb has 28 days,
    # so raw monthly counts dip every February for no real reason).
    def days_in(mk: str) -> int:
        y, m = map(int, mk.split("-"))
        ny, nm = _shift_month(y, m, 1)
        return (date(ny, nm, 1) - date(y, m, 1)).days
    days = [days_in(m) for m in months]

    # ── 2. Year over year: months 13–24 vs. months 1–12 of that series ──
    def period(a: int, b: int) -> dict:
        by = [sum(monthly[c][a:b]) for c in range(nc)]
        return {"start": months[a], "end": months[b - 1], "total": sum(by), "byCat": by}
    has_two_years = all(sum(monthly[c][i] for c in range(nc)) > 0 for i in (0, 12))
    yoy = {"current": period(12, 24), "prior": period(0, 12)} if has_two_years else None

    # ── 3. Hour × weekday, last 12 months ──
    # Index: [category][weekday * 24 + hour]; weekday 0 = Monday.
    hour_day = [[0] * 168 for _ in range(nc)]
    recent = [inc for inc in incidents if inc[5] >= recent_from]
    for inc in recent:
        w = inc[5]
        hour_day[inc[2]][w.weekday() * 24 + w.hour] += 1
    # Many systems record unknown times as exactly midnight, which creates a
    # fake spike at 12 am. Report the share so the page can say so plainly.
    midnight = sum(1 for inc in recent if inc[5].hour == 0 and inc[5].minute == 0)

    # ── 4. Concentration across 150 m grid cells ──
    totals = sorted((sum(row[3::2]) for row in grid_cells), reverse=True)
    n_inc = sum(totals)
    run, half_cells = 0, 0
    for i, t in enumerate(totals):
        run += t
        if run >= n_inc / 2:
            half_cells = i + 1
            break
    top5 = max(1, round(len(totals) * 0.05))
    concentration = {
        "occupiedCells": len(totals),
        "cellsForHalf": half_cells,
        "pctCellsForHalf": round(100 * half_cells / len(totals), 1) if totals else None,
        "top5PctShare": round(100 * sum(totals[:top5]) / n_inc, 1) if n_inc else None,
        "cellMeters": meta.get("cellMeters", 150),
    }

    # ── 5. Neighborhood rankings from block groups ──
    hoods = None
    if bgs:
        def nearest(lat: float, lon: float) -> str:
            # Plain nearest-label lookup; good enough for "near Westport".
            k = math.cos(math.radians(lat))
            best = min(places, key=lambda p: (p["lat"] - lat) ** 2 + ((p["lon"] - lon) * k) ** 2) if places else None
            return best["name"] if best else ""

        rows = []
        for b in bgs:
            by = [0] * nc
            for slot, c in b["counts"].items():
                by[slot // (len(meta["bands"]) * 2)] += c  # slot → category
            total = sum(by)
            if not total:
                continue
            ctr = b["geom"].representative_point()
            # Most common SPECIFIC type: catch-alls ("Unclassified", NIBRS
            # "All Other Offenses") are skipped when anything else was recorded.
            vague = {i for i, c in enumerate(categories) if c in ("Unclassified", "All Other Offenses")}
            named = [c for c in range(nc) if c not in vague and by[c]] or list(range(nc))
            top = max(named, key=lambda c: by[c])
            rows.append({
                "id": b["id"],
                "near": nearest(ctr.y, ctr.x),
                "total": total,
                "pop": b["pop"],
                "rate": round(1000 * total / b["pop"], 1) if b["pop"] else None,
                "topCat": top,
                "topShare": round(100 * by[top] / total),
                "byCat": by,
            })
        by_count = sorted(rows, key=lambda r: -r["total"])[:10]
        by_rate = sorted((r for r in rows if r["pop"] and r["pop"] >= MIN_POP_FOR_RANK),
                         key=lambda r: -r["rate"])[:10]
        bg_totals = sorted((r["total"] for r in rows), reverse=True)
        run, half_bg = 0, 0
        for i, t in enumerate(bg_totals):
            run += t
            if run >= sum(bg_totals) / 2:
                half_bg = i + 1
                break
        hoods = {
            "blockGroups": len(bgs),
            "bgsForHalf": half_bg,
            "byCount": by_count,
            "byRate": by_rate,
            "minPop": MIN_POP_FOR_RANK,
        }

    return {
        "meta": {
            **{k: meta[k] for k in ("city", "source", "sourceUrl", "updated", "demo",
                                    "short", "groups", "catGroup", "groupColors", "catColors") if k in meta},
            "start": recent_from.date().isoformat() if recent else None,
            "end": last.date().isoformat(),
            "total12": len(recent),
            "categories": categories,
            "midnightShare": round(100 * midnight / len(recent), 1) if recent else 0,
        },
        "months": months,
        "days": days,
        "monthly": monthly,
        "yoy": yoy,
        "hourDay": hour_day,
        "concentration": concentration,
        "neighborhoods": hoods,
    }


def write(stats: dict, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(stats, separators=(",", ":")))
    print(f"Wrote {out} ({out.stat().st_size / 1024:.0f} KB)", file=sys.stderr)
