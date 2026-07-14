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
let currentPavKey = null, currentRows = null;

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
    currentPavKey = pav;
    currentRows = rows;
    showScene(pav, rows);
  });
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('scene-screen').style.display = 'none';
  document.getElementById('select-screen').style.display = 'flex';
  disposeScene();
});

document.getElementById('btn-save-edits').addEventListener('click', () => {
  commitProxy();
  const out = [];
  manualEdits.forEach((pos, key) => out.push({ key, x: pos.x, y: pos.y, z: pos.z }));
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ajustes_posicoes.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('btn-load-edits').addEventListener('click', () => document.getElementById('edits-file-input').click());
document.getElementById('edits-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      manualEdits.clear();
      data.forEach(item => manualEdits.set(item.key, { x: item.x, y: item.y, z: item.z }));
      if (currentPavKey && currentRows) {
        disposeScene();
        buildLayout(currentPavKey, currentRows);
      }
    } catch (err) {
      alert('Erro ao ler ajustes: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
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
  renderer.domElement.addEventListener('pointerdown', onScenePointerDown);
  renderer.domElement.addEventListener('pointermove', onScenePointerMove);
  window.addEventListener('pointerup', onScenePointerUp);
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
  const beams = scene.getObjectByName('beams');
  if (beams) { scene.remove(beams); beams.traverse(o => o.geometry && o.geometry.dispose()); }
  const cols = scene.getObjectByName('columns');
  if (cols) { scene.remove(cols); cols.traverse(o => o.geometry && o.geometry.dispose()); }
  commitProxy();
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

  // Fallback de altura: quando falta TIPEND, usa a media de alturas conhecidas
  // do mesmo predio, senao da mesma rua, senao um padrao por especie
  const tipendByBay = new Map(); // rua_predio -> [alturas conhecidas]
  const tipendByRua = new Map(); // rua -> [alturas conhecidas]
  rows.forEach(r => {
    if (r.tipend === null) return;
    const bayKey = r.rua + '_' + r.predio;
    if (!tipendByBay.has(bayKey)) tipendByBay.set(bayKey, []);
    tipendByBay.get(bayKey).push(r.tipend);
    if (!tipendByRua.has(r.rua)) tipendByRua.set(r.rua, []);
    tipendByRua.get(r.rua).push(r.tipend);
  });
  function avg(arr) { return arr.reduce((a,b)=>a+b,0) / arr.length; }
  function fallbackHeight(r) {
    const bayKey = r.rua + '_' + r.predio;
    if (tipendByBay.has(bayKey)) return avg(tipendByBay.get(bayKey));
    if (tipendByRua.has(r.rua)) return avg(tipendByRua.get(r.rua));
    return r.esp === 'Apanha' ? 0.4 : 2.0;
  }

  apanhaData = [];
  pulmaoData = [];

  const matA = new THREE.Matrix4();
  const dummyPos = new THREE.Vector3(), dummyQuat = new THREE.Quaternion(), dummyScale = new THREE.Vector3(1,1,1);
  const boundsMin = new THREE.Vector3(Infinity,Infinity,Infinity);
  const boundsMax = new THREE.Vector3(-Infinity,-Infinity,-Infinity);

  rows.forEach((r, rowId) => {
    const zi = ruaIndex.get(r.rua);
    const z = zi * RUA_SPACING;
    const pMin = predioMinByRua.get(r.rua) || 0;
    const x = (r.predio - pMin) * BAY_SPACING;
    const y = r.tipend !== null ? r.tipend : fallbackHeight(r);
    const zOff = (r.sala % 4) * 0.14;
    const override = manualEdits.get(pavKey + '_' + rowId);
    const pos = {
      x: override ? override.x : x,
      y: override ? override.y : y,
      z: override ? override.z : (z + zOff),
      addr: `RUA ${r.rua} / PRÉDIO ${r.predio} / APTO ${r.apto} / SALA ${r.sala}`,
      esp: r.esp, desc: r.desc, codigo: r.codigo, rowId, pavKey
    };
    if (r.esp === 'Apanha') apanhaData.push(pos); else pulmaoData.push(pos);
    boundsMin.x = Math.min(boundsMin.x, pos.x); boundsMax.x = Math.max(boundsMax.x, pos.x);
    boundsMin.y = Math.min(boundsMin.y, pos.y); boundsMax.y = Math.max(boundsMax.y, pos.y);
    boundsMin.z = Math.min(boundsMin.z, pos.z); boundsMax.z = Math.max(boundsMax.z, pos.z);
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

  // --- Longarinas: uma por (rua, nivel de altura arredondado) ---
  const beamGroups = new Map(); // key rua_yRound -> {z, y, minX, maxX}
  [...apanhaData, ...pulmaoData].forEach(d => {
    const yRound = Math.round(d.y * 10) / 10;
    const key = d.z.toFixed(2) + '_' + yRound;
    if (!beamGroups.has(key)) beamGroups.set(key, { z: d.z, y: yRound, minX: d.x, maxX: d.x });
    else {
      const g = beamGroups.get(key);
      g.minX = Math.min(g.minX, d.x);
      g.maxX = Math.max(g.maxX, d.x);
    }
  });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xE2571C, metalness: 0.3, roughness: 0.5 });
  const beamGroupObj = new THREE.Group();
  beamGroupObj.name = 'beams';
  beamGroups.forEach(g => {
    const len = (g.maxX - g.minX) + 0.5;
    if (len < 0.3) return;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06), beamMat);
    beam.position.set((g.minX + g.maxX) / 2, g.y - 0.32, g.z);
    beamGroupObj.add(beam);
  });
  scene.add(beamGroupObj);

  // --- Colunas de sustentacao: uma a cada poucos bays por corredor ---
  const colMat = new THREE.MeshStandardMaterial({ color: 0x1e4d8c, metalness: 0.3, roughness: 0.55 });
  const colGroupObj = new THREE.Group();
  colGroupObj.name = 'columns';
  const colByRuaX = new Map(); // rua_z -> set of x (rounded to bay)
  [...apanhaData, ...pulmaoData].forEach(d => {
    const key = d.z.toFixed(2);
    if (!colByRuaX.has(key)) colByRuaX.set(key, { z: d.z, xs: new Set(), maxY: -Infinity });
    const g = colByRuaX.get(key);
    g.xs.add(Math.round(d.x / (BAY_SPACING*3)) * (BAY_SPACING*3));
    g.maxY = Math.max(g.maxY, d.y);
  });
  colByRuaX.forEach(g => {
    g.xs.forEach(x => {
      const h = g.maxY + 0.8;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), colMat);
      col.position.set(x, h/2 - 0.4, g.z);
      colGroupObj.add(col);
    });
  });
  scene.add(colGroupObj);


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

