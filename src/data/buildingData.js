// ============================================================
// SMART NAVIGATION FILTER — Building Data
// Scale: 1 unit = 1 foot
// Origin: top-left corner of upper corridor
// X grows RIGHT, Y grows DOWN — matches floor plan as drawn
//
// UPPER SECTION  y=0..52, x=0..128
//   Left bay (Elev+Stairs): x=0..12,   y=0..52
//   Top walkway strip:      x=0..128,  y=0..10   (above LH3)
//   Lecture Hall 3:         x=12..116, y=10..52  (room, not walkable)
//   Right bay (Elev+Stairs):x=116..128, y=0..52
//
// CONNECTION CORRIDOR (right side spine):
//   x=116..128, y=52..266   (214ft tall, 12ft wide)
//
// LOWER U-SHAPE  y=258..394
//   Top bar:    x=0..128,  y=258..274
//   Left leg:   x=0..16,   y=266..394
//   Bottom bar: x=0..100,  y=378..394
//   Right leg:  x=116..128, y=266..394  (same x as connection — seamless)
//
// EXITS:
//   EXIT_LEFT:   x=0,   y=266  (left wall of lower top bar)
//   EXIT_MID:    x=84,  y=278  (south wall of top bar, interior side)
//   EXIT_LOUNGE: x=128, y=372  (right wall, below lounge)
// ============================================================

export const BUILDING = {
  name: "Rutgers_Building_Floor1",
  width: 160,
  height: 420,
  floor: 1,
};

export const NODES = [

  // ── UPPER LEFT BAY ─────────────────────────────────────────
  { id: "ELEV_L",    x: 6,   y: 6,   type: "exit",         accessible: true,  label: "Left Elevator" },
  { id: "STAIR_L",   x: 6,   y: 22,  type: "exit",         accessible: false, label: "Left Stairs"   },
  { id: "UL_0",      x: 6,   y: 5,   type: "intersection", accessible: true  },
  { id: "UL_1",      x: 6,   y: 28,  type: "intersection", accessible: true  },
  { id: "UL_2",      x: 6,   y: 47,  type: "intersection", accessible: true,  label: "Upper Left"    },

  // ── UPPER TOP WALKWAY (y=5, left→right) ────────────────────
  { id: "UT_20",  x: 20,  y: 5,  type: "intersection", accessible: true },
  { id: "UT_40",  x: 40,  y: 5,  type: "intersection", accessible: true },
  { id: "UT_58",  x: 58,  y: 5,  type: "intersection", accessible: true, label: "Upper Center" },
  { id: "UT_76",  x: 76,  y: 5,  type: "intersection", accessible: true },
  { id: "UT_96",  x: 96,  y: 5,  type: "intersection", accessible: true },
  { id: "UT_112", x: 112, y: 5,  type: "intersection", accessible: true },

  // ── UPPER RIGHT BAY ─────────────────────────────────────────
  { id: "UR_0",      x: 122, y: 5,   type: "intersection", accessible: true  },
  { id: "ELEV_R",    x: 122, y: 6,   type: "exit",         accessible: true,  label: "Right Elevator" },
  { id: "STAIR_R",   x: 122, y: 22,  type: "exit",         accessible: false, label: "Right Stairs"   },
  { id: "UR_1",      x: 122, y: 28,  type: "intersection", accessible: true,  label: "Right Doors"    },
  { id: "UR_2",      x: 122, y: 47,  type: "intersection", accessible: true  },
  { id: "UR_CORN",   x: 122, y: 52,  type: "intersection", accessible: true,  label: "Upper Right Corner" },

  // ── ENTRANCE ────────────────────────────────────────────────
  { id: "ENTRANCE",  x: 30,  y: 66,  type: "door",         accessible: true,  label: "Main Entrance" },

  // ── CONNECTION CORRIDOR (x=122, y=52→266) ──────────────────
  { id: "CN_TOP",  x: 122, y: 52,  type: "intersection", accessible: true, label: "Connection Top" },
  { id: "CN_1",    x: 122, y: 90,  type: "intersection", accessible: true },
  { id: "CN_MID",  x: 122, y: 159, type: "intersection", accessible: true, label: "Connection Mid" },
  { id: "CN_2",    x: 122, y: 220, type: "intersection", accessible: true },
  { id: "CN_BOT",  x: 122, y: 258, type: "intersection", accessible: true, label: "Connection Bottom" },

  // ── LOWER TOP BAR (y=266, x=0→122) ─────────────────────────
  { id: "EXIT_LEFT", x: 0,   y: 266, type: "exit",         accessible: true,  label: "Exit — Left"   },
  { id: "LL_JCT",   x: 8,   y: 266, type: "intersection", accessible: true,  label: "Lower Left Junction" },
  { id: "LT_30",    x: 30,  y: 266, type: "intersection", accessible: true  },
  { id: "LT_MID",   x: 58,  y: 266, type: "intersection", accessible: true,  label: "Lower Top Mid"  },
  { id: "LT_86",    x: 86,  y: 266, type: "intersection", accessible: true  },
  { id: "LR_JCT",   x: 122, y: 266, type: "intersection", accessible: true  },

  // EXIT_MID — interior top-right of lower U (opening in south wall of top bar)
  { id: "EXIT_MID",  x: 84,  y: 278, type: "exit",         accessible: true,  label: "Exit — Middle" },

  // ── LOWER LEFT LEG (x=8, y=266→390) ───────────────────────
  { id: "LL_1",   x: 8,  y: 295,  type: "intersection", accessible: true },
  { id: "LL_2",   x: 8,  y: 330,  type: "intersection", accessible: true },
  { id: "LL_3",   x: 8,  y: 362,  type: "intersection", accessible: true },
  { id: "LL_BOT", x: 8,  y: 386,  type: "intersection", accessible: true, label: "Lower Bottom Left" },

  // ── LOWER BOTTOM BAR (y=386, x=8→122) ──────────────────────
  { id: "LB_1",   x: 36,  y: 386, type: "intersection", accessible: true },
  { id: "LB_2",   x: 64,  y: 386, type: "intersection", accessible: true },
  { id: "LB_3",   x: 92,  y: 386, type: "intersection", accessible: true },
  { id: "LB_R",   x: 122, y: 386, type: "intersection", accessible: true, label: "Lower Bottom Right" },

  // ── LOWER RIGHT LEG (x=122, y=386→266, same x as connection) ─
  { id: "LR_1",   x: 122, y: 362,  type: "intersection", accessible: true },
  { id: "LR_2",   x: 122, y: 330,  type: "intersection", accessible: true },
  { id: "LR_3",   x: 122, y: 298,  type: "intersection", accessible: true },

  // ── LOUNGE + EXIT LOUNGE ────────────────────────────────────
  { id: "LOUNGE",     x: 138, y: 340, type: "refuge", accessible: true, label: "Lounge"        },
  { id: "EXIT_LOUNGE",x: 138, y: 374, type: "exit",   accessible: true, label: "Exit — Lounge" },
];

