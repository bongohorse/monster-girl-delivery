# Monster Girl Delivery — Game Design Ideas

**Status:** Preserved ideas / design exploration  
**Date:** 2026-09-04  
**Scope:** This document collects the Game Director's current thoughts, experiments, questions, and possible future directions discussed during the September 4 design session.

> [!IMPORTANT]
> Nothing in this document is automatically approved implementation scope. The current product truth remains `MASTER_SPEC.md`, milestone sequencing remains in `docs/ROADMAP.md`, and live work is defined by approved GitHub Issues. Ideas here should be promoted deliberately when they are ready to become real features.

The goal of this document is not to solve every system now. It is a structured idea pool that can be revisited later. When an idea becomes relevant, it can be researched, prototyped, and specified in more detail.

---

## 1. High-level direction

Monster Girl Delivery should first become a **simple, responsive, fun mobile runner**. The strongest early reference is still *Jetpack Joyride*: one-touch control, satisfying movement, short sessions, readable hazards, pacing waves, temporary gameplay modifiers, useful mission systems, fun fail states, and a fast restart loop.

The game should not try to implement every idea below at once.

A useful long-term principle is:

> **One simple core game + many temporary variations and rewarding meta systems.**

The player should understand the basic controls almost immediately, while new worlds, temporary movement modes, characters, cosmetics, missions, collectibles, events, and progression keep the game interesting over time.

The current pixel-art prototype is not a final art-style commitment. Pixel art is useful during prototyping because it is fast, readable, cute, and hides missing detail, but the final game may use larger and more detailed artwork or another visual direction entirely.

---

## 2. Core fantasy: why are we running?

The clearest thematic explanation is extremely simple:

> **The player controls monster-girl couriers who deliver orders through dangerous, strange, and increasingly ridiculous environments.**

A delivery request comes in. A monster girl accepts the job. She must reach the customer while avoiding hazards, collecting rewards, and possibly completing bonus objectives.

This gives the runner gameplay a natural reason to exist without requiring a complicated story.

Possible deliveries include:

- food;
- parcels;
- magical items;
- monster eggs;
- medicine;
- suspicious or cursed packages;
- cyberpunk data;
- dungeon supplies;
- emergency deliveries;
- strange living cargo;
- joke deliveries with absurd customers.

The delivery premise can remain flexible enough to support almost any world or event.

---

## 3. Story: full narrative or light framing?

A large story is not required for the game to work.

A good starting point is a **light narrative framework**:

- humans and monsters live in the same broad world;
- the player works for or manages a monster-girl delivery company;
- monster girls perform delivery and other odd jobs;
- each delivery provides a small reason to enter a new route or world;
- customers, locations, and short character interactions provide humor and personality;
- larger lore can be added only if it becomes useful later.

This keeps production manageable and allows the game to focus on gameplay first.

### Humor direction

The world should have a playful, self-aware tone.

A recurring joke could be that human customers are overwhelmed by how attractive, unusual, or intimidating the monster-girl couriers are, while the couriers themselves consider the situation completely normal.

Example tone:

- a nervous nerd opens the door;
- a demon courier casually asks for a signature;
- the customer can barely speak;
- the courier has no idea why the customer is acting strange.

The humor should be charming, absurd, and character-driven rather than relying only on sexual jokes.

Fanservice can be part of the identity, but sexualized/fanservice character designs must clearly depict **adult characters**.

---

## 4. Delivery levels instead of only endless running

One important idea is to make the main mode consist of **finishable deliveries** rather than only an endless run.

Example:

```text
Delivery accepted
→ target is 1,200 m away
→ run / fly through the route
→ avoid hazards and collect rewards
→ reach the customer
→ deliver package
→ results and rewards
```

This gives each run a clear purpose and creates a satisfying completion moment.

A visible target such as **"Customer: 850 m"** could provide a sense of progress.

### Why this may fit MGD particularly well

A pure endless runner answers the gameplay question "How far can I survive?"

A delivery level additionally answers the thematic question:

> **Where am I going and why?**

The destination creates natural room for customers, jokes, delivery ratings, story snippets, and mission variety.

---

## 5. Endless Mode should still exist

Even if deliveries become the main mode, a traditional **Endless Mode** should remain available.

Possible Endless goals:

- maximum distance;
- maximum score;
- most coins;
- longest near-miss chain;
- longest survival streak;
- leaderboard position;
- personal bests;
- character-specific records.

This preserves the classic arcade appeal and gives highly skilled players an obvious place to compete.

A useful long-term structure could therefore be:

- **Delivery Mode** — short, finishable jobs with destinations;
- **Endless Mode** — survival and high score;
- **Event Modes** — temporary rules or movement systems;
- **Challenge Mode** — fixed competitive routes for rankings.

---

## 6. What happens after a successful delivery?

Several ideas are worth testing.

### Option A — delivery ends the run

The player reaches the customer, the delivery is completed, and the game immediately moves to the result screen.

Advantages:

- very clear;
- short mobile sessions;
- easy to understand;
- each delivery has a beginning and end.

### Option B — chained deliveries

After delivering one order, a new order arrives immediately.

