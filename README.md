# Northbound · Cabin Run 3D

A real-time Three.js alpine-lake driving and floatplane sandbox, rebuilt from the supplied cabin artwork. Cabin, dock, jeep, floatplane and moving aircraft controls are actual Blender meshes. The supplied reference images are not redistributed.

Work stays on `feat/3d-alpine-lake`. `main` is unchanged, the old prototype is preserved in `legacy-2d/`, and nothing has been deployed.

## Play locally

Use a current browser with WebGL 2 and hardware acceleration. All runtime assets and Three.js are local; no package installation or build is needed to play.

```sh
python 3 -m http.server 4173
# Open http://localhost:4173
```

`npm start` runs the same server. Do not open the page through `file://`.

## Controls

- Jeep: W/S or arrows accelerate/reverse; A/D steer; Control brakes. Normal top speed is 79 km/h, or 101 km/h with Shift. Steering, lateral grip and four-wheel suspension are smoothed. Slow for corners.
- Plane: press Space to start the engine and wait three seconds. Hold Shift to increase throttle, then W to lift off above 36 km/h. Releasing Shift holds power. W/S changes pitch; A/D banks and steers. The actual ailerons, elevators and rudder move.
- Plane Control: reduces power in the air. On the water it also brakes the taxi motion. The HUD distinguishes these functions and shows throttle, airspeed and RPM.
- Landing: approach the cabin between the two buoy lines, reduce power and descend. Touchdown is physical water contact with flare/settling and spray, not a teleport. Taxi slowly to the extended pier; Space moors within 10 m at under 11 km/h. Space releases the mooring, then another Space starts the engine.
- V switches vehicle starting points. This remains a quick scene selector, not an on-foot boarding sequence.
- C cycles heading-follow orbit, world-relative wide orbit and a fixed cabin view. Drag to orbit, scroll/pinch to zoom. Horizontal or diagonal trackpad swipes orbit; Shift+scroll is an explicit fallback. The camera ducks inside the tunnel and restores preferred zoom outside.
- P/Escape pauses. Losing focus pauses and clears held controls. Touch driving buttons, one-finger orbit and two-finger pinch are supported.
- Sound is opt-in. No accounts, analytics, tracking or gameplay network calls.

## The valley

The lake is 936 ×684 m, nine times the preceding lake's area and 36 times the first 3D version's area. Cabin, vehicles, human doors, dock and parking retain real-world scale. The approximately 3.63 km road climbs a 70 m ridge, passes through a clean carved tunnel with three real lake-view openings, then descends around the lake.

Asphalt is 8.4 m wide. The cabin approach uses the same paving, clipped at the junction to avoid stacked surfaces. Distinct textured gravel shoulders and parking produce speed-dependent tyre dust. The driveway has metre-spaced geometry and is checked against the actual land mesh. Three parking bays serve the enlarged timber cabin, with its balcony, wraparound glazing and furnished interior.

The pier extends toZ 36 with a verified floatplane berth. Float clearance, wing clearance and water immersion have been checked against the exported model. Taxi collision prevents passing through the pier.

A translucent flight edge and eight-second return countdown permit manual recovery before gentle steering assistance. The flight ceiling is 140 m. There are no rings, crates, races or imposed objectives.

## Visuals and performance

The photographed skyline has been removed. A building-free procedural sky and actual mountain terrain form the horizon. Sun, sky, fog, water highlights and indirect reflections follow one smooth ten-minute daylight/golden-hour cycle. The sun never falls below 11 degrees and the scene never enters night.

Terrain mixes grass, soil, wet/dry shoreline and granite detail. Adaptive terrain density and separately culled tiles keep detail where it matters. The 9,500 seeded trees use spatial chunks, detailed-to-card transitions at 160–220 m, mipmaps, atmospheric perspective and long-distance fade/culling. Reflections and shadows retain their own frustum culling.

This is an evolving playable reconstruction, not a claim of photorealistic parity with the reference. The latest shaders, visual composition, mobile behavior and actual FPS still require a fresh browser pass. See `QA.md`.

## Rebuild and verify

```sh
npm install
npm test
node scripts/inspect-scene.mjs
blender --background --threads 4 --python scripts/build_scene.py
```

Blender 4.3+ recreates the editable `.blend` and `.glb`. Tests cover input-driven trips, startup/takeoff/landing, lane following at speed, frame-rate consistency, camera gestures, tunnel clearance/windows, actual road/land alignment, LOD, lighting and particles.

`?qa=1` enables `window.cabinQA`. `window.cabinDiagnostics()` reports recent real browser frame intervals, renderer counts and forest/terrain statistics. CPU submission estimates are not measured FPS.

Three.js 0.183.2 is MIT-licensed, see `vendor/THREE-LICENSE`. Texture attribution is in `assets/pbr/SOURCES.md` and linked from the game.

## Later milestones

Cockpit views for jeep and plane follow the visual work. The final gameplay trailers and retrospective article are deferred until the user is satisfied.

For later genuine browser capture, install Playwright separately, start the static server and run `node scripts/record-gameplay.mjs` on a WebGL-capable desktop. It records actual frames driven by scripted controls and saves unedited WebM/screenshots. This helper has not been GPU-verified in the cloud. No Blender or generated frame is substituted for gameplay.
