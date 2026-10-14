// Non-interactive dressing for the town: streets, pavements, background buildings, trees, lamps,
// and the routes the walkers follow. Featured buildings live in data/town.js. Units are road tiles; pos is [x, z].

export const BASE = { minX: -6.7, maxX: 6.7, minZ: -3.8, maxZ: 4.7 };
export const MAIN_STREET_Z = 0;
export const PARK_STREET_Z = 3;

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const tiles = [
  ...range(-6, 6).map((x) => ({ file: 'roads/road-straight.glb', pos: [x, MAIN_STREET_Z] })),
  ...range(-6, 6).map((x) => ({ file: 'roads/road-straight.glb', pos: [x, PARK_STREET_Z] })),
  // pavement under row 1 (behind Main Street) and row 2 (between the streets)
  ...range(-6, 6).flatMap((x) => [-2, -1, 1, 2].map((z) => ({ file: 'roads/tile-low.glb', pos: [x, z] }))),
];

// glow: how bright the windows get at night (0 = dark). Background buildings glow softly for ambience.
// Keep the diagonal behind the vacant lot (around x = 2, z = -2.9) low so its outline reads clearly.
export const backdrop = [
  { file: 'commercial/low-detail-building-a.glb', pos: [-6.1, -2.95], scale: 1.3, glow: 0.5 },
  { file: 'commercial/low-detail-building-wide-a.glb', pos: [-4.7, -3.05], scale: 1.1, glow: 0.35 },
  { file: 'commercial/low-detail-building-d.glb', pos: [-3.5, -3.15], scale: 1.3, glow: 0.45 },
  { file: 'commercial/building-skyscraper-a.glb', pos: [-2.5, -2.95], scale: 0.8, glow: 0.5 },
  { file: 'commercial/low-detail-building-h.glb', pos: [-0.9, -3.2], scale: 1.2, glow: 0.4 },
  { file: 'commercial/low-detail-building-wide-b.glb', pos: [0.6, -3.15], glow: 0.4 },
  { file: 'commercial/low-detail-building-n.glb', pos: [2.9, -3.05], scale: 1.4, glow: 0.3 },
  { file: 'commercial/low-detail-building-wide-a.glb', pos: [4.4, -3.0], glow: 0.3 },
  { file: 'commercial/building-skyscraper-e.glb', pos: [5.8, -3.0], scale: 0.62, glow: 0.55 },
];

export const greenery = [
  // the park along the front edge
  ...[-6.2, -5.3, -4.4, -3.5, -2.6, -1.7, -0.8, 0.1, 1.0, 1.9, 2.8, 3.7, 4.6, 5.5, 6.3].map((x, i) => ({
    file: i % 3 === 1 ? 'suburban/tree-small.glb' : 'suburban/tree-large.glb',
    pos: [x, i % 2 ? 4.4 : 4.0],
    scale: 1.1,
  })),
  ...[-4.85, -0.4, 4.2].map((x) => ({ file: 'suburban/planter.glb', pos: [x, 4.2], rot: 90 })),
  // between buildings
  { file: 'suburban/tree-small.glb', pos: [-4.5, -0.75] },
  { file: 'suburban/tree-small.glb', pos: [-2.7, -0.75] },
  { file: 'suburban/tree-small.glb', pos: [4.5, -0.75] },
  { file: 'suburban/tree-small.glb', pos: [-3.95, 2.3] },
  { file: 'suburban/tree-small.glb', pos: [0.0, 2.3] },
  { file: 'suburban/tree-small.glb', pos: [3.15, 2.3] },
];

// Street lamps on the south kerb of each street, arms reaching over the road.
// Only some carry a real light; the rest just glow, which keeps the night scene fast on phones.
export const lamps = [
  ...[-4.5, -1.5, 1.5, 4.5].map((x, i) => ({ file: 'roads/light-square.glb', pos: [x, MAIN_STREET_Z + 0.42], light: i % 2 === 1 })),
  ...[-4.5, -1.5, 1.5, 4.5].map((x) => ({ file: 'roads/light-square.glb', pos: [x, PARK_STREET_Z + 0.42], light: true })),
].map((l) => ({ ...l, head: [0, 0.57, -0.19] }));

// The character strolls a loop around Park Street: along the north pavement in front of row 2,
// across the road, back along the south pavement, and across again.
export const walkLoop = [
  [-6.0, PARK_STREET_Z - 0.4],
  [6.0, PARK_STREET_Z - 0.4],
  [6.0, PARK_STREET_Z + 0.32],
  [-6.0, PARK_STREET_Z + 0.32],
];

// The cat wanders the pavement in front of Happy Paws and its neighbours.
export const catZone = { minX: 0.3, maxX: 3.7, minZ: PARK_STREET_Z - 0.62, maxZ: PARK_STREET_Z - 0.48 };

// The bug hunt: five ladybugs, each in a spot you only find by looking around.
// roof / wall: a place's id plus fractions of its footprint (wall is the +x side: [along z, up]).
// at: a world [x, z] on the ground, or on a street lamp when lamp is set. hint: what the terminal's bugs command says.
export const bugSpots = [
  { on: 'fictionthai', roof: [0.3, 0.35], hint: 'Something is crawling about on the roof of a building still under construction.' },
  { on: 'securesight', wall: [0.3, 0.62], hint: 'Even the security tower has one. Have a look at its walls.' },
  { at: [-1.5, 3.22], lamp: true, hint: 'One likes the light. Check the street lamps on Park Street.' },
  { at: [-4.13, 2.12], hint: 'One is hiding behind a tree on Park Street.' },
  { at: [0.55, 4.25], hint: 'One is having a picnic in the park.' },
];

// Halloween dressing: pumpkins on roofs (fractions of the footprint), along the pavements (world [x, z]),
// a little patch on the vacant lot (lot-local [x, z]), and the tower the bats circle.
export const halloween = {
  roofs: [
    { on: 'customer-service', at: [0.75, 0.75] },
    { on: 'nk-digital-library', at: [0.7, 0.7] },
    { on: 'line-movie-bot', at: [0.72, 0.72] },
    { on: 'kmitl', at: [0.7, 0.75] },
  ],
  ground: [
    { at: [-2.0, 2.28] },
    { at: [1.62, 2.28], size: 1.5 },
    { at: [4.78, 2.28] },
    { at: [-0.9, -0.64] },
    { at: [0.9, -0.64], size: 1.1 },
    { at: [1.45, 4.15], size: 2.2 }, // the giant one in the park
  ],
  patch: [
    { at: [-0.68, 0.22], size: 1.25 },
    { at: [0.68, 0.28], size: 1.0 },
    { at: [0.66, -0.25], size: 0.8 },
  ],
  batsAround: 'bookdose',
};
