// UI for MildRinrada Town: pins, detail panel and gallery, About me, list view, intro, job matching,
// printable CV, Thai/English, live Bangkok weather and the toggles. The 3D scene is loaded from world.js;
// if WebGL or the CDN is unavailable, the list view takes over.

import { site, places as allPlaces, tour as tourOrder } from '../data/town.js';
import { createTerminal } from './terminal.js';
import { createTour } from './tour.js';
import { contactForm, contactReady } from './contact.js';
import { initAnalytics, track as count } from './analytics.js';
import { createAchievements } from './achievements.js';
import { festivalNow } from './festivals.js';
import { progress as saved } from './progress.js';
import { createCtf } from './ctf.js';
import { scanSite } from './scan.js';
import { qrSvg } from './qr.js';
import { consoleEgg } from './console.js';
import { t, tIn, tp, ts, skillLabel, getLang, setLangValue, SAMPLE_JD } from './i18n.js';
import { detectSkills, matchSkills, roleSkills, ROLES } from './skills.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const body = document.body;
const panel = $('#panel');
const list = $('#list');
const intro = $('#intro');
const loader = $('#loader');
const lightbox = $('#lightbox');
const matcher = $('#matcher');

// `hidden: true` in data/town.js keeps a project out of the town, the list, the CV, the matcher and the terminal.
const places = allPlaces.filter((p) => !p.hidden);

const ABOUT = { id: 'about', kind: 'about', icon: 'person', title: `${site.name} (${site.nickname})` };
const AWARDS = { id: 'achievements', kind: 'achievements', icon: 'trophy', title: 'Achievements' };
const byId = new Map([...places.map((p) => [p.id, p]), [ABOUT.id, ABOUT], [AWARDS.id, AWARDS]]);
const pins = new Map(); // id → button
const layerTags = []; // { el, kind }
const LAYER_ORDER = ['frontend', 'backend', 'infra', 'data'];
const mobile = matchMedia('(max-width: 720px)');
const params = new URLSearchParams(location.search);

// ?to=Company personalises the vacant lot and the intro. Rendered with textContent only, never as HTML.
const company = (params.get('to') ?? '')
  .replace(/[^\p{L}\p{M}\p{N} .,&'’()+-]/gu, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 40);
const role = ROLES[params.get('role')] ? params.get('role') : null;
// Halloween and friends (festivals.js): the town dresses up on those dates, or any day with ?festival=halloween
const festival = festivalNow(params);

let world = null;
let terminal = null;
let current = null;
let isNight = false;
let isBlueprint = false;
let resumeOk = false;
let match = null; // { kind: 'jd' | 'role', role?, result }
let tour = null;
let cvQr = null; // the CV's QR code, made ahead so Ctrl+P can print it straight away
let awards = null; // achievements.js
let ctf = null; // ctf.js
const emailjs = site.contact?.emailjs;

// Small DOM helper: el('p', { class: 'x', text: 'hi' }, child, [children]). Falsy children are skipped.
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false || kid === '') continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

const storage = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: fine, it just won't be remembered */
    }
  },
};

// Everything worth counting goes through here: achievements hear about it, and so does analytics when it's on.
function track(name, title = '') {
  awards?.note(name);
  count(name, title);
}

const pct = (p) => (p.progress ? Math.round((p.progress.value / p.progress.total) * 100) : null);
const title = (p) => tp(p, 'title');

// Every building gets its own pastel, shared by its pin, its panel and its card.
const PASTELS = ['#ffe681', '#f8d5da', '#cfe1ef', '#dcd0ea', '#cfe5c4', '#f9dcc6', '#f6c4bd', '#e5ddd3'];
// Colour icons live in assets/icons/ (Fluent UI System Icons, colour set, MIT licence).
const iconImg = (name, className = 'ic') => el('img', { class: className, src: `assets/icons/${name}.svg`, alt: '', decoding: 'async', draggable: 'false' });
const starIcon = () => iconImg('star', 'ic ic-star');

const tint = (p) => (p.kind === 'about' ? '#f9dcc6' : PASTELS[Math.max(0, places.indexOf(p)) % PASTELS.length]);

function statusLabel(p) {
  if (p.status === 'live') return t('status.live');
  if (p.status === 'building') return pct(p) != null ? `${t('status.building')} ${pct(p)}%` : t('status.building');
  return null;
}

function pinText(p) {
  if (p.kind === 'lot') return company ? { title: t('lot.reserved', { company }), sub: t('lot.reservedSub') } : { title: t('lot.title'), sub: t('lot.sub') };
  const name = tp(p, 'short') ?? title(p);
  if (p.kind === 'work') return { title: name, sub: t('pin.work', { period: tp(p, 'period') }) };
  if (p.kind === 'education') return { title: name, sub: tp(p, 'tagline') };
  return { title: name, sub: statusLabel(p) ?? tp(p, 'category') };
}

// ---------- 3D anchors ----------
function fillPin(btn, p) {
  const tx = pinText(p);
  const count = match?.result.perPlace.get(p.id);
  btn.setAttribute('aria-label', `${tx.title}. ${tx.sub}. ${t('pin.open')}`);
  btn.replaceChildren(
    el(
      'span',
      { class: 'pin-inner' },
      el('span', { class: 'pin-icon', 'aria-hidden': 'true' }, iconImg(p.icon)),
      el('span', { class: 'pin-text' }, el('b', { text: tx.title }), el('small', { text: tx.sub })),
      count ? el('span', { class: 'pin-badge', 'aria-hidden': 'true' }, starIcon(), String(count)) : null,
    ),
  );
}

function makePin(p) {
  const btn = el('button', { class: `pin pin-${p.kind}${p.status ? ` pin-${p.status}` : ''}`, type: 'button', style: `--tint: ${tint(p)}` });
  fillPin(btn, p);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    select(p.id);
  });
  btn.addEventListener('pointerenter', () => world?.setHover(p.id));
  btn.addEventListener('pointerleave', () => world?.setHover(null));
  pins.set(p.id, btn);
  return btn;
}

function refreshPins() {
  for (const [id, btn] of pins) {
    const p = byId.get(id);
    fillPin(btn, p);
    const n = match?.result.perPlace.get(id) ?? 0;
    btn.classList.toggle('is-match', Boolean(match) && n > 0);
    btn.classList.toggle('is-dim', Boolean(match) && n === 0 && p.kind !== 'lot');
  }
}

