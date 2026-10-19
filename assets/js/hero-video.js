// Видео первого экрана (правка владельца 2026-10-18: ролик из «Материалы/Генерация» вместо фото зала, без звука).
// Звука нет: в файле нет звуковой дорожки, у видео muted и громкость 0.
// Файл — видеопоток исходника бит в бит (H.264, 1,34 МБ): убраны только звук и служебные данные, кадры не пересжаты —
// пересжатие (AV1, H.264 CRF, онлайн-сервисы) владелец видит как потерю качества (L131); исходник — materials/media/hero-video/generation/.
// Обложка — последний кадр ролика (весь зал): видна без JS, при «уменьшении движения», пока ролик грузится и в стыке повтора.
// Старт — когда начинают открываться шторки заставки (animationstart у .loader__half--left; задержку шторок ведёт loader.css),
// под ещё закрытыми шторками видео встаёт сразу; без заставки или если ролик догрузился позже — проявляется за 0,8 с.
// Повтор: ролик кончается на кадре обложки — видео гаснет мгновенно (под ним тот же кадр), идёт сначала и проявляется
// за 0,8 с: плавный переход «весь зал → окно» вместо скачка (правило 20, L121).
// Первый экран не виден (ушёл за край, его закрыла арка «Окна» — arch.js ставит visibility: hidden, вкладка скрыта) — пауза.
(function () {
  var fig = document.querySelector('[data-hero-video]');
  if (!fig) return;
  var video = fig.querySelector('video');
  if (!video) return;
  var ARKA = window.ARKA || {};
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  if (!ARKA.motion) return;                     // «уменьшение движения» и без GSAP — обложка

  var html = document.documentElement;
  var hero = fig.closest('.hero') || fig.parentNode;
  var started = false, inView = true;

  video.preload = 'auto';
  video.load();

  function visible() { return inView && hero.style.visibility !== 'hidden' && !document.hidden; }
  function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  function sync() {
    if (!started) return;
    if (visible()) { if (video.paused) play(); }
    else if (!video.paused) video.pause();
  }
  function start(instant) {
    if (started) return;
    started = true;
    if (instant && video.readyState >= 3) fig.classList.add('is-instant');
    sync();
  }

  video.addEventListener('playing', function () {
    fig.classList.add('is-playing');
    if (fig.classList.contains('is-instant')) requestAnimationFrame(function () { requestAnimationFrame(function () { fig.classList.remove('is-instant'); }); });
  });
  video.addEventListener('ended', function () {
    fig.classList.add('is-reset');
    fig.classList.remove('is-playing');
    void video.offsetWidth;                     // гаснет без перехода
    fig.classList.remove('is-reset');
    video.currentTime = 0;
    sync();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; sync(); }).observe(hero);
  }
  if ('MutationObserver' in window) new MutationObserver(sync).observe(hero, { attributes: true, attributeFilter: ['style'] });
  document.addEventListener('visibilitychange', sync);

  var half = html.classList.contains('show-loader') && document.querySelector('.loader__half--left');
  // Заставка с 2026-10-19 короткая (шторки с 1,85 с, L150): на медленной загрузке скрипт выполняется уже после начала
  // шторок — событие прошло, поэтому видео стартует сразу (с проявлением за 0,8 с)
  var halfAnim = half && half.getAnimations ? half.getAnimations()[0] : null;
  // шторки уже поехали: время анимации прошло её задержку (до начала заставки currentTime = null)
  var halfGone = !!(halfAnim && halfAnim.effect && halfAnim.currentTime != null && halfAnim.currentTime >= halfAnim.effect.getTiming().delay);
  if (half && !halfGone) {
    half.addEventListener('animationstart', function () { start(true); }, { once: true });
    setTimeout(function () { start(false); }, 12000);   // запасной старт, если событие шторки не пришло
  } else {
    start(false);
  }
})();
