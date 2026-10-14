// Small props drawn in code: the ladybugs for the bug hunt, and Halloween's pumpkins, bats and witch hat.
// Low-poly and flat-shaded so they sit happily next to the Kenney models. Sizes are in road tiles.

import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...extra });
const shadowed = (root) => {
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return root;
};

// ---------- ladybug: `body` is the part that crawls, `root` stays put ----------
export function makeBug() {
  const red = mat('#e5484d', { roughness: 0.45 });
  const black = mat('#2b2523');
  const white = mat('#ffffff');
  const r = 0.045;
  const body = new THREE.Group();

  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), red);
  shell.scale.set(1, 0.85, 1.2);
  const belly = new THREE.Mesh(new THREE.CircleGeometry(r, 10).rotateX(-Math.PI / 2), black);
  belly.scale.set(1, 1, 1.2);
  belly.position.y = 0.001;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), black);
  head.position.set(0, 0.008, 0.055);
  body.add(shell, belly, head);

  for (const x of [-0.009, 0.009]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 6, 4), white);
    eye.position.set(x, 0.017, 0.07);
    body.add(eye);
  }
  // spots sit on the shell: find its height at (x, z), then sink each one a little
  for (const [x, z, s] of [[0.021, 0.014, 0.009], [-0.021, 0.014, 0.009], [0.016, -0.028, 0.008], [-0.016, -0.028, 0.008], [0, -0.004, 0.007]]) {
    const y = Math.sqrt(Math.max(0, r * r - x * x - (z / 1.2) ** 2)) * 0.85;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 4), black);
    spot.position.set(x, y - s * 0.45, z);
    spot.scale.y = 0.6;
    body.add(spot);
  }

  const root = new THREE.Group();
  root.add(body);
  return { root: shadowed(root), body };
}

// ---------- jack-o'-lantern: one shared face texture, a face material per pumpkin so it can glow ----------
const R = 0.09;
let faceTex = null;

function pumpkinGeometry() {
  const geo = new THREE.SphereGeometry(R, 16, 10);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // eight lobes, with one facing +z where the face goes
    const lobe = 0.9 + 0.1 * Math.sqrt(Math.abs(Math.cos(Math.atan2(v.z, v.x) * 4)));
    p.setXYZ(i, v.x * lobe, v.y * 0.74, v.z * lobe);
  }
  geo.computeVertexNormals();
  return geo;
}
const pumpkinGeo = pumpkinGeometry();

function face() {
  if (faceTex) return faceTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  const tri = (pts) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  };
  tri([[52, 112], [100, 112], [80, 64]]); // eyes
  tri([[156, 112], [204, 112], [176, 64]]);
  tri([[116, 138], [140, 138], [128, 118]]); // nose
  // a toothy grin
  tri([[40, 150], [216, 150], [200, 188], [170, 176], [150, 200], [128, 180], [106, 200], [86, 176], [56, 188]]);
  faceTex = new THREE.CanvasTexture(c);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  return faceTex;
}

export function makePumpkin(size = 1) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(pumpkinGeo, mat('#f28c38', { roughness: 0.6 }));
  // the carved face: a patch of a slightly bigger sphere over the front lobe, so it follows the curve
  const faceMat = new THREE.MeshBasicMaterial({ map: face(), color: '#4a2614', alphaTest: 0.5 });
  const carved = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 16, 10, Math.PI / 2 - 0.62, 1.24, 1.0, 1.1), faceMat);
  carved.scale.y = 0.74;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.045, 6), mat('#6d7f3c'));
  stem.position.y = R * 0.74 + 0.014;
  stem.rotation.z = 0.25;
  body.add(carved, stem);
  body.position.y = R * 0.74;
  root.add(body);
  root.scale.setScalar(size);
  return { root: shadowed(root), body, faceMat, height: R * 1.48 * size };
}

// ---------- bat: wings hinge at the body and flap around the forward (+z) axis ----------
export function makeBat() {
  const m = mat('#3f3552', { roughness: 0.9, side: THREE.DoubleSide });
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), m);
  body.scale.set(0.9, 0.85, 1.25);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), m);
  head.position.set(0, 0.012, 0.034);
  root.add(body, head);
  for (const x of [-0.009, 0.009]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 4), m);
    ear.position.set(x, 0.032, 0.036);
    root.add(ear);
  }

  const s = new THREE.Shape();
  s.moveTo(0, 0.02);
  s.lineTo(0.05, 0.032);
  s.lineTo(0.11, 0.014);
  s.lineTo(0.135, -0.01);
  s.quadraticCurveTo(0.112, -0.004, 0.1, -0.03);
  s.quadraticCurveTo(0.082, -0.012, 0.066, -0.036);
  s.quadraticCurveTo(0.047, -0.014, 0.03, -0.032);
  s.quadraticCurveTo(0.016, -0.01, 0, -0.018);
  s.closePath();
  const right = new THREE.ShapeGeometry(s).rotateX(Math.PI / 2); // the shape's "up" becomes forward (+z)
  const left = right.clone().scale(-1, 1, 1);
  const wings = [left, right].map((geo, i) => {
    const hinge = new THREE.Group();
    hinge.position.set(i ? 0.012 : -0.012, 0.004, 0);
    hinge.add(new THREE.Mesh(geo, m));
    root.add(hinge);
    return hinge;
  });
  return { root: shadowed(root), wings };
}

// ---------- witch hat, in the character model's own units (it's parented to the head bone) ----------
export function makeWitchHat() {
  const cloth = mat('#4a3b66', { roughness: 0.85 });
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.024, 20), cloth);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 12), cloth);
  crown.position.y = 0.11;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.173, 0.177, 0.05, 12), mat('#f29a4a'));
  band.position.y = 0.04;
  // the tip flops over to one side
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), cloth);
  tip.position.set(0.035, 0.29, 0);
  tip.rotation.z = -0.45;
  hat.add(brim, crown, band, tip);
  return shadowed(hat);
}
