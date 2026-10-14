// What a visitor has found in town: unlocked achievements, fixed bugs and the buildings they opened.
// It lives in this browser only (localStorage), so it's a convenience: with storage blocked, nothing breaks,
// the visitor just starts from zero next time. The 404 page writes here too, so it has no DOM code.

const KEY = 'mildrinrada-town.progress';

const empty = () => ({ done: {}, bugs: [], seen: [] });

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (!v || typeof v !== 'object') return empty();
    return {
      done: v.done && typeof v.done === 'object' ? v.done : {},
      bugs: Array.isArray(v.bugs) ? v.bugs.filter(Number.isInteger) : [],
      seen: Array.isArray(v.seen) ? v.seen.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return empty();
  }
}

let state = read();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: progress lasts until the tab closes */
  }
}

export const progress = {
  has: (id) => Boolean(state.done[id]),
  done: () => Object.keys(state.done),
  // true only the first time, so the caller knows whether to celebrate
  unlock(id) {
    if (state.done[id]) return false;
    state.done[id] = Date.now();
    save();
    return true;
  },
  bugs: () => [...state.bugs],
  fixBug(n) {
    if (state.bugs.includes(n)) return false;
    state.bugs.push(n);
    save();
    return true;
  },
  seen: () => [...state.seen],
  see(id) {
    if (state.seen.includes(id)) return false;
    state.seen.push(id);
    save();
    return true;
  },
  reset() {
    state = empty();
    save();
  },
};
