# Flight physics and startup exhaust

Base: 53c993e. Isolated checkout: task-16/cabin-run, branch feat/flight-physics-startup.

New flight-dynamics.js replaces target-speed/pitch-to-climb shortcuts with RPM-driven thrust, water resistance and planing hump, aerodynamic drag, gravity/flight-path energy exchange, angle-of-attack lift and stall falloff. A/D banks before coordinated yaw; controls self-center. Engine-off flight descends rather than hovering. Existing terrain/boundary assistance remains. Flight integrates at 120 Hz within each accepted frame, matching 20/30/60/120 FPS; the existing 50 ms frame cap remains (long stalls intentionally slow simulation).

Space starts the engine, Shift/Control adjusts retained throttle, W/S controls pitch, A/D turns, B assists water-only pushback. Control retains strong water braking as an accessibility aid. Rotation takes a longer run; the regression now allows eight rather than six seconds. Boundary grace increases from 8 to 18 seconds to accommodate wider banked turns. The speed cap remains 27 m/s.

EngineExhaust uses a fixed 96-particle pool, emits blue-grey puffs during cranking, briefly trails off after ignition, freezes on pause, resets on switch/mooring and disposes on pagehide. Outlet defaults to PlaneRoot local (.64,.97,-2.85), below the right cowling; it is configurable through the constructor. Positions are transformed through PlaneRoot.matrixWorld; no airframe files or source assets changed. Compatible with the replacement model's cowling at z -3.8 to -2.56.

Integration: cherry-pick this commit. engine.js imports/delegates to flight-dynamics.js and uses flight substeps; game.js adds only the exhaust import, instance, update and disposal. Keep the plane-model agent's own game.js hooks if resolving any merge conflict. No competing airframe, materials, waterfall or renderer edits.

Validation: full npm test 142/142 passed; the six focused physics/exhaust tests passed again after final smoke placement/color tuning. Existing full engine-start/taxi/takeoff/corridor-touchdown/dock scenario passes. New tests cover stall sink, engine-off glide, RPM thrust lag, bank/yaw sequencing, frame-rate equivalence, bounded smoke, engine location, fade, pause and reset. Browser isolated aircraft preview showed visible smoke beneath the cowling with zero console errors. Evidence: ../evidence/startup-exhaust.png. Temporary :4196 server and hidden preview were closed; shared :4183 was untouched.

Limits: deliberately assisted game physics, not an aircraft-specific six-degree-of-freedom model. No wind, sideslip, independent rudder, crash damage or physically simulated float buoyancy. Terrain clearance still assists climb and clamps contact; water braking and B pushback remain player aids. A hard water touchdown currently produces the existing spray/contact event without damage. Full combined-world manual flight and new airframe smoke occlusion remain integrator QA.
