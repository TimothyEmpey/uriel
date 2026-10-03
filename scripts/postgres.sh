#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
DATA="$ROOT/.pgdata"
mkdir -p "$ROOT/data"
if [ ! -x "$PG_BIN/initdb" ]; then
  echo "Install PostgreSQL 16 first: brew install postgresql@16" >&2
  exit 1
fi
if [ ! -d "$DATA/base" ]; then
  "$PG_BIN/initdb" -D "$DATA" --username="$(whoami)" --auth=trust >/dev/null
fi
if ! "$PG_BIN/pg_isready" -h localhost >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" -D "$DATA" -l "$ROOT/data/postgres.log" -o "-p 5432" start
fi
"$PG_BIN/createdb" -h localhost uriel 2>/dev/null || true
echo "Postgres is ready on localhost:5432 database uriel"
