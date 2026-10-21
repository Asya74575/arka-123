// Подгрузка 3D-модели зала (задание 3 ТЗ, drafts/room-3d.md) — с 2026-10-18 в большой рамке блока «Наше помещение»
// (правка владельца: «поменять местами видео и 3д-планирование помещения»; до этого — в «Форматах»). Когда блок в 600 px
// от экрана и браузер умеет WebGL, подключает three.js и скрипты модели (по порядку) и запускает Room3D.init. Без WebGL,
// без JS и при ошибке загрузки остаётся картинка модели (room3d__poster).
// three.js — та же сборка, что у 3D-карты района (vendor/three/three-map.js, window.THREE_MAP): модель и карта в одном
// облике и на одном движке (правка владельца 2026-10-15). Если карта уже загрузила сборку — второй раз не грузим.
(function () {
  var root = document.querySelector('[data-room3d]');
  if (!root) return;
  // Появление рамки — как у кадра видео, который стоял на этом месте (video.js): открывается снизу вверх за 1,2 с.
  // «Уменьшение движения» и без JS — рамка сразу на месте.
  // Карточка расстановок и подсказка лежат на рамке, но вне её (на телефоне подсказка — под рамкой): проявляются, когда
  // рамка открылась наполовину (0,8 с), — не раньше рамки и не по своей отметке прокрутки (на компьютере они у низа окна).
  var ARKA = window.ARKA || {}, stage = root.querySelector('.room3d__stage');
  var over = Array.prototype.slice.call(root.querySelectorAll('.room3d__views, .room3d__hint'));
  if (ARKA.motion && window.gsap && window.ScrollTrigger && stage) {
    window.gsap.set(stage, { clipPath: 'inset(100% 0% 0% 0%)' });
    window.gsap.set(over, { autoAlpha: 0 });
    window.ScrollTrigger.create({
      trigger: stage, start: 'top 85%', once: true,
      onEnter: function () {
        window.gsap.to(stage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: ARKA.easeOut });
        window.gsap.to(over, { autoAlpha: 1, duration: 0.8, delay: 0.6, ease: ARKA.easeOut, clearProps: 'opacity,visibility' });
      }
    });
  }
  // Расстановки — карточка внизу рамки по центру (правка владельца 2026-10-19: «референс по реализации табов —
  // coloniazacamil.com/#art, реализовать табы в таком виде, расположить элемент внизу на фоне модели, отцентрировать»;
  // механика референса — REFERENCES.md, «Колония: карточка серий»). Карточка показывает текущую расстановку: миниатюра,
  // название, «[Все расстановки]». Щелчок — карточка за 0,8 с растёт вверх в список «Расстановки [4]» (высота — по списку,
  // не выше рамки), фокус — на текущую строку; ↑ ↓ Home End ходят по строкам, Esc, крестик и щелчок мимо закрывают.
  // Выбор — список сворачивается, в карточке гаснет прежнее и проявляется новое (0,4 + 0,4 с), модель перелетает к
  // расстановке. Работает и до загрузки модели: выбор запоминается в root.dataset.view, модель (main.js) берёт его при
  // запуске и потом слушает событие room3d:view.
  var views = root.querySelector('.room3d__views'), card = root.querySelector('.room3d__card'), list = root.querySelector('.room3d__list');
  var listIn = root.querySelector('.room3d__list-in'), opts = Array.prototype.slice.call(root.querySelectorAll('.room3d__opt'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches, open = false, swapT = 0;
  function cur() { for (var i = 0; i < opts.length; i++) if (opts[i].getAttribute('aria-current') === 'true') return opts[i]; return opts[0]; }
  function nameOf(o) { return o.querySelector('.room3d__name').textContent; }
  function fit() {   // высота карточки: закрыта — по карточке, открыта — по списку, не выше рамки
    if (!views || !stage) return;
    var bottom = stage.getBoundingClientRect().bottom - views.getBoundingClientRect().bottom;
    var max = Math.max(160, stage.clientHeight - 2 * Math.max(12, bottom));
    views.style.setProperty('--list-max', max + 'px');
    views.style.height = (open ? Math.min(max, listIn.scrollHeight) : card.offsetHeight) + 'px';
  }
  function setOpen(on, focus) {
    if (!views || on === open) return;
    open = on;
    views.classList.toggle('is-open', on);
    card.setAttribute('aria-expanded', String(on));
    fit();
    if (on) cur().focus({ preventScroll: true });
    else if (focus) card.focus({ preventScroll: true });
  }
  function select(o) {
    var changed = o !== cur(), v = o.getAttribute('data-view'), name = nameOf(o);
    opts.forEach(function (x) { x.setAttribute('aria-current', String(x === o)); });
    root.dataset.view = v;
    setOpen(false, true);
    if (!changed) return;
    card.setAttribute('aria-label', 'Расстановка: ' + name + '. Все расстановки');
    var img = card.querySelector('.room3d__thumb img'), src = o.querySelector('.room3d__thumb img').getAttribute('src');
    function put() { card.querySelector('[data-card-name]').textContent = name; img.setAttribute('src', src); card.classList.remove('is-swap'); fit(); }
    clearTimeout(swapT);
    if (reduced) put(); else { card.classList.add('is-swap'); swapT = setTimeout(put, 400); }
    root.dispatchEvent(new CustomEvent('room3d:view', { detail: v }));
  }
  if (views && card && opts.length) {
    root.dataset.view = cur().getAttribute('data-view');
    card.addEventListener('click', function () { setOpen(!open, false); });
    root.querySelector('.room3d__list-close').addEventListener('click', function () { setOpen(false, true); });
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { select(o); });
      o.addEventListener('keydown', function (e) {
        var k = e.key, n = opts.length, j = k === 'ArrowDown' ? (i + 1) % n : k === 'ArrowUp' ? (i - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
        if (j < 0) return;
        e.preventDefault(); opts[j].focus();
      });
    });
    views.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false, true); } });
    document.addEventListener('pointerdown', function (e) { if (open && !views.contains(e.target)) setOpen(false, false); });
    root.addEventListener('focusout', function (e) { if (open && e.relatedTarget && !views.contains(e.relatedTarget)) setOpen(false, false); });
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  if (!('IntersectionObserver' in window)) return;
  var V = '20261021-ea2';   // знаки + / −, поворот рукой, стены при повороте (правки владельца 2026-10-21, arka-123-ea)
  var VENDOR = 'assets/vendor/three/three-map.js';   // без ?v= — тот же адрес, что у fly.js: один файл в кэше
  var FILES = ['assets/js/room3d/plan.js', 'assets/js/room3d/logic.js', 'assets/js/room3d/scene.js', 'assets/js/room3d/furniture.js',
    'assets/js/room3d/camera.js', 'assets/js/room3d/ui.js', 'assets/js/room3d/mascot.js', 'assets/js/room3d/main.js'];
  function webgl() {
    try {
      var c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }
  function fail() { root.classList.add('is-failed'); }   // без модели карточка расстановок и подсказка прячутся (room3d.css): остаётся картинка
  if (!webgl()) { fail(); return; }
  function three(done) {
    if (window.THREE_MAP) { done(); return; }
    var s = document.querySelector('script[src*="vendor/three/three-map.js"]');
    if (!s) { s = document.createElement('script'); s.src = VENDOR; document.head.appendChild(s); }
    s.addEventListener('load', function () { if (window.THREE_MAP) done(); else fail(); });
    s.addEventListener('error', fail);
  }
  function load() {
    three(function () {
      window.THREE = window.THREE_MAP;   // файлы модели берут движок из window.THREE
      var left = FILES.length, failed = false;
      FILES.forEach(function (f) {
        var s = document.createElement('script');
        s.src = f + '?v=' + V; s.async = false;
        s.onload = function () { if (--left === 0 && !failed && window.Room3D && window.Room3D.init) window.Room3D.init(root); };
        s.onerror = function () { failed = true; fail(); };
        document.body.appendChild(s);
      });
    });
  }
  var io = new IntersectionObserver(function (entries) { if (entries[entries.length - 1].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' });
  io.observe(root);
})();
