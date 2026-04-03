// ============================================================
// SMART NAVIGATION FILTER — Tillet Building
// L-shape: Upper U + 214ft Corridor + Lower U
// Scale: 1 unit = 4 feet | Y increases DOWNWARD
// X mirrored for correct 3D camera orientation
// ============================================================

export const BUILDING = {
  name: "Tillet_Building",
  width: 38,
  height: 110,
  floor: 1,
};

// All coords = partner's coords / 4 (scale: 1 unit = 4 feet)
export const NODES = [
  // === UPPER LEFT BAY ===
  { id: "UC_L0",         x: 27.5, y: 1.25, type: "intersection", accessible: true },
  { id: "UC_L1",         x: 27.5, y: 5,    type: "intersection", accessible: true },
  { id: "UC_L2",         x: 27.5, y: 9,    type: "intersection", accessible: true },
  { id: "UC_L3",         x: 27.5, y: 12,   type: "intersection", accessible: true, label: "Upper Left Corner" },

  // === TOP STRIP (y≈1.25) ===
  { id: "UC_T1", x: 24, y: 1.25, type: "intersection", accessible: true },
  { id: "UC_T2", x: 20, y: 1.25, type: "intersection", accessible: true },
  { id: "UC_T3", x: 16, y: 1.25, type: "intersection", accessible: true, label: "Upper Center" },
  { id: "UC_T4", x: 12, y: 1.25, type: "intersection", accessible: true },
  { id: "UC_T5", x: 8,  y: 1.25, type: "intersection", accessible: true },
  { id: "UC_T6", x: 4,  y: 1.25, type: "intersection", accessible: true },

  // === UPPER RIGHT BAY ===
  { id: "UC_R0",         x: 2,  y: 1.25, type: "intersection", accessible: true },
  { id: "UC_R1",         x: 2,  y: 5,    type: "intersection", accessible: true },
  { id: "UC_R2",         x: 2,  y: 9,    type: "intersection", accessible: true },
  { id: "UC_R3",         x: 2,  y: 12,   type: "intersection", accessible: true },
  { id: "UC_R_CORNER",   x: 2,  y: 13,   type: "intersection", accessible: true, label: "Upper Right Corner" },

  // === ENTRANCE (stairs — exit + fire zone for demo) ===
  { id: "ENTRANCE", x: 21.5, y: 16, type: "exit", accessible: true, label: "Entrance (Stairs)" },

  // === ROOM DOORS ===
  { id: "ROOM4",  x: 24, y: 0.5, type: "door", accessible: true, label: "Room 4" },
  { id: "ROOM5",  x: 20, y: 0.5, type: "door", accessible: true, label: "Room 5" },
  { id: "ROOM6",  x: 16, y: 0.5, type: "door", accessible: true, label: "Room 6" },
  { id: "ROOM7",  x: 12, y: 0.5, type: "door", accessible: true, label: "Room 7" },
  { id: "LH3_DL", x: 24, y: 12.5, type: "door", accessible: true, label: "Lecture Hall 3 (Left)" },
  { id: "LH3_DR", x: 5,  y: 12.5, type: "door", accessible: true, label: "Lecture Hall 3 (Right)" },

  // === CONNECTION CORRIDOR (x≈2, y=13..66.5, 214ft!) ===
  { id: "CONN_TOP", x: 2, y: 13,   type: "intersection", accessible: true, label: "Connection Top" },
  { id: "CONN_1",   x: 2, y: 17,   type: "intersection", accessible: true },
  { id: "CONN_2",   x: 2, y: 21,   type: "intersection", accessible: true },
  { id: "CONN_3",   x: 2, y: 25,   type: "intersection", accessible: true },
  { id: "CONN_4",   x: 2, y: 29,   type: "intersection", accessible: true },
  { id: "CONN_5",   x: 2, y: 33,   type: "intersection", accessible: true },
  { id: "CONN_6",   x: 2, y: 37,   type: "intersection", accessible: true },
  { id: "CONN_Q2",  x: 2, y: 40,   type: "intersection", accessible: true, label: "Corridor Mid" },
  { id: "CONN_7",   x: 2, y: 44,   type: "intersection", accessible: true },
  { id: "CONN_8",   x: 2, y: 48,   type: "intersection", accessible: true },
  { id: "CONN_9",   x: 2, y: 52,   type: "intersection", accessible: true },
  { id: "CONN_10",  x: 2, y: 56,   type: "intersection", accessible: true },
  { id: "CONN_11",  x: 2, y: 60,   type: "intersection", accessible: true },
  { id: "CONN_BOT", x: 2, y: 66.5, type: "intersection", accessible: true, label: "Connection Bottom" },

  // === DOORS along corridor ===
  { id: "CR1", x: -1.5, y: 34,  type: "door", accessible: true, label: "Classroom 1" },
  { id: "CR2", x: -1.5, y: 47,  type: "door", accessible: true, label: "Classroom 2" },

  // === LOWER TOP BAR (y≈66.5) ===
  { id: "LR_TOP", x: 2,    y: 66.5, type: "intersection", accessible: true },
  { id: "LT_26",  x: 6.5,  y: 66.5, type: "intersection", accessible: true },
  { id: "LT_42",  x: 10.5, y: 66.5, type: "intersection", accessible: true },
  { id: "LT_MID", x: 14.5, y: 66.5, type: "intersection", accessible: true, label: "Lower Top Center" },
  { id: "LT_74",  x: 18.5, y: 66.5, type: "intersection", accessible: true },
  { id: "LT_90",  x: 22.5, y: 66.5, type: "intersection", accessible: true },
  { id: "LT_L",   x: 27,   y: 66.5, type: "intersection", accessible: true, label: "Lower Left Junction" },
  { id: "EXIT_LEFT", x: 28, y: 66.5, type: "exit", accessible: true, label: "Exit — Left" },

  // === EXTRA ROOM DOORS ===
  { id: "EXTRA1", x: 22.5, y: 65, type: "door", accessible: true, label: "Extra Room 1" },
  { id: "EXTRA2", x: 14.5, y: 65, type: "door", accessible: true, label: "Extra Room 2" },
  { id: "EXTRA3", x: 7.5,  y: 65, type: "door", accessible: true, label: "Extra Room 3" },

  // === CENTER EXIT ===
  { id: "EXIT_CENTER", x: 8, y: 81, type: "exit", accessible: true, label: "Center Exit" },

  // === LOWER LEFT LEG (x≈27, y=66.5..96.5) ===
  { id: "LL_1",   x: 27, y: 70.5, type: "intersection", accessible: true },
  { id: "LL_2",   x: 27, y: 74.5, type: "intersection", accessible: true },
  { id: "LL_3",   x: 27, y: 78.5, type: "intersection", accessible: true },
  { id: "LL_4",   x: 27, y: 82.5, type: "intersection", accessible: true },
  { id: "LL_5",   x: 27, y: 86.5, type: "intersection", accessible: true },
  { id: "LL_6",   x: 27, y: 90.5, type: "intersection", accessible: true },
  { id: "LL_BOT", x: 27, y: 96.5, type: "intersection", accessible: true, label: "Lower Bottom Left" },

  // === LEFT CLASSROOM DOORS ===
  { id: "CR3",  x: 28.5, y: 73.25, type: "door", accessible: true, label: "Classroom 3" },
  { id: "CR4",  x: 28.5, y: 82.75, type: "door", accessible: true, label: "Classroom 4" },
  { id: "CR10", x: 28.5, y: 92,    type: "door", accessible: true, label: "Classroom 10" },

  // === CENTER BLOCK DOORS ===
  { id: "LH1", x: 16.5, y: 75,   type: "door", accessible: true, label: "Lecture Hall 1" },
  { id: "LH2", x: 16.5, y: 88,   type: "door", accessible: true, label: "Lecture Hall 2" },
  { id: "CR5", x: 11.5, y: 84.75, type: "door", accessible: true, label: "Classroom 5" },
  { id: "CR6", x: 11.5, y: 91.25, type: "door", accessible: true, label: "Classroom 6" },

  // === LOWER BOTTOM BAR (y≈96.5) ===
  { id: "LB_1", x: 23, y: 96.5, type: "intersection", accessible: true },
  { id: "LB_2", x: 19, y: 96.5, type: "intersection", accessible: true },
  { id: "LB_3", x: 15, y: 96.5, type: "intersection", accessible: true },
  { id: "LB_4", x: 11, y: 96.5, type: "intersection", accessible: true },
  { id: "LB_5", x: 6.5, y: 96.5, type: "intersection", accessible: true },
  { id: "LB_R", x: 2,  y: 96.5, type: "intersection", accessible: true, label: "Lower Bottom Right" },

  // === BOTTOM CLASSROOM DOORS ===
  { id: "CR9", x: 23, y: 98, type: "door", accessible: true, label: "Classroom 9" },
  { id: "CR8", x: 15, y: 98, type: "door", accessible: true, label: "Classroom 8" },
  { id: "CR7", x: 10, y: 98, type: "door", accessible: true, label: "Classroom 7" },

  // === LOWER RIGHT LEG (x≈2, y=96.5..66.5) ===
  { id: "LR_1", x: 2, y: 92.5, type: "intersection", accessible: true },
  { id: "LR_2", x: 2, y: 88.5, type: "intersection", accessible: true },
  { id: "LR_3", x: 2, y: 84.5, type: "intersection", accessible: true },
  { id: "LR_4", x: 2, y: 80.5, type: "intersection", accessible: true },
  { id: "LR_5", x: 2, y: 76.5, type: "intersection", accessible: true },
  { id: "LR_6", x: 2, y: 72.5, type: "intersection", accessible: true },

  // === LOUNGE + EXIT RIGHT ===
  { id: "LOUNGE",     x: 2,   y: 85.5, type: "door", accessible: true, label: "Lounge" },
  { id: "EXIT_RIGHT", x: 1, y: 85, type: "exit",   accessible: true, label: "Exit — Right" },
];

