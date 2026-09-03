# BACKLOG / PRESERVED IDEAS

This file preserves useful ideas that are intentionally not part of the current milestone.

## Director Tools

- Jump to distance/state
- Restart same seed
- Export runtime config
- Import runtime config
- Hitbox visualization
- God Mode
- Pattern ID display

## Procedural / Testing

- Property-based fairness testing
- Large deterministic seed sweeps
- Spawn-pattern editor
- Pattern preview tool

## Runner / Delivery Gameplay Experiments

These are future experiments, not current requirements. The strongest direction is to keep the runner controls simple while making the **delivery itself** the main MGD-specific twist.

### Delivery-specific cargo rules

Different deliveries could change how a run is played without changing the core controls:

- Fragile cargo / monster eggs: avoid hard impacts and preserve package condition
- Hot food: deliver before temperature drops too far
- Refrigerated cargo: time or environment pressure
- Unstable potion: excessive impacts or movement increase risk
- Cursed package: temporarily modifies hazards or world rules
- Living cargo: can move, escape, or create complications
- Explosive cargo: certain collisions become especially dangerous
- Secret delivery: avoid specific enemies, scanners, or detection zones

### Package condition and delivery rating

Evaluate a run by more than distance alone:

- Package condition
- Delivery time
- Coins / pickups
- Near misses
- Optional objectives
- No-damage / no-revive completion
- Delivery Flow / combo performance
- Star rank, letter rank, or `Perfect Delivery` result

### Risk / reward routes

- Branching routes during a run
- Safe route vs dangerous shortcut
- High-reward coin routes
- Faster routes that increase package risk
- Rooftop / street / tunnel / market / sewer route choices
- Delivery deadlines can make route choice meaningful rather than purely score-based

### Delivery Flow / skill combo system

Reward clean, stylish play instead of only survival:

- Near miss
- Perfect landing
- Clean pickup
- Shortcut use
- Enemy jump / dodge
- Complete coin line
- Clean package handling
- Perfect delivery
- Chain actions into a `Delivery Flow` multiplier that breaks on mistakes

### Temporary monster mounts / movement modifiers

Use short-lived movement changes to break up the normal runner rhythm:

- Slime: large bounce / high jumps
- Harpy: temporary flight
- Centaur: very high speed with harder control
- Spider: wall / ceiling traversal sections
- Dragon: rare high-power chaos sequence

These should be temporary and readable rather than permanent layers of control complexity.

### Character gameplay quirks

If characters eventually affect gameplay, prefer small, understandable differences instead of dense RPG stats:

- Slower fall / improved aerial control
- One crash protection per run
- Slightly larger pickup radius
- Special interaction with certain route types
- Longer boost duration
- Character-specific traversal option

Avoid turning characters into stat spreadsheets unless later testing proves that deeper builds improve the game.

### Chase / deadline pressure

Possible alternatives to pure distance pressure:

- Delivery deadline constantly approaches
- Mistakes cost time
- Clean play creates breathing room
- Rival courier chase
- Monster chase
- Police / guard chase for specific missions
- Special customer or story chase sequences

### Destructible obstacles

- Normal state: hazards must be avoided
- Boost / special state: selected hazards become destructible
- Creates a satisfying reversal where danger temporarily becomes something the player can smash through

### Runner boss / set-piece sequences

Bosses do not need traditional stop-and-fight combat:

- Giant monster chase
- Dragon fire-dodge sequence
- Run -> dodge -> attack opportunity -> continue running
- Short scripted or semi-procedural spectacle sections inside a normal run

### Rare events

Use uncommon events to make repeated runs feel less predictable:

- Dragon attack
- Golden slime
- Secret delivery
- Monster parade
- Rare customer
- Rare route portal / special biome
- Unusual cargo event

## Modes / Content Experiments

### Endless + handcrafted deliveries

MGD does not have to remain endless-only.

Possible long-term structure:

- `Deliveries`: short handcrafted missions
- `Endless Run`: high-score / distance mode
- `Challenges`: special rules and mutators

Handcrafted missions could include optional objectives such as:

- Reach customer
- Package condition above threshold
- Finish under target time
- Collect target number of coins
- No crashes
- Use a specific route

### Delivery Rush

- Start with a short timer
- Successful deliveries add time
- Continue chaining deliveries until time expires
- Useful as a faster arcade mode distinct from normal endless play

### Mutator / Test Lab mode

Gameplay modifiers can serve both development and later challenge content:

