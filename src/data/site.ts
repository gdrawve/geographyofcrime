// ─────────────────────────────────────────────────────────────
// SITE-WIDE SETTINGS
// One place for your name, links, and identity. Every page,
// the schema.org tags, and llms.txt read from here, so a change
// here updates everywhere at once.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: 'Geography of Crime',
  url: 'https://geographyofcrime.com',
  tagline: 'Where crime happens, why it clusters there, and what to do about it.',
  description:
    'The hub for Grant Drawve, PhD: The Geography of Crime podcast, 80+ free crime-mapping tutorials in Excel, ArcGIS Pro, and Google tools, plus talks and writing on place-based crime analysis.',
  location: 'Fayetteville, Arkansas',
  // Fayetteville, AR. Shown as a small map-style label in the header.
  coords: '36.06° N, 94.16° W',
  email: 'gdrawve@capindex.com',
};

export const person = {
  name: 'Grant Drawve',
  honorific: 'PhD',
  jobTitle: 'Vice President of Geospatial Crime Solutions',
  employer: { name: 'CAP Index', url: 'https://capindex.com' },
  formerly:
    'Associate Professor, Department of Sociology & Criminology, University of Arkansas (2016–2023); Associate Director of the Crime & Security Data Analytics Lab (CASDAL), Terrorism Research Center; Post-Doctoral Research Associate, Rutgers University (2015–2016)',
  education: [
    { degree: 'PhD, Criminal Justice', school: 'University of Arkansas at Little Rock' },
    { degree: 'MA, Criminology and Criminal Justice', school: 'Southern Illinois University Carbondale' },
    { degree: 'BA, Administration of Justice', school: 'Southern Illinois University Carbondale' },
  ],
  knowsAbout: [
    'Spatial criminology',
    'Environmental criminology',
    'Crime analysis',
    'Crime mapping',
    'Hot spot analysis',
    'Law of crime concentration',
    'Retail crime',
    'ArcGIS Pro',
    'Geographic information systems (GIS)',
  ],
  // sameAs = "these profiles are all the same person". This is how
  // search engines and AI tools tie your identity together.
  profiles: [
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=0bukU-YAAAAJ' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/gdrawve' },
    { label: 'ResearchGate', url: 'https://www.researchgate.net/profile/Grant-Drawve-2' },
    { label: 'ORCID', url: 'https://orcid.org/0000-0002-2907-0358' },
    { label: "Grant's Crime Lab (YouTube)", url: 'https://www.youtube.com/@crimewithgranttake2' },
    { label: 'CAP Index (YouTube)', url: 'https://www.youtube.com/@CAPIndexCrimeRisk' },
  ],
  // CV lives in public/cv/. Replace the file to update it.
  cv: '/cv/CV_Drawve.pdf',
};

export const nav = [
  { href: '/podcast/', label: 'Podcast' },
  { href: '/tutorials/', label: 'Tutorials' },
  { href: '/research/', label: 'Research' },
  { href: '/talks/', label: 'Talks & Writing' },
  { href: '/about/', label: 'About' },
];
