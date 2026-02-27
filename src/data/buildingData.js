// ============================================================
// SMART NAVIGATION FILTER — Building Data
// Dorm Floor — L-Shaped Hallway
// Scale: 1 unit = 4 feet  (matches Blender source exactly)
// ============================================================
//
// COORDINATE SYSTEM (mirrors Blender script 1:1):
//   X = along horizontal hallway  (junction=0, far right=57.25 units / 229ft)
//   Y = along vertical hallway    (junction=0, top=34 units / 136ft)
//   L-junction corner at (0, 0)
//
// HORIZONTAL HALL: Y=0, X=0..57.25
//   Segments: 84ft + 15ft(elev) + 113ft + 17ft(endcap) = 229ft = 57.25 units
//   - Elevator lobby bumps NORTH (+Y) at X=21..24.75  (84ft..99ft)
//   - Stairs 2 bump-out SOUTH (−Y) near X=50 before end cap
//
// VERTICAL HALL: X=0, Y=0..34
//   - Stairs 1 alcove bumps WEST (−X) at Y=26.25 (105ft)
//   - Study room at top Y=34+
//
// REFUGE: tiny closet SOUTH (−Y) of junction
//
// ============================================================

export const BUILDING = {
  name: "Dorm_TopFloor",
  width: 62,
  height: 42,
  floor: 1,
};

// Half hallway width: 10ft / 2 / 4scale = 1.25 units
const HW            = 1.25;

// --- Horizontal hall X coordinates ---
const X_ELEV_W      = 21;      // 84ft  → elevator lobby west edge
const X_ELEV_E      = 24.75;   // 99ft  → elevator lobby east edge (15ft wide)
const X_STAIR2      = 50;      // ~200ft → stairs 2 bump-out start
const X_END_CAP     = 53.25;   // 213ft  → 17ft end cap start
const X_FAR_EAST    = 57.25;   // 229ft  → far right end

// --- Vertical hall Y coordinates ---
const Y_STAIR1      = 26.25;   // 105ft up → stairs 1 alcove
const Y_VERT_TOP    = 34;      // 136ft → top of vertical hall

// --- Elevator lobby ---
const ELEV_D        = 5.75;    // 23ft deep (north, +Y direction)

// --- Stairs 1 alcove (west, −X) ---
const S1_W          = 2.5;     // alcove width (10ft / 4)
const S1_D          = 3.5;     // alcove depth (14ft / 4)

// --- Stairs 2 bump-out (south, −Y) ---
const S2_W          = 3.0;     // 12ft wide / 4
const S2_D          = 2.5;     // 10ft deep / 4

// --- Refuge ---
const REF_W         = 1.0;
const REF_D         = 1.0;

// --- Study room ---
const STUDY_W       = 7.5;
const STUDY_D       = 6.25;

