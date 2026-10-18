// Вопросы (ТЗ 5.10): открыт всегда один вопрос, первый — сразу. Ответ раскрывается за 0,8 с (кривая Out, CSS grid-template-rows),
// строки ответа поднимаются; плюс сменяется минусом, значок не вращается. Без JS все ответы открыты.
(function () {
  var list = document.querySelector('[data-faq]');
  if (!list) return;
  var ARKA = window.ARKA || {};
  var items = Array.prototype.slice.call(list.querySelectorAll('.faq__item'));
  function set(item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.faq__q').setAttribute('aria-expanded', String(open));
  }
  items.forEach(function (item) {
    item.querySelector('.faq__q').addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      items.forEach(function (other) { if (other !== item) set(other, false); });
      set(item, open);
      if (open && ARKA.motion && window.gsap) {
        window.gsap.fromTo(item.querySelector('.faq__a p'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: ARKA.easeOut, delay: .1 });
      }
      // высота страницы изменилась — пересчитать места анимаций за прокруткой
      if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 850);
    });
  });
})();
