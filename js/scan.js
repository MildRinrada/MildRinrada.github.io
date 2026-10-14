// `scan` in the terminal: a passive security check of this site, in the spirit of SecureSight.
// Read-only: one request for this page's own headers, plus what the browser already knows (the resources
// it loaded, cookies, storage, links). Each finding is ranked by the risk it carries for this site in
// particular (a static portfolio with no login and no cookies), not by a generic checklist.

import { site } from '../data/town.js';

const ORDER = ['high', 'medium', 'low', 'info', 'ok'];
const LOCAL = /^(localhost|127\.|\[::1\])/;

async function ownHeaders(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method, cache: 'no-store', credentials: 'omit', redirect: 'follow' });
      if (r.ok) return { method, status: r.status, headers: r.headers };
    } catch {
      /* try the next method */
    }
  }
  return null;
}

// A starting Content-Security-Policy built from the origins this page has loaded from so far, plus the ones
// it only calls later (the weather, and the contact form and analytics once they're configured). The inline
// import map needs its hash in script-src, or the policy would block three.js.
async function suggestedCsp(resources) {
  const src = { script: new Set(), style: new Set(), font: new Set(), img: new Set(), connect: new Set() };
  const kind = { script: 'script', link: 'style', css: 'style', img: 'img', fetch: 'connect', xmlhttprequest: 'connect', beacon: 'connect' };
  for (const r of resources) {
    let origin;
    try {
      origin = new URL(r.name).origin;
    } catch {
      continue;
    }
    if (origin === location.origin || origin === 'null') continue;
    const k = /fonts\.gstatic\.com/.test(origin) ? 'font' : kind[r.initiatorType];
    if (k) src[k].add(origin);
  }
  src.connect.add('https://api.open-meteo.com');
  if (src.style.has('https://fonts.googleapis.com')) src.font.add('https://fonts.gstatic.com');
  if (site.contact?.emailjs?.publicKey) src.connect.add('https://api.emailjs.com');
  if (site.analytics?.goatcounter) {
    src.script.add('https://gc.zgo.at');
    src.connect.add(`https://${site.analytics.goatcounter}.goatcounter.com`);
    src.img.add(`https://${site.analytics.goatcounter}.goatcounter.com`);
  }
  const map = document.querySelector('script[type="importmap"]')?.textContent;
  const hash = map ? `'sha256-${await sha256(map)}'` : null;
  const list = (k, extra = []) => ["'self'", ...extra.filter(Boolean), ...[...src[k]].sort()].join(' ');
  return [
    "default-src 'self'",
    `script-src ${list('script', [hash])}`,
    `style-src ${list('style', ["'unsafe-inline'"])}`,
    `font-src ${list('font')}`,
    `img-src ${list('img', ['data:', 'blob:'])}`,
    `connect-src ${list('connect')}`,
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'none'",
  ].join('; ');
}

async function sha256(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...bytes));
}