// ============================================================
// NAVIGATION NODES
// ============================================================
export const NODES = [
  // === EXITS ===
  { id: "EXIT_STAIRS1",   x: -(HW + S1_W + 0.5),              y: Y_STAIR1,                type: "exit",         accessible: false, label: "Exit — Stairs 1" },
  { id: "EXIT_STAIRS2",   x: X_STAIR2 + S2_W / 2,            y: -(HW + S2_D + 0.5),      type: "exit",         accessible: false, label: "Exit — Stairs 2" },
  { id: "EXIT_ELEVATOR",  x: (X_ELEV_W + X_ELEV_E) / 2,      y: HW + ELEV_D - 0.5,       type: "exit",         accessible: true,  label: "Exit — Elevator" },

  // === STAIRS ===
  { id: "STAIRS_1",       x: -(HW + S1_W),                    y: Y_STAIR1,                type: "stairs",       accessible: false, label: "Stairs 1" },
  { id: "STAIRS_2",       x: X_STAIR2 + S2_W / 2,            y: -(HW + S2_D),             type: "stairs",       accessible: false, label: "Stairs 2" },

  // === ELEVATOR ===
  { id: "ELEVATOR",       x: (X_ELEV_W + X_ELEV_E) / 2,      y: HW + ELEV_D / 2,         type: "elevator",     accessible: true,  label: "Elevator" },

  // === REFUGE (south of junction) ===
  { id: "REFUGE_1",       x: 0,                               y: -(HW + REF_D / 2),        type: "refuge",       accessible: true,  label: "Refuge Area" },

  // === STUDY ROOM DOOR ===
  { id: "STUDY_DOOR",     x: 0,                               y: Y_VERT_TOP + 0.5,         type: "door",         accessible: true,  label: "Study Room" },

  // === VERTICAL HALLWAY NODES (X=0, bottom → top) ===
  { id: "V_00",  x: 0,  y: 0,          type: "intersection", accessible: true },
  { id: "V_04",  x: 0,  y: 4,          type: "intersection", accessible: true },
  { id: "V_08",  x: 0,  y: 8,          type: "intersection", accessible: true },
  { id: "V_12",  x: 0,  y: 12,         type: "intersection", accessible: true },
  { id: "V_16",  x: 0,  y: 16,         type: "intersection", accessible: true },
  { id: "V_20",  x: 0,  y: 20,         type: "intersection", accessible: true },
  { id: "V_24",  x: 0,  y: 24,         type: "intersection", accessible: true },
  { id: "V_S1",  x: 0,  y: Y_STAIR1,  type: "intersection", accessible: true, label: "Stairs 1 Junction" },
  { id: "V_30",  x: 0,  y: 30,         type: "intersection", accessible: true },
  { id: "V_34",  x: 0,  y: Y_VERT_TOP,type: "intersection", accessible: true },

  // === HORIZONTAL HALLWAY NODES (Y=0, left → right) ===
  { id: "H_05",   x: 5,               y: 0, type: "intersection", accessible: true },
  { id: "H_10",   x: 10,              y: 0, type: "intersection", accessible: true },
  { id: "H_15",   x: 15,              y: 0, type: "intersection", accessible: true },
  { id: "H_ELEV", x: X_ELEV_W,       y: 0, type: "intersection", accessible: true, label: "Elevator Junction" },
  { id: "H_25",   x: 25,              y: 0, type: "intersection", accessible: true },
  { id: "H_30",   x: 30,              y: 0, type: "intersection", accessible: true },
  { id: "H_35",   x: 35,              y: 0, type: "intersection", accessible: true },
  { id: "H_40",   x: 40,              y: 0, type: "intersection", accessible: true },
  { id: "H_45",   x: 45,              y: 0, type: "intersection", accessible: true },
  { id: "H_S2",   x: X_STAIR2 + S2_W / 2, y: 0, type: "intersection", accessible: true, label: "Stairs 2 Junction" },
  { id: "H_FAR",  x: X_FAR_EAST,     y: 0, type: "intersection", accessible: true },

  // === ELEVATOR LOBBY ENTRY ===
  { id: "ELEV_ENTRY", x: (X_ELEV_W + X_ELEV_E) / 2, y: HW + 0.5, type: "intersection", accessible: true },
];

// ============================================================
// EDGES
// ============================================================
export const EDGES = [
  // VERTICAL HALLWAY (bottom → top)
  { from: "V_00",  to: "V_04",   type: "corridor", accessible: true },
  { from: "V_04",  to: "V_08",   type: "corridor", accessible: true },
  { from: "V_08",  to: "V_12",   type: "corridor", accessible: true },
  { from: "V_12",  to: "V_16",   type: "corridor", accessible: true },
  { from: "V_16",  to: "V_20",   type: "corridor", accessible: true },
  { from: "V_20",  to: "V_24",   type: "corridor", accessible: true },
  { from: "V_24",  to: "V_S1",   type: "corridor", accessible: true },
  { from: "V_S1",  to: "V_30",   type: "corridor", accessible: true },
  { from: "V_30",  to: "V_34",   type: "corridor", accessible: true },

  // HORIZONTAL HALLWAY (left → right)
  { from: "V_00",   to: "H_05",   type: "corridor", accessible: true },
  { from: "H_05",   to: "H_10",   type: "corridor", accessible: true },
  { from: "H_10",   to: "H_15",   type: "corridor", accessible: true },
  { from: "H_15",   to: "H_ELEV", type: "corridor", accessible: true },
  { from: "H_ELEV", to: "H_25",   type: "corridor", accessible: true },
  { from: "H_25",   to: "H_30",   type: "corridor", accessible: true },
  { from: "H_30",   to: "H_35",   type: "corridor", accessible: true },
  { from: "H_35",   to: "H_40",   type: "corridor", accessible: true },
  { from: "H_40",   to: "H_45",   type: "corridor", accessible: true },
  { from: "H_45",   to: "H_S2",   type: "corridor", accessible: true },
  { from: "H_S2",   to: "H_FAR",  type: "corridor", accessible: true },

  // STAIRS 1 — west alcove off vertical hall at Y=105ft
  { from: "V_S1",        to: "EXIT_STAIRS1",  type: "stairs",   accessible: false },
  { from: "EXIT_STAIRS1",to: "STAIRS_1",      type: "stairs",   accessible: false },

  // STAIRS 2 — south bump-out off horizontal hall near far right
  { from: "H_S2",        to: "EXIT_STAIRS2",  type: "stairs",   accessible: false },
  { from: "EXIT_STAIRS2",to: "STAIRS_2",      type: "stairs",   accessible: false },

  // ELEVATOR — lobby north (+Y) from horizontal hall at X=84ft
  { from: "H_ELEV",       to: "ELEV_ENTRY",    type: "corridor",  accessible: true },
  { from: "ELEV_ENTRY",   to: "EXIT_ELEVATOR", type: "corridor",  accessible: true },
  { from: "EXIT_ELEVATOR",to: "ELEVATOR",      type: "elevator",  accessible: true },

  // REFUGE — south of junction
  { from: "V_00",  to: "REFUGE_1",   type: "corridor", accessible: true },

  // STUDY ROOM
  { from: "V_34",  to: "STUDY_DOOR", type: "door",     accessible: true },
];

