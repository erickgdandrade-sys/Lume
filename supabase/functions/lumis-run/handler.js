// GERADO por jogos/lumis-run (npm run build:server). Não edite.

// src/features/lumis-run/config/gameConfig.ts
var LANES = {
  count: 3,
  width: 2.2
  // distância entre os centros das faixas (m)
};
var laneX = (lane) => (lane - 1) * LANES.width;
var SIM = {
  stepHz: 120,
  maxFrameDelta: 0.1
  // teto do tempo de um quadro (s); evita saltos após travadas ou aba oculta
};

// src/features/lumis-run/config/difficulty.ts
var DIFFICULTY = {
  maxSpeed: 24,
  speedKeys: [
    [0, 11],
    [20, 11],
    [45, 14],
    [75, 17],
    [120, 20],
    [220, 24]
  ],
  // tempo mínimo entre fileiras de obstáculos (s): cai devagar até um piso
  gapKeys: [
    [0, 1.25],
    [30, 1.1],
    [60, 0.95],
    [100, 0.82],
    [160, 0.72]
  ],
  // pesos dos níveis de padrão [tier1, tier2, tier3]
  tierKeys: [
    [0, [1, 0, 0]],
    [15, [0.75, 0.25, 0]],
    [45, [0.45, 0.45, 0.1]],
    [75, [0.3, 0.45, 0.25]],
    [120, [0.2, 0.4, 0.4]]
  ],
  // chance de colocar livros antes de cada fileira
  bookKeys: [
    [0, 0.9],
    [60, 0.75],
    [120, 0.6]
  ],
  warmupDistance: 45
  // metros iniciais sem obstáculos
};
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }
  return keys[keys.length - 1][1];
}
var speedAt = (t) => Math.min(DIFFICULTY.maxSpeed, interp(DIFFICULTY.speedKeys, t));
var gapTimeAt = (t) => interp(DIFFICULTY.gapKeys, t);
var bookChanceAt = (t) => interp(DIFFICULTY.bookKeys, t);
function tierWeightsAt(t) {
  const k = DIFFICULTY.tierKeys;
  if (t <= k[0][0]) return [...k[0][1]];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const f = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return [0, 1, 2].map((j) => k[i - 1][1][j] + (k[i][1][j] - k[i - 1][1][j]) * f);
    }
  }
  return [...k[k.length - 1][1]];
}

// src/features/lumis-run/core/fixedStep.ts
var STEP = 1 / SIM.stepHz;

// src/features/lumis-run/core/obstacles.ts
var OBSTACLES = {
  livros: { span: "faixa", y0: 0, y1: 0.85, depth: 0.7, clear: "pular" },
  carteira: { span: "faixa", y0: 0, y1: 1, depth: 0.8, clear: "pular" },
  caixas: { span: "faixa", y0: 0, y1: 2, depth: 0.9, clear: "nenhum" },
  carrinho: { span: "faixa", y0: 0, y1: 1.7, depth: 1, clear: "nenhum" },
  barreira: { span: "todas", y0: 0, y1: 0.55, depth: 0.35, clear: "pular" },
  faixa: { span: "todas", y0: 1, y1: 4.4, depth: 0.3, clear: "deslizar" }
};
var LANE_HALF = 0.85;
var ALL_HALF = 3.4;

