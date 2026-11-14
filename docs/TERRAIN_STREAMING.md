# All-device Mars streaming

Every device generates terrain. Hardware hints choose workload only: low/unknown/mobile/Performance uses radius 2 (25 pooled tiles), eight instanced rocks per tile and 0.75 ms row-generation allowance; supported higher-end desktops use radius 3 (49 tiles), eighteen rocks and 2 ms. Performance switching lowers generation allowance to 0.7 ms. Completing a tile also computes normals and collision shapes; these operations can exceed the row budget and require real-device profiling.

70-metre chunks recycle shared materials and fixed mesh pools. Tile-local vertices reduce distant geometry precision loss. The former 32 km movement cap is removed. The original terrain is retained; generated rocks have collision discs and repeat deterministically on revisits. Collision entries recycle and are removed on disposal. Sky and stars follow the player. Existing track coverage and autonomous Curiosity remain local. Computer coordinates still have finite precision.

The daylight helper uses continuous smoothstep interpolation over a five-minute artistic cycle: day 90s, sunset 60s, night 90s, sunrise 60s. The renderer blends sky, fog, direct/ambient lighting, stars and headlights without React timer rerenders. Loading, landing and pause do not advance the cycle. No weather, missions or new modes are added.

Tests cover device budgets, uncapped movement, deterministic terrain and rocks, mesh/contact alignment, bounded collision recycling/disposal, and daylight continuity. Physical phone performance remains unverified.

Verification: 138 tests, TypeScript and both production builds pass. Browser exploration reached x=276 m, beyond the original ground boundary, with visible generated rocks and no console errors. At that point: Performance tier, 31 generated tiles, 43 draw calls, 646,290 triangles and 60.1 FPS on this test machine. This is not a phone performance guarantee. A full five-minute cycle was covered by continuity tests rather than a complete visual browser recording.
