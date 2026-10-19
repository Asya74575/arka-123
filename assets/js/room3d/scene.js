// 3D-модель зала (задание 3, drafts/room-3d.md): материалы и сам зал по плану — пол, стены, два арочных окна,
// колонна и пилястры, часы, кухонная стенка, шкафы, стеклянная стена со входом, радиаторы.
// Облик — как у 3D-карты района в «Как добраться» (assets/js/map3d/fly.js, правка владельца 2026-10-15, L107):
// макет из белой бумаги — объёмы без текстур #f6f6f8 с тонкими серыми рёбрами, пол и земля в серо-голубых тонах
// карты, стекло — цвет кнопки #b1cae3 (как библиотека на карте), мебель — песочным акцентом #d7c9b7 с тёмными рёбрами
// (как дома с аркой), часы — тёмной линией; свет и мягкие тени — те же, что у карты. Стены, обращённые к зрителю,
// срезаются до plan.cutH: часть стены выше среза — своя группа, она плавно «опускается» (scale.y → 0 за 0,6 с).
// R.toWorld переводит план (x, y, высота) в координаты сцены: центр модели в нуле, y плана → −Z.
(function (w) {
  if (!w.THREE || !w.Room3D || !w.Room3D.plan) return;   // three.js не загрузился — остаётся картинка (room3d-loader.js)
  var R = w.Room3D, T = w.THREE, P = R.plan, L = R.logic;
  var UP = new T.Vector3(0, 1, 0);

  R.toWorld = function (x, y, h) { return new T.Vector3(x - P.center[0], h || 0, P.center[1] - y); };

  // Цвета — палитра карты (fly.js, const C) и токены сайта. Внутри зала видны в основном стены в тени, поэтому свет
  // ярче, чем у карты (рассеянный 2,8 вместо 1,9), а горизонтальные поверхности темнее «на бумаге» (свет считается в
  // линейном цвете, освещённый верх ×1,24): на экране земля — #dcdfe6, как у карты, пол чуть светлее — #eceef2,
  // мебель — песочным #d7c9b7, стены в тени — как теневые фасады карты.
  var C = R.colors = {
    ground: '#c8cbd1', slab: '#eef0f4', floor: '#d7d9dc', wall: '#f6f6f8', top: '#e5e7ec', edge: '#b9bdc6',
    glass: '#b1cae3', glassEdge: '#7f9dbb', accent: '#c3b7a6', accentEdge: '#584c40', ink: '#332920', light: '#f4efe7'
  };
  function canvasTex(wpx, hpx, draw) {
    var c = document.createElement('canvas');
    c.width = wpx; c.height = hpx;
    draw(c.getContext('2d'), wpx, hpx);
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  // Слайд на экране лекции: арка в цветах сайта (tokens.css: --light, --ink, --soft), без текста (правило 5)
  function slideTex() {
    return canvasTex(512, 384, function (ctx, W, H) {
      ctx.fillStyle = C.light; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 10; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(W * 0.4, H * 0.76); ctx.lineTo(W * 0.4, H * 0.44);
      ctx.arc(W * 0.5, H * 0.44, W * 0.1, Math.PI, 0); ctx.lineTo(W * 0.6, H * 0.76); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = '#8B8681';
      ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.84); ctx.lineTo(W * 0.7, H * 0.84); ctx.stroke();
    });
  }
  // Матовый материал, как у карты (MeshLambertMaterial); edge — цвет и прозрачность рёбер (их добавляет R.edges)
  function lam(color, edge, more) {
    var m = new T.MeshLambertMaterial({ color: color });
    for (var k in more) m[k] = more[k];
    if (edge) m.userData.edge = edge;
    return m;
  }
  var EDGE = [C.edge, 0.55], ACCENT_EDGE = [C.accentEdge, 0.9], GLASS_EDGE = [C.glassEdge, 1];
  // Рёбра объёма тонкой линией, как у домов карты (EdgesGeometry, угол 20°); линия — дочерний объект и опускается
  // вместе со срезанной стеной. Материал линии можно передать (мебель гасит свои линии вместе с собой).
  R.edges = function (mesh, lineMat) {
    var e = mesh.material && mesh.material.userData.edge;
    if (!e && !lineMat) return null;
    var mat = lineMat || new T.LineBasicMaterial({ color: e[0], transparent: e[1] < 1, opacity: e[1] });
    var line = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), mat);
    line.raycast = function () {};
    mesh.add(line);
    return line;
  };

  R.createMaterials = function () {
    return {
      floor: lam(C.floor),
      plaster: lam(C.wall, EDGE),
      cut: lam(C.top),
      graphite: lam(C.wall, EDGE),        // колонна, пилястры, ручки двери — белые, как дома карты
      dark: lam(C.wall, EDGE),            // кухонная стенка
      frame: new T.MeshBasicMaterial({ color: C.glassEdge }),   // рамы и импосты окон — тон рёбер стекла, без тени
      clock: lam(C.accentEdge),
      white: lam(C.wall, EDGE),
      skirting: lam(C.edge),
      slab: lam(C.slab, EDGE),
      ground: lam(C.ground),
      glass: lam(C.glass, GLASS_EDGE, { transparent: true, opacity: 0.4, depthWrite: false, side: T.DoubleSide }),
      pane: new T.MeshBasicMaterial({ color: C.glass, side: T.DoubleSide }),   // стекло арочных окон — ровный цвет кнопки, как библиотека на карте
      frosted: lam('#dfe7f0', null, { transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }),
      led: lam(C.wall),
      radiator: lam(C.wall, EDGE),
      oak: lam(C.accent, ACCENT_EDGE),
      chair: lam(C.accent, ACCENT_EDGE),
      slide: new T.MeshLambertMaterial({ color: '#ffffff', map: slideTex() })
    };
  };

  // Арочное окно (фото 01): прямоугольник до пяты арки и сегментная арка с подъёмом P.archRise.
  // cu — середина окна по длине стены, v0 — низ проёма, inset — отступ внутрь (внутренний край рамы)
  function arch(W, Hw) { var r = P.archRise, Rc = (W * W / 4 + r * r) / (2 * r); return { Rc: Rc, cv: Hw - Rc }; }
  function archPath(path, cu, v0, W, Hw, inset) {
    var a = arch(W, Hw), half = W / 2 - inset, r = a.Rc - inset;
    var spring = a.cv + Math.sqrt(r * r - half * half), ang = Math.atan2(spring - a.cv, half);
    path.moveTo(cu - half, v0 + inset);
    path.lineTo(cu + half, v0 + inset);
    path.lineTo(cu + half, v0 + spring);
    path.absarc(cu, v0 + a.cv, r, ang, Math.PI - ang, false);
    path.lineTo(cu - half, v0 + inset);
    return path;
  }
  function archTopAt(du, W, Hw, inset) { var a = arch(W, Hw), r = a.Rc - inset; return a.cv + Math.sqrt(Math.max(0, r * r - du * du)); }

  // Система координат стены: u — вдоль стены от её начала (с удлинением на выпуклых углах), v — высота,
  // z — наружу от внутренней грани (стена толщиной P.wallT лежит снаружи контура пола)
  function wallFrame(wl, ext0, ext1) {
    var dx = wl.b[0] - wl.a[0], dy = wl.b[1] - wl.a[1], len = Math.sqrt(dx * dx + dy * dy);
    var d3 = new T.Vector3(dx / len, 0, -dy / len), o3 = new T.Vector3(dy / len, 0, dx / len);
    var origin = R.toWorld(wl.a[0] - dx / len * ext0, wl.a[1] - dy / len * ext0, 0);
    return { m: new T.Matrix4().makeBasis(d3, UP, o3).setPosition(origin), len: len + ext0 + ext1, off: ext0, wl: len };
  }
  function wallBox(f, u0, u1, v0, v1, z0, z1, vBase) {
    var g = new T.BoxGeometry(u1 - u0, v1 - v0, z1 - z0);
    g.translate((u0 + u1) / 2, (v0 + v1) / 2 - (vBase || 0), (z0 + z1) / 2);
    return g.applyMatrix4(f.m);
  }
  function planBox(x0, x1, y0, y1, h0, h1, vBase) {
    var g = new T.BoxGeometry(x1 - x0, h1 - h0, y1 - y0), c = R.toWorld((x0 + x1) / 2, (y0 + y1) / 2, (h0 + h1) / 2 - (vBase || 0));
    g.translate(c.x, c.y, c.z);
    return g;
  }
  function mesh(geo, mat, group, cast) {
    var m = new T.Mesh(geo, mat);
    if (cast) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    R.edges(m);
    return m;
  }
  // Брусок, разрезанный по высоте среза: низ — в rec.base, верх — в rec.upper (он «опускается», когда стена срезана)
  function splitPlan(rec, x0, x1, y0, y1, h0, h1, mat, cast) {
    var c = P.cutH, out = [];
    if (h0 < c) out.push(mesh(planBox(x0, x1, y0, y1, h0, Math.min(h1, c)), mat, rec.base, cast));
    if (h1 > c) out.push(mesh(planBox(x0, x1, y0, y1, Math.max(h0, c), h1, c), mat, rec.upper, cast));
    return out;
  }
  function splitWall(rec, u0, u1, v0, v1, z0, z1, mat) {
    var c = P.cutH;
    if (v0 < c) mesh(wallBox(rec.f, u0, u1, v0, Math.min(v1, c), z0, z1), mat, rec.base);
    if (v1 > c) mesh(wallBox(rec.f, u0, u1, Math.max(v0, c), v1, z0, z1, c), mat, rec.upper);
  }
  function shapeOf(poly) {
    var s = new T.Shape();
    poly.forEach(function (p, i) { var x = p[0] - P.center[0], y = p[1] - P.center[1]; if (i) s.lineTo(x, y); else s.moveTo(x, y); });
    return s;
  }
  // Контур снаружи на d (стены прямоугольные: вершина сдвигается по двум внешним нормалям)
  function offsetPoly(poly, d) {
    var n = poly.length;
    function out(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy); return [dy / l, -dx / l]; }
    return poly.map(function (p, i) {
      var o1 = out(poly[(i + n - 1) % n], p), o2 = out(p, poly[(i + 1) % n]);
      return [p[0] + d * (o1[0] + o2[0]), p[1] + d * (o1[1] + o2[1])];
    });
  }
  function convex(p0, p1, p2) { return (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]) > 0; }

  function buildSolid(rec, M) {
    var f = rec.f, c = P.cutH;
    mesh(wallBox(f, 0, f.len, 0, c, 0, P.wallT), M.plaster, rec.base);
    mesh(wallBox(f, 0.002, f.len - 0.002, c - 0.004, c + 0.001, 0.002, P.wallT - 0.002), M.cut, rec.base);
    mesh(wallBox(f, f.off, f.off + f.wl, 0, 0.07, -0.012, 0), M.skirting, rec.base);
    if (rec.wall.kind === 'windows') buildWindowsWall(rec, M);
    else mesh(wallBox(f, 0, f.len, c, P.height, 0, P.wallT, c), M.plaster, rec.upper);
  }
  function buildWindowsWall(rec, M) {
    var f = rec.f, c = P.cutH, Hw = P.windowTop - P.sill, shape = new T.Shape();
    shape.moveTo(0, 0); shape.lineTo(f.len, 0); shape.lineTo(f.len, P.height - c); shape.lineTo(0, P.height - c); shape.lineTo(0, 0);
    P.windows.forEach(function (win) {
      shape.holes.push(archPath(new T.Path(), f.off + (win.x0 + win.x1) / 2, P.sill - c, win.x1 - win.x0, Hw, 0));
    });
    mesh(new T.ExtrudeGeometry(shape, { depth: P.wallT, bevelEnabled: false, curveSegments: 28 }).applyMatrix4(f.m), M.plaster, rec.upper);
    P.windows.forEach(function (win) { buildWindow(rec, M, win); });
  }
  function buildWindow(rec, M, win) {
    var f = rec.f, c = P.cutH, W = win.x1 - win.x0, Hw = P.windowTop - P.sill, cu = f.off + (win.x0 + win.x1) / 2;
    var v0 = P.sill - c, fr = 0.07, zf = P.wallT * 0.35, depth = 0.08;
    var ring = archPath(new T.Shape(), cu, v0, W, Hw, 0);
    ring.holes.push(archPath(new T.Path(), cu, v0, W, Hw, fr));
    var rg = new T.ExtrudeGeometry(ring, { depth: depth, bevelEnabled: false, curveSegments: 28 });
    rg.translate(0, 0, zf);
    mesh(rg.applyMatrix4(f.m), M.frame, rec.upper);
    // импосты (P.mullions — доли ширины) и перекладина на пяте арки, как на фото 01
    var a = arch(W, Hw), half = W / 2 - fr, spring = a.cv + Math.sqrt(Math.pow(a.Rc - fr, 2) - half * half);
    P.mullions.forEach(function (k) {
      var u = cu - W / 2 + k * W;
      mesh(wallBox(f, u - 0.035, u + 0.035, v0 + fr, v0 + archTopAt(u - cu, W, Hw, fr), zf, zf + depth), M.frame, rec.upper);
    });
    mesh(wallBox(f, cu - half, cu + half, v0 + spring - 0.035, v0 + spring + 0.035, zf, zf + depth), M.frame, rec.upper);
    var glass = new T.ShapeGeometry(archPath(new T.Shape(), cu, v0, W, Hw, fr), 28);
    glass.translate(0, 0, zf + depth / 2);
    mesh(glass.applyMatrix4(f.m), M.pane, rec.upper);
  }
  // Восточная стена: у окон, до белой пилястры (P.glassFrom), — штукатурка (фото 01, 6); дальше — стеклянная
  // перегородка: белый профиль, стекло до 3,2 м, матовая полоса 1,0–1,5 м, белый короб выше, белые стойки,
  // стеклянная дверь с ручками у северного конца (фото 12)
  function buildGlass(rec, M) {
    var f = rec.f, c = P.cutH, e = P.entrance, uOf = function (y) { return f.off + y - rec.wall.a[1]; }, g0 = uOf(P.glassFrom);
    mesh(wallBox(f, 0, g0, 0, c, 0, P.wallT), M.plaster, rec.base);
    mesh(wallBox(f, 0.002, g0, c - 0.004, c + 0.001, 0.002, P.wallT - 0.002), M.cut, rec.base);
    mesh(wallBox(f, f.off, g0, 0, 0.07, -0.012, 0), M.skirting, rec.base);
    mesh(wallBox(f, 0, g0, c, P.height, 0, P.wallT, c), M.plaster, rec.upper);
    mesh(wallBox(f, g0, f.len, 0, 0.08, 0.04, 0.12), M.white, rec.base);
    mesh(wallBox(f, g0, f.len, 0.08, c, 0.075, 0.085), M.glass, rec.base);
    mesh(wallBox(f, g0, f.len, c, P.glassH, 0.075, 0.085, c), M.glass, rec.upper);
    mesh(wallBox(f, g0, f.len, 1.0, 1.5, 0.07, 0.09, c), M.frosted, rec.upper);
    mesh(wallBox(f, g0, f.len, P.glassH, P.height, 0, P.wallT, c), M.white, rec.upper);
    var posts = [e.y0, (e.y0 + e.y1) / 2, e.y1, 11.0];
    for (var y = P.glassFrom + 1.4; y < e.y0 - 0.5; y += 1.4) posts.push(y);
    posts.forEach(function (py) { splitWall(rec, uOf(py) - 0.025, uOf(py) + 0.025, 0.08, P.glassH, 0.06, 0.1, M.white); });
    var mid = uOf((e.y0 + e.y1) / 2);
    [-0.12, 0.12].forEach(function (du) { mesh(wallBox(f, mid + du - 0.012, mid + du + 0.012, 0.9, 1.3, 0.02, 0.06, c), M.graphite, rec.upper); });
  }
  // Часы на западной стене (фото 10): 12 штрихов (длинные — на 12, 3, 6, 9) и стрелки около 10:10, без цифр
  function buildClock(rec, M) {
    var f = rec.f, k = P.clock, uc = f.off + (rec.wall.a[1] - k.y), vc = k.h - P.cutH, parts = [];
    for (var i = 0; i < 12; i++) {
      var th = i * Math.PI / 6, len = i % 3 ? 0.1 : 0.2, rr = k.r - len / 2;
      var g = new T.BoxGeometry(0.05, len, 0.012);
      g.rotateZ(th); g.translate(uc - rr * Math.sin(th), vc + rr * Math.cos(th), -0.006);   // изнутри «вправо» — к меньшим u
      parts.push(g);
    }
    [[300, 0.42], [60, 0.62]].forEach(function (hand) {
      var th = hand[0] * Math.PI / 180, g = new T.BoxGeometry(0.05, hand[1], 0.012);
      g.translate(0, hand[1] / 2, 0); g.rotateZ(th); g.translate(uc, vc, -0.008);
      parts.push(g);
    });
    mesh(T.mergeGeometries(parts).applyMatrix4(f.m), M.clock, rec.upper);
  }

  R.buildRoom = function (scene, M, small) {
    var recs = {}, list = [], occluders = [], n = P.floor.length, c = P.cutH;
    var ground = new T.Mesh(new T.PlaneGeometry(80, 80), M.ground);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.253; ground.receiveShadow = true; scene.add(ground);
    var slab = new T.Mesh(new T.ExtrudeGeometry(shapeOf(offsetPoly(P.floor, P.wallT)), { depth: 0.25, bevelEnabled: false }), M.slab);
    slab.rotation.x = -Math.PI / 2; slab.position.y = -0.252; slab.receiveShadow = true; scene.add(slab); R.edges(slab);
    var floor = new T.Mesh(new T.ShapeGeometry(shapeOf(P.floor)), M.floor);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    P.walls.forEach(function (wl, i) {
      var prev = P.floor[(i + n - 1) % n], a = P.floor[i], b = P.floor[(i + 1) % n], next = P.floor[(i + 2) % n];
      var rec = { id: wl.id, wall: wl, cut: 0, base: new T.Group(), upper: new T.Group(),
        f: wallFrame(wl, convex(prev, a, b) ? P.wallT : 0, convex(a, b, next) ? P.wallT : 0) };
      rec.upper.position.y = c;
      scene.add(rec.base, rec.upper);
      recs[wl.id] = rec; list.push(rec);
      if (wl.kind === 'glass') buildGlass(rec, M); else buildSolid(rec, M);
    });
    var mats = { plaster: M.plaster, graphite: M.graphite, white: M.white };
    P.pilasters.forEach(function (p) { splitPlan(recs[p.wall], p.x0, p.x1, p.y0, p.y1, 0, P.height, mats[p.color], true); });
    buildClock(recs.west, M);
    var kz = P.kitchen, cb = P.cabinets;
    occluders.push.apply(occluders, splitPlan(recs.west, kz.x0, kz.x1, kz.y0, kz.y1, 0, kz.h, M.dark, true));
    mesh(planBox(kz.x1 - 0.004, kz.x1 + 0.004, kz.y0 + 1.1, kz.y1 - 0.05, kz.shelfH, kz.shelfH + 0.3, c), M.led, recs.west.upper);
    splitPlan(recs.west, kz.x1 - 0.004, kz.x1 + 0.006, kz.y0 + 0.2, kz.y0 + 0.8, 0.1, 0.95, M.skirting);
    occluders.push.apply(occluders, splitPlan(recs['north-left'], cb.x0, cb.x1, cb.y0, cb.y1, 0, cb.h, M.white, true));
    var cl = P.column, h2 = cl.s / 2;
    occluders.push(mesh(planBox(cl.x - h2, cl.x + h2, cl.y - h2, cl.y + h2, 0, P.height), M.graphite, scene, true));
    P.windows.forEach(function (win) {
      var xc = (win.x0 + win.x1) / 2, r = P.radiator;
      mesh(planBox(xc - r.w / 2, xc + r.w / 2, 0.03, 0.03 + r.depth, r.z0, r.z0 + r.h), M.radiator, scene);
    });

    var hemi = new T.HemisphereLight('#ffffff', '#b9bdc6', 2.8), sun = new T.DirectionalLight('#ffffff', 1.6);
    sun.position.copy(R.toWorld(2, -4, 10));   // со стороны окон, высота ≈ 43°, как солнце карты: тени колонны и мебели видны sun.target.position.copy(R.toWorld(P.center[0], P.center[1], 0));
    sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    var sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 2; sc.far = 40;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    if ('intensity' in sun.shadow) sun.shadow.intensity = 0.55;
    scene.add(hemi, sun, sun.target);


    function updateCut(cam, dt, instant) {
      var busy = false;
      list.forEach(function (r) {
        var want = L.facesViewer(r.wall, cam, P.floor) ? 1 : 0;
        if (r.cut !== want) {
          r.cut = instant ? want : want > r.cut ? Math.min(want, r.cut + dt / 0.6) : Math.max(want, r.cut - dt / 0.6);
          busy = true;
        }
        var k = 1 - L.easeInOut(r.cut);
        r.upper.scale.y = Math.max(0.0001, k);
        r.upper.visible = k > 0.001;
      });
      return busy;
    }
    return {
      updateCut: updateCut,
      busy: function () { return list.some(function (r) { return r.cut > 0 && r.cut < 1; }); },
      wallCut: function (id) { return recs[id] ? recs[id].cut : 0; },
      occluders: occluders
    };
  };

  // Размерные линии пустого зала (правка владельца 2026-10-19: подписи длин на полу — «не совсем понятно, что к чему
  // относится»). Как на чертеже: размерная линия цвета текста (--ink) вдоль стены, выносные линии от неё к стене (углы
  // стены — концы размера) с выходом на 0,15 м за линию, на концах — засечки под 45°. Высота потолка — вертикальная линия
  // у колонны от пола до верха, выносные — к углу колонны. Линии — тонкие брусья 3 см без света и теней (как подписи
  // карты — ровным цветом); проявляются 0,8 с вместе с подписями, гаснут 0,5 с (правило 20). Данные — plan.dims.
  R.createDims = function (scene) {
    var mat = new T.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0 }), group = new T.Group(), T3 = 0.03, LIFT = 0.016;
    var vis = 0, want = 0, Y = new T.Vector3(0, 1, 0);
    function bar(p, q) {   // брус между точками плана [x, y, h]
      var a = R.toWorld(p[0], p[1], p[2]), b = R.toWorld(q[0], q[1], q[2]), d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return;
      var m = new T.Mesh(new T.BoxGeometry(T3, len, T3), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(Y, d.normalize());
      m.raycast = function () {};
      group.add(m);
    }
    (P.dims || []).forEach(function (dm) {
      var a = dm.a.slice(), b = dm.b.slice(), e = dm.ext, el = Math.hypot(e[0], e[1]) || 1, ux = e[0] / el, uy = e[1] / el, O = 0.15;
      var vertical = a[0] === b[0] && a[1] === b[1];
      if (!vertical) { a[2] = b[2] = LIFT; }
      bar(a, b);
      [a, b].forEach(function (p) {
        bar([p[0] + e[0], p[1] + e[1], p[2]], [p[0] - ux * O, p[1] - uy * O, p[2]]);   // выносная: от стены за линию
        // засечка под 45°: в плоскости пола (длина вдоль линии + выносная) или в вертикальной плоскости у высоты
        var s = 0.12;
        if (vertical) bar([p[0] + ux * s, p[1] + uy * s, p[2] - s], [p[0] - ux * s, p[1] - uy * s, p[2] + s]);
        else {
          var lx = (b[0] - a[0]), ly = (b[1] - a[1]), ll = Math.hypot(lx, ly); lx /= ll; ly /= ll;
          bar([p[0] - (lx + ux) * s, p[1] - (ly + uy) * s, p[2]], [p[0] + (lx + ux) * s, p[1] + (ly + uy) * s, p[2]]);
        }
      });
    });
    group.visible = false; scene.add(group);
    function paint() {
      mat.opacity = vis; mat.transparent = vis < 0.999; mat.depthWrite = vis > 0.5; mat.needsUpdate = true;
      group.visible = vis > 0;
    }
    return {
      show: function (on, instant) { want = on ? 1 : 0; if (instant) { vis = want; paint(); } },
      update: function (dt) {
        if (vis === want) return false;
        vis = want > vis ? Math.min(1, vis + dt / 0.8) : Math.max(0, vis - dt / 0.5);
        paint(); return true;
      },
      busy: function () { return vis !== want; },
      hide: function () { vis = want = 0; paint(); },   // кадр для картинок (still): без линий
      count: function () { return group.children.length; }
    };
  };
})(window);
