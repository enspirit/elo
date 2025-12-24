#!/bin/bash

# Test SQL compilation - runs .expected.sql files using psql
# Requires PostgreSQL to be running (docker compose up -d)

set -e

TEST_DIR="${1:-test/fixtures}"
PRELUDE_FILE="src/preludes/prelude.testable.sql"
FAILED=0
PASSED=0
SKIPPED=0

# PostgreSQL connection settings (for Docker)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-klang}"
PGPASSWORD="${PGPASSWORD:-klang}"
PGDATABASE="${PGDATABASE:-klang}"
export PGPASSWORD

# Files that require variables - skip for local testing
SKIP_FILES=("member-access" "variables")

# Files that require time mocking - use testable SQL and inject time
MOCKED_FILES=("temporal-mocked")

should_skip() {
    local file=$1
    for skip in "${SKIP_FILES[@]}"; do
        if [[ $(basename "$file") == "$skip"* ]]; then
            return 0
        fi
    done
    return 1
}

is_mocked() {
    local file=$1
    for mocked in "${MOCKED_FILES[@]}"; do
        if [[ $(basename "$file") == "$mocked"* ]]; then
            return 0
        fi
    done
    return 1
}

# Check if PostgreSQL is available
if ! psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    echo "⚠ PostgreSQL not available - skipping SQL tests"
    echo "  Run 'docker compose up -d' to enable SQL testing"
    exit 0
fi

# Load the prelude to install klang_now/klang_today functions
if [ -f "$PRELUDE_FILE" ]; then
    if ! psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$PRELUDE_FILE" >/dev/null 2>&1; then
        echo "⚠ Failed to load SQL prelude"
        exit 1
    fi
fi

for file in "$TEST_DIR"/*.expected.sql; do
    # Skip the testable.sql files in this loop (they're used as alternates)
    if [[ "$file" == *.testable.sql ]]; then
        continue
    fi

    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        ((SKIPPED++)) || true
        continue
    fi

    # Determine which file and settings to use
    actual_file="$file"
    time_injection=""

    if is_mocked "$file"; then
        # Use the testable SQL variant if it exists
        testable_file="${file%.sql}.testable.sql"
        if [ -f "$testable_file" ]; then
            actual_file="$testable_file"
            # Extract date from filename or use default
            time_injection="SET klang.now = '2025-12-01T12:00:00';"
        else
            echo "  ⊘ $(basename "$file") (skipped - no testable SQL variant)"
            ((SKIPPED++)) || true
            continue
        fi
    fi

    # Run each line as a SELECT statement
    file_passed=true
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            sql="${time_injection} SELECT $line;"
            if ! echo "$sql" | psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t >/dev/null 2>&1; then
                file_passed=false
                break
            fi
        fi
    done < "$actual_file"

    if [ "$file_passed" = true ]; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++)) || true
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++)) || true
    fi
done

echo "SQL: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
