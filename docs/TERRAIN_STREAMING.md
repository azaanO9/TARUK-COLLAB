# Device-adaptive Mars terrain

The local renderer check runs before world construction. Streaming candidates require a supported desktop GPU family, at least eight logical cores, no reported memory shortage, and non-Performance startup graphics. Unknown GPU details, integrated/software GPUs and coarse-pointer mobile devices use the existing finite map. Hardware hints alone never enable streaming: the loaded scene must also pass twelve measured renders after warmup (average <=19 ms and 90th percentile <=22 ms). Checks remain behind the shuttle overlay. No device data is stored or transmitted.

Eligible sessions use a fixed pool of 49 terrain meshes with shared existing materials and textures. Seventy-metre tiles are requested three tiles ahead in every direction, filled a few rows per frame, and recycled outside that neighborhood. The existing 420-metre detailed ground remains. Outer contact heights use the same one-metre triangle interpolation as generated geometry. World bounds are extended per session for walking, rover driving and rover exit; finite defaults are unchanged. Sky/stars follow travel, the fixed decorative canyon is hidden, and distance haze masks the generation edge. Switching to Performance during a streamed session lowers the generation allowance instead of removing terrain or teleporting the player.

## Verification

136 tests pass, including conservative device selection, failed/unstable render measurements, walking and exits beyond old limits, deterministic regeneration, mesh/contact alignment and bounded pool/disposal. Typecheck and both builds pass. Browser QA selected expanding terrain and walked to x=241 m, past the old 176 m walking boundary and 210 m ground edge. Observed diagnostics at that point: 60.1 FPS, 31 active generated tiles, 45 textures, scale 1.25. This is one test device, not a universal FPS guarantee. No browser console errors were observed.

## Limits

This is streamed exploration, not infinite precision: a 32 km coordinate safety boundary remains. Curiosity continues its autonomous local patrol. Existing tyre-track textures cover the starting region only. Generated outer terrain currently adds regolith and rolling ground, not new buildings or missions. The conservative gate may leave capable but unrecognized GPUs on the finite map. Physical low-end phones and multiple iGPU models still need real-device checks.
