#!/bin/bash

# Test Ruby compilation - runs .expected.ruby files directly

set -e

TEST_DIR="${1:-test}"
FAILED=0
PASSED=0
SKIPPED=0

# Files that require variables - skip for local testing
SKIP_FILES=("member-access" "variables")

should_skip() {
    local file=$1
    for skip in "${SKIP_FILES[@]}"; do
        if [[ $(basename "$file") == "$skip"* ]]; then
            return 0
        fi
    done
    return 1
}

for file in "$TEST_DIR"/*.expected.ruby; do
    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        ((SKIPPED++))
        continue
    fi

    if ruby "$file" 2>/dev/null; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++))
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++))
    fi
done

echo "Ruby: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
