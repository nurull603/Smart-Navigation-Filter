// ============================================================
// SMART NAVIGATION FILTER — Pathfinding (Dijkstra)
// ============================================================

/**
 * Dijkstra's shortest path algorithm
 * @param {string} startId - Starting node ID
 * @param {string} endId - Destination node ID
 * @param {Array} nodes - All navigation nodes
 * @param {Array} edges - All edges (connections)
 * @param {boolean} wheelchairMode - If true, skip non-accessible edges
 * @param {Array} blockedEdges - Edges blocked by hazards
 * @returns {Object|null} - { path: string[], distance: number } or null
 */
export function dijkstra(startId, endId, nodes, edges, wheelchairMode = false, blockedEdges = []) {
  // Build adjacency list
  const adj = {};
  const nodeMap = {};
  nodes.forEach(n => {
    adj[n.id] = [];
    nodeMap[n.id] = n;
  });

  edges.forEach(e => {
    // Skip non-accessible edges in wheelchair mode
    if (wheelchairMode && !e.accessible) return;

    // Skip blocked edges
    const isBlocked = blockedEdges.some(b =>
      (b.from === e.from && b.to === e.to) ||
      (b.from === e.to && b.to === e.from)
    );
    if (isBlocked) return;

    const n1 = nodeMap[e.from];
    const n2 = nodeMap[e.to];
    if (!n1 || !n2) return;

    const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
    if (adj[e.from]) adj[e.from].push({ node: e.to, dist });
    if (adj[e.to]) adj[e.to].push({ node: e.from, dist });
  });

  // Dijkstra
  const dist = {};
  const prev = {};
  const visited = new Set();
  nodes.forEach(n => { dist[n.id] = Infinity; });
  dist[startId] = 0;

  while (true) {
    let minNode = null;
    let minDist = Infinity;
    for (const id in dist) {
      if (!visited.has(id) && dist[id] < minDist) {
        minDist = dist[id];
        minNode = id;
      }
    }
    if (!minNode || minNode === endId) break;
    visited.add(minNode);

    for (const neighbor of (adj[minNode] || [])) {
      if (visited.has(neighbor.node)) continue;
      const newDist = dist[minNode] + neighbor.dist;
      if (newDist < dist[neighbor.node]) {
        dist[neighbor.node] = newDist;
        prev[neighbor.node] = minNode;
      }
    }
  }

  if (dist[endId] === Infinity) return null;

  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }
  return { path, distance: dist[endId] };
}

/**
 * Find nearest exit (or refuge for wheelchair users)
 */
export function findNearestExit(startId, nodes, edges, wheelchairMode = false, blockedEdges = []) {
  const exits = nodes.filter(n => n.type === "exit");
  let best = null;

  for (const exit of exits) {
    const result = dijkstra(startId, exit.id, nodes, edges, wheelchairMode, blockedEdges);
    if (result && (!best || result.distance < best.distance)) {
      best = { ...result, targetId: exit.id, isRefuge: false };
    }
  }

  // If wheelchair mode and no exit reachable, find nearest refuge
  if (!best && wheelchairMode) {
    const refuges = nodes.filter(n => n.type === "refuge");
    for (const refuge of refuges) {
      const result = dijkstra(startId, refuge.id, nodes, edges, wheelchairMode, blockedEdges);
      if (result && (!best || result.distance < best.distance)) {
        best = { ...result, targetId: refuge.id, isRefuge: true };
      }
    }
  }

  return best;
}

/**
 * Generate turn-by-turn directions from a path
 */
export function generateDirections(path, nodes) {
  if (!path || path.length < 2) return [];

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const directions = [];

  for (let i = 1; i < path.length; i++) {
    const prev = nodeMap[path[i - 1]];
    const curr = nodeMap[path[i]];
    const next = i < path.length - 1 ? nodeMap[path[i + 1]] : null;

    if (!prev || !curr) continue;

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy).toFixed(0);

    // Determine direction
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'east' : 'west';
    } else {
      direction = dy > 0 ? 'north' : 'south';
    }

    // Determine turn if there's a next node
    let turn = '';
    if (next && i < path.length - 1) {
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      // Cross product to determine left/right
      const cross = dx * dy2 - dy * dx2;
      if (Math.abs(cross) > 0.5) {
        turn = cross > 0 ? 'Turn left' : 'Turn right';
      } else {
        turn = 'Continue straight';
      }
    }

    const label = curr.label || curr.id.replace('NODE_', '').replace(/_/g, ' ');

    if (i === path.length - 1) {
      directions.push({
        text: `Arrive at ${label}`,
        distance: dist,
        type: 'arrive',
      });
    } else {
      directions.push({
        text: turn ? `${turn} at ${label}` : `Head ${direction} — ${dist}m`,
        distance: dist,
        type: turn.includes('left') ? 'left' : turn.includes('right') ? 'right' : 'straight',
      });
    }
  }

  return directions;
}
