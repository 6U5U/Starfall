# Starfall — landing lab

An original local browser game inspired by the idea behind [Landing-Starships](https://github.com/alxndrTL/Landing-Starships). No upstream code or assets are copied. This is a new 2D implementation, not a port of the Unity project or its trained reinforcement-learning model.

## Play locally

Run `npm start`, then visit http://127.0.0.1:4177. No installation or external services are needed. Keep the server running while playing. You can also double-click `Launch Starfall.command` on macOS with Node installed.

Release the ship, use A/D or left/right arrows to tilt, and hold Space for full thrust. The slider sets a sustained throttle; up/down arrows adjust it. P pauses, R resets. Touch buttons support mobile controls. Autoland uses a deterministic feedback controller. Switching conditions resets the approach.

Land within 24 m of the pad center, below 5 m/s vertical and 4 m/s lateral speed, with tilt below 0.15 radians. Fuel is finite. Calm and crosswind conditions are available. Losing window focus pauses the flight.

## Validation

Run `npm test` for guided landings, unpowered impact, empty-tank behavior, preflight state, and off-pad touchdown. Browser visual QA has not been performed.

Optional WebMCP read/start tools are feature-detected. They have not been verified in a supported browser context.

## Model

Fixed 120 Hz physics; Earth gravity, simplified thrust and attitude response, horizontal drag and optional time-varying wind. Fuel limits burn duration but does not change mass. This is a game, not an aerospace engineering model.

All game assets are rendered locally. The app does not collect data, load third-party scripts, or require an account.
