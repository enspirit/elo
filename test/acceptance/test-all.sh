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
if ! "$SCRIPTS_DIR/test-sql.sh" "$TEST_DIR"; then
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

exit ${EXIT_CODE:-0}
