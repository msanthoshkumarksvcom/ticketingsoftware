import pool from './db.js';

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emp_id VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Member',
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
    `);

    // Give existing admin users default emp_id and name if empty
    await pool.query(`
      UPDATE users 
      SET emp_id = 'EMP-001', full_name = 'Admin User', department = 'Quality Assurance', role = 'Admin' 
      WHERE email = 'admin1@gmail.com' AND emp_id IS NULL;
    `);

    await pool.query(`
      UPDATE users 
      SET emp_id = 'EMP-002', full_name = 'Super Admin', department = 'Quality Assurance', role = 'Admin' 
      WHERE email = 'admin@gmail.com' AND emp_id IS NULL;
    `);

    console.log('Users table upgraded successfully with employee details!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
};

migrate();
