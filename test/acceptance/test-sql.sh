#!/bin/bash

# Test SQL compilation - runs .expected.sql files using psql
# Requires PostgreSQL to be running (docker compose up -d)

set -e

TEST_DIR="${1:-test/fixtures}"
FAILED=0
PASSED=0
SKIPPED=0

# PostgreSQL connection settings (for Docker)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-elo}"
PGPASSWORD="${PGPASSWORD:-elo}"
PGDATABASE="${PGDATABASE:-elo}"
export PGPASSWORD

# Files that require variables - cannot be executed standalone
SKIP_REQUIRE_VARS=("member-access" "variables")

should_skip() {
    local file=$1
    local basename=$(basename "$file")
    for skip in "${SKIP_REQUIRE_VARS[@]}"; do
        if [[ "$basename" == "$skip"* ]]; then
            echo "  ⊘ $basename (skipped - requires variables)"
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
        ((SKIPPED++)) || true
        continue
    fi

    # Run each line as a SELECT statement
    file_passed=true
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            sql="SELECT $line;"
            if ! echo "$sql" | psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t >/dev/null 2>&1; then
                file_passed=false
                break
            fi
        fi
    done < "$file"

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
