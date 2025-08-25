/**
 * Initial placeholder content definitions (Phase 1 seed data).
 * Replace / expand during Feature Parity implementation.
 */
import { Registries } from './registries';

// Enemies (baseline archetypes)
Registries.enemy({ id: 'grunt', hp: 10, speed: 1.0, role: 'basic', bounty: 1, spawnWeight: 10, displayName: 'Grunt', description: 'Baseline fodder enemy.', version: 1 });
Registries.enemy({ id: 'swift', hp: 6, speed: 1.6, role: 'fast', bounty: 1, spawnWeight: 6, displayName: 'Swift', description: 'Fast but fragile.', version: 1 });
Registries.enemy({ id: 'tank', hp: 30, speed: 0.6, role: 'tank', bounty: 3, spawnWeight: 3, displayName: 'Tank', description: 'Slow, durable target.', version: 1 });

// Powerups
Registries.powerup({ id: 'shield', duration: 5, displayName: 'Shield', description: 'Temporary damage absorption.', rarity: 'common', version: 1 });
Registries.powerup({ id: 'overdrive', duration: 8, displayName: 'Overdrive', description: 'Increases fire rate while active.', rarity: 'rare', version: 1 });

// Upgrades
Registries.upgrade({ id: 'damage+', tier: 1, displayName: 'Damage +', description: 'Boost base damage.', category: 'offense', maxTier: 5, version: 1 });
Registries.upgrade({ id: 'firerate+', tier: 1, displayName: 'Fire Rate +', description: 'Increase firing speed.', category: 'offense', maxTier: 5, version: 1 });
Registries.upgrade({ id: 'spread+', tier: 1, displayName: 'Spread +', description: 'Increase projectile spread.', category: 'offense', maxTier: 3, version: 1 });

// Wave Modifiers
Registries.waveMod({ id: 'storm', description: 'Increased projectile density', displayName: 'Storm', synergyTags: ['projectile','density'], version: 1 });
Registries.waveMod({ id: 'gravity', description: 'Projectiles arc downward', displayName: 'Gravity', synergyTags: ['trajectory'], excludes: ['storm'], version: 1 });

// Boss Patterns (stub ids / versions)
Registries.bossPattern({ id: 'laser-cross', version: 1, displayName: 'Laser Cross', estDurationFrames: 180, description: 'Intro pattern with crossing lasers.' });
Registries.bossPattern({ id: 'safe-lane-volley', version: 1, displayName: 'Safe Lane Volley', estDurationFrames: 240, description: 'Alternating safe lane volleys.' });
Registries.bossPattern({ id: 'multi-beam-intersect', version: 1, displayName: 'Multi Beam Intersect', estDurationFrames: 300, description: 'Orbiting beams that intersect.' });
Registries.bossPattern({ id: 'future-converge', version: 1, displayName: 'Future Converge', estDurationFrames: 360, description: 'Radial waves converging inward.' });
Registries.bossPattern({ id: 'spiral-barrage', version: 1, displayName: 'Spiral Barrage', estDurationFrames: 360, description: 'Spiral arc bullet storms.' });

// No exports: side-effect module. Import once at startup (or in tests) to populate registries.
