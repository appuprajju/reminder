#!/bin/sh
# Verifies the generated app icons and the PWA manifest.
set -e
cd "$(dirname "$0")/.."
node scripts/verify-icons.js
