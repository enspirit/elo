#!/bin/bash

# Regenerate expected fixture files for Elo compiler tests
#
# Usage:
#   ./scripts/regenerate-fixtures.sh              # Regenerate all fixtures
#   ./scripts/regenerate-fixtures.sh arithmetic   # Regenerate specific fixture
#   ./scripts/regenerate-fixtures.sh -t js        # Regenerate only JS targets
#   ./scripts/regenerate-fixtures.sh -t js,ruby arithmetic  # Specific target + fixture

set -e

FIXTURES_DIR="test/fixtures"
ELOC="./bin/eloc"
TARGETS=""
FIXTURES=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--target)
            TARGETS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [-t target[,target]] [fixture-name ...]"
            echo ""
            echo "Options:"
            echo "  -t, --target  Target language(s): js, ruby, sql (comma-separated)"
            echo "  -h, --help    Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                          # Regenerate all fixtures"
            echo "  $0 arithmetic               # Regenerate one fixture"
            echo "  $0 -t js                    # Regenerate only JS for all fixtures"
            echo "  $0 -t js,ruby temporal      # Regenerate JS and Ruby for 'temporal'"
            exit 0
            ;;
        *)
            FIXTURES+=("$1")
            shift
            ;;
    esac
done

# Build first
echo "Building compiler..."
npm run build --silent

# If no fixtures specified, find all .elo files
if [ ${#FIXTURES[@]} -eq 0 ]; then
    for f in "$FIXTURES_DIR"/*.elo; do
        base=$(basename "$f" .elo)
        FIXTURES+=("$base")
    done
fi

# Parse target list
if [ -n "$TARGETS" ]; then
    IFS=',' read -ra TARGET_LIST <<< "$TARGETS"
else
    TARGET_LIST=()
fi

regenerate_fixture() {
    local name="$1"
    local elo_file="$FIXTURES_DIR/${name}.elo"

    if [ ! -f "$elo_file" ]; then
        echo "  ✗ $name (file not found: $elo_file)"
        return 1
    fi

    local regenerated=""

    for target in js ruby sql; do
        local expected_file="$FIXTURES_DIR/${name}.expected.${target}"

        # Skip if target list specified and this target not in it
        if [ ${#TARGET_LIST[@]} -gt 0 ]; then
            local found=0
            for t in "${TARGET_LIST[@]}"; do
                if [ "$t" = "$target" ]; then
                    found=1
                    break
                fi
            done
            if [ $found -eq 0 ]; then
                continue
            fi
        fi

        # Only regenerate if expected file already exists (or targets explicitly specified)
        if [ -f "$expected_file" ] || [ ${#TARGET_LIST[@]} -gt 0 ]; then
            $ELOC "$elo_file" -t "$target" -f "$expected_file"
            regenerated="$regenerated $target"
        fi
    done

    if [ -n "$regenerated" ]; then
        echo "  ✓ $name:$regenerated"
    else
        echo "  ⊘ $name (no targets to regenerate)"
    fi
}

echo "Regenerating fixtures..."
for fixture in "${FIXTURES[@]}"; do
    regenerate_fixture "$fixture"
done

echo "Done."
