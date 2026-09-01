import db from './config/db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);
    
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

    // Insert Elections
    const electionsCount = db.prepare('SELECT COUNT(*) as count FROM elections').get().count;
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

        const electionIds = [];
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
    }

    console.log('Seeding completed successfully.');
    db.close();
  } catch (error) {
    console.error('Error during seeding:', error);
    db.close();
  }
};

seed();
