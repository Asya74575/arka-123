// 3D-модель зала (задание 3 ТЗ, drafts/room-3d.md) в большой рамке блока «Наше помещение» (с 2026-10-18).
// Собирает сцену, камеру, мебель, размерные линии, маскота-гида (вернулся по правке владельца 2026-10-19, mascot.js)
// и кнопки на модели. Облик и движок — как у 3D-карты района (scene.js, room3d-loader.js). Кадр рисуется
// только когда что-то меняется; вне экрана — пауза. Запускает room3d-loader.js, когда блок рядом и браузер умеет WebGL;
// до первого кадра и без WebGL видно картинку модели (room3d__poster).
(function (w) {
  var R = w.Room3D, T = w.THREE, P = R.plan;

  R.init = function (root, opts) {
    opts = opts || {};
    var stage = root.querySelector('.room3d__stage'), layer = root.querySelector('.room3d__layer');
    var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches, coarse = w.matchMedia('(pointer: coarse)').matches;
    var renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { root.classList.add('is-failed'); return false; }
    renderer.setPixelRatio(Math.min(w.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping;   // как у карты (fly.js)
    renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = false;   // как у карты: тени пересчитываются, только когда мебель или стены меняются
    var canvas = renderer.domElement;
    canvas.className = 'room3d__canvas'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Объёмная модель зала 123,1 м² по плану помещения: два арочных окна, колонна, шкафы, стеклянная стена. Мебель — пример расстановки. Стрелки влево и вправо поворачивают модель, плюс и минус — приближают и отдаляют.');
    stage.insertBefore(canvas, layer);

    var scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 16 / 9, 0.3, 200);
    var M = R.createMaterials(coarse), room = R.buildRoom(scene, M, coarse), furniture = R.createFurniture(scene, M), dims = R.createDims(scene);
    var v3 = new T.Vector3(), ray = new T.Raycaster(), current = null, dirty = true, frozen = false, ui, mascot;
    function project(x, y, h) {
      v3.copy(R.toWorld(x, y, h)).project(camera);
      return { x: (v3.x + 1) / 2 * stage.clientWidth, y: (1 - v3.y) / 2 * stage.clientHeight, visible: v3.z < 1 && Math.abs(v3.x) < 0.92 && Math.abs(v3.y) < 0.9 };   // у края рамки точка прячется целиком, а не обрезается
    }
    var rig = R.createRig(camera, canvas, { reduced: reduced, onZoom: function (atMin, atMax) { if (ui) ui.setZoomLimits(atMin, atMax); } });
    ui = R.createUi(root, layer, { project: project, wallCut: room.wallCut, onReset: reset, onFull: toggleFull, onZoom: function (dir) { if (dir > 0) rig.zoomIn(); else rig.zoomOut(); } });
    mascot = R.createMascot(layer, { project: project, base: opts.base || 'img/', onChange: function () { dirty = true; } });
    // выбор расстановки — карточка внизу рамки (room3d-loader.js)
    root.addEventListener('room3d:view', function (e) { if (P.views[e.detail]) setView(e.detail, false); });
    // Маскот полупрозрачный, если между камерой и ним колонна, кухня, шкафы или мебель
    function occluded() {
      var p = mascot.pos(), to = R.toWorld(p[0], p[1], 0.75), dir = to.clone().sub(camera.position), d = dir.length();
      ray.set(camera.position, dir.normalize()); ray.far = Math.max(0, d - 0.35);
      return ray.intersectObjects(room.occluders.concat(furniture.meshes(current)), false).length > 0;
    }

    // «На весь экран» (правка владельца 2026-10-19: «добавить кнопку открыть на весь экран»): вся рамка с карточкой
    // расстановок, подсказкой и кнопками — через Fullscreen API; где его нет для блоков (iPhone), — рамка на всё окно поверх
    // страницы, страница стоит. Выход — та же кнопка или Esc. Зал вписывается заново (resize).
    var doc = document, html = doc.documentElement;
    function fsEl() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
    function isFull() { return fsEl() === root || root.classList.contains('is-full'); }
    function pseudo(on) {
      root.classList.toggle('is-full', on); html.classList.toggle('room3d-full', on);
      var Ln = w.ARKA && w.ARKA.lenis;
      if (Ln) { if (on) Ln.stop(); else Ln.start(); }
      fsChanged();
    }
    function toggleFull() {
      if (isFull()) {
        if (fsEl()) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); else pseudo(false);
        return;
      }
      var req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
        try { var pr = req.call(root, { navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(function () { pseudo(true); }); } catch (e) { pseudo(true); }
      } else pseudo(true);
    }
    function fsChanged() { var on = isFull(); root.classList.toggle('is-fs', on); ui.setFull(on); resize(); }
    doc.addEventListener('fullscreenchange', fsChanged);
    doc.addEventListener('webkitfullscreenchange', fsChanged);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-full')) pseudo(false); });

    function setView(id, first) {
      if (id === current) return;
      if (!first) rig.stopAuto();
      current = id;
      var v = P.views[id], m = v.mascot;
      rig.flyTo(v.camera, first || reduced ? 0 : 1400);
      furniture.show(id, first || reduced);
      dims.show(id === 'empty', first || reduced);
      if (first) mascot.place(m.x, m.y, m.pose);
      else mascot.walkTo(m, R.logic.fixedBoxes(P).concat(v.items.map(R.logic.footprint)), reduced);
      ui.setView(id);
      dirty = true;
    }
    // «Вернуть вид»: ракурс выбранной расстановки и исходный масштаб
    function reset() { rig.stopAuto(); rig.flyTo(P.views[current].camera, reduced ? 0 : 1400); dirty = true; }
    // Область рамки для зала (L147): без полос под кнопками (столбец справа по центру — поля слева и справа поровну,
    // чтобы зал стоял посередине; строка в углу вверху — поле сверху), под карточкой расстановок внизу (поле снизу) и без
    // верха, который закрывает шапка, пока блок стоит под аркой (компьютер, блок выше окна — arch.js, home.css: низом у края
    // окна; с 2026-10-19 рамка тогда от самого верха окна, под шапкой). Во весь экран шапки нет.
    var block = root.closest('[data-arch-under]'), hdr = document.querySelector('.hdr'), card = root.querySelector('.room3d__card');
    function insets() {
      var s = stage.getBoundingClientRect(), W = s.width || 1, H = s.height || 1, out = { t: 0, r: 0, b: 0, l: 0 };
      var z = ui.zoomBox().getBoundingClientRect();
      if (z.width && z.height > z.width) out.r = out.l = Math.max(0, s.right - z.left + 12) / W;
      else if (z.width) out.t = Math.max(0, z.bottom - s.top + 12) / H;
      var c = card && card.getBoundingClientRect();
      if (c && c.height) out.b = Math.max(0, s.bottom - c.top + 12) / H;
      if (!isFull() && block && hdr && w.innerWidth >= 1024 && document.documentElement.classList.contains('has-motion') && block.offsetHeight >= w.innerHeight) {
        var b = block.getBoundingClientRect(), pinnedTop = w.innerHeight - (b.bottom - s.top);
        out.t = Math.max(out.t, Math.max(0, hdr.getBoundingClientRect().height - pinnedTop) / H);
      }
      return out;
    }
    function resize() {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      rig.setInsets(insets());
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
      if (!frozen) rig.apply();
      dirty = true;
    }
    var running = false, raf = 0, last = 0, shadowsDone = false;
    function frame(t) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      var moved = !frozen && rig.update(dt);
      var busy = furniture.update(dt) | dims.update(dt) | mascot.update(dt) | (!frozen && room.updateCut(rig.planPos(), dt, reduced));
      if (busy || !shadowsDone) { renderer.shadowMap.needsUpdate = true; shadowsDone = !busy; }   // поворот камеры теней не меняет
      if (moved || busy || dirty) {
        renderer.render(scene, camera);
        mascot.layout(occluded()); ui.layout();
        dirty = false;
        root.classList.add('is-ready');
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    R.requestRender = function () { dirty = true; };
    R.debug = {
      idle: function () { return !rig.busy() && !furniture.busy() && !room.busy() && !dims.busy() && !mascot.busy(); },
      mascot: function () { var p = mascot.pos(); return { x: p[0], y: p[1], pose: mascot.pose() }; },
      dims: function () { return dims.count(); },
      full: function () { return isFull(); },
      project: function (x, y, h) { return project(x, y, h); },
      view: function () { return current; },
      shown: function () { return furniture.shown(); },
      az: function () { return rig.az(); },
      uz: function () { return rig.uz(); },
      running: function () { return running; },
      // облик как у карты: какие материалы и текстуры в сцене, сколько линий-рёбер (проверка pravki-2026-10-15-room3d)
      style: function () {
        var types = {}, maps = 0, edges = 0;
        scene.traverse(function (o) {
          if (o.isLineSegments) edges++;
          else if (o.isMesh) { types[o.material.type] = (types[o.material.type] || 0) + 1; if (o.material.map && o.material.map.image && o.material.map.image.width !== 512) maps++; }
        });
        return { types: types, maps: maps, edges: edges, tone: renderer.toneMapping === T.NoToneMapping, same: w.THREE === w.THREE_MAP };
      },
      setView: function (id) { setView(id, false); },
      cam: function () { return { aspect: camera.aspect, dist: camera.position.length(), view: camera.view && { x: camera.view.offsetX, y: camera.view.offsetY } }; },
      // где зал на экране: рамка вокруг углов пола и потолка, px от левого верхнего угла рамки (проверка L147)
      bounds: function () {
        var b = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity, w: stage.clientWidth, h: stage.clientHeight };
        R.logic.roomPoints(P).forEach(function (p) { var q = project(p[0], p[1], p[2]); b.l = Math.min(b.l, q.x); b.r = Math.max(b.r, q.x); b.t = Math.min(b.t, q.y); b.b = Math.max(b.b, q.y); });
        return b;
      },
      // кадр для картинки-заглушки (tools/room3d/poster.mjs): самоповорот стоит, подписи и точки спрятаны
      still: function () { rig.stopAuto(); layer.style.visibility = 'hidden'; dims.hide(); dirty = true; },
      setCamera: function (o) {
        frozen = true; layer.style.visibility = 'hidden';
        camera.fov = o.fov; camera.clearViewOffset(); camera.updateProjectionMatrix();
        camera.position.copy(R.toWorld(o.pos[0], o.pos[1], o.pos[2])); camera.lookAt(R.toWorld(o.look[0], o.look[1], o.look[2]));
        room.updateCut([o.pos[0], o.pos[1]], 0, true); dirty = true;
      }
    };
    setView(P.views[root.dataset.view] ? root.dataset.view : P.start || P.order[0], true);
    if (w.ResizeObserver) new w.ResizeObserver(resize).observe(stage); else w.addEventListener('resize', resize);
    resize();
    if (w.IntersectionObserver) new w.IntersectionObserver(function (e) { if (e[e.length - 1].isIntersecting) start(); else stop(); }).observe(stage);   // в одном вызове может прийти и устаревшая запись
    else start();
    return true;
  };
})(window);
