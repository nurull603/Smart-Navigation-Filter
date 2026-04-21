import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BUILDING, NODES, EDGES, ZONES, CORRIDORS, WALLS, BEACONS, FIRE_ZONES } from './data/buildingData';
import { dijkstra, findNearestExit } from './pathfinding';
// Firebase imports (for future Pi camera fire detection)
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Native BLE (Capacitor) — lazy loaded, falls back to Web Bluetooth
let NativeBle = null;
let nativeBleChecked = false;
async function getNativeBle() {
  if (nativeBleChecked) return NativeBle;
  nativeBleChecked = true;
  try {
    const mod = await import('@capacitor-community/bluetooth-le');
    NativeBle = mod.BleClient;
  } catch (e) {}
  return NativeBle;
}

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
// VOICE ENGINE — queued, calm, no overlapping
// ============================================================
let NativeTTS = null;
let nativeTTSChecked = false;
async function getNativeTTS() {
  if (nativeTTSChecked) return NativeTTS;
  nativeTTSChecked = true;
  try {
    const mod = await import('@capacitor-community/text-to-speech');
    NativeTTS = mod.TextToSpeech;
  } catch (e) {}
  return NativeTTS;
}
getNativeTTS();


let isSpeaking = false;
const speakQueue = [];
let speakTimeout = null;

function speak(text) {
  // Drop if something is already queued — prevent pile-up
  if (speakQueue.length >= 2) {
    speakQueue.shift(); // drop oldest
  }
  speakQueue.push(text);
  processQueue();
}

function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;
  isSpeaking = true;
  const text = speakQueue.shift();

  if (NativeTTS) {
    NativeTTS.speak({
      text,
      lang: 'en-US',
      rate: 0.85,
      volume: 1.0,
    }).then(() => {
      // Small pause after speaking before next one
      speakTimeout = setTimeout(() => {
        isSpeaking = false;
        processQueue();
      }, 800);
    }).catch(() => {
      isSpeaking = false;
      webSpeak(text);
      speakTimeout = setTimeout(() => processQueue(), 800);
    });
    return;
  }
  webSpeak(text);
  // Estimate speech duration (~80ms per character) + pause
  const duration = Math.max(1500, text.length * 80) + 800;
  speakTimeout = setTimeout(() => {
    isSpeaking = false;
    processQueue();
  }, duration);
}

function stopSpeaking() {
  speakQueue.length = 0;
  isSpeaking = false;
  if (speakTimeout) { clearTimeout(speakTimeout); speakTimeout = null; }
  window.speechSynthesis?.cancel();
  if (NativeTTS) NativeTTS.stop().catch(() => {});
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
// GENERATE DIRECTIONS (improved for voice)
// ============================================================
function generateVoiceDirections(path, nodes) {
  if (!path || path.length < 2) return [];

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const directions = [];

  // First instruction — no compass, just "route started"
  directions.push({
    text: 'Route started. Follow the path.',
    nodeId: path[0],
    type: 'start',
  });

  let lastType = 'start'; // track last direction to avoid repeating "continue straight"

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
      let arriveText = `You have arrived.`;
      if (nodeType === 'exit') arriveText = `You've reached the exit.`;
      if (nodeType === 'refuge') arriveText = `You've reached the refuge area. Help is on the way.`;
      if (label && nodeType !== 'exit' && nodeType !== 'refuge') arriveText = `You have arrived at ${label}.`;
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
      const cross = dx * dy2 - dy * dx2;
      const dot = dx * dx2 + dy * dy2;

      if (Math.abs(cross) < 0.5 && dot > 0) {
        // Straight — only announce if there's a special landmark or it's been a while
        if (specialText) {
          directions.push({ text: specialText, nodeId: path[i], type: 'special' });
          lastType = 'special';
        }
        // Skip "continue straight" unless last direction was a turn (confirms they turned correctly)
        else if (lastType === 'left' || lastType === 'right') {
          directions.push({ text: 'Keep going straight.', nodeId: path[i], type: 'straight' });
          lastType = 'straight';
        }
        // Otherwise skip — no need to spam "continue straight" every node
      } else if (cross > 0.5) {
        directions.push({
          text: specialText || 'Turn left.',
          nodeId: path[i],
          type: 'left',
        });
        lastType = 'left';
      } else if (cross < -0.5) {
        directions.push({
          text: specialText || 'Turn right.',
          nodeId: path[i],
          type: 'right',
        });
        lastType = 'right';
      } else {
        if (specialText) {
          directions.push({ text: specialText, nodeId: path[i], type: 'special' });
          lastType = 'special';
        }
      }
    }
  }

  return directions;
}

