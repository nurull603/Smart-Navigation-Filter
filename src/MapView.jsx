import { useState, useRef, useEffect, useCallback } from 'react';
import { BUILDING, NODES, EDGES, ZONES, CORRIDORS, WALLS, FIRE_ZONES, BEACONS } from './data/buildingData';
import { dijkstra, findNearestExit, generateDirections } from './pathfinding';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// ============================================================
// NODE COLORS
// ============================================================
const NODE_COLORS = {
  exit: '#E02020',
  elevator: '#E8A800',
  stairs: '#D06000',
  refuge: '#20A840',
  ramp: '#3090D0',
  intersection: '#506070',
  door: '#707070',
};

// Rainbow palette for beacons to match 3D view
const BEACON_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082'];

export default function MapView({ profile, mode = 'navigate' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Default view centered on the Arena coordinates
  const [view, setView] = useState({ offsetX: 80, offsetY: 0, scale: 0.6 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [pathInfo, setPathInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showNodes, setShowNodes] = useState(true);

  const wheelchairMode = profile?.disabilities?.wheelchair || false;

  // ============================================================
  // COORDINATE TRANSFORMS
  // ============================================================
  const worldToScreen = useCallback((wx, wy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const s = view.scale * 10;
    return {
      x: cx + (wx * s) + view.offsetX,
      y: cy + (-wy * s) + view.offsetY, // Flip Y for 2D
    };
  }, [view]);

  const screenToWorld = useCallback((sx, sy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const s = view.scale * 10;
    return {
      x: (sx - cx - view.offsetX) / s,
      y: -(sy - cy - view.offsetY) / s,
    };
  }, [view]);

  // ============================================================
  // FIREBASE FIRE LISTENER (Synced with 3D)
  // ============================================================
  useEffect(() => {
    if (!db) return;
    const alertRef = doc(db, 'fire_alerts', 'active');
    const unsubscribe = onSnapshot(alertRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data.active && data.zone) {
        const zone = FIRE_ZONES?.[data.zone];
        setBlockedEdges(zone?.blockedEdges || []);
        setEmergencyMode(true);
      } else {
        setEmergencyMode(false);
        setBlockedEdges([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ============================================================
  // PATH COMPUTATION
  // ============================================================
  useEffect(() => {
    if (!selectedStart) return;

    if (emergencyMode) {
      // Force reroute to Refuge Table 122
      const result = dijkstra(selectedStart, "TABLE_122", NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        setPathInfo({ distance: result.distance.toFixed(1), destination: "Table 122 (Refuge)" });
      }
    } else if (selectedEnd) {
      const result = dijkstra(selectedStart, selectedEnd, NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        setPathInfo({ distance: result.distance.toFixed(1), destination: selectedEnd });
      }
    }
  }, [selectedStart, selectedEnd, wheelchairMode, emergencyMode, blockedEdges]);

  // Arrival Logic
  useEffect(() => {
    if (currentPath && currentPath.length > 0 && selectedEnd === currentPath[currentPath.length - 1]) {
       // You can trigger showSuccess here if the user "reaches" the end
    }
  }, [currentPath, selectedEnd]);

  // ============================================================
  // DRAWING LOGIC
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const s = view.scale * 10;

    ctx.fillStyle = '#0d1f3c'; // App navy theme
    ctx.fillRect(0, 0, W, H);

    // Draw Corridors and Zones
    ZONES.forEach(z => {
      const p = worldToScreen(z.x, z.y + z.h);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = z.color;
      ctx.fillRect(p.x, p.y, z.w * s, z.h * s);
      ctx.globalAlpha = 1.0;
    });

    // Draw Walls
    ctx.strokeStyle = '#254870';
    ctx.lineWidth = 3;
    WALLS.forEach(w => {
      const p1 = worldToScreen(w.x1, w.y1);
      const p2 = worldToScreen(w.x2, w.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Nodes with Rainbow Colors for Beacons
    NODES.forEach(node => {
      const p = worldToScreen(node.x, node.y);
      const beaconIdx = BEACONS.findIndex(b => b.nodeId === node.id);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * view.scale, 0, Math.PI * 2);
      
      if (beaconIdx !== -1) {
        ctx.fillStyle = BEACON_COLORS[beaconIdx % BEACON_COLORS.length];
      } else {
        ctx.fillStyle = NODE_COLORS[node.type] || '#888';
      }
      ctx.fill();
    });

    // Draw Path
    if (currentPath) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      currentPath.forEach((id, i) => {
        const n = NODES.find(node => node.id === id);
        const p = worldToScreen(n.x, n.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }, [view, worldToScreen, currentPath, emergencyMode]);

  useEffect(() => {
    const anim = () => { draw(); requestAnimationFrame(anim); };
    const id = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  return (
    <div className="map-wrapper" ref={containerRef} style={{ background: '#000', position: 'relative', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={(e) => { setIsDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, ox: view.offsetX, oy: view.offsetY }; }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          setView(v => ({ ...v, offsetX: dragStart.current.ox + (e.clientX - dragStart.current.x), offsetY: dragStart.current.oy + (e.clientY - dragStart.current.y) }));
        }}
        onMouseUp={() => setIsDragging(false)}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', width: '100%', height: '100%' }}
      />

      {emergencyMode && (
        <div style={{ position: 'absolute', top: 10, width: '100%', textAlign: 'center', background: 'rgba(239,68,68,0.9)', color: '#fff', padding: '10px', fontWeight: 'bold' }}>
          🚨 FIRE DETECTED — REROUTING TO TABLE 122 🚨
        </div>
      )}

      {showSuccess && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3000, background: 'radial-gradient(circle, #1e3560, #0d1f3c)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <div style={{ fontSize: '6rem' }}>🛡️</div>
          <h1>Safety Reached</h1>
          <button onClick={() => { setShowSuccess(false); setSelectedStart(null); setSelectedEnd(null); }} className="btn-primary">Return to Map</button>
        </div>
      )}
    </div>
  );
}