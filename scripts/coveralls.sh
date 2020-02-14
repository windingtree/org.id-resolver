#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

cat ./coverage/lcov.info | npx coveralls