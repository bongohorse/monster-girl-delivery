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
  - [Core fantasy](#core-fantasy)
  - [Story direction](#story-direction)
  - [Humor and fanservice](#humor-and-fanservice)
- [B. Core gameplay and run structure](#b-core-gameplay-and-run-structure)
  - [Delivery Mode](#delivery-mode)
  - [Endless Mode](#endless-mode)
  - [Delivery Chains](#delivery-chains)
  - [End-of-run flow](#end-of-run-flow)
- [C. Level selection, world map and difficulty](#c-level-selection-world-map-and-difficulty)
  - [Delivery World Map](#delivery-world-map)
  - [World and level progression](#world-and-level-progression)
  - [Difficulty curve](#difficulty-curve)
  - [Difficulty indicators](#difficulty-indicators)
  - [Authored vs procedural levels](#authored-vs-procedural-levels)
  - [Challenge, Daily and Weekly levels](#challenge-daily-and-weekly-levels)
- [D. Movement modes, vehicles and gameplay mutators](#d-movement-modes-vehicles-and-gameplay-mutators)
- [E. Worlds, themes and seasonal events](#e-worlds-themes-and-seasonal-events)
- [F. Characters, artwork and presentation](#f-characters-artwork-and-presentation)
  - [Customization](#customization)
  - [Gallery and Locker Room](#gallery-and-locker-room)
  - [Character Care / Cleanup](#character-care--cleanup)
  - [Artwork Reveal minigames](#artwork-reveal-minigames)
  - [Portrait Mode and Gyroscope Parallax](#portrait-mode-and-gyroscope-parallax)
  - [Animation and art pipeline](#animation-and-art-pipeline)
- [G. Progression, achievements and collectibles](#g-progression-achievements-and-collectibles)
- [H. Economy, rewards, loot and monetization ideas](#h-economy-rewards-loot-and-monetization-ideas)
- [I. Dailies, rankings, seasons and community systems](#i-dailies-rankings-seasons-and-community-systems)
- [J. Side activities, management and cozy meta game](#j-side-activities-management-and-cozy-meta-game)
- [K. Inspiration from other games](#k-inspiration-from-other-games)
- [L. Art, rendering and production notes](#l-art-rendering-and-production-notes)
- [M. Version priorities](#m-version-priorities)
- [N. Open design questions](#n-open-design-questions)
- [Related documents](#related-documents)

---

# A. Vision, identity, story and tone

## High-level direction

Monster Girl Delivery should first become a **simple, responsive, fun mobile runner**. The strongest early reference is still *Jetpack Joyride*: one-touch control, strong game feel, short sessions, readable hazards, pacing waves, temporary gameplay changes, rewarding missions, entertaining fail states, and fast restarts.

The project should not try to implement every preserved idea at once.

A useful long-term principle is:

> **One simple core game + many temporary variations + rewarding long-term collection.**

The player should understand the basic controls almost immediately while new worlds, temporary movement modes, characters, cosmetics, missions, collectibles, events, and progression keep the game interesting over time.

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

This premise is flexible enough to justify almost any world, event, vehicle, or gameplay modifier.

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

Genre parody can also be part of the humor:

- exaggerated ninja run;
- giant anime energy aura;
- absurd hair transformation;
- overly long power-up sequence;
- magical-girl transformation parody;
- mecha parody;
- isekai clichés;
- tournament-arc jokes.

Prefer broad genre parody over copying specific protected characters or exact designs.

---

# B. Core gameplay and run structure

## Core control philosophy

MGD can eventually contain many gameplay ideas without requiring many permanent controls.

> **Keep the permanent control vocabulary small. Temporarily change what those controls do.**

That preserves accessibility while still allowing very different-feeling sections.

## Delivery Mode

One strong direction is for the main game to contain **finishable delivery levels**, not only endless survival.

Example:

```text
Order arrives
→ accept delivery
→ customer is 1,200 m away
→ run / fly / dodge / collect
→ reach destination
→ deliver package
→ result / reward
```

A distance marker such as `Customer: 850 m` gives the player a clear objective.

This answers both:

- **Gameplay:** How do I survive the route?
- **Theme:** Where am I going and why?

Delivery levels also create natural places for customers, jokes, short story scenes, ratings, optional objectives, and unlocks.

## Endless Mode

A classic Endless Mode should still exist.

Possible goals:

- maximum distance;
- highest score;
- longest survival;
- most coins;
- longest Near-Miss chain;
- highest Delivery Flow combo;
- character-specific records;
- leaderboard placement.

A mature game could therefore contain:

- **Delivery Mode** — finishable jobs;
- **Endless Mode** — arcade survival/high score;
- **Challenge Mode** — fixed skill tests;
- **Event Modes** — temporary seasonal rules.

## Delivery Chains

A successful delivery does not necessarily have to end play immediately.

Possible structure:

```text
Delivery complete
→ optional next express order
→ continue the same run
→ increasing Delivery Chain bonus
→ another delivery
→ eventually fail or voluntarily stop
```

A thematic variation is a **Bonus Package Catch**:

- the next parcel is thrown/dropped into the gameplay area;
- the player must catch it;
- success starts a bonus delivery;
- failure simply ends the chain normally rather than heavily punishing the player.

This could become a distinctive MGD mechanic.

A player-friendly version is to officially complete the current delivery first, then offer:

- **Finish Run**
- **Next Delivery**

## End-of-run flow

The end of a run should be entertaining and rewarding even after failure.

### Successful delivery

Possible short sequence:

1. reach destination;
2. character stops at the customer;
3. package is handed over;
4. customer reacts;
5. brief joke, pose, animation, or expression;
6. result screen.

Scenes should be brief and skippable.

### Failure

Avoid a boring instant `GAME OVER` freeze.

Possible fail-state elements:

- tumble;
- slide;
- ragdoll-like continuation;
- broom continues without rider;
- package bounces ahead;
- remaining distance shown;
- humorous character reaction.

Failure itself can be entertaining, following a useful *Jetpack Joyride* lesson.

### Results screen

Possible stats:

- distance;
- delivery time;
- coins;
- pickups;
- near misses;
- package condition;
- optional objectives;
- Delivery Flow / combo;
- mission progress;
- character XP;
- account XP;
- new records;
- delivery rating;
- unlocks.

Possible ratings:

- stars;
- C / B / A / S / S+;
- `Perfect Delivery`;
- special badges.

### Reward philosophy

**Bad runs should not delete progress or feel like wasted time.**

Good play should grant extra rewards while weak runs still move something forward.

Avoid:

- losing earned currency on crash;
- harsh progress loss;
- energy systems that punish attempts;
- mandatory payment to restore normal progress.

---

# C. Level selection, world map and difficulty

## Delivery World Map

A strong level-selection idea is a **visual overview map**, inspired by games such as *Yoshi's Island*, but themed as a delivery region.

Instead of a plain list like `Level 17`, the player sees a map with connected delivery nodes.

Example:

```text
MONSTER CITY

1-1 Apartment District
        ↓
1-2 Shopping Street
        ↓
1-3 Construction Zone
      ↙       ↘
1-4A Rooftops   1-4B Subway
      ↘       ↙
       1-5 Finale
```

Possible node markers:

- 📦 normal delivery;
- ⏱ express delivery;
- 💎 bonus route;
- ⚠ dangerous route;
- 🎁 mystery delivery;
- 👑 challenge stage;
- seasonal/event node;
- character-specific job.

The map can make progression feel like traveling through an actual delivery area rather than selecting abstract stages.

Later, small courier icons could physically move between nodes.

## World and level progression

For the main Delivery Mode, every new player can begin in **World 1 / Map 1** and unlock later areas progressively.

Rather than one endless list of levels, progression could be organized into worlds:

```text
World 1 — Monster City
World 2 — Fantasy District
World 3 — Jungle
World 4 — Cyber City
World 5 — ...
```

Each world might contain a manageable group of routes, for example roughly 8–15 main deliveries plus optional stages. The exact amount is TBD and should depend on production capacity and playtesting.

Unlocking later worlds can provide a clear long-term objective while still allowing Endless Mode and events to sit outside the campaign map.

## Difficulty curve

Levels should become harder **on average**, but not every single level needs to be strictly harder than the previous one.

A constantly rising staircase can become exhausting.

Prefer **difficulty waves**:

```text
Easy
→ Medium
→ Medium
→ Hard
→ Fun / lower-pressure special level
→ Medium
→ Hard
→ Finale
```

New mechanics should first appear in safe situations before being combined with older hazards.

Example:

```text
2-2: introduce Gravity Flip with easy obstacles
2-4: Gravity Flip + lasers
2-7: Gravity Flip + lasers + moving hazards
```

This lets the game teach through play instead of long tutorials.

## Difficulty indicators

Routes could show a simple danger rating before the player enters.

Possible presentations:

- ★☆☆☆☆ to ★★★★★;
- Easy / Normal / Dangerous / Extreme;
- colored danger icons;
- delivery-company risk classification.

The rating describes the **route itself** rather than requiring multiple difficulty versions of every level.

Creating Easy/Normal/Hard variants for every route would multiply balancing and content work, so that should only be considered if later testing shows a real need.

## Optional hardcore routes

Hardcore content should usually be optional.

A world-map branch might contain:

```text
1-5 Main Route
  └─ ⚠ Challenge Delivery
```

Possible challenge rules:

- no-hit;
- higher speed;
- difficult coin lines;
- strict time limit;
- no revive;
- perfect package condition;
- special mutator combination.

Rewards should preferably be prestige/cosmetic items rather than mandatory power:

- badge;
- banner;
- profile frame;
- trail;
- artwork;
- achievement.

This allows normie players to continue while hardcore players receive a meaningful skill ceiling.

## Authored vs procedural levels

MGD does not need to choose between fully hand-built and fully random levels.

A promising model is:

> **Authored level skeleton + controlled procedural patterns + fixed setpieces.**

A route can have a defined identity:

```text
Rooftop Delivery
Distance: 1,600 m
Movement: Jetpack
Theme: Rooftops
Main mechanic: Ventilation hazards
```

Within that structure, controlled variation can change:

- hazard patterns;
- coin patterns;
- bonus pickups;
- optional enemy positions;
- Mystery Packages;
- safe route / risky route combinations.

Important scripted setpieces can stay fixed.

Examples:

- flying through a building;
- a window breaks;
- character drops into a lower route;
- gravity suddenly flips;
- giant sign collapses;
- chase sequence starts.

This keeps levels recognizable without making every replay identical.

Procedural content should always follow fairness rules, not unconstrained random spawning.

## Challenge, Daily and Weekly levels

Fixed-seed challenge routes are especially useful for rankings.

### Daily Delivery

Every player receives the same seed and conditions for that day.

### Weekly Delivery

A larger fixed challenge can use:

- same route;
- same hazards;
- same character or normalized stats;
- same movement modifier;
- same scoring rules.

This makes competition about skill instead of random luck or paid power.

---

# D. Movement modes, vehicles and gameplay mutators

Temporary gameplay changes can keep the runner fresh while preserving simple controls.

## Flight

Possible forms:

- jetpack;
- witch broom;
- wings;
- rocket pack;
- magical propulsion;
- hover device.

## Running

A grounded runner mode can focus on jumping, ducking, and sliding.

Possible obstacles:

- crates;
- holes;
- lasers;
- cats and dogs;
- construction workers;
- pipes;
- road barriers;
- traffic;
- low ceilings;
- moving machinery.

Pipes or rails can become short slide sections.

## Gravity Flip

Reverse gravity so the character travels along the ceiling. This creates very different timing without requiring complex controls.

## Water / Jetski physics

A water mode can use:

- waves;
- momentum;
- jumping from water;
- landings;
- summer/coastal presentation.

## Pogo Stick

Automatic bouncing with deliberately difficult, funny timing.

## Giant bouncing ball

The character bounces through the route on a huge ball.

## Monster transformations

Monster-specific temporary forms could include:

- rolling ball;
- dragon;
- slime;
- bat;
- ghost;
- rocket-like form;
- other species-specific transformations.

This can make character identity mechanically playful.

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
- hoverbike;
- motorcycle;
- jetski;
- minecart;
- delivery drone;
- spaceship;
- submarine;
- small mech;
- flying taxi.

The monster girl should remain visible whenever practical because the characters are a major visual attraction of the game.

Useful solutions:

- ride on top;
- open cockpit;
- transparent cockpit;
- hang from the vehicle;
- visually transform into the special form.

Vehicles can also act as temporary crash protection or an extra life. When a vehicle is destroyed, use a short **safety clear / orientation window** so the player is not killed unfairly immediately afterward.

---

# E. Worlds, themes and seasonal events

## Possible worlds

### Monster City

Main everyday setting with streets, stores, apartments, rooftops, traffic, and delivery addresses.

### Fantasy / Dungeon

Castles, villages, dungeons, dragons, traps, magic, medieval customers.

### Cyberpunk

Neon, hover traffic, drones, corporations, robots, futuristic data deliveries.

### Jungle

Ruins, rivers, vines, animals, temples, dense foliage.

### Robot Factory

Conveyor belts, lasers, pistons, crushers, machines, industrial robots.

### Candy World

Cute exaggerated sweets environment with candy, cakes, chocolate, pastel scenery, and strange edible hazards.

### Beach / Summer

Sand, sea, palms, beach balls, water, dolphins, jetski sections.

### Snow / Winter

Snow, ice, mountains, frozen roads, snowmen, festive lighting.

### Haunted

Graveyards, ghosts, fog, haunted mansions, bats, Halloween props.

### Demon District

Demonic architecture, lava, clubs, neon, and absurd demon bureaucracy.

### Monster Academy

School/university setting with classrooms, dorms, sports areas, magical experiments.

### Space

Orbital stations, alien planets, asteroids, zero-gravity visuals, spaceships. Space may work better as a theme and set of route mechanics than as a completely separate game.

## Time-travel idea

A later narrative device could justify radically different eras:

- Stone Age;
- Bronze Age;
- antiquity;
- medieval period;
- Renaissance;
- Wild West;
- modern day;
- cyberpunk future;
- distant space future.

A broken or experimental delivery portal could explain why parcels must be delivered across history.

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
- game anniversary.

Events can change:

- maps;
- decorations;
- music;
- hazards;
- collectibles;
- cosmetics;
- missions;
- customers;
- movement modifiers;
- rewards.

### Summer ideas

- beach environment;
- summer outfits / bikinis for clearly adult characters;
- sunglasses;
- water pistols;
- sand;
- sea;
- beach balls;
- palms;
- sunscreen jokes;
- tanning / tan-line cosmetic jokes;
- dolphins;
- jetski gameplay;
- water physics.

### Winter / Christmas ideas

- snowball fights;
- snowmen;
- Santa-inspired outfits;
- Christmas trees;
- lights;
- presents;
- reindeer mount;
- sleigh section;
- icy physics.

### Seasonal gameplay remix

A seasonal event does not always need a completely new minigame.

Examples:

- Halloween Ghost Mode;
- winter ice physics;
- summer jetski route;
- Lunar New Year dragon section;
- anniversary remix containing several old mutators.

---

# F. Characters, artwork and presentation

## Customization

Players should have multiple ways to make a favorite monster girl feel like **their version** of that character.

Possible customization:

- full outfits;
- hats;
- glasses;
- hair accessories;
- jewelry;
- shoes;
- delivery bags;
- wings;
- horns;
- tail decorations;
- charms;
- trails;
- aura effects;
- pickup effects;
- crash effects;
- victory poses;
- emotes.

### Cheap high-value cosmetics

Particularly useful for a small team:

- profile icons;
- banners / name cards;
- titles;
- badges;
- portrait frames;
- stickers;
- delivery stamps;
- trails;
- VFX color variants;
- package skins;
- loading-screen art;
- UI themes;
- simple accessories.

These create visible ownership and status without requiring a fully redrawn animation set.

## Gallery and Locker Room

The Gallery can collect:

- character artwork;
- event artwork;
- delivery scenes;
- customer scenes;
- concept art;
- special animations;
- collectible photos;
- world illustrations.

A **Locker Room / Character Viewer** can combine collection and customization.

Possible actions:

- choose character;
- change outfit;
- equip accessories;
- select trail/aura;
- preview animation;
- choose pose;
- change background;
- view artwork;
- inspect collectibles;
- take screenshots.

This gives the game a calm character-focused counterpoint to the runner.

## Character Care / Cleanup

A new post-run / reward idea is to let the monster girl return from a difficult delivery visibly affected by the route.

Possible dirt/effects:

- dust;
- mud;
- soot;
- snow;
- leaves;
- water;
- paint;
- slime.

The player can perform a short care/cleanup interaction similar to grooming a pet or horse.

Possible interactions:

- wipe dirt away;
- soap the character up;
- rinse;
- brush or comb hair;
- remove leaves or debris;
- clean accessories;
- polish equipment.

Example:

```text
Character returns from delivery
→ dirty / messy state
→ wipe dirt
→ use soap
→ rinse
→ comb hair
→ Perfect Care
→ artwork reveal
```

This can create a slower, more affectionate transition after intense gameplay and strengthen attachment to the characters.

It should **not** be mandatory after every short run. Better triggers include:

- first completion of a special route;
- character level milestone;
- artwork unlock;
- seasonal event;
- rare dirty/messy delivery state;
- relationship/bond milestone.

Possible small rewards:

- bonus coins;
- bonus XP;
- Care rating;
- badge progress;
- cosmetic progress.

The main artwork reward should not be lost because the player performs the care interaction badly.

## Artwork Reveal minigames

Artwork does not always need to appear instantly. Different worlds or unlocks can use small themed reveal interactions.

Important principle:

> **The artwork has already been earned. The reveal minigame celebrates the reward; it should not become a frustrating gate.**

Possible reveal methods:

### Wipe / clean

- wipe dirt from the screen;
- remove condensation;
- clean a dirty window;
- wipe water away.

### Scratch-card reveal

Rub or scratch away a covering layer like a scratch ticket.

This is especially natural on touchscreens.

### Puzzle

Assemble pieces of the artwork.

### Sliding puzzle

A classic 3×3 or 4×4 sliding puzzle. Best kept optional because some players dislike this puzzle type.

### Photo development

The image slowly develops while the player wipes, taps, tilts, or interacts with it.

### Polaroid shake

A Polaroid appears and the player moves/shakes the phone using motion sensors until the image becomes visible.

### Gift unwrap

Tear away wrapping paper. Especially suitable for Christmas, birthdays, anniversaries, and special gifts.

### Package opening

A very MGD-specific version:

```text
Mystery artwork delivered
→ cut/open package tape
→ open parcel
→ pull out artwork
```

### World-specific reveals

**Beach:** brush sand away.  
**Winter:** scrape snow or ice away.  
**Slime/Sewers:** pull sticky slime off the image.  
**Cyberpunk:** decrypt/glitch-clean the image.  
**Haunted:** clear fog or ghosts.  
**Fantasy:** break a magical seal or crystal layer.  
**Jungle:** move leaves and vines aside.  
**Robot Factory:** remove panels / unlock a mechanical cover.

Small bonus points can be awarded for speed or accuracy, but completing the reveal should always unlock/show the artwork.

This creates a useful loop:

```text
Delivery
→ reward earned
→ optional care/reveal interaction
→ artwork shown
→ artwork added to Gallery
```

## Portrait Mode and Gyroscope Parallax

Special character rewards could ask the player to rotate from landscape to portrait:

```text
Special reward unlocked
→ TURN YOUR PHONE
→ rotate to portrait
→ full-screen character artwork
→ small interaction / animation
→ return to normal game
```

Good uses:

- character unlock;
- gallery;
- event reward;
- victory moment;
- relationship scene;
- rare artwork reveal.

Portrait changes should not frequently interrupt normal runner gameplay.

### Gyroscope / Tilt Parallax

Character artwork can use the gyroscope/accelerometer for fake 3D depth.

Possible layers:

- distant background;
- near background;
- character;
- hair/accessories;
- foreground particles.

Different movement amounts create a depth illusion as the player tilts the phone.

This is promising for:

- Gallery;
- Locker Room;
- artwork reveals;
- victory screens;
- special character views.

Using it continuously during fast runner gameplay may be distracting, reduce readability, or cause motion discomfort. Treat gameplay use as an experiment rather than a default feature.

## Animation and art pipeline

### Sprite customization problem

Full outfits are expensive with frame-by-frame sprite animation because every animation frame may need another costume version.

Early customization should therefore emphasize:

- hats;
- glasses;
- simple accessories;
- trails;
- auras;
- VFX;
- package skins;
- profile cosmetics.

### Accessory anchor points

A future sprite system could expose separate attachment points for:

- head;
- face;
- back;
- hand;
- bag;
- trail origin.

This can create many combinations without redrawing every frame.

### Skeletal / bone animation

A future 2D skeletal system could eventually support:

- reusable animations;
- layered outfits;
- accessories;
- secondary motion;
- more character variants.

Spine is well known but expensive. Free/cheaper alternatives can be researched later.

This is not a current priority. It is more appropriate for version 2 or much later after the runner itself is proven fun.

---

# G. Progression, achievements and collectibles

## Collectibles

Possible collectible categories:

- character cards;
- gallery artwork;
- photos;
- delivery stickers;
- badges;
- cosmetics;
- world souvenirs.

Example souvenirs:

**Beach**
- shell;
- sunglasses;
- miniature palm.

**Cyberpunk**
- data chip;
- neon keychain;
- broken drone part.

**Fantasy**
- dragon scale;
- potion bottle;
- magic stone.

Avoid introducing too many currencies just because many collectible types exist.

## Achievements

Achievements can mix mastery and jokes.

Possible examples:

- deliver 100 packages;
- perform 100 Near Misses;
- travel 1 km upside down;
- finish a no-hit run;
- complete a difficult route with one character;
- repeatedly deliver to a memorable customer;
- catch multiple bonus packages in one chain;
- finish a seasonal challenge.

Possible rewards:

- title;
- badge;
- profile frame;
- icon;
- coins;
- cosmetic;
- artwork.

## Unlockables

Possible unlocks:

- monster girls;
- outfits;
- accessories;
- trails;
- auras;
- vehicles;
- mounts;
- Gallery art;
- maps;
- music;
- emotes;
- victory poses;
- delivery bags;
- package skins;
- profile icons;
- banners;
- titles;
- badges;
- UI themes.

The player should regularly feel that playing advances something.

## Character progression

Each monster girl could have a personal mastery track.

Possible rewards:

- badge;
- portrait frame;
- title;
- character icon;
- banner;
- sticker;
- emote;
- pose;
- artwork;
- accessory.

This provides visible dedication to a favorite character without requiring power advantages.

## Account progression

Separate overall Account XP can come from:

- runs;
- deliveries;
- missions;
- achievements;
- events;
- challenges.

Possible rewards:

- coins;
- Mystery Packages;
- profile frames;
- titles;
- feature unlocks;
- Gallery rewards.

---

# H. Economy, rewards, loot and monetization ideas

## Coins

Normal earnable currency from gameplay and missions.

Possible uses:

- cosmetics;
- Mystery Packages;
- minigames;
- simple unlocks;
- shop rotations;
- gifts;
- arcade machines.

## Gems / premium currency

A later optional currency might be used for:

- premium cosmetics;
- optional time-saving;
- event items;
- revive;
- special shop purchases.

Gems are not necessary for the early game.

## Monetization direction

Prefer:

- cosmetics;
- optional convenience;
- optional time-saving;
- optional ad rewards;
- cosmetic seasonal passes.

Avoid making payment the primary route to leaderboard power.

The broad desired direction is closer to **pay for cosmetics / optional time-saving** than pay-to-win.

## Mystery Packages / loot boxes

Loot-box-like rewards fit the delivery theme naturally if presented as parcels.

Possible names:

- Mystery Package;
- Mystery Delivery;
- Lost Parcel;
- Premium Parcel;
- Monster Box.

Possible sequence:

```text
MYSTERY DELIVERY RECEIVED
→ package lands in the office
→ package shakes
→ player opens it
→ reward reveal
```

Possible rewards:

- coins;
- icons;
- stickers;
- trails;
- banners;
- badges;
- accessories;
- artwork;
- cosmetics.

For early versions these should be treated as **earnable gameplay rewards**, not necessarily real-money random purchases.

Real-money random rewards introduce legal, rating, platform, and player-trust concerns and should only be considered much later, if at all.

## Gacha ideas

Gacha is only one possible future system and is not required for MGD.

Common building blocks:

- banners;
- single/multi pulls;
- rarity tiers;
- pity;
- featured guarantee;
- duplicate conversion;
- spark/selector after enough pulls;
- wishlist;
- free tickets;
- reruns.

If MGD ever uses gacha, a **cosmetic-focused** system is preferable to locking major gameplay power behind random pulls.

Example seasonal pool:

**Summer Mystery Delivery**

- adult-character summer outfit;
- sunglasses;
- beach banner;
- dolphin sticker;
- water trail;
- summer profile icon;
- beach artwork.

Possible player-friendly rules:

- guaranteed Rare+ after a threshold;
- guaranteed Epic+ after a larger threshold;
- direct featured-item selector after enough attempts;
- duplicate conversion into Delivery Tokens;
- desired cosmetics purchasable with Tokens;
- carry-over pity where appropriate;
- earnable tickets from gameplay.

## Shop

Possible deterministic shops:

- coin shop;
- cosmetic shop;
- daily/weekly rotation;
- event shop;
- Delivery Token shop;
- gift shop;
- premium cosmetic shop.

Players should have meaningful ways to earn customization through gameplay rather than seeing the whole system as a payment screen.

## Gifts

### Gifts to the player

- daily gift;
- event gift;
- anniversary gift;
- compensation package;
- achievement reward.

### Gifts to characters

Possible later Bond/Friendship items:

- food;
- flowers;
- games;
- plushies;
- souvenirs;
- character-specific favorites.

These could unlock dialogue, artwork, poses, emotes, small stories, and cosmetics.

---

# I. Dailies, rankings, seasons and community systems

## Daily Login

A simple login track can reward returning.

Example:

| Login step | Example reward |
|---|---|
| 1 | Coins |
| 2 | More coins |
| 3 | Small Mystery Package |
| 4 | Coins + XP |
| 5 | Ticket / special reward |
| 6 | Rare package |
| 7 | Epic Mystery Delivery |

Missing one real-world day should preferably **not reset the entire chain**. Reward returning; do not punish people for having a life outside the game.

## Daily Missions

Possible dailies:

- deliver 3 packages;
- collect 500 coins;
- fly 2,000 m with a broom;
- perform 20 Near Misses;
- use a vehicle;
- play a specific character;
- catch a bonus package;
- finish a no-damage route;
- complete a Gravity Flip objective.

Useful quality-of-life rule:

- one free daily reroll.

Possible rewards:

- coins;
- XP;
- character XP;
- account XP;
- event points;
- Mystery Packages.

Dailies should encourage variety without becoming chores.

## Weekly Missions

Larger milestones can award better packages or cosmetics.

Example:

```text
10 weekly points → reward
20 weekly points → better reward
40 weekly points → weekly Mystery Package
```

## Rankings

Do not rely on one global leaderboard only.

Possible categories:

- longest Endless distance;
- highest score;
- fastest delivery;
- most coins in one run;
- best Near-Miss chain;
- highest Delivery Flow;
- weekly fixed challenge;
- character-specific score;
- friends-only ranking.

Competitive rankings become less meaningful if paid upgrades dominate. Serious competition should use normalized conditions where possible.

## Ranking leagues

Possible seasonal prestige tiers:

- Bronze;
- Silver;
- Gold;
- Platinum;
- Diamond;
- Master.

Rewards should mainly be visible status/cosmetics:

- profile frame;
- badge;
- title;
- banner;
- seasonal icon.

## Global community events

MGD's theme fits cooperative global goals very well.

Example:

```text
GLOBAL DELIVERY EVENT
Goal: 10,000,000 deliveries

1M  → Coins
3M  → Mystery Package
5M  → Event Artwork
10M → Special Cosmetic
```

Everyone contributes simply by playing.

## Character/team competitions

Players can support a favorite courier:

- Team Demon Girl;
- Team Slime Girl;
- Team Dragon Girl;
- Team Harpy.

Each successful delivery contributes to the team total.

Possible result structure:

- everyone participating receives something;
- winning team gets an extra badge/banner/artwork;
- results become part of seasonal history.

## Battle Pass / seasonal progression

A seasonal pass can work later, but it creates a constant content-production obligation and should not be an early priority.

Possible **Summer Delivery Pass** rewards:

- coins;
- tickets;
- icons;
- stickers;
- trails;
- banners;
- artwork;
- outfits.

Player-friendly ideas:

- choose which reward branch to progress first;
- allow old seasonal tracks to return or remain available instead of relying entirely on permanent FOMO.

---

# J. Side activities, management and cozy meta game

## Minigames

Possible side activities:

- slot machine;
- crane/claw machine;
- package sorting;
- timing game;
- drone race;
- card matching;
- fishing;
- arcade cabinets;
- short seasonal minigames.

Each minigame is effectively a small game project of its own, so these belong after the runner is already strong.

## Slot machine / arcade currency sink

Coins could be used in an in-game arcade/slot-style machine for:

- coins;
- stickers;
- collectibles;
- small cosmetics;
- Mystery Packages.

If implemented, this should use soft currency and not require real-money wagering.

## Delivery-company management

A larger future meta system could let the player operate the delivery company.

Possible actions:

- recruit couriers;
- assign characters to jobs;
- upgrade the base;
- unlock regions;
- buy vehicles;
- improve rooms;
- collect passive company rewards;
- decorate the office;
- expand warehouse/garage.

## Delivery HQ as a physical menu

Instead of abstract menus, the headquarters could contain:

- reception;
- garage;
- warehouse;
- Locker Room;
- Gallery;
- arcade;
- café;
- character rooms.

Entering a room effectively opens that system.

## Cozy / low-pressure activities

A later calm side of MGD could provide contrast to the fast runner.

Possible activities:

- decorate rooms;
- talk to characters;
- sit around the base;
- fish;
- collect objects;
- play arcade machines;
- take photos;
- complete tiny jobs;
- inspect trophies and souvenirs;
- Character Care / grooming.

The player should sometimes be allowed to do things because they are enjoyable rather than because every second must optimize progression.

## Relationship / dating-sim direction

A full dating sim would be a major separate system and should not be assumed.

A lighter Bond system could come first:

```text
Use character
→ earn Bond XP
→ give gifts
→ unlock dialogue
→ unlock small scenes
→ unlock artwork / emotes / poses
```

A full romance system can remain a later question.

## Auto Mode

Possible uses:

- accessibility;
- low-pressure farming;
- company-management simulation;
- previously completed easy deliveries.

Main risk:

> If automatic play gives the same value as actually playing, why should the player control the runner?

Auto Mode should therefore be a support feature, not the main progression method.

## Revive / Continue

A later mobile feature could allow one continue after crashing through:

- optional advertisement;
- gem;
- rare revive item.

After revival, give a short protection/safety window.

---

# K. Inspiration from other games

## Jetpack Joyride

Useful principles:

- extremely accessible input;
- polished one-touch movement;
- pacing waves rather than only linear difficulty;
- temporary vehicles / mutators;
- vehicles as temporary protection;
- safe recovery after losing a vehicle;
- coin patterns that teach movement;
- entertaining fail state;
- missions that redirect player behavior;
- quick restarts;
- satisfying distance and Near-Miss statistics.

See `docs/ENDLESS_RUNNER_BLUEPRINT.md` for the dedicated reference document.

## Overwatch

Useful for **player expression and hero identity**, not combat.

| Overwatch-style concept | Possible MGD version |
|---|---|
| Hero level | Monster-girl level |
| Hero badge | Character mastery badge |
| Portrait border | Profile / character frame |
| Player icon | Monster-girl profile icon |
| Name card | Profile banner |
| Player title | Delivery title |
| Spray | Sticker / delivery stamp |
| Charm | Bag / broom / vehicle charm |
| Emote | Character emote |
| Victory pose | Delivery result pose |
| Skin | Outfit |
| Loot box | Mystery Package |
| Battle pass | Seasonal Delivery Pass |
| Arcade modes | Rotating runner modifiers |
| Seasonal events | Seasonal delivery events |
| Hero progression | Character mastery |
| Challenges | Daily / weekly deliveries |

Main lesson: many satisfying rewards do **not** need to modify the animated character sprite itself.

## Gacha / character-collection games

Useful ideas even without aggressive monetization:

- strong character identity;
- favorite-character progression;
- collections;
- exciting reward reveals;
- pity / guarantees;
- duplicate protection;
- event reward pools;
- affinity systems;
- character stories;
- reruns;
- earnable pulls/tickets;
- wishlists/selectors.

The useful part is **collection psychology and character attachment**, not necessarily selling random power.

## Fortnite

- Locker/customization;
- cosmetics as identity;
- emotes;
- seasonal presentation;
- profile expression.

## Pokémon

- collection;
- optional minigames;
- side activities;
- places to spend accumulated currency;
- attachment to individual creatures/characters.

## Animal Crossing

- calm optional meta space;
- decorating;
- collecting;
- playing at your own pace;
- non-competitive activities.

The intention is to borrow useful design principles rather than clone any one game.

---

# L. Art, rendering and production notes

## Broad visual direction

Current exploration points toward:

- anime/chibi monster girls;
- clean cartoon environments;
- light cyber/fantasy delivery flavor;
- strong silhouettes;
- readable mobile composition;
- modular assets;
- clear background/gameplay/foreground hierarchy.

Possible production methods:

- reusable tiles/patterns;
- tinting and mirroring;
- region-specific palettes;
- overlay variations;
- modular character pieces;
- sprite + transform animation mix;
- cheap secondary animation where useful.

See `docs/ART_DIRECTION_IDEAS.md` for deeper visual exploration.

## Pixel art is not a final commitment

Pixel art is useful for prototyping because it is:

- fast;
- cute;
- readable;
- forgiving when assets are incomplete.

The final game may use larger high-detail artwork or another style entirely.

## Minimal early asset set

For early visual improvement, keep the asset list small:

- player;
- background;
- obstacle;
- coin;
- effect;
- minimal UI.

A visible package asset was not required for the earliest gameplay prototype, even though packages may become more important later.

## Parallax background

Background assets should support:

- seamless horizontal repetition;
- multiple depth layers;
- parallax scrolling;
- easy replacement while the final style remains undecided.

## Rendering sharpness / resolution

The prototype was observed to look blurrier or lower-resolution than expected on modern mobile displays.

Desired long-term result: **sharp mobile presentation**, not accidental 720p-like softness.

Important distinction:

- gameplay may use a stable logical coordinate system;
- rendering can still use device/display resolution appropriately;
- device resolution should not alter gameplay fairness;
- pixel art, if retained, needs intentional scaling/filtering rules.

The current small pixel assets should not force the entire final renderer into a low-resolution look.

---

# M. Version priorities

## Version 1 — prove the runner is fun

Strong early focus:

- one good playable monster girl;
- responsive one-touch movement;
- one readable route/world;
- hazards;
- coins;
- good pacing;
- satisfying fail behavior;
- fast restart;
- basic result screen;
- simple missions;
- perhaps one or two gameplay mutators;
- simple collection/gallery hook;
- basic delivery flavor.

The first version should focus on the things that make *Jetpack Joyride*-style gameplay fun before building large meta systems.

## Good early follow-up systems

After the runner itself works:

- finishable Delivery Mode;
- Endless Mode;
- Delivery World Map;
- more monster girls;
- more worlds;
- achievements;
- account/character XP;
- unlockables;
- earnable Mystery Packages;
- cheap cosmetics;
- trails/VFX;
- Gallery;
- Daily Missions;
- seasonal experiments;
- first artwork reveal interaction.

## Later systems

Only after the core game proves itself:

- full Locker Room;
- large outfit library;
- skeletal animation;
- Character Care system;
- many artwork reveal minigames;
- portrait artwork interactions;
- gyroscope artwork;
- global rankings;
- large seasonal modes;
- Battle Pass;
- premium currency;
- gacha;
- monetization systems;
- minigames;
- Delivery Company management;
- relationship/dating systems;
- cozy hub activities;
- Auto Mode.

## Possible mature long-term loop

```text
Order arrives
→ choose monster girl / cosmetics
→ select route on Delivery Map
→ run / fly / dodge / collect
→ temporary movement modifier or vehicle
→ complete delivery
→ customer reaction
→ results
→ coins + XP + mission progress + collectibles
→ character/account progression
→ occasional Character Care / Artwork Reveal
→ unlock cosmetics / artwork / Mystery Packages
→ visit Locker Room / Gallery / HQ if desired
→ next delivery or Endless Mode
```

Seasonal events, rankings, minigames, management, and relationship systems should sit around this loop rather than replace it.

---

# N. Open design questions

These questions are intentionally unresolved.

## Core structure

- Should Delivery Mode become the primary mode or sit equally beside Endless?
- Should reaching a customer always end the run?
- Should Delivery Chains become a major scoring system?
- How often should temporary movement modes appear?
- How many permanent controls should the finished game have?

## Level structure

- Should the campaign use one main linear route with optional branches, or several equal paths?
- How many levels should each world contain?
- Should every player begin at World 1, or should later versions allow alternative starts?
- How much of a level should be authored versus procedurally varied?
- Should difficulty be shown with stars, colors, text, or an in-world delivery-risk rating?
- How often should challenge routes branch away from the main path?

## Story

- How much actual plot does MGD need?
- Is the delivery company the main narrative anchor?
- Does the player own/manage the company or simply play its couriers?

## Characters

- Are characters mechanically identical, slightly different, or strongly differentiated?
- How much customization is feasible with the final animation pipeline?
- Should relationship progression remain Bond/Friendship-focused or eventually become dating?

## Artwork and character interaction

- How often should Character Care appear without becoming repetitive?
- Should different worlds always use different artwork reveal mechanics?
- Which reveal interactions are fun enough to repeat?
- Should bonus points come from speed/accuracy or only from participation?
- Should artwork reveals rotate into portrait mode automatically or only on player choice?
- Does gyroscope parallax feel premium or distracting on real devices?

## Economy

- How many currencies are actually needed?
- What should Coins be spent on?
- Should Mystery Packages remain gameplay-only?
- Is gacha useful at all, or is a deterministic shop enough?
- How can monetization remain fair and mostly cosmetic?

## Progression

- How much should Account Level matter compared with Character Level?
- What cheap cosmetics feel meaningful?
- Should old seasonal rewards return?
- How much daily/weekly structure stays fun before feeling like a chore?

## Competition

- Which leaderboard metrics are most interesting?
- Should competitive challenges normalize all characters/upgrades?
- How long should ranking seasons last?
- Should community goals matter more than direct competition?

## Meta game

- Is a Delivery HQ worth building?
- Does management improve MGD or distract from the runner?
- Which calm/cozy activity provides the best contrast?
- Are minigames worth their production cost?

## Presentation

- Pixel art vs larger high-detail character art?
- When does skeletal animation become worthwhile?
- Does portrait artwork justify runtime orientation changes?

---

# Core principle to preserve

The project can contain a huge idea pool without becoming a huge game immediately.

> **MGD should be very easy to start playing, but capable of surprising the player for a long time.**

Not twenty permanent mechanics at once.

Instead:

- one understandable core;
- responsive game feel;
- temporary gameplay transformations;
- strong characters;
- rewarding collection;
- visible personalization;
- varied worlds;
- optional long-term systems.

A player might begin a run on a broom, hit a Gravity Flip section, lose the broom, land on a dinosaur, complete a delivery, catch a bonus package, unlock a sticker, gain a Demon Girl level, clean the character after the mission, reveal a new artwork, and immediately begin another route — while still understanding the basic game after only a few seconds.

That is the kind of controlled variety MGD should aim for.

---

# Related documents

- [`../MASTER_SPEC.md`](../MASTER_SPEC.md) — approved product/game decisions and decision states
- [`ROADMAP.md`](ROADMAP.md) — milestone sequence
- [`BACKLOG.md`](BACKLOG.md) — preserved future gameplay ideas
- [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) — Endless Runner / *Jetpack Joyride* design lessons
- [`ART_DIRECTION_IDEAS.md`](ART_DIRECTION_IDEAS.md) — art and visual-production ideas
- [`README.md`](README.md) — documentation hub
