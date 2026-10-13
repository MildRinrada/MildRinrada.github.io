// UI for MildRinrada Town: pins, detail panel and gallery, About me, list view, intro, job matching,
// printable CV, Thai/English, live Bangkok weather and the toggles. The 3D scene is loaded from world.js;
// if WebGL or the CDN is unavailable, the list view takes over.

import { site, places } from '../data/town.js';
import { createTerminal } from './terminal.js';
import { t, tp, ts, skillLabel, getLang, setLangValue, SAMPLE_JD } from './i18n.js';
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

const ABOUT = { id: 'about', kind: 'about', icon: '👋', title: `${site.name} (${site.nickname})` };
const byId = new Map([...places.map((p) => [p.id, p]), [ABOUT.id, ABOUT]]);
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

let world = null;
let terminal = null;
let current = null;
let isNight = false;
let isBlueprint = false;
let resumeOk = false;
let match = null; // { kind: 'jd' | 'role', role?, result }

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

const pct = (p) => (p.progress ? Math.round((p.progress.value / p.progress.total) * 100) : null);
const title = (p) => tp(p, 'title');

function statusLabel(p) {
  if (p.status === 'live') return t('status.live');
  if (p.status === 'building') return pct(p) != null ? `${t('status.building')} · ${pct(p)}%` : t('status.building');
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
      el('span', { class: 'pin-icon', 'aria-hidden': 'true', text: p.icon }),
      el('span', { class: 'pin-text' }, el('b', { text: tx.title }), el('small', { text: tx.sub })),
      count ? el('span', { class: 'pin-badge', 'aria-hidden': 'true', text: `★ ${count}` }) : null,
    ),
  );
}

