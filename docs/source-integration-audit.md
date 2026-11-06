# Source-to-feature audit — 2026-11-06

Served checkout: /Users/jarvis/Documents/Codex/2026-11-05/task-3/cabin-run.
Confirmed Python PID 3185 listening on 127.0.0.1:4183 with this cwd.
Audited every local branch in cabin checkouts task-2,3,5,6,8,9,11,13,16,19,23,24;
compared complete reachable histories using git cherry, not just latest subjects.
Older branch tips are ancestors of the inspected feature tips. Source checkouts
and their histories/evidence were not modified.

| Source | Target | Patch verification |
| --- | --- | --- |
| grass ffc4ec8 | 71a4477 | identical zero-context stable patch 6776c2ace2b363ca4f0d3d3c9e513e797aeb1d8a; all three added blobs identical |
| gravel 4528f66 | dd8073a | stable patch b5288225f847855dd0bdadf92d753ff897ddffcb identical |
| lake water f673689 | 9dbc5b0 | stable patch b9cd1d45213d3799eda134699847dca3ecb6a85b identical |
| grounding 53fca3b | 55d9a88 | stable patch eae7c27bbd43f6ba48802be44478a8097928c67b identical |
| vehicle fidelity 0938d41 | 079fed8 | identical zero-context patch 33b97a5a42aa3fee6784b4062d4afc79c63a3889; added blobs identical |
| body rebuild 4d7781d | 16e5ced | all five added source/test/doc blobs identical; game.js reconciled to register quality after replacement bodies |
| pickup 62e3e35 | d5c1408 | git cherry equivalent |
| tires afc2be4 | d1f3743 | git cherry equivalent |
| airframe ce31d09 | 3537fb1 | git cherry equivalent |
| image history 1c4341a | f645073 | git cherry equivalent |
| curved skin ac49ba5 | 40f9da8 | git cherry equivalent, including stage-four image |
| river 01234fd | 35a97e5 | git cherry equivalent |
| flight f46bffe | cbca800 | git cherry equivalent |
| cockpit 2d9fda1 | 9543b76 | added module/test/doc blobs identical; game/index merged preserving quality and benchmark reset; later pickup anchor fix 3c77c30 |
| US signs b2e14e9 | 25bf8f0 | git cherry equivalent; subsequent module URL refresh fixes stale cached preview |

Grass/fidelity default patch IDs differ only due to surrounding game.js context;
zero-context comparison confirms identical edits. Body/cockpit game.js changes
are intentional integration adaptations, not omitted source files. Earlier
terrain/glazing 04f85a8, flat cabin 8bf7e14 and ridge continuation 5e297c9 are
actual ancestors. Verification-only plane merges 62dc8d2/6c9cc0b are excluded
because their feature/source commits and archive are already incorporated.

MacBook e2b518181da6c5b3a4f1e0aea1d1cad3ff6bf5d6 is absent from the local object
database. Its last supplied report says unpushed. No MacBook access was attempted,
as instructed. Exact terrain/glazing contents of that unavailable commit cannot
be patch-audited or claimed integrated. The supplied standalone quality module
was independently implemented as 95b0990 with custom-shader map handling and
measured full-frame diagnostics, preserving the Mac mini terrain/glazing.

At the initial audit task-23 lake-exploration was uncommitted. It subsequently
completed as fabea7f and was integrated as 827670a, preserving berth and US signs.
No other completed local Cabin feature/history artifacts were found missing.

## Pier and sign verification

54b18af adds a shared berth (-30, 30), heading pi, for both active spawn and
parked display. Engine remains off, floats on water, nose toward open lake.
Tests check the complete visible airframe bounds clear the pier by >0.5 m,
water beneath the full envelope, short pushback, braking, idle, taxi and takeoff.
The prior approach/landing regression now explicitly begins at its old approach
location; departure from the new berth is separately tested.
158 combined tests pass. Chrome shows the plane clear of the pier and the new
US sign materials. Existing localhost module caching initially showed old signs;
versioned imports refresh changed modules instead of treating stale pixels as
proof. Evidence: task-3/evidence/plane-berth-clearance.jpg and integrated-us-signs.jpg.

## Exploration integration follow-up

Source fabea7f -> 827670a. All 162 combined tests pass, including outbound/return
driving for all three spurs, low-speed turning, tyre/terrain heights, finite
scenery and discovery persistence. The main import map versions all changed
shared modules consistently so existing Chrome tabs cannot mix old simulation
with new terrain, foliage or minimap modules. Source evidence remains in task-23.
Right-turn pockets are clockwise only; counterclockwise arrivals remain normal
left turns. Mobile performance and a complete manual loop remain unmeasured.

Chrome combined-build evidence: integrated-cove-junction.jpg shows the tapered lane and signs; integrated-cove-arrival.jpg shows a stopped vehicle at Cedar Cove and Lake stops 1 / 3. The live normal Cabin tab also shows vehicle, elapsed time, altitude/speed, mission panel and minimap; cabin-hud-current.jpg records the floatplane HUD. No missing Cabin HUD was reproduced.

## Final requested cabin turnoff

The main loop and cabin approach retain the identical asphalt material object. A 12 m paved mouth tapers smoothly to 4.5 m over 32 m with matched gravel shoulders, an opening in the road-edge stripe, and paved tyre classification. STOP post moves outside the widened pavement. Surface vertices follow tyre terrain height. Chrome rendered the combined turnoff with no captured errors and intact HUD. No new texture assets or shader effects added.

Final combined validation: 165 tests pass, game syntax and diff checks pass. Chrome QA reports build integrated-cabin-turnoff-2, ready true, both models available, Balanced quality; captured console error list was empty. Final widened-apron screenshot: task-3/evidence/cabin-turnoff-review.jpg. A complete manual drive of the entire loop, mobile performance, and new matched performance benchmarking were not performed. Close foliage still visibly uses crossed cards; the current scene is not fully photorealistic. MacBook e2b5181 remains unavailable and unverified as detailed above.
