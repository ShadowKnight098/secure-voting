import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

export const isSupabaseConfigured = Boolean((supabaseUrl && supabaseKey) || databaseUrl);

// Supabase REST client
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

// Direct PostgreSQL Connection Pool (for Supabase Postgres)
export const pgPool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    })
  : null;

if (isSupabaseConfigured) {
  console.log('[Supabase] Centralized cloud database configured successfully.');
} else {
  console.log('[Database] Running in local SQLite mode (Set SUPABASE_URL & SUPABASE_KEY or DATABASE_URL in .env to enable centralized Supabase cloud storage).');
}

export default supabase;
