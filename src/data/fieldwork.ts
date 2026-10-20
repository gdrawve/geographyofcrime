// ─────────────────────────────────────────────────────────────
// RESEARCH IN THE FIELD
// Partner sites, funded projects, practice outcomes, and technical
// reports, taken from the CV. The Research page builds the map,
// the funding section, and the reports list from this file.
// ─────────────────────────────────────────────────────────────

export type Site = {
  id: string;
  place: string;
  region: 'us' | 'latam';
  lat: number;
  lon: number;
  partner: string;
  years: string;
  summary: string;
  outcome?: string;        // a practice result worth calling out
  papers: string[];        // DOIs; titles come from research.json
  reports?: string[];      // technical report ids (below)
};

export const sites: Site[] = [
  {
    id: 'kansas-city', place: 'Kansas City, MO', region: 'us', lat: 39.0997, lon: -94.5786,
    partner: 'Kansas City Police Department', years: '2018–2021',
    summary: 'Risk-based policing experiment targeting the environmental conditions behind violent crime.',
    outcome: 'KCPD earned the IACP Leadership in Law Enforcement Research Award',
    papers: ['https://doi.org/10.1177/10986111211003205'],
  },
  {
    id: 'atlantic-city', place: 'Atlantic City, NJ', region: 'us', lat: 39.3643, lon: -74.4229,
    partner: 'Atlantic City Police Department', years: '2015–2021',
    summary: 'The ACTION plan for risk-based policing: spatial risk analysis for strategic and tactical operations, robbery risk in a tourist destination, and prevention at convenience stores.',
    outcome: "Featured on National Geographic Channel's Breakthrough (season 2)",
    papers: ['https://doi.org/10.1108/jpmd-07-2019-0064', 'https://doi.org/10.1080/15614263.2021.1917399'],
    reports: ['acpd-2017', 'acpd-2018'],
  },
  {
    id: 'jersey-city', place: 'Jersey City, NJ', region: 'us', lat: 40.7178, lon: -74.0431,
    partner: 'Rutgers Center on Public Security', years: '2021',
    summary: 'How robbery risk shifts across the hours of the day.',
    papers: ['https://doi.org/10.1177/0734016820981628'],
  },
  {
    id: 'little-rock', place: 'Little Rock, AR', region: 'us', lat: 34.7465, lon: -92.2896,
    partner: 'Little Rock PD, City of Little Rock, Little Rock School District', years: '2013–2023',
    summary: 'Aggravated assault risk across police divisions, space-time risk, mental-health calls, child maltreatment prediction, community schools, and youth violence prevention.',
    papers: [
      'https://doi.org/10.1080/0735648x.2016.1270849',
      'https://doi.org/10.1093/police/pay018',
      'https://doi.org/10.3390/ijgi12050205',
    ],
    reports: ['lr-maltreatment', 'psn-lr'],
  },
  {
    id: 'arkansas', place: 'Arkansas, statewide', region: 'us', lat: 35.2, lon: -91.4,
    partner: 'Arkansas law enforcement agencies', years: '2014–2021',
    summary: 'How place shapes crime in Arkansas NIBRS reporting, and habitual offenders in the state prison system.',
    papers: ['https://doi.org/10.1177/0011128720974317'],
    reports: ['adcc-2014'],
  },
  {
    id: 'chattanooga', place: 'Chattanooga, TN', region: 'us', lat: 35.0456, lon: -85.3097,
    partner: 'Chattanooga Police Department', years: '2020–2023',
    summary: 'Research partner on the Scenic City Crime Gun Intelligence Center and National Public Safety Partnership capacity building.',
    papers: [],
  },
  {
    id: 'green-bay', place: 'Green Bay, WI', region: 'us', lat: 44.5133, lon: -88.0133,
    partner: 'Green Bay Police Department', years: '2018',
    summary: 'A training exercise built on crime analyst and researcher partnership.',
    papers: ['https://doi.org/10.1093/police/pax092'],
  },
  {
    id: 'dallas', place: 'Dallas, TX', region: 'us', lat: 32.7767, lon: -96.797,
    partner: 'Child Poverty Action Lab', years: '2023',
    summary: 'Health and public-safety outcomes and the environmental backcloth across Dallas communities.',
    papers: [],
  },
  {
    id: 'texas', place: 'Texas, statewide', region: 'us', lat: 30.2672, lon: -97.7431,
    partner: 'Upbring', years: '2023',
    summary: 'Place-based models of child maltreatment risk across Texas communities.',
    papers: [],
  },
  {
    id: 'alabama', place: 'Alabama', region: 'us', lat: 33.5186, lon: -86.8104,
    partner: 'University of Alabama at Birmingham', years: '2020',
    summary: 'Pharmacies, the built environment, and fatal opioid overdose in rural and urban regions.',
    papers: ['https://doi.org/10.1016/j.drugpo.2020.102736', 'https://doi.org/10.1016/j.addbeh.2020.106555'],
  },
  {
    id: 'ohio', place: 'Ohio', region: 'us', lat: 39.9612, lon: -82.9988,
    partner: 'University of Alabama at Birmingham', years: '2023',
    summary: 'Crime and built-environment risk factors for fatal overdose in rural and urban counties.',
    papers: ['https://doi.org/10.1007/s12103-023-09739-3'],
  },
  {
    id: 'bogota', place: 'Bogotá, Colombia', region: 'latam', lat: 4.711, lon: -74.0721,
    partner: 'Rutgers Center on Public Security', years: '2018',
    summary: 'Risk terrain modeling and socio-economic stratification for violent crime victimization.',
    papers: ['https://doi.org/10.1007/s10610-018-9374-5'],
  },
  {
    id: 'cordoba', place: 'Córdoba, Argentina', region: 'latam', lat: -31.4201, lon: -64.1888,
    partner: 'Ministry of Government, Córdoba Province', years: '2018',
    summary: 'Risk-based policing seminar and training, and an RTM risk-reduction strategy for the provincial crime observatory.',
    papers: [],
    reports: ['cordoba-2018'],
  },
];

