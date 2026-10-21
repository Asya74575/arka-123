// Движение (TZ-VERSTKA.md, раздел 3): прокрутка с инерцией Lenis и общие появления по атрибутам.
// Приёмы и значения — из кода era-residence.com (animateTextH / P / A, animateCtn, animateLine, circle-text; правка владельца
// 2026-10-15: «у всех текстов есть анимация, анимации разные, плавные, лёгкие»):
//   data-anim="chars"  — заголовок по буквам: буква поднимается на полвысоты, поворачивается из 90° и проявляется
//                        (1,2 с; шаг 0,05 с, вся волна не дольше 0,9 с — у нас заголовки длиннее, чем у ERA);
//   data-anim="accent" — крупная надпись по буквам: буква въезжает справа и откидывается из 90° по горизонтальной оси
//                        (1,2 с, волна не дольше 1,2 с) — приём «рукописного» слова ERA;
//   data-anim="lines"  — абзацы, подписи, значения: по строкам из-под маски (1,2 с, шаг 0,1 с);
//   data-anim="rise"   — кнопки, карточки, пункты: проявление и подъём на 64 px макета (1,2 с, шаг 0,1 с в группе);
//   data-anim="line"   — вертикальная линия прорисовывается сверху вниз (1,2 с); "line-x" — горизонтальная, слева направо;
//   data-anim="arc"    — надпись по дуге арки: слова расходятся, пока арка проходит экран (word-spacing за прокруткой);
//   data-anim-group    — элементы с data-anim внутри стартуют вместе, когда группа вошла в окно, по очереди через 0,1 с;
//   data-parallax      — фото внутри рамки на 30 % выше рамки и сдвигается от −15 % до +15 %, пока рамка проходит экран.
// Старт — когда верх элемента на 85 % высоты окна, один раз. Элементы внутри [data-anim-manual] запускает свой скрипт.
// «Уменьшение движения» или нет GSAP — всё сразу на месте, прокрутка обычная (класс no-motion).
(function () {
  var html = document.documentElement;
  var ARKA = window.ARKA = window.ARKA || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;

  // ---------- Ссылки на разделы этой же страницы (шапка, меню, подвал) — плавно к блоку, без перезагрузки и заставки ----------
  // Правка владельца 2026-10-16: страница, открытая адресом «…/site/», и ссылка «…/site/index.html#раздел» — одна страница
  // (раньше сравнивался путь целиком: браузер перезагружал главную, и заставка шла заново). Меню — menu.js, тот же PAGE.
  var PAGE = ARKA.pageKey = function (p) { return String(p).replace(/\/index\.html$/i, '/'); };
  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a[href*="#"]');
    if (!a || a.hasAttribute('data-rent') || a.hasAttribute('data-menu-open') || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin || PAGE(u.pathname) !== PAGE(location.pathname) || u.search !== location.search && u.search) return;
    if (!u.hash || u.hash.length < 2) return;
    var target = document.getElementById(decodeURIComponent(u.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    ARKA.scrollTo(target);
    history.replaceState(null, '', location.pathname + location.search + u.hash);
  });

  if (reduce || !gsap || !window.ScrollTrigger) {
    html.classList.remove('js-anim', 'show-loader');
    html.classList.add('no-motion');
    ARKA.motion = false;
    ARKA.scrollTo = function (target) { var el = typeof target === 'string' ? document.querySelector(target) : target; if (el) el.scrollIntoView(); };
    return;
  }
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  if (window.CustomEase) {
    gsap.registerPlugin(window.CustomEase);
    window.CustomEase.create('arkaOut', '.25,1,.5,1');
    window.CustomEase.create('arkaInOut', '.75,0,.25,1');
    window.CustomEase.create('arkaIn', '.5,0,.75,0');
    window.CustomEase.create('horScroll', '.25,0,.75,1');
  }
  var OUT = window.CustomEase ? 'arkaOut' : 'power3.out';
  ARKA.easeOut = OUT;
  ARKA.motion = true;
  html.classList.add('has-motion');

  // ---------- Заставка — с первого экрана целиком ----------
  // Правка владельца 2026-10-16 («белая полоса внизу, первый экран должен быть показан полностью»): после «Обновить» браузер
  // возвращал прежнюю прокрутку, а пока идёт заставка, страница заперта (is-locked) и первый экран не держится сверху —
  // он уезжал вверх, снизу выходили фон и арка второго блока. С заставкой страница всегда начинается с самого верха.
  // Через ScrollTrigger.clearScrollMemory: ScrollTrigger после каждого пересчёта возвращает браузеру своё запомненное «auto»,
  // и браузер после загрузки восстанавливал прокрутку снова.
  // Адрес с разделом (index.html#раздел) при заставке — тоже с первого экрана: якорь убирается из адреса, иначе браузер
  // прыгает к нему до конца загрузки.
  var withLoader = html.classList.contains('show-loader');
  if (withLoader) {
    window.ScrollTrigger.clearScrollMemory('manual');
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    window.addEventListener('load', function () { if (html.classList.contains('show-loader') && window.scrollY) window.scrollTo(0, 0); });
  }

  // ---------- Lenis: длительность 1,2 с, кривая min(1, 1.001 − 2^(−10t)); тачпад и палец — родные ----------
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    ARKA.lenis = lenis;
  }
  // Переход к разделу (пункты меню, шапки и подвала, логотип наверх): мягкий разгон и мягкая остановка, время — от пути
  // (правка владельца 2026-10-21: «анимация скролла до нужного блока резкая, дерганая… на плавную, лёгкую»). Кривая колеса
  // (старт 2^(−10t)) на путь в 12–23 тыс. px пролетала половину пути за 0,1 с — по 3–4,5 тыс. px за кадр, — и потом долго
  // доползала. Теперь — синусоида: на экран 1,2 с, на всю страницу 2 с (в середине пути — около 0,3 экрана за кадр).
  // С заданной длительностью (шаги ленты «О лофте», hscroll.js) — прежняя кривая.
  var glide = function (t) { return (1 - Math.cos(Math.PI * t)) / 2; };
  ARKA.scrollTo = function (target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    opts = opts || {};
    if (lenis) {
      var to = null;
      if (opts.duration == null && !opts.immediate) {
        var pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
        var path = el && el.getBoundingClientRect ? el.getBoundingClientRect().top - pad : (Number(target) || 0) - lenis.animatedScroll;
        var screens = Math.abs(path) / (window.innerHeight || 1);
        to = Math.max(0, Math.min(lenis.limit, lenis.animatedScroll + path));   // где встанет страница — для появлений (passed ниже)
        opts = Object.assign({ duration: Math.max(1.2, Math.min(2, .9 + .25 * Math.sqrt(screens))), easing: glide }, opts);
      }
      lenis.scrollTo(el != null ? el : target, Object.assign({ duration: 1.2, offset: 0, userData: { glide: opts.easing === glide, to: to } }, opts));
    } else if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' });
  };
  // Пока страница едет к разделу, 3D-карта и 3D-модель зала не собираются (fly.js, room3d-loader.js): сборка сцены и шейдеров —
  // 0,3–0,6 с, на столько замирал кадр, и страница перескакивала на тысячи px. После остановки (или если переход прервали
  // колесом — Lenis тогда сбрасывает userData) они снова смотрят, близко ли блок: блок el виден хотя бы на четверть окна и
  // не закрыт (арка «Форматов» лежит поверх 3D-модели) — сразу, иначе — когда отыграло появление раздела, к которому
  // приехали (буквы заголовка — до 2,1 с), чтобы сборка не останавливала его.
  ARKA.gliding = function () { return !!(lenis && lenis.isScrolling === 'smooth' && lenis.userData && lenis.userData.glide); };
  var afterGlide = [];
  ARKA.afterGlide = function (fn, el) { if (ARKA.gliding()) afterGlide.push([fn, el]); else fn(); };
  function seen(el) {
    var r = el.getBoundingClientRect(), h = window.innerHeight, top = Math.max(r.top, 0), bottom = Math.min(r.bottom, h);
    if (bottom - top <= h / 4) return false;
    var hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1), (top + bottom) / 2);
    return !hit || el.contains(hit);
  }
  if (lenis) gsap.ticker.add(function () {
    if (!afterGlide.length || ARKA.gliding()) return;
    var list = afterGlide; afterGlide = [];
    list.forEach(function (it) { if (!it[1] || seen(it[1])) it[0](); else setTimeout(it[0], 2000); });
  });

  // ---------- Появления ----------
  var U = function () { return Math.min(document.body.clientWidth, 2560) / 1920; };
  function manual(el) { return !!el.closest('[data-anim-manual]'); }
  ARKA.reveal = {};
  // Разбивка заголовка на буквы. Слова делятся только по обычному пробелу: неразрывный пробел (предлог + слово, «м²»)
  // держит слова вместе. Буквы в отдельных блоках теряют кернинг шрифта — строка становится шире макета на 1–2 %;
  // поэтому до разбивки запоминаются места букв, а после — каждой букве возвращается её кернинг (отступ в em).
  ARKA.splitChars = function (el) {
    if (el._split) return el._split;
    var before = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var node, range = document.createRange();
    while ((node = walker.nextNode())) {
      for (var i = 0; i < node.data.length; i++) {
        if (/\s/.test(node.data[i])) { before.push(null); continue; }
        range.setStart(node, i); range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect();
        before.push({ x: r.left, y: r.top });
      }
    }
    var split = el._split = new window.SplitText(el, { type: 'words,chars', wordsClass: 'w', charsClass: 'c', wordDelimiter: ' ', reduceWhiteSpace: false });
    var orig = [];
    var k, prevGap = false;
    before.forEach(function (b) { if (b) { orig.push({ x: b.x, y: b.y, afterGap: prevGap }); prevGap = false; } else prevGap = true; });
    var chars = split.chars;
    if (chars.length !== orig.length) return split;
    var size = parseFloat(getComputedStyle(el).fontSize) || 16;
    var now = chars.map(function (c) { return c.getBoundingClientRect().left; });
    for (k = 1; k < chars.length; k++) {
      if (orig[k].afterGap || Math.abs(orig[k].y - orig[k - 1].y) > 2 || chars[k].parentNode !== chars[k - 1].parentNode) continue;
      var delta = (orig[k].x - orig[k - 1].x) - (now[k] - now[k - 1]);
      if (Math.abs(delta) > .05) chars[k].style.marginLeft = (delta / size).toFixed(4) + 'em';
    }
    return split;
  };
  ARKA.reveal.chars = function (el, opts) {
    if (!window.SplitText) return gsap.to(el, { opacity: 1, duration: .8 });
    var split = ARKA.splitChars(el);
    gsap.set(el, { opacity: 1 });
    var step = Math.min(.05, .9 / Math.max(1, split.chars.length));
    return gsap.fromTo(split.chars, { yPercent: 50, rotateY: 90, opacity: 0, transformPerspective: 600 }, Object.assign({ yPercent: 0, rotateY: 0, opacity: 1, duration: 1.2, ease: OUT, stagger: step }, opts || {}));
  };
  // Крупная надпись (ERA animateTextA): буква въезжает справа на 10 % ширины окна и откидывается из 90° по оси X
  ARKA.reveal.accent = function (el, opts) {
    if (!window.SplitText) return gsap.to(el, { opacity: 1, duration: .8 });
    var split = ARKA.splitChars(el);
    gsap.set(el, { opacity: 1 });
    var step = Math.min(.1, 1.2 / Math.max(1, split.chars.length));
    return gsap.fromTo(split.chars, { opacity: 0, rotateX: 90, x: 192 * U(), transformOrigin: '50% 100%', transformPerspective: 600 }, Object.assign({ opacity: 1, rotateX: 0, x: 0, duration: 1.2, ease: OUT, stagger: step }, opts || {}));
  };
  // Строки считаются с неразрывными пробелами: предлог не остаётся в конце строки, тире — в начале
  ARKA.reveal.lines = function (el, opts) {
    if (!window.SplitText) return gsap.to(el, { opacity: 1, duration: .8 });
    var split = el._split || (el._split = new window.SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'ln', wordsClass: 'lw', wordDelimiter: ' ', reduceWhiteSpace: false }));
    gsap.set(el, { opacity: 1 });
    return gsap.fromTo(split.lines, { yPercent: 110 }, Object.assign({ yPercent: 0, duration: 1.2, ease: OUT, stagger: .1 }, opts || {}));
  };
  // Подъём (ERA animateCtn): 3,333rem на компьютере = 64 px макета, 11,54 % ширины на телефоне и планшете
  var riseY = function () { var w = document.body.clientWidth; return w >= 1024 ? 64 * U() : .1154 * w; };
  ARKA.reveal.rise = function (els, opts) {
    return gsap.fromTo(els, { y: riseY(), opacity: 0 }, Object.assign({ y: 0, opacity: 1, duration: 1.2, ease: OUT, stagger: .1 }, opts || {}));
  };
  ARKA.reveal.line = function (el, opts) {
    return gsap.fromTo(el, { scaleY: 0, transformOrigin: '50% 0%' }, Object.assign({ scaleY: 1, opacity: 1, duration: 1.2, ease: OUT }, opts || {}));
  };
  ARKA.reveal['line-x'] = function (el, opts) {
    return gsap.fromTo(el, { scaleX: 0, transformOrigin: '0% 50%' }, Object.assign({ scaleX: 1, opacity: 1, duration: 1.2, ease: OUT }, opts || {}));
  };
  // Один элемент по его data-anim; delay — место в группе
  ARKA.reveal.play = function (el, delay) {
    var f = ARKA.reveal[el.getAttribute('data-anim')];
    if (typeof f === 'function') f(el, delay ? { delay: delay } : undefined);
  };
  // Пройденное на лету при переходе к разделу (ARKA.scrollTo) появляется сразу, без анимации: к остановке оно уже за краем
  // окна, а появления всех пройденных заголовков — сотни анимаций по буквам разом — занимали каждый кадр пути, и с первого
  // экрана страница шла рывками по 300–800 px (правка владельца 2026-10-21: «в хедере херо блок осталась резкая анимация»).
  // Анимация остаётся у того, что после остановки будет в окне.
  function passed(el) {
    var to = ARKA.gliding() ? lenis.userData.to : null;
    if (to == null) return false;
    var r = el.getBoundingClientRect(), top = r.top + lenis.animatedScroll;
    return top > to + window.innerHeight || top + r.height < to;
  }
  var SHOWN = { line: { scaleY: 1, opacity: 1 }, 'line-x': { scaleX: 1, opacity: 1 } };
  function show(el) { gsap.set(el, SHOWN[el.getAttribute('data-anim')] || { opacity: 1 }); }
  function once(el, play, items) {
    window.ScrollTrigger.create({ trigger: el, start: 'clamp(top 85%)', once: true, onEnter: function () {   // clamp: элементы в самом низу страницы тоже появляются
      if (passed(el)) (items || [el]).forEach(show); else play();
    } });
  }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function start() {
    var grouped = [];
    all('[data-anim-group]').forEach(function (g) {
      if (manual(g)) return;
      var items = all('[data-anim]', g).filter(function (el) { return el.getAttribute('data-anim') !== 'arc' && el.closest('[data-anim-group]') === g; });
      grouped = grouped.concat(items);
      once(g, function () { items.forEach(function (el, i) { ARKA.reveal.play(el, i * .1); }); }, items);
    });
    var free = function (el) { return !manual(el) && grouped.indexOf(el) < 0; };
    all('[data-anim="chars"], [data-anim="accent"], [data-anim="lines"], [data-anim="line"], [data-anim="line-x"]').filter(free).forEach(function (el) { once(el, function () { ARKA.reveal.play(el); }); });
    var rise = all('[data-anim="rise"]').filter(free);
    if (rise.length) window.ScrollTrigger.batch(rise, { start: 'clamp(top 85%)', once: true, onEnter: function (batch) {
      var play = batch.filter(function (el) { if (!passed(el)) return true; show(el); return false; });
      if (play.length) ARKA.reveal.rise(play);
    } });
    // Надпись по дуге (ERA, circle-text): слова расходятся, пока шапка арки проходит экран; data-spread — размах в единицах рисунка
    // при исходном кегле. Разлёт — в em: уже 1024 кегль надписи задан в px (arch.js, data-fs0 — исходный), слова расходятся в той же
    // мере от кегля, а не на прежние единицы рисунка (2026-10-21, arka-123-74)
    all('[data-anim="arc"]').forEach(function (svg) {
      var text = svg.querySelector('text');
      if (!text || manual(svg)) return;
      var head = svg.closest('.windows__head, .ahead') || svg;
      var em = (Number(svg.getAttribute('data-spread')) || 60) / (parseFloat(text.getAttribute('data-fs0') || text.getAttribute('font-size')) || 52);
      gsap.fromTo(text, { wordSpacing: '0em' }, { wordSpacing: em + 'em', ease: 'none', scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });
    // data-speed — коллаж «Форматов»: карточки и кадр идут с разной скоростью (−8 %, 0, +8 % за проход блока, ERA)
    Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (el) {
      var sp = Number(el.getAttribute('data-speed')) || 0;
      if (!sp || manual(el)) return;
      window.gsap.matchMedia().add('(min-width: 1280px)', function () {   // коллаж — только в раскладке макета
        var tw = gsap.fromTo(el, { yPercent: sp / 2 }, { yPercent: -sp / 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .5 } });
        return function () { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(el, { clearProps: 'transform' }); };
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-parallax]'), function (frame) {
      var img = frame.querySelector('img, video');
      if (!img || manual(frame)) return;
      frame.classList.add('is-parallax');
      gsap.fromTo(img, { yPercent: -11.54 }, { yPercent: 11.54, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });
  }
  // Буквы считаются после загрузки шрифтов: иначе SplitText режет строки по запасному шрифту
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ARKA.ready = fontsReady.then(function () { start(); window.ScrollTrigger.refresh(); });
  ARKA.motionReady = true;
  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  // Высота страницы изменилась уже после расчёта (подменились стили, блок вырос или стал ниже) — места появлений
  // и закреплений пересчитываются. Без этого появления запускались по старым местам: на странице, ставшей ниже,
  // нижняя строка подвала ждала места прокрутки, которого больше нет, и не появлялась; на ставшей выше — метки
  // арки «Аренда» проигрывались ещё за краем окна (правки владельца 2026-10-16: «в футере пропала информация»,
  // «отсутствует анимация в элементах», L126). Пересчёт сам меняет высоту (поля закреплений) — её и запоминаем.
  // Пересчёт — только когда прокрутка стоит: посреди плавной прокрутки (ссылка меню, пока по дороге грузится 3D-модель
  // и под ней появляются кнопки видов) он сбивал точку остановки — блок вставал на 86–97 px выше шапки.
  if ('ResizeObserver' in window) {
    var doc = document.documentElement, measuredH = 0, refreshTimer = 0;
    var moving = function () { return !!(lenis && lenis.isScrolling) || html.classList.contains('is-locked'); };
    var later = function () {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        if (Math.abs(doc.scrollHeight - measuredH) < 2) return;
        if (moving()) { later(); return; }
        window.ScrollTrigger.refresh();
      }, 300);
    };
    window.ScrollTrigger.addEventListener('refresh', function () { measuredH = doc.scrollHeight; });
    new ResizeObserver(function () {
      if (measuredH && Math.abs(doc.scrollHeight - measuredH) >= 2) later();
    }).observe(document.body);
  }

  // Пришли с другой страницы сайта (index.html#раздел или index.html, заставки нет — строка в <head> index.html):
  // сразу к блоку, когда закрепления собраны (браузер прыгает к якорю раньше, чем появляются отступы закреплений).
  // Переход идёт под фоном арок (pt-cover, menu.js; правка владельца 2026-10-19: «„Как добраться“ — ужасная прыгающая
  // и резкая анимация»): пока страница грузится и закрепления пересчитываются, раздел встаёт на место под фоном —
  // два раза, по шрифтам и после загрузки страницы (не дольше 2,5 с), — и только потом фон уходит за 0,8 с.
  // Заголовок первого экрана (intro.js) ждёт ARKA.arrived — проявляется, когда фон ушёл.
  var covered = html.classList.contains('pt-cover');
  var arrive = !withLoader && location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (arrive && arrive.closest('.rent')) arrive = null;
  var arrived;
  ARKA.arrived = covered ? new Promise(function (res) { arrived = res; }) : Promise.resolve();
  if (arrive || covered) {
    var moved = false;
    var stopArrive = function () { moved = true; };
    window.addEventListener('wheel', stopArrive, { passive: true, once: true });
    window.addEventListener('touchstart', stopArrive, { passive: true, once: true });
    var go = function () { if (!moved || covered) ARKA.scrollTo(arrive || 0, { immediate: true, force: true }); };
    if (!covered) {
      ARKA.ready.then(go);
      window.addEventListener('load', function () { setTimeout(go, 60); });
    } else {
      if (lenis) lenis.stop();
      var wait = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };
      var loaded = new Promise(function (res) { if (document.readyState === 'complete') res(); else window.addEventListener('load', function () { setTimeout(res, 60); }); });
      var reveal = function () {
        if (!html.classList.contains('pt-cover')) { arrived(); return; }
        if (lenis) lenis.start();
        if (ARKA.revealPage) ARKA.revealPage(); else html.classList.remove('pt-cover', 'pt-instant');
        arrived();
      };
      ARKA.ready.then(function () { go(); return Promise.race([loaded, wait(2500)]); })
        .then(function () { window.ScrollTrigger.refresh(); go(); return wait(150); })
        .then(function () { go(); reveal(); });
      setTimeout(reveal, 5000);   // запас: фон уходит, даже если загрузка зависла
    }
  }
})();
