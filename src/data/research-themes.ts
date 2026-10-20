// ─────────────────────────────────────────────────────────────
// RESEARCH THEMES
// Plain-language summaries for each theme on the Research page.
// The ids match the THEMES list in scripts/build_research.py,
// which decides which papers fall under each one.
// These summaries are drafts: edit them in your own words.
// ─────────────────────────────────────────────────────────────

export const themes = [
  {
    id: 'risk',
    name: 'Risky places and prediction',
    summary:
      'Which places are most likely to see crime next, and why. This work tests risk terrain modeling against hot spot methods and applies it with police agencies in Kansas City, Atlantic City, Jersey City, Little Rock, and Bogotá.',
  },
  {
    id: 'neighborhoods',
    name: 'Neighborhoods and place',
    summary:
      'How the social conditions and physical features of a neighborhood, from late-night bars to institutional isolation, shape violence, youth outcomes, and reentry after prison.',
  },
  {
    id: 'guns',
    name: 'Gun violence',
    summary:
      'Where and when gun violence happens, how crime guns are reused across incidents, and whether investigative tools such as NIBIN units make a measurable difference.',
  },
  {
    id: 'health',
    name: 'Crime, health, and place',
    summary:
      'Where public safety meets public health: overdose risk around pharmacies and the built environment, and the mental-health, food-security, and fear fallout of COVID-19 across American communities.',
  },
  {
    id: 'practice',
    name: 'Crime data and analysis practice',
    summary:
      'Making crime data usable for practitioners: NIBRS reporting, analyst and researcher partnerships, and Foundations of Crime Analysis, a textbook for working analysts.',
  },
  {
    id: 'extremism',
    name: 'Extremism and terrorism',
    summary:
      'The situations in which terrorist plots and extremist homicides unfold, and the warning signs law enforcement can use to interdict them.',
  },
] as const;

export type ThemeId = (typeof themes)[number]['id'];

// Google Scholar has no public API, so its citation count is entered
// by hand. Update both lines when you want the figure refreshed.
export const scholar = { citations: 3362, asOf: 'October 2026' };