export const EDGES = [
  // Left bay
  { from: "ELEV_L",  to: "UL_0",    type: "elevator", accessible: true  },
  { from: "STAIR_L", to: "UL_1",    type: "stairs",   accessible: false },
  { from: "UL_0",    to: "UL_1",    type: "corridor", accessible: true  },
  { from: "UL_1",    to: "UL_2",    type: "corridor", accessible: true  },

  // Top walkway (left → right)
  { from: "UL_0",   to: "UT_20",   type: "corridor", accessible: true },
  { from: "UT_20",  to: "UT_40",   type: "corridor", accessible: true },
  { from: "UT_40",  to: "UT_58",   type: "corridor", accessible: true },
  { from: "UT_58",  to: "UT_76",   type: "corridor", accessible: true },
  { from: "UT_76",  to: "UT_96",   type: "corridor", accessible: true },
  { from: "UT_96",  to: "UT_112",  type: "corridor", accessible: true },
  { from: "UT_112", to: "UR_0",    type: "corridor", accessible: true },

  // Right bay
  { from: "UR_0",    to: "ELEV_R",   type: "elevator", accessible: true  },
  { from: "UR_0",    to: "UR_1",     type: "corridor", accessible: true  },
  { from: "UR_1",    to: "STAIR_R",  type: "stairs",   accessible: false },
  { from: "UR_1",    to: "UR_2",     type: "corridor", accessible: true  },
  { from: "UR_2",    to: "UR_CORN",  type: "corridor", accessible: true  },

  // Left doors → entrance
  { from: "UL_2",    to: "ENTRANCE", type: "door",     accessible: true },

  // Upper right corner → connection (x=122, seamless vertical)
  { from: "UR_CORN", to: "CN_TOP",   type: "corridor", accessible: true },

  // Connection corridor (going down)
  { from: "CN_TOP",  to: "CN_1",     type: "corridor", accessible: true },
  { from: "CN_1",    to: "CN_MID",   type: "corridor", accessible: true },
  { from: "CN_MID",  to: "CN_2",     type: "corridor", accessible: true },
  { from: "CN_2",    to: "CN_BOT",   type: "corridor", accessible: true },

  // Connection bottom → lower right junction (x=122, seamless)
  { from: "CN_BOT",  to: "LR_JCT",   type: "corridor", accessible: true },

  // Lower top bar (left → right)
  { from: "EXIT_LEFT",to: "LL_JCT",  type: "corridor", accessible: true },
  { from: "LL_JCT",  to: "LT_30",    type: "corridor", accessible: true },
  { from: "LT_30",   to: "LT_MID",   type: "corridor", accessible: true },
  { from: "LT_MID",  to: "LT_86",    type: "corridor", accessible: true },
  { from: "LT_86",   to: "LR_JCT",   type: "corridor", accessible: true },

  // EXIT_MID branches off top bar (interior side)
  { from: "LT_86",   to: "EXIT_MID", type: "corridor", accessible: true },

  // Lower left leg (top → bottom)
  { from: "LL_JCT",  to: "LL_1",     type: "corridor", accessible: true },
  { from: "LL_1",    to: "LL_2",     type: "corridor", accessible: true },
  { from: "LL_2",    to: "LL_3",     type: "corridor", accessible: true },
  { from: "LL_3",    to: "LL_BOT",   type: "corridor", accessible: true },

  // Lower bottom bar (left → right)
  { from: "LL_BOT",  to: "LB_1",     type: "corridor", accessible: true },
  { from: "LB_1",    to: "LB_2",     type: "corridor", accessible: true },
  { from: "LB_2",    to: "LB_3",     type: "corridor", accessible: true },
  { from: "LB_3",    to: "LB_R",     type: "corridor", accessible: true },

  // Lower right leg (bottom → top, x=122 = same as connection above)
  { from: "LB_R",    to: "LR_1",     type: "corridor", accessible: true },
  { from: "LR_1",    to: "LR_2",     type: "corridor", accessible: true },
  { from: "LR_2",    to: "LR_3",     type: "corridor", accessible: true },
  { from: "LR_3",    to: "LR_JCT",   type: "corridor", accessible: true },

  // Lounge branch
  { from: "LR_2",    to: "LOUNGE",      type: "corridor", accessible: true },
  { from: "LOUNGE",  to: "EXIT_LOUNGE", type: "corridor", accessible: true },
];

