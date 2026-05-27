import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initLangSwitch } from './i18n.js';

initLangSwitch();


// Scene, renderer, camera

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true, // needed for toDataURL screenshots
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8ecf1);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5.5, 2.6, 6.0);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3.2;
controls.maxDistance = 12;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.enablePan = false;
controls.update();


// Lights and floor

scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bec6, 0.35));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 25;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8d4e5, 0.45);
fillLight.position.set(-5, 3, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xfff0d6, 0.35);
rimLight.position.set(-3, 4, 6);
scene.add(rimLight);

const groundDisc = new THREE.CircleGeometry(8, 64);
groundDisc.rotateX(-Math.PI / 2);

const shadowCatcher = new THREE.Mesh(groundDisc, new THREE.ShadowMaterial({ opacity: 0.45 }));
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

// Procedural asphalt: dark base, fine noise grain, scattered pebbles and oil patches.
function createAsphaltTexture() {
  const size = 512;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');

  // base
  ctx.fillStyle = '#3d3d3f';
  ctx.fillRect(0, 0, size, size);

  // fine grain
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 50;
    img.data[i    ] = Math.max(0, Math.min(255, img.data[i    ] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // lighter pebbles
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.7 + Math.random() * 2.0;
    const v = 90 + Math.random() * 60;
    ctx.fillStyle = `rgb(${v},${v},${v - 5})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // darker oil patches
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(20,20,22,0.35)');
    grad.addColorStop(1, 'rgba(20,20,22,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const floor = new THREE.Mesh(
  groundDisc.clone(),
  new THREE.MeshStandardMaterial({
    map: createAsphaltTexture(),
    roughness: 0.95,
    metalness: 0.0,
  })
);
floor.position.y = -0.002;
floor.receiveShadow = true;
scene.add(floor);


// Car model

const car = new THREE.Group();
scene.add(car);

const bodyMaterials = new Set();
const roofMaterials = new Set();
let modelLoaded = false;

const GLB_PATH = 'models/2014_abarth_500_1.4_16v.glb';

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingProgress = document.getElementById('loadingProgress');

new GLTFLoader().load(
  GLB_PATH,
  onModelLoaded,
  (xhr) => {
    if (xhr.lengthComputable && loadingProgress) {
      // Cap at 100: with gzip/brotli on the server, xhr.loaded counts the
      // decompressed bytes while xhr.total is the compressed size, so the
      // raw ratio can go above 1.
      const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
      loadingProgress.textContent = pct + '%';
    }
  },
  (err) => {
    console.error('GLB load error:', err);
    if (loadingOverlay) {
      loadingOverlay.innerHTML = '<div style="text-align:center; color:#a00;"><b>Errore caricamento modello</b><br><small>Vedi console</small></div>';
    }
  }
);

/*
  Split a mesh in two along a tilted belt plane (Y = beltCenter + beltSlope * X).
  Triangles crossing the plane are clipped exactly on it so the seam stays clean.
  Horizontal panels above lidFloorY (hood, trunk) go to the upper half.
  Position, normal and UV are interpolated for new vertices.
*/
function splitMeshBicolor(mesh, beltCenter, beltSlope, lidFloorY, normalUpThreshold = 0.5) {
  const geom = mesh.geometry;
  const posAttr = geom.attributes.position;
  if (!posAttr) return null;
  const normalAttr = geom.attributes.normal;
  const uvAttr = geom.attributes.uv;
  const hasIndex = !!geom.index;

  mesh.updateWorldMatrix(true, false);
  const M = mesh.matrixWorld;

  // 1. Copy attributes into growable arrays.
  const newPositions = [];
  const newNormals   = normalAttr ? [] : null;
  const newUVs       = uvAttr     ? [] : null;

  for (let i = 0; i < posAttr.count; i++) {
    newPositions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    if (newNormals) newNormals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
    if (newUVs)     newUVs.push(uvAttr.getX(i), uvAttr.getY(i));
  }

  // Precompute world X and Y per vertex for fast plane tests.
  const worldX = new Float32Array(posAttr.count);
  const worldY = new Float32Array(posAttr.count);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    tmp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(M);
    worldX[i] = tmp.x;
    worldY[i] = tmp.y;
  }

  // Signed distance from the belt plane (positive means above).
  function distFromBelt(idx) {
    return worldY[idx] - (beltCenter + beltSlope * worldX[idx]);
  }

  // Linear interpolation along edge a..b at parameter t in [0,1].
  // Works in local space since the mesh transform is affine.
  function lerpVertex(ai, bi, t) {
    const u = 1 - t;
    const newIdx = newPositions.length / 3;
    newPositions.push(
      u * newPositions[ai*3]   + t * newPositions[bi*3],
      u * newPositions[ai*3+1] + t * newPositions[bi*3+1],
      u * newPositions[ai*3+2] + t * newPositions[bi*3+2],
    );
    if (newNormals) {
      let nx = u * newNormals[ai*3]   + t * newNormals[bi*3];
      let ny = u * newNormals[ai*3+1] + t * newNormals[bi*3+1];
      let nz = u * newNormals[ai*3+2] + t * newNormals[bi*3+2];
      const len = Math.hypot(nx, ny, nz) || 1;
      newNormals.push(nx/len, ny/len, nz/len);
    }
    if (newUVs) {
      newUVs.push(
        u * newUVs[ai*2]   + t * newUVs[bi*2],
        u * newUVs[ai*2+1] + t * newUVs[bi*2+1],
      );
    }
    return newIdx;
  }

  // 2. Walk every triangle, classify or clip.
  const lowerIdx = [];
  const upperIdx = [];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const triCount = hasIndex ? geom.index.count / 3 : posAttr.count / 3;

  for (let t = 0; t < triCount; t++) {
    let i0, i1, i2;
    if (hasIndex) {
      i0 = geom.index.getX(t * 3);
      i1 = geom.index.getX(t * 3 + 1);
      i2 = geom.index.getX(t * 3 + 2);
    } else {
      i0 = t * 3; i1 = t * 3 + 1; i2 = t * 3 + 2;
    }

    // World-space face normal for the lid test.
    v0.fromBufferAttribute(posAttr, i0).applyMatrix4(M);
    v1.fromBufferAttribute(posAttr, i1).applyMatrix4(M);
    v2.fromBufferAttribute(posAttr, i2).applyMatrix4(M);
    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    normal.crossVectors(edge1, edge2).normalize();

    const centroidY = (worldY[i0] + worldY[i1] + worldY[i2]) / 3;

    // Lid rule: a flat panel above the lid floor goes straight to the upper half.
    if (centroidY > lidFloorY && normal.y > normalUpThreshold) {
      upperIdx.push(i0, i1, i2);
      continue;
    }

    // Belt rule: classify by signed distance, clip when the triangle straddles.
    const d0 = distFromBelt(i0);
    const d1 = distFromBelt(i1);
    const d2 = distFromBelt(i2);
    const a0 = d0 > 0, a1 = d1 > 0, a2 = d2 > 0;
    const above = (a0?1:0) + (a1?1:0) + (a2?1:0);

    if (above === 3) {
      upperIdx.push(i0, i1, i2);
    } else if (above === 0) {
      lowerIdx.push(i0, i1, i2);
    } else {
      // Triangle crosses the belt plane. Clip into 3 sub-triangles.
      let alone, other1, other2, dAlone, dOther1, dOther2, aloneAbove;
      if (above === 1) {
        if (a0)      { alone = i0; other1 = i1; other2 = i2; dAlone = d0; dOther1 = d1; dOther2 = d2; }
        else if (a1) { alone = i1; other1 = i2; other2 = i0; dAlone = d1; dOther1 = d2; dOther2 = d0; }
        else         { alone = i2; other1 = i0; other2 = i1; dAlone = d2; dOther1 = d0; dOther2 = d1; }
        aloneAbove = true;
      } else { // above === 2
        if (!a0)      { alone = i0; other1 = i1; other2 = i2; dAlone = d0; dOther1 = d1; dOther2 = d2; }
        else if (!a1) { alone = i1; other1 = i2; other2 = i0; dAlone = d1; dOther1 = d2; dOther2 = d0; }
        else          { alone = i2; other1 = i0; other2 = i1; dAlone = d2; dOther1 = d0; dOther2 = d1; }
        aloneAbove = false;
      }

      // t where the distance crosses 0 along edge alone..other:
      //   d(t) = dAlone + t * (dOther - dAlone)
      //   t = dAlone / (dAlone - dOther)
      const t1 = dAlone / (dAlone - dOther1);
      const t2 = dAlone / (dAlone - dOther2);
      const ni1 = lerpVertex(alone, other1, t1);
      const ni2 = lerpVertex(alone, other2, t2);

      if (aloneAbove) {
        upperIdx.push(alone, ni1, ni2);
        lowerIdx.push(other1, other2, ni1);
        lowerIdx.push(ni1, other2, ni2);
      } else {
        lowerIdx.push(alone, ni1, ni2);
        upperIdx.push(other1, other2, ni1);
        upperIdx.push(ni1, other2, ni2);
      }
    }
  }

  if (lowerIdx.length === 0 || upperIdx.length === 0) return null;

  // 3. Rebuild geometry with the new attributes and a grouped index.
  geom.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  if (newNormals) geom.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
  if (newUVs)     geom.setAttribute('uv',     new THREE.Float32BufferAttribute(newUVs, 2));

  const newIdxArr = new Uint32Array(lowerIdx.length + upperIdx.length);
  newIdxArr.set(lowerIdx, 0);
  newIdxArr.set(upperIdx, lowerIdx.length);
  geom.setIndex(new THREE.BufferAttribute(newIdxArr, 1));

  geom.clearGroups();
  geom.addGroup(0, lowerIdx.length, 0);
  geom.addGroup(lowerIdx.length, upperIdx.length, 1);

  const original = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const lowerMat = original.clone();
  const upperMat = original.clone();
  mesh.material = [lowerMat, upperMat];

  return {
    lowerMat, upperMat,
    lowerCount: lowerIdx.length / 3,
    upperCount: upperIdx.length / 3,
  };
}

function onModelLoaded(gltf) {
  const root = gltf.scene;

  // 1. Auto-orient so the longest axis becomes X (car length).
  let bbox = new THREE.Box3().setFromObject(root);
  let bsize = bbox.getSize(new THREE.Vector3());

  if (bsize.z > bsize.x && bsize.z > bsize.y) {
    root.rotation.y = Math.PI / 2;
  } else if (bsize.y > bsize.x && bsize.y > bsize.z) {
    root.rotation.x = -Math.PI / 2;
  }
  root.updateMatrixWorld(true);
  bbox = new THREE.Box3().setFromObject(root);
  bsize = bbox.getSize(new THREE.Vector3());

  // 2. Scale so the car length is 4 units.
  const TARGET_LEN = 4.0;
  const scale = TARGET_LEN / bsize.x;
  root.scale.setScalar(scale);

  // 3. Re-measure and center: X and Z centered, Y resting on the ground.
  root.updateMatrixWorld(true);
  bbox = new THREE.Box3().setFromObject(root);
  const bcenter = bbox.getCenter(new THREE.Vector3());
  root.position.x = -bcenter.x;
  root.position.z = -bcenter.z;
  root.position.y = -bbox.min.y;

  // 4. Enable shadows and collect every unique material.
  const allMaterials = new Set();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) if (m) allMaterials.add(m);
  });

  // 5. Classify materials by name.
  for (const m of allMaterials) {
    const n = (m.name || '').toLowerCase();
    if (/body|paint|carrosserie|carrozzeria|shell|exterior/.test(n)) {
      bodyMaterials.add(m);
    }
    if (/roof|tetto|toit/.test(n)) {
      roofMaterials.add(m);
    }
  }

  // 6. Bicolor split parameters:
  //    BELT_RATIO: where the windows start (above goes to roof color).
  //    BELT_TILT:  belt plane slope (dY/dX); positive rises toward the rear.
  //    LID_RATIO:  floor for horizontal panels that go to roof color (hood, trunk).
  //    NORMAL_UP:  how flat a panel must be to count as a lid (0..1).
  const BELT_RATIO = 0.62;
  const BELT_TILT  = -0.05;
  const LID_RATIO  = 0.62;
  const NORMAL_UP  = 0.85;
  const carHeight  = bbox.max.y - bbox.min.y;
  const beltCenter = bbox.min.y + BELT_RATIO * carHeight;
  const lidFloor   = bbox.min.y + LID_RATIO  * carHeight;

  // Find the single-material body meshes worth splitting.
  const candidates = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (Array.isArray(obj.material)) return;
    if (bodyMaterials.has(obj.material)) candidates.push(obj);
  });

  // Reset the sets and refill them with cloned half-materials.
  bodyMaterials.clear();
  roofMaterials.clear();

  for (const mesh of candidates) {
    const r = splitMeshBicolor(mesh, beltCenter, BELT_TILT, lidFloor, NORMAL_UP);
    if (r) {
      bodyMaterials.add(r.lowerMat);
      roofMaterials.add(r.upperMat);
    } else {
      bodyMaterials.add(mesh.material);
    }
  }

  // 7. If no roof material was produced, hide the bicolor toggle.
  if (roofMaterials.size === 0) {
    const twoBtn = document.querySelector('.mode-btn[data-mode="two"]');
    if (twoBtn) twoBtn.style.display = 'none';
  }

  car.add(root);
  modelLoaded = true;
  loadingOverlay?.remove();

  // Apply the current picker values to the freshly loaded materials.
  refreshAll();
}

function applyColorTo(materialSet, hex) {
  const c = new THREE.Color(hex);
  for (const m of materialSet) {
    if (!m) continue;
    if (m.color) m.color.copy(c);
    m.needsUpdate = true;
  }
}


// Color utilities (HSV, RGB, HEX)

function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if      (h <  60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
function hsvToHex(h, s, v) {
  const [r, g, b] = hsvToRgb(h, s, v);
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function hexToHsv(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}


// UI: mode toggle, HSV picker, presets, hex input

const modeButtons = document.querySelectorAll('.mode-btn');
const roofTab = document.getElementById('roofTab');
const slotTabs = document.querySelectorAll('.slot-tab');
const bodySwatch = document.getElementById('bodySwatch');
const roofSwatch = document.getElementById('roofSwatch');
const svSquare = document.getElementById('svSquare');
const svCursor = document.getElementById('svCursor');
const hueStrip = document.getElementById('hueStrip');
const hueCursor = document.getElementById('hueCursor');
const hexInput = document.getElementById('hexInput');

let mode = 'single';     // 'single' | 'two'
let activeSlot = 'body'; // 'body'   | 'roof'

const slots = {
  body: { h: 354, s: 0.83, v: 0.84 },
  roof: { h:   0, s: 0.00, v: 0.96 },
};

function slotHex(slot) { return hsvToHex(slot.h, slot.s, slot.v); }

function syncMaterials() {
  const bodyHex = slotHex(slots.body);
  const roofHex = mode === 'single' ? bodyHex : slotHex(slots.roof);
  // No-op before the model loads, since both sets are empty.
  applyColorTo(bodyMaterials, bodyHex);
  applyColorTo(roofMaterials, roofHex);
  bodySwatch.style.background = bodyHex;
  roofSwatch.style.background = roofHex;
}

function updatePickerUI() {
  const slot = slots[activeSlot];
  // SV square background tracks the current hue.
  svSquare.style.background = `
    linear-gradient(to bottom, rgba(0,0,0,0), #000),
    linear-gradient(to right, #fff, hsl(${slot.h}, 100%, 50%))
  `;
  svCursor.style.left = (slot.s * 100) + '%';
  svCursor.style.top  = ((1 - slot.v) * 100) + '%';
  hueCursor.style.left = (slot.h / 360 * 100) + '%';
  hexInput.value = slotHex(slot).slice(1).toUpperCase();
}

function refreshAll() {
  syncMaterials();
  updatePickerUI();
}

// Mode toggle
modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeButtons.forEach((b) => b.classList.toggle('active', b === btn));
    mode = btn.dataset.mode;
    if (mode === 'single') {
      roofTab.classList.add('hidden');
      if (activeSlot === 'roof') selectSlot('body');
    } else {
      roofTab.classList.remove('hidden');
    }
    refreshAll();
  });
});

// Slot tabs
function selectSlot(name) {
  activeSlot = name;
  slotTabs.forEach((t) => t.classList.toggle('active', t.dataset.slot === name));
  updatePickerUI();
}
slotTabs.forEach((tab) => {
  tab.addEventListener('click', () => selectSlot(tab.dataset.slot));
});

// Drag helper for the HSV picker. Pointer events cover both touch and mouse.
function setupDrag(el, onMove) {
  let dragging = false;
  function handle(e) {
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    onMove(x, y);
  }
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    handle(e);
  });
  el.addEventListener('pointermove', (e) => { if (dragging) handle(e); });
  el.addEventListener('pointerup', (e) => {
    dragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointercancel', () => { dragging = false; });
}

setupDrag(svSquare, (x, y) => {
  const slot = slots[activeSlot];
  slot.s = x;
  slot.v = 1 - y;
  refreshAll();
});

setupDrag(hueStrip, (x) => {
  const slot = slots[activeSlot];
  slot.h = x * 360;
  refreshAll();
});

// Hex input
hexInput.addEventListener('input', () => {
  const hsv = hexToHsv('#' + hexInput.value.trim());
  if (!hsv) return;
  const slot = slots[activeSlot];
  [slot.h, slot.s, slot.v] = hsv;
  // Refresh without overwriting what the user is typing.
  syncMaterials();
  svSquare.style.background = `
    linear-gradient(to bottom, rgba(0,0,0,0), #000),
    linear-gradient(to right, #fff, hsl(${slot.h}, 100%, 50%))
  `;
  svCursor.style.left = (slot.s * 100) + '%';
  svCursor.style.top  = ((1 - slot.v) * 100) + '%';
  hueCursor.style.left = (slot.h / 360 * 100) + '%';
});
hexInput.addEventListener('blur', () => updatePickerUI());

// Preset swatches
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const hsv = hexToHsv(btn.dataset.color);
    if (!hsv) return;
    const slot = slots[activeSlot];
    [slot.h, slot.s, slot.v] = hsv;
    refreshAll();
  });
});

refreshAll();


// Screenshot

const shotBtn = document.getElementById('shotBtn');
const flashEl = document.getElementById('flash');

shotBtn.addEventListener('click', () => {
  flashEl.classList.add('active');
  setTimeout(() => flashEl.classList.remove('active'), 300);

  // Force a fresh render so the buffer matches the current camera.
  renderer.render(scene, camera);

  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `fiat500-${ts}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  link.remove();
});


// Material inspector: Shift + Click logs the material under the cursor.

{
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  canvas.addEventListener('click', (e) => {
    if (!e.shiftKey || !modelLoaded) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(car, true);
    if (hits.length === 0) { console.log('[inspect] no hit'); return; }

    const hit = hits[0];
    const mesh = hit.object;
    let mat = mesh.material;
    if (Array.isArray(mesh.material)) {
      const f3 = hit.faceIndex * 3;
      const groups = mesh.geometry.groups || [];
      const group = groups.find(g => f3 >= g.start && f3 < g.start + g.count);
      mat = group ? mesh.material[group.materialIndex] : mesh.material[0];
    }
    console.log('[inspect] mesh:', mesh.name.slice(-60));
    console.log('[inspect] material:', mat?.name || '(unnamed)',
                'type:', mat?.type,
                'color:', mat?.color ? '#' + mat.color.getHexString() : 'n/a');
  });
}


// Back button

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'index.html';
});


// Background picker
// Drop your own images into images/backgrounds/ as bg1.jpg through bg4.jpg.

const BACKGROUNDS = {
  studio: { color: 0xe8ecf1 },
  bg1: { image: 'images/backgrounds/bg1.jpg' },
  bg2: { image: 'images/backgrounds/bg2.jpg' },
  bg3: { image: 'images/backgrounds/bg3.jpg' },
  bg4: { image: 'images/backgrounds/bg4.jpg' },
};
const bgTexLoader = new THREE.TextureLoader();
const bgCache = new Map();
let currentBgId = 'studio';

function setBackground(id) {
  const cfg = BACKGROUNDS[id];
  if (!cfg) return;
  currentBgId = id;

  if (cfg.color !== undefined) {
    scene.background = new THREE.Color(cfg.color);
    return;
  }
  if (bgCache.has(id)) {
    scene.background = bgCache.get(id);
    fitBackground();
    return;
  }
  bgTexLoader.load(
    cfg.image,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      bgCache.set(id, tex);
      if (currentBgId === id) {
        scene.background = tex;
        fitBackground();
      }
    },
    undefined,
    () => {
      console.warn(`Background "${id}" not found at ${cfg.image}. Add the image and refresh.`);
    }
  );
}

// Cover-fit the background image, cropping any overflow.
// BG_VERTICAL_BIAS shifts the visible window vertically:
//   0 = centered, +1 = pushed up, -1 = pushed down.
const BG_VERTICAL_BIAS = 0.4;
function fitBackground() {
  const tex = scene.background;
  if (!tex || !tex.isTexture || !tex.image) return;
  const imgAspect = tex.image.width / tex.image.height;
  const canvasAspect = canvas.clientWidth / canvas.clientHeight;
  if (canvasAspect > imgAspect) {
    // Crop top and bottom, shifting the sampling window by the bias.
    const repeatY = imgAspect / canvasAspect;
    const maxOffset = 1 - repeatY;
    tex.repeat.set(1, repeatY);
    tex.offset.set(0, (maxOffset / 2) * (1 - BG_VERTICAL_BIAS));
  } else {
    tex.repeat.set(canvasAspect / imgAspect, 1);
    tex.offset.set((1 - canvasAspect / imgAspect) / 2, 0);
  }
}

document.querySelectorAll('.bg-thumb').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-thumb').forEach((b) =>
      b.classList.toggle('active', b === btn)
    );
    setBackground(btn.dataset.bg);
  });
});


// Resize

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitBackground();
});


// Animation: idle rotation that pauses while the user is interacting.

let lastInteractionTime = -Infinity;
let isInteracting = false;
const IDLE_DELAY = 1500;

controls.addEventListener('start', () => { isInteracting = true; });
controls.addEventListener('end',   () => { isInteracting = false; lastInteractionTime = performance.now(); });

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const idle = !isInteracting && (performance.now() - lastInteractionTime > IDLE_DELAY);
  if (idle) car.rotation.y += 0.0035;

  renderer.render(scene, camera);
}
animate();