// ============================================================
// 3D MAP VIEW
// ============================================================
export default function MapView3D({ profile, mode = 'navigate', onLocationUpdate }) {
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
    distance: 100,
    targetDistance: 100,
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
  const [demoRunning, setDemoRunning] = useState(false);
  const demoRafRef = useRef(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showVibGuide, setShowVibGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const hearingImpaired = profile?.disabilities?.hearingImpaired || false;

  // Hazard state
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [showNodes, setShowNodes] = useState(true);
  const [bleScanning, setBleScanning] = useState(false);
  const [currentBeaconNode, setCurrentBeaconNode] = useState(null);
  const [gpsFollow, setGpsFollow] = useState(true);
  const gpsFollowRef = useRef(true);
  const [bleDebug, setBleDebug] = useState('');
  const [bleDeviceCount, setBleDeviceCount] = useState(0);
  const [bleLog, setBleLog] = useState([]);
  const beaconRSSI = useRef({});
  const beaconSmoothed = useRef({});
  const currentBeaconRef = useRef(null);
  const adCountRef = useRef(0);
  const interpolatedPos = useRef({ x: 0, y: 0 });
  const targetDotPos = useRef({ x: 0, y: 0 });
  const dotInitialized = useRef(false);
  const prevPos = useRef({ x: 0, y: 0 });
  const walkingAngle = useRef(0);
  const lastSpeakTime = useRef(0);
  const lastStepSpeakTime = useRef(0);

  // Keep gpsFollow ref in sync with state
  useEffect(() => { gpsFollowRef.current = gpsFollow; }, [gpsFollow]);

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

    if (selectedEnd) {
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
  }, [selectedStart, selectedEnd, wheelchairMode, mode]);

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
  // DEMO WALK — smooth animation along path nodes
  // ============================================================
  const startDemoWalk = (pathOverride) => {
    const path = pathOverride || currentPath;
    if (!path || path.length < 2) return;
    if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
    setDemoRunning(true);
    const STEP_MS = 700;
    let seg = 0;
    let t0 = null;
    const step = (now) => {
      if (!blueDotRef.current || seg >= path.length - 1) {
        setDemoRunning(false);
        return;
      }
      if (!t0) t0 = now;
      const t = Math.min((now - t0) / STEP_MS, 1);
      const from = NODES.find(n => n.id === path[seg]);
      const to   = NODES.find(n => n.id === path[seg + 1]);
      if (from && to) {
        blueDotRef.current.position.set(
          from.x + (to.x - from.x) * t,
          0,
          -(from.y + (to.y - from.y) * t)
        );
      }
      if (t >= 1) { seg++; t0 = null; }
      demoRafRef.current = requestAnimationFrame(step);
    };
    demoRafRef.current = requestAnimationFrame(step);
  };

  const stopDemoWalk = () => {
    if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
    setDemoRunning(false);
  };

  // ============================================================
  // AUTO-ADVANCE: beacon moves → step advances automatically
  // ============================================================
  useEffect(() => {
    if (!currentBeaconNode || directions.length === 0) return;

    // Check if current beacon matches any direction step AHEAD
    const now = Date.now();
    const stepCooldown = now - lastStepSpeakTime.current > 6000;

    for (let i = currentStep + 1; i < directions.length; i++) {
      if (directions[i].nodeId === currentBeaconNode) {
        setCurrentStep(i);
        // Only speak turns, landmarks, arrival — not straights — and respect cooldown
        const type = directions[i].type;
        if (stepCooldown && (type === 'left' || type === 'right' || type === 'arrive' || type === 'special')) {
          if (voiceEnabled) speak(directions[i].text);
          if (vibrationEnabled) vibrate(type);
          lastStepSpeakTime.current = now;
        }
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
            const type = directions[i].type;
            if (stepCooldown && (type === 'left' || type === 'right' || type === 'arrive' || type === 'special')) {
              if (voiceEnabled) speak(directions[i].text);
              if (vibrationEnabled) vibrate(type);
              lastStepSpeakTime.current = now;
            }
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
    scene.fog = new THREE.Fog(0x0a0c12, 150, 350);
    sceneRef.current = scene;

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 500);
    cameraRef.current = camera;

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
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
    /*
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    */
   
    // --- JERSEY MIKE'S ARENA GLB MODEL ---
    const loader = new GLTFLoader();
    loader.load('/JM.glb', (gltf) => {
      const model = gltf.scene;
      // Scale and center the model to match our coordinate system
      // Adjust these values if the model appears too big/small or off-center
      model.scale.set(1, 1, 1);
      model.position.set(5, 0.05, -7);
      model.rotation.y = 0;
      model.traverse((child) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = true;
        }
      });
      scene.add(model);
    }, undefined, (err) => {
      console.warn('GLB load error:', err);
    });
/*
    // --- BUILDING FLOOR ---
    const floorGeo = new THREE.PlaneGeometry(BUILDING.width, BUILDING.height);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);
*/
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
    const wallHeight = 1.5;
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

      // SPEED-CAPPED DOT MOVEMENT — dot walks, never teleports
      if (blueDotRef.current && dotInitialized.current) {
        const target = targetDotPos.current;
        const dot = blueDotRef.current;
        const curX = dot.position.x;
        const curZ = dot.position.z;
        const tgtX = target.x;
        const tgtZ = -target.y;

        const dx = tgtX - curX;
        const dz = tgtZ - curZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Max speed: 0.35 units per frame — fast enough for large dorm hallways
        const maxStep = 0.15;
        let newX, newZ;
        if (dist < maxStep) {
          // Close enough — snap to target
          newX = tgtX;
          newZ = tgtZ;
        } else {
          // Move toward target at walking speed
          const scale = maxStep / dist;
          newX = curX + dx * scale;
          newZ = curZ + dz * scale;
        }

        dot.position.set(newX, 0, newZ);
        dot.visible = true;

        // Feed camera with dot position (no angle needed — fixed camera)
        ctrl.followTarget = { x: newX, z: newZ };
        ctrl.dotVisible = true;
        ctrl.gpsFollow = gpsFollowRef.current;
      }

      if (ctrl.gpsFollow && ctrl.dotVisible) {
        // FIXED-ANGLE CAMERA — same tilt always, just pans to follow dot
        const pos = ctrl.followTarget || { x: 0, z: 0 };

        // Fixed camera offset — Tillet building (scaled 1unit=4ft)
        const camOffsetX = -18;  // offset
        const camOffsetZ = 42;   // behind
        const camHeight = 50;    // above
        const lookOffsetZ = -10; // look ahead

        const targetCamX = pos.x + camOffsetX;
        const targetCamZ = pos.z + camOffsetZ;
        const targetLookX = pos.x;
        const targetLookZ = pos.z + lookOffsetZ;

        // Smooth pan — keeps up with fast dot in large building
        const lerp = 0.05;
        camera.position.x += (targetCamX - camera.position.x) * lerp;
        camera.position.y += (camHeight - camera.position.y) * lerp;
        camera.position.z += (targetCamZ - camera.position.z) * lerp;

        ctrl._lookX = (ctrl._lookX ?? targetLookX) + (targetLookX - (ctrl._lookX ?? targetLookX)) * lerp;
        ctrl._lookZ = (ctrl._lookZ ?? targetLookZ) + (targetLookZ - (ctrl._lookZ ?? targetLookZ)) * lerp;
        camera.lookAt(ctrl._lookX, 0, ctrl._lookZ);
      } else {
        // FREE LOOK MODE — original orbit controls
        ctrl.rotY += (ctrl.targetRotY - ctrl.rotY) * 0.12;
        ctrl.rotX += (ctrl.targetRotX - ctrl.rotX) * 0.12;
        ctrl.distance += (ctrl.targetDistance - ctrl.distance) * 0.12;
        ctrl.panX += (ctrl.targetPanX - ctrl.panX) * 0.12;
        ctrl.panZ += (ctrl.targetPanZ - ctrl.panZ) * 0.12;

        const cx = ctrl.panX + ctrl.distance * Math.sin(ctrl.rotY) * Math.cos(ctrl.rotX);
        const cy = ctrl.distance * Math.sin(ctrl.rotX);
        const cz = ctrl.panZ + ctrl.distance * Math.cos(ctrl.rotY) * Math.cos(ctrl.rotX);

        camera.position.set(cx, cy, cz);
        camera.lookAt(ctrl.panX, 0, ctrl.panZ);
      }

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

  // RSSI smoothing — responsive for large building with spread-out beacons
  const smoothRSSI = (beaconId, rawRSSI) => {
  const prev = beaconSmoothed.current[beaconId];
  if (prev === undefined) {
    beaconSmoothed.current[beaconId] = rawRSSI;
    return rawRSSI;
  }

  // Use a very small alpha (0.05) for high-frequency 100ms data
  // This heavily dampens the "trash hardware" noise
  const alpha = 0.05; 

  beaconSmoothed.current[beaconId] = alpha * rawRSSI + (1 - alpha) * prev;
  return beaconSmoothed.current[beaconId];
};

  // Demo Map — Jersey Mike's Arena, inverted-L shape
  // BEACON_1 (minor 4953) = bottom/table, BEACON_2 (minor 4951) = mid vertical, BEACON_3 (minor 4950) = exit
  // Vertical arm: x=5, y=15 (bottom) to y=0 (top/corner)
  // Horizontal arm: x=5 to x=10, y=0 (corner to exit)
const BEACON_SEGMENTS = [
  { from: 'BEACON_1', to: 'BEACON_2', waypoints: [
    { x: -6, y: 32 + (-57 * 1.0) }, // Table 122 (Start)
    { x: -6, y: 32 + (-57 * 0.3) }, // V_MID3 (Stop 2)
  ]},
  { from: 'BEACON_2', to: 'BEACON_3', waypoints: [
    { x: -6, y: 32 + (-57 * 0.3) }, // V_MID3
    { x: -6, y: 32 + (-57 * 0.5) }, // V_MID5 (Stop 3)
  ]},
  { from: 'BEACON_3', to: 'BEACON_4', waypoints: [
    { x: -6, y: 32 + (-57 * 0.5) }, // V_MID5
    { x: -6, y: 32 + (-57 * 0.7) }, // V_MID7 (Stop 4)
  ]},
  { from: 'BEACON_4', to: 'BEACON_5', waypoints: [
    { x: -6, y: 32 + (-57 * 0.7) }, // V_MID7
    { x: -6, y: 32 },               // Corner (Stop 5)
  ]},
  { from: 'BEACON_5', to: 'BEACON_6', waypoints: [
    { x: -6, y: 32 },               // Corner
    { x: -6 - 15, y: 32 }           // Exit (Stop 6)
  ]},
];
const BEACON_ORDER = ['BEACON_1', 'BEACON_2', 'BEACON_3', 'BEACON_4', 'BEACON_5', 'BEACON_6'];

  // Interpolate position along a segment's waypoints
  const getSegmentPosition = (segment, ratio) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const wp = segment.waypoints;
    const totalSegs = wp.length - 1;
    const pos = clamped * totalSegs;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const from = wp[Math.min(idx, totalSegs)];
    const to = wp[Math.min(idx + 1, totalSegs)];
    return {
      x: from.x + (to.x - from.x) * frac,
      y: from.y + (to.y - from.y) * frac,
    };
  };

  // Create blue dot (only called once)
  const createBlueDot = (x, y) => {
    const scene = sceneRef.current;
    if (!scene || blueDotRef.current) return;
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
    group.visible = true;
    scene.add(group);
    blueDotRef.current = group;
    dotInitialized.current = true;
    prevPos.current = { x, y };
  };

  // Determine position from RSSI of up to 4 beacons and slide dot along L-path
  const SNAP_THRESHOLD = -65; // dBm — if beacon hits this, you're there
const lastSnappedBeacon = useRef(null);

const updateBeaconPosition = useCallback(() => {
  const now = Date.now();
  const HYSTERESIS_MARGIN = 6; // Requires a 6dBm lead to switch beacons
  const SNAP_THRESHOLD = -65;  // Only snap if signal is better than -65

  // 1. Gather beacons seen in the last 3 seconds
  const active = [];
  for (const bid of BEACON_ORDER) {
    const data = beaconRSSI.current[bid];
    if (data && now - data.timestamp < 3000) {
      active.push({
        id: bid,
        rssi: beaconSmoothed.current[bid] || data.rssi,
        nodeId: data.nodeId,
        label: data.label,
        orderIdx: BEACON_ORDER.indexOf(bid),
      });
    }
  }

  if (active.length === 0) return;

  // 2. Identify where we are currently
  const currentIdx = lastSnappedBeacon.current 
    ? BEACON_ORDER.indexOf(lastSnappedBeacon.current)
    : -1;

  // 3. Find the strongest candidate among logically ADJACENT beacons
  // (Prevents jumping from Beacon 1 to Beacon 4 instantly)
  const candidates = active.filter(b => {
    if (currentIdx === -1) return true; // First lock-on allows any beacon
    const diff = Math.abs(b.orderIdx - currentIdx);
    return diff <= 1; // Only allow current beacon or its immediate neighbors
  });

  if (candidates.length === 0) return;

  candidates.sort((a, b) => b.rssi - a.rssi);
  const strongest = candidates[0];

  // 4. Check if we should actually move
  const currentRSSI = lastSnappedBeacon.current 
    ? (beaconSmoothed.current[lastSnappedBeacon.current] || -100) 
    : -100;

  if (strongest.rssi > SNAP_THRESHOLD) {
    // Only switch if the same beacon OR new beacon is significantly stronger
    if (strongest.id === lastSnappedBeacon.current || strongest.rssi > (currentRSSI + HYSTERESIS_MARGIN)) {
      const node = NODES.find(n => n.id === strongest.nodeId);
      if (node) {
        targetDotPos.current = { x: node.x, y: node.y };
        if (!blueDotRef.current) createBlueDot(node.x, node.y);
        
        if (strongest.id !== lastSnappedBeacon.current) {
          lastSnappedBeacon.current = strongest.id;
          setCurrentBeaconNode(strongest.nodeId);
          if (onLocationUpdate) onLocationUpdate(strongest.nodeId);
          addLog('SWITCHED to ' + strongest.label);
        }
        setBleDebug(strongest.label + ': ' + strongest.rssi.toFixed(0) + ' dBm ✓');
      }
    }
  }
}, [addLog, onLocationUpdate]);

  const bleScanAbortRef = useRef(null);
  const bleListenerRef = useRef(null);

  const startBLEScan = useCallback(async () => {
    if (!BEACONS || BEACONS.length === 0) {
      setBleDebug('No beacons configured.');
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

      // Try to load Capacitor native BLE
      const nativeBle = await getNativeBle();

      // =============================================
      // METHOD 1: Capacitor Native BLE (Android app)
      // =============================================
      if (nativeBle) {
        addLog('Using NATIVE Capacitor BLE ✓');
        await nativeBle.initialize({ androidNeverForLocation: false });

        // Request permissions explicitly
        try {
          await nativeBle.requestPermissions();
          addLog('Permissions granted ✓');
        } catch (e) {
          addLog('Permission request: ' + (e?.message || 'ok'));
        }

        // Check BT enabled
        const enabled = await nativeBle.isEnabled();
        addLog('Bluetooth enabled: ' + enabled);

        await nativeBle.requestLEScan(
          { allowDuplicates: true, scanMode: 2 },
          (result) => {
            adCountRef.current += 1;
            const count = adCountRef.current;
            const rssi = result.rssi;
            const name = result.localName || result.device?.name || result.device?.deviceId?.slice(0, 8) || '??';

            if (count % 10 === 0) setBleDeviceCount(count);

            // Heavy debug for first 30 + every 100th
            if (count <= 50 || count % 50 === 0) {
              let logMsg = '#' + count + ' ' + name + ' RSSI=' + rssi;

              // Log result keys for first 5
              if (count <= 5) {
                const keys = Object.keys(result || {});
                logMsg += ' keys=[' + keys.join(',') + ']';
              }

              // Log manufacturerData format
              const mfData = result.manufacturerData;
              if (mfData && typeof mfData === 'object') {
                const mfKeys = Object.keys(mfData);
                logMsg += ' mf={' + mfKeys.length + ' keys: ' + mfKeys.slice(0, 3).join(',') + '}';
                for (const [cid, val] of Object.entries(mfData)) {
                  if (val instanceof DataView) {
                    const hex = [];
                    for (let i = 0; i < Math.min(val.byteLength, 25); i++) hex.push(val.getUint8(i).toString(16).padStart(2, '0'));
                    logMsg += ' [' + cid + ':DV:' + hex.join(' ') + ']';
                  } else if (val instanceof ArrayBuffer) {
                    const arr = new Uint8Array(val);
                    const hex = Array.from(arr.slice(0, 25)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    logMsg += ' [' + cid + ':AB:' + hex + ']';
                  } else if (typeof val === 'string') {
                    logMsg += ' [' + cid + ':STR:len=' + val.length + ':' + val.slice(0, 30) + ']';
                  } else {
                    logMsg += ' [' + cid + ':type=' + typeof val + ']';
                  }
                }
              } else if (mfData) {
                logMsg += ' mfData=type:' + typeof mfData;
              } else {
                logMsg += ' mfData=null';
              }

              if (result.rawAdvertisement) {
                const raw = result.rawAdvertisement;
                if (raw instanceof DataView) {
                  const hex = [];
                  for (let i = 0; i < Math.min(raw.byteLength, 30); i++) hex.push(raw.getUint8(i).toString(16).padStart(2, '0'));
                  logMsg += ' raw=' + hex.join(' ');
                }
              }

              addLog(logMsg);
            }

            // Parse iBeacon from manufacturerData
            const mfData = result.manufacturerData;
            if (mfData && typeof mfData === 'object') {
              for (const [companyId, dataVal] of Object.entries(mfData)) {
                let bytes;
                try {
                  if (dataVal instanceof DataView) {
                    bytes = new Uint8Array(dataVal.buffer, dataVal.byteOffset, dataVal.byteLength);
                  } else if (dataVal instanceof ArrayBuffer) {
                    bytes = new Uint8Array(dataVal);
                  } else if (typeof dataVal === 'string') {
                    const binary = atob(dataVal);
                    bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                  } else if (dataVal?.buffer) {
                    bytes = new Uint8Array(dataVal.buffer);
                  }
                } catch (e) {
                  if (count <= 5) addLog('Parse err ' + companyId + ': ' + e.message);
                  continue;
                }

                if (!bytes || bytes.length < 4) continue;

                for (let i = 0; i <= Math.min(bytes.length - 22, 10); i++) {
                  if (bytes[i] === 0x02 && bytes[i + 1] === 0x15 && i + 22 <= bytes.length) {
                    const major = (bytes[i + 18] << 8) | bytes[i + 19];
                    const minor = (bytes[i + 20] << 8) | bytes[i + 21];
                    addLog('BEACON FOUND! major=' + major + ' minor=' + minor + ' RSSI=' + rssi);
                    const beacon = BEACONS.find(b => b.minor === minor && b.major === major);
                    if (beacon) {
                      const smoothed = smoothRSSI(beacon.id, rssi);
                      beaconRSSI.current[beacon.id] = {
                        rssi, smoothed, nodeId: beacon.nodeId,
                        label: beacon.label, timestamp: Date.now(),
                      };
                      setBleDebug(beacon.label + ': RSSI ' + rssi + ' (avg ' + smoothed.toFixed(0) + ')');
                      updateBeaconPosition();
                    }
                    break;
                  }
                }
              }
            }

            // Name-based detection
            if (name && (name.includes('BC') || name.includes('Beacon') || name.includes('KBeacon') || name.includes('Pro'))) {
              addLog('NAMED: ' + name + ' RSSI=' + rssi);
            }

            // FALLBACK: Parse rawAdvertisement for iBeacon if manufacturerData didn't find it
            if (result.rawAdvertisement) {
              let rawBytes;
              const raw = result.rawAdvertisement;
              if (raw instanceof DataView) {
                rawBytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
              } else if (raw instanceof ArrayBuffer) {
                rawBytes = new Uint8Array(raw);
              }

              if (rawBytes && rawBytes.length >= 25) {
                // Search entire raw data for 02 15 (iBeacon marker)
                for (let i = 0; i <= rawBytes.length - 23; i++) {
                  if (rawBytes[i] === 0x02 && rawBytes[i + 1] === 0x15 && i + 22 <= rawBytes.length) {
                    const major = (rawBytes[i + 18] << 8) | rawBytes[i + 19];
                    const minor = (rawBytes[i + 20] << 8) | rawBytes[i + 21];
                    const beacon = BEACONS.find(b => b.minor === minor && b.major === major);
                    if (beacon) {
                      addLog('RAW BEACON HIT! ' + beacon.label + ' major=' + major + ' minor=' + minor + ' RSSI=' + rssi);
                      const smoothed = smoothRSSI(beacon.id, rssi);
                      beaconRSSI.current[beacon.id] = {
                        rssi, smoothed, nodeId: beacon.nodeId,
                        label: beacon.label, timestamp: Date.now(),
                      };
                      setBleDebug(beacon.label + ': RSSI ' + rssi + ' (avg ' + smoothed.toFixed(0) + ')');
                      updateBeaconPosition();
                    }
                    break;
                  }
                }
              }
            }
          }
        );


        setBleScanning(true);
        setBleDebug('Native scanning active!');
        speak('Scanning started.');
        addLog('Native BLE scan running ✓');
        return;
      }

      // =============================================
      // METHOD 2: Web Bluetooth (browser on dad's phone)
      // =============================================
      if (!navigator.bluetooth) {
        setBleDebug('Bluetooth not supported.');
        return;
      }

      if (navigator.bluetooth.requestLEScan) {
        addLog('Using Web Bluetooth requestLEScan');

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

          if (count <= 20 || count % 50 === 0) {
            let logMsg = '#' + count + ' ' + name + ' RSSI=' + rssi + ' mfData=' + mfSize;
            if (event.manufacturerData) {
              for (const [cid, dv] of event.manufacturerData) {
                logMsg += ' [0x' + cid.toString(16) + ': ' + dvToHex(dv) + ']';
              }
            }
            addLog(logMsg);
          }

          if (count % 10 === 0) setBleDeviceCount(count);

          const parsed = parseBeaconFromAd(event);
          if (parsed) {
            const beacon = BEACONS.find(b => b.minor === parsed.minor && b.major === parsed.major);
            if (beacon) {
              const smoothed = smoothRSSI(beacon.id, parsed.rssi);
              beaconRSSI.current[beacon.id] = {
                rssi: parsed.rssi, smoothed,
                nodeId: beacon.nodeId, label: beacon.label, timestamp: Date.now(),
              };
              setBleDebug(beacon.label + ': RSSI ' + parsed.rssi + ' (avg ' + smoothed.toFixed(0) + ') via ' + parsed.method);
              updateBeaconPosition();
            }
          }

          if (!parsed && name && (name.includes('BC') || name.includes('Beacon') || name.includes('Blue') || name.includes('KBeacon'))) {
            addLog('Known device: ' + name + ' RSSI=' + rssi + ' (no iBeacon data)');
          }
        };

        bleListenerRef.current = listener;
        navigator.bluetooth.addEventListener('advertisementreceived', listener);

        setBleScanning(true);
        setBleDebug('Scanning... walk around');
        speak('Scanning started.');

      } else {
        addLog('requestLEScan NOT available');
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

  const stopBLEScan = useCallback(async () => {
    try {
      // Stop native Capacitor scan
      const nativeBle = await getNativeBle();
      if (nativeBle) {
        try { await nativeBle.stopLEScan(); } catch (e) {}
      }
      // Stop Web Bluetooth scan
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

  // GPS follow is handled in the animation loop via controlsRef.current.gpsFollow

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

    // 1. Define the rainbow palette for debugging
const BEACON_COLORS = [
  0xff0000, // Red (Beacon 1)
  0xff7f00, // Orange (Beacon 2)
  0xffff00, // Yellow (Beacon 3)
  0x00ff00, // Green (Beacon 4)
  0x0000ff, // Blue (Beacon 5)
  0x4b0082  // Purple (Beacon 6)
];

NODES.forEach(node => {
  const isSmall = node.type === 'intersection' || node.type === 'door';
  const visualRadius = isSmall ? 0.3 : 0.5;

  // 2. Check which beacon is assigned to this node
  const beaconIdx = BEACONS.findIndex(b => b.nodeId === node.id);
  
  let color;
  if (beaconIdx !== -1) {
    // Beacon nodes get the rainbow color based on their order in buildingData.js
    color = BEACON_COLORS[beaconIdx % BEACON_COLORS.length];
  } else {
    // Others keep standard colors (Red for exits, Green for refuge)
    color = NODE_COLORS_HEX[node.type] || 0x888888;
  }

  // 3. Visible sphere
  const geo = new THREE.SphereGeometry(visualRadius, 12, 8);
  const mat = new THREE.MeshStandardMaterial({
    color, 
    emissive: color, 
    emissiveIntensity: 0.5, 
    roughness: 0.4,
  });
  const visual = new THREE.Mesh(geo, mat);
  visual.position.set(node.x, 0.4, -node.y);
  scene.add(visual);
  nodeVisualsRef.current.push(visual);

  // 4. Invisible hit sphere (for clicking/tapping)
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
  // UPDATE ROUTE PATH 
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
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.6, 8, false);
const tubeMat = new THREE.MeshStandardMaterial({
  color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 2.0,
  roughness: 0.0, transparent: true, opacity: 1.0,
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

    // Cleanup old markers (skip blueDot when scanning — beacon effect handles it)
    [startMarkerRef, endMarkerRef].forEach(ref => {
      if (ref.current) {
        scene.remove(ref.current);
        ref.current = null;
      }
    });
    if (!bleScanning && blueDotRef.current) {
      scene.remove(blueDotRef.current);
      blueDotRef.current = null;
    }

    // Blue dot at start (only when NOT scanning — scanning has its own dot)
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

      // Fire emoji sprite using canvas texture
      const emojiCanvas = document.createElement('canvas');
      emojiCanvas.width = 128; emojiCanvas.height = 128;
      const emojiCtx = emojiCanvas.getContext('2d');
      emojiCtx.font = '96px serif';
      emojiCtx.textAlign = 'center';
      emojiCtx.textBaseline = 'middle';
      emojiCtx.fillText('🔥', 64, 64);
      const emojiTexture = new THREE.CanvasTexture(emojiCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: emojiTexture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(midX, 2.5, -midY);
      sprite.scale.set(3, 3, 1);
      fireGroup.add(sprite);

      // Blocked barrier
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const barrierGeo = new THREE.BoxGeometry(length, 0.3, 0.1);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.5,
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
  // FIREBASE FIRE DETECTION — listens for camera alerts
  // ============================================================
  useEffect(() => {
    if (!db) return;
    try {
      const alertRef = doc(db, 'fire_alerts', 'active');
      const unsubscribe = onSnapshot(alertRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.active && data.zone && !emergencyMode) {
          // Fire detected by camera! Block the fire zone and auto-evacuate
          const zone = FIRE_ZONES?.[data.zone];
          const fireBlocked = zone?.blockedEdges || [];
          setBlockedEdges(fireBlocked);
          setEmergencyMode(true);
          if (selectedStart) {
            const result = findNearestExit(selectedStart, NODES, EDGES, wheelchairMode, fireBlocked);
            if (result) {
              setCurrentPath(result.path);
              const target = NODES.find(n => n.id === result.targetId);
              setPathInfo({ distance: result.distance.toFixed(1), destination: target?.label || result.targetId });
              const dirs = generateVoiceDirections(result.path, NODES);
              setDirections(dirs);
              setCurrentStep(0);
              // safety audio after fire detected
              if (voiceEnabled) speak('Fire detected near corner. Follow Julios orders to safety, he knows the way, trust. in julio i trust');
              if (vibrationEnabled) vibrateEmergency();
              startDemoWalk(result.path);
            }
          }
        }
        if (data.active === false && emergencyMode) {
          // Fire cleared
          setEmergencyMode(false);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      // Firebase not available
    }
  }, [emergencyMode, selectedStart, voiceEnabled, vibrationEnabled, wheelchairMode, blockedEdges]);

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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      ctrl.moved = true;
      if (gpsFollow) setGpsFollow(false);
    }

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
    controlsRef.current.targetDistance = Math.max(10, Math.min(200,
      controlsRef.current.targetDistance + e.deltaY * 0.06
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
        if (onLocationUpdate) onLocationUpdate(nodeId);
        if (voiceEnabled) speak('Starting point set.');
      } else if (!selectedEnd) {
        if (nodeId !== selectedStart) {
          setSelectedEnd(nodeId);
          if (onLocationUpdate) onLocationUpdate(nodeId);
        }
      } else {
        setSelectedStart(nodeId);
        if (onLocationUpdate) onLocationUpdate(nodeId);
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
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        ctrl.moved = true;
        if (gpsFollow) setGpsFollow(false);
      }
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
        controlsRef.current.targetDistance = Math.max(10, Math.min(200,
          controlsRef.current.targetDistance + delta * 0.12
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

  // Fire detection will be handled by Pi camera in the future
  // For now, fire can only be triggered manually via clearAll reset

  // ============================================================
  // ACTIONS
  // ============================================================

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
    if (NativeTTS) NativeTTS.stop().catch(() => {});
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
      {/* CLEAN NAVIGATION BAR */}
      {mode === 'navigate' && (
        <div style={{
          position:'relative', 
          top:0, left:0, right:0, zIndex:100,
          background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
          padding: '12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          flexShrink: 0
        }}>
          <div style={{flex:1}}>
            {directions.length > 0 && currentDir ? (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:'1.6rem'}}>{dirIcon}</span>
                <div>
                  <div style={{color:'#fff',fontWeight:'bold',fontSize:'0.95rem'}}>{currentDir.text}</div>
                  {pathInfo && <div style={{color:'rgba(255,255,255,0.7)',fontSize:'0.7rem'}}>→ {pathInfo.destination} • {pathInfo.distance}m</div>}
                </div>
              </div>
            ) : (
              <div style={{color:'rgba(255,255,255,0.8)',fontSize:'0.85rem'}}>
                {bleScanning
                  ? (currentBeaconNode ? 'Tap a destination' : 'Scanning for beacons...')
                  : 'Tap a node to start'}
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:6}}>
            {!bleScanning && (
              <button onClick={startBLEScan} style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'none',borderRadius:20,padding:'6px 12px',fontSize:'0.75rem'}}>
                📡 Scan
              </button>
            )}
            {bleScanning && (
              <button onClick={stopBLEScan} style={{background:'rgba(255,255,255,0.3)',color:'#fff',border:'none',borderRadius:20,padding:'6px 12px',fontSize:'0.75rem'}}>
                ■ Stop
              </button>
            )}
            <button onClick={() => {
              if (!selectedStart) return;
              const result = findNearestExit(selectedStart, NODES, EDGES, wheelchairMode, blockedEdges);
              if (result) {
                setCurrentPath(result.path);
                const target = NODES.find(n => n.id === result.targetId);
                setPathInfo({ distance: result.distance.toFixed(1), destination: target?.label || result.targetId });
                const dirs = generateVoiceDirections(result.path, NODES);
                setDirections(dirs);
                setCurrentStep(0);
                if (voiceEnabled) speak('Evacuating. Follow the blue path.');
                if (vibrationEnabled) vibrateEmergency();
                startDemoWalk(result.path);
              }
            }} style={{background:'rgba(255,80,80,0.85)',color:'#fff',border:'none',borderRadius:20,padding:'6px 12px',fontSize:'0.75rem'}}>
              🚨 Evacuate
            </button>
            {currentPath && (
              <button onClick={demoRunning ? stopDemoWalk : () => startDemoWalk()}
                style={{background: demoRunning ? 'rgba(255,180,0,0.85)' : 'rgba(0,180,100,0.85)', color:'#fff', border:'none', borderRadius:20, padding:'6px 12px', fontSize:'0.75rem'}}>
                {'Start'}
              </button>
            )}
            <button onClick={() => { stopDemoWalk(); clearAll(); }} style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',borderRadius:20,padding:'6px 12px',fontSize:'0.75rem'}}>
              ↻
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && (
        <div className="view-mode-header">
          🏢 Building Overview
        </div>
      )}

      {/* FIRE EMERGENCY BANNER */}
      {emergencyMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(200,0,0,0.92)', color: 'white',
          padding: '10px 16px', textAlign: 'center',
          fontWeight: 'bold', fontSize: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          🔥 FIRE DETECTED — EVACUATING 🔥
        </div>
      )}

      {/* Error display */}
      {mode === 'navigate' && pathInfo?.error && (
        <div className="map-error-overlay">
          {pathInfo.error}
        </div>
      )}

      {/* 3D CANVAS */}
      <div
        className="map-canvas-container"
        ref={mountRef}
        style={{ flex: 1, position: 'relative' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* RIGHT SIDE CONTROLS */}
      {mode === 'navigate' && (
        <div style={{position:'absolute',bottom:60,right:12,zIndex:90,display:'flex',flexDirection:'column',gap:8}}>
          {bleScanning && (
            <button onClick={() => setGpsFollow(!gpsFollow)} style={{
              background: gpsFollow ? '#1a73e8' : 'rgba(40,40,40,0.85)',
              color:'#fff',
              border: gpsFollow ? '3px solid #20a840' : 'none', 
              boxSizing: 'border-box', 
              borderRadius: '50%',
              width: 50,
              height: 50,
              fontSize: '1.3rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}>
              🧭
            </button>
          )}
          
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && mode === 'navigate' && (
        <div style={{
          position:'absolute',bottom:120,right:12,zIndex:95,
          background:'rgba(20,25,35,0.95)',borderRadius:12,padding:'12px 14px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)',minWidth:180,
        }}>
          <div style={{color:'#aaa',fontSize:'0.65rem',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Settings</div>
          {[
            { label: 'Voice', icon: voiceEnabled ? '🔊' : '🔇', active: voiceEnabled, fn: () => setVoiceEnabled(!voiceEnabled) },
            { label: 'Vibration', icon: vibrationEnabled ? '📳' : '📴', active: vibrationEnabled, fn: () => setVibrationEnabled(!vibrationEnabled) },
            { label: 'Show Nodes', icon: '📍', active: showNodes, fn: () => setShowNodes(!showNodes) },
            { label: 'Wheelchair', icon: '♿', active: wheelchairMode, fn: null },
          ].map((item, i) => (
            <div key={i} onClick={item.fn} style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'8px 4px',borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              cursor: item.fn ? 'pointer' : 'default', opacity: item.fn ? 1 : 0.5,
            }}>
              <span style={{color:'#fff',fontSize:'0.82rem'}}>{item.icon} {item.label}</span>
              <span style={{
                width:36,height:20,borderRadius:10,
                background: item.active ? '#1a73e8' : '#444',
                display:'flex',alignItems:'center',padding:'0 2px',
                justifyContent: item.active ? 'flex-end' : 'flex-start',
                transition:'all 0.2s',
              }}>
                <span style={{width:16,height:16,borderRadius:'50%',background:'#fff'}}/>
              </span>
            </div>
          ))}
          {hearingImpaired && (
            <button onClick={() => { setShowVibGuide(true); setShowSettings(false); }} style={{
              width:'100%',marginTop:8,background:'#333',color:'#fff',border:'none',
              borderRadius:8,padding:'8px',fontSize:'0.78rem',
            }}>
              📳 Vibration Guide
            </button>
          )}
        </div>
      )}

      {/* COMPACT LEGEND */}
      <div style={{
        position:'absolute',bottom:8,left:10,zIndex:80,
        display:'flex',gap:8,background:'rgba(0,0,0,0.6)',padding:'4px 10px',borderRadius:12,fontSize:'0.6rem',color:'#fff',
      }}>
        <span>🔴 Exit</span><span>🟡 Elevator</span><span>🟠 Stairs</span><span>🟢 Refuge</span><span>🔵 You</span>
      </div>
    </div>
  );
}

