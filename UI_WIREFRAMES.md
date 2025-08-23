# Geoturret 2 – UI Wireframes & Interaction Notes

Purpose: Lightweight ASCII wireframes to align on spatial layout and interaction affordances before implementation. Update if major structural changes are proposed.

Conventions:

- `[]` buttons / interactive elements
- `{}` dynamic value containers
- `()` timers / transient indicators
- `*` emphasis / highlight
- `…` scrollable / overflow region
- All text labels subject to final polish

---

## 1. In‑Run Gameplay HUD (Arena)

```text
+----------------------------------------------------------------------------------+
| Coins {1234} (+25)      Wave 12 / 40            Seed ABCD123    FPS 120  🔊  ⚙  ✖ |
|                       Overdrive Meter [███████-----] (72%)                     |
|----------------------------------------------------------------------------------|
|                                                                                  |
|                           (Game Canvas Play Area)                                |
|                                                                                  |
|                                                                                  |
|                                                                                  |
|                                                                                  |
|                                                                                  |
|                                                                                  |
|----------------------------------------------------------------------------------|
| Health ▓▓▓▓▓▓▓▓▓▓ (120/150)   Armor ▓▓▓▓▓▓ (50/80)   Power-Ups: RAPID(6s) SHIELD(3s) |
| Upgrades: [Pierce II] [Ricochet I] [Explosive I] [Magnet III] [Luck II]            |
+----------------------------------------------------------------------------------+
```

Key Notes:

- Coin delta `( +25 )` appears for 1s then fades; aggregates during rapid gain window.
- Overdrive meter pulses when ≥90%.
- Health vs Armor clearly separated (labels + distinct color hues).
- Power-up timers show remaining whole seconds (<=10s) else hidden until 10s threshold.
- Upgrades list horizontally scrollable if overflow (mouse wheel / swipe) with fade edges.

Accessibility:

- All HUD text contrast ≥ 4.5:1 on default background.
- Provide tooltip or ARIA label for each upgrade icon (name + stack count + short effect).

---

## 2. Shop Screen Layout

Trigger: After wave completion before next spawn.

```text
+----------------------------------------------------------------------------------+
| Coins {1234} (+15)          Shop (Wave 12)             Reroll Cost: 75 (Next 90) |
|----------------------------------------------------------------------------------|
| Categories: [Offense]*  [Defense]  [Utility]  [Economy]   Hold REROLL: ( ○○○○ )  |
|----------------------------------------------------------------------------------|
| OFFENSE (3)                                                                  ▼   |
|  [Upgrade Card]  [Upgrade Card]  [Upgrade Card]                                  |
| DEFENSE (2)                                                                  ►   |
|  (collapsed placeholder row)                                                   |
| UTILITY (2)                                                                  ►   |
| ECONOMY (1)                                                                  ►   |
|----------------------------------------------------------------------------------|
| Selected: Pierce II  DMG +10%  Penetrates +1 enemy (Stack: 2)  [BUY 150]         |
| [Close / Continue]                                                     [Settings]|
+----------------------------------------------------------------------------------+
```

Key Notes:

- Only one category expanded at a time (accordion); count shows available cards.
- Reroll: Hold interaction shows progress ring filling ( ○ -> ● ); on completion triggers reroll; releasing early aborts.
- Reroll cost preview includes next cost in parentheses.
- Selected card detail area updates on hover/focus (keyboard navigable via arrow keys / tab order within expanded category).

Accessibility:

- Focus outline visible for each card.
- Reroll progress ring accompanied by text percentage (screen reader friendly).

---

## 3. Settings Menu Grouping

Invocation: In-run pause or from shop.

```text
+--------------------------------------------------------------+
| SETTINGS                    | Gameplay  | Accessibility | Audio | Performance |
|--------------------------------------------------------------|
| (Sidebar – optional)        |                                           ▲    |
| [Gameplay]                  |  GAMEPLAY                                 │    |
| [Accessibility]             |  Difficulty Preset: [Arcade v]            │    |
| [Audio]                     |  Seed: {ABCD123} [Copy]                   │    |
| [Performance]               |  Show Hitboxes: [ ]                       │    |
|                              |  Reduce Motion: [x] (Disables shake)      │    |
|                              |  TELEGRAPH INTENSITY:  80%  [-] [ + ]     │    |
|                              |  COLOR THEME: [High Contrast v]          │    |
|                              |  AUDIO MASTER: ▓▓▓▓▓▓▓░░ (70%)           │    |
|                              |  MUSIC: ▓▓▓▓░░░░░ (40%)                  │    |
|                              |  SFX: ▓▓▓▓▓▓▓▓▓▓ (100%)                  │    |
|                              |  PERFORMANCE                              │    |
|                              |  FPS Overlay: [x]                         │    |
|                              |  Object Counts: [ ]                      │    |
|--------------------------------------------------------------|           │    |
| [Reset Defaults]  [Close]                                     Scrollbar  ▼    |
+--------------------------------------------------------------+
```

Key Notes:

- Horizontal tab bar or vertical sidebar (implementation choice) – only one active panel at a time.
- Seed copy button copies current run seed; accessible label: "Copy run seed to clipboard".
- Sliders keyboard operable (left/right adjust by step; shift+arrow coarse step).

Accessibility:

- Ensure logical tab order: tabs before panel contents; closing buttons last.
- All toggles have ARIA role + describedby where additional context needed.

---

## 4. Responsive Considerations

| Breakpoint | Adjustment |
|------------|------------|
| ≥ 1280px width | Layout as shown. |
| 900–1279px | Move Overdrive meter under coin line; upgrades wrap to second line. |
| < 900px | Consolidate health/armor into stacked mini-bars; hide seed & FPS behind expandable debug icon. |
| < 600px | Shop categories become dropdown; settings tabs become select menu. |

---

## 5. Interaction Acceptance Summary

- HUD coin delta shows within ≤100ms of gain event.
- Reroll hold threshold: 550ms ±25ms window; progress ring increments at least every 100ms.
- Settings modifications persist immediately (localStorage) with debounced write (≤250ms).
- Upgrade list virtualization not required unless >30 unique icons present; otherwise simple horizontal scroll.

---

## 6. Open UI Questions

1. Do we surface DPS / damage statistics live (could clutter)?
2. Should shop allow multi-buy (holding buy)? (Probably defer.)
3. Expose performance preset toggle (Low / Standard / High) bundling multiple settings?

Add answers before Beta freeze.

---

Revision Log:

- 2025-08-22: Initial wireframe set created.
