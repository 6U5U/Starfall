const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng) {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function buildTrack(points = 220) {
  const out = [];
  let last = null;
  let s = 0;
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r = 1 + 0.14 * Math.sin(3 * t + 0.3) + 0.08 * Math.sin(7 * t - 0.7);
    const x = r * Math.cos(t) + 0.18 * Math.sin(2 * t);
    const y = 0.72 * r * Math.sin(t) + 0.09 * Math.cos(5 * t);
    if (last) s += Math.hypot(x - last.x, y - last.y);
    out.push({ i, t, x, y, s });
    last = { x, y };
  }
  const first = out[0], final = out[out.length - 1];
  const total = s + Math.hypot(first.x - final.x, first.y - final.y);

  for (let i = 0; i < out.length; i++) {
    const p0 = out[(i - 2 + out.length) % out.length];
    const p1 = out[i];
    const p2 = out[(i + 2) % out.length];
    const ax = p1.x - p0.x, ay = p1.y - p0.y;
    const bx = p2.x - p1.x, by = p2.y - p1.y;
    const cross = Math.abs(ax * by - ay * bx);
    const denom = Math.max(Math.pow(Math.hypot(ax, ay) * Math.hypot(bx, by), 1.5), 1e-6);
    p1.curvature = clamp((cross / denom) * 0.72, 0, 1);
    p1.distance = (p1.s / total) * 5200;
  }
  return out;
}

export const COMPOUNDS = {
  soft: { grip: 1.055, deg: 1.28, warmup: 0.90, label: "Soft" },
  medium: { grip: 1.000, deg: 1.00, warmup: 1.00, label: "Medium" },
  hard: { grip: 0.965, deg: 0.72, warmup: 1.12, label: "Hard" }
};

export function simulateLap(setup = {}, opts = {}) {
  const track = opts.track || buildTrack();
  const downforce = clamp(Number(setup.downforce ?? 62), 20, 100);
  const brakeBias = clamp(Number(setup.brakeBias ?? 56), 50, 62);
  const fuel = clamp(Number(setup.fuel ?? 38), 2, 110);
  const tireAge = Math.max(0, Number(setup.tireAge ?? 4));
  const compound = COMPOUNDS[setup.compound || "medium"] || COMPOUNDS.medium;
  const ambient = clamp(Number(setup.ambient ?? 25), 5, 50);

  const aeroCorner = 0.90 + downforce / 210;
  const dragPenalty = 1 - downforce / 850;
  const fuelPenalty = 1 - fuel * 0.00072;
  const wearPenalty = 1 - tireAge * 0.0029 * compound.deg;
  const tempOpt = 92;
  const nominalTemp = 72 + 0.23 * ambient + 0.13 * downforce + tireAge * 0.8;
  const tempPenalty = 1 - Math.min(Math.abs(nominalTemp - tempOpt) * 0.0017, 0.08);
  const biasPenalty = 1 - Math.abs(brakeBias - 56.4) * 0.0022;

  const telemetry = track.map((p, idx) => {
    const cornerFactor = p.curvature;
    const straightBase = 322 * dragPenalty;
    const cornerBase = 104 + 92 * (1 - cornerFactor);
    const blended = straightBase * (1 - Math.pow(cornerFactor, 0.72)) +
      cornerBase * Math.pow(cornerFactor, 0.72);
    const grip = compound.grip * aeroCorner * fuelPenalty * wearPenalty * tempPenalty * biasPenalty;
    const speed = clamp(blended * (0.84 + 0.18 * grip), 62, 338);
    const lateralG = 0.35 + cornerFactor * (2.2 + downforce / 90) * compound.grip * wearPenalty;
    const brake = clamp(cornerFactor * 100 + Math.sin(idx * 0.15) * 7, 0, 100);
    const throttle = clamp(100 - brake * 0.82 - cornerFactor * 15, 0, 100);
    const tireTemp = nominalTemp + cornerFactor * 8 + Math.sin(idx * 0.12) * 2.8;
    return { ...p, speed, lateralG, brake, throttle, tireTemp };
  });

  let seconds = 0;
  for (let i = 0; i < telemetry.length; i++) {
    const a = telemetry[i];
    const b = telemetry[(i + 1) % telemetry.length];
    const ds = i === telemetry.length - 1 ? 5200 - a.distance : b.distance - a.distance;
    const v = Math.max((a.speed + b.speed) / 7.2, 1);
    seconds += ds / v;
  }

  const sector = [0, 0, 0];
  telemetry.forEach((p, i) => {
    const next = telemetry[(i + 1) % telemetry.length];
    const ds = i === telemetry.length - 1 ? 5200 - p.distance : next.distance - p.distance;
    const v = Math.max((p.speed + next.speed) / 7.2, 1);
    sector[Math.min(2, Math.floor((p.distance / 5200) * 3))] += ds / v;
  });

  return {
    lapTime: seconds,
    sectorTimes: sector,
    maxSpeed: Math.max(...telemetry.map(p => p.speed)),
    avgSpeed: telemetry.reduce((a, p) => a + p.speed, 0) / telemetry.length,
    peakG: Math.max(...telemetry.map(p => p.lateralG)),
    tireTemp: telemetry.reduce((a, p) => a + p.tireTemp, 0) / telemetry.length,
    telemetry
  };
}

