/**
 * Utility script to sync existing local SQLite database records up to Supabase.
 * Run via: node syncToSupabase.js
 */
import db from './config/db.js';
import { supabase, isSupabaseConfigured } from './config/supabase.js';

async function sync() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase is not configured! Please provide SUPABASE_URL and SUPABASE_KEY in server/.env');
    process.exit(1);
  }

  console.log('🔄 Starting migration from local SQLite to Supabase Cloud Database...');

  try {
    // 1. Sync Admins
    const admins = db.prepare('SELECT id, username, email, password_hash, role FROM admins').all();
    if (admins.length > 0) {
      const { error } = await supabase.from('admins').upsert(admins, { onConflict: 'username' });
      if (error) console.error('Error syncing admins:', error.message);
      else console.log(`✅ Synced ${admins.length} admins to Supabase.`);
    }

    // 2. Sync Parties
    const parties = db.prepare('SELECT id, name, code, description, logo_url FROM parties').all();
    if (parties.length > 0) {
      const { error } = await supabase.from('parties').upsert(parties, { onConflict: 'name' });
      if (error) console.error('Error syncing parties:', error.message);
      else console.log(`✅ Synced ${parties.length} political parties to Supabase.`);
    }

    // 3. Sync Elections
    const elections = db.prepare('SELECT id, title, description, start_date, end_date, status, created_by FROM elections').all();
    if (elections.length > 0) {
      const { error } = await supabase.from('elections').upsert(elections, { onConflict: 'id' });
      if (error) console.error('Error syncing elections:', error.message);
      else console.log(`✅ Synced ${elections.length} elections to Supabase.`);
    }

    // 4. Sync Candidates
    const candidates = db.prepare('SELECT id, name, party, bio, photo_url, election_id FROM candidates').all();
    if (candidates.length > 0) {
      const { error } = await supabase.from('candidates').upsert(candidates, { onConflict: 'id' });
      if (error) console.error('Error syncing candidates:', error.message);
      else console.log(`✅ Synced ${candidates.length} candidates to Supabase.`);
    }

    // 5. Sync Voters
    const voters = db.prepare('SELECT id, full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id FROM voters').all();
    if (voters.length > 0) {
      const { error } = await supabase.from('voters').upsert(voters, { onConflict: 'email' });
      if (error) console.error('Error syncing voters:', error.message);
      else console.log(`✅ Synced ${voters.length} voters to Supabase.`);
    }

    // 6. Sync Face Data
    const faceData = db.prepare('SELECT id, voter_id, face_descriptor, photo_url FROM face_data').all();
    if (faceData.length > 0) {
      const { error } = await supabase.from('face_data').upsert(faceData, { onConflict: 'voter_id' });
      if (error) console.error('Error syncing face biometrics:', error.message);
      else console.log(`✅ Synced ${faceData.length} biometric face profiles to Supabase.`);
    }

    console.log('🎉 Migration to Supabase completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

sync();
