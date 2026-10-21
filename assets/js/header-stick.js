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
    // Подвал дошёл до шапки (невысокое окно, подвал выше окна) — шапка уходит вверх: у подвала свои логотип, разделы и контакты,
    // а шапка поверх них путала (правка владельца 2026-10-20 на 1024: «логотипы почти накладываются, элементы хедера очень
    // близко к элементам футера»; arka-123-e8). На высоком окне подвал до шапки не доходит — шапка стоит, как раньше.
    var foot = document.getElementById('site-footer');
    hdr.classList.toggle('is-off', !!foot && foot.getBoundingClientRect().top < mid * 2 && !document.documentElement.classList.contains('is-locked'));
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
