# Apex Lab

Apex Lab is an interactive race-engineering sandbox built to make motorsport math visible.

Instead of presenting a static “F1 dashboard,” it couples a small vehicle-performance model to telemetry visualization and a Monte Carlo strategy engine. Move one slider and you can watch the consequence propagate through lap time, top speed, lateral acceleration, tire temperature, setup sensitivity, and race-time uncertainty.

## What it does

- Generates a synthetic 5.2 km circuit and computes a curvature field around the lap.
- Models the aero tradeoff between cornering performance and drag.
- Models fuel-mass penalty, tire compound grip, tire degradation, brake-bias sensitivity, and a tire-temperature window.
- Produces per-point telemetry for speed, lateral G, brake, throttle, and tire temperature.
- Draws a live speed-colored circuit map with no third-party charting dependency.
- Plots the complete speed trace and a downforce response surface.
- Runs 500-race Monte Carlo strategy experiments with driver noise, traffic variation, tire aging, and probabilistic Safety Car pit-loss reduction.
- Reports P10 / median / P90-style uncertainty rather than pretending a single deterministic race time is “the answer.”

## Run

From this directory:

```bash
python3 -m http.server 4178
```

Then open http://127.0.0.1:4178.

No npm install is required for the app itself.

## Test

Node 20+:

```bash
npm test
```

The tests cover circuit generation, telemetry plausibility, fuel-mass effects, the downforce/drag tradeoff, seeded reproducibility, Monte Carlo quantile ordering, quantile interpolation, and setup-sweep sampling.

## Model notes

This is intentionally a transparent engineering model rather than a black box.

At each circuit point, speed is derived from a blend of straight-line speed and curvature-limited corner speed. The setup then changes that speed through multiplicative factors:

```text
effective grip
≈ tire grip
× aero cornering factor
× fuel-mass factor
× tire-wear factor
× temperature-window factor
× brake-bias factor
```

Downforce creates the key racing tradeoff:

```text
cornering capability ↑ with downforce
straight-line speed ↓ with aerodynamic drag
```

Lap time is integrated around the circuit using local distance and average segment speed:

```text
Δt = Δs / v̄
lap time = Σ Δt
```

The strategy model then adds stochastic terms for driver variation and traffic, plus a probabilistic reduction in pit-lane loss when a Safety Car occurs. Re-running many races creates an empirical distribution of race time, which is summarized with quantiles and standard deviation.

## Why this is statistically interesting

A deterministic optimizer would simply choose the setup with the smallest predicted lap time. Real race engineering is more interesting because expected value and uncertainty can disagree.

A strategy can have:

- a slightly better mean,
- a much wider distribution,
- a better best case,
- and a worse downside.

That is why Apex Lab displays the distribution rather than only the average.

## Project structure

```text
apex-lab/
├── index.html
├── styles.css
├── package.json
├── src/
│   ├── app.js
│   └── sim.js
└── tests/
    └── sim.test.js
```

## Scope

Apex Lab is a portfolio / education simulator. It is not a validated Formula One vehicle model and should not be used for real race engineering decisions. The circuit and parameters are synthetic by design so the project stays self-contained and reproducible.
