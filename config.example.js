// Copy this file to config.js (already in .gitignore) and fill in your project.
// Never commit real keys — the anon key is public-safe by RLS design, but keep
// this file out of source control anyway so environments don't collide.
export const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  // Gemini: in production this should be empty and calls go through the
  // Supabase Edge Function `ai`. Set this only for local dev without Supabase.
  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  // Force demo mode regardless of ?demo=1 — useful for a static showcase deploy.
  FORCE_DEMO: false,
};
