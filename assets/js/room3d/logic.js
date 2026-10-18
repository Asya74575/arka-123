// 3D-модель зала (задание 3, drafts/room-3d.md): чистые функции без three.js и страницы — геометрия плана, срез стен,
// камера, путь маскота в обход мебели. Проверки — node --test tools/room3d/test/
(function (w) {
  var R = w.Room3D = w.Room3D || {}, RAD = Math.PI / 180;

  function area(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s) / 2;
  }
  function inside(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    var x = ax + t * dx - px, y = ay + t * dy - py;
    return Math.sqrt(x * x + y * y);
  }
  function wallDist(poly, x, y) {
    var m = Infinity;
    for (var i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; m = Math.min(m, segDist(x, y, a[0], a[1], b[0], b[1])); }
    return m;
  }
  // Контур пола обходится против часовой стрелки: зал слева от каждой стены, внутренняя нормаль — (−dy, dx)
  function inward(wall) {
    var dx = wall.b[0] - wall.a[0], dy = wall.b[1] - wall.a[1], l = Math.sqrt(dx * dx + dy * dy);
    return [-dy / l, dx / l];
  }
  function centerOf(poly) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    poly.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  }
  // Стена срезается, если камера снаружи зала и стена повёрнута к ней внешней стороной или стоит в ближней половине
  // зала (дальше 1 м от середины в сторону камеры) — иначе перегородки ниши заслоняют зал. Камера внутри — ничего.
  function facesViewer(wall, cam, floor) {
    if (floor && inside(floor, cam[0], cam[1])) return false;
    var n = inward(wall), mx = (wall.a[0] + wall.b[0]) / 2, my = (wall.a[1] + wall.b[1]) / 2;
    if ((cam[0] - mx) * n[0] + (cam[1] - my) * n[1] < 0) return true;
    if (!floor) return false;
    var c = centerOf(floor), dx = cam[0] - c[0], dy = cam[1] - c[1], l = Math.sqrt(dx * dx + dy * dy);
    return ((mx - c[0]) * dx + (my - c[1]) * dy) / l > 1;
  }
  function footprint(it) {
    var sx = 0.5, sy = 0.5;
    if (it.type === 'table') { sx = it.w; sy = it.d; if (it.rot === 90 || it.rot === 270) { sx = it.d; sy = it.w; } }
    else if (it.type === 'screen') { sx = 0.6; sy = it.w; }
    else if (it.type === 'flipchart') { sx = 0.6; sy = 0.8; }
    return { x0: it.x - sx / 2, x1: it.x + sx / 2, y0: it.y - sy / 2, y1: it.y + sy / 2 };
  }
  function overlap(a, b, gap) {
    gap = gap || 0;
    return a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;
  }
  function fixedBoxes(P) {
    var c = P.column, h = c.s / 2, out = [{ x0: c.x - h, x1: c.x + h, y0: c.y - h, y1: c.y + h }];
    P.pilasters.forEach(function (p) { out.push({ x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 }); });
    [P.kitchen, P.cabinets].forEach(function (k) { out.push({ x0: k.x0, x1: k.x1, y0: k.y0, y1: k.y1 }); });
    return out;
  }
  function nearestAngle(from, to) { return from + ((((to - from) % 360) + 540) % 360 - 180); }
  // Расстояние, с которого шар радиуса radius целиком в кадре (по меньшему из углов обзора)
  function fitDistance(fovDeg, aspect, radius) {
    var v = fovDeg * RAD / 2, h = Math.atan(Math.tan(v) * aspect);
    return radius / Math.sin(Math.min(v, h));
  }
  // az: 0 — камера с юга (со стороны окон), 90 — с востока, 180 — с севера; el — наклон над полом
  function cameraPlan(target, az, el, dist) {
    var r = dist * Math.cos(el * RAD);
    return { x: target[0] + r * Math.sin(az * RAD), y: target[1] - r * Math.cos(az * RAD), h: dist * Math.sin(el * RAD) };
  }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function pathLength(path) {
    var s = 0;
    for (var i = 1; i < path.length; i++) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    return s;
  }
  function pointAt(path, s) {
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= d || i === path.length - 1) { var t = d ? Math.min(1, s / d) : 1; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      s -= d;
    }
    return path[path.length - 1].slice();
  }
  // Путь маскота: прямо, если ничего не мешает; иначе A* по сетке 0,25 м в обход предметов (запас 0,3 м) и стен (0,25 м).
  // Рядом с началом и целью (0,6 м) проходить можно: маскот может стоять там, где поднимается новая мебель.
  function findPath(P, from, to, boxes) {
    var STEP = 0.25, PAD = 0.3, NEAR = 0.6, nx = Math.ceil(12.2 / STEP), ny = Math.ceil(12.4 / STEP);
    function free(x, y) {
      if (Math.hypot(x - from[0], y - from[1]) < NEAR || Math.hypot(x - to[0], y - to[1]) < NEAR) return inside(P.floor, x, y);
      if (!inside(P.floor, x, y) || wallDist(P.floor, x, y) < 0.25) return false;
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (x > b.x0 - PAD && x < b.x1 + PAD && y > b.y0 - PAD && y < b.y1 + PAD) return false;
      }
      return true;
    }
    function clear(a, b) {
      var n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05));
      for (var i = 1; i < n; i++) if (!free(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)) return false;
      return true;
    }
    if (clear(from, to)) return [from.slice(), to.slice()];
    var key = function (i, j) { return j * (nx + 1) + i; };
    var si = Math.round(from[0] / STEP), sj = Math.round(from[1] / STEP), gi = Math.round(to[0] / STEP), gj = Math.round(to[1] / STEP);
    var g = {}, f = {}, came = {}, closed = {}, open = [[si, sj]], sk = key(si, sj);
    g[sk] = 0; f[sk] = Math.hypot(si - gi, sj - gj);
    while (open.length) {
      var bi = 0;
      for (var o = 1; o < open.length; o++) if (f[key(open[o][0], open[o][1])] < f[key(open[bi][0], open[bi][1])]) bi = o;
      var cur = open.splice(bi, 1)[0], ck = key(cur[0], cur[1]);
      if (cur[0] === gi && cur[1] === gj) {
        var cells = [cur], k = ck;
        while (came[k] !== undefined) { k = came[k]; cells.unshift([k % (nx + 1), Math.floor(k / (nx + 1))]); }
        var pts = cells.map(function (c) { return [c[0] * STEP, c[1] * STEP]; });
        pts[0] = from.slice(); pts[pts.length - 1] = to.slice();
        var out = [pts[0]], at = 0;
        while (at < pts.length - 1) {
          var far = at + 1;
          for (var q = pts.length - 1; q > at + 1; q--) if (clear(pts[at], pts[q])) { far = q; break; }
          out.push(pts[far]); at = far;
        }
        return out;
      }
      closed[ck] = true;
      for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        var ni = cur[0] + di, nj = cur[1] + dj, nk = key(ni, nj);
        if (ni < 0 || nj < 0 || ni > nx || nj > ny || closed[nk]) continue;
        if (!(ni === gi && nj === gj) && !free(ni * STEP, nj * STEP)) continue;
        if (di && dj && (!free((cur[0] + di) * STEP, cur[1] * STEP) || !free(cur[0] * STEP, (cur[1] + dj) * STEP))) continue;
        var ng = g[ck] + (di && dj ? Math.SQRT2 : 1);
        if (g[nk] === undefined || ng < g[nk]) {
          if (g[nk] === undefined) open.push([ni, nj]);
          g[nk] = ng; f[nk] = ng + Math.hypot(ni - gi, nj - gj); came[nk] = ck;
        }
      }
    }
    return [from.slice(), to.slice()];
  }

  R.logic = {
    area: area, inside: inside, segDist: segDist, wallDist: wallDist, inward: inward, facesViewer: facesViewer,
    footprint: footprint, overlap: overlap, fixedBoxes: fixedBoxes, nearestAngle: nearestAngle, fitDistance: fitDistance,
    cameraPlan: cameraPlan, easeInOut: easeInOut, findPath: findPath, pathLength: pathLength, pointAt: pointAt
  };
})(window);
