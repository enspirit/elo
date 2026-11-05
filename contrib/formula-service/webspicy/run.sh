#!/bin/bash

# Run the black-box specification against a formula service this script boots.
#
#   contrib/formula-service/webspicy/run.sh              # the whole suite
#   contrib/formula-service/webspicy/run.sh _one/get.yml # one specification
#   LOG_LEVEL=DEBUG contrib/formula-service/webspicy/run.sh
#
# Webspicy is a Ruby gem and is not part of this repository's npm
# dependencies, so this is not wired into `npm test`: a black-box suite needs
# a running service and a second toolchain, which is exactly what it is for.
#
#   gem install webspicy
#
# A service already running elsewhere is tested without booting one:
#
#   ELO_FORMULA_SERVICE=https://formulas.example.com webspicy <suite>/config.rb

set -e

SUITE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SUITE/../../.." && pwd)"
PORT="${PORT:-8099}"

# Webspicy and its `http` pin come from the suite's own Gemfile — see it for
# why the version matters.
export BUNDLE_GEMFILE="$SUITE/Gemfile"
if ! bundle check >/dev/null 2>&1; then
    echo "installing the suite's gems (bundle install)" >&2
    bundle install --quiet
fi

cd "$ROOT"
npm run --silent build

"$ROOT/contrib/formula-service/bin/elo-formula-service" --port "$PORT" >/tmp/elo-formula-service.log 2>&1 &
SERVICE=$!
trap 'kill $SERVICE 2>/dev/null || true' EXIT

# Boot validates every bundle and runs every case, which takes a moment and is
# the point: a service that answers at all is one whose formulas all pass.
for _ in $(seq 1 60); do
    if curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
    if ! kill -0 $SERVICE 2>/dev/null; then
        echo "the service did not start:" >&2
        cat /tmp/elo-formula-service.log >&2
        exit 1
    fi
    sleep 0.5
done

export ELO_FORMULA_SERVICE="http://127.0.0.1:$PORT"
if [ $# -eq 0 ]; then
    bundle exec webspicy "$SUITE/config.rb"
else
    bundle exec webspicy "$SUITE/$1"
fi
