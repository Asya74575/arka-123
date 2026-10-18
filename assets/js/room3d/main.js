// 3D-модель зала (задание 3 ТЗ, drafts/room-3d.md) в блоке «Форматы» — на месте рендера модели из макета (Figma 700:2640).
// Собирает сцену, камеру, мебель и кнопки видов; маскота нет — зайчик только в видеопрогулке (L40). Облик и движок —
// как у 3D-карты района (scene.js, room3d-loader.js). Кадр рисуется
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
    var M = R.createMaterials(coarse), room = R.buildRoom(scene, M, coarse), furniture = R.createFurniture(scene, M);
    var v3 = new T.Vector3(), current = null, dirty = true, frozen = false, ui;
    function project(x, y, h) {
      v3.copy(R.toWorld(x, y, h)).project(camera);
      return { x: (v3.x + 1) / 2 * stage.clientWidth, y: (1 - v3.y) / 2 * stage.clientHeight, visible: v3.z < 1 && Math.abs(v3.x) < 0.92 && Math.abs(v3.y) < 0.9 };   // у края рамки точка прячется целиком, а не обрезается
    }
    var rig = R.createRig(camera, canvas, { reduced: reduced, onZoom: function (atMin, atMax) { if (ui) ui.setZoomLimits(atMin, atMax); } });
    ui = R.createUi(root, layer, { project: project, wallCut: room.wallCut, onView: function (id) { setView(id, false); }, onZoom: function (dir) { if (dir > 0) rig.zoomIn(); else rig.zoomOut(); } });

    function setView(id, first) {
      if (id === current) return;
      if (!first) rig.stopAuto();
      current = id;
      rig.flyTo(P.views[id].camera, first || reduced ? 0 : 1400);
      furniture.show(id, first || reduced);
      ui.setView(id);
      dirty = true;
    }
    function resize() {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
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
      var busy = furniture.update(dt) | (!frozen && room.updateCut(rig.planPos(), dt, reduced));
      if (busy || !shadowsDone) { renderer.shadowMap.needsUpdate = true; shadowsDone = !busy; }   // поворот камеры теней не меняет
      if (moved || busy || dirty) {
        renderer.render(scene, camera);
        ui.layout(null);
        dirty = false;
        root.classList.add('is-ready');
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    R.requestRender = function () { dirty = true; };
    R.debug = {
      idle: function () { return !rig.busy() && !furniture.busy() && !room.busy(); },
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
      // кадр для картинки-заглушки (tools/room3d/poster.mjs): самоповорот стоит, подписи и точки спрятаны
      still: function () { rig.stopAuto(); layer.style.visibility = 'hidden'; dirty = true; },
      setCamera: function (o) {
        frozen = true; layer.style.visibility = 'hidden';
        camera.fov = o.fov; camera.updateProjectionMatrix();
        camera.position.copy(R.toWorld(o.pos[0], o.pos[1], o.pos[2])); camera.lookAt(R.toWorld(o.look[0], o.look[1], o.look[2]));
        room.updateCut([o.pos[0], o.pos[1]], 0, true); dirty = true;
      }
    };
    setView(P.start || P.order[0], true);
    if (w.ResizeObserver) new w.ResizeObserver(resize).observe(stage); else w.addEventListener('resize', resize);
    resize();
    if (w.IntersectionObserver) new w.IntersectionObserver(function (e) { if (e[e.length - 1].isIntersecting) start(); else stop(); }).observe(stage);   // в одном вызове может прийти и устаревшая запись
    else start();
    return true;
  };
})(window);
