// ─────────────────────────────────────────────────────────────
// /llms.txt — a plain-text map of the site written for AI tools.
// It follows the proposed llms.txt format: a title, a one-line
// summary, then sections of links with short descriptions.
// It rebuilds automatically from the same data as the pages.
// ─────────────────────────────────────────────────────────────
import type { APIRoute } from 'astro';
import { site, person } from '../data/site';
import { episodes, epLabel, epTitle } from '../data/episodes';
import { tutorials, tracks } from '../data/tutorials';
import { talks, articles } from '../data/talks';
import research from '../data/research.json';
import { themes } from '../data/research-themes';

export const GET: APIRoute = () => {
  const u = (p: string) => `${site.url}${p}`;
  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${person.name}, ${person.honorific}, is ${person.jobTitle} at ${person.employer.name}. Previously: ${person.formerly}. Areas of expertise: ${person.knowsAbout.join(', ')}.`,
    '',
    '## Core pages',
    `- [About Grant Drawve](${u('/about/')}): biography, research profiles, and CV`,
    `- [The Geography of Crime podcast](${u('/podcast/')}): conversations on how place shapes crime and public safety`,
    `- [Tutorial library](${u('/tutorials/')}): ${tutorials.length} free crime-analysis and crime-mapping video tutorials`,
    `- [Research](${u('/research/')}): ${research.meta.works} publications, research themes, and co-author network`,
    `- [Talks and writing](${u('/talks/')}): workshops, guest appearances, and articles`,
    '',
    '## Research themes',
    ...themes.map((t) => `- ${t.name}: ${t.summary}`),
    '',
    '## Most-cited publications',
    ...[...research.works].sort((a, b) => b.cited - a.cited).slice(0, 15)
      .map((w) => `- [${w.title}](${w.doi ?? u('/research/')}) (${w.year})`),
    '',
    '## Podcast episodes',
    ...episodes.map((e) => `- [${epLabel(e)}: ${epTitle(e)}](${u(`/podcast/${e.slug}/`)})${e.summary ? `: ${e.summary}` : ''}`),
    '',
    '## Tutorials by track',
    ...tracks.flatMap((t) => [
      `### ${t.label}: ${t.blurb}`,
      ...tutorials.filter((x) => x.track === t.id).map((x) => `- [${x.title}](https://www.youtube.com/watch?v=${x.youtube})`),
    ]),
    '',
    '## Talks',
    ...talks.map((t) => `- [${t.title}](${t.youtube ? `https://www.youtube.com/watch?v=${t.youtube}` : t.url}): ${t.kind}, ${t.venue}`),
    '',
    '## Articles',
    ...articles.map((a) => `- [${a.title}](${a.url}): ${a.outlet}. ${a.note}`),
    '',
    '## Profiles',
    ...person.profiles.map((p) => `- [${p.label}](${p.url})`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
