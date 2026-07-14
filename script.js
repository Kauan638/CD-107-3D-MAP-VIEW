/* Projeto 15 - Editor 3D livre do CD */
window.addEventListener('error', function(e) {
  var el = document.getElementById('app');
  var msg = document.createElement('div');
  msg.id = 'error-msg';
  msg.textContent = 'Erro ao carregar: ' + e.message;
  el.appendChild(msg);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181C);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(55, 42, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
document.getElementById('app').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.target.set(0, 2, 0);
controls.minDistance = 3;
controls.maxDistance = 220;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight(0x9fb8d9, 0x1a1d20, 0.9));
const key = new THREE.DirectionalLight(0xfff2df, 0.85);
key.position.set(40, 60, 30);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6f9fd8, 0.4);
rim.position.set(-30, 20, -40);
scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// --- Texturas procedurais ---
function makeBoxTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0,0,0,128);
  grad.addColorStop(0, '#C9A876'); grad.addColorStop(1, '#AD8A5C');
  g.fillStyle = grad; g.fillRect(0,0,128,128);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i=0; i<128; i+=4) g.fillRect(0,i,128,1);
  g.fillStyle = '#8a6d45'; g.fillRect(56,0,16,128);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 3; g.strokeRect(1,1,126,126);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeWoodTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#8a6a45'; g.fillRect(0,0,128,32);
  for (let i=0; i<6; i++) {
    g.fillStyle = i%2===0 ? 'rgba(60,42,24,0.25)' : 'rgba(160,124,80,0.2)';
    g.fillRect(0, i*5.3, 128, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(0,0,128,32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2,1);
  return t;
}
function makeWrapTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#DCCFA8'; g.fillRect(0,0,128,128);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4;
  for (let i=-128; i<128; i+=18) { g.beginPath(); g.moveTo(i,128); g.lineTo(i+128,0); g.stroke(); }
  return new THREE.CanvasTexture(c);
}
function makeBeamTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#E2571C'; g.fillRect(0,0,64,32);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0,4,64,3);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0,25,64,3);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping;
  return t;
}
function makeUprightTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1e4d8c'; g.fillRect(0,0,32,128);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i=6; i<128; i+=14) g.fillRect(13,i,6,4);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(2,0,3,128);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1,3);
  return t;
}
function makeFloorTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#33383d'; g.fillRect(0,0,256,256);
  for (let i=0; i<900; i++) {
    g.fillStyle = `rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()*0.03})`;
    g.fillRect(Math.random()*256, Math.random()*256, 2, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(0,0,256,256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20,20);
  return t;
}
function makeWallTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4a5158'; g.fillRect(0,0,64,64);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2;
  g.strokeRect(0,0,64,32); g.strokeRect(0,32,64,32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const boxTexture = makeBoxTexture();
const woodTexture = makeWoodTexture();
const wrapTexture = makeWrapTexture();
const beamTexture = makeBeamTexture();
const uprightTexture = makeUprightTexture();
const wallTexture = makeWallTexture();

// --- Chão geral (editor livre) ---
const floorMat = new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.92 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), floorMat);
floor.rotation.x = -Math.PI/2;
floor.position.y = -0.01;
scene.add(floor);
scene.add(new THREE.GridHelper(220, 110, 0x2a3138, 0x1e2327));

// --- Piso de referencia do CD (zonas fixas, apenas contexto visual, nao editavel) ---
const BW = 90, BD = 50;
function addZone(x0, z0, x1, z1, color, height) {
  const w = x1 - x0, d = z1 - z0;
  const cx = -BW/2 + (x0 + x1)/2, cz = -BD/2 + (z0 + z1)/2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  mesh.position.set(cx, height/2, cz);
  scene.add(mesh);
}
function addLabel(text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,24,28,0.85)'; ctx.fillRect(0,0,256,64);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(1,1,254,62);
  ctx.fillStyle = color; ctx.font = '600 22px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(9, 2.25, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}
