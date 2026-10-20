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
    // Буквы пунктов уже поделены для наведения (btn.js, первая копия подписи; правка владельца 2026-10-19): проявляются они же;
    // пока идёт проявление, переходы наведения у букв выключены (base.css, .is-revealing), иначе CSS сглаживал бы GSAP
    split = Array.prototype.map.call(links, function (a) { return a.querySelectorAll('.btn__label > span:first-child .btn__c'); });
    if (split.some(function (c) { return c.length; })) {
      menu.classList.add('is-revealing');
      var left = split.length;
      split.forEach(function (chars, i) {
        gsap.fromTo(chars, { yPercent: 50, rotateY: 90, opacity: 0 }, { yPercent: 0, rotateY: 0, opacity: 1, duration: 1.2, ease: window.ARKA.easeOut || 'power3.out', stagger: .03, delay: .3 + i * .1, overwrite: true,
          onComplete: function () { gsap.set(chars, { clearProps: 'transform,opacity' }); if (--left <= 0) menu.classList.remove('is-revealing'); } });
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

// Переход на другую страницу сайта — одинаковый везде (правки владельца 2026-10-19: «„На главную“ — плавный переход
// без прелоадера», «„Как добраться“ — ужасная прыгающая и резкая анимация… анимации на сайте должны быть одинаковыми»).
// Щелчок по ссылке на другую страницу сайта (шапка, меню, подвал, кнопки «На главную» и «Как добраться», мессенджеры →
// 404, юридические ссылки): страница закрывается фоном арок за 0,8 с (base.css, html.pt-cover), потом переход; отметка
// arka-pt — новая страница открывается под тем же фоном и проявляется, когда встала на место (главная — motion.js:
// раздел уже на своём блоке, без прыжков; остальные — здесь, когда загружены шрифты).
// На главную — без заставки (правка владельца 2026-10-16 и 2026-10-19): отметка arka-nav = #раздел или #top, её читает
// и стирает строка в <head> index.html; «Обновить» на главной — снова с заставкой (L104).
// Ссылки на раздел этой же страницы ведут motion.js и меню выше — без перехода. «Уменьшение движения» — сразу, без фона.
(function () {
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ARKA = window.ARKA = window.ARKA || {};
  var PAGE = function (p) { return String(p).replace(/\/index\.html$/i, '/'); };
  var isMain = function (p) { return /\/(index\.html)?$/i.test(p); };
  var store = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} };
  var leaving = false;

  // Вход под фоном: страница проявляется за 0,8 с (на главной — когда motion.js поставит раздел на место)
  ARKA.revealPage = function () {
    if (!html.classList.contains('pt-cover')) return;
    html.classList.remove('pt-instant');
    requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.remove('pt-cover'); }); });
  };
  if (!document.querySelector('[data-intro]') && html.classList.contains('pt-cover')) {
    // шрифты запрашиваются при первой раскладке: fonts.ready ждём после неё, иначе он готов «сразу», до загрузки шрифтов
    var shown = false, show = function () { if (!shown) { shown = true; ARKA.revealPage(); } };
    var afterLayout = function () { requestAnimationFrame(function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(show); }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterLayout); else afterLayout();
    setTimeout(show, 1200);
  }
  // Назад / вперёд в браузере: страница из кэша — без фона, на котором её покинули
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    leaving = false;
    html.classList.add('pt-instant'); html.classList.remove('pt-cover');
    requestAnimationFrame(function () { html.classList.remove('pt-instant'); });
  });

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var a = event.target.closest && event.target.closest('a[href]');
    if (!a || a.hasAttribute('data-rent') || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.protocol !== location.protocol || u.host !== location.host || !/(\.html|\/)$/i.test(u.pathname)) return;
    if (PAGE(u.pathname) === PAGE(location.pathname) && u.search === location.search) return;   // эта же страница
    if (leaving) { event.preventDefault(); return; }
    if (isMain(u.pathname)) store('arka-nav', u.hash.length > 1 ? u.hash : '#top');
    if (reduce) return;
    event.preventDefault();
    ARKA.leaveTo(u.href);
  });
  // Тот же переход — и без щелчка по ссылке: после отправки формы на «Спасибо» (form-demo.js)
  ARKA.leaveTo = function (href) {
    if (leaving) return;
    if (reduce) { location.assign(href); return; }
    leaving = true;
    store('arka-pt', '1');
    html.classList.remove('pt-instant');
    html.classList.add('pt-cover');
    setTimeout(function () { location.assign(href); }, 800);
    // переход не случился (нет сети, ответ без страницы) — через 5 с фон уходит, страницей снова можно пользоваться
    setTimeout(function () { leaving = false; html.classList.remove('pt-cover'); }, 5800);
  };
})();
