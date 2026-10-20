// 3D-модель зала (задание 3, drafts/room-3d.md): подписи размеров (только в пустом зале) и кнопки на модели.
// Правка владельца 2026-10-16 (L127): точек 1–5 с фото нет — модель только крутится и приближается.
// Правки владельца 2026-10-19: подписи длин стоят на серединах своих размерных линий (линии — scene.js, R.createDims;
// было: «не совсем понятно, что к чему относится»), «высота потолка 4,5 м» вместо «потолок до 4,5 м»; новая кнопка
// «На весь экран» (main.js — Fullscreen API или, где его нет для блоков, как на iPhone, — рамка на всё окно).
// Масштаб — как у карт (Яндекс, 2ГИС): «+» над «−» одной плашкой справа по центру рамки, ниже отдельно — «Вернуть вид»
// (ракурс расстановки и исходный масштаб, как Reset Layout у 3D-плана QEII) и «На весь экран». Уже 1024 рамка узкая —
// кнопки строкой в правом верхнем углу (внизу — карточка расстановок; места задаёт room3d.css). Квадраты 56 (L32),
// углы прямые (L22). Подпись на стене прячется, пока эта стена срезана.
(function (w) {
  var R = w.Room3D, P = R.plan;
  // «Вернуть вид» — значок «прицел» (правка владельца 2026-10-19, вечер: стрелку по кругу читали как «вращение» и думали,
  // что кнопка не работает; выбор владельца — оставить «Вернуть вид», сменить значок и подписать при наведении). Пока
  // модель стоит в исходном ракурсе и масштабе, кнопка неактивна (бледная): нажимать нечего — видно, что это не поломка.
  var ICON_RESET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>';   // Material Icons (Apache 2.0): my_location
  var ICON_FULL = '<svg class="room3d__ifull" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +   // Material Icons: fullscreen
    '<svg class="room3d__iexit" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';   // fullscreen_exit

  R.createUi = function (root, layer, opts) {
    var labelsOn = true, stage = root.querySelector('.room3d__stage');
    var marks = (P.dims || []).map(function (d) { var k = d.at != null ? d.at : 0.5; return { x: d.a[0] + (d.b[0] - d.a[0]) * k, y: d.a[1] + (d.b[1] - d.a[1]) * k, h: d.a[2] + (d.b[2] - d.a[2]) * k + (d.a[2] === d.b[2] ? 0.02 : 0), text: d.text }; })
      .concat(P.labels);
    var labels = marks.map(function (l) {
      var s = document.createElement('span');
      s.className = 'room3d__label'; s.textContent = l.text; layer.appendChild(s);
      return { p: l, el: s };
    });
    // Масштаб: «+» и «−» одной плашкой, «Вернуть вид» и «На весь экран» — отдельно
    var zoom = document.createElement('div');
    zoom.className = 'room3d__zoom';
    // Подпись кнопки — при наведении мышью (room3d.css, .room3d__ztip): у всех четырёх кнопок, а не только у «Вернуть вид»
    var tip = function (t) { return '<span class="room3d__ztip" aria-hidden="true">' + t + '</span>'; };
    zoom.innerHTML = '<div class="room3d__zpair" role="group" aria-label="Масштаб модели"><button class="room3d__zbtn room3d__zbtn--in" type="button" aria-label="Приблизить">' + tip('Приблизить') + '</button><button class="room3d__zbtn room3d__zbtn--out" type="button" aria-label="Отдалить">' + tip('Отдалить') + '</button></div>' +
      '<button class="room3d__zbtn room3d__zbtn--reset" type="button" aria-label="Вернуть вид">' + ICON_RESET + tip('Вернуть вид') + '</button>' +
      '<button class="room3d__zbtn room3d__zbtn--full" type="button" aria-label="На весь экран" aria-pressed="false">' + ICON_FULL + tip('На&nbsp;весь экран') + '</button>';
    var zin = zoom.querySelector('.room3d__zbtn--in'), zout = zoom.querySelector('.room3d__zbtn--out'), full = zoom.querySelector('.room3d__zbtn--full');
    var resetBtn = zoom.querySelector('.room3d__zbtn--reset'), fullTip = full.querySelector('.room3d__ztip');
    zin.addEventListener('click', function () { opts.onZoom(1); });
    zout.addEventListener('click', function () { opts.onZoom(-1); });
    resetBtn.addEventListener('click', function () { opts.onReset(); });
    full.addEventListener('click', function () { opts.onFull(); });
    stage.appendChild(zoom);
    // Как подписи 3D-карты: подписи не налезают друг на друга — по порядку плана; подпись, которая задела уже
    // показанную (с зазором 4 px: по 2 у каждой), прячется
    function put(item, on, placed) {
      var q = opts.project(item.p.x, item.p.y, item.p.h);
      var shown = on && q.visible && (!item.p.wall || opts.wallCut(item.p.wall) < 0.5);
      if (shown) {
        var hw = item.el.offsetWidth / 2 + 2, hh = item.el.offsetHeight / 2 + 2, r = { l: q.x - hw, r: q.x + hw, t: q.y - hh, b: q.y + hh };
        shown = !placed.some(function (o) { return r.l < o.r && r.r > o.l && r.t < o.b && r.b > o.t; });
        if (shown) placed.push(r);
      }
      item.el.style.transform = 'translate3d(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      item.el.classList.toggle('is-hidden', !shown);
    }
    return {
      setView: function (id) { labelsOn = id === 'empty'; },
      zoomBox: function () { return zoom; },
      // на пределе приближения кнопка гаснет и не нажимается
      setZoomLimits: function (atMin, atMax) { zin.disabled = atMin; zout.disabled = atMax; },
      // модель в исходном ракурсе и масштабе — «Вернуть вид» неактивна (фокус с неё не теряется: aria-disabled)
      setResetOff: function (off) {
        if (resetBtn.classList.contains('is-off') === off) return;
        resetBtn.classList.toggle('is-off', off);
        resetBtn.setAttribute('aria-disabled', String(off));
      },
      setFull: function (on) {
        full.setAttribute('aria-pressed', String(on));
        full.setAttribute('aria-label', on ? 'Свернуть' : 'На весь экран');
        fullTip.textContent = on ? 'Свернуть' : 'На весь экран';
      },
      layout: function () { var placed = []; labels.forEach(function (it) { put(it, labelsOn, placed); }); }
    };
  };
})(window);
