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
    const admins = db.prepare('SELECT username, password_hash FROM admins').all();
    if (admins.length > 0) {
      for (const a of admins) {
        const { error } = await supabase.from('admins').upsert(a, { onConflict: 'username' });
        if (error) console.error('Error syncing admin:', a.username, error.message);
      }
      console.log(`✅ Synced ${admins.length} admins.`);
    }

    // 2. Sync Parties
    const parties = db.prepare('SELECT name, code, description FROM parties').all();
    if (parties.length > 0) {
      for (const p of parties) {
        const { error } = await supabase.from('parties').upsert(p, { onConflict: 'name' });
        if (error) console.error('Error syncing party:', p.name, error.message);
      }
      console.log(`✅ Synced ${parties.length} political parties.`);
    }

    // 3. Sync Elections
    const elections = db.prepare("SELECT title, description, start_date, end_date, CASE WHEN status='completed' THEN 'closed' ELSE status END as status FROM elections WHERE status IN ('active', 'upcoming')").all();
    if (elections.length > 0) {
      for (const e of elections) {
        const { error } = await supabase.from('elections').upsert(e, { onConflict: 'title' });
        if (error) console.error('Error syncing election:', e.title, error.message);
      }
      console.log(`✅ Synced ${elections.length} elections.`);
    }

    // 4. Sync Candidates
    // Get Supabase active election
    const { data: supaElection } = await supabase.from('elections').select('id').limit(1).single();
    if (supaElection) {
      const candidates = db.prepare('SELECT name, party, bio FROM candidates WHERE election_id = 1 OR election_id = 4 LIMIT 5').all();
      for (const c of candidates) {
        const candPayload = {
          name: c.name,
          party: c.party,
          bio: c.bio,
          election_id: supaElection.id
        };
        const { error } = await supabase.from('candidates').upsert(candPayload, { onConflict: 'election_id,name' });
        if (error) console.error('Error syncing candidate:', c.name, error.message);
      }
      console.log(`✅ Synced candidates to Supabase Election ID ${supaElection.id}.`);
    }

    // 5. Sync Voters
    const voters = db.prepare('SELECT full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified FROM voters').all();
    if (voters.length > 0) {
      for (const v of voters) {
        const voterPayload = {
          full_name: v.full_name,
          email: v.email,
          phone: v.phone || null,
          voter_id_number: v.voter_id_number,
          password_hash: v.password_hash,
          has_voted: Boolean(v.has_voted === 1 || v.has_voted === true),
          is_verified: Boolean(v.is_verified === 1 || v.is_verified === true),
          election_id: supaElection ? supaElection.id : null
        };
        const { error } = await supabase.from('voters').upsert(voterPayload, { onConflict: 'email' });
        if (error) console.error('Error syncing voter:', v.voter_id_number, error.message);
      }
      console.log(`✅ Synced ${voters.length} voters to Supabase.`);
    }

    // 6. Sync Face Data
    const faceData = db.prepare(`
      SELECT v.email, fd.face_descriptor, fd.photo_url 
      FROM face_data fd
      JOIN voters v ON fd.voter_id = v.id
    `).all();

    let faceCount = 0;
    for (const fd of faceData) {
      const { data: supaVoter } = await supabase.from('voters').select('id').eq('email', fd.email).maybeSingle();
      if (supaVoter) {
        const { error } = await supabase.from('face_data').upsert({
          voter_id: supaVoter.id,
          face_descriptor: fd.face_descriptor,
          photo_url: fd.photo_url
        }, { onConflict: 'voter_id' });
        if (error) console.error('Error syncing face bio:', fd.email, error.message);
        else faceCount++;
      }
    }
    console.log(`✅ Synced ${faceCount} biometric face profiles to Supabase.`);

    console.log('🎉 Migration to Supabase completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

sync();
