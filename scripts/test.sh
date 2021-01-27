#!/usr/bin/env bash

export TESTING=true

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
    # cleanup logic
    echo "Testing environment is cleaned"
}

if [ "$COVERAGE" = true ]; then
    echo "Running tests with coverage"
    npx nyc --reporter lcov mocha --exit -R spec --timeout 70000 ./test/spec/**/*.js

    if [ "$CONTINUOUS_INTEGRATION" = true ]; then
        cat coverage/lcov.info | npx coveralls
    fi

else
    echo "Running tests without coverage"

    if [ -z "$@" ]; then
        testDir="./test/spec/**/*.js"
    else
        testDir="$@"
    fi

    npx mocha --exit -R spec --timeout 70000 "$testDir"
fi
