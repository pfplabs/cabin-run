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
- Floatplane: A/D steers, W climbs, S descends, Shift boosts, Control slows.
- V switches between the jeep road start and floatplane lake start. This is a convenient scene selector, not an in-world boarding interaction.
- Space parks near the house, moors the plane near the dock, or takes off after mooring.
- C cycles chase, free-look and cabin cameras. Drag in chase mode to look around.
- P or Escape pauses. Losing focus pauses the simulation and clears held controls.
- On-screen multi-touch driving/flight controls are provided for small/coarse-pointer screens.
- Sound is opt-in. No accounts, analytics, tracking, remote assets or gameplay network calls.

The flat scenic road is approximately 590 metres around a small bounded lake. The hard vehicle boundary is visible through roadside posts, surrounding slopes and the forest. Flight stays within the valley and has a 42 m altitude ceiling. There are no crates, rings, races or imposed objectives.

## Rebuild the Blender assets

Requires Blender 4.3 or later:

```
blender --background --threads 4 --python scripts/build_scene.py
```

Outputs `assets/northbound.blend`, `assets/northbound.glb` and a Blender preview. The procedural Blender source retains all dimensions and object labels; the exported scene batches static meshes by material for runtime efficiency. Runtime creates the bounded surrounding terrain, roadway, vegetation, sky and reflective animated lake.

## Checks

```
npm test
npm install
node scripts/inspect-scene.mjs
```

The Node tests cover driving, flight, boundaries, collision, pause/resume/restart, vehicle switching, and continuous input-driven trips from spawn to house and plane launch to dock. Scene validation parses the real GLB with Three.js, checks named vehicle roots, finite geometry and triangle/draw-call budgets.

`?qa=1` enables `window.cabinQA` for deterministic test setup. `window.cabinDiagnostics()` is read-only and reports scene/renderer/simulation details. Normal play does not expose state-changing debug controls.

## Art and verification status

This is an initial 3D reconstruction, not a claim of photorealistic parity with the modern reference rendering. Modeling, textured materials, lighting and vegetation remain iterative. `assets/northbound.blend` is the editable source, not a gameplay capture. The browser scene adds live reflections, atmospheric sky, shadows and procedural surface textures.

The cloud browser available during initial implementation disabled WebGL. Simulation and GLB structure were tested there; actual browser rendering, controls, mobile touch and frame rate need a WebGL-capable browser. See `QA.md`. Never describe a Blender preview as captured gameplay.

## Third-party software

Three.js 0.183.2, MIT. See `vendor/THREE-LICENSE`. Scene geometry and procedural textures were newly created for this project; supplied reference images are not redistributed in this public repository.
