# Monster Girl Delivery — Ideas & Backlog

**Status:** Preserved design exploration / future backlog  
**Merged:** 2026-09-04  
**Purpose:** Single categorized home for future gameplay, art, content, tooling, economy, progression, and experimental ideas.

> [!IMPORTANT]
> Nothing in this document is automatically approved implementation scope. `MASTER_SPEC.md` remains the product/game source of truth, `docs/ROADMAP.md` controls milestone sequencing, and approved GitHub Issues define live work. Ideas here should only be promoted deliberately when they are ready to become real features.

This document merges and replaces the former `GAME_DESIGN_IDEAS.md`, `ART_DIRECTION_IDEAS.md`, and the older `BACKLOG.md` so the project has **one future-ideas store instead of three overlapping files**.

The goal is to preserve a large idea pool without accidentally turning it into a large current scope.

---

## How to use this document

Ideas are organized in two ways:

1. **By category** — gameplay, worlds, characters, art, progression, tools, etc.
2. **By maturity / likely timing** — near-term candidates, later expansion, long-term experiments, or explicitly deferred.

### Priority legend

| Label | Meaning |
|---|---|
| **CORE PRINCIPLE** | Direction worth protecting while the game evolves. Not a task by itself. |
| **EARLY CANDIDATE** | Reasonable to evaluate after the current runner foundation works. Still not approved scope. |
| **LATER** | Expansion idea that should wait until the core game proves itself. |
| **LONG TERM** | Expensive, risky, or scope-heavy idea for a mature game. |
| **EXPERIMENT** | Prototype/research candidate; may be discarded. |
| **DEFERRED** | Explicitly not current work. |

### Promotion rule

```text
Idea in BACKLOG.md
→ discuss / research / prototype
→ Director decision
→ MASTER_SPEC / ROADMAP if needed
→ focused GitHub Issue
→ implementation
```

Do not create implementation work merely because an idea appears here.

---

# 1. Product vision, identity, story, and design guardrails

## CORE PRINCIPLE — Simple core, controlled variety

Monster Girl Delivery should first become a **simple, responsive, fun mobile runner**.

The strongest early design model remains the broad *Jetpack Joyride* philosophy:

- extremely accessible input;
- responsive game feel;
- short sessions;
- readable hazards;
- pacing in waves rather than constant escalation;
- temporary gameplay transformations;
- missions that change player behavior;
- entertaining fail states;
- fast restart.

A useful long-term formula is:

> **One simple core game + many temporary variations + rewarding long-term collection.**

Avoid solving variety by giving the player a huge permanent control vocabulary or dense RPG stat systems.

## CORE PRINCIPLE — Delivery is the MGD-specific fantasy

The clearest answer to “Why are we running?” is the delivery premise itself:

> **The player controls adult monster-girl couriers who deliver orders through dangerous, strange, and increasingly ridiculous environments.**

Possible cargo themes:

- food;
- normal parcels;
- magical items;
- monster eggs;
- medicine;
- cursed packages;
- cyberpunk data;
- dungeon supplies;
- emergency deliveries;
- living cargo;
- suspicious or joke deliveries.

The premise should justify worlds, routes, customers, hazards, mutators, vehicles, side activities, and humor without requiring a complicated story.

## Story direction

A light framework is probably enough:

- humans and monsters share the same broad world;
- the player works for, or possibly manages, a monster-girl delivery company;
- couriers take delivery jobs and occasional odd jobs;
- each route has a small reason to exist;
- customers provide short personality moments and jokes;
- deeper lore should only be added when it improves the game.

The delivery company itself can become the central narrative anchor.

## Tone

MGD can be playful, absurd, self-aware, cute, attractive, and occasionally fanservice-heavy without letting presentation replace gameplay.

A recurring tone idea is that customers find the monster-girl couriers unusual or overwhelming while the couriers treat the situation as a normal workday.

Any sexualized/fanservice character presentation must clearly depict **adult characters**.

## Guardrails for future experiments

- Preserve immediate, readable runner controls as long as possible.
- Prefer ideas that reinforce the **delivery fantasy** over generic feature accumulation.
- Prefer player skill, route choice, cargo rules, and readable trade-offs over stat-heavy progression.
- Prototype major new layers independently before combining them.
- Do not introduce several meta systems at once.
- Mutators/debug tools are cheap ways to test ideas before promoting them into normal gameplay.
- Bad runs should still move some progression forward; good play should create bonus rewards rather than weak play erasing progress.
- Competitive modes should avoid paid-power advantages.

---

# 2. Core run structure and game modes

## EARLY CANDIDATE — Delivery Mode

A strong MGD-specific direction is a main mode built around **finishable deliveries**, not only endless survival.

Example:

```text
Order accepted
→ customer is 1,200 m away
→ run / fly through route
→ dodge hazards and collect rewards
→ reach destination
→ deliver package
→ results / rewards
```

Possible HUD element:

```text
CUSTOMER: 850 m
```

This simultaneously gives the player a gameplay goal and a thematic reason to keep moving.

## EARLY CANDIDATE — Endless Mode

Traditional Endless play should remain available for:

- distance;
- score;
- Coins;
- longest survival;
- Near-Miss chains;
- Delivery Flow;
- character-specific records;
- leaderboards.

## Possible mature mode structure

- **Delivery Mode** — finishable jobs;
- **Endless Mode** — survival/high score;
- **Challenge Mode** — standardized rules/seeds;
- **Delivery Rush** — chained timed deliveries;
- **Event Modes** — temporary rule sets;
- **Arcade / Side Modes** — small experimental games.

## LATER — Delivery Chains

After a successful delivery, an express order could let the player continue:

```text
Delivery complete
→ express order arrives
→ continue?
→ larger chain bonus
→ another delivery
→ cash out or eventually fail
```

A thematic variation is to physically throw/drop the next parcel into the playfield. Catching it starts an **Express Delivery / Bonus Delivery**. Missing it should normally end the chain without harsh punishment.

## LATER — Delivery Rush

- start with a short timer;
- successful deliveries add time;
- continue chaining jobs until time expires;
- separate fast arcade mode from normal endless play.

## End-of-run flow

### Success

Possible sequence:

1. arrive at destination;
2. courier hands over package;
3. customer gives a short reaction/joke;
4. results appear;
5. rewards/unlocks are shown;
6. immediate replay / next job.

Customer scenes should be short and skippable.

### Failure

Avoid a dead static `GAME OVER` screen. Possible fail behavior:

- tumble/slide;
- short ragdoll-like movement;
- broom continues without rider;
- parcel bounces forward;
- remaining distance appears;
- character gives a humorous reaction.

### Results

Possible stats:

- distance;
- delivery time;
- Coins / pickups;
- Near Misses;
- package condition;
- optional objectives;
- Delivery Flow / combo;
- character XP;
- account XP;
- mission progress;
- records;
- delivery rating.

Possible ratings:

- stars;
- C / B / A / S / S+;
- `Perfect Delivery`;
- special badges.

---

# 3. Delivery-specific gameplay systems

These are especially valuable because they make MGD feel different without requiring many new permanent inputs.

## EXPERIMENT — Cargo rules

Different deliveries can alter run priorities while preserving the same controls:

- **Fragile cargo / monster eggs** — avoid hard impacts, preserve condition;
- **Hot food** — temperature/deadline pressure;
- **Refrigerated cargo** — time/environment pressure;
- **Unstable potion** — impacts or excessive movement increase risk;
- **Cursed package** — temporary hazard/world modifier;
- **Living cargo** — can move, escape, or create complications;
- **Explosive cargo** — specific collisions become especially dangerous;
- **Secret delivery** — avoid scanners, guards, enemies, or detection zones.

## EXPERIMENT — Package condition and delivery rating

A delivery can be evaluated by more than distance:

- package condition;
- time;
- pickups;
- Near Misses;
- optional objectives;
- no-damage/no-revive completion;
- Delivery Flow;
- route choice;
- customer-specific requirements.

## EXPERIMENT — Customer requests

Examples:

- “Do not shake the package.”
- “Get here in under 60 seconds.”
- “Avoid electricity.”
- “Use the rooftop route.”
- “Keep package condition above 95%.”

These turn the delivery premise into reusable mission modifiers.

## EXPERIMENT — Risk/reward routes

- branching routes;
- safe route vs dangerous shortcut;
- high-reward Coin route;
- faster route that increases package risk;
- rooftop / street / tunnel / market / sewer choices;
- deadlines that make route choice meaningful.

## EXPERIMENT — Delivery Flow / skill combo

Reward stylish play rather than only survival:

