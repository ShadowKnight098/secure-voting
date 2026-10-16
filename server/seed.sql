-- =======================================================
-- Secure Electronic Voting System: Comprehensive Database Schema & Initial Data
-- Compatible with SQLite, PostgreSQL, and MySQL
-- =======================================================

-- 1. Administrative Accounts
-- Passwords hashed with bcrypt (Cost factor: 10). Plaintext: 'admin123'
INSERT OR IGNORE INTO admins (id, username, email, password_hash, role) VALUES
(1, 'admin', 'admin@votingsystem.com', '$2b$10$7zVn0K9Gq/1pZkQhP9J2y.LpB6zJ1Y1k5c8z2pQ7e0L7Y6b0M9v3i', 'super_admin'),
(2, 'vaseem', 'vaseem@votingsystem.com', '$2b$10$7zVn0K9Gq/1pZkQhP9J2y.LpB6zJ1Y1k5c8z2pQ7e0L7Y6b0M9v3i', 'super_admin');

-- 2. Recognized Political Parties
INSERT OR IGNORE INTO parties (id, name, code, description) VALUES
(1, 'Liberty Party', 'LP', 'Advocating for individual liberties, open markets, and transparent public governance.'),
(2, 'Progressive Party', 'PP', 'Championing sustainable reforms, technological innovation, higher education, and universal healthcare.'),
(3, 'Community First', 'CF', 'Dedicated to grassroots community empowerment, municipal development, and neighborhood safety.'),
(4, 'Green Alliance', 'GA', 'Focused on environmental protection, clean renewable energy, and ecological preservation.'),
(5, 'Independent', 'IND', 'Non-partisan independent candidates committed to pragmatic, evidence-based policy.');

-- 3. Initial Elections
INSERT OR IGNORE INTO elections (id, title, description, start_date, end_date, status, created_by) VALUES
(1, 'National Presidential Election 2025', 'National election for executive council leadership. Open to all registered and biometric-verified voters.', '2026-10-01', '2026-11-30', 'active', 1),
(2, 'Civic & Student Council Election', 'Election for municipal representatives and student welfare council.', '2026-10-15', '2026-12-15', 'active', 1);

-- 4. Ballot Candidate Options
INSERT OR IGNORE INTO candidates (id, name, party, bio, election_id) VALUES
(1, 'Liberty Party', 'Liberty Party (LP)', 'Official candidate option representing the Liberty Party platform.', 1),
(2, 'Progressive Party', 'Progressive Party (PP)', 'Official candidate option representing the Progressive Party platform.', 1),
(3, 'Community First', 'Community First (CF)', 'Official candidate option representing the Community First platform.', 1),
(4, 'Green Alliance', 'Green Alliance (GA)', 'Official candidate option representing the Green Alliance platform.', 1),
(5, 'Independent', 'Independent (IND)', 'Official candidate option representing non-partisan independents.', 1),
(6, 'Liberty Party', 'Liberty Party (LP)', 'Official candidate option representing the Liberty Party platform.', 2),
(7, 'Progressive Party', 'Progressive Party (PP)', 'Official candidate option representing the Progressive Party platform.', 2),
(8, 'Community First', 'Community First (CF)', 'Official candidate option representing the Community First platform.', 2),
(9, 'Green Alliance', 'Green Alliance (GA)', 'Official candidate option representing the Green Alliance platform.', 2),
(10, 'Independent', 'Independent (IND)', 'Official candidate option representing non-partisan independents.', 2);

-- 5. Seeded Verified Demo Voters (Password: 'voter123')
INSERT OR IGNORE INTO voters (id, full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id) VALUES
(1, 'Alice Cooper', 'alice.cooper@example.com', '+1-555-0101', 'VOTER-1001', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 1),
(2, 'Mark Davis', 'mark.davis@example.com', '+1-555-0102', 'VOTER-1002', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 1),
(3, 'Sarah Connor', 'sarah.connor@example.com', '+1-555-0103', 'VOTER-1003', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 2),
(4, 'Michael Scott', 'michael.scott@example.com', '+1-555-0104', 'VOTER-1004', '$2b$10$p3QW21yQp6uDqN4zY1X6x.mR8k3Y1K5c8z2pQ7e0L7Y6b0M9v3i', 0, 1, 2);
