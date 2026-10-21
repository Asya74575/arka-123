// Первый экран выше окна (правка владельца 2026-10-21 на 1439–1024: «сделай отступ между кнопкой и текстами в 60 px + также
// увеличь высоту херо блока» — на невысоком окне экран растёт под содержимое, home.css; телефон — экран не ниже 420 px):
// - закреплённый экран (sticky) встаёт, когда его низ дошёл до низа окна, а не сразу — иначе строка фактов под краем окна
//   не видна, пока арка «Окна» не закроет экран (L179): top = окно − высота экрана, не больше 0;
// - 1024–1439: --hero-g — высота заголовка с кнопкой, промежутка и фактов; по ней home.css поднимает заголовок на невысоком
//   окне ровно настолько, чтобы факты при открытии были видны целиком (на 1434 × 530 строка фактов стояла на краю окна).
// От 1440 — как было.
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var content = hero.querySelector('.hero__content');
  var facts = hero.querySelector('.hero__facts');
  var mq = window.matchMedia('(max-width: 1439.98px)');
  var mqGroup = window.matchMedia('(min-width: 1024px) and (max-width: 1439.98px)');
  function fit() {
    if (mqGroup.matches && content && facts) {
      var g = content.getBoundingClientRect().height + parseFloat(getComputedStyle(content).marginBottom) + facts.getBoundingClientRect().height;
      hero.style.setProperty('--hero-g', g + 'px');
    } else hero.style.removeProperty('--hero-g');
    var over = mq.matches ? hero.getBoundingClientRect().height - window.innerHeight : 0;   // дробная высота: offsetHeight округляет — снизу оставалась щель 0,16 px
    hero.style.top = over > 0 ? -over + 'px' : '';
  }
  fit();
  window.addEventListener('resize', fit);
  if (mq.addEventListener) { mq.addEventListener('change', fit); mqGroup.addEventListener('change', fit); }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(hero);
})();
