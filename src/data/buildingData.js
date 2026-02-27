// ============================================================
// SMART NAVIGATION FILTER — Apartment Floor Plan
// Based on user's apartment layout
// ============================================================

// Building dimensions (1 unit ≈ 1 foot)
export const BUILDING = {
  name: "Apartment_Test",
  width: 32,   // X: -16 to +16
  height: 26,  // Y: -13 to +13
  floor: 1,
};

// ============================================================
// NAVIGATION NODES
// ============================================================
export const NODES = [
  // === EXITS ===
  { id: "EXIT_MAIN",       x: 12,    y: -13,   type: "exit",         accessible: true,  label: "Main Entry" },
  { id: "EXIT_KITCHEN",    x: -16,   y: -10,   type: "exit",         accessible: true,  label: "Kitchen Exit" },

  // === ROOM CENTERS ===
  { id: "LIVING_C",        x: 9,     y: 7,     type: "room",         accessible: true,  label: "Living Room" },
  { id: "LIVING_S",        x: 9,     y: 0,     type: "intersection", accessible: true,  label: "Living Room South" },
  { id: "DINING_C",        x: 1,     y: -7,    type: "room",         accessible: true,  label: "Dining Room" },
  { id: "KITCHEN_C",       x: -10,   y: -8,    type: "room",         accessible: true,  label: "Kitchen" },
  { id: "BEDROOM_C",       x: -9,    y: 8,     type: "room",         accessible: true,  label: "Bedroom" },
  { id: "BATHROOM",        x: -12,   y: 0,     type: "room",         accessible: true,  label: "Bathroom" },

  // === DOORWAYS / INTERSECTIONS ===
  { id: "ENTRY_HALL",      x: 12,    y: -10,   type: "intersection", accessible: true,  label: "Entry Hall" },
  { id: "DINING_E",        x: 6,     y: -7,    type: "intersection", accessible: true,  label: "Dining East" },
  { id: "HALL",            x: -2,    y: 0,     type: "intersection", accessible: true,  label: "Hallway" },
  { id: "KITCHEN_DOOR",    x: -5,    y: -4,    type: "door",         accessible: true,  label: "Kitchen Door" },
  { id: "BATH_DOOR",       x: -6,    y: 0,     type: "door",         accessible: true,  label: "Bathroom Door" },
  { id: "BEDROOM_DOOR",    x: -3,    y: 3,     type: "door",         accessible: true,  label: "Bedroom Door" },
  { id: "LINEN_CLOSET",    x: -7,    y: 2,     type: "room",         accessible: true,  label: "Linen Closet" },
  { id: "CLOSET_BTM",      x: 3,     y: -12,   type: "room",         accessible: true,  label: "Closet" },
];

// ============================================================
// EDGES (navigation graph connections)
// ============================================================
export const EDGES = [
  // Main entry into apartment
  { from: "EXIT_MAIN",     to: "ENTRY_HALL",    type: "door",     accessible: true },
  { from: "ENTRY_HALL",    to: "DINING_E",      type: "corridor", accessible: true },
  { from: "ENTRY_HALL",    to: "LIVING_S",      type: "corridor", accessible: true },

  // Living room
  { from: "LIVING_S",      to: "LIVING_C",      type: "room",     accessible: true },
  { from: "LIVING_S",      to: "HALL",          type: "corridor", accessible: true },

  // Dining room
  { from: "DINING_E",      to: "DINING_C",      type: "room",     accessible: true },
  { from: "DINING_C",      to: "HALL",          type: "corridor", accessible: true },
  { from: "DINING_C",      to: "KITCHEN_DOOR",  type: "corridor", accessible: true },
  { from: "DINING_E",      to: "CLOSET_BTM",    type: "door",     accessible: true },

  // Kitchen
  { from: "KITCHEN_DOOR",  to: "KITCHEN_C",     type: "room",     accessible: true },
  { from: "KITCHEN_C",     to: "EXIT_KITCHEN",  type: "door",     accessible: true },

  // Hallway to bathroom and bedroom
  { from: "HALL",          to: "BATH_DOOR",     type: "corridor", accessible: true },
  { from: "BATH_DOOR",     to: "BATHROOM",      type: "room",     accessible: true },
  { from: "BATH_DOOR",     to: "LINEN_CLOSET",  type: "door",     accessible: true },
  { from: "HALL",          to: "BEDROOM_DOOR",  type: "corridor", accessible: true },
  { from: "BEDROOM_DOOR",  to: "BEDROOM_C",     type: "room",     accessible: true },
];

// ============================================================
// ROOM ZONES (for drawing colored room areas on the map)
// ============================================================
export const ZONES = [
  { name: "Bedroom",       x: -16,  y: 3,    w: 13,   h: 10,   color: "#A5D1FF" },
  { name: "Closet",        x: -3,   y: 10,   w: 3,    h: 3,    color: "#B8AD9E" },
  { name: "Closet",        x: -3,   y: 5.5,  w: 3,    h: 3,    color: "#B8AD9E" },
  { name: "Bathroom",      x: -16,  y: -3,   w: 9,    h: 6,    color: "#B3B3E0" },
  { name: "Linen",         x: -7,   y: 0,    w: 2,    h: 3,    color: "#B8AD9E" },
  { name: "Kitchen",       x: -16,  y: -13,  w: 11,   h: 10,   color: "#6BE880" },
  { name: "Dining\nRoom",  x: -5,   y: -10,  w: 12,   h: 7,    color: "#EBE5D6" },
  { name: "Living\nRoom",  x: 0,    y: 0,    w: 16,   h: 13,   color: "#D9C7EB" },
  { name: "Entry",         x: 7,    y: -13,  w: 9,    h: 4,    color: "#FFCF3E" },
  { name: "Closet",        x: 1,    y: -13,  w: 4,    h: 2,    color: "#B8AD9E" },
];