addZone(0, 0, BW, BD, 0x24282c, 0.04); // base do predio
addZone(6, 2, BW-16, 8, 0x3a3020, 0.05);
addLabel('SORTER', -BW/2 + 40, 4, -BD/2 + 5, '#F2A93B');
addZone(6, 11, 46, 40, 0x1c2634, 0.05);
addLabel('RACKS PRINCIPAIS', -BW/2 + 26, 4, -BD/2 + 25, '#4C8FD1');
addZone(6, 41, 22, 46, 0x2a1c1c, 0.05);
addLabel('DOCAS', -BW/2 + 14, 4, -BD/2 + 48, '#E8564F');
addZone(50, 14, BW-4, BD-3, 0x1c2a20, 0.05);
addLabel('PATIO / CROSS-DOCK', -BW/2 + 70, 4, -BD/2 + 19, '#3DCB82');

const wallRefMat = new THREE.MeshStandardMaterial({ color: 0x4a5158, roughness: 0.8 });
function addRefWall(x0, z0, x1, z1) {
  const len = Math.hypot(x1-x0, z1-z0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 6, 0.25), wallRefMat);
  wall.position.set(-BW/2 + (x0+x1)/2, 3, -BD/2 + (z0+z1)/2);
  wall.rotation.y = -Math.atan2(z1-z0, x1-x0);
  scene.add(wall);
}
addRefWall(0, 0, BW, 0); addRefWall(0, BD, BW, BD);
addRefWall(0, 0, 0, BD); addRefWall(BW, 0, BW, BD);

// --- Materiais reutilizaveis ---
const blueMat = new THREE.MeshStandardMaterial({ map: uprightTexture, metalness: 0.3, roughness: 0.55 });
const orangeMat = new THREE.MeshStandardMaterial({ map: beamTexture, metalness: 0.25, roughness: 0.5 });
const wrapMat = new THREE.MeshStandardMaterial({ map: wrapTexture, roughness: 0.35, metalness: 0.05, transparent:true, opacity:0.94 });
const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture, roughness: 0.9 });
const palletMat = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.95 });
const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.85 });
const selectOutlineMat = new THREE.MeshBasicMaterial({ color: 0xF2A93B, wireframe: true });

// ============ FABRICAS DE OBJETOS ============
let idCounter = 1;

function makePalletBase() {
  const group = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.85), palletMat);
  deck.position.y = 0.1;
  group.add(deck);
  for (let i=0; i<4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.13), palletMat);
    slat.position.set(0, 0.045, -0.36 + i*0.24);
    group.add(slat);
  }
  return group;
}

const FACTORIES = {
  coluna: () => {
    const h = 3;
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14), blueMat);
    m.position.y = h/2;
    g.add(m);
    g.userData.dims = { h };
    return g;
  },
  longarina: () => {
    const len = 2.4;
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, 0.12), orangeMat);
    g.add(m);
    g.userData.dims = { len };
    return g;
  },
  palletPulmao: () => {
    const cub = 100;
    const g = makePalletBase();
    const h = cub/100;
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 0.8), wrapMat);
    wrap.position.y = 0.13 + h/2;
    wrap.name = 'wrap';
    g.add(wrap);
    g.userData.cubagem = cub;
    return g;
  },
  palletApanha: () => {
    const g = makePalletBase();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.6, 0.76), boxMat);
    box.position.y = 0.13 + 0.3;
    box.name = 'box';
    g.add(box);
    return g;
  },
  caixa: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), boxMat);
    m.position.y = 0.25;
    g.add(m);
    g.userData.dims = { w:0.6, h:0.5, d:0.5 };
    return g;
  },
  parede: () => {
    const len = 6;
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 0.2), wallMat);
    m.position.y = 1.5;
    g.add(m);
    g.userData.dims = { len };
    return g;
  },
  portaPallet: () => {
    // Modulo de porta-pallet pronto: 4 colunas + longarinas em 3 niveis
    const bayW = 2.4, bayD = 1.1;
    const levels = [0, 2.3, 4.6];
    const colH = levels[levels.length-1] + 1.6;
    const g = new THREE.Group();
    const xs = [-bayW/2, bayW/2], zs = [-bayD/2, bayD/2];
    xs.forEach(x => zs.forEach(z => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.12, colH, 0.12), blueMat);
      col.position.set(x, colH/2, z);
      g.add(col);
    }));
    levels.forEach(y => {
      zs.forEach(z => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.2, 0.1), orangeMat);
        beam.position.set(0, y + 0.6, z);
        g.add(beam);
      });
    });
    g.userData.dims = { bayW, bayD, levels: levels.slice() };
    g.userData.levelsY = levels.map(y => y + 0.8); // altura util pra encaixar pallet
    return g;
  }
};

