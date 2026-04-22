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
const CORNER_Z = -30;
const V_LENGTH = 10;
const H_LENGTH = 15;

export const BUILDING = {
  name: "Jersey_Mikes_Demo",
  width: H_LENGTH + 4,
  height: Math.abs(V_LENGTH) + 4,
  floor: 1,
};

export const NODES = [
  // Horizontal arm (the "_" of the _| shape)
  { id: "EXIT_MAIN", x: CORNER_X - H_LENGTH,       y: CORNER_Z, type: "exit",         accessible: true, label: "Main Exit" },
  { id: "H_MID",     x: CORNER_X - H_LENGTH * 0.5, y: CORNER_Z, type: "hallway",      accessible: true, label: "Exit Path" },
  
  // Corner (the intersection point)
  { id: "CORNER",    x: CORNER_X, y: CORNER_Z, type: "intersection", accessible: true, label: "Corner Junction" },
  
  // Vertical arm (the "|" of the _| shape)
  // Table 122 is now at the bottom of the stem
  { id: "TABLE_122", x: CORNER_X, y: CORNER_Z + V_LENGTH, type: "refuge", accessible: true, label: "Table 122 — Start" },
];

export const EDGES = [
  // Vertical: Table up to Corner
  { from: "TABLE_122", to: "CORNER",    accessible: true },
  // Horizontal: Corner left to Exit
  { from: "CORNER",    to: "H_MID",     accessible: true },
  { from: "H_MID",     to: "EXIT_MAIN", accessible: true },
];

export const BEACONS = [
  { id: "BEACON_1", major: 3838, minor: 4949, nodeId: "TABLE_122", label: "Beacon 1 — Table" },
  { id: "BEACON_2", major: 3838, minor: 4950, nodeId: "CORNER",    label: "Beacon 2 — Corner" },
  { id: "BEACON_3", major: 3838, minor: 4951, nodeId: "H_MID",     label: "Beacon 3 — Hallway" },
  { id: "BEACON_4", major: 3838, minor: 4952, nodeId: "EXIT_MAIN", label: "Beacon 4 — Exit" },
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
  hallway: {
    label: "Hallway Fire",
    blockedEdges: [
      { from: "CORNER", to: "H_MID" },    // Blocks the turn into the exit hallway
      { from: "H_MID",  to: "EXIT_MAIN" } // Blocks the 3rd node entirely
    ],
  },
};