// Committed as-is for the live deploy: FORCE_DEMO means the app runs entirely
// on the built-in demo dataset, no Supabase/Gemini calls needed, zero secrets
// in this file. Safe to be public. See README.md to switch to a real backend.
export const CONFIG = {
  SUPABASE_URL: 'https://rzjposqkjfycmtckzmne.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6anBvc3FramZ5Y210Y2t6bW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzM2NTcsImV4cCI6MjEwMjc0OTY1N30.U1bS7LnfPS4E_dTRFV38z4yx7SbU0vyjv0qQd5mDrLk',
  GEMINI_API_KEY: 'AQ.Ab8RN6I8-N6MRSSHZ0WsKMoN-HEBuUrxuaizQJLfW6fOwg3JHA',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  FORCE_DEMO: true,
};