The player can continue the same run and build a **Delivery Chain**.

Possible structure:

```text
Delivery 1 complete
→ new express order appears
→ continue?
→ Delivery 2
→ increasing bonus
→ Delivery 3
→ larger bonus
→ eventually fail or voluntarily cash out
```

This combines finishable objectives with endless-run tension.

### Option C — bonus package catch

A particularly thematic version is to throw or drop the next package into the gameplay space.

The player must catch it during the run.

If successful:

**EXPRESS DELIVERY / BONUS DELIVERY** begins.

Failure simply ends the chain normally rather than punishing the player heavily.

This could become a recognizable MGD-specific mechanic.

### Possible best combination

A delivery is always officially completed when the destination is reached. The player then gets a clear choice:

- **Finish Run**
- **Next Delivery**

Occasionally the next delivery can begin through the package-catching bonus interaction.

---

## 7. End-of-run flow

The end of a run should feel rewarding even when the player fails.

### Success

A successful delivery can end with a very short customer scene:

1. player reaches destination;
2. monster girl stops at the door/location;
3. package is handed over;
4. customer reacts;
5. short joke, animation, pose, or expression;
6. result screen appears.

These scenes should be brief and skippable.

### Failure

A crash should not instantly freeze into a boring `GAME OVER` screen.

The fail state can remain entertaining for a moment:

- tumble;
- slide;
- ragdoll-like movement;
- broom continues without the rider;
- package bounces forward;
- remaining distance is shown;
- humorous character reaction.

This follows the useful *Jetpack Joyride* principle that even failure can be entertaining.

### Results screen

Possible information:

- distance;
- delivery time;
- coins collected;
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
- unlocked reward.

Possible ratings:

- stars;
- C / B / A / S / S+;
- `Perfect Delivery`;
- special badges.

### Important rule

**Bad runs should not remove progress or punish the player harshly.**

Good play should create extra rewards, while weak play should still move the player forward a little.

---

## 8. Core controls should remain simple

The long-term game may contain many ideas, but that does not mean all mechanics should exist simultaneously.

The preferred philosophy is:

> **Keep the player's permanent control vocabulary small. Change what those controls mean temporarily.**

The current one-touch flight control can remain the foundation while special sections temporarily modify movement and physics.

This is one of the strongest lessons from *Jetpack Joyride*.

---

## 9. Temporary movement modes and gameplay mutators

Possible movement modes include the following.

### Jetpack / broom flight

The default or most familiar MGD mode.

Possible visual variants:

- jetpack;
- witch broom;
- wings;
- magical propulsion;
- rocket pack;
- hover device.

### Running mode

A grounded runner section where the player jumps, ducks, or slides through obstacles.

Possible hazards:

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

Pipes or rails could create short sliding sequences.

### Gravity flip

The player reverses gravity and runs or flies along the ceiling.

This changes timing dramatically without requiring a complicated new control scheme.

### Water / jetski physics

A water section with waves, jumps, momentum, and landings.

The water physics in *Jetpack Joyride* were visually memorable and could inspire a summer or coastal MGD mode.

### Pogo stick

Automatic bouncing with difficult timing.

This can intentionally feel slightly chaotic and funny.

### Giant bouncing ball

The character moves through the level while bouncing on a large ball.

### Monster transformation: rolling ball

A more absurd monster-specific mechanic:

- a demon/slime/other character transforms into a round form;
- rolls through the level;
- bounces from terrain;
- returns to normal afterward.

### Other transformations

Monster girls could temporarily transform into:

- a dragon;
- a slime;
- a bat;
- a ghost;
- a rocket-like form;
- another creature appropriate to their species.

This could provide variety while reinforcing the monster theme.

---

## 10. Mounts and vehicles

Temporary mounts can create strong visual novelty without replacing the main character.

Possible mounts:

- dinosaur;
- large fantasy bird;
- dragon;
- dolphin;
- giant wolf;
- slime;
- mechanical creature.

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

### Important visual rule

The monster girls are a major visual attraction of the game. Vehicles should therefore avoid hiding them completely whenever possible.

Useful solutions:

- character rides on top;
- open cockpit;
- transparent cockpit;
- character hangs from vehicle;
- transformation is visibly connected to the character.

Temporary vehicles can also function as protection or an extra hit, inspired by the vehicle logic of *Jetpack Joyride*.

When a vehicle is lost, a short **safety clear / orientation window** can prevent unfair immediate deaths.

---

## 11. Worlds, locations, and visual themes

Long-term variety can come from strongly different locations rather than endlessly extending one city background.

Possible worlds:

### Monster City

The everyday central world: streets, apartments, stores, rooftops, alleys, delivery addresses, traffic, and urban hazards.

### Fantasy / Dungeon world

- castles;
- villages;
- dungeons;
- dragons;
- magic;
- traps;
- medieval customers.

### Cyberpunk world

- neon city;
- hover traffic;
- drones;
- megacorporations;
- robot hazards;
- data deliveries.

### Jungle world

- ruins;
- rivers;
- animals;
- vines;
- temples;
- dense foliage.

### Robot factory

- conveyor belts;
- lasers;
- pistons;
- industrial robots;
- crushers;
- assembly lines.

