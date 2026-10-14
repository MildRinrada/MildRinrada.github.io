// The 404 page: short links (/securesight opens that building), friendly notes for scanners probing for
// /.env or /wp-admin, the CTF's /staff-only flag, and the 'Lost and found' achievement.
// It lives in its own file so the page's Content-Security-Policy needs no hashes.

import { site, places } from '/data/town.js';
import { t, setLangValue } from '/js/i18n.js';
import { progress } from '/js/progress.js';
import { initAnalytics } from '/js/analytics.js';

const params = new URLSearchParams(location.search);
let path = location.pathname;
try {
  path = decodeURIComponent(path);
} catch {
  /* a malformed address: show it as it came */
}
const slug = path.replace(/\/+$/, '').split('/').pop().toLowerCase().replace(/\.html?$/, '');

// Short links: /securesight opens that building, /th the Thai version, /cv the About me panel, and so on.
// Anything a ?to= link carried (the company, the role, the language) comes along.
const ids = new Set(places.filter((p) => !p.hidden).map((p) => p.id));
const HASH = { about: 'about', me: 'about', cv: 'about', resume: 'about', contact: 'next-lot', achievements: 'achievements', trophies: 'achievements' };
const QUERY = { th: ['lang', 'th'], en: ['lang', 'en'], list: ['view', 'list'], projects: ['view', 'list'], work: ['view', 'list'], portfolio: ['view', 'list'] };
// Addresses scanners try on every site. There's nothing behind them here, so they get a friendly note.
const HONEY = /^\/(\.env|\.git|wp-admin|wp-login\.php|wp-content|xmlrpc\.php|phpmyadmin|admin|administrator|login|backup|server-status|config\.php)(\/|$)/i;
// robots.txt sends search engines away from here, which is how the CTF's second flag gets found
const STAFF = /^\/staff-only(\/|$)/i;
const STAFF_FLAG = 'FLAG{robots_txt_is_not_access_control}';
const go = (q, hash = '') => location.replace(`/${q.toString() ? `?${q}` : ''}${hash ? `#${hash}` : ''}`);

if (ids.has(slug) || HASH[slug]) go(params, ids.has(slug) ? slug : HASH[slug]);
else if (QUERY[slug]) {
  params.set(...QUERY[slug]);
  go(params);
} else show(STAFF.test(path) ? 'staff' : HONEY.test(path) ? 'honey' : 'lost');

function show(kind) {
  let lang = params.get('lang');
  try {
    lang ??= localStorage.getItem('lang');
  } catch {
    /* storage blocked */
  }
  lang ??= (navigator.languages ?? [navigator.language]).some((l) => l?.toLowerCase().startsWith('th')) ? 'th' : 'en';
  setLangValue(lang);
  document.documentElement.lang = lang === 'th' ? 'th' : 'en';
  document.title = t('404.pageTitle');
  const [title, body] = { lost: ['404.title', '404.body'], honey: ['404.honeyTitle', '404.honeyBody'], staff: ['404.staffTitle', '404.staffBody'] }[kind];
  document.querySelector('h1').dataset.k = title;
  document.querySelector('.lost-body').dataset.k = body;
  for (const node of document.querySelectorAll('[data-k]')) node.textContent = t(node.dataset.k);
  document.querySelector('.lost-path').textContent = path;
  if (kind === 'staff') {
    const box = document.querySelector('.lost-flag');
    box.querySelector('code').textContent = STAFF_FLAG;
    box.querySelector('small').textContent = t('404.flagHint');
    box.hidden = false;
  }

  // keep the company, role and language on the way back into town
  const keep = new URLSearchParams();
  for (const k of ['to', 'role', 'lang']) if (params.get(k)) keep.set(k, params.get(k));
  document.querySelector('[data-k="404.home"]').href = `/${keep.toString() ? `?${keep}` : ''}`;
  keep.set('view', 'list');
  document.querySelector('[data-k="404.list"]').href = `/?${keep}`;

  // finding this page is one of the town's achievements
  if (progress.unlock('lost')) {
    const ach = document.querySelector('.lost-ach');
    ach.querySelector('span').textContent = `${t('ach.unlocked')}: ${t('ach.lost.name')}`;
    ach.hidden = false;
  }

  initAnalytics({ code: site.analytics?.goatcounter, company: params.get('to') ?? '', path: `/404${path}` });
  document.documentElement.classList.remove('waiting');
}
