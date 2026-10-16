import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DB_PATH || 'database.sqlite';
const db = new Database(dbPath, { 
  verbose: process.env.NODE_ENV === 'production' ? null : console.log 
});
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const createTables = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK(role IN ('super_admin','admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','active','completed','cancelled')),
  created_by INTEGER REFERENCES admins(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  party TEXT,
  bio TEXT,
  photo_url TEXT,
  election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  voter_id_number TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  has_voted INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  election_id INTEGER REFERENCES elections(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id INTEGER NOT NULL REFERENCES voters(id),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  election_id INTEGER NOT NULL REFERENCES elections(id),
  encrypted_vote TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(voter_id, election_id)
);

CREATE TABLE IF NOT EXISTS face_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id INTEGER UNIQUE NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  face_descriptor TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  code TEXT,
  logo_url TEXT,
  description TEXT,
  election_id INTEGER REFERENCES elections(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(createTables);

// Safe migration for existing databases: ensure election_id column exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(parties)").all();
  const hasElectionId = tableInfo.some(col => col.name === 'election_id');
  if (!hasElectionId) {
    db.exec("ALTER TABLE parties ADD COLUMN election_id INTEGER REFERENCES elections(id);");
  }
} catch (migErr) {
  // column check/add already handled
}

// --- Automatic Database Seeding & Persistence Bootstrap ---
try {
  // 1. Ensure Admins Exist
  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCheck && adminCheck.count === 0) {
    const defaultHash = bcrypt.hashSync('admin123', 10);
    const adminStmt = db.prepare(`
      INSERT INTO admins (username, email, password_hash, role) 
      VALUES (?, ?, ?, ?)
    `);
    adminStmt.run('admin', 'admin@votingsystem.com', defaultHash, 'super_admin');
    adminStmt.run('vaseem', 'vaseem@votingsystem.com', defaultHash, 'super_admin');
    console.log('[DB] Initial super-admins created: admin / admin123, vaseem / admin123');
  }

  // 2. Ensure Recognized Political Parties Exist
  const partyCheck = db.prepare('SELECT COUNT(*) as count FROM parties').get();
  if (partyCheck && partyCheck.count === 0) {
    const insertParty = db.prepare(`
      INSERT INTO parties (name, code, description) 
      VALUES (?, ?, ?)
    `);
    insertParty.run('Liberty Party', 'LP', 'Advocating for personal liberties, transparent governance, and community growth.');
    insertParty.run('Progressive Party', 'PP', 'Championing modern reforms, technological innovation, science, and education.');
    insertParty.run('Community First', 'CF', 'Empowering local neighborhoods, grassroots initiatives, and civic welfare.');
    insertParty.run('Green Alliance', 'GA', 'Dedicated to environmental sustainability, renewable energy, and ecological safety.');
    insertParty.run('Independent', 'IND', 'Non-partisan independent candidates serving all constituents.');
    console.log('[DB] Seeded 5 recognized political parties');
  }

  // 3. Ensure Active & Upcoming Elections Exist
  const electionCheck = db.prepare('SELECT COUNT(*) as count FROM elections').get();
  let defaultActiveElectionId = null;
  if (electionCheck && electionCheck.count === 0) {
    const adminUser = db.prepare('SELECT id FROM admins ORDER BY id ASC LIMIT 1').get();
    const adminId = adminUser ? adminUser.id : 1;

    const today = new Date();
    const future30 = new Date();
    future30.setDate(today.getDate() + 30);
    const future60 = new Date();
    future60.setDate(today.getDate() + 60);

    const insertElection = db.prepare(`
      INSERT INTO elections (title, description, start_date, end_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const el1 = insertElection.run(
      'National Presidential Election 2025',
      'Official national election for the executive presidential council. Open to all verified registered voters.',
      today.toISOString().split('T')[0],
      future30.toISOString().split('T')[0],
      'active',
      adminId
    );
    defaultActiveElectionId = el1.lastInsertRowid;

    insertElection.run(
      'Civic & Student Council Election',
      'Local municipality and student body representative council election.',
      today.toISOString().split('T')[0],
      future60.toISOString().split('T')[0],
      'active',
      adminId
    );
    console.log('[DB] Seeded active elections with open voting windows');
  }

  // 4. Ensure All Registered Parties are Candidates on All Election Ballots
  const parties = db.prepare('SELECT * FROM parties').all();
  const elections = db.prepare('SELECT * FROM elections').all();
  if (parties.length > 0 && elections.length > 0) {
    for (const el of elections) {
      const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE election_id = ?').get(el.id).c;
      if (candidateCount === 0) {
        const insertCand = db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of parties) {
          const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
          insertCand.run(p.name, partyLabel, p.description || '', p.logo_url || null, el.id);
        }
        console.log(`[DB] Auto-populated ${parties.length} parties onto ballot for election "${el.title}" (ID: ${el.id})`);
      }
    }
  }

  // 5. Ensure Default Demo Voters Exist for Testing
  const voterCheck = db.prepare('SELECT COUNT(*) as count FROM voters').get();
  if (voterCheck && voterCheck.count === 0) {
    const voterPasswordHash = bcrypt.hashSync('voter123', 10);
    const firstActiveElection = db.prepare("SELECT id FROM elections WHERE status = 'active' LIMIT 1").get();
    const assignedElectionId = firstActiveElection ? firstActiveElection.id : defaultActiveElectionId;

    const insertVoter = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertVoter.run('Alice Cooper', 'alice.cooper@example.com', '+1-555-0101', 'VOTER-1001', voterPasswordHash, 0, 1, assignedElectionId);
    insertVoter.run('Mark Davis', 'mark.davis@example.com', '+1-555-0102', 'VOTER-1002', voterPasswordHash, 0, 1, assignedElectionId);
    insertVoter.run('Sarah Connor', 'sarah.connor@example.com', '+1-555-0103', 'VOTER-1003', voterPasswordHash, 0, 1, assignedElectionId);
    insertVoter.run('Michael Scott', 'michael.scott@example.com', '+1-555-0104', 'VOTER-1004', voterPasswordHash, 0, 1, assignedElectionId);
    console.log('[DB] Seeded 4 default verified voters (VOTER-1001 through VOTER-1004 / voter123)');
  }
} catch (bootstrapErr) {
  console.error('[DB] Error during startup persistence bootstrap:', bootstrapErr);
}

export default db;
