import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrack,
  simulateLap,
  simulateStrategy,
  monteCarloStrategy,
  quantile,
  setupSweep
} from "../src/sim.js";

test("track generator creates a closed telemetry-ready circuit", () => {
  const track = buildTrack(240);
  assert.equal(track.length, 240);
  assert.ok(track.every(p => Number.isFinite(p.curvature)));
  assert.ok(track.at(-1).distance < 5200);
});

test("lap simulation returns physically plausible telemetry", () => {
  const lap = simulateLap({ downforce: 62, fuel: 40, compound: "medium" });
  assert.ok(lap.lapTime > 55 && lap.lapTime < 180);
  assert.ok(lap.maxSpeed > lap.avgSpeed);
  assert.ok(lap.peakG > 1);
  assert.equal(lap.sectorTimes.length, 3);
  assert.ok(Math.abs(lap.sectorTimes.reduce((a,b)=>a+b,0) - lap.lapTime) < 1e-8);
});

test("fuel mass costs lap time", () => {
  const light = simulateLap({ fuel: 8, downforce: 60 }).lapTime;
  const heavy = simulateLap({ fuel: 90, downforce: 60 }).lapTime;
  assert.ok(heavy > light);
});

test("more downforce improves peak lateral capability but reduces top speed", () => {
  const low = simulateLap({ downforce: 28, fuel: 30 });
  const high = simulateLap({ downforce: 92, fuel: 30 });
  assert.ok(high.peakG > low.peakG);
  assert.ok(high.maxSpeed < low.maxSpeed);
});

test("strategy simulation is deterministic for a seed", () => {
  const cfg = { laps: 18, pitLap: 9, setup: { downforce: 61, fuel: 48 } };
  const a = simulateStrategy(cfg, { seed: 123 }).totalTime;
  const b = simulateStrategy(cfg, { seed: 123 }).totalTime;
  assert.equal(a, b);
});

test("Monte Carlo summary has ordered quantiles", () => {
  const mc = monteCarloStrategy({ laps: 16, pitLap: 8, setup: { fuel: 44 } }, 80, 5);
  assert.equal(mc.totals.length, 80);
  assert.ok(mc.p10 <= mc.median && mc.median <= mc.p90);
  assert.ok(mc.sigma > 0);
});

test("quantile interpolates correctly", () => {
  assert.equal(quantile([0, 10], 0.5), 5);
  assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
});

test("setup sweep returns requested sample count", () => {
  const sweep = setupSweep({ fuel: 25 }, "downforce", 30, 80, 11);
  assert.equal(sweep.length, 11);
  assert.equal(sweep[0].x, 30);
  assert.equal(sweep.at(-1).x, 80);
});
