// Кнопки мессенджеров из config.js. Пустые и небезопасные ссылки не показываются.
// Внутри [data-contacts] лежит статичная копия для работы без JS — скрипт её заменяет.
(function () {
  var LABELS = { telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber', instagram: 'Instagram', max: 'MAX' };
  function safe(value) {
    var url = String(value || '').trim();
    if (!url || /\s/.test(url) || !/^(https:|viber:|tg:)/i.test(url)) return '';
    return url;
  }
  var messengers = (window.SITE && window.SITE.messengers) || {};
  document.querySelectorAll('[data-contacts]').forEach(function (mount) {
    var list = document.createElement('ul');
    list.className = 'contacts';
    Object.keys(LABELS).forEach(function (key) {
      var url = safe(messengers[key]);
      if (!url) return;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = url;
      a.textContent = LABELS[key];
      a.className = 'contacts__link contacts__link--' + key;
      if (/^https:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', function () { if (window.siteGoal) window.siteGoal('messenger_' + key); });
      li.append(a);
      list.append(li);
    });
    if (list.children.length) mount.replaceChildren(list);
  });
})();
