"""
build_research.py
=================

WHAT THIS DOES (the short version)
----------------------------------
1. Downloads your publication list from OpenAlex, a free, open database
   of scholarly work (think Google Scholar with a public API).
2. Cleans it: folds book chapters into their book and drops preprints
   that were later published, so nothing is double counted.
3. Sorts each paper into a research theme using keyword rules.
4. Builds your co-author network and finds the "connectors": the
   collaborators who link otherwise separate groups of your co-authors.
5. Saves everything to  src/data/research.json , which the Research
   page reads when the site builds.

HOW TO RUN IT
-------------
    pip install networkx
    python scripts/build_research.py           # live data from OpenAlex
    python scripts/build_research.py --seed    # offline snapshot (research_seed.txt)

The weekly GitHub Action runs the live version.

KEY IDEA: BETWEENNESS CENTRALITY (the "connector" score)
--------------------------------------------------------
Picture every co-author as a dot, with a line between two dots when
those people wrote a paper together. Now find the shortest path between
every pair of dots. A person's betweenness is the share of those
shortest paths that pass through them. High betweenness = a bridge:
remove that person and some groups stop being connected.

We measure this on the network WITHOUT you in it. Otherwise you would
be the bridge for everything, which is true but uninformative.
"""

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "src" / "data" / "research.json"
SEED_FILE = Path(__file__).resolve().parent / "research_seed.txt"

# ─────────────────────────────────────────────────────────────────────
# 1. SETTINGS  ← the parts you might edit
# ─────────────────────────────────────────────────────────────────────
OPENALEX_AUTHOR = "A5000884559"            # your OpenAlex author ID
ORCID = "0000-0002-2907-0358"
SELF_NAMES = {"grant r. drawve", "grant drawve", "g. r. drawve"}
CONTACT_EMAIL = "gdrawve@capindex.com"     # OpenAlex asks for one to use its faster "polite pool"

# Themes are matched in this order; the first theme with a keyword in
# the title wins. "neighborhoods" is the catch-all for crime-and-place
# work that matched nothing more specific.
THEMES = [
    ("extremism", ["terror", "extremis"]),
    ("health", ["covid", "overdose", "mental health", "suicid", "food insecurity",
                "depress", "vaccine", "crime and health", "fear of", "psychological"]),
    ("risk", ["risk terrain", "rtm", "hot spot", "predictive", "predictab", "forecast", "80-20",
              "risky", "risk-based", "risk of", "risk for", "risk factor", "data-informed",
              "spatio-temporal", "tourist"]),
    ("guns", ["gun", "firearm", "nibin"]),
    ("practice", ["nibrs", "crime analysis", "analyst", "crime mapping", "arrest",
                  "burglar", "innovative data"]),
    ("neighborhoods", []),
]

# Pin a paper to a theme by DOI when the keyword rules guess wrong.
THEME_OVERRIDES: dict[str, str] = {
    # "https://doi.org/10.xxxx/yyyy": "risk",
}


# ─────────────────────────────────────────────────────────────────────
# 2. GETTING THE DATA
# ─────────────────────────────────────────────────────────────────────
# name → {"orcid", "inst", "year"} for every author seen in OpenAlex.
PEOPLE: dict[str, dict] = {}


def fetch_openalex() -> list[dict]:
    """
    OpenAlex returns 200 works per page. "cursor" paging hands back a
    token for the next page until there are no more.
    """
    works, cursor = [], "*"
    while cursor:
        params = {
            "filter": f"author.id:{OPENALEX_AUTHOR}",
            "per-page": 200,
            "cursor": cursor,
            "select": "title,publication_year,cited_by_count,doi,type,primary_topic,authorships",
            "mailto": CONTACT_EMAIL,
        }
        url = "https://api.openalex.org/works?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=60) as r:
            page = json.load(r)
        for w in page["results"]:
            # Remember each co-author's ORCID and institution. The most
            # recent paper wins, so the institution is the latest known.
            for a in w.get("authorships", []):
                au = a.get("author") or {}
                name, year = au.get("display_name"), w.get("publication_year") or 0
                if not name:
                    continue
                prev = PEOPLE.get(name)
                inst = next((i.get("display_name") for i in a.get("institutions") or [] if i.get("display_name")), None)
                if prev is None or year >= prev["year"]:
                    PEOPLE[name] = {
                        "year": year,
                        "orcid": (au.get("orcid") or (prev or {}).get("orcid") or "").replace("https://orcid.org/", "") or None,
                        "inst": inst or (prev or {}).get("inst"),
                    }
                elif not prev.get("orcid") and au.get("orcid"):
                    prev["orcid"] = au["orcid"].replace("https://orcid.org/", "")
            works.append({
                "title": (w.get("title") or "").strip(),
                "year": w.get("publication_year"),
                "cited": w.get("cited_by_count") or 0,
                "type": w.get("type") or "",
                "doi": w.get("doi"),
                "topic": (w.get("primary_topic") or {}).get("display_name"),
                "authors": [a["author"]["display_name"] for a in w.get("authorships", []) if a.get("author")],
            })
        cursor = page["meta"].get("next_cursor")
        print(f"  fetched {len(works)} works", file=sys.stderr)
    return works


def read_seed() -> list[dict]:
    """Parse the offline snapshot (pipe-separated, one work per line)."""
    works = []
    for line in SEED_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        year, cited, typ, doi, topic, title, authors = line.split("|")
        works.append({
            "title": title, "year": int(year), "cited": int(cited), "type": typ,
            "doi": None if doi == "none" else doi, "topic": None if topic == "none" else topic,
            "authors": [a.strip() for a in authors.split(";") if a.strip()],
        })
    return works


