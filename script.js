/* Visualizador 3D de enderecos reais - Projeto 15 */
window.addEventListener('error', function(e) {
  var el = document.getElementById('app');
  var msg = document.createElement('div');
  msg.id = 'error-msg';
  msg.textContent = 'Erro: ' + e.message;
  el.appendChild(msg);
});

// --- Classificacao de pavilhao por CODRUA (mapeamento oficial) ---
function classifyRua(codruaStr) {
  const r = parseInt(codruaStr, 10);
  if (isNaN(r)) return null;
  if ((r >= 26 && r <= 27) || (r >= 29 && r <= 31)) return 'Perecivel';
  if ((r >= 3 && r <= 14) || (r >= 21 && r <= 24) || (r >= 51 && r <= 65)) return 'Pavilhao 1';
  if (r >= 71 && r <= 106) return 'Pavilhao 2';
  if (r >= 311 && r <= 317) return 'Pavilhao 3';
  return null;
}

function parseTipend(str) {
  if (!str) return null;
  const m = str.match(/([\d,]+)\s*M/i);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

// --- Parser do arquivo (ponto e virgula, latin1) ---
let allRows = null; // { rua, predio, apto, sala, esp, codigo, desc, tipend, pav }

function parseFile(text) {
  const lines = text.split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = line.split(';');
    if (c.length < 16) continue;
    const esp = c[7];
    if (esp !== 'Apanha' && esp !== 'Pulmão') continue;
    const rua = c[3];
    const pav = classifyRua(rua);
    if (!pav) continue;
    rows.push({
      rua: rua,
      predio: parseInt(c[4], 10) || 0,
      apto: parseInt(c[5], 10) || 0,
      sala: parseInt(c[6], 10) || 0,
      esp: esp,
      codigo: c[8],
      desc: c[9],
      tipend: parseTipend(c[15]),
      pav: pav
    });
  }
  return rows;
}

// --- UI: tela de selecao ---
const fileInput = document.getElementById('file-input');
const loadStatus = document.getElementById('load-status');
const pavCards = document.querySelectorAll('.pav-card');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadStatus.textContent = 'Lendo arquivo...';
  const reader = new FileReader();
  reader.onload = (ev) => {
    loadStatus.textContent = 'Processando endereços...';
    setTimeout(() => {
      try {
        allRows = parseFile(ev.target.result);
        const counts = {};
        allRows.forEach(r => { counts[r.pav] = (counts[r.pav]||0) + 1; });
        document.getElementById('count-Pavilhao1').textContent = (counts['Pavilhao 1']||0).toLocaleString('pt-BR') + ' posições';
        document.getElementById('count-Pavilhao2').textContent = (counts['Pavilhao 2']||0).toLocaleString('pt-BR') + ' posições';
        document.getElementById('count-Pavilhao3').textContent = (counts['Pavilhao 3']||0).toLocaleString('pt-BR') + ' posições';
        document.getElementById('count-Perecivel').textContent = (counts['Perecivel']||0).toLocaleString('pt-BR') + ' posições';
        pavCards.forEach(btn => btn.disabled = false);
        loadStatus.textContent = allRows.length.toLocaleString('pt-BR') + ' endereços carregados. Escolha um pavilhão.';
      } catch (err) {
        loadStatus.textContent = 'Erro ao processar: ' + err.message;
      }
    }, 30);
  };
  reader.onerror = () => { loadStatus.textContent = 'Erro ao ler arquivo.'; };
  reader.readAsText(file, 'iso-8859-1');
});

pavCards.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!allRows) return;
    const pav = btn.getAttribute('data-pav');
    const rows = allRows.filter(r => r.pav === pav);
    showScene(pav, rows);
  });
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('scene-screen').style.display = 'none';
  document.getElementById('select-screen').style.display = 'flex';
  disposeScene();
});

// ============ CENA 3D ============
let renderer, scene, camera, controls, raycaster, mouse;
let apanhaInst = null, pulmaoInst = null;
let apanhaData = [], pulmaoData = [];
let sceneInited = false;

