#!/usr/bin/env sh
# Copies .agents/skills (the source of truth) to .claude/skills for Claude Code
# and writes an opencode slash command for every user-invoked skill.
# Both outputs are Git-ignored; rerun after editing a skill.
set -eu

cd "$(dirname "$0")/.."

rm -rf .claude/skills .opencode/command
mkdir -p .claude/skills .opencode/command
cp -R .agents/skills/. .claude/skills/

commands=""
for skill in .agents/skills/*/SKILL.md; do
  if grep -q '^disable-model-invocation: true' "$skill"; then
    name=$(basename "$(dirname "$skill")")
    description=$(sed -n 's/^description: //p' "$skill" | head -n 1)
    printf -- '---\ndescription: %s\n---\n\nRead `.agents/skills/%s/SKILL.md` and follow it. Arguments: $ARGUMENTS\n' \
      "$description" "$name" > ".opencode/command/$name.md"
    commands="$commands $name"
  fi
done

echo "Synced $(ls .agents/skills | wc -l | tr -d ' ') skills to .claude/skills; opencode commands:$commands"
