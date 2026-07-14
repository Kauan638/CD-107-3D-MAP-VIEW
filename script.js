/* Projeto 15 - Modelo 3D editavel do CD (base inicial) */
window.addEventListener('error', function(e) {
  var el = document.getElementById('app');
  var msg = document.createElement('div');
  msg.id = 'error-msg';
  msg.textContent = 'Erro ao carregar: ' + e.message;
  el.appendChild(msg);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181C);

const BW = 90, BD = 50;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(60, 45, 70);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false; // sombras desligadas: era a principal causa da travada
document.getElementById('app').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.target.set(0, 2, 0);
controls.minDistance = 12;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 0.7);
key.position.set(40, 60, 30);
scene.add(key);
scene.add(new THREE.DirectionalLight(0x8fb4e0, 0.3));

const floorMat = new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.95 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(BW+20, BD+20), floorMat);
floor.rotation.x = -Math.PI/2;
scene.add(floor);
scene.add(new THREE.GridHelper(BW+20, 30, 0x262c31, 0x1e2327));

function addZone(x0, z0, x1, z1, color, height) {
  const w = x1 - x0, d = z1 - z0;
  const cx = -BW/2 + (x0 + x1)/2, cz = -BD/2 + (z0 + z1)/2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  mesh.position.set(cx, height/2 + 0.02, cz);
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

// Textura simples para caixas de apanha (padrao quadriculado, 1 unico mesh por pallet)
function makeBoxTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#B5895A'; g.fillRect(0,0,64,64);
  g.fillStyle = '#C9A876';
  g.fillRect(0,0,32,32); g.fillRect(32,32,32,32);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
  g.strokeRect(1,1,62,62); g.beginPath(); g.moveTo(32,0); g.lineTo(32,64); g.moveTo(0,32); g.lineTo(64,32); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const boxTexture = makeBoxTexture();

// --- ZONA SORTER ---
addZone(6, 2, BW-16, 8, 0x3a3020, 0.15);
const chuteMat = new THREE.MeshStandardMaterial({ color: 0xF2A93B });
const chuteGeo = new THREE.BoxGeometry(1, 1.4, 5.2);
function buildSorterBank(xStart, xEnd, nLanes) {
  const laneW = (xEnd - xStart) / nLanes;
  const inst = new THREE.InstancedMesh(chuteGeo, chuteMat, nLanes);
  const m = new THREE.Matrix4();
  for (let i=0; i<nLanes; i++) {
    const cx = -BW/2 + xStart + laneW*i + laneW*0.5;
    m.compose(new THREE.Vector3(cx, 0.9, -BD/2 + 5), new THREE.Quaternion(), new THREE.Vector3(laneW*0.72,1,1));
    inst.setMatrixAt(i, m);
  }
  scene.add(inst);
}
buildSorterBank(8, 38, 14);
buildSorterBank(42, 72, 14);
const belt = new THREE.Mesh(new THREE.BoxGeometry(BW-24, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0xb0483a }));
belt.position.set(0, 1.5, -BD/2 + 9.5);
scene.add(belt);
addLabel('SORTER', -BW/2 + 40, 5, -BD/2 + 5, '#F2A93B');

// --- ESTRUTURA DE RACKS (instanciada) ---
const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.4, roughness: 0.5 });
const orangeMat = new THREE.MeshStandardMaterial({ color: 0xE2571C, metalness: 0.3, roughness: 0.5 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0xD8C9A3, roughness: 0.6, transparent:true, opacity:0.92 });
const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture, roughness: 0.85 });
const palletMat = new THREE.MeshStandardMaterial({ color: 0x2a5aa0, roughness: 0.7 });
const beamGeo = new THREE.BoxGeometry(0.1, 0.14, 1);
const uprightGeo = new THREE.BoxGeometry(0.12, 1, 0.12);

const uprightMatrices = [];
const beamData = []; // { mesh, baseY, x, z, bayRef }
const bays = []; // dados editaveis: { pulmaoMesh, apanhaMesh, beamMesh, levelY, cubagem, kind, x, z }

function addUpright(x, z, h) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, h/2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
  uprightMatrices.push(m);
}

