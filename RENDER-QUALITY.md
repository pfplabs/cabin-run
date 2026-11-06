# Explicit renderer controls

Visual quality offers Fast, Balanced (default), Photo and an independent Surface
textures checkbox. No geometry, physics, forest locations or LOD are changed.

| Preset | Pixel ratio cap | Shadows | Glass transmission resolution |
| --- | ---: | --- | ---: |
| Fast | 1 | Off | 50% per dimension |
| Balanced | 1.35 | On | 75% per dimension |
| Photo | 1.6 | On | 100% |

Photo preserves the pre-control renderer settings. Pixel caps only change work
when device pixel ratio exceeds the cap; this Mac's DPR 1 comparisons do not
benefit from that part. Water reflection fidelity is unchanged in all presets.

Surface textures toggles standard albedo/normal/bump/roughness/metalness/AO and
clearcoat map slots. Shader uniforms also disable terrain/rock packed textures,
terrain grass sampling and water ripple normals. Foliage coverage maps,
transparent/alpha-tested albedo, sign text, alpha/displacement/emissive maps and
environment/reflection maps are retained. Procedural geometry and non-textured
colours remain. Original texture objects stay resident for exact restoration:
this is **not a texture-memory or download reduction**. Async refined GLTF
materials are registered after vehicle/hero refinements.

Keyboard events from settings and other form controls cannot steer, switch
vehicles/cameras, start the engine or toggle pause. Focusing settings also clears
held driving input. Resize reapplies the selected pixel cap.

## Measurements

`cabinDiagnostics().fullFrame` accumulates main, reflection and transmission
passes. `frame-metrics.js` is the only owner of renderer.info.reset(); autoReset
is disabled. CPU frame work includes simulation and renderer submission, not GPU
execution. RAF cadence is separately reported. GPU time remains null. Texture
and shader-program counts are diagnostics, not byte measurements.

`?qa=1` exposes fixed `cabinQA.benchmark('jeep'|'lake'|'cabin')` views with frozen
simulation/daylight, setQuality/setTextures, and resetMetrics. A QA-only
reflection probe can skip repeated reflection renders after a static view has
warmed; it is not a production quality setting or evidence that cached
reflections would be correct during driving. Start a new run to exit benchmark
mode. Warm 90 frames, then measure 180 samples per case. Raw captures and harness
HTML are preserved in the task's evidence/artifacts directories outside Git.

Three.js documents both manual multi-pass info resets and transmission render
target scaling in its [WebGLRenderer reference](https://threejs.org/docs/pages/WebGLRenderer.html).

## Mac mini fixed-view results — 2026-11-06

1566×1169, DPR 1, frozen camera/daylight/simulation, 90 warmup frames then 180 measured frames per row. Baseline is a rendering-source snapshot of 38a7856 with instrumentation only; the corrected Jeep camera is (−32,7,−3). An earlier intersecting camera sample and a run whose shared tab closed were discarded. All rows count the complete frame. CPU is CPU frame work, **not GPU time**.

| View | Case | Mean ms | FPS estimate | p95 ms | CPU ms | Calls | Triangles | Textures / programs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| jeep | baseline | 32.89 | 30.4 | 40.1 | 15.46 | 754 | 4801536 | 24 / 110 |
| lake | baseline | 21.06 | 47.5 | 30.0 | 17.26 | 997 | 4901512 | 26 / 110 |
| cabin | baseline | 29.49 | 33.9 | 31.0 | 16.24 | 899 | 4684236 | 26 / 110 |
| jeep | photo | 44.95 | 22.2 | 50.7 | 17.66 | 754 | 4801536 | 24 / 110 |
| jeep | balanced | 38.28 | 26.1 | 50.0 | 13.46 | 754 | 4801536 | 24 / 110 |
| jeep | fast | 23.28 | 43.0 | 30.8 | 14.92 | 688 | 4370302 | 24 / 164 |
| jeep | photo-off | 30.33 | 33.0 | 40.0 | 14.73 | 754 | 4801536 | 24 / 166 |
| jeep | photo-restored | 30.83 | 32.4 | 40.0 | 14.20 | 754 | 4801536 | 24 / 166 |
| lake | photo | 30.72 | 32.5 | 50.0 | 16.58 | 997 | 4901512 | 26 / 166 |
| lake | balanced | 31.00 | 32.3 | 41.0 | 19.10 | 997 | 4901512 | 26 / 166 |
| lake | fast | 35.06 | 28.5 | 49.9 | 16.15 | 957 | 4538030 | 26 / 168 |
| lake | photo-off | 24.11 | 41.5 | 40.0 | 17.10 | 997 | 4901512 | 26 / 168 |
| lake | photo-restored | 24.28 | 41.2 | 30.1 | 16.76 | 997 | 4901512 | 26 / 168 |
| cabin | photo | 31.56 | 31.7 | 40.8 | 16.10 | 899 | 4684236 | 26 / 168 |
| cabin | balanced | 28.89 | 34.6 | 40.1 | 16.23 | 899 | 4684236 | 26 / 168 |
| cabin | fast | 24.94 | 40.1 | 30.1 | 16.33 | 833 | 4265542 | 26 / 168 |
| cabin | photo-off | 30.56 | 32.7 | 39.1 | 16.32 | 899 | 4684236 | 26 / 168 |
| cabin | photo-restored | 32.22 | 31.0 | 40.0 | 17.40 | 899 | 4684236 | 26 / 168 |
| cabin | reflection-probe | 22.50 | 44.4 | 30.1 | 8.28 | 341 | 1816480 | 26 / 168 |

Interpretation: Photo retains baseline draw/triangle totals at each view. Fast
removes 40–66 shadow draw calls and approximately 0.36–0.43 million submitted
triangles. Balanced changes transmission pixel workload, not geometry. The
static cabin reflection probe removes 558 calls / 2.87 million triangles and
roughly halves measured CPU frame work; live reflections remain enabled because
that probe does not establish correct cached reflections during movement.

Frame rates are not a reliable cross-run speedup estimate here: the machine and
Chrome were shared with active parallel tasks, and repeated Photo runs varied
substantially. In particular Fast was slower in the lake sample despite reduced
submitted work. These measured outcomes are reported without a blanket speedup
claim. The comparison tests steady state; frozen daylight excludes recurring
20-second PMREM refresh spikes. Normal diagnostics separately expose PMREM CPU
generation duration. Texture counts remain resident across toggles; extra cached
program variants are expected after first visiting shadow/texture combinations.

These performance rows precede the separate cabin-grounding geometry pass.

## Runtime validation

133 unit/integration tests passed. Chrome verified async texture-off loading and
six off/on cycles with zero map-reference mismatches; texture/program counts
stabilized at 23/114 in that fixture. Settings focus cleared held input and
ignored driving shortcuts. An actual 900×700 viewport resize retained Fast's
pixel cap, then the normal viewport was restored. Matched Photo on/off images
were captured. No shader/context errors were reported. Mac mini swap usage was
0 and memory pressure reported 90% free at inspection; no GPU utilization was
inferred. Expanding quality controls temporarily hides the minimap to keep
the controls unobstructed.
