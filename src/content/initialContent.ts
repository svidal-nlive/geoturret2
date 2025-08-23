/**
 * Initial placeholder content definitions (Phase 1 seed data).
 * Replace / expand during Feature Parity implementation.
 */
import { Registries } from './registries';

// Enemies (baseline archetypes)
Registries.enemy({ id: 'grunt', hp: 10, speed: 1.0 });
Registries.enemy({ id: 'swift', hp: 6, speed: 1.6 });
Registries.enemy({ id: 'tank', hp: 30, speed: 0.6 });

// Powerups
Registries.powerup({ id: 'shield', duration: 5 });
Registries.powerup({ id: 'overdrive', duration: 8 });

// Upgrades
Registries.upgrade({ id: 'damage+', tier: 1 });
Registries.upgrade({ id: 'firerate+', tier: 1 });
Registries.upgrade({ id: 'spread+', tier: 1 });

// Wave Modifiers
Registries.waveMod({ id: 'storm', description: 'Increased projectile density' });
Registries.waveMod({ id: 'gravity', description: 'Projectiles arc downward' });

// Boss Patterns (stub ids / versions)
Registries.bossPattern({ id: 'laser-cross', version: 1 });
Registries.bossPattern({ id: 'safe-lane-volley', version: 1 });
Registries.bossPattern({ id: 'multi-beam-intersect', version: 1 });

// No exports: side-effect module. Import once at startup (or in tests) to populate registries.
