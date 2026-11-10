# Fitted rover cockpit

The original wide rectangular windshield has been replaced by seven openings measured from the prepared NASA MMSEV asset: two upper driving panes, two outboard panes, two diagonal lower panes and the lower centre pane. `ui/world/roverWindowContours.ts` stores rover-local coordinates. Rounded XY contours come from the glazing components; each pane's Z coordinates fit its glazing plane to avoid alternating bevel depths. The interior lining is offset inward by 25 mm and joins a curved pressure shell. It has real holes and solid dividers, not painted windows.

The supplied cockpit picture informed the original graphite/ivory material palette, recessed displays, illuminated console edges and physical controls. No artwork from that picture is embedded. This is an artistic game cabin, not a claim about NASA's actual cockpit instruments. The NASA exterior and independent tire/suspension rig retain their existing geometry and attribution.

The driver eye is seated at (-0.34, 2.03, -0.73) metres in rover coordinates. The view starts slightly downward so the road and instruments are visible; mouse look still works. The thin central instrument band sits between the two glazing rows. Desktop driving controls move to a compact upper-right overlay, while touch controls keep their existing layout.

Static fittings share eight material batches; three display planes share one 1024 × 512 canvas atlas. Readouts update only when rounded speed, heading, gear or brake state changes. The cabin light remains outside the switched interior root, keeping the shader light count stable. The entire cockpit is prepared and warmed before play, with no additional model download when switching cameras.

## Reproducing the contours

Use the pinned offline glTF tools described in `scripts/prepare-rover.mjs`, then run `node scripts/measure-rover-windows.mjs <tools-directory>`. The script verifies the source asset's SHA-256 before using its measured connected-component IDs. If the asset changes, measure the new glazing components instead of reusing old IDs.

## Validation

- Geometry tests check the seven pane centres and near-edge samples are open, the central/row dividers are solid, the driver's forward view is clear, the cabin is bounded and the camera follows chassis attitude.
- The existing light-count test checks camera switching does not add/remove lights.
- Full tests, type checking and both production builds pass.
- Browser verification covers the fitted interior, exterior/cockpit switches, driving/braking, and narrow-screen controls. Timing observations are local CPU submissions, not GPU latency or a hardware-independent FPS guarantee.