function makePin(p) {
  const btn = el('button', { class: `pin pin-${p.kind}${p.status ? ` pin-${p.status}` : ''}`, type: 'button' });
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
  return el('div', { class: `layer-tag layer-${layer.kind}` }, kind, el('span', { class: 'layer-items', text: layer.items.join(' · ') }));
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

const caption = (im, i) => im.caption || (i === 0 ? t('img.cover') : t('img.shot', { n: i + 1 }));

function shotImg(im, p, i, loading = 'lazy') {
  const img = el('img', { src: im.src, alt: `${title(p)}: ${caption(im, i)}`, loading, decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(el('span', { class: 'g-missing', text: t('img.missing', { src: im.src }) })), { once: true });
  return img;
}

function gallery(p) {
  const imgs = p.media.images;
  const main = el('button', { class: 'g-main', type: 'button', 'aria-label': t('img.open') });
  const cap = el('figcaption', { class: 'g-cap' });
  const thumbs = imgs.length > 1 ? el('div', { class: 'g-thumbs' }) : null;
  let index = 0;
  const show = (i) => {
    index = i;
    main.replaceChildren(shotImg(imgs[i], p, i, 'eager'), el('span', { class: 'g-zoom', 'aria-hidden': 'true', text: '⤢' }));
    cap.textContent = [caption(imgs[i], i), imgs.length > 1 ? `${i + 1} / ${imgs.length}` : ''].filter(Boolean).join(' · ');
    thumbs?.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
  };
  imgs.forEach((im, i) => thumbs?.append(el('button', { class: 'g-thumb', type: 'button', 'aria-label': t('img.show', { n: i + 1 }), onclick: () => show(i) }, shotImg(im, p, i))));
  main.addEventListener('click', () => openLightbox(p, index));
  show(0);
  return el('figure', { class: 'p-gallery' }, main, cap, thumbs);
}

let lb = null;
function openLightbox(p, i) {
  lb = { p, i };
  renderLightbox();
  lightbox.classList.add('open');
  lightbox.inert = false;
  $('.lb-close', lightbox).focus({ preventScroll: true });
}
function renderLightbox() {
  const imgs = lb.p.media.images;
  const im = imgs[lb.i];
  $('.lb-figure', lightbox).replaceChildren(shotImg(im, lb.p, lb.i, 'eager'), el('figcaption', { text: [title(lb.p), caption(im, lb.i), `${lb.i + 1} / ${imgs.length}`].join(' · ') }));
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
  if (p.links?.live) links.push(el('a', { class: 'btn btn-primary', href: p.links.live, target: '_blank', rel: 'noopener', text: t('btn.live') }));
  if (p.links?.repo) links.push(el('a', { class: 'btn btn-ghost', href: p.links.repo, target: '_blank', rel: 'noopener', text: t('btn.code') }));
  return links.length ? el('div', { class: 'p-actions' }, links) : null;
}

function contactButtons() {
  return el(
    'div',
    { class: 'p-actions' },
    site.email && el('a', { class: 'btn btn-primary', href: `mailto:${site.email}`, text: t('btn.email') }),
    resumeOk && el('a', { class: 'btn btn-ghost', href: site.resume, download: true, text: t('btn.resume') }),
    el('button', { class: 'btn btn-ghost', type: 'button', onclick: printCv, text: t('btn.printCv') }),
    site.linkedin && el('a', { class: 'btn btn-ghost', href: site.linkedin, target: '_blank', rel: 'noopener', text: 'LinkedIn' }),
    el('a', { class: 'btn btn-ghost', href: site.github, target: '_blank', rel: 'noopener', text: 'GitHub' }),
  );
}

function head(icon, eyebrow, heading, tagline) {
  return el(
    'header',
    { class: 'p-head' },
    typeof icon === 'string' ? el('span', { class: 'p-icon', 'aria-hidden': 'true', text: icon }) : icon,
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
    matched.length ? el('p', { class: 'p-match' }, `★ ${t('match.have')}: `, matched.map((r) => r.skill.name).join(', ')) : null,
    progress(p),
    p.media?.images?.length ? gallery(p) : null,
    el('p', { class: 'p-summary', text: tp(p, 'summary') }),
    p.highlights?.length ? section(p.kind === 'work' ? t('section.whatIDo') : t('section.highlights'), el('ul', { class: 'p-list' }, tp(p, 'highlights').map((h) => el('li', { text: h })))) : null,
    p.layers?.length ? section(t('section.stack'), stack(p.layers)) : null,
    linkButtons(p),
  ];
}

function renderPanel(p) {
  const parts = p.kind === 'about' ? aboutParts() : p.kind === 'lot' ? lotParts(p) : placeParts(p);
  $('.panel-body', panel).replaceChildren(...parts.filter(Boolean)); // replaceChildren would print null as text
}

function panelInset() {
  const r = panel.getBoundingClientRect();
  return mobile.matches ? { bottom: r.height } : { right: r.width + 24 };
}

function select(id) {
  const p = byId.get(id);
  if (!p) return;
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

// ---------- list view ----------
function card(p) {
  const cover = p.media?.images?.[0];
  const eyebrow = p.kind === 'work' ? `${t('eyebrow.experience')} · ${tp(p, 'period')}` : p.kind === 'education' ? t('eyebrow.education') : tp(p, 'category');
  const count = match?.result.perPlace.get(p.id);
  return el(
    'article',
    { class: `card${count ? ' card-match' : ''}` },
    cover && el('div', { class: 'card-cover' }, shotImg(cover, p, 0)),
    el('div', { class: 'card-top' }, el('span', { class: 'card-icon', 'aria-hidden': 'true', text: p.icon }), el('p', { class: 'eyebrow', text: eyebrow })),
    el('h3', { text: title(p) }),
    el('p', { class: 'card-tagline', text: tp(p, 'tagline') }),
    count ? el('p', { class: 'card-status card-status-match', text: `★ ${t('match.skills', { n: count })}` }) : null,
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
    { class: 'card card-about' },
    photo('card-photo'),
    el(
      'div',
      {},
      el('p', { class: 'eyebrow', text: t('eyebrow.about') }),
      el('h3', { text: `${site.name} (${site.nickname})` }),
      el('p', { class: 'card-tagline', text: `${ts(site, 'role')} · ${ts(site, 'education').degree}` }),
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
  $('.intro-body').replaceChildren(
    company ? t('intro.bodyCompany1') : t('intro.body1'),
    el('b', { text: t('nav.blueprint') }),
    company ? t('intro.bodyCompany2') : t('intro.body2'),
    role ? el('span', { class: 'intro-role', text: ` ${t('intro.bodyRole', { role: t(`role.${role}`) })}` }) : null,
  );
}

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
  const skills = detectSkills(text);
  applyMatch(skills.length ? { kind: 'jd', result: matchSkills(skills, places, site) } : null);
  renderMatcher(skills.length === 0 && text.trim().length > 0);
}

function renderMatcher(noneFound = false) {
  const out = $('.matcher-results', matcher);
  if (noneFound) return out.replaceChildren(el('p', { class: 'matcher-none', text: t('match.none') }));
  if (!match) return out.replaceChildren();
  const r = match.result;
  const placeChip = (id) => {
    const p = byId.get(id);
    return el('span', { class: 'm-place', title: title(p), text: p.icon });
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
              return el('button', { class: 'm-best-row', type: 'button', onclick: () => select(id) }, el('span', { class: 'm-best-icon', 'aria-hidden': 'true', text: p.icon }), el('span', { class: 'm-best-name', text: title(p) }), el('span', { class: 'm-best-n', text: t('match.skills', { n }) }));
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
      el('div', {}, el('h1', { text: `${site.name} (${site.nickname})` }), el('p', { class: 'cv-role', text: ts(site, 'role') }), el('p', { class: 'cv-contact', text: contact.join('  ·  ') })),
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
          el('div', { class: 'cv-row' }, el('b', { text: `${tp(p, 'tagline')} · ${title(p)}` }), el('span', { text: [tp(p, 'period'), tp(p, 'workMode')].filter(Boolean).join(' · ') })),
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
            el('p', { class: 'cv-proj-title' }, el('b', { text: title(p) }), statusLabel(p) ? el('span', { text: ` · ${statusLabel(p)}` }) : null),
            el('p', { text: tp(p, 'tagline') }),
            p.layers?.length ? el('p', { class: 'cv-stack', text: p.layers.flatMap((l) => l.items).slice(0, 7).join(' · ') }) : null,
          ),
        ),
      ),
    ),
    site.url && el('footer', { class: 'cv-foot', text: `${t('cv.interactive')}: ${site.url}` }),
  );
}

