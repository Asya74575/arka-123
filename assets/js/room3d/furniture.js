// 3D-модель зала (задание 3, drafts/room-3d.md): мебель четырёх расстановок — стулья, столы, экран на стойке, проектор,
// флипчарт. Новая расстановка поднимается из пола и проявляется (≈1,2 с, каждый предмет ≈0,8 с, от окон вглубь),
// прежняя опускается и гаснет за 0,5 с. Переключения подряд всегда приходят к последнему виду.
// Облик — как у карты (scene.js): столы и стулья песочные с тёмными рёбрами, стойки и экран — белые с серыми;
// рёбра гаснут вместе с мебелью (у линий своя прозрачность — userData.base).
(function (w) {
  var R = w.Room3D, T = w.THREE, P = R.plan, L = R.logic;
  var SHOW = 1.2, HIDE = 0.5, RISE = 0.35, cache = {};

  function box(sx, sy, sz, x, y, z) { var g = new T.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; }
  // Предметы строятся «лицом» к +X: сидящий смотрит на +X, экран и флипчарт — поверхностью к +X
  function chairGeo() {
    if (!cache.chair) {
      var parts = [box(0.46, 0.05, 0.46, 0, 0.455, 0), box(0.04, 0.42, 0.44, -0.21, 0.71, 0)];
      [[-0.19, -0.19], [-0.19, 0.19], [0.19, -0.19], [0.19, 0.19]].forEach(function (p) { parts.push(box(0.03, 0.43, 0.03, p[0], 0.215, p[1])); });
      cache.chair = T.mergeGeometries(parts);
    }
    return cache.chair;
  }
  function tableGeo(wd, dp) {
    var key = wd + 'x' + dp;
    if (!cache[key]) {
      var legs = [], ix = wd / 2 - 0.06, iz = dp / 2 - 0.06, xs = [-ix, ix], extra = Math.floor(wd / 2.4);
      for (var i = 1; i <= extra; i++) xs.push(-ix + 2 * ix * i / (extra + 1));
      xs.forEach(function (x) { legs.push(box(0.05, 0.72, 0.05, x, 0.36, -iz), box(0.05, 0.72, 0.05, x, 0.36, iz)); });
      cache[key] = { top: box(wd, 0.04, dp, 0, 0.74, 0), legs: T.mergeGeometries(legs) };
    }
    return cache[key];
  }
  function build(it, m) {
    var g = new T.Group(), t;
    if (it.type === 'chair') g.add(new T.Mesh(chairGeo(), m.chair));
    else if (it.type === 'table') { t = tableGeo(it.w, it.d); g.add(new T.Mesh(t.top, m.oak), new T.Mesh(t.legs, m.graphite)); }
    else if (it.type === 'screen') {
      var surf = new T.Mesh(new T.PlaneGeometry(it.w, 2.25), m.slide);
      surf.rotation.y = Math.PI / 2; surf.position.set(0.03, 2.125, 0);
      g.add(surf, new T.Mesh(box(0.03, 2.33, it.w + 0.08, 0, 2.125, 0), m.graphite),
        new T.Mesh(T.mergeGeometries([box(0.04, 3.3, 0.04, -0.08, 1.65, 0), box(0.7, 0.03, 0.05, -0.08, 0.015, 0), box(0.05, 0.03, 0.9, -0.08, 0.015, 0)]), m.graphite));
    } else if (it.type === 'projector') {
      g.add(new T.Mesh(T.mergeGeometries([box(0.04, 1.05, 0.04, 0, 0.525, 0), box(0.5, 0.03, 0.05, 0, 0.015, 0), box(0.05, 0.03, 0.5, 0, 0.015, 0), box(0.42, 0.03, 0.36, 0, 1.06, 0)]), m.graphite),
        new T.Mesh(box(0.3, 0.12, 0.26, 0, 1.135, 0), m.white), new T.Mesh(box(0.04, 0.07, 0.07, 0.17, 1.135, 0.06), m.graphite));
    } else if (it.type === 'flipchart') {
      g.add(new T.Mesh(box(0.02, 1.0, 0.7, 0.03, 1.3, 0), m.white),
        new T.Mesh(T.mergeGeometries([box(0.03, 1.9, 0.03, 0, 0.95, -0.3), box(0.03, 1.9, 0.03, 0, 0.95, 0.3), box(0.03, 1.7, 0.03, -0.35, 0.85, 0), box(0.04, 0.04, 0.72, 0.03, 1.82, 0)]), m.graphite));
    }
    g.traverse(function (c) {
      if (!c.isMesh || c.material === m.slide) return;
      R.edges(c, c.material === m.oak || c.material === m.chair ? m.lineA : m.lineN);
    });
    return g;
  }
  function line(color, base) { var l = new T.LineBasicMaterial({ color: color, transparent: true, opacity: base }); l.userData.base = base; return l; }

  R.createFurniture = function (scene, M) {
    var views = {};
    P.order.forEach(function (id) {
      var m = { oak: M.oak.clone(), graphite: M.graphite.clone(), chair: M.chair.clone(), white: M.white.clone(), slide: M.slide.clone(),
        lineA: line(R.colors.accentEdge, 0.9), lineN: line(R.colors.edge, 0.55) };
      var group = new T.Group(), items = P.views[id].items, meshes = [], rank = [];
      group.visible = false; scene.add(group);
      // очередь появления: от окон вглубь зала, затем с запада на восток
      items.map(function (it, i) { return i; })
        .sort(function (a, b) { return items[a].y - items[b].y || items[a].x - items[b].x; })
        .forEach(function (idx, r) { rank[idx] = items.length > 1 ? r / (items.length - 1) : 0; });
      var objs = items.map(function (it, i) {
        var o = build(it, m);
        o.position.copy(R.toWorld(it.x, it.y, 0)); o.rotation.y = it.rot * Math.PI / 180;
        o.traverse(function (c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; meshes.push(c); } });
        group.add(o);
        return { o: o, d: rank[i] };
      });
      views[id] = { group: group, m: m, objs: objs, meshes: meshes, vis: 0, want: 0 };
    });
    function paint(v) {
      var a = Math.min(1, v.vis * 2.5);
      for (var k in v.m) {
        var base = v.m[k].userData.base || 1, mat = v.m[k], tr = a * base < 0.999;
        mat.opacity = a * base;
        if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
      }
      v.objs.forEach(function (it) {
        var p = Math.max(0, Math.min(1, (v.vis - it.d * 0.35) / 0.65));
        it.o.position.y = -RISE * (1 - L.easeInOut(p));
      });
      v.group.visible = v.vis > 0;
    }
    return {
      show: function (id, instant) {
        for (var k in views) {
          views[k].want = k === id ? 1 : 0;
          if (instant) { views[k].vis = views[k].want; paint(views[k]); }
        }
      },
      update: function (dt) {
        var busy = false;
        for (var k in views) {
          var v = views[k];
          if (v.vis === v.want) continue;
          v.vis = v.want > v.vis ? Math.min(1, v.vis + dt / SHOW) : Math.max(0, v.vis - dt / HIDE);
          paint(v); busy = true;
        }
        return busy;
      },
      busy: function () { for (var k in views) if (views[k].vis !== views[k].want) return true; return false; },
      meshes: function (id) { return views[id] ? views[id].meshes : []; },
      shown: function () { return Object.keys(views).filter(function (k) { return views[k].vis > 0; }); }
    };
  };
})(window);