- Near Miss;
- perfect landing;
- clean pickup;
- shortcut use;
- enemy jump/dodge;
- complete Coin line;
- clean package handling;
- Perfect Delivery.

Chain actions into a `Delivery Flow` multiplier that breaks or weakens on mistakes.

## EXPERIMENT — Chase / deadline pressure

Possible alternatives to pure distance pressure:

- deadline approaches;
- mistakes cost time;
- clean play creates breathing room;
- rival courier chase;
- monster chase;
- police/guard chase for special missions;
- customer/story chase sequences.

## EXPERIMENT — Destructible obstacles

- normal state: avoid hazards;
- boost/special state: selected hazards become destructible;
- satisfying reversal where danger becomes something the player can smash through.

## LATER — Runner bosses / set pieces

Boss encounters do not need stop-and-fight combat:

- giant monster chase;
- dragon fire-dodge sequence;
- run → dodge → short attack opportunity → continue;
- authored spectacle embedded inside a normal route.

## LATER — Rare events

Uncommon events can make repeat runs less predictable:

- dragon attack;
- Golden Slime;
- Secret Delivery;
- Monster Parade;
- rare customer;
- rare route portal / special biome;
- unusual cargo event.

---

# 4. Level selection, route structure, world progression, and difficulty

## EARLY CANDIDATE — Delivery World Map

A visible route map could make progression more memorable than a flat numbered level list.

Example:

```text
WORLD 1 — MONSTER CITY

1-1 Apartment District
  ↓
1-2 Shopping Street
  ↓
1-3 Construction Zone
  ├─ 1-4A Rooftop Route
  └─ 1-4B Subway Route
  ↓
1-5 Finale Delivery
```

Possible node types:

- normal delivery;
- express delivery;
- bonus route;
- challenge stage;
- event route;
- Mystery Delivery;
- special customer;
- boss/set-piece delivery.

Useful hierarchy:

```text
City → District → Route → Delivery Target
```

## World progression

Possible structure:

- World 1 — Monster City;
- World 2 — Fantasy District;
- World 3 — Jungle;
- World 4 — Cyber City;
- later seasonal/special worlds.

Each world should contain a manageable level set rather than becoming one giant numbered list.

## Difficulty curve

Difficulty should increase **on average**, not mechanically every single stage.

Prefer waves:

```text
easy
→ medium
→ medium
→ hard
→ playful/special relief
→ medium
→ hard
→ finale
```

Introduce new mechanics safely before combining them with multiple other hazards.

Possible danger display:

```text
★☆☆☆☆
★★★☆☆
★★★★★
```

or:

- Easy Route;
- Normal Route;
- Dangerous;
- Extreme.

Prefer route-specific intended difficulty over multiplying every level into Easy/Normal/Hard versions unless testing proves otherwise.

## LATER — Optional hardcore routes

Possible conditions:

- no-hit;
- speed target;
- no revive;
- difficult Coin line;
- Perfect Delivery;
- fixed movement modifier;
- high Near-Miss requirement.

Possible rewards:

- badge;
- banner;
- title;
- trail;
- artwork;
- leaderboard placement.

## EXPERIMENT — Authored + procedural hybrid

Likely stronger than either extreme:

```text
Rooftop Delivery
Distance: 1,600 m
Primary mechanic: vents
World: Monster City
```

Keep an authored route identity and set pieces, while controlled systems vary:

- hazard patterns;
- Coin patterns;
- bonus objects;
- enemy placement;
- Mystery Packages;
- optional paths.

This preserves replayability without making every route feel like anonymous procedural noise.

## LATER — Daily / weekly standardized challenge routes

Use fixed seeds and normalized rules so everyone plays comparable content.

Example:

```text
WEEKLY DELIVERY #37
World: Cyber City
Character: Demon Girl
Distance: 2,500 m
Modifier: Gravity Flip
Seed: identical for everyone
```

---

# 5. Movement modes, vehicles, mounts, and gameplay mutators

## CORE PRINCIPLE — Keep permanent controls small

> **Do not give the player twenty permanent mechanics. Temporarily change what a few simple inputs mean.**

## Base flight variants

Possible presentation variants for similar movement:

- jetpack;
- witch broom;
- wings;
- magical propulsion;
- hover device.

## EXPERIMENT — Running mode

Possible actions:

- jump;
- slide;
- duck;
- short rail/pipe slide.

Possible hazards:

- crates;
- holes;
- lasers;
- cats/dogs;
- construction workers;
- pipes;
- traffic;
- machinery.

## EXPERIMENT — Temporary movement modes

- Gravity Flip;
- water / jetski physics;
- pogo stick;
- giant bouncing ball;
- high-speed Hyper Delivery;
- short low-gravity or super-speed sections.

## EXPERIMENT — Monster transformations

Temporary forms:

- rolling ball;
- slime;
- dragon;
- bat;
- ghost;
- rocket-like form.

## EXPERIMENT — Monster mounts

- Slime — large bounce / high jumps;
- Harpy — temporary flight behavior;
- Centaur — very high speed / harder control;
- Spider — wall/ceiling traversal;
- Dragon — rare high-power chaos section;
- dinosaur;
- large fantasy bird;
- dolphin;
- giant wolf;
- mechanical creature.

## EXPERIMENT — Vehicles

- helicopter;
- motorcycle;
- hoverbike;
- jetski;
- minecart;
- delivery drone;
- spaceship;
- submarine;
- mech;
- flying taxi.

The monster girls are a central visual attraction, so vehicles should avoid hiding them completely whenever practical.

Temporary vehicles can also function as an extra hit/protection layer. Losing one should grant a short safety/orientation window rather than causing an immediate second failure.

## EXPERIMENT — Mutator / Test Lab

Useful internal modifiers can later become challenge content:

- super speed;
- low gravity;
- bouncy world;
- giant/tiny player;
- exploding Coins;
- no floor;
- double delivery;
- monster-heavy run;
- restricted route types.

Implement useful mutators as testing tools first; only promote fun combinations into official modes.

---

# 6. Worlds, biomes, atmosphere, and seasonal events

Worlds should feel strongly different while reusing the same underlying systems.

## Candidate worlds / districts

### Monster City

- apartments;
- shopping streets;
- rooftops;
- alleys;
- traffic;
- construction zones;
- cafés/signage.

### Fantasy / Dungeon

- castles;
- villages;
- taverns/guilds;
- traps;
- dragons;
- magic;
- dungeon customers.

### Cyber Monster / Cyberpunk

- neon;
- holograms;
- hover traffic;
- drones;
- megacorporations;
- robots;
- rain;
- data deliveries.

### Jungle / Mushroom Forest / Dragon Highlands

- ruins;
- rivers;
- vines;
- temples;
- giant mushrooms;
- glowing plants;
- cliffs;
- volcanoes;
- dragon nests.

### Robot Factory

- conveyor belts;
- lasers;
- crushers;
- pistons;
- robots.

### Candy World

- candy;
- cake;
- chocolate;
- pastel scenery;
- cute absurd hazards.

### Beach District / Summer

- sand;
- sea;
- palms;
- promenade;
- water;
- beach businesses;
- jetski sections.

### Snow City / Winter

- snow;
- ice;
- mountains;
- warm windows;
- winter lights;
- snowmen.

### Haunted District

- gothic buildings;
- graveyards;
- fog;
- ghosts;
- bats;
- haunted houses.

### Demon District

- lava;
- demonic architecture;
- occult signage;
- infernal shops;
- clubs/neon;
- demon bureaucracy jokes.

### Slime Sewers

- pipes;
- industrial structures;
- water;
- slime;
- underground routes.

### Monster Academy

- school/university;
- dorms;
- campus;
- sports areas;
- magical experiments.

### Space Delivery

- orbital stations;
- asteroids;
- alien districts/planets;
- sci-fi infrastructure;
- spaceships.

## LONG TERM — Time travel

Potential story device to justify radically different eras:

- Stone Age;
- Bronze Age;
- antiquity;
- medieval;
- Wild West;
- modern era;
- cyberpunk future;
- distant space future.

## EXPERIMENT — Dynamic weather / atmosphere

- rain;
- storm;
- night;
- fog;
- wind;
- supernatural/monster moon.

Start as visual variety; only add gameplay effects if they remain readable and fair.

## LATER — Seasonal events

Possible calendar themes:

- New Year;
- Lunar New Year;
- Valentine’s Day;
- Saint Patrick’s Day;
- Easter;
- Summer;
- Halloween;
- Winter;
- Christmas;
- Anniversary.

Events can modify:

