// ─────────────────────────────────────────────────────────────
// TOOLS
// Software Grant has released. Add a new tool by adding a block
// to `tools`; the Tools page builds itself from this file.
// ─────────────────────────────────────────────────────────────

export const toolkit = {
  name: 'Crime Analysis Excel Toolkit',
  publisher: 'CAP Index',
  repo: 'gdrawve/CAP-Index-Toolkit-Public',
  repoUrl: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public',
  releasesUrl: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/releases/latest',
  fallbackVersion: '1.2.3',
  license: 'MIT (code and documentation); CAP Index names and logos are excluded',
  platform: 'Windows desktop Excel (.xlam add-in)',
  summary:
    'A free Excel ribbon that takes a raw police incident export to finished analysis: cleaned dates and addresses, NIBRS crime types, hot streets, crime concentration, trends, and a ready-to-share PowerPoint briefing.',
  docs: [
    { label: 'Data preparation guide', url: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/blob/main/docs/DATA-PREP.md' },
    { label: 'Time and location analysis', url: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/blob/main/docs/TIME-LOCATION-ANALYSIS.md' },
    { label: 'Crime concentration', url: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/blob/main/docs/CRIME-CONCENTRATION.md' },
    { label: 'Reporting and export', url: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/blob/main/docs/REPORTING-EXPORT.md' },
    { label: 'Deployment guide for IT', url: 'https://github.com/gdrawve/CAP-Index-Toolkit-Public/blob/main/docs/DEPLOYMENT.md' },
  ],
};

// The 16 tools, grouped along the analyst's workflow. `tutorial` is a
// title from src/data/tutorials.ts; the page links to that video.
export const toolGroups = [
  {
    step: 'Prepare',
    blurb: 'Make messy exports trustworthy before counting anything.',
    tools: [
      { name: 'Duplicate / Case Review', icon: 'review', does: 'Flags incidents that appear on several rows and shows every crime type tied to each one.', tutorial: 'Remove duplicates, consolidate, text to columns, flash fill' },
      { name: 'Timestamp Fields', icon: 'timestamp', does: 'Splits one date or timestamp into date, weekday, month, year, time, and hour.', tutorial: 'Creating dates' },
      { name: 'Hour from Time', icon: 'hour', does: 'Turns any time format, including AM/PM text, into an hour from 0 to 23.' },
    ],
  },
  {
    step: 'Locate',
    blurb: 'Put incidents on consistent, privacy-safe places.',
    tools: [
      { name: 'Hundred-Block Builder', icon: 'block', does: 'Converts addresses to hundred blocks, the standard unit for street-level analysis.' },
      { name: 'Randomize Block Addresses', icon: 'random', does: 'Creates realistic but synthetic addresses within each block for sharing or training data.' },
      { name: 'Census Geocoder', icon: 'geocode', does: 'Batch-geocodes addresses with the free U.S. Census geocoder and flags weak matches for review.', tutorial: 'Geocoding with Google' },
    ],
  },
  {
    step: 'Analyze',
    blurb: 'Find where and when crime concentrates.',
    tools: [
      { name: 'Temporal Heat Map', icon: 'heatmap', does: 'Builds the classic Monday-to-Sunday by hour grid, colored by volume.', tutorial: 'Pivot tables: temporal heat map' },
      { name: 'Repeat Locations', icon: 'repeat', does: 'Ranks the addresses with the most events, no dates needed.' },
      { name: 'Hot Streets', icon: 'hotstreets', does: 'Profiles the busiest street blocks week by week or month by month.' },
      { name: 'Crime Concentration', icon: 'concentration', does: 'Measures how much crime the busiest blocks hold, with three ready-made charts.', tutorial: 'Law of crime concentration' },
    ],
  },
  {
    step: 'Compare',
    blurb: 'Separate real change from noise.',
    tools: [
      { name: 'Monthly / Annual Trends', icon: 'trends', does: 'Counts by month or year with daily rates and comparable-period percent change.', tutorial: 'Percent change' },
      { name: 'Period Comparison', icon: 'compare', does: 'Compares two non-overlapping periods side by side with differences and daily rates.', tutorial: 'Significant change in counts' },
      { name: 'Crime Profile', icon: 'profile', does: 'One-page summary: incident and offense totals, crime mix, coverage, and the top 20 locations.' },
    ],
  },
  {
    step: 'Share',
    blurb: 'Turn results into something a commander or client reads.',
    tools: [
      { name: 'Save Image', icon: 'image', does: 'Saves any report chart or table as a captioned PNG.' },
      { name: 'PowerPoint Briefing', icon: 'powerpoint', does: 'Builds widescreen briefing slides from your report sheets.' },
      { name: 'Save Report PDF', icon: 'pdf', does: 'Exports a report sheet as a landscape PDF with page numbers.' },
    ],
  },
];

export const installSteps = [
  'Download the release ZIP from GitHub Releases (the file named CAP-Index-Toolkit-release-…zip, not the source-code archive).',
  'Extract it to a permanent folder and keep the files together.',
  'Optional: confirm the file is intact by comparing its SHA-256 hash with SHA256.txt (PowerShell: Get-FileHash).',
  'Right-click the .xlam file → Properties → tick Unblock, if that option appears.',
  'In Excel: File → Options → Add-ins → Manage Excel Add-ins → Go → Browse to the .xlam and enable it. Disable any older CAP Index add-ins first.',
  'Work from a copy of your data. The add-in is unsigned, so on a work computer follow your IT team’s add-in policy.',
];

// Future tools (Python notebooks, ArcGIS scripts) go here.
export const moreTools = [
  {
    name: 'Kansas City crime map pipeline',
    kind: 'Python',
    does: 'The open scripts behind this site’s map: pull a city’s open crime data, classify NIBRS codes, aggregate to a privacy-safe grid, and join to Census block groups.',
    url: 'https://github.com/gdrawve/geographyofcrime/tree/main/scripts',
  },
];
