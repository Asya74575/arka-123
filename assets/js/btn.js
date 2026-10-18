// Кнопки на всех страницах (base.css, раздел «Кнопка»; правка владельца 2026-10-15: анимация была дёрганой).
// Подпись кнопки — две копии текста. Скрипт делит каждую копию на слова и буквы: при наведении буквы первой копии
// по одной уходят вверх, буквы второй поднимаются снизу. Задержка буквы — её место в подписи: волна слева направо
// за 0,2 с, как у ERA (hover-nav-item: шаг 2 × 0,1 с по положению буквы). Сами переходы — в CSS (0,8 с).
// Без скрипта и при «уменьшении движения» подпись перекатывается целиком.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SPREAD = .2;

  function splitCopy(copy) {
    var text = copy.textContent;
    var total = text.replace(/\s/g, '').length;
    var n = 0;
    copy.textContent = '';
    // Слова делятся только обычным пробелом: неразрывный («в карту») держит слова вместе
    text.split(/( +)/).forEach(function (part) {
      if (!part) return;
      if (/^ +$/.test(part)) { copy.appendChild(document.createTextNode(part)); return; }
      var w = document.createElement('span');
      w.className = 'btn__w';
      Array.prototype.forEach.call(part, function (ch) {
        var c = document.createElement('span');
        c.className = 'btn__c';
        c.textContent = ch;
        if (!/\s/.test(ch)) { c.style.setProperty('--d', (total > 1 ? n / (total - 1) * SPREAD : 0).toFixed(3) + 's'); n++; }
        w.appendChild(c);
      });
      copy.appendChild(w);
    });
  }

  function split(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.btn__label:not(.is-split)'), function (label) {
      var copies = label.children;
      if (copies.length < 2) return;
      Array.prototype.forEach.call(copies, splitCopy);
      label.classList.add('is-split');
    });
  }

  window.ARKA = window.ARKA || {};
  window.ARKA.splitButtons = split;
  split();
})();
