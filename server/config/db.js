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

// Ensure default super_admin account exists on initial deployment
try {
  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCheck && adminCheck.count === 0) {
    const defaultHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO admins (username, email, password_hash, role) 
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin@votingsystem.com', defaultHash, 'super_admin');
    console.log('[DB] Initial super-admin created: admin / admin123');
  }
} catch (seedErr) {
  // ignore if table doesn't exist yet
}

// Ensure any elections without candidates automatically have registered parties populated
try {
  const parties = db.prepare('SELECT * FROM parties').all();
  if (parties.length > 0) {
    const elections = db.prepare('SELECT * FROM elections').all();
    for (const el of elections) {
      const count = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE election_id = ?').get(el.id).c;
      if (count === 0) {
        const insertStmt = db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of parties) {
          const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
          insertStmt.run(p.name, partyLabel, p.description || '', p.logo_url || null, el.id);
        }
        console.log(`[DB] Auto-populated ${parties.length} parties as ballot candidates for election "${el.title}" (ID: ${el.id})`);
      }
    }
  }
} catch (syncErr) {
  // ignore if tables not ready
}

export default db;
