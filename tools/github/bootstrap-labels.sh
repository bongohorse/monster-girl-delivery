#!/usr/bin/env bash
set -euo pipefail

create_label() {
  gh label create "$1" --description "$2" --color "$3" --force
}

create_label "type:bug" "Incorrect behavior" "D73A4A"
create_label "type:feature" "Player-facing feature" "1D76DB"
create_label "type:tech" "Infrastructure, tooling, refactor, maintenance" "5319E7"
create_label "type:idea" "Unscheduled idea worth preserving" "A2EEEF"
create_label "status:backlog" "Not scheduled yet" "D4C5F9"
create_label "status:blocked" "Waiting on a decision or dependency" "B60205"
create_label "priority:high" "High priority" "FF7B72"
create_label "ai:coder" "Suitable for a coding agent" "0E8A16"
create_label "ai:jules" "Suitable for Jules" "4285F4"
create_label "dependencies" "Dependency update" "0366D6"
create_label "milestone:m0" "Foundation" "C5DEF5"
create_label "milestone:m1" "Flight prototype" "C5DEF5"
create_label "milestone:m2" "Hazards, graze, fairness" "C5DEF5"
create_label "milestone:m3" "Procedural core and seeds" "C5DEF5"
create_label "milestone:m4" "Core game loop" "C5DEF5"
create_label "milestone:m5" "Meta progression and persistence" "C5DEF5"
create_label "milestone:m6" "Presentation and asset integration" "C5DEF5"
create_label "milestone:m7" "Mobile packaging" "C5DEF5"
create_label "milestone:m8" "Steam / desktop" "C5DEF5"

echo "Labels created/updated."
