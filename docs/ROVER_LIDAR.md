# Rover lamps, lidar and speed validation

- Replaced the detached white lamp discs with bracketed, recessed rectangular lamps. Mount points are raycast once against the prepared NASA chassis. Added a roof sensor mounted to the same chassis; fixtures follow chassis pitch and roll and hide in cockpit mode.
- Simulated 30 m lidar uses nearest returns from collision circles and rotated boxes. Cockpit and HUD share contacts, reverse/steering prediction and distance warnings. Scan work is capped at 8 Hz and adds no asset downloads.
- Forward cap: 10 km/h; authored reverse cap: 3 km/h. Gentler acceleration and braking. Existing collision and wheel/suspension geometry retained.
- Checks: 108 tests passed, including six lidar tests and legacy overspeed normalization. Typecheck, Pages build and Sites build passed. Build retains existing large-chunk warnings.
- Local browser: entered rover, switched cockpit/exterior, reached displayed 10 km/h, observed warning decrease from 11.8 m to 3.5 m, stopped at the blocker, reversed free and used handbrake. Front view showed mounted lights and roof sensor. Both cockpit instrument and HUD showed obstacle returns. No captured browser errors.
- Verified 390 x 844 layout; moved the rover HUD away from the map and moved the mud indicator away from the lidar warning. Restored the default viewport after testing.
- Sensor is a 2D gameplay approximation with finite resolution and occlusion, not a flight-ready lidar or guaranteed clearance system. No automatic braking is added.