function makeLayerTag(layer) {
  const kind = el('span', { class: 'layer-kind', text: t(`layer.${layer.kind}`) });
  layerTags.push({ el: kind, kind: layer.kind });
  return el('div', { class: `layer-tag layer-${layer.kind}` }, kind, el('span', { class: 'layer-items', text: layer.items.join(', ') }));
}

function onHover(id) {
  for (const [pid, pin] of pins) pin.classList.toggle('is-hover', pid === id);
}

// ---------- images ----------
function photo(className) {
  const img = el('img', { class: className, src: site.photo, alt: `${site.name} (${site.nickname})`, decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(el('span', { class: `${className} photo-fallback`, 'aria-hidden': 'true', text: 'MR' })), { once: true });
  return img;
}

// A gallery item is a video when it says so or when the file is one (.mp4 / .webm / .mov).
const isVideo = (item) => item.type === 'video' || /\.(mp4|webm|mov)$/i.test(item.src);
// A PDF shows its first page as the picture, with buttons to open and download the file.
const isPdf = (item) => item.type === 'pdf' || /\.pdf$/i.test(item.src);
const firstImage = (p) => p.media?.images?.find((item) => !isVideo(item));

// "Cover" is the first picture and screenshots count pictures only, so a video in front doesn't shift them.
function caption(item, i, list) {
  // a caption can be one string, or { en, th } to follow the language button
  if (item.caption) return typeof item.caption === 'object' ? item.caption[getLang()] ?? item.caption.en : item.caption;
  if (isVideo(item)) return t('img.video');
  if (isPdf(item)) return t('img.pdf');
  const n = list.slice(0, i).filter((x) => !isVideo(x) && !isPdf(x)).length;
  return n === 0 ? t('img.cover') : t('img.shot', { n: n + 1 });
}

const missing = (item) => el('span', { class: 'g-missing', text: t(isVideo(item) ? 'img.videoMissing' : isPdf(item) ? 'img.pdfMissing' : 'img.missing', { src: item.src }) });

// pdf.js draws the first page. It comes from the CDN only when a PDF is actually on screen.
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/';
let pdfjs = null;
const pdfCovers = new Map();
function pdfCover(src) {
  if (!pdfCovers.has(src)) {
    pdfCovers.set(
      src,
      (async () => {
        pdfjs ??= import(`${PDFJS}pdf.min.mjs`).then((lib) => {
          lib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
          return lib;
        });
        const doc = await (await pdfjs).getDocument(src).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 960 / page.getViewport({ scale: 1 }).width });
        const canvas = el('canvas', { width: String(Math.round(viewport.width)), height: String(Math.round(viewport.height)) });
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        return { url: canvas.toDataURL('image/jpeg', 0.86), pages: doc.numPages, ratio: viewport.width / viewport.height };
      })(),
    );
  }
  return pdfCovers.get(src);
}

function pdfThumb(item, p, i, list = p.media?.images ?? [item]) {
  const img = el('img', { alt: `${title(p)}: ${caption(item, i, list)}`, decoding: 'async' });
  const box = el('span', { class: 'pdf-thumb' }, img, el('span', { class: 'pdf-badge', text: 'PDF' }));
  pdfCover(item.src)
    .then(({ url, ratio }) => {
      img.src = url;
      box.classList.toggle('pdf-portrait', ratio < 1);
    })
    .catch(() => box.replaceWith(missing(item)));
  return box;
}

