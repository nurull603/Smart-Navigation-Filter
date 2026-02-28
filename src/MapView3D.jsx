import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { BUILDING, NODES, EDGES, ZONES, CORRIDORS, WALLS, BEACONS, FIRE_ZONES } from './data/buildingData';
import { dijkstra, findNearestExit } from './pathfinding';

// ============================================================
// NODE COLORS
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

function cssToHex(css) {
  return parseInt(css.replace('#', ''), 16);
}

// ============================================================
// VOICE ENGINE — uses Web Speech API
// ============================================================
function speak(text) {
  webSpeak(text);
}

function webSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
  if (preferred) utterance.voice = preferred;
  else {
    const english = voices.find(v => v.lang.startsWith('en'));
    if (english) utterance.voice = english;
  }
  window.speechSynthesis.speak(utterance);
}

// ============================================================
// VIBRATION ENGINE (for deaf/hearing impaired users)
// ============================================================
// Patterns: different NUMBER of buzzes — 350ms pause between each for easy counting
const VIBRATION_PATTERNS = {
  straight:  [200],                                        // 1 buzz
  left:      [200, 350, 200],                              // 2 buzzes
  right:     [200, 350, 200, 350, 200],                    // 3 buzzes
  start:     [200, 350, 200, 350, 200, 350, 200],          // 4 buzzes
  special:   [200, 350, 200, 350, 200, 350, 200, 350, 200], // 5 buzzes (elevator/ramp/stairs)
  arrive:    [800],                                        // 1 long buzz
  emergency: [200, 80, 200, 80, 200, 80, 200, 80, 200, 80, 500], // rapid pulses + long
};

function vibrate(type) {
  if (!('vibrate' in navigator)) return;
  const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.straight;
  navigator.vibrate(pattern);
}

function vibrateEmergency() {
  if (!('vibrate' in navigator)) return;
  // Strong repeated pattern for emergency — runs 3 times
  navigator.vibrate([
    200, 80, 200, 80, 200, 80, 200, 80, 200, 300,
    200, 80, 200, 80, 200, 80, 200, 80, 200, 300,
    500, 200, 500,
  ]);
}

function stopVibration() {
  if ('vibrate' in navigator) navigator.vibrate(0);
}

