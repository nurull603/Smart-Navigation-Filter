// ============================================================
// SMART NAVIGATION FILTER — Demo Map (Jersey Mike's Arena)
//
// TOP-DOWN VIEW:
//   EXIT_MAIN ──── H_MID ──── CORNER
//                                 |
//                             V_MID1..9
//                                 |
//                            TABLE_122 (refuge)
//
// TO ADJUST: change the 4 constants below only
// ============================================================

const CORNER_X = -6;
const CORNER_Z = 32;
const V_LENGTH = -57;
const H_LENGTH = 15;

export const BUILDING = {
  name: "Jersey_Mikes_Demo",
  width: H_LENGTH + 4,
  height: Math.abs(V_LENGTH) + 4,
  floor: 1,
};

export const NODES = [
  // Horizontal arm
  { id: "EXIT_MAIN", x: CORNER_X - H_LENGTH,       y: CORNER_Z,                   type: "exit",         accessible: true, label: "Main Exit" },
  { id: "H_MID",     x: CORNER_X - H_LENGTH * 0.5, y: CORNER_Z,                   type: "hallway",      accessible: true, label: "Hallway to Exit" },
  // Corner
  { id: "CORNER",    x: CORNER_X,                   y: CORNER_Z,                   type: "intersection", accessible: true, label: "Corner Junction" },
  // Vertical arm — 10 nodes
  { id: "V_MID1",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.1,  type: "hallway", accessible: true, label: "Aisle 1" },
  { id: "V_MID2",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.2,  type: "hallway", accessible: true, label: "Aisle 2" },
  { id: "V_MID3",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.3,  type: "hallway", accessible: true, label: "Aisle 3" },
  { id: "V_MID4",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.4,  type: "hallway", accessible: true, label: "Aisle 4" },
  { id: "V_MID5",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.5,  type: "hallway", accessible: true, label: "Aisle 5" },
  { id: "V_MID6",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.6,  type: "hallway", accessible: true, label: "Aisle 6" },
  { id: "V_MID7",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.7,  type: "hallway", accessible: true, label: "Aisle 7" },
  { id: "V_MID8",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.8,  type: "hallway", accessible: true, label: "Aisle 8" },
  { id: "V_MID9",    x: CORNER_X, y: CORNER_Z + V_LENGTH * 0.9,  type: "hallway", accessible: true, label: "Aisle 9" },
  // Refuge at bottom
  { id: "TABLE_122", x: CORNER_X, y: CORNER_Z + V_LENGTH +1 ,         type: "refuge",  accessible: true, label: "Table 122 — Refuge" },
];

export const EDGES = [
  // Horizontal arm
  { from: "CORNER",   to: "H_MID",     accessible: true },
  { from: "H_MID",    to: "EXIT_MAIN", accessible: true },
  // Vertical arm
  { from: "CORNER",   to: "V_MID1",   accessible: true },
  { from: "V_MID1",   to: "V_MID2",   accessible: true },
  { from: "V_MID2",   to: "V_MID3",   accessible: true },
  { from: "V_MID3",   to: "V_MID4",   accessible: true },
  { from: "V_MID4",   to: "V_MID5",   accessible: true },
  { from: "V_MID5",   to: "V_MID6",   accessible: true },
  { from: "V_MID6",   to: "V_MID7",   accessible: true },
  { from: "V_MID7",   to: "V_MID8",   accessible: true },
  { from: "V_MID8",   to: "V_MID9",   accessible: true },
  { from: "V_MID9",   to: "TABLE_122", accessible: true },
];

export const BEACONS = [
  { id: "BEACON_1", major: 3838, minor: 4949, nodeId: "TABLE_122", label: "Beacon 1 — Table 122" },
  { id: "BEACON_2", major: 3838, minor: 4950, nodeId: "V_MID3",    label: "Beacon 2 — Aisle 3" },
  { id: "BEACON_3", major: 3838, minor: 4951, nodeId: "V_MID5",    label: "Beacon 3 — Aisle 5" },
  { id: "BEACON_4", major: 3838, minor: 4952, nodeId: "V_MID7",    label: "Beacon 4 — Aisle 7" },
  { id: "BEACON_5", major: 3838, minor: 4953, nodeId: "CORNER",    label: "Beacon 5 — Corner" },
  { id: "BEACON_6", major: 3838, minor: 4954, nodeId: "EXIT_MAIN", label: "Beacon 6 — Exit" },
];

export const ZONES = [
  { name: "Main Aisle", x: CORNER_X - 1, y: CORNER_Z, w: 2, h: V_LENGTH, color: "#2a3a5c" },
  { x: CORNER_X - H_LENGTH, y: CORNER_Z - 1, w: H_LENGTH, h: 2, color: "#2a3a5c" },
];

export const CORRIDORS = [
  { x: CORNER_X - 1,        y: CORNER_Z,     w: 2,        h: V_LENGTH },
  { x: CORNER_X - H_LENGTH, y: CORNER_Z - 1, w: H_LENGTH, h: 2 },
];

export const WALLS = [
  // Vertical arm
  { x1: CORNER_X - 2, y1: CORNER_Z,            x2: CORNER_X - 2, y2: CORNER_Z + V_LENGTH },
  { x1: CORNER_X + 2, y1: CORNER_Z,            x2: CORNER_X + 2, y2: CORNER_Z + V_LENGTH },
  { x1: CORNER_X - 2, y1: CORNER_Z + V_LENGTH, x2: CORNER_X + 2, y2: CORNER_Z + V_LENGTH },
  // Horizontal arm
  { x1: CORNER_X - H_LENGTH, y1: CORNER_Z - 2, x2: CORNER_X - 2, y2: CORNER_Z - 2 },
  { x1: CORNER_X - H_LENGTH, y1: CORNER_Z + 2, x2: CORNER_X - 2, y2: CORNER_Z + 2 },
  { x1: CORNER_X - H_LENGTH, y1: CORNER_Z - 2, x2: CORNER_X - H_LENGTH, y2: CORNER_Z + 2 },
];

export const FIRE_ZONES = {
  corner: {
    label: "Corner Junction",
    blockedEdges: [
      { from: "V_MID1",  to: "CORNER"    },
      { from: "CORNER",  to: "H_MID"     },
      { from: "H_MID",   to: "EXIT_MAIN" },
    ],
  },
};