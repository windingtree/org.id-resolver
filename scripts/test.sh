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
    npx istanbul cover _mocha --report lcovonly --  --exit -R spec --timeout 70000 ./test/spec/**/*.js
else 
    echo "Running tests without coverage"
    npx mocha --exit -R spec --timeout 70000 ./test/spec/**/*.js    
fi
