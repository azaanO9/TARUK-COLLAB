# Asset credits and replacements

- November graphics update: `ui/world/marsTerrain.ts` and `ui/world/marsDetails.ts` contain original procedural terrain, textures, escarpments, footprints, astronaut and hardware details. No external texture/model licence is required for those original assets. The active Mars astronaut is now the original animated procedural model; the credited NASA model remains in the archive but is not loaded by the Mars scene. The generated horizon image is retained but replaced in the playable scene by original geometry and a shader sky.
- Environment reflections use Three.js `RoomEnvironment`; post-processing uses the bundled Three.js passes, under the existing Three.js MIT licence. These are rendering utilities, not NASA assets.

- `public/models/nasa-astronaut.glb`: Astronaut, DigitalSpace Corporation, downloaded from [NASA 3D Resources](https://science.nasa.gov/3d-resources/astronaut/). NASA states its 3D resources are free to download and use, subject to [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA does not endorse this project. No claim is made that this historical model represents a Mars suit.
- Mars terrain, habitat, rover and equipment currently reuse original procedural prototype geometry; these are temporary replaceable assets. Search NASA 3D Resources for “Mars habitat”, “Mars rover”, and Poly Haven for “rocky terrain” with suitable licenses. No unverified license is claimed.
- `public/art/mars-horizon.png` and `public/art/mars-lander.png`: original generated artwork for this prototype; fictional illustration, not NASA imagery. The landing uses an animated 2D illustration; the playable outpost, Sage and drifting dust use real-time 3D.
- `ui/world/createSageCompanion.ts`: original procedural companion model created for this project.

- The team logo, generated landing illustration and horizon have resized WebP derivatives for delivery; the original PNGs remain in the repository. Mars exploration uses procedural geometry and does not load the NASA astronaut model.

- The atmosphere, changed terrain colors, and reduced-resolution terrain texture are generated procedurally in the browser. No additional model, photograph, texture download, external rendering service, or runtime asset was added for this pass.
