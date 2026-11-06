# Vehicle refinement handoff

Preview: http://127.0.0.1:4185/?qa=1

Based on scene commit 04f85a8. Isolated branch: feat/vehicle-fidelity.

- Replaces ellipsoid pontoons with hard-chine hulls, raised bows, a planing step, deck seams and cleats.
- Replaces solid spare cylinder with a treaded rounded tire and six-spoke alloy wheel matching the road wheels.
- Adds restrained Jeep door shut lines and physically coated, low-metalness vehicle paint.
- All model changes live in vehicle-fidelity.js. game.js has only an import and one call after applyHeroMaterials. No changes to hero-materials.js, environment.js, engine.js, scene builder, or binary assets.
- Five added material batches; 3,140 added triangles minus 1,212 removed = 1,928 net triangles. No texture loads or lights added. No extra LOD system for this modest geometry cost.
- 120 tests pass. The new test reads the actual GLB and checks removal counts, pivot preservation, source geometry retention, finite attributes, bounds, outward deck normals, geometry budget, and idempotence. Existing GLB inspection passes (60 source meshes / 143,234 source triangles).
- Chrome gameplay verified for Jeep and plane, including orbit view. No console errors. Existing PCFSoftShadowMap deprecation warning remains. FPS has not been benchmarked.
- Screenshots: ../evidence/jeep-spare.jpg and ../evidence/floatplane-hulls.jpg.

Integration: cherry-pick the isolated vehicle commit into the cabin task after its scene changes. No shared checkout edits or remote push were made. Source geometry signature matching prevents overlaying replacement hulls on a future unmatched asset.

Limitations: original user reference attachments were unavailable in the checkout. This is a concrete geometry/material improvement, not photorealistic equivalence. The browser refinements are procedural and are not baked back into the Blender source/GLB. Scene integration is intentionally left to the cabin task to avoid concurrent branch writes.
