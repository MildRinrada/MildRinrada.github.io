// The one-minute guided tour: the camera visits each building in turn with a short caption, so a visitor
// who never clicks still sees everything. The order is `tour` in data/town.js.

const STEP_MS = 3800;
const FIRST_MS = 4200;

export function createTour({ order, byId, el, t, tp, iconImg, tint, focus, home, markPin, openDetails, track, company }) {
  const root = document.querySelector('#tour');
  const steps = [{ id: null }, ...order.filter((id) => byId.has(id)).map((id) => ({ id }))];
  let index = -1;
  let playing = false;
  let elapsed = 0;
  let last = 0;
  let raf = 0;

  const duration = (i) => (i === 0 ? FIRST_MS : STEP_MS);
  const atEnd = () => index === steps.length - 1;
  const inset = () => ({ bottom: root.getBoundingClientRect().height + 28 });

  function captionFor(step) {
    if (!step.id) return { icon: 'person', eyebrow: t('tour.eyebrow'), heading: t('tour.introTitle'), text: t('tour.introBody'), tint: '#f9dcc6' };
    const p = byId.get(step.id);
    if (p.kind === 'lot') {
      return {
        icon: p.icon,
        eyebrow: t('tour.endEyebrow'),
        heading: company ? t('lot.reserved', { company }) : t('tour.endTitle'),
        text: company ? t('tour.endBodyCompany', { company }) : t('tour.endBody'),
        tint: tint(p),
      };
    }
    const eyebrow = { work: t('eyebrow.experience'), education: t('eyebrow.education') }[p.kind] ?? tp(p, 'category');
    const sub = p.kind === 'work' ? `${tp(p, 'tagline')} (${tp(p, 'period')})` : tp(p, 'tagline');
    return { icon: p.icon, eyebrow, heading: tp(p, 'short') ?? tp(p, 'title'), text: sub, tint: tint(p) };
  }

  function render() {
    const step = steps[index];
    const c = captionFor(step);
    const bars = steps.map((_, i) => el('span', { class: `tour-bar${i < index ? ' is-done' : ''}${i === index ? ' is-now' : ''}` }, el('i')));
    const iconButton = (cls, label, svgPath, onclick) =>
      el('button', { class: `tour-btn ${cls}`, type: 'button', 'aria-label': label, title: label, onclick }, svg(svgPath));
    root.style.setProperty('--tint', c.tint);
    root.replaceChildren(
      el('div', { class: 'tour-bars', 'aria-hidden': 'true' }, bars),
      el(
        'div',
        { class: 'tour-body' },
        el('span', { class: 'tour-icon', 'aria-hidden': 'true' }, iconImg(c.icon)),
        el('div', { class: 'tour-text' }, el('p', { class: 'eyebrow', text: c.eyebrow }), el('h2', { text: c.heading }), el('p', { class: 'tour-sub', text: c.text })),
      ),
      el(
        'div',
        { class: 'tour-actions' },
        el('span', { class: 'tour-count', text: t('tour.step', { n: index + 1, total: steps.length }) }),
        iconButton('tour-prev', t('tour.prev'), 'M15 5l-7 7 7 7', () => go(index - 1)),
        atEnd() ? null : iconButton('tour-play', playing ? t('tour.pause') : t('tour.play'), playing ? 'M8 5v14M16 5v14' : 'M7 5l12 7-12 7z', toggle),
        atEnd() ? null : iconButton('tour-next', t('tour.next'), 'M9 5l7 7-7 7', () => go(index + 1)),
        step.id ? el('button', { class: 'btn btn-primary tour-details', type: 'button', text: atEnd() ? t('tour.contact') : t('tour.details'), onclick: () => openStep(step.id) }) : null,
        iconButton('tour-close', t('tour.close'), 'M6 6l12 12M18 6L6 18', () => stop()),
      ),
    );
    paintProgress();
  }

  function svg(d) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    s.append(path);
    return s;
  }

  function paintProgress() {
    const bar = root.querySelector('.tour-bar.is-now i');
    if (bar) bar.style.width = `${Math.min(100, (elapsed / duration(index)) * 100)}%`;
  }

  function go(i) {
    if (i < 0 || i >= steps.length) return;
    index = i;
    elapsed = 0;
    const id = steps[i].id;
    markPin(id);
    render();
    // the card's height can change with the caption, so measure after it is on screen
    requestAnimationFrame(() => (id ? focus(id, inset()) : home(inset())));
    if (atEnd()) {
      playing = false;
      track('tour/finish');
    }
  }

  function tick(now) {
    if (!playing) return;
    elapsed += now - last;
    last = now;
    paintProgress();
    if (elapsed >= duration(index)) go(index + 1);
    if (playing) raf = requestAnimationFrame(tick);
  }

  function play() {
    if (atEnd()) return;
    playing = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    render();
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    if (isOpen()) render();
  }

  const toggle = () => (playing ? pause() : play());

  function start() {
    root.classList.add('open');
    root.inert = false;
    document.body.classList.add('is-touring');
    track('tour/start');
    go(0);
    play();
    root.querySelector('.tour-play')?.focus({ preventScroll: true });
  }

  function stop({ keepView = false } = {}) {
    if (!isOpen()) return;
    pause();
    root.classList.remove('open');
    root.inert = true;
    document.body.classList.remove('is-touring');
    markPin(null);
    if (index < steps.length - 1) track(`tour/stop-at-${index + 1}`);
    index = -1;
    if (!keepView) home({});
  }

  function openStep(id) {
    stop({ keepView: true });
    openDetails(id);
  }

  const isOpen = () => root.classList.contains('open');

  // relabel on a language switch
  const refresh = () => isOpen() && render();

  return { start, stop, pause, isOpen, refresh, isPlaying: () => playing };
}
