// Cookie-баннер и Яндекс.Метрика только после согласия (152-ФЗ).
// Выбор хранится в localStorage: 'all' — Метрика включена, 'necessary' — без аналитики.
(function () {
  var KEY = 'cookie-consent';
  var ROOT = new URL('../../', document.currentScript.src);
  var site = window.SITE || {};
  var counter = String(site.metrikaId || '').replace(/\D/g, '');
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(value) { try { localStorage.setItem(KEY, value); } catch (e) { /* приватный режим */ } }
  function loadMetrika() {
    if (!counter || window.ym) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(Number(counter), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  window.siteGoal = function (name) {
    if (window.ym && counter) window.ym(Number(counter), 'reachGoal', name);
  };
  if (!counter) return; // без счётчика аналитики нет — баннер не нужен
  var choice = read();
  if (choice === 'all') { loadMetrika(); return; }
  if (choice === 'necessary' || site.cookieBanner === false) return;

  function button(text, value) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'button button--small';
    b.textContent = text;
    b.addEventListener('click', function () {
      write(value);
      bar.remove();
      if (value === 'all') loadMetrika();
    });
    return b;
  }
  var bar = document.createElement('div');
  bar.className = 'cookie-banner';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Согласие на cookie');
  var text = document.createElement('p');
  text.textContent = 'Мы используем cookie: необходимые — для работы сайта, аналитические — чтобы понимать, как его улучшить. ';
  var more = document.createElement('a');
  more.href = new URL(site.cookiePolicy || 'legal/cookies.html', ROOT).href;
  more.textContent = 'Подробнее';
  text.append(more);
  bar.append(text, button('Принять все', 'all'), button('Только необходимые', 'necessary'));
  document.body.append(bar);
})();