// ============================================================
// GENERATE DIRECTIONS (improved for voice)
// ============================================================
function generateVoiceDirections(path, nodes) {
  if (!path || path.length < 2) return [];

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const directions = [];

  // First instruction
  const startNode = nodeMap[path[0]];
  const secondNode = nodeMap[path[1]];
  const startDx = secondNode.x - startNode.x;
  const startDy = secondNode.y - startNode.y;
  let startDir = '';
  if (Math.abs(startDx) > Math.abs(startDy)) {
    startDir = startDx > 0 ? 'east' : 'west';
  } else {
    startDir = startDy > 0 ? 'north' : 'south';
  }

  directions.push({
    text: `Route calculated. Head ${startDir}.`,
    nodeId: path[0],
    type: 'start',
  });

  for (let i = 1; i < path.length; i++) {
    const prev = nodeMap[path[i - 1]];
    const curr = nodeMap[path[i]];
    const next = i < path.length - 1 ? nodeMap[path[i + 1]] : null;

    if (!prev || !curr) continue;

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;

    // Check node type for special instructions
    const nodeType = curr.type;
    let specialText = '';
    if (nodeType === 'elevator') specialText = 'Take the elevator.';
    else if (nodeType === 'stairs') specialText = 'Use the stairwell.';
    else if (nodeType === 'ramp') specialText = 'Use the ramp.';
    else if (nodeType === 'refuge') specialText = 'Proceed to the refuge area. Help is on the way.';

    // Last node = arrival
    if (i === path.length - 1) {
      const label = curr.label || curr.type;
      let arriveText = `You have arrived at ${label}.`;
      if (nodeType === 'exit') arriveText = `You have reached ${label}. Exit the building now.`;
      if (nodeType === 'refuge') arriveText = `You have reached the refuge area. Help is on the way.`;
      directions.push({
        text: arriveText,
        nodeId: path[i],
        type: 'arrive',
      });
      continue;
    }

    // Determine turn
    if (next) {
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      // Cross product for turn direction
      const cross = dx * dy2 - dy * dx2;
      // Dot product to check if continuing straight
      const dot = dx * dx2 + dy * dy2;

      if (Math.abs(cross) < 0.5 && dot > 0) {
        // Straight
        if (specialText) {
          directions.push({ text: specialText, nodeId: path[i], type: 'special' });
        } else {
          directions.push({ text: 'Continue straight.', nodeId: path[i], type: 'straight' });
        }
      } else if (cross > 0.5) {
        directions.push({
          text: specialText || 'Turn left.',
          nodeId: path[i],
          type: 'left',
        });
      } else if (cross < -0.5) {
        directions.push({
          text: specialText || 'Turn right.',
          nodeId: path[i],
          type: 'right',
        });
      } else {
        if (specialText) {
          directions.push({ text: specialText, nodeId: path[i], type: 'special' });
        } else {
          directions.push({ text: 'Continue straight.', nodeId: path[i], type: 'straight' });
        }
      }
    }
  }

  return directions;
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
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(
    profile?.disabilities?.hearingImpaired ? true : false
  );
  const [showVibGuide, setShowVibGuide] = useState(false);

  const hearingImpaired = profile?.disabilities?.hearingImpaired || false;

  // Hazard state
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [showNodes, setShowNodes] = useState(true);
  const [bleScanning, setBleScanning] = useState(false);
  const [currentBeaconNode, setCurrentBeaconNode] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [bleDebug, setBleDebug] = useState('');
  const [bleDeviceCount, setBleDeviceCount] = useState(0);
  const [showBleDebug, setShowBleDebug] = useState(true);
  const [bleLog, setBleLog] = useState([]);
  const beaconRSSI = useRef({});        // raw latest readings
  const beaconSmoothed = useRef({});    // smoothed RSSI (rolling average)
  const currentBeaconRef = useRef(null);
  const adCountRef = useRef(0);
  const interpolatedPos = useRef({ x: 0, y: 0 }); // smoothly interpolated position

  // Refs for dynamic 3D objects
  const routeGroupRef = useRef(null);
  const nodeMeshesRef = useRef([]);
  const nodeVisualsRef = useRef([]);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const blueDotRef = useRef(null);
  const fireGroupRef = useRef(null);
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
      setCurrentStep(0);
      return;
    }

    if (!selectedStart) {
      setCurrentPath(null);
      setPathInfo(null);
      setDirections([]);
      setCurrentStep(0);
      return;
    }

    if (emergencyMode) {
      const result = findNearestExit(selectedStart, NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        const target = NODES.find(n => n.id === result.targetId);
        setPathInfo({ distance: result.distance.toFixed(1), isRefuge: result.isRefuge, destination: target?.label || result.targetId });
        const dirs = generateVoiceDirections(result.path, NODES);
        setDirections(dirs);
        setCurrentStep(0);
        // Announce emergency
        if (voiceEnabled) {
          setTimeout(() => speak('Fire detected. Rerouting to nearest exit.'), 300);
          setTimeout(() => { if (dirs.length > 0) speak(dirs[0].text); }, 2500);
        }
        if (vibrationEnabled) vibrateEmergency();
      } else {
        setCurrentPath(null);
        setPathInfo({ error: 'No safe path available!' });
        setDirections([]);
        setCurrentStep(0);
        if (voiceEnabled) speak('No safe path available.');
        if (vibrationEnabled) vibrateEmergency();
      }
    } else if (selectedEnd) {
      const result = dijkstra(selectedStart, selectedEnd, NODES, EDGES, wheelchairMode, blockedEdges);
      if (result) {
        setCurrentPath(result.path);
        const target = NODES.find(n => n.id === selectedEnd);
        setPathInfo({ distance: result.distance.toFixed(1), destination: target?.label || selectedEnd });
        const dirs = generateVoiceDirections(result.path, NODES);
        setDirections(dirs);
        setCurrentStep(0);
        // Announce route
        if (voiceEnabled && dirs.length > 0) {
          setTimeout(() => speak(dirs[0].text), 300);
        }
        if (vibrationEnabled && dirs.length > 0) {
          setTimeout(() => vibrate(dirs[0].type), 300);
        }
      } else {
        setCurrentPath(null);
        setPathInfo({ error: wheelchairMode ? 'No accessible path! Route may require stairs.' : 'No path available!' });
        setDirections([]);
        setCurrentStep(0);
        if (voiceEnabled) speak('No path available.');
      }
    }
  }, [selectedStart, selectedEnd, wheelchairMode, emergencyMode, blockedEdges, mode]);

  // ============================================================
  // NEXT STEP (simulate walking)
  // ============================================================
  const handleNextStep = () => {
    if (currentStep < directions.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (voiceEnabled) {
        speak(directions[nextStep].text);
      }
      if (vibrationEnabled) {
        vibrate(directions[nextStep].type);
      }
      // Move blue dot to the node of this step
      const nodeId = directions[nextStep].nodeId;
      if (nodeId && blueDotRef.current) {
        const node = NODES.find(n => n.id === nodeId);
        if (node) {
          blueDotRef.current.position.set(node.x, 0, -node.y);
        }
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (voiceEnabled) {
        speak(directions[prevStep].text);
      }
      if (vibrationEnabled) {
        vibrate(directions[prevStep].type);
      }
      const nodeId = directions[prevStep].nodeId;
      if (nodeId && blueDotRef.current) {
        const node = NODES.find(n => n.id === nodeId);
        if (node) {
          blueDotRef.current.position.set(node.x, 0, -node.y);
        }
      }
    }
  };

  // ============================================================
  // AUTO-ADVANCE: beacon moves → step advances automatically
  // ============================================================
  useEffect(() => {
    if (!currentBeaconNode || directions.length === 0) return;

    // Check if current beacon matches any direction step AHEAD of current step
    for (let i = currentStep + 1; i < directions.length; i++) {
      if (directions[i].nodeId === currentBeaconNode) {
        setCurrentStep(i);
        if (voiceEnabled) speak(directions[i].text);
        if (vibrationEnabled) vibrate(directions[i].type);
        break;
      }
    }

    // Also check nodes near the beacon on the path
    if (currentPath) {
      const beaconIdx = currentPath.indexOf(currentBeaconNode);
      if (beaconIdx >= 0) {
        for (let i = currentStep + 1; i < directions.length; i++) {
          const dirNodeIdx = currentPath.indexOf(directions[i].nodeId);
          if (dirNodeIdx >= 0 && dirNodeIdx <= beaconIdx) {
            setCurrentStep(i);
            if (voiceEnabled) speak(directions[i].text);
            if (vibrationEnabled) vibrate(directions[i].type);
            break;
          }
        }
      }
    }
  }, [currentBeaconNode]);

  // ============================================================
  // BUILD 3D SCENE (runs once)
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
    const renderer = new THREE.WebGLRenderer({ antialias: true });
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

    // --- GROUND (dark exterior) ---
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- BUILDING FLOOR ---
    const floorGeo = new THREE.PlaneGeometry(BUILDING.width, BUILDING.height);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // --- CORRIDORS ---
    CORRIDORS.forEach(c => {
      const geo = new THREE.PlaneGeometry(c.w, c.h);
      const mat = new THREE.MeshStandardMaterial({ color: 0x252a3a, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(c.x + c.w / 2, 0.01, -(c.y + c.h / 2));
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // --- ROOMS ---
    ZONES.forEach(z => {
      const geo = new THREE.PlaneGeometry(z.w, z.h);
      const mat = new THREE.MeshStandardMaterial({
        color: cssToHex(z.color),
        roughness: 0.5,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(z.x + z.w / 2, 0.02, -(z.y + z.h / 2));
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Room label sprite
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
        ctx.fillText(z.name.replace('\n', ' '), 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(z.x + z.w / 2, 1.5, -(z.y + z.h / 2));
        sprite.scale.set(z.w * 0.6, z.w * 0.15, 1);
        scene.add(sprite);
      }
    });

    // --- WALLS ---
    const wallHeight = 3.0;
    const wallThickness = 0.25;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d4, roughness: 0.4, metalness: 0.1 });

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

    // Wall top edges
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.5 });
    WALLS.forEach(w => {
      const pts = [
        new THREE.Vector3(w.x1, wallHeight + 0.01, -w.y1),
        new THREE.Vector3(w.x2, wallHeight + 0.01, -w.y2),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(new THREE.Line(geo, edgeMat));
    });

    // --- EXIT SIGNS ---
    NODES.filter(n => n.type === 'exit').forEach(exit => {
      const signGeo = new THREE.BoxGeometry(2.5, 0.8, 0.1);
      const signMat = new THREE.MeshStandardMaterial({
        color: 0x00cc40, emissive: 0x00aa30, emissiveIntensity: 0.6, roughness: 0.3,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(exit.x, wallHeight - 0.5, -exit.y);
      scene.add(sign);

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

      ctrl.rotY += (ctrl.targetRotY - ctrl.rotY) * 0.08;
      ctrl.rotX += (ctrl.targetRotX - ctrl.rotX) * 0.08;
      ctrl.distance += (ctrl.targetDistance - ctrl.distance) * 0.08;
      ctrl.panX += (ctrl.targetPanX - ctrl.panX) * 0.08;
      ctrl.panZ += (ctrl.targetPanZ - ctrl.panZ) * 0.08;

      const cx = ctrl.panX + ctrl.distance * Math.sin(ctrl.rotY) * Math.cos(ctrl.rotX);
      const cy = ctrl.distance * Math.sin(ctrl.rotX);
      const cz = ctrl.panZ + ctrl.distance * Math.cos(ctrl.rotY) * Math.cos(ctrl.rotX);

      camera.position.set(cx, cy, cz);
      camera.lookAt(ctrl.panX, 0, ctrl.panZ);

      renderer.render(scene, camera);
    };
    animate();

    // Preload voices
    window.speechSynthesis?.getVoices();

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
  // BLE BEACON SCANNING — ROBUST VERSION WITH DEBUG
  // ============================================================

  // Keep ref in sync with state
  useEffect(() => {
    currentBeaconRef.current = currentBeaconNode;
  }, [currentBeaconNode]);

  // Helper: add to debug log (keeps last 30 entries)
  const addLog = useCallback((msg) => {
    setBleLog(prev => [...prev.slice(-29), { t: Date.now(), msg }]);
  }, []);

  // Helper: DataView to hex string for debugging
  const dvToHex = (dv) => {
    const bytes = [];
    for (let i = 0; i < Math.min(dv.byteLength, 30); i++) {
      bytes.push(dv.getUint8(i).toString(16).padStart(2, '0'));
    }
    return bytes.join(' ');
  };

  // Parse iBeacon data from manufacturer data — tries multiple strategies
  const parseBeaconFromAd = useCallback((event) => {
    const mfData = event.manufacturerData;
    if (!mfData || mfData.size === 0) return null;

    for (const [companyId, dataView] of mfData) {
      if (!dataView || dataView.byteLength < 4) continue;

      // Strategy 1: Standard iBeacon — look for 0x02 0x15 in first 10 bytes
      for (let i = 0; i <= Math.min(dataView.byteLength - 22, 10); i++) {
        try {
          if (dataView.getUint8(i) === 0x02 && dataView.getUint8(i + 1) === 0x15) {
            if (i + 22 <= dataView.byteLength) {
              const major = (dataView.getUint8(i + 18) << 8) | dataView.getUint8(i + 19);
              const minor = (dataView.getUint8(i + 20) << 8) | dataView.getUint8(i + 21);
              return { major, minor, rssi: event.rssi, method: 'iBeacon', companyId };
            }
          }
        } catch (e) {}
      }

      // Strategy 2: Some beacons put major/minor at fixed offsets without 0x02 0x15 prefix
      if (dataView.byteLength >= 20) {
        try {
          // Try reading major at byte 18, minor at byte 20 (raw offset)
          const major = (dataView.getUint8(18) << 8) | dataView.getUint8(19);
          const minor = (dataView.getUint8(20) << 8) | dataView.getUint8(21);
          // Check if this matches any known beacon
          const match = BEACONS.find(b => b.minor === minor && b.major === major);
          if (match) {
            return { major, minor, rssi: event.rssi, method: 'rawOffset', companyId };
          }
        } catch (e) {}
      }
    }
    return null;
  }, []);

  // Smooth RSSI using exponential moving average
  const smoothRSSI = (beaconId, rawRSSI) => {
    const alpha = 0.3; // smoothing factor (0-1, lower = smoother)
    const prev = beaconSmoothed.current[beaconId];
    if (prev === undefined) {
      beaconSmoothed.current[beaconId] = rawRSSI;
    } else {
      beaconSmoothed.current[beaconId] = alpha * rawRSSI + (1 - alpha) * prev;
    }
    return beaconSmoothed.current[beaconId];
  };

  // Path waypoints between Beacon 1 (Living Room) and Beacon 2 (Bedroom)
  // The dot slides along these points based on signal ratio
  const BEACON_PATH = [
    { id: 'LIVING_C',      x: 9,  y: 7  },  // ratio 0.0
    { id: 'LIVING_S',      x: 9,  y: 0  },  // ratio 0.25
    { id: 'HALL',           x: -2, y: 0  },  // ratio 0.50
    { id: 'BEDROOM_DOOR',  x: -3, y: 3  },  // ratio 0.75
    { id: 'BEDROOM_C',     x: -9, y: 8  },  // ratio 1.0
  ];

  // Convert RSSI ratio to position along the path
  const getInterpolatedPosition = (ratio) => {
    // ratio: 0 = at beacon 1 (living), 1 = at beacon 2 (bedroom)
    const clamped = Math.max(0, Math.min(1, ratio));
    const totalSegments = BEACON_PATH.length - 1;
    const segment = clamped * totalSegments;
    const idx = Math.floor(segment);
    const frac = segment - idx;

    const from = BEACON_PATH[Math.min(idx, totalSegments)];
    const to = BEACON_PATH[Math.min(idx + 1, totalSegments)];

    return {
      x: from.x + (to.x - from.x) * frac,
      y: from.y + (to.y - from.y) * frac,
      nearestNode: clamped < 0.5 ? 'LIVING_C' : 'BEDROOM_C',
    };
  };

  // Determine position from RSSI ratio and move dot
  const updateBeaconPosition = useCallback(() => {
    const now = Date.now();
    const b1 = beaconRSSI.current['BEACON_1']; // Living room
    const b2 = beaconRSSI.current['BEACON_2']; // Bedroom

    // Need at least one beacon
    if (!b1 && !b2) return;

    // If only one beacon heard, place at that beacon
    if (!b1 || now - b1.timestamp > 12000) {
      // Only bedroom beacon active
      const pos = getInterpolatedPosition(1.0);
      interpolatedPos.current = pos;
      moveBlueDot(pos.x, pos.y);
      if (currentBeaconRef.current !== 'BEDROOM_C') {
        currentBeaconRef.current = 'BEDROOM_C';
        setCurrentBeaconNode('BEDROOM_C');
        setSelectedStart('BEDROOM_C');
        speak('You are near Bedroom');
        addLog('At Bedroom (only beacon heard)');
      }
      return;
    }
    if (!b2 || now - b2.timestamp > 12000) {
      // Only living room beacon active
      const pos = getInterpolatedPosition(0.0);
      interpolatedPos.current = pos;
      moveBlueDot(pos.x, pos.y);
      if (currentBeaconRef.current !== 'LIVING_C') {
        currentBeaconRef.current = 'LIVING_C';
        setCurrentBeaconNode('LIVING_C');
        setSelectedStart('LIVING_C');
        speak('You are near Living Room');
        addLog('At Living Room (only beacon heard)');
      }
      return;
    }

    // Both beacons heard — calculate ratio from smoothed RSSI
    const rssi1 = beaconSmoothed.current['BEACON_1'] || b1.rssi; // Living
    const rssi2 = beaconSmoothed.current['BEACON_2'] || b2.rssi; // Bedroom

    // Convert RSSI to ratio: when rssi2 > rssi1, ratio → 1 (bedroom)
    // RSSI is negative; closer = higher (less negative)
    // ratio = 0 means at living room, 1 means at bedroom
    const diff = rssi2 - rssi1; // positive = closer to bedroom
    // Map diff to 0-1 range. Typical range is about -30 to +30 dBm difference
    const ratio = 0.5 + (diff / 60); // 60 dBm total range
    const clamped = Math.max(0, Math.min(1, ratio));

    const pos = getInterpolatedPosition(clamped);
    interpolatedPos.current = pos;
    moveBlueDot(pos.x, pos.y);

    // Update "nearest room" for voice/UI (only announce when clearly in a room)
    const nearestNode = clamped < 0.35 ? 'LIVING_C' : clamped > 0.65 ? 'BEDROOM_C' : null;
    if (nearestNode && nearestNode !== currentBeaconRef.current) {
      currentBeaconRef.current = nearestNode;
      setCurrentBeaconNode(nearestNode);
      setSelectedStart(nearestNode);
      const label = nearestNode === 'LIVING_C' ? 'Living Room' : 'Bedroom';
      speak('You are near ' + label);
      addLog('MOVED to ' + label + ' (ratio: ' + clamped.toFixed(2) + ' RSSI: ' + rssi1.toFixed(0) + '/' + rssi2.toFixed(0) + ')');
    }

    // Update debug with live RSSI
    setBleDebug('LR: ' + rssi1.toFixed(0) + ' | BR: ' + rssi2.toFixed(0) + ' | pos: ' + (clamped * 100).toFixed(0) + '%');
  }, [addLog]);

  // Helper: move blue dot to interpolated x,y position
  const moveBlueDot = (x, y) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (blueDotRef.current) {
      blueDotRef.current.position.set(x, 0, -y);
      blueDotRef.current.visible = true;
      return;
    }

    // Create blue dot if it doesn't exist yet
    const group = new THREE.Group();
    const dotGeo = new THREE.SphereGeometry(0.5, 16, 12);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 0.8, roughness: 0.2,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.y = 0.5;
    group.add(dot);

    const ringGeo = new THREE.RingGeometry(0.8, 1.5, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    const light = new THREE.PointLight(0x2288ff, 1.0, 6);
    light.position.y = 1;
    group.add(light);

    group.position.set(x, 0, -y);
    scene.add(group);
    blueDotRef.current = group;
  };

  const bleScanAbortRef = useRef(null);
  const bleListenerRef = useRef(null);

  const startBLEScan = useCallback(async () => {
    if (!BEACONS || BEACONS.length === 0) {
      setBleDebug('No beacons configured.');
      return;
    }

    if (!navigator.bluetooth) {
      setBleDebug('Bluetooth not supported. Use Chrome on Android.');
      speak('Bluetooth is not supported in this browser.');
      return;
    }

    // If already scanning, stop
    if (bleScanning) {
      stopBLEScan();
      return;
    }

    try {
      setBleDebug('Starting scan...');
      addLog('Scan starting...');
      addLog('Beacons configured: ' + BEACONS.map(b => b.label + ' minor=' + b.minor).join(', '));

      if (navigator.bluetooth.requestLEScan) {
        addLog('requestLEScan API available ✓');

        const abortController = new AbortController();
        bleScanAbortRef.current = abortController;

        await navigator.bluetooth.requestLEScan({
          acceptAllAdvertisements: true,
          signal: abortController.signal,
        });

        addLog('Scan started! Listening for advertisements...');

        const listener = (event) => {
          adCountRef.current += 1;
          const count = adCountRef.current;
          const name = event.device?.name || event.device?.id?.slice(0, 8) || '??';
          const rssi = event.rssi;
          const mfSize = event.manufacturerData?.size || 0;

          // Log first 20 advertisements + every 50th after that
          if (count <= 20 || count % 50 === 0) {
            let logMsg = '#' + count + ' ' + name + ' RSSI=' + rssi + ' mfData=' + mfSize;
            // Log raw hex of manufacturer data
            if (event.manufacturerData) {
              for (const [cid, dv] of event.manufacturerData) {
                logMsg += ' [0x' + cid.toString(16) + ': ' + dvToHex(dv) + ']';
              }
            }
            addLog(logMsg);
          }

          // Update device count display
          if (count % 10 === 0) {
            setBleDeviceCount(count);
          }

          // Try to parse as iBeacon
          const parsed = parseBeaconFromAd(event);
          if (parsed) {
            const beacon = BEACONS.find(b => b.minor === parsed.minor && b.major === parsed.major);
            if (beacon) {
              const smoothed = smoothRSSI(beacon.id, parsed.rssi);
              beaconRSSI.current[beacon.id] = {
                rssi: parsed.rssi,
                smoothed: smoothed,
                nodeId: beacon.nodeId,
                label: beacon.label,
                timestamp: Date.now(),
              };
              setBleDebug(beacon.label + ': RSSI ' + parsed.rssi + ' (avg ' + smoothed.toFixed(0) + ') via ' + parsed.method);
              updateBeaconPosition();
            }
          }

          // Fallback: try to identify Blue Charm beacons by name
          if (!parsed && name && (name.includes('BC') || name.includes('Beacon') || name.includes('Blue'))) {
            addLog('Known device name: ' + name + ' RSSI=' + rssi + ' (no iBeacon data parsed)');
          }
        };

        bleListenerRef.current = listener;
        navigator.bluetooth.addEventListener('advertisementreceived', listener);

        setBleScanning(true);
        setBleDebug('Scanning... walk around');
        speak('Scanning started.');

      } else {
        addLog('requestLEScan NOT available');
        addLog('Go to chrome://flags → "Experimental Web Platform features" → Enable → Relaunch');
        setBleDebug('Enable "Experimental Web Platform features" in chrome://flags');
      }

    } catch (err) {
      const msg = err?.message || String(err);
      addLog('SCAN ERROR: ' + msg);
      setBleDebug('Error: ' + msg);
      speak('Scan failed. Make sure Bluetooth and Location are on.');
      setBleScanning(false);
    }
  }, [bleScanning, updateBeaconPosition, parseBeaconFromAd, addLog]);

  const stopBLEScan = useCallback(() => {
    try {
      if (bleScanAbortRef.current) {
        bleScanAbortRef.current.abort();
        bleScanAbortRef.current = null;
      }
      if (bleListenerRef.current) {
        navigator.bluetooth?.removeEventListener('advertisementreceived', bleListenerRef.current);
        bleListenerRef.current = null;
      }
      beaconRSSI.current = {};
      beaconSmoothed.current = {};
      adCountRef.current = 0;
      setBleScanning(false);
      setCurrentBeaconNode(null);
      setBleDebug('');
      setBleLog([]);
      speak('Scanning stopped.');
    } catch (e) {
      setBleScanning(false);
    }
  }, []);

  // ============================================================
  // MOVE BLUE DOT — now handled by moveBlueDot() in updateBeaconPosition
  // This effect just handles camera follow
  // ============================================================
  useEffect(() => {
    if (!currentBeaconNode || !followMode || !cameraRef.current) return;
    const pos = interpolatedPos.current;
    const cam = cameraRef.current;
    cam.position.set(pos.x, 35, -pos.y + 25);
    cam.lookAt(pos.x, 0, -pos.y);
  }, [currentBeaconNode, followMode]);

  // ============================================================
  // UPDATE NODES
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old
    nodeMeshesRef.current.forEach(m => scene.remove(m));
    nodeVisualsRef.current.forEach(m => scene.remove(m));
    nodeMeshesRef.current = [];
    nodeVisualsRef.current = [];

    if (!showNodes) return;

    NODES.forEach(node => {
      const isSmall = node.type === 'intersection' || node.type === 'door';
      const visualRadius = isSmall ? 0.3 : 0.5;
      const color = NODE_COLORS_HEX[node.type] || 0x888888;

      // Visible sphere
      const geo = new THREE.SphereGeometry(visualRadius, 12, 8);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.3, roughness: 0.4,
      });
      const visual = new THREE.Mesh(geo, mat);
      visual.position.set(node.x, 0.4, -node.y);
      scene.add(visual);
      nodeVisualsRef.current.push(visual);

      // Invisible hit sphere (bigger, easier to click)
      const hitGeo = new THREE.SphereGeometry(1.2, 8, 6);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(node.x, 0.4, -node.y);
      hitMesh.userData = { nodeId: node.id };
      scene.add(hitMesh);
      nodeMeshesRef.current.push(hitMesh);
    });
  }, [showNodes]);

  // ============================================================
  // UPDATE ROUTE PATH (FIXED)
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old route group
    if (routeGroupRef.current) {
      scene.remove(routeGroupRef.current);
      routeGroupRef.current.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      routeGroupRef.current = null;
    }

    if (!currentPath || currentPath.length < 2) return;

    const nodeMap = {};
    NODES.forEach(n => { nodeMap[n.id] = n; });

    const points = currentPath.map(id => {
      const n = nodeMap[id];
      return new THREE.Vector3(n.x, 0.15, -n.y);
    });

    const routeGroup = new THREE.Group();

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);

    // Main tube
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.25, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x3388ff, emissive: 0x2266cc, emissiveIntensity: 0.6,
      roughness: 0.3, transparent: true, opacity: 0.85,
    });
    routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Glow tube
    const glowGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.6, 8, false);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3388ff, emissive: 0x3388ff, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.15,
    });
    routeGroup.add(new THREE.Mesh(glowGeo, glowMat));

    // Route light
    const midIdx = Math.floor(points.length / 2);
    const routeLight = new THREE.PointLight(0x3388ff, 0.5, 15);
    routeLight.position.copy(points[midIdx]).setY(1);
    routeGroup.add(routeLight);

    scene.add(routeGroup);
    routeGroupRef.current = routeGroup;

  }, [currentPath]);

  // ============================================================
  // UPDATE START/END MARKERS
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Cleanup old markers (skip blueDot when beacon scanning — beacon effect handles it)
    [startMarkerRef, endMarkerRef].forEach(ref => {
      if (ref.current) {
        scene.remove(ref.current);
        ref.current = null;
      }
    });
    // Only cleanup blueDot if NOT scanning
    if (!bleScanning && blueDotRef.current) {
      scene.remove(blueDotRef.current);
      blueDotRef.current = null;
    }

    // Blue dot at start (only if NOT scanning — scanning has its own dot)
    if (selectedStart && !bleScanning) {
      const node = NODES.find(n => n.id === selectedStart);
      if (node) {
        const group = new THREE.Group();

        // Inner sphere
        const dotGeo = new THREE.SphereGeometry(0.5, 16, 12);
        const dotMat = new THREE.MeshStandardMaterial({
          color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 0.8, roughness: 0.2,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.y = 0.5;
        group.add(dot);

        // Glow ring on floor
        const ringGeo = new THREE.RingGeometry(0.8, 1.5, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x2288ff, emissive: 0x2288ff, emissiveIntensity: 0.4,
          transparent: true, opacity: 0.3, side: THREE.DoubleSide,
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

    // Red pin at end
    if (selectedEnd && !emergencyMode) {
      const node = NODES.find(n => n.id === selectedEnd);
      if (node) {
        const group = new THREE.Group();

        const pinGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0xff3344, emissive: 0xff2233, emissiveIntensity: 0.5,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.y = 2;
        group.add(pin);

        const baseGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0xff3344, emissive: 0xff2233, emissiveIntensity: 0.5,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 1.2;
        group.add(base);

        // Red light
        const light = new THREE.PointLight(0xff3344, 0.5, 5);
        light.position.y = 2;
        group.add(light);

        group.position.set(node.x, 0, -node.y);
        scene.add(group);
        endMarkerRef.current = group;
      }
    }
  }, [selectedStart, selectedEnd, emergencyMode, bleScanning]);

  // ============================================================
  // UPDATE FIRE MARKERS
  // ============================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (fireGroupRef.current) {
      scene.remove(fireGroupRef.current);
      fireGroupRef.current = null;
    }

    if (blockedEdges.length === 0) return;

    const fireGroup = new THREE.Group();

    blockedEdges.forEach(b => {
      const n1 = NODES.find(n => n.id === b.from);
      const n2 = NODES.find(n => n.id === b.to);
      if (!n1 || !n2) return;

      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;

      // Fire glow
      const fireLight = new THREE.PointLight(0xff4400, 2, 10);
      fireLight.position.set(midX, 2, -midY);
      fireGroup.add(fireLight);

      // Fire sphere
      const geo = new THREE.SphereGeometry(0.6, 8, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(midX, 1.5, -midY);
      fireGroup.add(mesh);

      // Blocked barrier
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const barrierGeo = new THREE.BoxGeometry(length, 0.3, 0.1);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.6,
      });
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(midX, 0.15, -midY);
      barrier.rotation.y = -angle;
      fireGroup.add(barrier);
    });

    scene.add(fireGroup);
    fireGroupRef.current = fireGroup;
  }, [blockedEdges]);

  // ============================================================
  // MOUSE / TOUCH CONTROLS
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
    controlsRef.current.targetDistance = Math.max(15, Math.min(120,
      controlsRef.current.targetDistance + e.deltaY * 0.05
    ));
  };

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
        if (voiceEnabled) speak('Starting point set.');
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
        setCurrentStep(0);
        if (voiceEnabled) speak('New starting point set.');
      }
    }
  };

  // Touch handlers
  const touchRef = useRef({ startX: 0, startY: 0, time: 0, pinchDist: null });

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      controlsRef.current.isDown = true;
      controlsRef.current.startX = t.clientX;
      controlsRef.current.startY = t.clientY;
      controlsRef.current.moved = false;
      touchRef.current = { startX: t.clientX, startY: t.clientY, time: Date.now(), pinchDist: null };
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
    if (e.touches.length === 2) {
      const d = Math.sqrt(
        (e.touches[0].clientX - e.touches[1].clientX) ** 2 +
        (e.touches[0].clientY - e.touches[1].clientY) ** 2
      );
      if (touchRef.current.pinchDist) {
        const delta = touchRef.current.pinchDist - d;
        controlsRef.current.targetDistance = Math.max(15, Math.min(120,
          controlsRef.current.targetDistance + delta * 0.1
        ));
      }
      touchRef.current.pinchDist = d;
    }
  };

  const handleTouchEnd = () => {
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
    // Pick a random fire zone from building data
    const zoneKeys = FIRE_ZONES ? Object.keys(FIRE_ZONES) : [];
    if (zoneKeys.length === 0) return;
    const zone = FIRE_ZONES[zoneKeys[Math.floor(Math.random() * zoneKeys.length)]];
    setBlockedEdges(zone.blockedEdges || []);
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
    setCurrentStep(0);
    window.speechSynthesis?.cancel();
    stopVibration();
  };

  // ============================================================
  // RENDER
  // ============================================================
  const currentDir = directions[currentStep];
  const dirIcon = currentDir?.type === 'left' ? '⬅️'
    : currentDir?.type === 'right' ? '➡️'
    : currentDir?.type === 'arrive' ? '🏁'
    : currentDir?.type === 'start' ? '📍'
    : currentDir?.type === 'special' ? '⚡'
    : '⬆️';

  return (
    <div className="map-wrapper">
      {/* TOOLBAR */}
      {mode === 'navigate' && (
        <div className="map-toolbar">
          <div className="toolbar-left">
            {wheelchairMode && <span className="mode-badge wheelchair">♿ Wheelchair</span>}
            {hearingImpaired && <span className="mode-badge hearing">📳 Vibration Mode Active</span>}
            <button className={`toolbar-btn ${showNodes ? 'active' : ''}`} onClick={() => setShowNodes(!showNodes)}>
              📍 Nodes
            </button>
            <button
              className={`toolbar-btn ${voiceEnabled ? 'active' : ''}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? '🔊' : '🔇'} Voice
            </button>
            <button
              className={`toolbar-btn ${vibrationEnabled ? 'active' : ''}`}
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
            >
              {vibrationEnabled ? '📳' : '📴'} Vibration
            </button>
            <button
              className="toolbar-btn guide-btn"
              onClick={() => setShowVibGuide(true)}
              title="Vibration Guide"
            >
              ❓ Guide
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className={`toolbar-btn ${bleScanning ? 'active' : ''}`}
              onClick={() => bleScanning ? stopBLEScan() : startBLEScan()}
            >
              📡 {bleScanning ? 'Stop Scan' : 'Scan'}
            </button>
            <button
              className={`toolbar-btn ${followMode ? 'active' : ''}`}
              onClick={() => setFollowMode(!followMode)}
            >
              🎯 {followMode ? 'Following' : 'Follow'}
            </button>
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

      {/* BEACON STATUS + DEBUG PANEL */}
      {bleScanning && (
        <div className="beacon-status">
          📡 {currentBeaconNode
            ? `Near: ${BEACONS.find(b => b.nodeId === currentBeaconNode)?.label || currentBeaconNode}`
            : `Scanning... (${bleDeviceCount} ads received)`}
          {bleDebug && <div style={{fontSize: '0.65rem', opacity: 0.7, marginTop: 2}}>{bleDebug}</div>}
          <button
            onClick={() => setShowBleDebug(!showBleDebug)}
            style={{position:'absolute',right:8,top:8,background:'#333',color:'#fff',border:'none',borderRadius:4,padding:'2px 8px',fontSize:'0.6rem'}}
          >
            {showBleDebug ? 'Hide Log' : 'Show Log'}
          </button>
        </div>
      )}
      {!bleScanning && bleDebug && (
        <div className="beacon-status" style={{background: '#3a1a1a'}}>
          ⚠️ {bleDebug}
        </div>
      )}

      {/* BLE DEBUG LOG */}
      {showBleDebug && bleLog.length > 0 && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0,
          maxHeight:'40vh', overflow:'auto',
          background:'rgba(0,0,0,0.92)', color:'#0f0',
          fontFamily:'monospace', fontSize:'0.55rem', lineHeight:1.3,
          padding:'8px', zIndex:9999,
          borderTop:'2px solid #0f0',
        }}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{color:'#ff0',fontWeight:'bold'}}>BLE DEBUG LOG ({bleLog.length} entries, {bleDeviceCount} ads)</span>
            <button onClick={() => setBleLog([])} style={{background:'#600',color:'#fff',border:'none',borderRadius:3,padding:'1px 6px',fontSize:'0.55rem'}}>Clear</button>
          </div>
          {bleLog.map((entry, i) => (
            <div key={i} style={{borderBottom:'1px solid #222',padding:'1px 0'}}>
              <span style={{color:'#666'}}>{new Date(entry.t).toLocaleTimeString()}:</span> {entry.msg}
            </div>
          ))}
        </div>
      )}

      {/* DIRECTION BAR */}
      {mode === 'navigate' && directions.length > 0 && (
        <div className="direction-bar">
          <span className="direction-icon">{dirIcon}</span>
          <span className="direction-text">{currentDir?.text || ''}</span>
          <span className="direction-step">Step {currentStep + 1}/{directions.length}</span>
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
          {bleScanning
            ? (currentBeaconNode ? <>Position set from beacon. Tap a <strong>destination</strong>, or press 🔥</> : 'Walk near a beacon, or tap a node manually')
            : <>Tap a node to set your <strong>starting point</strong></>}
        </div>
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

      {/* STEP CONTROLS (simulate walking) */}
      {mode === 'navigate' && directions.length > 1 && (
        <div className="step-controls">
          <button
            className="step-btn"
            onClick={handlePrevStep}
            disabled={currentStep <= 0}
          >
            ◀ Prev
          </button>
          <button
            className="step-btn step-btn-primary"
            onClick={handleNextStep}
            disabled={currentStep >= directions.length - 1}
          >
            Next Step ▶
          </button>
          <button
            className="step-btn"
            onClick={() => {
              if (voiceEnabled && currentDir) speak(currentDir.text);
              if (vibrationEnabled && currentDir) vibrate(currentDir.type);
            }}
          >
            🔊 Repeat
          </button>
        </div>
      )}

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

      {/* VIBRATION GUIDE (compact bar for hearing impaired) */}
      {hearingImpaired && vibrationEnabled && mode === 'navigate' && (
        <div className="vibration-guide" onClick={() => setShowVibGuide(true)}>
          <span className="vib-title">📳 Vibration Active — Tap for Guide</span>
          <span className="vib-item">⬆️ 1x</span>
          <span className="vib-item">⬅️ 2x</span>
          <span className="vib-item">➡️ 3x</span>
          <span className="vib-item">⚡ 5x</span>
          <span className="vib-item">🏁 long</span>
          <span className="vib-item">🔥 rapid</span>
        </div>
      )}

      {/* VIBRATION GUIDE MODAL */}
      {showVibGuide && (
        <div className="vib-modal-overlay" onClick={() => setShowVibGuide(false)}>
          <div className="vib-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vib-modal-header">
              <h3>📳 Vibration Guide</h3>
              <button className="vib-modal-close" onClick={() => setShowVibGuide(false)}>✕</button>
            </div>

            <p className="vib-modal-desc">
              Each navigation direction has a unique vibration pattern.
              Press <strong>Test</strong> to feel each pattern.
            </p>

            <div className="vib-modal-list">
              {[
                { icon: '⬆️', label: 'Continue Straight', desc: '1 buzz', type: 'straight', voice: 'Continue straight. 1 buzz.' },
                { icon: '⬅️', label: 'Turn Left', desc: '2 buzzes', type: 'left', voice: 'Turn left. 2 buzzes.' },
                { icon: '➡️', label: 'Turn Right', desc: '3 buzzes', type: 'right', voice: 'Turn right. 3 buzzes.' },
                { icon: '📍', label: 'Route Started', desc: '4 buzzes', type: 'start', voice: 'Route started. 4 buzzes.' },
                { icon: '⚡', label: 'Elevator / Ramp / Stairs', desc: '5 buzzes', type: 'special', voice: 'Elevator, ramp, or stairs. 5 buzzes.' },
                { icon: '🏁', label: 'You Have Arrived', desc: '1 long buzz', type: 'arrive', voice: 'You have arrived. 1 long buzz.' },
                { icon: '🔥', label: 'FIRE EMERGENCY', desc: 'Rapid intense pulses', type: 'emergency', voice: 'Fire emergency. Rapid intense vibration pulses.' },
              ].map((item, i) => (
                <div key={i} className={`vib-modal-item ${item.type === 'emergency' ? 'emergency' : ''}`}>
                  <div className="vib-modal-item-left">
                    <span className="vib-modal-icon">{item.icon}</span>
                    <div>
                      <div className="vib-modal-label">{item.label}</div>
                      <div className="vib-modal-pattern">{item.desc}</div>
                    </div>
                  </div>
                  <button
                    className={`vib-test-btn ${item.type === 'emergency' ? 'emergency' : ''}`}
                    onClick={() => {
                      if (item.type === 'emergency') {
                        vibrateEmergency();
                      } else {
                        vibrate(item.type);
                      }
                      speak(item.voice);
                    }}
                  >
                    ▶ Test
                  </button>
                </div>
              ))}
            </div>

            <div className="vib-modal-footer">
              <button
                className="vib-readall-btn"
                onClick={() => {
                  const items = [
                    { type: 'straight', voice: 'Continue straight. 1 buzz.', delay: 0 },
                    { type: 'left', voice: 'Turn left. 2 buzzes.', delay: 3000 },
                    { type: 'right', voice: 'Turn right. 3 buzzes.', delay: 6000 },
                    { type: 'start', voice: 'Route started. 4 buzzes.', delay: 9000 },
                    { type: 'special', voice: 'Elevator, ramp, or stairs. 5 buzzes.', delay: 12000 },
                    { type: 'arrive', voice: 'You have arrived. 1 long buzz.', delay: 15000 },
                    { type: 'emergency', voice: 'Fire emergency. Rapid intense pulses.', delay: 18000 },
                  ];
                  speak('Vibration guide.');
                  items.forEach(item => {
                    setTimeout(() => {
                      speak(item.voice);
                      if (item.type === 'emergency') {
                        vibrateEmergency();
                      } else {
                        vibrate(item.type);
                      }
                    }, item.delay);
                  });
                }}
              >
                🔊 Read All Aloud
              </button>
              <button className="vib-close-btn" onClick={() => setShowVibGuide(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
