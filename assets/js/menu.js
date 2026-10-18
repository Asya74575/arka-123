// Меню (929:581, ТЗ 5.2): бургер открывает тёмную панель справа, страница под ней стоит.
// Закрывают крестик, Esc, щелчок по затемнению и любая ссылка; фокус не уходит из панели и возвращается на бургер.
// Пункты проявляются по буквам (GSAP SplitText, если подключён), контакты и кнопки поднимаются следом.
(function () {
  var menu = document.getElementById('site-menu');
  var opener = document.querySelector('[data-menu-open]');
  if (!menu || !opener) return;
  var panel = menu.querySelector('.menu__panel');
  var closeTimer = 0;
  var split = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function PAGE(p) { return String(p).replace(/\/index\.html$/i, '/'); }

  function lenis() { return window.ARKA && window.ARKA.lenis; }
  function focusables() {
    return Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled])'), function (el) { return el.offsetParent !== null; });
  }
  function animateIn() {
    var gsap = window.gsap;
    if (!gsap || reduce) return;
    var links = menu.querySelectorAll('.menu__nav a');
    if (!split && window.SplitText && window.ARKA.splitChars) split = Array.prototype.map.call(links, function (a) { return window.ARKA.splitChars(a); });
    if (split) {
      split.forEach(function (s, i) {
        gsap.fromTo(s.chars, { yPercent: 50, rotateY: 90, opacity: 0 }, { yPercent: 0, rotateY: 0, opacity: 1, duration: 1.2, ease: window.ARKA.easeOut || 'power3.out', stagger: .03, delay: .3 + i * .1, overwrite: true });
      });
    }
    gsap.fromTo(menu.querySelectorAll('.menu__contacts > *, .menu__buttons > *'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: window.ARKA.easeOut || 'power3.out', stagger: .05, delay: .6, overwrite: true });
  }
  function open() {
    clearTimeout(closeTimer);
    menu.classList.remove('is-closing');
    panel.scrollTop = 0;   // меню всегда открывается с первого пункта
    menu.classList.add('is-open');
    opener.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('is-locked');
    if (lenis()) lenis().stop();
    animateIn();
    var first = menu.querySelector('.menu__close');
    setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 60);
  }
  function close(after) {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.classList.add('is-closing');
    opener.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('is-locked');
    if (lenis()) lenis().start();
    closeTimer = setTimeout(function () { menu.classList.remove('is-closing'); }, 800);
    if (typeof after === 'function') after(); else opener.focus({ preventScroll: true });
  }
  opener.addEventListener('click', function (event) { event.preventDefault(); open(); });
  menu.addEventListener('click', function (event) {
    if (event.target.closest('[data-menu-close]')) { close(); return; }
    var link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('data-rent')) { if (link) close(function () {}); return; }
    // Ссылка на раздел этой же страницы — плавно к разделу (Lenis, 1,2 с), иначе обычный переход.
    // «…/site/» и «…/site/index.html» — одна страница (правка владельца 2026-10-16: иначе главная перезагружалась с заставкой)
    var target = null;
    try {
      var u = new URL(link.href, location.href);
      if (PAGE(u.pathname) === PAGE(location.pathname) && u.hash.length > 1) target = document.getElementById(decodeURIComponent(u.hash.slice(1)));
    } catch (e) {}
    if (target) {
      event.preventDefault();
      close(function () {
        if (window.ARKA && window.ARKA.scrollTo) window.ARKA.scrollTo(target);
        else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + target.id);
      });
    } else {
      close(function () {});
    }
  });
  document.addEventListener('keydown', function (event) {
    if (!menu.classList.contains('is-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      var list = focusables();
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.ARKA = window.ARKA || {};
  window.ARKA.closeMenu = close;
})();

// Ссылка на раздел главной с другой страницы сайта (шапка, меню, подвал на юридических страницах и 404):
// главная открывается сразу на этом блоке, без заставки (правка владельца 2026-10-16: «прелоадер здесь не уместен»).
// Отметку arka-nav = #раздел читает и стирает строка в <head> index.html; «Обновить» на главной — снова с заставкой (L104).
(function () {
  if (document.querySelector('[data-intro]')) return;   // на главной ссылки на разделы ведёт motion.js, без перехода
  document.addEventListener('click', function (event) {
    var a = event.target.closest && event.target.closest('a[href*="#"]');
    if (!a || a.hasAttribute('data-rent') || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.hash.length < 2 || !/\/index\.html$/i.test(u.pathname)) return;
    try { sessionStorage.setItem('arka-nav', u.hash); } catch (e) {}
  });
})();
