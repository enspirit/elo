#!/bin/bash

# Test Ruby compilation - runs .expected.ruby files directly
# Recursively searches test/fixtures subdirectories

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t ruby)

# With ELO_OPTIMIZE=1, the fixture's .elo is recompiled with --optimize rather
# than read from its .expected file. Every fixture line is an assert, so running
# the corpus this way is the equivalence check for the annotated emission: it has
# to behave the same, not merely be smaller.
ELO_OPTIMIZE="${ELO_OPTIMIZE:-}"

# With ELO_FORCE_DYNAMIC=1, the fixture is recompiled with --force-dynamic:
# the opposite end of the same axis as --optimize. Every call then takes the
# runtime dispatcher, and the corpus has to answer exactly what it answers
# with the types known. Where the two have disagreed, the difference has
# been a security bug.
ELO_FORCE_DYNAMIC="${ELO_FORCE_DYNAMIC:-}"

# The code to run for one fixture.
emit() {
    local file=$1
    if [ -n "$ELO_FORCE_DYNAMIC" ]; then
        $ELOC -t ruby --lines -x --force-dynamic "${file%.expected.*}.elo" 2>/dev/null || true
    elif [ -n "$ELO_OPTIMIZE" ]; then
        # A line the checker reported on is emitted unannotated and exits 1;
        # that is the documented refusal, not a test failure.
        $ELOC -t ruby --lines -x --optimize "${file%.expected.*}.elo" 2>/dev/null || true
    else
        cat "$file"
    fi
}

# Files that require variables or always throw - cannot be executed standalone
SKIP_FILES=("member-access" "variables" "fail")

# Under ELO_FORCE_DYNAMIC, fixtures whose dynamic emission does not yet agree
# with the typed one. Each is a to-do with a reason; see the file.
DIVERGENCES=()
if [ -n "$ELO_FORCE_DYNAMIC" ]; then
    while IFS= read -r line; do
        [[ -z "$line" || "$line" == \#* ]] && continue
        DIVERGENCES+=("$line")
    done < "$SCRIPTS_DIR/dynamic-divergences.txt"
fi

# Whether this fixture is on the known-divergence list. Listed fixtures are not
# simply skipped: a line that has stopped diverging is a stale allowance, and a
# list that quietly carries one has stopped meaning anything. So a listed
# fixture is run, and *passing* is the failure. See dynamic-divergences.txt.
is_divergence() {
    local basename=$(basename "$1")
    local skip
    for skip in "${DIVERGENCES[@]}"; do
        if [[ "$basename" == "$skip".* ]]; then
            return 0
        fi
    done
    return 1
}

should_skip() {
    local file=$1
    local basename=$(basename "$file")
    for skip in "${SKIP_FILES[@]}"; do
        if [[ "$basename" == "$skip"* ]]; then
            echo "  ⊘ $basename (skipped - requires variables)"
            return 0
        fi
    done
    return 1
}

# Find all .expected.ruby and .expected.rb files recursively
while IFS= read -r -d '' file; do
    if is_divergence "$file"; then
        if { echo "$PRELUDE"; emit "$file"; } | ruby >/dev/null 2>&1; then
            echo "  ⚠ $(basename "$file") (STALE divergence: it passes now - delete its line from dynamic-divergences.txt)"
            ((FAILED++)) || true
        else
            echo "  ⊘ $(basename "$file") (skipped - known dynamic divergence)"
            ((SKIPPED++)) || true
        fi
        continue
    fi

    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Get relative path for display
    relpath="${file#$TEST_DIR/}"

    # Fixtures now contain self-executing code, run directly with prelude
    if { echo "$PRELUDE"; emit "$file"; } | ruby 2>/dev/null; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        ((FAILED++)) || true
        { echo "$PRELUDE"; emit "$file"; } | ruby || true
    fi
done < <(find "$TEST_DIR" -type f \( -name "*.expected.ruby" -o -name "*.expected.rb" \) -print0 | sort -z)

echo "Ruby: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
