import bcrypt from 'bcryptjs';
import pool from './db.js';

const seedUsers = async () => {
  const admin = { email: 'admin1@gmail.com', password: 'Kanavu@123' };

  try {
    // 1. Ensure the users table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    await pool.query(
      `INSERT INTO users (email, password)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`,
      [admin.email, hashedPassword]
    );
    console.log('Admin account created or updated successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedUsers();
