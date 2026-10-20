"""
Weekly broken-link check.

Finds every outside link and YouTube video the site points to (in
src/data/ and src/pages/) and checks that each one still works. Dead
links are reported as WARNINGS on the weekly refresh run, so they show
on the run's summary page without failing it (no "Run failed" email).

  • YouTube videos are checked with YouTube's oEmbed endpoint, which
    answers "not found" for deleted or private videos.
  • Other links are fetched; only "404 Not Found" and "410 Gone" count
    as dead. Sites that block robots (403, 429) are skipped rather than
    reported, to avoid false alarms.

Usage:  python scripts/check_links.py
"""

from __future__ import annotations

import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = list((ROOT / "src" / "data").glob("*.ts")) + list((ROOT / "src" / "pages").rglob("*.astro"))

# Links not worth checking: our own site, font/CDN hosts, schema vocab.
SKIP = ("geographyofcrime.com", "w3.org/2000", "fonts.googleapis", "fonts.gstatic", "schema.org", "opensource.org/licenses",
        "tiles.openfreemap.org", "localhost", "example.", "youtube.com/watch?v=${", "orcid.org/${")

URL_RE = re.compile(r"https?://[^\s'\"`<>)\]]+")
# YouTube IDs as the data files store them: youtube: 'ID'  or  ['ID', 'Title', 'track']
YT_RE = re.compile(r"""youtube:\s*['"]([\w-]{11})['"]|\[\s*['"]([\w-]{11})['"]\s*,""")
UA = {"User-Agent": "Mozilla/5.0 (geographyofcrime.com weekly link check)"}


def status(url: str) -> int | None:
    """HTTP status for a URL, or None if the site couldn't be reached."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None


def check_video(vid: str) -> tuple[str, str] | None:
    url = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}")
    code = status(url)
    if code in (400, 401, 403, 404):
        return (f"https://www.youtube.com/watch?v={vid}", "video is deleted, private, or not embeddable")
    return None


def check_url(url: str) -> tuple[str, str] | None:
    code = status(url)
    if code in (404, 410):
        return (url, f"HTTP {code}")
    return None


def main() -> None:
    urls, videos, where = set(), set(), {}
    for f in SOURCES:
        text = f.read_text(encoding="utf-8")
        for u in URL_RE.findall(text):
            u = u.rstrip(".,;")
            if "${" in u or any(s in u for s in SKIP):
                continue
            urls.add(u); where.setdefault(u, f.relative_to(ROOT))
        for a, b in YT_RE.findall(text):
            vid = a or b
            videos.add(vid); where.setdefault(f"https://www.youtube.com/watch?v={vid}", f.relative_to(ROOT))

    print(f"Checking {len(urls)} links and {len(videos)} YouTube videos …", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=8) as pool:
        dead = [r for r in pool.map(check_url, sorted(urls)) if r]
        dead += [r for r in pool.map(check_video, sorted(videos)) if r]

    # stdout lines starting with ::warning:: become annotations on the run.
    for url, why in dead:
        print(f"::warning::Broken link in {where.get(url, '?')}: {url} ({why})")
    print(f"{len(dead)} broken of {len(urls) + len(videos)} checked", file=sys.stderr)


if __name__ == "__main__":
    main()
