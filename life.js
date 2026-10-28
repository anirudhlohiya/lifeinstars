/* Life in Stars · page-local code. The engine (scrollcraft.js) is never edited.
   1. Signature move: chapter II scrubs the real video renderer with the visitor's scroll.
      The folio turns into an age readout and an observing log writes itself, one line per event.
   2. The folio: chapter numeral and title, updating as chapters pass.
   3. Title page: drawn chart ticks, and a small fine-pointer lean on the depth planes. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // ------------------------------------------------------------ ring ticks --
  var ticks = $("#ringTicks");
  if (ticks) {
    var out = "";
    for (var i = 0; i < 120; i++) {
      var a = (i * 3 * Math.PI) / 180, long = i % 10 === 0, r1 = 490, r2 = long ? 466 : 480;
      out += '<line x1="' + (500 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (500 + r1 * Math.sin(a)).toFixed(1) +
        '" x2="' + (500 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (500 + r2 * Math.sin(a)).toFixed(1) + '"/>';
    }
    ticks.innerHTML = out;
  }

  // ------------------------------------------------- the life (signature) --
  var L = window.LIFE, CLOCK = window.LIFE_CLOCK, render = window.__lifeRender;
  var section = $("#life"), stage = section && $("[data-sc-stage]", section);
  var logEl = $("#lifeLog"), ageEl = $("#lifeAge"), folioEl = $("#folioChapter");
  var T_LIFE = L.lifeSeconds;
  var T_HOLD = L.lifeSeconds + L.endingSeconds - 1.4; // the renderer fades to black after this; never show that
  var LIFE_SHARE = 0.78; // share of the pinned travel spent living; the rest is the constellation

  // Reduced motion: no long pinned travel. One short hold on the finished sky, with the full log.
  if (reduce && section) section.setAttribute("data-sc-span", "1.3");

  // The observing log, built from the same story the renderer draws.
  var events = (function () {
    var st = L.story, me = st.me, ev = [];
    var there = st.people.filter(function (p) { return p.from == null && p.fate !== "passes"; }).map(function (p) { return p.name; });
    var list = there.length > 1 ? there.slice(0, -1).join(", ") + " and " + there[there.length - 1] : there[0];
    ev.push({ age: 0, text: me.name === "You" ? "You are born." + (list ? " " + list + " are already there." : "") : me.name + " is born." });
    st.people.forEach(function (p) {
      if (p.fate === "passes") ev.push({ age: p.from, text: p.name + " crosses your path" });
      else if (p.from != null) ev.push({ age: p.from, text: p.name + " arrives" });
      if (p.fate === "leaves") ev.push({ age: p.to, text: p.name + " drifts away" });
      if (p.fate === "dies") ev.push({ age: p.to, text: p.name + " passes away and rises", star: true });
    });
    ev.sort(function (x, y) { return x.age - y.age; });
    if (st.ending !== "continues") ev.push({ age: me.finalAge, text: "Your own star rises. Everyone who left joins it.", star: true, end: true });
    return ev;
  })();

  var shown = -1, tCur = 0, tTarget = 0, tDrawn = -1, ready = false;

  function ageOf(t) {
    if (t >= T_LIFE) return L.story.me.finalAge;
    return Math.max(0, Math.floor(CLOCK.ageAt(t)));
  }
  function writeLog(t) {
    var age = ageOf(t), atEnd = t >= T_LIFE + 0.6;
    var n = 0;
    for (var i = 0; i < events.length; i++) { if (events[i].end ? atEnd : events[i].age <= age) n = i + 1; }
    if (n === shown) return;
    shown = n;
    var html = "";
    for (var j = 0; j < n; j++) {
      var e = events[j];
      html += '<li class="' + (j >= n - 1 ? "is-new " : "") + (e.star ? "is-star" : "") + '"><b>Age ' + e.age + "</b><span>" + e.text + "</span></li>";
    }
    logEl.innerHTML = html;
  }
  function paint(t) {
    render(t);
    tDrawn = t;
    var age = ageOf(t);
    ageEl.textContent = age;
    writeLog(t);
    stage.classList.toggle("is-ending", t >= T_LIFE + 0.3);
    // a compact signature of what actually painted, for the verification harness
    stage.setAttribute("data-sc-verify-state", age + "|" + Math.round(t * 4));
  }
  function targetFromScroll() {
    var r = section.getBoundingClientRect();
    var travel = Math.max(r.height - innerHeight, 1);
    var raw = clamp(-r.top / travel, 0, 1);
    return raw <= LIFE_SHARE ? (raw / LIFE_SHARE) * T_LIFE : T_LIFE + ((raw - LIFE_SHARE) / (1 - LIFE_SHARE)) * (T_HOLD - T_LIFE);
  }

  // ------------------------------------------------------------- the folio --
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
  var folioText = "";
  function folio(lifeAge) {
    if (!folioEl) return;
    var mid = innerHeight * 0.45, cur = chapters[0];
    for (var i = 0; i < chapters.length; i++) { if (chapters[i].getBoundingClientRect().top <= mid) cur = chapters[i]; }
    var label = cur.getAttribute("data-chapter");
    var txt = cur === section && lifeAge != null ? "<b>II</b> · Age " + lifeAge : label.replace(/^([IVX]+) ·/, "<b>$1</b> ·");
    if (txt !== folioText) { folioText = txt; folioEl.innerHTML = txt; }
  }

  // ------------------------------------------------------------ the loop --
  function frame() {
    if (ready && section) {
      var r = section.getBoundingClientRect();
      var near = r.bottom > -innerHeight * 0.5 && r.top < innerHeight * 1.5;
      if (near) {
        tTarget = reduce ? T_HOLD : targetFromScroll();
        tCur += (tTarget - tCur) * (reduce ? 1 : 0.16);
        if (Math.abs(tTarget - tCur) < 0.002) tCur = tTarget;
        if (Math.abs(tCur - tDrawn) > 0.003) paint(tCur);
      }
      folio(near ? ageOf(tCur) : null);
    } else folio(null);
    requestAnimationFrame(frame);
  }

  // The renderer draws its names with the video's own fonts; wait for them (but never forever).
  var fonts = Promise.all([
    document.fonts.load('600 30px "Poppins"'), document.fonts.load('500 24px "Poppins"'), document.fonts.load('700 30px "Poppins"'),
    document.fonts.load('500 84px "Playfair Display"'), document.fonts.load('italic 400 40px "Playfair Display"'),
  ]).catch(function () {});
  Promise.race([fonts, new Promise(function (res) { setTimeout(res, 2500); })]).then(function () {
    ready = true;
    tCur = reduce ? T_HOLD : targetFromScroll();
    paint(tCur);
  });

  // ------------------------------------------------- title-page pointer lean --
  var title = $("[data-lean]");
  if (title && !reduce) {
    var planes = [[".title__plane--rings > svg", 10], [".title__plane--const > svg", 22], [".title__plane--rim > svg", 34]].map(function (d) {
      return { el: $(d[0], title), depth: d[1] };
    });
    title.addEventListener("pointermove", function (e) {
      if (!fine.matches || e.pointerType !== "mouse") return;
      var nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      planes.forEach(function (p) {
        if (!p.el) return;
        p.el.style.setProperty("--lean-x", (-nx * p.depth).toFixed(1) + "px");
        p.el.style.setProperty("--lean-y", (-ny * p.depth * 0.5).toFixed(1) + "px");
      });
    });
    title.addEventListener("pointerleave", function () {
      planes.forEach(function (p) { if (p.el) { p.el.style.setProperty("--lean-x", "0px"); p.el.style.setProperty("--lean-y", "0px"); } });
    });
  }

  ScrollCraft.mount(document.body);
  requestAnimationFrame(frame);
})();
