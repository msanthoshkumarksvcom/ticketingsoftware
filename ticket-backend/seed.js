import bcrypt from 'bcryptjs';
import pool from './db.js';

const seedSystemUsers = async () => {
  const systemUsers = [
    {
      emp_id: 'EMP-001',
      full_name: 'Manager',
      email: 'manager@gmail.com',
      password: 'Kanavu@123',
      department: 'Quality Assurance',
      role: 'Manager',
      status: 'Active'
    },
    {
      emp_id: 'EMP-002',
      full_name: 'QA Lead',
      email: 'qalead@gmail.com',
      password: 'Kanavu@123',
      department: 'Quality Assurance',
      role: 'QA Lead',
      status: 'Active'
    }
  ];

  try {
    const salt = await bcrypt.genSalt(10);

    for (const u of systemUsers) {
      const hashedPassword = await bcrypt.hash(u.password, salt);
      await pool.query(
        `INSERT INTO users (emp_id, full_name, email, password, department, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET 
           password = EXCLUDED.password,
           full_name = EXCLUDED.full_name,
           department = EXCLUDED.department,
           role = EXCLUDED.role;`,
        [u.emp_id, u.full_name, u.email, hashedPassword, u.department, u.role, u.status]
      );
    }
    console.log('System accounts (manager@gmail.com, qalead@gmail.com) created or updated.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedSystemUsers();
