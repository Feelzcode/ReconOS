#!/bin/sh
set -e
echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Starting ReconOS API on port ${PORT:-10000}..."
exec node dist/main.js
