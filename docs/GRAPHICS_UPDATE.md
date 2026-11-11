# Mars materials and outdoor lighting · 11 November 2026

This pass targets a more realistic environment while preserving the current astronaut, rover, cockpit and vehicle simulation. It changes surface response and rendering rather than replacing those models.

- Ground blends the existing scans by height and dust deposition, with mapped roughness, cavity shading and filtered fine relief. Rocks use triplanar scan detail; larger boulders have averaged shared-position normals with identical vertices, bounds and collision data. Grazing-angle bump perturbation is bounded to avoid bright cliff flecks.
- Colony-owned coatings use a shared generated 128px microfinish texture, dielectric paint/ceramic response, exposed metallic alloy and irregular dust. Actor materials are separate and unchanged.
- A small one-time outdoor PMREM replaces the indoor room environment. The sky halo, visible sun and directional shadows share a direction. Neutral fill keeps backlit hardware readable.
- Auto has 1536px shadows and half-resolution GTAO capped at 768px on its longest edge, 8 samples and no bloom. High/Ultra use 2048px shadows and restrained bloom. Effect targets use 2x MSAA when supported. AO excludes transparent surfaces and does not rerender shadows. Performance keeps direct rendering without shadows/effects.
- Auto sheds AO under sustained low FPS; with no active effects it bypasses the composer. Effect setup/render failures fall back to direct rendering. Visibility, shadow updates and override state are restored even on failure. Both rover cameras warm these paths during loading.

The existing source scans are reused; no new downloaded assets, dependencies or extra geometry are added. This is still real-time procedural scenery, not an offline photorealistic render.

Validation: all 93 tests, TypeScript, the Pages build and the original hosting build passed. Local 1280×720 Auto testing reported 60 FPS with contact shading active; the final cockpit switch submitted in 5.7 ms with zero new shader programs. Auto/High/Performance transitions rendered without console errors. The 390×844 layout had no horizontal overflow. Local startup samples ranged from 3.8 to 10.3 seconds across warm/cold shader runs; these figures are observations on the test machine, not promises for other laptops. Browser pointer lock is unavailable in the embedded test browser, so walking and camera checks used the supported keyboard fallback.

## Earlier graphics work

# Reference-driven Mars colony rebuild · 10 November 2026

The Mars scene now uses `createMarsColony.ts` instead of the earlier generic outpost geometry. The supplied concept was used as the visual target for composition, warm lighting, readable shapes and hardware detail. All structures and characters remain interactive 3D geometry. This remains a stylised real-time interpretation, not a pixel-identical offline render.

- A pressure habitat with a segmented dome, entrance frame, piping, slotted windows, roof fittings and steps.
- Separate detailed solar, MOXIE, ice/water, grow-lab, shielding, battery, rover-service and communications hardware at the existing station IDs.
- A continuous eroded canyon surface with world-projected grain, layered colour and distance haze. Walking terrain and its crater sampling remain intact. The habitat collision volume follows its new visual position and size, and the shielding shelter retains an open doorway with solid side and back walls.
- Four original large-rock shapes, low-cost instanced small stones and an original ground texture. `marsHeight` still controls the walkable ground.
- A rebuilt articulated astronaut suit and backpack; a detailed Sage service bay with insulated panels, hatches, vents, cabinets, warm light and an emissive floor ring. Sage's following code is unchanged.
- Smaller warm HUD panels and a notebook at the bottom left; companion and voice controls remain available in the Sage disclosure.
- Tighter player-following shadows and shader/material warm-up behind the loading screen, including desktop post effects. Auto still has no post-processing; Performance keeps fewer pebbles/particles and a lower resolution cap.
- Original compressed same-origin surface assets, with procedural fallback if they fail to load. The two WebP files total 124,148 bytes. There are no asset or service requests after setup; changing graphics tiers reuses the loaded surfaces.

Verification: 60 tests plus TypeScript and production build passed. Browser checks covered the day/night sol transition, the new MOXIE inspect target, keyboard dialog focus, Sage follow/home controls, Mobile selection and a 390×844 layout. A deliberate WebGL context loss showed the recovery screen, and low-graphics retry returned to the scene with mission progress intact. The browser/device overrides were reset afterward.

Screenshots are in `docs/screenshots/reference-before-day.jpg`, `reference-after-day.jpg`, `reference-after-night.jpg` and `reference-after-mobile.jpg`. Desktop FPS samples are not real-phone benchmarks. See `GRAPHICS_PLAN.md` for measured workload and build-size comparisons.

---

## Earlier graphics notes

# Mars graphics update — 9 November 2026

## Movement and Sage follow-up

