// 3D-модель зала (задание 3): маскот-гид. Вернулся по правке владельца 2026-10-19: «ранее в 3D-модели зала был маскот,
// надо его вернуть» (с 2026-10-12 модель была без него — L40). Прежняя механика (2026-10-11, DESIGN.md «Помещение в 3D»):
// картинка поверх холста в масштабе зала (рост plan.mascotH ≈ 1,3 м с ушами), всегда лицом к зрителю; к новой
// расстановке идёт в обход мебели (1,2–2 с, с покачиванием шага), у цели меняет позу; наведение мышью или касание —
// подмигивает на 1 с. Облачка с фразами нет: в пустом зале на модели и так подписи размеров.
// Позы — сжатые вырезки владельца «Материалы/Маскот вырезанный» с мягкой тенью под подошвами (tools/room3d/bunny.py,
// L98, L133): room-bunny-<поза>-160/320.webp. Световых пятен нет (L16). Если между камерой и маскотом колонна, кухня,
// шкафы или мебель — он полупрозрачный (main.js → occluded). «Уменьшение движения» — сразу на месте.
(function (w) {
  var R = w.Room3D, L = R.logic, P = R.plan;
  // ar — ширина / высота картинки, sole — доля высоты, где подошвы (печатает tools/room3d/bunny.py)
  var POSE = {
    hello: { ar: 0.5701, sole: 0.9641 }, come: { ar: 0.5764, sole: 0.9642 }, walk: { ar: 0.5161, sole: 0.9577 },
    eureka: { ar: 0.5348, sole: 0.9648 }, look: { ar: 0.4847, sole: 0.9675 }, front: { ar: 0.396, sole: 0.9727 },
    wink: { ar: 0.5171, sole: 0.9629 }
  };

  R.createMascot = function (layer, opts) {
    var box = document.createElement('div'), img = document.createElement('img'), big = false;
    box.className = 'room3d__mascot'; img.alt = ''; img.draggable = false; img.decoding = 'async'; box.appendChild(img);
    box.setAttribute('aria-hidden', 'true');
    layer.appendChild(box);
    function src(pose, b) { return opts.base + 'room-bunny-' + pose + '-' + (b ? 320 : 160) + '.webp'; }
    Object.keys(POSE).forEach(function (k) { (new Image()).src = src(k, false); });   // смена позы без мигания
    var st = { x: 0, y: 0, pose: 'hello', shown: 'hello', path: null, s: 0, len: 0, dur: 1, mirror: false, wink: 0, bob: 0, next: null };

    function show(pose) {
      st.shown = pose;
      var u = src(pose, big);
      if (img.getAttribute('src') !== u) img.setAttribute('src', u);
    }
    function place(x, y, pose) { st.x = x; st.y = y; st.pose = pose; st.path = null; st.mirror = false; show(pose); }
    function arrive() { var t = st.next; place(t.x, t.y, t.pose); }
    function walkTo(t, boxes, instant) {
      st.next = t; st.wink = 0;   // подмигивание не должно вернуть стоячую позу посреди пути
      if (instant) { arrive(); return; }
      var path = L.findPath(P, [st.x, st.y], [t.x, t.y], boxes), a = opts.project(st.x, st.y, 0), b = opts.project(t.x, t.y, 0);
      st.path = path; st.len = L.pathLength(path); st.s = 0; st.bob = 0;
      st.dur = Math.max(1.2, Math.min(2, st.len / 1.6));
      if (st.len < 0.05) { arrive(); return; }
      var dx = b.x - a.x, dy = b.y - a.y, front = dy > Math.abs(dx) * 1.2;
      st.mirror = !front && dx < 0;   // поза «шагает» смотрит вправо
      show(front ? 'front' : 'walk');
    }
    function wink() { if (st.path) return; st.wink = 1; show('wink'); if (opts.onChange) opts.onChange(); }
    box.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') wink(); });
    box.addEventListener('click', wink);
    function update(dt) {
      var busy = false;
      if (st.path) {
        st.s = Math.min(st.len, st.s + dt * st.len / st.dur); st.bob += dt;
        var p = L.pointAt(st.path, st.s);
        st.x = p[0]; st.y = p[1];
        if (st.s >= st.len) arrive();
        busy = true;
      }
      if (st.wink > 0) { st.wink -= dt; if (st.wink <= 0) { st.wink = 0; show(st.pose); } busy = true; }
      return busy;
    }
    function layout(dim) {
      // рост на экране — по масштабу зала, но не меньше 28 px: на телефоне зал мелкий и маскот иначе в 12–15 px (как у
      // маскота на карте — не меньше 32, L145)
      var foot = opts.project(st.x, st.y, 0), head = opts.project(st.x, st.y, P.mascotH), h = Math.max(28, foot.y - head.y);
      var k = POSE[st.shown] || POSE.hello, H = h / k.sole;   // картинка выше фигуры на тень под подошвами
      var nb = H * (w.devicePixelRatio || 1) > 170;
      if (nb !== big) { big = nb; show(st.shown); }
      var lift = st.path ? Math.abs(Math.sin(st.bob * Math.PI * 3.6)) * h * 0.03 : 0;
      box.style.width = (H * k.ar).toFixed(1) + 'px';
      box.style.height = H.toFixed(1) + 'px';
      box.style.transform = 'translate3d(' + foot.x.toFixed(1) + 'px,' + (foot.y - H * k.sole - lift).toFixed(1) + 'px,0) translateX(-50%)' + (st.mirror ? ' scaleX(-1)' : '');
      box.style.opacity = !foot.visible ? '0' : dim ? '0.4' : '';   // у края рамки — прячется целиком, как подписи
    }
    return {
      place: place, walkTo: walkTo, update: update, layout: layout,
      pos: function () { return [st.x, st.y]; },
      pose: function () { return st.shown; },
      rect: function () { var b = box.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; },
      hide: function (on) { box.style.visibility = on ? 'hidden' : ''; },
      busy: function () { return !!st.path || st.wink > 0; }
    };
  };
})(window);
