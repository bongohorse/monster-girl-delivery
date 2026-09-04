# Monster Girl Delivery — Game Design Ideas

**Status:** Preserved ideas / design exploration  
**Date:** 2026-09-04  
**Purpose:** Structured collection of the Game Director's ideas, questions, experiments, and possible future directions discussed during the September 4 design session.

> [!IMPORTANT]
> Nothing in this document is automatically approved implementation scope. `MASTER_SPEC.md` remains the product/game source of truth, `docs/ROADMAP.md` controls milestone sequencing, and approved GitHub Issues define live work. Ideas here should be promoted deliberately when they are ready to become real features.

The goal is to preserve ideas without forcing early decisions. When a topic becomes relevant, it can be researched, prototyped, and specified in more detail.

---

# Table of contents

- [A. Vision, identity, story and tone](#a-vision-identity-story-and-tone)
- [B. Core gameplay and run structure](#b-core-gameplay-and-run-structure)
- [C. Level selection, world map and difficulty](#c-level-selection-world-map-and-difficulty)
- [D. Movement modes, vehicles and gameplay mutators](#d-movement-modes-vehicles-and-gameplay-mutators)
- [E. Worlds, themes and seasonal events](#e-worlds-themes-and-seasonal-events)
- [F. Characters, cosmetics, artwork and presentation](#f-characters-cosmetics-artwork-and-presentation)
- [G. Companions, progression, achievements and collectibles](#g-companions-progression-achievements-and-collectibles)
- [H. Economy, extraction, fusion, loot and monetization ideas](#h-economy-extraction-fusion-loot-and-monetization-ideas)
- [I. Dailies, rankings, seasons and community systems](#i-dailies-rankings-seasons-and-community-systems)
- [J. Side activities, humor minigames and arcade](#j-side-activities-humor-minigames-and-arcade)
- [K. Smartphone-specific interactions](#k-smartphone-specific-interactions)
- [L. Delivery HQ, management and Shenmue-style everyday life](#l-delivery-hq-management-and-shenmue-style-everyday-life)
- [M. Alternative runner modes and possible spin-offs](#m-alternative-runner-modes-and-possible-spin-offs)
- [N. Inspiration from other games](#n-inspiration-from-other-games)
- [O. Art, rendering and production notes](#o-art-rendering-and-production-notes)
- [P. Version priorities](#p-version-priorities)
- [Q. Open design questions](#q-open-design-questions)
- [Core principle to preserve](#core-principle-to-preserve)
- [Related documents](#related-documents)

---

# A. Vision, identity, story and tone

## High-level direction

Monster Girl Delivery should first become a **simple, responsive, fun mobile runner**. The strongest early reference is still *Jetpack Joyride*: one-touch control, strong game feel, short sessions, readable hazards, pacing waves, temporary gameplay changes, rewarding missions, entertaining fail states, and fast restarts.

The project should not try to implement every preserved idea at once.

A useful long-term principle is:

> **One simple core game + many temporary variations + rewarding long-term collection.**

The player should understand the basic controls almost immediately while new worlds, temporary movement modes, characters, cosmetics, companions, missions, collectibles, events, and progression keep the game interesting over time.

## Core fantasy

The clearest answer to **"Why are we running?"** is the delivery premise itself:

> **The player controls monster-girl couriers who deliver orders through dangerous, strange, and increasingly ridiculous environments.**

A delivery request comes in, a monster girl accepts the job, and the player must reach the customer while avoiding hazards and collecting rewards.

Possible deliveries include:

- food;
- parcels;
- magical items;
- monster eggs;
- medicine;
- cursed or suspicious packages;
- cyberpunk data;
- dungeon supplies;
- emergency deliveries;
- living cargo;
- joke deliveries for strange customers.

This premise is flexible enough to justify almost any world, event, vehicle, minigame, or gameplay modifier.

## Story direction

MGD does not need a complicated main story to work.

A light narrative framework may be enough:

- humans and monsters live in the same broad world;
- the player works for, or possibly manages, a monster-girl delivery company;
- monster girls perform delivery jobs and other odd jobs;
- each delivery provides a small reason to enter a route or world;
- customers and short interactions provide personality and humor;
- deeper lore can be added later only if it improves the game.

The delivery company itself could become the main narrative anchor.

## Humor and fanservice

The game should have a playful, absurd, self-aware tone.

A recurring joke could be that human customers are overwhelmed by how attractive, unusual, or intimidating the monster-girl couriers are, while the couriers consider their work completely normal.

Example tone:

- a nervous nerd opens the door;
- a demon courier casually asks for a signature;
- the customer can barely speak;
- the courier does not understand why the customer is acting strange.

Fanservice can be part of the identity, but it should not replace gameplay or humor. Fanservice/sexualized character designs must clearly depict **adult characters**.

---

# B. Core gameplay and run structure

## Delivery Mode

One strong direction is to make the main progression mode consist of **finishable deliveries** rather than only endless survival.

Example:

```text
Order accepted
→ target is 1,200 m away
→ run / fly through route
→ dodge hazards and collect rewards
→ reach customer
→ deliver package
→ results and rewards
```

The destination answers two useful questions at once:

- gameplay: "How far until I finish?"
- theme: "Why am I running at all?"

Possible visible UI:

```text
CUSTOMER: 850 m
```

## Endless Mode

A traditional Endless Mode should still exist.

Possible goals:

- maximum distance;
- maximum score;
- most coins;
- longest near-miss chain;
- longest survival streak;
- character-specific records;
- leaderboard placement.

A long-term mode structure could be:

- **Delivery Mode** — finishable jobs;
- **Endless Mode** — survival/high score;
- **Challenge Mode** — standardized competitive routes;
- **Event Modes** — temporary rule sets;
- **Arcade / Side Modes** — experimental small games.

## Delivery Chains

After a successful delivery, the player might optionally continue into another job.

```text
Delivery 1 complete
→ express order arrives
→ continue?
→ Delivery 2
→ larger chain bonus
→ Delivery 3
→ larger bonus
→ cash out or eventually fail
```

A particularly thematic variation is to physically drop or throw the next package into the playfield.

If the player catches it:

**EXPRESS DELIVERY / BONUS DELIVERY** begins.

Missing it should usually end the chain normally instead of creating a harsh punishment.

## End-of-run flow

The end of a run should remain entertaining.

### Successful delivery

Possible sequence:

1. arrive at destination;
2. monster girl hands over package;
3. customer gives a short reaction or joke;
4. results appear;
5. rewards and unlocks are shown;
6. player can immediately start another run.

Customer scenes should be short and skippable.

### Failure

Avoid a dead static `GAME OVER` screen.

Possible fail-state behavior:

- tumble;
- slide;
- short ragdoll-like movement;
- broom continues without rider;
- package bounces forward;
- remaining distance is shown;
- character gives a humorous reaction.

### Results

Possible statistics:

- distance;
- delivery time;
- coins;
- pickups;
- near misses;
- package condition;
- optional objectives;
- Delivery Flow / combo;
- character XP;
- account XP;
- mission progress;
- new records;
- delivery rating.

Possible ratings:

- stars;
- C / B / A / S / S+;
- `Perfect Delivery`;
- special badges.

### Reward philosophy

**Bad runs should not erase progress or punish the player harshly.**

Good play should create extra rewards. Weak play should still move something forward.

---

# C. Level selection, world map and difficulty

## Delivery World Map

A visible **world/route map** similar in spirit to classic platformer overview maps could make the level structure feel much more memorable than a flat numbered list.

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

Possible map node types:

- normal delivery;
- express delivery;
- bonus route;
- challenge stage;
- event route;
- Mystery Delivery;
- special customer;
- boss/set-piece delivery.

The map could eventually show the courier moving between delivery nodes.

## World and level progression

For a campaign-like Delivery Mode, players would probably begin in **World 1 / Map 1** and unlock later worlds progressively.

Possible structure:

- World 1 — Monster City;
- World 2 — Fantasy District;
- World 3 — Jungle;
- World 4 — Cyber City;
- later seasonal/special worlds.

Each world can contain a manageable set of levels rather than one endless numbered list.

## Difficulty curve

Difficulty should rise **on average**, but not every level should be harder than the previous one.

Prefer difficulty waves:

```text
easy
→ medium
→ medium
→ hard
→ playful/special relief level
→ medium
→ hard
→ finale
```

New mechanics should be introduced in safe conditions before being combined with other hazards.

Example:

```text
2-2: introduces Gravity Flip with simple layout
2-4: Gravity Flip + lasers
2-7: Gravity Flip + lasers + moving obstacles
```

## Difficulty indicators

Levels or routes could display a simple danger rating, for example:

```text
★☆☆☆☆
★★★☆☆
★★★★★
```

or named route danger:

- Easy Route;
- Normal Route;
- Dangerous;
- Extreme.

It is probably better to give each route its own intended challenge level than to multiply every stage into Easy/Normal/Hard versions unless later testing proves that worthwhile.

## Optional hardcore routes

Hardcore content can exist as optional branches rather than blocking normal players.

Possible conditions:

- no-hit;
- speed target;
- no revive;
- difficult coin line;
- Perfect Delivery;
- fixed movement modifier;
- high near-miss requirement.

Possible rewards:

- badge;
- banner;
- title;
- trail;
- artwork;
- leaderboard placement.

## Authored vs procedural levels

The strongest direction is likely a **hybrid**.

A route can have a defined identity and authored skeleton:

```text
Rooftop Delivery
Distance: 1,600 m
Primary mechanic: vents
World: Monster City
```

Inside that route, controlled systems can vary:

- hazard patterns;
- coin patterns;
- bonus objects;
- enemy placement;
- Mystery Packages;
- optional path selection.

Important set pieces should remain authored and repeatable.

This gives replay value without making every run feel like anonymous procedural noise.

## Daily and Weekly challenge routes

Competitive challenge routes can use a fixed seed and standardized rules so everyone plays the same content.

Example:

```text
WEEKLY DELIVERY #37
World: Cyber City
Character: Demon Girl
Distance: 2,500 m
Modifier: Gravity Flip
Seed: identical for everyone
```

This is especially useful for fair leaderboards.

---

# D. Movement modes, vehicles and gameplay mutators

The permanent control vocabulary should stay small.

> **Do not give the player twenty permanent mechanics. Temporarily change what a few simple inputs mean.**

## Jetpack / broom flight

Possible visual variants:

- jetpack;
- witch broom;
- wings;
- magical propulsion;
- hover device.

## Running mode

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

## Gravity Flip

Reverse gravity and move along the ceiling before returning to normal.

## Water / Jetski

Wave physics, jumps, momentum and landings.

## Pogo stick

Automatic bouncing with deliberately awkward timing.

## Giant bouncing ball

Character rides a large ball through the stage.

## Monster transformations

Temporary forms could include:

- rolling ball;
- slime;
- dragon;
- bat;
- ghost;
- rocket-like form.

## Mounts

Possible mounts:

- dinosaur;
- large fantasy bird;
- dragon;
- dolphin;
- giant wolf;
- slime;
- mechanical creature.

## Vehicles

Possible vehicles:

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

Temporary vehicles can also act as a protective extra hit. Losing one should provide a short safety/orientation window rather than immediately killing the player.

---

# E. Worlds, themes and seasonal events

Long-term variety can come from strongly different locations.

## Monster City

- apartments;
- shopping streets;
- rooftops;
- alleys;
- traffic;
- construction zones.

## Fantasy / Dungeon

- castles;
- villages;
- traps;
- dragons;
- magic;
- dungeon customers.

## Cyberpunk

- neon;
- hover traffic;
- drones;
- megacorporations;
- robots;
- data deliveries.

## Jungle

- ruins;
- rivers;
- vines;
- animals;
- temples.

## Robot Factory

- conveyor belts;
- lasers;
- crushers;
- pistons;
- robots.

## Candy World

- candy;
- cake;
- chocolate;
- pastel scenery;
- cute absurd hazards.

## Beach / Summer

- sand;
- sea;
- palms;
- beach balls;
- water;
- jetski sections.

## Snow / Winter

- snow;
- ice;
- mountains;
- holiday lights;
- snowmen.

## Haunted

- graveyards;
- fog;
- ghosts;
- bats;
- haunted houses.

## Demon District

- demonic architecture;
- lava;
- clubs;
- neon;
- demon bureaucracy jokes.

## Monster Academy

- school/university;
- dorms;
- sports areas;
- magical experiments.

## Space

- orbital stations;
- alien planets;
- asteroid routes;
- spaceships.

## Time travel

A later story device could justify radically different eras:

- Stone Age;
- Bronze Age;
- antiquity;
- medieval;
- Wild West;
- modern era;
- cyberpunk future;
- distant space future.

## Seasonal events

Possible events:

- New Year;
- Lunar New Year;
- Valentine's Day;
- Saint Patrick's Day;
- Easter;
- Summer;
- Halloween;
- Winter;
- Christmas;
- Anniversary.

Events can change:

- map decoration;
- missions;
- cosmetics;
- music;
- hazards;
- collectibles;
- temporary modes;
- customers;
- rewards.

### Summer ideas

- beach;
- summer outfits for adult characters;
- sunglasses;
- water pistols;
- beach balls;
- palms;
- sunscreen jokes;
- tanning/tan-line cosmetic jokes;
- dolphins;
- jetski mode.

### Winter ideas

- snowball fights;
- snowmen;
- Santa-inspired outfits;
- Christmas trees;
- lights;
- presents;
- reindeer mount;
- sleigh section;
- ice physics.

---

# F. Characters, cosmetics, artwork and presentation

## Customization

Players should have many ways to make a favorite character feel like **their version** of that character.

Possible customization:

- full outfits;
- chromas / color variants;
- hats;
- glasses;
- hair accessories;
- hair colors;
- jewelry;
- shoes;
- delivery bags;
- wings;
- horn/tail decorations;
- charms;
- trails;
- aura effects;
- pickup effects;
- start/spawn effects;
- crash/fail effects;
- victory poses;
- emotes.

## Cosmetic design principle

Successful collection-heavy games demonstrate an important lesson:

> **A valuable cosmetic does not need to be a full character skin.**

MGD should deliberately build many cosmetic categories that are cheap to produce, highly visible, easy to collect, and reusable across systems.

Full animated outfits are expensive because every pose/frame may need new art. Profiles, chromas, VFX, stickers, package skins, decorations, and Companion cosmetics can create much more reward volume for less production work.

## Cosmetic ecosystem

A possible long-term cosmetic structure:

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

## Chromas / color variants

Color variants are attractive because one underlying asset can generate many collectibles.

Possible examples:

- Demon Girl outfit colors;
- alternate hair colors;
- wing/horn colors;
- Slime colors;
- broom colors;
- delivery-bag palettes;
- Companion colors;
- seasonal recolors;
- cyber/neon variants.

A single good outfit may therefore support several cosmetic variants without requiring a completely new animation set.

## Profile cosmetics

Profile cosmetics are extremely cheap compared with full character skins, but become valuable once profiles, friends, rankings, or leaderboards make them visible.

Possible profile elements:

- Monster Girl avatar;
- Companion avatar;
- portrait frame;
- profile banner / name card;
- title;
- mastery badge;
- event badge;
- selected achievements;
- favorite Monster Girl;
- favorite Companion.

Example profile:

```text
MegaCourier
Demon Girl Main
MASTER COURIER
Season 3 — Diamond
14,382 Deliveries
```

### Titles

Titles cost almost no art production and can carry humor or prestige.

Examples:

- Delivery Rookie;
- Professional Courier;
- Speed Demon;
- Package Destroyer;
- Slime Enjoyer;
- Certified Witch;
- Definitely Not Lost;
- Near-Miss Addict;
- Employee of the Month;
- seasonal/event titles.

### Banners and frames

Possible unlocks:

- character mastery banner;
- lava/demon banner;
- Halloween graveyard;
- Christmas delivery scene;
- global-event banner;
- ranked top-percent frame;
- anniversary frame.

## Stickers / delivery stamps

Small stickers can be produced in large quantities and reused in multiple places.

Possible uses:

- profile decoration;
- Delivery Bag decoration;
- package decoration;
- HQ walls;
- result screen;
- chat/social systems if those ever exist.

Possible themes:

- character expressions;
- memes/jokes;
- customers;
- hazards;
- world icons;
- event logos;
- delivery stamps.

## Trails and auras

Trails are particularly valuable for a runner because the player sees them throughout normal gameplay.

Possible trails:

- rainbow;
- hellfire;
- hearts;
- stars;
- ghosts;
- bats;
- bubbles;
- snow;
- candy;
- slime;
- electricity;
- sakura petals;
- cyber pixels.

Possible aura effects:

- demon flame;
- holy glow;
- electric sparks;
- floating hearts;
- snow cloud;
- glitch aura.

## Pickup / Coin cosmetics

Instead of always changing the collectible itself, cosmetics can change the visual or audio feedback when it is picked up.

Possible variants:

- gold coin;
- heart;
- candy;
- pumpkin;
- snowflake;
- star;
- delivery stamp;
- sparkle burst;
- character-themed pickup sound.

The actual collision/gameplay value can remain identical.

## Start / Spawn effects

Possible Delivery-start presentations:

- teleport portal;
- demon fire;
- witch circle;
- lightning strike;
- slime splash;
- Delivery Drone drop;
- confetti entrance.

## Crash / Fail cosmetics

Because the fail state should already be funny, it can also be personalized.

Possible variants:

- ghost leaves the character;
- confetti explosion;
- slime splash;
- cartoon stars;
- packages explode across the screen;
- smoke cloud;
- seasonal effects.

These should remain presentation-only and not alter revive timing or gameplay fairness.

## Delivery Bag cosmetics

The Delivery Bag can become an MGD-specific equivalent of a weapon cosmetic because it naturally belongs to every courier.

Possible bags:

- standard courier bag;
- pizza bag;
- demon bag;
- slime backpack;
- Mimic bag;
- transparent aquarium bag;
- cyber bag;
- Christmas sack;
- school backpack.

## Package skins

Packages themselves are another cheap and thematic cosmetic surface.

Examples:

- standard cardboard box;
- wrapped gift;
- pizza box;
- suspicious bomb-like joke parcel;
- Mimic box;
- Valentine's package;
- Halloween pumpkin box;
- Christmas present;
- robot parcel.

Package appearance should not hide gameplay-critical information about actual cargo rules.

## Broom / mount / vehicle appearances

Many transport cosmetics can share gameplay behavior while changing silhouette and personality.

Possible broom replacements or skins:

- classic witch broom;
- neon broom;
- demon broom;
- Christmas broom;
- ridiculous vacuum cleaner;
- giant paintbrush.

Mount/vehicle skins can similarly create collection without every visual variant needing unique mechanics.

## Companion cosmetics

Companions are especially suitable for combinatorial customization.

Example:

```text
Species: Slime
Color: Pink
Hat: Witch Hat
Face: Sunglasses
Trail: Hearts
```

One base Companion plus several colors/accessories can create many personalized combinations.

Possible Companion cosmetics:

- colors;
- hats;
- glasses;
- bows;
- collars;
- tiny backpacks;
- trails;
- cosmetic horns/wings;
- seasonal skins.

## Emotes

Possible Character Viewer / HQ emotes:

- wave;
- laugh;
- dance;
- eat;
- sleep;
- flex;
- annoyed reaction;
- victory dance;
- headpat reaction;
- interact with Companion.

These cost more than static profile items because they require animation, so they belong later than basic profile cosmetics.

## Victory / Delivery poses

Possible result poses:

- peace sign;
- salute;
- pose with package;
- exhausted collapse;
- sunglasses pose;
- selfie;
- hold Companion;
- seasonal pose.

## Toys / novelty cosmetics

Some collectibles do not need to be worn at all.

Possible HQ toys:

- bubble gun;
- confetti cannon;
- water pistol;
- mini fireworks;
- camera;
- Slime launcher;
- snowball;
- beach ball;
- strange Delivery gadget.

A player can collect and activate these for short animations or interactions.

## HQ furniture and decoration

The entire Delivery HQ can eventually become a cosmetic canvas.

Possible decorations:

- beds;
- sofas;
- desks;
- gaming PCs;
- plants;
- posters;
- figures;
- lamps;
- rugs;
- shelves;
- wallpapers;
- floor materials;
- neon signs;
- trophies;
- event decorations.

Achievements can physically appear as trophies or souvenirs in the HQ, making progression visible in the world.

## UI / phone cosmetics

Possible low-cost customization:

- UI themes;
- menu backgrounds;
- loading-screen artwork;
- in-game phone wallpaper;
- phone case if an in-world phone interface exists;
- notification sound;
- home-screen theme.

Gallery artwork can potentially double as in-game phone wallpapers.

## Cosmetic production-cost ladder

Approximate relative production effort:

| Cosmetic category | Relative effort | Why it is useful |
|---|---:|---|
| Titles | Very low | Text-only prestige/humor |
| Profile icons / badges | Very low | High collection volume |
| Banners / frames | Very low–low | Visible in rankings/profile |
| Stickers / stamps | Low | Can be produced in large sets |
| Chromas | Low | Reuses existing art |
| Trails / simple VFX | Low | Visible throughout runs |
| Package skins | Low | Strong delivery identity |
| Companion colors/accessories | Low | High combinatorial variety |
| HQ posters/decor | Low–medium | Supports collection/cozy layer |
| UI themes | Low–medium | Whole-account personalization |
| Character accessories | Medium | Visible but needs placement/anchors |
| Emotes / victory poses | Medium | Requires animation |
| Broom/mount skins | Medium | Larger gameplay-visible asset |
| Full outfits | High | Must support character animation |
| Premium full skin + custom VFX/animation | Very high | Large content package |

### Suggested cosmetic priority

A sensible production order is roughly:

```text
Profile icons
→ Titles
→ Badges / frames / banners
→ Stickers
→ Trails / simple VFX
→ Package / Delivery Bag skins
→ Companion cosmetics
→ HQ decoration
→ Character accessories
→ Emotes / victory poses
→ Full outfits
→ premium high-production skins
```

## Gallery

Possible content:

- character art;
- event art;
- delivery scenes;
- customer scenes;
- collectible photos;
- concept art;
- special animations;
- world illustrations.

## Locker Room / Character Viewer

Possible functions:

- choose character;
- change outfit;
- equip accessories;
- select chroma;
- select Delivery Bag;
- preview trails/auras;
- view animations;
- select pose;
- change background;
- inspect gallery art;
- take screenshots.

This provides a calm counterpoint to the runner.

## Character Care / Cleanup

After certain deliveries, a monster girl could return visibly affected by the route:

- dirty;
- muddy;
- dusty;
- covered in soot;
- wet;
- sandy;
- covered in slime;
- snow-covered.

A short optional care interaction could include:

- wipe dirt away;
- apply soap;
- rinse;
- dry;
- brush or comb hair;
- clean equipment;
- remove leaves/snow/slime.

This can create a satisfying transition:

```text
Run
→ character returns messy
→ short cleanup/care interaction
→ character looks restored
→ artwork reveal / bonus reward
```

This should not happen after every short run. It is better as an occasional reward tied to special deliveries, character milestones, events, or gallery unlocks.

## Artwork Reveal minigames

Artwork can be revealed in many different ways.

Important rule:

> **The artwork should already be earned. The reveal interaction is a celebration, not a gate that can permanently deny the reward.**

Possible reveal mechanics:

### Wipe / clean

- wipe dirt;
- wipe condensation;
- clean a lens;
- remove rain/water.

### Scratch-card reveal

Rub away a top layer like a scratch ticket.

### Puzzle

Reassemble image pieces.

### Sliding puzzle

Optional harder variant for players who enjoy it.

### Polaroid / photo development

Reveal gradually through motion or touch.

### Gift / package opening

Open wrapping paper or a delivery box to reveal the image.

### Environment-specific reveals

- Beach: brush away sand;
- Winter: scrape snow/ice;
- Slime area: peel slime away;
- Haunted: clear fog/ghost layer;
- Fantasy: break crystals or unlock magic seal;
- Cyberpunk: decrypt/glitch-clean the image;
- Jungle: remove leaves/vines;
- Factory: unscrew/open a metal panel.

Timed performance can grant a small coin or score bonus, but the image itself should remain obtainable.

## Portrait Mode and Gyroscope Parallax

Special presentation moments could ask the player to rotate the phone from landscape into portrait orientation.

Possible use cases:

- character unlock;
- artwork reveal;
- event reward;
- relationship scene;
- Gallery/Character Viewer.

Portrait artwork could use **gyroscope / motion / tilt parallax**.

Possible depth layers:

- distant background;
- near background;
- character;
- hair/accessories;
- foreground particles.

This may look excellent for artwork but could be distracting in precision runner gameplay.

## Animation and art pipeline

The current pixel-art prototype is not a final art-style decision.

Future options may include:

- larger high-detail sprites;
- modular sprite layers;
- accessory anchor points;
- bone/skeletal animation;
- sprite + transform hybrid animation;
- lightweight secondary animation.

A bone-based system may help with outfits and reusable motion later, but it is too much complexity for the early prototype.

---

# G. Companions, progression, achievements and collectibles

## Companion / mini-pet concept

Small pets or Companions can follow the active Monster Girl during runs or live with her in the Delivery HQ.

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
- weird magical Delivery creature.

Companions should provide personality even when they have no gameplay power.

Possible reactions:

- celebrate coin pickups;
- panic during Near Misses;
- react to a crash;
- play with the courier at the finish;
- hide from hazards;
- react differently to worlds/events.

## Companion gameplay philosophy

The safest default is **cosmetic-first, utility-second**.

Avoid making the player choose an ugly Companion solely because it gives the strongest speed or survival multiplier.

If Companions have gameplay effects, favor small utility perks over major direct power.

Possible perks:

- slightly larger pickup radius;
- occasional missed-coin recovery;
- small XP bonus;
- longer power-up duration;
- extra mission progress;
- warning for one hazard type;
- one small utility action per run.

Avoid large raw speed, damage, or score advantages that make competitive play depend on pet ownership.

## Companion skills

Skills can make Companions feel like characters rather than percentage spreadsheets.

Examples:

### Coin Slime

- occasionally collects a narrowly missed Coin;
- small Coin utility bonus.

### Bat

- gives a brief warning before selected hazards;
- supports Near-Miss play.

### Mini Dragon

- extends one power-up slightly;
- can create a small fire-themed utility effect.

### Mimic

- small chance to improve a pickup reward.

### Fairy / Spirit

- extends or refreshes a limited buff under specific conditions.

### Delivery Drone

- occasionally retrieves a distant collectible.

## Competitive normalization

Serious skill-based rankings should not be decided by who owns the best Companion or Support Item.

Possible rule:

```text
Normal Delivery / Endless
→ personal builds allowed

Weekly Ranked Challenge
→ character fixed or normalized
→ Companion fixed/disabled
→ Support Items fixed/disabled
→ identical seed
```

## Mystery Egg

A strong onboarding/collection idea is to give the player a **Mystery Egg** when the Companion system unlocks.

Possible flow:

```text
Welcome Package
→ Mystery Egg
→ complete several runs / care actions
→ egg cracks
→ random Companion hatches
```

Possible first-pet pool:

- Slime;
- Bat;
- Ghost;
- Mini Dragon;
- bird;
- Mimic.

This provides an exciting early surprise without immediately requiring paid gacha.

## Monster Girls and eggs

A normal adult Monster Girl should probably **not** literally hatch as a baby from the same pet egg system.

If a Tamagotchi-like Monster Girl representation is desired, a cleaner fiction is:

- magical Chibi avatar;
- Courier Spirit;
- holographic Mini Courier;
- virtual Pocket Courier;
- magical copy/mascot of an adult character.

This keeps the adult main characters distinct from pets and avoids confusing the character identity.

## Tamagotchi-style Companion care

The Delivery HQ could contain a lightweight pet-care system.

Possible actions:

- feed;
- pet;
- wash;
- brush;
- play;
- put to sleep;
- buy toys;
- decorate pet area;
- play tiny minigames.

Avoid old-school punitive Tamagotchi behavior such as permanent death or severe punishment because the player did not log in for several days.

Better approach:

> The Companion becomes hungry, sleepy, or bored and is happy when the player returns.

The system should encourage affection, not obligation.

## Companion growth / evolution

Possible progression:

```text
Egg
→ Baby Companion
→ Companion
→ evolved form
→ rare variant / cosmetic mutation
```

Evolution might depend partly on player behavior or environment.

Examples:

- many Beach deliveries → Water Slime variant;
- many Cyber City deliveries → Cyber Slime;
- many Near Misses → Devil/Risk variant;
- winter event → Snow variant.

This makes evolved forms reflect how the player used the pet.

## Seasonal Companions

Examples:

### Halloween

- Pumpkin Slime;
- Tiny Ghost;
- Vampire Bat.

### Winter

- Christmas Slime;
- Mini Reindeer;
- Present Mimic.

### Summer

- Crab;
- Mini Dolphin;
- Watermelon Slime.

### Lunar New Year

- Mini Dragon.

## Trait extraction

Companion abilities can potentially be extracted and transferred instead of being permanently locked to the original pet.

Example:

```text
Mini Dragon
Skill: Power-up Duration

+ Extraction Chip

→ Dragon Trait / Skill Essence
→ equip or transfer elsewhere
```

Important anti-frustration rule:

> **Trait extraction should not casually destroy a beloved Companion.**

Possible implementations:

- extractor copies the Trait;
- duplicate Companion is consumed instead of the original;
- extraction requires Coins + special item;
- extracted ability becomes a Skill Chip / Essence / Trait item.

## Companion fusion

Fusion can provide a long-term use for duplicate pets and Traits.

### Same-species fusion

Simple progression model:

```text
Slime ★
+
Slime ★
=
Slime ★★
```

Possible benefits:

- additional Trait slot;
- higher pet progression cap;
- cosmetic evolution;
- small utility improvement.

### Trait fusion / inheritance

Combine Traits from two Companions.

Example:

```text
Slime — Coin Magnet
+
Dragon — Power-up Duration

→ resulting Companion inherits selected Trait(s)
```

This can create custom builds.

### Species / hybrid fusion

A much more ambitious later system could create visual hybrids such as:

- Dragon Slime;
- Bat Slime;
- Cyber Ghost;
- Mimic Dragon.

This is expensive because it requires art for combinations, so it should come only if the Companion system becomes important enough to justify it.

### Inheritance model

Potential inherited properties:

- species;
- element;
- personality Trait;
- gameplay Skill;
- cosmetic mutation;
- color.

This can create unique Companions without giving the main runner more permanent controls.

## Monster Girl skills and Support Items

A related build system can apply to Monster Girls without permanently fusing the characters themselves.

Possible Character loadout:

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

The aim is understandable build choices, not MMO-style stat spreadsheets.

## Example builds

### Coin build

- Coin-oriented Companion;
- pickup-range Support Item;
- Lucky Charm.

### Endless survival build

- Shield-like Support Item;
- power-up duration;
- utility Companion.

### Score / Near-Miss build

- Near-Miss bonus;
- combo extension;
- risk-oriented Companion.

### Mission build

- mission-progress utility;
- pickup Support Item;
- route-specific Companion.

## Ability fusion instead of permanent Monster Girl fusion

Permanent Monster Girl fusion is risky because the Monster Girls are named characters players may become attached to.

Avoid a progression loop like:

> Consume three copies of Demon Girl to create a stronger Demon Girl.

A better long-term experiment is to fuse **abilities or Support Traits**.

Examples:

```text
Shield
+
Near-Miss Skill
=
Danger Shield

After enough Near Misses, gain one temporary shield.
```

```text
Bounce Skill
+
Coin Pickup
=
Golden Bounce

Landing pulls nearby Coins toward the player.
```

Hybrid abilities can create interesting buildcrafting without destroying character identity.

## Temporary Monster Girl fusion forms

Fusion can still work as a temporary gameplay transformation.

Examples:

- Demon Girl + Slime Power → Demon Slime Form;
- Harpy + Dragon Power → Dragon Wing Form;
- character temporarily gains another monster Trait.

These can function like vehicles/mutators:

- visually dramatic;
- temporary;
- easy to understand;
- revert to the normal character afterward.

## Achievements

Examples:

- deliver 100 packages;
- perform 100 Near Misses;
- travel 1 km upside down;
- complete a no-hit route;
- catch several bonus packages;
- repeatedly deliver to a memorable customer;
- hatch first Companion;
- discover a rare Companion variant;
- perform first Trait extraction;
- complete first Fusion;
- complete seasonal challenges.

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
- Companions;
- Companion variants;
- plushies;
- event tokens;
- trophies;
- Toys;
- Trait/Skill items.

World-specific souvenirs can reinforce exploration.

Examples:

**Beach**
- shell;
- sunglasses;
- tiny palm decoration.

**Cyberpunk**
- data chip;
- neon keychain;
- broken drone part.

**Fantasy**
- dragon scale;
- potion;
- magic stone.

## Character progression

Each Monster Girl could have a personal mastery/progression track.

Possible rewards:

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
- Support slot or sidegrade if gameplay progression is later approved.

## Account progression

Separate overall account XP can come from:

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
- profile frames;
- titles;
- unlocks;
- Gallery rewards;
- Companion Egg;
- Extraction/Fusion item.

## Hardcore skill ceiling

Simple controls can still support deep mastery.

Possible hardcore goals:

- no-hit deliveries;
- perfect routes;
- speedruns;
- long Near-Miss chains;
- high Delivery Flow;
- weekly fixed challenges;
- Endless leaderboards;
- character-specific records.

---

# H. Economy, extraction, fusion, loot and monetization ideas

## Coins

Normal earnable currency.

Possible uses:

- cosmetics;
- Mystery Packages;
- minigames;
- arcade machines;
- character gifts;
- Companion food/toys;
- Extraction Chips;
- Fusion Batteries;
- Support Items;
- event shops;
- HQ upgrades;
- deterministic unlocks.

A major economy goal should be to create several fun Coin sinks so accumulated currency continues to matter after many hours.

## Extraction items

Trait extraction can require a consumable purchased with normal Coins.

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

→ copy selected Companion Trait
→ create Skill Essence / Trait Chip
```

This creates a useful long-term Coin sink while keeping Trait customization deliberate.

## Fusion Battery

Companion fusion can require a dedicated **Fusion Battery**.

Possible sources:

- buy for Coins;
- Daily/Weekly Mission reward;
- Mystery Package;
- Achievement;
- Event reward;
- Companion progression.

The basic system should begin with **one battery type** instead of immediately introducing many tiers.

Possible later variants only if needed:

- Stable Fusion Battery — preserve a selected Trait;
- Advanced Fusion Core — rare hybrid fusion;
- Mutation Battery — cosmetic mutation chance.

Avoid unnecessary item bloat until the simple version proves fun.

## Fusion Reactor

The Delivery HQ could contain a physical **Fusion Reactor / Companion Lab**.

Possible loop:

```text
select Companion A
+
select Companion B / Trait
+
Fusion Battery

→ Reactor animation
→ Fusion result
```

The machine can look questionably safe for humor.

Possible signs:

- `DO NOT INSERT COURIERS`;
- `98.7% SAFE`;
- `WARRANTY VOID IF REALITY TEARS`.

Possible character joke:

> "What happened to the other 1.3%?"

## Reactor upgrades

Much later, HQ upgrades could improve the system.

Possible progression:

- Lv. 1 — basic Companion Fusion;
- Lv. 2 — choose one Trait to preserve;
- Lv. 3 — preserve more inheritance information;
- Lv. 4 — rare hybrid/mutation options.

This links Companion progression to Delivery HQ progression without requiring it in the early game.

## Fusion failure philosophy

Do not make the humorous machine destroy valuable pets and resources through random failure.

A "failed" fusion can be a presentation joke while still returning a valid result.

Possible comedy rewards:

- strange temporary color;
- Reactor Scrap collectible;
- `Oops` Achievement;
- cosmetic glitch effect;
- alarm/lights-out animation.

Chaos should create entertainment, not irreversible frustration.

## Crafting Fusion Batteries

A later material sink could allow battery crafting.

Example:

```text
3× Battery Scrap
+ 1× Monster Essence
+ 250 Coins
= Fusion Battery
```

Possible material sources:

- runs;
- broken machines;
- Mystery Packages;
- missions;
- events.

This is optional complexity and not needed with the first Fusion implementation.

## Gems / premium currency

Possible much later.

Potential uses:

- premium cosmetics;
- optional time-saving;
- event items;
- revive;
- special shop purchases.

Not needed for the early game.

## Monetization principle

Prefer:

- cosmetics;
- optional convenience;
- time-saving;
- optional ad rewards;
- cosmetic seasonal passes.

Avoid making paid power the primary path to leaderboard success.

Build/Support systems make this especially important: a competitive player should not need premium purchases for required stats.

## Mystery Packages / loot-box-like rewards

Random rewards fit the delivery theme naturally.

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

Early versions should treat them primarily as **earnable gameplay rewards**.

Real-money random rewards create additional legal, rating, platform, and player-trust concerns and should only be considered much later, if at all.

## Gifts

### Gifts to player

- daily gift;
- anniversary reward;
- event gift;
- achievement package.

### Gifts to characters

Possible gifts:

- food;
- flowers;
- games;
- plushies;
- souvenirs;
- character-specific favorites.

These can feed a Bond/Friendship system.

### Gifts to Companions

Possible items:

- food;
- treats;
- toys;
- pet accessories;
- habitat decorations.

## Shop

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

## Gacha ideas

Gacha is optional and not required.

If ever used, cosmetic-focused gacha is preferable to random paid power.

Useful building blocks:

- banners;
- rarity;
- single/multi pulls;
- pity;
- featured guarantee;
- duplicate conversion;
- selector/spark;
- wishlist;
- free tickets;
- reruns.

Possible player-friendly structure:

- guaranteed Rare+ after a threshold;
- guaranteed Epic+ after a larger threshold;
- direct featured selection after enough attempts;
- duplicate conversion into Delivery Tokens;
- ability to buy desired cosmetics with tokens;
- carry-over pity where appropriate;
- earnable pulls from gameplay.

If Companions ever enter a random-reward system, avoid making random premium pulls the only viable source of competitive Companion abilities.

---

# I. Dailies, rankings, seasons and community systems

## Daily login rewards

A simple reward sequence can encourage return play.

Example:

| Login step | Example reward |
|---|---|
| 1 | Coins |
| 2 | More Coins |
| 3 | Small Mystery Package |
| 4 | Coins + XP |
| 5 | Ticket / Extraction Chip |
| 6 | Rare Package |
| 7 | Epic Mystery Delivery / Companion Egg |

Prefer not to reset the whole sequence because one real-world day was missed.

## Daily missions

Examples:

- deliver 3 packages;
- collect 500 Coins;
- fly 2,000 m with a broom;
- perform 20 Near Misses;
- use a vehicle;
- play a specific character;
- catch a bonus package;
- finish without damage;
- play with/feed a Companion;
- use a specific utility Companion.

A free daily reroll can reduce frustration.

## Weekly missions

Larger objectives with milestone rewards.

## Global rankings

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

Competitive modes should avoid paid power advantages where possible.

## Ranking leagues

Possible prestige tiers:

- Bronze;
- Silver;
- Gold;
- Platinum;
- Diamond;
- Master.

Rewards should mostly be visible status/cosmetic items:

- frame;
- badge;
- title;
- banner;
- icon;
- Companion cosmetic.

## Global community events

Example:

```text
GLOBAL DELIVERY EVENT
10,000,000 deliveries total

1M  → Coins
3M  → Mystery Package
5M  → Event Artwork
10M → Special Cosmetic
```

## Character/team events

Players could support favorite Monster Girls:

- Team Demon Girl;
- Team Slime Girl;
- Team Dragon Girl;
- Team Harpy.

Successful deliveries contribute to a global score.

Similar events could later use Companion species or regions as teams.

## Battle pass / seasonal progression

Possible later system once enough content exists.

Example:

**Summer Delivery Pass**

Rewards:

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

A branching reward structure or ability to revisit old passes may be more player-friendly than a rigid temporary linear track.

---

# J. Side activities, humor minigames and arcade

The side-activity layer can become a **toybox** around the runner.

The key rule is that these activities should remain small, playful, and optional rather than turning MGD into ten full-size games at once.

## Carnival / festival minigames

Seasonal festivals or a permanent fairground area could contain deliberately goofy booth games.

### Dunk Tank / Bullseye

A Monster Girl sits on a seat above a water tank.

The player throws a ball at a target.

Hit bullseye:

**SPLASH.**

Different characters can react differently:

- Demon Girl gets annoyed;
- Slime Girl enjoys it;
- Cat Girl hates getting wet;
- Dragon Girl heats the water;
- Mermaid-type character wonders why this is supposed to be punishment.

### Tomato Throw

A slapstick booth where the player throws tomatoes at targets or characters.

Possible comedy:

- character dodges at the last moment;
- tomato hits the booth operator;
- target moves illegally;
- character throws one back;
- scoreboard refuses to count a valid hit.

### Rigged carnival games

The booths should feel humorously suspicious.

Examples:

- target moves at the last second;
- basketball hoop is slightly too small;
- claw machine releases plushie before the exit;
- ring-toss peg bends away;
- operator says a clear win "doesn't count";
- hidden trick lets the player expose or beat the scam.

Possible rewards:

- plushies;
- tiny accessories;
- stickers;
- Character gifts;
- Companion toys;
- Carnival badges;
- artwork;
- souvenirs.

This gives small collectibles a physical origin in the game world rather than making everything come from menus.

## Physics-based parody minigame

A physics launcher game could parody the broad slingshot genre.

Concept:

**Courier Emergency Launch Training**

A Monster Girl is launched through an obstacle course.

Possible character-specific physics:

- Slime Girl sticks to surfaces;
- Dragon Girl is heavy and destructive;
- Harpy can slightly steer in air;
- Ghost Girl passes through one obstacle;
- bouncing character rebounds strongly.

The humor comes from treating a ridiculous giant slingshot as legitimate courier training.

This should borrow the general physics-play concept, not copy protected characters, layouts, branding, or art from another game.

## Simulator-inspired micro activities

Popular simulation games show that simple repetitive actions can be satisfying when they provide clear visible progress.

MGD can borrow the **best 30–90 seconds** of those fantasies rather than build entire simulator games.

### Cleaning / pressure-washing style

- clean mud from a courier;
- clean a Delivery vehicle;
- remove soot from equipment;
- wash slime off a room;
- wash a Companion;
- restore an object from dirty to 100% clean.

This connects directly to Character Care and Artwork Reveal.

### Unpacking style

Possible uses:

- open a Mystery Package;
- unpack collectibles;
- sort items into shelves;
- decorate a Character room;
- unpack warehouse stock;
- unpack a new Companion habitat.

### Mechanic / workshop style

Simplified garage interactions:

```text
find broken part
→ unscrew
→ replace
→ clean
→ test
```

Possible repair targets:

- broom;
- jetpack;
- jetski;
- drone;
- motorcycle;
- weird monster vehicle;
- Fusion Reactor component.

### Logistics / truck-sim inspiration

Borrow the feeling of running a transport company rather than building a full truck simulator.

Possible decisions:

- choose job;
- choose courier;
- unlock region;
- own vehicles;
- improve company;
- plan special deliveries.

The actual delivery can still lead into the normal runner.

## Classic arcade games

A Delivery HQ arcade could contain cheap, simple games inspired by classic arcade mechanics.

These should be original MGD-themed implementations rather than direct copyrighted clones.

### Package Blocks

Falling-block package-stacking game.

### Slime Breaker

Brick-breaker-style game where Slime Girl is the bouncing projectile.

### Demon Pong

Two sides knock a fireball back and forth.

### Asteroid Delivery

A Delivery Drone dodges space hazards and collects parcels.

### Lamia Snake

A snake-style game using a Lamia character.

### Road Crossing Delivery

Cross traffic safely with a package.

### Crane / claw machine

Win plushies or gifts for Characters/Companions.

### Arcade rewards

Possible rewards:

- high-score badges;
- Arcade Tokens;
- plushies;
- stickers;
- cosmetics;
- Companion toys;
- achievements;
- small Coin payouts.

A major advantage is that the arcade can grow one cheap cabinet at a time.

## Currency as world activity

A more interesting economy loop is:

```text
Delivery
→ earn 500 Coins
→ spend 200 at Arcade
→ play Carnival
→ win Plushie
→ give Plushie to Demon Girl
→ Bond increases
→ unlock Artwork
```

Another possible loop:

```text
Delivery
→ earn Coins
→ buy Extraction Chip
→ extract Companion Trait
→ buy Fusion Battery
→ use Fusion Reactor
→ create personalized Companion
```

This is more memorable than simply opening a shop menu and buying one stat increase.

---

# K. Smartphone-specific interactions

MGD should consider using features that make the phone feel like part of the game, but these should usually be optional extras rather than mandatory core controls.

## Gyroscope / tilt

Possible uses:

- artwork parallax;
- balance a tray;
- keep a fragile potion upright;
- steer a small board/vehicle;
- marble/labyrinth minigame;
- balance water/liquid;
- control a claw machine;
- subtle Character Viewer motion;
- pet toy/balance minigame.

Example:

**Fragile Potion Delivery**

Tilt too far and the liquid sloshes dangerously.

## Device rotation

Possible playful uses:

- rotate landscape → portrait for artwork;
- physically rotate device to tighten a screw;
- rotate a puzzle object;
- absurd scene where the whole room spins;
- special event interaction.

## Microphone / blowing

Microphone-based interactions should always have a touch fallback because microphone permission, noisy environments, and public play can make them inconvenient.

Possible uses:

- blow out birthday candles;
- clear condensation;
- blow wind for a Harpy;
- put out a small fire;
- dry hair after cleanup;
- inflate a balloon until it pops;
- interact with a Companion toy;
- trigger a joke where blowing makes demon fire worse.

## Haptics / vibration

Haptics can add a lot of polish for little content cost.

Possible feedback moments:

- package lands;
- bullseye hit;
- puzzle piece snaps into place;
- screw locks;
- Mystery Package opens;
- egg cracks;
- Fusion Reactor activates;
- character lands;
- scratch-card reveal;
- Coin pickup streak;
- crash/Near Miss.

## Camera / other phone features

Possible future experiments, only if they add real value:

- photo mode overlays;
- AR-style novelty scene;
- motion gestures;
- local notifications for optional events.

These should not become unnecessary permission-heavy gimmicks.

---

# L. Delivery HQ, management and Shenmue-style everyday life

A long-term strength of MGD could be giving players a place where they can **waste time pleasantly** instead of only switching between menus and runs.

The inspiration is not "build a giant open world." The useful lesson is:

> **A world feels alive when the player can do small things that are not strictly required by the main objective.**

## Delivery HQ as physical menu

Possible rooms/areas:

- reception;
- warehouse;
- garage;
- locker room;
- Gallery;
- arcade;
- café;
- Character rooms;
- Companion room;
- Fusion Reactor / Companion Lab;
- event plaza;
- toy/cosmetic shop.

Each room can effectively represent a menu/system while still feeling like a place.

## Simple NPC routines

Even a few characters with small routines can make the HQ feel alive.

Example:

- morning: Harpy at café;
- afternoon: Harpy working;
- evening: Harpy at arcade.

This does not require hundreds of NPCs or a large open world.

## Odd jobs

Monster Girls doing odd jobs fits the premise extremely well.

Possible side jobs:

### Warehouse shift

Sort packages by region/type.

### Café shift

Serve orders with a simple timing game.

### Garage shift

Repair Delivery equipment.

### Cleaning shift

Clean HQ, vehicle, equipment, or Companion habitat.

### Carnival shift

Operate or play festival booths.

### Fishing

Catch strange delivery items or collectibles.

### Moving job

Move furniture or packages.

### Pet sitting

Look after strange monster pets.

### Security shift

Watch the warehouse at night and react to odd events.

These jobs can be short, simple minigames rather than deep simulation systems.

## Companion room / habitat

Companions can exist physically in the HQ instead of only in an inventory screen.

Possible interactions:

- feed;
- wash;
- play;
- decorate habitat;
- equip cosmetic;
- inspect Traits;
- choose active Companion;
- hatch Eggs.

This makes the Companion system part of the world rather than another spreadsheet menu.

## Pocket Courier / Tamagotchi-style minigame

A separate in-world device could contain a virtual **Pocket Courier** or Chibi courier avatar.

Possible activities:

- feed;
- sleep;
- decorate tiny room;
- equip tiny outfits;
- play minigames;
- send on tiny automatic deliveries;
- collect small rewards.

This virtual courier should be treated as a magical/digital Chibi representation, not as a literal child version of an adult Monster Girl.

Possible idle-like loop:

```text
send Pocket Courier on small job
→ continue playing normally / close game
→ return later
→ tiny delivery complete
→ Coins / sticker / souvenir / pet item
```

Avoid punishing the player for not checking constantly.

## Fusion Reactor / Companion Lab

The Reactor can become one of the most recognizable strange machines in the HQ.

Possible interactions:

- Trait extraction;
- Trait transfer;
- Companion Fusion;
- inspect Fusion history;
- upgrade Reactor later;
- collect cosmetic machine parts/trophies.

The Reactor's unreliable-looking presentation can provide recurring humor without making the actual system randomly destroy progress.

## Management layer

Possible long-term management:

- recruit couriers;
- assign girls to jobs;
- upgrade HQ;
- unlock regions;
- buy vehicles;
- decorate rooms;
- improve Companion facilities;
- upgrade Fusion Lab;
- expand garage/warehouse;
- collect passive company rewards.

## Cozy / low-pressure play

Possible activities:

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

The player should be allowed to do things simply because they are enjoyable, not because every second must maximize progression.

## Relationship / Bond layer

A lightweight Bond system can come before any full dating-sim concept.

```text
Use Character
→ earn Bond XP
→ give gifts
→ unlock dialogue
→ unlock small scenes
→ unlock artwork / emotes / poses
```

A full dating/romance system remains a separate future design question.

## Auto mode

Possible uses:

- accessibility;
- previously completed easy deliveries;
- Pocket Courier jobs;
- low-pressure passive company activity.

Main risk:

> If automatic play gives the same value as playing, why play the runner?

Auto mode should therefore remain secondary.

---

# M. Alternative runner modes and possible spin-offs

MGD can experiment with different runner traditions without replacing the main landscape game.

The important realization is that a **3-lane portrait runner or behind-the-back runner is almost a separate game system**, not merely a small movement modifier.

These concepts are best treated as:

1. Event modes;
2. Arcade side games;
3. experimental prototypes;
4. possible later standalone spin-offs.

## Main MGD runner

Current core identity:

- landscape;
- side view;
- one-touch flight / broom / jetpack style;
- delivery framing.

This should remain the first game to make fun.

## Portrait 3-lane runner

A mode inspired by the broad lane-runner genre:

- portrait;
- automatic forward movement;
- three lanes;
- swipe left/right to change lane;
- swipe up to jump;
- swipe down to slide;
- collect Coins;
- dodge obstacles;
- speed gradually rises.

Possible MGD theme:

**Monster Metro Delivery**

Possible hazards:

- Delivery vans;
- market stalls;
- bins;
- construction barriers;
- trains;
- robots;
- NPCs;
- dogs/cats;
- rival couriers.

## Genre-parody version

The arcade could deliberately parody mobile-runner clichés.

Possible joke cabinet names:

- `Definitely Not Subway Monsters`;
- `Temple Delivery`;
- `Infinite Coin Line Simulator`.

Possible exaggerated jokes:

- absurdly perfect Coin lines;
- giant magnet power-up;
- ridiculous pursuer;
- constant `NEW HIGH SCORE` messages;
- intentionally overdramatic boosters.

The joke should target broad genre conventions rather than copy exact branded content.

## Behind-the-back Temple-style runner

Possible structure:

- portrait;
- camera behind Character;
- lane/side movement;
- jump;
- slide;
- turns;
- gaps;
- collapsing paths;
- chase pressure.

Possible theme:

**Dungeon Escape Delivery**

Example joke premise:

```text
Monster Girl delivers wrong package to dungeon boss
Boss: "That is not my order."
RUN.
```

Jungle/Fantasy worlds naturally support this format.

## Speed / Sonic-style route

Instead of building a complete new game, the broad high-speed runner fantasy may work as a temporary mode.

Possible features:

- extreme speed;
- ramps;
- springs;
- loops or loop-like set pieces;
- boost pads;
- large Coin arcs;
- strong flow.

Possible MGD name:

**Hyper Delivery**

This may fit better as a mutator or special stage than as a separate permanent game.

## Puzzle-runner variants

Some side modes could mix short runner sections with simple physics/puzzle interactions.

Potential use:

- cut ropes/chains;
- redirect package trajectory;
- move platforms;
- activate switches;
- guide a Delivery object to the courier.

Again, use broad mechanic ideas rather than copying branded levels or Characters.

## MGD Arcade / Runner Collection

A possible long-term arcade category:

- Monster Metro;
- Temple Delivery;
- Slime Dash;
- Demon Highway;
- Space Courier;
- Snow Rush.

Each can test a different classic runner structure using the same MGD universe.

## Possible standalone spin-offs

If MGD becomes successful, a polished alternate mode could later become its own game.

Example:

**Monster Girl Delivery Rush**

- portrait;
- lane runner;
- same universe;
- reused Characters/cosmetics where practical;
- separate gameplay balance and UI.

This should be considered only after the main MGD game has proven itself.

---

# N. Inspiration from other games

The goal is to borrow **design principles**, not copy protected content.

## Jetpack Joyride

Useful lessons:

- extremely accessible input;
- one-touch movement;
- pacing waves;
- temporary vehicles/mutators;
- vehicles as protection;
- safe recovery after vehicle loss;
- Coin patterns that guide movement;
- entertaining fail state;
- missions that change player behavior;
- fast restart;
- satisfying distance/Near-Miss statistics.

See `ENDLESS_RUNNER_BLUEPRINT.md` for the dedicated reference.

## Overwatch

Useful for player expression and Character identity:

- Character levels;
- mastery badges;
- portrait borders;
- profile icons;
- name cards/banners;
- titles;
- sprays/stickers;
- charms;
- emotes;
- victory poses;
- skins/outfits;
- seasonal events;
- rotating modes;
- Battle Pass progression.

Strong lesson:

> Many rewarding cosmetics can be cheap to produce because they do not need to modify the animated Character itself.

## League of Legends

Useful cosmetic lessons:

- full Character skins can be premium/high-production rewards;
- **chromas / color variants** can extend existing art with much lower production cost;
- profile icons and other account-expression items provide collection outside the Character model;
- different cosmetic tiers can coexist without every reward requiring a new gameplay asset.

For MGD, chromas are particularly attractive for outfits, hair, wings, bags, mounts, and Companions.

## World of Warcraft

Useful collection lessons:

- players enjoy collecting things even when many have no power advantage;
- outfits/transmog-like appearances;
- mounts;
- pets;
- novelty Toys;
- trophies/rare status objects;
- rotating cosmetic shops/reward sources.

Important MGD takeaway:

> Cosmetics can include **things you use, summon, display, ride, or decorate with**, not just things worn by the Character.

This supports Companions, broom/mount skins, HQ Toys, decorations, and trophies.

## Character-collection / gacha games

Useful ideas:

- strong individual Character identity;
- favorites;
- affinity/Bond;
- collection goals;
- exciting reward reveals;
- profile cards/name cards;
- avatars;
- outfit skins;
- weapon/gear appearances;
- glider/wing-like cosmetics;
- home/lobby backgrounds;
- battle VFX;
- Companion skins;
- stickers/emotes;
- pity/guarantees;
- duplicate protection;
- event reward pools;
- reruns;
- free tickets;
- selectors/wishlists.

The useful lesson is the **breadth of collectible presentation**, not necessarily aggressive monetization.

## Pokémon

Useful ideas:

- collection;
- optional minigames;
- small side activities;
- places to spend currency;
- attachment to individual Characters/creatures;
- creature traits/evolution as inspiration for Companions.

## Animal Crossing

Useful ideas:

- calm optional space;
- Character clothing;
- room/home decoration;
- furniture collection;
- environmental customization;
- play at own pace;
- activities that are fun without being progression-efficient.

For MGD, the strongest takeaway is that **the Delivery HQ itself can become a cosmetic collection surface**.

## Tamagotchi / virtual-pet games

Useful ideas:

- pet attachment;
- feeding/care;
- growth/evolution;
- tiny daily interactions;
- personalized habitat;
- visible response to player attention.

MGD should use the affectionate parts while avoiding harsh absence punishment or permanent pet death.

## Shenmue

Useful lesson:

- small jobs;
- arcade games;
- collectible toys;
- daily routines;
- world time;
- mundane interactions;
- spending time in the world can itself be enjoyable.

MGD should apply this on a much smaller scale through a compact HQ/neighborhood rather than trying to create a giant simulation-heavy open world.

## Simulation games

Useful lesson:

- visible progress makes repetitive actions satisfying;
- cleaning, repairing, sorting, unpacking, and organizing can work well as short side activities.

## Classic arcade games

Useful lesson:

- simple rules can remain fun for decades;
- tiny arcade games are cheap ways to add optional high-score play;
- MGD themes can make familiar mechanics feel playful and Character-specific.

## Mobile runner genre

Useful structures to explore:

- side-view runner;
- 3-lane portrait runner;
- behind-the-back chase runner;
- speed/flow runner;
- puzzle runner;
- vehicle runner.

These can inspire Event Modes, Arcade cabinets, or future spin-offs.

---

# O. Art, rendering and production notes

## Broad visual direction

Current exploration favors something like:

- anime/chibi Monster Girls;
- clean cartoon environments;
- cyber/fantasy Delivery flavor;
- strong silhouettes;
- clear mobile readability;
- modular assets;
- foreground/gameplay/background hierarchy.

## Minimal early asset set

Early prototype art should stay small:

- player;
- background;
- obstacle;
- Coin;
- effect;
- minimal UI.

## Parallax background

Backgrounds should ideally support:

- seamless horizontal repeat;
- multiple depth layers;
- easy replacement;
- parallax scrolling.

## Rendering sharpness

The final game should look sharp on modern mobile displays.

Important distinction:

- gameplay can use stable logical coordinates;
- rendering can still target device resolution appropriately;
- device resolution must not affect gameplay fairness;
- pixel art requires intentional scaling rather than accidental blur.

Pixel art remains a prototype convenience, not a permanent commitment.

## Cosmetic-friendly asset pipeline

If customization becomes important, art production should consider modularity early enough to avoid unnecessary rework.

Potential support:

- accessory anchor points;
- separate Delivery Bag layer;
- separate hat/glasses layers;
- independent trail origin;
- recolorable/chroma-friendly areas;
- reusable VFX attachment points;
- Companion accessory anchors.

Do not over-engineer this during the first prototype, but avoid an asset structure that makes every later cosmetic require redrawing the entire Character.

## Gyroscope in normal gameplay

Continuous tilt-parallax in fast runner gameplay may:

- distract from hazards;
- reduce precision;
- create motion discomfort;
- hurt readability.

It is therefore more promising for artwork, menus, Character viewing, and small minigames.

## Skeletal animation

Bone/skeletal animation may later help with:

- reusable animations;
- layered outfits;
- accessories;
- secondary motion;
- more Character variation.

This should remain a future/version-2-level investigation rather than early scope.

---

# P. Version priorities

## Version 1 — prove the runner is fun

Strong early focus:

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
- simple Gallery/collection hook;
- basic Delivery flavor.

## Early follow-up

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

## Later systems

Only after the core game is proven:

- Companion system;
- Mystery Eggs;
- Companion cosmetics;
- lightweight Companion care;
- Support Items / Character build system;
- Trait Extraction;
- Companion Fusion;
- Fusion Reactor / Lab;
- Pocket Courier / Tamagotchi-style activity;
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
- Battle Pass;
- premium currency;
- gacha;
- monetization;
- alternate portrait runners;
- standalone spin-offs;
- auto mode.

## Scope rule

Do not build:

**Runner + Pet RPG + Dating Sim + Truck Sim + Mechanic Sim + Arcade Collection + Gacha + Open World + Portrait Runner**

all at the same time.

Instead, treat later systems as small toys added around a strong core.

---

# Q. Open design questions

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

## Story and world

- How much plot does MGD need?
- Does the player own the company or just play its couriers?
- How large should the Delivery HQ become?
- Should NPC routines exist only in the HQ or in a small surrounding neighborhood?

## Characters

- Are Characters mechanically identical or slightly differentiated?
- How much outfit customization is feasible with the chosen art pipeline?
- When would skeletal animation become worth the cost?
- How far should Bond/relationship systems go?
- Should Character Skills affect normal play, or remain mostly sidegrades?
- Are temporary fusion forms worth exploring?

## Cosmetics

- Which cosmetic surfaces are most visible during normal gameplay?
- Should Delivery Bag be a major signature cosmetic category?
- How many chromas can an outfit support before variants feel cheap?
- Which profile elements should other players see in rankings?
- How customizable should Companions become?
- How much HQ decoration is useful before it becomes a full decorating game?
- Which cosmetics can be shared across Characters?
- Should event cosmetics always return eventually?

## Companions

- Are Companions purely cosmetic at first?
- Which utility perks remain fun without becoming mandatory?
- Should the first Mystery Egg be random or let the player choose from several eggs?
- How deep should Companion evolution become?
- Should evolution depend on gameplay behavior/world usage?
- How many active Trait slots should a Companion have?
- Should duplicates be used for fusion, extraction, or both?
- Is species hybrid fusion worth its art-production cost?

## Extraction / Fusion

- Does extraction copy a Trait, move it, or consume a duplicate?
- What should an Extraction Chip cost?
- What should a Fusion Battery cost?
- How often should Batteries be earnable without the shop?
- Should Reactor upgrades control Trait inheritance?
- Should ability fusion create fixed recipes or discoverable combinations?
- How can Fusion remain exciting without destructive RNG?

## Artwork and interaction

- How often should Character Care occur?
- Which Artwork Reveal mechanics remain fun after repetition?
- Should all reveals have a skip button?
- Which phone sensors feel delightful rather than gimmicky?
- Should microphone interactions always be opt-in?

## Economy

- How many currencies are actually necessary?
- What are the best Coin sinks?
- Do Extraction Chips/Fusion Batteries provide enough long-term Coin demand?
- Should Mystery Packages remain gameplay-only?
- Is gacha useful at all?
- How can monetization stay primarily cosmetic?

## Competition

- Which rankings are worth supporting?
- Should ranked challenges normalize Character, Companion, and Support Item effects?
- How long should seasons last?
- Are cooperative community goals more important than direct competition?

## Side activities

- Which one minigame would be cheapest and most fun to build first?
- Should Arcade Tokens exist or just use Coins?
- Should carnival games be seasonal or permanently available?
- Which simulator-like interaction best fits MGD: cleaning, unpacking, sorting, or repair?
- How many odd jobs are enough to make the world feel alive without overwhelming production?

## Alternative runners

- Is a portrait 3-lane runner best as an event, arcade game, or separate title?
- Can high-speed runner ideas work as short mutators instead of new games?
- Which alternate runner formats reuse enough MGD assets to justify development?

## Presentation

- Pixel art vs larger detailed sprites?
- Landscape-only core vs occasional portrait rewards?
- Does motion parallax look premium or distracting on real devices?

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
- playful use of phone hardware;
- a world where players can sometimes waste time just for fun.

A mature MGD could eventually let a player start a broom Delivery, hit a Gravity Flip section, land on a dinosaur, deliver a package, clean up the courier, reveal artwork, spend Coins at a rigged carnival booth, win a plushie, give it to a favorite Character, hatch a tiny Companion, customize its hat and Trail, extract a Trait, cause a suspicious Fusion Reactor incident, play one arcade cabinet, and then immediately start another run — while the core game itself remains understandable within seconds.

That is the kind of controlled variety MGD should aim for.

---

# Related documents

- [`../MASTER_SPEC.md`](../MASTER_SPEC.md) — approved product/game decisions and decision states
- [`ROADMAP.md`](ROADMAP.md) — milestone sequence
- [`BACKLOG.md`](BACKLOG.md) — preserved future gameplay ideas
- [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) — detailed Endless Runner / *Jetpack Joyride* design lessons
- [`ART_DIRECTION_IDEAS.md`](ART_DIRECTION_IDEAS.md) — art and visual-production ideas
- [`README.md`](README.md) — documentation hub