// src/features/lumis-run/core/generator.ts
var ONE_LANE_LOW = ["livros", "carteira"];
var ONE_LANE_TALL = ["caixas", "carrinho"];
var REACTION = 0.28;
var LANE_TIME = 0.16;
var LAND_TIME = 0.42;
function laneRequirements(items) {
  const req = ["livre", "livre", "livre"];
  for (const it of items) {
    const spec = OBSTACLES[it.kind];
    const r = spec.clear === "nenhum" ? "bloq" : spec.clear;
    const lanes = spec.span === "todas" ? [0, 1, 2] : [it.lane];
    for (const l of lanes) {
      if (req[l] === "bloq" || r === "bloq") req[l] = "bloq";
      else if (req[l] === "livre") req[l] = r;
      else if (req[l] !== r) req[l] = "bloq";
    }
  }
  return req;
}
function transitionTime(k, a, j, b) {
  let t = REACTION + LANE_TIME * Math.abs(j - k);
  if (a === "pular" && b !== "livre") t += LAND_TIME;
  return t;
}
function rowIsFeasible(prev, next, gapTime) {
  if (!next.some((r) => r !== "bloq")) return false;
  for (let k = 0; k < 3; k++) {
    if (prev[k] === "bloq") continue;
    let ok2 = false;
    for (let j = 0; j < 3 && !ok2; j++) {
      if (next[j] === "bloq") continue;
      if (transitionTime(k, prev[k], j, next[j]) <= gapTime) ok2 = true;
    }
    if (!ok2) return false;
  }
  return true;
}
var pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
var shuffleLanes = (rng) => {
  const l = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
};
function makeRow(tier, rng) {
  const [a, b, c] = shuffleLanes(rng);
  if (tier === 0) {
    const r2 = rng();
    if (r2 < 0.8) return [{ kind: pick(rng, [...ONE_LANE_LOW, ...ONE_LANE_TALL]), lane: a }];
    return [{ kind: "barreira", lane: 1 }];
  }
  if (tier === 1) {
    const r2 = rng();
    if (r2 < 0.4) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }];
    if (r2 < 0.65) return [{ kind: "faixa", lane: 1 }];
    if (r2 < 0.85) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_LOW), lane: b }];
    return [{ kind: "barreira", lane: 1 }];
  }
  const r = rng();
  if (r < 0.45) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }];
  if (r < 0.7) return [{ kind: pick(rng, ONE_LANE_LOW), lane: a }, { kind: pick(rng, ONE_LANE_LOW), lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }];
  if (r < 0.85) return [{ kind: "faixa", lane: 1 }];
  return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }];
}
function pickTier(w, rng) {
  const r = rng() * (w[0] + w[1] + w[2]);
  return r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
}
function createGen(rng) {
  return { rng, nextD: DIFFICULTY.warmupDistance, prevReq: ["livre", "livre", "livre"], prevD: 0, ids: 1, obstacles: [], books: [] };
}
function addBookLine(g, lane, d0, d1, y) {
  const n = Math.max(2, Math.min(6, Math.floor((d1 - d0) / 2.2)));
  for (let i = 0; i < n; i++) {
    const d = d0 + (d1 - d0) * i / Math.max(1, n - 1);
    g.books.push({ id: g.ids++, lane, d, y, taken: false, color: Math.floor(g.rng() * 6) });
  }
}
function warmupBooks(g) {
  addBookLine(g, 1, 14, 30, 1);
}
function fillUntil(g, ahead, t) {
  while (g.nextD < ahead) {
    const speed = speedAt(t);
    const gapTime = gapTimeAt(t);
    const gap = g.nextD - g.prevD;
    const tier = pickTier(tierWeightsAt(t), g.rng);
    let items = null;
    let req = [];
    for (let attempt = 0; attempt < 12 && !items; attempt++) {
      const cand = makeRow(attempt < 8 ? tier : 0, g.rng);
      const r = laneRequirements(cand);
      if (rowIsFeasible(g.prevReq, r, gap / speed)) {
        items = cand;
        req = r;
      }
    }
    if (!items) {
      g.nextD += gap * 0.5;
      g.prevReq = ["livre", "livre", "livre"];
      continue;
    }
    const d = g.nextD;
    for (const it of items) g.obstacles.push({ id: g.ids++, kind: it.kind, lane: it.lane, d, variant: Math.floor(g.rng() * 4) });
    if (g.rng() < bookChanceAt(t)) {
      const open = [0, 1, 2].filter((l) => req[l] !== "bloq");
      const lane = open[Math.floor(g.rng() * open.length)];
      const r = req[lane];
      if (r === "pular") {
        g.books.push({ id: g.ids++, lane, d: d - 2.2, y: 1.9, taken: false, color: Math.floor(g.rng() * 6) });
        g.books.push({ id: g.ids++, lane, d, y: 2.45, taken: false, color: Math.floor(g.rng() * 6) });
        g.books.push({ id: g.ids++, lane, d: d + 2.2, y: 1.9, taken: false, color: Math.floor(g.rng() * 6) });
      } else if (r === "deslizar") {
        addBookLine(g, lane, d - 1.5, d + 1.5, 0.45);
      } else {
        addBookLine(g, lane, d - Math.min(10, gap * 0.6), d + 1, 1);
      }
    }
    g.books.sort((a, b) => a.d - b.d);
    g.prevReq = req;
    g.prevD = d;
    g.nextD = d + gapTime * speed * (1 + g.rng() * 0.4);
  }
}
function prune(g, distance) {
  const limit = distance - 8;
  if (g.obstacles.length && g.obstacles[0].d < limit) g.obstacles = g.obstacles.filter((o) => o.d >= limit);
  if (g.books.length && g.books[0].d < limit) g.books = g.books.filter((b) => b.d >= limit);
}

