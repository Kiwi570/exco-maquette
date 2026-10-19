#!/bin/bash
# Reconstruit le JavaScript et les pages intérieures (inutile pour Vercel : les fichiers construits sont déjà dans le dépôt)
cd "$(dirname "$0")"
npx --yes esbuild@0.24.0 src/js/main.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=assets/js/site.js
python3 src/build_pages.py