// ============================================================
// BEACON MAPPING
// UUID: 426C7565-4368-6172-6D42-6561636F6E73 | Major: 3838
// ============================================================
export const BEACONS = [
  { id: "BEACON_1", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4949, nodeId: "V_S1",  label: "Near Stairs 1" },
  { id: "BEACON_2", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4950, nodeId: "V_04",  label: "Near Junction" },
];

// ============================================================
// FIRE ZONES
// ============================================================
export const FIRE_ZONES = {
  elevator: {
    label: "Elevator Fire",
    blockedNodes: ["ELEVATOR", "ELEV_ENTRY", "EXIT_ELEVATOR"],
    blockedEdges: [
      { from: "H_ELEV", to: "ELEV_ENTRY" },
      { from: "ELEV_ENTRY", to: "EXIT_ELEVATOR" },
      { from: "EXIT_ELEVATOR", to: "ELEVATOR" },
    ],
  },
  vertical_hall: {
    label: "Vertical Hall Fire",
    blockedNodes: ["V_12", "V_16"],
    blockedEdges: [
      { from: "V_08", to: "V_12" },
      { from: "V_12", to: "V_16" },
      { from: "V_16", to: "V_20" },
    ],
  },
  horizontal_hall: {
    label: "Horizontal Hall Fire",
    blockedNodes: ["H_30", "H_35"],
    blockedEdges: [
      { from: "H_25", to: "H_30" },
      { from: "H_30", to: "H_35" },
      { from: "H_35", to: "H_40" },
    ],
  },
};

// ============================================================
// ROOM ZONES
// ============================================================
export const ZONES = [
  { name: "Study\nRoom",     x: -(STUDY_W / 2),    y: Y_VERT_TOP,           w: STUDY_W,            h: STUDY_D,   color: "#A5D1FF" },
  { name: "Stairs 1",        x: -(HW + S1_W),      y: Y_STAIR1 - S1_D / 2, w: S1_W,               h: S1_D,      color: "#FF8C2E" },
  { name: "Elevator\nLobby", x: X_ELEV_W,          y: HW,                   w: X_ELEV_E - X_ELEV_W, h: ELEV_D,  color: "#FFCF3E" },
  { name: "Stairs 2",        x: X_STAIR2,          y: -(HW + S2_D),         w: S2_W,               h: S2_D,      color: "#FF8C2E" },
  { name: "Refuge\nArea",    x: -(REF_W / 2),      y: -(HW + REF_D),        w: REF_W,              h: REF_D,     color: "#40D465" },
];

// ============================================================
// CORRIDOR ZONES
// ============================================================
export const CORRIDORS = [
  { x: -HW, y: -HW,  w: HW * 2,               h: Y_VERT_TOP + HW,   label: "VERTICAL HALLWAY (136 ft)"   },
  { x: -HW, y: -HW,  w: X_FAR_EAST + HW * 2,  h: HW * 2,            label: "HORIZONTAL HALLWAY (229 ft)" },
  // elevator spur connector
  { x: X_ELEV_W, y: HW - 0.25, w: X_ELEV_E - X_ELEV_W, h: 1.5 },
];