- map decoration;
- missions;
- cosmetics;
- music;
- hazards;
- collectibles;
- temporary modes;
- customers;
- rewards.

### Summer examples

- beach;
- summer outfits for adult characters;
- sunglasses;
- water pistols;
- beach balls;
- sunscreen jokes;
- dolphins;
- jetski mode.

### Winter examples

- snowball fights;
- snowmen;
- Santa-inspired outfits;
- Christmas trees/lights;
- presents;
- reindeer mount;
- sleigh section;
- ice physics.

---

# 7. Characters, customization, cosmetics, and player expression

## LATER — Character customization surfaces

Possible categories:

- full outfits;
- chromas / color variants;
- hats;
- glasses;
- hair accessories/colors;
- jewelry;
- shoes;
- Delivery Bags;
- wings;
- horn/tail decorations;
- charms;
- trails;
- auras;
- pickup effects;
- start/spawn effects;
- crash/fail effects;
- victory poses;
- emotes.

## CORE PRINCIPLE — Not every cosmetic needs to be a full skin

Full animated outfits are expensive. MGD can create much more reward volume from cheaper collectible surfaces:

```text
MONSTER GIRL
├─ Outfit
├─ Chroma / colors
├─ Accessories
├─ Delivery Bag
├─ Broom / mount appearance
├─ Trail / aura
├─ Start VFX
├─ Pickup VFX
├─ Crash VFX
├─ Emote
└─ Victory pose

PROFILE
├─ Avatar
├─ Banner / name card
├─ Frame
├─ Title
├─ Badge
└─ Sticker / stamp

COMPANION
├─ Skin / color
├─ Hat / accessory
├─ Trail
└─ cosmetic mutation

DELIVERY HQ
├─ Furniture
├─ Posters
├─ Trophies
├─ Wallpaper / floor
├─ Toys
└─ seasonal decoration
```

## Chromas

High-value low-cost variants for:

- outfits;
- hair;
- wings/horns;
- Slimes;
- brooms;
- Delivery Bags;
- Companions;
- seasonal/neon variants.

## Profile cosmetics

Potential elements:

- Monster Girl / Companion avatar;
- portrait frame;
- banner / name card;
- title;
- mastery/event badge;
- selected achievements;
- favorite Monster Girl / Companion.

Possible titles:

- Delivery Rookie;
- Professional Courier;
- Speed Demon;
- Package Destroyer;
- Slime Enjoyer;
- Certified Witch;
- Definitely Not Lost;
- Near-Miss Addict;
- Employee of the Month.

## Stickers / delivery stamps

Can appear on:

- profiles;
- Delivery Bags;
- packages;
- HQ walls;
- results;
- future social systems.

## Trails / auras

Trails are especially valuable in a runner because the player sees them constantly.

Possible trails:

- rainbow;
- hellfire;
- hearts;
- stars;
- ghosts/bats;
- bubbles;
- snow;
- candy;
- slime;
- electricity;
- sakura petals;
- cyber pixels.

## Pickup / Coin cosmetics

Change visual/audio feedback while preserving identical gameplay values.

Possible styles:

- gold Coin;
- heart;
- candy;
- pumpkin;
- snowflake;
- star;
- delivery stamp;
- themed sparkle/sound.

## Start / fail / victory presentation

Start effects:

- teleport portal;
- demon fire;
- witch circle;
- lightning strike;
- slime splash;
- drone drop;
- confetti.

Fail effects:

- ghost leaves character;
- confetti explosion;
- slime splash;
- cartoon stars;
- scattered packages;
- smoke cloud;
- seasonal effect.

Victory poses:

- peace sign;
- salute;
- pose with package;
- exhausted collapse;
- sunglasses;
- selfie;
- hold Companion;
- seasonal pose.

## Delivery Bag cosmetics

A particularly strong MGD-specific cosmetic surface:

- standard courier bag;
- pizza bag;
- demon bag;
- Slime backpack;
- Mimic bag;
- aquarium bag;
- cyber bag;
- Christmas sack;
- school backpack.

## Package skins

- cardboard box;
- gift wrap;
- pizza box;
- suspicious joke parcel;
- Mimic box;
- Valentine’s package;
- Halloween pumpkin box;
- Christmas present;
- robot parcel.

Cosmetic appearance must never hide real cargo-rule information.

## Broom / mount / vehicle skins

Examples:

- classic witch broom;
- neon broom;
- demon broom;
- Christmas broom;
- ridiculous vacuum cleaner;
- giant paintbrush.

## UI / phone cosmetics

- UI themes;
- menu backgrounds;
- loading artwork;
- in-game phone wallpaper/case;
- notification sound;
- home-screen theme.

## Relative production-cost ladder

| Cosmetic category | Relative effort | Value |
|---|---:|---|
| Titles | Very low | Text-only prestige/humor |
| Profile icons / badges | Very low | High collection volume |
| Banners / frames | Very low–low | Visible in rankings/profile |
| Stickers / stamps | Low | Large collectible sets |
| Chromas | Low | Reuses existing art |
| Trails / simple VFX | Low | Visible throughout runs |
| Package skins | Low | Strong delivery identity |
| Companion colors/accessories | Low | High combinatorial variety |
| HQ posters/decor | Low–medium | Supports collection/cozy layer |
| UI themes | Low–medium | Account personalization |
| Character accessories | Medium | Requires placement/anchors |
| Emotes / victory poses | Medium | Requires animation |
| Broom/mount skins | Medium | Larger gameplay-visible asset |
| Full outfits | High | Must support character animation |
| Premium skin + custom VFX/animation | Very high | Large content package |

Suggested broad production order:

```text
Profile icons / titles / badges
→ banners / stickers
→ trails / simple VFX
→ package / Delivery Bag skins
→ Companion cosmetics
→ HQ decoration
→ Character accessories
→ emotes / poses
→ full outfits
→ premium high-production skins
```

---

# 8. Gallery, Character Viewer, artwork, and character-care interactions

## EARLY/LATER — Gallery

Possible content:

- character art;
- event art;
- delivery scenes;
- customer scenes;
- collectible photos;
- concept art;
- special animations;
- world illustrations.

## LATER — Locker Room / Character Viewer

Possible functions:

- choose character;
- change outfit/accessories/chroma;
- select Delivery Bag;
- preview trails/auras;
- view animations;
- select pose;
- change background;
- inspect Gallery art;
- take screenshots.

This creates a calm counterpoint to the runner.

## LONG TERM — Character Care / Cleanup

After selected special deliveries, a courier can return:

- muddy;
- dusty;
- soot-covered;
- wet;
- sandy;
- slimed;
- snow-covered.

Optional interaction:

- wipe;
- soap/rinse;
- dry;
- brush hair;
- clean equipment;
- remove debris.

Possible loop:

```text
Run
→ character returns messy
→ short care interaction
→ restored presentation
→ artwork / bonus reward
```

Do not make this mandatory after every short run.

## LONG TERM — Artwork Reveal minigames

Important rule:

> **The artwork is already earned. The reveal is a celebration, not a gate that can permanently deny the reward.**

Possible reveals:

- wipe/clean;
- scratch-card reveal;
- jigsaw puzzle;
- optional sliding puzzle;
- Polaroid/photo development;
- package/gift opening;
- sand brushing;
- snow/ice scraping;
- slime peeling;
- fog clearing;
- magic seal/crystal breaking;
- cyber decrypt/glitch-clean;
- leaf/vine clearing;
- mechanical panel opening.

Timed performance can give a small bonus, but the reward itself should remain obtainable.

---

# 9. Companions, builds, progression, achievements, and collectibles

## LATER — Companion / mini-pet system

Possible Companions:

- Mini Dragon;
- Slime;
- Bat;
- Ghost;
- fantasy bird;
- Mimic;
- Mini Dino;
- robot;
- living package;
- tiny demon;
- magical Delivery creature.

Companions should have personality even without gameplay power.

Possible reactions:

- celebrate pickups;
- panic during Near Misses;
- react to crashes;
- play with courier at finish;
- hide from hazards;
- react to specific worlds/events.

## CORE PRINCIPLE — Cosmetic first, utility second

Avoid making players choose an unattractive pet only because it grants the strongest stat bonus.

If gameplay effects exist, prefer small understandable utility perks:

- slightly larger pickup radius;
- occasional missed-Coin recovery;
- small XP bonus;
- longer power-up duration;
- extra mission progress;
- warning for one hazard type;
- one small utility action per run.

Avoid large raw speed/damage/score advantages.

## Companion skill examples