export function quantile(values, q) {
  if (!values.length) return NaN;
  const v = [...values].sort((a, b) => a - b);
  const pos = (v.length - 1) * clamp(q, 0, 1);
  const base = Math.floor(pos), rest = pos - base;
  return v[base + 1] === undefined ? v[base] : v[base] + rest * (v[base + 1] - v[base]);
}

export function simulateStrategy(strategy = {}, options = {}) {
  const laps = Math.max(5, Math.floor(strategy.laps ?? 28));
  const pitLap = clamp(Math.floor(strategy.pitLap ?? 14), 2, laps - 2);
  const startCompound = strategy.startCompound || "medium";
  const endCompound = strategy.endCompound || "hard";
  const baseSetup = strategy.setup || {};
  const rng = options.rng || mulberry32(options.seed ?? 42);
  const pitLoss = Number(strategy.pitLoss ?? 22.5);
  const safetyCarChance = clamp(Number(strategy.safetyCarChance ?? 0.08), 0, 1);

  let race = 0;
  let age = 0;
  const lapsOut = [];
  for (let lap = 1; lap <= laps; lap++) {
    const afterPit = lap > pitLap;
    if (lap === pitLap + 1) age = 0;
    const compound = afterPit ? endCompound : startCompound;
    const fuel = Math.max(2, Number(baseSetup.fuel ?? 96) - (lap - 1) * 2.65);
    const sim = simulateLap({ ...baseSetup, compound, tireAge: age, fuel });
    const driverNoise = gaussian(rng) * 0.16;
    const traffic = Math.max(0, gaussian(rng) * 0.12 + 0.05);
    let lapTime = sim.lapTime + driverNoise + traffic;
    let pit = false;
    if (lap === pitLap) {
      const sc = rng() < safetyCarChance;
      lapTime += pitLoss * (sc ? 0.58 : 1);
      pit = true;
    }
    race += lapTime;
    lapsOut.push({ lap, lapTime, raceTime: race, compound, tireAge: age, pit });
    age++;
  }
  return { totalTime: race, laps: lapsOut };
}

export function monteCarloStrategy(strategy, runs = 400, seed = 7) {
  const totals = [];
  for (let i = 0; i < runs; i++) {
    totals.push(simulateStrategy(strategy, { seed: seed + i * 7919 }).totalTime);
  }
  return {
    runs,
    mean: totals.reduce((a, b) => a + b, 0) / totals.length,
    p10: quantile(totals, 0.10),
    median: quantile(totals, 0.50),
    p90: quantile(totals, 0.90),
    sigma: Math.sqrt(totals.reduce((a, x) => a + Math.pow(x - totals.reduce((s, y) => s + y, 0) / totals.length, 2), 0) / totals.length),
    totals
  };
}

export function setupSweep(base = {}, variable = "downforce", min = 25, max = 95, steps = 24) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const x = min + (max - min) * i / (steps - 1);
    const lap = simulateLap({ ...base, [variable]: x });
    points.push({ x, y: lap.lapTime });
  }
  return points;
}
