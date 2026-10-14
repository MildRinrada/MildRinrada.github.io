// Achievements: small goals that walk a visitor through the whole town (and every project in it).
// main.js reports what happens as events (the same names analytics uses: open/<id>, tour/finish, match/run,
// console/<cmd>, plus night, blueprint, terminal, pet:cat, bug/<n>, pumpkin). This module decides what
// they unlock, shows a notice, and draws the list in the detail panel.

import { progress } from './progress.js';

export const BUG_COUNT = 5;

// icon: a file in assets/icons/. seasonal: only listed during that festival, or once earned.
const LIST = [
  { id: 'explorer', icon: 'building_multiple' },
  { id: 'night', icon: 'weather-night' },
  { id: 'architect', icon: 'wrench_screwdriver' },
  { id: 'tourist', icon: 'flag' },
  { id: 'matchmaker', icon: 'puzzle_piece' },
  { id: 'hacker', icon: 'code_block' },
  { id: 'detective', icon: 'search_visual' },
  { id: 'catperson', icon: 'paw' },
  { id: 'qa', icon: 'bug' },
  { id: 'lost', icon: 'location_ripple' },
  { id: 'halloween', icon: 'pumpkin', seasonal: 'halloween' },
];
const CORE = LIST.filter((a) => !a.seasonal);

export function createAchievements({ places, festival, el, t, tp, iconImg, track, open, select, onComplete }) {
  const buildings = places.filter((p) => p.kind !== 'lot');
  const shown = () => LIST.filter((a) => !a.seasonal || a.seasonal === festival || progress.has(a.id));
  const doneCore = () => CORE.filter((a) => progress.has(a.id)).length;
  const allDone = () => doneCore() === CORE.length;
  const seenCount = () => buildings.filter((p) => progress.seen().includes(p.id)).length;

  // ---------- notices: queued while the loader is up, then shown one at a time ----------
  const stack = el('div', { class: 'toasts', 'aria-live': 'polite' });
  document.body.append(stack);
  const queue = [];
  let held = true;
  let showing = false;
  function notify(note) {
    queue.push(note);
    pump();
  }
  function pump() {
    if (held || showing || !queue.length) return;
    showing = true;
    const { icon, eyebrow, text, onclick } = queue.shift();
    const toast = el(
      'button',
      { class: 'toast', type: 'button', onclick: () => (onclick ?? open)() },
      el('span', { class: 'toast-icon', 'aria-hidden': 'true' }, iconImg(icon)),
      el('span', { class: 'toast-text' }, el('small', { text: eyebrow }), el('b', { text })),
    );
    stack.append(toast);
    requestAnimationFrame(() => toast.classList.add('in'));
    setTimeout(() => {
      toast.classList.remove('in');
      setTimeout(() => {
        toast.remove();
        showing = false;
        pump();
      }, 320);
    }, 3400);
  }

  // ---------- the trophy button in the bottom bar ----------
  const hud = document.querySelector('#btn-awards');
  function renderHud() {
    if (!hud) return;
    hud.querySelector('.award-count').textContent = `${doneCore()}/${CORE.length}`;
    hud.setAttribute('aria-label', `${t('ach.button')}: ${t('ach.count', { n: doneCore(), total: CORE.length })}`);
    hud.title = t('ach.button');
    hud.classList.toggle('is-complete', allDone());
  }

  function unlock(id) {
    if (!progress.unlock(id)) return;
    track(`achievement/${id}`);
    notify({ icon: LIST.find((a) => a.id === id)?.icon ?? 'trophy', eyebrow: t('ach.unlocked'), text: t(`ach.${id}.name`) });
    renderHud();
    if (CORE.some((a) => a.id === id) && allDone()) {
      track('achievement/all');
      setTimeout(() => onComplete?.(), 900);
    }
  }

  function note(event) {
    if (event.startsWith('open/')) {
      const id = event.slice(5);
      if (buildings.some((p) => p.id === id) && progress.see(id) && seenCount() === buildings.length) unlock('explorer');
    } else if (event.startsWith('bug/')) {
      if (!progress.fixBug(Number(event.slice(4)))) return;
      const n = progress.bugs().length;
      if (n >= BUG_COUNT) unlock('qa');
      else notify({ icon: 'bug', eyebrow: t('bug.fixed', { n, total: BUG_COUNT }), text: t('bug.more', { left: BUG_COUNT - n }) });
    } else if (event.startsWith('console/')) unlock('detective');
    else {
      const id = { night: 'night', blueprint: 'architect', 'tour/finish': 'tourist', 'match/run': 'matchmaker', terminal: 'hacker', 'pet:cat': 'catperson', pumpkin: festival === 'halloween' && 'halloween' }[event];
      if (id) unlock(id);
    }
  }

  // ---------- the list, shown in the detail panel ----------
  function item(a) {
    const done = progress.has(a.id);
    const count = a.id === 'explorer' ? [seenCount(), buildings.length] : a.id === 'qa' ? [progress.bugs().length, BUG_COUNT] : null;
    return el(
      'li',
      { class: `ach${done ? ' is-done' : ''}` },
      el('span', { class: 'ach-icon', 'aria-hidden': 'true' }, iconImg(a.icon)),
      el(
        'span',
        { class: 'ach-text' },
        el('b', { text: t(`ach.${a.id}.name`) }),
        el('span', { text: t(`ach.${a.id}.hint`) }),
        a.seasonal ? el('small', { class: 'ach-tag', text: t(`ach.season.${a.seasonal}`) }) : null,
        count && !done ? el('span', { class: 'ach-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(count[1]), 'aria-valuenow': String(count[0]) }, el('i', { style: `width: ${(count[0] / count[1]) * 100}%` })) : null,
      ),
      el('span', { class: 'ach-state', text: done ? t('ach.done') : count ? `${count[0]}/${count[1]}` : '' }),
    );
  }

  function parts({ head, contact }) {
    const unseen = buildings.filter((p) => !progress.seen().includes(p.id));
    return [
      head('trophy', t('ach.eyebrow'), t('ach.title'), t('ach.count', { n: doneCore(), total: CORE.length })),
      allDone() ? el('div', { class: 'ach-complete' }, el('b', { text: t('ach.doneTitle') }), el('p', { text: t('ach.doneBody') })) : el('p', { class: 'p-summary', text: t('ach.intro') }),
      allDone() ? contact() : null,
      el('ul', { class: 'ach-list' }, shown().map(item)),
      unseen.length && unseen.length < buildings.length
        ? el(
            'div',
            { class: 'ach-unseen' },
            el('p', { text: t('ach.unseen') }),
            el('div', { class: 'p-chips' }, unseen.map((p) => el('button', { class: 'chip chip-button', type: 'button', onclick: () => select(p.id), text: tp(p, 'short') ?? tp(p, 'title') }))),
          )
        : null,
    ];
  }

  // for the terminal: one line per achievement
  const lines = () => shown().map((a) => ({ id: a.id, done: progress.has(a.id), seasonal: Boolean(a.seasonal) }));

  function reset() {
    progress.reset();
    renderHud();
  }

  renderHud();
  return {
    note,
    unlock,
    parts,
    lines,
    reset,
    renderHud,
    release() {
      held = false;
      pump();
    },
    total: CORE.length,
    done: doneCore,
  };
}