function makePulmaoPallet(cubagemCm) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.85), palletMat);
  base.position.y = 0.06;
  group.add(base);
  const h = Math.max(0.3, cubagemCm / 100);
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 0.8), wrapMat);
  wrap.position.y = 0.12 + h/2;
  wrap.name = 'wrap';
  group.add(wrap);
  group.userData.cubagem = cubagemCm;
  return group;
}
function makeApanhaPallet() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.85), palletMat);
  base.position.y = 0.06;
  group.add(base);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.6, 0.76), boxMat);
  box.position.y = 0.12 + 0.3;
  box.name = 'box';
  group.add(box);
  return group;
}

function buildStorageRows(x0, x1, z0, z1, nRows, levels) {
  const rowSpan = (x1 - x0) / nRows;
  const colH = levels[levels.length-1] + 1.8;
  const zStart = -BD/2 + z0, zEnd = -BD/2 + z1;
  const nSeg = 6;
  for (let r=0; r<nRows; r++) {
    const rx = -BW/2 + x0 + rowSpan*r + rowSpan*0.5;
    for (let s=0; s<=nSeg; s++) {
      const z = zStart + ((zEnd-zStart)/nSeg)*s;
      addUpright(rx - 0.45, z, colH);
      addUpright(rx + 0.45, z, colH);
    }
    levels.forEach((y) => {
      const beamLen = zEnd - zStart;
      const g1 = new THREE.Mesh(beamGeo, orangeMat);
      g1.scale.set(1, 1, beamLen);
      g1.position.set(rx - 0.45, y + 0.6, (zStart+zEnd)/2);
      scene.add(g1);
      const g2 = g1.clone(); g2.position.x = rx + 0.45; scene.add(g2);
    });
    for (let s=0; s<nSeg; s++) {
      const z = zStart + ((zEnd-zStart)/nSeg)*s + ((zEnd-zStart)/nSeg)*0.5;
      levels.forEach((y, li) => {
        const isPulmao = li === levels.length - 1;
        const cubagem = 90 + Math.round(Math.random()*40);
        const pallet = isPulmao ? makePulmaoPallet(cubagem) : makeApanhaPallet();
        pallet.position.set(rx, y + 0.8, z);
        pallet.userData.addr = `R${r+1}.N${li+1}.V${s+1}`;
        pallet.userData.kind = isPulmao ? 'pulmao' : 'apanha';
        pallet.userData.levelY = y;
        pallet.userData.baseSlotY = y;
        scene.add(pallet);
        bays.push(pallet);
      });
    }
  }
}
buildStorageRows(6, 46, 11, 40, 7, [0, 2.4, 4.8]);
buildStorageRows(24, 44, 41, 45.5, 5, [0, 2.4]);
addLabel('RACKS PRINCIPAIS', -BW/2 + 26, 8, -BD/2 + 25, '#4C8FD1');

// Uprights instanciados (uma unica malha para todas as colunas)
const uprightInst = new THREE.InstancedMesh(uprightGeo, blueMat, uprightMatrices.length);
uprightMatrices.forEach((m, i) => uprightInst.setMatrixAt(i, m));
scene.add(uprightInst);

// --- DOCAS ---
addZone(6, 41, 22, 46, 0x14171a, 0.08);
const doorMat = new THREE.MeshStandardMaterial({ color: 0x0d0f11 });
const doorGeo = new THREE.BoxGeometry(1.5, 2.4, 0.3);
const doorInst = new THREE.InstancedMesh(doorGeo, doorMat, 7);
{
  const m = new THREE.Matrix4();
  for (let i=0; i<7; i++) {
    const dx = -BW/2 + 6 + 1.5 + i*2.1;
    m.compose(new THREE.Vector3(dx, 1.2, -BD/2 + 41 - 0.15), new THREE.Quaternion(), new THREE.Vector3(1,1,1));
    doorInst.setMatrixAt(i, m);
  }
  scene.add(doorInst);
}
addLabel('DOCAS', -BW/2 + 14, 4, -BD/2 + 48, '#E8564F');

