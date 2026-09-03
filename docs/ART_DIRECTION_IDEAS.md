# MGD Art Direction & Asset Pipeline Ideas

> Status: preserved design exploration, **not a locked production specification**.
>
> Collected: 2026-09-03
>
> Purpose: keep visual, theme, consistency, asset-pipeline, storage-size, and image-pattern ideas available for future MGD design decisions.

## Core direction worth exploring

A strong candidate direction for Monster Girl Delivery is:

**Anime / chibi monster girls + clean cartoon environments + light cyber/fantasy delivery identity + modular 2D assets + parallax + strong VFX.**

The game should not depend on extremely detailed art to look polished. Prefer:

- strong silhouettes
- readable shapes on mobile screens
- controlled color palettes
- animation and secondary motion
- strong feedback VFX
- consistent shape language
- a UI that belongs to the game world
- a small set of high-quality assets combined intelligently

## Theme / world ideas

Possible visual districts or biomes:

- **Monster City** — modern city populated by monster girls; apartments, cafes, rooftops, signage
- **Fantasy Delivery** — castles, taverns, guilds, magic, goblins
- **Cyber Monster** — neon, holograms, drones, rain, cyberpunk infrastructure
- **Demon District** — lava, demonic architecture, occult signage, infernal shops
- **Slime Sewers** — pipes, industrial structures, water, slime, underground routes
- **Monster Academy** — school, dormitories, campus, sports areas
- **Beach District** — resort, promenade, palms, water, beach businesses
- **Snow City** — snow, ice, warm windows, winter lighting
- **Haunted District** — gothic buildings, fog, cemeteries, haunted houses
- **Mushroom Forest** — giant mushrooms, glowing plants, fairy-tale / psychedelic atmosphere
- **Dragon Highlands** — cliffs, mountains, volcanoes, dragon nests
- **Space Delivery** — stations, asteroids, alien districts, sci-fi infrastructure

Useful world hierarchy:

`City -> District -> Route -> Delivery Target`

This can provide a lot of content while keeping the underlying gameplay systems reusable.

## Art-style candidates

### Clean Cartoon

Strong candidate for the base game.

Characteristics:

- medium or thick outlines
- limited colors per object
- clean silhouettes
- moderate detail density
- exaggerated shapes
- expressive characters

Advantages:

- readable on smartphones
- easier animation
- smaller assets
- easier to keep assets consistent
- easier to combine artist-created and AI-assisted assets

Target feeling: a clean arcade/mobile runner presentation with anime/monster-girl character design rather than realism.

### Anime / Chibi characters

Possible character proportions:

- larger heads
- compact bodies
- strong facial expressions
- intentionally exaggerated monster features

Monster traits should be silhouette-defining:

- large dragon horns / tail
- oversized cat ears
- obvious slime body treatment
- demon wings / horns
- harpy wings

This makes characters recognizable even at gameplay scale.

### Sticker style

Possible alternative or supporting visual treatment:

- character/object art receives a consistent light or dark border
- separate assets can differ slightly internally while still reading as one visual family
- especially useful for pickups, portraits, rewards, stickers, collectibles, or UI illustrations

### Pixel art

Possible, but currently less attractive as the default direction because:

- pixel scale must remain consistent
- animation is labor intensive
- scaling and device-density handling need more care
- AI-assisted production is harder to keep pixel-perfect and consistent

Prefer HD cartoon / vector-like 2D unless testing shows pixel art gives MGD a substantially stronger identity.

## Gameplay visual language

Important gameplay categories should have different visual grammar.

### Danger

- sharper shapes
- stronger contrast
- warmer warning colors where appropriate
- aggressive motion
- clear anticipation

### Reward

- rounder shapes
- bright highlights
- sparkle / bounce / pulse
- visually separated from hazards

### Interactive objects

- stronger outline or contrast
- subtle idle motion
- clear separation from background decoration

### Backgrounds

- lower contrast than gameplay objects
- reduced saturation when needed
- fewer small details around the play lane

The player, hazards, pickups, and delivery targets must never disappear into the environment.

## Visual hierarchy / render layers

Suggested conceptual layer stack:

1. **Sky / gradient / atmospheric base**
2. **Background environment** — buildings, mountains, distant vegetation
3. **Gameplay geometry** — floor, platforms, route structures, obstacles
4. **Characters / enemies / pickups / delivery targets**
5. **FX / feedback / foreground accents / UI**

The highest-attention elements should be the elements that matter for immediate gameplay decisions.

## Modular environment system