// src/features/lumis-run/core/rng.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/features/lumis-run/core/score.ts
var POINTS_PER_BOOK = 10;
function computeScore(distance, books) {
  return Math.floor(distance) + POINTS_PER_BOOK * books;
}

// src/features/lumis-run/core/sim.ts
var MOVE = {
  laneTime: 0.15,
  jumpTime: 0.62,
  jumpHeight: 1.6,
  diveTime: 0.12,
  // descida rápida ao pedir deslize no ar
  landTime: 0.12,
  slideTime: 0.7,
  bufferTime: 0.14
  // comando dado pouco antes de aterrissar é guardado
};
var HITBOX = {
  halfWidth: 0.4,
  halfDepth: 0.3,
  runBottom: 0.45,
  runTop: 1.45,
  slideBottom: 0.15,
  slideTop: 0.72
};
var AHEAD = 140;
function createSim(seed) {
  const gen = createGen(mulberry32(seed));
  warmupBooks(gen);
  fillUntil(gen, AHEAD, 0);
  return {
    seed,
    tick: 0,
    time: 0,
    distance: 0,
    speed: speedAt(0),
    lane: 1,
    x: 0,
    xFrom: 0,
    laneT: MOVE.laneTime,
    action: "run",
    actionT: 0,
    air: 0,
    diveFrom: 0,
    buffered: null,
    bufferT: 0,
    books: 0,
    crashed: false,
    crashedBy: null,
    gen,
    events: []
  };
}
var jumpCurve = (t) => {
  const p = t / MOVE.jumpTime;
  return p <= 0 || p >= 1 ? 0 : 4 * MOVE.jumpHeight * p * (1 - p);
};
var grounded = (a) => a === "run" || a === "land" || a === "slide";
function setAction(s, a) {
  s.action = a;
  s.actionT = 0;
}
function tryCommand(s, c) {
  switch (c) {
    case "left":
    case "right": {
      const next = Math.max(0, Math.min(LANES.count - 1, s.lane + (c === "left" ? -1 : 1)));
      if (next === s.lane) return true;
      s.xFrom = s.x;
      s.lane = next;
      s.laneT = 0;
      s.events.push({ type: "lane", tick: s.tick });
      return true;
    }
    case "jump":
      if (!grounded(s.action)) return false;
      setAction(s, "jump");
      s.events.push({ type: "jump", tick: s.tick });
      return true;
    case "slide":
      if (s.action === "jump") {
        s.diveFrom = s.air;
        setAction(s, "dive");
        return true;
      }
      if (s.action === "slide" || s.action === "dive") return false;
      setAction(s, "slide");
      s.events.push({ type: "slide", tick: s.tick });
      return true;
  }
}
function command(s, c) {
  if (s.crashed) return;
  if (!tryCommand(s, c)) {
    s.buffered = c;
    s.bufferT = MOVE.bufferTime;
  }
}
function lumisBounds(s) {
  if (s.action === "slide") return { bottom: HITBOX.slideBottom, top: HITBOX.slideTop };
  return { bottom: HITBOX.runBottom + s.air, top: HITBOX.runTop + s.air };
}
function collides(s, o) {
  const spec = OBSTACLES[o.kind];
  if (Math.abs(o.d - s.distance) > spec.depth / 2 + HITBOX.halfDepth) return false;
  const cx = spec.span === "todas" ? 0 : laneX(o.lane);
  const half = spec.span === "todas" ? ALL_HALF : LANE_HALF;
  if (Math.abs(s.x - cx) > half + HITBOX.halfWidth) return false;
  const b = lumisBounds(s);
  return b.top > spec.y0 && b.bottom < spec.y1;
}
function step(s) {
  if (s.crashed) return;
  s.tick++;
  s.time = s.tick * STEP;
  s.speed = speedAt(s.time);
  s.distance += s.speed * STEP;
  if (s.laneT < MOVE.laneTime) {
    s.laneT = Math.min(MOVE.laneTime, s.laneT + STEP);
    const p = 1 - s.laneT / MOVE.laneTime;
    const e = 1 - p * p * p;
    s.x = s.xFrom + (laneX(s.lane) - s.xFrom) * e;
  } else s.x = laneX(s.lane);
  s.actionT += STEP;
  switch (s.action) {
    case "jump":
      s.air = jumpCurve(s.actionT);
      if (s.actionT >= MOVE.jumpTime) {
        s.air = 0;
        setAction(s, "land");
      }
      break;
    case "dive": {
      const k = 1 - s.actionT / MOVE.diveTime;
      s.air = k > 0 ? s.diveFrom * k : 0;
      if (s.actionT >= MOVE.diveTime) {
        s.air = 0;
        setAction(s, "slide");
        s.events.push({ type: "slide", tick: s.tick });
      }
      break;
    }
    case "land":
      if (s.actionT >= MOVE.landTime) setAction(s, "run");
      break;
    case "slide":
      if (s.actionT >= MOVE.slideTime) setAction(s, "run");
      break;
  }
  if (s.buffered) {
    s.bufferT -= STEP;
    if (s.bufferT <= 0) s.buffered = null;
    else if (tryCommand(s, s.buffered)) s.buffered = null;
  }
  const b = lumisBounds(s);
  const cy = (b.bottom + b.top) / 2;
  for (const book of s.gen.books) {
    if (book.taken) continue;
    if (book.d > s.distance + 1) break;
    if (Math.abs(book.d - s.distance) < 0.7 && Math.abs(laneX(book.lane) - s.x) < 0.8 && Math.abs(book.y - cy) < 0.85) {
      book.taken = true;
      s.books++;
      s.events.push({ type: "book", tick: s.tick, bookId: book.id, x: laneX(book.lane), y: book.y });
    }
  }
  for (const o of s.gen.obstacles) {
    if (o.d > s.distance + 2) break;
    if (collides(s, o)) {
      s.crashed = true;
      s.crashedBy = o;
      setAction(s, "impact");
      s.events.push({ type: "crash", tick: s.tick });
      return;
    }
  }
  fillUntil(s.gen, s.distance + AHEAD, s.time);
  prune(s.gen, s.distance);
}
var scoreOf = (s) => computeScore(s.distance, s.books);

