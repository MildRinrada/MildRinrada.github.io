// The DevTools easter egg: a greeting for anyone who opens the console, and a few commands to type there
// (hire() and town.*). Each command is counted as console/<name> when analytics is on.

import { SKYLINE } from './terminal.js';
import { t, tp } from './i18n.js';
import { FLAGS } from './ctf.js';

const INK = '#b5727c'; // the rose, a shade darker so it reads on both the light and the dark console
const S = {
  art: `color: ${INK}; font-family: monospace; line-height: 1.15`,
  title: 'font: 600 20px/1.2 Georgia, serif; color: #fff; background: #c9979b; padding: 6px 16px; border-radius: 999px',
  text: 'font: 13px/1.6 system-ui, sans-serif',
  ok: `color: ${INK}; font: 600 13px/1.6 system-ui, sans-serif`,
  cmd: `color: ${INK}; font: 700 12px/1.8 monospace`,
  dim: 'color: #8a8380; font: 12px/1.8 system-ui, sans-serif',
};
const WEATHER = ['clear', 'cloudy', 'rain', 'storm', 'live'];
const MENU = [
  ['hire()', 'con.c.hire'],
  ['town.projects()', 'con.c.projects'],
  ['town.stack()', 'con.c.stack'],
  ["town.weather('rain')", 'con.c.weather'],
  ['town.night()', 'con.c.night'],
  ['town.blueprint()', 'con.c.blueprint'],
  ['town.fireworks()', 'con.c.fireworks'],
  ['town.tour()', 'con.c.tour'],
  ['town.terminal()', 'con.c.terminal'],
  ['town.ctf()', 'con.c.ctf'],
  ['town.source()', 'con.c.source'],
  ['help', 'con.c.help'],
];

// say(['text', style], ['more', style]) → one console line with a style per part
const say = (...parts) => console.log(parts.map(([s]) => `%c${s}`).join(''), ...parts.map(([, style]) => style));

export function consoleEgg({ site, places, company, actions, track }) {
  const repo = `${site.github.replace(/\/$/, '')}/MildRinrada.github.io`;
  const buildings = places.filter((p) => p.kind !== 'lot');

  const help = () => {
    say([t('con.try'), S.text]);
    say(...MENU.flatMap(([c, key], i) => [[`${i ? '\n' : ''}  ${c.padEnd(22)}`, S.cmd], [t(key), S.dim]]));
  };
  const contacts = () => {
    const rows = [['email', site.email && `mailto:${site.email}`], ['linkedin', site.linkedin], ['github', site.github]];
    for (const [name, href] of rows) if (href) say([`  ${name.padEnd(10)}`, S.cmd], [href.replace(/^mailto:/, ''), S.text]);
  };
  const needsWorld = () => {
    if (actions.hasWorld()) return true;
    say([t('con.no3d'), S.dim]);
    return false;
  };

  const commands = {
    help,
    projects() {
      const rows = {};
      for (const p of buildings) {
        rows[p.id] = {
          [t('con.col.title')]: tp(p, 'title'),
          [t('con.col.type')]: tp(p, 'category') ?? tp(p, 'tagline'),
          [t('con.col.stack')]: (p.layers ?? []).flatMap((l) => l.items).join(', '),
          [t('con.col.link')]: p.links?.live || p.links?.repo || p.links?.design || '',
        };
      }
      console.table(rows);
    },
    stack() {
      const all = new Map();
      for (const p of buildings) for (const l of p.layers ?? []) for (const i of l.items) all.set(i, (all.get(i) ?? 0) + 1);
      const sorted = [...all.entries()].sort((a, b) => b[1] - a[1]);
      say([t('con.stack', { n: sorted.length, b: buildings.filter((p) => p.layers?.length).length }), S.ok]);
      say([sorted.map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(', '), S.text]);
    },
    weather(kind) {
      if (!WEATHER.includes(kind)) return say([t('con.weatherUsage'), S.dim]);
      // not awaited, so the console prints the message instead of a pending Promise
      Promise.resolve(actions.weather(kind)).then(() => say([kind === 'live' ? t('con.weatherLive') : t('con.weatherSet', { kind }), S.ok]));
    },
    night() {
      actions.night(true);
      say([t('con.night'), S.ok]);
    },
    day() {
      actions.night(false);
      say([t('con.day'), S.ok]);
    },
    blueprint() {
      const on = !actions.isBlueprint();
      actions.blueprint(on);
      say([t(on ? 'con.blueprintOn' : 'con.blueprintOff'), S.ok]);
    },
    fireworks() {
      if (needsWorld()) actions.fireworks();
    },
    tour() {
      if (needsWorld()) actions.tour();
    },
    terminal() {
      actions.terminal();
    },
    ctf() {
      const got = actions.ctf.captured();
      say([t('con.ctf', { n: got.length, total: actions.ctf.total }), S.ok]);
      for (const { id } of FLAGS) {
        const done = got.includes(id);
        say([`  [${done ? 'x' : ' '}] ${t(`ctf.${id}.name`).padEnd(18)}`, S.cmd], [t(done ? `ctf.${id}.lesson` : `ctf.${id}.hint`), S.dim]);
      }
      say(["  town.submit('FLAG{...}')", S.cmd], [`  ${t('con.ctfSubmit')}`, S.dim]);
    },
    submit(flag) {
      // not awaited, so the console prints the answer instead of a pending Promise
      actions.ctf.submit(flag).then(({ result, id }) => {
        if (result === 'wrong') return say([t('con.ctfWrong'), S.dim]);
        if (result === 'again') return say([t('con.ctfAgain', { name: t(`ctf.${id}.name`) }), S.dim]);
        say([t('con.ctfRight', { name: t(`ctf.${id}.name`), n: actions.ctf.captured().length, total: actions.ctf.total }), S.ok]);
        say([t(`ctf.${id}.lesson`), S.text]);
      });
    },
    source() {
      say([t('con.repo', { url: repo }), S.text]);
      window.open(repo, '_blank', 'noopener');
    },
  };

  function hire() {
    say([company ? t('con.grantedCompany', { company }) : t('con.granted'), S.ok]);
    if (actions.hasWorld()) actions.fireworks();
    say([t('con.hireDone'), S.text]);
    contacts();
    setTimeout(actions.contact, 700);
  }

  // counted, and named, so `town.` autocompletes to something readable
  const counted = (name, fn) =>
    Object.defineProperty(
      (...args) => {
        track(`console/${name}`);
        return fn(...args);
      },
      'name',
      { value: name },
    );
  window.town = Object.freeze(Object.fromEntries(Object.entries(commands).map(([name, fn]) => [name, counted(name, fn)])));
  window.hire = counted('hire', hire);
  // Most people type plain `help`, so reading it prints the menu; `help()` works too. The counter is written
  // first on purpose: DevTools previews as you type but stops at the first side effect, so the menu isn't
  // printed while someone is still typing.
  let asked = 0;
  const helpFn = function help() {};
  Object.defineProperty(window, 'help', {
    configurable: true,
    get() {
      asked += 1;
      window.town.help();
      return helpFn;
    },
  });

  say([SKYLINE, S.art]);
  say([' MildRinrada Town ', S.title]);
  say([`${company ? t('con.hiCompany', { company }) : t('con.hi')} ${t('con.curious')}`, S.text]);
  say([t('con.plain'), S.text]);
  help();
  say([t('con.repo', { url: repo }), S.dim]);
}