### Candy world

A cute, exaggerated sweets-themed world:

- candy;
- cake;
- chocolate;
- pastel scenery;
- strange edible hazards;
- kawaii presentation.

### Beach / summer world

- sand;
- sea;
- palms;
- beach balls;
- water;
- jetski sections.

### Snow / winter world

- snow;
- ice;
- frozen roads;
- mountains;
- snowmen;
- holiday lights.

### Haunted world

- graveyards;
- ghosts;
- fog;
- haunted mansions;
- bats;
- Halloween props.

### Demon District

- demonic city architecture;
- lava;
- clubs;
- neon;
- absurd demon bureaucracy.

### Monster Academy

- school / university setting;
- classrooms;
- dormitories;
- sports areas;
- magical experiments.

### Space

Space may work especially well as a **theme** rather than requiring a completely separate game.

Possible elements:

- orbital stations;
- alien planets;
- zero-gravity visuals;
- spaceships;
- asteroid routes.

---

## 12. Time-travel worlds

A later story device could justify radically different locations through time travel.

Possible eras:

- Stone Age;
- Bronze Age;
- antiquity;
- medieval period;
- renaissance;
- Wild West;
- modern day;
- cyberpunk future;
- distant space future.

A broken or experimental delivery portal could explain why packages must be delivered across history.

This is a large future-content concept, not something needed for the initial game.

---

## 13. Seasonal events

Seasonal events can keep existing content fresh without permanently expanding the core mechanics.

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

Events can temporarily change:

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

### Summer event ideas

- beach environment;
- bikinis / summer outfits for clearly adult characters;
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

### Seasonal gameplay modes

Events do not always need entirely new minigames. Existing runner mechanics can be recombined with a seasonal modifier.

Examples:

- Halloween ghost mode;
- winter ice physics;
- summer jetski route;
- Lunar New Year dragon section;
- anniversary remix with multiple old mutators.

---

## 14. Character customization

Players should have many ways to make their favorite character feel like **their version** of that character.

Possible customization categories:

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

### Sprite-production problem

Full outfits are expensive with traditional frame-by-frame sprites because every animated frame may require another costume version.

For early development, cheaper customization is more practical:

- hats;
- glasses;
- simple accessories;
- trails;
- auras;
- VFX;
- package skins;
- profile cosmetics.

### Accessory anchor points

A future sprite system could support attachment points for separate cosmetic layers, for example:

- head;
- face;
- back;
- hand;
- bag;
- trail origin.

This can produce many combinations without redrawing every animation frame.

---

## 15. Skeletal / bone animation

A bone-based 2D animation system remains an interesting **future** option because it could support:

- reusable animation;
- layered outfits;
- separate accessories;
- secondary motion;
- more efficient character variations.

Spine is well known but expensive. Free or cheaper skeletal-animation alternatives may be investigated later.

For the current prototype this is unnecessary complexity. The game should first prove that its runner gameplay is fun.

A likely timing is **version 2 or much later**, not initial development.

---

## 16. Trails and VFX as high-value cosmetics

Trails and effects are especially attractive because they can provide strong visual personalization for relatively low production cost.

Possible trails:

- fire;
- rainbow;
- hearts;
- stars;
- demonic flames;
- glitter;
- pixels;
- lightning;
- cyber particles;
- snow;
- bats;
- slime.

Other low-cost effect cosmetics:

- coin pickup effect;
- landing effect;
- jump effect;
- crash effect;
- revive effect;
- boost effect;
- UI sparkle style.

---

## 17. Gallery

The collection/gallery layer can give the player a reason to care about unlocks beyond score.

Possible gallery content:

- character artwork;
- event artwork;
- delivery scenes;
- customer scenes;
- concept art;
- special animations;
- collectible photos;
- world illustrations.

Gallery items can be unlocked through:

- achievements;
- character progression;
- deliveries;
- seasonal events;
- collectibles;
- Mystery Packages;
- difficult challenges.

---

## 18. Locker Room / Character Viewer

A **Locker Room** can combine customization, collection, and character presentation.

Possible actions:

- select character;
- change outfit;
- equip accessories;
- choose trail / aura;
- preview animations;
- change pose;
- change background;
- view artwork;
- take screenshots;
- inspect unlocked collectibles.

This provides a calm counterpoint to the fast runner gameplay.

---

## 19. Portrait artwork mode

A special reward/presentation sequence could ask the player to rotate the phone from landscape into portrait orientation.

Example:

```text
Special reward unlocked
→ TURN YOUR PHONE
→ rotate to portrait
→ full-screen character artwork
→ small interaction / animation
→ return to normal game
```

This should probably **not** interrupt normal runner gameplay frequently. It is better suited to:

- character unlocks;
- gallery viewing;
- event rewards;
- victory moments;
- relationship scenes;
- rare artwork reveals.

---

## 20. Gyroscope / motion parallax artwork

Portrait artwork could use the phone's gyroscope or accelerometer to create a fake 3D depth effect.

Common names for the effect include:

- gyroscope parallax;
- motion parallax;
- tilt parallax.

Possible layers:

