# Pickup tire stage — 2026-11-06

Intermediate visual stage following pickup reference commit 62e3e35. Not a final photorealistic vehicle.

Replaced the four animated wheel meshes with shared geometry: shaped sidewalls and flatter crown, staggered split tread blocks, low-gloss nonmetallic rubber, recessed graphite alloy spokes, machined rim lips, six lugs and recessed brake rotors. Radius remains 0.588 to match gameplay rolling scale; width is 0.35. Existing wheel root names and animation axes remain intact.

Near wheels: 47,424 triangles and 12 draws total. Beyond 28 metres: 6,784 triangles and 8 draws, with LOD hysteresis. The retired wheels had 33,568 triangles: this spends more geometry close up and much less at distance. Shared geometry avoids four separate buffers. No additional textures or lights.

Validation: npm test passes 130/130; git diff --check clean. Tests cover finite geometry, radius/width, shared buffers, upper fender crown clearance at sampled steering/roll angles, near/far LOD and idempotence. Crown rays are not an exhaustive swept-volume collision test. Chrome studio preview exercised animated rolling and steering; no browser warning/error logs. Observed approximately 82–85 FPS during close-up inspection, not a full-scene benchmark. Combined cabin driving/clearance QA remains necessary.

Evidence: evidence/2026-11-06-tire-rebuild-stage/01-steered-tire-detail.jpg and 02-front-studio.jpg. Earlier evidence remains intact. Preview: http://127.0.0.1:4185/vehicle-preview.html?stage=tires . Tire detail and Roll / steering test buttons support inspection.

Remaining visual gap: the truck body is still angular and differs substantially from the Tacoma reference; this tire stage does not establish photorealism. Tread edges remain procedural, sidewall lettering and subtle wear are absent, and loaded contact-patch deformation is not simulated. No article or trailer published.

Integration: cherry-pick this commit after 62e3e35. Changes are confined to pickup-wheels.js, jeep-body.js integration, their tests, preview controls, this note and evidence. No edits to the shared task-3 checkout or its :4183 server.
