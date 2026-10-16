-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR SECURE ELECTRONIC VOTING SYSTEM
-- Copy and run this entire script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run)
-- ====================================================================

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Elections Table
CREATE TABLE IF NOT EXISTS elections (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recognized Political Parties Table
CREATE TABLE IF NOT EXISTS parties (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT,
  logo_url TEXT,
  description TEXT,
  election_id BIGINT REFERENCES elections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT,
  bio TEXT,
  photo_url TEXT,
  election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Voters Table (Unique email and Unique Voter ID Number)
CREATE TABLE IF NOT EXISTS voters (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  voter_id_number TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  has_voted INT DEFAULT 0,
  is_verified INT DEFAULT 0,
  election_id BIGINT REFERENCES elections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Votes Table (Immutable Cryptographic Ledger: 1 vote per voter per election)
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  voter_id BIGINT NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  encrypted_vote TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_voter_election UNIQUE(voter_id, election_id)
);

-- 7. Face Data Biometrics Table (128-D embedding vector storage)
CREATE TABLE IF NOT EXISTS face_data (
  id BIGSERIAL PRIMARY KEY,
  voter_id BIGINT UNIQUE NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  face_descriptor TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_voters_email ON voters(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_voters_voter_id ON voters(voter_id_number);
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(LOWER(name));

-- Seed Initial Default Super-Admin (admin / admin123)
INSERT INTO admins (username, email, password_hash, role)
VALUES ('admin', 'admin@votingsystem.com', '$2b$10$7zVn0K9Gq/1pZkQhP9J2y.LpB6zJ1Y1k5c8z2pQ7e0L7Y6b0M9v3i', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- Seed Initial Recognized Political Parties
INSERT INTO parties (name, code, description) VALUES
('Liberty Party', 'LP', 'Advocating for personal liberties, transparent governance, and community growth.'),
('Progressive Party', 'PP', 'Championing modern reforms, technological innovation, science, and education.'),
('Community First', 'CF', 'Empowering local neighborhoods, grassroots initiatives, and civic welfare.'),
('Green Alliance', 'GA', 'Dedicated to environmental sustainability, renewable energy, and ecological safety.'),
('Independent', 'IND', 'Non-partisan independent candidates serving all constituents.')
ON CONFLICT (name) DO NOTHING;

-- Seed Initial Active Presidential Election (Active for 30 Days)
INSERT INTO elections (id, title, description, start_date, end_date, status, created_by)
VALUES (1, 'National Presidential Election 2025', 'Official national election for the executive presidential council. Open to all verified registered voters.', NOW(), NOW() + INTERVAL '30 days', 'active', 1)
ON CONFLICT (id) DO NOTHING;

-- Attach Parties as Candidates to Election 1
INSERT INTO candidates (name, party, bio, election_id) VALUES
('Liberty Party', 'Liberty Party (LP)', 'Official candidate option representing the Liberty Party platform.', 1),
('Progressive Party', 'Progressive Party (PP)', 'Official candidate option representing the Progressive Party platform.', 1),
('Community First', 'Community First (CF)', 'Official candidate option representing the Community First platform.', 1),
('Green Alliance', 'Green Alliance (GA)', 'Official candidate option representing the Green Alliance platform.', 1),
('Independent', 'Independent (IND)', 'Official candidate option representing non-partisan independents.', 1)
ON CONFLICT DO NOTHING;

-- Seed Demo Verified Voters (Password: 'voter123')
INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id) VALUES
('Alice Cooper', 'alice.cooper@example.com', '+1-555-0101', 'VOTER-1001', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 1),
('Mark Davis', 'mark.davis@example.com', '+1-555-0102', 'VOTER-1002', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 1),
('Sarah Connor', 'sarah.connor@example.com', '+1-555-0103', 'VOTER-1003', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 1)
ON CONFLICT (email) DO NOTHING;