export async function scanSite() {
  const url = location.origin + location.pathname;
  const local = location.protocol === 'http:' && LOCAL.test(location.hostname);
  const res = await ownHeaders(url);
  const h = (name) => res?.headers.get(name) ?? null;
  const resources = performance.getEntriesByType('resource');
  const f = [];
  const add = (level, title, detail, fix) => f.push({ level, title, detail, fix });

  // ---------- transport ----------
  if (location.protocol === 'https:') add('ok', 'Served over HTTPS', 'Every byte between the visitor and the town is encrypted.');
  else if (local) add('info', 'Local preview over plain HTTP', 'This is the preview on your own machine. Run the scan on the live site for the real picture.');
  else add('high', 'Page is not served over HTTPS', 'Anyone on the network could read or change the page, including the contact form.', 'Turn on "Enforce HTTPS" in the repository’s Pages settings.');

  const insecure = location.protocol === 'https:' ? resources.filter((r) => r.name.startsWith('http:')) : [];
  if (insecure.length) add('high', `Mixed content: ${insecure.length} file(s) over HTTP`, insecure.slice(0, 3).map((r) => r.name).join(', '), 'Load every file over https://.');
  else if (location.protocol === 'https:') add('ok', 'No mixed content', `All ${resources.length} files this page loaded came over HTTPS.`);

  const hsts = h('strict-transport-security');
  const days = Math.round(Number(/max-age=(\d+)/i.exec(hsts ?? '')?.[1] ?? 0) / 86400);
  if (hsts) add('ok', `HSTS: ${hsts}`, `For the next ${days} days browsers will refuse plain HTTP to this host, even if someone types http://.`);
  else if (!local) add('medium', 'No Strict-Transport-Security', 'The first visit over http:// could be intercepted before the redirect to HTTPS.', 'Send Strict-Transport-Security: max-age=31536000.');

  // ---------- headers the host decides ----------
  const metaCsp = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
  const csp = h('content-security-policy') ?? metaCsp?.content ?? null;
  if (csp) {
    const directive = (name) => new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`, 'i').exec(csp)?.[1]?.trim() ?? '';
    const scripts = directive('script-src') || directive('default-src');
    const where = h('content-security-policy') ? 'as a header' : 'as a meta tag';
    if (/'unsafe-inline'|'unsafe-eval'/.test(scripts))
      add('medium', 'CSP allows inline or eval’d scripts', `script-src ${scripts}. That switches off most of what a CSP is for.`, "Drop 'unsafe-inline' and 'unsafe-eval', and allow an inline script by its hash instead.");
    else add('ok', `Content-Security-Policy is set ${where}`, `Scripts may only come from: ${scripts}. No inline or eval’d code.`);
    // the import map is inline, so the policy has to carry its hash or three.js never loads
    const map = document.querySelector('script[type="importmap"]')?.textContent;
    if (map) {
      const want = `'sha256-${await sha256(map)}'`;
      if (scripts.includes(want)) add('ok', 'The import map’s hash matches the policy', want);
      else add('high', 'CSP blocks the import map', 'The import map changed but the hash in the policy didn’t, so three.js can’t load and the town falls back to the list view.', `Put ${want} in script-src in index.html.`);
    }
    if (directive('style-src').includes("'unsafe-inline'"))
      add('info', "style-src allows 'unsafe-inline'", 'The page sets colours through inline style attributes. Injected CSS can do far less than injected script, and scripts stay locked down.');
  } else
    add(
      'medium',
      'No Content-Security-Policy',
      'Risk is lower than usual here: the site has no login, stores nothing about visitors, and renders all text with textContent. A CSP would still be the second lock if a third-party script were ever tampered with.',
      `GitHub Pages can’t send headers, but a meta tag works. A starting point built from what this page loaded (try it on the preview first): <meta http-equiv="Content-Security-Policy" content="${await suggestedCsp(resources)}">`,
    );

  const frame = h('x-frame-options') ?? (/frame-ancestors/i.test(h('content-security-policy') ?? '') ? 'frame-ancestors' : null);
  if (frame) add('ok', `Framing is restricted (${frame})`, 'Other sites can’t load the town inside an invisible frame.');
  else
    add(
      'low',
      'Can be framed by other sites (no X-Frame-Options)',
      'Clickjacking needs something worth clicking: there is no login and no account here, only the contact form.',
      'Needs a response header (frame-ancestors doesn’t work in a meta CSP), so on GitHub Pages this means a proxy in front, such as Cloudflare.',
    );

  if (h('x-content-type-options')?.toLowerCase() === 'nosniff') add('ok', 'X-Content-Type-Options: nosniff', 'Browsers won’t guess file types.');
  else add('low', 'No X-Content-Type-Options', 'Files are served with the right types, so there is little to sniff; nosniff would make that a rule.', 'Send X-Content-Type-Options: nosniff (again a header, so a proxy on GitHub Pages).');

  const referrer = h('referrer-policy') ?? document.querySelector('meta[name="referrer"]')?.content ?? null;
  if (referrer) add('ok', `Referrer-Policy: ${referrer}`, 'Links out of town don’t carry the full address.');
  else
    add(
      'low',
      'No Referrer-Policy',
      'This one matters more than it looks: links sent to companies carry ?to=<company>. Today’s browser default (strict-origin-when-cross-origin) only sends the origin to other sites, so the company name doesn’t leak, but that relies on the default.',
      'Make it explicit: <meta name="referrer" content="strict-origin-when-cross-origin">.',
    );

  if (!h('permissions-policy')) add('info', 'No Permissions-Policy', 'The page never asks for the camera, microphone or location. A policy would turn that into a promise.', 'Permissions-Policy: camera=(), microphone=(), geolocation=().');

  const acao = h('access-control-allow-origin');
  if (acao === '*') add('info', 'Access-Control-Allow-Origin: *', 'Any site may read these files with JavaScript. Fine for a public static site with nothing private on it; never pair it with credentials.');

  const server = h('server');
  if (server && /\d/.test(server)) add('low', `Server header shows a version: ${server}`, 'Version numbers help an attacker pick a known exploit.', 'Hide the version (on the live site GitHub sends only “GitHub.com”).');
  else if (server) add('info', `Server: ${server}`, 'Names the host but no version, so it gives little away.');
  if (h('x-powered-by')) add('low', `X-Powered-By: ${h('x-powered-by')}`, 'Advertises the framework for free.', 'Remove the header.');

  // ---------- what the browser knows ----------
  const cookies = document.cookie ? document.cookie.split(';').map((c) => c.split('=')[0].trim()) : [];
  if (cookies.length) add('info', `Cookies readable by JavaScript: ${cookies.join(', ')}`, 'Script-readable cookies should never hold a session.', 'Session cookies belong in HttpOnly; Secure; SameSite cookies.');
  else add('ok', 'No cookies', 'The town sets none, and GoatCounter counts visits without them.');

  const tokens = [];
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(store.getItem(k) ?? '')) tokens.push(k);
      }
    } catch {
      /* storage blocked */
    }
  }
  if (tokens.length)
    add(
      'medium',
      `JWT in web storage: ${tokens.join(', ')}`,
      'Any script on the page can read it, so one XSS bug would hand over the session. (It’s planted for the town’s CTF: what does it say inside?)',
      'Keep session tokens in httpOnly cookies, as Happy Paws does.',
    );

  const thirdParty = [...document.scripts].filter((s) => s.src && new URL(s.src).origin !== location.origin);
  const unhashed = thirdParty.filter((s) => !s.integrity);
  const map = document.querySelector('script[type="importmap"]')?.textContent ?? '';
  const pinned = [...map.matchAll(/npm\/([\w.-]+@\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  if (pinned.length) add('ok', `Third-party code pinned to exact versions: ${[...new Set(pinned)].join(', ')}`, 'A new release on the CDN can’t change what this page runs.');
  if (unhashed.length)
    add(
      'low',
      `${unhashed.length} third-party script(s) without Subresource Integrity`,
      `${[...new Set(unhashed.map((s) => new URL(s.src).host))].join(', ')}. Pinned versions limit the damage; a hash would also catch a tampered file. GoatCounter’s count.js changes over time, so it can’t carry one.`,
      'Add integrity="sha384-…" crossorigin="anonymous" to the scripts that never change.',
    );

  const openers = [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !/noopener|noreferrer/.test(a.rel));
  if (openers.length) add('low', `${openers.length} link(s) open a new tab without rel="noopener"`, 'The opened page could reach back through window.opener.', 'Add rel="noopener".');
  else add('ok', 'External links use rel="noopener"', 'Pages opened from the town can’t reach back into it.');

  f.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  const counts = Object.fromEntries(ORDER.map((l) => [l, f.filter((x) => x.level === l).length]));
  return { url, local, method: res?.method ?? null, status: res?.status ?? null, headerCount: res ? [...res.headers.keys()].length : 0, resourceCount: resources.length, findings: f, counts };
}