// ── Funding (totals as stated on the CV) ─────────────────────
export const fundingTotals = [
  { label: 'As PI or Co-PI', amount: 2727060 },
  { label: 'As research partner', amount: 408702 },
  { label: 'Contracting', amount: 242651 },
];

export type Grant = { year: number; title: string; funder: string; sector: 'Federal' | 'Police & city' | 'Foundation & nonprofit'; amount: number; note?: string };

// Amount = the award, or the subaward where the CV lists one.
export const grants: Grant[] = [
  { year: 2023, title: 'Trajectories of targeted violence: mobilization trends and interdiction opportunities', funder: 'Department of Homeland Security', sector: 'Federal', amount: 300216, note: 'Subaward' },
  { year: 2023, title: 'Equipping educators: enhancing school and community capacity to address violence', funder: 'OJJDP, with Little Rock School District', sector: 'Federal', amount: 182079, note: 'Subaward' },
  { year: 2023, title: 'National Public Safety Partnership: capacity building', funder: 'BJA, with Chattanooga PD', sector: 'Federal', amount: 40000, note: 'Subaward' },
  { year: 2023, title: 'Health, public safety, and the environmental backcloth across Dallas communities', funder: 'Child Poverty Action Lab', sector: 'Foundation & nonprofit', amount: 63997 },
  { year: 2023, title: 'Child maltreatment throughout Texas communities: place-based modeling', funder: 'Upbring', sector: 'Foundation & nonprofit', amount: 85991 },
  { year: 2022, title: 'REU Site: connecting research to practice in crime analytics', funder: 'National Science Foundation', sector: 'Federal', amount: 343163 },
  { year: 2022, title: "TRAIN Partnership: a children's advocacy center response to trauma", funder: 'Child Advocacy Center of Benton County', sector: 'Foundation & nonprofit', amount: 24819 },
  { year: 2021, title: 'Community schools as a hub for resilience and neighborhood empowerment', funder: 'BJA, with City of Little Rock', sector: 'Federal', amount: 175349, note: 'Subaward' },
  { year: 2020, title: 'Scenic City Crime Gun Intelligence Center', funder: 'BJA, with Chattanooga PD', sector: 'Federal', amount: 51274, note: 'Subaward' },
  { year: 2020, title: 'RAPID: the diffusion of fear and coronavirus', funder: 'National Science Foundation', sector: 'Federal', amount: 184257 },
  { year: 2019, title: 'Child maltreatment in Little Rock: aligning services with risk', funder: 'Predict, Align, Prevent', sector: 'Foundation & nonprofit', amount: 20000 },
  { year: 2019, title: 'Child maltreatment pilot project in Little Rock', funder: 'Predict, Align, Prevent', sector: 'Foundation & nonprofit', amount: 27000 },
  { year: 2018, title: 'Risk-based policing initiative for the KCPD', funder: 'Kansas City Police Department', sector: 'Police & city', amount: 13857 },
  { year: 2018, title: 'Federal terrorism court record repository', funder: 'National Institute of Justice', sector: 'Federal', amount: 731783 },
  { year: 2018, title: 'Together with Veterans: rural veteran suicide prevention', funder: 'WICHE (Department of Veterans Affairs)', sector: 'Federal', amount: 69984, note: 'Subcontract' },
  { year: 2017, title: 'Inmate-trainers in the Paws in Prison program', funder: 'Mental Health America of Northwest Arkansas', sector: 'Foundation & nonprofit', amount: 1000 },
  { year: 2017, title: 'Assessing radicalization risk with risk terrain modeling and conjunctive analysis', funder: 'National Institute of Justice', sector: 'Federal', amount: 716015 },
  { year: 2015, title: 'The ACTION plan for risk-based policing in Atlantic City', funder: 'Atlantic City Police Department', sector: 'Police & city', amount: 73944 },
];

