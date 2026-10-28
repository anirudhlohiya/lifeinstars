// Auto-layout: turns a simple story (who, relation, ages, what happened) into the
// engine's cast: lanes, entry sides, death bends, star spots and the constellation.
// Runs only when window.LIFE.story is set; a hand-written window.LIFE.people wins.
//
// story = {
//   me: { name, role?, finalAge },          finalAge = today's age when ending is "continues"
//   ending: "star" (default: I become the biggest star) | "continues" (I'm alive; the story goes on),
//   people: [{ name, role?, relation, from?, fate, to?, side? }]
// }
// relation: grandfather | grandmother | father | mother | sibling | partner | child | friend | other
// side:     "father" | "mother" (grandparents; default father's side)
// from:     age they arrive; leave empty if they were there before "me" was born
// fate:     "stays" | "passes" (crosses briefly at `from`) | "leaves" (at `to`) | "dies" (at `to`)
(function () {
  const L = window.LIFE;
  if (!L.story || L.people) return;
  const W = 1080;
  const X_MIN = 170, X_MAX = 930, MAX_GAP = 150;
  const PALETTE = ["#7FB8FF", "#C9A7FF", "#5ED6C8", "#FF8FB8", "#9BE8A8", "#C6F07A", "#FFB38A", "#7AE3F0",
    "#FF7A8A", "#A8D0FF", "#E79BFF", "#FF6FD8", "#4FE6FF", "#C8D2E0", "#FFC2E2", "#B5F2D0", "#F7E08A"];
  const ME_COLOR = "#FFD27A";
  const ROLE = { grandfather: "Grandfather", grandmother: "Grandmother", father: "Father", mother: "Mother",
    sibling: "Sibling", partner: "Partner", child: "Child", friend: "Friend", other: "" };
  const st = L.story;
  const finalAge = st.me.finalAge;
  L.finalAge = finalAge;

  // ---------- normalise people ----------
  const continues = st.ending === "continues";
  L.endingMode = continues ? "continues" : "star";
  const me = { id: "me", name: st.me.name, role: st.me.role != null ? st.me.role : "You", color: ME_COLOR, kind: "me",
    enter: "spawn", start: 0, end: continues ? null : finalAge, exit: continues ? null : "me" };
  let ci = 0, crossDir = 0;
  const people = st.people.map((s, i) => {
    const rel = (s.relation || "other").toLowerCase();
    const p = { id: "p" + i, name: s.name, role: s.role != null ? s.role : ROLE[rel] || "", rel, side: s.side,
      color: s.color || PALETTE[ci++ % PALETTE.length] };
    const fate = s.fate || "stays";
    const from = s.from == null || s.from === "" ? null : Number(s.from);
    if (fate === "passes") {
      p.kind = "cross";
      p.cross = { at: from == null ? 5 : from, dir: crossDir++ % 2 ? "rtl" : "ltr" };
      return p;
    }
    if (from == null || from <= 0) { p.kind = "family"; p.start = -40; }
    else { p.kind = "join"; p.start = from; p.enter = rel === "child" || rel === "sibling" ? "spawn" : "side"; }
    if (fate === "dies") { p.exit = "star"; p.end = Number(s.to); }
    else if (fate === "leaves") { p.exit = "side"; p.end = Number(s.to); }
    else { p.exit = null; p.end = null; }
    return p;
  });

  // ---------- left-to-right order of long-lived lines ----------
  // father's parents | father | older siblings | ME | children | partner | younger siblings | mother | mother's parents | friends
  function group(p) {
    if (p.kind === "me") return 3;
    switch (p.rel) {
      case "grandfather": case "grandmother": return p.side === "mother" ? 8 : 0;
      case "father": return 1;
      case "sibling": return p.kind === "family" ? 2 : 6;
      case "child": return 4;
      case "partner": return 5;
      case "mother": return 7;
      default: return 9;
    }
  }
  const lines = [me, ...people.filter((p) => p.kind !== "cross")];
  lines.forEach((p, i) => {
    // within a group: grandfather before grandmother, then by arrival age, then input order
    const sub = p.rel === "grandmother" ? 1 : 0;
    p.orderKey = group(p) * 1e6 + sub * 1e5 + (p.kind === "family" ? 0 : p.start * 100) + i;
  });
  lines.sort((a, b) => a.orderKey - b.orderKey);

  const alive = (p, a) => a >= (p.kind === "family" ? -1e9 : p.start) && (p.end == null || a < p.end);
  // centreMe: put "me" in the middle (for the final years, so the ending is balanced)
  function layoutAt(a, centreMe) {
    const act = lines.filter((p) => alive(p, a));
    const n = act.length;
    const out = new Map();
    const mi = act.indexOf(me);
    if (centreMe && mi >= 0) {
      const C = W / 2, nl = mi, nr = n - 1 - mi;
      const gap = Math.min(MAX_GAP, nl ? (C - X_MIN) / nl : 1e9, nr ? (X_MAX - C) / nr : 1e9);
      act.forEach((p, i) => out.set(p, C + (i - mi) * gap));
      return out;
    }
    const gap = n > 1 ? Math.min(MAX_GAP, (X_MAX - X_MIN) / (n - 1)) : 0;
    act.forEach((p, i) => out.set(p, (X_MIN + X_MAX) / 2 + (i - (n - 1) / 2) * gap));
    return out;
  }

  // ---------- lanes: make room before arrivals, close gaps after departures ----------
  const changes = [];
  for (const p of lines) {
    if (p.kind !== "family") changes.push({ age: p.start, type: "in" });
    if (p.end != null && p.kind !== "me") changes.push({ age: p.end, type: "out" });
  }
  changes.sort((a, b) => a.age - b.age);
  const phases = [];
  let lastEnd = -1e9;
  for (const c of changes) {
    let ws = c.type === "in" ? c.age - 2.2 : c.age + 0.8;
    let we = c.type === "in" ? c.age - 0.2 : c.age + 3.0;
    if (ws < lastEnd) { const d = lastEnd - ws; ws += d; we = Math.max(we + d * 0.5, ws + 0.8); }
    phases.push({ ws, we, after: layoutAt(c.age + 1e-6, !continues && c.age >= finalAge - 8) });
    lastEnd = we;
  }
  {
    const ws = Math.max(lastEnd, finalAge - 4), we = Math.max(ws + 1.2, finalAge - 0.6);
    if (we < finalAge && !continues) phases.push({ ws, we, after: layoutAt(finalAge - 1e-6, true) });
  }
  const start0 = layoutAt(-0.5);
  for (const p of lines) {
    let cur = start0.has(p) ? start0.get(p) : null;
    const lanes = [];
    const push = (a, x) => lanes.push([Math.max(a, lanes.length ? lanes[lanes.length - 1][0] : -1e9), x]);
    for (const ph of phases) {
      if (!ph.after.has(p)) continue;
      const nx = ph.after.get(p);
      if (cur == null) { cur = nx; push(p.start, nx); continue; }
      if (Math.abs(nx - cur) > 0.5) { push(ph.ws, cur); push(ph.we, nx); cur = nx; }
    }
    if (!lanes.length) lanes.push([p.kind === "family" ? -40 : p.start, cur == null ? 540 : cur]);
    else if (p.kind === "family") lanes.unshift([-40, lanes[0][1]]);
    p.lanes = lanes;
    const lastX = lanes[lanes.length - 1][1];
    if (p.enter === "side") p.enter = lanes[0][1] < W / 2 ? "left" : "right";
    if (p.exit === "side") p.exit = lastX < W / 2 ? "left" : "right";
    if (p.exit === "star") p.bend = lastX < W / 2 ? -1 : 1;
  }

  // ---------- stars on an arc over the top half, in left-to-right order ----------
  const xAtEnd = (p) => {
    let x = p.lanes[0][1];
    for (const [a, lx] of p.lanes) if (a <= p.end) x = lx;
    return x;
  };
  const stars = lines.filter((p) => p.exit === "star").sort((a, b) => xAtEnd(a) - xAtEnd(b));
  const CX = 570, CY = 600, RX = 320, RY = 320; // kept clear of the age axis on the left
  stars.forEach((p, i) => {
    const t = stars.length === 1 ? 0.5 : i / (stars.length - 1);
    const th = Math.PI * (1 - (0.08 + 0.84 * t));
    const k = stars.length > 6 && i % 2 ? 0.78 : 1;
    p.star = [Math.round(CX + RX * k * Math.cos(th)), Math.round(CY - RY * k * Math.sin(th))];
  });
  const ring = stars.slice().reverse().map((p) => p.id);
  if (continues) L.constellation = ring.length >= 3 ? [...ring, ring[0]] : ring; // the departed only
  else L.constellation = stars.length ? ["me", ...ring, "me"] : ["me"];

  // slow the clock around every event so each moment can be read
  const ev = [0, finalAge];
  for (const p of [...lines, ...people.filter((q) => q.kind === "cross")]) {
    if (p.kind === "cross") ev.push(p.cross.at);
    else { if (p.kind !== "family") ev.push(p.start); if (p.end != null) ev.push(p.end); }
  }
  L.eventAges = ev;

  L.people = [...lines, ...people.filter((p) => p.kind === "cross")].map((p) => {
    delete p.orderKey; delete p.rel; delete p.side;
    return p;
  });
})();
