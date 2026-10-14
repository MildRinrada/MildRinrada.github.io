// A small capture-the-flag for curious visitors. Four flags, each one a security habit:
//   recon      an HTML comment in index.html (base64)
//   robots     robots.txt points at /staff-only, which the 404 page answers
//   session    a JWT left in localStorage when the page loads: signed, not encrypted
//   injection  any XSS / SQL / template payload typed into the town; it stays plain text
// Only hashes of the flags live here, so reading this file doesn't hand them over. Progress is in progress.js.

import { progress } from './progress.js';

export const FLAGS = [
  { id: 'recon', hash: '5a0e02dc48dde96bf779e4e6d77a417b82defc47dda62e88acf687db275dc49d' },
  { id: 'robots', hash: 'd43266a3ddf2cab859b257fad7ea2f2eceee3726e72f1651305a6d3f14bf064e' },
  { id: 'session', hash: '069afc858bcbf247cd0d6039e1685457974e6f1567ae0387275cac6922be9eff' },
  { id: 'injection', hash: '90458daf8ecc0d9919462275f82b0449e0a6d10220381a03309a5fd2d5ccff25', flag: 'FLAG{textcontent_not_innerhtml}' },
];

// The token a careless app might leave in localStorage (which is the other half of the lesson).
const SESSION =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ2aXNpdG9yIiwicm9sZSI6Imd1ZXN0IiwiZmxhZyI6IkZMQUd7and0X2lzX3NpZ25lZF9ub3RfZW5jcnlwdGVkfSIsIm5vdGUiOiJzaWduZWQsIG5vdCBlbmNyeXB0ZWQifQ.IYKeWsoy9yWOxlDanx1JgYY8z8O9M5yPz920DmhAZF8';

// What an attacker would try first: script tags and event handlers, javascript: links, the classic SQL
// injections, template expressions and path traversal. Kept narrow so a pasted job description never trips it.
const PAYLOAD = new RegExp(
  [
    String.raw`<\s*\/?\s*(script|img|svg|iframe|object|embed|body|style|meta|link)\b`,
    String.raw`\bon(error|load|click|mouseover|focus|toggle|begin)\s*=`,
    String.raw`javascript\s*:`,
    String.raw`'\s*(or|and)\s+'?\w*'?\s*=`,
    String.raw`\bunion\s+(all\s+)?select\b`,
    String.raw`;\s*(drop|delete|truncate)\s+table\b`,
    String.raw`'\s*;?\s*--`,
    String.raw`\{\{[^}]*[*+()][^}]*\}\}`, // {{7*7}}, but not a plain {{name}}
    String.raw`\$\{[^}]*[*+()][^}]*\}`, // ${alert(1)}, but not ${negotiable}
    String.raw`\.\.[\/\\]\.\.[\/\\]`,
  ].join('|'),
  'i',
);

const sha256 = async (text) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export function createCtf({ onCapture }) {
  try {
    localStorage.setItem('session', SESSION);
  } catch {
    /* storage blocked: that flag just can't be found in this browser */
  }

  function capture(id) {
    if (!progress.captureFlag(id)) return false;
    onCapture?.(id);
    return true;
  }

  return {
    total: FLAGS.length,
    captured: () => FLAGS.filter((f) => progress.flags().includes(f.id)).map((f) => f.id),
    // 'ok' with the flag's id, 'again' if it was already captured, or 'wrong'
    async submit(text) {
      let guess = String(text ?? '').trim().toLowerCase();
      if (!guess.startsWith('flag{')) guess = `flag{${guess.replace(/^\{|\}$/g, '')}}`;
      const hash = await sha256(guess);
      const hit = FLAGS.find((f) => f.hash === hash);
      if (!hit) return { result: 'wrong' };
      return { result: capture(hit.id) ? 'ok' : 'again', id: hit.id };
    },
    // Every text box in town passes through here. Returns true when the text looked like an attack.
    inspect(text) {
      if (!PAYLOAD.test(String(text ?? ''))) return false;
      capture('injection');
      return true;
    },
    injectionFlag: FLAGS.find((f) => f.id === 'injection').flag,
  };
}
