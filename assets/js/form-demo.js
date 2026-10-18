// Демонстрационная форма аренды (UI-кит 607:96): списки, календарь, маска телефона, проверка полей.
// Обслуживает все формы form[data-form="demo"] на странице (панель аренды и форма внизу главной).
// Ничего не отправляет и честно об этом говорит (бриф). Без JS кнопка отправки выключена.
// Обязательные поля: имя, телефон, согласие. Ошибки — под полем; поле с ошибкой обведено цветом --error.
(function () {
  var MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var AHEAD = 6;   // календарь — на 6 месяцев вперёд
  var ARROW_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" fill="none"/></svg>';

  function closeAll(except) {
    Array.prototype.forEach.call(document.querySelectorAll('.field.is-open'), function (f) {
      if (f !== except) setOpen(f, false);
    });
  }
  function setOpen(field, open) {
    field.classList.toggle('is-open', open);
    var b = field.querySelector('button.field__box');
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  function setValue(field, value) {
    field.querySelector('input[type="hidden"]').value = value;
    var v = field.querySelector('.field__value');
    v.textContent = value || v.getAttribute('data-placeholder');
    v.classList.toggle('field__placeholder', !value);
  }
  function setError(field, text) {
    field.classList.toggle('is-error', !!text);
    var err = field.querySelector('.field__error');
    if (err) err.textContent = text || '';
    var input = field.querySelector('input:not([type="hidden"]), textarea');
    if (input) { if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }

  // ---------- Выпадающие списки ----------
  function initSelect(field) {
    var box = field.querySelector('.field__box');
    var items = Array.prototype.slice.call(field.querySelectorAll('.drop__item'));
    box.addEventListener('click', function () {
      var open = !field.classList.contains('is-open');
      closeAll(field);
      setOpen(field, open);
      if (open) { var sel = field.querySelector('[aria-selected="true"]') || items[0]; sel.focus(); }
    });
    items.forEach(function (item, i) {
      item.addEventListener('click', function () {
        items.forEach(function (o) { o.setAttribute('aria-selected', String(o === item)); });
        setValue(field, item.getAttribute('data-value'));
        setOpen(field, false);
        box.focus();
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(field, false); box.focus(); }
        else if (e.key === 'Tab') { setOpen(field, false); }
      });
    });
  }

  // ---------- Календарь: прошедшие дни недоступны, на 6 месяцев вперёд ----------
  function initDate(field) {
    var box = field.querySelector('.field__box');
    var cal = field.querySelector('.cal');
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var last = new Date(today.getFullYear(), today.getMonth() + AHEAD, 1);
    var picked = null;
    function render() {
      var y = view.getFullYear(), m = view.getMonth();
      var start = (new Date(y, m, 1).getDay() + 6) % 7;
      var days = new Date(y, m + 1, 0).getDate();
      var html = '<div class="cal__head">' +
        '<button type="button" class="cal__nav" data-step="-1" aria-label="Предыдущий месяц"' + (view <= new Date(today.getFullYear(), today.getMonth(), 1) ? ' disabled' : '') + '>' + ARROW_L + '</button>' +
        '<p class="cal__month" aria-live="polite">' + MONTHS[m].charAt(0).toUpperCase() + MONTHS[m].slice(1) + ' ' + y + '</p>' +
        '<button type="button" class="cal__nav" data-step="1" aria-label="Следующий месяц"' + (view >= last ? ' disabled' : '') + '>' + ARROW_R + '</button>' +
        '</div><div class="cal__week" aria-hidden="true">' + WEEK.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="cal__days">';
      for (var e = 0; e < start; e++) html += '<span></span>';
      for (var d = 1; d <= days; d++) {
        var date = new Date(y, m, d);
        var past = date < today;
        var sel = picked && date.getTime() === picked.getTime();
        html += '<button type="button" class="cal__day' + (date.getTime() === today.getTime() ? ' is-today' : '') + '" data-day="' + d + '"' +
          (past ? ' disabled' : '') + ' aria-selected="' + (sel ? 'true' : 'false') + '" aria-label="' + d + ' ' + MONTHS_GEN[m] + ' ' + y + '">' + d + '</button>';
      }
      cal.innerHTML = html + '</div>';
    }
    box.addEventListener('click', function () {
      var open = !field.classList.contains('is-open');
      closeAll(field);
      if (open) { if (picked) view = new Date(picked.getFullYear(), picked.getMonth(), 1); render(); }
      setOpen(field, open);
      if (open) { var f = cal.querySelector('.cal__day[aria-selected="true"]') || cal.querySelector('.cal__day:not(:disabled)'); if (f) f.focus(); }
    });
    cal.addEventListener('click', function (e) {
      var nav = e.target.closest('.cal__nav');
      if (nav && !nav.disabled) { view = new Date(view.getFullYear(), view.getMonth() + Number(nav.getAttribute('data-step')), 1); render(); cal.querySelector('.cal__nav[data-step="' + nav.getAttribute('data-step') + '"]').focus(); return; }
      var day = e.target.closest('.cal__day');
      if (day && !day.disabled) {
        picked = new Date(view.getFullYear(), view.getMonth(), Number(day.getAttribute('data-day')));
        setValue(field, picked.getDate() + ' ' + MONTHS_GEN[picked.getMonth()] + ' ' + picked.getFullYear());
        setOpen(field, false);
        box.focus();
      }
    });
    cal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(field, false); box.focus(); return; }
      var day = e.target.closest('.cal__day');
      if (!day) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      var all = Array.prototype.slice.call(cal.querySelectorAll('.cal__day:not(:disabled)'));
      var i = all.indexOf(day) + step;
      if (all[i]) all[i].focus();
    });
  }

  // ---------- Телефон: маска (00) 000-00-00 ----------
  function maskPhone(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d.indexOf('375') === 0 && d.length > 9) d = d.slice(3);
      d = d.slice(0, 9);
      var out = '';
      if (d.length) out = '(' + d.slice(0, 2);
      if (d.length >= 2) out += ') ' + d.slice(2, 5);
      if (d.length >= 5) out += '-' + d.slice(5, 7);
      if (d.length >= 7) out += '-' + d.slice(7, 9);
      input.value = out;
    });
  }

  function check(form, field) {
    var key = field.getAttribute('data-field');
    if (key === 'name') {
      var n = field.querySelector('input');
      setError(field, n.value.trim() ? '' : 'Укажите имя');
    } else if (key === 'phone') {
      var p = field.querySelector('input');
      setError(field, p.value.replace(/\D/g, '').length === 9 ? '' : 'Укажите номер полностью');
    } else if (key === 'consent') {
      var c = field.querySelector('input');
      setError(field, c.checked ? '' : 'Поставьте отметку, чтобы отправить заявку');
    }
    return !field.classList.contains('is-error');
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-form="demo"]'), function (form) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-select]'), initSelect);
    Array.prototype.forEach.call(form.querySelectorAll('[data-date]'), initDate);
    var phone = form.querySelector('[name="phone"]');
    if (phone) maskPhone(phone);
    var required = form.querySelectorAll('[data-field="name"], [data-field="phone"], [data-field="consent"]');
    Array.prototype.forEach.call(required, function (field) {
      var input = field.querySelector('input');
      // Ошибка появляется после ухода из заполненного поля или после попытки отправить, исчезает сразу после исправления
      if (input.type !== 'checkbox') input.addEventListener('blur', function () { if (input.value) check(form, field); });
      input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', function () { if (field.classList.contains('is-error')) check(form, field); });
    });
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = false;
    var status = form.querySelector('.form__status');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var ok = true, firstBad = null;
      Array.prototype.forEach.call(required, function (field) {
        if (!check(form, field)) { ok = false; if (!firstBad) firstBad = field.querySelector('input'); }
      });
      if (!ok) { if (status) status.textContent = ''; if (firstBad) firstBad.focus(); return; }
      if (status) status.textContent = 'Заявка не отправлена: это демонстрационная форма.';
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.field.is-open')) closeAll(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var f = document.querySelector('.field.is-open'); if (f) { setOpen(f, false); var b = f.querySelector('.field__box'); if (b) b.focus(); } }
  });
})();
