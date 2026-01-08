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

# Test Type Checking
echo "Typecheck Tests:"
if ! "$SCRIPTS_DIR/test-typecheck.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

exit ${EXIT_CODE:-0}
