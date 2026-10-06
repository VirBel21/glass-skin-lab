/* Glass Skin Lab — comportamiento. Script clásico (IIFE), lee window.__DB__.
   Las páginas ya traen el contenido esencial en HTML; esto añade interacción. */
(function () {
  "use strict";

  var DB = window.__DB__ || { productos: [], axes: [], needs: [] };
  var MAX = 4;
  var COLORS = ["#9c5f54", "#5f7058", "#b38a3d", "#5a7596"];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var byId = {};
  DB.productos.forEach(function (p) { byId[p.id] = p; });

  /* ---- selección compartida (localStorage opcional) ---- */
  var selected = [];
  function load() {
    var fromHash = (location.hash || "").replace("#", "").split(",").filter(function (id) { return byId[id]; });
    if (fromHash.length) { selected = fromHash.slice(0, MAX); return; }
    try { selected = JSON.parse(localStorage.getItem("gsl-cmp") || "[]").filter(function (id) { return byId[id]; }).slice(0, MAX); }
    catch (e) { selected = []; }
  }
  function save() { try { localStorage.setItem("gsl-cmp", JSON.stringify(selected)); } catch (e) { /* sin almacenamiento */ } }
  function toggle(id) {
    var i = selected.indexOf(id);
    if (i > -1) selected.splice(i, 1);
    else if (selected.length < MAX) selected.push(id);
    else return false;
    save(); sync(); return true;
  }
  var listeners = [];
  function sync() {
    $$("[data-cmp]").forEach(function (b) {
      var on = selected.indexOf(b.getAttribute("data-cmp")) > -1;
      b.classList.toggle("is-on", on);
      if (b.classList.contains("cmp-toggle")) b.textContent = on ? "✓ En comparador" : "+ Comparar";
      else b.textContent = on ? "✓ Añadido al comparador" : "+ Añadir al comparador";
    });
    var tray = $("[data-tray]");
    if (tray) {
      var onCmp = !!$("[data-result]");
      tray.classList.toggle("is-open", selected.length > 0 && !onCmp);
      $("[data-tray-text]", tray).textContent = selected.length + (selected.length === 1 ? " producto" : " productos");
      $("[data-tray-go]", tray).href = "comparador.html#" + selected.join(",");
    }
    listeners.forEach(function (fn) { fn(); });
  }

  /* ---- nav móvil ---- */
  function initNav() {
    var btn = $(".nav-toggle"), nav = $(".nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---- botones de comparar + bandeja ---- */
  function initCompareButtons() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cmp]");
      if (b) { e.preventDefault(); if (!toggle(b.getAttribute("data-cmp"))) alert("Puedes comparar hasta " + MAX + " productos a la vez."); }
      if (e.target.closest("[data-tray-clear]")) { selected = []; save(); sync(); }
    });
  }

  /* ---- galería ---- */
  function initGallery() {
    var main = $("[data-gallery-main] img");
    $$("[data-thumb]").forEach(function (t) {
      t.addEventListener("click", function () {
        if (main) main.src = t.getAttribute("data-thumb");
        $$("[data-thumb]").forEach(function (o) { o.setAttribute("aria-current", o === t ? "true" : "false"); });
      });
    });
  }

  /* ---- ordenar categorías ---- */
  function initSort() {
    var sel = $("[data-sort]"), grid = $("[data-grid]");
    if (!sel || !grid) return;
    var orig = $$(".card", grid);
    sel.addEventListener("change", function () {
      var k = sel.value, items = orig.slice();
      if (k === "eficacia") items.sort(function (a, b) { return b.dataset.eficacia - a.dataset.eficacia; });
      if (k === "cp") items.sort(function (a, b) { return b.dataset.cp - a.dataset.cp; });
      if (k === "precio") items.sort(function (a, b) { return (parseFloat(a.dataset.precio) || 1e9) - (parseFloat(b.dataset.precio) || 1e9); });
      items.forEach(function (c) { grid.appendChild(c); });
    });
  }

  /* ---- radar superpuesto (SVG propio, sin librerías) ---- */
  function radar(prods) {
    var axes = DB.axes, n = axes.length, cx = 150, cy = 150, R = 98;
    var pt = function (i, r) { return [cx + r * Math.sin(2 * Math.PI * i / n), cy - r * Math.cos(2 * Math.PI * i / n)]; };
    var g = "";
    [2, 4, 6, 8, 10].forEach(function (l) {
      g += '<polygon points="' + axes.map(function (_, i) { return pt(i, R * l / 10).map(function (v) { return v.toFixed(1); }).join(","); }).join(" ") + '" fill="none" stroke="#e7ddd3"/>';
    });
    axes.forEach(function (_, i) { var p = pt(i, R); g += '<line x1="150" y1="150" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="#e7ddd3"/>'; });
    prods.forEach(function (p, k) {
      var c = COLORS[k % COLORS.length];
      var pts = axes.map(function (a, i) { return pt(i, R * (p.scores[a.k] || 0) / 10).map(function (v) { return v.toFixed(1); }).join(","); }).join(" ");
      g += '<polygon points="' + pts + '" fill="' + c + '" fill-opacity=".14" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/>';
    });
    axes.forEach(function (a, i) {
      var p = pt(i, R + 22), anc = Math.abs(p[0] - cx) < 8 ? "middle" : (p[0] > cx ? "start" : "end");
      g += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="' + anc + '" font-size="12" fill="#6f655f" font-family="Jost,Arial,sans-serif">' + esc(a.n) + "</text>";
    });
    return '<svg viewBox="-40 -6 380 312" role="img" aria-label="Radar comparativo de valoraciones" width="380" height="312">' + g + "</svg>";
  }

  /* ---- página del comparador ---- */
  function initComparator() {
    var res = $("[data-result]");
    if (!res) return;
    var list = $("[data-list]"), search = $("[data-search]"), needs = [];

    function renderList() {
      var q = (search.value || "").toLowerCase();
      list.innerHTML = DB.productos.filter(function (p) { return (p.name + " " + p.marca + " " + p.cat).toLowerCase().indexOf(q) > -1; }).map(function (p) {
        var i = selected.indexOf(p.id), on = i > -1;
        return '<li><button type="button" class="cmp-item' + (on ? " is-on" : "") + '" data-pick="' + esc(p.id) + '"><span class="dot" style="background:' + (on ? COLORS[i % 4] : "") + '"></span><span>' + esc(p.name) + "<small>" + esc(p.cat) + "</small></span></button></li>";
      }).join("") || '<li class="note">Sin resultados.</li>';
    }

    function best(vals, mode) {
      var nums = vals.filter(function (v) { return typeof v === "number"; });
      if (nums.length < 2) return null;
      return mode === "min" ? Math.min.apply(null, nums) : Math.max.apply(null, nums);
    }

    function row(label, prods, getter, mode, fmt) {
      var vals = prods.map(getter), b = mode ? best(vals, mode) : null;
      return "<tr><th scope=\"row\">" + esc(label) + "</th>" + vals.map(function (v) {
        var shown = v == null || v === "" ? '<span class="na">—</span>' : (fmt ? fmt(v) : esc(v));
        return '<td class="' + (b !== null && v === b ? "best" : "") + '">' + shown + "</td>";
      }).join("") + "</tr>";
    }

    function render() {
      var prods = selected.map(function (id) { return byId[id]; });
      if (prods.length < 2) {
        res.innerHTML = '<div class="empty">' + (prods.length ? "Añade al menos otro producto para compararlo." : "Selecciona al menos dos productos para ver la comparación.") + "</div>";
        return;
      }
      var eur = function (v) { return v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €"; };
      var verdict = "";
      if (needs.length) {
        var scored = prods.map(function (p, i) {
          var s = needs.reduce(function (a, k) { return a + (p.necesidades[k] || 0); }, 0) / needs.length;
          return { p: p, s: s, c: COLORS[i % 4] };
        }).sort(function (a, b) { return b.s - a.s; });
        var names = needs.map(function (k) { return DB.needs.filter(function (x) { return x.k === k; })[0].n.toLowerCase(); }).join(", ");
        verdict = '<div class="verdict"><h3>Para ' + esc(names) + ": " + esc(scored[0].p.name) + '</h3><p class="mb-0">Es el que mejor encaja con lo que has marcado, según nuestra valoración editorial.</p><ul class="rank">' +
          scored.map(function (x) { return '<li><span style="min-width:150px;font-size:.9rem">' + esc(x.p.name) + '</span><span class="bar"><i style="width:' + x.s * 10 + "%;background:" + x.c + '"></i></span><strong>' + x.s.toFixed(1) + "</strong></li>"; }).join("") + "</ul></div>";
      }
      var head = "<tr><th></th>" + prods.map(function (p) {
        return '<th scope="col"><button type="button" class="rm" data-rm="' + esc(p.id) + '" aria-label="Quitar ' + esc(p.name) + '">×</button><a href="' + esc(p.slug) + '" style="color:inherit">' + esc(p.name) + "</a></th>";
      }).join("") + "</tr>";
      var rows = row("Marca", prods, function (p) { return p.marca; }) + row("Categoría", prods, function (p) { return p.cat; }) +
        (prods.some(function (p) { return p.precio && p.precio.actual != null; }) ? row("Precio orientativo", prods, function (p) { return p.precio.actual; }, "min", eur) : "") +
        (prods.some(function (p) { return p.valoracion_media != null; }) ? row("Valoración Amazon", prods, function (p) { return p.valoracion_media; }, "max", function (v) { return v.toFixed(1) + " ★"; }) : "") +
        row("Tipo de piel", prods, function (p) { return p.tipo_piel.join(", "); });
      rows += '<tr class="grp"><th colspan="' + (prods.length + 1) + '">Valoración del editor (0–10)</th></tr>';
      DB.axes.forEach(function (a) { rows += row(a.n, prods, function (p) { return p.scores[a.k]; }, "max"); });
      var groups = [], seen = {};
      prods.forEach(function (p) {
        p.specs.forEach(function (g) {
          if (!seen[g.g]) { seen[g.g] = { g: g.g, labels: [] }; groups.push(seen[g.g]); }
          g.items.forEach(function (it) { if (seen[g.g].labels.indexOf(it[0]) < 0) seen[g.g].labels.push(it[0]); });
        });
      });
      groups.forEach(function (gr) {
        rows += '<tr class="grp"><th colspan="' + (prods.length + 1) + '">' + esc(gr.g) + "</th></tr>";
        gr.labels.forEach(function (l) {
          rows += row(l, prods, function (p) {
            var g = p.specs.filter(function (x) { return x.g === gr.g; })[0];
            var it = g && g.items.filter(function (x) { return x[0] === l; })[0];
            return it ? it[1] : null;
          });
        });
      });
      rows += "<tr><th scope=\"row\">Pros</th>" + prods.map(function (p) { return "<td>" + p.pros.map(function (x) { return "✓ " + esc(x); }).join("<br>") + "</td>"; }).join("") + "</tr>";
      rows += "<tr><th scope=\"row\">Contras</th>" + prods.map(function (p) { return "<td>" + p.contras.map(function (x) { return "– " + esc(x); }).join("<br>") + "</td>"; }).join("") + "</tr>";
      rows += "<tr><th scope=\"row\"></th>" + prods.map(function (p) {
        return '<td><a class="btn btn--amazon btn--sm" href="' + esc(p.affiliate_url) + '" target="_blank" rel="sponsored nofollow noopener">Ver en Amazon</a></td>';
      }).join("") + "</tr>";
      res.innerHTML = verdict +
        '<div class="radar-box"><h3 class="center">Gráficos superpuestos</h3>' + radar(prods) +
        '<div class="legend">' + prods.map(function (p, i) { return "<span><i style=\"background:" + COLORS[i % 4] + '"></i>' + esc(p.name) + "</span>"; }).join("") + '</div><p class="note center" style="margin-top:10px">Valoración editorial de 0 a 10.</p></div>' +
        '<div class="table-scroll"><table class="cmp-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="note">★ marca el mejor valor de cada fila numérica. Los guiones (—) son datos aún no disponibles.</p>';
    }

    function update() { renderList(); render(); try { history.replaceState(null, "", selected.length ? "#" + selected.join(",") : location.pathname); } catch (e) { /* noop */ } }
    listeners.push(update);

    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pick]");
      if (b && !toggle(b.getAttribute("data-pick"))) alert("Puedes comparar hasta " + MAX + " productos a la vez.");
    });
    res.addEventListener("click", function (e) { var r = e.target.closest("[data-rm]"); if (r) toggle(r.getAttribute("data-rm")); });
    search.addEventListener("input", renderList);
    $("[data-clear]").addEventListener("click", function () { selected = []; save(); sync(); });
    $$("[data-need]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-need"), i = needs.indexOf(k);
        if (i > -1) needs.splice(i, 1); else needs.push(k);
        b.classList.toggle("is-on", i < 0); render();
      });
    });
    window.addEventListener("hashchange", function () { load(); sync(); });
  }

  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); } }

  function boot() {
    load();
    safe(initNav, "nav");
    safe(initCompareButtons, "compareButtons");
    safe(initGallery, "gallery");
    safe(initSort, "sort");
    safe(initComparator, "comparator");
    safe(sync, "sync");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
