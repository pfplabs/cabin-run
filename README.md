# Northbound — Cabin Run

## Current 3D version

This default branch preserves the original **2D prototype** described below. Current 3D gameplay, setup instructions and verification notes are on [`feat/3d-alpine-lake`](https://github.com/pfplabs/cabin-run/tree/feat/3d-alpine-lake) and its [README](https://github.com/pfplabs/cabin-run/blob/feat/3d-alpine-lake/README.md). The 3D work has not been merged into `main`.

![Current 3D development: driving the alpine lake road](https://github.com/pfplabs/cabin-run/blob/31c650634e72f6a4412cab7a1e415fd220f6e0e3/docs/images/cabin-drive-18.jpg?raw=true)

*November 6, 2026 browser gameplay from the 3D feature branch, not the 2D prototype below. [View the full gallery](https://github.com/pfplabs/cabin-run/blob/feat/3d-alpine-lake/README.md#gameplay-gallery).*

## Original 2D prototype

A dependency-free browser minigame inspired by a lakeside Maya/OpenGL cabin scene from 2013. All artwork is drawn procedurally in Canvas. No external assets, network calls, backend, build tools or accounts are required.

## Play
Open `index.html` in a modern browser. For development, serve this directory with any static HTTP server. Deploy the files unchanged to any static host.

1. Drive the jeep to the three glowing supply crates.
2. Return to the dock and press E / Space (or tap Load).
3. Fly through five numbered rings in order.
4. Return close to the dock and press E / Space (or tap Land).

Keyboard: WASD or arrow keys. Jeep: directional drive. Floatplane: left/right steer, up boost, down slow. P / Escape pauses. On-screen directional buttons support touch and simultaneous presses. A run auto-pauses on window blur or when the tab is hidden.

The clock counts active play only. Rocks, the cabin and the flight boundary add a three-second penalty. Personal best is saved to localStorage when available. Sound effects are opt-in and generated with Web Audio. Restart, pause, victory and replay are included.

## Files
- `index.html`, `styles.css`: responsive interface and accessible native controls.
- `engine.js`: deterministic state machine and collision/progression rules; also exports as CommonJS for tests.
- `game.js`: Canvas scene, input, audio and HUD.
- `test-engine.cjs`: Node built-in assertions. Run `node test-engine.cjs`.

## Notes
This is an original 2D minigame, not a recreation using the original 3D models. Keyboard and pointer/touch controls are implemented; physical-device testing remains advisable. The best score stays on the current browser/device. No analytics or tracking is included.
