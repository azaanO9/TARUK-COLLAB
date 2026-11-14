# Mars Trek region and shuttle exit — 14 November 2026

The requested Mars Trek extent is now the source of the explorable macro terrain. The user chose compressed travel with real landmark layout and clear scale labels. Both rovers, infinite ground streaming, controls, tracks and the two-minute lighting cycle remain. No missions, buildings, Sage, weather or accounts were added.

## Source and scale

NASA MGS/MOLA `MGS-M-MOLA-5-MEGDR-L3-V1.0`, `MEGT90N000EB.IMG`, product version 2.0, provides numerical elevations. The 33,177,600-byte signed big-endian source is downloaded only by the preparation script, into ignored `outputs/mola/`. Source hash, exact bounds and dimensions are checked in with the generated crop. Reproduce with `node scripts/prepare-mars-region.mjs` after dependency installation; it uses the existing Sharp dependency for the WebP overview.

The crop is 513 × 385, bilinear resampled, rounded to 16 real-metre height increments and delta encoded. World coordinates use an equirectangular projection centred on the supplied view. Horizontal compression is approximately 1:2,470 near that centre; elevation uses 1:240, giving about 10× relative relief exaggeration. Gazetteer feature centres keep their geographic layout. See [SOURCES.md](SOURCES.md), [ASSUMPTIONS.md](ASSUMPTIONS.md) and [asset credits](../ASSET_CREDITS.md).

This is a simplified regional exploration model, not a reconstruction accurate at individual-rock scale. Small channels are lost in downsampling. Close-up grains, rocks, colours and the graded landing site are artistic. Outside the crop, local terrain continues procedurally from clamped edge heights; no invented coordinates are presented as surveyed landmarks. The distant regional mesh covers the measured extent only.

## Changes by file

| Files | Change |
| --- | --- |
| `scripts/prepare-mars-region.mjs`, `content/marsMolaData.ts`, `public/art/mars-mola-overview.webp` | Reproducible, local elevation crop and original shaded-relief map; no NASA request during play. |
| `game/marsRegion.ts`, `game/marsExpeditionTerrain.ts` | Projection, elevation sampling, scale metadata, modest local roughness and only actual spawn grading. |
| `ui/world/marsTerrain.ts`, `streamedMars.ts`, `marsRegionalLandscape.ts` | Same sampled surface for rendered ground, rocks, walking and wheel contacts. One unshadowed far-LOD draw replaces the fictional backdrop. Fixed tile/rock pools stay bounded. |
| `content/marsLandmarks.ts` | Six sourced feature centres: Elysium Mons, Albor Tholus, Hecates Tholus, Gale, Hebrus Valles and Elysium Planitia. |
| `game/minimap.ts`, `ui/ExplorationMinimap.tsx`, `MarsAtlas.tsx`, `MarsFreeRoam.tsx`, `freeRoam.css` | Rectangular edge bearings, selectable landmark atlas, source/scale explanation, readable touch controls, modal focus/stacking. |
| `ui/world/roverCockpit.ts` | Retains teammate's dashboard map; registers it to MOLA, adds six numbered bearings, corrects the location label, caps canvas updates at 8 Hz. Atlas remains accessible from the header in cockpit view. |
| `game/shuttleLanding.ts`, `ui/world/createShuttleLanding.ts`, `createDropPodIntro.ts`, `ui/SurvivalWorld.tsx` | Real rear hull aperture, hinged hatch, steps, original TARUKH lettering, visible exit, gentle hop and camera handoff. Skip/reduced-motion settle at the same safe spawn. Reused animation samples/telemetry avoid new frame-by-frame garbage. |
| `tests/marsRegion.test.mjs`, `marsTerrain.test.mjs`, `minimap.test.mjs`, `shuttleLanding.test.mjs`, `roverCockpit.test.mjs` | Projection, source-height ranges, crop boundaries, physics/render seams, bounded streaming, rectangular bearings, egress timing/contact, dashboard pins and refresh cap. |
| `README.md`, `docs/INTERFACE.md`, `docs/SOURCES.md`, `docs/ASSUMPTIONS.md`, `ASSET_CREDITS.md` | Current behaviour, contracts, provenance and scientific limitations. |

Teammate changes through `32fcb9d` were merged: rectangular minimap, rover HUD layout, cockpit map and the cockpit-only hiding of the external map. Their controls/styling remain. Decorative repeating contours, a hard-coded Jezero label and fictitious battery percentage were adapted to the actual region and survey coverage.

## Budget and verification

Measured against the published `32fcb9d` bundle (14 JS assets): 364,297 bytes gzip before; approximately 560.5 KB gzip after. New WebP: 32,184 bytes. Added shipped JS + imagery is approximately **228.5 KB / 223.2 KiB**, under 250 KB. No new model download, post-processing pass, particle system or third-party runtime dependency. The new far mesh is 98,304 triangles, one draw, no shadow pass. Existing terrain pool sizes and resolution adaptation remain intact.

Active desktop preview observations at 1280 × 720 (not phone benchmarks or an isolated before/after comparison):

| View/tier | Frame time | Draw calls | Triangles | Textures | Scale |
| --- | --- | --- | --- | --- | --- |
| Arrival area, Performance | 16.9 ms | 64 | 1,058,668 | 41 | 1.00 |
| Arrival area, High | 16.6 ms | 321 | 3,323,939 | 59 | 1.00 |
| Driving cockpit, Performance, 844 × 390 viewport | 16.7 ms | 43 | 700,390 | 41 | 1.00 |

The background preview throttles to about 1 fps and intentionally paused menus to about 10 fps. Those samples were excluded. These snapshots are evidence that the tested desktop renders the update; they do not establish mid-range phone performance. Auto adapted to Performance in the throttled preview. Ultra has not been separately benchmarked for this update.

Validation: 158 tests, `tsc --noEmit`, Sites build and GitHub Pages build. Browser checks covered the visible exit/hop checkpoint, Skip, reduced motion, 844 × 390 Mobile selection, touch controls, map selection/Escape, walking, rover entry/driving and cockpit switching. Screenshots are in `docs/screenshots/`: `mola-shuttle-hop.jpg`, `mola-mobile.jpg` and the published `mola-atlas.png`.

Developer visual checkpoint: `?debug=1&landingPreview=16.95` freezes the hop after loading. The preview parameter is ignored without `debug=1`; Skip returns to normal play. It is not used in the shareable URL.

## Real-device checks remaining

- Android Chrome and iPhone Safari: cold load, sustained driving, thermal throttling and finger reach around the minimap.
- Long trips across several tile boundaries and to every landmark; check far/near terrain transitions on steep volcano slopes.
- All graphics tiers and WebGL/context-loss fallback on actual low-end hardware. These device claims were not inferred from desktop resizing.
