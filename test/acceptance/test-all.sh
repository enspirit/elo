#!/bin/bash

# Local acceptance tests - JS-only
# Runs .expected.js files using language-specific test scripts

set -e

TEST_DIR="${1:-test/fixtures}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running local acceptance tests..."
echo ""

# Test JavaScript
echo "JavaScript Tests:"
if ! "$SCRIPTS_DIR/test-js.sh" "$TEST_DIR"; then
    EXIT_CODE=1
fi

echo ""

exit ${EXIT_CODE:-0}
