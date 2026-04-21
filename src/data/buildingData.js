// ============================================================
// SMART NAVIGATION FILTER — Demo Map (Jersey Mike's Arena)
// Inverted-L: 15m vertical arm + 5m horizontal arm to right
// Scale: 1 unit = 1 meter | Y increases DOWNWARD
//
// LAYOUT (top-down):
//   CORNER ──── EXIT_MAIN      (horizontal arm, y=0)
//     |
//   V_MID2                     (mid vertical, y=7.5)
//     |
//   TABLE_122 (refuge)         (bottom, y=15)
//
// TO ADJUST: change V_LENGTH / H_LENGTH below
// ============================================================

// ── EASY TO CHANGE ──────────────────────────────────────────
const V_LENGTH = 15;   // vertical arm in meters
const H_LENGTH = 5;    // horizontal arm in meters
const PATH_X   = 5;    // x position of the vertical arm
// ────────────────────────────────────────────────────────────

export const BUILDING = {
  name: "Jersey_Mikes_Demo",
  width: PATH_X + H_LENGTH + 2,
  height: V_LENGTH + 2,
  floor: 1,
};

export const NODES = [
  // === VERTICAL ARM (bottom to top) ===
  { id: "TABLE_122", x: PATH_X, y: V_LENGTH,            type: "refuge",       accessible: true, label: "Table 122 — Refuge" },
  { id: "V_MID1",   x: PATH_X, y: V_LENGTH * 0.75,     type: "hallway",      accessible: true, label: "Aisle South" },
  { id: "V_MID2",   x: PATH_X, y: V_LENGTH * 0.5,      type: "hallway",      accessible: true, label: "Aisle Center" },
  { id: "V_MID3",   x: PATH_X, y: V_LENGTH * 0.25,     type: "hallway",      accessible: true, label: "Aisle North" },
  { id: "CORNER",   x: PATH_X, y: 0,                   type: "intersection", accessible: true, label: "Corner Junction" },
  // === HORIZONTAL ARM (corner to exit) ===
  { id: "H_MID",     x: PATH_X + H_LENGTH * 0.5, y: 0, type: "hallway", accessible: true, label: "Hallway to Exit" },
  { id: "EXIT_MAIN", x: PATH_X + H_LENGTH,        y: 0, type: "exit",    accessible: true, label: "Main Exit" },
];

export const EDGES = [
  // Vertical arm
  { from: "TABLE_122", to: "V_MID1",    accessible: true },
  { from: "V_MID1",   to: "V_MID2",    accessible: true },
  { from: "V_MID2",   to: "V_MID3",    accessible: true },
  { from: "V_MID3",   to: "CORNER",    accessible: true },
  // Horizontal arm
  { from: "CORNER",   to: "H_MID",     accessible: true },
  { from: "H_MID",    to: "EXIT_MAIN", accessible: true },
];

export const BEACONS = [
  // Major 3838 for all — swap nodeId here after physical testing
  { id: "BEACON_1", major: 3838, minor: 4953, nodeId: "TABLE_122", label: "Beacon 1 — Table 122" },
  { id: "BEACON_2", major: 3838, minor: 4951, nodeId: "V_MID2",    label: "Beacon 2 — Aisle Center" },
  { id: "BEACON_3", major: 3838, minor: 4950, nodeId: "EXIT_MAIN", label: "Beacon 3 — Main Exit" },
];

export const ZONES = [
  { name: "Walkway", x: PATH_X - 1, y: 0,  w: 2, h: V_LENGTH, color: "#2a3a5c" },
  { name: "Exit Corridor", x: PATH_X - 1, y: -1, w: H_LENGTH + 1, h: 2, color: "#2a3a5c" },
];

export const CORRIDORS = [
  { x: PATH_X - 1, y: 0,  w: 2, h: V_LENGTH },
  { x: PATH_X - 1, y: -1, w: H_LENGTH + 1, h: 2 },
];

export const WALLS = [
  // Vertical arm walls
  { x1: PATH_X - 1, y1: 0,        x2: PATH_X - 1, y2: V_LENGTH },
  { x1: PATH_X + 1, y1: 0,        x2: PATH_X + 1, y2: V_LENGTH },
  { x1: PATH_X - 1, y1: V_LENGTH, x2: PATH_X + 1, y2: V_LENGTH },
  // Horizontal arm walls
  { x1: PATH_X - 1,        y1: -1, x2: PATH_X + H_LENGTH, y2: -1 },
  { x1: PATH_X + 1,        y1:  1, x2: PATH_X + H_LENGTH, y2:  1 },
  { x1: PATH_X + H_LENGTH, y1: -1, x2: PATH_X + H_LENGTH, y2:  1 },
];

// Fire at CORNER blocks path to exit → forces reroute to TABLE_122 (refuge)
export const FIRE_ZONES = {
  corner: {
    label: "Corner Junction",
    blockedEdges: [
      { from: "V_MID3",  to: "CORNER"   },
      { from: "CORNER",  to: "H_MID"    },
      { from: "H_MID",   to: "EXIT_MAIN" },
    ],
  },
};
