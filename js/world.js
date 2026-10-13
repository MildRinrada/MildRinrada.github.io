// The 3D town: scene, models, lighting, day/night, blueprint mode and camera moves.
// UI (pins, panel, list) lives in main.js; this module only receives DOM elements to anchor in 3D.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { BASE, tiles, backdrop, greenery, lamps } from './scenery.js';

const ROOT = 'assets/models/';
const { lerp, clamp, degToRad } = THREE.MathUtils;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LAYER_COLORS = { frontend: '#33d6ff', backend: '#ffc94d', infra: '#9ee86f', data: '#ff8fb1' };
const ABOVE_GROUND = ['frontend', 'backend', 'infra'];
const BASEMENT_Y = -0.24;

const DAY = { sky: new THREE.Color('#eef6ff'), ground: new THREE.Color('#a6c79c'), hemi: 1.9, sun: new THREE.Color('#fff0d6'), sunI: 2.7 };
const NIGHT = { sky: new THREE.Color('#4a5aa0'), ground: new THREE.Color('#161b33'), hemi: 0.65, sun: new THREE.Color('#9fb6ff'), sunI: 0.55 };
const GHOST = { day: new THREE.Color('#2f6fe8'), night: new THREE.Color('#8cc2ff'), blueprint: new THREE.Color('#ffffff') };

const HOME = { target: new THREE.Vector3(0, 1.0, -0.9), zoom: 0.95 };
const VIEW_DIR = new THREE.Vector3(1, 0.92, 1.08).normalize();

