// The 3D town: scene, models, lighting, day/night, weather, blueprint mode, walkers and camera moves.
// UI (pins, panel, list, terminal) lives in main.js; this module only receives DOM elements to anchor in 3D.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { BASE, tiles, backdrop, greenery, lamps, walkLoop, catZone } from './scenery.js';

const ROOT = 'assets/models/';
const { lerp, clamp, degToRad } = THREE.MathUtils;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LAYER_COLORS = { frontend: '#33d6ff', backend: '#ffc94d', infra: '#9ee86f', data: '#ff8fb1' };
const ABOVE_GROUND = ['frontend', 'backend', 'infra'];
const BASEMENT_Y = -0.24;

const DAY = { sky: new THREE.Color('#eef6ff'), ground: new THREE.Color('#a6c79c'), hemi: 1.9, sun: new THREE.Color('#fff0d6'), sunI: 2.7 };
const NIGHT = { sky: new THREE.Color('#4a5aa0'), ground: new THREE.Color('#161b33'), hemi: 0.65, sun: new THREE.Color('#9fb6ff'), sunI: 0.55 };
const GHOST = { day: new THREE.Color('#2f6fe8'), night: new THREE.Color('#8cc2ff'), blueprint: new THREE.Color('#ffffff') };
const WEATHER_DIM = { clear: 1, cloudy: 0.8, rain: 0.62, storm: 0.5 };
const FIREWORK_COLORS = ['#ff6b4a', '#ffd166', '#33d6ff', '#9ee86f', '#ff8fb1', '#c49bff', '#ffffff'];

const VIEW_DIR = new THREE.Vector3(1, 0.92, 1.08).normalize();
const CHARACTER_HEIGHT = 0.3;

