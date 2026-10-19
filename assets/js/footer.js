// Общий подвал (887:753) из config.js: логотип и описание, разделы, юридические страницы, «Связаться»,
// фото здания и слоган лесенкой, нижняя строка. На главной тексты подвала появляются по приёмам motion.js (data-anim). Один и тот же на всех страницах, включая юридические и 404:
// статичная копия пишется командой node tools/includes.mjs. Значки мессенджеров — символы из шапки (header.js).
(function () {
  var mount = document.querySelector('[data-include="footer"]');
  if (!mount || !window.SITE) return;
  var ROOT = new URL('../../', document.currentScript.src);
  var site = window.SITE;
  function url(path) {
    var raw = String(path || '');
    if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return '#';
    return new URL(raw, ROOT).href;
  }
  function esc(text) { return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var names = { telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber' };
  var menu = site.menu || [];
  function links(list) { return list.map(function (l) { return '<a href="' + url(l.href) + '">' + esc(l.title) + '</a>'; }).join(''); }
  var slogan = site.slogan || [];
  // Логотип — как в шапке: знак картинкой, «АРКА 123» и слоган буквами для волны при наведении (header.js, ARKA.logoText;
  // задание 1 ТЗ, правка владельца 2026-10-16, ведёт arka-123-ab). Без букв — прежний лок-ап одной картинкой.
  var logoText = window.ARKA && window.ARKA.logoText;
  var logo = logoText && logoText('name', 'ftr-logo')
    ? '<span class="logo site-footer__logo"><span class="logo__part logo__part--mark"><img class="logo__mark" src="' + url('img/logo-mark-dark.svg') + '" alt=""></span>' +
      '<span class="logo__part logo__part--name">' + logoText('name', 'ftr-logo') + '</span><span class="logo__part logo__part--slogan">' + logoText('slogan', 'ftr-logo') + '</span></span>'
    : '<img class="site-footer__logo" src="' + url('img/logo-footer.svg') + '" width="843" height="300" alt="АРКА 123 — встречаемся напротив Библиотеки">';

  mount.innerHTML =
    '<footer class="site-footer" id="site-footer" data-bg="light">' +
      '<div class="site-footer__in">' +
        '<div class="site-footer__brand">' +
          '<a href="' + url('index.html') + '" aria-label="' + esc(site.name) + ', на главную">' + logo + '</a>' +
          '<div class="site-footer__info" data-anim-group><p class="site-footer__muted" data-anim="lines">' + esc(site.description) + '</p><p class="site-footer__muted" data-anim="lines">' + esc(site.taxId) + '</p></div>' +
        '</div>' +
        '<nav class="site-footer__nav" aria-label="Разделы сайта" data-anim-group>' +
          '<div class="site-footer__col" data-anim="rise">' + links(menu.slice(0, 4)) + '</div>' +
          '<div class="site-footer__col" data-anim="rise">' + links(menu.slice(4)) + '</div>' +
          '<div class="site-footer__col" data-anim="rise">' + links(site.legal || []) + '</div>' +
        '</nav>' +
        '<div class="site-footer__contacts" data-anim-group>' +
          '<p class="site-footer__caption" data-anim="lines">Связаться</p>' +
          '<p class="site-footer__phone" data-anim="lines">' + esc(site.phoneText) + '</p>' +
          '<p class="site-footer__email" data-anim="lines">' + esc(site.emailText) + '</p>' +
          '<div class="site-footer__msg" data-anim="rise">' + (site.messengers || []).map(function (key) {
            return '<a class="msg" href="' + url(site.messengerHref) + '" aria-label="Написать в ' + names[key] + '"><svg aria-hidden="true"><use href="#i-' + key + '"/></svg></a>';   // на страницу 404 (2026-10-15)
          }).join('') + '</div>' +
          '<p class="site-footer__address" data-anim="lines">' + esc(site.address) + '</p>' +
        '</div>' +
        // Фасад с аркой — кадр со скрина владельца 2026-10-19 (рамка 260 × 272, фото повёрнуто на 3,6°; tools/photo-hq/build-ready.py).
        // Без параллакса: у кадра нет запаса сверху и снизу, а с параллаксом в рамке стоял бы другой кадр
        '<div class="site-footer__photo"><img src="' + url('img/footer-facade-520.webp') + '" srcset="' + url('img/footer-facade-520.webp') + ' 520w, ' + url('img/footer-facade-1040.webp') + ' 1040w, ' + url('img/footer-facade-1262.webp') + ' 1262w" sizes="(max-width: 767.98px) 100vw, (max-width: 1023.98px) 50vw, 260px" width="1262" height="1321" loading="lazy" alt="Два дома, соединённых аркой, — здание АРКА 123"></div>' +
        '<p class="site-footer__slogan" data-anim="accent">' + slogan.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</p>' +
        '<div class="site-footer__bottom" data-anim-group>' +
          '<p class="site-footer__copy" data-anim="lines">' + esc(site.copyright) + '</p>' +
          '<p class="site-footer__disclaimer" data-anim="lines">' + esc(site.disclaimer) + '</p>' +
          '<div class="site-footer__hours" data-anim="rise"><p>' + esc(site.hours) + '</p><p>' + esc(site.parking) + '</p></div>' +
        '</div>' +
      '</div>' +
    '</footer>';
})();