- distant background;
- near background;
- character;
- hair / accessories;
- foreground particles.

When the phone tilts, the layers move by different amounts.

This could look excellent in a character viewer or artwork reward screen.

For active runner gameplay it may be distracting, reduce visual precision, or make the screen harder to read. Therefore it should be treated as a presentation experiment first.

---

## 21. Interactive artwork ideas

A special character artwork reveal can include a very small interaction before the full image appears.

Examples:

- wipe condensation from the screen;
- remove snow;
- wipe water away;
- clean dust;
- remove wrapping paper;
- reveal a photograph;
- clean a dirty lens.

A timed version could award small bonus points, but the player should still be able to enjoy the artwork without pressure.

---

## 22. Collectibles

MGD can eventually offer multiple kinds of things to collect, but it should avoid introducing too many currencies and systems at once.

Possible collectible categories:

### Character cards

Collectible representations of each monster girl.

### Photos / gallery art

Character scenes and illustrations.

### Delivery stickers

Stickers based on characters, customers, locations, hazards, or jokes.

### Souvenirs

Each world can have its own small souvenir collection.

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
- potion bottle;
- magic stone.

### Delivery badges

Awards for specific achievements or mastery.

### Cosmetics

Outfits, accessories, VFX, banners, profile items, and emotes are also collectibles.

---

## 23. Achievements

Achievements should mix real mastery with jokes and strange objectives.

Examples:

- deliver 100 packages;
- perform 100 near misses;
- spend 1 km upside down;
- complete a run without collisions;
- finish a difficult route with one character;
- repeatedly deliver to a memorable customer;
- catch multiple bonus packages in one chain;
- complete a seasonal challenge.

Possible achievement rewards:

- title;
- badge;
- profile frame;
- icon;
- coins;
- cosmetic;
- gallery artwork.

---

## 24. Unlockables

Almost every activity can eventually feed long-term collection.

Possible unlockables:

- monster girls;
- outfits;
- hats / glasses / accessories;
- trails;
- auras;
- vehicles;
- mounts;
- gallery art;
- maps;
- music;
- emotes;
- victory poses;
- delivery bags;
- package skins;
- profile icons;
- profile banners;
- titles;
- badges;
- UI themes.

The player should regularly feel that playing moves something forward.

---

## 25. Cheap cosmetics with high perceived value

A small project benefits enormously from cosmetics that do not require reanimating the full character.

Especially useful categories:

- profile icons;
- banners / name cards;
- titles;
- badges;
- portrait frames;
- stickers;
- delivery stamps;
- trails;
- VFX colors;
- package skins;
- simple accessories;
- loading-screen art;
- UI themes.

These can provide collection, prestige, and personalization at much lower content cost than complete animated costumes.

This is one of the strongest lessons worth borrowing from games such as *Overwatch*.

---

## 26. Character progression

Each monster girl could eventually have a personal progression track.

Possible character-level rewards:

- character badge;
- portrait frame;
- title;
- character icon;
- banner;
- sticker;
- emote;
- pose;
- artwork;
- cosmetic accessory.

This allows players to demonstrate dedication to a favorite character without requiring gameplay power advantages.

Example:

```text
Demon Girl Lv. 1
→ icon
→ badge
→ title
→ banner
→ emote
→ special frame
```

---

## 27. Account progression

Separate from character progression, the player can have an overall account level.

Account XP can come from:

- completing runs;
- deliveries;
- missions;
- achievements;
- events;
- challenges.

Account levels can award:

- coins;
- Mystery Packages;
- profile frames;
- titles;
- feature unlocks;
- gallery rewards.

The account level is a simple long-term indicator of how much the player has played.

---

## 28. Coins, gems, and economy

The economy should begin simple.

### Coins

Normal earnable currency collected during gameplay and awarded by missions.

Potential uses:

- cosmetics;
- Mystery Packages;
- minigames;
- simple unlocks;
- cosmetic shop rotation;
- character gifts;
- arcade machines.

### Gems / premium currency

A premium or rarer currency may exist much later.

Possible uses:

- premium cosmetics;
- optional time-saving;
- event items;
- a revive;
- special shop purchases.

Gems are not necessary for the early game.

### Monetization principle

Avoid making player power primarily purchasable.

Prefer:

- cosmetics;
- optional convenience;
- time-saving;
- optional ad rewards;
- cosmetic passes.

Avoid a system where spending money is the main way to achieve higher leaderboard scores.

The desired direction is closer to **pay for cosmetics / optional time-saving** than classic pay-to-win.

Platform-specific monetization remains a later release decision.

---

## 29. Mystery Packages / loot boxes

Loot-box-like rewards fit the delivery theme naturally if presented as packages.

Possible names:

- Mystery Package;
- Mystery Delivery;
- Lost Parcel;
- Premium Parcel;
- Monster Box.

Possible opening sequence:

```text
MYSTERY DELIVERY RECEIVED
→ package lands in the office
→ package shakes
→ player taps to open
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
- other cosmetics.

For early versions, Mystery Packages are best treated as **earnable gameplay rewards**, not a real-money system.

Real-money random rewards create additional legal, rating, platform, and trust concerns and should only be considered much later, if at all.

---

## 30. Gifts

"Gifts" can serve two different purposes.

### Gifts to the player

Examples:

- daily gift;
- event gift;
- anniversary gift;
- compensation package;
- special achievement reward.

### Gifts to characters

A future relationship system could allow the player to give collected items to monster girls.

Possible gifts:

- food;
- flowers;
- games;
- plushies;
- world souvenirs;
- character-specific favorite items.

These could increase a **Bond / Friendship** value and unlock:

- dialogue;
- artwork;
- poses;
- emotes;
- small stories;
- cosmetics.

This can exist long before a full dating-sim system is considered.

---

## 31. Daily login rewards

A daily login track can encourage players to return.

Example seven-step reward cycle:

| Login step | Example reward |
|---|---|
| 1 | Coins |
| 2 | More coins |
| 3 | Small Mystery Package |
| 4 | Coins + XP |
| 5 | Ticket / special reward |
| 6 | Rare package |
| 7 | Epic Mystery Delivery |

### Anti-frustration rule

Missing one real-world day should preferably **not reset the entire chain**.

The system should reward returning rather than punish the player for having a life outside the game.

---

## 32. Daily missions

Daily missions are valuable because they create variety using existing mechanics.

Possible missions:

- deliver 3 packages;
- collect 500 coins;
- fly 2,000 m with a broom;
- perform 20 near misses;
- use a vehicle;
- play a run with a specific character;
- catch one bonus package;
- complete a route without damage;
- perform a gravity-flip challenge.

Possible quality-of-life rule:

- one free daily mission reroll.

Rewards can include:

- coins;
- XP;
- account XP;
- character XP;
- event points;
- Mystery Packages.

Daily missions should encourage variety without forcing players into long chores.

---

## 33. Weekly missions

Weekly goals can be larger versions of dailies.

Example milestone track:

```text
10 weekly points → reward
20 weekly points → better reward
40 weekly points → weekly Mystery Package
```

Weeklies are a possible later addition once there is enough content to support meaningful variation.

---

## 34. Global rankings

A single global leaderboard is probably not enough. Different rankings can reward different types of skill.

Possible leaderboards:

- longest Endless distance;
- highest score;
- fastest delivery;
- most coins in a run;
- best near-miss chain;
- highest Delivery Flow combo;
- weekly challenge score;
- character-specific score;
- friends-only ranking.

### Main fairness problem

Rankings become less meaningful if paid progression, permanent stat advantages, or unequal upgrades dominate the score.

Therefore serious competitive modes should use standardized conditions whenever possible.

---

## 35. Weekly fixed challenge

A strong competitive format is a fixed weekly route where every player receives the same conditions.

Example:

```text
WEEKLY DELIVERY #37
World: Cyber City
Character: Demon Girl
Distance: 2,500 m
Modifier: Gravity Flip
Seed / hazards: identical for everyone
```

Possible rules:

- same route;
- same hazards;
- same character or normalized stats;
- no paid power advantage;
- one clear scoring formula.

This makes the ranking much more about skill.

---

## 36. Ranking leagues

Players could be grouped into seasonal prestige tiers such as:

- Bronze;
- Silver;
- Gold;
- Platinum;
- Diamond;
- Master.

Rewards should ideally be cosmetic/status-focused:

- profile frame;
- badge;
- title;
- banner;
- seasonal icon.

This gives skilled players something visible to show without making them stronger.

---

## 37. Global community events

Not every global system needs to be competitive.

MGD's delivery theme is perfect for cooperative global goals.

Example:

```text
GLOBAL DELIVERY EVENT
Community goal: 10,000,000 deliveries