// src/features/lumis-run/core/replay.ts
var COMMANDS = ["left", "right", "jump", "slide"];
var MAX_TICKS = SIM.stepHz * 60 * 30;
var MAX_COMMANDS = 4e4;
function isCommandLog(v) {
  if (!Array.isArray(v) || v.length > MAX_COMMANDS) return false;
  let last = 0;
  for (const e of v) {
    if (!Array.isArray(e) || e.length !== 2) return false;
    const [t, c] = e;
    if (!Number.isInteger(t) || t < last || t > MAX_TICKS || !COMMANDS.includes(c)) return false;
    last = t;
  }
  return true;
}
function replay(seed, log) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || !isCommandLog(log)) return { ok: false, reason: "comandos" };
  const s = createSim(seed);
  let i = 0;
  while (!s.crashed && s.tick < MAX_TICKS) {
    while (i < log.length && log[i][0] === s.tick) command(s, log[i++][1]);
    step(s);
    s.events.length = 0;
  }
  if (!s.crashed || i < log.length) return { ok: false, reason: s.crashed ? "comandos" : "sem-fim" };
  return { ok: true, score: scoreOf(s), distance: s.distance, books: s.books, durationMs: Math.round(s.time * 1e3), ticks: s.tick };
}

// src/features/lumis-run/ranking/names.ts
var NAME_LIMITS = { min: 2, max: 20 };
var BLOCKED = ["porra", "caralho", "merda", "puta", "puto", "buceta", "foda", "fdp", "viado", "bosta", "cacete", "arrombado", "vagabunda", "piroca", "pinto", "cu"];
function cleanName(raw) {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}
function nameKey(raw) {
  return cleanName(raw).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}
