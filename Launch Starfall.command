#!/bin/zsh
cd "${0:A:h}"
/opt/homebrew/bin/node server.mjs &
server_pid=$!
sleep 1
open 'http://127.0.0.1:4177'
wait "$server_pid"
