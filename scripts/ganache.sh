#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

pkey=`cat localkeys.json | jq -r '.pkey'`
ganache_port=8545

start_ganache() {
  npx ganache-cli --gasLimit 0xfffffffffff --gasPrice 0x01 --port "$ganache_port" --account="0x${pkey},1000000000000000000000" > /dev/null &
  ganache_pid=$! 
  echo "Server is listening on the port $ganache_port (pid: $ganache_pid)" 
  read -n 1 -p "Press any key to halt ganache..." 
}

ganache_running() {
  nc -z localhost "$ganache_port"
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi
