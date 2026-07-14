window.addEventListener('error', function(e) {
  var el = document.getElementById('app');
  var msg = document.createElement('div');
  msg.id = 'error-msg';
  msg.textContent = 'Erro ao carregar: ' + e.message;
  el.appendChild(msg);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181C);
scene.fog = new THREE.Fog(0x14181C, 60, 160);

// Dimensoes gerais do predio, proporcao lida da planta (~1.8 : 1)
const BW = 90;  // largura (X)
const BD = 50;  // profundidade (Z)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(70, 55, 85);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 2, 0);
controls.minDistance = 15;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 0.85);
key.position.set(60, 80, 40);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -80; key.shadow.camera.right = 80;
key.shadow.camera.top = 80; key.shadow.camera.bottom = -80;
key.shadow.camera.far = 250;
scene.add(key);
scene.add(new THREE.DirectionalLight(0x8fb4e0, 0.25));

// Piso geral do galpao
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.95 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(BW+20, BD+20), floorMat);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(BW+20, 44, 0x262c31, 0x1e2327);
grid.position.y = 0.01;
scene.add(grid);

// Origem: canto superior-esquerdo do predio em (0,0), X para direita, Z para baixo (profundidade)
// Helper: zona retangular como piso elevado + contorno
function addZone(x0, z0, x1, z1, color, height, label) {
  const w = x1 - x0, d = z1 - z0;
  const cx = -BW/2 + (x0 + x1)/2;
  const cz = -BD/2 + (z0 + z1)/2;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
  mesh.position.set(cx, height/2 + 0.02, cz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);
  return { cx, cz, w, d };
}

function addLabel(text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,24,28,0.85)';
  ctx.fillRect(0,0,256,64);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(1,1,254,62);
  ctx.fillStyle = color;
  ctx.font = '600 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(9, 2.25, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// --- ZONA 1: SORTER (topo do predio, duas baterias de calhas) ---
const sorterZ0 = 2, sorterZ1 = 8;
addZone(6, sorterZ0, BW-16, sorterZ1, 0x3a3020, 0.15);
const chuteMat = new THREE.MeshStandardMaterial({ color: 0xF2A93B, metalness:0.2, roughness:0.5 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x9c9384, metalness:0.6, roughness:0.4 });
function buildSorterBank(xStart, xEnd, nLanes) {
  const laneW = (xEnd - xStart) / nLanes;
  for (let i=0; i<nLanes; i++) {
    const cx = -BW/2 + xStart + laneW*i + laneW*0.5;
    const chute = new THREE.Mesh(new THREE.BoxGeometry(laneW*0.72, 1.4, 5.2), chuteMat);
    chute.position.set(cx, 0.9, -BD/2 + (sorterZ0+sorterZ1)/2);
    chute.castShadow = true;
    scene.add(chute);
  }
}
buildSorterBank(8, 38, 14);
buildSorterBank(42, 72, 14);
// esteira principal do sorter (conforme corte E-E, modulo ~6m repetido)
const beltMat = new THREE.MeshStandardMaterial({ color: 0xb0483a, metalness:0.3, roughness:0.6 });
const belt = new THREE.Mesh(new THREE.BoxGeometry(BW-24, 0.5, 1.6), beltMat);
belt.position.set(0, 1.5, -BD/2 + sorterZ1 + 1.5);
belt.castShadow = true;
scene.add(belt);
addLabel('SORTER', -BW/2 + 40, 5, -BD/2 + 5, '#F2A93B');

// --- ZONA 2: RACKS PRINCIPAIS (bloco denso a esquerda, abaixo do sorter) ---
const rackX0 = 6, rackX1 = 46, rackZ0 = 11, rackZ1 = 40;
addZone(rackX0, rackZ0, rackX1, rackZ1, 0x1c2126, 0.1);
const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.5, roughness: 0.4 });
const orangeMat = new THREE.MeshStandardMaterial({ color: 0xE2571C, metalness: 0.4, roughness: 0.5 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0xD8C9A3, roughness: 0.6, transparent:true, opacity:0.92 });
const boxMat1 = new THREE.MeshStandardMaterial({ color: 0xB5895A, roughness: 0.85 });
const boxMat2 = new THREE.MeshStandardMaterial({ color: 0xC9A876, roughness: 0.85 });
const palletMat = new THREE.MeshStandardMaterial({ color: 0x2a5aa0, roughness: 0.7 });
const clickable = [];

function addUpright(x, z, h) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), blueMat);
  m.position.set(x, h/2, z);
  m.castShadow = true;
  scene.add(m);
}
function addBeamPair(xStart, xEnd, z, y) {
  const len = xEnd - xStart;
  const front = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.1), orangeMat);
  front.position.set((xStart+xEnd)/2, y, z - 0.45);
  front.castShadow = true;
  scene.add(front);
  const back = front.clone();
  back.position.z = z + 0.45;
  scene.add(back);
}
function addPallet(x, y, z, kind, addr) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.85), palletMat);
  base.position.y = 0.06;
  base.castShadow = true;
  group.add(base);
  if (kind === 'pulmao') {
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.8), wrapMat);
    wrap.position.y = 0.87;
    wrap.castShadow = true;
    group.add(wrap);
  } else {
    let i = 0;
    for (let l=0; l<2; l++) for (let r=0; r<2; r++) for (let c=0; c<2; c++) {
      const mat = (i%2===0) ? boxMat1 : boxMat2;
      const bx = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.33), mat);
      bx.position.set(-0.24 + c*0.5, 0.12 + 0.32*l + 0.16, -0.18 + r*0.4);
      bx.castShadow = true;
      group.add(bx);
      i++;
    }
  }
  group.position.set(x, y, z);
  group.userData = { addr, kind };
  scene.add(group);
  clickable.push(group);
}