// ============================================================
// CORRIDOR ZONES (lighter highlight for hallways)
// ============================================================
export const CORRIDORS = [
  // Hallway connecting bathroom/bedroom to dining/living
  { x: -5, y: -3, w: 5, h: 6, label: "HALLWAY" },
  // Entry corridor
  { x: 7,  y: -10, w: 9, h: 4, label: "" },
];

// ============================================================
// WALL SEGMENTS (for drawing building outline and internal walls)
// ============================================================
export const WALLS = [
  // === OUTER PERIMETER ===
  // Top wall
  { x1: -16, y1: 13,  x2: 0,   y2: 13 },
  { x1: 0,   y1: 13,  x2: 16,  y2: 13 },
  // Bottom wall (gap for main entry ~10.5 to 13.5)
  { x1: -16, y1: -13, x2: 10.5,y2: -13 },
  { x1: 13.5,y1: -13, x2: 16,  y2: -13 },
  // Left wall (gap for kitchen exit ~-11 to -9)
  { x1: -16, y1: -13, x2: -16, y2: -11 },
  { x1: -16, y1: -9,  x2: -16, y2: 13 },
  // Right wall
  { x1: 16,  y1: -13, x2: 16,  y2: 13 },

  // === BEDROOM WALLS ===
  // Bedroom right wall (with gaps for closets)
  { x1: -3,  y1: 13,  x2: -3,  y2: 10 },
  { x1: -3,  y1: 8.5, x2: -3,  y2: 5.5 },
  { x1: -3,  y1: 4,   x2: -3,  y2: 3 },
  // Bedroom bottom wall (gap for door at x ≈ -3.5)
  { x1: -16, y1: 3,   x2: -4.5,y2: 3 },
  { x1: -1.5,y1: 3,   x2: 0,   y2: 3 },

  // === CLOSETS between bedroom and living ===
  { x1: -3,  y1: 10,  x2: 0,   y2: 10 },
  { x1: -3,  y1: 8.5, x2: 0,   y2: 8.5 },
  { x1: -3,  y1: 5.5, x2: 0,   y2: 5.5 },
  { x1: -3,  y1: 4,   x2: 0,   y2: 4 },
  // Closet right wall
  { x1: 0,   y1: 4,   x2: 0,   y2: 13 },

  // === BATHROOM WALLS ===
  // Bathroom right wall
  { x1: -7,  y1: 3,   x2: -7,  y2: 0 },
  // Bathroom bottom wall (gap for door)
  { x1: -16, y1: -3,  x2: -7.5,y2: -3 },

  // Linen closet walls
  { x1: -7,  y1: 3,   x2: -5,  y2: 3 },
  { x1: -5,  y1: 3,   x2: -5,  y2: 0 },

  // === KITCHEN WALLS ===
  // Kitchen right wall (gap for door at y ≈ -3.5 to -4.5)
  { x1: -5,  y1: -3,  x2: -5,  y2: -3.5 },
  { x1: -5,  y1: -5,  x2: -5,  y2: -13 },

  // === DINING / LIVING DIVIDER ===
  // Partial wall between living room and hallway/dining
  { x1: 0,   y1: 0,   x2: 0,   y2: -3 },

  // === DINING BOTTOM WALL ===
  { x1: -5,  y1: -10, x2: 7,   y2: -10 },

  // === ENTRY AREA ===
  // Entry top wall
  { x1: 7,   y1: -9,  x2: 16,  y2: -9 },
  // Entry left wall (gap connects to dining)
  { x1: 7,   y1: -10, x2: 7,   y2: -13 },

  // === BOTTOM CLOSET ===
  { x1: 1,   y1: -11, x2: 5,   y2: -11 },
  { x1: 1,   y1: -13, x2: 1,   y2: -11 },
  { x1: 5,   y1: -13, x2: 5,   y2: -11 },

  // === HALLWAY WALLS ===
  { x1: 0,   y1: 0,   x2: 0,   y2: 3 },
];

// ============================================================
// FIRE ZONES (for fire simulation — which nodes to block)
// ============================================================
export const FIRE_ZONES = {
  kitchen: {
    label: "Kitchen Fire",
    blockedNodes: ["KITCHEN_C", "KITCHEN_DOOR"],
    blockedEdges: [
      { from: "KITCHEN_DOOR", to: "KITCHEN_C" },
      { from: "KITCHEN_C", to: "EXIT_KITCHEN" },
    ],
  },
  living: {
    label: "Living Room Fire",
    blockedNodes: ["LIVING_C", "LIVING_S"],
    blockedEdges: [
      { from: "LIVING_S", to: "LIVING_C" },
      { from: "ENTRY_HALL", to: "LIVING_S" },
    ],
  },
  bedroom: {
    label: "Bedroom Fire",
    blockedNodes: ["BEDROOM_C"],
    blockedEdges: [
      { from: "BEDROOM_DOOR", to: "BEDROOM_C" },
    ],
  },
};

// ============================================================
// BEACON CONFIGURATION (update with real values from BeaconSET+)
// ============================================================
export const BEACONS = [
  {
    id: "BEACON_1",
    uuid: "426C7565-4368-6172-6D42-6561636F6E73",
    major: 3838,
    minor: 4949,
    nodeId: "LIVING_C",
    label: "Living Room Beacon",
  },
  {
    id: "BEACON_2",
    uuid: "426C7565-4368-6172-6D42-6561636F6E73",
    major: 3838,
    minor: 4050,
    nodeId: "BEDROOM_C",
    label: "Bedroom Beacon",
  },
];
