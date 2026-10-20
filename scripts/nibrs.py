"""
NIBRS taxonomy: how every incident is sorted into a crime type.

The crime types are the FBI's NIBRS offense categories, and the broad
groups are NIBRS "Crime Against" values (Persons, Property, Society),
exactly as the FBI assigns them in the NIBRS User Manual. That's why
Robbery sits under Property: NIBRS counts it as a crime against property.

Group B offenses (90A–90Z) are arrest-only offenses in NIBRS, so they are
their own group. Justifiable homicide (09C) is "Not a Crime" in NIBRS
and goes to Unclassified, along with anything that can't be matched.

How a row is classified, in order:
  1. its NIBRS code (e.g. "13B")
  2. otherwise its NIBRS offense name (e.g. "Simple Assault")
  3. otherwise the agency's own offense label (e.g. "Stealing - Shoplifting")
Steps 2 and 3 use keywords, checked top to bottom; the first match wins.
"""

from __future__ import annotations

import re

GROUPS = ["Persons", "Property", "Society", "Group B", "Unclassified"]

# (NIBRS offense category, short label for buttons, group, codes, keywords)
# Within each group, categories are listed by how common they usually are,
# which also decides their chart colors.
TAXONOMY = [
    # ── Crimes against persons ──
    ("Assault Offenses", "Assault", "Persons", ["13A", "13B", "13C"], ["assault", "intimidation"]),
    ("Sex Offenses", "Sex offenses", "Persons", ["11A", "11B", "11C", "11D", "36A", "36B"],
     ["rape", "sodomy", "sexual", "fondling", "incest", "sex offense"]),
    ("Homicide Offenses", "Homicide", "Persons", ["09A", "09B"], ["murder", "manslaughter", "homicide"]),
    ("Kidnapping/Abduction", "Kidnapping", "Persons", ["100"], ["kidnap", "abduct"]),
    ("Human Trafficking", "Human trafficking", "Persons", ["64A", "64B"], ["trafficking", "involuntary servitude"]),
    # ── Crimes against property ──
    ("Larceny/Theft Offenses", "Larceny/theft", "Property", ["23A", "23B", "23C", "23D", "23E", "23F", "23G", "23H"],
     ["from motor vehicle", "from auto", "vehicle parts", "larceny", "theft", "shoplift", "stealing", "pocket", "purse"]),
    ("Motor Vehicle Theft", "Motor vehicle theft", "Property", ["240"],
     ["motor vehicle theft", "auto theft", "stolen auto", "stolen vehicle", "vehicle theft"]),
    ("Destruction/Damage/Vandalism of Property", "Vandalism", "Property", ["290"], ["vandal", "destruction", "damage"]),
    ("Burglary/Breaking & Entering", "Burglary", "Property", ["220"], ["burglary", "breaking"]),
    ("Robbery", "Robbery", "Property", ["120"], ["robbery"]),
    ("Fraud Offenses", "Fraud", "Property", ["26A", "26B", "26C", "26D", "26E", "26F", "26G", "26H"],
     ["fraud", "swindle", "identity", "impersonat", "false pretense", "hacking", "confidence game"]),
    ("Stolen Property Offenses", "Stolen property", "Property", ["280"], ["stolen property"]),
    ("Counterfeiting/Forgery", "Counterfeit/forgery", "Property", ["250"], ["forgery", "counterfeit"]),
    ("Arson", "Arson", "Property", ["200"], ["arson"]),
    ("Embezzlement", "Embezzlement", "Property", ["270"], ["embezzle"]),
    ("Extortion/Blackmail", "Extortion", "Property", ["210"], ["extortion", "blackmail"]),
    ("Bribery", "Bribery", "Property", ["510"], ["bribe"]),
    # ── Crimes against society ──
    ("Drug/Narcotic Offenses", "Drugs/narcotics", "Society", ["35A", "35B"],
     ["drug", "narcotic", "marijuana", "controlled substance", "paraphernalia"]),
    ("Weapon Law Violations", "Weapon laws", "Society", ["520"], ["weapon", "firearm", "concealed"]),
    ("Prostitution Offenses", "Prostitution", "Society", ["40A", "40B", "40C"], ["prostitut"]),
    ("Pornography/Obscene Material", "Pornography", "Society", ["370"], ["pornograph", "obscene"]),
    ("Animal Cruelty", "Animal cruelty", "Society", ["720"], ["animal"]),
    ("Gambling Offenses", "Gambling", "Society", ["39A", "39B", "39C", "39D"], ["gambl"]),
    # ── Group B (arrest-only offenses) ──
    ("All Other Offenses", "All other offenses", "Group B", ["90Z"], ["all other"]),
    ("Driving Under the Influence", "DUI", "Group B", ["90D"], ["driving under", "dui", "dwi", "driving while"]),
    ("Trespass of Real Property", "Trespass", "Group B", ["90J"], ["trespass"]),
    ("Disorderly Conduct", "Disorderly conduct", "Group B", ["90C"], ["disorderly", "peace disturbance"]),
    ("Other Group B Offenses", "Other Group B", "Group B", ["90A", "90B", "90E", "90F", "90G", "90H", "90I"],
     ["bad check", "curfew", "loiter", "vagran", "drunk", "liquor", "peeping", "runaway", "family offense"]),
    # ── Not a crime / unknown ──
    ("Unclassified", "Unclassified", "Unclassified", ["09C"], []),
]

