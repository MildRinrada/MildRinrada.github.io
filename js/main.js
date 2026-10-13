// UI for MildRinrada Town: pins, detail panel, list view, intro, and the day/night and blueprint toggles.
// The 3D scene is loaded from world.js; if WebGL or the CDN is unavailable, the list view takes over.

import { site, places, LAYER_LABELS } from '../data/town.js';

const $ = (sel, root = document) => root.querySelector(sel);
const body = document.body;
const panel = $('#panel');
const list = $('#list');
const intro = $('#intro');
const loader = $('#loader');

const byId = new Map(places.map((p) => [p.id, p]));
const pins = new Map();
const LAYER_ORDER = ['frontend', 'backend', 'infra', 'data'];
const STATUS_LABELS = { live: 'Live', building: 'Under construction' };
const mobile = matchMedia('(max-width: 720px)');

// ?to=Company personalises the vacant lot. Rendered with textContent only, never as HTML.
const company = (new URLSearchParams(location.search).get('to') ?? '')
  .replace(/[^\p{L}\p{M}\p{N} .,&'’()+-]/gu, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 40);

let world = null;
let current = null;
let isNight = false;
let isBlueprint = false;
let resumeOk = false;

// Small DOM helper: el('p', { class: 'x', text: 'hi' }, child, [children]).
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
    if (kid == null || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function pinText(p) {
  if (p.kind === 'lot') return company ? { title: `Reserved for ${company}`, sub: 'Next project' } : { title: 'Vacant lot', sub: 'Next project · planning' };
  if (p.kind === 'work') return { title: p.title, sub: `Where I work · ${p.period}` };
  return { title: p.title, sub: STATUS_LABELS[p.status] ?? p.category };
}

// ---------- 3D anchors ----------
function makePin(p) {
  const t = pinText(p);
  const btn = el(
    'button',
    { class: `pin pin-${p.kind}`, type: 'button', 'aria-label': `${t.title}. Open details` },
    el('span', { class: 'pin-inner' }, el('span', { class: 'pin-icon', 'aria-hidden': 'true', text: p.icon }), el('span', { class: 'pin-text' }, el('b', { text: t.title }), el('small', { text: t.sub }))),
  );
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    select(p.id);
  });
  btn.addEventListener('pointerenter', () => world?.setHover(p.id));
  btn.addEventListener('pointerleave', () => world?.setHover(null));
  pins.set(p.id, btn);
  return btn;
}

function makeLayerTag(layer) {
  return el(
    'div',
    { class: `layer-tag layer-${layer.kind}` },
    el('span', { class: 'layer-kind', text: LAYER_LABELS[layer.kind] }),
    el('span', { class: 'layer-items', text: layer.items.join(' · ') }),
  );
}

function onHover(id) {
  for (const [pid, pin] of pins) pin.classList.toggle('is-hover', pid === id);
}

// ---------- detail panel ----------
const section = (title, ...content) => el('section', { class: 'p-section' }, el('h3', { text: title }), ...content);

function shot(p) {
  const fig = el('figure', { class: 'p-shot' });
  const placeholder = () => fig.replaceChildren(el('div', { class: 'p-shot-empty' }, el('span', { class: 'p-shot-icon', 'aria-hidden': 'true', text: p.icon }), el('span', { text: 'Screenshot coming soon' })));
  if (!p.media?.cover) {
    placeholder();
    return fig;
  }
  const img = el('img', { src: p.media.cover, alt: `${p.title} screenshot`, loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', placeholder, { once: true });
  fig.append(img);
  return fig;
}

function stack(layers) {
  const ordered = [...layers].sort((a, b) => LAYER_ORDER.indexOf(a.kind) - LAYER_ORDER.indexOf(b.kind));
  return el(
    'div',
    { class: 'stack' },
    ordered.map((l) =>
      el('div', { class: `stack-row stack-${l.kind}` }, el('span', { class: 'stack-kind', text: LAYER_LABELS[l.kind] }), el('span', { class: 'stack-items' }, l.items.map((i) => el('span', { class: 'chip', text: i })))),
    ),
    world && el('button', { class: 'stack-blueprint', type: 'button', onclick: () => setBlueprint(true), text: 'See these floors in Blueprint view →' }),
  );
}

function linkButtons(p) {
  const links = [];
  if (p.links?.live) links.push(el('a', { class: 'btn btn-primary', href: p.links.live, target: '_blank', rel: 'noopener', text: 'Visit live site ↗' }));
  if (p.links?.repo) links.push(el('a', { class: 'btn btn-ghost', href: p.links.repo, target: '_blank', rel: 'noopener', text: 'View code' }));
  return links.length ? el('div', { class: 'p-actions' }, links) : null;
}

function contactButtons() {
  return el(
    'div',
    { class: 'p-actions' },
    site.email && el('a', { class: 'btn btn-primary', href: `mailto:${site.email}`, text: 'Email me' }),
    resumeOk && el('a', { class: 'btn btn-ghost', href: site.resume, download: true, text: 'Download résumé' }),
    el('a', { class: 'btn btn-ghost', href: site.github, target: '_blank', rel: 'noopener', text: 'GitHub' }),
  );
}

function renderPanel(p) {
  const out = $('.panel-body', panel);
  if (p.kind === 'lot') {
    out.replaceChildren(
      el(
        'header',
        { class: 'p-head' },
        el('span', { class: 'p-icon', 'aria-hidden': 'true', text: p.icon }),
        el('div', {}, el('p', { class: 'eyebrow', text: company ? 'Reserved lot' : 'Coming soon' }), el('h2', { id: 'panel-title', tabindex: '-1', text: company ? `Reserved for ${company}` : 'Vacant lot' })),
      ),
      el(
        'p',
        { class: 'p-summary' },
        company
          ? 'This lot is waiting for the next thing we build together. The rest of town shows how I work: contracts first, security from day one, and ownership from the frontend down to the database.'
          : 'The plans are on the drawing board. The next building in town goes here.',
      ),
      contactButtons(),
    );
    return;
  }

  const chips = [];
  if (p.kind === 'work') chips.push(p.period, p.workMode);
  else if (STATUS_LABELS[p.status]) chips.push(STATUS_LABELS[p.status]);

  const parts = [
    el(
      'header',
      { class: 'p-head' },
      el('span', { class: 'p-icon', 'aria-hidden': 'true', text: p.icon }),
      el('div', {}, el('p', { class: 'eyebrow', text: p.kind === 'work' ? 'Experience' : p.category }), el('h2', { id: 'panel-title', tabindex: '-1', text: p.title }), el('p', { class: 'p-tagline', text: p.tagline })),
    ),
    chips.length ? el('div', { class: 'p-chips' }, chips.filter(Boolean).map((c) => el('span', { class: c === 'Live' ? 'chip chip-live' : 'chip', text: c }))) : null,
    shot(p),
    el('p', { class: 'p-summary', text: p.summary }),
    p.highlights?.length ? section(p.kind === 'work' ? 'What I do' : 'Highlights', el('ul', { class: 'p-list' }, p.highlights.map((h) => el('li', { text: h })))) : null,
    p.layers?.length ? section('Stack, floor by floor', stack(p.layers)) : null,
    linkButtons(p),
  ];
  out.replaceChildren(...parts.filter(Boolean)); // replaceChildren would print null as text
}

function panelInset() {
  const r = panel.getBoundingClientRect();
  return mobile.matches ? { bottom: r.height } : { right: r.width + 24 };
}

function select(id) {
  const p = byId.get(id);
  if (!p) return;
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
  world?.home();
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

// ---------- list view ----------
function card(p) {
  return el(
    'article',
    { class: 'card' },
    el('div', { class: 'card-top' }, el('span', { class: 'card-icon', 'aria-hidden': 'true', text: p.icon }), el('p', { class: 'eyebrow', text: p.kind === 'work' ? `Experience · ${p.period}` : p.category })),
    el('h3', { text: p.title }),
    el('p', { class: 'card-tagline', text: p.tagline }),
    el('p', { class: 'card-summary', text: p.summary }),
    el('div', { class: 'card-chips' }, (p.layers ?? []).flatMap((l) => l.items).slice(0, 8).map((i) => el('span', { class: 'chip', text: i }))),
    el('button', {
      class: 'btn btn-ghost card-go',
      type: 'button',
      text: world ? 'Show in town →' : 'Details →',
      onclick: () => {
        closeList();
        select(p.id);
      },
    }),
  );
}

function openList(note) {
  $('.list-grid', list).replaceChildren(...places.filter((p) => p.kind !== 'lot').map(card));
  const noteEl = $('.list-note', list);
  noteEl.hidden = !note;
  noteEl.textContent = note ?? '';
  list.classList.add('open');
  list.inert = false;
  $('.list-close', list).focus({ preventScroll: true });
}

function closeList() {
  list.classList.remove('open');
  list.inert = true;
}

// ---------- intro ----------
function showIntro() {
  if (company) {
    $('#intro-title').textContent = `Hi, ${company} 👋`;
    $('.intro-body').replaceChildren(
      'Welcome to MildRinrada Town. Every building here is a system I designed and built, and one lot is reserved for you. Click a building to step inside, or switch on ',
      el('b', { text: 'Blueprint' }),
      ' to see the stack under every roof.',
    );
  }
  intro.classList.add('open');
  intro.inert = false;
  $('[data-intro="explore"]').focus({ preventScroll: true });
}

function hideIntro() {
  intro.classList.remove('open');
  intro.inert = true;
}

// ---------- toggles ----------
function setNight(on, instant = false) {
  isNight = on;
  body.classList.toggle('is-night', on);
  $('#btn-time').setAttribute('aria-pressed', String(on));
  world?.setNight(on, instant);
  syncThemeColor();
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
}

function syncThemeColor() {
  $('meta[name="theme-color"]').content = isBlueprint ? '#0d4fa3' : isNight ? '#0b1026' : '#a9d8ff';
}

function wireUi() {
  $('#btn-time').addEventListener('click', () => setNight(!isNight));
  $('#btn-blueprint').addEventListener('click', () => setBlueprint(!isBlueprint));
  $('#btn-list').addEventListener('click', () => openList());
  $('.list-close', list).addEventListener('click', closeList);
  $('.panel-close', panel).addEventListener('click', closePanel);
  $('[data-intro="explore"]').addEventListener('click', hideIntro);
  $('[data-intro="list"]').addEventListener('click', () => {
    hideIntro();
    openList();
  });
  intro.addEventListener('click', (e) => e.target === intro && hideIntro());
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (list.classList.contains('open') && !body.classList.contains('no-3d')) closeList();
    else if (intro.classList.contains('open')) hideIntro();
    else closePanel();
  });

  fetch(site.resume, { method: 'HEAD' })
    .then((r) => {
      if (!r.ok) return;
      resumeOk = true;
      const btn = $('#btn-resume');
      btn.href = site.resume;
      btn.hidden = false;
    })
    .catch(() => {});
}

function setProgress(f) {
  const pct = Math.round(Math.min(1, f) * 100);
  $('.loader-bar span').style.width = `${pct}%`;
  $('.loader-pct').textContent = `${pct}%`;
}

async function boot() {
  wireUi();
  setNight(matchMedia('(prefers-color-scheme: dark)').matches, true);

  try {
    const { createWorld } = await import('./world.js');
    world = await createWorld({
      container: $('#stage'),
      places,
      makePin,
      makeLayerTag,
      onHover,
      onProgress: setProgress,
      onSelect: (id) => (id ? select(id) : closePanel()),
    });
    world.setNight(isNight, true);
  } catch (err) {
    console.error('3D town unavailable, showing the list instead.', err);
    body.classList.add('no-3d');
    openList("The 3D town couldn't start on this device, so here's the list version.");
  }

  setProgress(1);
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 600);

  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (byId.has(fromHash)) select(fromHash);
  else if (world) showIntro();
}

boot();
