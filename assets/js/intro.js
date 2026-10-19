// Первый экран после заставки (ТЗ 5.0, 5.3): когда шторки открываются, заголовок проявляется по буквам,
// кнопка и факты поднимаются, фото за 2 с уменьшается с 1,06 до 1. Без заставки (второй показ за сеанс) — сразу.
// Пока идёт заставка, страница не прокручивается.
(function () {
  var ARKA = window.ARKA || {};
  var hero = document.querySelector('[data-intro]');
  if (!hero || !ARKA.motion || !window.gsap) return;
  var gsap = window.gsap;
  var html = document.documentElement;
  var withLoader = html.classList.contains('show-loader');
  var delay = withLoader ? 2 : .2;   // шторки заставки — с 1,85 с (loader.css; 2026-10-19 заставка ≈ 2,7 с без кадра с зайчиком — L150)
  if (withLoader) {
    // Отсчёт — от начала заставки, а не от запуска этого скрипта: пока грузится страница, он выполняется на 0,3–0,6 с позже
    var la = document.querySelector('.loader');
    var an = la && la.getAnimations ? la.getAnimations()[0] : null;
    var past = an && an.startTime != null && document.timeline ? Math.max(0, (document.timeline.currentTime - an.startTime) / 1000) : 0;
    delay = Math.max(.2, delay - past);
    if (ARKA.lenis) ARKA.lenis.stop();
    html.classList.add('is-locked');
    setTimeout(function () {
      html.classList.remove('is-locked');
      if (ARKA.lenis) ARKA.lenis.start();
    }, Math.max(0, 2350 - past * 1000));
  }
  var title = hero.querySelector('[data-intro-title]');
  var rise = hero.querySelectorAll('[data-intro-rise]');
  var photo = hero.querySelector('[data-intro-photo]');
  if (photo) gsap.fromTo(photo, { scale: 1.06 }, { scale: 1, duration: 2, ease: ARKA.easeOut, delay: delay - .15 });
  (ARKA.ready || Promise.resolve()).then(function () {
    if (title) ARKA.reveal.chars(title, { delay: delay, stagger: .02 });
    if (rise.length) ARKA.reveal.rise(rise, { delay: delay + .4 });
  });
})();