NAMES = [t[0] for t in TAXONOMY]
SHORT = [t[1] for t in TAXONOMY]
GROUP_OF = [GROUPS.index(t[2]) for t in TAXONOMY]
UNCLASSIFIED = NAMES.index("Unclassified")
_CODE = {code: i for i, t in enumerate(TAXONOMY) for code in t[3]}

# Keywords that must win before the ordered list is checked, because a
# broader keyword further down would otherwise catch them.
_FIRST = [
    ("justifiable", UNCLASSIFIED),
    ("sexual", NAMES.index("Sex Offenses")),
    ("rape", NAMES.index("Sex Offenses")),
    ("identity theft", NAMES.index("Fraud Offenses")),
    ("stolen property", NAMES.index("Stolen Property Offenses")),
    ("robbery", NAMES.index("Robbery")),
    ("burglary", NAMES.index("Burglary/Breaking & Entering")),
    ("theft from motor vehicle", NAMES.index("Larceny/Theft Offenses")),
    ("theft of motor vehicle parts", NAMES.index("Larceny/Theft Offenses")),
    ("motor vehicle theft", NAMES.index("Motor Vehicle Theft")),
    ("auto theft", NAMES.index("Motor Vehicle Theft")),
    ("stolen auto", NAMES.index("Motor Vehicle Theft")),
]


def _by_keyword(text: str) -> int | None:
    t = re.sub(r"\s+", " ", (text or "").lower()).strip()
    if not t:
        return None
    for kw, i in _FIRST:
        if kw in t:
            return i
    for i, entry in enumerate(TAXONOMY):
        if any(k in t for k in entry[4]):
            return i
    return None


def classify(code: str | None, nibrs_name: str | None = None, local_label: str | None = None) -> tuple[int, str]:
    """
    Return (category index, how it was matched): "code", "name", "label",
    or "none" (→ Unclassified).
    """
    c = (code or "").strip().upper()
    if c in _CODE:
        return _CODE[c], "code"
    for text, how in ((nibrs_name, "name"), (local_label, "label")):
        i = _by_keyword(text)
        if i is not None:
            return i, how
    return UNCLASSIFIED, "none"


# Chart colors. A crime type keeps the same color everywhere. With many
# types, colors repeat across groups, so the site colors by GROUP when
# more than one group is showing, and by type within a single group.
GROUP_COLORS = ["#d55e00", "#0072b2", "#009e73", "#cc79a7", "#8a8f99"]
# Okabe–Ito, a colorblind-safe palette; Fraud-yellow is deepened to show on a light map.
TYPE_PALETTE = ["#d55e00", "#0072b2", "#009e73", "#e69f00", "#cc79a7", "#56b4e9", "#c9b800"]
OVERFLOW = "#8a8f99"  # 8th and later types in a group share grey


def type_colors() -> list[str]:
    seen = [0] * len(GROUPS)
    out = []
    for g in GROUP_OF:
        k = seen[g]; seen[g] += 1
        out.append(TYPE_PALETTE[k] if k < len(TYPE_PALETTE) else OVERFLOW)
    out[UNCLASSIFIED] = OVERFLOW
    return out


def meta() -> dict:
    """Everything the website needs to label and color the types."""
    return {
        "categories": NAMES,
        "short": SHORT,
        "groups": GROUPS,
        "catGroup": GROUP_OF,
        "groupColors": GROUP_COLORS,
        "catColors": type_colors(),
    }
