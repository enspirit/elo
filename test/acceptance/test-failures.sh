#!/bin/bash

# Failure structure, per target.
#
# A failure is a message and a kind. The message is prose and is not promised
# to anyone; `kind`, `path` and `label` are what a host branches on. This
# checks that every target reports the same three for the same Elo expression.
#
# Each case is a self-contained expression that fails, compiled for each target
# and wrapped in a driver that catches the failure and prints the three fields
# as `kind|path|label`. See failures/README.md.

set -u

CASE_DIR="$(cd "$(dirname "$0")" && pwd)/failures"
ELOC="./bin/eloc"
FAILED=0
PASSED=0

# The targets that can carry a structured failure. SQL is absent: it refuses
# type definitions and guards outright, so it has no failure of this kind to
# report.
TARGETS=(js ruby python)

runner_js()     { node; }
runner_ruby()   { ruby; }
runner_python() { python3; }

# A driver calls the compiled function and prints what it caught. An empty
# field prints as nothing, so `guard||positive` is a guard with a label and no
# path.
driver_js() {
    cat <<EOF
const f = $1;
try { f(null); console.log('NO-FAILURE'); }
catch (e) { console.log([e.kind || '', e.path || '', e.label || ''].join('|')); }
EOF
}

driver_ruby() {
    cat <<EOF
f = $1
begin
  f.call(nil)
  puts 'NO-FAILURE'
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
f = $1
try:
    f(None)
    print('NO-FAILURE')
except Exception as e:
    print('|'.join([
        getattr(e, 'kind', None) or '',
        getattr(e, 'path', None) or '',
        getattr(e, 'label', None) or '',
    ]))
EOF
}

for case_file in "$CASE_DIR"/*.elo; do
    name=$(basename "$case_file" .elo)
    expected=$(cat "$CASE_DIR/$name.expected")

    for target in "${TARGETS[@]}"; do
        prelude=$($ELOC --prelude-only -t "$target")
        compiled=$($ELOC -t "$target" "$case_file" 2>&1)
        if [ $? -ne 0 ]; then
            echo "  ✗ $name [$target] did not compile: $compiled"
            ((FAILED++)) || true
            continue
        fi

        actual=$({ echo "$prelude"; "driver_$target" "$compiled"; } | "runner_$target" 2>&1 | tail -1)

        if [ "$actual" == "$expected" ]; then
            echo "  ✓ $name [$target]"
            ((PASSED++)) || true
        else
            echo "  ✗ $name [$target] expected '$expected', got '$actual'"
            ((FAILED++)) || true
        fi
    done
done

echo "Failure structure: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