export const EDGES = [
  // Upper left bay
  { from: "UC_L0", to: "UC_L1", type: "corridor", accessible: true },
  { from: "UC_L1", to: "UC_L2", type: "corridor", accessible: true },
  { from: "UC_L2", to: "UC_L3", type: "corridor", accessible: true },
  // Top strip
  { from: "UC_L0", to: "UC_T1", type: "corridor", accessible: true },
  { from: "UC_T1", to: "UC_T2", type: "corridor", accessible: true },
  { from: "UC_T2", to: "UC_T3", type: "corridor", accessible: true },
  { from: "UC_T3", to: "UC_T4", type: "corridor", accessible: true },
  { from: "UC_T4", to: "UC_T5", type: "corridor", accessible: true },
  { from: "UC_T5", to: "UC_T6", type: "corridor", accessible: true },
  { from: "UC_T6", to: "UC_R0", type: "corridor", accessible: true },
  // Upper right bay
  { from: "UC_R0", to: "UC_R1",         type: "corridor", accessible: true },
  { from: "UC_R1", to: "UC_R2",         type: "corridor", accessible: true },
  { from: "UC_R2", to: "UC_R3",         type: "corridor", accessible: true },
  { from: "UC_R3", to: "UC_R_CORNER",   type: "corridor", accessible: true },
  // Room doors
  { from: "UC_T1", to: "ROOM4",  type: "door", accessible: true },
  { from: "UC_T2", to: "ROOM5",  type: "door", accessible: true },
  { from: "UC_T3", to: "ROOM6",  type: "door", accessible: true },
  { from: "UC_T4", to: "ROOM7",  type: "door", accessible: true },
  { from: "UC_L3", to: "LH3_DL", type: "door", accessible: true },
  { from: "UC_R3", to: "LH3_DR", type: "door", accessible: true },
  { from: "UC_L3", to: "ENTRANCE", type: "door", accessible: true },
  // Upper right → connection
  { from: "UC_R_CORNER", to: "CONN_TOP", type: "corridor", accessible: true },
  // Connection corridor (214ft)
  { from: "CONN_TOP", to: "CONN_1",   type: "corridor", accessible: true },
  { from: "CONN_1",   to: "CONN_2",   type: "corridor", accessible: true },
  { from: "CONN_2",   to: "CONN_3",   type: "corridor", accessible: true },
  { from: "CONN_3",   to: "CONN_4",   type: "corridor", accessible: true },
  { from: "CONN_4",   to: "CONN_5",   type: "corridor", accessible: true },
  { from: "CONN_5",   to: "CONN_6",   type: "corridor", accessible: true },
  { from: "CONN_6",   to: "CONN_Q2",  type: "corridor", accessible: true },
  { from: "CONN_Q2",  to: "CONN_7",   type: "corridor", accessible: true },
  { from: "CONN_7",   to: "CONN_8",   type: "corridor", accessible: true },
  { from: "CONN_8",   to: "CONN_9",   type: "corridor", accessible: true },
  { from: "CONN_9",   to: "CONN_10",  type: "corridor", accessible: true },
  { from: "CONN_10",  to: "CONN_11",  type: "corridor", accessible: true },
  { from: "CONN_11",  to: "CONN_BOT", type: "corridor", accessible: true },
  { from: "CONN_BOT", to: "LR_TOP",   type: "corridor", accessible: true },
  // Corridor classroom doors
  { from: "CONN_5",  to: "CR1", type: "door", accessible: true },
  { from: "CONN_8",  to: "CR2", type: "door", accessible: true },
  // Lower top bar
  { from: "LR_TOP", to: "LT_26",  type: "corridor", accessible: true },
  { from: "LT_26",  to: "LT_42",  type: "corridor", accessible: true },
  { from: "LT_42",  to: "LT_MID", type: "corridor", accessible: true },
  { from: "LT_MID", to: "LT_74",  type: "corridor", accessible: true },
  { from: "LT_74",  to: "LT_90",  type: "corridor", accessible: true },
  { from: "LT_90",  to: "LT_L",   type: "corridor", accessible: true },
  { from: "LT_L",   to: "EXIT_LEFT", type: "corridor", accessible: true },
  // Extra rooms + center exit
  { from: "LT_90",  to: "EXTRA1", type: "door", accessible: true },
  { from: "LT_MID", to: "EXTRA2", type: "door", accessible: true },
  { from: "LT_26",  to: "EXTRA3", type: "door", accessible: true },
  { from: "LR_4", to: "EXIT_CENTER", type: "corridor", accessible: true },
  // Lower left leg
  { from: "LT_L",   to: "LL_1",   type: "corridor", accessible: true },
  { from: "LL_1",   to: "LL_2",   type: "corridor", accessible: true },
  { from: "LL_2",   to: "LL_3",   type: "corridor", accessible: true },
  { from: "LL_3",   to: "LL_4",   type: "corridor", accessible: true },
  { from: "LL_4",   to: "LL_5",   type: "corridor", accessible: true },
  { from: "LL_5",   to: "LL_6",   type: "corridor", accessible: true },
  { from: "LL_6",   to: "LL_BOT", type: "corridor", accessible: true },
  // Left classroom + center block doors
  { from: "LL_1", to: "CR3",  type: "door", accessible: true },
  { from: "LL_3", to: "CR4",  type: "door", accessible: true },
  { from: "LL_5", to: "CR10", type: "door", accessible: true },
  { from: "LL_1", to: "LH1",  type: "door", accessible: true },
  { from: "LL_4", to: "LH2",  type: "door", accessible: true },
  // Lower bottom bar
  { from: "LL_BOT", to: "LB_1", type: "corridor", accessible: true },
  { from: "LB_1",   to: "LB_2", type: "corridor", accessible: true },
  { from: "LB_2",   to: "LB_3", type: "corridor", accessible: true },
  { from: "LB_3",   to: "LB_4", type: "corridor", accessible: true },
  { from: "LB_4",   to: "LB_5", type: "corridor", accessible: true },
  { from: "LB_5",   to: "LB_R", type: "corridor", accessible: true },
  // Bottom classroom + center block doors
  { from: "LB_1", to: "CR9", type: "door", accessible: true },
  { from: "LB_3", to: "CR8", type: "door", accessible: true },
  { from: "LB_4", to: "CR7", type: "door", accessible: true },
  { from: "LB_2", to: "CR5", type: "door", accessible: true },
  { from: "LB_3", to: "CR6", type: "door", accessible: true },
  // Lower right leg
  { from: "LB_R",  to: "LR_1",   type: "corridor", accessible: true },
  { from: "LR_1",  to: "LR_2",   type: "corridor", accessible: true },
  { from: "LR_2",  to: "LR_3",   type: "corridor", accessible: true },
  { from: "LR_3",  to: "LR_4",   type: "corridor", accessible: true },
  { from: "LR_4",  to: "LR_5",   type: "corridor", accessible: true },
  { from: "LR_5",  to: "LR_6",   type: "corridor", accessible: true },
  { from: "LR_6",  to: "LR_TOP", type: "corridor", accessible: true },
  // Lounge branch
  { from: "LR_3",   to: "LOUNGE",     type: "corridor", accessible: true },
  { from: "LOUNGE", to: "EXIT_RIGHT", type: "corridor", accessible: true },
];

