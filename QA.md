# Verification record

## Expanded lake update: automated checks passed
- `node --check` for `game.js`, `engine.js`, `environment.js`, `foliage.js`, `camera-rig.js` and the capture helper.
- `npm test`: 28 deterministic tests (16 simulation, 6 camera and 6 environment).
- Simulation covers a complete winding road circuit through the tunnel, continuous road-to-driveway-to-cabin travel, launch-to-dock travel, reversing away from tunnel walls, elevated terrain, boundaries and unchanged vehicle speeds. Lake area is verified as exactly four times the first version.
- Camera tests cover both vehicle targets, mouse orbit and wheel zoom, touch orbit/pinch, concurrent driving touches, zoom limits, pause/resume and cleanup. These are simulated DOM tests, not physical-device tests.
- Environment tests inspect upward-facing ground, an empty traversable tunnel volume with real walls and roof, sandbar position, connected parking and finite instanced shore geometry.
- `node scripts/inspect-scene.mjs`: actual GLB parsing, 51 mesh primitives, 107,960 triangles, 30 materials, named JeepRoot / PlaneRoot / Propeller, finite vertices. Model source reopens in Blender 4.3.2.
- Main branch and the old prototype are preserved. No deployment has been performed.

## Previous iteration: Mac browser verified
A real Mac browser rendered the earlier scene and verified jeep acceleration/steering, aircraft climb/turn, pause, vehicle switching, boundary recovery and active reflections. That pass identified metallic-looking water, angular shoreline, sparse repeated trees, dark terrain and simplified vehicle surfaces. The expanded update specifically addresses these, but visual improvement is not asserted without a new browser capture.

## Expanded update: browser QA still needed
The managed cloud Chromium disables WebGL. Automated simulation and geometry checks do not establish visual quality or frame rate.

Run `python3 -m http.server 4173` and visit `http://localhost:4173/?qa=1` in a WebGL 2 browser:
1. Confirm no console or network errors and inspect `cabinDiagnostics()`.
2. Drive the entire winding road in both directions, including hill and tunnel. Inspect road/ground alignment, tunnel clearance, headlights, wheel animation and reversing recovery.
3. Take the gravel turnoff to the cabin, enter all three parking bays, and check driveway connectivity without visual terrain clipping.
4. Hit shoreline, cabin and outer boundary. Verify bounded motion and recovery by reversing.
5. Switch to the plane, climb above the ridge, turn, descend and slow. Moor with Space near the dock, then take off again.
6. Drag orbit and scroll zoom around both vehicles while moving. Check camera height, tunnel behavior and zoom limits. Switch camera modes and vehicles repeatedly.
7. Pause/resume during drag, restart from pause, switch tabs and return. Check for stuck input and time jumps.
8. On a real touch device, use one-finger orbit and pinch while simultaneously holding driving controls. Check the 390 × 844 layout.
9. Inspect water color/reflections, shoreline smoothness, trees, model detail, lighting and sustained frame rate on the actual target desktop and mobile devices. No photorealistic parity is claimed.
10. Record a final gameplay trailer only after the user is satisfied. Keep Blender previews labeled separately.

QA-only setup: `cabinQA.start()`, `cabinQA.switchVehicle()`, `cabinQA.setMode('cabin')`. State changes can arrange a test or shot; actual recorded motion must come from frame-by-frame simulation, with staged starts disclosed where relevant. Do not substitute synthetic renders for gameplay.