function initSceneOnce() {
  if (sceneInited) return;
  sceneInited = true;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14181C);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  document.getElementById('scene-screen').appendChild(renderer.domElement);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '1';

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.maxPolarAngle = Math.PI * 0.49;

  scene.add(new THREE.HemisphereLight(0x9fb8d9, 0x1a1d20, 0.95));
  const key = new THREE.DirectionalLight(0xfff2df, 0.8);
  key.position.set(40, 60, 30);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('click', onSceneClick);
  window.addEventListener('resize', onResize);

  animate();
}

function onResize() {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function disposeScene() {
  if (apanhaInst) { scene.remove(apanhaInst); apanhaInst.geometry.dispose(); apanhaInst = null; }
  if (pulmaoInst) { scene.remove(pulmaoInst); pulmaoInst.geometry.dispose(); pulmaoInst = null; }
  const floor = scene.getObjectByName('floor');
  if (floor) scene.remove(floor);
  const grid = scene.getObjectByName('grid');
  if (grid) scene.remove(grid);
  apanhaData = []; pulmaoData = [];
  document.getElementById('panel').style.display = 'none';
}

const RUA_SPACING = 2.4;
const BAY_SPACING = 0.65;
const FALLBACK_LEVEL_H = 1.4;
const boxMatA = new THREE.MeshStandardMaterial({ color: 0xB5895A, roughness: 0.85 });
const boxMatP = new THREE.MeshStandardMaterial({ color: 0xD8C9A3, roughness: 0.6, transparent:true, opacity:0.92 });
const boxGeo = new THREE.BoxGeometry(0.55, 0.5, 0.5);
const wrapGeo = new THREE.BoxGeometry(0.55, 1.1, 0.5);

function showScene(pavKey, rows) {
  document.getElementById('select-screen').style.display = 'none';
  document.getElementById('scene-screen').style.display = 'block';
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.textContent = 'Montando ' + rows.length.toLocaleString('pt-BR') + ' posições...';
  document.getElementById('scene-screen').appendChild(overlay);

  setTimeout(() => {
    initSceneOnce();
    disposeScene();
    buildLayout(pavKey, rows);
    overlay.remove();
  }, 30);
}

function buildLayout(pavKey, rows) {
  const label = { 'Pavilhao 1':'Pavilhão 1', 'Pavilhao 2':'Pavilhão 2', 'Pavilhao 3':'Pavilhão 3', 'Perecivel':'Perecível' }[pavKey];
  document.getElementById('scene-title').textContent = label;
  const nA = rows.filter(r => r.esp === 'Apanha').length;
  const nP = rows.filter(r => r.esp === 'Pulmão').length;
  document.getElementById('scene-sub').textContent = rows.length.toLocaleString('pt-BR') + ' posições (' + nA.toLocaleString('pt-BR') + ' apanha, ' + nP.toLocaleString('pt-BR') + ' pulmão)';

  // Ruas unicas ordenadas -> indice de linha (Z)
  const ruas = Array.from(new Set(rows.map(r => r.rua))).sort((a,b) => parseInt(a,10) - parseInt(b,10));
  const ruaIndex = new Map(ruas.map((r,i) => [r, i]));

  // Predio min por rua, pra alinhar cada corredor perto da origem
  const predioMinByRua = new Map();
  rows.forEach(r => {
    const cur = predioMinByRua.get(r.rua);
    if (cur === undefined || r.predio < cur) predioMinByRua.set(r.rua, r.predio);
  });

  // Fallback de altura: ranking de APTO dentro de cada (rua,predio) quando falta TIPEND
  const aptoRank = new Map(); // key `${rua}_${predio}` -> Map(apto -> index)
  rows.forEach(r => {
    const key = r.rua + '_' + r.predio;
    if (!aptoRank.has(key)) aptoRank.set(key, new Set());
    aptoRank.get(key).add(r.apto);
  });
  const aptoRankSorted = new Map();
  aptoRank.forEach((set, key) => {
    aptoRankSorted.set(key, Array.from(set).sort((a,b)=>a-b));
  });

  apanhaData = [];
  pulmaoData = [];

  const matA = new THREE.Matrix4();
  const dummyPos = new THREE.Vector3(), dummyQuat = new THREE.Quaternion(), dummyScale = new THREE.Vector3(1,1,1);
  const boundsMin = new THREE.Vector3(Infinity,Infinity,Infinity);
  const boundsMax = new THREE.Vector3(-Infinity,-Infinity,-Infinity);

  rows.forEach(r => {
    const zi = ruaIndex.get(r.rua);
    const z = zi * RUA_SPACING;
    const pMin = predioMinByRua.get(r.rua) || 0;
    const x = (r.predio - pMin) * BAY_SPACING;
    let y;
    if (r.tipend !== null) {
      y = r.tipend;
    } else {
      const key = r.rua + '_' + r.predio;
      const order = aptoRankSorted.get(key) || [r.apto];
      const idx = order.indexOf(r.apto);
      y = 0.4 + (idx >= 0 ? idx : 0) * FALLBACK_LEVEL_H;
    }
    const zOff = (r.sala % 4) * 0.14;
    const pos = { x, y, z: z + zOff, addr: `RUA ${r.rua} / PRÉDIO ${r.predio} / APTO ${r.apto} / SALA ${r.sala}`, esp: r.esp, desc: r.desc, codigo: r.codigo };
    if (r.esp === 'Apanha') apanhaData.push(pos); else pulmaoData.push(pos);
    boundsMin.x = Math.min(boundsMin.x, x); boundsMax.x = Math.max(boundsMax.x, x);
    boundsMin.y = Math.min(boundsMin.y, y); boundsMax.y = Math.max(boundsMax.y, y);
    boundsMin.z = Math.min(boundsMin.z, z); boundsMax.z = Math.max(boundsMax.z, z);
  });

  if (apanhaData.length > 0) {
    apanhaInst = new THREE.InstancedMesh(boxGeo, boxMatA, apanhaData.length);
    apanhaData.forEach((d, i) => {
      matA.compose(new THREE.Vector3(d.x, d.y, d.z), dummyQuat, dummyScale);
      apanhaInst.setMatrixAt(i, matA);
    });
    scene.add(apanhaInst);
  }
  if (pulmaoData.length > 0) {
    pulmaoInst = new THREE.InstancedMesh(wrapGeo, boxMatP, pulmaoData.length);
    pulmaoData.forEach((d, i) => {
      matA.compose(new THREE.Vector3(d.x, d.y, d.z), dummyQuat, dummyScale);
      pulmaoInst.setMatrixAt(i, matA);
    });
    scene.add(pulmaoInst);
  }

  // Piso
  const cx = (boundsMin.x + boundsMax.x)/2, cz = (boundsMin.z + boundsMax.z)/2;
  const fw = (boundsMax.x - boundsMin.x) + 8, fd = (boundsMax.z - boundsMin.z) + 8;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(cx, -0.1, cz);
  floor.name = 'floor';
  scene.add(floor);
  const grid = new THREE.GridHelper(Math.max(fw,fd), 40, 0x2a3138, 0x1e2327);
  grid.position.set(cx, -0.09, cz);
  grid.name = 'grid';
  scene.add(grid);

  // Camera fit
  const spanX = boundsMax.x - boundsMin.x, spanZ = boundsMax.z - boundsMin.z, spanY = boundsMax.y - boundsMin.y;
  const maxSpan = Math.max(spanX, spanZ, 10);
  camera.position.set(cx + maxSpan*0.35, Math.max(spanY, 8) + maxSpan*0.4, cz + maxSpan*0.55);
  controls.target.set(cx, (boundsMin.y+boundsMax.y)/2, cz);
  controls.minDistance = 2;
  controls.maxDistance = maxSpan * 3;
  controls.update();
}

function onSceneClick(event) {
  if (!apanhaInst && !pulmaoInst) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const targets = [apanhaInst, pulmaoInst].filter(Boolean);
  const hits = raycaster.intersectObjects(targets);
  const panel = document.getElementById('panel');
  if (hits.length === 0) { panel.style.display = 'none'; return; }
  const hit = hits[0];
  const data = hit.object === apanhaInst ? apanhaData[hit.instanceId] : pulmaoData[hit.instanceId];
  panel.style.display = 'block';
  panel.innerHTML =
    '<div class="l">Endereço</div><div class="v">' + data.addr + '</div>' +
    '<div class="l">Espécie</div><div class="v">' + data.esp + '</div>' +
    '<div class="l">Código</div><div class="v">' + (data.codigo || '-') + '</div>' +
    '<div class="l">Descrição</div><div class="v">' + (data.desc || '(vazio)') + '</div>';
}