export const BEACONS = [
  { id: "BEACON_1", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4949, nodeId: "UC_T3",   label: "Beacon 1 — Upper Top Center" },
  { id: "BEACON_2", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4950, nodeId: "UC_L2",   label: "Beacon 2 — Upper Left Mid" },
  { id: "BEACON_3", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4951, nodeId: "CONN_Q2", label: "Beacon 3 — Corridor Mid" },
  { id: "BEACON_4", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4952, nodeId: "LT_MID",  label: "Beacon 4 — Lower Top Center" },
  { id: "BEACON_5", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4953, nodeId: "LL_3",    label: "Beacon 5 — Lower Left Leg" },
  { id: "BEACON_6", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4954, nodeId: "LB_3",    label: "Beacon 6 — Lower Bottom" },
  { id: "BEACON_7", uuid: "426C7565-4368-6172-6D42-6561636F6E73", major: 3838, minor: 4955, nodeId: "LR_3",    label: "Beacon 7 — Lower Right Leg" },
];

export const ZONES = [
  // === NORTH — Rooms above top strip ===
  { name: "Room 4",          x: 21, y: -6,    w: 7,    h: 6,    color: "#C8E6C9" },
  { name: "Room 5",          x: 14, y: -6,    w: 7,    h: 6,    color: "#C8E6C9" },
  { name: "Room 6",          x: 7,  y: -6,    w: 7,    h: 6,    color: "#C8E6C9" },
  { name: "Room 7",          x: 0,  y: -6,    w: 7,    h: 6,    color: "#C8E6C9" },

  // === NORTH — Elevator/Stairs wings (OUTSIDE hallway) ===
  { name: "Elevator",        x: 29, y: -2,    w: 4,    h: 5,    color: "#FFD54F" },
  { name: "Stairs",           x: 29, y: 3,     w: 4,    h: 6,    color: "#FFAB91" },
  { name: "Elevator",        x: -4, y: -2,    w: 4,    h: 5,    color: "#FFD54F" },
  { name: "Stairs",           x: -4, y: 3,     w: 4,    h: 6,    color: "#FFAB91" },

  // === INSIDE UPPER U ===
  { name: "Lecture\nHall 3", x: 3,  y: 2.5,   w: 23,   h: 8,    color: "#A5D1FF" },

  // === ALONG CORRIDOR — Right side rooms ===
  { name: "Classroom 1",    x: -6,   y: 27.5, w: 6,    h: 13,  color: "#C8E6C9" },
  { name: "Classroom 2",    x: -6,   y: 40.5, w: 6,    h: 13,  color: "#C8E6C9" },

  // === EXTRA ROOMS (above lower top bar) ===
  { name: "Extra\nRoom 1",  x: 20.5, y: 58.5, w: 8.5,  h: 6,   color: "#FFE0B2" },
  { name: "Extra\nRoom 2",  x: 12,   y: 58.5, w: 8.5,  h: 6,   color: "#FFE0B2" },
  { name: "Extra\nRoom 3",  x: 4,    y: 58.5, w: 8,    h: 6,   color: "#FFE0B2" },

  // === LEFT LEG — Classrooms OUTSIDE (beyond left wall at x=29) ===
  { name: "Classroom 3",    x: 29,   y: 68.5, w: 6,    h: 9.5, color: "#C8E6C9" },
  { name: "Classroom 4",    x: 29,   y: 78,   w: 6,    h: 9.5, color: "#C8E6C9" },
  { name: "Classroom 10",   x: 29,   y: 87.5, w: 6,    h: 7,   color: "#C8E6C9" },

  // === CENTER BLOCK (inside lower U) — SMALLER to leave hallway around it ===
  { name: "Lecture\nHall 1", x: 12, y: 71, w: 10, h: 10.5, color: "#A5D1FF" },
  { name: "Lecture\nHall 2", x: 12, y: 81.5, w: 10, h: 10.5, color: "#A5D1FF" },
  { name: "Classroom 5",    x: 7,  y: 81.5, w: 5,  h: 5.25, color: "#C8E6C9" },
  { name: "Classroom 6",    x: 7,  y: 86.75, w: 5, h: 5.25, color: "#C8E6C9" },

  // === RIGHT LEG — Lounge inside (recessed inward, between outer wall and center block) ===
  { name: "Lounge",         x: 0,    y: 79,   w: 4,    h: 13.5, color: "#A8E6CF" },

  // === BOTTOM — Classrooms below bottom bar ===
  { name: "Classroom 9",    x: 21.5, y: 98.5, w: 5.5,  h: 5.5, color: "#C8E6C9" },
  { name: "Classroom 8",    x: 14.5, y: 98.5, w: 7,    h: 5.5, color: "#C8E6C9" },
  { name: "Classroom 7",    x: 8,    y: 98.5, w: 6.5,  h: 5.5, color: "#C8E6C9" },
];

