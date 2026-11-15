#!/bin/bash
# Double-click to play. Needs Python 3 (macOS offers to install it the first time) or Node.js.
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node serve.mjs; fi
if python3 -c "print()" >/dev/null 2>&1; then exec python3 serve.py; fi
echo "Please install Node.js (https://nodejs.org) or Python 3, then double-click this again."
read -n 1 -s -r -p "Press any key to close."
