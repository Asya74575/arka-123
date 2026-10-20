// «О нас» (ТЗ 5.5 и 5.12, переходы 1–2, приём ERA, кадры 023–031).
// Компьютер (≥1024) с движением: блок закреплён на один экран; фото фасада сначала стоит в центре размером с фото слайдера
// (585 × 784 макета, на месте фото слайдов «Окон») и за прокруткой растёт до всего экрана: рамка (clip-path) раскрывается,
// фото внутри — от масштаба «как в рамке» до 1. Когда фото выросло, текст проявляется по строкам.
// Потом фото и текст уходят вверх вместе с блоком видео — ровно со скоростью прокрутки, как обычная страница
// (правка владельца 2026-10-16: «текст быстро закрывается белым фоном — сделай скролл фото и текста вверх», L123).
// Было (2026-10-15, L93): видео наезжало на закреплённое фото, фото и текст уходили вверх в четыре раза медленнее —
// белый блок закрывал текст внизу раньше, чем его успевали дочитать. Только transform, без задержки следования:
// низ фото всегда у верха видео, щели и наезда нет.
// Блок помечает фон под шапкой: пока фото маленькое — светлый (шапка тёмная), когда выросло — тёмный.
// Телефон и планшет: фото на весь экран, параллакс внутри рамки (−11,5 % → 11,5 %, как data-parallax), текст — по строкам.
// «Уменьшение движения», без JS — фото сразу на весь экран, текст на месте.
(function () {
  var ARKA = window.ARKA || {};
  var sec = document.querySelector('[data-about]');
  if (!sec || !ARKA.motion || !window.gsap) return;
  var gsap = window.gsap;
  var photo = sec.querySelector('[data-about-photo]');
  var img = photo.querySelector('img');
  var text = sec.querySelector('[data-about-text]');
  var spacer = document.querySelector('.about__spacer');
  var mm = gsap.matchMedia();

  mm.add('(min-width: 1024px)', function () {
    var shown = false;
    gsap.set(text, { opacity: 0 });
    // Рамка слайда в экране блока: 585 × 784 по центру, верх — на 416 выше середины (единица экранных блоков)
    function frame() {
      var W = sec.clientWidth, H = sec.clientHeight;
      var s = Math.min(Math.min(W, 2560) / 1920, H / 1080);
      var w = 585 * s, h = 784 * s, top = H / 2 - 416 * s, left = (W - w) / 2;
      return { clip: 'inset(' + top + 'px ' + (W - left - w) + 'px ' + (H - top - h) + 'px ' + left + 'px)', scale: Math.max(w / W, h / H), oy: (top + h / 2) / H * 100 };
    }
    gsap.set(img, { transformOrigin: '50% ' + frame().oy + '%' });
    // Пауза после роста (правка владельца 2026-10-19, вечер: «сделай задержку данного блока 2–3 сек»): фото выросло, текст
    // проявился — блок стоит, пока прокрутка проходит --about-hold (home.css, 1000 px), и только потом поднимается следующий блок.
    // Рост — на первый экран прокрутки, а не на всю высоту промежутка
    function hold() { return parseFloat(getComputedStyle(spacer).getPropertyValue('--about-hold')) || 0; }
    var tl = gsap.timeline({ defaults: { ease: 'none' } })
      .fromTo(photo, { clipPath: function () { return frame().clip; } }, { clipPath: 'inset(0px 0px 0px 0px)' }, 0)
      .fromTo(img, { scale: function () { return frame().scale; } }, { scale: 1 }, 0);
    var st = window.ScrollTrigger.create({
      trigger: spacer, start: 'top bottom', end: function () { return '+=' + Math.max(1, spacer.offsetHeight - hold()); }, animation: tl, scrub: .5, invalidateOnRefresh: true,
      onUpdate: function (self) {
        sec.setAttribute('data-bg', self.progress > .82 ? 'dark' : 'light');
        if (!shown && self.progress > .9) { shown = true; ARKA.reveal.lines(text); }
      },
      onRefresh: function (self) {
        gsap.set(img, { transformOrigin: '50% ' + frame().oy + '%' });
        sec.setAttribute('data-bg', self.progress > .82 ? 'dark' : 'light');
      }
    });
    // Видео подходит снизу: фото и текст уходят вверх вместе с ним — на экран за экран прокрутки (1 : 1)
    var lift = gsap.fromTo([photo, text], { y: 0 }, { y: function () { return -window.innerHeight; }, ease: 'none', scrollTrigger: { trigger: spacer, start: 'bottom bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    sec.setAttribute('data-bg', 'light');
    return function () {
      st.kill(); tl.kill();
      lift.scrollTrigger && lift.scrollTrigger.kill(); lift.kill();
      gsap.set([photo, img, text], { clearProps: 'clipPath,transform,opacity' });
      sec.setAttribute('data-bg', 'dark');
    };
  });
  // Телефон и планшет: параллакс фото внутри рамки, текст — по строкам при входе в экран
  mm.add('(max-width: 1023.98px)', function () {
    photo.classList.add('is-parallax');
    gsap.set(text, { opacity: 0 });
    var tw = gsap.fromTo(img, { yPercent: -11.54 }, { yPercent: 11.54, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    var st = window.ScrollTrigger.create({ trigger: text, start: 'top 85%', once: true, onEnter: function () { ARKA.reveal.lines(text); } });
    return function () { st.kill(); tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); photo.classList.remove('is-parallax'); gsap.set(img, { clearProps: 'transform' }); gsap.set(text, { clearProps: 'opacity' }); };
  });
})();
