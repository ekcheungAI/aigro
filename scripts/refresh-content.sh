#!/usr/bin/env bash

# Refresh and commit AIHOT's build-time snapshot when its content really changes.
# This script deliberately never pushes or deploys: publishing remains human-gated.

set -euo pipefail

# Cron may start in any directory, so anchor every relative path to this repository.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd -- "$REPO_ROOT"

SNAPSHOT="src/data/aihot-snapshot.json"
BEFORE="$(mktemp)"
FETCH_LOG="$(mktemp)"
# Temporary files must not accumulate across daily cron runs, including failed runs.
trap 'rm -f -- "$BEFORE" "$FETCH_LOG"' EXIT

# Refuse to fold a person's uncommitted snapshot edits into an automated commit.
if ! git diff --quiet -- "$SNAPSHOT" || ! git diff --cached --quiet -- "$SNAPSHOT"; then
  echo "error: $SNAPSHOT already has uncommitted changes" >&2
  exit 1
fi

cp -- "$SNAPSHOT" "$BEFORE"

# Hide routine fetch chatter so the unchanged path emits exactly its one status line.
# Fetch failures still surface through npm's stderr and set -e.
npm run fetch:aihot >"$FETCH_LOG"

# fetchedAt is regenerated on every fetch; comparing everything else catches changes
# in items, the daily digest, hot topics, counts, and API metadata without timestamp noise.
if node -e '
  const fs = require("node:fs");
  const load = (path) => {
    const value = JSON.parse(fs.readFileSync(path, "utf8"));
    delete value.fetchedAt;
    return value;
  };
  process.exit(JSON.stringify(load(process.argv[1])) === JSON.stringify(load(process.argv[2])) ? 0 : 1);
' "$BEFORE" "$SNAPSHOT"; then
  # Restore the old timestamp so an unchanged run leaves the worktree truly clean.
  cp -- "$BEFORE" "$SNAPSHOT"
  echo "No meaningful AIHOT content change."
  exit 0
fi

# Derive commit metadata from the generated file rather than the wall clock, ensuring
# the message identifies the content actually committed. Missing metadata is an error.
METADATA="$(node -e '
  const fs = require("node:fs");
  const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const date = value.daily?.date;
  const count = value.api?.itemsCount;
  if (typeof date !== "string" || !date || !Number.isInteger(count)) {
    throw new Error("snapshot is missing a valid daily date or item count");
  }
  process.stdout.write(`${date}\t${count}\n`);
' "$SNAPSHOT")"
IFS=$'\t' read -r DAILY_DATE ITEM_COUNT <<<"$METADATA"

git add -- "$SNAPSHOT"
# The pathspec keeps unrelated staged work out of this automation-owned commit.
git commit -m "content: refresh AIHOT ${DAILY_DATE} (${ITEM_COUNT} items)" -- "$SNAPSHOT"

echo "AIHOT content changed: daily date ${DAILY_DATE}, ${ITEM_COUNT} selected items."
git show --stat --oneline --format='%h %s' HEAD -- "$SNAPSHOT"
echo "Snapshot data is imported at build time; a separate human-approved push and rebuild/redeploy are required."
