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

# The formula catalogue: whole programs rather than one-line assertions, each
# checking its own case table on every target that has lambdas.
echo "Formula Catalogue Tests:"
if ! "$SCRIPTS_DIR/test-formulas.sh"; then
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

exit ${EXIT_CODE:-0}