function shotImg(im, p, i, loading = 'lazy', list = p.media?.images ?? [im]) {
  const img = el('img', { src: im.src, alt: `${title(p)}: ${caption(im, i, list)}`, loading, decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(missing(im)), { once: true });
  return img;
}

// A video's cover: its own `poster`, otherwise the project's first picture.
const posterOf = (item, p) => item.poster ?? firstImage(p)?.src;

// The full player for the panel and the lightbox. With a cover to show, nothing is downloaded until
// the visitor presses play: a demo video is many megabytes, and fetching it up front slows every
// other picture and the 3D town on a phone.
function videoEl(item, p, { thumb = false, autoplay = false } = {}) {
  const poster = posterOf(item, p);
  const v = el('video', {
    src: thumb ? `${item.src}#t=0.5` : item.src,
    poster,
    controls: !thumb,
    autoplay,
    muted: thumb,
    playsinline: true,
    preload: autoplay ? 'auto' : poster ? 'none' : 'metadata',
    'aria-label': `${title(p)}: ${t('img.video')}`,
  });
  if (thumb) v.muted = true;
  v.addEventListener('error', () => v.replaceWith(missing(item)), { once: true });
  return v;
}

// Thumbnail strip: the cover picture, never a second copy of the video.
function videoThumb(item, p) {
  const poster = posterOf(item, p);
  const face = poster ? el('img', { src: poster, alt: '', loading: 'lazy', decoding: 'async' }) : videoEl(item, p, { thumb: true });
  return [face, el('span', { class: 'g-play', 'aria-hidden': 'true' })];
}

function gallery(p) {
  const items = p.media.images;
  const main = el('div', { class: 'g-main' });
  const actions = el('div', { class: 'g-actions' });
  const cap = el('figcaption', { class: 'g-cap' });
  const thumbs = items.length > 1 ? el('div', { class: 'g-thumbs' }) : null;
  let showing = -1;
  const show = (i) => {
    const item = items[i];
    const open = () => openLightbox(p, i);
    showing = i;
    main.style.aspectRatio = '';
    const count = items.length > 1 ? `${i + 1}/${items.length}` : '';
    cap.textContent = [caption(item, i, items), count && `(${count})`].filter(Boolean).join(' ');
    actions.replaceChildren();
    if (isPdf(item)) {
      // The page opens the PDF in the browser's own viewer; the buttons open or save it.
      main.replaceChildren(el('a', { class: 'g-pdf', href: item.src, target: '_blank', rel: 'noopener', 'aria-label': t('pdf.open') }, pdfThumb(item, p, i, items)));
      actions.append(
        el('a', { class: 'btn btn-primary', href: item.src, target: '_blank', rel: 'noopener', text: t('pdf.open') }),
        el('a', { class: 'btn btn-ghost', href: item.src, download: '', text: t('pdf.download') }),
      );
      pdfCover(item.src)
        .then(({ pages, ratio }) => {
          if (showing !== i) return;
          if (ratio < 1) main.style.aspectRatio = String(Math.max(ratio, 0.6)); // a portrait page keeps its shape
          cap.textContent = `${caption(item, i, items)} (${[t('pdf.pages', { n: pages }), count].filter(Boolean).join(', ')})`;
        })
        .catch(() => {});
    } else {
      main.replaceChildren(
        isVideo(item)
          ? el('div', { class: 'g-video' }, videoEl(item, p), el('button', { class: 'g-expand', type: 'button', 'aria-label': t('img.open'), onclick: open, text: '⤢' }))
          : el('button', { class: 'g-image', type: 'button', 'aria-label': t('img.open'), onclick: open }, shotImg(item, p, i, 'eager'), el('span', { class: 'g-zoom', 'aria-hidden': 'true', text: '⤢' })),
      );
    }
    thumbs?.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
  };
  items.forEach((item, i) =>
    thumbs?.append(
      el(
        'button',
        { class: `g-thumb${isVideo(item) ? ' g-thumb-video' : ''}`, type: 'button', 'aria-label': isVideo(item) ? t('img.playVideo') : t('img.show', { n: i + 1 }), onclick: () => show(i) },
        isVideo(item) ? videoThumb(item, p) : isPdf(item) ? pdfThumb(item, p, i, items) : shotImg(item, p, i),
      ),
    ),
  );
  show(0);
  return el('figure', { class: 'p-gallery' }, main, actions, cap, thumbs);
}

let lb = null;
function openLightbox(p, i) {
  for (const v of $$('video', panel)) v.pause(); // one player at a time
  lb = { p, i };
  renderLightbox();
  lightbox.classList.add('open');
  lightbox.inert = false;
  $('.lb-close', lightbox).focus({ preventScroll: true });
}
function renderLightbox() {
  const imgs = lb.p.media.images;
  const im = imgs[lb.i];
  $('.lb-figure', lightbox).replaceChildren(
    isVideo(im) ? videoEl(im, lb.p, { autoplay: true }) : isPdf(im) ? pdfThumb(im, lb.p, lb.i, imgs) : shotImg(im, lb.p, lb.i, 'eager'),
    el('figcaption', { text: `${title(lb.p)}: ${caption(im, lb.i, imgs)} (${lb.i + 1}/${imgs.length})` }),
  );
  $('.lb-prev', lightbox).hidden = $('.lb-next', lightbox).hidden = imgs.length < 2;
}
function stepLightbox(d) {
  if (!lb) return;
  const n = lb.p.media.images.length;
  lb.i = (lb.i + d + n) % n;
  renderLightbox();
}
function closeLightbox() {
  lb = null;
  $('.lb-figure', lightbox).replaceChildren(); // stops a video that was playing
  lightbox.classList.remove('open');
  lightbox.inert = true;
}

// ---------- detail panel ----------
const section = (heading, ...content) => el('section', { class: 'p-section' }, el('h3', { text: heading }), ...content);

function stack(layers) {
  const ordered = [...layers].sort((a, b) => LAYER_ORDER.indexOf(a.kind) - LAYER_ORDER.indexOf(b.kind));
  return el(
    'div',
    { class: 'stack' },
    ordered.map((l) =>
      el('div', { class: `stack-row stack-${l.kind}` }, el('span', { class: 'stack-kind', text: t(`layer.${l.kind}`) }), el('span', { class: 'stack-items' }, l.items.map((i) => el('span', { class: 'chip', text: i })))),
    ),
    world && !isBlueprint && el('button', { class: 'stack-blueprint', type: 'button', onclick: () => setBlueprint(true), text: t('stack.blueprint') }),
  );
}

function progress(p) {
  if (!p.progress) return null;
  const { value, total } = p.progress;
  const label = tp(p, 'progressLabel') ?? p.progress.label;
  return el(
    'div',
    { class: 'p-progress' },
    el('div', { class: 'p-progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(value), 'aria-label': label }, el('span', { style: `width: ${pct(p)}%` })),
    el('p', { class: 'p-progress-text' }, el('b', { text: `${value} / ${total}` }), ` ${label}`),
  );
}

function linkButtons(p) {
  const links = [];
  const out = (kind) => () => track(`link/${p.id}/${kind}`);
  if (p.links?.live) links.push(el('a', { class: 'btn btn-primary', href: p.links.live, target: '_blank', rel: 'noopener', text: t('btn.live'), onclick: out('live') }));
  if (p.links?.design) links.push(el('a', { class: `btn ${links.length ? 'btn-ghost' : 'btn-primary'}`, href: p.links.design, target: '_blank', rel: 'noopener', text: t('btn.design'), onclick: out('design') }));
  if (p.links?.repo) links.push(el('a', { class: 'btn btn-ghost', href: p.links.repo, target: '_blank', rel: 'noopener', text: t('btn.code'), onclick: out('repo') }));
  if (p.links?.map) links.push(el('a', { class: 'btn btn-ghost', href: p.links.map, target: '_blank', rel: 'noopener', text: t('btn.map'), onclick: out('map') }));
  return links.length ? el('div', { class: 'p-actions' }, links) : null;
}

function contactButtons() {
  return el(
    'div',
    { class: 'p-actions' },
    contactReady(emailjs) && current !== 'next-lot' && el('button', { class: 'btn btn-primary', type: 'button', onclick: openContact, text: t('contact.button') }),
    site.email && el('a', { class: `btn ${contactReady(emailjs) ? 'btn-ghost' : 'btn-primary'}`, href: `mailto:${site.email}`, text: t('btn.email') }),
    resumeOk && el('a', { class: 'btn btn-ghost', href: site.resume, download: true, text: t('btn.resume'), onclick: () => track('resume/download') }),
    el('button', { class: 'btn btn-ghost', type: 'button', onclick: printCv, text: t('btn.printCv') }),
    site.linkedin && el('a', { class: 'btn btn-ghost', href: site.linkedin, target: '_blank', rel: 'noopener', text: 'LinkedIn' }),
    el('a', { class: 'btn btn-ghost', href: site.github, target: '_blank', rel: 'noopener', text: 'GitHub' }),
  );
}

function head(icon, eyebrow, heading, tagline) {
  return el(
    'header',
    { class: 'p-head' },
    typeof icon === 'string' ? el('span', { class: 'p-icon', 'aria-hidden': 'true' }, iconImg(icon)) : icon,
    el('div', {}, el('p', { class: 'eyebrow', text: eyebrow }), el('h2', { id: 'panel-title', tabindex: '-1', text: heading }), tagline && el('p', { class: 'p-tagline', text: tagline })),
  );
}

function skillGroups() {
  return el(
    'div',
    { class: 'stack' },
    site.about.skills.map((g) => el('div', { class: 'stack-row stack-plain' }, el('span', { class: 'stack-kind', text: skillLabel(g.label) }), el('span', { class: 'stack-items' }, g.items.map((i) => el('span', { class: 'chip', text: i }))))),
  );
}

function aboutParts() {
  const edu = ts(site, 'education');
  return [
    head(photo('p-photo'), t('eyebrow.about'), `${site.name} (${site.nickname})`, ts(site, 'role')),
    el('p', { class: 'p-lead', text: ts(site, 'headline') }),
    ...ts(site, 'bio').map((x) => el('p', { class: 'p-summary', text: x })),
    section(t('section.education'), el('p', { class: 'p-edu' }, el('b', { text: edu.degree }), el('br'), edu.school)),
    section(t('section.skills'), skillGroups()),
    contactButtons(),
  ];
}

function lotParts(p) {
  return [
    head(p.icon, company ? t('lot.eyebrowReserved') : t('lot.eyebrow'), company ? t('lot.reserved', { company }) : t('lot.title')),
    el('p', { class: 'p-summary', text: company ? t('lot.bodyReserved') : t('lot.body') }),
    contactForm({ cfg: emailjs, el, t, company, onSent: () => track('contact/sent'), inspect: (text) => ctf.inspect(text) }),
    contactButtons(),
  ];
}

function placeParts(p) {
  const eyebrow = { work: t('eyebrow.experience'), education: t('eyebrow.education') }[p.kind] ?? tp(p, 'category');
  const chips = p.kind === 'work' ? [tp(p, 'period'), tp(p, 'workMode')] : [statusLabel(p), tp(p, 'statusNote')];
  const matched = match?.result.have.filter((r) => r.ids.includes(p.id)) ?? [];
  return [
    head(p.icon, eyebrow, title(p), tp(p, 'tagline')),
    chips.some(Boolean) ? el('div', { class: 'p-chips' }, chips.filter(Boolean).map((c) => el('span', { class: c === t('status.live') ? 'chip chip-live' : 'chip', text: c }))) : null,
    matched.length ? el('p', { class: 'p-match' }, starIcon(), ` ${t('match.have')}: `, matched.map((r) => r.skill.name).join(', ')) : null,
    progress(p),
    p.media?.images?.length ? gallery(p) : null,
    el('p', { class: 'p-summary', text: tp(p, 'summary') }),
    p.highlights?.length ? section(p.kind === 'work' ? t('section.whatIDo') : t('section.highlights'), el('ul', { class: 'p-list' }, tp(p, 'highlights').map((h) => el('li', { text: h })))) : null,
    p.layers?.length ? section(t('section.stack'), stack(p.layers)) : null,
    linkButtons(p),
  ];
}

function renderPanel(p) {
  const parts =
    p.kind === 'about' ? aboutParts() : p.kind === 'lot' ? lotParts(p) : p.kind === 'achievements' ? awards.parts({ head, contact: contactButtons }) : placeParts(p);
  panel.style.setProperty('--tint', tint(p));
  $('.panel-body', panel).replaceChildren(...parts.filter(Boolean)); // replaceChildren would print null as text
}

function panelInset() {
  const r = panel.getBoundingClientRect();
  return mobile.matches ? { bottom: r.height } : { right: r.width + 24 };
}

function select(id) {
  const p = byId.get(id);
  if (!p) return;
  hideIntro(); // opened from the terminal or the console while the welcome card is still up
  if (tour?.isOpen()) tour.stop({ keepView: true });
  if (id !== current) track(`open/${id}`, title(p));
  if (mobile.matches) closeMatcher();
  current = id;
  renderPanel(p);
  panel.scrollTop = 0;
  panel.classList.add('open');
  panel.inert = false;
  body.classList.add('has-panel');
  for (const [pid, pin] of pins) pin.classList.toggle('is-selected', pid === id);
  requestAnimationFrame(() => world?.focus(id, panelInset()));
  $('#panel-title')?.focus({ preventScroll: true });
  history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
}

function closePanel() {
  if (!current) return;
  current = null;
  panel.classList.remove('open');
  panel.inert = true;
  body.classList.remove('has-panel');
  for (const pin of pins.values()) pin.classList.remove('is-selected');
  homeView();
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

function openContact() {
  closeList();
  closeMatcher();
  select('next-lot');
  requestAnimationFrame(() => {
    const form = $('#contact-form');
    form?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    form?.querySelector('input')?.focus({ preventScroll: true });
  });
}

function startTour() {
  if (!tour || !world) return;
  hideIntro();
  closeList();
  closeMatcher();
  if (current) {
    current = null;
    panel.classList.remove('open');
    panel.inert = true;
    body.classList.remove('has-panel');
  }
  tour.start();
}

// ---------- list view ----------
function card(p) {
  const cover = firstImage(p);
  const eyebrow = p.kind === 'work' ? `${t('eyebrow.experience')} (${tp(p, 'period')})` : p.kind === 'education' ? t('eyebrow.education') : tp(p, 'category');
  const count = match?.result.perPlace.get(p.id);
  return el(
    'article',
    { class: `card${count ? ' card-match' : ''}`, style: `--tint: ${tint(p)}` },
    cover && el('div', { class: 'card-cover' }, isPdf(cover) ? pdfThumb(cover, p, p.media.images.indexOf(cover)) : shotImg(cover, p, p.media.images.indexOf(cover))),
    el('div', { class: 'card-top' }, el('span', { class: 'card-icon', 'aria-hidden': 'true' }, iconImg(p.icon)), el('p', { class: 'eyebrow', text: eyebrow })),
    el('h3', { text: title(p) }),
    el('p', { class: 'card-tagline', text: tp(p, 'tagline') }),
    count ? el('p', { class: 'card-status card-status-match' }, starIcon(), ` ${t('match.skills', { n: count })}`) : null,
    p.kind === 'project' && statusLabel(p) && el('p', { class: `card-status card-status-${p.status}`, text: statusLabel(p) }),
    el('p', { class: 'card-summary', text: tp(p, 'summary') }),
    el('div', { class: 'card-chips' }, (p.layers ?? []).flatMap((l) => l.items).slice(0, 8).map((i) => el('span', { class: 'chip', text: i }))),
    el('button', {
      class: 'btn btn-ghost card-go',
      type: 'button',
      text: world ? t('list.show') : t('list.details'),
      onclick: () => {
        closeList();
        select(p.id);
      },
    }),
  );
}

function aboutCard() {
  return el(
    'article',
    { class: 'card card-about', style: `--tint: ${tint(ABOUT)}` },
    photo('card-photo'),
    el(
      'div',
      {},
      el('p', { class: 'eyebrow', text: t('eyebrow.about') }),
      el('h3', { text: `${site.name} (${site.nickname})` }),
      el('p', { class: 'card-tagline', text: `${ts(site, 'role')}, ${ts(site, 'education').degree}` }),
      el('p', { class: 'card-summary', text: ts(site, 'headline') }),
      el('button', {
        class: 'btn btn-ghost card-go',
        type: 'button',
        text: t('list.more'),
        onclick: () => {
          closeList();
          select('about');
        },
      }),
    ),
  );
}

let listNote = null;
function renderList() {
  const exp = places.filter((p) => p.kind === 'work' || p.kind === 'education');
  let projects = places.filter((p) => p.kind === 'project');
  if (match) projects = [...projects].sort((a, b) => (match.result.perPlace.get(b.id) ?? 0) - (match.result.perPlace.get(a.id) ?? 0));
  $('.list-body', list).replaceChildren(
    aboutCard(),
    el('h3', { class: 'list-group', text: t('list.experience') }),
    el('div', { class: 'list-grid' }, exp.map(card)),
    el('h3', { class: 'list-group', text: match?.kind === 'role' ? t('list.bestFor', { role: t(`role.${match.role}`) }) : t('list.projects', { n: projects.length }) }),
    el('div', { class: 'list-grid' }, projects.map(card)),
  );
  const noteEl = $('.list-note', list);
  noteEl.hidden = !listNote;
  noteEl.textContent = listNote ? t(listNote) : '';
}

function openList(noteKey = null) {
  listNote = noteKey;
  renderList();
  list.classList.add('open');
  list.inert = false;
  $('.list-close', list).focus({ preventScroll: true });
}

function closeList() {
  list.classList.remove('open');
  list.inert = true;
}

// ---------- intro ----------
function renderIntro() {
  $('#intro-title').textContent = company ? t('intro.titleCompany', { company }) : t('intro.title');
  $('.intro-sub').textContent = t('intro.sub');
  const parts = [
    company ? t('intro.bodyCompany1') : t('intro.body1'),
    el('b', { text: t('nav.blueprint') }),
    company ? t('intro.bodyCompany2') : t('intro.body2'),
    role ? el('span', { class: 'intro-role', text: ` ${t('intro.bodyRole', { role: t(`role.${role}`) })}` }) : null,
  ];
  $('.intro-body').replaceChildren(...parts.filter(Boolean)); // replaceChildren would print null as text
  $('.intro-fest')?.remove();
  if (festival) $('#intro-title').before(el('p', { class: 'intro-fest' }, iconImg(FESTIVAL_ICON[festival]), t(`fest.${festival}`)));
}

const FESTIVAL_ICON = { halloween: 'pumpkin' };

function showIntro() {
  $('.intro-who').prepend(photo('intro-photo'));
  renderIntro();
  intro.classList.add('open');
  intro.inert = false;
  $('[data-intro="explore"]').focus({ preventScroll: true });
}

function hideIntro() {
  intro.classList.remove('open');
  intro.inert = true;
}

// ---------- job matching ----------
function applyMatch(next) {
  match = next;
  const max = Math.max(1, ...(match?.result.perPlace.values() ?? []));
  world?.setHighlight(match ? new Map([...match.result.perPlace].map(([id, n]) => [id, 0.45 + 0.55 * (n / max)])) : null);
  body.classList.toggle('has-match', Boolean(match));
  refreshPins();
  renderMatchChip();
  if (list.classList.contains('open')) renderList();
  if (current && current !== 'about') renderPanel(byId.get(current));
}

function renderMatchChip() {
  const chip = $('#match-chip');
  chip.hidden = !match;
  if (!match) return;
  const p = match.result.score;
  // a role preset only lists what the role needs, so a percentage would mean nothing there
  $('.match-chip-text', chip).textContent = match.kind === 'role' ? t('match.roleChip', { role: t(`role.${match.role}`) }) : t('match.chip', { p });
  chip.setAttribute('aria-label', `${$('.match-chip-text', chip).textContent}. ${t('match.clear')}`);
}

function runMatch(text) {
  ctf.inspect(text);
  const skills = detectSkills(text);
  applyMatch(skills.length ? { kind: 'jd', result: matchSkills(skills, places, site) } : null);
  if (match) track('match/run', `${match.result.score}%`);
  renderMatcher(skills.length === 0 && text.trim().length > 0);
}

function renderMatcher(noneFound = false) {
  const out = $('.matcher-results', matcher);
  if (noneFound) return out.replaceChildren(el('p', { class: 'matcher-none', text: t('match.none') }));
  if (!match) return out.replaceChildren();
  const r = match.result;
  const placeChip = (id) => {
    const p = byId.get(id);
    return el('span', { class: 'm-place', title: title(p) }, iconImg(p.icon));
  };
  const best = [...r.perPlace].sort((a, b) => b[1] - a[1]).slice(0, 5);
  out.replaceChildren(
    match.kind === 'role'
      ? el('p', { class: 'm-role-note', text: t('match.roleNote', { role: t(`role.${match.role}`) }) })
      : el(
          'div',
          { class: 'm-score' },
          el('div', { class: 'm-ring', style: `--p: ${r.score}` }, el('b', { text: `${r.score}%` }), el('small', { text: t('match.score') })),
          el('p', { text: t('match.summary', { m: r.have.length, n: r.results.length }) }),
        ),
    r.have.length
      ? section(
          t('match.have'),
          el(
            'div',
            { class: 'm-chips' },
            r.have.map((x) => el('span', { class: 'chip m-have' }, `✓ ${x.skill.name}`, x.ids.length ? el('span', { class: 'm-places' }, x.ids.slice(0, 4).map(placeChip)) : el('span', { class: 'm-listed', text: t('match.listed') }))),
          ),
        )
      : null,
    r.gaps.length ? section(t('match.gaps'), el('p', { class: 'm-note', text: t('match.gapsNote') }), el('div', { class: 'm-chips' }, r.gaps.map((x) => el('span', { class: 'chip m-gap', text: x.skill.name })))) : null,
    best.length
      ? section(
          t('match.best'),
          el(
            'div',
            { class: 'm-best' },
            best.map(([id, n]) => {
              const p = byId.get(id);
              return el('button', { class: 'm-best-row', type: 'button', onclick: () => select(id) }, el('span', { class: 'm-best-icon', 'aria-hidden': 'true', style: `--tint: ${tint(p)}` }, iconImg(p.icon)), el('span', { class: 'm-best-name', text: title(p) }), el('span', { class: 'm-best-n', text: t('match.skills', { n }) }));
            }),
          ),
        )
      : null,
  );
}

// Frame the town around whichever side panels are open.
function homeView() {
  const open = matcher.classList.contains('open') && !mobile.matches;
  world?.home(open ? { left: matcher.getBoundingClientRect().width + 24 } : {});
}

function openMatcher() {
  if (mobile.matches) closePanel();
  matcher.classList.add('open');
  matcher.inert = false;
  body.classList.add('has-matcher');
  if (!current) homeView();
  $('#jd').placeholder = t('match.placeholder');
  renderMatcher();
  $('#jd').focus({ preventScroll: true });
}

function closeMatcher() {
  if (!matcher.classList.contains('open')) return;
  matcher.classList.remove('open');
  matcher.inert = true;
  body.classList.remove('has-matcher');
  if (!current) homeView();
}

// ---------- printable CV, built from the same data as the town ----------
function buildCv() {
  const cv = $('#cv');
  const edu = ts(site, 'education');
  const work = places.filter((p) => p.kind === 'work');
  const projects = places.filter((p) => p.kind === 'project');
  const contact = [site.email, site.github.replace(/^https?:\/\//, ''), site.linkedin?.replace(/^https?:\/\//, ''), site.url?.replace(/^https?:\/\//, '').replace(/\/$/, '')].filter(Boolean);
  cv.lang = getLang();
  cv.replaceChildren(
    el(
      'header',
      { class: 'cv-head' },
      photo('cv-photo'),
      el('div', {}, el('h1', { text: `${site.name} (${site.nickname})` }), el('p', { class: 'cv-role', text: ts(site, 'role') }), el('p', { class: 'cv-contact' }, contact.map((c) => el('span', { text: c })))),
    ),
    el('section', {}, el('h2', { text: t('cv.profile') }), el('p', { text: `${ts(site, 'headline')} ${ts(site, 'bio')[0]}` })),
    el(
      'section',
      {},
      el('h2', { text: t('cv.experience') }),
      work.map((p) =>
        el(
          'div',
          { class: 'cv-item' },
          el('div', { class: 'cv-row' }, el('b', { text: `${tp(p, 'tagline')}, ${title(p)}` }), el('span', { text: [tp(p, 'period'), tp(p, 'workMode')].filter(Boolean).join(', ') })),
          el('ul', {}, tp(p, 'highlights').map((h) => el('li', { text: h }))),
        ),
      ),
    ),
    el('section', {}, el('h2', { text: t('cv.education') }), el('div', { class: 'cv-row' }, el('b', { text: edu.degree }), el('span', { text: 'KMITL' })), el('p', { text: edu.school })),
    el('section', {}, el('h2', { text: t('cv.skills') }), site.about.skills.map((g) => el('p', { class: 'cv-skill' }, el('b', { text: `${skillLabel(g.label)}: ` }), g.items.join(', ')))),
    el(
      'section',
      {},
      el('h2', { text: t('cv.projects') }),
      el(
        'div',
        { class: 'cv-projects' },
        projects.map((p) =>
          el(
            'div',
            { class: 'cv-proj' },
            el('p', { class: 'cv-proj-title' }, el('b', { text: title(p) }), statusLabel(p) ? el('span', { text: ` (${statusLabel(p)})` }) : null),
            el('p', { text: tp(p, 'tagline') }),
            p.layers?.length ? el('p', { class: 'cv-stack', text: p.layers.flatMap((l) => l.items).slice(0, 7).join(', ') }) : null,
          ),
        ),
      ),
    ),
    site.url && el('footer', { class: 'cv-foot', text: `${t('cv.interactive')}: ${cvUrl()}` }),
  );
  if (cvQr) $('.cv-head', cv).append(el('figure', { class: 'cv-qr' }, cvQr.cloneNode(true), el('figcaption', { text: t('cv.qr') })));
}

// The link printed on the CV, and inside its QR code. A CV printed from a ?to= link keeps it, so the
// company that scans it lands on its own reserved lot; ?from=cv tells the visit counter it came from paper.
function cvUrl() {
  if (!site.url) return '';
  const u = new URL(site.url);
  if (company) u.searchParams.set('to', company);
  u.searchParams.set('lang', getLang());
  return u.toString();
}

function makeCvQr() {
  if (!site.url) return Promise.resolve();
  const u = new URL(cvUrl());
  u.searchParams.set('from', 'cv');
  return qrSvg(u.toString())
    .then((svg) => (cvQr = svg))
    .catch(() => (cvQr = null));
}

async function printCv() {
  track('cv/print');
  await makeCvQr(); // the language may have changed since it was made
  buildCv();
  // let the photo decode before the print dialog snapshots the page
  const img = $('#cv .cv-photo');
  const go = () => window.print();
  if (img?.tagName === 'IMG' && !img.complete) img.addEventListener('load', go, { once: true });
  else go();
}

// ---------- toggles ----------
// source 'live' comes from the Bangkok sync; anything else is the visitor choosing, which pauses the sync.
function setNight(on, { instant = false, source = 'user' } = {}) {
  if (source === 'user') setLive(false);
  isNight = on;
  if (on) awards?.note('night');
  body.classList.toggle('is-night', on);
  $('#btn-time').setAttribute('aria-pressed', String(on));
  world?.setNight(on, instant);
  syncThemeColor();
  renderWeatherChip();
}

function setBlueprint(on) {
  isBlueprint = on;
  if (on) awards?.note('blueprint');
  body.classList.toggle('is-blueprint', on);
  $('#btn-blueprint').setAttribute('aria-pressed', String(on));
  world?.setBlueprint(on);
  const scan = $('.scan');
  scan.classList.remove('run');
  void scan.offsetWidth; // restart the sweep animation
  if (on) scan.classList.add('run');
  syncThemeColor();
  if (current && byId.get(current)?.layers?.length) renderPanel(byId.get(current));
}

function setWeather(kind, { source = 'user' } = {}) {
  if (source === 'user') setLive(false);
  weatherNow = WX_ICON[kind] ? kind : 'clear';
  body.classList.toggle('is-rain', weatherNow === 'rain' || weatherNow === 'storm');
  body.classList.toggle('is-cloudy', weatherNow === 'cloudy');
  world?.setWeather(weatherNow);
  renderWeatherChip();
}

function syncThemeColor() {
  $('meta[name="theme-color"]').content = isBlueprint ? '#0d4fa3' : isNight ? '#0b1026' : '#a9d8ff';
}

// Interface language. Order of preference: ?lang=, the visitor's last choice, the browser language.
function setLang(next, { remember = true } = {}) {
  setLangValue(next);
  const lang = getLang();
  document.documentElement.lang = lang;
  if (remember) {
    storage.set('lang', lang);
    const url = new URL(location.href);
    url.searchParams.set('lang', lang); // so a shared link opens in the same language
    history.replaceState(null, '', url);
  }
  for (const node of $$('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of $$('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
  $('#btn-lang').lang = lang === 'th' ? 'en' : 'th';
  $('#jd').placeholder = t('match.placeholder');
  for (const tag of layerTags) tag.el.textContent = t(`layer.${tag.kind}`);
  refreshPins();
  renderWeatherChip();
  renderMatchChip();
  awards?.renderHud();
  if (intro.classList.contains('open')) renderIntro();
  if (current) renderPanel(byId.get(current));
  if (list.classList.contains('open')) renderList();
  if (matcher.classList.contains('open')) renderMatcher();
  tour?.refresh();
}

// ---------- live Bangkok weather and time (Open-Meteo, no key needed) ----------
const WX_ICON = { clear: 'weather-clear', cloudy: 'weather-cloudy', rain: 'weather-rain', storm: 'weather-storm' };
let live = true;
let wx = null;
let weatherNow = 'clear';

const bangkokTime = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const bangkokHour = () => Number(bangkokTime().slice(0, 2));
const weatherKind = (code) => (code >= 95 ? 'storm' : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? 'rain' : code >= 1 && code <= 48 ? 'cloudy' : 'clear');

async function fetchBangkok() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,is_day,weather_code&timezone=Asia%2FBangkok';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { current: c } = await r.json();
    return { temp: Math.round(c.temperature_2m), isDay: c.is_day === 1, kind: weatherKind(c.weather_code) };
  } catch {
    const h = bangkokHour(); // offline: fall back to the clock, sun up 06:00–18:00
    return { temp: null, isDay: h >= 6 && h < 18, kind: 'clear', offline: true };
  }
}

function applyLive() {
  if (!wx || !live) return;
  setNight(!wx.isDay, { source: 'live' });
  setWeather(wx.kind, { source: 'live' });
}

function setLive(on) {
  live = on;
  renderWeatherChip();
}

async function syncWeather() {
  wx = await fetchBangkok();
  applyLive();
  renderWeatherChip();
}

function renderWeatherChip() {
  const chip = $('#weather');
  if (!chip) return;
  const icon = weatherNow === 'clear' && isNight ? 'weather-night' : WX_ICON[weatherNow];
  const temp = wx?.temp != null && live ? ` ${wx.temp}°C` : '';
  $('.wx-icon', chip).replaceChildren(iconImg(icon));
  $('.wx-text', chip).textContent = `${t('wx.city')}${temp} ${t('wx.time', { time: bangkokTime() })}`;
  $('.wx-live', chip).textContent = live ? t('wx.live') : t('wx.paused');
  chip.classList.toggle('is-paused', !live);
  chip.title = live ? t('wx.liveTitle') : t('wx.pausedTitle');
}

function onFlash() {
  const f = $('.flash');
  f.classList.remove('run');
  void f.offsetWidth;
  f.classList.add('run');
}

// ---------- wiring ----------
function wireUi() {
  $('#btn-time').addEventListener('click', () => setNight(!isNight));
  $('#btn-blueprint').addEventListener('click', () => setBlueprint(!isBlueprint));
  $('#btn-list').addEventListener('click', () => openList());
  $('#btn-match').addEventListener('click', () => (matcher.classList.contains('open') ? closeMatcher() : openMatcher()));
  $('#btn-lang').addEventListener('click', () => setLang(getLang() === 'th' ? 'en' : 'th'));
  $('#btn-resume').addEventListener('click', () => {
    if (!resumeOk) return printCv();
    const a = el('a', { href: site.resume, download: '' });
    document.body.append(a);
    a.click();
    a.remove();
  });
  $('#match-chip').addEventListener('click', () => applyMatch(null));
  $('#btn-awards').addEventListener('click', () => (current === 'achievements' ? closePanel() : select('achievements')));
  $('.brand').addEventListener('click', () => select('about'));
  $('.list-close', list).addEventListener('click', closeList);
  $('.panel-close', panel).addEventListener('click', closePanel);
  $('.matcher-close', matcher).addEventListener('click', closeMatcher);
  $('.matcher-form', matcher).addEventListener('submit', (e) => {
    e.preventDefault();
    runMatch($('#jd').value);
  });
  $('[data-match="sample"]', matcher).addEventListener('click', () => {
    $('#jd').value = SAMPLE_JD[getLang()];
    runMatch($('#jd').value);
  });
  $('[data-match="clear"]', matcher).addEventListener('click', () => {
    $('#jd').value = '';
    applyMatch(null);
    renderMatcher();
    $('#jd').focus();
  });
  $('#weather').addEventListener('click', () => {
    setLive(true);
    syncWeather();
  });
  $('[data-intro="explore"]').addEventListener('click', hideIntro);
  $('[data-intro="tour"]').addEventListener('click', () => {
    hideIntro();
    startTour();
  });
  for (const b of $$('#btn-tour, #btn-tour-m')) b.addEventListener('click', () => (tour?.isOpen() ? tour.stop() : startTour()));
  $('[data-intro="list"]').addEventListener('click', () => {
    hideIntro();
    openList();
  });
  intro.addEventListener('click', (e) => e.target === intro && hideIntro());
  $('.lb-close', lightbox).addEventListener('click', closeLightbox);
  $('.lb-prev', lightbox).addEventListener('click', () => stepLightbox(-1));
  $('.lb-next', lightbox).addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('click', (e) => e.target === lightbox && closeLightbox());
  // Ctrl+P prints the CV rather than a screenshot of a canvas
  window.addEventListener('beforeprint', buildCv);

  document.addEventListener('keydown', (e) => {
    if (lb) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (e.key !== 'Escape' || terminal?.isOpen()) return;
    if (tour?.isOpen()) tour.stop();
    else if (list.classList.contains('open') && !body.classList.contains('no-3d')) closeList();
    else if (intro.classList.contains('open')) hideIntro();
    else if (matcher.classList.contains('open') && (mobile.matches || !current)) closeMatcher();
    else closePanel();
  });

  if (site.resume) {
    fetch(site.resume, { method: 'HEAD' })
      .then((r) => {
        resumeOk = r.ok;
      })
      .catch(() => {});
  }

  $('.brand-mark').replaceChildren(photo('brand-photo'));
}

// Say why the town didn't start, so the fix is obvious instead of a page of cards with no reason.
function whyNo3d(err) {
  if (location.protocol === 'file:') return 'list.noFile';
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'list.noWebgl';
  } catch {
    return 'list.noWebgl';
  }
  if (/import|module|fetch|load/i.test(String(err?.message))) return 'list.noNetwork';
  return 'list.no3d';
}

function setProgress(f) {
  const n = Math.round(Math.min(1, f) * 100);
  $('.loader-bar span').style.width = `${n}%`;
  $('.loader-pct').textContent = `${n}%`;
}

async function boot() {
  const browserThai = (navigator.languages ?? [navigator.language]).some((l) => l?.toLowerCase().startsWith('th'));
  setLang(params.get('lang') ?? storage.get('lang') ?? (browserThai ? 'th' : 'en'), { remember: false });
  if (festival) body.classList.add(`fest-${festival}`);
  awards = createAchievements({
    places,
    festival,
    el,
    t,
    tp,
    iconImg,
    track: count,
    open: () => select('achievements'),
    select,
    onComplete: () => {
      world?.launchFireworks(14);
      select('achievements');
    },
  });
  ctf = createCtf({ onCapture: (id) => track(`flag/${id}`) });
  ctf.inspect(params.get('to')); // ?to=<script>… is sanitised before it's shown, and earns a flag
  initAnalytics({ code: site.analytics?.goatcounter, company, from: params.get('from') });
  wireUi();

  // Start in the right light straight away from the Bangkok clock; the weather call refines it.
  const h = bangkokHour();
  setNight(!(h >= 6 && h < 18), { instant: true, source: 'live' });
  const weatherReady = fetchBangkok().then((r) => (wx = r));

  try {
    const { createWorld } = await import('./world.js');
    world = await createWorld({
      container: $('#stage'),
      places,
      avatar: site.avatar,
      avatarLabel: site.nickname,
      makePin,
      makeLayerTag,
      onHover,
      onFlash,
      onProgress: setProgress,
      onSelect: (id) => (id ? select(id) : closePanel()),
      festival,
      bugsFixed: saved.bugs(),
      onBug: (n) => track(`bug/${n}`),
      onPet: (id) => awards.note(id),
      onPumpkin: () => track('pumpkin'),
    });
    world.setNight(isNight, true);
  } catch (err) {
    console.error('3D town unavailable, showing the list instead.', err);
    body.classList.add('no-3d');
    openList(whyNo3d(err));
  }

  // shared by the terminal and the DevTools console
  const actions = {
    open: (id) => select(id),
    about: () => select('about'),
    night: (on) => setNight(on),
    blueprint: (on) => setBlueprint(on),
    isBlueprint: () => isBlueprint,
    weather: (kind) => {
      if (kind === 'live') {
        setLive(true);
        return syncWeather();
      }
      setWeather(kind);
    },
    fireworks: () => world?.launchFireworks(),
    avatar: (file) => world?.setAvatar(file),
    cv: printCv,
    tour: () => startTour(),
    contact: () => openContact(),
    terminal: () => terminal.open(),
    hasWorld: () => Boolean(world),
    opened: () => awards.note('terminal'),
    awards: () => awards.lines().map((a) => ({ ...a, name: t(`ach.${a.id}.name`) })),
    resetAwards: () => awards.reset(),
    bugsFixed: () => saved.bugs(),
    scan: () => {
      track('scan/run');
      return scanSite();
    },
    ctf: {
      submit: (text) => ctf.submit(text),
      inspect: (text) => ctf.inspect(text),
      captured: () => ctf.captured(),
      total: ctf.total,
      flag: ctf.injectionFlag,
      // the terminal always speaks English
      text: (key) => tIn('en', key),
    },
  };
  terminal = createTerminal({ places, site, company, actions });

  tour = createTour({
    order: tourOrder,
    byId,
    el,
    t,
    tp,
    iconImg,
    tint,
    track,
    company,
    focus: (id, inset) => world?.focus(id, inset),
    home: (inset) => world?.home(inset),
    markPin: (id) => {
      for (const [pid, pin] of pins) pin.classList.toggle('is-selected', pid === id);
    },
    openDetails: (id) => (id === 'next-lot' ? openContact() : select(id)),
  });
  if (!world) for (const b of $$('#btn-tour, #btn-tour-m')) b.hidden = true;

  // ?role=backend (or frontend, fullstack, security, ai) lights up the most relevant buildings
  if (role) applyMatch({ kind: 'role', role, result: matchSkills(roleSkills(role), places, site) });

  // URL overrides for previews: ?weather=rain|storm|cloudy|clear and ?time=day|night
  const forcedWeather = params.get('weather');
  const forcedTime = params.get('time');
  await weatherReady;
  if (forcedWeather || forcedTime) {
    if (forcedTime) setNight(forcedTime === 'night', { instant: true });
    if (forcedWeather) setWeather(forcedWeather);
  } else applyLive();
  renderWeatherChip();
  setInterval(() => (live ? syncWeather() : renderWeatherChip()), 15 * 60 * 1000);
  setInterval(renderWeatherChip, 60 * 1000);

  setProgress(1);
  loader.classList.add('done');
  setTimeout(() => {
    loader.remove();
    awards.release(); // notices earned while loading (a night visit, say) show once the town is up
  }, 600);

  // made while the visitor looks around, so the print dialog never waits on it
  (window.requestIdleCallback ?? setTimeout)(() => makeCvQr());

  // the 404 page links to ?view=list
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (byId.has(fromHash)) select(fromHash);
  else if (params.get('view') === 'list') openList();
  else if (world) showIntro();

  consoleEgg({ site, places, company, actions, track });
}

boot();
