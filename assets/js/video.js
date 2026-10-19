// Видеопрогулка (задание 4; с 2026-10-18 — в рамке коллажа «Форматов», а в «Наше помещение» — 3D-модель: правка владельца
// «поменять местами видео и 3д-планирование помещения»). Играет сама, без звука и по кругу, когда видна половина кадра, вне экрана —
// пауза (как у ERA). Щелчок по видео — пауза и снова пуск; на паузе, которую поставил посетитель, — кнопка плеера по центру.
// «Уменьшение движения» — само не стартует.
// Быстрый старт (правка владельца 2026-10-15: «вначале много времени уходит на загрузку видео»):
//   — данные о ролике в начале файла; первый пуск — с кадра обложки, обложка и видео совпадают, скачка нет;
//   — загрузка начинается за три экрана до блока, а не за один.
// С 2026-10-18 — видео utopy, 7,5 с, один файл на все ширины (data-src), обложка — первый кадр, пуск с 0 с.
// Прежний монтаж (два размера data-src-1920 / data-src-1280, пуск с data-start) код по-прежнему понимает.
// Появление: кадр открывается снизу вверх за 1,2 с, видео внутри уменьшается с 1,1 до 1.
(function () {
  var ARKA = window.ARKA || {};
  var frame = document.querySelector('[data-video]');
  if (!frame) return;
  var video = frame.querySelector('video');
  var toggle = frame.querySelector('[data-video-toggle]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = Number(video.getAttribute('data-start')) || 0;
  var userPaused = reduce, inView = false, loaded = false;
  // Кнопка плеера видна, только когда видео остановил сам посетитель (щелчок по видео), и остаётся, пока он не запустит снова;
  // пауза от прокрутки (вне экрана, под аркой) и ожидание первого пуска кнопку не показывают (правка владельца 2026-10-18:
  // «при скролле значок видео появляется и исчезает… знак появляется и остаётся, когда пользователь нажмёт на видео», L139).
  // При «уменьшении движения» видео само не стартует — кнопка видна сразу; браузер не дал запустить — тоже.
  function mark() { frame.classList.toggle('is-paused', userPaused && video.paused); }
  function play() { var p = video.play(); if (p && p.catch) p.catch(function () { if (video.paused) frame.classList.add('is-paused'); }); }
  mark();

  function load() {
    if (loaded) return;
    loaded = true;
    var wide = (window.innerWidth * (window.devicePixelRatio || 1)) > 1500;
    if (start) video.addEventListener('loadedmetadata', function () { if (video.currentTime < start) video.currentTime = start; }, { once: true });
    video.src = video.getAttribute('data-src') || video.getAttribute(wide ? 'data-src-1920' : 'data-src-1280');
    video.preload = 'auto';
  }
  // Видна половина кадра и середина кадра не закрыта: на компьютере блок видео стоит под аркой «Форматы»,
  // и когда арка поднялась поверх, видео встаёт на паузу, хотя формально оно ещё в окне
  function shown() {
    if (!inView) return false;
    var r = frame.getBoundingClientRect();
    var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
    var el = document.elementFromPoint(r.left + r.width / 2, (top + bottom) / 2);
    return !el || frame.contains(el);
  }
  function sync() {
    if (shown() && !userPaused) { load(); play(); }
    else if (!video.paused) video.pause();
  }
  var queued = false;
  window.addEventListener('scroll', function () {
    if (!inView || queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; sync(); });
  }, { passive: true });
  video.addEventListener('play', function () { frame.classList.remove('is-paused'); });
  video.addEventListener('pause', mark);
  function flip() {
    load();
    if (video.paused) { userPaused = false; play(); }
    else { userPaused = true; video.pause(); }
    mark();
  }
  video.addEventListener('click', flip);
  if (toggle) toggle.addEventListener('click', flip);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) load(); }, { rootMargin: '300% 0px' }).observe(frame);
    new IntersectionObserver(function (entries) { inView = entries[0].intersectionRatio >= .5; sync(); }, { threshold: [0, .5, 1] }).observe(frame);
  } else { load(); }

  // Появление кадра
  if (ARKA.motion && window.gsap) {
    var gsap = window.gsap;
    gsap.set(frame, { clipPath: 'inset(100% 0% 0% 0%)' });
    window.ScrollTrigger.create({
      trigger: frame, start: 'top 85%', once: true,
      onEnter: function () {
        gsap.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: ARKA.easeOut });
        gsap.fromTo(video, { scale: 1.1 }, { scale: 1, duration: 1.2, ease: ARKA.easeOut });
      }
    });
  }
})();
