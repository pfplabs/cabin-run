# Surface and environment sources

Fetched 5 November 2026. These texture files are local and require no runtime network requests. Original texture bytes are unmodified. Runtime material tinting, tiling and shader blending are modifications in the rendered appearance.

## Blouberg Sunrise 2 HDR (archived, no longer loaded)

- File: `blouberg_sunrise_2_1k.hdr`
- Retained from an earlier revision. The running game now uses a procedural natural sky and sky-only environment reflections, not this photographed skyline.
- Work: **Blouberg Sunrise 2**, Poly Haven / formerly HDRI Haven.
- Original asset: https://polyhaven.com/a/blouberg_sunrise_2
- License: CC0, https://polyhaven.com/license
- Download mirror: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr

## Grass

- File: `grasslight-big.jpg`
- Download: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg
- Upstream attribution notice: https://github.com/mrdoob/three.js/blob/dev/examples/textures/terrain/readme.txt
- Upstream lists **Dark Grass** by **qubodup**, https://opengameart.org/content/dark-grass, and **Backgrounds for topdown games** by **davis123**, https://opengameart.org/content/backgrounds-topdown-games.
- Dark Grass credits: Copyright 2009 Blender Foundation (apricot.blender.org), Copyright 2009 Lamoot, Copyright 2010 qubodup. The original OpenGameArt page describes GIMP resynthesis and recolouring of its source grass texture.
- License explicitly stated by upstream: Creative Commons Attribution 3.0 Unported, https://creativecommons.org/licenses/by/3.0/
- Three.js resized these source textures for GPU-friendly dimensions. This application tiles and tints the texture, adds macro-scale colour variation, and blends in procedural stone on steep terrain. Upstream does not specify which listed work corresponds to each individual terrain image, so both works are credited here.

## Hardwood surface set and water normal map

- Files: `hardwood2_diffuse.jpg`, `hardwood2_bump.jpg`, `hardwood2_roughness.jpg`, `waternormals.jpg`
- Source repository: https://github.com/mrdoob/three.js/tree/dev/examples/textures
- Individual download base: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/
- Hardwood example: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_lights_physical.html
- Repository license: MIT, copyright Three.js authors, https://github.com/mrdoob/three.js/blob/dev/LICENSE ; full license retained at `vendor/THREE-LICENSE`.
- Audit limitation: these assets are distributed by the official Three.js repository, but no separate per-image author or license notice was found for these four files. Repository-level MIT provenance is recorded here; this is not an independent guarantee of the original photographs' chain of title. Verify original authorship before a commercial asset redistribution if required.

## Generated surfaces

Granite mineral variation and terrain macro shading are original procedural shaders in `game.js`, not downloaded images. Forest foliage remains the existing procedural implementation in `foliage.js`.

## Visual validation

This update improves the material and illumination pipeline, not the underlying reconstructed mesh fidelity. HDR alignment, glass readability, timber UV scale, exposure and frame rate must still be checked on a WebGL-capable device. No claim of photorealistic parity with the supplied reference is made.
