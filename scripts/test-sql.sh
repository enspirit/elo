#!/bin/bash

# Test SQL compilation - runs .expected.sql files using psql
# Requires PostgreSQL to be running (docker compose up -d)

set -e

TEST_DIR="${1:-test}"
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

should_skip() {
    local file=$1
    for skip in "${SKIP_FILES[@]}"; do
        if [[ $(basename "$file") == "$skip"* ]]; then
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

for file in "$TEST_DIR"/*.expected.sql; do
    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        ((SKIPPED++))
        continue
    fi

    # Run each line as a SELECT statement
    file_passed=true
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            if ! echo "SELECT $line;" | psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t >/dev/null 2>&1; then
                file_passed=false
                break
            fi
        fi
    done < "$file"

    if [ "$file_passed" = true ]; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++))
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++))
    fi
done

echo "SQL: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
