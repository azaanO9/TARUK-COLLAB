# Current reference rebuild

This section supersedes the historical pass below. The camera composition now follows the reference more closely, so the before/after views are not an identical-frustum GPU benchmark. Samples below use the initial view in the same desktop browser at 1280×720; FPS is a short settled sample after shader warm-up.

| Tier | Previous draw calls | Rebuilt draw calls | Previous triangles | Rebuilt triangles | Settled frame time |
|---|---:|---:|---:|---:|---:|
| Auto | 551 | 503 | 1,009,756 | 923,724 | about 16.7 ms |
| Performance | 203 | 198 | 492,176 | 456,554 | about 16.7 ms |
| High | 565 | 517 | 1,009,770 | 923,738 | about 16.7 ms |

Ultra was not measured in the same daytime comparison. Auto uses no new full-screen effect. Hardware lamps merge by material while retaining the live material reference, and tiny emissive indicators do not render into the shadow map. Small stones use lower-polygon geometry; large stones have four higher-detail shapes. The new habitat dimensions have a matching collision boundary.

Build-size check: sum gzip-compressed client JavaScript, CSS, images and models individually, comparing the previous packaged version with the current production build. Baseline: 5,996,963 bytes; rebuilt: 6,129,236 bytes; delta: 132,273 bytes (about 129 KiB). This includes the two original WebP assets and stays below the approximately 250 KB added-asset target. Recalculate this table if source changes after this check. Screenshots and source documents are not deployed game assets.

Maximum terrain texture dimension is 768; hardware maps are at most 512. No tier downloads another asset when selected. Native phones still need testing for sustained 30 fps, thermal throttling, portrait/landscape transitions and memory usage. Texture count increased from the original scene because the hardware uses labelled physical surfaces. This is documented rather than treated as free memory.

The rebuild provides a materially more detailed playable interpretation. Offline-render realism, full triplanar PBR scan quality, a Milky Way and Mars moons, new weather simulations and a separately controlled sunset are not claimed.

---

## Historical baseline and earlier pass

# Mars graphics plan and measurement

Baseline sampled at the spawn view in the local in-app browser, desktop viewport, 2026-11-10. Frame times are short browser samples, not a device benchmark or a phone guarantee. Draw calls and triangles include shadow and post-processing passes. Texture counts depend on which tiers were visited.

| Tier | Baseline frame | Draw calls | Triangles | Textures | Scale |
|---|---:|---:|---:|---:|---:|
| Auto | 17.6 ms | 551 | 1,009,756 | 16 | 1.25 |
| Performance | 17.6 ms | 203 | 868,176 | 16 | 1.00 |
| High | 17.6 ms | 565 | 1,009,770 | 29 | 1.25 |
| Ultra | 17.6 ms | 1,117 | 2,019,498 | 35 | 1.25 |

Budgets: no added downloads or external assets; <250 KB gzip added application assets; Auto must not add render passes or new draw calls. Performance should reduce geometry and pixel cost. High and Ultra may use their existing post-processing. Preserve collision geometry, gameplay, reduced-motion preference and all lunar behavior. Numbers are a baseline, not a claim that the target 30/60 fps is met on other hardware.

Milestones: (1) improve the existing sky and light without extra draws; (2) reuse terrain buffers and instancing; (3) favor material refinements and existing interaction markers; (4) reuse capped existing particles and footprints; (5) make performance costs explicit and warm available shaders. Report items that cannot be verified or fit the budget instead of inventing measurements.

## Local after-change samples

Same browser and approximate spawn view as the baseline above. Samples are brief and rounded; they are not controlled GPU timings. The milestone 1–2 combined Auto sample was 17.8 ms, 551 calls and 1,009,756 triangles. Individual per-milestone tier samples were not collected, so they are not inferred. The final samples below were measured after milestone 5:

| Tier | After frame | Draw calls | Triangles | Textures | Scale | Change from baseline |
|---|---:|---:|---:|---:|---:|---|
| Auto | 17.6 ms | 551 | 1,009,756 | 16 | 1.25 | Same draw and triangle count |
| Performance | 17.6 ms | 203 | 492,176 | 16 | 0.75 | 376,000 fewer triangles; lower pixel scale |
| High | 17.6 ms | 565 | 1,009,770 | 29 | 1.25 | Same draws and triangles |
| Ultra | 17.6 ms | 1,117 | 2,019,498 | 35 | 1.25 | Same draws and triangles |

A gzip comparison of the changed application source files was +1,122 bytes; this is not a measurement of the final shipped bundles. No image or model was added. Test all targets on representative phones before making frame-rate claims. Texture counts depend on the order in which tiers are visited.

Work completed: warm sky and blue halo, night Earth and warm windows, subtle regolith/rock variety, cleaner solar-panel appearance after the activity, proximity status lights, a smaller runtime texture, reduced-motion dust/bloom, shader warm-up, less allocation for nearest-station searches, and explicit tier budgets. Existing capped footprints and starfield are reused.

Not implemented: separately controlled sunset, height-dependent haze, cascaded shadows, Milky Way and Mars moons, new terrain relief/canyon or Olympus silhouettes, new rock meshes, complete hardware remodel and growth animation, new rim outlines, rover tracks/dust trails, dust devils/clouds/shafts, new character/camera animation, and a formal per-tier before/after screenshot set. Those require further graphics work and device profiling; they should not be interpreted as delivered. Real-device WebGL fallback, frame-rate targets, and an exact compressed deployed-bundle delta were not verified.