- **Coin Slime** — narrowly recovers a missed Coin;
- **Bat** — warns about selected hazards;
- **Mini Dragon** — slightly extends a power-up;
- **Mimic** — small chance to improve a pickup reward;
- **Fairy / Spirit** — refreshes a limited buff under specific conditions;
- **Delivery Drone** — occasionally retrieves a distant collectible.

## LATER — Mystery Egg

Possible unlock flow:

```text
Welcome Package
→ Mystery Egg
→ complete several runs / care actions
→ egg cracks
→ Companion hatches
```

Possible first pool:

- Slime;
- Bat;
- Ghost;
- Mini Dragon;
- bird;
- Mimic.

Adult Monster Girls should not literally hatch from the same pet egg system. If a tiny courier representation is desired, use a magical/digital Chibi concept such as Pocket Courier, Courier Spirit, or holographic Mini Courier.

## LONG TERM — Companion care

Possible actions:

- feed;
- pet;
- wash;
- brush;
- play;
- sleep;
- toys;
- habitat decoration;
- tiny minigames.

Avoid punitive old-school virtual-pet behavior such as permanent death or severe penalties for not logging in.

## LONG TERM — Companion growth / evolution

Possible progression:

```text
Egg
→ Baby Companion
→ Companion
→ evolved form
→ rare cosmetic variant / mutation
```

Evolution could reflect play history:

- Beach use → Water Slime;
- Cyber City use → Cyber Slime;
- many Near Misses → risk/devil variant;
- winter event → Snow variant.

Seasonal examples:

- Halloween: Pumpkin Slime, Tiny Ghost, Vampire Bat;
- Winter: Christmas Slime, Mini Reindeer, Present Mimic;
- Summer: Crab, Mini Dolphin, Watermelon Slime;
- Lunar New Year: Mini Dragon.

## LONG TERM — Trait extraction

Potential flow:

```text
Companion Trait
+ Extraction Chip
→ Trait / Skill Essence
→ equip or transfer elsewhere
```

Anti-frustration rule:

> **Do not casually destroy a beloved Companion to extract a Trait.**

Possible implementations:

- copy Trait;
- consume a duplicate instead of the original;
- require Coins + item;
- create a reusable Skill Chip/Essence.

## LONG TERM — Companion fusion

Same-species progression:

```text
Slime ★ + Slime ★ → Slime ★★
```

Possible benefits:

- extra Trait slot;
- higher progression cap;
- cosmetic evolution;
- small utility improvement.

Trait inheritance:

```text
Slime — Coin Magnet
+
Dragon — Power-up Duration
→ resulting Companion inherits selected Trait(s)
```

Very ambitious hybrid visuals might include Dragon Slime / Bat Slime / Cyber Ghost / Mimic Dragon, but this has a high art cost.

## LONG TERM — Character Skills / Support Items

Possible loadout:

```text
Monster Girl
├─ Character Skill
├─ Passive
├─ Companion
├─ Support Item 1
├─ Support Item 2
└─ optional Support Item 3
```

Possible Support Items:

- Delivery Bag upgrade;
- Coin Magnet;
- Lucky Charm;
- Package Stabilizer;
- boots;
- wing charm;
- ring;
- mission booster;
- power-up extender.

Prefer understandable sidegrades over MMO-style stat spreadsheets.

### Example builds

- Coin build;
- Endless survival build;
- score/Near-Miss build;
- mission build.

## EXPERIMENT — Character gameplay quirks

If characters ever differ mechanically, keep differences small:

- slower fall / improved aerial control;
- one crash protection;
- slightly larger pickup radius;
- route-specific interaction;
- longer boost duration;
- unique traversal sidegrade.

## LONG TERM — Ability fusion instead of consuming Monster Girls

Do not build a loop where named characters are consumed as duplicate upgrade material.

A safer experiment is combining abilities/support traits:

```text
Shield + Near-Miss Skill
→ Danger Shield
```

or:

```text
Bounce Skill + Coin Pickup
→ Golden Bounce
```

Temporary transformation/fusion forms can also work as short gameplay mutators without permanently merging characters.

## Achievements

Examples:

- deliver 100 packages;
- perform 100 Near Misses;
- travel 1 km upside down;
- complete a no-hit route;
- catch bonus packages;
- repeatedly serve a memorable customer;
- hatch first Companion;
- discover rare Companion variant;
- first Trait extraction;
- first Fusion;
- seasonal challenges.

Possible rewards:

- title;
- badge;
- frame;
- icon;
- Coins;
- cosmetic;
- artwork;
- Companion accessory.

## Collectibles

Possible categories:

- character cards;
- photos/artwork;
- delivery stickers;
- world souvenirs;
- badges;
- cosmetics;
- Companions/variants;
- plushies;
- event tokens;
- trophies;
- Toys;
- Trait/Skill items.

World-specific souvenirs can reinforce exploration.

## Character mastery

Each Monster Girl could have a personal progression track rewarding:

- badge;
- portrait frame;
- title;
- icon;
- banner;
- sticker;
- emote;
- pose;
- artwork;
- accessory;
- later-approved sidegrade/support unlock.

## Account progression

Possible XP sources:

- runs;
- deliveries;
- missions;
- achievements;
- events;
- challenges;
- Companion activities.

Possible rewards:

- Coins;
- Mystery Packages;
- frames/titles;
- Gallery rewards;
- Companion Egg;
- Extraction/Fusion item.

## Hardcore skill ceiling

Simple controls can still support mastery through:

- no-hit deliveries;
- perfect routes;
- speedruns;
- long Near-Miss chains;
- high Delivery Flow;
- weekly fixed challenges;
- Endless leaderboards;
- character-specific records.

---

# 10. Economy, rewards, loot, shops, and monetization

## LATER — Coins

Normal earnable currency.

Possible sinks:

- cosmetics;
- Mystery Packages;
- minigames/arcade;
- character gifts;
- Companion food/toys;
- Extraction Chips;
- Fusion Batteries;
- Support Items;
- event shops;
- HQ upgrades;
- deterministic unlocks.

A useful economy needs fun Coin sinks so accumulated currency stays meaningful.

## LONG TERM — Extraction items

Possible names:

- Extraction Chip;
- Trait Extractor;
- Essence Capsule;
- Skill Scanner.

Example:

```text
Trait Extraction
Cost: 500 Coins
Item: 1× Extraction Chip
→ copy selected Trait
→ create Skill Essence / Trait Chip
```

## LONG TERM — Fusion Battery / Reactor

Begin with one battery type rather than item-tier bloat.

Possible sources:

- Coins;
- Daily/Weekly Mission;
- Mystery Package;
- Achievement;
- Event reward;
- Companion progression.

Possible HQ machine:

```text
Companion A
+
Companion B / Trait
+
Fusion Battery
→ Reactor animation
→ result
```

Humorous signs:

- `DO NOT INSERT COURIERS`;
- `98.7% SAFE`;
- `WARRANTY VOID IF REALITY TEARS`.

A visual “failure” should still return a valid result; comedy should not destroy valuable progress.

Possible later Reactor upgrades:

- basic Fusion;
- preserve one Trait;
- preserve more inheritance info;
- rare hybrid/mutation options.

## LATER — Mystery Packages / loot-like rewards

Possible names:

- Mystery Package;
- Mystery Delivery;
- Lost Parcel;
- Premium Parcel;
- Monster Box.

Possible contents:

- Coins;
- icons;
- stickers;
- trails;
- banners;
- badges;
- accessories;
- artwork;
- cosmetics;
- Companion Eggs;
- Companion accessories;
- Extraction Chips;
- Fusion Batteries.

Early versions should treat these primarily as **earnable gameplay rewards**.

## LATER — Gifts

Player gifts:

- daily gift;
- anniversary reward;
- event gift;
- achievement package.

Character gifts:

- food;
- flowers;
- games;
- plushies;
- souvenirs;
- character favorites.

Companion gifts:

- food/treats;
- toys;
- accessories;
- habitat decoration.

## LATER — Shops

Possible sections:

- Coin Shop;
- Cosmetic Shop;
- rotating shop;
- Event Shop;
- Delivery Token Shop;
- Character Gift Shop;
- Companion Shop;
- Extraction/Fusion supplies;
- Support Item Shop;
- premium Cosmetic Shop.

## LONG TERM — Premium currency

Possible uses if ever needed:

- premium cosmetics;
- optional convenience/time-saving;
- event items;
- special shop purchases.

Not needed for the early game.

## LONG TERM — Gacha / random paid rewards

Optional, not required.

If ever used, cosmetic-focused gacha is preferable to random paid power.