// --- Edicao: manualEdits guarda posicoes ajustadas manualmente ---
const manualEdits = new Map(); // "pavKey_rowId" -> {x,y,z}
let selectedProxy = null; // { mesh, isApanha, instanceId, data }
let isDragging = false;
let pointerDownPos = null;
const dragPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const dragOffset = new THREE.Vector3();

function commitProxy() {
  if (!selectedProxy) return;
  const { mesh, isApanha, instanceId, data } = selectedProxy;
  data.x = mesh.position.x; data.y = mesh.position.y; data.z = mesh.position.z;
  manualEdits.set(data.pavKey + '_' + data.rowId, { x: data.x, y: data.y, z: data.z });
  const inst = isApanha ? apanhaInst : pulmaoInst;
  const m = new THREE.Matrix4();
  m.compose(mesh.position, new THREE.Quaternion(), new THREE.Vector3(1,1,1));
  inst.setMatrixAt(instanceId, m);
  inst.instanceMatrix.needsUpdate = true;
  scene.remove(mesh);
  mesh.geometry.dispose();
  selectedProxy = null;
  document.getElementById('panel').style.display = 'none';
}

function selectInstance(object, instanceId) {
  commitProxy();
  const isApanha = object === apanhaInst;
  const data = isApanha ? apanhaData[instanceId] : pulmaoData[instanceId];
  const geo = isApanha ? boxGeo : wrapGeo;
  const mat = new THREE.MeshStandardMaterial({ color: 0xF2A93B, emissive: 0x3a2400, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(data.x, data.y, data.z);
  scene.add(mesh);
  // esconde a instancia original (escala zero)
  const zeroM = new THREE.Matrix4().compose(new THREE.Vector3(data.x,data.y,data.z), new THREE.Quaternion(), new THREE.Vector3(0,0,0));
  object.setMatrixAt(instanceId, zeroM);
  object.instanceMatrix.needsUpdate = true;
  selectedProxy = { mesh, isApanha, instanceId, data };
  updatePanel();
}

function updatePanel() {
  if (!selectedProxy) return;
  const { data, mesh } = selectedProxy;
  const panel = document.getElementById('panel');
  panel.style.display = 'block';
  panel.innerHTML =
    '<div class="l">Endereço</div><div class="v">' + data.addr + '</div>' +
    '<div class="l">Espécie</div><div class="v">' + data.esp + '</div>' +
    '<div class="l">Código</div><div class="v">' + (data.codigo || '-') + '</div>' +
    '<div class="l">Descrição</div><div class="v">' + (data.desc || '(vazio)') + '</div>' +
    '<div class="l" style="margin-top:12px">Posição (arraste no chão pra mover X/Z)</div>' +
    '<div class="edit-row"><label>Y</label><input type="range" id="proxy-y" min="0" max="12" step="0.05" value="' + mesh.position.y.toFixed(2) + '"><span id="proxy-y-out">' + mesh.position.y.toFixed(2) + 'm</span></div>' +
    '<button id="proxy-done" class="full-btn">Concluir edição</button>';
  document.getElementById('proxy-y').addEventListener('input', (e) => {
    mesh.position.y = parseFloat(e.target.value);
    document.getElementById('proxy-y-out').textContent = parseFloat(e.target.value).toFixed(2) + 'm';
  });
  document.getElementById('proxy-done').addEventListener('click', commitProxy);
}

function screenToMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onScenePointerDown(event) {
  if (event.button !== 0) return;
  pointerDownPos = { x: event.clientX, y: event.clientY };
  screenToMouse(event);
  raycaster.setFromCamera(mouse, camera);

  // Se ja existe proxy selecionado, tenta arrastar ele primeiro
  if (selectedProxy) {
    const hitsProxy = raycaster.intersectObject(selectedProxy.mesh);
    if (hitsProxy.length > 0) {
      dragPlane.constant = -selectedProxy.mesh.position.y;
      const hp = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, hp);
      dragOffset.copy(selectedProxy.mesh.position).sub(hp);
      isDragging = true;
      controls.enabled = false;
      return;
    }
  }

  const targets = [apanhaInst, pulmaoInst].filter(Boolean);
  const hits = raycaster.intersectObjects(targets);
  if (hits.length > 0) {
    selectInstance(hits[0].object, hits[0].instanceId);
    dragPlane.constant = -selectedProxy.mesh.position.y;
    const hp = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, hp);
    dragOffset.copy(selectedProxy.mesh.position).sub(hp);
    isDragging = true;
    controls.enabled = false;
  }
}

function onScenePointerMove(event) {
  if (!isDragging || !selectedProxy) return;
  screenToMouse(event);
  raycaster.setFromCamera(mouse, camera);
  const hp = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, hp)) {
    selectedProxy.mesh.position.x = hp.x + dragOffset.x;
    selectedProxy.mesh.position.z = hp.z + dragOffset.z;
  }
}

function onScenePointerUp(event) {
  if (isDragging) {
    isDragging = false;
    controls.enabled = true;
  } else if (pointerDownPos) {
    const moved = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
    if (moved < 4 && selectedProxy) {
      screenToMouse(event);
      raycaster.setFromCamera(mouse, camera);
      const hitsProxy = raycaster.intersectObject(selectedProxy.mesh);
      const targets = [apanhaInst, pulmaoInst].filter(Boolean);
      const hits = raycaster.intersectObjects(targets);
      if (hitsProxy.length === 0 && hits.length === 0) commitProxy();
    }
  }
  pointerDownPos = null;
}
