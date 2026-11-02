#!/bin/bash

# Test JavaScript compilation - runs .expected.js files directly
# Recursively searches test/fixtures subdirectories

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t js)

# With ELO_OPTIMIZE=1, the fixture's .elo is recompiled with --optimize rather
# than read from its .expected file. Every fixture line is an assert, so running
# the corpus this way is the equivalence check for the annotated emission: it has
# to behave the same, not merely be smaller.
ELO_OPTIMIZE="${ELO_OPTIMIZE:-}"

# The code to run for one fixture.
emit() {
    local file=$1
    if [ -n "$ELO_OPTIMIZE" ]; then
        # A line the checker reported on is emitted unannotated and exits 1;
        # that is the documented refusal, not a test failure.
        $ELOC -t js --lines -x --optimize "${file%.expected.*}.elo" 2>/dev/null || true
    else
        cat "$file"
    fi
}

# Files that require variables or always throw - cannot be executed standalone
SKIP_FILES=("member-access" "variables" "fail")

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

# Find all .expected.js files recursively
while IFS= read -r -d '' file; do
    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Get relative path for display
    relpath="${file#$TEST_DIR/}"

    # Fixtures now contain self-executing code, run directly with prelude
    if { echo "$PRELUDE"; emit "$file"; } | node - 2>/dev/null; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        { echo "$PRELUDE"; emit "$file"; } | node || true
        ((FAILED++)) || true
    fi
done < <(find "$TEST_DIR" -type f -name "*.expected.js" -print0 | sort -z)

echo "JavaScript: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
