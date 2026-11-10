# Current Mars asset provenance

- `public/art/mars-surface/sandy-gravel-*`: [Sandy Gravel 02](https://polyhaven.com/a/sandy_gravel_02), Dario Barresi / Poly Haven.
- `public/art/mars-surface/dry-rocky-soil-*`: [Dry Ground Rocks](https://polyhaven.com/a/dry_ground_rocks), Rob Tuytel / Poly Haven.
- `public/art/mars-surface/fractured-rock-*`: [Dark Rock](https://polyhaven.com/a/dark_rock), Amal Kumar / Poly Haven.
- All three materials are [CC0](https://polyhaven.com/license). The source 2K diffuse, displacement and roughness JPEGs were downloaded from the asset's official Poly Haven API links and their MD5 hashes verified. `public/art/mars-surface/sources.json` records those links/hashes. Adaptations: 2K WebP colour, 1K lossless PNG with height in R and roughness in G; runtime warm dust grading, stochastic rotation/offset/scale blending, regional sand/gravel transitions and cliff triplanar mapping. `scripts/prepare-mars-surfaces.mjs` rebuilds the derivatives from the downloaded source maps. These six images total about 8.35 MiB, served locally with the game; no external texture service is needed during play. GPU mipmaps and anisotropic filtering reduce distant shimmer. Texture microrelief does not alter physical terrain or collisions.
- Research/reference: [NASA Mars resources](https://science.nasa.gov/solar-system/resources/resource-packages/mars-resources/), [NASA 3D resources](https://science.nasa.gov/3d-resources/), and Curiosity's [Rocknest view](https://science.nasa.gov/resource/rocknest-from-sol-52-location/). Rocknest shows windblown sand/dust beside darker rocks; NASA identifies its image as white-balanced for Earth-like lighting. It guided material contrast, not a calibrated Mars colour match. The scans above are Earth materials, not NASA scans, and this fictional outpost is not a reconstruction of a surveyed Mars location. NASA does not endorse this project.

## Retained reference assets (not loaded by the current surface)

- `public/art/mars-one-ground-atlas.jpg`: ground texture (image 5) extracted from the user-supplied **"Mars One" Mission - Base** GLB by [admone](https://sketchfab.com/admone), [source model](https://sketchfab.com/3d-models/mars-one-mission-base-83ced347037f47aba8473147d65df074), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as recorded in the GLB's asset metadata. Previously sampled onto rocks; replaced by the CC0 scans above. No reference buildings, white modules, or other model geometry are imported. The inclined solar tables and cell texture in `createMarsSolarArray.ts` are newly authored geometry inspired by the reference's long dark arrays.

- `ui/world/createMarsColony.ts`, `colonyMaterials.ts`, `terrainNoise.ts`, `marsTerrain.ts`, `marsDetails.ts` and `createSageCompanion.ts`: original procedural geometry, materials, characters and effects. Rounded bevels use Three.js `RoundedBoxGeometry` under the existing Three.js MIT license.
- `public/art/mars-regolith-original.webp`: original AI-generated regolith surface, made with the built-in image-generation tool for this project. Compressed to 768×768, 121,404 bytes. It is a surface texture, not a scene backdrop.
- `public/art/mars-ivory-panel-original.webp`: original AI-generated painted-metal surface, made with the same tool. Compressed to 512×512, 2,744 bytes.
- Reference image supplied by the user: visual direction only, never overlaid onto the game. The active photographed terrain scans are listed above.

Generation prompts: the regolith prompt requested a seamless orthographic, evenly lit rusty ochre Mars sand albedo with fine basalt grit and subtle wind ripples, no scene, text, shadows or perspective. The hardware prompt requested an orthographic ivory powder-coated aerospace panel with fine grain, subtle wear, ochre dust at the lower edge, fine seams and small fasteners, no scene, labels or perspective. Both used the built-in image tool; no API key or fallback CLI was used.

---

## Earlier retained asset notes

# Asset credits and replacements

- November graphics update: `ui/world/marsTerrain.ts` and `ui/world/marsDetails.ts` contain original procedural terrain, textures, escarpments, footprints, astronaut and hardware details. No external texture/model licence is required for those original assets. The active Mars astronaut is now the original animated procedural model; the credited NASA model remains in the archive but is not loaded by the Mars scene. The generated horizon image is retained but replaced in the playable scene by original geometry and a shader sky.
- Environment reflections use Three.js `RoomEnvironment`; post-processing uses the bundled Three.js passes, under the existing Three.js MIT licence. These are rendering utilities, not NASA assets.

- `public/models/space-exploration-vehicle.glb`: NASA Multi-Mission Space Exploration Vehicle (MMSEV), downloaded from [NASA 3D Resources](https://science.nasa.gov/3d-resources/space-exploration-vehicle/). NASA 3D resources are freely usable under [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Includes Draco mesh compression and WebP textures. NASA does not endorse this project.
- `public/models/astronaut.glb`: "Astronaut rigged and animated" by assetfactory, downloaded from [Sketchfab](https://sketchfab.com/3d-models/astronaut-rigged-and-animated-f45039084a674080b42f5e171fd4f04c), under Free Standard License. Driven in real-time by the procedural Mars low-gravity locomotion engine (`game/marsGait.ts`).
- `public/models/nasa-astronaut.glb`: Astronaut, DigitalSpace Corporation, downloaded from [NASA 3D Resources](https://science.nasa.gov/3d-resources/astronaut/). NASA states its 3D resources are free to download and use, subject to [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA does not endorse this project. No claim is made that this historical model represents a Mars suit.
- Mars terrain, habitat, rover and equipment currently reuse original procedural prototype geometry; these are temporary replaceable assets. Search NASA 3D Resources for “Mars habitat”, “Mars rover”, and Poly Haven for “rocky terrain” with suitable licenses. No unverified license is claimed.
- `public/art/mars-horizon.png` and `public/art/mars-lander.png`: original generated artwork for this prototype; fictional illustration, not NASA imagery. The landing uses an animated 2D illustration; the playable outpost, Sage and drifting dust use real-time 3D.
- `ui/world/createSageCompanion.ts`: original procedural companion model created for this project.

- The team logo, generated landing illustration and horizon have resized WebP derivatives for delivery; the original PNGs remain in the repository. Mars exploration uses procedural geometry and does not load the NASA astronaut model.

- The atmosphere, changed terrain colors, and reduced-resolution terrain texture are generated procedurally in the browser. No additional model, photograph, texture download, external rendering service, or runtime asset was added for this pass.
