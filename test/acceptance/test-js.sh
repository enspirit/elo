#!/bin/bash

# Test JavaScript compilation - runs .expected.js files directly

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t js)

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

for file in "$TEST_DIR"/*.expected.js; do
    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Fixtures now contain self-executing code, run directly with prelude
    if { echo "$PRELUDE"; cat "$file"; } | node - 2>/dev/null; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++)) || true
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++)) || true
    fi
done

echo "JavaScript: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