export async function createWorld({ container, places, avatar, avatarLabel, makePin, makeLayerTag, onSelect, onHover, onProgress, onFlash }) {
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
  const HOME = { target: new THREE.Vector3(0, 0.8, 0.4), zoom: 0.8 };
  camera.position.copy(HOME.target).addScaledVector(VIEW_DIR, 40);
  camera.lookAt(HOME.target);

  let tween = null; // active camera flight, see flyTo()
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.5;
  controls.maxZoom = 3.4;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.2;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.25;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    tween = null;
  });

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi);
  const sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
  sun.position.set(10, 14, 5);
  sun.target.position.set(0, 0, 0.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 });
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
  const onPavement = (z) => (z > -2.5 && z < -0.5) || (z > 0.5 && z < 2.5);
  for (const t of tiles) jobs.push(placeAt(t));
  for (const b of backdrop) jobs.push(placeAt(b, scene, 0.02));
  for (const g of greenery) jobs.push(placeAt(g, scene, onPavement(g.pos[1]) ? 0.02 : 0));

  const lampLights = [];
  const lampGlows = [];
  const glowTex = makeGlowSprite();
  for (const l of lamps) {
    jobs.push(
      placeAt(l).then((obj) => {
        const head = new THREE.Vector3(...l.head);
        if (l.light) {
          const light = new THREE.PointLight('#ffcf8a', 0, 2.8, 1.6);
          light.position.copy(head);
          obj.add(light);
          lampLights.push(light);
        }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd59a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.setScalar(0.5);
        glow.position.copy(head);
        glow.userData.noBlueprint = true;
        obj.add(glow);
        lampGlows.push(glow);
      }),
    );
  }

  // ---------- featured places ----------
  const entries = new Map();
  const pickables = [];
  const ghostMat = new LineMaterial({ color: GHOST.day, linewidth: 1.6, dashed: true, dashSize: 0.09, gapSize: 0.06, transparent: true, opacity: 0.95 });
  const scaffoldMat = new LineMaterial({ color: '#f0a43a', linewidth: 2.2 });
  const packetGeo = new THREE.SphereGeometry(0.045, 12, 8);
  const packetMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  async function buildPlace(p) {
    const group = new THREE.Group();
    group.position.set(p.at.pos[0], 0.02, p.at.pos[1]);
    group.rotation.y = degToRad(p.at.rot ?? 0);
    group.userData.placeId = p.id;
    scene.add(group);
    const entry = { place: p, group, hover: 0, top: 1, tags: [] };
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
      if (p.status === 'building') await buildScaffold(entry, box);
    }
    if (p.lot) await buildLot(entry, p.lot);

    group.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.featured = true;
      if (!o.userData.noPick) pickables.push(o);
    });

    const pin = new CSS2DObject(makePin(p));
    pin.center.set(0.5, 1);
    pin.position.set(0, entry.top + 0.14, 0);
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
      tag.visible = false;
      g.add(tag);
      entry.tags.push(tag);
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

  // Projects still in development wear scaffolding on the two faces the camera sees.
  async function buildScaffold(entry, box) {
    const pad = 0.05;
    const [x0, x1, z0, z1] = [box.min.x - pad, box.max.x + pad, box.min.z - pad, box.max.z + pad];
    const h = box.max.y * 0.94;
    const pts = [];
    for (const x of [x0, (x0 + x1) / 2, x1]) pts.push(x, 0, z1, x, h, z1);
    for (const z of [z0, (z0 + z1) / 2]) pts.push(x1, 0, z, x1, h, z);
    for (let y = 0.26; y <= h; y += 0.26) pts.push(x0, y, z1, x1, y, z1, x1, y, z1, x1, y, z0);
    const lines = new LineSegments2(new LineSegmentsGeometry().setPositions(pts), scaffoldMat);
    lines.userData.noBlueprint = lines.userData.noPick = true;
    entry.group.add(lines);
    await Promise.all([
      placeAt({ file: 'roads/construction-cone.glb', pos: [x0 + 0.06, z1 + 0.14], scale: 1.4 }, entry.group, 0.005),
      placeAt({ file: 'roads/construction-cone.glb', pos: [x1 + 0.12, z1 + 0.1], scale: 1.4 }, entry.group, 0.005),
    ]);
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
      const [a0, a1, b0, b1] = [-gw / 2, gw / 2, -gd / 2, gd / 2];
      const yy = y + y0;
      floors.push(a0, yy, b0, a1, yy, b0, a1, yy, b0, a1, yy, b1, a1, yy, b1, a0, yy, b1, a0, yy, b1, a0, yy, b0);
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

  // ---------- walkers: you, a dog that follows you, and a cat ----------
  async function makeActor(file, height) {
    const gltf = await load(file);
    const model = SkeletonUtils.clone(gltf.scene);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false; // skinned meshes move outside their bind-pose bounds
      o.userData.noBlueprint = true;
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const s = height / Math.max(0.001, box.max.y - box.min.y);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
    return { model, mixer, actions, current: null };
  }

  function play(actor, name, { once = false, fade = 0.22 } = {}) {
    const next = actor.actions[name];
    if (!next || (actor.current === next && !once)) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (actor.current && actor.current !== next) next.crossFadeFrom(actor.current, fade, false);
    next.play();
    actor.current = next;
  }

  function makeRoot(id, hit, label) {
    const root = new THREE.Group();
    root.userData.placeId = id;
    const box = new THREE.Mesh(new THREE.BoxGeometry(hit[0], hit[1], hit[2]).translate(0, hit[1] / 2, 0), new THREE.MeshBasicMaterial({ visible: false }));
    box.userData.noBlueprint = true;
    root.add(box);
    pickables.push(box);
    if (label) {
      const el = document.createElement('div');
      el.className = label.className;
      el.textContent = label.text;
      const tag = new CSS2DObject(el);
      tag.center.set(0.5, 1);
      tag.position.set(0, hit[1] + 0.06, 0);
      root.add(tag);
      root.userData.tag = tag;
    }
    scene.add(root);
    return root;
  }

  // the route: a closed loop of straight segments
  const route = walkLoop.map(([x, z]) => new THREE.Vector3(x, 0.02, z));
  const segs = route.map((a, i) => ({ a, b: route[(i + 1) % route.length], len: a.distanceTo(route[(i + 1) % route.length]) }));
  const loopLen = segs.reduce((s, x) => s + x.len, 0);
  const pointAt = (d, out) => {
    let rest = ((d % loopLen) + loopLen) % loopLen;
    for (const s of segs) {
      if (rest <= s.len) {
        out.lerpVectors(s.a, s.b, rest / s.len);
        return s;
      }
      rest -= s.len;
    }
    return segs[0];
  };
  // places along the first segment where the walker may stop and look at a building
  const stops = places.filter((p) => p.kind !== 'lot' && p.at.pos[1] > 0.5).map((p) => p.at.pos[0] - route[0].x);

  let walker = null;
  let dog = null;
  let cat = null;
  const bubble = (root, text) => {
    const tag = root.userData.tag;
    if (!tag) return;
    tag.element.textContent = text;
    tag.element.classList.add('show');
    clearTimeout(root.userData.bubbleTimer);
    root.userData.bubbleTimer = setTimeout(() => tag.element.classList.remove('show'), 2400);
  };

  jobs.push(
    (async () => {
      const actor = await makeActor(avatar, CHARACTER_HEIGHT);
      const root = makeRoot('about', [0.26, CHARACTER_HEIGHT + 0.04, 0.26], { className: 'walker-tag', text: avatarLabel });
      root.add(actor.model);
      walker = { actor, root, dist: rand(0, loopLen), yaw: 0, targetYaw: 0, state: 'walk', timer: 0, held: false };
      pointAt(walker.dist, root.position);
      play(actor, 'walk');
    })(),
    (async () => {
      const actor = await makeActor('pets/animal-dog.glb', 0.16);
      const root = makeRoot('pet:dog', [0.24, 0.2, 0.24], { className: 'pet-bubble', text: '' });
      root.add(actor.model);
      dog = { actor, root, yaw: 0, react: 0 };
      play(actor, 'idle');
    })(),
    (async () => {
      const actor = await makeActor('pets/animal-cat.glb', 0.14);
      const root = makeRoot('pet:cat', [0.22, 0.18, 0.22], { className: 'pet-bubble', text: '' });
      root.add(actor.model);
      root.position.set(rand(catZone.minX, catZone.maxX), 0.02, catZone.minZ);
      cat = { actor, root, yaw: 0, target: null, timer: rand(1, 3), react: 0 };
      play(actor, 'idle');
    })(),
  );

  await Promise.all(jobs);
  if (walker && dog) dog.root.position.copy(walker.root.position).add(new THREE.Vector3(-0.3, 0, 0));

  const turn = (cur, want, dt, speed = 8) => {
    const delta = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    return cur + delta * Math.min(1, dt * speed);
  };

  function updateWalker(dt) {
    const w = walker;
    if (!w) return;
    w.actor.mixer.update(dt);
    if (w.held) {
      const toCam = camera.position.clone().sub(w.root.position);
      w.targetYaw = Math.atan2(toCam.x, toCam.z);
    } else if (w.state === 'pause' || w.state === 'wave') {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.state = 'walk';
        play(w.actor, 'walk');
      }
    } else {
      const before = w.dist % loopLen;
      w.dist += 0.32 * dt;
      const now = w.dist % loopLen;
      const seg = pointAt(w.dist, w.root.position);
      w.targetYaw = Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
      for (const s of stops) {
        if (before < s && now >= s && Math.random() < 0.5) {
          w.state = 'pause';
          w.timer = 2.6;
          w.targetYaw = Math.PI; // face the building across the pavement
          play(w.actor, 'idle');
        }
      }
    }
    w.yaw = turn(w.yaw, w.targetYaw, dt);
    w.root.rotation.y = w.yaw;
  }

  // The dog trots after you, a little behind and to the side, and sits when you stop.
  function updateDog(dt) {
    if (!dog || !walker) return;
    dog.actor.mixer.update(dt);
    if (dog.react > 0) {
      dog.react -= dt;
      if (dog.react <= 0) play(dog.actor, 'idle');
      return;
    }
    const wy = walker.yaw;
    const goal = walker.root.position.clone().add(new THREE.Vector3(-Math.sin(wy) * 0.32 + Math.cos(wy) * 0.14, 0, -Math.cos(wy) * 0.32 - Math.sin(wy) * 0.14));
    const to = goal.sub(dog.root.position);
    to.y = 0;
    const dist = to.length();
    if (dist > 0.05) {
      const speed = Math.min(0.62, dist * 2.4);
      dog.root.position.addScaledVector(to.normalize(), Math.min(dist, speed * dt));
      dog.yaw = turn(dog.yaw, Math.atan2(to.x, to.z), dt, 10);
      play(dog.actor, speed > 0.5 ? 'run' : 'walk');
    } else {
      dog.yaw = turn(dog.yaw, wy, dt, 4);
      play(dog.actor, 'idle');
    }
    dog.root.rotation.y = dog.yaw;
  }

  // The cat potters around in front of the clinic, with long pauses.
  function updateCat(dt) {
    if (!cat) return;
    cat.actor.mixer.update(dt);
    if (cat.react > 0) {
      cat.react -= dt;
      if (cat.react <= 0) play(cat.actor, 'idle');
      return;
    }
    if (!cat.target) {
      cat.timer -= dt;
      if (cat.timer <= 0) {
        cat.target = new THREE.Vector3(rand(catZone.minX, catZone.maxX), 0.02, rand(catZone.minZ, catZone.maxZ));
        play(cat.actor, 'walk');
      }
    } else {
      const to = cat.target.clone().sub(cat.root.position);
      const dist = to.length();
      if (dist < 0.03) {
        cat.target = null;
        cat.timer = rand(2.5, 6);
        play(cat.actor, Math.random() < 0.3 ? 'eat' : 'idle');
      } else {
        cat.root.position.addScaledVector(to.normalize(), Math.min(dist, 0.16 * dt));
        cat.yaw = turn(cat.yaw, Math.atan2(to.x, to.z), dt, 8);
      }
    }
    cat.root.rotation.y = cat.yaw;
  }

  function petReact(id) {
    if (id === 'pet:cat' && cat) {
      cat.react = 2.8;
      cat.target = null;
      play(cat.actor, 'dance');
      bubble(cat.root, 'Meow ♪');
    }
    if (id === 'pet:dog' && dog) {
      dog.react = 2.4;
      play(dog.actor, 'gesture-positive');
      bubble(dog.root, 'Woof!');
    }
  }

  async function setAvatar(file) {
    if (!walker) return;
    const next = await makeActor(file, CHARACTER_HEIGHT);
    walker.actor.mixer.stopAllAction();
    walker.root.remove(walker.actor.model);
    walker.root.add(next.model);
    walker.actor = next;
    play(next, walker.state === 'walk' && !walker.held ? 'walk' : 'idle');
  }

  // ---------- job-match highlight: a pulsing ring under each matching building ----------
  const ringGeo = new THREE.RingGeometry(0.84, 1, 64);
  function setHighlight(scores) {
    for (const e of entries.values()) {
      const v = scores?.get(e.place.id) ?? 0;
      e.highlightTarget = v;
      if (v > 0 && !e.ring) {
        const box = new THREE.Box3().setFromObject(e.group);
        const size = box.getSize(new THREE.Vector3());
        const centre = e.group.worldToLocal(box.getCenter(new THREE.Vector3()));
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(centre.x, 0.04, centre.z);
        ring.userData.radius = Math.max(size.x, size.z) * 0.6 + 0.14;
        ring.scale.setScalar(ring.userData.radius);
        ring.userData.noBlueprint = ring.userData.noPick = true;
        e.group.add(ring);
        e.ring = ring;
      }
    }
  }

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
    rain.visible = !on && (weather === 'rain' || weather === 'storm');
    updateGhost();
  }

  // ---------- light: night × weather × lightning ----------
  let night = 0;
  let nightTarget = 0;
  let weather = 'clear';
  let dim = 1;
  let flash = 0;
  let flashTimer = 4;
  function applyLights() {
    const f = flash * 3;
    hemi.color.lerpColors(DAY.sky, NIGHT.sky, night);
    hemi.groundColor.lerpColors(DAY.ground, NIGHT.ground, night);
    hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, night) * dim + f;
    sun.color.lerpColors(DAY.sun, NIGHT.sun, night);
    sun.intensity = lerp(DAY.sunI, NIGHT.sunI, night) * dim * dim;
    const dusk = Math.max(night, (1 - dim) * 0.9); // lamps come on in heavy rain too
    for (const l of lampLights) l.intensity = dusk * 3.5;
    for (const g of lampGlows) g.material.opacity = dusk * 0.9;
    for (const g of glowMats) g.material.emissiveIntensity = Math.max(night, (1 - dim) * 0.7) * g.k * 1.7;
    updateGhost();
  }
  function updateGhost() {
    if (blueprint) ghostMat.color.copy(GHOST.blueprint);
    else ghostMat.color.lerpColors(GHOST.day, GHOST.night, night);
  }

  // rain: short streaks falling through the whole diorama
  const RAIN = 1400;
  const rainPos = new Float32Array(RAIN * 6);
  const rainSpeed = new Float32Array(RAIN);
  const seedDrop = (i, y = rand(0, 7)) => {
    const x = rand(BASE.minX, BASE.maxX);
    const z = rand(BASE.minZ, BASE.maxZ);
    rainPos.set([x, y, z, x + 0.025, y + 0.2, z + 0.02], i * 6);
    rainSpeed[i] = rand(5.5, 7.5);
  };
  for (let i = 0; i < RAIN; i++) seedDrop(i);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#c3d9ff', transparent: true, opacity: 0.55, depthWrite: false }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  function setWeather(kind) {
    weather = WEATHER_DIM[kind] ? kind : 'clear';
    rain.visible = !blueprint && (weather === 'rain' || weather === 'storm');
    flashTimer = rand(1.5, 3);
  }

  // fireworks: a rocket rises, then bursts into a ball of sparks
  const fireworks = [];
  const fireQueue = [];
  function launchFireworks(count = 8) {
    const now = performance.now();
    for (let i = 0; i < count; i++) fireQueue.push(now + i * 380 + rand(0, 220));
  }
  function spawnFirework() {
    const n = 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const vel = [];
    const c1 = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const c2 = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const start = new THREE.Vector3(rand(-4.5, 4.5), 0.3, rand(-3, 0.5));
    const peak = start.clone().setY(rand(3.2, 4.6));
    for (let i = 0; i < n; i++) {
      pos.set([start.x, start.y, start.z], i * 3);
      const c = i % 2 ? c1 : c2;
      col.set([c.r, c.g, c.b], i * 3);
      const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(1.1, 2.1));
      vel.push(v);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 7 * renderer.getPixelRatio(), sizeAttenuation: false, map: glowTex, vertexColors: true, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    fireworks.push({ pts, vel, start, peak, t: 0, burst: false, life: 1.8 });
  }
  function updateFireworks(dt) {
    while (fireQueue.length && fireQueue[0] <= performance.now()) {
      fireQueue.shift();
      spawnFirework();
    }
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const fw = fireworks[i];
      const pos = fw.pts.geometry.attributes.position;
      fw.t += dt;
      if (!fw.burst) {
        const k = Math.min(1, fw.t / 0.65);
        const y = lerp(fw.start.y, fw.peak.y, easeOut(k));
        for (let j = 0; j < pos.count; j++) pos.setXYZ(j, fw.start.x, y, fw.start.z);
        fw.pts.material.size = 4 * renderer.getPixelRatio();
        if (k === 1) {
          fw.burst = true;
          fw.pts.material.size = 7 * renderer.getPixelRatio();
        }
      } else {
        fw.life -= dt;
        for (let j = 0; j < pos.count; j++) {
          const v = fw.vel[j];
          v.y -= 1.4 * dt;
          v.multiplyScalar(1 - 1.1 * dt);
          pos.setXYZ(j, pos.getX(j) + v.x * dt, pos.getY(j) + v.y * dt, pos.getZ(j) + v.z * dt);
        }
        fw.pts.material.opacity = clamp(fw.life / 1.1, 0, 1);
        if (fw.life <= 0) {
          scene.remove(fw.pts);
          fw.pts.geometry.dispose();
          fw.pts.material.dispose();
          fireworks.splice(i, 1);
        }
      }
      pos.needsUpdate = true;
    }
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
    if (moved >= 6) return;
    const id = pick(e);
    if (id?.startsWith('pet:')) petReact(id);
    else onSelect?.(id);
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
  const axes = () => ({
    right: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
    up: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
  });
  // Shift the focus point so the subject sits in the part of the screen the panel leaves free.
  function offsetForInset(t, zoom, inset) {
    const wpp = (camera.top - camera.bottom) / zoom / Math.max(1, canvas.clientHeight);
    const { right, up } = axes();
    return t.addScaledVector(right, (((inset.right ?? 0) - (inset.left ?? 0)) / 2) * wpp).addScaledVector(up, (((inset.top ?? 0) - (inset.bottom ?? 0)) / 2) * wpp);
  }
  function fitZoom(size, inset) {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    const freeH = ((camera.top - camera.bottom) * (ch - (inset.bottom ?? 0) - (inset.top ?? 0))) / ch;
    const freeW = ((camera.right - camera.left) * (cw - (inset.right ?? 0))) / cw;
    return Math.min(freeH / (size.y + 1.4), freeW / (Math.max(size.x, size.z) * 1.6 + 1));
  }
  function focus(id, inset = {}) {
    if (id === 'about' && walker) {
      selected = id;
      walker.held = true;
      play(walker.actor, 'emote-yes', { once: true });
      setTimeout(() => walker.held && play(walker.actor, 'idle'), 1100);
      const c = walker.root.position.clone().add(new THREE.Vector3(0, 0.3, 0));
      flyTo(offsetForInset(c, 2.4, inset), 2.4);
      return;
    }
    const e = entries.get(id);
    if (!e) return;
    selected = id;
    const box = new THREE.Box3().setFromObject(e.group);
    const c = box.getCenter(new THREE.Vector3());
    const zoom = clamp(fitZoom(box.getSize(new THREE.Vector3()), inset), 0.9, 2.0);
    c.y = clamp(c.y, 0.5, 2.4);
    flyTo(offsetForInset(c, zoom, inset), zoom);
  }
  // inset.left: a side panel covers that many pixels on the left, so frame the town in what's left
  function home(inset = {}) {
    selected = null;
    if (walker?.held) {
      walker.held = false;
      walker.state = 'walk';
      play(walker.actor, 'walk');
    }
    const cw = Math.max(1, canvas.clientWidth);
    const zoom = HOME.zoom * Math.max(0.55, (cw - (inset.left ?? 0)) / cw);
    flyTo(inset.left ? offsetForInset(HOME.target.clone(), zoom, inset) : HOME.target, zoom);
  }

  // Frame the diorama and every building (plus room for its pin) in the space below the top bar.
  const framePoints = [];
  for (const x of [BASE.minX, BASE.maxX]) for (const z of [BASE.minZ, BASE.maxZ]) framePoints.push(new THREE.Vector3(x, -0.8, z));
  for (const e of entries.values()) {
    const b = new THREE.Box3().setFromObject(e.group);
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) framePoints.push(new THREE.Vector3(x, b.max.y + 0.55, z));
  }
  function fitHome() {
    camera.updateMatrixWorld();
    const { right, up } = axes();
    let [r0, r1, u0, u1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const p of framePoints) {
      r0 = Math.min(r0, p.dot(right));
      r1 = Math.max(r1, p.dot(right));
      u0 = Math.min(u0, p.dot(up));
      u1 = Math.max(u1, p.dot(up));
    }
    const ch = Math.max(1, canvas.clientHeight);
    const reserve = { top: 70, bottom: 56 };
    const viewH = (camera.top - camera.bottom) * ((ch - reserve.top - reserve.bottom) / ch);
    HOME.zoom = clamp(Math.min((camera.right - camera.left) / ((r1 - r0) * 1.02), viewH / ((u1 - u0) * 1.02)), 0.4, 1.4);
    const centre = right.clone().multiplyScalar((r0 + r1) / 2).addScaledVector(up, (u0 + u1) / 2);
    // slide along the view direction until the orbit pivot sits at street height
    const dir = VIEW_DIR.clone().negate();
    centre.addScaledVector(dir, (0.8 - centre.y) / dir.y);
    HOME.target.copy(offsetForInset(centre, HOME.zoom, reserve));
    controls.minZoom = HOME.zoom * 0.8;
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
  window.addEventListener('resize', () => {
    resize();
    if (!selected) {
      fitHome();
      flyTo(HOME.target, HOME.zoom);
    }
  });
  resize();
  fitHome();
  camera.position.copy(HOME.target).addScaledVector(VIEW_DIR, 40);
  controls.target.copy(HOME.target);
  camera.zoom = HOME.zoom;
  camera.updateProjectionMatrix();

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
    }
    dim = lerp(dim, WEATHER_DIM[weather], 1 - Math.pow(0.05, dt));
    if (weather === 'storm' && !reduceMotion) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        flash = 1;
        flashTimer = rand(3.5, 9);
        onFlash?.();
      }
    }
    flash = Math.max(0, flash - dt * 4);
    applyLights();

    if (rain.visible) {
      for (let i = 0; i < RAIN; i++) {
        const o = i * 6;
        const fall = rainSpeed[i] * dt;
        rainPos[o + 1] -= fall;
        rainPos[o + 4] -= fall;
        if (rainPos[o + 1] < 0) seedDrop(i, 7);
      }
      rainGeo.attributes.position.needsUpdate = true;
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
      const focused = e.place.id === hovered || e.place.id === selected;
      e.hover = lerp(e.hover, focused ? 1 : 0, 1 - Math.pow(0.0005, dt));
      e.highlight = lerp(e.highlight ?? 0, e.highlightTarget ?? 0, 1 - Math.pow(0.002, dt));
      e.group.scale.setScalar(1 + e.hover * 0.035 + e.highlight * 0.03);
      if (e.ring) {
        const pulse = Math.sin(t * 3 + e.group.position.x);
        e.ring.visible = e.highlight > 0.01;
        e.ring.material.opacity = e.highlight * (0.6 + 0.25 * pulse);
        e.ring.scale.setScalar(e.ring.userData.radius * (1 + 0.05 * pulse));
      }
      if (e.scan) e.scan.mesh.position.y = e.scan.y0 + ((t * 0.22) % 1) * e.scan.h;
      // with a dozen buildings, floor tags only show for the one you're looking at
      for (const tag of e.tags) tag.visible = blueprint && focused;
      if (blueprint && e.packets) {
        const { minY, maxY } = e.spine;
        for (const m of e.packets) {
          const u = (t * 0.32 + m.userData.phase) % 1;
          m.position.y = maxY - (maxY - minY) * (u < 0.5 ? u * 2 : 2 - u * 2);
        }
      }
    }

    updateWalker(dt);
    updateDog(dt);
    updateCat(dt);
    updateFireworks(dt);

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    if (++frames === 3) document.documentElement.dataset.townReady = 'true';
  });

  return {
    focus,
    home,
    setHover,
    setBlueprint,
    setHighlight,
    setWeather,
    setAvatar,
    launchFireworks,
    petReact,
    setNight(on, instant = false) {
      nightTarget = on ? 1 : 0;
      if (instant) night = nightTarget;
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
