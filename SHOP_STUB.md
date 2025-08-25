# Shop System Stub

Roadmap placeholder for a future in-run upgrade/shop system.

Planned concepts (not implemented yet):

- Currency accumulation from kills / wave clears.
- Periodic shop waves or between-wave pause offering deterministic upgrade choices seeded by run seed.
- Upgrade categories: fire-rate, bullet speed, graze radius, overdrive charge rate.
- Deterministic inventory roll algorithm (single RNG draw per slot + table mapping) with snapshot support.
- Persistence considerations: upgrades must be represented in snapshot (schema vN) with versioned upgrade list.
- Golden coverage: introduce dedicated seed exercising shop open/close + upgrade application without affecting deterministic core outside upgrade windows.

Deferral Rationale: focusing on core deterministic combat loops & performance harness first; shop introduces broadened balance surface and snapshot schema expansion. Stub established to block premature design churn.
