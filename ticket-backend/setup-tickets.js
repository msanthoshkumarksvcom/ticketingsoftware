import pool from './db.js';

const setupTicketsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        project_code VARCHAR(50),
        assigned_to VARCHAR(150),
        priority VARCHAR(30) DEFAULT 'Medium',
        type VARCHAR(50) DEFAULT 'Bug',
        status VARCHAR(50) DEFAULT 'Open',
        reporter VARCHAR(150) DEFAULT 'Admin User',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const countRes = await pool.query('SELECT COUNT(*) FROM tickets');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter)
        VALUES
          ('TCK-101', 'Login session expires prematurely on reload', 'Users reporting session drop when switching tabs during active tests.', 'PRJ-CORE-02', 'Admin User', 'High', 'Bug', 'In Progress', 'QA Lead');
        
        INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter)
        VALUES
          ('TCK-102', 'Cypress smoke test timeout in pipeline', 'GitHub Actions runner timing out on test step 4 for user signup.', 'PRJ-QA-01', 'Super Admin', 'Critical', 'Incident', 'Open', 'Admin User');
        
        INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter)
        VALUES
          ('TCK-103', 'Add export CSV button to User Directory', 'Client request to download full list of team members with department tags.', 'PRJ-PORTAL-03', 'Admin User', 'Medium', 'Feature', 'Resolved', 'Super Admin');
        
        INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter)
        VALUES
          ('TCK-104', 'Improve dark mode contrast for stat cards', 'Text color contrast ratio fails WCAG 2.1 AA on dark navy sidebar.', 'PRJ-QA-01', 'Super Admin', 'Low', 'Task', 'Closed', 'Admin User');
      `);
      console.log('Seeded sample tickets.');
    }

    console.log('Tickets table setup completed successfully!');
  } catch (error) {
    console.error('Error creating tickets table:', error);
  } finally {
    await pool.end();
  }
};

setupTicketsTable();
