// Life Constellation engine. Every frame is a pure function of time t (seconds).
// Reads window.LIFE (cast.js) and draws into #sky on each "hf-seek".
(function () {
  const L = window.LIFE;
  const W = 1080, H = 1920;
  const NOW_Y = Math.round(H * 0.52);
  const PX = 80; // pixels per year
  const FADE_TOP = H * 0.75; // lines fade out below this
  const AXIS_X = 70;
  const NAME_FONT = '600 30px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif';
  const STAR_FONT = '500 24px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif';
  const ROLE_FONT = '500 20px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif';
  const STAR_ROLE_FONT = '500 18px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif';
  const AXIS_FONT = '500 22px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif';
  const SERIF = '"Playfair Display", "EB Garamond", serif';

  const T_LIFE = L.preBirthSeconds + (L.lifeSeconds - L.preBirthSeconds); // t at finalAge
  const T_END = L.lifeSeconds + L.endingSeconds;
  const EF = L.endingSeconds / 15; // ending beats are laid out for 15 s and scale with it

  // ---------- helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  const sstep = (a, b, x) => smooth((x - a) / (b - a));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- the clock: a table of ages every 0.1 s ----------
  // Speed in years/second: slow childhood, fast quiet middle, slow old age.
  // With L.eventAges (auto-layout) the clock slows around each event instead.
  const speed = L.eventAges
    ? (a) => { let near = 0; for (const e of L.eventAges) near = Math.max(near, Math.exp(-Math.pow((a - e) / 2, 2))); return 1.9 - 1.4 * near; }
    : (a) => 0.5 + 1.2 * sstep(16, 30, a) * (1 - sstep(60, 74, a));
  const AGE0 = -1; // age at t = 0
  const STEP = 0.001;
  let S = 0;
  for (let a = 0; a < L.finalAge; a += STEP) S += STEP / speed(a + STEP / 2);
  const k = (L.lifeSeconds - L.preBirthSeconds) / S;
  // fine table age -> time, then invert into a 0.1 s table time -> age
  const fineT = [], fineA = [];
  let tt = 0;
  for (let a = AGE0; a <= L.finalAge + 1e-9; a += STEP) {
    fineA.push(a); fineT.push(tt);
    tt += a < 0 ? STEP * (L.preBirthSeconds / -AGE0) : k * STEP / speed(a + STEP / 2);
  }
  const AGE_TABLE = [];
  for (let i = 0, j = 0; i <= Math.round(L.lifeSeconds * 10); i++) {
    const t = i / 10;
    while (j < fineT.length - 2 && fineT[j + 1] < t) j++;
    const u = clamp((t - fineT[j]) / (fineT[j + 1] - fineT[j]));
    AGE_TABLE.push(lerp(fineA[j], fineA[j + 1], u));
  }
  AGE_TABLE[AGE_TABLE.length - 1] = L.finalAge;
  function ageAt(t) {
    if (t <= 0) return AGE_TABLE[0];
    const f = t * 10, i = Math.floor(f);
    if (i >= AGE_TABLE.length - 1) return L.finalAge;
    return lerp(AGE_TABLE[i], AGE_TABLE[i + 1], f - i);
  }
  function timeAt(age) {
    let lo = 0, hi = AGE_TABLE.length - 1;
    if (age >= L.finalAge) return L.lifeSeconds;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (AGE_TABLE[m] < age) lo = m; else hi = m; }
    const u = (age - AGE_TABLE[lo]) / (AGE_TABLE[hi] - AGE_TABLE[lo] || 1);
    return (lo + u) / 10;
  }

  // ---------- people as paths in (age, x) ----------
  const byId = {};
  const people = L.people.map((p, i) => {
    const q = Object.assign({}, p);
    q.phase = i * 1.7;
    q.start = p.kind === "family" ? -40 : p.start;
    byId[p.id] = q;
    if (p.kind === "cross") {
      const tc = timeAt(p.cross.at);
      q.tA = tc - 1.5; q.tB = tc + 1.5;
      q.start = ageAt(q.tA); q.end = ageAt(q.tB);
      const ltr = p.cross.dir === "ltr";
      q.xA = ltr ? -90 : W + 90; q.xB = ltr ? W + 90 : -90;
    }
    q.tEnd = q.end == null ? Infinity : timeAt(q.end);
    return q;
  });
  const ENTER = 1.4, LEAVE = 1.6, BEND = 0.6;

  function laneX(p, a) {
    const ln = p.lanes;
    if (a <= ln[0][0]) return ln[0][1];
    for (let i = 0; i < ln.length - 1; i++) {
      const [a0, x0] = ln[i], [a1, x1] = ln[i + 1];
      if (a <= a1) return lerp(x0, x1, easeInOut((a - a0) / (a1 - a0)));
    }
    return ln[ln.length - 1][1];
  }
  function pathX(p, a) {
    if (p.kind === "cross") return lerp(p.xA, p.xB, (a - p.start) / (p.end - p.start));
    let x = laneX(p, a) + 5 * Math.sin(a * 0.9 + p.phase) + 3 * Math.sin(a * 2.3 + p.phase * 2);
    if (p.enter === "left" || p.enter === "right") {
      const side = p.enter === "left" ? -100 : W + 100;
      x = lerp(side, x, easeOut((a - p.start) / ENTER));
    }
    if (p.exit === "left" || p.exit === "right") {
      const side = p.exit === "left" ? -120 : W + 120;
      x = lerp(x, side, Math.pow(clamp((a - (p.end - LEAVE)) / LEAVE), 2.2));
    }
    if (p.exit === "star") x += (p.bend || 1) * 70 * Math.pow(clamp((a - (p.end - BEND)) / BEND), 2);
    return x;
  }

  // ---------- sky (static, built once) ----------
  const bg = document.createElement("canvas");
  bg.width = W; bg.height = H;
  (function buildSky() {
    const g = bg.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#050a1f");
    grad.addColorStop(0.55, "#0a1433");
    grad.addColorStop(1, "#04081a");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const rnd = mulberry32(7);
    const clouds = [[250, 380, 420, "#6a3fa0"], [860, 760, 380, "#4b3a9c"], [380, 1350, 460, "#3a2f7a"], [820, 1700, 360, "#5a2f80"], [600, 120, 300, "#2f3f8c"]];
    for (const [x, y, r, c] of clouds) {
      for (let i = 0; i < 4; i++) {
        const cx = x + (rnd() - 0.5) * r * 0.6, cy = y + (rnd() - 0.5) * r * 0.6, rr = r * (0.5 + rnd() * 0.6);
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        rg.addColorStop(0, rgba(c, 0.10)); rg.addColorStop(1, rgba(c, 0));
        g.fillStyle = rg; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
    }
  })();
  const SKY_STARS = (function () {
    const rnd = mulberry32(42), out = [];
    for (let i = 0; i < 500; i++) {
      out.push({ x: rnd() * W, y: rnd() * H, r: 0.5 + Math.pow(rnd(), 3) * 1.6, a: 0.25 + rnd() * 0.6, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.6, depth: 0.03 + rnd() * 0.06 });
    }
    return out;
  })();

  // ---------- canvases ----------
  const cv = document.getElementById("sky");
  const ctx = cv.getContext("2d");
  const layer = document.createElement("canvas");
  layer.width = W; layer.height = H;
  const lctx = layer.getContext("2d");

  function drawSky(t, camAge) {
    ctx.drawImage(bg, 0, 0);
    for (const s of SKY_STARS) {
      const y = ((s.y + camAge * PX * s.depth) % H + H) % H;
      const tw = 0.65 + 0.35 * Math.sin(t * s.sp + s.ph);
      ctx.fillStyle = `rgba(220,228,255,${s.a * tw})`;
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.2832); ctx.fill();
    }
  }

  function drawAxis(camAge, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(200,210,255,0.25)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(AXIS_X, 170); ctx.lineTo(AXIS_X, H - 60); ctx.stroke();
    ctx.font = AXIS_FONT; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const lo = Math.ceil((camAge - (H - NOW_Y) / PX) / 5) * 5, hi = Math.floor((camAge + (NOW_Y - 170) / PX) / 5) * 5;
    for (let a = Math.max(0, lo); a <= hi; a += 5) {
      const y = NOW_Y + (camAge - a) * PX;
      if (y < 240 || y > H - 60) continue;
      const near = Math.abs(y - NOW_Y) < 34;
      const fade = y > FADE_TOP ? 1 - (y - FADE_TOP) / (H - FADE_TOP) : 1;
      ctx.fillStyle = `rgba(200,210,255,${0.55 * fade})`;
      ctx.fillRect(AXIS_X - 10, y - 0.75, 20, 1.5);
      if (!near) ctx.fillText(String(a), AXIS_X - 16, y);
    }
    // the now line
    const ng = ctx.createLinearGradient(AXIS_X, 0, W, 0);
    ng.addColorStop(0, "rgba(255,226,140,0.45)"); ng.addColorStop(1, "rgba(255,226,140,0.03)");
    ctx.strokeStyle = ng; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(AXIS_X, NOW_Y); ctx.lineTo(W, NOW_Y); ctx.stroke();
    // current age in yellow
    if (camAge >= 0) {
      ctx.font = '700 30px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif'; ctx.fillStyle = "#FFD966"; ctx.textAlign = "left";
      ctx.fillText(String(Math.floor(camAge)), AXIS_X + 10, NOW_Y - 24);
      ctx.beginPath(); ctx.arc(AXIS_X, NOW_Y, 5, 0, 6.2832); ctx.fill();
    }
    ctx.font = '600 26px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif'; ctx.fillStyle = "rgba(220,228,255,0.8)"; ctx.textAlign = "left";
    ctx.fillText("age", 34, 200);
    ctx.restore();
  }

  // the visible part of a person's line at camera age, plus the head
  function visibleSpan(p, camAge, headAge) {
    const a0 = Math.max(p.start, camAge - (H - NOW_Y) / PX - 0.5);
    const a1 = Math.min(p.end == null ? Infinity : p.end, headAge);
    return a1 > a0 ? [a0, a1] : null;
  }

  function strokePerson(g, p, camAge, headAge, alpha) {
    const span = visibleSpan(p, camAge, headAge);
    if (!span || alpha <= 0) return;
    const path = new Path2D();
    const step = 0.04;
    let first = true;
    for (let a = span[0]; ; a += step) {
      const aa = Math.min(a, span[1]);
      const x = pathX(p, aa), y = NOW_Y + (camAge - aa) * PX;
      if (first) { path.moveTo(x, y); first = false; } else path.lineTo(x, y);
      if (aa >= span[1]) break;
    }
    const dim = p.kind === "cross" ? 0.6 : 1;
    g.globalAlpha = alpha * dim;
    g.strokeStyle = rgba(p.color, 0.07); g.lineWidth = 26; g.stroke(path);
    g.strokeStyle = rgba(p.color, 0.22); g.lineWidth = 9; g.stroke(path);
    g.strokeStyle = p.color; g.lineWidth = p.kind === "cross" ? 2.4 : 3; g.stroke(path);
    g.globalAlpha = 1;
  }

  function maskLayer(top, bottom) {
    lctx.globalCompositeOperation = "destination-in";
    const m = lctx.createLinearGradient(0, top, 0, bottom);
    m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = m; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = "source-over";
  }

  function lineAlpha(p, t) {
    if (p.kind === "cross") return 1 - clamp((t - p.tB - 2) / 1.5);
    return 1;
  }

  function glowDot(x, y, color, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, 0.55 * a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }
  function head(x, y, color, a) {
    glowDot(x, y, color, 26, a);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 6.2832); ctx.fill();
  }

  function star4(x, y, R, color, a) {
    glowDot(x, y, color, R * 3.2, a);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    const r = R * 0.26;
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r : R;
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------- labels with collision avoidance ----------
  const FONT_FAMILY = NAME_FONT.replace(/^600 30px /, "");
  function placeLabels(items) {
    // items: {text, role, x, y, color, a, below}; the role sits on the side away from the head.
    // Crowded skies get smaller type, and a very long name shrinks to fit its own width.
    const crowd = items.filter((it) => !it.below && it.a > 0.05).length;
    const s = clamp(1 - (crowd - 7) * 0.06, 0.72, 1);
    const MAX_W = 300 * s;
    for (const it of items) {
      it.fs = 30 * s;
      ctx.font = `600 ${it.fs}px ${FONT_FAMILY}`;
      let wn = ctx.measureText(it.text).width;
      if (wn > MAX_W) { it.fs = Math.max(18, it.fs * MAX_W / wn); ctx.font = `600 ${it.fs}px ${FONT_FAMILY}`; wn = ctx.measureText(it.text).width; }
      it.rs = Math.max(16, 20 * s);
      ctx.font = `500 ${it.rs}px ${FONT_FAMILY}`;
      const wr = it.role ? ctx.measureText(it.role).width : 0;
      it.w = Math.max(wn, wr);
    }
    items.sort((A, B) => A.x - B.x);
    const placed = [];
    const ROW = 62 * s, CLEAR = 58 * s;
    for (const it of items) {
      // above the now line, keep clear of the yellow age number on the axis
      it.cx = clamp(it.x, it.w / 2 + (it.below ? 14 : AXIS_X + 80), W - it.w / 2 - 14);
      it.cy = it.y;
      for (let row = 0; row < 6; row++) {
        let hit = null;
        for (const o of placed) {
          if (Math.abs(o.cy - it.cy) < CLEAR && Math.abs(o.cx - it.cx) < (o.w + it.w) / 2 + 10) { hit = o; break; }
        }
        if (!hit) break;
        const overlap = (hit.w + it.w) / 2 + 10 - Math.abs(hit.cx - it.cx);
        if (overlap < it.w * 0.4 && it.cx + overlap + it.w / 2 < W - 14) { it.cx += overlap; continue; }
        it.cy += it.below ? ROW : -ROW;
      }
      placed.push(it);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,10,0.9)"; ctx.shadowBlur = 8;
    for (const it of placed) {
      if (it.a <= 0) continue;
      ctx.font = `600 ${it.fs}px ${FONT_FAMILY}`;
      ctx.fillStyle = rgba(mixWhite(it.color), it.a);
      ctx.fillText(it.text, it.cx, it.cy);
      if (it.role) {
        ctx.font = `500 ${it.rs}px ${FONT_FAMILY}`;
        ctx.fillStyle = rgba(mixWhite(it.color), 0.72 * it.a);
        ctx.fillText(it.role, it.cx, it.below ? it.cy + it.rs * 1.3 : it.cy - it.fs * 1.07);
      }
    }
    ctx.shadowBlur = 0;
  }
  function mixWhite(hex) {
    const n = parseInt(hex.slice(1), 16);
    const m = (c) => Math.round(c + (255 - c) * 0.45);
    const r = m((n >> 16) & 255), g = m((n >> 8) & 255), b = m(n & 255);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function edgeAlpha(x) { return clamp((x - 40) / 70) * clamp((W - 40 - x) / 70); }

  // ---------- star travel ----------
  const RISE = 1.5;
  function starState(p, t) {
    // returns null before death; else {pos, phase}
    if (p.exit !== "star") return null;
    const td = p.tEnd;
    if (t < td) return null;
    const x0 = pathX(p, p.end), y0 = NOW_Y;
    const [sx, sy] = p.star;
    const u = (t - td) / RISE;
    return { td, x0, y0, sx, sy, u };
  }
  function bez(s, u) {
    const e = easeInOut(u);
    const cx = s.x0 + (s.sx - s.x0) * 0.15, cy = s.sy + (s.y0 - s.sy) * 0.55;
    const x = (1 - e) * (1 - e) * s.x0 + 2 * (1 - e) * e * cx + e * e * s.sx;
    const y = (1 - e) * (1 - e) * s.y0 + 2 * (1 - e) * e * cy + e * e * s.sy;
    return [x, y];
  }

  // centroid of the constellation for placing star names outward
  const CON = L.constellation.map((id) => byId[id]);
  const ME = byId.me;
  ME.star = [pathX(ME, L.finalAge), NOW_Y];
  const centroid = (() => {
    const uniq = [...new Set(CON)];
    if (!uniq.length) return [W / 2, H / 3];
    return [uniq.reduce((s, p) => s + p.star[0], 0) / uniq.length, uniq.reduce((s, p) => s + p.star[1], 0) / uniq.length];
  })();
  function starLabel(p, a, big) {
    const [x, y] = p.star;
    let dx = x - centroid[0], dy = y - centroid[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const off = big ? 58 : 34;
    const nameFont = big ? '600 30px "Poppins", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Bengali", "Noto Sans Gujarati", "Noto Sans Gurmukhi", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Oriya", "Noto Naskh Arabic", "Nirmala UI", sans-serif' : STAR_FONT;
    const roleFont = big ? ROLE_FONT : STAR_ROLE_FONT;
    ctx.font = nameFont; const wn = ctx.measureText(p.name).width;
    ctx.font = roleFont; const wr = p.role ? ctx.measureText(p.role).width : 0;
    const w = Math.max(wn, wr), gap = big ? 28 : 22;
    let lx = x + dx * off, ly = y + dy * off;
    // anchor the block so it grows away from the star
    lx += dx * w / 2; ly += 8 + dy * 6 + (dy < -0.3 ? -gap : 0);
    lx = clamp(lx, w / 2 + 16, W - w / 2 - 16);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,10,0.9)"; ctx.shadowBlur = 8;
    ctx.font = nameFont; ctx.fillStyle = rgba(mixWhite(p.color), 0.9 * a);
    ctx.fillText(p.name, lx, ly);
    if (p.role) {
      ctx.font = roleFont; ctx.fillStyle = rgba(mixWhite(p.color), 0.65 * a);
      ctx.fillText(p.role, lx, ly + gap);
    }
    ctx.shadowBlur = 0;
  }

  // 0..1: how far a point is from every constellation line drawn so far
  function clearOfConstellation(x, y, te) {
    const SEG = 0.75 * EF, GAP = 0.12 * EF, T0 = 2.6 * EF;
    let k = 1;
    for (let i = 0; i < CON.length - 1; i++) {
      const u = clamp((te - T0 - i * (SEG + GAP)) / SEG);
      if (u <= 0) continue;
      const [x0, y0] = CON[i].star, [x1, y1] = CON[i + 1].star;
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      const s = Math.min(clamp(((x - x0) * dx + (y - y0) * dy) / len2), u);
      const d = Math.hypot(x - (x0 + dx * s), y - (y0 + dy * s));
      k = Math.min(k, smooth((d - 50) / 40));
    }
    return k;
  }

  // ---------- one frame ----------
  function renderAt(t) {
    t = clamp(t, 0, T_END);
    const te = t - L.lifeSeconds; // ending time (negative during life)
    const camAge = ageAt(t);
    const ending = te >= 0;
    const endFade = ending ? smooth((te - 0.5) / 2.5) : 0; // old lines, axis
    const sonAge = ending ? L.finalAge + te * 0.3 : camAge;

    drawSky(t, camAge);
    drawAxis(camAge, 1 - endFade);

    // lines
    lctx.clearRect(0, 0, W, H);
    lctx.globalCompositeOperation = "lighter";
    for (const p of people) {
      if (p.end == null && ending) continue; // the one who goes on, drawn below
      if (t < timeAt(p.start) && p.kind !== "family") continue;
      strokePerson(lctx, p, camAge, camAge, lineAlpha(p, t) * (1 - endFade));
    }
    lctx.globalCompositeOperation = "source-over";
    maskLayer(FADE_TOP, H);
    ctx.drawImage(layer, 0, 0);
    if (ending) {
      // the one who goes on climbs past the now line; their past fades away
      const pr = smooth(te / 4);
      lctx.clearRect(0, 0, W, H);
      lctx.globalCompositeOperation = "lighter";
      for (const p of people) if (p.end == null) strokePerson(lctx, p, camAge, sonAge, 1);
      lctx.globalCompositeOperation = "source-over";
      maskLayer(lerp(FADE_TOP, NOW_Y + 60, pr), lerp(H, NOW_Y + 300, pr));
      ctx.drawImage(layer, 0, 0);
    }

    // births: a soft bloom where a spawned line begins
    for (const p of people) {
      if (p.enter !== "spawn") continue;
      const tb = timeAt(p.start), u = (t - tb) / 1.2;
      if (u >= 0 && u <= 1) glowDot(pathX(p, p.start), NOW_Y, p.color, 40 + 90 * easeOut(u), Math.sin(Math.PI * u));
    }

    // constellation lines (behind the stars)
    if (ending) {
      const SEG = 0.75 * EF, GAP = 0.12 * EF, T0 = 2.6 * EF;
      ctx.save(); ctx.lineCap = "round";
      for (let i = 0; i < CON.length - 1; i++) {
        const u = clamp((te - T0 - i * (SEG + GAP)) / SEG);
        if (u <= 0) continue;
        const [x0, y0] = CON[i].star, [x1, y1] = CON[i + 1].star;
        const e = easeInOut(u), x = lerp(x0, x1, e), y = lerp(y0, y1, e);
        const fade = 1 - smooth((te - (L.endingSeconds - 1.2)) / 1.2);
        ctx.strokeStyle = `rgba(255,236,200,${0.16 * fade})`; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = `rgba(255,244,220,${0.75 * fade})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        if (u < 1) glowDot(x, y, "#fff2d6", 18, 0.9);
      }
      ctx.restore();
    }

    // stars: spark rising, ring flash, settled star
    for (const p of people) {
      const s = starState(p, t);
      if (!s) continue;
      if (s.u < 1) {
        for (let k = 10; k >= 1; k--) {
          const uu = s.u - k * 0.035;
          if (uu < 0) continue;
          const [x, y] = bez(s, uu);
          ctx.fillStyle = rgba(p.color, 0.7 * (1 - k / 11));
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill();
        }
        const [x, y] = bez(s, s.u);
        glowDot(x, y, p.color, 34, 1);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.2832); ctx.fill();
      } else {
        const v = s.u - 1; // seconds/RISE since arrival
        const ra = (t - s.td - RISE);
        if (ra < 0.8) {
          const e = easeOut(ra / 0.8);
          ctx.strokeStyle = rgba(p.color, 0.8 * (1 - e)); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(s.sx, s.sy, 8 + 62 * e, 0, 6.2832); ctx.stroke();
        }
        const grow = easeOut(ra / 0.4);
        const tw = 1 + 0.1 * Math.sin(t * 2.1 + p.phase);
        const fin = ending ? 1 - smooth((te - (L.endingSeconds - 1.2)) / 1.2) : 1;
        star4(s.sx, s.sy, 13 * grow * tw, p.color, fin);
        starLabel(p, clamp(ra / 0.6) * fin, false);
        void v;
      }
    }

    // me: flare and the biggest star (unless my story continues)
    if (ending && L.endingMode !== "continues") {
      const [x, y] = ME.star;
      const flare = Math.exp(-Math.pow((te - 0.6) / 0.55, 2));
      const fin = 1 - smooth((te - (L.endingSeconds - 1.2)) / 1.2);
      glowDot(x, y, "#FFD27A", 60 + 260 * flare, (0.6 + 0.8 * flare) * fin);
      glowDot(x, y, "#FFF4D8", 30 + 90 * flare, flare * fin);
      const R = lerp(6, 26, easeOut(te / 1.6)) * (1 + 0.06 * Math.sin(t * 1.7));
      star4(x, y, R, "#FFD27A", fin);
      starLabel(ME, clamp((te - 1.2) / 0.8) * fin, true);
    }

    // heads + names
    const labels = [];
    for (const p of people) {
      const live = p.end == null || camAge < p.end;
      const started = camAge >= p.start || p.kind === "family";
      if (p.kind === "me" && ending && L.endingMode !== "continues") continue;
      if (!started) continue;
      if (!live && !(p.end == null)) {
        // name lingers a moment after a death, fading
        if (p.exit === "star") {
          const u = (t - p.tEnd) / 0.5;
          if (u < 1) labels.push({ text: p.name, role: p.role, x: pathX(p, p.end), y: NOW_Y - 26, color: p.color, a: 1 - u });
        }
        continue;
      }
      const ha = p.end == null && ending ? sonAge : camAge;
      const x = pathX(p, ha), y = NOW_Y + (camAge - ha) * PX;
      let a = edgeAlpha(x) * (p.kind === "cross" ? 0.85 : 1);
      if (!(p.end == null && ending)) a *= 1 - endFade;
      else if (ending) a *= Math.min(clearOfConstellation(x - 90, y - 40, te), clearOfConstellation(x, y - 40, te), clearOfConstellation(x + 90, y - 40, te)); // a climbing name never sits on a star line
      const birth = p.enter === "spawn" ? clamp((t - timeAt(p.start)) / 0.6) : 1;
      a *= birth;
      if (a <= 0.01) continue;
      head(x, y, p.color, a);
      labels.push({ text: p.name, role: p.role, x, y: p.kind === "cross" ? y + 52 : y - 26, color: p.color, a, below: p.kind === "cross" });
    }
    placeLabels(labels);

    // the words
    if (ending) {
      const fin = 1 - smooth((te - (L.endingSeconds - 1.2)) / 1.2);
      const ty = H * 0.75;
      const a1 = smooth((te - 7.6 * EF) / (1.4 * EF)) * fin;
      if (a1 > 0) {
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.font = `500 84px ${SERIF}`;
        ctx.fillStyle = `rgba(255,246,228,${a1})`;
        ctx.shadowColor = "rgba(255,210,140,0.35)"; ctx.shadowBlur = 24;
        ctx.fillText(L.title, W / 2, ty + 10 * (1 - easeOut((te - 7.6 * EF) / (1.4 * EF))));
        ctx.shadowBlur = 0;
        const ru = easeInOut((te - 8.6 * EF) / (0.9 * EF));
        if (ru > 0) {
          ctx.strokeStyle = `rgba(255,236,200,${0.6 * fin})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(W / 2 - 170 * ru, ty + 52); ctx.lineTo(W / 2 + 170 * ru, ty + 52); ctx.stroke();
        }
        const a2 = smooth((te - 9.2 * EF) / (1.2 * EF)) * fin;
        ctx.font = `italic 400 40px ${SERIF}`;
        ctx.fillStyle = `rgba(230,226,255,${0.92 * a2})`;
        L.subtitle.forEach((line, i) => ctx.fillText(line, W / 2, ty + 118 + i * 56));
        ctx.restore();
      }
      // fade to black
      const fb = smooth((te - (L.endingSeconds - 1.2)) / 1.2);
      if (fb > 0) { ctx.fillStyle = `rgba(0,0,0,${fb})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  // exposed for the snapshot checklist
  window.LIFE_CLOCK = { ageAt, timeAt, people, T_END };
  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  window.__lifeRender = renderAt;
  renderAt(0);
})();