export const BEACONS = [
  {
    id: "BEACON_1",
    uuid: "426C7565-4368-6172-6D42-6561636F6E73",
    major: 3838, minor: 4949,
    nodeId: "UT_58",
    label: "Beacon 1 — Upper Center",
  },
  {
    id: "BEACON_2",
    uuid: "426C7565-4368-6172-6D42-6561636F6E73",
    major: 3838, minor: 4950,
    nodeId: "LT_MID",
    label: "Beacon 2 — Lower Top Center",
  },
  {
    id: "BEACON_3",
    uuid: "426C7565-4368-6172-6D42-6561636F6E73",
    major: 3838, minor: 4951,
    nodeId: "CN_MID",
    label: "Beacon 3 — Connection Corridor",
  },
];

// Rooms — visual only, adjacent to corridors, never overlapping
export const ZONES = [
  // North of building
  { name: "Room 4",  x: 0,   y: -24, w: 28,  h: 24, color: "#C8E6C9" },
  { name: "Room 5",  x: 28,  y: -24, w: 28,  h: 24, color: "#C8E6C9" },
  { name: "Room 6",  x: 56,  y: -24, w: 28,  h: 24, color: "#C8E6C9" },
  { name: "Room 7",  x: 84,  y: -24, w: 32,  h: 24, color: "#C8E6C9" },

  // Lecture Hall 3 — inside upper section (south of top walkway)
  { name: "Lecture Hall 3", x: 12, y: 10, w: 104, h: 42, color: "#A5D1FF" },

  // Extra rooms above lower U
  { name: "Extra Room 1", x: 0,   y: 234, w: 34, h: 24, color: "#FFE0B2" },
  { name: "Extra Room 2", x: 34,  y: 234, w: 34, h: 24, color: "#FFE0B2" },
  { name: "Extra Room 3", x: 68,  y: 234, w: 30, h: 24, color: "#FFE0B2" },

  // Lower interior (inside the U: x=16..116, y=274..378)
  { name: "Lecture Hall 1", x: 16, y: 274, w: 44, h: 52, color: "#A5D1FF" },
  { name: "Lecture Hall 2", x: 16, y: 326, w: 44, h: 52, color: "#A5D1FF" },
  { name: "Classroom 5",    x: 60, y: 326, w: 28, h: 26, color: "#C8E6C9" },
  { name: "Classroom 6",    x: 60, y: 352, w: 28, h: 26, color: "#C8E6C9" },

  // Right of connection corridor (x=134..158)
  { name: "Classroom 1", x: 134, y: 110, w: 24, h: 48, color: "#C8E6C9" },
  { name: "Classroom 2", x: 134, y: 158, w: 24, h: 48, color: "#C8E6C9" },

  // Left of lower left leg (x=-24..0)
  { name: "Classroom 3",  x: -24, y: 274, w: 24, h: 36, color: "#C8E6C9" },
  { name: "Classroom 4",  x: -24, y: 310, w: 24, h: 36, color: "#C8E6C9" },
  { name: "Classroom 10", x: -24, y: 346, w: 24, h: 36, color: "#C8E6C9" },

  // Lounge — right of right leg (x=134..158)
  { name: "Lounge", x: 134, y: 314, w: 24, h: 58, color: "#A8E6CF" },

  // Below bottom bar
  { name: "Classroom 9", x: 8,   y: 394, w: 24, h: 20, color: "#C8E6C9" },
  { name: "Classroom 8", x: 32,  y: 394, w: 28, h: 20, color: "#C8E6C9" },
  { name: "Classroom 7", x: 60,  y: 394, w: 28, h: 20, color: "#C8E6C9" },
];

