// The secret terminal. Press ` (backtick) or the >_ button. Everything printed uses textContent.

const AVATARS = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f'];
const BANNER = String.raw`
        _                 ___
   _   | |   ___    _    |   |
  | |__| |  |   |  | |   | # |   _
  | #  # |  | # |__| |___| # |__| |
 =================================
  MildRinrada Town shell v1.0`;

export function createTerminal({ places, site, company, actions }) {
  const root = document.querySelector('#terminal');
  const out = root.querySelector('.term-out');
  const form = root.querySelector('.term-form');
  const input = root.querySelector('.term-input');
  const toggleBtn = document.querySelector('#btn-terminal');
  const user = company ? `visitor@${company.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}` : 'visitor';
  root.querySelector('.term-prompt').textContent = `${user}:~$`;
  root.querySelector('.term-title').textContent = `${user} — mildrinrada-town`;

  const ids = places.filter((p) => p.kind !== 'lot').map((p) => p.id);
  const byId = new Map(places.map((p) => [p.id, p]));
  const history = [];
  let hIndex = 0;
  let greeted = false;

  const line = (text = '', cls = '') => {
    const div = document.createElement('div');
    div.className = `ln ${cls}`;
    div.textContent = text;
    out.append(div);
    out.scrollTop = out.scrollHeight;
    return div;
  };
  const link = (label, href) => {
    const div = line('', 'ln-link');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (!href.startsWith('mailto:')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    div.append(a);
    out.scrollTop = out.scrollHeight;
  };
  const later = (ms, fn) => new Promise((r) => setTimeout(() => r(fn()), ms));

  const commands = {
    help() {
      line('Commands', 'ln-head');
      [
        ['ls', 'what is in town'],
        ['cat <name>', 'read about a building   (try: cat about.txt)'],
        ['open <name>', 'fly to a building'],
        ['whoami', 'who you are, who I am'],
        ['stack', 'every technology in town'],
        ['weather [live|clear|cloudy|rain|storm]', ''],
        ['night | day | blueprint', 'change the view'],
        ['avatar [list|<name>]', 'change the walking character'],
        ['fireworks', ''],
        ['contact', 'how to reach me'],
        ['cv', 'print a one-page CV'],
        ['tour', 'a one-minute guided tour'],
        ['sudo hire mild', ':)'],
        ['clear | exit', ''],
      ].forEach(([c, d]) => line(`  ${c.padEnd(40)}${d}`));
      line('Tab completes names. ↑ ↓ walk through history.', 'ln-dim');
    },
    ls(arg) {
      if (!arg || arg === '.' || arg === '~') {
        line('about.txt   buildings/   pets/', 'ln-ok');
        return;
      }
      if (arg.startsWith('pets')) {
        line('cat.glb   dog.glb      (click them in town)');
        return;
      }
      if (arg.startsWith('buildings')) {
        for (const p of places) {
          if (p.kind === 'lot') line(`  ${'next-lot'.padEnd(26)}${company ? `reserved for ${company}` : 'vacant'}`, 'ln-dim');
          else line(`  ${p.id.padEnd(26)}${p.title}${p.status === 'live' ? '  ● live' : p.status === 'building' ? '  [under construction]' : ''}`);
        }
        return;
      }
      line(`ls: cannot access '${arg}': No such file or directory`, 'ln-err');
    },
    cat(arg) {
      if (!arg) return line('usage: cat <name>   (see: ls buildings)', 'ln-err');
      if (arg === 'about.txt' || arg === 'about') {
        line(`${site.name} (${site.nickname}), ${site.role}`, 'ln-head');
        line(site.about.headline);
        site.about.bio.forEach((t) => line(t, 'ln-dim'));
        line(`${site.about.education.degree}, ${site.about.education.school}`);
        return;
      }
      const p = byId.get(arg.replace(/\/$/, ''));
      if (!p || p.kind === 'lot') return line(`cat: ${arg}: No such file or directory`, 'ln-err');
      line(p.title, 'ln-head');
      line(p.tagline, 'ln-dim');
      line(p.summary);
      for (const l of p.layers ?? []) line(`  ${l.kind.padEnd(9)} ${l.items.join(', ')}`, 'ln-ok');
      line(`→ open ${p.id}`, 'ln-dim');
    },
    open(arg) {
      if (!arg) return line('usage: open <name>', 'ln-err');
      const id = arg.replace(/\/$/, '');
      if (id === 'about' || id === 'about.txt') {
        actions.about();
        return line('Opening About me…', 'ln-ok');
      }
      if (!byId.has(id)) return line(`open: ${arg}: No such building`, 'ln-err');
      actions.open(id);
      line(`Flying to ${byId.get(id).title ?? id}…`, 'ln-ok');
    },
    cd(arg) {
      return arg && arg !== '~' ? commands.open(arg) : line('');
    },
    whoami() {
      line(company ? `${user}  (welcome, ${company})` : `${user}  (but you could be my next teammate)`);
      line(`and I'm ${site.name}, a ${site.role.toLowerCase()}. → cat about.txt`, 'ln-dim');
    },
    about() {
      actions.about();
      line('Opening About me…', 'ln-ok');
    },
    stack() {
      const all = new Map();
      for (const p of places) for (const l of p.layers ?? []) for (const i of l.items) all.set(i, (all.get(i) ?? 0) + 1);
      const sorted = [...all.entries()].sort((a, b) => b[1] - a[1]);
      line(`${sorted.length} technologies across ${places.filter((p) => p.layers?.length).length} buildings`, 'ln-head');
      line(sorted.map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(', '));
    },
    async weather(arg) {
      const kinds = ['live', 'clear', 'cloudy', 'rain', 'storm'];
      if (!arg) return line(`usage: weather <${kinds.join('|')}>`, 'ln-err');
      if (!kinds.includes(arg)) return line(`weather: unknown forecast '${arg}'`, 'ln-err');
      await actions.weather(arg);
      line(arg === 'live' ? 'Following the real Bangkok weather again.' : `Weather set to ${arg}.`, 'ln-ok');
    },
    night() {
      actions.night(true);
      line('Lights on.', 'ln-ok');
    },
    day() {
      actions.night(false);
      line('Good morning.', 'ln-ok');
    },
    blueprint() {
      actions.blueprint(true);
      line('Blueprint on. Hover a building to read its floors.', 'ln-ok');
    },
    async avatar(arg) {
      if (!arg || arg === 'list') {
        line('Characters:', 'ln-head');
        line(AVATARS.join('  '));
        line(`Now: ${site.avatar.replace('characters/character-', '').replace('.glb', '')}. Try: avatar female-b`, 'ln-dim');
        return;
      }
      if (!AVATARS.includes(arg)) return line(`avatar: '${arg}' not found. Try: avatar list`, 'ln-err');
      if (!actions.hasWorld()) return line('avatar: the 3D town is not running here.', 'ln-err');
      line('Changing clothes…', 'ln-dim');
      await actions.avatar(`characters/character-${arg}.glb`);
      line(`✓ Now walking around as ${arg}.`, 'ln-ok');
      line(`To keep it, set avatar: 'characters/character-${arg}.glb' in data/town.js`, 'ln-dim');
    },
    tour() {
      if (!actions.hasWorld()) return line('tour: the 3D town is not running here.', 'ln-err');
      line('Starting the tour…', 'ln-ok');
      setTimeout(() => {
        close();
        actions.tour();
      }, 300);
    },
    cv() {
      line('Opening the print dialog…', 'ln-ok');
      setTimeout(() => actions.cv(), 300);
    },
    fireworks() {
      actions.fireworks();
      line('*  .  *  boom  *  .  *', 'ln-ok');
    },
    contact() {
      line('Reach me', 'ln-head');
      if (site.email) link(`email     ${site.email}`, `mailto:${site.email}`);
      if (site.linkedin) link(`linkedin  ${site.linkedin}`, site.linkedin);
      link(`github    ${site.github}`, site.github);
    },
    async sudo(...args) {
      if (args.join(' ') !== 'hire mild') return line('usage: sudo hire mild', 'ln-err');
      line(`[sudo] password for ${user}: ••••••••`, 'ln-dim');
      await later(650, () => line(company ? `✓ Access granted for ${company}.` : '✓ Access granted.', 'ln-ok'));
      await later(350, () => line('  → launching fireworks…', 'ln-dim'));
      actions.fireworks();
      await later(900, () => line(`Thank you! ${site.nickname} would love to hear from you:`, 'ln-head'));
      commands.contact();
    },
    hire(arg) {
      line(arg === 'mild' ? 'hire: permission denied (hint: try sudo)' : 'usage: hire mild', 'ln-err');
    },
    rm(...args) {
      line(args.join(' ').includes('-rf') ? 'rm: this town has backups. Nice try :)' : 'rm: operation not permitted', 'ln-err');
    },
    date() {
      line(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'short' }).format(new Date()) + ' (Bangkok)');
    },
    pwd() {
      line('/home/visitor/mildrinrada-town');
    },
    echo(...args) {
      line(args.join(' '));
    },
    coffee() {
      line('Brewing... done. Back to shipping.', 'ln-ok');
    },
    clear() {
      out.replaceChildren();
    },
    exit() {
      close();
    },
  };
  commands.hello = commands.hi = () => line(`Hi! Type 'help' to look around.`);

  async function run(raw) {
    const text = raw.trim();
    line(`${user}:~$ ${text}`, 'ln-cmd');
    if (!text) return;
    history.push(text);
    hIndex = history.length;
    const [cmd, ...args] = text.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (!fn) return line(`${cmd}: command not found. Type 'help'.`, 'ln-err');
    try {
      await fn(...args);
    } catch (err) {
      line(`${cmd}: ${err.message}`, 'ln-err');
    }
  }

  function complete() {
    const [cmd, ...rest] = input.value.split(/\s+/);
    if (!rest.length) {
      const hit = Object.keys(commands).filter((c) => c.startsWith(cmd));
      if (hit.length === 1) input.value = `${hit[0]} `;
      else if (hit.length) line(hit.join('  '), 'ln-dim');
      return;
    }
    const pool = cmd === 'avatar' ? ['list', ...AVATARS] : cmd === 'weather' ? ['live', 'clear', 'cloudy', 'rain', 'storm'] : cmd === 'ls' ? ['buildings', 'pets'] : [...ids, 'about.txt'];
    const word = rest[rest.length - 1];
    const hit = pool.filter((c) => c.startsWith(word));
    if (hit.length === 1) input.value = [cmd, ...rest.slice(0, -1), hit[0]].join(' ');
    else if (hit.length) line(hit.join('  '), 'ln-dim');
  }

  function open() {
    root.classList.add('open');
    root.inert = false;
    toggleBtn?.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      line(BANNER, 'ln-art');
      line(company ? `Welcome, ${company}. Type 'help' to look around.` : "Type 'help' to look around. Psst: try 'sudo hire mild'.", 'ln-dim');
    }
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    root.classList.remove('open');
    root.inert = true;
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.focus({ preventScroll: true });
  }
  const isOpen = () => root.classList.contains('open');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      hIndex = Math.max(0, hIndex - 1);
      input.value = history[hIndex] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] ?? '';
    } else if (e.key === 'Escape' || e.key === '`') {
      e.preventDefault();
      close();
    }
  });
  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && (e.target.matches('input, textarea') || e.target.isContentEditable);
    if (e.key === '`' && !typing) {
      e.preventDefault();
      isOpen() ? close() : open();
    }
  });
  toggleBtn?.addEventListener('click', () => (isOpen() ? close() : open()));
  root.querySelector('.term-close').addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === out || e.target === root.querySelector('.term-body')) input.focus();
  });

  return { open, close, isOpen, run };
}
