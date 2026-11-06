# Lake water pass

Isolated branch `feat/lake-water-shoreline`, based on `7c7b248`.

`lake-water.js` owns shading and reflection quality. `game.js` replaces the inline Water construction with its factory. No changes to terrain geometry, shared shoreline, engine, wake, vehicles, gravel, foliage or daylight. Integrator: retain other workers' game.js imports and changes; replace only the old Water import/inline construction. Do not copy the entire file over another checkout.

Muted green-blue deep water, analytical shallow-bed attenuation, calmer shoreline normals, filtered distant ripples, restrained sun glints and uncapped grazing-angle Fresnel reflections. This is an inexpensive depth approximation, not screen-space refraction or actual underwater geometry sampling. Existing floatplane wake and daylight updates remain connected. Low quality uses 512-square reflections; high uses 1024-square, matching prior budgets.

Validation: 121 tests passed; shader compiled in Chrome/WebGL2 without JavaScript or shader errors. Matched headless Chrome 1440x900 cabin view, stationary floatplane, 4 seconds warmup, 240 animation frames each: baseline 40.31 FPS, new 39.65 FPS; p95 33.4 ms for both. Both render 358 calls and 2,117,217 triangles. This short run on a concurrently used Mac is indicative, not a statistically significant regression assessment. No additional draws, textures or reflection passes.

Preview: http://127.0.0.1:4199/?qa=1 while server remains running.
Evidence is in sibling ../artifacts/: water-before.png, water-after.png, water-intro.png, water-performance.json. No integration into other workers' checkouts has been performed. Terrain shader wetness already exists and was left intact to avoid conflicts with the grass/material pass.
