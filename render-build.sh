#!/usr/bin/env bash
# Render "Build Command" for the static site. Not a real frontend build (there is
# no bundler by design) — this only writes config.js from Render environment
# variables so real secrets never live in git. See README.md.
set -euo pipefail

# Leave GEMINI_API_KEY out of this file on purpose: a static site has no server,
# so anything written here is visible to every visitor via view-source. Keep the
# real Gemini key only as a Supabase Edge Function secret (supabase secrets set
# GEMINI_API_KEY=...) — ai.js already falls back to calling the Edge Function
# whenever GEMINI_API_KEY is empty.
cat > config.js << EOF
export const CONFIG = {
  SUPABASE_URL: '${SUPABASE_URL:-}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY:-}',
  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  FORCE_DEMO: ${FORCE_DEMO:-true},
};
EOF

echo "wrote config.js:"
cat config.js
