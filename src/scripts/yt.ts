// ─────────────────────────────────────────────────────────────
// Privacy-friendly YouTube slots.
// Each video shows a thumbnail stored on this site (public/yt/, fetched
// at deploy time by scripts/fetch_thumbs.mjs) and a play button. Nothing
// is requested from YouTube or Google until someone presses play; only
// then is the player loaded, from YouTube's no-cookie domain.
// Without JavaScript, the slot is a plain link to the video on YouTube.
// ─────────────────────────────────────────────────────────────

const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/** Build a video slot (used where videos are added after page load). */
export function facade(id: string, title: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'yt';
  const a = document.createElement('a');
  a.className = 'yt-btn';
  a.href = watchUrl(id);
  a.dataset.yt = id;
  a.dataset.title = title;
  a.setAttribute('aria-label', `Play: ${title}`);
  const img = document.createElement('img');
  img.src = `/yt/${encodeURIComponent(id)}.jpg`;
  img.alt = '';
  img.loading = 'lazy';
  img.width = 480; img.height = 360;
  img.addEventListener('error', () => img.remove());   // no thumbnail: plain slot
  const play = document.createElement('span');
  play.className = 'yt-play';
  play.setAttribute('aria-hidden', 'true');
  a.append(img, play);
  box.append(a);
  return box;
}

/** Swap a slot for the real player. */
function play(btn: HTMLAnchorElement) {
  const id = btn.dataset.yt!, title = btn.dataset.title || 'YouTube video';
  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
  frame.title = title;
  frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  btn.replaceWith(frame);
  frame.focus();
}

// One listener for the whole page handles every slot, including ones
// added later (the tutorial list adds them when a row is opened).
document.addEventListener('click', (e) => {
  const btn = (e.target as Element | null)?.closest?.('a.yt-btn') as HTMLAnchorElement | null;
  if (!btn || e.ctrlKey || e.metaKey || e.shiftKey) return;   // let "open in new tab" work
  e.preventDefault();
  play(btn);
});
// Thumbnails that fail to load (not fetched yet) are removed, leaving the plain slot.
document.querySelectorAll<HTMLImageElement>('.yt img').forEach((img) => {
  if (img.complete && !img.naturalWidth) img.remove();
  else img.addEventListener('error', () => img.remove());
});