// Racks: representado como fileiras densas de porta-pallets (verticalizado ao longo de Z)
function buildStorageRows(x0, x1, z0, z1, nRows, levels) {
  const rowSpan = (x1 - x0) / nRows;
  const colH = levels[levels.length-1] + 1.8;
  const zStart = -BD/2 + z0, zEnd = -BD/2 + z1;
  for (let r=0; r<nRows; r++) {
    const rx = -BW/2 + x0 + rowSpan*r + rowSpan*0.5;
    // colunas ao longo do corredor (Z)
    const nSeg = 8;
    for (let s=0; s<=nSeg; s++) {
      const z = zStart + ((zEnd-zStart)/nSeg)*s;
      addUpright(rx - 0.45, z, colH);
      addUpright(rx + 0.45, z, colH);
    }
    // longarinas ao longo de Z, em cada nivel
    levels.forEach(y => {
      const beamLen = zEnd - zStart;
      const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, beamLen), orangeMat);
      g1.position.set(rx - 0.45, y + 0.6, (zStart+zEnd)/2);
      g1.castShadow = true;
      scene.add(g1);
      const g2 = g1.clone();
      g2.position.x = rx + 0.45;
      scene.add(g2);
    });
    // pallets amostrais a cada 2 vaos
    for (let s=0; s<nSeg; s+=2) {
      const z = zStart + ((zEnd-zStart)/nSeg)*s + ((zEnd-zStart)/nSeg)*0.5;
      levels.forEach((y, li) => {
        const kind = li >= levels.length-1 ? 'pulmao' : 'apanha';
        addPallet(rx, y + 0.8, z, kind, `R${r+1}.N${li+1}.V${s+1}`);
      });
    }
  }
}
buildStorageRows(rackX0, rackX1, rackZ0, rackZ1, 9, [0, 2.4, 4.8]);
addLabel('RACKS PRINCIPAIS', -BW/2 + 26, 8, -BD/2 + 25, '#4C8FD1');

// --- ZONA 3: DOCAS (faixa preta abaixo dos racks) ---
const dockX0 = 6, dockX1 = 22, dockZ0 = 41, dockZ1 = 46;
addZone(dockX0, dockZ0, dockX1, dockZ1, 0x14171a, 0.08);
const doorMat = new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.9 });
for (let i=0; i<7; i++) {
  const dx = -BW/2 + dockX0 + 1.5 + i*2.1;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.3), doorMat);
  door.position.set(dx, 1.2, -BD/2 + dockZ0 - 0.15);
  door.castShadow = true;
  scene.add(door);
}
addLabel('DOCAS', -BW/2 + 14, 4, -BD/2 + 48, '#E8564F');

// --- ZONA 4: SEGUNDO BLOCO DE RACKS (ao lado das docas) ---
buildStorageRows(24, 44, dockZ0, dockZ1 - 0.5, 6, [0, 2.4]);

// --- ZONA 5: PATIO / CROSS-DOCK (grande area vazia a direita) ---
const yardX0 = 50, yardX1 = BW - 4, yardZ0 = 14, yardZ1 = BD - 3;
addZone(yardX0, yardZ0, yardX1, yardZ1, 0x272c30, 0.06);
addLabel('PATIO / CROSS-DOCK', -BW/2 + (yardX0+yardX1)/2, 6, -BD/2 + yardZ0 + 5, '#3DCB82');

// grelha de piso demarcada (linhas verde/vermelho observadas na planta)
const laneMat = new THREE.LineBasicMaterial({ color: 0x3DCB82 });
for (let i=0; i<6; i++) {
  const z = -BD/2 + yardZ0 + 14 + i*2.2;
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BW/2 + yardX0 + 2, 0.05, z),
    new THREE.Vector3(-BW/2 + yardX1 - 2, 0.05, z)
  ]);
  scene.add(new THREE.Line(geo, laneMat));
}

// --- ZONA 6: DOCAS DO PATIO (borda inferior direita) ---
for (let i=0; i<10; i++) {
  const dx = -BW/2 + yardX0 + 4 + i*3.0;
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.3), doorMat);
  door.position.set(dx, 1.3, -BD/2 + BD - 3.15);
  door.castShadow = true;
  scene.add(door);
}

// --- Contorno do predio ---
const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5158, roughness: 0.8, side: THREE.DoubleSide });
const wallH = 8;
function addWall(x0, z0, x1, z1) {
  const len = Math.hypot(x1-x0, z1-z0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 0.3), wallMat);
  wall.position.set(-BW/2 + (x0+x1)/2, wallH/2, -BD/2 + (z0+z1)/2);
  wall.rotation.y = -Math.atan2(z1-z0, x1-x0);
  wall.castShadow = true;
  scene.add(wall);
}
addWall(0, 0, BW, 0);
addWall(0, BD, BW, BD);
addWall(0, 0, 0, BD);
addWall(BW, 0, BW, BD);

// --- Interacao ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const panel = document.getElementById('panel');
const panelAddr = document.getElementById('panel-addr');
const panelLevel = document.getElementById('panel-level');
const hoverTag = document.getElementById('hover-tag');

function onClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickable, true);
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.addr) obj = obj.parent;
    if (obj.userData.addr) {
      panel.style.display = 'block';
      panelAddr.textContent = obj.userData.addr;
      panelLevel.textContent = obj.userData.kind === 'pulmao' ? 'PULMAO' : 'APANHA';
      hoverTag.textContent = obj.userData.addr;
    }
  }
}
renderer.domElement.addEventListener('click', onClick);

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
