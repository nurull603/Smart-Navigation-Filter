import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { BUILDING, NODES, EDGES, ZONES, CORRIDORS, WALLS } from './data/buildingData';
import { dijkstra, findNearestExit, generateDirections } from './pathfinding';

// ============================================================
// NODE COLORS (for 3D spheres)
// ============================================================
const NODE_COLORS_HEX = {
  exit: 0xe02020,
  elevator: 0xe8a800,
  stairs: 0xd06000,
  refuge: 0x20a840,
  ramp: 0x3090d0,
  intersection: 0x506070,
  door: 0x606060,
};

// ============================================================
// ZONE COLORS → Three.js hex
// ============================================================
function cssToHex(css) {
  return parseInt(css.replace('#', ''), 16);
}

// ============================================================
// 3D MAP VIEW
// ============================================================
export default function MapView3D({ profile, mode = 'navigate' }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const controlsRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    rotY: Math.PI / 4,
    rotX: Math.PI / 5,
    targetRotY: Math.PI / 4,
    targetRotX: Math.PI / 5,
    distance: 55,
    targetDistance: 55,
    panX: 0,
    panZ: 0,
    targetPanX: 0,
    targetPanZ: 0,
  });

  // Navigation state
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [pathInfo, setPathInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [showNodes, setShowNodes] = useState(true);

  // Refs for dynamic objects
  const routeMeshRef = useRef(null);
  const nodeMeshesRef = useRef([]);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const blueDotRef = useRef(null);
  const fireIconsRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const wheelchairMode = profile?.disabilities?.wheelchair || false;

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
        setPathInfo({ distance: result.distance.toFixed(1), isRefuge: result.isRefuge, destination: target?.label || result.targetId });
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
        setPathInfo({ distance: result.distance.toFixed(1), destination: target?.label || selectedEnd });
        setDirections(generateDirections(result.path, NODES));
      } else {
        setCurrentPath(null);
        setPathInfo({ error: wheelchairMode ? 'No accessible path! Route may require stairs.' : 'No path available!' });
        setDirections([]);
      }
    }
  }, [selectedStart, selectedEnd, wheelchairMode, emergencyMode, blockedEdges, mode]);

  // ============================================================
  // BUILD 3D SCENE
  // ============================================================
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- SCENE ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);
    scene.fog = new THREE.Fog(0x0a0c12, 80, 150);
    sceneRef.current = scene;

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 500);
    cameraRef.current = camera;

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- LIGHTING ---
    const ambient = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8090c0, 0.4);
    fillLight.position.set(-20, 30, -10);
    scene.add(fillLight);

    // --- GROUND PLANE (dark exterior) ---
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- BUILDING FLOOR (lighter base) ---
    const floorGeo = new THREE.PlaneGeometry(BUILDING.width, BUILDING.height);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // --- CORRIDOR ZONES ---
    CORRIDORS.forEach(c => {
      const geo = new THREE.PlaneGeometry(c.w, c.h);
      const mat = new THREE.MeshStandardMaterial({ color: 0x252a3a, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(c.x + c.w / 2, 0.01, -(c.y + c.h / 2));
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // --- ROOM ZONES ---
    ZONES.forEach(z => {
      const geo = new THREE.PlaneGeometry(z.w, z.h);
      const color = cssToHex(z.color);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(z.x + z.w / 2, 0.02, -(z.y + z.h / 2));
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Room label (using sprite)
      if (z.name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = z.name.replace('\n', ' ');
        ctx.fillText(label, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(z.x + z.w / 2, 1.5, -(z.y + z.h / 2));
        sprite.scale.set(z.w * 0.6, z.w * 0.15, 1);
        scene.add(sprite);
      }
    });

    // --- WALLS (extruded) ---
    const wallHeight = 3.0;
    const wallThickness = 0.25;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc0c8d4,
      roughness: 0.4,
      metalness: 0.1,
    });

    WALLS.forEach(w => {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.01) return;

      const angle = Math.atan2(dy, dx);
      const midX = (w.x1 + w.x2) / 2;
      const midY = (w.y1 + w.y2) / 2;

      const geo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(midX, wallHeight / 2, -midY);
      mesh.rotation.y = -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // --- WALL TOP EDGE (subtle line on top for definition) ---
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.5 });
    WALLS.forEach(w => {
      const points = [
        new THREE.Vector3(w.x1, wallHeight + 0.01, -w.y1),
        new THREE.Vector3(w.x2, wallHeight + 0.01, -w.y2),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, edgeMat);
      scene.add(line);
    });

    // --- EXIT SIGNS ---
    NODES.filter(n => n.type === 'exit').forEach(exit => {
      // Glowing green sign above exit
      const signGeo = new THREE.BoxGeometry(2.5, 0.8, 0.1);
      const signMat = new THREE.MeshStandardMaterial({
        color: 0x00cc40,
        emissive: 0x00aa30,
        emissiveIntensity: 0.6,
        roughness: 0.3,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(exit.x, wallHeight - 0.5, -exit.y);
      scene.add(sign);

      // Exit light
      const exitLight = new THREE.PointLight(0x00ff40, 0.5, 8);
      exitLight.position.set(exit.x, wallHeight, -exit.y);
      scene.add(exitLight);
    });

    // --- RESIZE ---
    const handleResize = () => {
      if (!mount || !camera || !renderer) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const ctrl = controlsRef.current;

      // Smooth interpolation
      ctrl.rotY += (ctrl.targetRotY - ctrl.rotY) * 0.08;
      ctrl.rotX += (ctrl.targetRotX - ctrl.rotX) * 0.08;
      ctrl.distance += (ctrl.targetDistance - ctrl.distance) * 0.08;
      ctrl.panX += (ctrl.targetPanX - ctrl.panX) * 0.08;
      ctrl.panZ += (ctrl.targetPanZ - ctrl.panZ) * 0.08;

      // Update camera
      const cx = ctrl.panX + ctrl.distance * Math.sin(ctrl.rotY) * Math.cos(ctrl.rotX);
      const cy = ctrl.distance * Math.sin(ctrl.rotX);
      const cz = ctrl.panZ + ctrl.distance * Math.cos(ctrl.rotY) * Math.cos(ctrl.rotX);

      camera.position.set(cx, cy, cz);
      camera.lookAt(ctrl.panX, 0, ctrl.panZ);

      renderer.render(scene, camera);
    };
    animate();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // ============================================================
  // UPDATE NODES (when showNodes changes)
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old node meshes
    nodeMeshesRef.current.forEach(m => scene.remove(m));
    nodeMeshesRef.current = [];

    if (!showNodes) return;

    NODES.forEach(node => {
      const isSmall = node.type === 'intersection' || node.type === 'door';
      const radius = isSmall ? 0.25 : 0.4;
      const geo = new THREE.SphereGeometry(radius, 12, 8);
      const color = NODE_COLORS_HEX[node.type] || 0x888888;
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, 0.3, -node.y);
      mesh.userData = { nodeId: node.id };
      scene.add(mesh);
      nodeMeshesRef.current.push(mesh);
    });
  }, [showNodes]);

  // ============================================================
  // UPDATE ROUTE PATH
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old route
    if (routeMeshRef.current) {
      scene.remove(routeMeshRef.current);
      routeMeshRef.current = null;
    }

    if (!currentPath || currentPath.length < 2) return;

    const nodeMap = {};
    NODES.forEach(n => { nodeMap[n.id] = n; });

    // Create tube path
    const points = currentPath.map(id => {
      const n = nodeMap[id];
      return new THREE.Vector3(n.x, 0.15, -n.y);
    });

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.25, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x3388ff,
      emissive: 0x2266cc,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tube);
    routeMeshRef.current = tube;

    // Glow line
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3388ff,
      emissive: 0x3388ff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.2,
    });
    const glowGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.6, 8, false);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Store both for cleanup
    routeMeshRef.current = new THREE.Group();
    routeMeshRef.current.add(tube);
    routeMeshRef.current.add(glow);
    scene.add(routeMeshRef.current);
    scene.remove(tube);
    scene.remove(glow);

  }, [currentPath]);

  // ============================================================
  // UPDATE START/END MARKERS
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old markers
    if (startMarkerRef.current) { scene.remove(startMarkerRef.current); startMarkerRef.current = null; }
    if (endMarkerRef.current) { scene.remove(endMarkerRef.current); endMarkerRef.current = null; }
    if (blueDotRef.current) { scene.remove(blueDotRef.current); blueDotRef.current = null; }

    // Start marker (blue dot with glow)
    if (selectedStart) {
      const node = NODES.find(n => n.id === selectedStart);
      if (node) {
        const group = new THREE.Group();

        // Inner dot
        const dotGeo = new THREE.SphereGeometry(0.5, 16, 12);
        const dotMat = new THREE.MeshStandardMaterial({
          color: 0x2288ff,
          emissive: 0x2288ff,
          emissiveIntensity: 0.8,
          roughness: 0.2,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.y = 0.5;
        group.add(dot);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.8, 1.5, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x2288ff,
          emissive: 0x2288ff,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        // Point light
        const light = new THREE.PointLight(0x2288ff, 1.0, 6);
        light.position.y = 1;
        group.add(light);

        group.position.set(node.x, 0, -node.y);
        scene.add(group);
        blueDotRef.current = group;
      }
    }

    // End marker (red pin)
    if (selectedEnd && !emergencyMode) {
      const node = NODES.find(n => n.id === selectedEnd);
      if (node) {
        const group = new THREE.Group();

        const pinGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0xff3344,
          emissive: 0xff2233,
          emissiveIntensity: 0.5,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.y = 2;
        group.add(pin);

        const baseGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xff2233, emissiveIntensity: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 1.2;
        group.add(base);

        group.position.set(node.x, 0, -node.y);
        scene.add(group);
        endMarkerRef.current = group;
      }
    }
  }, [selectedStart, selectedEnd, emergencyMode]);

  // ============================================================
  // UPDATE FIRE MARKERS
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    fireIconsRef.current.forEach(m => scene.remove(m));
    fireIconsRef.current = [];

    blockedEdges.forEach(b => {
      const n1 = NODES.find(n => n.id === b.from);
      const n2 = NODES.find(n => n.id === b.to);
      if (!n1 || !n2) return;

      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;

      // Fire glow
      const fireLight = new THREE.PointLight(0xff4400, 2, 10);
      fireLight.position.set(midX, 2, -midY);
      scene.add(fireLight);
      fireIconsRef.current.push(fireLight);

      // Fire sphere
      const geo = new THREE.SphereGeometry(0.5, 8, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(midX, 1.5, -midY);
      scene.add(mesh);
      fireIconsRef.current.push(mesh);

      // Blocked wall (red barrier)
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const barrierGeo = new THREE.BoxGeometry(length, 0.3, 0.1);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6,
      });
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(midX, 0.15, -midY);
      barrier.rotation.y = -angle;
      scene.add(barrier);
      fireIconsRef.current.push(barrier);
    });
  }, [blockedEdges]);

  // ============================================================
  // MOUSE / TOUCH HANDLERS
  // ============================================================
  const handleMouseDown = (e) => {
    controlsRef.current.isDown = true;
    controlsRef.current.startX = e.clientX;
    controlsRef.current.startY = e.clientY;
    controlsRef.current.moved = false;
  };

  const handleMouseMove = (e) => {
    const ctrl = controlsRef.current;
    if (!ctrl.isDown) return;

    const dx = e.clientX - ctrl.startX;
    const dy = e.clientY - ctrl.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ctrl.moved = true;

    ctrl.targetRotY -= dx * 0.005;
    ctrl.targetRotX = Math.max(0.1, Math.min(Math.PI / 2.2, ctrl.targetRotX + dy * 0.005));
    ctrl.startX = e.clientX;
    ctrl.startY = e.clientY;
  };

  const handleMouseUp = (e) => {
    const ctrl = controlsRef.current;
    ctrl.isDown = false;

    if (!ctrl.moved && mode === 'navigate') {
      handleNodeClick(e);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const ctrl = controlsRef.current;
    ctrl.targetDistance = Math.max(15, Math.min(120, ctrl.targetDistance + e.deltaY * 0.05));
  };

  // Click to select node
  const handleNodeClick = (e) => {
    const mount = mountRef.current;
    const camera = cameraRef.current;
    if (!mount || !camera) return;

    const rect = mount.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(nodeMeshesRef.current);

    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId;
      if (!nodeId) return;

      if (!selectedStart) {
        setSelectedStart(nodeId);
      } else if (!selectedEnd && !emergencyMode) {
        if (nodeId !== selectedStart) {
          setSelectedEnd(nodeId);
        }
      } else {
        setSelectedStart(nodeId);
        setSelectedEnd(null);
        setCurrentPath(null);
        setPathInfo(null);
        setDirections([]);
      }
    }
  };

  // Touch handlers
  const touchRef = useRef({ startX: 0, startY: 0, time: 0 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      controlsRef.current.isDown = true;
      controlsRef.current.startX = t.clientX;
      controlsRef.current.startY = t.clientY;
      controlsRef.current.moved = false;
      touchRef.current = { startX: t.clientX, startY: t.clientY, time: Date.now() };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const ctrl = controlsRef.current;
      const dx = t.clientX - ctrl.startX;
      const dy = t.clientY - ctrl.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ctrl.moved = true;
      ctrl.targetRotY -= dx * 0.005;
      ctrl.targetRotX = Math.max(0.1, Math.min(Math.PI / 2.2, ctrl.targetRotX + dy * 0.005));
      ctrl.startX = t.clientX;
      ctrl.startY = t.clientY;
    }
    // Pinch zoom
    if (e.touches.length === 2) {
      const d = Math.sqrt(
        (e.touches[0].clientX - e.touches[1].clientX) ** 2 +
        (e.touches[0].clientY - e.touches[1].clientY) ** 2
      );
      if (touchRef.current.pinchDist) {
        const delta = touchRef.current.pinchDist - d;
        controlsRef.current.targetDistance = Math.max(15, Math.min(120, controlsRef.current.targetDistance + delta * 0.1));
      }
      touchRef.current.pinchDist = d;
    }
  };

  const handleTouchEnd = (e) => {
    const ctrl = controlsRef.current;
    ctrl.isDown = false;
    touchRef.current.pinchDist = null;

    if (!ctrl.moved && mode === 'navigate') {
      const t = touchRef.current;
      if (Date.now() - t.time < 300) {
        handleNodeClick({ clientX: t.startX, clientY: t.startY });
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
            {wheelchairMode && <span className="mode-badge wheelchair">♿ Wheelchair</span>}
            <button className={`toolbar-btn ${showNodes ? 'active' : ''}`} onClick={() => setShowNodes(!showNodes)}>
              📍 Nodes
            </button>
          </div>
          <div className="toolbar-right">
            <button className={`toolbar-btn fire ${emergencyMode ? 'active' : ''}`} onClick={simulateFire}>
              🔥 Fire
            </button>
            <button className="toolbar-btn" onClick={clearAll}>↻ Clear</button>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div className="map-toolbar">
          <span className="mode-badge view">🏢 Building Overview — Ground Floor</span>
        </div>
      )}

      {/* EMERGENCY */}
      {emergencyMode && (
        <div className="emergency-banner">🚨 EMERGENCY — FIRE DETECTED — REROUTING 🚨</div>
      )}

      {/* DIRECTION */}
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
        <div className="map-instructions">Tap a node to set your <strong>starting point</strong></div>
      )}
      {mode === 'navigate' && selectedStart && !selectedEnd && !emergencyMode && (
        <div className="map-instructions">Now tap a <strong>destination</strong>, or press 🔥 for emergency</div>
      )}

      {/* 3D CANVAS */}
      <div
        className="map-canvas-container"
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* FLOOR SELECTOR */}
      <div className="floor-selector">
        <button className="floor-btn" disabled>2</button>
        <button className="floor-btn" disabled>1</button>
        <button className="floor-btn active">G</button>
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
            <span className="legend-item"><span className="dot" style={{ background: '#2288FF' }}></span>You</span>
            <span className="legend-item"><span className="dot" style={{ background: '#3388FF' }}></span>Path</span>
          </>
        )}
      </div>
    </div>
  );
}