const objects = []; // { id, type, root }

function addObject(type, pos) {
  const factory = FACTORIES[type];
  if (!factory) return null;
  const root = factory();
  root.userData.id = idCounter++;
  root.userData.type = type;
  root.userData.isEditable = true;
  const p = pos || new THREE.Vector3((Math.random()-0.5)*4, 0, (Math.random()-0.5)*4);
  root.position.copy(p);
  scene.add(root);
  const entry = { id: root.userData.id, type, root };
  objects.push(entry);
  return entry;
}

function removeObject(entry) {
  scene.remove(entry.root);
  const idx = objects.indexOf(entry);
  if (idx >= 0) objects.splice(idx, 1);
  if (selected === entry) deselect();
}

function duplicateObject(entry) {
  const clone = entry.root.clone(true);
  clone.userData.id = idCounter++;
  clone.position.x += 1.0;
  clone.position.z += 1.0;
  scene.add(clone);
  const newEntry = { id: clone.userData.id, type: entry.type, root: clone };
  objects.push(newEntry);
  return newEntry;
}

// ============ SELECAO / OUTLINE ============
let selected = null;
let outlineHelper = null;

function makeOutline(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const geo = new THREE.BoxGeometry(size.x*1.08 || 0.2, size.y*1.08 || 0.2, size.z*1.08 || 0.2);
  const mesh = new THREE.Mesh(geo, selectOutlineMat);
  mesh.position.copy(center);
  return mesh;
}

function select(entry) {
  deselect();
  selected = entry;
  outlineHelper = makeOutline(entry.root);
  scene.add(outlineHelper);
  document.getElementById('btn-dup').disabled = false;
  document.getElementById('btn-del').disabled = false;
  showPanel(entry);
}

function deselect() {
  if (outlineHelper) { scene.remove(outlineHelper); outlineHelper = null; }
  selected = null;
  document.getElementById('btn-dup').disabled = true;
  document.getElementById('btn-del').disabled = true;
  document.getElementById('panel').style.display = 'none';
}

function refreshOutline() {
  if (!selected || !outlineHelper) return;
  const box = new THREE.Box3().setFromObject(selected.root);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  outlineHelper.geometry.dispose();
  outlineHelper.geometry = new THREE.BoxGeometry(size.x*1.08 || 0.2, size.y*1.08 || 0.2, size.z*1.08 || 0.2);
  outlineHelper.position.copy(center);
}

// ============ PAINEL LATERAL ============
const panel = document.getElementById('panel');
const typeLabels = { coluna:'COLUNA', longarina:'LONGARINA', portaPallet:'PORTA-PALLET', palletPulmao:'PALLET PULMÃO', palletApanha:'PALLET APANHA', caixa:'CAIXA', parede:'PAREDE' };

