# All-device Mars streaming

Every device generates terrain. Hardware hints choose workload only: low/unknown/mobile/Performance uses radius 2 (25 pooled tiles), eight instanced rocks per tile and 0.75 ms row-generation allowance; supported higher-end desktops use radius 3 (49 tiles), eighteen rocks and 2 ms. Performance switching lowers generation allowance to 0.7 ms. Completing a tile also computes normals and collision shapes; these operations can exceed the row budget and require real-device profiling.

70-metre chunks recycle shared materials and fixed mesh pools. Tile-local vertices reduce distant geometry precision loss. The former 32 km movement cap is removed. The original terrain is retained; generated rocks have collision discs and repeat deterministically on revisits. Collision entries recycle and are removed on disposal. Sky and stars follow the player. Existing track coverage and autonomous Curiosity remain local. Computer coordinates still have finite precision.

The daylight helper uses a continuous cosine curve over a two-minute noon-to-noon artistic cycle. There are no static day/night holds; sun direction also moves continuously. The renderer blends sky, fog, direct/ambient lighting, stars and headlights without React timer rerenders. Loading, landing and pause do not advance the cycle. No weather, missions or new modes are added.

Tests cover device budgets, uncapped movement, deterministic terrain and rocks, mesh/contact alignment, bounded collision recycling/disposal, and daylight continuity. Physical phone performance remains unverified.

Verification: 138 tests, TypeScript and both production builds pass. Browser exploration reached x=276 m, beyond the original ground boundary, with visible generated rocks and no console errors. At that point: Performance tier, 31 generated tiles, 43 draw calls, 646,290 triangles and 60.1 FPS on this test machine. This is not a phone performance guarantee. Those observations predate the two-minute daylight update.

## Rock collision correction
Removed the stale 92-metre collision cutoff from the original terrain. Rocks above 22 cm now block walking throughout that terrain; tiny gravel remains passable. Rock obstacles carry world-space top heights, allowing a jump that clears the top, landing on top, jumping again and falling off an edge. Tall rocks, vehicles and the shuttle still block insufficient jumps. Generated rocks use the same height-aware locomotion. More distant travel does not grow the tile pool; compared with the finite map, streaming adds bounded tile geometry, instanced rock draws and generation/collision CPU work. No controlled before/after FPS benchmark was performed for this correction.

## Minimap and rock refinement
The SVG north-up minimap uses existing 10 Hz View reports, with at most 48 rock markers refreshed at 2 Hz. No additional WebGL renderer, texture downloads or terrain render is needed. Geometry-derived convex rock outlines are tested against the rover rectangle with swept SAT, avoiding oversized circular rock gaps. Only nearby rocks enter the precise rover solver. Both original and streamed rocks use the same 55 cm climbing threshold and elliptical wheel-support approximation; higher boulders remain solid. This is arcade vehicle contact, not a full mesh rigid-body simulation. Walker jump support is retained.
