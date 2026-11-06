# Pickup reference stage — 2026-11-06

**Development checkpoint, not final and not user-approved as finished.** No article or trailer publication.

Model review (opened in Chrome): http://127.0.0.1:4185/vehicle-preview.html
Gameplay: http://127.0.0.1:4185/?qa=1&stage=pickup-reference

## Direction and references inspected

The user's later Tacoma clarification supersedes the Jeep and Tundra interpretations. The result remains unbranded and uses the legacy JeepRoot/applyJeepBody API so controls continue working.

- libfile_707fec01fc788191aae8b3a608e5022a — original photoreal cabin/vehicle target.
- libfile_65f506958e9c819198fff467c066ff23 — original source scene rendering.
- libfile_de52461122d481919fac71952b548bf4 — Tacoma rear-quarter photo, black tubular sport bar, grab handles, bed-rail feet and diagonal rear stays.
- libfile_31df47b8c8d88191b43fb7c3c5954b7f — front accessory photo, angular black guard and two large round auxiliary lamps.
- The pit-lane image was not used.

The actual image files remain in ../references with Library version xattrs. They were inspected visually, not inferred only from captions.

## This checkpoint

- Removes SUV rear enclosure and tail-mounted spare. Adds open ribbed bed, wheel tubs, tailgate, tiedowns and cab bulkhead.
- Reworks proportions into a longer pickup, with extended-cab quarter panes and raked windshield. Modern wide grille, combination headlamp assemblies and rounded painted fender shoulders replace the original seven-slot Jeep grille/round lamps.
- Adds heavy black sport-bar hoop, rear stays, grab handles and mounting feet, two front auxiliary lamps and four requested roof lamps.
- Continuous crowned hood, physical dark enamel/clearcoat, localized lower-panel road film, darker wheel alloys, moulded tire sidewall rings, axles and suspension detail.
- Corrects lost curved shading and inverted fender winding found during visual review.
- 34,536 body triangles in 8 material batches, plus 4 wheel-band batches / 4,800 triangles. Existing wheel node identities/rotation axes are retained, with longitudinal positions moved to the new fenders.
- No plane files, scene binary, article or trailer edits in this checkpoint.

## Validation and limits

129 tests passed, including clear window sightlines, an open bed ray test, preserved control nodes, finite geometry and bounded dimensions. Chrome loaded both studio and full cabin gameplay with no console errors; forward movement, reverse input and camera orbit were exercised. Existing shadow-map deprecation warning remains. The isolated studio showed approximately 100 FPS after loading; that is not a full-scene performance benchmark.

The result is still a stylized procedural interpretation. Cab/door/roof surfacing is noticeably simpler and more angular than the reference; the Tacoma identity is not yet exact, and the materials are not photographic. This stage should not be described as a finished photorealistic truck. Existing handling/collision constants remain unchanged; the longer visual wheelbase/body should receive full tunnel/parking clearance playtesting during integration. UI labels still use the prior Jeep naming.

## Preserved slideshow stages

- Initial spare/hull refinement: ../evidence/jeep-spare.jpg and floatplane-hulls.jpg; commit 0938d41.
- Intermediate enclosed-body rebuild: ../evidence/jeep-body-rebuild.jpg and plane-body-rebuild.jpg; commit 4d7781d.
- Current reference-led pickup: evidence/2026-11-06-pickup-reference-stage/01-front-studio.jpg, 02-cargo-bed-studio.jpg, 03-side-profile.jpg, 04-gameplay.jpg.

The current images and all four earlier captures are committed with this checkpoint. Earlier captures are also copied into evidence/2026-11-06-earlier-vehicle-stages/. Preserve their stage labels in the eventual slideshow; none are final.
