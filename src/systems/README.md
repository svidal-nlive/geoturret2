# Systems Module

Placeholder for gameplay systems (input, spawning, enemy AI, bullets, collisions, powerups, particles, waveMods, boss, shop, upgrades, ui, hud, accessibility). Each system will:

- Expose `init(ctx)` and `update(dt, ctx)` lifecycle functions.
- Register internally with a central orchestrator once implemented.
- Avoid direct cross-system coupling; use data registries and the event bus.

Deterministic operations requiring randomness must receive an `RNG` instance from orchestrator injection (do not import `globalRng` except in early stubs scheduled for removal before Phase 1 exit).
