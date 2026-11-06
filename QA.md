# Verification record

## Passed
- `node --check game.js` and `node --check engine.js`.
- `npm test`: 10 deterministic simulation tests, including full input-driven road-to-cabin and launch-to-dock trips.
- `node scripts/inspect-scene.mjs`: actual GLB parsing, 87 mesh primitives, 29,508 triangles, 27 materials, named JeepRoot / PlaneRoot / Propeller, finite vertices.
- Blender 4.3.2 saved editable source and exported the GLB; a real Cycles render was visually inspected.

## Requires WebGL-capable browser QA
The managed cloud Chromium disabled its GPU/WebGL backend. No gameplay video or browser-rendered visual pass is claimed yet.

Run `python3 -m http.server 4173` and visit `http://localhost:4173/?qa=1` in a WebGL 2 browser:
1. Confirm scene loads with no console or network errors. Inspect `cabinDiagnostics()`.
2. Start driving, throttle, steer, reverse and brake. Follow the road to the gravel cabin turnoff.
3. Hit the shoreline, cabin and outer edge; verify bounded motion and recovery by reversing.
4. Press V, fly toward the cabin, climb, descend, bank and slow. Moor near the dock with Space, then take off again.
5. Switch cameras repeatedly, drag to look, then switch vehicles. Chase camera must remain stable.
6. Pause and resume, restart from pause, switch tabs and return. No stuck input or time jumps.
7. Check 390 x 844 mobile layout and simultaneous touch directions; physical-device play remains recommended.
8. Capture genuine gameplay only after these pass. Record one jeep shoreline approach and one floatplane lake-to-cabin approach. Keep Blender renders labeled separately.

Optional setup helpers in QA mode: `cabinQA.start()`, `cabinQA.switchVehicle()`, `cabinQA.setMode('cabin')`. `cabinQA.state` can arrange a shot; record actual frame-by-frame simulation after setup and disclose staged starts where relevant. Do not use synthetic renders as gameplay.

## Material pass checks
- Photographed HDR decoded successfully as 1024 × 512 RGBE.
- HDR, Water and foliage module imports pass without a GPU.
- Syntax, physical-material defaults and all 10 simulation tests remain passing.
- New ground/stone shaders, HDR orientation, exposure, timber UV scale, glass transmission, needle-card performance and mobile graphics still require live WebGL testing.
