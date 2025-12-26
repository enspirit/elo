#!/bin/bash

# Test Ruby compilation - runs .expected.ruby files directly

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t ruby)

# Files that require variables - cannot be executed standalone
SKIP_FILES=("member-access" "variables")

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

for file in "$TEST_DIR"/*.expected.ruby; do
    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Combine prelude with test file and run
    if { echo "$PRELUDE"; cat "$file"; } | ruby - 2>/dev/null; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++)) || true
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++)) || true
    fi
done

echo "Ruby: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
