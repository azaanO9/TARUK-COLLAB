# TARUKH — Junior Astronaut Mission

A player-paced educational Mars outpost game for young explorers, with a separate lunar training mission and Six Shifts story. Select Mobile or PC at the mission briefing. The player chooses a callsign and patch; nothing is stored between sessions.

On Mars, explore six stations, complete hands-on activities and NASA-linked quizzes, manage fictional resource points over ten sols, and earn discoveries, ranks and a printable certificate. Complete one station activity each sol; revisiting a station can replenish its resource. Day and night follow the sol counter. Sage stays at the shelter until invited to follow. The rover is driveable: approach it and press F (or use touch controls). WASD moves, Space jumps, E inspects and V changes view. Mobile provides on-screen movement and rover controls. Open Camera & graphics to choose Auto, High, Ultra or Performance.

The astronaut used in Mars exploration is an original animated procedural model. The historical NASA model is retained as an unused asset; see [ASSET_CREDITS.md](ASSET_CREDITS.md). Numerical supplies and risk are educational game assumptions, not real mission procedures. There are no accounts, telemetry, pressure timers, or persistent player data.

## Run and verify

Use Node 22.18+ and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open http://127.0.0.1:5173/. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` for checks. Historical notes are in [docs/ARCHIVE.md](docs/ARCHIVE.md).
