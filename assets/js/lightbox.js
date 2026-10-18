// Фото на весь экран: миниатюра — ссылка на крупный файл (без JS открывается сам файл), по клику — окно <dialog>
// поверх страницы: фото вписано в экран (размер считается от окна браузера, а не от файла — фото не прыгает,
// пока грузится), под ним подпись. Закрывают крестик, Esc и клик по фону или по фото; появление и исчезновение —
// затуханием 0,4 с. Фокус возвращается на миниатюру, страница под окном не прокручивается. Окно скрипт создаёт сам.
//
// Разметка:
//   <a class="lightbox-thumb" href="img/foto-1600.webp" data-lightbox data-lightbox-w="1600" data-lightbox-h="1067"
//      data-caption="Подпись под фото">
//     <img src="img/foto-240.webp" width="120" height="90" loading="lazy" alt="Что на фото">
//     <span class="lightbox-thumb__plus" aria-hidden="true"></span>
//     <span class="visually-hidden">&nbsp;— открыть фото крупно</span>
//   </a>
// Атрибуты:
//   data-lightbox — включает окно; href — крупный файл (от 1200 px, если исходник позволяет).
//   data-lightbox-w / data-lightbox-h — размер крупного файла: пропорция окна известна до загрузки; без них — пропорция
//     миниатюры, после загрузки — пропорция файла.
//   data-caption — подпись; без неё подпись — alt миниатюры.
(function () {
  if (typeof HTMLDialogElement !== 'function') return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 400;
  var dialog = null, img, caption, opener = null, timer = 0;

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Фото');
    dialog.innerHTML = '<figure class="lightbox__figure"><img class="lightbox__img" alt=""><figcaption class="lightbox__caption"></figcaption></figure>' +
      '<button class="close-button lightbox__close" type="button" aria-label="Закрыть фото"></button>';
    document.body.append(dialog);
    img = dialog.querySelector('.lightbox__img');
    caption = dialog.querySelector('.lightbox__caption');
    img.addEventListener('load', function () {
      if (img.naturalWidth && img.naturalHeight) dialog.style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
    });
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); hide(); });
    dialog.addEventListener('click', hide);   // крестик, фото, фон — всё закрывает
    dialog.addEventListener('close', function () {
      clearTimeout(timer);
      dialog.classList.remove('is-closing');
      root.classList.remove('lightbox-open');
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });
  }

  function ratio(link) {
    var w = Number(link.getAttribute('data-lightbox-w')), h = Number(link.getAttribute('data-lightbox-h'));
    if (w > 0 && h > 0) return w / h;
    var thumb = link.querySelector('img');
    if (thumb && thumb.width && thumb.height) return thumb.width / thumb.height;
    return 1.5;
  }

  function show(link) {
    if (!dialog) build();
    clearTimeout(timer);
    opener = link;
    var thumb = link.querySelector('img');
    dialog.style.setProperty('--r', ratio(link).toFixed(4));
    img.removeAttribute('src');
    img.src = link.href;
    img.alt = thumb ? thumb.alt : '';
    var text = link.getAttribute('data-caption') || (thumb ? thumb.alt : '');
    caption.textContent = text;
    caption.hidden = !text;
    dialog.classList.remove('is-closing');
    root.style.setProperty('--sbw', Math.max(0, window.innerWidth - root.clientWidth) + 'px');
    root.classList.add('lightbox-open');
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.lightbox__close').focus({ preventScroll: true });
  }

  function hide() {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
    if (reduce.matches) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    timer = setTimeout(function () { dialog.close(); }, DURATION);
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[data-lightbox]');
    if (!link) return;
    event.preventDefault();
    show(link);
  });
})();