// ============================================================
// WALL SEGMENTS
// ============================================================
export const WALLS = [
  // === VERTICAL HALLWAY — LEFT WALL (−X) ===
  { x1: -HW, y1: -HW,                  x2: -HW, y2: Y_STAIR1 - S1_D / 2 },  // below stair alcove
  { x1: -HW, y1: Y_STAIR1 + S1_D / 2, x2: -HW, y2: Y_VERT_TOP },            // above stair alcove

  // === VERTICAL HALLWAY — RIGHT WALL (+X) ===
  { x1: HW, y1: HW, x2: HW, y2: Y_VERT_TOP },

  // === VERTICAL HALLWAY TOP — study room door gap ===
  { x1: -HW,          y1: Y_VERT_TOP, x2: -(STUDY_W / 2), y2: Y_VERT_TOP },
  { x1: HW,           y1: Y_VERT_TOP, x2:  (STUDY_W / 2), y2: Y_VERT_TOP },

  // === HORIZONTAL HALLWAY — TOP WALL (+Y) ===
  { x1: HW,      y1: HW, x2: X_ELEV_W, y2: HW },                             // left of elevator
  { x1: X_ELEV_E,y1: HW, x2: X_FAR_EAST + HW, y2: HW },                     // right of elevator

  // === HORIZONTAL HALLWAY — BOTTOM WALL (−Y) ===
  { x1: -HW,         y1: -HW, x2: X_STAIR2,          y2: -HW },              // left of stair2
  { x1: X_STAIR2 + S2_W, y1: -HW, x2: X_FAR_EAST + HW, y2: -HW },          // right of stair2

  // === FAR RIGHT END CAP ===
  { x1: X_FAR_EAST + HW, y1: -HW, x2: X_FAR_EAST + HW, y2: HW },

  // === STUDY ROOM ===
  { x1: -(STUDY_W / 2), y1: Y_VERT_TOP,           x2: -(STUDY_W / 2), y2: Y_VERT_TOP + STUDY_D },
  { x1:  (STUDY_W / 2), y1: Y_VERT_TOP,           x2:  (STUDY_W / 2), y2: Y_VERT_TOP + STUDY_D },
  { x1: -(STUDY_W / 2), y1: Y_VERT_TOP + STUDY_D, x2:  (STUDY_W / 2), y2: Y_VERT_TOP + STUDY_D },

  // === STAIRS 1 ALCOVE (west of vertical hall at Y=105ft) ===
  { x1: -(HW + S1_W), y1: Y_STAIR1 - S1_D / 2, x2: -(HW + S1_W), y2: Y_STAIR1 + S1_D / 2 },
  { x1: -(HW + S1_W), y1: Y_STAIR1 - S1_D / 2, x2: -HW,           y2: Y_STAIR1 - S1_D / 2 },
  { x1: -(HW + S1_W), y1: Y_STAIR1 + S1_D / 2, x2: -HW,           y2: Y_STAIR1 + S1_D / 2 },

  // === ELEVATOR LOBBY (north/+Y from horizontal hall) ===
  { x1: X_ELEV_W, y1: HW,           x2: X_ELEV_W, y2: HW + ELEV_D },        // west wall
  { x1: X_ELEV_E, y1: HW,           x2: X_ELEV_E, y2: HW + ELEV_D },        // east wall
  { x1: X_ELEV_W, y1: HW + ELEV_D, x2: X_ELEV_E,  y2: HW + ELEV_D },       // north wall

  // === STAIRS 2 BUMP-OUT (south/−Y from horizontal hall) ===
  { x1: X_STAIR2,         y1: -HW,           x2: X_STAIR2,          y2: -(HW + S2_D) },
  { x1: X_STAIR2,         y1: -(HW + S2_D),  x2: X_STAIR2 + S2_W,  y2: -(HW + S2_D) },
  { x1: X_STAIR2 + S2_W,  y1: -(HW + S2_D),  x2: X_STAIR2 + S2_W,  y2: -HW },

  // === REFUGE CLOSET (south of junction) ===
  { x1: -(REF_W / 2), y1: -HW,           x2: -(REF_W / 2), y2: -(HW + REF_D) },
  { x1:  (REF_W / 2), y1: -HW,           x2:  (REF_W / 2), y2: -(HW + REF_D) },
  { x1: -(REF_W / 2), y1: -(HW + REF_D), x2:  (REF_W / 2), y2: -(HW + REF_D) },
];
