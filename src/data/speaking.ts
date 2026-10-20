// ─────────────────────────────────────────────────────────────
// SPEAKING KIT
// What event organizers need in one place: bios to paste,
// topics, formats, and a headshot. Edit the text here; the
// /speaking/ page builds itself from this file.
// ─────────────────────────────────────────────────────────────

// Three lengths, because programs, emcees, and websites each want a
// different one. Third person, since organizers paste these as is.
export const bios = [
  {
    id: 'short',
    label: 'Short bio',
    use: 'Programs, panel lists, social posts',
    text:
      'Grant Drawve, PhD, is Vice President of Geospatial Crime Solutions at CAP Index, where he built the Research & Innovation division. A spatial criminologist and former associate professor at the University of Arkansas, he hosts The Geography of Crime podcast.',
  },
  {
    id: 'medium',
    label: 'Medium bio',
    use: 'Event websites and session pages',
    text:
      'Grant Drawve, PhD, is Vice President of Geospatial Crime Solutions at CAP Index, a crime risk scoring and modeling company. He was hired to build its Research & Innovation division, which has brought four crime risk products to market, and he leads a team of crime and data analysts. He is CAP’s research partner to the Retail Industry Leaders Association on its Vibrant Communities Initiative. Before CAP, he spent seven years on the criminology faculty at the University of Arkansas, where he led more than $2.7 million in funded research with police agencies and community partners. He hosts The Geography of Crime podcast.',
  },
  {
    id: 'long',
    label: 'Long bio',
    use: 'Keynote introductions and press',
    text:
      'Grant Drawve, PhD, studies how place shapes crime and public safety, and works to make that research usable by the people who act on it. He is Vice President of Geospatial Crime Solutions at CAP Index, a crime risk scoring and modeling company, where he was hired to build the Research & Innovation division. The division has since brought four crime risk products to market. He leads a team of crime and data analysts and is CAP’s research partner to the Retail Industry Leaders Association on its Vibrant Communities Initiative in Atlantic City, NJ and Clackamas County, OR.\n\nBefore CAP, Dr. Drawve was an associate professor of sociology and criminology at the University of Arkansas and associate director of its Crime & Security Data Analytics Lab. He has served as principal or co-principal investigator on more than $2.7 million in research funded by NIJ, NSF, BJA, DHS, and OJJDP. He was a winner of the National Institute of Justice Real-Time Crime Forecasting Challenge, and his risk-based policing work in Atlantic City was featured on National Geographic’s Breakthrough. He holds a PhD in criminal justice from the University of Arkansas at Little Rock and hosts The Geography of Crime podcast and a free library of crime-analysis tutorials.',
  },
];

// One line an emcee can read aloud.
export const intro =
  'Our next speaker built a crime risk research division from the ground up and spent seven years teaching criminology before that. Please welcome the Vice President of Geospatial Crime Solutions at CAP Index, Dr. Grant Drawve.';

// Topics, each grounded in talks he has given (see talks.ts).
export const topics = [
  {
    title: 'Place-based risk intelligence for loss prevention',
    for: 'Retail, security, and LP leaders',
    blurb: 'How crime risk around a store, not just inside it, should shape staffing, investment, and organized retail crime strategy.',
    given: 'NRF Protect, Loss Prevention Foundation, LPRC IMPACT',
  },
  {
    title: 'Cutting through the hype of crime data',
    for: 'Executives, communications teams, general audiences',
    blurb: 'How to read crime headlines and statistics with healthy skepticism, and where data gaps since COVID can mislead decisions.',
    given: 'DSAC, Loss Prevention Media series',
  },
  {
    title: 'Crime concentrates: hot spots, hot streets, and time',
    for: 'Police, city, and community audiences',
    blurb: 'Why a small share of places carries most crime, how routines and seasons shift that risk, and what to do with the answer.',
    given: 'CAST, CASDAL workshops',
  },
  {
    title: 'Risk terrain modeling and risk-based policing',
    for: 'Police leadership and researchers',
    blurb: 'Diagnosing the features of the environment that make places risky, with results from Kansas City, Atlantic City, and beyond.',
    given: 'International Conference on Crime Risk Analysis, IACA, Córdoba Province training',
  },
  {
    title: 'Hands-on: crime and place in Excel and ArcGIS Pro',
    for: 'Crime and intelligence analysts',
    blurb: 'A working session: clean an incident export, find repeat locations and hot streets, and build a briefing. Attendees leave with the free Toolkit.',
    given: 'IACA (two sessions), CASDAL',
  },
];

export const formats = [
  'Keynote (30–60 min)',
  'Conference session or panel',
  'Webinar',
  'Hands-on workshop (half or full day)',
  'Podcast or interview guest',
];
