import bcrypt from 'bcryptjs';
import pool from './db.js';

const seedUsers = async () => {
  const usersToSeed = [
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
    // 1. Ensure the users table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        emp_id VARCHAR(50) UNIQUE,
        full_name VARCHAR(150),
        department VARCHAR(100),
        role VARCHAR(50) DEFAULT 'QA Member',
        phone VARCHAR(30),
        status VARCHAR(20) DEFAULT 'Active'
      );
    `);

    // Remove legacy admin accounts if present
    await pool.query(`DELETE FROM users WHERE email IN ('admin1@gmail.com', 'admin@gmail.com')`);

    const salt = await bcrypt.genSalt(10);

    for (const u of usersToSeed) {
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
    console.log('Inbuilt system accounts (manager@gmail.com, qalead@gmail.com) created or updated.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedUsers();
