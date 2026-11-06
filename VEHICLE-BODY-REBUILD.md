# Vehicle body rebuild — 2026-11-06

Preview opened in Chrome: http://127.0.0.1:4185/?qa=1

This branch incorporates the combined cabin scene through 38a7856, then adds isolated body modules. The new body commit can be cherry-picked into the cabin branch; the intermediate merge need not be copied. game.js changes are two imports and two calls after applyVehicleFidelity.

## Changes

Jeep: replaces primitive body batches with actual wheel-well cutouts, bevelled sheet metal, raked windshield, six separate flat panes, seven open grille slots with radiator backing, round lamp housings, markers, tail lamps, door hardware, mirrors, dashboard, seats, steering wheel and a low-profile rack. Existing wheel transforms/animation and matching spare are preserved. 13,552 replacement triangles retire 8,732 body triangles; 8 new material batches replace 8 old body/detail batches.

Plane: replaces the solid fuselage under the bubble windshield with an open U-section cabin and six flat panes; rebuilds nose/tail loft, recessed radial-engine cowling, panel rings, interior, door hardware and flush livery. Fixed wing geometry and all animated control surfaces/pivots are preserved. 9,200 added triangles; 2,324 removed plus hidden original glass/upholstery/stripe geometry; 6 new batches. Previously rebuilt stepped floats remain.

Both sets of new vehicle glass use blended panes without transmission framebuffers. No new light or texture resources. No gameplay/physics changes or scene GLB/Blender overwrites.

## Verification

- 129 tests passed, including new real-GLB body tests for open window sightlines, finite geometry, preserved wheel/control pivots, fixed wings and bounded geometry counts.
- Both vehicles inspected in Chrome from front and side views; screenshots at ../evidence/jeep-body-rebuild.jpg and ../evidence/plane-body-rebuild.jpg.
- No browser console errors. Existing PCFSoftShadowMap deprecation warning remains.
- Combined-scene FPS was not benchmarked in this pass; do not claim a performance improvement from the glass change without measurement.

## Honest remaining gap

These are substantially rebuilt procedural game models, not photorealistic assets. Original reference renderings were unavailable in the checkout and message attachment searches did not locate them. Exact model identity/proportions and reference fidelity are unverified. Body surfacing, glass reflections, material variation/weathering, convincing tire sidewalls, cockpit finish, and overall scene lighting still need work. The plane's wing/control geometry was preserved rather than rebuilt. The procedural replacements are not baked into editable Blender source. Further reference-led modelling should use the original renderings rather than treating this generic interpretation as final.

No remote push or shared checkout edit was made. Parent/cabin integration should cherry-pick the new body commit after inspecting the preview.
