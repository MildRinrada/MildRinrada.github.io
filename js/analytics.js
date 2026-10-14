// Visit counts with GoatCounter: free, no cookies, nothing personal stored, so no consent banner is needed.
// Turned on by site.analytics.goatcounter in data/town.js. Never counts on localhost or a file:// page.
//
// What gets recorded (paths as they appear in the GoatCounter dashboard):
//   page view   /                     or  /to/<company>       (the ?to= link a company was sent)
//   events      <company>/open/<id>   which building they opened ("direct" when there was no ?to=)
//               <company>/tour/start · tour/finish · cv/print · resume/download · match/run · contact/sent
//               <company>/link/<id>/<kind>   a click to a live site, repo, Figma file or map
//
// To keep your own visits out: open the site once with ?notrack=1 (and ?notrack=0 to undo).

let who = 'direct';
let ready = null;

const NOTRACK = 'notrack';
const local = () => location.protocol === 'file:' || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);

function readNoTrack() {
  try {
    const p = new URLSearchParams(location.search).get(NOTRACK);
    if (p === '1') localStorage.setItem(NOTRACK, '1');
    if (p === '0') localStorage.removeItem(NOTRACK);
    return localStorage.getItem(NOTRACK) === '1';
  } catch {
    return false;
  }
}

export function initAnalytics({ code, company, from }) {
  const skip = readNoTrack();
  if (!code || skip || local()) return;
  who = company || 'direct';
  window.goatcounter = { no_onload: true };
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${encodeURIComponent(code)}.goatcounter.com/count`;
  ready = new Promise((resolve) => {
    s.onload = resolve;
    s.onerror = () => resolve(); // blocked by an ad blocker: carry on without counts
  });
  document.head.append(s);
  const path = company ? `/to/${company}${from ? ` (${from})` : ''}` : from ? `/ (${from})` : '/';
  send({ path, title: document.title });
}

function send(data) {
  ready?.then(() => {
    try {
      window.goatcounter?.count?.(data);
    } catch {
      /* counting must never break the page */
    }
  });
}

export function track(name, title = '') {
  if (!ready) return;
  send({ path: `${who}/${name}`, title: title || name, event: true });
}
