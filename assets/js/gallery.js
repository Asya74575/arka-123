// Галерея «Фото» (ТЗ 5.7): лента фото 890 + 435 + 435 через 20, листается стрелками, свайпом и перетаскиванием мышью;
// лента бесконечная: за последним фото снова идёт первое, в обе стороны (правка владельца 2026-10-15);
// тёмный отрезок полосы показывает, где вы в ряду, и идёт по кругу. Щелчок по фото — просмотр на весь экран с листанием
// (стрелки, клавиши ← →, свайп; закрывают крестик, Esc, щелчок по фону). Без JS лента листается сама, фото открывается файлом.
(function () {
  var root = document.querySelector('[data-gallery]');
  if (!root) return;
  var track = root.querySelector('[data-gallery-track]');
  var items = Array.prototype.slice.call(track.querySelectorAll('[data-gallery-item]'));
  var current = root.querySelector('[data-gallery-current]');
  var prev = root.querySelector('[data-gallery-dir="-1"]');
  var next = root.querySelector('[data-gallery-dir="1"]');

  // ---------- Лента: бесконечная ----------
  // Перед рядом фото и после него — по копии всего ряда (без data-gallery-item, скрыты от диктора и Tab).
  // Лента стоит в среднем ряду; когда прокрутка остановилась за его краем, лента мгновенно встаёт на то же место
  // в среднем ряду — кадр не меняется, поэтому перескока не видно, и листать можно сколько угодно в обе стороны.
  var n = items.length;
  function copies() {
    var f = document.createDocumentFragment();
    items.forEach(function (a) {
      var c = a.cloneNode(false);
      c.removeAttribute('data-gallery-item');
      c.setAttribute('data-gallery-copy', '');
      c.setAttribute('aria-hidden', 'true');
      c.tabIndex = -1;
      // картинка копии — новая и без адреса до вставки: склонированная вне страницы грузится сразу, мимо loading="lazy"
      Array.prototype.forEach.call(a.querySelectorAll('img'), function (src) {
        var img = document.createElement('img');
        ['class', 'width', 'height', 'alt', 'sizes', 'loading', 'decoding'].forEach(function (k) { if (src.hasAttribute(k)) img.setAttribute(k, src.getAttribute(k)); });
        img.setAttribute('data-src', src.getAttribute('src'));
        if (src.hasAttribute('srcset')) img.setAttribute('data-srcset', src.getAttribute('srcset'));
        c.appendChild(img);
      });
      f.appendChild(c);
    });
    return f;
  }
  track.insertBefore(copies(), items[0]);
  track.appendChild(copies());
  Array.prototype.forEach.call(track.querySelectorAll('img[data-src]'), function (img) {
    if (img.hasAttribute('data-srcset')) img.setAttribute('srcset', img.getAttribute('data-srcset'));
    img.setAttribute('src', img.getAttribute('data-src'));
  });
  var all = Array.prototype.slice.call(track.querySelectorAll('.gallery__item'));   // копия · ряд · копия

  // Фото ленты грузятся, когда галерея подходит к экрану (за экран до неё): в бесконечной ленте за краем всегда
  // стоит следующее фото — пустой рамки при листании быть не должно. Копии берут те же файлы, лишних загрузок нет.
  function eager() { Array.prototype.forEach.call(track.querySelectorAll('img'), function (img) { img.loading = 'eager'; }); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { eager(); io.disconnect(); }
    }, { rootMargin: '100% 0px' });
    io.observe(root);
  } else eager();

  // Места фото: P[i] — scrollLeft, при котором фото i стоит у левого поля; S — начало среднего ряда, W — длина ряда
  var P = [], S = 0, W = 0;
  function geo() {
    var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    var base = track.getBoundingClientRect().left + track.clientLeft - track.scrollLeft + pad;
    P = all.map(function (a) { return a.getBoundingClientRect().left - base; });
    S = P[n]; W = P[n] - P[0];
  }
  function nearest(x) {
    var best = 0, d = 1e9;
    for (var i = 0; i < P.length; i++) if (Math.abs(P[i] - x) < d) { d = Math.abs(P[i] - x); best = i; }
    return best;
  }

  // Полоса хода по кругу: отрезок в треть полосы едет вправо, у края уходит и тут же входит слева (вторая копия)
  var bars = [];
  if (current) {
    var twin = current.cloneNode(false);
    twin.removeAttribute('data-gallery-current');
    current.parentNode.appendChild(twin);
    bars = [current, twin];
  }
  function progress() {
    var p = W > 0 ? (((track.scrollLeft - S) % W) + W) % W / W : 0;
    if (bars.length) {
      bars[0].style.transform = 'translateX(' + (p * 300).toFixed(2) + '%)';
      bars[1].style.transform = 'translateX(' + ((p - 1) * 300).toFixed(2) + '%)';
    }
  }

  // Ход ленты — плавная анимация glide.js (правка владельца 2026-10-20, L178): мышь, палец, колесо вбок, стрелки и клавиши
  // двигают ленту с мягким следованием, инерцией и торможением, а не встроенной прокруткой браузера.
  // Бесконечность: лента, ушедшая за средний ряд, встаёт на то же место в нём — кадр не меняется;
  // на ходу — в пределах полуряда от середины, в покое — внутри среднего ряда.
  var g = window.ARKA && window.ARKA.glide ? window.ARKA.glide(track, {
    points: function () { geo(); return P; },
    wrap: function (x, rest) {
      if (!W) return 0;
      var lo = rest ? S - 1 : S - W / 2, hi = rest ? S + W - 1 : S + W / 2;
      return x < lo ? W : x > hi ? -W : 0;
    }
  }) : null;
  function step(dir) { if (g) g.step(dir); }

  if (prev) prev.addEventListener('click', function () { step(-1); });
  if (next) next.addEventListener('click', function () { step(1); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(progress); }, { passive: true });
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;   // на телефоне меняется только высота (строка адреса) — ленту не трогаем
    lastW = window.innerWidth;
    var k = nearest(track.scrollLeft) % n;      // то же фото у левого поля после смены ширины
    geo();
    if (g) g.set(P[n + k]); else track.scrollLeft = P[n + k];
    progress();
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  geo();
  if (g) g.set(S); else track.scrollLeft = S;
  progress();

  // Своё перетаскивание браузера (ссылка и картинка) выключено: оно отменяло указатель без pointerup,
  // и лента «прилипала» к курсору без нажатой кнопки (правка владельца 2026-10-15)
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });
  all.forEach(function (a) { a.draggable = false; Array.prototype.forEach.call(a.querySelectorAll('img'), function (img) { img.draggable = false; }); });
  // щелчок после перетаскивания фото не открывает; Enter с клавиатуры (detail = 0) — открывает всегда
  var moved = false;
  track.addEventListener('click', function (e) { moved = !!(e.detail && g && g.moved); }, true);

  // ---------- Просмотр фото с листанием ----------
  var CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
  var L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none"/></svg>';
  var R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" fill="none"/></svg>';
  var viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Фото зала');
  viewer.setAttribute('data-lenis-prevent', '');
  viewer.innerHTML = '<img class="viewer__img" alt="">' +
    '<div class="viewer__bar"><button class="viewer__btn" type="button" data-v="-1" aria-label="Предыдущее фото">' + L + '</button>' +
    '<span class="viewer__count t-body" aria-live="polite"></span>' +
    '<button class="viewer__btn" type="button" data-v="1" aria-label="Следующее фото">' + R + '</button></div>' +
    '<button class="viewer__close" type="button" aria-label="Закрыть фото">' + CLOSE + '</button>';
  document.body.appendChild(viewer);
  var vImg = viewer.querySelector('.viewer__img');
  var vCount = viewer.querySelector('.viewer__count');
  var index = 0, opener = null;
  function lenis() { return window.ARKA && window.ARKA.lenis; }
  function show(i) {
    index = (i + items.length) % items.length;
    var a = items[index], thumb = a.querySelector('img');
    vImg.src = a.getAttribute('href');
    vImg.alt = thumb ? thumb.alt : '';
    vCount.textContent = (index + 1) + ' / ' + items.length;
  }
  function open(i, from) {
    opener = from;
    show(i);
    viewer.classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    if (lenis()) lenis().stop();
    viewer.querySelector('.viewer__close').focus({ preventScroll: true });
  }
  function close() {
    if (!viewer.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    if (lenis()) lenis().start();
    if (opener) opener.focus({ preventScroll: true });
  }
  all.forEach(function (a, i) {   // копия открывает своё фото; фокус после закрытия — на настоящее фото ряда
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (moved) return;   // это было перетаскивание, а не щелчок
      open(i % n, items[i % n]);
    });
  });
  viewer.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v]');
    if (b) { show(index + Number(b.getAttribute('data-v'))); return; }
    if (e.target.closest('.viewer__close') || e.target === viewer) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!viewer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'Tab') {
      var f = Array.prototype.slice.call(viewer.querySelectorAll('button'));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var tx = null;
  viewer.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });
})();
