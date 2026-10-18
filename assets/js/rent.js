// Две выезжающие панели (597:97, ТЗ 5.13) — белая панель справа с формой:
//  - «Аренда помещения» — кнопки «Арендовать помещение» (data-rent=""), адрес #arenda-form;
//  - «Заявка на консультацию» — «Задать вопрос» (data-rent="ask") и мессенджеры (data-rent="telegram|whatsapp|viber"),
//    адрес #vopros-form; поля «Имя», «Телефон», «Ваш вопрос или комментарий», согласие, «Отправить» (правка владельца 2026-10-15).
// При открытии фокус встаёт на саму панель (tabindex=-1, без рамки), а не в поле: все поля — в обычном виде, подсказки видны
// (правка владельца 2026-10-15: «поле Имя сразу появляется в фокусе… должно быть дефолтным»); Tab ведёт к крестику и полям.
// Без JS эти ссылки ведут к форме внизу главной (index.html#arenda).
// Затемнение 0,6 с, панель 0,9 с, закрытие 0,8 с; закрывают крестик, Esc и щелчок по затемнению; страница стоит.
// Обе панели вставляются при загрузке (до form-demo.js и btn.js). Разметка формы аренды — одна для панели
// и для формы внизу главной (window.ARKA.formHTML); поведение форм — form-demo.js.
(function () {
  var ROOT = new URL('../../', document.currentScript.src);
  function url(path) { return new URL(path, ROOT).href; }
  var ICON = {
    chevron: '<svg class="field__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" fill="none"/></svg>',
    calendar: '<svg class="field__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 5H3v16h18V5ZM3 10h18M8 3v4M16 3v4" stroke="currentColor" fill="none"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>',
    flag: '<svg class="field__flag" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 0h24v8H0z" fill="#C8313E"/><path d="M0 8h24v4H0z" fill="#4AA657"/><path d="M0 0h5v12H0z" fill="#fff"/><path d="M2 0h1v12H2z" fill="#C8313E"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  };
  var LISTS = {
    time: { label: 'Время аренды', items: ['1 час', '2 часа', '3 часа', '4 часа', '6 часов', '8 часов'] },
    guests: { label: 'Количество человек', items: ['До 15 человек', '16–25 человек', '26–40 человек', '41–56 человек'] },
    format: { label: 'Формат мероприятия', items: ['Мастер-класс', 'Семинар или лекция', 'Тренинг', 'Свой формат'] }
  };
  function select(p, key) {
    var list = LISTS[key];
    return '<div class="field" data-field="' + key + '" data-select>' +
      '<input type="hidden" name="' + key + '">' +
      '<button type="button" class="field__box" id="' + p + '-' + key + '" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + p + '-' + key + '-list">' +
        '<span class="field__value field__placeholder" data-placeholder="' + list.label + '">' + list.label + '</span>' + ICON.chevron +
      '</button>' +
      '<div class="drop" id="' + p + '-' + key + '-list" role="listbox" aria-label="' + list.label + '" tabindex="-1">' +
        list.items.map(function (v) { return '<button type="button" class="drop__item" role="option" aria-selected="false" data-value="' + v + '">' + v + ICON.check + '</button>'; }).join('') +
      '</div>' +
    '</div>';
  }
  function nameField(p) {
    return '<div class="field" data-field="name">' +
          '<label class="visually-hidden" for="' + p + '-name">Имя</label>' +
          '<div class="field__box"><input class="field__input" id="' + p + '-name" name="name" type="text" autocomplete="name" placeholder="Имя" required aria-describedby="' + p + '-name-err"></div>' +
          '<p class="field__error" id="' + p + '-name-err"></p>' +
        '</div>';
  }
  function phoneField(p) {
    return '<div class="field" data-field="phone">' +
          '<label class="visually-hidden" for="' + p + '-phone">Телефон, номер в Беларуси</label>' +
          '<div class="field__box"><span class="field__country" aria-hidden="true">' + ICON.flag + ICON.chevron + '</span><span class="field__code">+375</span>' +
          '<input class="field__input" id="' + p + '-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(00) 000-00-00" required aria-describedby="' + p + '-phone-err"></div>' +
          '<p class="field__error" id="' + p + '-phone-err"></p>' +
        '</div>';
  }
  function questionField(p) {
    return '<div class="field field--area" data-field="question">' +
          '<label class="visually-hidden" for="' + p + '-question">Ваш вопрос или комментарий</label>' +
          '<div class="field__box"><textarea class="field__input" id="' + p + '-question" name="question" rows="3" placeholder="Ваш вопрос или комментарий"></textarea></div>' +
        '</div>';
  }
  function formEnd(p, submit) {
    return '<div class="consent" data-field="consent">' +
        '<span class="check"><input type="checkbox" id="' + p + '-consent" name="consent" required aria-describedby="' + p + '-consent-err"><span>' + ICON.check + '</span></span>' +
        '<div class="consent__text"><label for="' + p + '-consent">Нажимая кнопку, я&nbsp;даю <a href="' + url('legal/consent.html') + '">согласие на&nbsp;обработку персональных данных</a> и&nbsp;принимаю условия <a href="' + url('legal/privacy.html') + '">политики конфиденциальности</a></label>' +
        '<p class="field__error" id="' + p + '-consent-err"></p></div>' +
      '</div>' +
      '<button class="btn btn--block" type="submit" disabled><span class="btn__label"><span>' + submit + '</span><span aria-hidden="true">' + submit + '</span></span></button>' +
      '<p class="form__status" role="status"></p>' +
    '</form>';
  }
  // Форма аренды: имя, телефон, дата | время, гости | формат, вопрос
  function formHTML(p, submit) {
    return '<form class="form" data-form="demo" method="post" novalidate>' +
      '<div class="form__fields">' + nameField(p) + phoneField(p) +
        '<div class="form__row">' +
          '<div class="field" data-field="date" data-date>' +
            '<input type="hidden" name="date">' +
            '<button type="button" class="field__box" id="' + p + '-date" aria-haspopup="dialog" aria-expanded="false">' +
              '<span class="field__value field__placeholder" data-placeholder="Дата мероприятия">Дата мероприятия</span>' + ICON.calendar +
            '</button>' +
            '<div class="drop cal" role="dialog" aria-label="Выбор даты"></div>' +
          '</div>' +
          select(p, 'time') +
        '</div>' +
        '<div class="form__row">' + select(p, 'guests') + select(p, 'format') + '</div>' +
        questionField(p) +
      '</div>' + formEnd(p, submit);
  }
  // Форма консультации: имя, телефон, вопрос
  function askHTML(p, submit) {
    return '<form class="form" data-form="demo" method="post" novalidate>' +
      '<div class="form__fields">' + nameField(p) + phoneField(p) + questionField(p) + '</div>' + formEnd(p, submit);
  }
  window.ARKA = window.ARKA || {};
  window.ARKA.formHTML = formHTML;
  window.ARKA.icons = ICON;

  // Форма внизу главной: разметка вставляется в [data-rent-form], если её там ещё нет (статичная копия — tools/includes.mjs)
  Array.prototype.forEach.call(document.querySelectorAll('[data-rent-form]'), function (mount) {
    if (!mount.querySelector('form')) mount.innerHTML = formHTML(mount.getAttribute('data-rent-form') || 'f', 'Арендовать помещение');
  });

  function makePanel(id, title, text, form) {
    var el = document.createElement('div');
    el.className = 'rent';
    el.id = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', id + '-title');
    el.setAttribute('data-lenis-prevent', '');
    el.innerHTML =
      '<div class="rent__overlay" data-rent-close></div>' +
      '<div class="rent__panel" tabindex="-1">' +
        '<button class="rent__close" type="button" data-rent-close aria-label="Закрыть форму">' + ICON.close + '</button>' +
        '<div class="rent__inner">' +
          '<div class="rent__head">' +
            '<h2 class="t-h2" id="' + id + '-title">' + title + '</h2>' +
            '<p class="t-body">' + text + '</p>' +
          '</div>' +
          form +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }
  var panels = {
    rent: makePanel('arenda-form', 'Аренда помещения', 'Оставьте заявку&nbsp;— перезвоним в&nbsp;течение дня, проверим свободные даты и&nbsp;ответим на&nbsp;вопросы.', formHTML('r', 'Отправить')),
    ask: makePanel('vopros-form', 'Заявка на&nbsp;консультацию', 'Оставьте телефон&nbsp;— перезвоним в&nbsp;течение дня и&nbsp;ответим на&nbsp;вопросы о&nbsp;зале, датах и&nbsp;стоимости.', askHTML('q', 'Отправить'))
  };
  // «Задать вопрос» и мессенджеры — консультация, остальные кнопки — аренда
  var ASK = { ask: 1, telegram: 1, whatsapp: 1, viber: 1 };
  function panelFor(mode) { return ASK[mode] ? panels.ask : panels.rent; }
  function current() { return panels.rent.classList.contains('is-open') ? panels.rent : panels.ask.classList.contains('is-open') ? panels.ask : null; }

  var returnTo = null;
  var timer = 0;
  function lenis() { return window.ARKA && window.ARKA.lenis; }
  function focusables(panel) {
    return Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), textarea'), function (el) { return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; });   // крестик закреплён (fixed) — offsetParent у него пустой, поэтому — по getClientRects
  }
  function open(mode, from) {
    var panel = panelFor(mode);
    var other = panel === panels.rent ? panels.ask : panels.rent;
    clearTimeout(timer);
    other.classList.remove('is-open', 'is-closing');
    returnTo = from || document.activeElement;
    panel.classList.remove('is-closing');
    panel.querySelector('.rent__panel').scrollTop = 0;
    panel.classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    if (lenis()) lenis().stop();
    var box = panel.querySelector('.rent__panel');
    setTimeout(function () { box.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    var panel = current();
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.classList.add('is-closing');
    var menuOpen = document.querySelector('.menu.is-open');
    if (!menuOpen) {
      document.documentElement.classList.remove('is-locked');
      if (lenis()) lenis().start();
    }
    timer = setTimeout(function () { panel.classList.remove('is-closing'); }, 800);
    if (returnTo && returnTo.focus) returnTo.focus({ preventScroll: true });
    if (location.hash === '#' + panel.id) history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-rent]');
    if (trigger && !trigger.closest('.rent')) {
      event.preventDefault();
      if (window.ARKA.closeMenu) window.ARKA.closeMenu(function () {});
      open(trigger.getAttribute('data-rent'), trigger.closest('.menu') ? document.querySelector('[data-menu-open]') : trigger);
      return;
    }
    if (event.target.closest('[data-rent-close]')) close();
  });
  document.addEventListener('keydown', function (event) {
    var panel = current();
    if (!panel) return;
    if (event.key === 'Escape' && !panel.querySelector('.field.is-open')) { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      var list = focusables(panel);
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      var onBox = document.activeElement === panel.querySelector('.rent__panel');
      if (onBox) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  function fromHash() {
    if (location.hash === '#arenda-form') open('rent');
    else if (location.hash === '#vopros-form') open('ask');
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
  window.ARKA.openRent = open;
  window.ARKA.closeRent = close;
})();
