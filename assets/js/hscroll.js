// Слайды «Окна» — горизонтальная прокрутка, как «The concept» у ERA (ТЗ 5.4, решение владельца 2026-10-15).
// ≥1024 и с движением: экран слайдов закреплён (CSS sticky), лента из трёх экранов едет влево за колесом.
// Шаг ленты --slide-step (правки владельца 2026-10-15: тексты соседних слайдов не должны читаться одной группой,
// но и пустоты на пол-экрана между ними быть не должно): на остановке тексты соседних слайдов — на 16 px
// за краями окна (левый край фактов следующего и правый край текста предыдущего); пока лента едет, от текста до текста соседнего слайда — около двух отступов «фото — текст».
// Шаг считается по местам фактов слева (они шире или уже в зависимости от подписей) при каждом пересчёте ScrollTrigger.
// Высота прокрутки = 2 шага / 0,95: первые и последние 2,5 % — паузы;
// кривая horScroll (.25, 0, .75, 1), задержка следования 0,25 с. Листалка стоит на месте, тёмный отрезок полосы
// движется за прокруткой, стрелки прокручивают страницу к соседнему слайду за 1,2 с. Фото внутри рамки, пока слайд
// едет, чуть увеличено и сдвинуто (до 8 % и ±4 % ширины), в центре экрана — ровно кадр макета.
// Тексты всех трёх слайдов (название, подписи и значения слева, текст справа, кнопка — data-anim) появляются каждый сам,
// когда он вошёл в окно: снизу (слайд 1 и телефон) или справа (слайды 2 и 3 в ленте); несколько сразу — по очереди
// через 0,1 с (правка владельца 2026-10-15: на слайде 1 и справа анимации не было — текст справа появлялся за краем окна).
// Уже 1024 — обычная вертикальная прокрутка, появления те же.
(function () {
  var ARKA = window.ARKA || {};
  var pin = document.querySelector('[data-hscroll]');
  if (!pin || !ARKA.motion || !window.gsap) return;
  var gsap = window.gsap;
  var track = pin.querySelector('.windows__track');
  var slides = Array.prototype.slice.call(pin.querySelectorAll('.slide'));
  var current = pin.querySelector('.pager__current');
  var prev = pin.querySelector('[data-dir="-1"]');
  var next = pin.querySelector('[data-dir="1"]');
  var PAUSE = .025;
  var mm = gsap.matchMedia();

  // ---------- Появление текстов слайдов ----------
  var pending = Array.prototype.slice.call(pin.querySelectorAll('[data-anim]'));
  var ready = false;
  function check() {
    if (!ready || !pending.length) return;
    var W = window.innerWidth, H = window.innerHeight, n = 0;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return true;
      if (r.top < H * .85 && r.bottom > 0 && r.left < W * .92 && r.right > 0) { ARKA.reveal.play(el, n * .1); n++; return false; }
      return true;
    });
  }
  ARKA.windowsCheck = check;
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  if (ARKA.lenis) ARKA.lenis.on('scroll', check);
  // Буквы и строки считаются после загрузки шрифтов (как в motion.js)
  (ARKA.ready || Promise.resolve()).then(function () { ready = true; check(); });

  // ---------- Лента ----------
  mm.add('(min-width: 1024px)', function () {
    var step = pin.clientWidth;
    // Шаг на ширину окна считается один раз — первым замером с загруженными шрифтами, пока тексты слайдов ещё не разбиты
    // на строки для появления. После разбивки колонка фактов (width: max-content) становится уже — по самой длинной
    // строке, а не по всей подписи, — и шаг при следующем пересчёте ScrollTrigger (щелчок по вопросу, смена высоты
    // страницы) выходил на ~97 px короче: на 1024–1279 лента укорачивалась, и всё ниже прыгало вверх (2026-10-16, L126).
    var measured = {};
    function layout() {
      var w = pin.clientWidth;
      if (measured[w]) { step = measured[w]; pin.style.setProperty('--slide-step', step + 'px'); return; }
      // левый край фактов и правый край текста справа — в коробке слайда (ширина слайда = ширине окна)
      var minL = Math.min.apply(null, slides.map(function (s) { var f = s.querySelector('.slide__facts'); return f ? f.offsetLeft : 0; }));
      var maxR = Math.max.apply(null, slides.map(function (s) { var d = s.querySelector('.slide__desc'); return d ? d.offsetLeft + d.offsetWidth : 0; }));
      step = Math.round(Math.max(w - minL, maxR) + 16);
      if (!document.fonts || document.fonts.status === 'loaded') measured[w] = step;
      pin.style.setProperty('--slide-step', step + 'px');
    }
    layout();
    window.ScrollTrigger.addEventListener('refreshInit', layout);
    var slot = function () { return step; };
    var tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: frame });
    tl.to({}, { duration: PAUSE })
      .to(track, { x: function () { return -(track.scrollWidth - pin.clientWidth); }, duration: 1 - 2 * PAUSE, ease: window.CustomEase ? 'horScroll' : 'power1.inOut' }, PAUSE)
      .to(current, { xPercent: 200, duration: 1 - 2 * PAUSE, ease: window.CustomEase ? 'horScroll' : 'power1.inOut' }, PAUSE)
      .to({}, { duration: PAUSE });
    var st = window.ScrollTrigger.create({
      trigger: pin, start: 'top top', end: 'bottom bottom', animation: tl, scrub: .25, invalidateOnRefresh: true, onRefresh: frame
    });
    function frame() {
      var S = slot();
      var x = gsap.getProperty(track, 'x') || 0;
      slides.forEach(function (s, i) {
        var q = (i * S + x) / S;   // 1 — слайд справа за краем, 0 — в центре, −1 — ушёл влево
        var img = s.querySelector('.slide__photo img');
        if (img && q > -1.2 && q < 1.2) { var a = Math.min(1, Math.abs(q)); gsap.set(img, { xPercent: -q * 4, scale: 1 + .08 * a }); }
      });
      var idx = Math.round(-x / S);
      if (prev) prev.setAttribute('aria-disabled', String(idx <= 0));
      if (next) next.setAttribute('aria-disabled', String(idx >= slides.length - 1));
      check();
    }
    function go(dir) {
      var idx = Math.max(0, Math.min(slides.length - 1, Math.round(-(gsap.getProperty(track, 'x') || 0) / slot()) + dir));
      var p = PAUSE + (1 - 2 * PAUSE) * (idx / (slides.length - 1));   // кривая симметрична: середина ленты — середина прокрутки
      var y = st.start + (st.end - st.start) * p;
      ARKA.scrollTo(y, { duration: 1.2 });
    }
    function onClick(event) { var d = Number(event.currentTarget.getAttribute('data-dir')); if (event.currentTarget.getAttribute('aria-disabled') !== 'true') go(d); }
    if (prev) prev.addEventListener('click', onClick);
    if (next) next.addEventListener('click', onClick);
    ARKA.windowsSlide = function (i) { return st.start + (st.end - st.start) * (PAUSE + (1 - 2 * PAUSE) * (i / (slides.length - 1))); };
    return function () {
      if (prev) prev.removeEventListener('click', onClick);
      if (next) next.removeEventListener('click', onClick);
      window.ScrollTrigger.removeEventListener('refreshInit', layout);
      pin.style.removeProperty('--slide-step');
      st.kill(); tl.kill();
      gsap.set([track, current], { clearProps: 'transform' });
      slides.forEach(function (s) { gsap.set(s.querySelectorAll('.slide__photo img'), { clearProps: 'transform' }); });
    };
  });
})();
