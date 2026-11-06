# Northbound — Cabin Run 3D

A real-time Three.js alpine-lake driving and floatplane sandbox, reconstructed from the supplied cabin artwork. The cabin, dock, canoe, jeep, yellow floatplane and Icelandic flag are actual Blender meshes. No original model files were required.

This branch replaces the old 2D prototype at the root. The original prototype is preserved under `legacy-2d/`; `main` is unchanged. Nothing has been deployed.

## Run locally

Use a current browser with WebGL 2 and hardware acceleration. No package install or build is required for playing; Three.js and its MIT license are vendored locally.

```
python3 -m http.server 4173
# Open http://localhost:4173
```

`npm start` runs the same server. Do not open `index.html` through `file://` because the browser needs HTTP to load modules and the glTF model.

## Explore

- Jeep: W/S or arrows for throttle and reverse, A/D or arrows to steer, Shift to accelerate, Control to brake.
- Floatplane starts idling on the water. Hold Shift to raise throttle, then W to lift off once moving. Control lowers throttle; release holds the chosen power. A/D banks and steers, W/S changes pitch smoothly. The HUD shows throttle, airspeed and engine RPM.
- V switches between the jeep road start and floatplane lake start. This is a convenient scene selector, not an in-world boarding interaction.
- Space parks near the house, moors the plane near the dock below 47 km/h, or releases it from its mooring. After release, throttle up and lift off again.
- C cycles close orbit, wide orbit and fixed cabin cameras. Drag to orbit either vehicle, scroll to zoom, or use one-finger orbit and two-finger pinch on touch screens. The close camera smoothly follows steering while preserving your relative orbit angle. Wide orbit stays world-relative. Horizontal/diagonal two-finger trackpad swipes rotate, pinch zooms, and Shift+scroll is an explicit orbit fallback. The camera ducks and moves closer inside the tunnel, then restores your chosen distance.
- P or Escape pauses. Losing focus pauses the simulation and clears held controls.
- On-screen multi-touch driving/flight controls are provided for small/coarse-pointer screens.
- Sound is opt-in. No accounts, analytics, tracking, remote assets or gameplay network calls. Texture credits are linked in the scene and documented in `assets/pbr/SOURCES.md`.

The expanded lake has four times the original surface area (312 × 228 metres across). A winding, roughly 1.2 km road climbs the rocky ridge, passes through a genuine open-ended tunnel, and descends around the lake. A separate gravel driveway reaches three usable parking bays beside the cabin. A sandy bar and reeds soften the rocky shoreline. The world is bounded by the valley; flight has an 84 m altitude ceiling. A translucent edge appears near the flight limit. Leaving it shows an eight-second return countdown; manual return is allowed before a gentle steering assist engages. There are no crates, rings, races or imposed objectives.

## Rebuild the Blender assets

Requires Blender 4.3 or later:

```
blender --background --threads 4 --python scripts/build_scene.py
```

Outputs `assets/northbound.blend`, `assets/northbound.glb` and a Blender preview. The procedural Blender source retains all dimensions and object labels; the exported scene batches static meshes by material for runtime efficiency. Runtime creates the bounded surrounding terrain, roadway, vegetation, sky and reflective animated lake.

## Checks

```
npm install
npm test
node scripts/inspect-scene.mjs
```

The 46 Node tests cover driving, flight, boundaries, collision, pause/resume/restart, vehicle switching, a complete winding road circuit through the tunnel, continuous input-driven trips to the cabin and dock, camera gestures, terrain mesh normals and tunnel geometry. Scene validation parses the real GLB with Three.js, checks named vehicle roots, finite geometry and triangle/draw-call budgets.

`?qa=1` enables `window.cabinQA` for deterministic test setup. `window.cabinDiagnostics()` is read-only and reports scene/renderer/simulation details. Normal play does not expose state-changing debug controls.

## Art and verification status

This is an evolving 3D reconstruction, not a claim of photorealistic parity with the modern reference rendering. Modeling, textured materials, lighting and vegetation remain iterative. `assets/northbound.blend` is the editable source, not a gameplay capture. The browser scene adds live reflections, photographed HDR sky/lighting, PBR timber maps, photographic grass, textured 3D needle branches, physical glass, clearcoat paint and procedural mineral detail. Terrain now layers grass, soil, shoreline and exposed rock; granite uses metre-scale weathering, mineral detail, roughness and surface-normal variation. These procedural materials and smoother decorative boulders remain an art iteration, not photorealistic parity.

The previous iteration was rendered and driven in a real Mac browser, including jeep and aircraft controls, pause, switching and boundary recovery. The expanded world was played by the user. The latest camera corrections, new flight dynamics and material shaders pass automated checks, but their integrated appearance, touch behavior and frame rate still need a fresh browser pass. The cloud browser disables WebGL, so it cannot supply that verification. See `QA.md`. Never describe a Blender preview as captured gameplay.

## Third-party software

Three.js 0.183.2, MIT. See `vendor/THREE-LICENSE`. Scene geometry and procedural textures were newly created for this project; supplied reference images are not redistributed in this public repository.

## Genuine gameplay recording

The final trailer is deferred until the user is satisfied with the game. The following helper is preparation only, not a completed or verified recording.

On a WebGL-capable desktop with Chrome, install Playwright separately (`npm install --no-save playwright`), start the static server, and run `node scripts/record-gameplay.mjs`. It records actual browser frames while scripted controls follow the road and fly to the dock. This capture helper has not yet been run in the GPU-disabled cloud. It saves unedited WebM and screenshots under `artifacts/gameplay/`. No Blender render or generated frame is substituted for gameplay.
