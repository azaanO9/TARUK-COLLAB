# Minimap, daylight and rover contact update

- Bottom-right, collapsible north-up 2D minimap: player heading, landing site, crew rover, Curiosity, and up to 48 nearby rock markers. Eighty-metre radius; distant destination icons stay on the edge. Small touch layouts put the map on the left above the steering/joystick area. No second WebGL render, downloaded assets or new animation loop.
- Two-minute complete noon-to-noon cycle. Continuous cosine light interpolation and moving sun remove long stationary day/night intervals. Existing sky, haze, light colours, stars and lamps blend from this value. Paused exploration and loading do not advance it. This is compressed game time, not a scientific Mars sol duration.
- Geometry-derived convex rock outlines replace the circular approximation for rover contact. Swept SAT preserves fast-movement collision and sliding; a nearby-object filter bounds the precise tests. Rover body still uses its existing rectangular footprint, so this is not triangle-level rigid-body contact.
- Both original terrain and streamed terrain use the same 55 cm small-rock climbing limit. Small rocks lift the wheels with a smooth support approximation; tall boulders block. Original walker jumping remains intact.

## Infinite map versus earlier 4x map

| Cost | Fixed 4x map | Streamed map |
| --- | --- | --- |
| Reach | 352 m walking region | No fixed movement boundary |
| Ground work while travelling | Already built | New 70 m tiles filled incrementally |
| Additional tile pool | None | 25 on low/unknown/mobile hardware; 49 on supported higher-end desktops |
| Extra rendered geometry | None from streaming | Up to 245,000 / 480,200 tile triangles before view culling, plus instanced rocks |
| Memory with travel distance | Fixed | Bounded recycled pool; starting terrain retained |

These are code budgets, not a measured FPS percentage. Rendering depends on view, quality, device and nearby geometry; the infinite version has greater CPU/GPU work and memory cost. Existing adaptive graphics and smaller low-device streaming budgets remain. Rock outlines are generated at construction/recycling, not every physics tick. The minimap is a capped SVG overlay using existing state reports.

## Verification

145 tests cover daylight continuity/period, minimap projection/edge markers, precise narrow-rock stopping, rotated sweeps, small-rock traversal, distant boulder blocking and generated wheel support. TypeScript and both builds are required before publication. Browser checks observed map tracking/collapse, vehicle driving and sunset/night/sunrise transitions without console errors. The 844 x 390 touch-driving layout was checked and the map moved clear of the view and driving controls. Real low-end phones and arbitrary rock angles still benefit from hands-on testing; no universal FPS claim is made.
