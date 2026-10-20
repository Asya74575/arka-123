// 3D-модель зала (задание 3, drafts/room-3d.md): камера. Поворот — перетаскиванием мышью и горизонтальным свайпом,
// наклон 22°–65° — мышью вверх-вниз, стрелки влево и вправо — с клавиатуры. До первого касания модель медленно
// поворачивается сама (оборот за 80 с); табы расстановок и «Вернуть вид» — перелёт к ракурсу за 1,4 с. Вертикальный свайп на телефоне
// листает страницу: у холста touch-action: pan-y (room3d.css), такой жест браузер сам отдаёт прокрутке.
// Приближение (правка владельца 2026-10-16: «крутить, увеличивать, уменьшать»; выбор владельца — кнопки + / − и Ctrl + колесо):
// кнопки + / − на модели (ui.js) и клавиши + / − — шаг ×0,8 / ×1,25 за 0,4 с; колесо с Ctrl (⌘) и щипок на тачпаде —
// плавно; на телефоне — двумя пальцами. Обычное колесо листает страницу, а не модель. Приближение — свой множитель uz
// от 0,5 (вдвое ближе) до 1,4; выбор вида возвращает его к 1.
// Зал целиком в рамке (правка владельца 2026-10-18: «при скролле 3D-модель не вмещается в рамку», L147): расстояние —
// L.fitRoom по габариту зала, рамке и наклону при любом повороте; область для зала — рамка без полей (по 2,5 % ширины
// по бокам, по 4 % высоты сверху и снизу) и без полос под кнопками масштаба и шапкой (main.js → setInsets). Середина
// зала на экране — всегда в середине этой области (смещение кадра setViewOffset). Камера смотрит на середину зала;
// вид задаёт только поворот и наклон. Приближение uz — от этого вписанного расстояния.
(function (w) {
  var R = w.Room3D, L = R.logic, P = R.plan;
  var EL_MIN = 22, EL_MAX = 65, AUTO = 360 / 80, LOOK_H = 0.6, UZ_MIN = 0.5, UZ_MAX = 1.4, MX = 0.025, MY = 0.04;
  var PTS = L.roomPoints(P), fits = {}, box = { x0: -1 + 2 * MX, x1: 1 - 2 * MX, y0: -1 + 2 * MY, y1: 1 - 2 * MY };
  function fitFor(fov, aspect, el) {   // расстояние «зал целиком» — по рамке, области и наклону (наклон с шагом 0,5°)
    var k = [fov, aspect.toFixed(3), box.x0.toFixed(3), box.x1.toFixed(3), box.y0.toFixed(3), box.y1.toFixed(3), Math.round(el * 2)].join('|');
    if (!fits[k]) fits[k] = L.fitRoom(PTS, P.center, Math.round(el * 2) / 2, fov, aspect, box, LOOK_H);
    return fits[k];
  }
  var clampUz = function (v) { return Math.max(UZ_MIN, Math.min(UZ_MAX, v)); };

  R.createRig = function (camera, el, opts) {
    var s = { az: 0, el: 40, tx: P.center[0], ty: P.center[1], uz: 1 };
    var fly = null, zfly = null, auto = !opts.reduced, drag = null, pinch = null, dirty = true, touched = false;
    var points = {};   // пальцы и мышь на холсте: id → { x, y }
    function interact() { auto = false; if (!touched) { touched = true; if (opts.onInteract) opts.onInteract(); } }
    function zoomed() { if (opts.onZoom) opts.onZoom(s.uz <= UZ_MIN + 1e-3, s.uz >= UZ_MAX - 1e-3); }
    function apply() {
      var d = fitFor(camera.fov, camera.aspect, s.el) * s.uz, p = L.cameraPlan([s.tx, s.ty], s.az, s.el, d);
      camera.position.copy(R.toWorld(p.x, p.y, p.h + LOOK_H));
      camera.lookAt(R.toWorld(s.tx, s.ty, LOOK_H));
      // середина зала на экране — в середину области для зала. Кадр — 2a × 2 (a — пропорции рамки): setViewOffset ставит
      // камере aspect = ширина / высота кадра, с кадром 2 × 2 модель растягивалась по ширине
      var a = camera.aspect, e = L.frameExtent(PTS, [s.tx, s.ty], s.az, s.el, d, camera.fov, a, LOOK_H);
      camera.setViewOffset(2 * a, 2, (e.x0 + e.x1 - box.x0 - box.x1) / 2 * a, -(e.y0 + e.y1 - box.y0 - box.y1) / 2, 2 * a, 2);
    }
    function flyTo(v, ms) {
      var to = { az: L.nearestAngle(s.az, v.az), el: v.el, tx: P.center[0], ty: P.center[1], uz: v.uz != null ? v.uz : 1 }, k;
      zfly = null;
      if (!ms) { for (k in to) s[k] = to[k]; fly = null; dirty = true; zoomed(); return; }
      var from = {};
      for (k in to) from[k] = s[k];
      fly = { from: from, to: to, t: 0, dur: ms / 1000 };
    }
    // Приближение: шаг кнопкой или клавишей — плавно за 0,4 с; колесо и пальцы — сразу (они сами плавные)
    function zoomTo(uz, ms) {
      uz = clampUz(uz); interact();
      if (fly) { fly.to.uz = uz; return; }
      if (!ms) { s.uz = uz; zfly = null; dirty = true; zoomed(); return; }
      zfly = { from: s.uz, to: uz, t: 0, dur: ms / 1000 };
    }
    function dist() { var a = Object.keys(points).map(function (k) { return points[k]; }); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      points[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      if (Object.keys(points).length === 2) { drag = null; pinch = { d0: dist(), uz0: s.uz }; return; }   // второй палец — щипок, поворот ждёт
      if (!e.isPrimary) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse', moved: 0 };
    });
    el.addEventListener('pointermove', function (e) {
      if (points[e.pointerId]) { points[e.pointerId].x = e.clientX; points[e.pointerId].y = e.clientY; }
      if (pinch) {
        var d = dist();
        if (d > 0 && pinch.d0 > 0) { zoomTo(pinch.uz0 * pinch.d0 / d, 0); fly = null; }
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 3) return;
      interact(); fly = null;
      s.az -= dx * 0.3;
      if (drag.mouse) s.el = Math.max(EL_MIN, Math.min(EL_MAX, s.el + dy * 0.2));
      dirty = true;
    });
    function end(e) {
      delete points[e.pointerId];
      if (Object.keys(points).length < 2) pinch = null;
      if (drag && e.pointerId === drag.id) drag = null;
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Колесо с Ctrl (⌘) или щипок на тачпаде (браузер шлёт его как колесо с Ctrl): модель, а не масштаб страницы.
    // Колесо без Ctrl не трогаем — им листают страницу (Lenis).
    el.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      fly = null;
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomTo(s.uz * Math.exp(Math.max(-60, Math.min(60, dy)) * 0.0025), 0);
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomTo(s.uz * (e.key === '-' || e.key === '_' ? 1.25 : 0.8), opts.reduced ? 0 : 400);
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); interact();
      flyTo({ az: s.az + (e.key === 'ArrowLeft' ? 20 : -20), el: s.el, uz: s.uz }, opts.reduced ? 0 : 400);
    });
    function update(dt) {
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.dur);
        var k = L.easeInOut(fly.t);
        for (var key in fly.to) s[key] = fly.from[key] + (fly.to[key] - fly.from[key]) * k;
        if (fly.t >= 1) { fly = null; zoomed(); }
        dirty = true;
      } else if (auto && dt) { s.az += AUTO * dt; dirty = true; }
      if (zfly) {
        zfly.t = Math.min(1, zfly.t + dt / zfly.dur);
        s.uz = zfly.from + (zfly.to - zfly.from) * L.easeInOut(zfly.t);
        if (zfly.t >= 1) { zfly = null; zoomed(); }
        dirty = true;
      }
      if (!dirty) return false;
      apply(); dirty = false;
      return true;
    }
    return {
      flyTo: flyTo, update: update, stopAuto: interact,
      zoomIn: function () { zoomTo((zfly ? zfly.to : s.uz) * 0.8, opts.reduced ? 0 : 400); },
      zoomOut: function () { zoomTo((zfly ? zfly.to : s.uz) * 1.25, opts.reduced ? 0 : 400); },
      uz: function () { return s.uz; },
      apply: function () { apply(); dirty = false; },
      // поля рамки, занятые кнопками и шапкой (доли ширины и высоты, 0…0,4): зал вписывается в остальное
      setInsets: function (i) {
        var c = function (v) { return Math.max(0, Math.min(0.4, v || 0)); };
        var nb = { x0: -1 + 2 * (MX + c(i.l)), x1: 1 - 2 * (MX + c(i.r)), y0: -1 + 2 * (MY + c(i.b)), y1: 1 - 2 * (MY + c(i.t)) };
        if (['x0', 'x1', 'y0', 'y1'].some(function (k) { return Math.abs(nb[k] - box[k]) > 1e-3; })) { box = nb; dirty = true; }
      },
      planPos: function () { return [camera.position.x + P.center[0], P.center[1] - camera.position.z]; },
      busy: function () { return !!fly; },
      az: function () { return s.az; },
      el: function () { return s.el; },
      // камера стоит в ракурсе вида v и в исходном масштабе (кнопка «Вернуть вид» тогда неактивна, ui.js)
      isAt: function (v) { return !fly && !zfly && Math.abs(L.nearestAngle(s.az, v.az) - s.az) < 0.5 && Math.abs(s.el - v.el) < 0.5 && Math.abs(s.uz - (v.uz != null ? v.uz : 1)) < 0.005; }
    };
  };
})(window);