1M  → Coins
3M  → Mystery Package
5M  → Event Artwork
10M → Special Cosmetic
```

Everyone contributes simply by playing.

This can create community excitement without punishing weaker players.

---

## 38. Character / team community competitions

A more playful seasonal event can ask players to support a favorite monster girl.

Example:

- Team Demon Girl;
- Team Slime Girl;
- Team Dragon Girl;
- Team Harpy.

Each successful delivery adds to that character's global score.

At the end:

- all participants receive a reward;
- winning team gets an extra badge/banner/artwork;
- results become part of the game's seasonal history.

This creates community identity without requiring direct PvP.

---

## 39. Battle pass / seasonal progression

A battle-pass-like seasonal reward track can work later, but it should not be an early priority.

A pass requires a constant supply of worthwhile rewards and therefore creates a significant content-production obligation.

Possible MGD version:

**Summer Delivery Pass**

Progress through normal play and seasonal missions.

Possible rewards:

- coins;
- tickets;
- profile icons;
- stickers;
- trails;
- banners;
- artwork;
- outfits.

### Better pass design ideas

Instead of one rigid linear track, the player could choose which reward branch to work toward first.

Another player-friendly idea is allowing old seasonal tracks to remain available or return later rather than relying entirely on permanent FOMO.

---

## 40. Gacha systems: common building blocks

Gacha is only one possible future system. It is not required for MGD.

Common gacha mechanics include:

### Banners

Temporary reward pools featuring specific characters or cosmetics.

### Pulls

Single pull or multi-pull.

### Rarity

Examples:

- Common;
- Rare;
- Epic;
- Legendary.

### Pity

After enough unsuccessful pulls, a high-rarity reward becomes guaranteed.

### Featured guarantee

If the player misses the featured reward, a later high-rarity result is guaranteed to be featured.

### Duplicate conversion

Duplicate items convert into another resource such as shards or tokens.

### Spark / selector

After a defined number of pulls, the player can directly choose one reward.

### Wishlist

The player marks desired rewards and receives improved odds or eventual guarantees.

### Free pulls / tickets

Events and gameplay provide pulls without requiring payment.

### Reruns

Old reward pools return later.

---

## 41. Possible MGD gacha direction

If MGD ever uses gacha, a **cosmetic-focused** system is preferable to locking major gameplay power behind random pulls.

Example seasonal pool:

**Summer Mystery Delivery**

Possible rewards:

- adult-character summer outfit;
- sunglasses;
- beach banner;
- dolphin sticker;
- water trail;
- summer profile icon;
- beach artwork.

A more player-friendly structure could include:

- guaranteed Rare+ after a defined number of pulls;
- guaranteed Epic+ after a larger threshold;
- direct featured-item selection after enough attempts;
- duplicate conversion into Delivery Tokens;
- ability to buy a desired cosmetic with accumulated tokens;
- carry-over pity where appropriate;
- earnable tickets from normal gameplay.

Again, this is a possible later system, not a requirement.

---

## 42. Shop

A shop could eventually provide deterministic alternatives to random rewards.

Possible sections:

- coin shop;
- cosmetic shop;
- rotating daily/weekly selection;
- event shop;
- Delivery Token shop;
- character gift shop;
- premium cosmetic shop.

The player should ideally have meaningful ways to earn cosmetics through gameplay instead of seeing customization as purely a payment screen.

---

## 43. Slot machine / arcade gambling-style minigame

Coins could potentially be spent on a themed slot machine or arcade machine.

Possible rewards:

- coins;
- stickers;
- small cosmetics;
- collectibles;
- Mystery Packages.

This is primarily a fun **soft-currency sink** and minigame concept.

If implemented, it should not require real-money wagering.

The theme could be integrated into the delivery-company base as an arcade machine.

---

## 44. Minigames

Small side activities could eventually make the world feel richer and provide places to spend earned currency.

Possible examples:

- slot machine;
- crane / claw machine;
- package sorting;
- timing game;
- drone race;
- card matching;
- fishing;
- arcade cabinet;
- short seasonal minigame.

Older Pokémon games are a useful inspiration for the feeling that the world contains small optional activities beyond the primary gameplay loop.

However, each minigame is effectively a small game project of its own. They should come **after** the runner is already strong.

---

## 45. Delivery-company management

A much larger future meta system could let the player run the delivery company itself.

Possible management actions:

- recruit couriers;
- assign girls to jobs;
- upgrade the delivery base;
- unlock regions;
- buy vehicles;
- improve rooms;
- collect passive company rewards;
- decorate the office;
- expand the warehouse or garage.

This could create a slower strategic layer between runs.

### Delivery base as the game's menu

Instead of abstract menus, the company headquarters could eventually become a physical hub containing:

- reception;
- garage;
- warehouse;
- locker room;
- gallery;
- arcade;
- café;
- character rooms.

Selecting a room effectively opens that system.

This can make the meta game feel more like a place than a collection of UI screens.

---

## 46. Cozy / low-pressure activities

A long-term dream is to have a calm side of the game similar in spirit to games such as *Animal Crossing*.

The runner is fast and demanding. The hub can be slow and optional.

Possible activities:

- decorate rooms;
- talk to characters;
- sit around the base;
- fish;
- collect objects;
- use arcade machines;
- take photos;
- complete tiny jobs;
- inspect trophies and souvenirs.

The player should be allowed to do things simply because they are enjoyable rather than because every second must optimize progression.

This would be a post-core-game expansion, not an initial requirement.

---

## 47. Relationship / dating-sim direction

A full dating sim would be a major separate system and should not be assumed.

A lighter **character bond** layer could come first.

Possible progression:

```text
Use character
→ earn Bond XP
→ give gifts
→ unlock dialogue
→ unlock small scenes
→ unlock artwork / emotes / poses
```

This provides character attachment without requiring a huge branching narrative system.

A full romance/dating system can remain a later design question.

---

## 48. Auto mode

An auto mode is possible but should be treated carefully.

Possible uses:

- accessibility;
- low-pressure resource collection;
- company-management simulation;
- previously completed easy deliveries.

Main design risk:

> If automatic play gives the same value as actually playing, why should the player control the runner?

Therefore auto mode should probably be a support feature rather than the primary progression method.

---

## 49. Revive / continue

A later mobile feature could allow one continue after a crash.

Possible costs:

- optional advertisement;
- gem;
- rare revive item.

After revival, the player should receive a short protection / safety window to prevent an immediate second death.

This is not needed for early prototypes.

---

## 50. Parodies and pop-culture humor

MGD can parody recognizable anime, game, and genre conventions.

Possible joke concepts:

- exaggerated ninja run;
- huge energy aura;
- absurd hair transformation;
- overly long power-up sequence;
- magical-girl transformation parody;
- giant dramatic special attack;
- power-level joke;
- mecha parody;
- isekai cliché;
- tournament-arc joke.

It is better to parody broad genre conventions than copy protected characters, costumes, names, or exact visual designs.

---

## 51. What to borrow from Overwatch

*Overwatch* is useful as inspiration for **player expression and long-term hero identity**, not because MGD should copy its combat systems.

Useful concepts to adapt:

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

### Important takeaway

Many satisfying rewards do **not** need to modify the animated character sprite itself.

Profile icons, frames, banners, titles, badges, stickers, charms, UI effects, trails, and gallery rewards can create strong collection and customization with far lower production cost.

---

## 52. What to borrow from gacha / character-collection games

Useful ideas that can exist even without aggressive monetization:

- strong individual character identity;
- favorite-character progression;
- character collections;
- rarity and exciting reward reveals;
- pity / guarantees;
- duplicate protection or conversion;
- event reward pools;
- relationship / affinity systems;
- character stories;
- reruns instead of permanent loss;
- free earnable pulls/tickets;
- wishlists or selectors.

The important part is the **collection psychology and character attachment**, not necessarily selling random power.

---

## 53. What to borrow from other games

### Jetpack Joyride

- extremely accessible input;
- polished one-touch movement;
- pacing waves rather than only linear difficulty growth;
- temporary vehicles / gameplay mutators;
- vehicles acting as temporary protection;
- safe recovery after losing a vehicle;
- coin patterns that teach movement;
- entertaining fail state;
- missions that redirect player behavior;
- quick restarts;
- satisfying distance and near-miss statistics.

See `docs/ENDLESS_RUNNER_BLUEPRINT.md` for the dedicated design-reference document.

### Fortnite

- strong locker/customization experience;
- cosmetics as identity;
- emotes;
- seasonal presentation;
- profile expression.

### Pokémon

- collection;
- optional minigames;
- world side activities;
- places to spend accumulated currency;
- attachment to individual creatures/characters.

### Animal Crossing

- calm optional meta space;
- decorating;
- collection;
- play at your own pace;
- non-competitive activities.

### Character-collection RPGs

- affinity / bond systems;
- banners and reruns;
- pity systems;
- character-specific progression;
- events;
- collection goals.

The intention is to borrow useful **design principles**, not clone any one game.

---

## 54. Art-direction ideas from the current exploration

The current preferred broad visual direction remains something like:

- anime / chibi monster girls;
- clean cartoon environments;
- light cyber / fantasy delivery flavor;
- strong silhouettes;
- readable mobile composition;
- modular assets;
- clear foreground/gameplay/background hierarchy.

Possible production ideas include:

- reusable tiles and patterns;
- tinting and mirroring;
- region-specific palettes;
- overlay variations;
- modular character pieces;
- sprite + transform animation mix;
- cheap secondary animation where useful.

See `docs/ART_DIRECTION_IDEAS.md` for the dedicated art exploration.

---

## 55. Initial asset strategy discussed today

The first useful art pass should remain small.

Minimal early asset set:

- player;
- background;
- obstacle;
- coin;
- effect;
- minimal UI.

A visible package asset was not required for the earliest prototype, even though packages may later become more important to the delivery framing and bonus-delivery mechanics.

### Parallax background

Background art should support:

- repeatable horizontal scrolling;
- seamless edges;
- multiple depth layers;
- parallax motion;
- easy replacement while the final style is undecided.

This lets the prototype look better without committing to expensive final art.

---

## 56. Rendering sharpness / resolution note

The current prototype was observed to look blurrier or lower-resolution than expected on a modern mobile display.

The desired long-term result is a **sharp mobile presentation** rather than intentionally rendering the entire game at a visibly soft 720p-like resolution.

Important distinction:

- gameplay can use a stable logical coordinate system;
- rendering can still target the actual device/display resolution appropriately;
- the physical device resolution should not change gameplay fairness;
- pixel art, if retained, needs intentional scaling rules rather than accidental filtering blur.

The final art style is still undecided. The current small pixel-art assets are prototypes, not a reason to lock the whole renderer to a low-resolution look.

---

## 57. Mobile gyroscope in normal gameplay

Gyroscope parallax may look impressive, but using it continuously during the fast runner could also:

- distract from hazards;
- make precision harder;
- create motion discomfort;
- reduce readability;
- interfere with the clean visual hierarchy.

Therefore the stronger first experiment is to use motion parallax in **artwork, menus, gallery, or character presentation**, not as a permanent gameplay camera effect.

---

## 58. Reward philosophy

The game should reward good play without making weak runs feel like wasted time.

Possible positive rewards for strong runs:

- bonus coins;
- extra XP;
- Delivery Flow multiplier;
- Perfect Delivery;
- bonus package;
- rare collectible chance;
- leaderboard score;
- challenge progress.

Avoid:

- deleting earned currency because of a crash;
- energy systems that punish attempts;
- harsh progress loss;
- requiring payment to recover normal progress.

The game should primarily be fun, but still have deep challenges for hardcore players.

---

## 59. Hardcore skill ceiling

Easy controls do not require a low skill ceiling.

Possible mastery goals:

- no-hit deliveries;
- perfect routes;
- speedruns;
- long near-miss chains;
- difficult bonus paths;
- high Delivery Flow multipliers;
- weekly fixed challenges;
- Endless leaderboards;
- character-specific records;
- optional hardcore missions.

This allows a normal player to enjoy simple deliveries while dedicated players can master the systems deeply.

---

## 60. Version 1 priority

The most important decision from the design session is that **Version 1 should not attempt to build the entire vision**.

Version 1 should concentrate on the elements that make *Jetpack Joyride*-style play immediately enjoyable.

### Strong Version 1 focus

- one good playable monster girl;
- responsive one-touch movement;
- one readable world / route;
- hazards;
- coins;
- good pacing;
- satisfying collision/fail behavior;
- fast restart;
- basic result screen;
- simple missions;
- perhaps one or two temporary gameplay mutators;
- simple collection/gallery hook;
- basic delivery flavor.

### Good early follow-up systems

After the runner itself is fun:

- finishable Delivery Mode;
- Endless Mode;
- more monster girls;
- more worlds;
- achievements;
- account / character XP;
- simple unlockables;
- Mystery Packages earned through play;
- cheap cosmetics;
- trails / VFX;
- gallery;
- daily missions;
- seasonal content experiments.

### Later systems

Only after the core game proves itself:

- full Locker Room;
- large outfit library;
- skeletal animation;
- portrait artwork interactions;
- gyroscope artwork;
- global rankings;
- large seasonal modes;
- battle pass;
- premium currency;
- gacha;
- monetization systems;
- minigames;
- company management;
- relationship / dating systems;
- cozy hub activities;
- auto mode.

---

## 61. A possible long-term MGD loop

A future mature version could look roughly like this:

```text
Order arrives
→ choose monster girl / cosmetics
→ start delivery
→ run / fly / dodge / collect
→ temporary movement modifier or vehicle
→ complete delivery
→ short customer reaction
→ results
→ coins + XP + mission progress + collectibles
→ character/account progression
→ unlock cosmetics / artwork / Mystery Packages
→ visit Locker Room / Gallery / Delivery HQ if desired
→ next delivery or Endless Mode
```

Seasonal events, rankings, minigames, management, and character relationships would sit around this loop rather than replace it.

---

## 62. Open design questions

These questions are intentionally unresolved and can be revisited when they become relevant.

### Core structure

- Should Delivery Mode replace Endless as the primary mode, or sit beside it?
- Should reaching a customer always end the run?
- Should chained deliveries become a major scoring mechanic?
- How often should temporary movement modes appear?
- How many permanent controls should the game ultimately have?

### Story

- How much actual plot does MGD need?
- Is the delivery company itself the main narrative anchor?
- Does the player own/manage the company or simply play as its couriers?

### Characters

- Are characters mechanically identical, slightly different, or strongly differentiated?
- How much customization is feasible with the final animation pipeline?
- Should relationship progression remain friendship/bond-focused or eventually become a dating system?

### Economy

- How many currencies are actually necessary?
- What should coins be spent on?
- Should Mystery Packages remain gameplay-only?
- Is gacha useful at all, or can deterministic shops provide enough collection excitement?
- How can monetization remain fair and mostly cosmetic?

### Progression

- Account level vs character level: how much should each matter?
- What cosmetics feel meaningful without high art cost?
- Should old seasonal rewards return?
- How much daily/weekly structure feels fun rather than like a chore?

### Competition

- Which leaderboard metrics are most interesting?
- Should competitive challenges normalize characters/upgrades?
- How long should ranking seasons last?
- Should community goals matter more than direct competition?

### Meta game

- Is a Delivery HQ worth building?
- Would management improve the game or distract from the runner?
- Which calm/cozy activity would provide the best contrast to running?
- Are minigames worth their production cost?

### Presentation

- Pixel art vs larger high-detail character art?
- When should skeletal animation become worthwhile?
- Does portrait artwork justify runtime orientation changes?
- Does gyroscope parallax feel premium or distracting on real devices?

---

## 63. Core principle to preserve

The project can contain a huge idea pool without becoming a huge game immediately.

The central rule should remain:

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

A player might begin a run on a broom, hit a gravity-flip section, lose the broom, land on a dinosaur, complete a delivery, catch a bonus package, unlock a sticker, gain a Demon Girl level, and then immediately start another run — while still understanding the basic game after only a few seconds.

That is the kind of controlled variety MGD should aim for.

---

## Related documents

- [`../MASTER_SPEC.md`](../MASTER_SPEC.md) — approved product/game decisions and decision states
- [`ROADMAP.md`](ROADMAP.md) — milestone sequence
- [`BACKLOG.md`](BACKLOG.md) — preserved future gameplay ideas
- [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) — detailed Endless Runner / *Jetpack Joyride* design lessons
- [`ART_DIRECTION_IDEAS.md`](ART_DIRECTION_IDEAS.md) — art and visual-production ideas
- [`README.md`](README.md) — documentation hub
