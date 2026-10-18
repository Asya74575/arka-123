// Вид и цвет шапки (ТЗ 5.1).
// is-scrolled — первый сдвиг страницы больше 8 px: пункты меню уходят вверх, появляется бургер (вид Variant2).
// is-light-ui — светлая шапка над фото: блок под серединой шапки помечен data-bg="dark".
// Блоки с data-bg, которые идут позже в разметке, лежат выше предыдущих (арка поверх первого экрана) — берётся последний.
// Считается только во время прокрутки и смены размера окна, без постоянного цикла.
(function () {
  var hdr = document.querySelector('[data-hdr]');
  if (!hdr) return;
  var queued = false;
  function update() {
    queued = false;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    hdr.classList.toggle('is-scrolled', y > 8);
    var mid = hdr.getBoundingClientRect().height / 2;
    var blocks = document.querySelectorAll('[data-bg]');
    var tone = null;
    for (var i = 0; i < blocks.length; i++) {
      var r = blocks[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid && r.height > 0) tone = blocks[i].getAttribute('data-bg');
    }
    hdr.classList.toggle('is-light-ui', tone === 'dark');
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  // Блок может сменить data-bg сам (арка закрыла углы) — шапка пересчитывается
  if ('MutationObserver' in window) {
    new MutationObserver(request).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-bg'] });
  }
  window.ARKA = window.ARKA || {};
  window.ARKA.updateHeader = request;
  update();
})();
