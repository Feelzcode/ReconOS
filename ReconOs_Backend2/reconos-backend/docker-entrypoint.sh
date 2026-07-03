#!/bin/sh
set -e
echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Starting ReconOS API on port ${PORT:-10000}..."
if [ -f dist/main.js ]; then
  exec node dist/main.js
elif [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
else
  echo "ERROR: compiled entry not found (expected dist/main.js)"
  ls -la dist/ 2>/dev/null || echo "dist/ missing"
  exit 1
fi