function printCv() {
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
  body.classList.toggle('is-night', on);
  $('#btn-time').setAttribute('aria-pressed', String(on));
  world?.setNight(on, instant);
  syncThemeColor();
  renderWeatherChip();
}

function setBlueprint(on) {
  isBlueprint = on;
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
  if (intro.classList.contains('open')) renderIntro();
  if (current) renderPanel(byId.get(current));
  if (list.classList.contains('open')) renderList();
  if (matcher.classList.contains('open')) renderMatcher();
}

// ---------- live Bangkok weather and time (Open-Meteo, no key needed) ----------
const WX_ICON = { clear: '☀️', cloudy: '⛅', rain: '🌧️', storm: '⛈️' };
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
  const icon = weatherNow === 'clear' && isNight ? '🌙' : WX_ICON[weatherNow];
  const temp = wx?.temp != null && live ? ` ${wx.temp}°C` : '';
  $('.wx-icon', chip).textContent = icon;
  $('.wx-text', chip).textContent = `${t('wx.city')}${temp} · ${bangkokTime()}`;
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
    if (list.classList.contains('open') && !body.classList.contains('no-3d')) closeList();
    else if (intro.classList.contains('open')) hideIntro();
    else if (matcher.classList.contains('open') && (mobile.matches || !current)) closeMatcher();
    else closePanel();
  });

  fetch(site.resume, { method: 'HEAD' })
    .then((r) => {
      resumeOk = r.ok;
    })
    .catch(() => {});

  $('.brand-mark').replaceChildren(photo('brand-photo'));
}

function setProgress(f) {
  const n = Math.round(Math.min(1, f) * 100);
  $('.loader-bar span').style.width = `${n}%`;
  $('.loader-pct').textContent = `${n}%`;
}

async function boot() {
  const browserThai = (navigator.languages ?? [navigator.language]).some((l) => l?.toLowerCase().startsWith('th'));
  setLang(params.get('lang') ?? storage.get('lang') ?? (browserThai ? 'th' : 'en'), { remember: false });
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
    });
    world.setNight(isNight, true);
  } catch (err) {
    console.error('3D town unavailable, showing the list instead.', err);
    body.classList.add('no-3d');
    openList('list.no3d');
  }

  terminal = createTerminal({
    places,
    site,
    company,
    actions: {
      open: (id) => select(id),
      about: () => select('about'),
      night: (on) => setNight(on),
      blueprint: (on) => setBlueprint(on),
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
      hasWorld: () => Boolean(world),
    },
  });

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
  setTimeout(() => loader.remove(), 600);

  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (byId.has(fromHash)) select(fromHash);
  else if (world) showIntro();

  console.log('%cHi, fellow developer 👋', 'font: 600 14px system-ui; color: #ff6b4a', '\nThis town has a terminal. Press ` (backtick) to open it, or use the >_ button in the corner.');
}

boot();
