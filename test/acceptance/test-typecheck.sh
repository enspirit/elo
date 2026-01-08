#!/bin/bash

# Test type checking - verifies that --typecheck produces expected warnings
# Matches .elo files with corresponding .expected.warnings files

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
FAILED=0
PASSED=0

echo "Testing type checker warnings..."

# Find all .expected.warnings files
while IFS= read -r -d '' warnings_file; do
    # Get corresponding .elo file
    elo_file="${warnings_file%.expected.warnings}.elo"

    if [ ! -f "$elo_file" ]; then
        echo "  ⊘ Missing .elo file for $warnings_file"
        continue
    fi

    # Get relative path for display
    relpath="${warnings_file#$TEST_DIR/}"
    relpath="${relpath%.expected.warnings}"

    # Process line by line, matching expressions to expected warnings
    line_num=0
    test_failed=0

    while IFS= read -r elo_line && IFS= read -r expected_line <&3; do
        ((line_num++)) || true

        # Skip empty lines and comments in both files
        elo_trimmed=$(echo "$elo_line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        expected_trimmed=$(echo "$expected_line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        if [[ -z "$elo_trimmed" || "$elo_trimmed" == \#* ]]; then
            # Skip comment/empty in elo, but expected should also be comment/empty
            if [[ -n "$expected_trimmed" && "$expected_trimmed" != \#* ]]; then
                echo "    Line $line_num: Expected comment/empty but got: $expected_trimmed"
                test_failed=1
            fi
            continue
        fi

        if [[ -z "$expected_trimmed" || "$expected_trimmed" == \#* ]]; then
            # Expression line but expected is comment/empty - mismatch
            echo "    Line $line_num: Expression has no expected warning"
            test_failed=1
            continue
        fi

        # Run eloc --typecheck and capture stderr
        actual_warning=$($ELOC --typecheck -e "$elo_trimmed" 2>&1 >/dev/null || true)

        if [ "$actual_warning" != "$expected_trimmed" ]; then
            echo "    Line $line_num: Warning mismatch"
            echo "      Expected: $expected_trimmed"
            echo "      Actual:   $actual_warning"
            test_failed=1
        fi
    done < "$elo_file" 3< "$warnings_file"

    if [ $test_failed -eq 0 ]; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        ((FAILED++)) || true
    fi

done < <(find "$TEST_DIR" -type f -name "*.expected.warnings" -print0 | sort -z)

echo "Typecheck: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
