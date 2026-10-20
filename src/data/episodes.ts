// ─────────────────────────────────────────────────────────────
// PODCAST EPISODES
// To add an episode: copy one block, paste it at the TOP of the
// list, and fill it in. The episode page, the podcast list, the
// RSS feed, llms.txt, and the schema.org tags all build from this.
//
//   youtube:   the 11-character ID from the YouTube link
//              (youtube.com/watch?v=THIS_PART)
//   summary:   2–3 sentences. Leave '' until written.
//   takeaways: short bullet points. Leave [] until written.
//   transcript: paste the cleaned transcript as plain text.
//              This is the single biggest boost for AI search.
// ─────────────────────────────────────────────────────────────

export type Episode = {
  number: number;
  part?: string;
  slug: string;
  guests: string[];
  youtube: string;
  companion?: { label: string; url: string };
  summary: string;
  takeaways: string[];
  transcript: string;
};

export const intro = { youtube: 'k2TFZB0ELXI', title: 'Introduction to the podcast' };

export const episodes: Episode[] = [
  {
    number: 9,
    slug: '09-michael-nino',
    guests: ['Dr. Michael Niño'],
    youtube: 'rAstPqgMkoE',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/beyond-the-map-how-place-shapes-health-in-arkansas/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 8,
    slug: '08-charlotte-gill',
    guests: ['Dr. Charlotte Gill'],
    youtube: 'iMoKPTPXc0U',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/bridging-research-and-reality-in-crime-prevention/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 7,
    slug: '07-chamberlain-boggess',
    guests: ['Dr. Alyssa Chamberlain', 'Dr. Lyndsay Boggess'],
    youtube: 'E3IJeM0QIOA',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/spatial-criminology-crime-communites-risk/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 6,
    slug: '06-christy-vanmeter',
    guests: ['Christy VanMeter'],
    youtube: 'PMGeiAaM6Lk',
    companion: { label: 'Companion ArcGIS dashboard', url: 'https://capindexinc.maps.arcgis.com/apps/dashboards/4171de56e3c041ec94fe702f8962ce01' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 5,
    slug: '05-tim-hart',
    guests: ['Dr. Tim Hart'],
    youtube: 'AuRcPZnHFQs',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/geography-of-crime-and-ai/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 4,
    slug: '04-emily-blackburn',
    guests: ['Emily Blackburn'],
    youtube: 'o8ds8s-zgJU',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/from-street-crime-to-data-solutions/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 3,
    slug: '03-alejandro-gimenez-santana',
    guests: ['Dr. Alejandro Giménez Santana'],
    youtube: 'ko7fQB1xKVI',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/geography-of-crime-the-power-of-partnership/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 2,
    slug: '02-eric-piza',
    guests: ['Dr. Eric Piza'],
    youtube: '8_of5G7ZIWY',
    companion: { label: 'Episode write-up on CAP Index', url: 'https://capindex.com/podcast-geography-of-crime-building-smarter-partnerships/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 1,
    part: 'Part 3 of 3',
    slug: '01-noah-fritz-part-3',
    guests: ['Dr. Noah Fritz'],
    youtube: 'aZlnW4J9Pes',
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 1,
    part: 'Part 2 of 3',
    slug: '01-noah-fritz-part-2',
    guests: ['Dr. Noah Fritz'],
    youtube: '_42kX5ScGBw',
    companion: { label: 'Concepts and jargon explained', url: 'https://capindex.com/advancing-crime-analysis/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
  {
    number: 1,
    part: 'Part 1 of 3',
    slug: '01-noah-fritz-part-1',
    guests: ['Dr. Noah Fritz'],
    youtube: 'lNbOIJGoz2I',
    companion: { label: 'Concepts and jargon explained', url: 'https://capindex.com/optimizing-crime-prevention-2/' },
    summary: '',
    takeaways: [],
    transcript: '',
  },
];

// Helper: "Ep. 07" style label used across the site.
export const epLabel = (e: Episode) =>
  `Ep. ${String(e.number).padStart(2, '0')}${e.part ? ` · ${e.part}` : ''}`;

export const epTitle = (e: Episode) => e.guests.join(' & ');