function showPanel(entry) {
  panel.style.display = 'block';
  document.getElementById('panel-type').textContent = typeLabels[entry.type] + ' #' + entry.id;
  document.getElementById('p-x').value = entry.root.position.x;
  document.getElementById('p-x-out').textContent = entry.root.position.x.toFixed(1);
  document.getElementById('p-y').value = entry.root.position.y;
  document.getElementById('p-y-out').textContent = entry.root.position.y.toFixed(2);
  document.getElementById('p-z').value = entry.root.position.z;
  document.getElementById('p-z-out').textContent = entry.root.position.z.toFixed(1);
  const rotDeg = THREE.MathUtils.radToDeg(entry.root.rotation.y);
  document.getElementById('p-rot').value = ((rotDeg % 360) + 360) % 360;
  document.getElementById('p-rot-out').textContent = Math.round(rotDeg) + '°';

  const rowLen = document.getElementById('row-len');
  const rowCub = document.getElementById('row-cub');
  const swapBtn = document.getElementById('edit-swap');
  rowLen.style.display = 'none'; rowCub.style.display = 'none'; swapBtn.style.display = 'none';

  if (entry.type === 'longarina' || entry.type === 'parede') {
    rowLen.style.display = 'flex';
    const len = entry.root.userData.dims.len;
    document.getElementById('p-len').min = entry.type === 'parede' ? 1 : 0.5;
    document.getElementById('p-len').max = entry.type === 'parede' ? 20 : 6;
    document.getElementById('p-len').value = len;
    document.getElementById('p-len-out').textContent = len.toFixed(1) + 'm';
  }
  if (entry.type === 'palletPulmao') {
    rowCub.style.display = 'flex';
    const cub = entry.root.userData.cubagem || 100;
    document.getElementById('p-cub').value = cub;
    document.getElementById('p-cub-out').textContent = cub + ' cm';
    swapBtn.style.display = 'block';
  }
  if (entry.type === 'palletApanha') {
    swapBtn.style.display = 'block';
  }
}

document.getElementById('p-x').addEventListener('input', e => {
  if (!selected) return;
  selected.root.position.x = parseFloat(e.target.value);
  document.getElementById('p-x-out').textContent = parseFloat(e.target.value).toFixed(1);
  refreshOutline();
});
document.getElementById('p-y').addEventListener('input', e => {
  if (!selected) return;
  selected.root.position.y = parseFloat(e.target.value);
  document.getElementById('p-y-out').textContent = parseFloat(e.target.value).toFixed(2);
  refreshOutline();
});
document.getElementById('p-z').addEventListener('input', e => {
  if (!selected) return;
  selected.root.position.z = parseFloat(e.target.value);
  document.getElementById('p-z-out').textContent = parseFloat(e.target.value).toFixed(1);
  refreshOutline();
});
document.getElementById('p-rot').addEventListener('input', e => {
  if (!selected) return;
  const deg = parseFloat(e.target.value);
  selected.root.rotation.y = THREE.MathUtils.degToRad(deg);
  document.getElementById('p-rot-out').textContent = Math.round(deg) + '°';
  refreshOutline();
});
document.getElementById('p-len').addEventListener('input', e => {
  if (!selected) return;
  const len = parseFloat(e.target.value);
  selected.root.userData.dims.len = len;
  const mesh = selected.root.children[0];
  mesh.geometry.dispose();
  if (selected.type === 'longarina') {
    mesh.geometry = new THREE.BoxGeometry(len, 0.2, 0.12);
  } else {
    mesh.geometry = new THREE.BoxGeometry(len, 3, 0.2);
  }
  document.getElementById('p-len-out').textContent = len.toFixed(1) + 'm';
  refreshOutline();
});
document.getElementById('p-cub').addEventListener('input', e => {
  if (!selected || selected.type !== 'palletPulmao') return;
  const cm = parseFloat(e.target.value);
  selected.root.userData.cubagem = cm;
  document.getElementById('p-cub-out').textContent = cm + ' cm';
  const wrap = selected.root.getObjectByName('wrap');
  if (wrap) {
    const h = Math.max(0.3, cm/100);
    wrap.geometry.dispose();
    wrap.geometry = new THREE.BoxGeometry(1.0, h, 0.8);
    wrap.position.y = 0.13 + h/2;
  }
  refreshOutline();
});
document.getElementById('edit-swap').addEventListener('click', () => {
  if (!selected) return;
  const pos = selected.root.position.clone();
  const rotY = selected.root.rotation.y;
  const wasType = selected.type;
  removeObject(selected);
  const novo = addObject(wasType === 'palletPulmao' ? 'palletApanha' : 'palletPulmao', pos);
  novo.root.rotation.y = rotY;
  select(novo);
});
document.getElementById('edit-close').addEventListener('click', deselect);