Player-friendly building blocks:

- rarity;
- featured banners;
- pity;
- guarantees;
- duplicate conversion;
- selector/spark;
- wishlist;
- free tickets;
- reruns;
- earnable pulls;
- carry-over pity where appropriate.

If Companions ever enter random reward systems, random premium pulls should not become the only viable source of competitive abilities.

Real-money random rewards create legal, rating, platform, and trust concerns and should only be considered much later, if at all.

## Monetization principle

Prefer:

- cosmetics;
- optional convenience;
- time-saving;
- optional rewarded ads only if explicitly approved later;
- cosmetic seasonal passes.

Avoid paid power as the main path to leaderboard success.

---

# 11. Dailies, seasons, rankings, and community systems

## LATER — Daily login rewards

Example sequence:

| Step | Example reward |
|---|---|
| 1 | Coins |
| 2 | More Coins |
| 3 | Small Mystery Package |
| 4 | Coins + XP |
| 5 | Ticket / Extraction Chip |
| 6 | Rare Package |
| 7 | Epic Mystery Delivery / Companion Egg |

Prefer not to reset the entire sequence because one real-world day was missed.

## LATER — Daily missions

Examples:

- deliver 3 packages;
- collect 500 Coins;
- fly 2,000 m with a broom;
- perform 20 Near Misses;
- use a vehicle;
- play a specific character;
- catch a bonus package;
- finish without damage;
- feed/play with a Companion.

A free daily reroll can reduce frustration.

## LATER — Weekly missions

Larger objectives with milestone rewards.

## LONG TERM — Rankings

Possible leaderboards:

- Endless distance;
- high score;
- fastest delivery;
- most Coins;
- longest Near-Miss chain;
- Delivery Flow;
- weekly challenge;
- character-specific score;
- friends-only ranking.

Possible leagues:

- Bronze;
- Silver;
- Gold;
- Platinum;
- Diamond;
- Master.

Prestige rewards should mostly be cosmetic/status items:

- frame;
- badge;
- title;
- banner;
- icon;
- Companion cosmetic.

## Competitive normalization

Serious skill rankings should not be decided by owned power:

```text
Normal Delivery / Endless
→ personal builds allowed

Weekly Ranked Challenge
→ Character fixed or normalized
→ Companion fixed/disabled
→ Support Items fixed/disabled
→ identical seed
```

## LONG TERM — Global community events

Example:

```text
GLOBAL DELIVERY EVENT
10,000,000 deliveries total

1M  → Coins
3M  → Mystery Package
5M  → Event Artwork
10M → Special Cosmetic
```

Character/team variants could let players support favorite Monster Girls or Companion species.

## LONG TERM — Battle Pass / seasonal track

Only once enough content exists.

Possible rewards:

- Coins;
- tickets;
- icons;
- stickers;
- trails;
- banners;
- artwork;
- Companion cosmetics;
- HQ decorations;
- outfits.

A branching structure or ability to revisit old passes may be more player-friendly than rigid permanent FOMO.

---

# 12. Delivery HQ, cozy play, management, relationships, and side activities

## LONG TERM — Delivery HQ as a physical menu

Possible rooms:

- reception;
- warehouse;
- garage;
- Locker Room;
- Gallery;
- arcade;
- café;
- Character rooms;
- Companion room;
- Fusion Reactor / Lab;
- event plaza;
- toy/cosmetic shop.

A compact HQ can make the world feel alive without becoming a giant open world.

## Simple NPC routines

Example:

- morning: Harpy at café;
- afternoon: Harpy working;
- evening: Harpy at arcade.

A few routines can create life without hundreds of NPCs.

## LONG TERM — Odd jobs

Possible short minigames:

- warehouse package sorting;
- café timing game;
- garage repair;
- cleaning shift;
- Carnival shift;
- fishing;
- moving job;
- pet sitting;
- warehouse security.

## LONG TERM — Management layer

Possible systems:

- recruit couriers;
- assign couriers to jobs;
- upgrade HQ;
- unlock regions;
- buy vehicles;
- decorate rooms;
- improve Companion facilities;
- upgrade Fusion Lab;
- expand garage/warehouse;
- collect passive company rewards.

## Cozy / low-pressure activities

- decorate rooms;
- talk to Characters;
- sit around;
- care for Companions;
- fish;
- collect objects;
- use arcade machines;
- take photos;
- inspect trophies;
- give gifts;
- do small errands.

The player should sometimes be allowed to do things simply because they are enjoyable.

## LONG TERM — Bond / relationship layer

A lightweight Bond system can precede any dating-sim concept:

```text
Use Character
→ earn Bond XP
→ give gifts
→ unlock dialogue
→ unlock small scenes
→ unlock artwork / emotes / poses
```

A full romance system is a separate future design decision.

## LONG TERM — Pocket Courier

In-world Chibi/virtual-pet device:

- feed;
- sleep;
- decorate tiny room;
- tiny outfits;
- minigames;
- automatic mini deliveries;
- small rewards.

Possible idle-style loop:

```text
send Pocket Courier on small job
→ continue playing / close game
→ return later
→ tiny delivery complete
→ Coins / sticker / souvenir / pet item
```

Avoid punishing players for not checking constantly.

## EXPERIMENT — Auto mode

Potential use:

- accessibility;
- previously completed easy deliveries;
- Pocket Courier jobs;
- passive company activity.

Main risk: if automatic play provides the same value as active play, it undermines the runner. Keep it secondary.

---

# 13. Minigames, carnival, arcade, and simulator-inspired activities

The side-activity layer can become a small **toybox** around the runner. Keep activities short, optional, and cheap rather than turning MGD into many full-size games.

## Carnival / festival ideas

### Dunk Tank / Bullseye

Throw at a target to drop a Monster Girl into water. Character-specific reactions provide humor.

### Tomato Throw

Slapstick target game with dodges, counters, and rigged-booth jokes.

### Rigged games

Possible jokes:

- target moves at last second;
- hoop is too small;
- claw drops plushie before exit;
- ring-toss peg bends away;
- operator says a valid win “doesn’t count.”

Possible rewards:

- plushies;
- tiny accessories;
- stickers;
- gifts;
- Companion toys;
- Carnival badges;
- artwork;
- souvenirs.

## EXPERIMENT — Physics launcher parody

“Courier Emergency Launch Training” using broad slingshot/physics principles.

Possible character physics:

- Slime sticks;
- Dragon is heavy/destructive;
- Harpy steers slightly;
- Ghost passes through one obstacle;
- bouncing character rebounds strongly.

Borrow broad mechanics, not protected characters/layouts/branding.

## Simulator-inspired micro activities

Borrow the satisfying 30–90 seconds of simulator fantasies:

### Cleaning

- clean courier;
- clean vehicle;
- remove soot/slime;
- wash Companion;
- restore an object to 100% clean.

### Unpacking / organizing

- open Mystery Package;
- unpack collectibles;
- sort shelves;
- decorate room;
- unpack warehouse stock;
- set up Companion habitat.

### Mechanic / workshop

```text
find broken part
→ unscrew
→ replace
→ clean
→ test
```

Targets could include broom, jetpack, jetski, drone, motorcycle, odd monster vehicle, or Fusion Reactor component.

### Logistics / transport-company layer

- choose job;
- choose courier;
- unlock region;
- own vehicles;
- improve company;
- plan special delivery;
- actual gameplay still leads into normal runner.

## Classic arcade cabinet ideas

Original MGD-themed implementations of familiar mechanics:

- **Package Blocks** — falling-block package stacker;
- **Slime Breaker** — brick-breaker style;
- **Demon Pong** — fireball paddle game;
- **Asteroid Delivery** — drone dodging hazards;
- **Lamia Snake** — snake-style game;
- **Road Crossing Delivery** — traffic crossing;
- **Crane / Claw Machine** — plushie/gift rewards.

Possible rewards:

- high-score badges;
- Arcade Tokens or Coins;
- plushies;
- stickers;
- cosmetics;
- Companion toys;
- achievements.

A major advantage: the arcade can grow one cheap cabinet at a time.

## Economy as world activity

Example loop:

```text
Delivery
→ earn Coins
→ spend at Arcade/Carnival
→ win Plushie
→ give Plushie to Character
→ Bond rises
→ unlock Artwork
```

This is more memorable than every system being a flat menu.

---

# 14. Smartphone-specific interactions

Phone features should generally be optional extras rather than mandatory precision controls.

## EXPERIMENT — Gyroscope / tilt

Possible uses:

- artwork parallax;
- balance a tray;
- fragile potion balance;
- steer a small vehicle;
- marble/labyrinth minigame;
- liquid balancing;
- claw machine;
- subtle Character Viewer motion;
- Companion toy minigame.

Continuous gyro motion in the main runner may hurt readability, precision, and comfort.

## EXPERIMENT — Device rotation

- landscape → portrait artwork reveal;
- rotate device to tighten a screw;
- rotate puzzle object;
- absurd room-spin scene;
- event interaction.

## EXPERIMENT — Microphone / blowing

Always provide a touch fallback.

Possible uses:

- blow out candles;
- clear condensation;
- make wind for Harpy;
- put out fire;
- dry hair after cleanup;
- inflate balloon;
- Companion toy;
- joke where demon fire gets worse.

## Haptics

High-value polish for:

- package landing;
- bullseye;
- puzzle snap;
- screw lock;
- Mystery Package opening;
- egg cracking;
- Fusion Reactor;
- landing;
- scratch-card reveal;
- Coin streak;
- crash / Near Miss.

## Camera / other sensors

Only if they add real value:

- photo-mode overlays;
- AR-style novelty;
- motion gestures;
- optional local notifications.

Avoid unnecessary permission-heavy gimmicks.

---

# 15. Alternative runner formats and possible spin-offs

The main MGD runner should remain the first game to make fun:

- landscape;
- side view;
- one-touch flight/broom/jetpack-style control;
- delivery framing.

A portrait 3-lane or behind-the-back runner is effectively another game system, not a tiny movement modifier.

Best places for these ideas:

1. Event Mode;
2. Arcade side game;
3. experimental prototype;
4. later standalone spin-off.

## LONG TERM — Portrait 3-lane runner

Possible theme: **Monster Metro Delivery**.

- portrait;
- auto-forward;
- three lanes;
- swipe lane change;
- jump/slide;
- Coins;
- escalating speed.

Possible hazards:

- vans;
- market stalls;
- bins;
- construction barriers;
- trains;
- robots;
- NPCs;
- animals;
- rival couriers.

## Genre-parody arcade variant

Potential joke cabinet names:

- `Definitely Not Subway Monsters`;
- `Temple Delivery`;
- `Infinite Coin Line Simulator`.

Parody broad genre conventions without copying exact branded content.

## LONG TERM — Behind-the-back runner

Possible theme: **Dungeon Escape Delivery**.

- portrait;
- camera behind character;
- side/lane movement;
- jump/slide;
- turns/gaps;
- collapsing paths;
- chase pressure.

## EXPERIMENT — Hyper Delivery

High-speed special route/mutator:

- extreme speed;
- ramps;
- springs;
- loops/set pieces;
- boost pads;
- large Coin arcs;
- flow-focused play.

Likely better as a special stage than a separate permanent game.

## EXPERIMENT — Puzzle-runner variants

- cut ropes/chains;
- redirect package trajectory;
- move platforms;
- switches;
- guide Delivery object to courier.

## LONG TERM — MGD Runner Collection / spin-off

Possible arcade labels:

- Monster Metro;
- Temple Delivery;
- Slime Dash;
- Demon Highway;
- Space Courier;
- Snow Rush.

A polished alternate mode could later become its own game, e.g. **Monster Girl Delivery Rush**, only after the main MGD proves itself.

---

# 16. Art direction and visual language

## Candidate broad direction

A strong direction to explore is:

> **Anime / chibi monster girls + clean cartoon environments + light cyber/fantasy delivery identity + modular 2D assets + parallax + strong VFX.**

The game should not require extreme detail to look polished. Prefer:

- strong silhouettes;
- readable shapes on mobile;
- controlled palettes;
- animation/secondary motion;
- strong feedback VFX;
- consistent shape language;
- world-specific UI;
- a small set of high-quality reusable assets.

## Art-style candidates

### Clean Cartoon — strong base candidate

Characteristics:

- medium/thick outlines;
- limited colors per object;
- clean silhouettes;
- moderate detail density;
- exaggerated shapes;
- expressive characters.

Advantages:

- mobile readability;
- easier animation;
- smaller assets;
- easier consistency;
- easier mixing of artist-created and AI-assisted assets.

### Anime / Chibi characters

Possible traits:

- larger heads;
- compact bodies;
- strong expressions;
- exaggerated silhouette-defining monster features.

Examples:

- dragon horns/tail;
- cat ears;
- obvious Slime body treatment;
- demon wings/horns;
- Harpy wings.

### Sticker style

Useful supporting treatment for:

- pickups;
- portraits;
- rewards;
- stickers;
- collectibles;
- UI illustrations.

A consistent border can visually unify internally different assets.

### Pixel art

Useful for prototyping, but not yet the default final direction.

Risks:

- strict pixel scale consistency;
- animation labor;
- device-density/scaling care;
- AI-assisted production harder to keep pixel-perfect.

Prefer HD cartoon/vector-like 2D unless testing proves pixel art gives MGD a substantially stronger identity.

## Gameplay visual grammar

### Danger

- sharper shapes;
- stronger contrast;
- warning colors where appropriate;
- aggressive motion;
- clear anticipation.

### Reward

- rounder shapes;
- bright highlights;
- sparkle/bounce/pulse;
- strong separation from hazards.

### Interactive objects

- stronger outline/contrast;
- subtle idle motion;
- clean separation from background.

### Background

- lower contrast;
- reduced saturation when useful;
- fewer tiny details around the play lane.

The player, hazards, pickups, and targets must never disappear into scenery.

## Visual hierarchy / render layers

Suggested conceptual stack:

1. Sky / gradient / atmosphere;
2. distant background environment;
3. mid/near environment and gameplay geometry;
4. characters / enemies / pickups / delivery targets;
5. FX / foreground accents / UI.

The highest-attention elements should be the ones that matter for immediate decisions.

## UI direction

Possible identity:

> **Monster courier app + fantasy guild interface + modern delivery-service UI.**

Possible elements:

- order number;
- customer portrait/species;
- parcel type;
- route/distance;
- package condition;
- deadline;
- tip/reward;
- special handling instruction;
- district marker.

Example tone:

```text
ORDER #666
Customer: Succubus
Cargo: Love Potion
Condition: 96%
Tip: 120 G
```

This makes the delivery fantasy visible during normal play rather than only in story text.

---

# 17. Art production, modular assets, backgrounds, and technical art

## CORE PRINCIPLE — Reuse by design

> **Prefer 20 excellent reusable assets over 200 mediocre one-off assets.**

Design the asset pipeline around reuse from the beginning rather than treating optimization as a cleanup task.

## Modular environment kits

Avoid giant baked backgrounds or unique art for every route segment.

Example city kit:

- `wall_base`;
- `wall_window`;
- `wall_pipe`;
- `wall_neon`;
- `wall_damage`;
- `floor_base`;
- `floor_grate`;
- `floor_crack`;
- `background_building_a`;
- `background_building_b`;
- `prop_trash`;
- `prop_sign`;
- `prop_aircon`.

A biome may feel complete with roughly 10–20 strong pieces plus variations and landmarks.

## Tiling / image patterns

Instead of a giant `road_5000px.png`, use:

- `road_base`;
- `road_edge`;
- `road_crack_01`;
- `road_crack_02`;
- `road_puddle`;
- `road_marking`.

Variation tools:

- tiling;
- mirroring;
- tinting;
- scale variation within safe limits;
- positional offsets;
- overlay decals;
- prop swaps;
- optional empty segments.

## Repetition hiding

Use varied pattern groups, e.g.:

- A = tree + rock;
- B = sign;
- C = bush + trash;
- D = pipe;
- E = empty space.

Combine them with mirroring, palette changes, decals, randomized prop choice, and spacing changes.

## LATER — Landmark system

Procedural routes can occasionally contain memorable unique structures:

- giant Slime Café;
- Dragon Tower;
- Monster Academy gate;
- demon convenience store;
- giant potion factory;
- unusual billboard.

Landmarks can:

- hide repetition;
- establish district identity;
- act as delivery destinations;
- communicate progression;
- provide navigation memory.

## Palette system

Regions should use defined palette families rather than arbitrary asset-by-asset colors.

Example families:

### City

- dark blue;
- purple;
- cream;
- orange;
- cyan.

### Infernal / Demon

- dark red;
- crimson;
- orange;
- yellow;
- near-black.

### Slime / Sewer

- dark green;
- lime;
- turquoise;
- purple;
- near-black.

Exact values should be chosen through visual testing. Palette swaps can generate cheap variation.

## Future Art Bible

When the direction is stable, create a formal `docs/ART_DIRECTION.md` that locks:

- canonical style;
- silhouettes;
- palette rules;
- perspective;
- outline thickness/behavior;
- light direction;
- shadow rules;
- character proportions;
- environment detail density;
- eye/skin/hair/horn/fur/slime/metal/fire treatment;
- UI icon style;
- VFX shape language.

Possible starting principles to test:

- consistent light direction, e.g. upper-left;
- shadows generally resolve lower-right;
- avoid pure `#000000` as default outline/shadow;
- avoid unnecessary colors in small gameplay assets;
- environments remain visually quieter than interactive objects.

## EXPERIMENT — Modular character/NPC construction

Possible layers:

### Body

- human;
- Slime;
- demon;
- furry.

### Head / species traits

- human;
- cat;
- dragon;
- demon;
- Slime.

### Accessories

- horns;
- ears;
- halo;
- glasses;
- hats.

### Tail / back feature

- demon tail;
- cat tail;
- dragon tail;
- Slime extension;
- wings.

### Outfit

- casual;
- courier;
- maid;
- fantasy;
- cyber;
- academy.

### Palette

- hair;
- skin/body;
- outfit;
- accents.

Use semi-procedural variety mainly for NPCs; keep hero characters deliberately authored.

## Animation pipeline

Do not require frame-by-frame animation for everything.

### Authored sprite animation

Best for:

- run;
- jump;
- crash;
- attack;
- transformation;
- strong reactions.

### Transform / procedural animation

Best for:

- hover;
- bounce;
- UI feedback;
- pickups;
- simple rotation;
- squash/stretch;
- breathing.

A Coin may appear to rotate via horizontal-scale animation if the art style supports it.

## Secondary animation

Cheap motion can add a lot of life:

- hair bounce;
- tail movement;
- ear reactions;
- clothing flutter;
- Delivery Bag bounce;
- horn glow;
- Slime wobble;
- antenna movement;
- sign flicker;
- particles.

Prioritize secondary motion on silhouette-defining character features.

## Background / parallax construction

Avoid giant monolithic strips. Prefer separate reusable layers:

- sky / gradient;
- far buildings;
- mid-distance structures;
- near environment;
- gameplay layer;
- optional foreground props.

Illustrative parallax speeds:

- sky: `0.1x`;
- far city: `0.2x`;
- mid buildings: `0.5x`;
- gameplay: `1.0x`;
- foreground: `1.1–1.2x`.

Tune exact values by feel/performance.

## Rendering sharpness

The final game should look sharp on modern mobile displays.

Important distinction:

- gameplay may use stable logical coordinates;
- rendering can target device resolution appropriately;
- device resolution must not alter gameplay fairness;
- pixel art needs intentional nearest/pixel-aware scaling rather than accidental blur.

The current pixel-art prototype is a convenience, not a final style decision.

## Cosmetic-friendly asset structure

If customization becomes important, consider:

- accessory anchor points;
- separate Delivery Bag layer;
- separate hat/glasses layers;
- independent trail origin;
- recolorable/chroma-friendly regions;
- reusable VFX attachment points;
- Companion accessory anchors.

Do not over-engineer this before the prototype proves itself.

## LONG TERM — Skeletal / bone animation

Potential benefits:

- reusable animations;
- layered outfits;
- accessories;
- secondary motion;
- more character variation.

This is a future/version-2-level investigation, not early prototype scope.

## Asset storage / download-size strategy

MGD is mobile-first. Prefer:

- reusable assets;
- source dimensions appropriate to actual camera scale;
- atlases where useful;
- compressed formats;
- palette/tint variation;
- procedural layout;
- transform animation;
- layered backgrounds.

Potential common dimensions to test:

- 64×64;
- 128×128;
- 256×256;
- 512×512.

Do not lock dimensions before measuring actual camera scale and device density.

## Texture atlases

Potential benefits:

- fewer texture switches/draw calls;
- fewer tiny files;
- improved loading;
- compression opportunities.

Atlas size/grouping should follow actual engine/runtime constraints, not a blind “bigger is better” rule.

## Image formats

### PNG

Useful for:

- lossless UI;
- pixel-sensitive art;
- sprites where tooling/runtime handles PNG best.

### WebP

Useful for:

- large illustrations;
- backgrounds;
- compressed transparent assets where runtime support is reliable.

Benchmark format choices on actual target devices/browsers.

## Future formal production docs

When the visual direction is stable, split locked rules out of this backlog into:

### `docs/ART_DIRECTION.md`

Canonical visual rules.

### `docs/ART_PIPELINE.md`

Technical production rules:

- source workflow;
- export sizes;
- naming conventions;
- atlas strategy;
- supported formats;
- compression targets;
- transparency rules;
- animation formats;
- validation;
- performance budgets.

## Future art/pipeline experiments

- modular NPC/character builder;
- biome palette swaps;
- procedural environment pattern system;
- landmark system;
- reusable parallax kits;
- atlas experiments;
- WebP vs PNG benchmarks;
- automated image-size validation;
- duplicate / near-duplicate detection;
- asset memory-budget reporting;
- runtime tint/overlay system;
- district-specific UI skins.

## Representative visual slice before locking art direction

Prototype:

- one player character;
- one monster-girl customer;
- one city biome;
- one alternate biome palette;
- hazards;
- pickups;
- one landmark;
- delivery UI;
- parallax layers;
- common VFX.

Evaluate:

- readability;
- identity;
- production speed;
- file size;
- performance;
- ease of producing consistent additional content.

---

# 18. Director tools, testing, assets, saves, and platform backlog

These ideas are mostly technical/product support work rather than game-content features.

## Director tools

- jump to distance/state;
- restart same seed;
- export runtime config;
- import runtime config;
- hitbox visualization;
- God Mode;
- pattern ID display.

## Procedural / testing tools

- property-based fairness testing;
- large deterministic seed sweeps;
- spawn-pattern editor;
- pattern preview tool.

## Asset tooling

- automated image validation;
- texture-atlas pipeline;
- asset manifest generation;
- missing/unused asset detection;
- duplicate/near-duplicate detection;
- memory-budget reporting.

## Save-system backlog

- save export/import/reset;
- save schema migrations;
- optional platform/cloud adapters later.

## Product / platform backlog

- portrait-mode or variant evaluation;
- character abilities vs cosmetic-only;
- economy design;
- gacha rates/costs if ever approved;
- localization;
- accessibility polish;
- PWA evaluation;
- itch.io deployment;
- Android/iOS packaging;
- Steam/Desktop packaging;
- gamepad support;
- Steam Cloud evaluation.

---

# 19. Reference games and lessons to revisit

These are **design references, not templates to copy**.

## Jetpack Joyride

- one-touch accessibility;
- precise gravity/thrust feel;
- pacing waves;
- temporary vehicles/mutators;
- vehicles as protection;
- recovery after vehicle loss;
- Coin patterns that teach/guide;
- entertaining fail state;
- mission-driven behavior changes;
- fast restart;
- tangible distance/Near-Miss stats.

See `ENDLESS_RUNNER_BLUEPRINT.md` for the dedicated reference.

## Jetpack Joyride 2

Study how the sequel expands:

- progression;
- combat;
- level structure;
- bosses;
- presentation;

without losing the original control simplicity.

## Jetpack Joyride: Test Labs

Combinable mutators are useful inspiration for internal MGD experimentation and later challenge modes.

## Ski Safari

- chase pressure;
- temporary animal mounts;
- tricks;
- objectives.

## Alto’s Adventure / Odyssey

- tricks/combos;
- atmosphere/weather;
- biome variation;
- alternate routes;
- light character differences.

## Blades of Brim

- runner + combat;
- companions;
- wall movement;
- bosses.

## Subway Surfers / Subway Surfers City

- route layers;
- readable power-ups;
- protection mechanics;
- missions;
- districts/secrets/trials;
- character/board abilities;
- multiple modes.

## Burrito Bison

- run → upgrade → push farther;
- destructible barriers;
- visible forward progression.

## Vector

- skill moves;
- handcrafted parkour challenges.

## Rayman Jungle Run

- auto-runner controls in short handcrafted levels with completion goals.

## Minion Rush

- outfits/characters with limited gameplay effects.

## Talking Tom Gold Run

- run rewards feeding visible hub/world progression.

## Canabalt

- reminder that extremely limited controls can still produce a compelling runner.

## Overwatch

Useful player-expression lessons:

- mastery/levels;
- badges/borders;
- profile icons;
- name cards;
- titles;
- sprays/stickers;
- charms;
- emotes;
- victory poses;
- skins;
- seasonal events;
- rotating modes;
- seasonal progression.

