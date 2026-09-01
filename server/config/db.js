import Database from 'better-sqlite3';

const db = new Database('database.sqlite', { verbose: console.log });
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
`;

db.exec(createTables);

export default db;