// ============ TOOLBAR ============
document.querySelectorAll('.tb-btn[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-add');
    const spawnPos = controls.target.clone();
    spawnPos.y = 0;
    const entry = addObject(type, spawnPos);
    select(entry);
  });
});
document.getElementById('btn-dup').addEventListener('click', () => {
  if (!selected) return;
  const clone = duplicateObject(selected);
  select(clone);
});
document.getElementById('btn-del').addEventListener('click', () => {
  if (!selected) return;
  removeObject(selected);
});

// ============ SALVAR / CARREGAR ============
document.getElementById('btn-save').addEventListener('click', () => {
  const data = objects.map(e => ({
    id: e.id, type: e.type,
    position: [e.root.position.x, e.root.position.y, e.root.position.z],
    rotationY: e.root.rotation.y,
    dims: e.root.userData.dims || null,
    cubagem: e.root.userData.cubagem || null
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'layout_cd.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-load').click());
document.getElementById('file-load').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      objects.slice().forEach(removeObject);
      idCounter = 1;
      data.forEach(item => {
        const entry = addObject(item.type, new THREE.Vector3(item.position[0], item.position[1], item.position[2]));
        entry.root.rotation.y = item.rotationY || 0;
        if (item.dims && entry.root.userData.dims) {
          entry.root.userData.dims.len = item.dims.len;
          const mesh = entry.root.children[0];
          mesh.geometry.dispose();
          if (entry.type === 'longarina') mesh.geometry = new THREE.BoxGeometry(item.dims.len, 0.2, 0.12);
          if (entry.type === 'parede') mesh.geometry = new THREE.BoxGeometry(item.dims.len, 3, 0.2);
        }
        if (item.cubagem && entry.type === 'palletPulmao') {
          entry.root.userData.cubagem = item.cubagem;
          const wrap = entry.root.getObjectByName('wrap');
          const h = Math.max(0.3, item.cubagem/100);
          wrap.geometry.dispose();
          wrap.geometry = new THREE.BoxGeometry(1.0, h, 0.8);
          wrap.position.y = 0.13 + h/2;
        }
      });
    } catch (err) {
      alert('Erro ao ler o arquivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ============ INTERACAO: SELECIONAR E ARRASTAR ============
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const dragOffset = new THREE.Vector3();
let isDragging = false;
let pointerDownPos = null;

function getRoot(obj) {
  let o = obj;
  while (o.parent && !o.userData.isEditable) o = o.parent;
  return o.userData.isEditable ? o : null;
}

function screenToMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  pointerDownPos = { x: event.clientX, y: event.clientY };
  screenToMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const roots = objects.map(o => o.root);
  const hits = raycaster.intersectObjects(roots, true);
  if (hits.length > 0) {
    const root = getRoot(hits[0].object);
    if (root) {
      const entry = objects.find(o => o.root === root);
      select(entry);
      dragPlane.constant = -root.position.y;
      const hitPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, hitPoint);
      dragOffset.copy(root.position).sub(hitPoint);
      isDragging = true;
      controls.enabled = false;
    }
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isDragging || !selected) return;
  screenToMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const hitPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
    selected.root.position.x = hitPoint.x + dragOffset.x;
    selected.root.position.z = hitPoint.z + dragOffset.z;
    document.getElementById('p-x').value = selected.root.position.x;
    document.getElementById('p-x-out').textContent = selected.root.position.x.toFixed(1);
    document.getElementById('p-z').value = selected.root.position.z;
    document.getElementById('p-z-out').textContent = selected.root.position.z.toFixed(1);
    refreshOutline();
  }
});

window.addEventListener('pointerup', (event) => {
  if (isDragging) {
    isDragging = false;
    controls.enabled = true;
  } else if (pointerDownPos) {
    const moved = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
    if (moved < 4) {
      // clique simples sem arrastar e sem acertar objeto -> deseleciona
      screenToMouse(event);
      raycaster.setFromCamera(mouse, camera);
      const roots = objects.map(o => o.root);
      const hits = raycaster.intersectObjects(roots, true);
      if (hits.length === 0) deselect();
    }
  }
  pointerDownPos = null;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