Avoid producing long baked backgrounds or unique art for every route segment.

Instead build environments from reusable modules.

Example city kit:

- `wall_base`
- `wall_window`
- `wall_pipe`
- `wall_neon`
- `wall_damage`
- `floor_base`
- `floor_grate`
- `floor_crack`
- `background_building_a`
- `background_building_b`
- `prop_trash`
- `prop_sign`
- `prop_aircon`

A biome could potentially feel complete with roughly 10-20 strong modular pieces plus variations and landmarks.

## Image patterns / tiling

Prefer repeated image patterns and modular tiles over giant textures.

Instead of:

`road_5000px.png`

use reusable pieces such as:

- `road_base`
- `road_edge`
- `road_crack_01`
- `road_crack_02`
- `road_puddle`
- `road_marking`

The game can assemble these into long routes while decorative overlays hide repetition.

Useful techniques:

- tiling
- mirroring
- tinting
- scale variation
- positional offsets
- overlay decals
- prop swaps
- optional empty segments

## Repetition-hiding patterns

Do not repeat obvious single assets in a fixed rhythm.

Create pattern groups, for example:

- A = tree + rock
- B = sign
- C = bush + trash
- D = pipe
- E = empty space

Then combine the groups in varied sequences.

Additional variation can come from:

- horizontal mirroring
- palette changes
- size variation within safe limits
- decal overlays
- randomized prop selection
- spacing changes

## Landmark system

Procedural routes should occasionally contain memorable unique structures.

Examples:

- giant Slime Cafe
- Dragon Tower
- Monster Academy gate
- demon convenience store
- giant potion factory
- unusual billboard

Landmarks can:

- hide procedural repetition
- establish district identity
- act as delivery destinations
- communicate progression
- become memorable navigation points

## Palette system

Regions should use defined palettes rather than unrestricted asset-by-asset color choices.

Example families:

### City

- dark blue
- purple
- cream
- orange
- cyan

### Infernal / Demon

- dark red
- crimson
- orange
- yellow
- near-black

### Slime / Sewer

- dark green
- lime
- turquoise
- purple
- near-black

Exact color values should be chosen later through visual testing.

Palette swaps can also create asset variation without adding new textures.

## Art consistency / future Art Bible

MGD should eventually have an `ART_DIRECTION.md` or Art Bible with enforceable rules.

Possible rule categories:

- outline thickness and behavior
- light direction
- shadow direction and softness
- perspective
- maximum practical colors per gameplay asset
- character proportions
- environment detail density
- highlight rules
- near-black instead of pure black where appropriate
- eye treatment
- skin treatment
- hair treatment
- horns
- fur
- metal
- magic
- slime
- fire
- shadows
- UI icon style
- VFX shape language

Possible starting principles to test:

- consistent light direction, e.g. upper-left
- shadows generally resolve lower-right
- avoid pure `#000000` as the default outline/shadow color
- limit unnecessary colors inside small gameplay sprites
- environments should be quieter than interactive objects

These are exploratory principles, not locked numeric requirements yet.

## Character construction system

Explore a modular character / NPC system rather than drawing every background NPC completely from scratch.

Possible layers:

### Body

- human
- slime
- demon
- furry

### Head / species traits

- human
- cat
- dragon
- demon
- slime

### Accessories

- horns
- ears
- halo
- glasses
- hats

### Tail / back feature

- demon tail
- cat tail
- dragon tail
- slime extension
- wings

### Outfit

- casual
- courier
- maid
- fantasy
- cyber
- academy

### Palette

- hair
- skin/body
- outfit
- accessory accents

This can support semi-procedural NPC variety while hero characters remain deliberately authored.

## Animation pipeline

Do not require frame-by-frame animation for everything.

Use a mixture of:

### Sprite / authored animation

Best for important motion such as:

- run
- jump
- crash
- attack
- transformation
- strong character reactions

### Transform / procedural animation

Best for inexpensive motion such as:

- hover
- bounce
- UI feedback
- pickups
- simple rotations
- squash/stretch
- breathing

Example: a coin can appear to rotate by animating horizontal scale rather than storing many rotation frames, if the visual style supports it.

## Secondary animation

Cheap secondary motion can make simple art feel much more alive:

- hair bounce
- tail movement
- ear reactions
- clothing flutter
- delivery bag bounce
- horn glow
- slime wobble
- antenna movement
- signs flicker
- small environmental particles

Prioritize secondary animation on character-defining features.

## Background construction / parallax

Avoid giant monolithic backgrounds such as an 8000 px city strip.

