import pool from './db.js';

async function test() {
  try {
    const res = await pool.query(
      `INSERT INTO users (emp_id, full_name, email, password, department, role, phone, status, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      ['EMP-999', 'Test User', 'testuser999@gmail.com', 'hashedpass', 'Quality Assurance', 'QA Member', null, 'Active', null]
    );
    console.log("Success:", res.rows);
  } catch (err) {
    console.error("EXACT ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

test();

