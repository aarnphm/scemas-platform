#!/usr/bin/env bash
set -euo pipefail

# downloads platform-specific postgres 16 binaries for tauri bundling.
# output: crates/scemas-desktop/resources/pg/

PG_VERSION="16.6"
OUT_DIR="crates/scemas-desktop/resources/pg"

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os-$arch" in
    Darwin-arm64)  echo "macos-arm64" ;;
    Darwin-x86_64) echo "macos-x64" ;;
    Linux-x86_64)  echo "linux-x64" ;;
    Linux-aarch64) echo "linux-arm64" ;;
    *)             echo "unsupported: $os-$arch" && exit 1 ;;
  esac
}

PLATFORM="$(detect_platform)"
echo "bundling postgres $PG_VERSION for $PLATFORM"

mkdir -p "$OUT_DIR/bin" "$OUT_DIR/lib"

# check if already bundled
if [ -f "$OUT_DIR/bin/pg_ctl" ]; then
  echo "postgres already bundled at $OUT_DIR, skipping"
  exit 0
fi

case "$PLATFORM" in
  macos-arm64|macos-x64)
    # use homebrew-installed postgres on macOS
    PG_BIN="$(brew --prefix postgresql@16 2>/dev/null || true)/bin"
    if [ ! -f "$PG_BIN/pg_ctl" ]; then
      echo "postgres 16 not found via homebrew. install: brew install postgresql@16"
      echo "alternatively, set PG_BIN_DIR to point to your postgres bin directory"
      exit 1
    fi
    echo "copying from $PG_BIN"
    for bin in initdb pg_ctl postgres createdb psql; do
      cp "$PG_BIN/$bin" "$OUT_DIR/bin/"
    done
    # copy required dylibs
    PG_LIB="$(brew --prefix postgresql@16)/lib"
    if [ -d "$PG_LIB" ]; then
      cp "$PG_LIB"/libpq.*.dylib "$OUT_DIR/lib/" 2>/dev/null || true
    fi
    ;;
  linux-x64|linux-arm64)
    # use system postgres or download from apt
    PG_BIN="/usr/lib/postgresql/16/bin"
    if [ ! -f "$PG_BIN/pg_ctl" ]; then
      PG_BIN="$(which pg_ctl 2>/dev/null | xargs dirname 2>/dev/null || true)"
    fi
    if [ ! -f "$PG_BIN/pg_ctl" ]; then
      echo "postgres 16 not found. install: sudo apt install postgresql-16"
      exit 1
    fi
    echo "copying from $PG_BIN"
    for bin in initdb pg_ctl postgres createdb psql; do
      cp "$PG_BIN/$bin" "$OUT_DIR/bin/"
    done
    # copy required shared libs
    PG_LIB="/usr/lib/postgresql/16/lib"
    if [ -d "$PG_LIB" ]; then
      cp "$PG_LIB"/libpq.so* "$OUT_DIR/lib/" 2>/dev/null || true
    fi
    ;;
esac

echo "postgres bundled to $OUT_DIR"
ls -la "$OUT_DIR/bin/"