export const CORRIDORS = [
  { x: 0,    y: 0,    w: 29,  h: 2.5,  label: "Upper Top Strip" },
  { x: 26,   y: 0,    w: 3,   h: 13,   label: "Upper Left Bay" },
  { x: 0,    y: 0,    w: 3,   h: 13,   label: "Upper Right Bay" },
  { x: 0,    y: 10.5, w: 29,  h: 2.5,  label: "Upper Bottom Hall" },
  { x: 16,   y: 13,   w: 10,  h: 3,    label: "Entrance Area" },
  { x: 0,    y: 13,   w: 4,   h: 53.5, label: "Connection Corridor" },
  { x: 0,    y: 64.5, w: 29,  h: 4,    label: "Lower Top Bar" },
  { x: 25,   y: 64.5, w: 4,   h: 34,   label: "Lower Left Leg" },
  { x: 0,    y: 94.5, w: 29,  h: 4,    label: "Lower Bottom Bar" },
  { x: 0,    y: 64.5, w: 4,   h: 34,   label: "Lower Right Leg" },
  // Inner hallways around center block (donut corridor)
  { x: 4,    y: 68.5, w: 3,   h: 23.5, label: "Inner Right Hall" },
  { x: 22,   y: 68.5, w: 3,   h: 23.5, label: "Inner Left Hall" },
  { x: 7,    y: 68.5, w: 15,  h: 2.5,  label: "Inner Top Hall" },
  { x: 7,    y: 92,   w: 15,  h: 2.5,  label: "Inner Bottom Hall" },
];

