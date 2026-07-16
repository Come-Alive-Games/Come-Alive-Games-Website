/**
 * SUPABASE CONFIG
 * ----------------
 * 1. Create a free project at https://supabase.com
 * 2. Run supabase/schema.sql in the SQL editor (see README.md)
 * 3. Paste your Project URL and anon public key below
 * 4. Set ADMIN_PASSWORD to whatever you want your moderation
 *    password to be (this is a light client-side gate only —
 *    see README.md for a note on stronger admin security).
 */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
const ADMIN_PASSWORD = "changeme";

// Loaded globally via CDN script tag in each page (see <head>)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
