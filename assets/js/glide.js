// Плавная лента вбок (правка владельца 2026-10-20, L178): «Фото» на всех ширинах и «Отзывы» на телефоне.
// Ленту двигает только эта анимация, а не встроенная прокрутка браузера: её защёлка (scroll-snap) и плавный scrollTo
// идут с той скоростью, которую задаёт браузер, и сильный рывок мышью или пальцем уносил ленту резко.
// — мышь и палец ведут ленту с мягким следованием (сильный рывок сглаживается, лента не скачет за курсором);
// — после отпускания лента катится по инерции и встаёт на ближайшее фото с торможением, 0,8–1 с;
//   сильное смахивание уводит не дальше двух фото;
// — стрелки и клавиши ← → — ход к соседнему фото 0,8–1 с с мягким разгоном и торможением, нажатия подряд не дёргают;
// — колесо с Shift и тачпад вбок — то же следование и та же доводка.
// «Уменьшение движения» — сразу на месте. Без JS — прежняя защёлка CSS.
(function () {
  var ARKA = window.ARKA = window.ARKA || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FOLLOW = 14;     // следование за мышью и пальцем — пружина без раскачки (рад/с): отставание ≈ 0,15 с, скорость без скачков
  var THROW = .25;     // инерция: куда лента докатилась бы за столько секунд со скоростью отпускания
  var VMAX = 2800;     // самая большая скорость ленты, px/с (и за рукой, и на ходу к фото)
  var REACH = 2;       // сильное смахивание — не дальше двух фото
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  ARKA.glide = function (el, o) {
    o = o || {};
    var api = { moved: false };
    var x = el.scrollLeft, vel = 0;
    var follow = null;     // куда ведут мышь, палец или колесо
    var tw = null;         // ход к фото: { x0, v0, x1, t0, d }
    var drag = null, raf = 0, last = 0, wheelT = 0, outT = 0;
    el.style.scrollSnapType = 'none';   // ленту ставит на фото анимация, а не защёлка браузера
    el.style.touchAction = 'pan-y';     // вбок ведёт палец через эту анимацию, вверх-вниз — страница

    function max() { return Math.max(0, el.scrollWidth - el.clientWidth); }
    function points() {
      if (o.points) return o.points();
      var pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      var base = el.getBoundingClientRect().left + el.clientLeft - el.scrollLeft + pad;
      return Array.prototype.map.call(el.children, function (c) { return clamp(c.getBoundingClientRect().left - base, 0, max()); });
    }
    function nearest(p, v) {
      var k = 0;
      for (var i = 1; i < p.length; i++) if (Math.abs(p[i] - v) < Math.abs(p[k] - v)) k = i;
      return k;
    }
    function shift(d) {   // бесконечная лента переставила ряд: всё, что знает анимация, сдвигается вместе
      x += d;
      if (follow !== null) follow += d;
      if (tw) { tw.x0 += d; tw.x1 += d; }
      if (drag) drag.left += d;
    }
    function put() {
      var s = o.wrap ? o.wrap(x, !tw && follow === null && !drag) : 0;
      if (s) shift(s);
      x = clamp(x, 0, max());
      el.scrollLeft = x;
    }
    function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
      last = now;
      var px = x;
      if (tw) {
        // кубическая кривая Эрмита: старт со скоростью ленты (без рывка), финиш в покое (торможение)
        if (tw.t0 === null) tw.t0 = now - dt * 1000;   // ход начинается с этого кадра — без шага назад и без стоп-кадра
        var t = Math.min(1, (now - tw.t0) / 1000 / tw.d);
        x = tw.x0 + tw.v0 * tw.d * (t - 2 * t * t + t * t * t) + (tw.x1 - tw.x0) * (3 * t * t - 2 * t * t * t);
        if (t >= 1) { x = tw.x1; tw = null; }
      } else if (follow !== null && reduce) {
        x = follow;
      } else if (follow !== null) {
        // за рукой — пружиной без раскачки (точное решение, устойчиво при любом шаге кадра) и не быстрее VMAX:
        // резкий рывок мышью или пальцем лента сглаживает, скорость нарастает и спадает без скачков
        var e = x - follow, c = vel + FOLLOW * e, k = Math.exp(-FOLLOW * dt);
        var nv = clamp((vel - FOLLOW * c * dt) * k, -VMAX, VMAX);
        x = clamp(follow + (e + c * dt) * k, px - VMAX * dt, px + VMAX * dt);
        vel = nv;
      }
      if (tw || follow === null || reduce) vel = (x - px) / dt;
      put();
      if (tw || drag || wheelT || (follow !== null && (Math.abs(follow - x) > .3 || Math.abs(vel) > 5))) { last = now; raf = requestAnimationFrame(frame); }
      else { follow = null; vel = 0; put(); }
    }

    // Ход к месту: v0 — скорость, с которой лента туда пошла (инерция отпускания), иначе — с места
    function go(to, v0) {
      to = clamp(to, 0, max());
      follow = null;
      v0 = clamp(v0 || 0, -VMAX, VMAX);
      var d = to - x;
      if (reduce || (Math.abs(d) < .5 && Math.abs(v0) < 30)) { tw = null; x = to; vel = 0; put(); return; }
      // 0,8–1 с; дальний ход (стрелки подряд) — дольше, чтобы скорость не выходила за VMAX
      var dur = clamp(Math.max(.8 + Math.abs(d) / 4000, 1.6 * Math.abs(d) / VMAX), .8, 2.4);
      if (Math.abs(v0) * dur > 3 * Math.abs(d)) v0 = (v0 > 0 ? 3 : -3) * Math.abs(d) / dur;   // без проскока мимо фото
      tw = { x0: x, v0: v0, x1: to, t0: null, d: dur };
      run();
    }
    // Отпустили (мышь, палец, колесо): ближайшее фото к месту, куда лента докатилась бы по инерции
    function settle(v) {
      var p = points();
      var from = follow !== null ? follow : x;
      var here = nearest(p, from);
      var k = clamp(nearest(p, from + clamp(v, -VMAX, VMAX) * THROW), here - REACH, here + REACH);
      // лента уже катится: место — не ближе её пути торможения, иначе она резко встанет или проскочит фото
      var dir = vel > 0 ? 1 : -1, need = Math.abs(vel) * .9 / 3;
      while (Math.abs(vel) > 30 && (p[k] - x) * dir >= -1 && (p[k] - x) * dir < need && p[k + dir] !== undefined && Math.abs(k + dir - here) <= REACH + 1) k += dir;
      go(p[k], vel);
    }
    api.step = function (dir) {
      var p = points();
      var base = tw ? tw.x1 : x, target = null;
      for (var i = 0; i < p.length; i++) {
        if (dir > 0 && p[i] > base + 4) { target = p[i]; break; }
        if (dir < 0 && p[i] < base - 4) target = p[i];
      }
      if (target !== null) go(target, vel);
    };
    api.to = function (left) { go(left, vel); };
    api.set = function (left) { tw = null; follow = null; vel = 0; x = left; put(); };   // мгновенно (смена ширины окна)
    api.x = function () { return x; };

    // Мышь и палец
    var samples = [];
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (max() < 1) return;   // ряд помещается целиком — лента не листается (отзывы на компьютере)
      tw = null;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: x, on: false, touch: e.pointerType === 'touch' };
      follow = x; api.moved = false;
      samples = [{ t: e.timeStamp, x: e.clientX }];
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { end(e); return; }   // кнопку отпустили там, где pointerup не пришёл
      var dx = e.clientX - drag.x;
      if (!drag.on && Math.abs(dx) > 5) {
        if (e.pointerType !== 'mouse' && Math.abs(e.clientY - drag.y) > Math.abs(dx)) { end(e, true); return; }   // палец листает страницу
        drag.on = true; api.moved = true; el.classList.add('is-dragging');
      }
      if (!drag.on) return;
      follow = drag.left - dx;
      samples.push({ t: e.timeStamp, x: e.clientX });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
      run();
    });
    function end(e, quiet) {
      if (!drag) return;
      var on = drag.on;
      drag = null;
      el.classList.remove('is-dragging');
      if (quiet || !on) { if (!tw) settle(0); return; }
      // скорость пальца за последние 0,1 с; рука остановилась перед отпусканием — без инерции
      var a = samples[0], b = samples[samples.length - 1], v = 0;
      if (e && b && e.timeStamp - b.t < 80 && b.t > a.t) v = -(b.x - a.x) / ((b.t - a.t) / 1000);
      settle(v);
    }
    window.addEventListener('pointerup', function (e) { if (drag && e.pointerId === drag.id) end(e); });
    window.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) end(e, !drag.on); });
    window.addEventListener('blur', function () { end(null); });
    // палец отпущен, а pointerup не дошёл (жест перехватила система) — лента всё равно встаёт на фото
    el.addEventListener('lostpointercapture', function (e) { if (drag && e.pointerId === drag.id) end(e, !drag.on); });
    window.addEventListener('touchend', function (e) { if (drag && drag.touch && !e.touches.length) end(e, !drag.on); });
    window.addEventListener('touchcancel', function (e) { if (drag && drag.touch) end(e, !drag.on); });

    // Колесо с Shift и тачпад вбок; вертикальное колесо листает страницу, как раньше
    el.addEventListener('wheel', function (e) {
      if (e.ctrlKey || max() < 1) return;
      var dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      if (Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.deltaMode === 1) dx *= 40; else if (e.deltaMode === 2) dx *= el.clientWidth;
      tw = null;
      follow = (follow !== null ? follow : x) + dx;
      clearTimeout(wheelT);
      wheelT = setTimeout(function () { wheelT = 0; settle(0); }, 160);
      run();
    }, { passive: false });

    // Ленту сдвинул кто-то другой (фокус Tab, поиск по странице): принять место и плавно встать на фото
    el.addEventListener('scroll', function () {
      if (raf || drag || Math.abs(el.scrollLeft - x) < 2) return;
      x = el.scrollLeft; tw = null; follow = null;
      clearTimeout(outT);
      outT = setTimeout(function () { if (!raf && !drag) settle(0); }, 140);
    }, { passive: true });

    window.addEventListener('resize', function () { if (!raf && !drag) { x = clamp(el.scrollLeft, 0, max()); } });
    return api;
  };

  // «Отзывы»: на телефоне и планшете карточки — лента вбок (home.css), на компьютере — сетка, анимация не включается.
  // На планшете (768–1023) у ленты стрелки и полоса хода (правка владельца 2026-10-20: «карточки реализуй в виде слайдера»)
  var reviews = document.querySelector('[data-reviews]');
  if (reviews) {
    var rg = ARKA.glide(reviews);
    var rPrev = document.querySelector('[data-reviews-dir="-1"]'), rNext = document.querySelector('[data-reviews-dir="1"]');
    var rCur = document.querySelector('[data-reviews-current]');
    var rSync = function () {
      var m = reviews.scrollWidth - reviews.clientWidth;
      var p = m > 1 ? Math.min(1, Math.max(0, reviews.scrollLeft / m)) : 0;
      if (rCur) rCur.style.transform = 'translateX(' + (p * 200) + '%)';
      if (rPrev) rPrev.setAttribute('aria-disabled', String(m < 1 || reviews.scrollLeft < 4));
      if (rNext) rNext.setAttribute('aria-disabled', String(m < 1 || reviews.scrollLeft > m - 4));
    };
    [rPrev, rNext].forEach(function (b) {
      if (b) b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') !== 'true') rg.step(Number(b.getAttribute('data-reviews-dir'))); });
    });
    reviews.addEventListener('scroll', rSync, { passive: true });
    window.addEventListener('resize', rSync);
    rSync();
  }
})();
