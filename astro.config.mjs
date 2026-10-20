// Astro configuration.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://geographyofcrime.com',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // Old GoDaddy URLs → new pages, so existing links and search
  // results keep working after the switch.
  redirects: {
    '/podcast-episodes': '/podcast/',
    '/about-me': '/about/',
    '/excel-videos': '/tutorials/#excel',
    '/esri-videos': '/tutorials/#arcgis',
    '/google-videos': '/tutorials/#google',
    '/news-articles': '/talks/',
    '/talks-&-presentations': '/talks/',
  },
});
