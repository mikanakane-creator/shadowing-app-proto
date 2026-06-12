#!/bin/bash
# シャドーイングアプリをローカルで起動する（マイク利用にはlocalhost必須）
cd "$(dirname "$0")"
PORT=8787
if ! lsof -i :$PORT -t >/dev/null 2>&1; then
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT/index.html"
