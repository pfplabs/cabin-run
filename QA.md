# Verification record

## Mac mini refinement check — 2026-11-06

- Isolated checkout based on `8bf7e14`, served on `http://127.0.0.1:4183/?qa=1`.
- 119 tests passed, including tunnel volume/camera clearance, watertight rock shells, three lake apertures, flat cabin terrain, and a new glass-only shadow regression. glTF inspection passed: 60 meshes, 143,234 triangles, 29 materials.
- Chrome loaded the revised scene, started gameplay and switched cameras. No console errors were recorded. Existing `PCFSoftShadowMap` deprecation warning remains.
- Ridge variation changes existing vertex heights only; no extra triangles, materials, lights or draw submissions. Cabin-only glass uses a clearer single-sided physical material; glass-only meshes no longer cast opaque shadow-map silhouettes. Mixed-material meshes retain shadows.
- Actual browser screenshots were saved outside the repository in the task's `evidence` directory. Original reference attachments were not available in this checkout. This is a limited visual refinement, not a claim of photorealistic parity or measured FPS. The separate preview task owns performance measurement.

## Current automated checks

- `npm test`: 83 tests passed against the integrated source.
- `node scripts/inspect-scene.mjs`: actual glTF parsing, 60 mesh primitives, 143,234 triangles, 29 materials; named vehicle, wheel, propeller and five aircraft control pivots preserved. All vertices finite.
- Syntax checks pass for application, simulation, camera, environment, LOD, daylight, particle and recording modules.
- Blender source reopens and exports. Human-scale cabin doors/stairs, aircraft hinge axes and extended-pier clearances were measured in the real geometry.
- All five aircraft control surfaces passed fixed-skin intersection checks at −20°, −15°, 0°, 15° and 20°.

Simulation tests include keyboard driving through the complete winding road and tunnel, the driveway/parking approach, 22/28 m/s speed limits, smooth braking/reverse, and equal scripted results at 30/60/120 FPS. Plane tests cover three-second startup, throttle lockout, taxi, takeoff, aligned approach, physical touchdown, water braking and explicit mooring without position teleportation. Pause/reset and boundary return/recovery are covered.

Geometry tests raycast the actual land and driveway, check trimmed asphalt junctions, maintain a clear 10.4 m-wide tunnel envelope and camera sight lines, and prove that all three tunnel apertures are real openings with solid reveals and clear views toward lake water. Ground, dock, cabin, shore margins and flight clearances use the larger world's current coordinates.

The dock berth is at X−23.7/Z30 with aircraft root Y0.10. At both parallel headings, the model has 0.67 m wing-to-pier vertical clearance and 0.85 m pontoon-to-fender horizontal clearance, with 0.06 m pontoon immersion. Taxi collision prevents entering the pier footprint.

Forest tests preserve all 9,500 seeded locations, validate detailed/card fades, distance culling and reflection-safe visibility. Terrain tiles preserve all original triangles and share vertex buffers. Daylight tests cover cycle continuity, minimum brightness, sun elevation and matching sky/water/light state. These CPU tests do not prove GPU shader compilation or frame rate.

## What was played previously

Earlier revisions were rendered and played in a real Mac browser. Jeep/plane controls, pause, switching, reflections and boundary behavior were observed. User feedback drove this revision's camera, handling, road, tunnel, dock, world-size and lighting changes. That earlier play does not verify the latest integrated revision.

## Fresh browser pass required

The cloud browser disables WebGL. No current gameplay video, photorealistic parity or measured FPS is claimed here.

Run `python3 -m http.server 4173`, then open `http://localhost:4173/?qa=1`:

1. Confirm all assets load and no shader/console errors occur. Inspect `cabinDiagnostics()`.
2. Drive the road at normal/boost speeds, brake, reverse and use both lanes through both tunnel portals. Look through all three openings. Confirm no boulder intrusion, camera clipping or road/land overlap.
3. Follow the paved cabin branch. Check the matching asphalt junction, gravel shoulders, dust, parking apron and enlarged cabin.
4. Switch to the plane. Space starts the engine; wait for idle. Shift adds power, W lifts, A/D banks, S descends. Inspect RPM-linked blades/blur and actual hinged surfaces.
5. Fly the buoy corridor, reduce power, descend to a real water touchdown, then hold Control to slow. Inspect spray/wake. Taxi beside the longer pier and moor below 11 km/h. Unmoor, restart and take off again.
6. Test the visible world boundary, manual return countdown and gradual recovery. Check clear ground/roof/pier separation.
7. Test steering-follow orbit, drag, trackpad horizontal/diagonal swipe, pinch, ordinary wheel and Shift+scroll fallback. Repeat pause/resume mid-drag, vehicle switches and focus loss. Test physical touch separately.
8. Inspect the natural sky and terrain. The photographed city skyline must be absent. Observe daylight/golden-hour changes, matching water highlights/reflections and no dark-night interval.
9. Drive/fly for at least 30–60 seconds and sample `cabinDiagnostics()`. It reports average browser frame rate and p95 frame interval, renderer counts, forest submission estimates and terrain tile count. Check visible LOD transitions and reflection continuity. Record actual device, window size and pixel ratio when comparing performance.
10. Capture current browser screenshots for visual review. Make the final trailer only after the user is satisfied. Never substitute Blender previews or generated frames for gameplay.

## Known scope boundaries

This is a compact, forgiving exploration game, not a full vehicle/flight simulator. The V key is a scene selector. Cockpit views are deferred until after visual work. Current artwork remains an iteration toward the reference, not a claim of photographic equivalence. The final trailer and retrospective article have not been produced or published.
