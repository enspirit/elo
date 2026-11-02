#!/bin/bash

# Test SQL compilation - runs .expected.sql files using psql
# Recursively searches test/fixtures subdirectories
# Requires PostgreSQL to be running (docker compose up -d)

set -e

TEST_DIR="${1:-test/fixtures}"
ELOC="./bin/eloc"
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

# With ELO_OPTIMIZE=1, the fixture's .elo is recompiled with --optimize rather
# than read from its .expected file. Every fixture line is an assert, so running
# the corpus this way is the equivalence check for the annotated emission: it has
# to behave the same, not merely be smaller.
ELO_OPTIMIZE="${ELO_OPTIMIZE:-}"

# The code to run for one fixture.
emit() {
    local file=$1
    if [ -n "$ELO_OPTIMIZE" ]; then
        # A line the checker reported on is emitted unannotated and exits 1;
        # that is the documented refusal, not a test failure.
        $ELOC -t sql --optimize "${file%.expected.*}.elo" 2>/dev/null || true
    else
        cat "$file"
    fi
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
    done < <(emit "$file")
    return 0
}

# Check if PostgreSQL is available
if ! psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    echo "⚠ PostgreSQL not available - skipping SQL tests"
    echo "  Run 'docker compose up -d' to enable SQL testing"
    exit 0
fi

# The SQL target has a prelude too — elo_int, elo_data, elo_patch and the rest
# of the runtime helpers — and unlike the other three targets it cannot be
# prepended to the expression, because a pure SQL expression has nowhere to
# define a function. It is installed in the database instead, the same way a
# host deploying Elo to PostgreSQL has to.
#
# Every definition is CREATE OR REPLACE, so applying it on every run is
# idempotent and costs one connection.
if ! $ELOC --prelude-only -t sql | psql_run >/dev/null 2>&1; then
    echo "✗ could not install the SQL prelude (eloc --prelude-only -t sql)"
    $ELOC --prelude-only -t sql | psql_run >/dev/null || true
    exit 1
fi

# The sandbox recipe hosts are told to use — contrib/sandboxes/postgres/example.sql
# — wraps every evaluation in SET LOCAL statements, and those have to leave the
# prelude's helpers reachable. The recipe used to recommend `search_path = ''`,
# under which every type selector fails with "function elo_int does not exist":
# the compiler emits unqualified calls. Replay the recipe's own SET LOCALs around
# an expression that calls a helper, so a change to them cannot silently break
# the documented deployment. SET LOCAL ROLE is dropped: the restricted role is
# the host's to create, and search_path is what this asserts.
SANDBOX_SQL="$(cd "$(dirname "$0")/../.." && pwd)/contrib/sandboxes/postgres/example.sql"
if [ -f "$SANDBOX_SQL" ]; then
    settings=$(grep -E '^[[:space:]]*SET LOCAL' "$SANDBOX_SQL" | grep -v 'SET LOCAL ROLE')
    probe=$(printf 'BEGIN;\n%s\nSELECT elo_int(%s);\nCOMMIT;\n' "$settings" "'42'")
    if ! echo "$probe" | psql_run >/dev/null 2>&1; then
        echo "✗ the documented PostgreSQL sandbox recipe cannot reach the prelude"
        echo "  ($SANDBOX_SQL)"
        echo "$probe" | psql_run || true
        exit 1
    fi
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
