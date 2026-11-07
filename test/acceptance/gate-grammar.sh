#!/bin/bash

# Gate the emitted code against the grammar each target is allowed to produce.
#
# The security property this stands for is on the security page: "It emits only
# what you wrote. No value threaded through the compiler — a name, a key, a
# literal — can break out of its slot and inject code into the output." A
# fixture assertion cannot check that: it says the program computed the right
# answer, and an injected `#{...}` that happens not to change the answer passes
# it. The shape of the emission is where the property lives.
#
# Ruby is gated here rather than in the unit suite because Ripper needs ruby.
# JavaScript is gated in test/unit/emitted-grammar.unit.test.ts (the committed
# .expected.js) and test/integration/emitted-grammar.integration.test.ts (every
# compile mode, including --optimize), both of which need no interpreter.

set -e

TEST_DIR="${1:-test/fixtures}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
ELOC="./bin/eloc"
EXIT_CODE=0

# With ELO_OPTIMIZE=1 the acceptance suite runs the annotated emission rather
# than the committed one, so that is what gets gated too: --optimize selects
# different emitters, and the typed at() sandbox escape of 1.2.3 lived in one
# of them.
ELO_OPTIMIZE="${ELO_OPTIMIZE:-}"

if ! ruby "$SCRIPTS_DIR/gate-ruby.rb" --self-test; then
    EXIT_CODE=1
fi

if [ -n "$ELO_OPTIMIZE" ]; then
    EMITTED=$(mktemp)
    trap 'rm -f "$EMITTED"' EXIT
    while IFS= read -r -d '' file; do
        # A line the checker reported on is emitted unannotated and exits 1;
        # that is the documented refusal, not a failure to gate.
        $ELOC -t ruby --lines -x --optimize "${file%.expected.*}.elo" 2>/dev/null >> "$EMITTED" || true
    done < <(find "$TEST_DIR" -type f -name "*.expected.ruby" -print0 | sort -z)
    if ! ruby "$SCRIPTS_DIR/gate-ruby.rb" "$EMITTED"; then
        EXIT_CODE=1
    fi
else
    # shellcheck disable=SC2046
    if ! ruby "$SCRIPTS_DIR/gate-ruby.rb" $(find "$TEST_DIR" -type f -name "*.expected.ruby" | sort); then
        EXIT_CODE=1
    fi
fi

exit $EXIT_CODE
