#!/usr/bin/env bash
# stress.sh
# Proves the article's central claim: under a fixed, small heap cap, the naive
# approach runs out of memory on a large file while the generator pipeline
# processes the same file successfully and returns the correct total.
#
# Usage: ./stress.sh [rows] [heapMB]
#   rows   default 16000000 (~390 MB file)
#   heapMB default 128

set -u
ROWS="${1:-16000000}"
HEAP="${2:-128}"
DIR="$(cd "$(dirname "$0")" && pwd)"
CSV="$DIR/data/big.csv"

echo "Generating $ROWS rows..."
node "$DIR/generate.js" "$ROWS" "$CSV"
echo ""

echo "=== naive @ ${HEAP}MB heap cap (expected: OOM crash) ==="
node --max-old-space-size="$HEAP" "$DIR/naive.js" "$CSV"
NAIVE_EXIT=$?
echo "exit code: $NAIVE_EXIT"
echo ""

echo "=== pipeline @ ${HEAP}MB heap cap (expected: success) ==="
node --max-old-space-size="$HEAP" "$DIR/pipeline.js" "$CSV"
PIPE_EXIT=$?
echo "exit code: $PIPE_EXIT"
echo ""

if [ "$NAIVE_EXIT" -ne 0 ] && [ "$PIPE_EXIT" -eq 0 ]; then
  echo "RESULT: naive crashed, pipeline survived the same heap cap. Claim verified."
  exit 0
else
  echo "RESULT: unexpected. naive_exit=$NAIVE_EXIT pipe_exit=$PIPE_EXIT"
  echo "(If neither crashed, your machine gave Node more room. Lower the heap cap:"
  echo "  ./stress.sh $ROWS 96 )"
  exit 1
fi
