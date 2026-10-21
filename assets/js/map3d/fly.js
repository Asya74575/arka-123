/* 3D-карта района — блок «Как добраться» (ТЗ 5.9): полёт по маршруту (правка владельца 2026-10-15: «данную карту ранее
   анимировали, надо вставить эту карту вместо этой картинки»). Перенос варианта 2 из drafts/map3d (fly.js, 2026-10-14) —
   приёмы референса владельца Lumara v3 (REFERENCES.md «Lumara v3») на светлой карте макета:
   1) блок закреплён, камера летит за прокруткой по остановкам: весь район → метро → путь → у дома зала («Вы пришли») —
      на ней полёт кончается (правка владельца 2026-10-19, вечер: «уменьшить проигрывание 3д-карты… на данном моменте
      завершить»; остановки «библиотека напротив» и «весь район» сняты, закрепление 5 экранов вместо 7,2);
      у остановки замедляется, но не стоит (в каждом отрезке 0,3 ровного хода + 0,7 мягкого), слева внизу подпись остановки;
   2) путь от метро до входа в дом виден целиком с начала полёта — тёмная линия с белой каймой (правка владельца 2026-10-20:
      «сделай путь зайца от метро до здания АРКА 123 в таком виде», скрин последней остановки; раньше путь прорисовывался
      за зайчиком); за домами его не видно (правка владельца 2026-10-21: «дорога просвечивается сквозь стены» — бледный слой
      пути поверх домов снят); по нему бегут пакеты света, зайчик выходит из метро и идёт по уже нарисованному пути, дома
      закрывают его попиксельно (второй холст, см. «Зайчик за домами»); путь и ход зайчика кончаются там, где зайчик целиком
      виден с последней остановки (см. «Путь от метро»);
   3) над аркой — столб света с плашкой «АРКА 123»;
   4) «Время в пути» стоит справа в сцене весь полёт (≥1280; уже — под сценой; правка владельца 2026-10-19, вечер: «пусть
      данная информация постоянно будет зафиксирована справа»; раньше выезжала в конце): камера ставит место остановки
      в свободную часть кадра слева (sxP), подписи карты под панель не заходят; в конце полёта карту можно покрутить
      мышью или пальцем; ракурс возвращается, когда прокрутка уводит из конца полёта (кнопку «Вернуться к маршруту»
      владелец сняла 2026-10-21, вечер).
   Дома и деревья стоят сразу в полную высоту: волну роста домов от арки и полосу по земле владелец убрала
   (2026-10-15: «убери в карте волну смену формата объектов на карте»; в черновике drafts/map3d она осталась).
   Данные — map3d-data.js (OpenStreetMap, tools/map3d/build.mjs), движок — vendor/three/three-map.js (three.js r186, MIT);
   скрипты грузятся, когда до блока остаётся два экрана. Земля векторная: на близких остановках края чёткие.
   Высота блока (закрепление на 5 экранов) ставится сразу при загрузке страницы, а не когда сцена готова, — чтобы
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

  // Панель «Время в пути»: на широком экране — внутри сцены справа (весь полёт), уже — под сценой
  const placePanel = () => { const inStage = wide.matches && !reduced; (inStage ? stage : after).appendChild(panel); section.classList.toggle('is-panel-in', inStage); };
  placePanel();
  wide.addEventListener('change', () => { placePanel(); pinStage(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });

  // Закрепление сцены на время полёта — position: fixed, а не только sticky (правка владельца 2026-10-20: «при скролле правая
  // часть контента дёргается/дребезжит»). При масштабе Windows 125 % пиксель прокрутки — 1,25 пикселя экрана, и сцену со sticky
  // браузер рисует со сдвигом в доли пикселя, который меняется с каждым пикселем прокрутки (цикл 4 px): текст панели «Время
  // в пути» и подписи остановки мерцают и прыгают на пиксель экрана, хотя getBoundingClientRect не меняется — дрожь в отрисовке.
  // Слой с position: fixed от прокрутки не зависит и стоит попиксельно. Края закрепления по-прежнему ведёт sticky (вход и выход
  // без скачка); fixed включается только внутри, где место у них одно: верх под шапкой, те же левый край и ширина. Переключение —
  // в том же кадре, что прокрутка (событие Lenis), и по scroll / resize. Только мышь: на сенсорном экране прокрутку ведёт сам
  // браузер (у краёв закрепления fixed отставал бы на кадр), а пиксель там целый — sticky не мерцает.
  const pinOk = !reduced && !coarse;
  let pinned = false, lenisOn = false;
  function pinStage() {
    if (!lenisOn && window.ARKA && window.ARKA.lenis) { lenisOn = true; window.ARKA.lenis.on('scroll', pinStage); }
    let on = false;
    if (pinOk && section.classList.contains('is-live')) {
      const r = root.getBoundingClientRect(), top = parseFloat(getComputedStyle(stage).top) || 0;
      on = r.top < top && r.bottom > top + stage.offsetHeight;
      if (on) { section.style.setProperty('--fly-x', r.left + 'px'); section.style.setProperty('--fly-w', r.width + 'px'); }
    }
    if (on !== pinned) { pinned = on; section.classList.toggle('is-pinned', on); }
  }
  if (pinOk) {
    addEventListener('scroll', pinStage, { passive: true });
    addEventListener('resize', pinStage);
    document.addEventListener('DOMContentLoaded', pinStage);   // Lenis создаёт motion.js — он подключён после fly.js
    pinStage();
  }
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
  const near = new IntersectionObserver((es, io) => {
    if (!es.some((e) => e.isIntersecting) || started) return;
    // страница едет к разделу по пункту меню — сцена не собирается на лету (motion.js, ARKA.afterGlide): после остановки — снова по близости
    const A = window.ARKA;
    if (A && A.gliding && A.gliding()) { io.disconnect(); A.afterGlide(() => { if (!started) io.observe(root); }, root); return; }
    started = true; io.disconnect();
    Promise.all([load(VENDOR.href, () => window.THREE_MAP), load(new URL('map3d-data.js' + DATA_V, BASE).href, () => window.ARKA_MAP3D)]).then(() => {
      T = window.THREE_MAP; D = window.ARKA_MAP3D;
      if (!T || !D) fail();
      else if (A && A.afterGlide) A.afterGlide(build, root);   // пока грузились скрипты, страница поехала к разделу — сборка после остановки
      else build();
    }).catch(fail);
  }, { rootMargin: '200% 0px' });
  near.observe(root);
  // движок не загрузился — кадр сцены картинкой и списки, как без JS
  function fail() { section.classList.remove('is-live', 'is-panel-in'); after.appendChild(panel); pinStage(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }

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
    // лента по ломаной: круглые стыки + прямоугольники отрезков; along — расстояние от начала (для пути). Стыки — первыми, отрезки
    // ложатся поверх: от круга стыка видна только внешняя долька на повороте. Расстояние в точках круга — проекция на направление
    // пути в стыке, а не одно число на весь круг: пакет света проходит поворот полосой. Раньше круг стыка лежал поверх отрезков
    // и красился пакетом целиком — на поворотах вспыхивали голубые и серые овалы шире линии (правка владельца 2026-10-21:
    // «на маршруте есть какие-то круги»)
    function ribbon(f, w, y, out, along) {
      const hw = w / 2, seg = 10;
      const P = []; for (let i = 0; i < f.length; i += 2) P.push([f[i], f[i + 1]]);
      const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      P.forEach(([px, pz], k) => {
        const pa = P[Math.max(0, k - 1)], pb = P[Math.min(P.length - 1, k + 1)], tl = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1, tx = (pb[0] - pa[0]) / tl, tz = (pb[1] - pa[1]) / tl;
        for (let j = 0; j < seg; j++) {
          const a1 = j / seg * Math.PI * 2, a2 = (j + 1) / seg * Math.PI * 2, c1 = Math.cos(a1) * hw, s1 = Math.sin(a1) * hw, c2 = Math.cos(a2) * hw, s2 = Math.sin(a2) * hw;
          out.push(px, y, pz, px + c2, y, pz + s2, px + c1, y, pz + s1);
          if (along) along.push(acc[k], acc[k] + c2 * tx + s2 * tz, acc[k] + c1 * tx + s1 * tz);
        }
      });
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
        out.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
        if (along) { const a = acc[i], b = acc[i + 1]; along.push(a, b, b, a, b, a); }
      }
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

    // ---------- Путь от метро: лента целиком (uDraw — дальше конца пути) и бегущие пакеты света ----------
    const accOf = (P) => { const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return acc; };
    const lineAt = (P, acc, s, out = [0, 0]) => { s = Math.min(acc[acc.length - 1], Math.max(0, s)); let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); out[0] = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t; out[1] = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; return out; };
    const RP0 = []; for (let i = 0; i < D.route.length; i += 2) RP0.push([D.route[i], D.route[i + 1]]);
    const RACC0 = accOf(RP0), END = RP0[RP0.length - 1];   // конец пути в данных — у входа в дом зала (tools/map3d/build.mjs)
    // последняя остановка камеры (STOPS[3]) — здесь: по ней считается, где кончаются путь и ход зайчика
    const STOP_END = { t: [(A[0] + END[0]) / 2, 18, (A[1] + END[1]) / 2], az: -35, el: 17, d: 340, sx: 0.12, sy: 0.06, sxP: -0.18, syP: 0.06 };
    // Путь и ход зайчика кончаются там, где зайчик целиком виден с последней остановки (правка владельца 2026-10-21: «когда
    // маскот приходит на место, то он почему-то отходит в сторону»). Вход в дом из данных с этой остановки закрыт углом башни:
    // зайчик доходил до угла, уходил за башню, а «привет» вставал на последнюю видимую точку пути — на 40–45 px назад, и эта
    // точка ещё пересчитывалась с каждым сдвигом камеры. Теперь место считается один раз: от конца пути назад до первой точки,
    // где лучи с камеры последней остановки (на любом экране: на узком и высоком камера отходит до 1,7 расстояния) к подошвам,
    // середине и макушке зайчика и к его бокам не задевают домов. Там же кончается нарисованный путь: на какой бы ракурс
    // ни повернули карту в конце, зайчик стоит на конце пути.
    const RP = (() => {
      const occ = scene.children.filter((o) => o.isMesh && o.castShadow && !o.isInstancedMesh), ray = new T.Raycaster(), q = new T.Vector3();
      const az = T.MathUtils.degToRad(STOP_END.az), el = T.MathUtils.degToRad(STOP_END.el), rx = Math.cos(az), rz = -Math.sin(az);   // «вправо на экране» по земле
      const cams = [1, 1.7].map((k) => [new T.Vector3(STOP_END.t[0] + STOP_END.d * k * Math.sin(az) * Math.cos(el), STOP_END.t[1] + STOP_END.d * k * Math.sin(el), STOP_END.t[2] + STOP_END.d * k * Math.cos(az) * Math.cos(el)), k]);
      const clear = (c, x, y, z) => { q.set(x, y, z).sub(c); const l = q.length(); ray.set(c, q.divideScalar(l)); ray.far = l; return ray.intersectObjects(occ, false).length === 0; };
      // зайчик на экране — ≈ 15 × 9 м при камере на расстоянии остановки; камера дальше — он крупнее в метрах (на экране тот же)
      const whole = (s) => { const [x, z] = lineAt(RP0, RACC0, s); return cams.every(([c, k]) => [-4.5 * k, 0, 4.5 * k].every((dx) => [1.5, 8 * k, 15 * k].every((h) => clear(c, x + rx * dx, h, z + rz * dx)))); };
      const len = RACC0[RACC0.length - 1];
      let ok = len; while (ok > len - 80 && !whole(ok)) ok -= 2;
      if (!whole(ok)) return RP0;
      if (ok < len) { let bad = ok + 2; for (let it = 0; it < 4; it++) { const m = (ok + bad) / 2; if (whole(m)) ok = m; else bad = m; } }
      const out = RP0.filter((_, i) => RACC0[i] < ok); out.push(lineAt(RP0, RACC0, ok));
      return out;
    })();
    const RACC = accOf(RP), RLEN = RACC[RACC.length - 1];
    const routeAt = (w, out) => lineAt(RP, RACC, w * RLEN, out);
    // путь виден целиком с начала полёта (правка владельца 2026-10-20): прорисовка — на 20 м дальше конца, пакеты света бегут до конца
    const uRoute = { uDraw: { value: RLEN + 20 }, uTime: { value: 0 } };
    const routeGeo = (w, y) => { const pos = [], al = []; ribbon(RP.flat(), w, y, pos, al); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aAlong', new T.Float32BufferAttribute(al, 1)); return g; };
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
    // кайма и линия — с проверкой глубины: дома закрывают путь. Бледного слоя пути поверх домов больше нет (правка владельца
    // 2026-10-21: «дорога просвечивается сквозь стены»; на стыках его прозрачность складывалась — тёмные круги по линии)
    const rCase = routeGeo(10, 0.6), rLine = routeGeo(4.5, 0.8);
    [[rCase, C.routeCase, true, 1, 10, false], [rLine, C.route, true, 1, 11, true]].forEach(([geo, color, test, op, order, pk]) => { const m = new T.Mesh(geo, routeMat(color, test, op, pk)); m.renderOrder = order; m.frustumCulled = false; scene.add(m); });

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
    // d — расстояние; azN, dN — то же для узкого экрана (уже 1024 px); sx/sy — сдвиг картинки (доля кадра) вправо / вверх, чтобы место не уходило под подпись;
    // sxP, syP, dP — то же, когда справа в сцене стоит панель «Время в пути» (≥1280): место — в свободной части кадра слева
    const W2 = lineAt(RP0, RACC0, 0.55 * RACC0[RACC0.length - 1]);   // по пути из данных — кадры остановок прежние
    const STOPS = [
      { t: [-110, 0, -150], az: -30, azN: 0, el: 46, d: 1550, sx: 0.12, sy: 0.04, sxP: -0.16, syP: 0.04, dP: 1550 }, // 0 весь район (azN — узкий экран: путь сверху вниз)
      { t: [RP[0][0], 0, RP[0][1]], az: -22, el: 40, d: 520, sx: 0.14, sy: 0.06, sxP: -0.16, syP: 0.06 }, // 1 метро «Восток»
      { t: [W2[0], 0, W2[1]], az: 6, el: 42, d: 560, sx: 0.14, sy: 0.06, sxP: -0.16, syP: 0.06 }, // 2 середина пути
      STOP_END, // 3 у дома зала: между аркой и входом в дом (правка 2026-10-15); на ней полёт кончается
    ];
    // азимуты без скачка через 360° (свой ряд для узкого экрана)
    const unwrap = (list) => { for (let i = 1; i < list.length; i++) { while (list[i] - list[i - 1] > 180) list[i] -= 360; while (list[i] - list[i - 1] < -180) list[i] += 360; } return list; };
    const AZ_W = unwrap(STOPS.map((s) => s.az)), AZ_N = unwrap(STOPS.map((s) => (s.azN != null ? s.azN : s.az)));
    // последний отрезок кончается на SPAN хода; остаток (0,1) — камера стоит у дома, потом блок отпускается
    const LEGS = [1, 1.2, 1.2], SUM = LEGS.reduce((a, b) => a + b, 0), SPAN = 0.9;
    const WALK_MID = 0.55, OUT_E = 0.85;
    function flight(p) {
      let q = Math.min(1, Math.max(0, p / SPAN)) * SUM, leg = 0;
      while (leg < LEGS.length - 1 && q > LEGS[leg]) { q -= LEGS[leg]; leg++; }
      const f = Math.min(1, q / LEGS[leg]), s = f * f * (3 - 2 * f);
      return { leg, f, e: 0.3 * f + 0.7 * s };
    }
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    const KEYS = (s, az, d) => [s.t[0], s.t[1], s.t[2], az, s.el, Math.log(d), s.sx, s.sy];
    const KS_W = STOPS.map((s, i) => KEYS(s, AZ_W[i], s.d)), KS_N = STOPS.map((s, i) => KEYS(s, AZ_N[i], s.dN || s.d));
    const KS_P = STOPS.map((s, i) => KEYS({ ...s, sx: s.sxP != null ? s.sxP : s.sx, sy: s.syP != null ? s.syP : s.sy }, AZ_W[i], s.dP || s.d));
    const narrow = () => narrowMq.matches;
    const panelIn = () => section.classList.contains('is-panel-in');
    const cam = { tx: 0, ty: 0, tz: 0, az: 0, el: 0, d: 0, sx: 0, sy: 0, walk: 0, walkOn: false };
    function camAt(p) {
      const { leg, f, e } = flight(p);
      const KS = narrow() ? KS_N : panelIn() ? KS_P : KS_W;
      const i0 = Math.max(0, leg - 1), i1 = leg, i2 = leg + 1, i3 = Math.min(KS.length - 1, leg + 2);
      const v = KS[i1].map((_, k) => cr(KS[i0][k], KS[i1][k], KS[i2][k], KS[i3][k], e));
      [cam.tx, cam.ty, cam.tz, cam.az, cam.el] = v; cam.d = Math.exp(v[5]); cam.sx = v[6]; cam.sy = v[7];
      // отрезки 1 и 2 — пешком: камера смотрит на точку пути
      let walk = leg < 1 ? 0 : 1;
      if (leg === 1) { walk = WALK_MID * e; const r = routeAt(walk); cam.tx = r[0]; cam.ty = 0; cam.tz = r[1]; }
      // к концу пути зайчик замедляется до остановки (правка владельца 2026-10-21, вечер: «маскот доходит до конечной точки
      // и подпрыгивает… когда возвращается, вначале отскакивает, потом идёт»): ход был min(1, e/0,75) — у конца пути зайчик
      // вставал с полного хода как вкопанный, а назад срывался сразу на полном. Теперь u + u² − u³: в начале отрезка скорость
      // прежняя, у конца — ноль; назад он трогается с места плавно
      if (leg === 2) { const u = Math.min(1, e / 0.75); walk = WALK_MID + (1 - WALK_MID) * (u + u * u - u * u * u); const r = routeAt(walk), k = e * e * (3 - 2 * e); cam.tx = r[0] + (STOPS[3].t[0] - r[0]) * k; cam.ty = STOPS[3].t[1] * k; cam.tz = r[1] + (STOPS[3].t[2] - r[1]) * k; }
      // зайчик выходит из метро, когда камера почти долетела до остановки «Метро» (OUT_E хода отрезка 0), и сразу идёт
      // с отрезком 1 (правка владельца 2026-10-20: раньше появлялся с половины отрезка 0 и долго ждал, пока камера летит)
      cam.walk = walk; cam.walkOn = leg >= 1 || e > OUT_E;
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
    // на общем плане он не в полбашни. Дома перед ним закрывают его попиксельно (второй холст, «Зайчик за домами»; правка
    // владельца 2026-10-21 — раньше за домом он был полупрозрачным поверх стены); дойдя до конца пути, он на том же месте
    // сменяет позу на «привет» — гаснет и проявляется без сдвига (раньше «привет» вставал на последнюю видимую точку пути).
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
    // Зайчик выходит из метро (правка владельца 2026-10-20: «заяц не выходит из метро, а появляется немного дальше от точки
    // Метро»; «маскот при скролле задерживается на месте и дёргается… в одном месте идёт пару шагов назад»). Раньше он ждал
    // на первой точке пути, где его рамка не задевала знак с плашкой: этот сдвиг вперёд (до 160 м) пересчитывался каждый кадр
    // по рамке знака на экране — пока камера летела, зайчик стоял впереди, дёргался шагами по 2 м и отступал назад, а когда
    // ход догонял сдвиг, ещё ≈ 1 с стоял на месте. Теперь место — только ход по пути (cam.walk): у знака «М» он проявляется
    // и поднимается снизу (0,8 с, CSS: .fl--walker.is-off), рисуется поверх знака, плашка встаёт по другую сторону от пути
    // (metroLeft); при прокрутке вперёд ход только растёт.
    // Шаг и поворот — только когда зайчик правда идёт по пути (правка владельца 2026-10-19, L166): пока камера летит, он стоит
    // без подскока и не разворачивается; подскок и поворот — по ходу самого пути, лицом туда, куда идёт.
    // Подскок — по скорости хода (правка владельца 2026-10-21, вечер: «когда маскот останавливается, то он какое-то время
    // скачет»): раньше он подпрыгивал, пока ход менялся хоть на 1e-5 за кадр, а ход за прокруткой дотягивается плавно ещё 2–3 с —
    // зайчик полз и скакал на месте. Теперь высота подскока идёт за сглаженной скоростью по пути: медленнее HOP_V0 м/с — стоит
    // на земле, с HOP_V1 — полный подскок 3 px; подскок начинается с земли, а когда зайчик встаёт — плавно гаснет.
    const HOP_V0 = 12, HOP_V1 = 30;
    let walkPrev = -1, walkT = -1, walkFace = 1, walkShown = 0, walkFaced = false, hopV = 0, hopA = 0, hopPh = 0;
    function walkerAt() {
      const w = cam.walk, r = routeAt(w), s = bunnyScale(walkerEl, r[0], r[1]);
      walkShown = w;
      const step = walkPrev < 0 ? 0 : w - walkPrev, going = Math.abs(step) > 1e-5;
      const dt = walkT < 0 ? 0 : Math.min(0.05, Math.max(0, breathT - walkT));
      walkPrev = w; walkT = breathT;
      if (going || !walkFaced) {
        const n = routeAt(Math.min(1, w + 0.01));
        const a = toScreen(r[0], 1, r[1]), b = toScreen(n[0], 1, n[1]), dx = (b[0] - a[0]) * (step < 0 ? -1 : 1), dy = b[1] - a[1];
        if (Math.abs(dx) > 0.5 && Math.abs(dx) > Math.abs(dy) * 0.25) { walkFace = dx < 0 ? -1 : 1; walkFaced = true; }   // почти вертикальный ход — прежний поворот
      }
      if (dt > 0) {
        hopV = damp(hopV, Math.abs(step) * RLEN / dt, 12, dt);
        if (hopA < 0.02) hopPh = 0;   // стоял — следующий подскок с земли
        // дошёл до конца пути (сменяет позу на «привет») или ещё не вышел из метро — приземляется сразу, за 0,1 с
        const land = w >= 0.9999 || !cam.walkOn;
        hopA = damp(hopA, reduced || land ? 0 : 3 * clamp01((hopV - HOP_V0) / (HOP_V1 - HOP_V0)), land ? 30 : 10, dt);
        hopPh += dt * 9;
      }
      const hop = -Math.abs(Math.sin(hopPh)) * hopA;
      hopEl.style.transform = `translateY(${hop.toFixed(1)}px) scale(${s.toFixed(3)})`;
      faceEl.style.transform = `scaleX(${walkFace})`;
      if (!over) walkerEl.classList.toggle('is-behind', !seen(r[0], r[1]));   // второго холста нет — прежний вид: за домом полупрозрачный
      walkerEl.classList.toggle('is-end', w > 0.9);   // у конца пути гаснет на месте, не уходя вниз (CSS)
      return [r[0], 1, r[1]];
    }
    // конец пути — там же, где кончился ход шагающего (routeAt(1)): «привет» проявляется на его месте
    function endAt() {
      const r = routeAt(1);
      endHopEl.style.transform = `scale(${bunnyScale(endEl, r[0], r[1]).toFixed(3)})`;
      return [r[0], 1, r[1]];
    }
    // Знак метро — как на входах минского метро: красная «М» в круге (вместо тёмного квадрата с буквой; правка владельца
    // 2026-10-18: «замени на более привычный значок»). Круг — знак метрополитена, как значки мессенджеров (L54), не скругление L22
    const METRO = '<svg class="fl__m" viewBox="-16 -16 32 32" width="32" height="32" role="img" aria-label="Метро"><circle r="15" fill="#fff" stroke="#E31E25" stroke-width="2"/><path d="M-11.2-4.5H-3L0-1.4 2.9-4.5H11.2V4.5H3.1L0 7.7-3.2 4.5H-11.2Z" fill="#E31E25"/></svg>';
    const metroEl = mk('fl--metro', METRO + '<span class="fl__plate">Метро «Восток»</span>');
    // плашка «Метро «Восток»» — по другую сторону знака от пути (правка владельца 2026-10-20: зайчик выходит из метро и идёт
    // по пути, плашка его не закрывает): если первые 30 м пути в кадре остановки «Метро» уходят вправо — плашка слева, влево —
    // справа. Сторона считается один раз по азимуту камеры этой остановки (вправо на экране — вектор (cos az, −sin az)
    // на земле), а не каждый кадр: пока камера поворачивается, плашка не перескакивает; другая сторона — только у края кадра
    // или когда сторона занята подписью остановки
    const metroLeft = (() => { const az = T.MathUtils.degToRad(AZ_W[1]), q = routeAt(30 / RLEN); return (q[0] - RP[0][0]) * Math.cos(az) - (q[1] - RP[0][1]) * Math.sin(az) > 0; })();
    let metroAtL = metroLeft;   // где плашка сейчас (слева от знака)
    const LB = [
      { el: mk('fl--pin', '<span class="fl__plate">АРКА 123</span>'), at: () => [A[0], beamTop, A[1]], ax: 0.5, ay: 1, dy: -10, pr: 0, clamp: true, pin: true },
      { el: walkerEl, at: walkerAt, ax: 0.5, ay: 0.9577, pr: 1, free: true, bunny: true, when: () => cam.walkOn && cam.walk < 0.9999 },
      { el: endEl, at: endAt, ax: 0.5, ay: 0.9641, pr: 1, free: true, bunny: true, when: () => cam.walk >= 0.9999 },
      { el: metroEl, at: () => [RP[0][0], 0, RP[0][1]], ax: 0, ay: 0, ox: -16, oy: -16, pr: 2, flip: true },
      { el: mk('fl--place', '<span class="fl__plate">Национальная библиотека</span>'), at: () => [lc[0], libTop, lc[1]], ax: 0.5, ay: 1, dy: -24, pr: 3, clamp: true },
      { el: mk('fl--place', '<span class="fl__plate">ТРЦ Dana Mall</span>'), at: () => [D.mall.c[0], D.mall.h, D.mall.c[1]], ax: 0.5, ay: 0.5, pr: 4, clamp: true, skip: !D.mall },
      { el: mk('fl--park', '<span class="fl__plate">Парк Писателей</span>'), at: () => [lc[0] + 20, 0, lc[1] + 118], ax: 0.5, ay: 0.5, pr: 5, clamp: true },
    ].filter((l) => !l.skip);
    let sizes = [];
    // знак метро с плашкой меряется в строку (знак 32 + промежуток 8 + плашка), какой бы вид у него ни был в момент замера:
    // замер в виде «плашка под знаком» давал ширину одной плашки, сторона выбиралась неверно и знак уезжал с выхода из метро
    const measure = () => { sizes = LB.map((l) => { if (!l.flip) return [l.el.offsetWidth, l.el.offsetHeight]; const pl = l.el.querySelector('.fl__plate'); return [32 + 8 + pl.offsetWidth, Math.max(32, pl.offsetHeight)]; }); };
    const keepOut = []; // прямоугольники, куда подписи не ставим (подпись остановки, панель)
    const rectIn = (el) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left, r.top - s.top, r.right - s.left, r.bottom - s.top]; };
    // подпись остановки — по раскладке, без сдвига анимации появления (иначе место мерится на 16 px ниже)
    const stepRect = (li) => { const ol = li.offsetParent === stage ? null : li.offsetParent; const x = (ol ? ol.offsetLeft : 0) + li.offsetLeft, y = (ol ? ol.offsetTop : 0) + li.offsetTop; return [x, y, x + li.offsetWidth, y + li.offsetHeight]; };
    // правый край свободной части кадра: панель «Время в пути» стоит справа весь полёт (≥1280) — подписи у её края сдвигаются
    // и переворачиваются так же, как у края сцены, а не уходят под панель
    let panelX = 0;
    function placeLabels() {
      const taken = [...keepOut], RW = panelIn() && panelX > 0 ? panelX : stageW;
      LB.forEach((l, i) => {
        const [w, h] = sizes[i];
        l.pt = l.at();   // точка сцены подписи — для второго холста (зайчик за домами)
        let p = toScreen(...l.pt);
        let x = p[0] - w * l.ax + (l.ox || 0), y = p[1] - h * l.ay + (l.dy || 0) + (l.oy || 0);
        // узкий экран: метро стоит прямо над аркой — плашка «АРКА 123» справа от точки под аркой, а не над столбом
        if (l.pin && narrow()) { p = toScreen(A[0], 0, A[1]); x = p[0] + 22; y = p[1] - h / 2; if (x + w > RW - 20) x = p[0] - 22 - w; }
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
        // метро: плашка по другую сторону знака от пути (metroLeft, правка владельца 2026-10-20); там не помещается у края
        // или занято подписью остановки — с другой стороны (у правого края — слева от значка «М», иначе подпись пропадает)
        // Сторона держится, пока помещается: на свою сторону плашка возвращается, только когда там есть запас 24 px, — иначе
        // на телефоне, где знак ходит у середины кадра, плашка перескакивала бы туда-обратно на каждом пороге
        let flip = false, stack = false, bw = w, bh = h;
        if (l.flip) {
          const xl = p[0] + 16 - w, xr = x, pref = metroLeft ? xl : xr, cur = metroAtL ? xl : xr;
          const fits = (bx, m = 0) => bx >= 24 + m && bx + w <= RW - 20 - m;
          const free = (bx) => !taken.some((o) => bx - 6 < o[2] && bx + w + 6 > o[0] && y - 6 < o[3] && y + h + 6 > o[1]);
          const pick = fits(pref, 24) && free(pref) ? pref : fits(cur) && free(cur) ? cur : [xl, xr].find((bx) => fits(bx) && free(bx)) ?? [cur, xl, xr].find((bx) => fits(bx));
          // телефон 320–389: плашка метро не помещается ни справа, ни слева от «М» — «М» на точке, плашка под ним по центру
          if (pick == null) { stack = true; bw = w - 40; bh = h + 40; x = Math.min(RW - 24 - bw, Math.max(24, p[0] - bw / 2)); y = p[1] - 16; }
          else { x = pick; flip = pick === xl; metroAtL = flip; }
          // плашка под знаком прижата к краю кадра — знак «М» всё равно стоит на выходе из метро, откуда выходит зайчик
          const mdx = stack ? (p[0] - (x + bw / 2)).toFixed(1) + 'px' : '0px';
          if (mdx !== l.mdx) { l.mdx = mdx; l.el.style.setProperty('--m-dx', mdx); }
        }
        // подпись у края узкого экрана сдвигается в кадр (если сама точка в кадре), а не пропадает
        if (l.clamp && p[0] > 8 && p[0] < RW - 8) x = Math.min(RW - 24 - w, Math.max(24, x));
        const box = [x - 6, y - 6, x + bw + 6, y + bh + 6];
        const m = 16;
        let ok = p[2] < 1 && (!l.when || l.when()) && box[0] > m && box[2] < RW - m && box[1] > m && box[3] < stageH - m;
        if (ok && !l.free && taken.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) ok = false;
        if (ok && !l.free) taken.push(box);
        // гаснущий зайчик едет вместе со сценой (правка владельца 2026-10-21, вечер: «маскот доходит до конечной точки и
        // подпрыгивает»): раньше скрытая подпись стояла, где её застало, — шагающий гас на месте, а «привет» проявлялся на 8 px
        // ниже и уезжал с камерой ещё на 30 px; две позы расходились, и смена позы выглядела прыжком
        if (ok || (l.bunny && p[2] < 1)) l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        l.el.classList.toggle('is-off', !ok);
        if (l.flip) { l.el.classList.toggle('is-flip', flip); l.el.classList.toggle('is-stack', stack); }
      });
    }

    // ---------- Зайчик за домами: второй холст поверх зайчика дорисовывает дома, которые стоят перед ним ----------
    // Правка владельца 2026-10-21: «при прокрутке карты маскот просматривается сквозь стены». Зайчик — картинка поверх холста
    // карты (так он стоит поверх знака метро и плашек, L177), и дом закрыть его не мог: за домом он был полупрозрачным, у угла
    // дома стоял поверх стены. Теперь поверх него лежит второй прозрачный холст с той же камерой: в рамке зайчика он рисует
    // только дома, рёбра, библиотеку и деревья — и только их части ближе к камере, чем сам зайчик (плоскость отсечения:
    // вертикальная, через подошвы, повёрнута к камере, на 3 м ближе к ней — стена у него за спиной или сбоку фигуру не срезает),
    // попиксельно, теми же цветами, светом, тенями и дымкой, а поверх — ту же мягкую подложку, что у подписи остановки
    // (.fly__view::after; здесь её повторяет шейдер). Вне рамки зайчика холст прозрачный.
    // Плоскость отсечения, а не плоскость глубины в буфере: с ней (Windows, ANGLE D3D11) первый кадр с зайчиком стоял 1,3–1,6 с
    // в видеокарте — страница замирала ровно в момент выхода зайчика из метро.
    // Второго WebGL нет — прежний вид: за домом зайчик полупрозрачный.
    const overEl = document.createElement('canvas');
    overEl.className = 'fly__over'; overEl.setAttribute('aria-hidden', 'true'); labelsEl.appendChild(overEl);   // после зайчиков — поверх них
    let over = null, occlude = () => {};
    try { over = new T.WebGLRenderer({ canvas: overEl, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { overEl.remove(); }
    if (over) {
      const OCC = 1;   // слой сцены второго холста: дома, рёбра, библиотека, деревья и свет; подложка — только в нём
      over.outputColorSpace = renderer.outputColorSpace; over.toneMapping = renderer.toneMapping;
      over.shadowMap.enabled = true; over.shadowMap.autoUpdate = false; over.shadowMap.needsUpdate = true;
      over.setClearColor(0x000000, 0);
      // плоскость отсечения — у материалов домов; основной холст её не видит (localClippingEnabled только у второго)
      const clip = new T.Plane(new T.Vector3(0, 1, 0), 1e6);
      over.localClippingEnabled = true;
      scene.children.forEach((o) => { if (o.isLight || o.isLineSegments || (o.isMesh && o.castShadow)) { o.layers.enable(OCC); if (o.material) o.material.clippingPlanes = [clip]; } });
      // подложка .fly__view::after (map.css): #e1e3e9 с той же прозрачностью по ширине и высоте кадра (уже 1024 — снизу вверх, без
      // маски); ложится только на нарисованное: цвет × прозрачность холста, прозрачность холста прежняя (смешение 5 — Custom;
      // 206 — DstAlpha, 205 — OneMinusSrcAlpha, 200 — Zero, 201 — One)
      const uWash = { uSize: { value: new T.Vector2(1, 1) }, uMode: { value: 1 } };
      const washMat = new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false, blending: 5, blendSrc: 206, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201 });
      washMat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uWash);
        sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\ngl_Position = vec4(position.xy, 0.0, 1.0);');
        sh.fragmentShader = 'uniform vec2 uSize;\nuniform float uMode;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          vec2 f = gl_FragCoord.xy / uSize;   // y — от низа, как у градиента 0deg
          float ax = f.x < 0.24 ? mix(0.94, 0.7, f.x / 0.24) : mix(0.7, 0.0, clamp((f.x - 0.24) / 0.2, 0.0, 1.0));
          float ay = f.y < 0.3 ? mix(0.96, 0.8, f.y / 0.3) : mix(0.8, 0.0, clamp((f.y - 0.3) / 0.22, 0.0, 1.0));
          float a = uMode > 1.5 ? ay : uMode > 0.5 ? ax * (1.0 - clamp((f.y - 0.34) / 0.28, 0.0, 1.0)) : 0.0;
          gl_FragColor = vec4(vec3(225.0, 227.0, 233.0) / 255.0 * a, a);`);
      };
      const wash = new T.Mesh(new T.PlaneGeometry(2, 2), washMat);
      wash.renderOrder = 1e6; wash.frustumCulled = false; wash.layers.set(OCC); scene.add(wash);
      const bunnies = LB.filter((l) => l.bunny);
      let drawn = false;
      const draw = () => { const bg = scene.background; scene.background = null; camera.layers.set(OCC); over.render(scene, camera); camera.layers.set(0); scene.background = bg; };
      occlude = () => {
        // рамка видимых зайчиков в кадре сцены (на смене позы — и гаснущего), с запасом 2 px
        const s = view.getBoundingClientRect();
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, at = null;
        bunnies.forEach((l) => {
          if (!l.pt || (l.el.classList.contains('is-off') && !(+getComputedStyle(l.el).opacity > 0.01))) return;
          const r = l.el.querySelector('img').getBoundingClientRect();
          x0 = Math.min(x0, r.left - s.left); y0 = Math.min(y0, r.top - s.top); x1 = Math.max(x1, r.right - s.left); y1 = Math.max(y1, r.bottom - s.top);
          at = l.pt;
        });
        x0 = Math.max(0, Math.floor(x0 - 2)); y0 = Math.max(0, Math.floor(y0 - 2)); x1 = Math.min(stageW, Math.ceil(x1 + 2)); y1 = Math.min(stageH, Math.ceil(y1 + 2));
        if (!at || x1 <= x0 || y1 <= y0) { if (drawn) { over.setScissorTest(false); over.clear(); drawn = false; } return; }
        // плоскость: через подошвы, повёрнута к камере вокруг вертикали, на 3 м ближе к ней; рисуется то, что по сторону камеры
        const c = camera.position, nl = Math.hypot(c.x - at[0], c.z - at[2]) || 1, ux = (c.x - at[0]) / nl, uz = (c.z - at[2]) / nl;
        clip.normal.set(ux, 0, uz); clip.constant = -(ux * (at[0] + ux * 3) + uz * (at[2] + uz * 3));
        uWash.uMode.value = reduced ? 0 : narrow() ? 2 : 1;
        over.setScissorTest(true); over.setScissor(x0, stageH - y1, x1 - x0, y1 - y0);
        draw(); drawn = true;
      };
      over.fit = () => { over.setPixelRatio(renderer.getPixelRatio()); over.setSize(stageW, stageH, false); over.getDrawingBufferSize(uWash.uSize.value); };
      // Шейдеры и карту теней второго холста готовим заранее — сцена собирается за два экрана до блока, — а не в первом кадре
      // с зайчиком: шейдеры — параллельно, не останавливая страницу (compileAsync), затем пробный кадр в 1 px со всеми предметами
      const warm = () => {
        if (drawn) return;
        const cull = []; scene.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; cull.push(o); } });
        clip.normal.set(0, 1, 0); clip.constant = 1e6;   // ничего не отсекать
        over.setScissorTest(true); over.setScissor(0, 0, 1, 1); draw();
        cull.forEach((o) => { o.frustumCulled = true; }); over.setScissorTest(false); over.clear();
      };
      (over.compileAsync ? over.compileAsync(scene, camera) : Promise.resolve()).catch(() => {}).then(() => requestAnimationFrame(warm));
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
      requestAnimationFrame(() => { keepOut.length = 0; const s = steps[i]; if (s) keepOut.push(stepRect(s)); if (panelIn()) keepOut.push(rectIn(panel)); });
    }
    function setFinal(on) {
      if (on === isFinal) return; isFinal = on;
      section.classList.toggle('is-final', on);
      if (!on) { orbit.taz = 0; orbit.tel = 0; }
      keepOut.length = 0; const s = steps[active]; if (s) keepOut.push(stepRect(s)); if (panelIn()) keepOut.push(rectIn(panel));
    }

    // ---------- «Карта ваша»: поворот мышью и пальцем в конце полёта ----------
    let drag = null;
    view.addEventListener('pointerdown', (e) => { if (!isFinal || reduced) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; view.setPointerCapture(e.pointerId); section.classList.add('is-dragging'); });
    view.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      orbit.taz -= dx * 0.22; orbit.tel = Math.min(30, Math.max(-24, orbit.tel + dy * 0.12));
    });
    const endDrag = () => { drag = null; section.classList.remove('is-dragging'); };
    view.addEventListener('pointerup', endDrag); view.addEventListener('pointercancel', endDrag);

    // ---------- Размер ----------
    function fit() {
      stageW = view.clientWidth || 1; stageH = view.clientHeight || 1;
      renderer.setPixelRatio(Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1));
      renderer.setSize(stageW, stageH, false);
      if (over) over.fit();
      measure();
      keepOut.length = 0; const s = steps[active]; if (s) keepOut.push(stepRect(s)); if (panelIn()) keepOut.push(rectIn(panel));
      panelX = panelIn() ? panel.offsetLeft : 0;
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
      uRoute.uTime.value = reduced ? 0 : breathT;
      applyCamera();
      renderer.render(scene, camera);
      placeLabels();
      occlude();
    }
    const loop = (now) => { if (!running) return; frame(now); requestAnimationFrame(loop); };
    fit();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      measure();
      if (reduced) { frame(); section.classList.add('is-ready'); return; }
      new IntersectionObserver((es) => { const on = es.some((e) => e.isIntersecting); if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); } else if (!on) running = false; }, { rootMargin: '50% 0px' }).observe(root);
      frame(); section.classList.add('is-ready');
    });
    window.__flyView = { STOPS, camAt, labels: () => LB.map((l, i) => ({ t: l.el.textContent.trim(), p: toScreen(...l.at()).map((v) => Math.round(v * 100) / 100), size: sizes[i], off: l.el.classList.contains('is-off') })), stage: () => [stageW, stageH], info: () => ({ trees: treesAt.length, routeLen: RLEN, archTop, active, isFinal, shown, scaleY: [...new Set(scene.children.map((o) => o.scale.y))] }),
      // для проверок (tools/checks/pravki-2026-10-20-map.mjs): ход зайчика по пути, его подошвы и знак метро на экране, прорисовка пути
      walker: () => { const q = routeAt(walkShown), f = toScreen(q[0], 1, q[1]), m = toScreen(RP[0][0], 0, RP[0][1]); return { w: walkShown, walk: cam.walk, feet: [f[0], f[1]], metro: [m[0], m[1]], on: !walkerEl.classList.contains('is-off'), uDraw: uRoute.uDraw.value, vis: seen(q[0], q[1]) }; },
      route: (n) => Array.from({ length: n + 1 }, (_, k) => { const q = routeAt(k / n), s = toScreen(q[0], 0.7, q[1]); return [s[0], s[1], s[2], seen(q[0], q[1]) ? 1 : 0]; }),   // 4-е — точка не за домом
      setDraw: (v) => { uRoute.uDraw.value = v == null ? RLEN + 20 : v; },   // проверка прячет путь, чтобы найти его пиксели на кадре
      // для проверки tools/checks/pravki-2026-10-21-08.mjs: длина пути до конца хода и в данных; работает ли второй холст
      end: () => ({ len: RLEN, full: RACC0[RACC0.length - 1], over: !!over }),
      // круг стыка ленты на повороте 90°: разброс расстояния вдоль пути по его точкам (одно число — пакет красит круг целиком)
      joint: () => { const pos = [], al = []; ribbon([0, 0, 10, 0, 10, 10], 4, 0, pos, al); const k = al.slice(30, 60); return Math.max(...k) - Math.min(...k); } };
  }
})();