# ─────────────────────────────────────────────────────────────────────
# 3. CLEANING
# ─────────────────────────────────────────────────────────────────────
def norm(text: str) -> str:
    """Lowercase, letters and digits only. Used to compare titles."""
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def jaccard(a: str, b: str) -> float:
    """Shared words ÷ all distinct words, from 0 (none) to 1 (identical)."""
    x, y = set(a.split()), set(b.split())
    return len(x & y) / len(x | y) if x | y else 0.0


def clean(works: list[dict]) -> list[dict]:
    books = {w["doi"]: w for w in works if w["type"] == "book" and w["doi"]}
    book_titles = [norm(w["title"]) for w in books.values()]
    published = [norm(w["title"]) for w in works if w["type"] not in ("preprint", "book-chapter")]
    kept = []
    for w in works:
        # Book chapters fold into their book (chapter DOI = book DOI + "-N").
        if w["type"] == "book-chapter" and w["doi"] and any(w["doi"].startswith(b + "-") for b in books):
            continue
        # A preprint whose title closely matches a published version is a
        # duplicate. "Closely" = 85%+ of the words overlap (Jaccard index),
        # which tolerates small edits like an added "the".
        if w["type"] == "preprint" and any(jaccard(norm(w["title"]), p) >= 0.85 for p in published):
            continue
        # Catalog records ("other") that repeat a book's title.
        if w["type"] == "other" and any(norm(w["title"]).startswith(b) for b in book_titles):
            continue
        kept.append(w)
    return kept


def theme_of(w: dict) -> str:
    if w["doi"] in THEME_OVERRIDES:
        return THEME_OVERRIDES[w["doi"]]
    t = w["title"].lower()
    for theme, keys in THEMES:
        if any(k in t for k in keys):
            return theme
    return THEMES[-1][0]


# ─────────────────────────────────────────────────────────────────────
# 4. THE CO-AUTHOR NETWORK
# ─────────────────────────────────────────────────────────────────────
def build_network(works: list[dict]) -> dict:
    is_self = lambda name: name.lower() in SELF_NAMES
    papers = Counter()                    # name → papers shared with you
    themes = defaultdict(Counter)         # name → theme counts
    ties = Counter()                      # (a, b) → papers a and b share

    for w in works:
        others = sorted({a for a in w["authors"] if not is_self(a)})
        for a in others:
            papers[a] += 1
            themes[a][w["theme"]] += 1
        for i, a in enumerate(others):
            for b in others[i + 1:]:
                ties[(a, b)] += 1

    # The network without you: only co-author ↔ co-author ties.
    G = nx.Graph()
    G.add_nodes_from(papers)
    for (a, b), n in ties.items():
        G.add_edge(a, b, weight=n)
    between = nx.betweenness_centrality(G, normalized=True)

    # For the picture we add you back at the center, pinned in place,
    # so each group of co-authors settles around you.
    H = G.copy()
    H.add_node("SELF")
    for a in papers:
        H.add_edge("SELF", a, weight=0.6)
    pos = nx.spring_layout(H, seed=7, k=0.55, iterations=300, weight="weight",
                           pos={"SELF": (0, 0)}, fixed=["SELF"])
    # Rescale positions to a 0–1000 box for drawing.
    xs = [p[0] for p in pos.values()]; ys = [p[1] for p in pos.values()]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1
    sx = lambda v: round(60 + (v - min(xs)) / span * 880, 1)
    sy = lambda v: round(60 + (v - min(ys)) / span * 880, 1)

    names = sorted(papers, key=lambda n: (-papers[n], n))
    index = {n: i for i, n in enumerate(names)}
    nodes = [{
        "name": n,
        "papers": papers[n],
        "theme": themes[n].most_common(1)[0][0],
        "betweenness": round(between.get(n, 0), 4),
        # From OpenAlex; empty when building from the offline snapshot.
        "orcid": (PEOPLE.get(n) or {}).get("orcid"),
        "inst": (PEOPLE.get(n) or {}).get("inst"),
        "x": sx(pos[n][0]), "y": sy(pos[n][1]),
    } for n in names]
    edges = [[index[a], index[b], n] for (a, b), n in ties.items()]
    connectors = [index[n] for n, b in sorted(between.items(), key=lambda kv: -kv[1]) if b > 0][:5]
    return {
        "self": {"x": sx(0), "y": sy(0)},
        "nodes": nodes,
        "edges": edges,
        "connectors": connectors,
        "groups": nx.number_connected_components(G),
    }


# ─────────────────────────────────────────────────────────────────────
# 5. PUT IT TOGETHER
# ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", action="store_true", help="use the offline snapshot")
    args = ap.parse_args()

    raw = read_seed() if args.seed else fetch_openalex()
    if len(raw) < 10:
        sys.exit("Too few works returned; keeping the existing file.")
    works = clean(raw)
    for w in works:
        w["theme"] = theme_of(w)
    works.sort(key=lambda w: (-(w["year"] or 0), -w["cited"]))

    net = build_network(works)
    payload = {
        "meta": {
            "source": "OpenAlex",
            "sourceUrl": f"https://openalex.org/authors/{OPENALEX_AUTHOR}",
            "orcid": ORCID,
            "updated": date.today().isoformat(),
            "snapshot": bool(args.seed),
            "works": len(works),
            "citations": sum(w["cited"] for w in raw),
            "coauthors": len(net["nodes"]),
            "firstYear": min(w["year"] for w in works if w["year"]),
        },
        "works": works,
        "network": net,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT_FILE}: {len(works)} works (from {len(raw)} records), "
          f"{len(net['nodes'])} co-authors, {net['groups']} groups", file=sys.stderr)


if __name__ == "__main__":
    main()
