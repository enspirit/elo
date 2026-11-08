#!/bin/bash

# Test Python compilation - runs .expected.py files directly
# Recursively searches test/fixtures subdirectories

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t python)

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
        $ELOC -t python --lines -x --force-dynamic "${file%.expected.*}.elo" 2>/dev/null || true
    elif [ -n "$ELO_OPTIMIZE" ]; then
        # A line the checker reported on is emitted unannotated and exits 1;
        # that is the documented refusal, not a test failure.
        $ELOC -t python --lines -x --optimize "${file%.expected.*}.elo" 2>/dev/null || true
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

# Find all .expected.py files recursively
while IFS= read -r -d '' file; do
    if is_divergence "$file"; then
        if { echo "$PRELUDE"; emit "$file"; } | "${PYTHON_CMD:-python3}" >/dev/null 2>&1; then
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

    # Fixtures contain self-executing code, run with prelude
    # Use python3 on Unix, python on Windows
    PYTHON_CMD="${PYTHON_CMD:-python3}"
    if { echo "$PRELUDE"; emit "$file"; } | $PYTHON_CMD 2>/dev/null; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        { echo "$PRELUDE"; emit "$file"; } | $PYTHON_CMD || true
        ((FAILED++)) || true
    fi
done < <(find "$TEST_DIR" -type f -name "*.expected.py" -print0 | sort -z)

echo "Python: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