// --- PATIO / CROSS-DOCK ---
addZone(50, 14, BW-4, BD-3, 0x272c30, 0.06);
addLabel('PATIO / CROSS-DOCK', -BW/2 + 70, 6, -BD/2 + 19, '#3DCB82');
const laneMat = new THREE.LineBasicMaterial({ color: 0x3DCB82 });
for (let i=0; i<6; i++) {
  const z = -BD/2 + 28 + i*2.2;
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BW/2 + 52, 0.05, z), new THREE.Vector3(-BW/2 + BW-6, 0.05, z)
  ]);
  scene.add(new THREE.Line(geo, laneMat));
}
const doorInst2 = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 2.6, 0.3), doorMat, 10);
{
  const m = new THREE.Matrix4();
  for (let i=0; i<10; i++) {
    const dx = -BW/2 + 54 + i*3.0;
    m.compose(new THREE.Vector3(dx, 1.3, -BD/2 + BD - 3.15), new THREE.Quaternion(), new THREE.Vector3(1,1,1));
    doorInst2.setMatrixAt(i, m);
  }
  scene.add(doorInst2);
}

// --- Contorno do predio ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5158, roughness: 0.8, side: THREE.DoubleSide });
function addWall(x0, z0, x1, z1) {
  const len = Math.hypot(x1-x0, z1-z0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 8, 0.3), wallMat);
  wall.position.set(-BW/2 + (x0+x1)/2, 4, -BD/2 + (z0+z1)/2);
  wall.rotation.y = -Math.atan2(z1-z0, x1-x0);
  scene.add(wall);
}
addWall(0, 0, BW, 0); addWall(0, BD, BW, BD);
addWall(0, 0, 0, BD); addWall(BW, 0, BW, BD);

// ============ MODO DE EDICAO (Projeto 15 - base) ============
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const panel = document.getElementById('panel');
const panelAddr = document.getElementById('panel-addr');
const panelLevel = document.getElementById('panel-level');
const hoverTag = document.getElementById('hover-tag');
let selected = null;

function refreshPanel() {
  if (!selected) return;
  panelAddr.textContent = selected.userData.addr;
  panelLevel.textContent = selected.userData.kind === 'pulmao' ? 'PULMAO' : 'APANHA';
  document.getElementById('edit-y').value = selected.position.y.toFixed(2);
  document.getElementById('edit-y-out').textContent = selected.position.y.toFixed(2) + ' m';
  const cub = selected.userData.kind === 'pulmao' ? (selected.userData.cubagem || 90) : 0;
  document.getElementById('edit-cub').value = cub;
  document.getElementById('edit-cub-out').textContent = cub + ' cm';
  document.getElementById('edit-cub-row').style.display = selected.userData.kind === 'pulmao' ? 'flex' : 'none';
}

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(bays, true);
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.addr) obj = obj.parent;
    if (obj.userData.addr) {
      selected = obj;
      panel.style.display = 'block';
      hoverTag.textContent = obj.userData.addr;
      refreshPanel();
    }
  }
}
renderer.domElement.addEventListener('click', onClick);

document.getElementById('edit-y').addEventListener('input', (e) => {
  if (!selected) return;
  const y = parseFloat(e.target.value);
  selected.position.y = y;
  document.getElementById('edit-y-out').textContent = y.toFixed(2) + ' m';
});

document.getElementById('edit-cub').addEventListener('input', (e) => {
  if (!selected || selected.userData.kind !== 'pulmao') return;
  const cm = parseFloat(e.target.value);
  selected.userData.cubagem = cm;
  document.getElementById('edit-cub-out').textContent = cm + ' cm';
  const wrap = selected.getObjectByName('wrap');
  if (wrap) {
    const h = Math.max(0.3, cm / 100);
    wrap.geometry.dispose();
    wrap.geometry = new THREE.BoxGeometry(1.0, h, 0.8);
    wrap.position.y = 0.12 + h/2;
  }
});

document.getElementById('edit-swap').addEventListener('click', () => {
  if (!selected) return;
  const addr = selected.userData.addr;
  const x = selected.position.x, y = selected.userData.baseSlotY, z = selected.position.z;
  const wasKind = selected.userData.kind;
  scene.remove(selected);
  bays.splice(bays.indexOf(selected), 1);
  const novo = wasKind === 'pulmao' ? makeApanhaPallet() : makePulmaoPallet(100);
  novo.position.set(x, y + 0.8, z);
  novo.userData.addr = addr;
  novo.userData.kind = wasKind === 'pulmao' ? 'apanha' : 'pulmao';
  novo.userData.levelY = y;
  novo.userData.baseSlotY = y;
  scene.add(novo);
  bays.push(novo);
  selected = novo;
  refreshPanel();
});

document.getElementById('edit-close').addEventListener('click', () => {
  selected = null;
  panel.style.display = 'none';
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
