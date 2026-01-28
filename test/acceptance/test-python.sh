#!/bin/bash

# Test Python compilation - runs .expected.py files directly
# Recursively searches test/fixtures subdirectories

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
FAILED=0
PASSED=0
SKIPPED=0

# Get prelude using eloc --prelude-only
PRELUDE=$($ELOC --prelude-only -t python)

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

# Find all .expected.py files recursively
while IFS= read -r -d '' file; do
    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Get relative path for display
    relpath="${file#$TEST_DIR/}"

    # Fixtures contain self-executing code, run with prelude
    # Use python3 on Unix, python on Windows
    PYTHON_CMD="${PYTHON_CMD:-python3}"
    if { echo "$PRELUDE"; cat "$file"; } | $PYTHON_CMD 2>/dev/null; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        { echo "$PRELUDE"; cat "$file"; } | $PYTHON_CMD || true
        ((FAILED++)) || true
    fi
done < <(find "$TEST_DIR" -type f -name "*.expected.py" -print0 | sort -z)

echo "Python: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