Prefer separate reusable layers:

- sky / gradient
- far buildings
- mid-distance structures
- near environment
- gameplay layer
- optional foreground props

Illustrative parallax speeds:

- sky: `0.1x`
- far city: `0.2x`
- mid buildings: `0.5x`
- gameplay: `1.0x`
- foreground accents: `1.1-1.2x`

Exact values should be tuned by feel and performance.

## Asset storage / download-size strategy

MGD is a mobile-first runner, so visual quality should not require a huge install/download.

Prefer:

- reusable assets
- small source dimensions appropriate to screen size
- atlases where useful
- compressed formats
- palette/tint variation
- procedural layout
- transform animation
- layered backgrounds

Potential common asset dimensions:

- 64x64
- 128x128
- 256x256
- 512x512

Larger sheets should only be used where justified by characters, large landmarks, or high-resolution display requirements.

Do not make these dimensions hard rules until the actual camera scale and target device density are measured.

## Texture atlases

Where the renderer benefits from it, group compatible small assets into atlases.

Example city atlas contents:

- coin
- crate
- lamp
- trash
- sign
- small road decorations

Potential benefits:

- fewer texture switches / draw calls
- fewer tiny files
- improved loading behavior
- good compression opportunities

Atlas sizing and grouping should be based on the actual engine/runtime constraints rather than blindly making huge atlases.

## Image formats

Possible general policy to test:

### PNG

Useful for:

- lossless UI assets
- pixel-sensitive art
- sprites where the runtime/tooling handles PNG best

### WebP

Useful for:

- large illustrations
- backgrounds
- compressed transparent assets where runtime support is reliable

Final format decisions should be benchmarked on MGD's actual target browsers/devices.

## Delivery-specific visual identity

Cargo itself can become a strong art/content system.

Possible delivery categories:

- food
- normal parcel
- potion / chemical container
- love letter
- blood bag
- dragon egg
- cursed package
- unstable magical cargo
- living cargo

Customers and packages can visually reinforce each other:

- vampire customer -> blood delivery
- slime customer -> chemical/slime container
- dragon girl -> egg or heat-resistant parcel
- demon/succubus -> mysterious magical parcel

This is useful for humor, worldbuilding, mission readability, and reusable content.

## UI direction

The UI should feel like part of MGD rather than a generic mobile-game overlay.

Possible identity:

**Monster courier app + fantasy guild interface + modern delivery-service UI.**

Possible UI elements:

- order number
- customer portrait / species
- parcel type
- route / distance
- package condition
- delivery deadline
- tip / reward
- special handling instruction
- district marker

Example tone:

`ORDER #666`

`Customer: Succubus`

`Cargo: Love Potion`

`Condition: 96%`

`Tip: 120 G`

This can make the delivery premise visible at all times instead of existing only in menus or story text.

## Quality principle

Prefer **20 excellent reusable assets** over **200 mediocre one-off assets**.

A small environment set can produce substantial variety when it supports:

- tinting
- layering
- mirroring
- decals
- pattern combinations
- prop swaps
- parallax
- lighting / atmospheric variation

The asset pipeline should be designed around reuse from the beginning rather than treating optimization as a later cleanup task.

## Future documents / tasks

When the visual direction becomes more concrete, split this exploration into formal production documents:

### `docs/ART_DIRECTION.md`

Lock decisions such as:

- canonical style
- silhouettes
- palettes
- perspective
- outlines
- lighting
- character proportions
- environment detail rules
- UI language
- VFX language

### `docs/ART_PIPELINE.md`

Lock technical production rules such as:

- source-file workflow
- export sizes
- naming conventions
- atlas strategy
- supported image formats
- compression targets
- transparency rules
- animation formats
- asset validation
- performance budgets

### Future backlog experiments

Preserve for later evaluation:

- modular NPC / character builder
- biome palette swaps
- procedural environment pattern system
- landmark system
- reusable background parallax kits
- atlas experiments
- WebP vs PNG size / quality benchmarks
- automated image-size validation
- duplicate / near-duplicate asset detection
- asset memory-budget reporting
- runtime tint / overlay system
- district-specific UI skins

## Decision principle

These ideas should remain available without forcing premature implementation.

Before locking the final visual pipeline, prototype a small representative slice containing:

- one player character
- one monster-girl customer
- one city biome
- one alternate biome palette
- hazards
- pickups
- one landmark
- delivery UI
- parallax layers
- common VFX

Use that slice to evaluate readability, visual identity, production speed, file size, performance, and how easily additional content can be produced consistently.
