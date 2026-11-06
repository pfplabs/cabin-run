# Gravel depth pass

Isolated from vehicle and grass changes on `feat/gravel-depth`, based on `7c7b248`.
Integration touches only the material factory in road-surfaces.js; game.js,
engine.js, forest modules and vehicle assets are unchanged. Both existing callers
(shoulders and parking apron) automatically use the new material.

Original procedural crushed stone maps: sRGB color, linear tangent normal and
linear roughness. Two-metre UV tile matches existing road/apron UVs. Mipmapped,
4x anisotropy, normal relief fades between 12 and 45 metres. Optional `detail`
scales close normal strength. No displacement, geometry, draw calls, collision
changes or per-frame allocations. Maps are cached and shared; do not dispose
textures when disposing an individual material.

Validation on Mac mini, 2026-11-06:
- All 121 Node tests passed, including populated texels, normalized normals,
  roughness range and texture reuse.
- Headless installed Chrome rendered before/after under identical illumination
  and loaded gameplay. No JavaScript or shader errors; one favicon 404.
- Visual inspection: stronger chipped caps and dark joints; parking and shoulders
  render in gameplay. This is a procedural realism improvement, not photogrammetry.
- Two-triangle material preview: one draw call for either material; zero added
  triangles in game. Three 512px RGBA maps total 4 MiB including mipmaps, shared
  across callers (old maps were recreated for each caller).
- One-time map generation about 60.4 ms versus old 10.9 ms per call. Brief warmed
  120-render CPU submission probe: 1.7 ms new / 3.2 ms old; not a GPU timing or
  stable frame-rate benchmark. Full combined-scene performance remains to be
  checked after vehicle and grass integration.

Screenshots and raw results are outside Git in the task-8/evidence directory:
`gravel-comparison.png`, `gravel-gameplay.png`, `browser-results.json`, `tests.txt`.
Other tasks' working trees and branches were not modified. Apply this commit to
its shared base alongside vehicle/grass commits; rerun combined-scene QA there.
