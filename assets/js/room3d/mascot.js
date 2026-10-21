// 3D-модель зала (задание 3): маскот-гид. Вернулся по правке владельца 2026-10-19: «ранее в 3D-модели зала был маскот,
// надо его вернуть» (с 2026-10-12 модель была без него — L40). Прежняя механика (2026-10-11, DESIGN.md «Помещение в 3D»):
// рост в масштабе зала (plan.mascotH ≈ 1,3 м с ушами), всегда лицом к зрителю; к новой расстановке идёт в обход мебели
// (1,2–2 с, с покачиванием шага), у цели меняет позу; наведение мышью или касание — подмигивает на 1 с. Облачка с фразами
// нет: в пустом зале на модели и так подписи размеров.
// Позы — сжатые вырезки владельца «Материалы/Маскот вырезанный» с мягкой тенью под подошвами (tools/room3d/bunny.py,
// L98, L133): room-bunny-<поза>-320.webp. Световых пятен нет (L16). «Уменьшение движения» — сразу на месте.
// Правка владельца 2026-10-20: «при скролле/вращении маскот виден сквозь стены и столб и другие элементы» — третий раз
// про одно место (L158, L165). Прежде маскот был картинкой поверх холста, и закрыт он или нет, решала одна проверка лучом
// на всю фигуру: за мебелью — полупрозрачный, за стеной — спрятан. Фигура то просвечивала сквозь колонну и экран, то
// стояла поверх стены. Перестроено: маскот — часть самой 3D-сцены. Плоскость с картинкой позы стоит подошвами на полу,
// всегда повёрнута к камере вокруг вертикали и рисуется с проверкой глубины: стены (и опускающиеся, L165), колонна,
// мебель, экран, кухня и шкафы закрывают ровно ту часть фигуры, что за ними, попиксельно; полупрозрачности нет. Тень под
// подошвами (низ картинки ниже подошв) лежит на полу отдельной полосой перед ногами: пол её не срезает, а на экране она
// там же, где была у картинки. Наведение и касание — лучом по холсту: подмигивает, только если навели на видимую часть.
(function (w) {
  var R = w.Room3D, T = w.THREE, L = R.logic, P = R.plan;
  // ar — ширина / высота картинки, sole — доля высоты, где подошвы (печатает tools/room3d/bunny.py)
  var POSE = {
    hello: { ar: 0.5701, sole: 0.9641 }, come: { ar: 0.5764, sole: 0.9642 }, walk: { ar: 0.5161, sole: 0.9577 },
    eureka: { ar: 0.5348, sole: 0.9648 }, look: { ar: 0.4847, sole: 0.9675 }, front: { ar: 0.396, sole: 0.9727 },
    wink: { ar: 0.5171, sole: 0.9629 }
  };

  var MIN_PX = 28, FADE = 0.8, HIT_A = 90, FLOOR = 0.004;

  // Цвет прозрачных пикселей картинки ← цвет ближайшего пикселя фигуры или тени (поиск в ширину от всех непрозрачных
  // сразу), прозрачность прежняя. В webp под прозрачными пикселями тёмный цвет (≈ #282826): при сглаживании и уменьшении
  // текстуры (mipmap) он проступал бы тёмной каймой по светлому меху.
  function bleed(d, wd, ht) {
    var n = wd * ht, done = new Uint8Array(n), q = new Int32Array(n), head = 0, tail = 0, i, k;
    for (i = 0; i < n; i++) if (d[i * 4 + 3] >= 8) { done[i] = 1; q[tail++] = i; }
    if (!tail) return;
    var DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    while (head < tail) {
      var p = q[head++], x = p % wd, y = (p - x) / wd;
      for (k = 0; k < 4; k++) {
        var nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= wd || ny >= ht) continue;
        var j = ny * wd + nx;
        if (done[j]) continue;
        done[j] = 1; d[j * 4] = d[p * 4]; d[j * 4 + 1] = d[p * 4 + 1]; d[j * 4 + 2] = d[p * 4 + 2]; q[tail++] = j;
      }
    }
  }
  // Текстура позы — из ImageData, а не с холста: холст хранит цвет, умноженный на прозрачность, и цвет прозрачных пикселей
  // терял бы. Пиксели (d) остаются для проверки «навели на саму фигуру, а не на прозрачное поле картинки».
  // Страница, открытая двойным кликом (file://), пикселей картинки не отдаёт — исключение: маскота нет, модель работает.
  function texture(img) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    var id = x.getImageData(0, 0, c.width, c.height);
    bleed(id.data, id.width, id.height);
    var t = new T.CanvasTexture(id);
    t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;   // v = 0 — верх картинки
    return { t: t, d: id.data, w: id.width, h: id.height };
  }

  R.createMascot = function (scene, opts) {
    var cam = opts.camera, canvas = opts.canvas;
    var pos = new Float32Array(24), uvs = new Float32Array(16), geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);   // грани 0–1 — фигура (вертикально), 2–3 — тень на полу
    // Прозрачный материал рисуется после непрозрачного (стены, колонна, мебель уже в буфере глубины) и первым из прозрачных
    // (renderOrder −1): стекло и гаснущая мебель перед маскотом ложатся поверх него, а позади — не проступают сквозь фигуру
    // (фигура пишет глубину). Совсем прозрачные поля картинки отбрасываются (alphaTest) — в стекле за маскотом нет «дыры».
    var mat = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: true, alphaTest: 0.02, side: T.DoubleSide });
    var mesh = new T.Mesh(geo, mat);
    mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.visible = false;   // тени не отбрасывает: своя тень в картинке
    scene.add(mesh);
    var tex = {}, failed = false, hidden = false;
    var st = { x: 0, y: 0, pose: 'hello', shown: 'hello', map: null, path: null, s: 0, len: 0, dur: 1, mirror: false, wink: 0, bob: 0, next: null, fade: 0, fig: 0, k: 1 };

    // Все позы грузятся сразу (≈ 100 КБ), смена позы — без мигания; пока поза не загрузилась, стоит прежняя картинка
    function setMap() {
      var t = tex[st.shown];
      if (!t || st.map === st.shown) return;
      var first = !mat.map;
      mat.map = t.t; st.map = st.shown;
      if (first) mat.needsUpdate = true;
      if (opts.onChange) opts.onChange();
    }
    Object.keys(POSE).forEach(function (k) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (failed) return;
        try { tex[k] = texture(img); } catch (e) { failed = true; return; }
        setMap();
      };
      img.src = opts.base + 'room-bunny-' + k + '-320.webp';
    });

    var V = new T.Vector3();
    function px(x, y, z) {   // точка сцены → px от левого верхнего угла холста
      V.set(x, y, z).project(cam);
      return { x: (V.x + 1) / 2 * canvas.clientWidth, y: (1 - V.y) / 2 * canvas.clientHeight };
    }
    function pxPlan(x, y) { var b = R.toWorld(x, y, 0); return px(b.x, b.y, b.z); }

    function show(pose) { st.shown = pose; setMap(); }
    function place(x, y, pose) { st.x = x; st.y = y; st.pose = pose; st.path = null; st.mirror = false; show(pose); }
    function arrive() { var t = st.next; place(t.x, t.y, t.pose); }
    function walkTo(t, boxes, instant) {
      st.next = t; st.wink = 0;   // подмигивание не должно вернуть стоячую позу посреди пути
      if (instant) { arrive(); return; }
      var path = L.findPath(P, [st.x, st.y], [t.x, t.y], boxes), a = pxPlan(st.x, st.y), b = pxPlan(t.x, t.y);
      st.path = path; st.len = L.pathLength(path); st.s = 0; st.bob = 0;
      st.dur = Math.max(1.2, Math.min(2, st.len / 1.6));
      if (st.len < 0.05) { arrive(); return; }
      var dx = b.x - a.x, dy = b.y - a.y, front = dy > Math.abs(dx) * 1.2;
      st.mirror = !front && dx < 0;   // поза «шагает» смотрит вправо
      show(front ? 'front' : 'walk');
    }
    function wink() { if (st.path) return; st.wink = 1; show('wink'); if (opts.onChange) opts.onChange(); }
    function update(dt) {
      var busy = false;
      if (st.path) {
        st.bob += dt;   // время хода; путь — с мягким разгоном и торможением, а не с места полной скоростью (правка 2026-10-20)
        st.s = st.len * L.smooth(st.bob / st.dur);
        var p = L.pointAt(st.path, st.s);
        st.x = p[0]; st.y = p[1];
        if (st.s >= st.len) arrive();
        busy = true;
      }
      if (st.wink > 0) { st.wink -= dt; if (st.wink <= 0) { st.wink = 0; show(st.pose); } busy = true; }
      // первая картинка проявляется за 0,8 с (правило 20), а не появляется за один кадр
      if (mat.map && st.fade < 1) { st.fade = opts.reduced ? 1 : Math.min(1, st.fade + dt / FADE); busy = true; }
      return busy;
    }
    function put(i, x, y, z) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
    function tc(i, u, v) { uvs[i * 2] = u; uvs[i * 2 + 1] = v; }
    // Каждый кадр перед отрисовкой (main.js): плоскость — на месте маскота, повёрнута к камере вокруг вертикали
    function layout() {
      var k = POSE[st.map];
      mesh.visible = !!k && !hidden && st.fade > 0;
      if (!mesh.visible) return;
      var b = R.toWorld(st.x, st.y, 0), cp = cam.position, th = Math.atan2(cp.x - b.x, cp.z - b.z), c = Math.cos(th), sn = Math.sin(th);
      mesh.position.copy(b); mesh.rotation.set(0, th, 0);
      // рост на экране — по масштабу зала, но не меньше 28 px: на телефоне зал мелкий и маскот иначе в 12–15 px (как у
      // маскота на карте — не меньше 32, L145); тогда вся плоскость больше в той же доле
      var foot = px(b.x, 0, b.z), head = px(b.x, P.mascotH, b.z), sh = Math.max(0.5, foot.y - head.y), s = sh < MIN_PX ? MIN_PX / sh : 1;
      var hF = P.mascotH * s, fig = sh * s;
      // Ширина — по экранному масштабу поперёк взгляда: сверху вертикальная плоскость видна укороченной по высоте, и рост на
      // экране, как и у прежней картинки, — проекция роста; картинка на экране остаётся в своих пропорциях
      var a1 = px(b.x - c * 0.5, hF / 2, b.z + sn * 0.5), a2 = px(b.x + c * 0.5, hF / 2, b.z - sn * 0.5);
      var hw = fig * k.ar / k.sole / Math.max(1e-3, Math.hypot(a2.x - a1.x, a2.y - a1.y)) / 2;
      // Тень — полоса картинки ниже подошв — лежит на полу перед ногами (к камере) такой длины, чтобы на экране занять ту же
      // высоту, что у картинки; на 4 мм выше пола, чтобы не мерцать с ним
      var f2 = px(b.x + sn * 0.25, 0, b.z + c * 0.25), dep = Math.min(1.5 * s, fig * (1 - k.sole) / k.sole / Math.max(1e-3, (f2.y - foot.y) / 0.25));
      var lift = st.path ? Math.abs(Math.sin(st.bob * Math.PI * 3.6)) * hF * 0.03 : 0;   // покачивание шага: фигура подскакивает, тень на полу
      put(0, -hw, lift, 0); put(1, hw, lift, 0); put(2, hw, lift + hF, 0); put(3, -hw, lift + hF, 0);
      put(4, -hw, FLOOR, 0); put(5, hw, FLOOR, 0); put(6, hw, FLOOR, dep); put(7, -hw, FLOOR, dep);
      var u0 = st.mirror ? 1 : 0, u1 = 1 - u0;   // зеркало позы «шагает» — по направлению хода
      tc(0, u0, k.sole); tc(1, u1, k.sole); tc(2, u1, 0); tc(3, u0, 0);
      tc(4, u0, k.sole); tc(5, u1, k.sole); tc(6, u1, 1); tc(7, u0, 1);
      geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true;
      geo.computeBoundingSphere();   // для луча наведения
      mat.opacity = st.fade;
      st.fig = fig; st.k = s;
      mesh.updateMatrixWorld();
    }

    // Луч по холсту: попал ли он в маскота (в фигуру или тень), какая там прозрачность картинки и не закрыт ли маскот в этой
    // точке непрозрачным предметом ближе него (opts.solids — стены, колонна, мебель, экран, шкафы; стёкла не закрывают)
    var ray = new T.Raycaster(), ndc = new T.Vector2();
    function cast(cx, cy, list) {
      var r = canvas.getBoundingClientRect(), t = tex[st.map];
      ndc.set((cx - r.left) / r.width * 2 - 1, 1 - (cy - r.top) / r.height * 2);
      ray.setFromCamera(ndc, cam);
      var h = ray.intersectObject(mesh, false)[0];
      if (!h || !t) return null;
      var ix = Math.min(t.w - 1, Math.max(0, Math.floor(h.uv.x * t.w))), iy = Math.min(t.h - 1, Math.max(0, Math.floor(h.uv.y * t.h)));
      ray.far = Math.max(0, h.distance - 0.01);   // предметы дальше маскота не нужны — луч их и не считает
      var o = ray.intersectObjects(list || opts.solids(), false)[0];
      ray.far = Infinity;
      return { a: t.d[(iy * t.w + ix) * 4 + 3] * st.fade, body: h.faceIndex < 2, hidden: !!o };
    }
    function hit(cx, cy) {
      if (!mesh.visible) return false;
      var h = cast(cx, cy);
      return !!h && h.body && !h.hidden && h.a >= HIT_A;
    }
    // Наведение мышью (только мышь — правило 8: на телефоне не «залипает») — подмигивает, курсор «рука»; касание или щелчок
    // без сдвига — тоже подмигивает
    var hover = false, down = null;
    function setHover(on) { if (on === hover) return; hover = on; canvas.style.cursor = on ? 'pointer' : ''; if (on) wink(); }
    canvas.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && !e.buttons) setHover(hit(e.clientX, e.clientY)); });
    canvas.addEventListener('pointerleave', function () { setHover(false); });
    canvas.addEventListener('pointerdown', function (e) { down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; setHover(false); });   // поворот — курсором «рука сжата» (room3d.css)
    canvas.addEventListener('pointerup', function (e) {
      var d = down; down = null;
      if (d && d.id === e.pointerId && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && e.timeStamp - d.t < 700 && hit(e.clientX, e.clientY)) wink();
    });

    // Рамка маскота на экране (фигура с тенью), px окна; fig — рост фигуры на экране
    var W2 = new T.Vector3();
    function box() {
      if (!mesh.visible) return null;
      var r = canvas.getBoundingClientRect(), o = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
      for (var i = 0; i < 8; i++) {
        W2.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(mesh.matrixWorld).project(cam);
        var x = r.left + (W2.x + 1) / 2 * r.width, y = r.top + (1 - W2.y) / 2 * r.height;
        o.l = Math.min(o.l, x); o.r = Math.max(o.r, x); o.t = Math.min(o.t, y); o.b = Math.max(o.b, y);
        if (i === 0) o.sole = y;
      }
      o.fig = st.fig; o.k = st.k; o.fade = st.fade; o.mirror = st.mirror; o.lift = pos[1];
      return o;
    }
    // Для проверки (tools/checks/pravki-2026-10-20-room3d.mjs): лучи через центры пикселей рамки маскота — [x, y окна,
    // прозрачность 0–255, закрыт предметом 1/0, фигура 1 / тень 0]
    function probe(step) {
      var bx = box();
      if (!bx) return null;
      var list = opts.solids(), out = [];
      step = step || 1;
      for (var y = Math.floor(bx.t); y < bx.b; y += step) for (var x = Math.floor(bx.l); x < bx.r; x += step) {
        var h = cast(x + 0.5, y + 0.5, list);
        if (h) out.push([x, y, Math.round(h.a), h.hidden ? 1 : 0, h.body ? 1 : 0]);
      }
      return { box: bx, pts: out };
    }
    return {
      place: place, walkTo: walkTo, update: update, layout: layout, box: box, probe: probe, hit: hit, mesh: mesh,
      pos: function () { return [st.x, st.y]; },
      pose: function () { return st.shown; },
      rect: function () { var b = box(); return b && { l: b.l, t: b.t, r: b.r, b: b.b }; },
      hide: function (on) { hidden = !!on; if (opts.onChange) opts.onChange(); },
      failed: function () { return failed; },
      // тёмная кайма: прозрачные пиксели (< 8) рядом со светлой непрозрачной фигурой, у которых цвет остался тёмным
      fringe: function () {
        var n = 0, all = 0;
        Object.keys(tex).forEach(function (k) {
          var t = tex[k], d = t.d;
          for (var y = 1; y < t.h - 1; y++) for (var x = 1; x < t.w - 1; x++) {
            var i = (y * t.w + x) * 4;
            if (d[i + 3] >= 8) continue;
            var light = [i + 4, i - 4, i + t.w * 4, i - t.w * 4].some(function (j) { return d[j + 3] > 200 && d[j] + d[j + 1] + d[j + 2] > 540; });
            if (!light) continue;
            all++;
            if (d[i] + d[i + 1] + d[i + 2] < 360) n++;
          }
        });
        return { dark: n, edge: all, poses: Object.keys(tex).length };
      },
      busy: function () { return !!st.path || st.wink > 0 || (!!mat.map && st.fade < 1); }
    };
  };
})(window);