`ui/SurvivalWorld.tsx` now defaults Mars to Auto graphics: a 1.25 pixel-ratio ceiling, adaptive resolution down to 0.7, 1024px shadows and direct rendering without bloom/AO. High and Ultra retain optional effects. Static outpost meshes are combined by material using `ui/world/batchStaticMeshes.ts` through `createSurvivalOutpost.ts`, preserving individual station targets and animated components. In the tested scene this removes 325 separate static mesh draws. Inspection raycasts run every 80ms rather than each rendered frame. Physics uses substeps up to 1/120 second; gait amplitude and terrain-relative camera height blend over time. Sage is scaled to 0.78 and follows 1.8 units to the player's right, 0.5 units behind, with time-based smoothing.

Local browser measurements after the optimization were approximately 58–60 FPS while walking in Auto at the desktop viewport. This is an observation on the test device, not a guarantee for other devices. Walking, turning and the oxygen inspection dialog were verified. `tests/staticBatching.test.mjs` checks transformed geometry bounds, excluded animated meshes and station raycasts.

## Scope

Visual and exploration polish on the supplied project. The full Mars campaign, rover driving, resource arithmetic and existing narrative have not been implemented or changed. All terrain geometry remains fictional illustrative scenery.

## Main changes

- `ui/world/marsTerrain.ts`: shared continuous height field, crater bowls/rims, graded equipment pads, multiscale regolith colour and bump texture, 6,950 instanced stones with larger-rock collision circles, distant layered escarpments, day/night sky shader and a bounded 160-step footprint pool.
- `ui/world/marsDetails.ts`: original animated astronaut with articulated shoulder/hip pivots, reflective visor and suit details; habitat ribs, identification plates, utility cables, lighting, tank hoses and rover hardware.
- `ui/world/createSurvivalOutpost.ts`: Mars-specific terrain and dressing, common height sampler and collision list. The lunar terrain remains on its original branch.
- `ui/SurvivalWorld.tsx`: terrain-relative astronaut/camera/Sage placement, shadow refinement, environment reflections, bloom, optional Ultra ambient occlusion, selectable rendering quality and GPU resource cleanup. WASD, sprint, jumping, inspection, V view switching, drag look, mouse capture and sensitivity remain available.
- `ui/mars.css`: compact expandable camera/graphics controls, responsive panel layout and a light vignette.
- `app/layout.tsx`: title and description now identify the current Mars experience.
- `tests/marsTerrain.test.mjs`: verifies level station approaches and spawn, recessed craters, and finite continuous terrain across the playable area.

## Preview

From the project folder run `pnpm dev` and open `http://127.0.0.1:5173/`. Skip the preserved opening/landing or let them finish, then start Mars exploration. Choose High, Ultra or Performance in Camera & graphics. Earlier modes remain accessible through their existing query strings.

## Verification

- Existing 28 gameplay tests passed before the terrain checks were added. Both new terrain tests pass.
- TypeScript check passed after the initial graphics integration; final checks are recorded at handoff.
- Browser: walking changed player Z from 12 to 7.06; V switched to first person; a jump produced a positive 0.27 height; walking to oxygen and pressing E opened Sage's note and advanced inspection progress to 1/3. Day/night preview and Ultra selection worked. No browser console errors were observed in that check.
- Narrow viewport: 390 × 844; document width remained 390 without horizontal overflow. Desktop viewport was restored afterward.
- Embedded browser pointer lock was blocked by the preview environment; keyboard walking and drag fallback remained available. Native pointer-lock capture has not been verified in a standalone browser.

## Limits

This is a procedural art pass, not photorealistic AAA asset production. The finite movement area remains 176 × 176 illustrative metres. Boulders use approximate circular collision, smaller pebbles are decoration. Feet follow surface height without skeletal inverse kinematics. The camera clears terrain but does not solve all building occlusion. Ultra costs more GPU time; target-device frame-rate measurements are still needed. Bootprints recycle after 160 steps and are not saved. The preserved landing remains illustrated 2D. Resources remain static teaching points and the rover remains inspectable.

## Mars performance and atmosphere pass

The Mars sky shader uses a warmer day gradient and a restrained blue halo near the sun. Night shows a small blue Earth and existing stars, with stronger habitat windows. Solar panels change their appearance after the solar activity; nearby station indicators brighten. Terrain reuses its existing mesh and collision sampling but adds subtle colour/rock-shape variation. The procedural terrain texture is 512 × 512. Existing instanced footprints remain capped at 160.

The `?debug=1` Mars overlay reports frame time, draws, triangles, texture count, scale and tier. `ui/world/graphicsTiers.ts` defines the limits. Performance uses a 0.75 resolution cap, no shadows or post-processing, 1,800 small rocks and 60 dust particles. Auto retains its existing render features. High enables bloom; Ultra adds SSAO. Bloom and dust movement are calmed for reduced-motion. See [GRAPHICS_PLAN.md](GRAPHICS_PLAN.md) for sample numbers and remaining work. These are local measurements, not proof of phone performance.
