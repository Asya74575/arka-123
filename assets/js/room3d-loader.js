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
  var ARKA = window.ARKA || {}, stage = root.querySelector('.room3d__stage');
  if (ARKA.motion && window.gsap && window.ScrollTrigger && stage) {
    window.gsap.set(stage, { clipPath: 'inset(100% 0% 0% 0%)' });
    window.ScrollTrigger.create({
      trigger: stage, start: 'top 85%', once: true,
      onEnter: function () { window.gsap.to(stage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: ARKA.easeOut }); }
    });
  }
  if (!('IntersectionObserver' in window)) return;
  var V = '20261016-p10';
  var VENDOR = 'assets/vendor/three/three-map.js';   // без ?v= — тот же адрес, что у fly.js: один файл в кэше
  var FILES = ['assets/js/room3d/plan.js', 'assets/js/room3d/logic.js', 'assets/js/room3d/scene.js', 'assets/js/room3d/furniture.js',
    'assets/js/room3d/camera.js', 'assets/js/room3d/ui.js', 'assets/js/room3d/main.js'];
  function webgl() {
    try {
      var c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }
  if (!webgl()) return;
  function fail() { root.classList.add('is-failed'); }
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
