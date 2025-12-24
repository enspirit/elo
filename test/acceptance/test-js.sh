#!/bin/bash

# Test JavaScript compilation - runs .expected.js files directly

set -e

TEST_DIR="${1:-test/fixtures}"
PRELUDE="src/preludes/prelude.testable.js"
FAILED=0
PASSED=0
SKIPPED=0

# Files that require variables - skip for local testing
SKIP_FILES=("member-access" "variables")

# Files that require time mocking - set KLANG_NOW for these
# Format: "filename:KLANG_NOW_value"
MOCKED_FILES=("temporal-mocked:2025-12-01T12:00:00")

should_skip() {
    local file=$1
    for skip in "${SKIP_FILES[@]}"; do
        if [[ $(basename "$file") == "$skip"* ]]; then
            return 0
        fi
    done
    return 1
}

get_mock_time() {
    local file=$1
    local basename=$(basename "$file" .expected.js)
    for mocked in "${MOCKED_FILES[@]}"; do
        local name="${mocked%%:*}"
        local time="${mocked#*:}"
        if [[ "$basename" == "$name" ]]; then
            echo "$time"
            return 0
        fi
    done
    return 1
}

for file in "$TEST_DIR"/*.expected.js; do
    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        ((SKIPPED++)) || true
        continue
    fi

    # Check if this file needs time mocking
    mock_time=$(get_mock_time "$file") || mock_time=""

    # Run each line separately to avoid IIFE issues
    # Prepend prelude to provide Duration class
    if while IFS= read -r line; do
        [ -n "$line" ] && { cat "$PRELUDE"; echo "$line"; } | KLANG_NOW="$mock_time" node - || exit 1
    done < "$file" 2>/dev/null; then
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
