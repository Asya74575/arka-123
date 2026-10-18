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
  var delay = withLoader ? 6.35 : .2;   // шторки заставки — с 6,2 с (loader.css; 2026-10-18 кадр с зайчиком на 1,2 с короче — L129)
  if (withLoader) {
    if (ARKA.lenis) ARKA.lenis.stop();
    html.classList.add('is-locked');
    setTimeout(function () {
      html.classList.remove('is-locked');
      if (ARKA.lenis) ARKA.lenis.start();
    }, 6700);
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
