#!/bin/bash

# Run the formula catalogue (contrib/formula-service/formulas) on every target
# that can take it. A bundle holds two halves of its contract as data, and this
# checks both:
#
#   cases     an input and the answer it gets. The runner that checks them is
#             generated — `elo-formulas --runner` is the one copy of it — and
#             compiled inside the bundle, so `./formula` and `./cases` resolve.
#             It ends in a `check`, so a target answering something else exits
#             non-zero on its own.
#
#   refusals  an input the formula does not take, and the kind, path and label
#             it says about it. These cannot be checked from inside Elo: there
#             is no way to catch a failure there, which is a language decision
#             rather than a gap. So the service program is compiled for the
#             target and wrapped in a driver that applies the input, catches
#             what comes out and prints `kind|path|label` — the same shape
#             test-failures.sh uses for the corpus. A label that only one
#             target reports is exactly the bug this finds.
#
# SQL is absent on purpose: a formula is a lambda and `Input` is a type
# definition, and that target takes neither. See the catalogue's BUNDLE.md.

set -e

FORMULA_DIR="${1:-contrib/formula-service/formulas}"
ELOC="./bin/eloc"
FORMULAS="contrib/formula-service/bin/elo-formulas"
RUNNER_SOURCE=$($FORMULAS --runner)
SERVICE_SOURCE=$($FORMULAS --service)
FAILED=0
PASSED=0

# Generated, written into the bundle for the length of the run, and removed.
RUNNER_NAME="_cases.run.elo"
SERVICE_NAME="_service.run.elo"
INPUT_FILE="$(mktemp)"
cleanup() {
    find "$FORMULA_DIR" -name "$RUNNER_NAME" -delete 2>/dev/null || true
    find "$FORMULA_DIR" -name "$SERVICE_NAME" -delete 2>/dev/null || true
    rm -f "$INPUT_FILE"
}
trap cleanup EXIT

# A driver applies one input and prints what the formula said about it. An
# empty field prints as nothing, so `guard||bornFirst` is a guard with a label
# and no path. `$1` is the compiled formula, `$2` the file holding the input.
driver_js() {
    cat <<EOF
const fs = require('fs');
const f = $1;
const input = JSON.parse(fs.readFileSync('$2', 'utf-8'));
try { f(input); console.log('ANSWERED'); }
catch (e) { console.log([e.kind || '', e.path || '', e.label || ''].join('|')); }
EOF
}

# Ruby reads an input with symbol keys, which is Elo's convention there.
driver_ruby() {
    cat <<EOF
require 'json'
f = $1
input = JSON.parse(File.read('$2'), symbolize_names: true)
begin
  f.call(input)
  puts 'ANSWERED'
rescue => e
  kind = e.respond_to?(:kind) ? e.kind : nil
  path = e.respond_to?(:path) ? e.path : nil
  label = e.respond_to?(:label) ? e.label : nil
  puts [kind || '', path || '', label || ''].join('|')
end
EOF
}

driver_python() {
    cat <<EOF
import json
f = $1
with open('$2') as handle:
    input = json.load(handle)
try:
    f(input)
    print('ANSWERED')
except Exception as e:
    print('|'.join([
        getattr(e, 'kind', None) or '',
        getattr(e, 'path', None) or '',
        getattr(e, 'label', None) or '',
    ]))
EOF
}

for target in ruby js python; do
    case "$target" in
        ruby)   runner=(ruby) ;;
        js)     runner=(node -) ;;
        python) runner=(python3) ;;
    esac

    prelude=$($ELOC --prelude-only -t "$target")

    while IFS= read -r -d '' manifest; do
        bundle=$(dirname "$manifest")
        # The id is the path under the catalogue, which is what a formula's id
        # is — `tax/be/vat` and not `vat`.
        id=${bundle#"$FORMULA_DIR"/}
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

        # Now the other half: what the formula refuses.
        refusals=$(ELO_FORMULAS="$FORMULA_DIR" $FORMULAS --refusals "$id")
        [ -z "$refusals" ] && continue

        service="$bundle/$SERVICE_NAME"
        printf '%s' "$SERVICE_SOURCE" > "$service"
        if ! applied=$($ELOC "$service" -t "$target" 2>&1); then
            echo "  ✗ $id [$target] (the service program does not compile)"
            echo "$applied"
            ((FAILED++)) || true
            rm -f "$service"
            continue
        fi

        while IFS=$'\t' read -r name promised input; do
            [ -z "$name" ] && continue
            printf '%s' "$input" > "$INPUT_FILE"
            got=$({ echo "$prelude"; "driver_$target" "$applied" "$INPUT_FILE"; } \
                  | "${runner[@]}" 2>&1 | tail -1)
            if [ "$got" == "$promised" ]; then
                echo "  ✓ $id [$target] refuses $name"
                ((PASSED++)) || true
            else
                echo "  ✗ $id [$target] refuses $name: expected '$promised', got '$got'"
                ((FAILED++)) || true
            fi
        done <<< "$refusals"
        rm -f "$service"
    done < <(find "$FORMULA_DIR" -type f -name 'bundle.json' -print0 | sort -z)
done

echo "Formulas: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