- Super speed
- Low gravity
- Bouncy world
- Giant / tiny player
- Exploding coins
- No floor
- Double delivery
- Monster-heavy run
- Restricted route types

Prefer implementing useful mutators as internal testing tools first. Fun combinations can later become official challenge content.

### Biomes and world progression

Avoid making endless mode feel like one infinitely repeated level:

- City
- Market
- Forest
- Swamp
- Ruins
- Monster district
- Castle / special destination

Biome transitions can change visuals, music, hazards, enemy sets, pickups, route modules, and delivery context.

### Dynamic weather / atmosphere

Possible future variation:

- Rain
- Storm
- Night
- Fog
- Wind
- Monster moon / supernatural weather

Weather can start as visual variety and later gain small gameplay effects if those effects remain readable and fair.

### Customer requests

Customers can create mission-specific rules:

- "Do not shake the package"
- "Get here in under 60 seconds"
- "Avoid electricity"
- "Use the rooftop route"
- "Keep package condition above 95%"

This can turn the delivery premise into reusable gameplay constraints.

## Meta Progression / Collection Experiments

### Delivery Hub / Courier HQ

Use run rewards to visibly grow a home base rather than relying only on numerical upgrades:

- Garage
- Workshop
- Kitchen
- Storage
- Monster lounge
- Dispatch office

Prefer visible / cosmetic progression first. Avoid excessive percentage-based upgrade trees unless they clearly improve the game.

### Customers / Monster collection

Successful deliveries could gradually fill a customer or monster collection:

- Monsterdex / customer book
- Character art
- Short bios
- Dialogue
- Delivery history
- Small story entries
- Rare customers to discover

This provides collection motivation without requiring heavy stat progression.

## Reference Games / Lessons to Revisit

These are inspiration references, not features to copy directly.

- **Jetpack Joyride**: extremely simple controls, readable hazards, vehicles that temporarily change the run, missions and strong moment-to-moment pacing
- **Jetpack Joyride 2**: study how the sequel expands progression, combat, level structure, bosses, and presentation without losing the original control simplicity
- **Jetpack Joyride: Test Labs**: combinable gameplay mutators; useful model for internal MGD experiments and later challenge modes
- **Ski Safari**: constant chase pressure, temporary animal mounts, tricks and objectives
- **Alto's Adventure / Alto's Odyssey**: tricks, combos, atmosphere, weather, biome variation, alternate routes and character differences
- **Blades of Brim**: runner plus combat, equipment, companions, wall movement and boss encounters
- **Subway Surfers**: route layers, readable power-ups, rescue / protection mechanics and mission-based score progression
- **Subway Surfers City**: character / board abilities, districts, secrets, trials and multiple modes
- **Burrito Bison**: run -> upgrade -> push farther loop, destructible barriers and visible forward progression
- **Vector**: skill moves and handcrafted parkour challenges instead of relying only on endless generation
- **Rayman Jungle Run**: auto-runner controls used in short handcrafted levels with completion goals
- **Minion Rush**: outfits / characters with limited gameplay effects instead of purely cosmetic differences
- **Talking Tom Gold Run**: run resources feeding visible hub / world progression
- **Canabalt**: reminder that a runner can remain compelling with extremely limited controls

## Design Guardrails for Future Experiments

- Do not treat items in this backlog as commitments or current milestone scope.
- Preserve simple, immediate runner controls as long as possible.
- Prefer systems that reinforce the **delivery fantasy** rather than generic runner feature accumulation.
- A useful long-term identity to test is: **simple runner + unusual deliveries + risk/reward routes + monster characters**.
- Prefer player skill, route decisions, cargo rules, and readable trade-offs over stat-heavy progression.
- Prototype new layers independently before combining them.
- Avoid adding several meta systems at once; feature creep would make it harder to learn whether the base run is fun.
- Mutators and debug tools can be used to test ideas cheaply before promoting them into normal gameplay.

## Assets

- Automated image validation
- Texture atlas pipeline
- Asset manifest generation
- Missing/unused asset detection

## Saves

- Save export/import/reset
- Save schema migrations
- Optional platform/cloud adapters later

## Product

- Portrait mode or variant evaluation
- Character gameplay abilities vs cosmetic-only
- Economy design
- Gacha rates/costs
- Localization
- Accessibility polish
- PWA evaluation
- itch.io deployment
- Android/iOS packaging
- Steam/Desktop packaging
- Gamepad support
- Steam Cloud evaluation

## Explicitly deferred

- Backend
- Online accounts
- Multiplayer
- Real-money purchases
- Ads
- Analytics/telemetry
- Replay system
