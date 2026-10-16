import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedRoleUsers() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Kanavu@123', salt);

  const users = [
    { emp_id: 'EMP-003', name: 'Alex Rivera', email: 'developer@gmail.com', role: 'Developer', dept: 'Development' },
    { emp_id: 'EMP-004', name: 'Sarah Chen', email: 'projectlead@gmail.com', role: 'Project Lead', dept: 'Management' },
    { emp_id: 'EMP-005', name: 'John Doe', email: 'qamember@gmail.com', role: 'QA Member', dept: 'Quality Assurance' }
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (emp_id, full_name, email, password, department, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET 
         role = EXCLUDED.role, 
         full_name = EXCLUDED.full_name,
         status = EXCLUDED.status`,
      [u.emp_id, u.name, u.email, hash, u.dept, u.role, 'Active']
    );
  }

  console.log('Test accounts created successfully!');
  await pool.end();
}

seedRoleUsers().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