export const WALLS = [
  // ================================================================
  // UPPER SECTION
  // ================================================================
  
  // Rooms 4-7 top wall
  { x1: 0, y1: -6, x2: 29, y2: -6 },
  // Room dividers
  { x1: 7, y1: -6, x2: 7, y2: 0 },
  { x1: 14, y1: -6, x2: 14, y2: 0 },
  { x1: 21, y1: -6, x2: 21, y2: 0 },
  // North hallway wall (rooms bottom / hallway top)
  { x1: 0, y1: 0, x2: 29, y2: 0 },

  // Left wing — Elevator + Stairs (outside at x=29..33)
  { x1: 29, y1: -2, x2: 33, y2: -2 },   // top
  { x1: 33, y1: -2, x2: 33, y2: 9 },    // outer
  { x1: 29, y1: 9, x2: 33, y2: 9 },     // bottom
  { x1: 29, y1: 3, x2: 33, y2: 3 },     // divider elev/stairs

  // Right wing — Elevator + Stairs (outside at x=-4..0)
  { x1: -4, y1: -2, x2: 0, y2: -2 },    // top
  { x1: -4, y1: -2, x2: -4, y2: 9 },    // outer
  { x1: -4, y1: 9, x2: 0, y2: 9 },      // bottom
  { x1: -4, y1: 3, x2: 0, y2: 3 },      // divider elev/stairs

  // Left outer wall (with gap for wing at y=-2..9)
  { x1: 29, y1: -6, x2: 29, y2: -2 },
  { x1: 29, y1: 9, x2: 29, y2: 13 },
  // Right outer wall (with gap for wing at y=-2..9)
  { x1: 0, y1: -6, x2: 0, y2: -2 },
  { x1: 0, y1: 9, x2: 0, y2: 13 },

  // LH3 walls
  { x1: 3, y1: 2.5, x2: 26, y2: 2.5 },     // north
  { x1: 3, y1: 2.5, x2: 3, y2: 10.5 },      // east
  { x1: 26, y1: 2.5, x2: 26, y2: 10.5 },    // west
  // LH3 south (door gaps)
  { x1: 3, y1: 10.5, x2: 4, y2: 10.5 },
  { x1: 6, y1: 10.5, x2: 23, y2: 10.5 },
  { x1: 25, y1: 10.5, x2: 26, y2: 10.5 },

  // South wall of upper (gaps for entrance and connection)
  { x1: 4, y1: 13, x2: 16, y2: 13 },
  { x1: 26, y1: 13, x2: 29, y2: 13 },

  // ================================================================
  // CONNECTION CORRIDOR
  // ================================================================
  { x1: 4, y1: 13, x2: 4, y2: 64.5 },     // inner (east)
  // outer (west) — gaps for CR1 and CR2 doors
  { x1: 0, y1: 13, x2: 0, y2: 33 },
  { x1: 0, y1: 35, x2: 0, y2: 46 },
  { x1: 0, y1: 48, x2: 0, y2: 64.5 },

  // CR1 walls (outside corridor, west side)
  { x1: -6, y1: 27.5, x2: 0, y2: 27.5 },  // top
  { x1: -6, y1: 27.5, x2: -6, y2: 53.5 }, // outer
  { x1: -6, y1: 40.5, x2: 0, y2: 40.5 },  // divider CR1/CR2
  { x1: -6, y1: 53.5, x2: 0, y2: 53.5 },  // bottom

  // ================================================================
  // LOWER SECTION — SOLID OUTER PERIMETER (no outward bumps)
  // ================================================================
  
  // Top bar north wall
  { x1: 4, y1: 64.5, x2: 29, y2: 64.5 },

  // Left outer wall — gap for EXIT_LEFT notch at y=65.5..67.5
  { x1: 29, y1: 64.5, x2: 29, y2: 65.5 },
  { x1: 29, y1: 67.5, x2: 29, y2: 98.5 },

  // Bottom outer wall — SOLID
  { x1: 0, y1: 98.5, x2: 29, y2: 98.5 },
  
  // Right outer wall — gaps for Lounge access and EXIT_RIGHT
  { x1: 0, y1: 64.5, x2: 0, y2: 79 },
  { x1: 0, y1: 80, x2: 0, y2: 84 },
  { x1: 0, y1: 86, x2: 0, y2: 92 },
  { x1: 0, y1: 93, x2: 0, y2: 98.5 },

  // ================================================================
  // EXTRA ROOMS (above lower top bar, y=58.5..64.5)
  // ================================================================
  { x1: 4, y1: 58.5, x2: 29, y2: 58.5 },    // top wall
  { x1: 12, y1: 58.5, x2: 12, y2: 64.5 },   // divider Extra1/2
  { x1: 20.5, y1: 58.5, x2: 20.5, y2: 64.5 }, // divider Extra2/3

  // ================================================================
  // LEFT CLASSROOMS 3, 4, 10 (OUTSIDE left leg, x=29..35)
  // ================================================================
  { x1: 35, y1: 68.5, x2: 35, y2: 94.5 },   // outer wall
  { x1: 29, y1: 78, x2: 35, y2: 78 },        // divider CR3/CR4
  { x1: 29, y1: 87.5, x2: 35, y2: 87.5 },   // divider CR4/CR10
  { x1: 29, y1: 68.5, x2: 35, y2: 68.5 },   // top
  { x1: 29, y1: 94.5, x2: 35, y2: 94.5 },   // bottom

  // ================================================================
  // LOUNGE (inside right leg, recessed inward — NOT an outward bump)
  // Lounge is between right leg hallway and center block
  // ================================================================
  // Lounge top/bottom dividers from hallway into recessed area
  { x1: 0, y1: 79, x2: 4, y2: 79 },          // top cut-in
  { x1: 0, y1: 92.5, x2: 4, y2: 92.5 },      // bottom cut-in

  // ================================================================
  // BOTTOM CLASSROOMS 9, 8, 7 (inside bottom bar, between hallway and outer wall)
  // ================================================================
  { x1: 8, y1: 104, x2: 27, y2: 104 },       // south wall (rooms extend below)
  { x1: 8, y1: 98.5, x2: 8, y2: 104 },       // left
  { x1: 27, y1: 98.5, x2: 27, y2: 104 },     // right
  { x1: 14.5, y1: 98.5, x2: 14.5, y2: 104 }, // divider CR7/CR8
  { x1: 21.5, y1: 98.5, x2: 21.5, y2: 104 }, // divider CR8/CR9

  // ================================================================
  // CENTER BLOCK (donut core — LH1, LH2, CR5, CR6)
  // Block: x=7 to x=22, y=71 to y=92
  // Hallway wraps AROUND this on all 4 sides
  // EXIT_CENTER = recessed notch cut INWARD into the block on RIGHT (east/low-X) side
  // ================================================================
  // Top wall
  { x1: 7, y1: 71, x2: 22, y2: 71 },
  // Bottom wall
  { x1: 7, y1: 92, x2: 22, y2: 92 },
  // Left wall (west/high-X side) — solid
  { x1: 22, y1: 71, x2: 22, y2: 92 },

  // Right wall (east/low-X side) — with INWARD notch at y=79..83
  // Wall goes straight down, then steps INWARD (into block), then back out
  { x1: 7, y1: 71, x2: 7, y2: 79 },          // right wall above notch
  { x1: 7, y1: 79, x2: 9.5, y2: 79 },        // notch top (steps inward)
  { x1: 9.5, y1: 79, x2: 9.5, y2: 83 },      // notch back wall (inside block)
  { x1: 9.5, y1: 83, x2: 7, y2: 83 },        // notch bottom (steps back out)
  { x1: 7, y1: 83, x2: 7, y2: 92 },          // right wall below notch

  // Internal dividers
  { x1: 9.5, y1: 81.5, x2: 22, y2: 81.5 },  // LH1/LH2 + CR5 boundary
  { x1: 7, y1: 86.75, x2: 12, y2: 86.75 },   // CR5/CR6 boundary
  { x1: 12, y1: 81.5, x2: 12, y2: 92 },      // LH2 / CR5+CR6 divider

  // ================================================================
  // EXIT_LEFT — inward notch from left wall
  // Small alcove cut INTO the building at the top-left of lower section
  // ================================================================
  { x1: 27, y1: 65.5, x2: 29, y2: 65.5 },    // notch top
  { x1: 27, y1: 67.5, x2: 29, y2: 67.5 },    // notch bottom
  { x1: 27, y1: 65.5, x2: 27, y2: 67.5 },    // notch inner wall

  // ================================================================
  // EXIT_RIGHT — inward notch from right wall (near Lounge)
  // Small alcove cut INTO the building
  // ================================================================
  { x1: 0, y1: 84, x2: 2, y2: 84 },           // notch top
  { x1: 0, y1: 86, x2: 2, y2: 86 },           // notch bottom
  { x1: 2, y1: 84, x2: 2, y2: 86 },           // notch inner wall
];

