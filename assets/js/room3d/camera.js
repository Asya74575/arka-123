// 3D-модель зала (задание 3, drafts/room-3d.md): камера. Поворот — перетаскиванием мышью и горизонтальным свайпом,
// наклон 22°–65° — мышью вверх-вниз, стрелки влево и вправо — с клавиатуры. До первого касания модель медленно
// поворачивается сама (оборот за 80 с). Вертикальный свайп на телефоне
// листает страницу: у холста touch-action: pan-y (room3d.css), такой жест браузер сам отдаёт прокрутке.
// Приближение (правка владельца 2026-10-16: «крутить, увеличивать, уменьшать»; выбор владельца — кнопки + / − и Ctrl + колесо):
// кнопки + / − на модели (ui.js) и клавиши + / − — шаг ×0,8 / ×1,25; колесо с Ctrl (⌘) и щипок на тачпаде —
// плавно; на телефоне — двумя пальцами. Обычное колесо листает страницу, а не модель. Приближение — свой множитель uz
// от 0,5 (вдвое ближе) до 1,4; выбор вида возвращает его к 1.
// Движение — плавное, как у ленты «Фото» (glide.js, L178; правка владельца 2026-10-20: «анимация резкая, быстрая, а у нас
// на сайте плавная, лёгкая»). Было: модель шла за мышью без сглаживания (до 15° за кадр) и вставала как вкопанная, перелёт
// к расстановке — 1,4 с при любом угле (разворот на 176° — до 370°/с в середине), шаг масштаба и стрелок — 0,4 с. Стало:
// — мышь, палец, Ctrl + колесо, щипок ведут камеру пружиной без раскачки (отставание ≈ 0,15 с, не быстрее VMAX);
// — после отпускания модель докручивается по инерции и тормозит, 0,8–1,4 с;
// — расстановка и «Вернуть вид» — перелёт 1,4–2,2 с (дольше при большом угле), стрелки и шаг масштаба — 0,8 с;
//   кривая — Эрмит: старт с той скоростью, с которой камера уже шла (без рывка), финиш в покое.
// Правка владельца 2026-10-21 (та же жалоба: «когда вертишь мышью, анимация резкая, быстрая»; L192): модель шла 0,3° на
// пиксель руки — ближний край зала бежал быстрее мыши (на 1920 — в 1,8 раза), за мышью — с отставанием 0,15 с и до
// 240°/с. Стало: поворот на пиксель — от размера зала на экране, край зала идёт за рукой чуть медленнее её самой (GAIN);
// наклон — 0,6 от поворота; отставание ≈ 0,22 с, не быстрее 150°/с (наклон — 60°/с); докрутка по инерции 1–1,8 с.
// «Уменьшение движения» — сразу на месте.
// Зал целиком в рамке (правка владельца 2026-10-18: «при скролле 3D-модель не вмещается в рамку», L147): расстояние —
// L.fitRoom по габариту зала, рамке и наклону при любом повороте; область для зала — рамка без полей (по 2,5 % ширины
// по бокам, по 4 % высоты сверху и снизу) и без полос под кнопками масштаба и шапкой (main.js → setInsets). Середина
// зала на экране — всегда в середине этой области (смещение кадра setViewOffset). Камера смотрит на середину зала;
// вид задаёт только поворот и наклон. Приближение uz — от этого вписанного расстояния.
(function (w) {
  var R = w.Room3D, L = R.logic, P = R.plan;
  var EL_MIN = 22, EL_MAX = 65, AUTO = 360 / 80, LOOK_H = 0.6, UZ_MIN = 0.5, UZ_MAX = 1.4, MX = 0.025, MY = 0.04;
  var FOLLOW = 9;                                   // пружина следования (рад/с): отставание ≈ 0,22 с (у glide.js — 14)
  var VMAX = { az: 150, el: 60, uz: 1.5 };          // самая большая скорость: °/с, °/с, доля в секунду
  var THROW = 0.35, REACH = 80;                     // инерция: куда камера докрутилась бы за 0,35 с, но не дальше 80°
  var GAIN = 0.8;                                   // край зала на экране — 0,8 пути руки
  var KEYS = ['az', 'el', 'uz'];
  var PTS = L.roomPoints(P), fits = {}, box = { x0: -1 + 2 * MX, x1: 1 - 2 * MX, y0: -1 + 2 * MY, y1: 1 - 2 * MY };
  function fitFor(fov, aspect, el) {   // расстояние «зал целиком» — по рамке, области и наклону (наклон с шагом 0,5°)
    var k = [fov, aspect.toFixed(3), box.x0.toFixed(3), box.x1.toFixed(3), box.y0.toFixed(3), box.y1.toFixed(3), Math.round(el * 2)].join('|');
    if (!fits[k]) fits[k] = L.fitRoom(PTS, P.center, Math.round(el * 2) / 2, fov, aspect, box, LOOK_H);
    return fits[k];
  }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var clampUz = function (v) { return clamp(v, UZ_MIN, UZ_MAX); };
  var clampEl = function (v) { return clamp(v, EL_MIN, EL_MAX); };
  var herm = L.herm;   // кубическая кривая Эрмита (logic.js, как glide.js)

  R.createRig = function (camera, el, opts) {
    var s = { az: 0, el: 40, tx: P.center[0], ty: P.center[1], uz: 1 };
    var vel = { az: 0, el: 0, uz: 0 };
    var tw = { az: null, el: null, uz: null };       // ход к месту: { x0, v0, x1, d, t }
    var goal = { az: null, el: null, uz: null };     // куда ведут мышь, палец, колесо
    var auto = !opts.reduced, drag = null, pinch = null, dirty = true, touched = false, samples = [];
    var points = {};   // пальцы и мышь на холсте: id → { x, y }
    function interact() { auto = false; if (!touched) { touched = true; if (opts.onInteract) opts.onInteract(); } }
    function zoomed() { if (opts.onZoom) opts.onZoom(s.uz <= UZ_MIN + 1e-3, s.uz >= UZ_MAX - 1e-3); }
    function moving() { return KEYS.some(function (k) { return tw[k] || goal[k] !== null; }); }
    function apply() {
      var d = fitFor(camera.fov, camera.aspect, s.el) * s.uz, p = L.cameraPlan([s.tx, s.ty], s.az, s.el, d);
      camera.position.copy(R.toWorld(p.x, p.y, p.h + LOOK_H));
      camera.lookAt(R.toWorld(s.tx, s.ty, LOOK_H));
      // середина зала на экране — в середину области для зала. Кадр — 2a × 2 (a — пропорции рамки): setViewOffset ставит
      // камере aspect = ширина / высота кадра, с кадром 2 × 2 модель растягивалась по ширине
      var a = camera.aspect, e = L.frameExtent(PTS, [s.tx, s.ty], s.az, s.el, d, camera.fov, a, LOOK_H);
      camera.setViewOffset(2 * a, 2, (e.x0 + e.x1 - box.x0 - box.x1) / 2 * a, -(e.y0 + e.y1 - box.y0 - box.y1) / 2, 2 * a, 2);
    }
    function jump(k, x) { s[k] = x; vel[k] = 0; tw[k] = null; goal[k] = null; dirty = true; }
    // Ход одной величины к месту за d с, со скоростью, с которой она уже идёт; без проскока мимо места
    function tween(k, x1, d) {
      goal[k] = null;
      if (opts.reduced) { jump(k, x1); return; }
      var dx = x1 - s[k], v0 = vel[k];
      if (Math.abs(dx) < 1e-4 && Math.abs(v0) < 1e-3) { jump(k, x1); return; }
      if (Math.abs(v0) * d > 3 * Math.abs(dx)) v0 = (v0 > 0 ? 3 : -3) * Math.abs(dx) / d;
      tw[k] = { x0: s[k], v0: v0, x1: x1, d: d, t: 0 };
      dirty = true;
    }
    // Ведение рукой или колесом: камера идёт за целью пружиной (update)
    function lead(k, x) { tw[k] = null; goal[k] = x; dirty = true; }
    // Перелёт к ракурсу вида: 1,4 с, при большом угле дольше (разворот на 180° — 2,2 с), все величины приходят вместе
    function flyTo(v, ms) {
      var to = { az: L.nearestAngle(s.az, v.az), el: v.el, uz: v.uz != null ? v.uz : 1 };
      if (!ms || opts.reduced) { KEYS.forEach(function (k) { jump(k, to[k]); }); zoomed(); return; }
      var d = Math.min(2.2, Math.max(ms / 1000, 1.2 + Math.abs(to.az - s.az) / 160));
      KEYS.forEach(function (k) { tween(k, to[k], d); });
    }
    // Шаг масштаба кнопкой или клавишей — 0,8 с; нажатия подряд складываются без рывка
    function zoomStep(f) { interact(); tween('uz', clampUz((tw.uz ? tw.uz.x1 : goal.uz !== null ? goal.uz : s.uz) * f), 0.8); }
    function zoomLead(uz) { interact(); lead('uz', clampUz(uz)); }
    // Поворот на пиксель руки: ближний край зала проходит GAIN пути мыши — на любой ширине и при любом приближении
    // (полуширина зала на экране — по углам пола и потолка, кадр от −1 до 1)
    function perPx() {
      var d = fitFor(camera.fov, camera.aspect, s.el) * s.uz, e = L.frameExtent(PTS, [s.tx, s.ty], s.az, s.el, d, camera.fov, camera.aspect, LOOK_H);
      var r = (e.x1 - e.x0) / 4 * (el.clientWidth || 1);
      return r > 1 ? clamp(GAIN * 180 / Math.PI / r, 0.1, 0.35) : 0.2;
    }
    function dist() { var a = Object.keys(points).map(function (k) { return points[k]; }); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      points[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      if (Object.keys(points).length === 2) { release(null, true); pinch ={ d0: dist(), uz0: goal.uz !== null ? goal.uz : s.uz }; return; }   // второй палец — щипок, поворот ждёт
      if (!e.isPrimary) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse', moved: 0, on: false, k: perPx() };
      samples = [];
    });
    el.addEventListener('pointermove', function (e) {
      if (points[e.pointerId]) { points[e.pointerId].x = e.clientX; points[e.pointerId].y = e.clientY; }
      if (pinch) {
        var d = dist();
        if (d > 0 && pinch.d0 > 0) zoomLead(pinch.uz0 * pinch.d0 / d);
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 3) return;
      interact();
      if (!drag.on) { drag.on = true; goal.az = s.az; goal.el = s.el; tw.az = tw.el = null; }   // перехват на ходу — с той же скоростью
      lead('az', goal.az - dx * drag.k);
      if (drag.mouse) lead('el', clampEl(goal.el + dy * drag.k * 0.6));
      samples.push({ t: e.timeStamp, az: goal.az });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    });
    // Отпустили: докрутка по инерции — к месту, куда камера дошла бы за THROW с, и торможение (still — второй палец:
    // поворот встаёт без инерции, дальше щипок)
    function release(e, still) {
      var d = drag; drag = null;
      if (!d || !d.on) return;
      var v = 0, a = samples[0], b = samples[samples.length - 1];
      if (!still && a && b && b.t > a.t && e && e.timeStamp - b.t < 100) v =(b.az - a.az) / (b.t - a.t) * 1000;
      var to = goal.az + clamp(v * THROW, -REACH, REACH), dd = Math.abs(to - s.az);
      tween('az', to, clamp(Math.max(1 + dd / 200, 1.6 * dd / VMAX.az), 1, 1.8));
      if (goal.el !== null) tween('el', goal.el, 1);
    }
    function end(e) {
      delete points[e.pointerId];
      if (Object.keys(points).length < 2) pinch = null;
      if (drag && e.pointerId === drag.id) release(e);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Колесо с Ctrl (⌘) или щипок на тачпаде (браузер шлёт его как колесо с Ctrl): модель, а не масштаб страницы.
    // Колесо без Ctrl не трогаем — им листают страницу (Lenis).
    el.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomLead((goal.uz !== null ? goal.uz : tw.uz ? tw.uz.x1 : s.uz) * Math.exp(Math.max(-60, Math.min(60, dy)) * 0.0025));
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomStep(e.key === '-' || e.key === '_' ? 1.25 : 0.8);
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); interact();
      tween('az', (tw.az ? tw.az.x1 : s.az) + (e.key === 'ArrowLeft' ? 20 : -20), 0.8);
    });
    function update(dt) {
      KEYS.forEach(function (k) {
        var m = tw[k], g = goal[k];
        if (m) {
          m.t = Math.min(1, m.t + dt / m.d);
          var h = herm(m, m.t);
          s[k] = h.x; vel[k] = h.v;
          if (m.t >= 1) { s[k] = m.x1; vel[k] = 0; tw[k] = null; if (k === 'uz') zoomed(); }
          dirty = true;
        } else if (g !== null) {
          if (!dt) return;
          // пружина без раскачки — точное решение, устойчиво при любом шаге кадра (как glide.js); не быстрее VMAX
          var x0 = s[k], e0 = x0 - g, c = vel[k] + FOLLOW * e0, q = Math.exp(-FOLLOW * dt), vm = VMAX[k];
          vel[k] = clamp((vel[k] - FOLLOW * c * dt) * q, -vm, vm);
          s[k] = clamp(g + (e0 + c * dt) * q, x0 - vm * dt, x0 + vm * dt);
          var eps = k === 'uz' ? 1e-4 : 0.01;
          if (!(drag && drag.on) && !pinch && Math.abs(g - s[k]) < eps && Math.abs(vel[k]) < eps * 10) { s[k] = g; vel[k] = 0; goal[k] = null; }
          if (k === 'uz') zoomed();
          dirty = true;
        } else if (k === 'az' && auto && dt) { s.az += AUTO * dt; vel.az = AUTO; dirty = true; }
        else vel[k] = 0;
      });
      if (!dirty) return false;
      apply(); dirty = false;
      return true;
    }
    // Где будет камера через sec секунд (для стен: опускаются заранее, своим ходом 0,8 с — scene.js updateCut). Пока модель
    // ведут рукой — к месту руки (в начале рывка камера ещё стоит, а рука уже идёт) плюс ход камеры с её скоростью, но не
    // дальше, чем камера успеет (VMAX). Скорость самой руки не берётся (правка владельца 2026-10-21, L192): она скачет от
    // события к событию, прогноз уходил на 200° вперёд — и за один оборот опускались все стены
    function ahead(sec) {
      var o = {};
      KEYS.forEach(function (k) {
        var m = tw[k], g = goal[k];
        if (m) o[k] = herm(m, Math.min(1, m.t + sec / m.d)).x;
        else if (g !== null) o[k] = s[k] + clamp(g - s[k] + vel[k] * sec, -VMAX[k] * sec, VMAX[k] * sec);
        else o[k] = s[k] + vel[k] * sec;
      });
      o.el = clampEl(o.el); o.uz = clampUz(o.uz);
      var p = L.cameraPlan([s.tx, s.ty], o.az, o.el, fitFor(camera.fov, camera.aspect, o.el) * o.uz);
      return [p.x, p.y];
    }
    return {
      flyTo: flyTo, update: update, stopAuto: interact,
      zoomIn: function () { zoomStep(0.8); },
      zoomOut: function () { zoomStep(1.25); },
      uz: function () { return s.uz; },
      apply: function () { apply(); dirty = false; },
      // поля рамки, занятые кнопками и шапкой (доли ширины и высоты, 0…0,4): зал вписывается в остальное
      setInsets: function (i) {
        var c = function (v) { return Math.max(0, Math.min(0.4, v || 0)); };
        var nb = { x0: -1 + 2 * (MX + c(i.l)), x1: 1 - 2 * (MX + c(i.r)), y0: -1 + 2 * (MY + c(i.b)), y1: 1 - 2 * (MY + c(i.t)) };
        if (['x0', 'x1', 'y0', 'y1'].some(function (k) { return Math.abs(nb[k] - box[k]) > 1e-3; })) { box = nb; dirty = true; }
      },
      planPos: function () { return [camera.position.x + P.center[0], P.center[1] - camera.position.z]; },
      planAhead: ahead,
      // где камера встанет: конец перелёта или докрутки, пока ведут рукой — место руки (стена не встаёт, если камера идёт
      // туда, где стена снова к зрителю: при рывке она поднималась на 5 % и опускалась обратно — scene.js updateCut)
      planRest: function () {
        var o = {};
        KEYS.forEach(function (k) { o[k] = tw[k] ? tw[k].x1 : goal[k] !== null ? goal[k] : s[k]; });
        var p = L.cameraPlan([s.tx, s.ty], o.az, clampEl(o.el), fitFor(camera.fov, camera.aspect, clampEl(o.el)) * clampUz(o.uz));
        return [p.x, p.y];
      },
      handOn: function () { return !!(drag && drag.on) || !!pinch; },   // модель держат мышью или пальцами
      busy: moving,
      az: function () { return s.az; },
      el: function () { return s.el; },
      vel: function () { return { az: vel.az, el: vel.el, uz: vel.uz }; },
      // камера стоит в ракурсе вида v и в исходном масштабе (кнопка «Вернуть вид» тогда неактивна, ui.js)
      isAt: function (v) { return !moving() && Math.abs(L.nearestAngle(s.az, v.az) - s.az) < 0.5 && Math.abs(s.el - v.el) < 0.5 && Math.abs(s.uz - (v.uz != null ? v.uz : 1)) < 0.005; }
    };
  };
})(window);
