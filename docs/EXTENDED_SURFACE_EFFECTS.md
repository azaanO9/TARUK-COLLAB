# Surface properties across the streamed world

## Changes
- `game/trackWindow.ts`: fixed 8x8 page ownership, modular pixel addressing, invalidation, bounded clear queue and seam-safe patch splits.
- `marsTrackDeformation.ts`: player-following texture atlas, reused partial GPU uploads, skipped remote vehicles, update rate limits and disposal of mask/clear buffers.
- `marsTerrain.ts`: both soil shaders sample the rolling atlas; shared terrain tints; slope-aligned footprints; track resolution selected before scene warmup.
- `streamedMars.ts`: original/Performance rock material sharing, continuous terrain colouring, 12/32 instanced pebbles per tile with no new draw call.
- `SurvivalWorld.tsx` and world factories: follow player position, preserve tier fallbacks, suppress boot marks when seated, expose track texture size in debug DOM diagnostics.

## Bounded cost
| Budget | Low-end/mobile/Performance startup | Other startup |
| --- | --- | --- |
| Track atlas | 512x512 RGBA, 1 MiB raw CPU data and similar GPU storage | 1024x1024 RGBA, 4 MiB raw CPU data and similar GPU storage |
| Local coverage | 96x96 m | 192x192 m |
| Vehicle stamping cap | 20 Hz | 30 Hz |
| Stamp transfer | 48x48 RGBA, 9 KiB; split into at most 4 seam copies | Same |
| Maximum page clears per frame | 1 x 64x64, 16 KiB | 2 x 128x128, 128 KiB total |
| Validity mask | 8x8 RGBA, 256 bytes | Same |
| Decorative pebbles per terrain tile | 12 | 32 |

Initial allocation happens during world loading. Scrolling clears only recycled CPU pages and uploads a bounded number of GPU pages. No trail history grows with distance, no extra terrain render is used, and all materials/textures remain local. Switching to Performance later lowers update rates/clear counts without reallocating the atlas; its initial resolution is retained. High-tier shading is more expensive than Performance shading, so FPS still depends on hardware.

## Validation and limits
All 149 project tests pass. Added coverage includes retained tracks during scrolling, negative/large coordinates, recycled-page invalidation, wrapped patch limits, both buffer sizes, far tyre stamping, off-window rover skips, disposal, generated tints and shared material lifetime. Browser shader checks showed tyre trails at world X=500 m in both Performance 512 and High 1024 paths with no console errors. The test used a temporary local rendering harness with the actual terrain/track code; it is not an FPS benchmark or a claim of real-phone testing. Normal game loading and driving passed with no console errors; one desktop Auto sample showed 59 FPS while driving. This is an observational smoke test, not a performance guarantee.

Nearby marks persist; distant tracks deliberately disappear as pages recycle. Small rocks remain lighter and less dense outside spawn to retain the streaming budget. The astronaut and rovers retain existing collision/suspension behaviour; surface rut displacement remains a visual effect, as before. The shuttle/Curiosity are not duplicated across chunks. No weather, modes or mission mechanics are added.
