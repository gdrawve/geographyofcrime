// ─────────────────────────────────────────────────────────────
// TUTORIALS
// One line per video: [YouTube ID, title, track].
// To add one, paste a new line anywhere in its track.
// The Tutorials page groups, filters, and searches these
// automatically.
// ─────────────────────────────────────────────────────────────

export const tracks = [
  { id: 'excel', label: 'Excel', blurb: 'Cleaning, counting, and pivoting crime data.' },
  { id: 'excel-maps', label: 'Excel mapping', blurb: 'Maps without GIS software.' },
  { id: 'arcgis-excel', label: 'ArcGIS for Excel', blurb: 'Moving between Excel and Esri.' },
  { id: 'arcgis', label: 'ArcGIS Pro', blurb: 'Joins, fishnets, hot spots, and spatial statistics.' },
  { id: 'google', label: 'Google tools', blurb: 'Scholar, Trends, Earth, and Street View.' },
  { id: 'data', label: 'Crime data sources', blurb: 'Where US crime data lives and how to pull it.' },
] as const;

export type TrackId = (typeof tracks)[number]['id'];
type Row = [youtube: string, title: string, track: TrackId];

const rows: Row[] = [
  // Excel
  ['G2xcbx_h80o', 'CSV to workbook: sorting, filtering, copy/paste, snip', 'excel'],
  ['4ISlfUCGzTY', 'Snipping and the Data Analysis add-in', 'excel'],
  ['Jh7-DQaN1nE', 'Filtering data', 'excel'],
  ['Swuh21l9D_4', 'COUNTIF and SUMIF', 'excel'],
  ['_YiMS0g99oo', 'XLOOKUP and COUNTIF', 'excel'],
  ['UciN1pirZqc', 'INDEX and MATCH to join data (VLOOKUP alternative)', 'excel'],
  ['XFxjiQciv4g', 'UNIQUE', 'excel'],
  ['1SZYNEHtPk0', 'SWITCH', 'excel'],
  ['HGIWMR2N4NA', 'Percent change', 'excel'],
  ['ivR3pxqH-s8', 'Selecting blank cells and filling down', 'excel'],
  ['xgFxmdp6lYg', 'Merging data with Power Query', 'excel'],
  ['H9WanJUeme8', 'Ranking values', 'excel'],
  ['qs_ur9iyP6g', 'Significant change in counts', 'excel'],
  ['iLVNvDl8BMc', 'Blank text values', 'excel'],
  ['G5S3-qppsRk', 'Creating dates', 'excel'],
  ['3YopMo-nwWk', 'Remove duplicates, consolidate, text to columns, flash fill', 'excel'],
  ['98H5KyETmGM', 'Pivot tables: row and column totals', 'excel'],
  ['PYVt3vOSmWk', 'Pivot tables: temporal heat map', 'excel'],
  ['vaUN3dcfkQg', 'Pivot tables: slicers', 'excel'],
  ['q3uItZ5vnV4', 'Pivot table to map', 'excel'],
  ['1L8liHHIL1I', 'Treemap', 'excel'],
  ['aUJGqSzPGPE', 'Appending data', 'excel'],
  ['iUwfOikjFOI', 'Law of crime concentration', 'excel'],
  ['emnkZoXd76Q', '80/20 rule and risky facilities', 'excel'],
  // Excel mapping
  ['dWTcCSGwLIM', 'County map', 'excel-maps'],
  ['4RXG98KLR8E', 'State map', 'excel-maps'],
  ['_IQ6ljArFuY', 'State and county maps', 'excel-maps'],
  ['-Cr3Cy7EDOo', 'Point map', 'excel-maps'],
  ['EReEkpReSl8', 'VBA geocoding with Google', 'excel-maps'],
  ['dtiXf_VkZDA', 'Pivot table to 3D map', 'excel-maps'],
  ['ToJk9I3d4SQ', 'Mapping police agencies as points', 'excel-maps'],
  ['5Jn3QST85Hc', 'Mapping different spatial units', 'excel-maps'],
  ['u6EKsPPoxrs', 'Custom regions: police districts', 'excel-maps'],
  ['j-dbHCAId0A', 'Custom regions: neighborhoods', 'excel-maps'],
  ['dafBnyGmVhY', 'Custom regions: block group data', 'excel-maps'],
  ['orPOkQc6TLg', 'Firearm movement', 'excel-maps'],
  // ArcGIS for Excel
  ['i94cKgHxJws', 'Adding ArcGIS to Excel', 'arcgis-excel'],
  ['z3nqPlrIKXo', 'Using ArcGIS in Excel', 'arcgis-excel'],
  ['s2a8TpdwgeA', 'Excel to ArcGIS Pro', 'arcgis-excel'],
  // ArcGIS Pro
  ['A7_B_x6psXc', 'Welcome to ArcGIS Pro', 'arcgis'],
  ['YW9JubNGLv0', 'Symbology examples', 'arcgis'],
  ['dpALcT9TWwc', 'Legends', 'arcgis'],
  ['vhLy-w_w20M', 'Creating a final map to share', 'arcgis'],
  ['mEjxIoIPGyA', 'Select by attribute and export features', 'arcgis'],
  ['eWdhlFGN2jw', 'Creating a chart', 'arcgis'],
  ['xffCsahvlfM', 'Table joins and spatial joins', 'arcgis'],
  ['DcHRrtbq8p4', 'Spatial joins for counts', 'arcgis'],
  ['3aEJ1RgNWLk', 'Select by location', 'arcgis'],
  ['EMWNdXTjeJo', 'Select by attribute, export, and labels', 'arcgis'],
  ['qlsZsuzP6G4', 'Fishnet grid and kernel density (hot spots)', 'arcgis'],
  ['hwXLeVZ9VRA', 'Geocoding counties and addresses', 'arcgis'],
  ['Gzn-XdbiQv0', 'Geocoding crime incidents', 'arcgis'],
  ['oe0pRzq5C6E', 'Select by attribute and location', 'arcgis'],
  ['a1jGLBQxCqc', 'Creating a fishnet grid', 'arcgis'],
  ['q-wxISpRjjQ', 'Joining point data to a fishnet grid', 'arcgis'],
  ['ZCELctsbSZg', 'Select by location: points and polygons', 'arcgis'],
  ['s0NyLSsKplw', 'Projecting data', 'arcgis'],
  ['Q7Kt9BZhoIE', 'Custom sort', 'arcgis'],
  ['CB7tCeM_7j0', 'Clipping, joins, and summary statistics', 'arcgis'],
  ['6P8e2oMEpyA', 'Crime Analysis toolbox', 'arcgis'],
  ['4MeC6Ks5OXY', 'Law of crime concentration', 'arcgis'],
  ['Rpt-IyaxF2c', '80-20 tool for the law of crime concentration', 'arcgis'],
  ['vasLATwZi1k', 'Average nearest neighbor', 'arcgis'],
  ['6V2rebYeuNA', 'Ring buffers, nearest neighbor, deviational ellipse, mean center', 'arcgis'],
  ['_yl1Z6G6BPE', 'Buffers and multiple ring buffers', 'arcgis'],
  ['RqZPdPGC9D4', "Select by location: 'within' and 'within distance'", 'arcgis'],
  ['IKzt62AIymg', 'Generate near table', 'arcgis'],
  ['iJGYdP3cIZw', 'Dissolve and planarize streets', 'arcgis'],
  ['oLf3FNwqawo', 'Adding and calculating fields', 'arcgis'],
  // Google tools
  ['deKczqmkBBc', 'Google Scholar', 'google'],
  ['PwC8EBF9Tx8', 'Google Trends', 'google'],
  ['hkpnq0uotsI', 'Geocoding with Google', 'google'],
  ['xHP1bX9rQto', 'Systematic social observation with Google Earth', 'google'],
  ['B-l260ehuVU', 'Street View observation with a Google Form', 'google'],
  ['mew2-u7nrjE', 'ArcGIS output for Google Earth', 'google'],
  ['qtQ9ErnE7Hw', 'ArcGIS layer to KML', 'google'],
  // Crime data sources
  ['gWH4nHvjMYw', 'Crime data sources in the US', 'data'],
  ['NC1BtNgJcrg', 'LEARCAT: Law Enforcement Agency Reported Crime Analysis Tool', 'data'],
  ['DVSGmq74TZA', 'NIBRS and the Crime Data Explorer', 'data'],
  ['Mznqmha1zTM', 'CrimeStat IV: introduction and download', 'data'],
];

export const tutorials = rows.map(([youtube, title, track]) => ({ youtube, title, track }));
