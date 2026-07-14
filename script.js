window.addEventListener('error', function(e) {
  var el = document.getElementById('app');
  var msg = document.createElement('div');
  msg.id = 'error-msg';
  msg.textContent = 'Erro ao carregar: ' + e.message;
  el.appendChild(msg);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181C);
scene.fog = new THREE.Fog(0x14181C, 25, 70);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 200);
camera.position.set(14, 9, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 4, 0);
controls.minDistance = 6;
controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI * 0.49;

// Luz
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(12, 20, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb4e0, 0.3);
fill.position.set(-10, 8, -10);
scene.add(fill);

// Piso
const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.9 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(60, 60, 0x2a3138, 0x22282d);
grid.position.y = 0.01;
scene.add(grid);

// Materiais
const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.5, roughness: 0.4 });
const orangeMat = new THREE.MeshStandardMaterial({ color: 0xE2571C, metalness: 0.4, roughness: 0.5 });
const wrapMat = new THREE.MeshStandardMaterial({ color: 0xD8C9A3, roughness: 0.6, transparent:true, opacity:0.92 });
const boxMat1 = new THREE.MeshStandardMaterial({ color: 0xB5895A, roughness: 0.85 });
const boxMat2 = new THREE.MeshStandardMaterial({ color: 0xC9A876, roughness: 0.85 });
const palletMat = new THREE.MeshStandardMaterial({ color: 0x2a5aa0, roughness: 0.7 });

// --- Estrutura de rack: 2 filas (lados do corredor), N vãos, 3 níveis ---
const BAY_W = 2.6;      // largura do vão
const BAY_D = 1.1;      // profundidade do pallet
const AISLE_W = 3.0;    // largura do corredor central
const N_BAYS = 6;
const LEVEL_H = [0, 2.3, 4.6]; // apanha (base), meio, pulmão
const COL_H = 6.2;

const rowsX = [-(AISLE_W/2 + BAY_D/2), (AISLE_W/2 + BAY_D/2)];
const clickable = [];

function addUpright(x, z) {
  const geo = new THREE.BoxGeometry(0.09, COL_H, 0.09);
  const m = new THREE.Mesh(geo, blueMat);
  m.position.set(x, COL_H/2, z);
  m.castShadow = true;
  scene.add(m);
}

function addBeamPair(xStart, xEnd, z, y) {
  const len = xEnd - xStart;
  const geo = new THREE.BoxGeometry(len, 0.12, 0.09);
  const front = new THREE.Mesh(geo, orangeMat);
  front.position.set((xStart+xEnd)/2, y, z - 0.42);
  front.castShadow = true;
  scene.add(front);
  const back = front.clone();
  back.position.z = z + 0.42;
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
    wrap.position.y = 0.12 + 0.75;
    wrap.castShadow = true;
    group.add(wrap);
  } else {
    const cols = 2, rows = 2, layers = 2;
    const bw = 0.46, bd = 0.36, bh = 0.32;
    let i = 0;
    for (let l=0; l<layers; l++) {
      for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
          const mat = (i%2===0) ? boxMat1 : boxMat2;
          const bx = new THREE.Mesh(new THREE.BoxGeometry(bw*0.92, bh*0.92, bd*0.92), mat);
          bx.position.set(-0.24 + c*0.5, 0.12 + bh*l + bh/2, -0.18 + r*0.4);
          bx.castShadow = true;
          group.add(bx);
          i++;
        }
      }
    }
  }
  group.position.set(x, y, z);
  group.userData = { addr, kind };
  scene.add(group);
  clickable.push(group);
  return group;
}

rowsX.forEach((z, side) => {
  const sign = side === 0 ? -1 : 1;
  const totalW = N_BAYS * BAY_W;
  const xStart = -totalW/2;
  for (let b=0; b<=N_BAYS; b++) {
    const x = xStart + b*BAY_W;
    addUpright(x, z + sign*0.42);
    addUpright(x, z - sign*0.42);
  }
  LEVEL_H.forEach(y => {
    addBeamPair(xStart, xStart + totalW, z, y + 0.65);
  });
  for (let b=0; b<N_BAYS; b++) {
    const x = xStart + b*BAY_W + BAY_W/2;
    LEVEL_H.forEach((y, li) => {
      const rua = 98 + b;
      const nivel = li + 1;
      const addr = `D${rua}.11${side}.${nivel}.${b+1}`;
      const kind = li >= 1 ? 'pulmao' : 'apanha';
      addPallet(x, y + 0.8, z, kind, addr);
    });
  }
});

// Chão do corredor (leve destaque)
const aisleMat = new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.95 });
const aisleFloor = new THREE.Mesh(new THREE.PlaneGeometry(N_BAYS*BAY_W + 2, AISLE_W), aisleMat);
aisleFloor.rotation.x = -Math.PI/2;
aisleFloor.position.y = 0.005;
aisleFloor.receiveShadow = true;
scene.add(aisleFloor);

// --- Interação ---
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
      panelLevel.textContent = obj.userData.kind === 'pulmao' ? 'PULMÃO' : 'APANHA';
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
