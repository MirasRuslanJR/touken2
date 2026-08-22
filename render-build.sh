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
#
# AI_FALLBACK_* are blanked for exactly the same reason — a backup provider key
# is just as stealable from view-source. The backup provider is a local-dev and
# Edge-Function concern, never something a public static build ships.
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash-lite}"
cat > config.js << EOF
export const CONFIG = {
  SUPABASE_URL: '${SUPABASE_URL:-}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY:-}',
  GEMINI_API_KEY: '',
  GEMINI_MODEL: '${GEMINI_MODEL}',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent',
  FORCE_DEMO: ${FORCE_DEMO:-true},
  FORCE_DEMO_AI: ${FORCE_DEMO_AI:-false},
  AI_DAILY_BUDGET: ${AI_DAILY_BUDGET:-200},
  AI_FALLBACK_URL: '',
  AI_FALLBACK_KEY: '',
  AI_FALLBACK_MODEL: '',
};
EOF

echo "wrote config.js:"
cat config.js
