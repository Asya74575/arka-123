/* 3D-карта района — блок «Как добраться» (ТЗ 5.9): полёт по маршруту (правка владельца 2026-10-15: «данную карту ранее
   анимировали, надо вставить эту карту вместо этой картинки»). Перенос варианта 2 из drafts/map3d (fly.js, 2026-10-14) —
   приёмы референса владельца Lumara v3 (REFERENCES.md «Lumara v3») на светлой карте макета:
   1) блок закреплён, камера летит за прокруткой по остановкам: весь район → метро → путь → арка → библиотека → весь район;
      у остановки замедляется, но не стоит (в каждом отрезке 0,3 ровного хода + 0,7 мягкого), слева внизу подпись остановки;
   2) по пути от метро бегут пакеты света; путь прорисовывается за точкой-пешеходом;
   3) над аркой — столб света с плашкой «АРКА 123»;
   4) в конце полёта справа выезжает «Время в пути» (≥1280; уже — под сценой), карту можно покрутить мышью или пальцем,
      «Вернуться к маршруту» возвращает ракурс.
   Дома и деревья стоят сразу в полную высоту: волну роста домов от арки и полосу по земле владелец убрала
   (2026-10-15: «убери в карте волну смену формата объектов на карте»; в черновике drafts/map3d она осталась).
   Данные — map3d-data.js (OpenStreetMap, tools/map3d/build.mjs), движок — vendor/three/three-map.js (three.js r186, MIT);
   скрипты грузятся, когда до блока остаётся два экрана. Земля векторная: на близких остановках края чёткие.
   Высота блока (закрепление на 7,2 экрана) ставится сразу при загрузке страницы, а не когда сцена готова, — чтобы
   не сдвигать закрепления блоков ниже (арка «Аренда»).
   При «уменьшении движения» — один конечный кадр, подписи и время в пути списком; без JS и WebGL — кадр сцены картинкой
   (img/map-scene-*.webp), подписи и время в пути списком. Отладка: ?flyp=0.4 — остановить полёт на доле хода. */
