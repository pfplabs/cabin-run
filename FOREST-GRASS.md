# Wind grass visual pass

Adds small, olive-green blade clusters around the first 1,500 detailed forest trees. Seeded placement produces 36,733 tufts in this scene. Four tapered blades per tuft use 12 triangles, vertex colour from darker roots to straw-green tips, and shared world-space gusts. Roots remain anchored; upper blades bend quadratically. MeshStandardMaterial follows scene lighting and receives shadows.

Static instance buffers are grouped into 32 m cells, independently frustum culled by Three for each render camera. Geometry shrinks smoothly between 38 and 85 m and whole cells beyond range are disabled. Grass casts no shadows. Wind changes only shared uniforms, with no instance-buffer uploads or per-blade CPU work each frame. Density defaults to half on coarse-pointer devices.

Roads, driveway, parking apron, cabin/terrace, lake and stream are excluded with margins wider than the maximum blade excursion. Steep terrain is rejected. No collision or vehicle handling code changes.

With `?qa=1`, use `cabinQA.setGrassDensity(0..1)` and `cabinQA.setGrassWind(0..2)`; zero disables density or wind respectively. `cabinDiagnostics().grass` reports capacity and distance-enabled submissions before renderer frustum culling, including potentially hidden vertices in fading cells.

## Verification on the Mac mini

- All 121 Node tests pass, including deterministic grass placement, sampled road/driveway/parking exclusions, finite instance data, density and distant culling.
- Headless Chrome rendered the game and a fixed-camera production-module grass fixture without JavaScript or shader errors. The game logged only its existing missing favicon.
- Fixture: 417 tufts, two grass draw calls, 5,004 grass triangles. Captures at wind time 0 and 2 seconds differ visibly; static ground/camera/lighting are unchanged.
- Cabin overview: density 0 gave 411 renderer calls / 2,145,081 triangles; density 1 gave 414 / 2,146,269 across the renderer's scene passes. Only 33 tufts were within range at this overview camera.
- Four alternating on/off samples measured 22.8/26.2/24.0/23.4 FPS. Shared-machine/browser load and the rolling sample window make these unsuitable for a reliable FPS delta. No performance improvement claim is made. A closer forest-edge view also rendered successfully; in-person driving feel remains untested.
- Captures and raw diagnostics are in ignored `artifacts/forest-grass/` in this checkout.

## Integration

Isolated branch `feat/forest-wind-grass`, based on `7c7b248` (the latest spruce-crown/meadow pass from task-3). Only new `forest-grass.js`, its test, this note, and five integration points in `game.js` change. No other worker's checkout was modified. When integrating vehicle changes, retain both workers' imports, scene setup, diagnostics and frame callbacks.
