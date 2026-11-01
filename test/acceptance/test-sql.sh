#!/bin/bash

# Test SQL compilation - runs .expected.sql files using psql
# Recursively searches test/fixtures subdirectories
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

# psql exits 0 after a SQL error unless ON_ERROR_STOP is set, so without this
# flag the only failure this script could see was a *failed assertion* —
# `assert` emits pg_terminate_backend, which drops the connection and makes
# psql exit 2. Invalid SQL — a syntax error, an unknown function, a type
# mismatch — was reported as a pass, which is exactly the failure a compiler
# test has to catch. It hid 26 fixtures; see KNOWN_INVALID below.
psql_run() {
    psql -v ON_ERROR_STOP=1 -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t "$@"
}

# Files that require variables or always throw - cannot be executed standalone
SKIP_REQUIRE_VARS=("member-access" "variables" "fail")

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

# Fixtures PostgreSQL rejects today. Every one of them was reported green for
# as long as this script ignored psql's errors, so the list is not a set of
# newly broken emissions — it is the backlog that the hole was hiding. Each
# entry names the task that owns the fix and the error it produces. An entry
# that starts passing is reported as a failure, so the list cannot go stale,
# and it must shrink to empty.
KNOWN_INVALID=(
    # 0181 - `[]` emits a bare ARRAY[]: cannot determine type of empty array
    "reference/arrays"
    # first/last assert `isNull(first([]))`, which is the only line left failing
    # in them; the subscript itself is covered by reference/list-literal-subscript
    "stdlib/list/access/first"
    "stdlib/list/access/last"
    "stdlib/list/arithmetic/concat"
    "stdlib/list/predicates/contains"
    "stdlib/list/predicates/isEmpty"
    "stdlib/list/summary/avg"
    "stdlib/list/summary/count"
    "stdlib/list/summary/join"
    "stdlib/list/summary/length"
    "stdlib/list/summary/max"
    "stdlib/list/summary/min"
    "stdlib/list/summary/sum"
    "stdlib/list/transform/reverse"
    "stdlib/list/transform/sort"
    "stdlib/list/transform/unique"
    "stdlib/string/transform/split"
    # 0182 - member access emits ->>, which is text, so every comparison against
    # a non-text literal fails: operator does not exist: text = integer
    "others/trailing-commas"
    "reference/objects"
    "reference/alternative"
    # 0183 - `(1 == 1) == true` emits the chained `1 = 1 = TRUE`
    "reference/equality"
    # 0184 - a jsonb result compared against an Elo literal: invalid input syntax
    # for type json, jsonb = integer[], could not determine polymorphic type
    "reference/datapath"
    "stdlib/data/patch"
    "stdlib/data/selector"
    # 0185 - PostgreSQL has no nested arrays, so `flat` unnests a scalar:
    # function unnest(integer) does not exist
    "stdlib/list/transform/flat"
)

is_known_invalid() {
    local relpath=$1
    local base="${relpath%.expected.sql}"
    local known
    for known in "${KNOWN_INVALID[@]}"; do
        if [ "$base" = "$known" ]; then
            return 0
        fi
    done
    return 1
}

# Run every non-empty line of a fixture as its own SELECT. Leaves the last
# statement attempted in $sql so the caller can replay it for the error.
run_file() {
    local file=$1
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            sql="SELECT $line;"
            if ! echo "$sql" | psql_run >/dev/null 2>&1; then
                return 1
            fi
        fi
    done < "$file"
    return 0
}

# Check if PostgreSQL is available
if ! psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    echo "⚠ PostgreSQL not available - skipping SQL tests"
    echo "  Run 'docker compose up -d' to enable SQL testing"
    exit 0
fi

# Find all .expected.sql files recursively
while IFS= read -r -d '' file; do
    if should_skip "$file"; then
        ((SKIPPED++)) || true
        continue
    fi

    # Get relative path for display
    relpath="${file#$TEST_DIR/}"

    if is_known_invalid "$relpath"; then
        if run_file "$file"; then
            echo "  ✗ $relpath (now valid SQL - drop it from KNOWN_INVALID)"
            ((FAILED++)) || true
        else
            echo "  ⊘ $relpath (known invalid SQL)"
            ((SKIPPED++)) || true
        fi
        continue
    fi

    if run_file "$file"; then
        echo "  ✓ $relpath"
        ((PASSED++)) || true
    else
        echo "  ✗ $relpath"
        ((FAILED++)) || true
        echo "$sql" | psql_run || true
    fi
done < <(find "$TEST_DIR" -type f -name "*.expected.sql" -print0 | sort -z)

echo "SQL: $PASSED passed, $FAILED failed, $SKIPPED skipped"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
