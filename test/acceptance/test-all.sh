#!/bin/bash

# Local acceptance tests - orchestrates testing across all target languages
# Runs .expected.{ruby,js,sql} files using language-specific test scripts

set -e

TEST_DIR="${1:-test/fixtures}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running local acceptance tests..."
echo ""

# Test Ruby
echo "Ruby Tests:"
if ! "$SCRIPTS_DIR/test-ruby.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

# Test JavaScript
echo "JavaScript Tests:"
if ! "$SCRIPTS_DIR/test-js.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

# Test SQL
echo "SQL Tests:"
# SQL is excluded from the force-dynamic axis, and not as a concession.
# PostgreSQL resolves operators by the static types of their operands, so an
# all-`any` compilation leaves it with nothing to resolve on: 19 fixtures fail
# with "could not choose a best candidate operator". That is PostgreSQL
# refusing an under-specified query, not Elo's dynamic path disagreeing with
# its typed one — and SQL has no lambdas, so no Elo program can reach an
# `any` operand there in the first place. The axis asks a question SQL cannot
# be asked.
if [ -n "${ELO_FORCE_DYNAMIC:-}" ]; then
    echo "  ⊘ skipped - SQL resolves operators by static type; see test-all.sh"
elif ! "$SCRIPTS_DIR/test-sql.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

# Test Python
echo "Python Tests:"
if ! "$SCRIPTS_DIR/test-python.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

# Failure structure across targets. Not fixture-driven: a fixture assertion
# cannot see a failure's kind, because Elo cannot either.
echo "Failure Structure Tests:"
if ! "$SCRIPTS_DIR/test-failures.sh"; then
    EXIT_CODE=1
fi

echo ""

# The shape of the emitted Ruby, not its answer. A fixture assertion says the
# program computed the right thing; this says it is written in the sub-grammar
# of Ruby that Elo is allowed to emit — no backticks, no host variables, no
# interpolation that is not the compiler's own prose. It is here rather than in
# the unit suite because it needs Ripper, which needs ruby. The JavaScript
# counterpart runs in the unit and integration suites, which need no
# interpreter.
echo "Emitted Grammar Tests:"
if ! "$SCRIPTS_DIR/gate-grammar.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

# The zone axis.
#
# 0259 D1: a Date or a Datetime is a wall clock, NOW and TODAY are read in the
# *declared* zone, and nothing in an Elo program may depend on the host's. So
# the temporal corpus has to answer the same thing in every host zone, and the
# only way to know that is to run it in more than one. Before this, the suite
# ran in whatever zone the machine was in -- green on a UTC CI box, red on a
# laptop in CET (ideation/0180), and the divergences in 0259's table went
# unnoticed for exactly that reason.
#
# Three zones, chosen to be awkward in different directions: UTC as the
# baseline, Los_Angeles behind it with DST, Chatham ahead of it with DST *and*
# a quarter-hour offset. A whole-hour-only pair would miss an emission that
# rounds to the hour.
#
# Only the temporal fixtures: the rest of the corpus has no clock in it, and
# running 800 fixtures three more times buys nothing.
#
# THE TRAP, measured: the SQL target does not see TZ at all. libpq does not
# forward the client's zone, so the session keeps the server's and this axis
# silently tests nothing on SQL unless the zone goes through PGOPTIONS. The
# first version of this check reported SQL green in every zone, and it was
# green because it had never been asked.
if [ -z "${ELO_SKIP_ZONE_AXIS:-}" ]; then
    echo "Zone Axis (temporal fixtures):"

    # Which targets the axis may ask.
    #
    # SQL is excluded from the force-dynamic pass for exactly the reason the
    # main SQL step above is, and the same comment applies: PostgreSQL resolves
    # operators by the static types of their operands, so an all-`any`
    # compilation leaves it nothing to resolve on. Asking it anyway reported
    # every cell red in every zone *including UTC* — which is the shape of a
    # harness bug rather than a zone bug, and is how this was found.
    ZONE_TARGETS="ruby js python sql"
    if [ -n "${ELO_FORCE_DYNAMIC:-}" ]; then
        ZONE_TARGETS="ruby js python"
    fi

    # A failure here must say which target and which fixture, so the runner's
    # output is kept and printed rather than discarded. The first version of
    # this axis sent everything to /dev/null, which made a red CI run say only
    # that six cells were red.
    ZONE_LOG=$(mktemp)
    trap 'rm -f "$ZONE_LOG"' EXIT

    for zone in UTC America/Los_Angeles Pacific/Chatham; do
        echo "  TZ=$zone"
        for dir in "$TEST_DIR/stdlib/date" "$TEST_DIR/stdlib/datetime"; do
            [ -d "$dir" ] || continue
            dir_failed=""
            for target in $ZONE_TARGETS; do
                # TZ for the three client runtimes; PGOPTIONS for SQL, because
                # libpq does not forward the client's zone — see above.
                if ! TZ="$zone" PGOPTIONS="-c TimeZone=$zone" \
                     "$SCRIPTS_DIR/test-$target.sh" "$dir" >"$ZONE_LOG" 2>&1; then
                    echo "    ✗ $dir [$target]"
                    sed 's/^/        /' "$ZONE_LOG"
                    dir_failed=1
                    EXIT_CODE=1
                fi
            done
            [ -n "$dir_failed" ] || echo "    ✓ $dir"
        done
    done
    echo ""
fi

exit ${EXIT_CODE:-0}
