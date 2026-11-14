# Bottom-left minimap and rover LiDAR

- `ui/ExplorationMinimap.tsx`: walking map keeps its 80 m radius; entering the crew rover switches to the existing 30 m obstacle scan. Range rings, a slow scan sweep, cyan returns and amber `!` hazard diamonds make contacts readable. A distance warning shares the rover's existing predicted-path result. The map remains north-up and collapsible.
- `game/minimap.ts`: optional map range and capped contact projection. Up to 48 markers are selected, retaining predicted path hazards first. No additional obstacle scans or 3D camera are created.
- `ui/freeRoam.css`: anchors the map bottom-left on desktop and above the existing left-hand controls on touch screens. Compact layouts keep 44 px collapse targets and 14 px status text. Reduced motion stops the sweep. HUD clipping prevents focus changes from scrolling the entire game on short screens; redundant mobile driving info is hidden to keep the gearbox visible.
- `tests/minimap.test.mjs`: covers 30 m projection at distant coordinates, edge destinations, marker limits, hazard priority and non-mutation of the shared scan.
- `README.md` and `docs/INTERFACE.md`: describe map placement, sensor activation, coordinate/range contracts and the rendering cap.

Validation: all 151 tests and TypeScript checks pass. Both production builds pass. Browser checks covered 1280x720 desktop and 844x390, 740x360 and 568x320 landscape layouts, walking/driving transitions, keyboard map collapse, reduced motion, live contacts and an actual 0.3 m obstacle warning. No browser console errors were recorded. The screenshot in `outputs/minimap-lidar-mobile.png` is a local check artifact, not a shipped asset.

LiDAR operates while driving the crew rover; on foot the map shows rocks and rover locations. This is the existing simulated horizontal obstacle scan, not hardware telemetry. No sensor physics or vehicle handling was changed. Actual low-end phone frame rates remain unverified; the added work is capped SVG display and a CSS animation using the scan already computed by the game.
