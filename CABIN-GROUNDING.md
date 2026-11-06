# Cabin grounding and arrival pass

Isolated branch `feat/cabin-grounding`, based on combined cabin `38a7856`.

New `cabin-grounding.js` adds an arrival landscape around the existing level
building: narrow granite drainage margins along its side/rear plinth, low
veranda skirting and support footings, staggered stone paving from the parking
pedestrian verge to the existing entrance steps, low bay-end timber restraints,
set-back perimeter edging, and restrained shrub clumps.

The usable three bay rectangles and paved access aisle remain clear. The path
follows the actual height field within 8 cm; all approach/road/cabin terrain and
vehicle collision rules are unchanged. New materials use ordinary standard
surface slots, so the renderer surface-texture registry can capture the shared
gravel maps. No signs, alpha maps, new lights, or downloaded textures are added.

Four merged material batches, 5,948 additional triangles. Small timbers and
shrubs cast shadows; drainage and paving receive shadows without adding their
own shadow casters. Detailed geometry is confined to the cabin arrival area.

Validation: all 130 tests pass, including new actual-geometry raycasts for the
complete parking aisle, every usable bay and the entrance path, finite geometry
and a bounded triangle/draw-call budget. Module syntax and git diff checks pass.
Browser verification intentionally deferred to the parent integrator to avoid
competing with controlled renderer benchmarks. This pass has not been visually
approved or independently FPS-benchmarked. Original user reference attachments
were not available; the existing building/parking coordinates were preserved.

Integration: import `createCabinGrounding` and add its returned group alongside
forest/road signs, passing the same `landHeight` callback. The game.js diff is
only this import and scene.add addition; retain all quality-controller work.

## Integrated verification

Integrated as 55d9a88 after renderer controls 95b0990. All 136 combined tests
pass. Chrome at :4183 rendered the foundation drainage, continuous parking-to-
entry paving, bay restraints and planting; matched texture on/off captures were
saved with the fixed cabin camera. The combined runtime map audit had no
mismatches and the material registry includes all four new batches (83 total).
The quality panel remains unobstructed when expanded. Jeep start, vehicle
switching and floatplane engine startup were exercised in the normal preview.
No console shader/context errors were observed. The new geometry was not included
in the earlier renderer benchmark table; no combined FPS speedup is claimed.
