import db from './config/db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);
    const voterPasswordHash = await bcrypt.hash('voter123', saltRounds);
    
    // Check if admin exists
    const adminExists = db.prepare("SELECT * FROM admins WHERE username = 'admin'").get();
    
    let adminId;
    if (!adminExists) {
        const adminStmt = db.prepare(`
            INSERT INTO admins (username, email, password_hash, role) 
            VALUES (?, ?, ?, ?)
        `);
        const result = adminStmt.run('admin', 'admin@votingsystem.com', passwordHash, 'super_admin');
        adminId = result.lastInsertRowid;
        console.log('Admin user created successfully');
    } else {
        adminId = adminExists.id;
        console.log('Admin user already exists');
    }

    // Check if vaseem exists
    const vaseemExists = db.prepare("SELECT * FROM admins WHERE username = 'vaseem'").get();
    if (!vaseemExists) {
        db.prepare(`
            INSERT INTO admins (username, email, password_hash, role) 
            VALUES (?, ?, ?, ?)
        `).run('vaseem', 'vaseem@votingsystem.com', passwordHash, 'super_admin');
        console.log('Vaseem admin user created');
    }

    // Insert Elections
    const electionsCount = db.prepare('SELECT COUNT(*) as count FROM elections').get().count;
    let electionIds = [];
    if (electionsCount === 0) {
        const electionStmt = db.prepare(`
            INSERT INTO elections (title, description, start_date, end_date, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const upcomingDate = new Date();
        upcomingDate.setDate(upcomingDate.getDate() + 7);
        const activeDate = new Date();
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 14);

        const elections = [
            { 
              title: 'Presidential Election 2025', 
              description: 'National presidential election', 
              start: upcomingDate.toISOString(), 
              end: new Date(upcomingDate.getTime() + 86400000).toISOString(), 
              status: 'upcoming' 
            },
            { 
              title: 'City Council Election', 
              description: 'Local city council representatives', 
              start: activeDate.toISOString(), 
              end: new Date(activeDate.getTime() + 86400000 * 2).toISOString(), 
              status: 'active' 
            },
            { 
              title: 'Student Body President', 
              description: 'University student body president', 
              start: pastDate.toISOString(), 
              end: new Date(pastDate.getTime() + 86400000).toISOString(), 
              status: 'completed' 
            }
        ];

        for (const e of elections) {
            const res = electionStmt.run(e.title, e.description, e.start, e.end, e.status, adminId);
            electionIds.push(res.lastInsertRowid);
        }
        console.log('Sample elections created');

        // Insert candidates
        const candidateStmt = db.prepare(`
            INSERT INTO candidates (name, party, bio, election_id)
            VALUES (?, ?, ?, ?)
        `);

        // Candidates for election 1
        candidateStmt.run('John Doe', 'Liberty Party', 'Experienced leader.', electionIds[0]);
        candidateStmt.run('Jane Smith', 'Progressive Party', 'Focused on the future.', electionIds[0]);

        // Candidates for election 2
        candidateStmt.run('Alice Johnson', 'Independent', 'Local business owner.', electionIds[1]);
        candidateStmt.run('Bob Williams', 'Community First', 'Former teacher.', electionIds[1]);

        // Candidates for election 3
        candidateStmt.run('Charlie Brown', 'Student Union', 'Student rights advocate.', electionIds[2]);
        candidateStmt.run('Diana Prince', 'Athletic Coalition', 'Sports team captain.', electionIds[2]);
        
        console.log('Sample candidates created');
    } else {
        console.log('Database already has elections/candidates seeded');
        const rows = db.prepare('SELECT id FROM elections LIMIT 3').all();
        electionIds = rows.map(r => r.id);
    }

    // Seed sample voters if none exist
    const votersCount = db.prepare('SELECT COUNT(*) as count FROM voters').get().count;
    if (votersCount === 0 && electionIds.length > 0) {
        const voterStmt = db.prepare(`
            INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        voterStmt.run('Alice Cooper', 'alice.cooper@example.com', '+1-555-0101', 'VOTER-1001', voterPasswordHash, 0, 1, electionIds[0]);
        voterStmt.run('Mark Davis', 'mark.davis@example.com', '+1-555-0102', 'VOTER-1002', voterPasswordHash, 0, 0, electionIds[0]);
        voterStmt.run('Sarah Connor', 'sarah.connor@example.com', '+1-555-0103', 'VOTER-1003', voterPasswordHash, 0, 1, electionIds[1]);
        voterStmt.run('Michael Scott', 'michael.scott@example.com', '+1-555-0104', 'VOTER-1004', voterPasswordHash, 0, 0, electionIds[1]);

        console.log('Sample voters created successfully (Password: voter123)');
    } else {
        console.log(`Database already has ${votersCount} voters`);
    }

    console.log('Seeding completed successfully.');
    db.close();
  } catch (error) {
    console.error('Error during seeding:', error);
    db.close();
  }
};

seed();