export const CORRIDORS = [
  { x: 0,   y: 0,   w: 128, h: 10,  label: "Upper Top Walkway"   },
  { x: 0,   y: 0,   w: 12,  h: 52,  label: "Upper Left Bay"      },
  { x: 116, y: 0,   w: 12,  h: 52,  label: "Upper Right Bay"     },
  { x: 116, y: 52,  w: 12,  h: 214, label: "Connection Corridor" },
  { x: 0,   y: 258, w: 128, h: 16,  label: "Lower Top Bar"       },
  { x: 0,   y: 266, w: 16,  h: 128, label: "Lower Left Leg"      },
  { x: 0,   y: 378, w: 128, h: 16,  label: "Lower Bottom Bar"    },
  { x: 116, y: 266, w: 12,  h: 128, label: "Lower Right Leg"     },
];

export const WALLS = [
  // Upper north wall
  { x1: 0,   y1: 0,   x2: 128, y2: 0   },
  // Left bay outer west wall
  { x1: 0,   y1: 0,   x2: 0,   y2: 52  },
  // Right bay outer east wall
  { x1: 128, y1: 0,   x2: 128, y2: 52  },
  // LH3 walls (top, left, right, bottom)
  { x1: 12,  y1: 10,  x2: 116, y2: 10  },
  { x1: 12,  y1: 10,  x2: 12,  y2: 52  },
  { x1: 116, y1: 10,  x2: 116, y2: 52  },
  { x1: 12,  y1: 52,  x2: 116, y2: 52  },
  // Connection west wall
  { x1: 116, y1: 52,  x2: 116, y2: 266 },
  // Connection east wall
  { x1: 128, y1: 52,  x2: 128, y2: 266 },
  // Lower top bar
  { x1: 0,   y1: 258, x2: 128, y2: 258 },
  { x1: 0,   y1: 274, x2: 116, y2: 274 },
  // Lower left leg
  { x1: 0,   y1: 266, x2: 0,   y2: 394 },
  { x1: 16,  y1: 274, x2: 16,  y2: 394 },
  // Lower right leg
  { x1: 116, y1: 274, x2: 116, y2: 394 },
  { x1: 128, y1: 266, x2: 128, y2: 394 },
  // Lower bottom bar
  { x1: 0,   y1: 378, x2: 128, y2: 378 },
  { x1: 0,   y1: 394, x2: 128, y2: 394 },
];

export const FIRE_ZONES = {
  upper_left: {
    label: "Fire — Upper Left",
    blockedNodes: ["ELEV_L", "STAIR_L"],
    blockedEdges: [
      { from: "ELEV_L",  to: "UL_0" },
      { from: "STAIR_L", to: "UL_1" },
    ],
  },
  upper_right: {
    label: "Fire — Upper Right",
    blockedNodes: ["ELEV_R", "STAIR_R"],
    blockedEdges: [
      { from: "UR_0", to: "ELEV_R"  },
      { from: "UR_1", to: "STAIR_R" },
    ],
  },
  exit_left: {
    label: "Fire — Left Exit",
    blockedNodes: ["EXIT_LEFT"],
    blockedEdges: [{ from: "LL_JCT", to: "EXIT_LEFT" }],
  },
  exit_mid: {
    label: "Fire — Middle Exit",
    blockedNodes: ["EXIT_MID"],
    blockedEdges: [{ from: "LT_86", to: "EXIT_MID" }],
  },
  exit_lounge: {
    label: "Fire — Lounge Exit",
    blockedNodes: ["EXIT_LOUNGE"],
    blockedEdges: [{ from: "LOUNGE", to: "EXIT_LOUNGE" }],
  },
  connection: {
    label: "Fire — Connection Corridor",
    blockedNodes: ["CN_MID"],
    blockedEdges: [
      { from: "CN_1",   to: "CN_MID" },
      { from: "CN_MID", to: "CN_2"   },
    ],
  },
};
