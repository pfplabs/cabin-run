# Verification record

## Expanded lake update: automated checks passed
- `node --check` for `game.js`, `engine.js`, `environment.js`, `foliage.js`, `camera-rig.js` and the capture helper.
- `npm test`: 55 deterministic tests (24 simulation, 11 camera input, 3 camera obstruction, 6 environment, 5 material, 2 flight-effect and 4 road/dust checks).
- Simulation covers a complete winding road circuit through the tunnel, continuous road-to-driveway-to-cabin travel, launch-to-dock travel, reversing away from tunnel walls, elevated terrain, boundaries and bounded vehicle speeds. Lake area is verified as exactly four times the first version.
- Camera tests cover both vehicle targets, mouse orbit and wheel zoom, touch orbit/pinch, concurrent driving touches, zoom limits, pause/resume and cleanup. These include trackpad horizontal/diagonal/vertical-tail events, pinch, heading wraparound and desired-camera retention through obstruction. They are simulated DOM tests, not physical-device tests.
- Environment tests inspect upward-facing ground, an empty traversable tunnel volume with real walls and roof, sandbar position, connected parking and finite instanced shore geometry.
- `node scripts/inspect-scene.mjs`: actual GLB parsing, 50 mesh primitives, 132,684 triangles, 29 materials, named JeepRoot / PlaneRoot / Propeller, finite vertices. Model source reopens in Blender 4.3.2.
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
5. Switch to the plane: start idling on water, raise throttle with Shift, lift with W, release to hold power and lower it with Control. Check gradual speed, pitch/bank, RPM-linked blades and blur. Moor below 47 km/h, release, then throttle up for another takeoff. Fly past the visible boundary, turn back during its countdown, and test gradual assisted recovery.
6. Drag orbit and scroll zoom around both vehicles while moving. Test horizontal/diagonal trackpad swipe orbit, pinch zoom and Shift+scroll fallback. Verify heading follow and preserved relative orbit. Drive through both tunnel portals in both directions: camera must tuck/duck, keep the jeep in view and smoothly restore zoom outside.
7. Pause/resume during drag, restart from pause, switch tabs and return. Check for stuck input and time jumps.
8. On a real touch device, use one-finger orbit and pinch while simultaneously holding driving controls. Check the 390 × 844 layout.
9. Inspect water color/reflections, shoreline smoothness, trees, model detail, lighting and sustained frame rate on the actual target desktop and mobile devices. No photorealistic parity is claimed.
10. Record a final gameplay trailer only after the user is satisfied. Keep Blender previews labeled separately.

QA-only setup: `cabinQA.start()`, `cabinQA.switchVehicle()`, `cabinQA.setMode('cabin')`. State changes can arrange a test or shot; actual recorded motion must come from frame-by-frame simulation, with staged starts disclosed where relevant. Do not substitute synthetic renders for gameplay.

## Latest material pass
Original packed procedural texture supplies granite weathering, strata, mineral grain, surface-normal detail and roughness. Terrain mixes grass, soil, wet/dry shore and slope rock; decorative boulders have welded smooth normals. CPU tests validate shader patch construction and geometry. Shader compilation and visual quality are NOT verified until a fresh Mac/browser pass. No new external assets were downloaded.

## Jeep, driveway and cabin revision
Jeep integration uses 120 Hz substeps, smoothed speed-sensitive steering, capped lateral grip and damped four-wheel suspension. Identical scripted runs at30/60/120fps agree within1e-8; a full-speed keyboard-following test completes the road/tunnel without collision. Normal/boost limits are22/28m/s. Asphalt widened to8.4m, tunnel opening10.8m. The former seven-station driveway ribbon was replaced with metre-spaced sections; raycasts across its usable width verify the actual road surface stays above the rendered land. Gravel dust is bounded, speed-dependent and absent on asphalt. The larger cabin foundation, collision bounds, flight clearance and foliage exclusion are aligned. These are automated checks; updated visual feel, dust and architecture still require Mac browser inspection.