export const FIRE_ZONES = {
  elevator: {
    label: "Elevator Area Fire",
    blockedNodes: ["EXIT_UL_ELEV", "EXIT_UR_ELEV", "UC_L0", "UC_R0"],
    blockedEdges: [
      { from: "EXIT_UL_ELEV", to: "UC_L0" },
      { from: "EXIT_UR_ELEV", to: "UC_R0" },
      { from: "UC_L0", to: "UC_T1" },
      { from: "UC_L0", to: "UC_L1" },
    ],
  },
  entrance: {
    label: "Entrance Stairs Fire",
    blockedNodes: ["ENTRANCE"],
    blockedEdges: [{ from: "UC_L3", to: "ENTRANCE" }],
  },
  exit_left: {
    label: "Left Exit Fire",
    blockedNodes: ["EXIT_LEFT"],
    blockedEdges: [{ from: "LT_L", to: "EXIT_LEFT" }],
  },
  exit_right: {
    label: "Right Exit Fire",
    blockedNodes: ["EXIT_RIGHT"],
    blockedEdges: [{ from: "LOUNGE", to: "EXIT_RIGHT" }],
  },
  connection: {
    label: "Connection Corridor Fire",
    blockedNodes: ["CONN_Q2"],
    blockedEdges: [
      { from: "CONN_6", to: "CONN_Q2" },
      { from: "CONN_Q2", to: "CONN_7" },
    ],
  },
};
