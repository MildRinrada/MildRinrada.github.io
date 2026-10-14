// QR codes for the printed CV, drawn by qrcode-generator (MIT) from the CDN the first time one is needed.

const SRC = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
let lib = null;

function load() {
  lib ??= new Promise((resolve, reject) => {
    if (window.qrcode) return resolve(window.qrcode);
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => reject(new Error('QR library unavailable'));
    document.head.append(s);
  });
  return lib;
}

// Returns an <svg> element for `text`, scalable to whatever size its container gives it.
export async function qrSvg(text) {
  const qrcode = await load();
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const doc = new DOMParser().parseFromString(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }), 'image/svg+xml');
  const svg = doc.documentElement;
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}
