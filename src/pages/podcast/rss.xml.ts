// Podcast RSS feed at /podcast/rss.xml, built from episodes.ts.
// Feed readers and many AI tools discover new episodes from this.
import rss from '@astrojs/rss';
import { site } from '../../data/site';
import { episodes, epLabel, epTitle } from '../../data/episodes';

export function GET() {
  return rss({
    title: 'The Geography of Crime',
    description: 'Conversations on how place shapes crime and public safety, hosted by Grant Drawve, PhD.',
    site: site.url,
    items: episodes.map((e) => ({
      title: `${epLabel(e)}: ${epTitle(e)}`,
      link: `/podcast/${e.slug}/`,
      description: e.summary || `With ${e.guests.join(' and ')}.`,
    })),
  });
}