function validateName(raw) {
  const n = cleanName(raw);
  if (n.length < NAME_LIMITS.min) return "curto";
  if (n.length > NAME_LIMITS.max) return "longo";
  if (!/^[\p{L}\p{N} .'-]+$/u.test(n)) return "caracteres";
  const words = nameKey(n).split(" ");
  if (words.some((w) => BLOCKED.includes(w))) return "impr\xF3prio";
  return null;
}
var NAME_ERROR_TEXT = {
  curto: `Digite pelo menos ${NAME_LIMITS.min} letras.`,
  longo: `Use no m\xE1ximo ${NAME_LIMITS.max} caracteres.`,
  caracteres: "Use s\xF3 letras, n\xFAmeros, espa\xE7o, ponto, h\xEDfen ou ap\xF3strofo.",
  impr\u00F3prio: "Escolha outro nome para aparecer no ranking."
};

// src/features/lumis-run/ranking/phone.ts
function phoneDigits(raw) {
  let d = raw.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  return d;
}
function validatePhone(raw) {
  const d = phoneDigits(raw);
  if (!d) return "vazio";
  if (d.length < 10 || d.length > 11) return "curto";
  if (d[0] === "0" || d[1] === "0") return "ddd";
  if (d.length === 11 && d[2] !== "9") return "celular";
  return null;
}

// src/features/lumis-run/ranking/ranking.ts
function compareScore(a, b) {
  return b.score - a.score || b.distance - a.distance || b.books - a.books || a.durationMs - b.durationMs || (a.at ?? 0) - (b.at ?? 0);
}
function compareBooks(a, b) {
  return b.books - a.books || a.durationMs - b.durationMs || b.score - a.score || (a.at ?? 0) - (b.at ?? 0);
}
function playerKey(name, phone) {
  return `${nameKey(name)}|${phoneDigits(phone)}`;
}
function playerPublicId(name, phone) {
  return publicId(playerKey(name, phone));
}
function publicId(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
function publicEntry(p) {
  return { id: publicId(p.key), name: p.name, score: p.best.score, distance: Math.floor(p.best.distance), books: p.best.books, bestBooks: p.bestBooks.books, durationMs: p.best.durationMs, booksMs: p.bestBooks.durationMs, rawDistance: p.best.distance };
}
var sortScore = (list) => list.slice().sort((a, b) => compareScore(a.best, b.best));
var sortBooks = (list) => list.slice().sort((a, b) => compareBooks(a.bestBooks, b.bestBooks));
function mergeResult(players, r, now) {
  const key = playerKey(r.name, r.phone);
  const list = players.slice();
  const i = list.findIndex((p) => p.key === key);
  const prev = i >= 0 ? list[i] : void 0;
  const run = { score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed, at: now };
  const improvedScore = !prev || compareScore(run, prev.best) < 0;
  const improvedBooks = !prev || compareBooks(run, prev.bestBooks) < 0;
  const rec = {
    key,
    name: improvedScore || !prev ? cleanName(r.name) : prev.name,
    phone: phoneDigits(r.phone),
    best: improvedScore ? run : prev.best,
    bestBooks: improvedBooks ? run : prev.bestBooks,
    runs: (prev?.runs ?? 0) + 1,
    firstAt: prev?.firstAt ?? now,
    lastAt: now
  };
  if (i >= 0) list[i] = rec;
  else list.push(rec);
  return {
    players: list,
    outcome: {
      entry: publicEntry(rec),
      posScore: sortScore(list).indexOf(rec) + 1,
      posBooks: sortBooks(list).indexOf(rec) + 1,
      improvedScore,
      improvedBooks,
      previousBest: prev?.best.score ?? null,
      previousBooks: prev?.bestBooks.books ?? null
    }
  };
}

// src/features/lumis-run/ranking/board.ts
function buildBoard(rows, photoUrl = () => "") {
  const byId = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const e = byId.get(r.publicId) ?? {};
    if (r.kind === "score") e.s = r;
    else e.b = r;
    byId.set(r.publicId, e);
  }
  const entries = [];
  for (const [id, { s, b }] of byId) {
    if (!s || !b) continue;
    entries.push({
      id,
      name: s.name,
      score: s.score,
      distance: Math.floor(s.distance),
      books: s.books,
      bestBooks: b.books,
      durationMs: s.durationMs,
      booksMs: b.durationMs,
      rawDistance: s.distance,
      ...s.photo ? { photo: photoUrl(id, s.photo) } : {},
      _s: s,
      _b: b
    });
  }
  const strip = ({ _s, _b, ...e }) => (void _s, void _b, e);
  return {
    byScore: entries.slice().sort((x, y) => compareScore(x._s, y._s)).map(strip),
    byBooks: entries.slice().sort((x, y) => compareBooks(x._b, y._b)).map(strip)
  };
}
function playersFromRuns(runs) {
  let players = [];
  for (const r of runs.slice().sort((a, b) => a.at - b.at)) players = mergeResult(players, r, r.at).players;
  return players.sort((a, b) => compareScore(a.best, b.best));
}

// server/handler.ts
var TIME_SLACK_MS = 3e3;
var MAX_PHOTO_BYTES = 100 * 1024;
var ok = (body) => ({ status: 200, body });
var fail = (status, error, extra = {}) => ({ status, body: { error, ...extra } });
var str = (v) => typeof v === "string" ? v : "";
var obj = (v) => v && typeof v === "object" ? v : {};
async function handle(req, deps) {
  try {
    const route = `${req.method.toUpperCase()} ${req.path.replace(/\/+$/, "") || "/"}`;
    switch (route) {
      case "GET /ranking":
        return ok(await board(deps));
      case "POST /bilhete":
        return ok(await ticket(deps));
      case "POST /jogador":
        return ok(await findPlayer(obj(req.body), deps));
      case "POST /partida":
        return await submit(obj(req.body), deps);
      case "POST /equipe":
        return await staff(obj(req.body), deps);
      default:
        return fail(404, "rota");
    }
  } catch (e) {
    console.error(e);
    return fail(500, "servidor");
  }
}
async function board(deps) {
  return buildBoard(await deps.db.bestRuns(), deps.photoUrl);
}
async function ticket(deps) {
  const seed = deps.randomSeed() >>> 0;
  const token = await deps.db.createTicket(seed);
  if (seed % 50 === 0) await deps.db.pruneTickets();
  return { token, seed };
}
async function findPlayer(b, deps) {
  const name = cleanName(str(b.name));
  const phone = phoneDigits(str(b.phone));
  if (validateName(name) || validatePhone(phone)) return { entry: null };
  const id = playerPublicId(name, phone);
  const { byScore } = await board(deps);
  return { entry: byScore.find((e) => e.id === id) ?? null };
}
function decodePhoto(v) {
  if (v == null || v === "") return null;
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(str(v));
  if (!m) return "invalida";
  const bin = atob(m[1]);
  if (bin.length > MAX_PHOTO_BYTES) return "invalida";
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out[0] === 255 && out[1] === 216 ? out : "invalida";
}
async function submit(b, deps) {
  const name = cleanName(str(b.name));
  const phone = phoneDigits(str(b.phone));
  const nameErr = validateName(name);
  if (nameErr) return fail(400, "nome", { detail: nameErr });
  const phoneErr = validatePhone(phone);
  if (phoneErr) return fail(400, "whatsapp", { detail: phoneErr });
  if (!isCommandLog(b.commands)) return fail(400, "comandos");
  const claimed = obj(b.claimed);
  const photo = decodePhoto(b.photo);
  if (photo === "invalida") return fail(400, "foto");
  const version = str(b.version).slice(0, 40) || null;
  const token = str(b.token);
  let seed = Number(b.seed);
  let status = "valid";
  let reason = null;
  let issuedAt = null;
  if (token) {
    const t = /^[0-9a-f-]{36}$/i.test(token) ? await deps.db.consumeTicket(token) : null;
    if (!t) return fail(409, "bilhete");
    seed = t.seed;
    issuedAt = t.issuedAt;
  } else {
    status = "review";
    reason = "sem-bilhete";
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) return fail(400, "semente");
  const r = replay(seed, b.commands);
  if (!r.ok) {
    status = "rejected";
    reason = `replay:${r.reason}`;
  } else if (r.score !== Number(claimed.score) || r.books !== Number(claimed.books)) {
    status = "rejected";
    reason = "replay:diferente";
  } else if (issuedAt != null && deps.now() - issuedAt < r.durationMs - TIME_SLACK_MS) {
    status = "rejected";
    reason = "tempo";
  }
  const before = await board(deps);
  const key = playerKey(name, phone);
  const publicId2 = playerPublicId(name, phone);
  const playerId = await deps.db.upsertPlayer({ key, publicId: publicId2, name, phone });
  const stats = r.ok ? r : { score: 0, distance: 0, books: 0, durationMs: 0 };
  await deps.db.insertRun({ playerId, ticketId: token || null, seed, status, reason, score: stats.score, distance: stats.distance, books: stats.books, durationMs: stats.durationMs, commands: b.commands, version });
  if (status === "rejected") return fail(422, "partida", { detail: reason });
  if (photo) await deps.db.savePhoto(playerId, publicId2, photo);
  const after = await board(deps);
  const prev = before.byScore.find((e) => e.id === publicId2);
  const run = { score: stats.score, distance: stats.distance, books: stats.books, durationMs: stats.durationMs };
  let outcome;
  if (status === "valid") {
    const entry = after.byScore.find((e) => e.id === publicId2);
    outcome = {
      entry,
      posScore: after.byScore.findIndex((e) => e.id === publicId2) + 1,
      posBooks: after.byBooks.findIndex((e) => e.id === publicId2) + 1,
      improvedScore: !prev || compareScore(run, { score: prev.score, distance: prev.rawDistance ?? prev.distance, books: prev.books, durationMs: prev.durationMs ?? 0 }) < 0,
      improvedBooks: !prev || compareBooks(run, { score: 0, distance: 0, books: prev.bestBooks, durationMs: prev.booksMs ?? 0 }) < 0,
      previousBest: prev?.score ?? null,
      previousBooks: prev?.bestBooks ?? null,
      status: "ok"
    };
  } else {
    const entry = { id: publicId2, name, score: run.score, distance: Math.floor(run.distance), books: run.books, bestBooks: run.books };
    outcome = { entry, posScore: 0, posBooks: 0, improvedScore: false, improvedBooks: false, previousBest: prev?.score ?? null, previousBooks: prev?.bestBooks ?? null, status: "analise" };
  }
  return ok({ outcome, board: after });
}
function sameSecret(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function staff(b, deps) {
  if (!deps.staffPassword || !sameSecret(str(b.senha), deps.staffPassword)) {
    await (deps.wait ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(800);
    return fail(401, "senha");
  }
  const action = str(b.acao) || "listar";
  if (action === "limpar") await deps.db.clearAll();
  else if (action === "aprovar" || action === "recusar") {
    const changed = await deps.db.setRunStatus(str(b.runId), action === "aprovar" ? "valid" : "rejected");
    if (!changed) return fail(404, "partida");
  } else if (action !== "listar") return fail(400, "acao");
  const runs = await deps.db.staffRuns();
  const photos = /* @__PURE__ */ new Map();
  for (const r of runs) if (r.photo) photos.set(r.publicId, r.photo);
  const players = playersFromRuns(runs.filter((r) => r.status === "valid").map((r) => ({ name: r.name, phone: r.phone, score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed, at: r.at }))).map((p) => {
    const id = playerPublicId(p.name, p.phone);
    const v = photos.get(id);
    return { ...p, publicId: id, ...v ? { photo: deps.photoUrl(id, v) } : {} };
  });
  const view = { players, review: runs.filter((r) => r.status === "review") };
  return ok(view);
}
export {
  MAX_PHOTO_BYTES,
  TIME_SLACK_MS,
  handle
};
