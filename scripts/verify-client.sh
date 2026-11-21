#!/bin/sh
# Verifies the upgraded client page (JS parses; login, sync, push, install, analytics and alerts fix are wired in).
set -e
cd "$(dirname "$0")/.."
node scripts/verify-client.js