// ── Practice outcomes ───────────────────────────────────────
export const outcomes = [
  { title: 'IACP Leadership in Law Enforcement Research Award', detail: 'Earned by Kansas City PD for the risk-based policing experiment.', site: 'kansas-city' },
  { title: 'NIJ Real-Time Crime Forecasting Challenge', detail: 'Selected winner, small-group category, 2017, with Caplan, Kennedy, and Piza.' },
  { title: "National Geographic's Breakthrough", detail: 'The Atlantic City risk-based policing project was featured in season 2.', site: 'atlantic-city' },
  { title: 'Key corrections reading', detail: "\"Recidivism and community context\" was added to ASU Center for Correctional Solutions' 2021 Key Reading List." },
];

// ── Technical reports ───────────────────────────────────────
export const reports = [
  { id: 'nsf-fear', year: 2023, title: 'The diffusion of fear: final report', for: 'National Science Foundation', authors: 'Fitzpatrick, Harris, Drawve' },
  { id: 'nij-radicalization', year: 2021, title: 'Innovative methodologies for assessing radicalization risk: risk terrain modeling and conjunctive analysis', for: 'National Institute of Justice', authors: 'Gruenewald, Drawve, Kennedy, Caplan, Ratcliff' },
  { id: 'lr-maltreatment', year: 2020, title: 'Little Rock child maltreatment: predictive analysis', for: 'Predict, Align, Prevent', authors: 'Drawve, Datta, Thomas' },
  { id: 'cordoba-2018', year: 2018, title: 'RTM para la predicción del crimen y el desarrollo de estrategias de reducción de riesgos', for: 'Observatory of Córdoba, Argentina', authors: 'Giménez-Santana, Drawve' },
  { id: 'acpd-2018', year: 2018, title: 'Atlantic City Police Department risk-based policing initiative, January–December 2017', for: 'Atlantic City Police Department', authors: 'Caplan, Kennedy, Drawve' },
  { id: 'acpd-2017', year: 2017, title: 'The Atlantic City Police Department risk-based policing initiative pilot project', for: 'Atlantic City Police Department', authors: 'Caplan, Kennedy, Drawve' },
  { id: 'adcc-2014', year: 2014, title: 'Descriptive analysis of habitual offenders in prison, 2004–2014', for: 'Arkansas Department of Community Corrections', authors: 'Drawve' },
  { id: 'psn-lr', year: 2013, title: 'Project Safe Neighborhood evaluation for Little Rock and North Little Rock', for: "U.S. Attorney's Office, Little Rock", authors: 'Moak, Drawve' },
];
