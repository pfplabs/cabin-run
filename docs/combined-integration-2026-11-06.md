# Combined Cabin integration, 2026-11-06

Base 53c993e retains quality controls, cabin grounding, terrain, grass, gravel,
lake water and the earlier vehicle fidelity pass. No main-branch publication.

| Completed source | Integrated commit |
| --- | --- |
| Vehicle open bodies 4d7781d | 16e5ced |
| Pickup body 62e3e35 | d5c1408 |
| Airframe ce31d09 | 3537fb1 |
| Visual archive 1c4341a | f645073 |
| Curved seaplane skin ac49ba5 | 40f9da8 |
| River/cascade 01234fd | 35a97e5 |
| Pickup tires afc2be4 | d1f3743 |
| Flight/startup exhaust f46bffe | cbca800 |

The vehicle game.js conflict was resolved by registering refined materials only
after both replacement bodies are applied. Verification-only seaplane merges
62dc8d2 and 6c9cc0b were excluded; all relevant source commits were taken directly.
Other workers' uncommitted files were preserved. No additional server was started.

149 combined tests pass, covering parking departure, terrain/bridge clearance,
tire crown sampling and LOD, glass openings, startup, bank/lift/stall/glide,
20–120 FPS integration consistency and the existing takeoff-to-dock route.
Syntax and diff checks pass. Browser checks used the existing :4183 world.
Repeated texture off/on and pre-load off have zero restoration mismatches;
textures/programs settle at 23/139 in the runtime fixture. Input focus remains
safe, and all 109 registered materials include new body/wheel materials.

Visual checks show pickup and tires in the actual parking bays, replacement
seaplane on the lake and the new cascade in its full landscape. No console
shader errors were reported. QA now includes a fixed waterfall camera and
synchronizes the HUD when changing inspection views.

Limitations: visual work remains an intermediate procedural representation;
the waterfall is partly screened by existing forest from its side view. Tire
clearance samples are not exhaustive swept-volume tests. Earlier renderer FPS
comparisons predate the new models and cannot establish this build's speedup.

Combined runtime flight: startup exhaust froze for inspection at about 2.2 s,
with 33 live particles emerging beneath the right cowling. Startup completed,
then the live world takeoff sequence reached y=40.47 m, speed=26.57 m/s,
engine=2600 RPM, airborne, inside boundary, with no events or console errors.
The takeoff used a local QA button to apply the normal control inputs; this was
not a manually piloted full route. Full manual landing remains outstanding;
the automated landing regression passed. Screenshots are retained in the task
workspace evidence directory (integrated-pickup, integrated-plane,
integrated-waterfall, integrated-startup-smoke, integrated-takeoff).
