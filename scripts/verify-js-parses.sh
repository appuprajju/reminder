#!/bin/sh
# Verifies that the inline <script> in index.html is syntactically valid JavaScript.
set -e
cd "$(dirname "$0")/.."
[ -f index.html ] || { echo "index.html missing" >&2; exit 1; }
tmp="$(mktemp /tmp/glassy-app-XXXXXX.js)"
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > "$tmp"
[ -s "$tmp" ] || { echo "no inline script found" >&2; exit 1; }
node --check "$tmp"
echo "inline JS parses OK ($(wc -l < "$tmp") lines)"
rm -f "$tmp"
