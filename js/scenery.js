// Non-interactive dressing for the town: the street, pavements, background buildings, trees and lamps.
// Featured buildings live in data/town.js. Units are road tiles; pos is [x, z].

export const BASE = { minX: -4.6, maxX: 4.6, minZ: -3.7, maxZ: 2.0 };

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const tiles = [
  // main street along z = 0
  ...range(-4, 4).map((x) => ({ file: 'roads/road-straight.glb', pos: [x, 0] })),
  // pavement under the front row and the back row
  ...range(-4, 4).flatMap((x) => [
    { file: 'roads/tile-low.glb', pos: [x, -1] },
    { file: 'roads/tile-low.glb', pos: [x, -2] },
  ]),
];

// glow: how bright the windows get at night (0 = dark). Background buildings glow softly for ambience.
// Keep the diagonal behind the vacant lot (x - z ≈ 3.95) empty so its outline reads clearly.
export const backdrop = [
  // tall on the left, low behind the vacant lot so its outline stays readable
  { file: 'commercial/low-detail-building-a.glb', pos: [-4.05, -2.9], scale: 1.3, glow: 0.5 },
  { file: 'commercial/low-detail-building-wide-a.glb', pos: [-3.1, -3.0], scale: 1.1, glow: 0.35 },
  { file: 'commercial/building-skyscraper-a.glb', pos: [-1.8, -2.95], scale: 0.8, glow: 0.5 },
  { file: 'commercial/low-detail-building-h.glb', pos: [-0.75, -3.2], scale: 1.2, glow: 0.4 },
  { file: 'commercial/low-detail-building-n.glb', pos: [2.4, -3.05], scale: 1.4, glow: 0.3 },
  { file: 'commercial/low-detail-building-wide-a.glb', pos: [3.3, -3.0], glow: 0.3 },
  { file: 'commercial/building-skyscraper-e.glb', pos: [4.05, -2.95], scale: 0.62, glow: 0.55 },
];

export const greenery = [
  ...[-4.1, -3.25, -2.35, -1.5, -0.55, 0.45, 1.4, 2.3, 3.2, 4.1].map((x, i) => ({
    file: i % 3 === 1 ? 'suburban/tree-small.glb' : 'suburban/tree-large.glb',
    pos: [x, i % 2 ? 1.5 : 1.0],
    scale: 1.1,
  })),
  { file: 'suburban/planter.glb', pos: [-2.8, 1.25], rot: 90 },
  { file: 'suburban/planter.glb', pos: [0, 1.25], rot: 90 },
  { file: 'suburban/planter.glb', pos: [2.8, 1.25], rot: 90 },
  { file: 'suburban/tree-small.glb', pos: [-1.45, -0.8] },
  { file: 'suburban/tree-small.glb', pos: [1.45, -0.8] },
];

// Street lamps sit on the south kerb with the arm reaching over the road.
// head is the bulb position relative to the lamp, used for the night light.
export const lamps = [-3.5, -1.2, 1.2, 3.5].map((x) => ({
  file: 'roads/light-square.glb',
  pos: [x, 0.42],
  head: [0, 0.57, -0.19],
}));
