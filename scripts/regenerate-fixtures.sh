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
FIXTURE_ARGS=()

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
            echo "  -t, --target  Target language(s): js, ruby, sql, python (comma-separated)"
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
            FIXTURE_ARGS+=("$1")
            shift
            ;;
    esac
done

# Build first
echo "Building compiler..."
npm run build --silent

# Collect .elo files: either from arguments or by finding all recursively
ELO_FILES=()
if [ ${#FIXTURE_ARGS[@]} -eq 0 ]; then
    while IFS= read -r -d '' f; do
        ELO_FILES+=("$f")
    done < <(find "$FIXTURES_DIR" -name '*.elo' -print0 | sort -z)
else
    for arg in "${FIXTURE_ARGS[@]}"; do
        # Try exact path first, then search recursively
        if [ -f "$arg" ]; then
            ELO_FILES+=("$arg")
        elif [ -f "$FIXTURES_DIR/${arg}.elo" ]; then
            ELO_FILES+=("$FIXTURES_DIR/${arg}.elo")
        else
            while IFS= read -r -d '' f; do
                ELO_FILES+=("$f")
            done < <(find "$FIXTURES_DIR" -name "${arg}.elo" -print0 | sort -z)
        fi
    done
fi

# Parse target list
if [ -n "$TARGETS" ]; then
    IFS=',' read -ra TARGET_LIST <<< "$TARGETS"
else
    TARGET_LIST=()
fi

regenerate_fixture() {
    local elo_file="$1"
    local base="${elo_file%.elo}"
    local display="${base#$FIXTURES_DIR/}"

    local regenerated=""

    # Map target names to file extensions and execution flags
    # js, ruby, python use --execute; sql does not
    local all_targets="js ruby sql python"
    local ext_for_python="py"

    for target in $all_targets; do
        # Determine file extension (python -> .py, others -> .<target>)
        local ext="$target"
        if [ "$target" = "python" ]; then
            ext="py"
        fi
        local expected_file="${base}.expected.${ext}"

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
            # Use --execute for JS, Ruby, and Python so fixtures are self-executing
            if [ "$target" = "js" ] || [ "$target" = "ruby" ] || [ "$target" = "python" ]; then
                $ELOC "$elo_file" -t "$target" --execute -f "$expected_file"
            else
                $ELOC "$elo_file" -t "$target" -f "$expected_file"
            fi
            regenerated="$regenerated $target"
        fi
    done

    if [ -n "$regenerated" ]; then
        echo "  ✓ $display:$regenerated"
    else
        echo "  ⊘ $display (no targets to regenerate)"
    fi
}

echo "Regenerating fixtures..."
for elo_file in "${ELO_FILES[@]}"; do
    regenerate_fixture "$elo_file"
done

echo "Done."
