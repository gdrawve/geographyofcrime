// schema.org VideoObject for a YouTube video, following Google's video
// structured-data rules: a real uploadDate is required, embedUrl is the
// player URL, and contentUrl is left out because the actual media file
// isn't available (YouTube hosts it). With no verified date, returns
// null and the page simply omits the VideoObject.
import dates from '../data/video-dates.json';
import { site } from '../data/site';

const uploadDates = dates as Record<string, string>;

export function videoObject(id: string, name: string, description: string, extra: Record<string, unknown> = {}) {
  const uploadDate = uploadDates[id];
  if (!uploadDate) return null;
  return {
    '@type': 'VideoObject',
    name,
    description,
    uploadDate,
    thumbnailUrl: `${site.url}/yt/${id}.jpg`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    ...extra,
  };
}
