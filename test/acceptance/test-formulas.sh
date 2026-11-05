#!/bin/bash

# Run the formula catalogue (examples/formulas) on every target that can take
# it. Each bundle holds its cases as data; the runner that checks them is
# generated — `formula-bundle.js --runner` is the one copy of it — and compiled
# inside the bundle, so `./formula` and `./cases` resolve. It ends in a `check`,
# so a target answering something else exits non-zero on its own and there is
# nothing here to compare against a recorded output.
#
# SQL is absent on purpose: a formula is a lambda and `Input` is a type
# definition, and that target takes neither. See examples/formulas/BUNDLE.md.

set -e

FORMULA_DIR="${1:-examples/formulas}"
ELOC="./bin/eloc"
RUNNER_SOURCE=$(node dist/examples/formula-bundle.js --runner)
FAILED=0
PASSED=0

# The generated runner, written into the bundle for the length of the run.
RUNNER_NAME="_cases.run.elo"
cleanup() { find "$FORMULA_DIR" -name "$RUNNER_NAME" -delete 2>/dev/null || true; }
trap cleanup EXIT

for target in ruby js python; do
    case "$target" in
        ruby)   runner=(ruby) ;;
        js)     runner=(node -) ;;
        python) runner=(python3) ;;
    esac

    prelude=$($ELOC --prelude-only -t "$target")

    while IFS= read -r -d '' manifest; do
        bundle=$(dirname "$manifest")
        id=$(basename "$bundle")
        file="$bundle/$RUNNER_NAME"
        printf '%s' "$RUNNER_SOURCE" > "$file"

        # A published formula also has to be free of the type errors the checker
        # can see without being told the shape of the input.
        if ! typed=$($ELOC "$file" -t "$target" --typecheck -x 2>&1 >/dev/null); then
            echo "  ✗ $id [$target] (does not type-check)"
            echo "$typed"
            ((FAILED++)) || true
            rm -f "$file"
            continue
        fi
        if ! code=$($ELOC "$file" -t "$target" -x 2>&1); then
            echo "  ✗ $id [$target] (does not compile)"
            echo "$code"
            ((FAILED++)) || true
            rm -f "$file"
            continue
        fi
        if { echo "$prelude"; echo "$code"; } | "${runner[@]}" >/dev/null 2>&1; then
            echo "  ✓ $id [$target]"
            ((PASSED++)) || true
        else
            echo "  ✗ $id [$target]"
            { echo "$prelude"; echo "$code"; } | "${runner[@]}" || true
            ((FAILED++)) || true
        fi
        rm -f "$file"
    done < <(find "$FORMULA_DIR" -type f -name 'bundle.json' -print0 | sort -z)
done

echo "Formulas: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
