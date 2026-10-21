// Арки (ТЗ 5.4, раскадровка Figma 629:390, механика ERA, L70).
// Арка поднимается обычной прокруткой — ровно с её скоростью; надпись, метки и заголовок едут вместе с ней.
// На компьютере (≥1024) перед тем, как экран слайдов встанет в окно, круг расширяется с 1920 до 2400 (scale .8 → 1):
// пока верх арки уходит за край экрана с −0,28 до −0,56 радиуса (шаги 5 → 6 раскадровки) — и закрывает углы.
// Блок помечает фон под шапкой: пока на линии середины шапки арка не дошла до логотипа и бургера (у полей) —
// data-bg="dark" (шапка светлая, над фото), потом "light" (на компьютере — с шага 6 раскадровки).
// Когда арка закрыла экран целиком, первый экран прячется (не рисуется под аркой).
(function () {
  var ARKA = window.ARKA || {};
  var block = document.querySelector('[data-arch]');
  if (!block) return;
  var circle = block.querySelector('.windows__circle');
  var hero = document.querySelector('.hero');
  if (!ARKA.motion || !window.gsap) { block.setAttribute('data-bg', 'light'); return; }
  var gsap = window.gsap;
  var mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', function () {
    var R = function () { return block.getBoundingClientRect().width / 2; };
    var tween = gsap.fromTo(circle, { scale: .8 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: block, start: function () { return 'top top-=' + .28125 * R(); }, end: function () { return 'top top-=' + .5625 * R(); }, scrub: true, invalidateOnRefresh: true }
    });
    return function () { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); gsap.set(circle, { clearProps: 'transform' }); };
  });
  var queued = false;
  function update() {
    queued = false;
    var r = block.getBoundingClientRect();
    var c = circle.getBoundingClientRect();
    var W = r.width, Rc = c.width / 2;
    var hdr = document.querySelector('[data-hdr]');
    var mid = hdr ? hdr.getBoundingClientRect().height / 2 : 40;
    var gutter = parseFloat(getComputedStyle(block).getPropertyValue('--gutter')) || 0;
    if (!gutter) { var logo = document.querySelector('.hdr__logo'); gutter = logo ? logo.getBoundingClientRect().left : 0; }
    var dm = mid - r.top;                               // глубина линии середины шапки под верхом арки
    var hw = dm <= 0 ? 0 : dm >= Rc ? Rc : Math.sqrt(Rc * Rc - (Rc - dm) * (Rc - dm));
    var underHeader = hw >= W / 2 - gutter - 1;         // арка закрыла линию шапки до полей
    var depth = -r.top;                                 // углы экрана закрыты целиком
    var covered = Rc >= W / 2 && depth >= Rc - Math.sqrt(Rc * Rc - W * W / 4) - 1;
    block.setAttribute('data-bg', underHeader || r.bottom < 0 ? 'light' : 'dark');
    if (hero) hero.style.visibility = covered && r.top < -2 ? 'hidden' : '';
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  if (ARKA.lenis) ARKA.lenis.on('scroll', request);
  update();
})();

// Арки «Форматы» и «Аренда» — как арка «Окна» (правка владельца 2026-10-15: «анимации как во втором блоке»).
// С движением, на всех ширинах (с 2026-10-21 и уже 1024 — правка владельца: «отсутствует анимация наложения фона блока»):
// блок перед аркой (3D-модель, вопросы — [data-arch-under]) встаёт низом к краю окна и стоит,
// пока арка поднимается поверх него и закрывает углы (CSS sticky: top = высота окна − высота блока, класс is-under
// на обёртке, после блока — пустой промежуток в экран и 0,5625 радиуса арки, арка поднята на столько же, home.css).
// У «Вопросов» перед подъёмом арки — пауза 600 px прокрутки (--under-hold, правка владельца 2026-10-16, L125).
// Если блок ниже окна, он не закрепляется: под ним был бы виден предыдущий закреплённый блок.
// Компьютер (≥1024): круг арки расширяется с 1920 до 2400 (scale .8 → 1), пока её верх уходит за край окна с −0,28 до −0,56
// радиуса; уже 1024 круг сразу шире экрана и не меняется.
(function () {
  var ARKA = window.ARKA || {};
  if (!ARKA.motion || !window.gsap) return;
  var gsap = window.gsap;
  var mm = gsap.matchMedia();
  var wraps = Array.prototype.slice.call(document.querySelectorAll('.under-wrap'));
  mm.add('(min-width: 1024px)', function () {
    var tweens = Array.prototype.map.call(document.querySelectorAll('[data-arch-next]'), function (block) {
      var circle = block.querySelector('.ashape__c');
      if (!circle) return null;
      var R = function () { return block.getBoundingClientRect().width / 2; };
      return gsap.fromTo(circle, { scale: .8 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: block, start: function () { return 'top top-=' + .28125 * R(); }, end: function () { return 'top top-=' + .5625 * R(); }, scrub: true, invalidateOnRefresh: true }
      });
    }).filter(Boolean);
    return function () {
      tweens.forEach(function (t) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
      gsap.set(document.querySelectorAll('[data-arch-next] .ashape__c'), { clearProps: 'transform' });
    };
  });
  (function () {
    var ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
    function fit() {
      var changed = false;
      wraps.forEach(function (w) {
        var under = w.querySelector('[data-arch-under]');
        if (!under) return;
        var gap = window.innerHeight - under.offsetHeight;
        var on = gap <= 0;
        under.style.setProperty('--under-top', Math.min(0, gap) + 'px');
        if (w.classList.contains('is-under') !== on) { w.classList.toggle('is-under', on); changed = true; }
      });
      if (changed) window.ScrollTrigger.refresh();
    }
    wraps.forEach(function (w) { var u = w.querySelector('[data-arch-under]'); if (u && ro) ro.observe(u); });
    window.addEventListener('resize', fit);
    fit();
  })();
})();

// Надпись по дуге уже 1024 (рисунки .arc--t, .arc--m): кегль — в px из font-size рисунка (home.css), а не доля ширины окна:
// рисунок дуги растёт с окном, текст — нет (правка владельца 2026-10-21: «текст с Н2 одинаковой высоты», «вылазит за границы»;
// arka-123-74). Разрядка — в той же доле кегля; исходные кегль и разрядка — в data-fs0 / data-ls0 (от них разлёт слов, motion.js)
(function () {
  var arcs = Array.prototype.slice.call(document.querySelectorAll('svg.arc--t, svg.arc--m'));
  arcs.forEach(function (svg) {
    var t = svg.querySelector('text');
    if (t && !t.hasAttribute('data-fs0')) { t.setAttribute('data-fs0', t.getAttribute('font-size')); t.setAttribute('data-ls0', t.getAttribute('letter-spacing') || '0'); }
  });
  function fit() {
    arcs.forEach(function (svg) {
      var w = svg.getBoundingClientRect().width, t = svg.querySelector('text');
      if (!w || !t) return;
      var u = parseFloat(getComputedStyle(svg).fontSize) * svg.viewBox.baseVal.width / w;
      t.setAttribute('font-size', u.toFixed(2));
      t.setAttribute('letter-spacing', (parseFloat(t.getAttribute('data-ls0')) / parseFloat(t.getAttribute('data-fs0')) * u).toFixed(3));
    });
  }
  window.addEventListener('resize', fit);
  fit();
})();
