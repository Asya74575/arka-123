// 3D-модель зала (задание 3, drafts/room-3d.md): кнопки видов, подписи размеров (только в пустом зале), подсказка
// и кнопки приближения на самой модели.
// Правка владельца 2026-10-16 (L127): точек 1–5 с фото больше нет — щелчок по ним открывал фото на весь экран, а владелец
// ждала, что модель просто крутится (фото зала — в галерее «Фото»). На модели — подсказка со значками: потянуть —
// поворот, Ctrl + колесо или + / − — масштаб (на телефоне: пальцем — поворот, двумя пальцами — масштаб); она стоит
// всё время, не гаснет. Подсказка — в левом нижнем углу модели, кнопки + / − — в правом нижнем (с 2026-10-18, когда модель
// встала в большую рамку «Наше помещение»: верх рамки закрывает шапка; места задаёт room3d.css), квадраты 56 (L32),
// углы прямые (L22).
// Подпись на стене прячется, пока эта стена срезана.
(function (w) {
  var R = w.Room3D, P = R.plan;
  var ICON_ROTATE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7C6.48 7 2 9.24 2 12c0 2.24 2.94 4.13 7 4.77V20l4-4-4-4v2.73c-3.15-.56-5-1.9-5-2.73 0-1.06 3.04-3 8-3s8 1.94 8 3c0 .73-1.46 1.89-4 2.53v2.05c3.53-.77 6-2.53 6-4.58 0-2.76-4.48-5-10-5z"/></svg>';
  var ICON_ZOOM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>';   // значки — Material Icons (Apache 2.0): «360» и zoom_in

  R.createUi = function (root, layer, opts) {
    var bar = root.querySelector('.room3d__views'), buttons = {}, labelsOn = true;
    var stage = root.querySelector('.room3d__stage');
    P.order.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'room3d__view'; b.textContent = P.views[id].label; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { opts.onView(id); });
      bar.appendChild(b); buttons[id] = b;
    });
    var labels = P.labels.map(function (l) {
      var s = document.createElement('span');
      s.className = 'room3d__label'; s.textContent = l.text; layer.appendChild(s);
      return { p: l, el: s };
    });
    // Подсказка на модели: значок и строка на белой плашке, как подписи 3D-карты
    var touch = w.matchMedia('(pointer: coarse)').matches;
    var tip = document.createElement('div');
    tip.className = 'room3d__tip'; tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML =
      '<p class="room3d__tip-row">' + ICON_ROTATE + '<span>' + (touch ? 'Поворот: проведите пальцем' : 'Поворот: потяните мышью') + '</span></p>' +
      '<p class="room3d__tip-row">' + ICON_ZOOM + '<span>' + (touch ? 'Масштаб: двумя пальцами' : 'Масштаб: Ctrl + колесо или кнопки + и −') + '</span></p>';
    stage.appendChild(tip);
    // Кнопки приближения
    var zoom = document.createElement('div');
    zoom.className = 'room3d__zoom'; zoom.setAttribute('role', 'group'); zoom.setAttribute('aria-label', 'Масштаб модели');
    zoom.innerHTML = '<button class="room3d__zbtn room3d__zbtn--in" type="button" aria-label="Приблизить"></button><button class="room3d__zbtn room3d__zbtn--out" type="button" aria-label="Отдалить"></button>';
    var zin = zoom.querySelector('.room3d__zbtn--in'), zout = zoom.querySelector('.room3d__zbtn--out');
    zin.addEventListener('click', function () { opts.onZoom(1); });
    zout.addEventListener('click', function () { opts.onZoom(-1); });
    stage.appendChild(zoom);
    // Как подписи 3D-карты: подписи не налезают друг на друга — по порядку плана; подпись, которая задела уже
    // показанную (с зазором 4 px), прячется
    function put(item, on, placed) {
      var q = opts.project(item.p.x, item.p.y, item.p.h);
      var shown = on && q.visible && (!item.p.wall || opts.wallCut(item.p.wall) < 0.5);
      if (shown) {
        var hw = item.el.offsetWidth / 2 + 4, hh = item.el.offsetHeight / 2 + 4, r = { l: q.x - hw, r: q.x + hw, t: q.y - hh, b: q.y + hh };
        shown = !placed.some(function (o) { return r.l < o.r && r.r > o.l && r.t < o.b && r.b > o.t; });
        if (shown) placed.push(r);
      }
      item.el.style.transform = 'translate3d(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      item.el.classList.toggle('is-hidden', !shown);
    }
    return {
      setView: function (id) { for (var k in buttons) buttons[k].setAttribute('aria-pressed', String(k === id)); labelsOn = id === 'empty'; },
      // на пределе приближения кнопка гаснет и не нажимается
      setZoomLimits: function (atMin, atMax) { zin.disabled = atMin; zout.disabled = atMax; },
      layout: function () { var placed = []; labels.forEach(function (it) { put(it, labelsOn, placed); }); }
    };
  };
})(window);