(() => {
  const qs = new URLSearchParams(location.search);
  const root = document.querySelector('[data-fly]');
  if (!root) return;
  let T, D;
  const section = root.closest('.fly');
  const stage = root.querySelector('.fly__stage');
  const view = root.querySelector('.fly__view');
  const canvas = root.querySelector('.fly__canvas');
  const labelsEl = root.querySelector('.fly__labels');
  const steps = [...root.querySelectorAll('.fly__step')];
  const panel = section.querySelector('.fly__panel');
  const after = section.querySelector('.fly__after');
  const backBtn = section.querySelector('.fly__back');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const wide = matchMedia('(min-width: 1280px)');                // брекпоинты сайта (L88): панель в сцене — с 1280
  const narrowMq = matchMedia('(max-width: 1023.98px)');          // подпись остановки снизу, камера отходит — уже 1024

  // WebGL есть? Иначе остаётся кадр сцены картинкой и списки (вид без JS)
  try {
    const t = document.createElement('canvas'), gl = t.getContext('webgl2') || t.getContext('webgl');
    if (!gl) return;
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { return; }
  section.classList.add('is-live');
  if (reduced) section.classList.add('is-reduced');

  // Панель «Время в пути»: на широком экране — внутри сцены (выезжает в конце полёта), уже — под сценой
  const placePanel = () => { const inStage = wide.matches && !reduced; (inStage ? stage : after).appendChild(panel); section.classList.toggle('is-panel-in', inStage); };
  placePanel();
  wide.addEventListener('change', () => { placePanel(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
  // высота блока сменилась — закрепления и появления ниже пересчитываются
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();

  // Скрипты и сцена — когда блок в двух экранах от окна
  const BASE = new URL('./', document.currentScript.src);
  const DATA_V = new URL(document.currentScript.src).search;   // данные карты — с той же версией ?v=, что fly.js: браузер не берёт старые из кэша
  const VENDOR = new URL('../../vendor/three/three-map.js', document.currentScript.src);
  // сборку three-map.js берёт и 3D-модель зала в «Форматах» (room3d-loader.js, arka-123-8e): уже есть — не грузим второй раз,
  // её <script> уже на странице — ждём его загрузки
  const load = (src, ready) => new Promise((ok, fail) => {
    if (ready()) return ok();
    const file = src.split('/').pop();
    const was = [...document.scripts].find((x) => x.src && x.src.split('?')[0].endsWith('/' + file));
    if (was) { was.addEventListener('load', () => (ready() ? ok() : fail()), { once: true }); was.addEventListener('error', fail, { once: true }); return; }
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  let started = false;
  new IntersectionObserver((es, io) => {
    if (!es.some((e) => e.isIntersecting) || started) return;
    started = true; io.disconnect();
    Promise.all([load(VENDOR.href, () => window.THREE_MAP), load(new URL('map3d-data.js' + DATA_V, BASE).href, () => window.ARKA_MAP3D)]).then(() => {
      T = window.THREE_MAP; D = window.ARKA_MAP3D;
      if (T && D) build(); else fail();
    }).catch(fail);
  }, { rootMargin: '200% 0px' }).observe(root);
  // движок не загрузился — кадр сцены картинкой и списки, как без JS
  function fail() { section.classList.remove('is-live', 'is-panel-in'); after.appendChild(panel); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }

  function build() {
    const C = {
      bg: '#e1e3e9', ground: '#dcdfe6', parking: '#e5e7ec', park: '#d3d9d1', water: '#b1cae3',
      path: '#eceef2', minor: '#f3f4f7', street: '#fafbfc', major: '#ffffff',
      bld: '#f6f6f8', bldEdge: '#b9bdc6', stylobate: '#eef0f4', glass: '#b1cae3', glassEdge: '#7f9dbb',
      quarter: '#d7c9b7', quarterEdge: '#584c40', tree: '#d3dbd0', tree2: '#c4cdc1',
      route: '#332920', routeCase: '#ffffff', packet: '#b1cae3', beam: '#8fb0d3', beamGlow: '#b1cae3',
    };
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { fail(); return; }
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(C.bg, 1);
    const scene = new T.Scene();
    scene.background = new T.Color(C.bg);
    scene.fog = new T.Fog(C.bg, 1000, 3000);
    const camera = new T.PerspectiveCamera(28, 16 / 9, 10, 8000);

    // Свет — как в варианте 1; солнце неподвижно над центром данных, тени пересчитываются только пока растут дома
    const [x0, y0, x1, y1] = D.box, cx = (x0 + x1) / 2, cz = (y0 + y1) / 2;
    scene.add(new T.HemisphereLight('#ffffff', '#b9bdc6', 1.9));
    const sun = new T.DirectionalLight('#ffffff', 1.6);
    sun.castShadow = true;
    const sm = coarse ? 2048 : 4096;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera; sc.left = -1150; sc.right = 1150; sc.top = 1150; sc.bottom = -1150; sc.near = 10; sc.far = 4200;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    if ('intensity' in sun.shadow) sun.shadow.intensity = 0.55;
    sun.position.set(cx - 700, 1000, cz + 420); sun.target.position.set(cx, 0, cz);
    scene.add(sun, sun.target);

    // ---------- Земля: плоские фигуры по слоям (рисуются первыми, глубину не пишут — дома всегда поверх) ----------
    const flatMat = (color, order) => { const m = new T.MeshLambertMaterial({ color, depthWrite: false, depthTest: false }); return [m, order]; };
    const addFlat = (geo, [mat, order]) => { const m = new T.Mesh(geo, mat); m.renderOrder = order; m.receiveShadow = true; scene.add(m); return m; };
    const plane = new T.PlaneGeometry(16000, 16000); plane.rotateX(-Math.PI / 2); plane.translate(cx, 0, cz);
    addFlat(plane, flatMat(C.ground, -20));
    const fill = (list) => {
      const geos = list.filter((f) => f.length >= 6).map((f) => { const sh = new T.Shape(); for (let i = 0; i < f.length; i += 2) (i ? sh.lineTo : sh.moveTo).call(sh, f[i], -f[i + 1]); const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.deleteAttribute('uv'); return g; });
      return geos.length ? T.mergeGeometries(geos, false) : null;
    };
    // лента по ломаной: прямоугольники отрезков + круглые стыки; along — расстояние от начала (для пути)
    function ribbon(f, w, y, out, along) {
      const hw = w / 2, seg = 10;
      const P = []; for (let i = 0; i < f.length; i += 2) P.push([f[i], f[i + 1]]);
      const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
        out.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
        if (along) { const a = acc[i], b = acc[i + 1]; along.push(a, b, b, a, b, a); }
      }
      P.forEach(([px, pz], k) => {
        for (let j = 0; j < seg; j++) {
          const a1 = j / seg * Math.PI * 2, a2 = (j + 1) / seg * Math.PI * 2;
          out.push(px, y, pz, px + Math.cos(a2) * hw, y, pz + Math.sin(a2) * hw, px + Math.cos(a1) * hw, y, pz + Math.sin(a1) * hw);
          if (along) along.push(acc[k], acc[k], acc[k]);
        }
      });
    }
    const roadGeo = (list, w) => { const pos = []; list.forEach((f) => ribbon(f, w, 0, pos)); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
    [[D.parking, C.parking, -19], [D.park, C.park, -18], [D.water, C.water, -17]].forEach(([list, color, order]) => { const g = fill(list); if (g) addFlat(g, flatMat(color, order)); });
    [[D.roads.path, C.path, 2.2, -16], [D.roads.minor, C.minor, 6, -15], [D.roads.street, C.street, 12, -14], [D.roads.major, C.major, 18, -13]].forEach(([list, color, w, order]) => { if (list && list.length) addFlat(roadGeo(list, w), flatMat(color, order)); });

    // ---------- Дома: два слияния — обычные и два дома с аркой (подсвечены) ----------
    const A = D.arch.c;
    const ARCH = { w: 18, spring: 12 };
    function archBlock(f, h) { // копия из map3d.js: вставка между башнями с полукруглым проходом
      let ang = 0, best = 0;
      for (let i = 0; i < f.length - 2; i += 2) { const dx = f[i + 2] - f[i], dy = f[i + 3] - f[i + 1], l = Math.hypot(dx, dy); if (l > best) { best = l; ang = Math.atan2(dy, dx); } }
      const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (let i = 0; i < f.length; i += 2) { const u = f[i] * ux + f[i + 1] * uy, v = f[i] * vx + f[i + 1] * vy; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const uc = (u0 + u1) / 2, r = ARCH.w / 2, sp = ARCH.spring;
      const sh = new T.Shape();
      sh.moveTo(u0, 0); sh.lineTo(uc - r, 0); sh.lineTo(uc - r, sp); sh.absarc(uc, sp, r, Math.PI, 0, true);
      sh.lineTo(uc + r, 0); sh.lineTo(u1, 0); sh.lineTo(u1, h); sh.lineTo(u0, h); sh.lineTo(u0, 0);
      const geo = new T.ExtrudeGeometry(sh, { depth: v1 - v0, bevelEnabled: false, curveSegments: 32 });
      geo.deleteAttribute('uv');
      const m = new T.Matrix4().makeBasis(new T.Vector3(ux, 0, uy), new T.Vector3(0, 1, 0), new T.Vector3(vx, 0, vy));
      m.setPosition(vx * v0, 0, vy * v0);
      geo.applyMatrix4(m);
      return geo;
    }
    const extrude = (f, holes, h) => {
      const sh = new T.Shape(); for (let i = 0; i < f.length; i += 2) (i ? sh.lineTo : sh.moveTo).call(sh, f[i], -f[i + 1]);
      (holes || []).forEach((hh) => { const p = new T.Path(); for (let i = 0; i < hh.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, hh[i], -hh[i + 1]); sh.holes.push(p); });
      const geo = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 }); geo.rotateX(-Math.PI / 2); geo.deleteAttribute('uv'); return geo;
    };
    const groups = { n: { geos: [], edges: [] }, a: { geos: [], edges: [] } };
    const archTops = [];
    D.bld.forEach((b) => {
      const geo = b.x ? archBlock(b.p, b.h) : extrude(b.p, b.hl, Math.max(2, b.h));
      if (b.a) archTops.push(b.h);
      const g = groups[b.a ? 'a' : 'n']; g.geos.push(geo); g.edges.push(new T.EdgesGeometry(geo, 28));
    });
    // Национальная библиотека: стилобат и ромбокубооктаэдр (как в варианте 1)
    const L = D.library, lc = L.c, styH = 10;
    let lAng = 0, lBest = 0;
    for (let i = 0; i < L.p.length - 2; i += 2) { const dx = L.p[i + 2] - L.p[i], dy = L.p[i + 3] - L.p[i + 1], len = Math.hypot(dx, dy); if (len > lBest) { lBest = len; lAng = Math.atan2(dy, dx); } }
    const kk = 1 + Math.SQRT2, rs = 12.4, pts = [];
    for (const a of [-1, 1]) for (const b2 of [-1, 1]) for (const c of [-kk, kk]) pts.push([a, b2, c], [a, c, b2], [c, a, b2]);
    const dia = new T.ConvexGeometry(pts.map(([a, b2, c]) => new T.Vector3(a * rs, b2 * rs, c * rs)));
    dia.rotateY(-lAng); dia.translate(lc[0], styH + kk * rs - 1, lc[1]);
    const libTop = styH + 2 * kk * rs - 1;
    const mats = { n: new T.MeshLambertMaterial({ color: C.bld }), a: new T.MeshLambertMaterial({ color: C.quarter }) };
    const eMats = { n: new T.LineBasicMaterial({ color: C.bldEdge, transparent: true, opacity: 0.55 }), a: new T.LineBasicMaterial({ color: C.quarterEdge, transparent: true, opacity: 0.9 }) };
    Object.entries(groups).forEach(([k, g]) => {
      if (!g.geos.length) return;
      const m = new T.Mesh(T.mergeGeometries(g.geos, false), mats[k]); m.castShadow = true; m.receiveShadow = true;
      scene.add(m, new T.LineSegments(T.mergeGeometries(g.edges, false), eMats[k]));
    });
    {
      const sty = extrude(L.p, [], styH);
      const m1 = new T.Mesh(sty, new T.MeshLambertMaterial({ color: C.stylobate })); m1.castShadow = true; m1.receiveShadow = true;
      const e1 = new T.LineSegments(new T.EdgesGeometry(sty, 28), eMats.n);
      const m2 = new T.Mesh(dia, new T.MeshLambertMaterial({ color: C.glass, flatShading: true })); m2.castShadow = true; m2.receiveShadow = true;
      const e2 = new T.LineSegments(new T.EdgesGeometry(dia, 1), new T.LineBasicMaterial({ color: C.glassEdge }));
      scene.add(m1, e1, m2, e2);
    }
    // деревья: те же правила, что в кадре макета
    let seed = 123; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const inPoly = (x, y, f) => { let c = false; for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) { const xi = f[i], yi = f[i + 1], xj = f[j], yj = f[j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const treesAt = [];
    D.park.forEach((f) => {
      let ax = 1e9, ay = 1e9, bx = -1e9, by = -1e9;
      for (let i = 0; i < f.length; i += 2) { ax = Math.min(ax, f[i]); bx = Math.max(bx, f[i]); ay = Math.min(ay, f[i + 1]); by = Math.max(by, f[i + 1]); }
      const ar = (bx - ax) * (by - ay); if (ar < 300) return;
      const n = Math.min(400, Math.round(ar / 260));
      for (let i = 0; i < n; i++) { const x = ax + rnd() * (bx - ax), y = ay + rnd() * (by - ay); if (inPoly(x, y, f)) treesAt.push([x, y, 2.6 + rnd() * 2.2, rnd()]); }
    });
    const trees = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), treesAt.length);
    const m4 = new T.Matrix4(), col = new T.Color(), c1 = new T.Color(C.tree), c2 = new T.Color(C.tree2);
    treesAt.forEach(([x, y, r, t], i) => { m4.makeScale(r, r * 1.15, r).setPosition(x, r * 1.1, y); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.copy(c1).lerp(c2, t)); });
    trees.castShadow = true; trees.receiveShadow = true; scene.add(trees);
    renderer.shadowMap.needsUpdate = true;   // сцена неподвижна — тени считаются один раз

    // ---------- Путь от метро: лента с прорисовкой и бегущими пакетами света ----------
    const RP = []; for (let i = 0; i < D.route.length; i += 2) RP.push([D.route[i], D.route[i + 1]]);
    const RACC = [0]; for (let i = 1; i < RP.length; i++) RACC.push(RACC[i - 1] + Math.hypot(RP[i][0] - RP[i - 1][0], RP[i][1] - RP[i - 1][1]));
    const RLEN = RACC[RACC.length - 1];
    const routeAt = (w, out = [0, 0]) => { const s = Math.min(RLEN, Math.max(0, w * RLEN)); let i = 1; while (i < RACC.length - 1 && RACC[i] < s) i++; const t = (s - RACC[i - 1]) / ((RACC[i] - RACC[i - 1]) || 1); out[0] = RP[i - 1][0] + (RP[i][0] - RP[i - 1][0]) * t; out[1] = RP[i - 1][1] + (RP[i][1] - RP[i - 1][1]) * t; return out; };
    const uRoute = { uDraw: { value: 0 }, uTime: { value: 0 } };
    const routeGeo = (w, y) => { const pos = [], al = []; ribbon(D.route, w, y, pos, al); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aAlong', new T.Float32BufferAttribute(al, 1)); return g; };
    const routeMat = (color, test, opacity, packets) => {
      const m = new T.MeshBasicMaterial({ color, depthTest: test, depthWrite: false, transparent: true, opacity, side: T.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uRoute, { uPacket: { value: new T.Color(C.packet) }, uPk: { value: packets ? 1 : 0 } });
        sh.vertexShader = 'attribute float aAlong;\nvarying float vAlong;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;');
        sh.fragmentShader = 'uniform float uDraw, uTime, uPk;\nuniform vec3 uPacket;\nvarying float vAlong;\n' + sh.fragmentShader.replace('#include <color_fragment>',
          `#include <color_fragment>
          if (vAlong > uDraw) discard;
          float ph = fract((vAlong - uTime * 22.0) / 64.0);
          float pk = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.1, 0.32, ph)) * smoothstep(0.0, 12.0, uDraw - vAlong);
          diffuseColor.rgb = mix(diffuseColor.rgb, uPacket, pk * uPk);`);
      };
      return m;
    };
    const rCase = routeGeo(10, 0.6), rLine = routeGeo(4.5, 0.8);
    [[rLine, C.route, false, 0.28, 9, false], [rCase, C.routeCase, true, 1, 10, false], [rLine, C.route, true, 1, 11, true]].forEach(([geo, color, test, op, order, pk]) => { const m = new T.Mesh(geo, routeMat(color, test, op, pk)); m.renderOrder = order; m.frustumCulled = false; scene.add(m); });

    // ---------- Столб света над аркой ----------
    const archTop = Math.min(...archTops.filter((h) => h < 60).concat([40]));
    const BEAM_H = 150, beamTop = archTop + BEAM_H;
    const beam = (radius, color, a0, segs) => {
      const g = new T.CylinderGeometry(radius, radius, BEAM_H, segs, 8, true);
      const pos = g.attributes.position, colA = new Float32Array(pos.count * 4), cc = new T.Color(color);
      for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + BEAM_H / 2) / BEAM_H, a = a0 * Math.pow(1 - t, 1.6); colA.set([cc.r, cc.g, cc.b, a], i * 4); }
      g.setAttribute('color', new T.BufferAttribute(colA, 4)); g.translate(A[0], archTop + BEAM_H / 2, A[1]);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.renderOrder = 12; scene.add(m); return m;
    };
    beam(9, C.beamGlow, 0.32, 4).rotation.y = 0; beam(3.2, C.beam, 0.95, 4);

    // ---------- Остановки камеры ----------
    // t — точка, куда смотрит камера; az — направление с этой точки на камеру (0 — с юга, −90 — с запада); el — высота взгляда;
    // d — расстояние; azN, dN — то же для узкого экрана (уже 1024 px); sx/sy — сдвиг картинки (доля кадра) вправо / вверх, чтобы место не уходило под подпись
    const W2 = routeAt(0.55);
    const END = RP[RP.length - 1];   // конец пути — у входа в дом зала (tools/map3d/build.mjs)
    const STOPS = [
      { t: [-110, 0, -150], az: -30, azN: 0, el: 46, d: 1550, sx: 0.12, sy: 0.04 }, // 0 весь район (azN — узкий экран: путь сверху вниз)
      { t: [RP[0][0], 0, RP[0][1]], az: -22, el: 40, d: 520, sx: 0.14, sy: 0.06 }, // 1 метро «Восток»
      { t: [W2[0], 0, W2[1]], az: 6, el: 42, d: 560, sx: 0.14, sy: 0.06 }, // 2 середина пути
      { t: [(A[0] + END[0]) / 2, 18, (A[1] + END[1]) / 2], az: -35, el: 17, d: 340, sx: 0.12, sy: 0.06 }, // 3 у дома зала: между аркой и концом пути (правка 2026-10-15)
      { t: [(A[0] + lc[0]) / 2, 10, (A[1] + lc[1]) / 2], az: 100, el: 24, d: 660, sx: 0.1, sy: 0.04 }, // 4 библиотека напротив
      { t: [-110, 0, -110], az: -30, azN: 0, el: 40, d: 1040, dN: 1850, sx: -0.2, sy: 0.2 }, // 5 весь район, «карта ваша» (левее — справа панель)
    ];
    // азимуты без скачка через 360° (свой ряд для узкого экрана)
    const unwrap = (list) => { for (let i = 1; i < list.length; i++) { while (list[i] - list[i - 1] > 180) list[i] -= 360; while (list[i] - list[i - 1] < -180) list[i] += 360; } return list; };
    const AZ_W = unwrap(STOPS.map((s) => s.az)), AZ_N = unwrap(STOPS.map((s) => (s.azN != null ? s.azN : s.az)));
    const LEGS = [1, 1.2, 1.2, 1, 1], SUM = LEGS.reduce((a, b) => a + b, 0), SPAN = 0.92;
    const WALK_MID = 0.55;
    function flight(p) {
      let q = Math.min(1, Math.max(0, p / SPAN)) * SUM, leg = 0;
      while (leg < LEGS.length - 1 && q > LEGS[leg]) { q -= LEGS[leg]; leg++; }
      const f = Math.min(1, q / LEGS[leg]), s = f * f * (3 - 2 * f);
      return { leg, f, e: 0.3 * f + 0.7 * s };
    }
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    const KEYS = (s, az, d) => [s.t[0], s.t[1], s.t[2], az, s.el, Math.log(d), s.sx, s.sy];
    const KS_W = STOPS.map((s, i) => KEYS(s, AZ_W[i], s.d)), KS_N = STOPS.map((s, i) => KEYS(s, AZ_N[i], s.dN || s.d));
    const narrow = () => narrowMq.matches;
    const cam = { tx: 0, ty: 0, tz: 0, az: 0, el: 0, d: 0, sx: 0, sy: 0, walk: 0, walkOn: false };
    function camAt(p) {
      const { leg, f, e } = flight(p);
      const KS = narrow() ? KS_N : KS_W;
      const i0 = Math.max(0, leg - 1), i1 = leg, i2 = leg + 1, i3 = Math.min(KS.length - 1, leg + 2);
      const v = KS[i1].map((_, k) => cr(KS[i0][k], KS[i1][k], KS[i2][k], KS[i3][k], e));
      [cam.tx, cam.ty, cam.tz, cam.az, cam.el] = v; cam.d = Math.exp(v[5]); cam.sx = v[6]; cam.sy = v[7];
      // отрезки 1 и 2 — пешком: камера смотрит на точку пути
      let walk = leg < 1 ? 0 : 1;
      if (leg === 1) { walk = WALK_MID * e; const r = routeAt(walk); cam.tx = r[0]; cam.ty = 0; cam.tz = r[1]; }
      if (leg === 2) { walk = WALK_MID + (1 - WALK_MID) * Math.min(1, e / 0.75); const r = routeAt(walk), k = e * e * (3 - 2 * e); cam.tx = r[0] + (STOPS[3].t[0] - r[0]) * k; cam.ty = STOPS[3].t[1] * k; cam.tz = r[1] + (STOPS[3].t[2] - r[1]) * k; }
      cam.walk = walk; cam.walkOn = leg >= 1 || e > 0.5;
      return { leg, f, e, stop: Math.min(STOPS.length - 1, leg + (e >= 0.5 ? 1 : 0)), final: p >= SPAN * 0.985 };
    }

    // ---------- Подписи на карте ----------
    const v3 = new T.Vector3();
    let stageW = 1, stageH = 1;
    const toScreen = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * stageW, (1 - v3.y) / 2 * stageH, v3.z]; };
    const mk = (cls, html) => { const d = document.createElement('div'); d.className = 'fl is-off ' + cls; d.innerHTML = html; labelsEl.appendChild(d); return d; };
    // Маскот вместо квадрата-указателя (правка владельца 2026-10-18; картинки — tools/map3d/bunny.py): по пути идёт зайчик
    // «шагает», у входа в дом — зайчик «привет». Точка пути — под подошвами (ay — доля высоты картинки, где подошвы, из bunny.py).
    // Шагающий смотрит туда, куда идёт по экрану (поворот 0,4 с в CSS), на ходу чуть подпрыгивает; стоит — не прыгает.
    // Размер — как у предмета сцены: зайчик ростом BUNNY_M метров в проекции, но не крупнее картинки (72 макета) и не мельче 32 px —
    // на общем плане он не в полбашни. За домом шагающий становится прозрачным, как сам путь за домами; конец пути за домом —
    // зайчик «привет» встаёт на последнюю видимую точку пути (у угла дома), а не поверх стены.
    const BUNNY_M = 20, BUNNY_MIN = 32;
    const bunny = (pose) => `<span class="fl__hop"><img class="fl__bunny" src="img/map-bunny-${pose}-120.webp" srcset="img/map-bunny-${pose}-120.webp 1x, img/map-bunny-${pose}-240.webp 2x" width="${pose === 'walk' ? 62 : 68}" height="120" alt="" draggable="false"></span>`;
    const walkerEl = mk('fl--walker fl--bunny', bunny('walk')), endEl = mk('fl--end fl--bunny', bunny('hello'));
    const hopEl = walkerEl.firstChild, faceEl = hopEl.firstChild, endHopEl = endEl.firstChild;
    const ray = new T.Raycaster(), rFrom = new T.Vector3(), rDir = new T.Vector3();
    let occluders = null;
    const seen = (x, z) => {   // точка пути (1,5 м над землёй) не закрыта домом
      occluders = occluders || scene.children.filter((o) => o.isMesh && o.castShadow && !o.isInstancedMesh);
      rFrom.copy(camera.position); rDir.set(x, 1.5, z).sub(rFrom);
      const dist = rDir.length(); ray.set(rFrom, rDir.normalize()); ray.far = Math.max(0, dist - 1.5);
      return ray.intersectObjects(occluders, false).length === 0;
    };
    const bunnyScale = (el, x, z, ay) => {   // масштаб вокруг подошв: рост BUNNY_M метров на экране, в пределах [32 px; картинка]
      const i = LB.findIndex((l) => l.el === el), h0 = (sizes[i] && sizes[i][1]) || 72;
      const px = toScreen(x, 1, z)[1] - toScreen(x, 1 + BUNNY_M, z)[1];
      return Math.min(1, Math.max(BUNNY_MIN / h0, px / h0));
    };
    // где стоит знак метро с плашкой (значок на точке выхода, плашка справа, слева или под ним) — по месту прошлого кадра
    const metroBox = () => {
      if (metroEl.classList.contains('is-off')) return null;
      const o = labelsEl.getBoundingClientRect(), r = metroEl.getBoundingClientRect();
      return [r.left - o.left, r.top - o.top, r.right - o.left, r.bottom - o.top];
    };
    let walkPrev = -1, walkMovedAt = -9, walkFace = 1, walkShown = 0;
    function walkerAt() {
      // у выхода из метро зайчик не стоит под знаком «М»: ждёт на первой точке пути, где его рамка не задевает знак и плашку
      const i = LB.findIndex((l) => l.el === walkerEl), [w0, h0] = sizes[i] || [37, 72], mb = metroBox();
      let w = cam.walk, r = routeAt(w), s = bunnyScale(walkerEl, r[0], r[1]);
      for (let m = 0; mb && m <= 160; m += 2) {
        const ww = Math.min(1, cam.walk + m / RLEN), rr = routeAt(ww), ss = bunnyScale(walkerEl, rr[0], rr[1]), q = toScreen(rr[0], 1, rr[1]);
        const bx = [q[0] - w0 * ss / 2, q[1] - h0 * ss * 0.9577, q[0] + w0 * ss / 2, q[1] + h0 * ss * 0.0423];
        w = ww; r = rr; s = ss;
        if (bx[2] < mb[0] - 4 || bx[0] > mb[2] + 4 || bx[3] < mb[1] - 4 || bx[1] > mb[3] + 4) break;
      }
      walkShown = w;
      const n = routeAt(Math.min(1, w + 0.01));
      const a = toScreen(r[0], 1, r[1]), b = toScreen(n[0], 1, n[1]), dx = b[0] - a[0], dy = b[1] - a[1];
      if (Math.abs(dx) > 0.5 && Math.abs(dx) > Math.abs(dy) * 0.25) walkFace = dx < 0 ? -1 : 1;   // почти вертикальный ход — прежний поворот
      if (Math.abs(w - walkPrev) > 1e-5) { walkPrev = w; walkMovedAt = breathT; }
      const hop = !reduced && breathT - walkMovedAt < 0.15 ? -Math.abs(Math.sin(breathT * 9)) * 3 : 0;
      hopEl.style.transform = `translateY(${hop.toFixed(1)}px) scale(${s.toFixed(3)})`;
      faceEl.style.transform = `scaleX(${walkFace})`;
      walkerEl.classList.toggle('is-behind', !seen(r[0], r[1]));
      return [r[0], 1, r[1]];
    }
    // конец пути: последняя видимая точка в последних 40 м пути; не видно ни одной — зайчика нет (endW < 0)
    let endW = 1, endKey = '';
    function endAt() {
      const key = camera.position.toArray().map((v) => Math.round(v / 2)).join();
      if (key !== endKey) {
        endKey = key; endW = -1;
        for (let s = 0; s <= 40; s += 1) { const w = 1 - s / RLEN, r = routeAt(w); if (seen(r[0], r[1])) { endW = w; break; } }
      }
      const r = routeAt(Math.max(0, endW));
      endHopEl.style.transform = `scale(${bunnyScale(endEl, r[0], r[1]).toFixed(3)})`;
      return [r[0], 1, r[1]];
    }
    // Знак метро — как на входах минского метро: красная «М» в круге (вместо тёмного квадрата с буквой; правка владельца
    // 2026-10-18: «замени на более привычный значок»). Круг — знак метрополитена, как значки мессенджеров (L54), не скругление L22
    const METRO = '<svg class="fl__m" viewBox="-16 -16 32 32" width="32" height="32" role="img" aria-label="Метро"><circle r="15" fill="#fff" stroke="#E31E25" stroke-width="2"/><path d="M-11.2-4.5H-3L0-1.4 2.9-4.5H11.2V4.5H3.1L0 7.7-3.2 4.5H-11.2Z" fill="#E31E25"/></svg>';
    const metroEl = mk('fl--metro', METRO + '<span class="fl__plate">Метро «Восток»</span>');
    const LB = [
      { el: mk('fl--pin', '<span class="fl__plate">АРКА 123</span>'), at: () => [A[0], beamTop, A[1]], ax: 0.5, ay: 1, dy: -10, pr: 0, clamp: true, pin: true },
      { el: walkerEl, at: walkerAt, ax: 0.5, ay: 0.9577, pr: 1, free: true, when: () => cam.walkOn && cam.walk < 0.995 },
      { el: endEl, at: endAt, ax: 0.5, ay: 0.9641, pr: 1, free: true, when: () => cam.walk >= 0.995 && endW >= 0 },
      { el: metroEl, at: () => [RP[0][0], 0, RP[0][1]], ax: 0, ay: 0, ox: -16, oy: -16, pr: 2, flip: true },
      { el: mk('fl--place', '<span class="fl__plate">Национальная библиотека</span>'), at: () => [lc[0], libTop, lc[1]], ax: 0.5, ay: 1, dy: -24, pr: 3, clamp: true },
      { el: mk('fl--place', '<span class="fl__plate">ТРЦ Dana Mall</span>'), at: () => [D.mall.c[0], D.mall.h, D.mall.c[1]], ax: 0.5, ay: 0.5, pr: 4, clamp: true, skip: !D.mall },
      { el: mk('fl--park', '<span class="fl__plate">Парк Писателей</span>'), at: () => [lc[0] + 20, 0, lc[1] + 118], ax: 0.5, ay: 0.5, pr: 5, clamp: true },
    ].filter((l) => !l.skip);
    let sizes = [];
    const measure = () => { sizes = LB.map((l) => [l.el.offsetWidth, l.el.offsetHeight]); };
    const keepOut = []; // прямоугольники, куда подписи не ставим (подпись остановки, панель)
    const rectIn = (el) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left, r.top - s.top, r.right - s.left, r.bottom - s.top]; };
    // подпись остановки — по раскладке, без сдвига анимации появления (иначе место мерится на 16 px ниже)
    const stepRect = (li) => { const ol = li.offsetParent === stage ? null : li.offsetParent; const x = (ol ? ol.offsetLeft : 0) + li.offsetLeft, y = (ol ? ol.offsetTop : 0) + li.offsetTop; return [x, y, x + li.offsetWidth, y + li.offsetHeight]; };
    function placeLabels() {
      const taken = [...keepOut];
      LB.forEach((l, i) => {
        const [w, h] = sizes[i];
        let p = toScreen(...l.at());
        let x = p[0] - w * l.ax + (l.ox || 0), y = p[1] - h * l.ay + (l.dy || 0) + (l.oy || 0);
        // узкий экран: метро стоит прямо над аркой — плашка «АРКА 123» справа от точки под аркой, а не над столбом
        if (l.pin && narrow()) { p = toScreen(A[0], 0, A[1]); x = p[0] + 22; y = p[1] - h / 2; if (x + w > stageW - 20) x = p[0] - 22 - w; }
        // верх столба света над краем сцены (остановка у дома, конечный обзор) — плашка опускается по столбу, пока не поместится.
        // Место ищется непрерывно (делением пополам по высоте столба): на краю 24 px плашка едет по столбу вместе с камерой.
        // Раньше — шагами по 10 м: при «дыхании» камеры и прокрутке плашка прыгала на 50 px между верхом столба и ступенькой ниже
        // (правка владельца 2026-10-18: «плашка АРКА 123 при скролле очень сильно дрожит/скачет», L140)
        else if (l.pin && y < 24) {
          const fits = (k) => toScreen(A[0], k, A[1])[1] - h - 10 >= 24;
          let lo = archTop + 30, hi = beamTop;
          if (fits(lo)) {
            for (let it = 0; it < 20; it++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
            p = toScreen(A[0], lo, A[1]); x = p[0] - w / 2; y = p[1] - h - 10;
          }
        }
        // метро у правого края: плашка слева от значка «М» (иначе подпись не помещается и пропадает)
        let flip = false, stack = false, bw = w, bh = h;
        if (l.flip && x + w > stageW - 20) { flip = true; x = p[0] + 16 - w; }
        // телефон 320–389: плашка метро не помещается ни справа, ни слева от «М» — «М» на точке, плашка под ним по центру
        if (l.flip && flip && x < 24) { flip = false; stack = true; bw = w - 40; bh = h + 40; x = Math.min(stageW - 24 - bw, Math.max(24, p[0] - bw / 2)); y = p[1] - 16; }
        // подпись у края узкого экрана сдвигается в кадр (если сама точка в кадре), а не пропадает
        if (l.clamp && p[0] > 8 && p[0] < stageW - 8) x = Math.min(stageW - 24 - w, Math.max(24, x));
        const box = [x - 6, y - 6, x + bw + 6, y + bh + 6];
        const m = 16;
        let ok = p[2] < 1 && (!l.when || l.when()) && box[0] > m && box[2] < stageW - m && box[1] > m && box[3] < stageH - m;
        if (ok && !l.free && taken.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) ok = false;
        if (ok) { if (!l.free) taken.push(box); l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }
        l.el.classList.toggle('is-off', !ok);
        if (l.flip) { l.el.classList.toggle('is-flip', flip); l.el.classList.toggle('is-stack', stack); }
      });
    }

    // ---------- Камера и кадр ----------
    const target = new T.Vector3();
    const orbit = { az: 0, el: 0, taz: 0, tel: 0 };
    let breathT = 0;
    function applyCamera() {
      const n = narrow();
      const asp = stageW / stageH;
      // на узком и высоком кадре камера отходит, чтобы место помещалось по ширине
      const far = Math.min(1.7, Math.max(1, Math.pow(1.78 / asp, 0.8)));
      const az = T.MathUtils.degToRad(cam.az + orbit.az), el = T.MathUtils.degToRad(Math.min(80, Math.max(8, cam.el + orbit.el)));
      const d = cam.d * far;
      target.set(cam.tx, cam.ty, cam.tz);
      camera.position.set(target.x + d * Math.sin(az) * Math.cos(el), target.y + d * Math.sin(el), target.z + d * Math.cos(az) * Math.cos(el));
      if (!reduced) camera.position.y += Math.sin(breathT * 0.35) * camera.position.y * 0.01; // «дыхание» на остановке
      camera.aspect = asp;
      camera.near = Math.max(5, d * 0.02); camera.far = d * 4 + 2500;
      const sx = n ? 0 : (cam.sx < 0 && !section.classList.contains('is-panel-in') ? 0 : cam.sx), sy = n ? 0.17 : cam.sy;
      camera.setViewOffset(stageW, stageH, -sx * stageW, sy * stageH, stageW, stageH);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      scene.fog.near = d * 0.95; scene.fog.far = d * 2.5;
    }

    // ---------- Прокрутка, остановки, подписи остановок ----------
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
    const fixedP = qs.has('flyp') ? clamp01(+qs.get('flyp')) : null;
    const readScroll = () => {
      const r = root.getBoundingClientRect();
      return { p: fixedP != null ? fixedP : clamp01(-r.top / Math.max(1, r.height - stage.offsetHeight)) };
    };
    let shown = reduced ? 1 : readScroll().p, active = -1, isFinal = false;
    function setStep(i) {
      if (i === active) return; active = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      requestAnimationFrame(() => { keepOut.length = 0; const s = steps[i]; if (s) keepOut.push(stepRect(s)); if (isFinal && section.classList.contains('is-panel-in')) keepOut.push(rectIn(panel)); });
    }
    function setFinal(on) {
      if (on === isFinal) return; isFinal = on;
      section.classList.toggle('is-final', on);
      if (!on) { orbit.taz = 0; orbit.tel = 0; backBtn.hidden = true; }
      keepOut.length = 0; const s = steps[active]; if (s) keepOut.push(stepRect(s)); if (on && section.classList.contains('is-panel-in')) setTimeout(() => keepOut.push(rectIn(panel)), 950);
    }

    // ---------- «Карта ваша»: поворот мышью и пальцем в конце полёта ----------
    let drag = null;
    view.addEventListener('pointerdown', (e) => { if (!isFinal || reduced) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; view.setPointerCapture(e.pointerId); section.classList.add('is-dragging'); });
    view.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      orbit.taz -= dx * 0.22; orbit.tel = Math.min(30, Math.max(-24, orbit.tel + dy * 0.12));
      if (Math.abs(orbit.taz) > 3 || Math.abs(orbit.tel) > 3) backBtn.hidden = false;
    });
    const endDrag = () => { drag = null; section.classList.remove('is-dragging'); };
    view.addEventListener('pointerup', endDrag); view.addEventListener('pointercancel', endDrag);
    backBtn.addEventListener('click', () => { orbit.taz = 0; orbit.tel = 0; backBtn.hidden = true; });

    // ---------- Размер ----------
    function fit() {
      stageW = view.clientWidth || 1; stageH = view.clientHeight || 1;
      renderer.setPixelRatio(Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1));
      renderer.setSize(stageW, stageH, false);
      measure();
      keepOut.length = 0; const s = steps[active]; if (s) keepOut.push(stepRect(s)); if (isFinal && section.classList.contains('is-panel-in')) keepOut.push(rectIn(panel));
    }
    new ResizeObserver(() => { fit(); if (reduced) frame(0); }).observe(view);

    // ---------- Кадр ----------
    let last = performance.now(), running = false, t0 = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, ((now || performance.now()) - last) / 1000); last = now || performance.now();
      breathT = ((now || performance.now()) - t0) / 1000;
      const { p } = readScroll();
      shown = reduced ? 1 : fixedP != null ? p : damp(shown, p, 2.1, dt);
      const st = camAt(shown);
      setFinal(st.final);
      setStep(reduced ? STOPS.length - 1 : st.stop);
      orbit.az = damp(orbit.az, orbit.taz, 5, dt); orbit.el = damp(orbit.el, orbit.tel, 5, dt);
      uRoute.uDraw.value = (cam.walkOn && cam.walk < 0.995 ? Math.max(cam.walk, walkShown) : cam.walk) * RLEN + (cam.walk >= 0.995 ? 20 : 0);   // путь — до зайчика (у метро он ждёт в стороне от знака)
      uRoute.uTime.value = reduced ? 0 : breathT;
      applyCamera();
      renderer.render(scene, camera);
      placeLabels();
    }
    const loop = (now) => { if (!running) return; frame(now); requestAnimationFrame(loop); };
    fit();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      measure();
      if (reduced) { frame(); section.classList.add('is-ready'); return; }
      new IntersectionObserver((es) => { const on = es.some((e) => e.isIntersecting); if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); } else if (!on) running = false; }, { rootMargin: '50% 0px' }).observe(root);
      frame(); section.classList.add('is-ready');
    });
    window.__flyView = { STOPS, camAt, labels: () => LB.map((l, i) => ({ t: l.el.textContent.trim(), p: toScreen(...l.at()).map((v) => Math.round(v * 100) / 100), size: sizes[i], off: l.el.classList.contains('is-off') })), stage: () => [stageW, stageH], info: () => ({ trees: treesAt.length, routeLen: RLEN, archTop, active, isFinal, shown, scaleY: [...new Set(scene.children.map((o) => o.scale.y))] }) };
  }
})();
