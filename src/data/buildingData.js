// ============================================================
// SMART NAVIGATION FILTER — Building Data
// Generated from Blender complex maze script
// ============================================================

// Building dimensions (meters)
export const BUILDING = {
  name: "SmartNavDemo_Floor1",
  width: 52,   // X: -26 to +26
  height: 40,  // Y: -20 to +20
  floor: 1,
};

// ============================================================
// NAVIGATION NODES
// ============================================================
export const NODES = [
  // === EXITS ===
  { id: "NODE_EXIT_A",    x: 26,    y: 4.65,   type: "exit",         accessible: true,  label: "Exit A" },
  { id: "NODE_EXIT_B",    x: 18,    y: -20,    type: "exit",         accessible: true,  label: "Exit B" },
  { id: "NODE_EXIT_C",    x: -10,   y: 20,     type: "exit",         accessible: true,  label: "Exit C" },

  // === ELEVATOR ===
  { id: "NODE_ELEVATOR",  x: 19,    y: -12.5,  type: "elevator",     accessible: true,  label: "Elevator" },

  // === STAIRS (NOT wheelchair accessible) ===
  { id: "NODE_STAIRS_1",  x: -23,   y: 15.75,  type: "stairs",       accessible: false, label: "Stairs 1" },
  { id: "NODE_STAIRS_2",  x: 15.5,  y: -11.75, type: "stairs",       accessible: false, label: "Stairs 2" },

  // === REFUGE AREAS ===
  { id: "NODE_REFUGE_1",  x: -17,   y: 17,     type: "refuge",       accessible: true,  label: "Refuge 1" },
  { id: "NODE_REFUGE_2",  x: 15.5,  y: -17,    type: "refuge",       accessible: true,  label: "Refuge 2" },

  // === RAMP ===
  { id: "NODE_RAMP",      x: 16,    y: -16,    type: "ramp",         accessible: true,  label: "Ramp" },

  // === NORTH CORRIDOR INTERSECTIONS (Y=10) ===
  { id: "NODE_NC_W",      x: -18,   y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_1",      x: -14,   y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_NW",     x: -10,   y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_2",      x: -5,    y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_C",      x: -2,    y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_3",      x: 6,     y: 10,     type: "intersection", accessible: true },
  { id: "NODE_NC_E",      x: 14,    y: 10,     type: "intersection", accessible: true },

  // === SOUTH CORRIDOR INTERSECTIONS (Y=-8) ===
  { id: "NODE_SC_W",      x: -18,   y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_1",      x: -12,   y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_2",      x: -7,    y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_C",      x: -2,    y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_3",      x: 5,     y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_4",      x: 6,     y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_E",      x: 14,    y: -8,     type: "intersection", accessible: true },
  { id: "NODE_SC_SE",     x: 18,    y: -8,     type: "intersection", accessible: true },

  // === VERTICAL BRANCH NODES ===
  { id: "NODE_WB_1",      x: -18,   y: 4,      type: "intersection", accessible: true },
  { id: "NODE_WB_2",      x: -18,   y: 0,      type: "intersection", accessible: true },
  { id: "NODE_EW_MID",    x: 14,    y: 4.65,   type: "intersection", accessible: true },
  { id: "NODE_NW_MID",    x: -10,   y: 15,     type: "intersection", accessible: true },
  { id: "NODE_SE_MID",    x: 18,    y: -14,    type: "intersection", accessible: true },

  // === DEAD-END WING ===
  { id: "NODE_DEAD_1",    x: -24,   y: -8,     type: "intersection", accessible: true },
  { id: "NODE_DEAD_2",    x: -22,   y: -12.5,  type: "intersection", accessible: true },

  // === ROOM DOOR NODES ===
  { id: "NODE_DOOR_STAIRS1",  x: -20,   y: 11.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_REFUGE1",  x: -14,   y: 11.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_LAB",      x: -5,    y: 11.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_OFF4A",    x: 6,     y: 11.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_CONF_N",   x: 8,     y: 8.5,   type: "door", accessible: true },
  { id: "NODE_DOOR_CONF_S",   x: 5,     y: -6.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_OFF1",     x: -16.5, y: 4,     type: "door", accessible: true },
  { id: "NODE_DOOR_OFF2",     x: -16.5, y: 0,     type: "door", accessible: true },
  { id: "NODE_DOOR_OFF3",     x: -12,   y: -6.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_BREAK",    x: -12,   y: -9.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_BATH",     x: -7,    y: -9.5,  type: "door", accessible: true },
  { id: "NODE_DOOR_STORAGE",  x: 6,     y: -9.5,  type: "door", accessible: true },
];

// ============================================================
// EDGES (navigation graph connections)
// ============================================================
export const EDGES = [
  // NORTH CORRIDOR (left to right)
  { from: "NODE_NC_W",   to: "NODE_NC_1",   type: "corridor",  accessible: true },
  { from: "NODE_NC_1",   to: "NODE_NC_NW",  type: "corridor",  accessible: true },
  { from: "NODE_NC_NW",  to: "NODE_NC_2",   type: "corridor",  accessible: true },
  { from: "NODE_NC_2",   to: "NODE_NC_C",   type: "corridor",  accessible: true },
  { from: "NODE_NC_C",   to: "NODE_NC_3",   type: "corridor",  accessible: true },
  { from: "NODE_NC_3",   to: "NODE_NC_E",   type: "corridor",  accessible: true },

  // North corridor to Exit A
  { from: "NODE_NC_E",   to: "NODE_EXIT_A",  type: "corridor", accessible: true },

  // SOUTH CORRIDOR (left to right)
  { from: "NODE_DEAD_1", to: "NODE_SC_W",    type: "corridor", accessible: true },
  { from: "NODE_SC_W",   to: "NODE_SC_1",    type: "corridor", accessible: true },
  { from: "NODE_SC_1",   to: "NODE_SC_2",    type: "corridor", accessible: true },
  { from: "NODE_SC_2",   to: "NODE_SC_C",    type: "corridor", accessible: true },
  { from: "NODE_SC_C",   to: "NODE_SC_3",    type: "corridor", accessible: true },
  { from: "NODE_SC_3",   to: "NODE_SC_4",    type: "corridor", accessible: true },
  { from: "NODE_SC_4",   to: "NODE_SC_E",    type: "corridor", accessible: true },
  { from: "NODE_SC_E",   to: "NODE_SC_SE",   type: "corridor", accessible: true },

  // WEST BRANCH (vertical, connects N and S)
  { from: "NODE_NC_W",   to: "NODE_WB_1",    type: "corridor", accessible: true },
  { from: "NODE_WB_1",   to: "NODE_WB_2",    type: "corridor", accessible: true },
  { from: "NODE_WB_2",   to: "NODE_SC_W",    type: "corridor", accessible: true },

  // CENTER BRANCH (vertical)
  { from: "NODE_NC_C",   to: "NODE_SC_C",    type: "corridor", accessible: true },

  // EAST WING (vertical)
  { from: "NODE_NC_E",   to: "NODE_EW_MID",  type: "corridor", accessible: true },
  { from: "NODE_EW_MID", to: "NODE_SC_E",    type: "corridor", accessible: true },

  // EXIT A BRANCH (east, horizontal)
  { from: "NODE_EW_MID", to: "NODE_EXIT_A",  type: "corridor", accessible: true },

  // EXIT C BRANCH (north-west, vertical)
  { from: "NODE_NC_NW",  to: "NODE_NW_MID",  type: "corridor", accessible: true },
  { from: "NODE_NW_MID", to: "NODE_EXIT_C",  type: "corridor", accessible: true },

  // EXIT B BRANCH (south-east, vertical)
  { from: "NODE_SC_SE",  to: "NODE_SE_MID",  type: "corridor", accessible: true },
  { from: "NODE_SE_MID", to: "NODE_EXIT_B",  type: "corridor", accessible: true },

  // DEAD-END WING
  { from: "NODE_SC_W",   to: "NODE_DEAD_1",  type: "corridor", accessible: true },
  { from: "NODE_DEAD_1", to: "NODE_DEAD_2",  type: "corridor", accessible: true },

  // CONFERENCE ROOM CUT-THROUGH (connects N and S corridors!)
  { from: "NODE_NC_3",        to: "NODE_DOOR_CONF_N", type: "door",     accessible: true },
  { from: "NODE_DOOR_CONF_N", to: "NODE_DOOR_CONF_S", type: "room",     accessible: true },
  { from: "NODE_DOOR_CONF_S", to: "NODE_SC_3",        type: "door",     accessible: true },

  // STAIRS (NOT accessible)
  { from: "NODE_NC_W",        to: "NODE_DOOR_STAIRS1", type: "corridor", accessible: true },
  { from: "NODE_DOOR_STAIRS1",to: "NODE_STAIRS_1",     type: "stairs",   accessible: false },
  { from: "NODE_SE_MID",      to: "NODE_STAIRS_2",     type: "stairs",   accessible: false },

  // ELEVATOR (accessible)
  { from: "NODE_SE_MID",      to: "NODE_ELEVATOR",     type: "elevator", accessible: true },

  // REFUGE AREAS
  { from: "NODE_NC_1",        to: "NODE_DOOR_REFUGE1", type: "door",     accessible: true },
  { from: "NODE_DOOR_REFUGE1",to: "NODE_REFUGE_1",     type: "corridor", accessible: true },
  { from: "NODE_SE_MID",      to: "NODE_REFUGE_2",     type: "corridor", accessible: true },

  // RAMP
  { from: "NODE_ELEVATOR",    to: "NODE_RAMP",         type: "ramp",     accessible: true },

  // ROOM DOORS
  { from: "NODE_NC_2",  to: "NODE_DOOR_LAB",     type: "door", accessible: true },
  { from: "NODE_NC_3",  to: "NODE_DOOR_OFF4A",   type: "door", accessible: true },
  { from: "NODE_WB_1",  to: "NODE_DOOR_OFF1",    type: "door", accessible: true },
  { from: "NODE_WB_2",  to: "NODE_DOOR_OFF2",    type: "door", accessible: true },
  { from: "NODE_SC_1",  to: "NODE_DOOR_OFF3",    type: "door", accessible: true },
  { from: "NODE_SC_1",  to: "NODE_DOOR_BREAK",   type: "door", accessible: true },
  { from: "NODE_SC_2",  to: "NODE_DOOR_BATH",    type: "door", accessible: true },
  { from: "NODE_SC_4",  to: "NODE_DOOR_STORAGE", type: "door", accessible: true },
];

// ============================================================
// ROOM ZONES (for drawing colored room areas on the map)
// ============================================================
export const ZONES = [
  // Top row (above north corridor, Y: 11.5 to 20)
  { name: "Stairs 1",      x: -26, y: 11.5, w: 6,    h: 8.5,  color: "#FF8C2E" },
  { name: "Refuge Area 1", x: -20, y: 11.5, w: 6,    h: 8.5,  color: "#40D465" },
  { name: "Lab",           x: -8.5,y: 11.5, w: 5,    h: 8.5,  color: "#6BE880" },
  { name: "Office 4A",     x: -0.5,y: 11.5, w: 6.5,  h: 8.5,  color: "#EBE5D6" },
  { name: "Office 4B",     x: 6,   y: 11.5, w: 6.5,  h: 8.5,  color: "#EBE5D6" },
  { name: "Elevator Top",  x: 15.5,y: 11.5, w: 10.5, h: 8.5,  color: "#FFCF3E" },

  // Middle zone (between corridors, Y: 8.5 to -6.5)
  { name: "Office 1",      x: -16.5, y: 2,    w: 13,  h: 6.5,  color: "#EBE5D6" },
  { name: "Office 2",      x: -16.5, y: -6.5, w: 13,  h: 8.5,  color: "#EBE5D6" },
  { name: "Conference\nRoom", x: -0.5, y: -6.5, w: 12.5, h: 15, color: "#D9C7EB" },

  // Bottom row (below south corridor, Y: -9.5 to -20)
  { name: "Office 3\n(Dead End)", x: -26, y: -9.5, w: 4,  h: 6,  color: "#EBE5D6" },
  { name: "Dead End\nStorage",    x: -22, y: -9.5, w: 2.5,h: 6,  color: "#B8AD9E" },
  { name: "Break Room",    x: -19.5, y: -9.5, w: 12.5, h: 10.5, color: "#A5D1FF" },
  { name: "Bathroom",      x: -7,    y: -9.5, w: 3.5,  h: 10.5, color: "#B3B3E0" },
  { name: "Storage",       x: -0.5,  y: -9.5, w: 6.5,  h: 10.5, color: "#B8AD9E" },
  { name: "Stairs 2",      x: 12.5,  y: -9.5, w: 4,    h: 4.5,  color: "#FF8C2E" },
  { name: "Refuge Area 2", x: 12.5,  y: -14,  w: 4,    h: 6,    color: "#40D465" },
  { name: "Elevator\nLobby",x: 16.5, y: -9.5, w: 3,    h: 10.5, color: "#FFCF3E" },
  { name: "Server Room",   x: 19.5,  y: -9.5, w: 6.5,  h: 10.5, color: "#8FA5B3" },
];

// ============================================================
// CORRIDOR ZONES (lighter highlight for hallways)
// ============================================================
export const CORRIDORS = [
  // North corridor (horizontal)
  { x: -18, y: 8.5,  w: 32, h: 3, label: "NORTH CORRIDOR" },
  // South corridor (horizontal)
  { x: -26, y: -9.5, w: 52, h: 3, label: "SOUTH CORRIDOR" },
  // West branch (vertical)
  { x: -19.5, y: -6.5, w: 3, h: 15 },
  // Center branch (vertical)
  { x: -3.5, y: -6.5, w: 3, h: 15 },
  // East wing (vertical)
  { x: 12.5, y: -6.5, w: 3, h: 15 },
  // Exit A branch (horizontal)
  { x: 15.5, y: 3.15, w: 10.5, h: 3 },
  // NW exit branch (vertical)
  { x: -11.5, y: 11.5, w: 3, h: 8.5 },
  // SE exit branch (vertical)
  { x: 16.5, y: -20, w: 3, h: 10.5 },
];

// ============================================================
// WALL SEGMENTS (for drawing building outline and internal walls)
// ============================================================
export const WALLS = [
  // Outer perimeter
  { x1: -26, y1: 20,   x2: -10, y2: 20 },   // North wall left
  { x1: -8.7,y1: 20,   x2: 26,  y2: 20 },   // North wall right (gap = Exit C)
  { x1: -26, y1: -20,  x2: 18,  y2: -20 },   // South wall left
  { x1: 19.3,y1: -20,  x2: 26,  y2: -20 },   // South wall right (gap = Exit B)
  { x1: -26, y1: -20,  x2: -26, y2: 20 },    // West wall
  { x1: 26,  y1: -20,  x2: 26,  y2: 4 },     // East wall bottom
  { x1: 26,  y1: 5.3,  x2: 26,  y2: 20 },    // East wall top (gap = Exit A)

  // North corridor walls
  { x1: -26, y1: 11.5, x2: -20, y2: 11.5 },
  { x1: -20, y1: 11.5, x2: -20, y2: 20 },
  { x1: -14, y1: 11.5, x2: -14, y2: 20 },
  { x1: -11.5,y1:11.5, x2: -11.5,y2: 20 },
  { x1: -8.5,y1: 11.5, x2: -8.5,y2: 20 },
  { x1: -0.5,y1: 11.5, x2: -0.5,y2: 20 },
  { x1: 6,   y1: 11.5, x2: 6,   y2: 20 },
  { x1: 12.5,y1: 11.5, x2: 12.5,y2: 8.5 },
  { x1: 15.5,y1: 11.5, x2: 15.5,y2: 8.5 },
  { x1: 15.5,y1: 11.5, x2: 26,  y2: 11.5 },

  // North corridor bottom wall
  { x1: -26, y1: 8.5,  x2: -19.5, y2: 8.5 },
  { x1: -16.5,y1: 8.5, x2: -11.5,y2: 8.5 },
  { x1: -8.5,y1: 8.5,  x2: -3.5, y2: 8.5 },
  { x1: -0.5,y1: 8.5,  x2: 12.5, y2: 8.5 },
  { x1: 15.5,y1: 8.5,  x2: 26,   y2: 8.5 },

  // South corridor top wall
  { x1: -26, y1: -6.5, x2: -19.5,y2: -6.5 },
  { x1: -16.5,y1:-6.5, x2: -3.5, y2: -6.5 },
  { x1: -0.5,y1: -6.5, x2: 12.5, y2: -6.5 },
  { x1: 15.5,y1: -6.5, x2: 16.5, y2: -6.5 },
  { x1: 19.5,y1: -6.5, x2: 26,   y2: -6.5 },

  // South corridor bottom wall segments
  { x1: -26, y1: -9.5, x2: -19.5,y2: -9.5 },
  { x1: -16.5,y1:-9.5, x2: -3.5, y2: -9.5 },
  { x1: -0.5,y1: -9.5, x2: 12.5, y2: -9.5 },
  { x1: 15.5,y1: -9.5, x2: 16.5, y2: -9.5 },
  { x1: 19.5,y1: -9.5, x2: 26,   y2: -9.5 },

  // West branch walls
  { x1: -19.5,y1: 8.5, x2: -19.5,y2: -6.5 },
  { x1: -16.5,y1: 8.5, x2: -16.5,y2: -6.5 },

  // West corridor up to Exit C
  { x1: -11.5,y1: 11.5,x2: -11.5,y2: 20 },
  { x1: -8.5, y1: 11.5,x2: -8.5, y2: 20 },

  // Center branch walls
  { x1: -3.5, y1: 8.5, x2: -3.5, y2: -6.5 },
  { x1: -0.5, y1: 8.5, x2: -0.5, y2: -6.5 },

  // East wing walls
  { x1: 12.5, y1: 8.5, x2: 12.5, y2: -6.5 },
  { x1: 15.5, y1: 8.5, x2: 15.5, y2: 5.3 },
  { x1: 15.5, y1: 4.0, x2: 15.5, y2: -6.5 },

  // Exit A branch walls
  { x1: 15.5, y1: 6.15,x2: 26,   y2: 6.15 },
  { x1: 15.5, y1: 3.15,x2: 26,   y2: 3.15 },

  // SE exit branch walls
  { x1: 16.5, y1: -9.5,x2: 16.5, y2: -20 },
  { x1: 19.5, y1: -9.5,x2: 19.5, y2: -20 },

  // Bottom room dividers
  { x1: -7,   y1: -9.5,x2: -7,   y2: -20 },
  { x1: -0.5, y1: -9.5,x2: -0.5, y2: -20 },
  { x1: 6,    y1: -9.5,x2: 6,    y2: -20 },
  { x1: 12.5, y1: -9.5,x2: 12.5, y2: -20 },
  { x1: 12.5, y1: -14, x2: 16.5, y2: -14 },
  { x1: 16.5, y1: -9.5,x2: 16.5, y2: -20 },
  { x1: 19.5, y1: -9.5,x2: 19.5, y2: -20 },

  // Dead-end wing
  { x1: -26,  y1: -15.5,x2: -19.5,y2: -15.5 },
  { x1: -22,  y1: -9.5, x2: -22,  y2: -15.5 },
  { x1: -19.5,y1: -6.5, x2: -19.5,y2: -15.5 },

  // Middle zone divider (Office 1 / Office 2 split)
  { x1: -16.5,y1: 2,    x2: -3.5, y2: 2 },
];
