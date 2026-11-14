# Mars Trek map and FPS settings — 14 November 2026

The existing 3D ground already sampled the NASA MOLA crop from the supplied Mars Trek extent. This update makes the **entire extent** available in the atlas instead of showing only the original 1.4 km game-space square. It does not replace measured elevations with a fictional terrain, embed a live NASA website, or add downloads during exploration.

## File changelog

- `ui/MarsAtlas.tsx`: full-region and player-centred nearby views, reusing the same local shaded-relief WebP as the minimap and cockpit. Removed the canvas elevation redraw on every map opening. Geographic limits, selected landmark, player position, scale and the original NASA Trek link remain visible. At regional zoom, unselected pins become small dots to avoid overlapping labels; the accessible list selects every landmark.
- `game/marsAtlas.ts`, `tests/marsAtlas.test.mjs`: shared atlas projection and bounded marker visibility. Tests cover exact survey corners, all six landmarks, player-centred nearby views and the procedural frontier.
- `ui/SurvivalWorld.tsx`: Caps Lock opens the map after landing. Held keys, modifier chords and editable fields do not trigger it. Camera & graphics adds FPS meter Off / FPS only / Detailed. The meter reuses existing once-per-second measurements without another render loop or React updates per frame. Initial loading and hidden-tab time do not enter an FPS window.
- `ui/MarsFreeRoam.tsx`, `ui/ExplorationMinimap.tsx`: Caps Lock also closes the map, with Escape and the mobile Atlas button retained. Closing consumes the keyboard event so it cannot reopen the map in the resumed world. Focus returns to the originating control or game. Controls setup and Pause describe the shortcut.
- `game/performanceMeter.ts`, `tests/performanceMeter.test.mjs`: compact/detailed formatting and guards for missing samples. Detailed reports FPS, average frame interval, draw calls, triangles, textures, render scale and active rendering preset. This is a browser render-frame measurement, not a separate GPU timer.
- `ui/freeRoam.css`: readable 14 px performance settings, 44 px controls, scrolling short-screen settings, map markers and meter placement. Detailed metrics are hidden while settings are expanded to keep the panel readable, and return when it closes.
- `README.md`, `docs/INTERFACE.md`: current controls and presentation contracts.

Preferences last for the current exploration session. Ordinary links start with the meter off; `?debug=1` starts with Detailed. No accounts, telemetry, persistent preferences, new dependencies or image/model assets were introduced. Gameplay, rovers, physics, quality tiers, streaming and the day/night cycle remain intact.

## Verification

162 tests pass, as do `pnpm typecheck`, `pnpm build` and `pnpm build:pages`. Builds retain the existing chunk-size and Vinext route-classification warnings.

Desktop browser checks on an ordinary URL verified: Caps Lock opens/closes, Escape closes, focus returns, selecting Gale updates its minimap bearing, both map views work, all three FPS modes work, and Caps Lock while the FPS select is focused does not open the map. A desktop Auto sample read 60 FPS / 16.7 ms; this is a functional check, not a phone performance claim.

An 844 × 390 browser viewport with Mobile selected verified automatic touch controls, the mobile settings selector, Atlas access, map scrolling and movement after closing the map. A short-screen settings overflow found in that check was corrected by letting the settings container fit its panel width.

Real Android/iPhone performance, thermal throttling and hardware keyboard behaviour on mobile still require device testing. MOLA remains a downsampled height survey with artistic colours/close-up detail, not satellite photography or navigation-grade reconstruction.
