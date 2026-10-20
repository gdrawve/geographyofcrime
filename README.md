# geographyofcrime.com

Personal hub for Grant Drawve, PhD: *The Geography of Crime* podcast, crime-analysis tutorials, talks, and writing.

Built with [Astro](https://astro.build) and published to GitHub Pages automatically on every push to `main`.

## Where content lives

All content is in `src/data/`. Edit a file there and every page, the search index, the RSS feed, `llms.txt`, and the schema.org tags update together.

| To add… | Edit | What to do |
|---|---|---|
| A podcast episode | `src/data/episodes.ts` | Copy an episode block to the top of the list and fill it in. Add `summary`, `takeaways`, and `transcript` when ready. |
| A tutorial | `src/data/tutorials.ts` | Add one line: `['YouTubeID', 'Title', 'track']`. |
| A talk or article | `src/data/talks.ts` | Add an entry to `talks`, `conversations`, or `articles`. |
| Your links or bio facts | `src/data/site.ts` | One place for name, title, profiles, and email. |

## Built-in pieces

- **lite-youtube-embed**: videos load only when tapped, so pages stay fast.
- **Pagefind**: static site search, built after each Astro build.
- **AI and search discoverability**: schema.org JSON-LD on every page, `/llms.txt`, `/robots.txt`, sitemap, and podcast RSS.
- **Old URL redirects**: GoDaddy-era links (`/podcast-episodes`, `/about-me`, etc.) forward to the new pages.

## Run locally

```bash
npm install
npm run dev      # live preview at http://localhost:4321
npm run build    # production build in dist/
```
