#!/bin/sh
set -e
echo "Running migrations..."
npx knex migrate:latest
echo "Starting server..."
exec node server.js
