# Seaplane airframe integration

Branch: feat/seaplane-airframe. Base: 4d7781d (vehicle worker's completed Jeep and plane body rebuild).
Isolated clone: /Users/jarvis/Documents/Codex/2026-11-05/task-11/cabin-run
Preview: http://127.0.0.1:4191/?qa=1

## Changes

- Replaces the rectangular green wingtip blocks and the underlying fixed tip skin with closed cambered, tapered rounded caps.
- Adds flattened lift-strut fairings, navigation lenses, float inspection hatches, mounting shoes, mooring eyes, cowling cooling gills and fasteners.
- Retains the prior worker's rebuilt fuselage, open glazed cockpit, interior and stepped float hulls.
- One new plane-only module; two-line hook in plane-body.js. No game.js, Jeep, engine, binary GLB or shared checkout changes.
- 6,912 added triangles, 432 retired = 6,480 net triangles; six added material batches, no textures, lights or transmission passes.

## Verification

129 existing tests pass; the additional airframe test passes separately (130 tests total).
The tests preserve all moving mesh geometry and parent references, verify source fixed wings outside the new tips, open glazing, finite geometry, symmetric bounds, idempotence and bounded geometry cost.
Chrome gameplay preview inspected from rear and front quarter angles. No console errors; pre-existing PCFSoftShadowMap deprecation warning remains.
Screenshots: ../evidence/seaplane-rear-quarter.png and ../evidence/seaplane-front-quarter.png.

## Integration and limitations

Cherry-pick this branch's commit AFTER 4d7781d into the integrating cabin branch. This is an incremental airframe pass, not a replacement for 4d7781d. The clone was taken from the idle vehicle worker's clean completed commit, keeping changes separate from its Jeep files. No direct cross-thread coordination message was sent; ownership follows the parent delegation and observed completed worker state.

Main and other task checkouts are untouched. Physics, collision envelopes, control nodes and animation meshes are unchanged. No remote push.

Original reference images were unavailable; exact reference fidelity is unverified. The current result still reads as a game model: no authored weathering/normal textures, simplified tail profile, procedural small details, existing straight propeller geometry. FPS has not been benchmarked, and these runtime enhancements are not baked into Blender/GLB.
