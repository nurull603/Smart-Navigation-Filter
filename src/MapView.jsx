import { useState, useRef, useEffect, useCallback } from 'react';
import { BUILDING, NODES, EDGES, ZONES, CORRIDORS, WALLS } from './data/buildingData';
import { dijkstra, findNearestExit, generateDirections } from './pathfinding';

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

// ============================================================
// MAP VIEW COMPONENT
// ============================================================
export default function MapView({ profile, mode = 'navigate' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // View state
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Navigation state
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [pathInfo, setPathInfo] = useState(null);
  const [directions, setDirections] = useState([]);

  // Hazard state
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState([]);

  // UI state
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showNodes, setShowNodes] = useState(true);

  // Wheelchair mode from profile
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
      y: cy + (-wy * s) + view.offsetY,
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
  // COMPUTE PATH
  // ============================================================
  useEffect(() => {
    if (mode === 'view') {
      setCurrentPath(null);
      setPathInfo(null);
      setDirections([]);
      return;
    }

    if (!selectedStart) {
      setCurrentPath(null);
      setPathInfo(null);
      setDirections([]);
      return;
    }

    if (emergencyMode) {
      const result = findNearestExit(selectedStart, NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        const target = NODES.find(n => n.id === result.targetId);
        setPathInfo({
          distance: result.distance.toFixed(1),
          isRefuge: result.isRefuge,
          destination: target?.label || result.targetId,
        });
        setDirections(generateDirections(result.path, NODES));
      } else {
        setCurrentPath(null);
        setPathInfo({ error: 'No safe path available!' });
        setDirections([]);
      }
    } else if (selectedEnd) {
      const result = dijkstra(selectedStart, selectedEnd, NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        const target = NODES.find(n => n.id === selectedEnd);
        setPathInfo({
          distance: result.distance.toFixed(1),
          destination: target?.label || selectedEnd,
        });
        setDirections(generateDirections(result.path, NODES));
      } else {
        setCurrentPath(null);
        setPathInfo({ error: wheelchairMode
          ? 'No accessible path available! The route may require stairs.'
          : 'No path available!'
        });
        setDirections([]);
      }
    }
  }, [selectedStart, selectedEnd, wheelchairMode, emergencyMode, blockedEdges, mode]);

  // ============================================================
  // DRAW
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const s = view.scale * 10;

    // Clear
    ctx.fillStyle = '#12151c';
    ctx.fillRect(0, 0, W, H);

    // Grid (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = s * 2;
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(W, H);
    for (let gx = Math.floor(topLeft.x / 2) * 2; gx < bottomRight.x; gx += 2) {
      const p = worldToScreen(gx, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, H);
      ctx.stroke();
    }
    for (let gy = Math.floor(bottomRight.y / 2) * 2; gy < topLeft.y; gy += 2) {
      const p = worldToScreen(0, gy);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(W, p.y);
      ctx.stroke();
    }

    // --- CORRIDOR ZONES ---
    CORRIDORS.forEach(c => {
      const p = worldToScreen(c.x, c.y + c.h);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#6090B0';
      ctx.fillRect(p.x, p.y, c.w * s, c.h * s);
      ctx.globalAlpha = 1.0;
    });

    // --- ROOM ZONES ---
    ZONES.forEach(z => {
      const p = worldToScreen(z.x, z.y + z.h);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = z.color;
      ctx.fillRect(p.x, p.y, z.w * s, z.h * s);
      ctx.globalAlpha = 1.0;

      // Room label
      if (s > 5) {
        const center = worldToScreen(z.x + z.w / 2, z.y + z.h / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = `${Math.max(8, s * 0.11)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = z.name.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, center.x, center.y + (i - (lines.length - 1) / 2) * s * 0.14);
        });
      }
    });

    // --- WALLS ---
    ctx.strokeStyle = '#c8ccd4';
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.lineCap = 'round';
    WALLS.forEach(w => {
      const p1 = worldToScreen(w.x1, w.y1);
      const p2 = worldToScreen(w.x2, w.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // --- EXIT LABELS ---
    NODES.filter(n => n.type === 'exit').forEach(exit => {
      const p = worldToScreen(exit.x, exit.y);
      ctx.fillStyle = '#FF3030';
      ctx.font = `bold ${Math.max(10, s * 0.14)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🚪 ' + (exit.label || 'EXIT'), p.x, p.y - s * 0.22);
    });

    // --- EDGES (graph connections) ---
    if (showNodes) {
      EDGES.forEach(e => {
        const n1 = NODES.find(n => n.id === e.from);
        const n2 = NODES.find(n => n.id === e.to);
        if (!n1 || !n2) return;
        const p1 = worldToScreen(n1.x, n1.y);
        const p2 = worldToScreen(n2.x, n2.y);

        const isBlocked = blockedEdges.some(b =>
          (b.from === e.from && b.to === e.to) ||
          (b.from === e.to && b.to === e.from)
        );

        if (isBlocked) {
          ctx.strokeStyle = '#FF3030';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 3]);
        } else if (!e.accessible) {
          ctx.strokeStyle = 'rgba(200,120,50,0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = 'rgba(100,140,180,0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // --- ROUTE PATH (blue line) ---
    if (currentPath && currentPath.length > 1) {
      // Glow
      ctx.strokeStyle = 'rgba(50,130,255,0.3)';
      ctx.lineWidth = Math.max(10, s * 0.12);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      currentPath.forEach((nodeId, i) => {
        const node = NODES.find(n => n.id === nodeId);
        if (!node) return;
        const p = worldToScreen(node.x, node.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Main line
      ctx.strokeStyle = '#3388FF';
      ctx.lineWidth = Math.max(4, s * 0.055);
      ctx.beginPath();
      currentPath.forEach((nodeId, i) => {
        const node = NODES.find(n => n.id === nodeId);
        if (!node) return;
        const p = worldToScreen(node.x, node.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // --- NODES ---
    if (showNodes) {
      NODES.forEach(node => {
        const p = worldToScreen(node.x, node.y);
        const isSmall = node.type === 'intersection' || node.type === 'door';
        const r = isSmall ? Math.max(2.5, s * 0.035) : Math.max(5, s * 0.065);

        const isStart = node.id === selectedStart;
        const isEnd = node.id === selectedEnd;
        const isHovered = node.id === hoveredNode;
        const isOnPath = currentPath?.includes(node.id);

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        if (isStart) {
          ctx.fillStyle = '#00DD44';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isEnd) {
          ctx.fillStyle = '#FF4444';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isOnPath) {
          ctx.fillStyle = '#5599FF';
          ctx.fill();
        } else if (mode === 'view') {
          // View mode: show all nodes subtly
          ctx.fillStyle = NODE_COLORS[node.type] || '#888';
          ctx.globalAlpha = 0.4;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillStyle = NODE_COLORS[node.type] || '#888';
          ctx.globalAlpha = isHovered ? 1.0 : 0.6;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          if (isHovered) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Labels for special nodes
        if (node.label && s > 6) {
          ctx.fillStyle = '#ddd';
          ctx.font = `${Math.max(8, s * 0.09)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, p.x, p.y - r - 4);
        }
      });
    }

    // --- START / END markers ---
    if (selectedStart) {
      const node = NODES.find(n => n.id === selectedStart);
      if (node) {
        const p = worldToScreen(node.x, node.y);
        ctx.fillStyle = '#00FF55';
        ctx.font = `bold ${Math.max(10, s * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('📍 YOU', p.x, p.y - s * 0.18);
      }
    }
    if (selectedEnd && !emergencyMode) {
      const node = NODES.find(n => n.id === selectedEnd);
      if (node) {
        const p = worldToScreen(node.x, node.y);
        ctx.fillStyle = '#FF5555';
        ctx.font = `bold ${Math.max(10, s * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏁 DEST', p.x, p.y - s * 0.18);
      }
    }

    // --- FLOOR LABEL ---
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Ground Floor', 10, H - 10);

    // --- BLOCKED EDGES fire icon ---
    if (blockedEdges.length > 0) {
      blockedEdges.forEach(b => {
        const n1 = NODES.find(n => n.id === b.from);
        const n2 = NODES.find(n => n.id === b.to);
        if (!n1 || !n2) return;
        const midX = (n1.x + n2.x) / 2;
        const midY = (n1.y + n2.y) / 2;
        const p = worldToScreen(midX, midY);
        ctx.font = `${Math.max(16, s * 0.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🔥', p.x, p.y);
      });
    }

  }, [view, worldToScreen, screenToWorld, showNodes, currentPath, selectedStart, selectedEnd, hoveredNode, blockedEdges, emergencyMode, mode]);

  // ============================================================
  // RESIZE + DRAW
  // ============================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // ============================================================
  // MOUSE HANDLERS
  // ============================================================
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setView(v => ({
      ...v,
      scale: Math.min(8, Math.max(0.3, v.scale * delta)),
    }));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: view.offsetX, oy: view.offsetY };
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setView(v => ({ ...v, offsetX: dragStart.current.ox + dx, offsetY: dragStart.current.oy + dy }));
      return;
    }

    // Hover detection (only in navigate mode)
    if (mode === 'view') {
      canvas.style.cursor = 'grab';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const world = screenToWorld(mx, my);

    let closest = null;
    let closestDist = Infinity;
    NODES.forEach(n => {
      const d = Math.sqrt((n.x - world.x) ** 2 + (n.y - world.y) ** 2);
      if (d < closestDist && d < 2) {
        closest = n.id;
        closestDist = d;
      }
    });
    setHoveredNode(closest);
    canvas.style.cursor = closest ? 'pointer' : 'grab';
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      handleClick(e);
    }
  };

  const handleClick = (e) => {
    if (mode === 'view') return; // No selection in view mode

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const world = screenToWorld(mx, my);

    let closest = null;
    let closestDist = Infinity;
    NODES.forEach(n => {
      const d = Math.sqrt((n.x - world.x) ** 2 + (n.y - world.y) ** 2);
      if (d < closestDist && d < 2) {
        closest = n;
        closestDist = d;
      }
    });

    if (!closest) return;

    if (!selectedStart) {
      setSelectedStart(closest.id);
    } else if (!selectedEnd && !emergencyMode) {
      if (closest.id !== selectedStart) {
        setSelectedEnd(closest.id);
      }
    } else {
      // Reset
      setSelectedStart(closest.id);
      setSelectedEnd(null);
      setCurrentPath(null);
      setPathInfo(null);
      setDirections([]);
    }
  };

  // ============================================================
  // TOUCH HANDLERS (mobile support)
  // ============================================================
  const lastTouch = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      lastTouch.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      dragStart.current = { x: t.clientX, y: t.clientY, ox: view.offsetX, oy: view.offsetY };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.x;
      const dy = t.clientY - dragStart.current.y;
      setView(v => ({ ...v, offsetX: dragStart.current.ox + dx, offsetY: dragStart.current.oy + dy }));
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    if (lastTouch.current) {
      const dt = Date.now() - lastTouch.current.time;
      if (dt < 300) {
        // Simulate click
        const fakeEvent = {
          clientX: lastTouch.current.x,
          clientY: lastTouch.current.y,
        };
        handleClick(fakeEvent);
      }
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  const simulateFire = () => {
    setBlockedEdges([
      { from: 'NODE_NC_3', to: 'NODE_NC_E' },
      { from: 'NODE_NC_E', to: 'NODE_EW_MID' },
    ]);
    setEmergencyMode(true);
  };

  const clearAll = () => {
    setBlockedEdges([]);
    setEmergencyMode(false);
    setSelectedStart(null);
    setSelectedEnd(null);
    setCurrentPath(null);
    setPathInfo(null);
    setDirections([]);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="map-wrapper">
      {/* TOOLBAR */}
      {mode === 'navigate' && (
        <div className="map-toolbar">
          <div className="toolbar-left">
            {wheelchairMode && <span className="mode-badge wheelchair">♿ Wheelchair Mode</span>}
            <button
              className={`toolbar-btn ${showNodes ? 'active' : ''}`}
              onClick={() => setShowNodes(!showNodes)}
            >
              📍 Nodes
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className={`toolbar-btn fire ${emergencyMode ? 'active' : ''}`}
              onClick={simulateFire}
            >
              🔥 Simulate Fire
            </button>
            <button className="toolbar-btn" onClick={clearAll}>
              ↻ Clear
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div className="map-toolbar">
          <span className="mode-badge view">🏢 Building Overview — Ground Floor</span>
        </div>
      )}

      {/* EMERGENCY BANNER */}
      {emergencyMode && (
        <div className="emergency-banner">
          🚨 EMERGENCY — FIRE DETECTED — REROUTING 🚨
        </div>
      )}

      {/* DIRECTION BAR */}
      {mode === 'navigate' && directions.length > 0 && (
        <div className="direction-bar">
          <span className="direction-icon">
            {directions[0].type === 'left' ? '⬅️' : directions[0].type === 'right' ? '➡️' : '⬆️'}
          </span>
          <span className="direction-text">{directions[0].text}</span>
        </div>
      )}

      {/* PATH INFO */}
      {mode === 'navigate' && pathInfo && (
        <div className={`path-info ${pathInfo.error ? 'error' : ''}`}>
          {pathInfo.error ? (
            <span>❌ {pathInfo.error}</span>
          ) : (
            <span>
              {pathInfo.isRefuge ? '♿ → Refuge: ' : '📍 → '}
              <strong>{pathInfo.destination}</strong> — {pathInfo.distance}m
              {pathInfo.isRefuge && ' — Help is on the way!'}
            </span>
          )}
        </div>
      )}

      {/* INSTRUCTIONS */}
      {mode === 'navigate' && !selectedStart && !emergencyMode && (
        <div className="map-instructions">
          Tap a node to set your <strong>starting point</strong>
        </div>
      )}
      {mode === 'navigate' && selectedStart && !selectedEnd && !emergencyMode && (
        <div className="map-instructions">
          Now tap a <strong>destination</strong>, or press 🔥 for emergency
        </div>
      )}

      {/* CANVAS */}
      <div className="map-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setHoveredNode(null); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* LEGEND */}
      <div className="map-legend">
        <span className="legend-item"><span className="dot" style={{ background: '#E02020' }}></span>Exit</span>
        <span className="legend-item"><span className="dot" style={{ background: '#E8A800' }}></span>Elevator</span>
        <span className="legend-item"><span className="dot" style={{ background: '#D06000' }}></span>Stairs</span>
        <span className="legend-item"><span className="dot" style={{ background: '#20A840' }}></span>Refuge</span>
        <span className="legend-item"><span className="dot" style={{ background: '#3090D0' }}></span>Ramp</span>
        {mode === 'navigate' && (
          <>
            <span className="legend-item"><span className="dot" style={{ background: '#00DD44' }}></span>Start</span>
            <span className="legend-item"><span className="dot" style={{ background: '#3388FF' }}></span>Path</span>
          </>
        )}
      </div>
    </div>
  );
}