export async function createWorld({ container, places, makePin, makeLayerTag, onSelect, onHover, onProgress }) {
  // WebGLRenderer throws when WebGL is unavailable; main.js catches that and falls back to the list.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.classList.add('town-canvas');
  container.append(canvas);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'labels';
  container.append(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.copy(HOME.target).addScaledVector(VIEW_DIR, 40);
  camera.lookAt(HOME.target);
  camera.zoom = HOME.zoom;

  let tween = null; // active camera flight, see flyTo()
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.7;
  controls.maxZoom = 3.4;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.2;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.3;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    tween = null;
  });

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.position.set(9, 13, 4);
  sun.target.position.set(0, 0, -0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);

  // ---------- loading ----------
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress?.(loaded / total);
  const gltfLoader = new GLTFLoader(manager);
  const cache = new Map();
  const load = (file) => {
    if (!cache.has(file)) cache.set(file, gltfLoader.loadAsync(ROOT + file));
    return cache.get(file);
  };

  const glowMats = [];
  const masks = new Map();
  const glowMask = (pack) => {
    if (!masks.has(pack)) masks.set(pack, makeGlowMask(`${ROOT}${pack}/Textures/colormap.png`));
    return masks.get(pack);
  };

  async function instance(file, { scale = 1, glow = 0 } = {}) {
    let gltf;
    try {
      gltf = await load(file);
    } catch (err) {
      console.warn(`Could not load ${file}`, err);
      return new THREE.Group();
    }
    const obj = gltf.scene.clone(true);
    obj.scale.setScalar(scale);
    const mask = glow > 0 ? await glowMask(file.split('/')[0]) : null;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (mask) {
        o.material = o.material.clone();
        o.material.emissiveMap = mask;
        o.material.emissive = new THREE.Color(0xffffff);
        o.material.emissiveIntensity = 0;
        glowMats.push({ material: o.material, k: glow });
      }
    });
    return obj;
  }

  async function placeAt(spec, parent = scene, y = 0) {
    const obj = await instance(spec.file, { scale: spec.scale ?? 1, glow: spec.glow ?? 0 });
    obj.position.set(spec.pos[0], y, spec.pos[1]);
    obj.rotation.y = degToRad(spec.rot ?? 0);
    parent.add(obj);
    return obj;
  }

  // ---------- ground: a three-layer diorama slab ----------
  const W = BASE.maxX - BASE.minX;
  const D = BASE.maxZ - BASE.minZ;
  const cx = (BASE.minX + BASE.maxX) / 2;
  const cz = (BASE.minZ + BASE.maxZ) / 2;
  const slab = (w, h, d, y, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    m.position.set(cx, y, cz);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  slab(W, 0.12, D, -0.06, '#7cc97e');
  slab(W - 0.04, 0.4, D - 0.04, -0.32, '#8b6a50');
  slab(W - 0.3, 0.26, D - 0.3, -0.65, '#5b6278');

  // ---------- scenery ----------
  const jobs = [];
  for (const t of tiles) jobs.push(placeAt(t));
  for (const b of backdrop) jobs.push(placeAt(b, scene, 0.02));
  for (const g of greenery) jobs.push(placeAt(g, scene, g.pos[1] < -0.5 ? 0.02 : 0));

  const lampLights = [];
  const lampGlows = [];
  const glowTex = makeGlowSprite();
  for (const l of lamps) {
    jobs.push(
      placeAt(l).then((obj) => {
        const head = new THREE.Vector3(...l.head);
        const light = new THREE.PointLight('#ffcf8a', 0, 2.8, 1.6);
        light.position.copy(head);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd59a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.setScalar(0.5);
        glow.position.copy(head);
        glow.userData.noBlueprint = true;
        obj.add(light, glow);
        lampLights.push(light);
        lampGlows.push(glow);
      }),
    );
  }

  // ---------- featured places ----------
  const entries = new Map();
  const pickables = [];
  const ghostMat = new LineMaterial({ color: GHOST.day, linewidth: 1.6, dashed: true, dashSize: 0.09, gapSize: 0.06, transparent: true, opacity: 0.95 });
  const packetGeo = new THREE.SphereGeometry(0.045, 12, 8);
  const packetMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  async function buildPlace(p) {
    const group = new THREE.Group();
    group.position.set(p.at.pos[0], 0.02, p.at.pos[1]);
    group.rotation.y = degToRad(p.at.rot ?? 0);
    group.userData.placeId = p.id;
    scene.add(group);
    const entry = { place: p, group, hover: 0, top: 1 };
    entries.set(p.id, entry);

    if (p.model) {
      const model = await instance(p.model.file, { scale: p.model.scale ?? 1, glow: p.status === 'live' ? (p.glow ?? 1) : 0 });
      const box = new THREE.Box3().setFromObject(model);
      group.add(model);
      entry.top = box.max.y;
      await Promise.all(
        (p.props ?? []).map(async (pr) => {
          const prop = await instance(pr.file, { scale: pr.scale ?? 1 });
          prop.position.set(pr.at[0], (pr.roof ? box.max.y : 0) + pr.at[1], pr.at[2]);
          prop.rotation.y = degToRad(pr.rot ?? 0);
          const h = new THREE.Box3().setFromObject(prop).getSize(new THREE.Vector3()).y;
          entry.top = Math.max(entry.top, prop.position.y + h);
          group.add(prop);
        }),
      );
      if (p.layers?.length) buildLayers(entry, box, p.layers);
    }
    if (p.lot) await buildLot(entry, p.lot);

    group.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.featured = true;
      if (!o.userData.noPick) pickables.push(o);
    });

    const pin = new CSS2DObject(makePin(p));
    pin.center.set(0.5, 1);
    pin.position.set(0, entry.top + 0.18, 0);
    group.add(pin);
  }

  // Stack slabs shown in blueprint mode: frontend on top, backend in the middle, infra at the
  // bottom, database in the basement under the street. Packets travel between them.
  function buildLayers(entry, box, layers) {
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const w = size.x * 0.9;
    const d = size.z * 0.9;
    const g = new THREE.Group();
    g.visible = false;
    entry.group.add(g);
    entry.layerGroup = g;

    const above = layers.filter((l) => l.kind !== 'data').sort((a, b) => ABOVE_GROUND.indexOf(a.kind) - ABOVE_GROUND.indexOf(b.kind));
    const below = layers.filter((l) => l.kind === 'data');
    // Tags point away from the town centre so neighbouring buildings don't collide.
    const left = entry.group.position.x < -0.5;
    const ys = [];
    const addSlab = (layer, y) => {
      const color = new THREE.Color(LAYER_COLORS[layer.kind]);
      const geo = new THREE.BoxGeometry(w, 0.05, d);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
      mesh.position.set(c.x, y, c.z);
      mesh.userData.noBlueprint = mesh.userData.noPick = true;
      mesh.add(fatEdges(geo, new LineMaterial({ color, linewidth: 2, transparent: true, opacity: 1 })));
      g.add(mesh);
      const tag = new CSS2DObject(makeLayerTag(layer));
      tag.element.classList.toggle('layer-tag-left', left);
      tag.center.set(left ? 1 : 0, 0.5);
      tag.position.set(left ? c.x - w / 2 : c.x + w / 2, y, left ? c.z + d / 2 : c.z - d / 2);
      g.add(tag);
      ys.push(y);
    };
    const n = above.length;
    above.forEach((l, i) => addSlab(l, n === 1 ? size.y * 0.6 : size.y * (0.86 - i * (0.66 / (n - 1)))));
    below.forEach((l) => addSlab(l, BASEMENT_Y));

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spineGeo = new LineSegmentsGeometry().setPositions([c.x, minY, c.z, c.x, maxY, c.z]);
    const spine = new LineSegments2(spineGeo, new LineMaterial({ color: '#ffffff', linewidth: 1.5, dashed: true, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.85 }));
    spine.computeLineDistances();
    spine.userData.noBlueprint = spine.userData.noPick = true;
    g.add(spine);
    entry.packets = [0, 0.33, 0.66].map((phase) => {
      const m = new THREE.Mesh(packetGeo, packetMat);
      m.userData.noBlueprint = m.userData.noPick = true;
      m.userData.phase = phase;
      m.position.set(c.x, maxY, c.z);
      g.add(m);
      return m;
    });
    entry.spine = { minY, maxY };
  }

  // An empty lot: a dirt patch, a construction fence, and a dashed outline of the building to come.
  async function buildLot(entry, lot) {
    const [w, d] = lot.size;
    const [gw, gh, gd] = lot.ghost;
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), new THREE.MeshStandardMaterial({ color: '#d9b68c', roughness: 1 }));
    dirt.position.y = 0.0125;
    dirt.receiveShadow = true;
    entry.group.add(dirt);

    const y0 = 0.03;
    const shell = new THREE.BoxGeometry(gw, gh, gd);
    shell.translate(0, gh / 2 + y0, 0);
    entry.group.add(fatEdges(shell, ghostMat, { dashed: true }));
    const floors = [];
    for (let y = 0.5; y < gh - 0.15; y += 0.5) {
      const [x0, x1, z0, z1] = [-gw / 2, gw / 2, -gd / 2, gd / 2];
      const yy = y + y0;
      floors.push(x0, yy, z0, x1, yy, z0, x1, yy, z0, x1, yy, z1, x1, yy, z1, x0, yy, z1, x0, yy, z1, x0, yy, z0);
    }
    const floorLines = new LineSegments2(new LineSegmentsGeometry().setPositions(floors), ghostMat);
    floorLines.computeLineDistances();
    floorLines.userData.noBlueprint = floorLines.userData.noPick = true;
    entry.group.add(floorLines);

    const hit = new THREE.Mesh(shell, new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.noBlueprint = true;
    entry.group.add(hit);

    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(gw, gd),
      new THREE.MeshBasicMaterial({ color: '#4f9bff', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    );
    scan.rotation.x = -Math.PI / 2;
    scan.userData.noBlueprint = scan.userData.noPick = true;
    entry.group.add(scan);
    entry.scan = { mesh: scan, y0, h: gh };
    entry.top = gh + y0;

    const site = [];
    const fz = d / 2 - 0.06;
    for (let x = -w / 2 + 0.2; x <= w / 2 - 0.18; x += 0.38) site.push({ file: 'roads/construction-fence.glb', pos: [x, fz], rot: 90 });
    site.push(
      { file: 'roads/construction-cone.glb', pos: [-w / 2 + 0.12, fz + 0.16], scale: 1.4 },
      { file: 'roads/construction-cone.glb', pos: [w / 2 - 0.1, fz + 0.18], scale: 1.4 },
      { file: 'roads/construction-light.glb', pos: [-w / 2 + 0.08, -d / 2 + 0.1] },
      { file: 'roads/construction-light.glb', pos: [w / 2 - 0.08, -d / 2 + 0.1] },
    );
    await Promise.all(site.map((s) => placeAt(s, entry.group, 0.025)));
  }

  for (const p of places) jobs.push(buildPlace(p));
  await Promise.all(jobs);

  // ---------- blueprint mode ----------
  const bp = {
    fill: new THREE.MeshBasicMaterial({ color: '#6fb1ff', transparent: true, opacity: 0.05, depthWrite: false }),
    fillFeatured: new THREE.MeshBasicMaterial({ color: '#8cc6ff', transparent: true, opacity: 0.12, depthWrite: false }),
    line: new LineMaterial({ color: '#cfe6ff', linewidth: 1, transparent: true, opacity: 0.42 }),
    lineFeatured: new LineMaterial({ color: '#ffffff', linewidth: 1.6, transparent: true, opacity: 0.95 }),
  };
  let blueprint = false;

  function setBlueprint(on) {
    blueprint = on;
    const meshes = [];
    scene.traverse((o) => {
      if (o.isMesh && !o.userData.noBlueprint) meshes.push(o);
    });
    for (const m of meshes) {
      if (!m.userData.origMat) m.userData.origMat = m.material;
      if (on && !m.userData.edges) {
        m.userData.edges = fatEdges(m.geometry, m.userData.featured ? bp.lineFeatured : bp.line, { threshold: 30 });
        m.add(m.userData.edges);
      }
      m.material = on ? (m.userData.featured ? bp.fillFeatured : bp.fill) : m.userData.origMat;
      if (m.userData.edges) m.userData.edges.visible = on;
    }
    for (const e of entries.values()) if (e.layerGroup) e.layerGroup.visible = on;
    for (const g of lampGlows) g.visible = !on;
    sun.castShadow = !on;
    updateGhost();
  }

  // ---------- day / night ----------
  let night = 0;
  let nightTarget = 0;
  function applyNight(n) {
    hemi.color.lerpColors(DAY.sky, NIGHT.sky, n);
    hemi.groundColor.lerpColors(DAY.ground, NIGHT.ground, n);
    hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, n);
    sun.color.lerpColors(DAY.sun, NIGHT.sun, n);
    sun.intensity = lerp(DAY.sunI, NIGHT.sunI, n);
    for (const l of lampLights) l.intensity = n * 3.5;
    for (const g of lampGlows) g.material.opacity = n * 0.9;
    for (const g of glowMats) g.material.emissiveIntensity = n * g.k * 1.7;
    updateGhost();
  }
  function updateGhost() {
    if (blueprint) ghostMat.color.copy(GHOST.blueprint);
    else ghostMat.color.lerpColors(GHOST.day, GHOST.night, night);
  }

  // ---------- picking & hover ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  let selected = null;
  let pendingPointer = null;
  let down = null;

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let o = raycaster.intersectObjects(pickables, false)[0]?.object;
    while (o && !o.userData.placeId) o = o.parent;
    return o?.userData.placeId ?? null;
  }
  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    canvas.style.cursor = id ? 'pointer' : '';
    onHover?.(id);
  }
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved < 6) onSelect?.(pick(e));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !down) pendingPointer = { clientX: e.clientX, clientY: e.clientY };
  });
  canvas.addEventListener('pointerleave', () => setHover(null));

  // ---------- camera moves ----------
  function flyTo(target, zoom) {
    controls.autoRotate = false;
    tween = { t0: performance.now(), dur: reduceMotion ? 1 : 950, fromT: controls.target.clone(), toT: target.clone(), fromZ: camera.zoom, toZ: zoom };
  }
  // Shift the focus point so the building sits in the part of the screen the panel leaves free.
  function offsetForInset(t, zoom, inset) {
    const wpp = (camera.top - camera.bottom) / zoom / Math.max(1, canvas.clientHeight);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    return t.addScaledVector(right, ((inset.right ?? 0) / 2) * wpp).addScaledVector(up, -((inset.bottom ?? 0) / 2) * wpp);
  }
  function focus(id, inset = {}) {
    const e = entries.get(id);
    if (!e) return;
    selected = id;
    const box = new THREE.Box3().setFromObject(e.group);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    // Fit the building into the part of the screen the panel leaves free.
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    const freeH = ((camera.top - camera.bottom) * (ch - (inset.bottom ?? 0))) / ch;
    const freeW = ((camera.right - camera.left) * (cw - (inset.right ?? 0))) / cw;
    const zoom = clamp(Math.min(freeH / (s.y + 1.4), freeW / (Math.max(s.x, s.z) * 1.6 + 1)), 0.9, 2.0);
    c.y = clamp(c.y, 0.5, 2.4);
    flyTo(offsetForInset(c, zoom, inset), zoom);
  }
  function home() {
    selected = null;
    flyTo(HOME.target, HOME.zoom);
  }

  // ---------- sizing ----------
  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const aspect = w / h;
    const viewH = Math.max(8.6, 11.2 / aspect);
    Object.assign(camera, { left: (-viewH * aspect) / 2, right: (viewH * aspect) / 2, top: viewH / 2, bottom: -viewH / 2 });
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- frame loop ----------
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const lim = { minX: BASE.minX - 2, maxX: BASE.maxX + 2, minZ: BASE.minZ - 2, maxZ: BASE.maxZ + 2 };
  let frames = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (pendingPointer) {
      setHover(pick(pendingPointer));
      pendingPointer = null;
    }
    if (night !== nightTarget) {
      const step = reduceMotion ? 1 : dt / 0.9;
      night = nightTarget > night ? Math.min(nightTarget, night + step) : Math.max(nightTarget, night - step);
      applyNight(night);
    }
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = easeOut(k);
      tmp.lerpVectors(tween.fromT, tween.toT, e);
      camera.position.add(tmp.clone().sub(controls.target));
      controls.target.copy(tmp);
      camera.zoom = lerp(tween.fromZ, tween.toZ, e);
      camera.updateProjectionMatrix();
      if (k === 1) tween = null;
    }
    controls.update();

    const tg = controls.target;
    const fixed = tmp.set(clamp(tg.x, lim.minX, lim.maxX), clamp(tg.y, -0.5, 3.5), clamp(tg.z, lim.minZ, lim.maxZ)).sub(tg);
    if (fixed.lengthSq() > 0) {
      tg.add(fixed);
      camera.position.add(fixed);
    }

    for (const e of entries.values()) {
      const want = e.place.id === hovered || e.place.id === selected ? 1 : 0;
      e.hover = lerp(e.hover, want, 1 - Math.pow(0.0005, dt));
      e.group.scale.setScalar(1 + e.hover * 0.035);
      if (e.scan) e.scan.mesh.position.y = e.scan.y0 + ((t * 0.22) % 1) * e.scan.h;
      if (blueprint && e.packets) {
        const { minY, maxY } = e.spine;
        for (const m of e.packets) {
          const u = (t * 0.32 + m.userData.phase) % 1;
          m.position.y = maxY - (maxY - minY) * (u < 0.5 ? u * 2 : 2 - u * 2);
        }
      }
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    if (++frames === 3) document.documentElement.dataset.townReady = 'true';
  });

  return {
    focus,
    home,
    setHover,
    resize,
    setBlueprint,
    setNight(on, instant = false) {
      nightTarget = on ? 1 : 0;
      if (instant) {
        night = nightTarget;
        applyNight(night);
      }
    },
    stopIntroSpin() {
      controls.autoRotate = false;
    },
  };
}

// Fat-line edges for a geometry. Thin GL lines vanish on high-DPI screens, so blueprint lines use Line2.
function fatEdges(geometry, material, { threshold = 1, dashed = false } = {}) {
  const edges = new THREE.EdgesGeometry(geometry, threshold);
  const lines = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(edges), material);
  if (dashed) lines.computeLineDistances();
  // LineSegments2 is a Mesh subclass, so keep it out of blueprint swaps and picking.
  lines.userData.noBlueprint = lines.userData.noPick = true;
  return lines;
}

// Kenney models share one colour atlas. Windows use the blue swatches, so an emissive map that keeps
// only those pixels (tinted warm) makes windows light up at night without touching walls or roofs.
async function makeGlowMask(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const [r, gr, b] = [p[i], p[i + 1], p[i + 2]];
    const isWindow = b > r + 40 && gr >= r - 8 && b > 150;
    p[i] = isWindow ? 255 : 0;
    p[i + 1] = isWindow ? 200 : 0;
    p[i + 2] = isWindow ? 118 : 0;
    p[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