## League of Legends

- premium full skins;
- chromas as lower-cost variants;
- profile expression outside the character asset;
- multiple cosmetic production tiers.

## World of Warcraft

- collection without direct power;
- appearances/transmog-like systems;
- mounts;
- pets;
- Toys;
- trophies;
- rare status objects.

## Character-collection / gacha games

Useful lessons:

- strong character identity;
- favorites/Bond;
- collection goals;
- exciting reward reveals;
- profile cards;
- outfits;
- VFX;
- Companion skins;
- pity/guarantees/duplicate protection;
- reruns/free tickets/selectors.

The useful lesson is the **breadth of collectible presentation**, not aggressive monetization.

## Pokémon

- collection;
- optional minigames;
- places to spend currency;
- creature attachment;
- traits/evolution inspiration for Companions.

## Animal Crossing

- calm optional space;
- clothing;
- room decoration;
- furniture collection;
- environmental customization;
- activities that are enjoyable even when not progression-efficient.

## Tamagotchi / virtual-pet games

- attachment;
- care;
- growth/evolution;
- tiny daily interactions;
- habitat customization.

Use the affectionate parts, not harsh absence punishment.

## Shenmue

- odd jobs;
- arcade games;
- collectible toys;
- routines;
- mundane interactions;
- world activities that are enjoyable for their own sake.

MGD should apply this at compact HQ scale, not as a giant open-world simulation.

## Simulation games

- visible progress makes repetitive actions satisfying;
- cleaning, repairing, sorting, unpacking, and organizing can work well as short micro activities.

## Classic arcade games

- simple rules can remain fun;
- cheap optional high-score play;
- MGD theming can make familiar structures feel fresh.

---

# 20. Version / scope buckets

This is **not a roadmap**. It is only a sanity check for the likely order in which idea families make sense.

## EARLY CANDIDATE — Prove the runner is fun first

Focus conceptually on:

- one playable Monster Girl;
- responsive one-touch movement;
- one readable route/world;
- hazards;
- Coins;
- good pacing;
- satisfying fail behavior;
- fast restart;
- basic results;
- simple missions;
- one or two gameplay mutators at most;
- small Gallery/collection hook;
- basic delivery flavor.

## EARLY FOLLOW-UP CANDIDATES

After the runner works:

- finishable Delivery Mode;
- Endless Mode;
- world map;
- more Monster Girls;
- more worlds;
- achievements;
- Character/account XP;
- unlockables;
- earnable Mystery Packages;
- cheap profile cosmetics;
- titles/badges/stickers;
- trails/VFX;
- package/Delivery Bag skins;
- Gallery;
- daily missions;
- first seasonal experiments.

## LATER / LONG TERM

Only after the core game proves itself:

- Companion system;
- Mystery Eggs;
- Companion cosmetics/care;
- Support Items / builds;
- Trait Extraction;
- Companion Fusion;
- Fusion Reactor;
- Pocket Courier;
- full Locker Room;
- large outfit library;
- HQ decoration;
- Toys;
- Character Care;
- Artwork Reveal minigames;
- portrait/gyro artwork;
- arcade cabinets;
- carnival minigames;
- simulator-inspired microgames;
- Delivery HQ;
- odd jobs;
- management;
- Bond/relationship system;
- cozy activities;
- rankings;
- community events;
- seasonal pass;
- premium currency;
- gacha;
- monetization;
- alternate portrait runners;
- standalone spin-offs;
- auto mode;
- skeletal animation.

## Scope warning

Do not build:

> **Runner + Pet RPG + Dating Sim + Truck Sim + Mechanic Sim + Arcade Collection + Gacha + Open World + Portrait Runner**

all at once.

Treat later systems as small toys added around a strong core.

---

# 21. Explicitly deferred product areas

These are not current implementation goals unless explicitly promoted later:

- backend;
- online accounts;
- multiplayer;
- real-money purchases;
- ads;
- analytics/telemetry;
- replay system.

---

# 22. Open design questions

## Core structure

- Should Delivery Mode eventually become the primary mode?
- Should completing a Delivery always end the run?
- How important should Delivery Chains become?
- How many permanent controls should exist?
- How often should movement mutators appear?

## Level structure

- How many levels should each world contain?
- How much procedural variation should a route have?
- How visible should difficulty ratings be?
- Should optional hardcore routes branch from the main map?

## Story / world

- How much plot does MGD need?
- Does the player own the company or just play its couriers?
- How large should the Delivery HQ become?
- Should NPC routines exist only in the HQ or in a small surrounding area?

## Characters

- Are characters mechanically identical or slightly differentiated?
- How much outfit customization is feasible with the chosen art pipeline?
- When would skeletal animation become worth the cost?
- How far should Bond/relationship systems go?
- Should Character Skills affect normal play or remain sidegrades?
- Are temporary fusion forms worth exploring?

## Cosmetics

- Which cosmetic surfaces are most visible during normal gameplay?
- Should Delivery Bag become a signature category?
- How many chromas can one outfit support before variants feel cheap?
- Which profile elements should appear in rankings?
- How customizable should Companions be?
- How much HQ decoration is useful before it becomes a full decorating game?
- Which cosmetics can be shared across characters?
- Should event cosmetics always return eventually?

## Companions / fusion

- Cosmetic-only at first?
- Which utility perks remain fun without becoming mandatory?
- Random first Mystery Egg or player choice?
- How deep should evolution become?
- Should evolution depend on gameplay history?
- How many Trait slots?
- Should duplicates feed Fusion, extraction, or both?
- Is hybrid-species art worth the production cost?
- Does extraction copy a Trait, move it, or consume a duplicate?
- How often should Fusion Batteries be earnable?
- How can Fusion remain exciting without destructive RNG?

## Artwork / phone interactions

- How often should Character Care occur?
- Which reveal mechanics stay fun after repetition?
- Should all reveals have Skip?
- Which sensors feel delightful rather than gimmicky?
- Should microphone interactions always be opt-in?

## Economy

- How many currencies are actually necessary?
- What are the best Coin sinks?
- Do Extraction Chips/Fusion Batteries create enough long-term Coin demand?
- Should Mystery Packages remain gameplay-only?
- Is gacha useful at all?
- How can monetization remain primarily cosmetic?

## Competition

- Which rankings are worth supporting?
- Should ranked challenges normalize Character, Companion, and Support Item effects?
- How long should seasons last?
- Are cooperative community goals more valuable than direct competition?

## Side activities

- Which one minigame is cheapest and most fun to build first?
- Arcade Tokens or just Coins?
- Seasonal or permanent Carnival?
- Which simulator interaction fits best: cleaning, unpacking, sorting, or repair?
- How many odd jobs are enough to make the world feel alive without overwhelming production?

## Alternative runners

- Is portrait 3-lane play best as Event, Arcade, or separate title?
- Can high-speed runner ideas work as short mutators instead of new games?
- Which alternate formats reuse enough MGD assets to justify development?

## Presentation / art

- Pixel art vs larger detailed sprites?
- Landscape-only core vs occasional portrait rewards?
- Does motion parallax look premium or distracting on real devices?
- Which art style produces the best mix of readability, identity, production speed, and file size?

---

# Core principle to preserve

The project can hold a huge idea pool without becoming a huge game immediately.

> **MGD should be very easy to start playing, but capable of surprising the player for a long time.**

Not twenty permanent mechanics at once.

Instead:

- one understandable core;
- responsive game feel;
- temporary gameplay transformations;
- strong Characters;
- rewarding collection;
- visible personalization;
- Companions with personality;
- varied worlds;
- optional side activities;
- playful phone-specific presentation;
- a world where players can sometimes waste time simply because it is fun.

A mature MGD could eventually let a player start a broom Delivery, hit a Gravity Flip section, land on a dinosaur, deliver a package, clean up the courier, reveal artwork, spend Coins at a rigged Carnival booth, win a plushie, give it to a favorite Character, hatch a tiny Companion, customize its hat and Trail, extract a Trait, cause a suspicious Fusion Reactor incident, play one arcade cabinet, and then immediately start another run — while the core game itself remains understandable within seconds.

That is the kind of **controlled variety** MGD should aim for.

---

# Related documents

- [`../MASTER_SPEC.md`](../MASTER_SPEC.md) — approved product/game decisions and decision states
- [`ROADMAP.md`](ROADMAP.md) — approved milestone sequence
- [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) — dedicated Endless Runner / *Jetpack Joyride* design reference
- [`README.md`](README.md) — documentation hub
