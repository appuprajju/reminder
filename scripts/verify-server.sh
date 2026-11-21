#!/bin/sh
# Boots the server against a temp data dir and exercises auth, sync, analytics and the push scheduler.
set -e
cd "$(dirname "$0")/.."
node --check server.js
node --check public/sw.js
node scripts/verify-server.js
