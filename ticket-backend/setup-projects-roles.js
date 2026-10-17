import pool from './db.js';

const setupTables = async () => {
  try {
    // 1. Projects Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        lead_name VARCHAR(150),
        department VARCHAR(100) DEFAULT 'Quality Assurance',
        status VARCHAR(50) DEFAULT 'In Progress',
        priority VARCHAR(30) DEFAULT 'Medium',
        progress INT DEFAULT 0,
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure progress column exists
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
    `);

    // 2. Roles & Permissions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial projects if empty or replace with exact mock projects
    const projCount = await pool.query('SELECT COUNT(*) FROM projects');
    if (parseInt(projCount.rows[0].count, 10) <= 3) {
      await pool.query('TRUNCATE TABLE projects RESTART IDENTITY CASCADE');
      await pool.query(`
        INSERT INTO projects (project_code, name, department, lead_name, priority, status, progress, start_date, end_date)
        VALUES 
          ('PRJ-QA-04', 'Mobile App Regression', 'Quality Assurance', 'Manager', 'High', 'In Progress', 60, '2026-10-16', '2026-10-30'),
          ('PRJ-QA-03', 'Website Redesign Testing', 'Quality Assurance', 'Sathish', 'Medium', 'In Progress', 40, '2026-10-10', '2026-10-25'),
          ('PRJ-QA-02', 'E-Commerce Platform', 'Development', 'Pavithra', 'High', 'Not Started', 0, '2026-10-20', '2026-11-15'),
          ('PRJ-QA-01', 'CRM Module Testing', 'Quality Assurance', 'Ramesh', 'Medium', 'Completed', 100, '2026-10-01', '2026-10-10'),
          ('PRJ-QA-05', 'API Integration Testing', 'Backend Team', 'Karthik', 'Low', 'Not Started', 0, '2026-10-22', '2026-11-05');
      `);
      console.log('Seeded projects matching mockup.');
    }

    // Seed initial roles if empty
    const roleCount = await pool.query('SELECT COUNT(*) FROM roles');
    if (parseInt(roleCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO roles (role_name, description, permissions)
        VALUES 
          ('Admin', 'Full administrative workspace control across all modules, settings, and users', ARRAY['manage_users', 'manage_projects', 'manage_roles', 'view_reports', 'manage_tickets', 'approve_deployments']),
          ('QA Lead', 'Oversees test runs, approves tickets, and coordinates release test cycles', ARRAY['manage_tickets', 'view_reports', 'manage_projects', 'approve_deployments']),
          ('QA Engineer', 'Executes test cases, creates bug tickets, and updates test statuses', ARRAY['manage_tickets', 'view_reports']),
          ('Developer', 'Inspects assigned issues, writes fixes, and requests verification', ARRAY['manage_tickets']),
          ('Member', 'Read-only viewer with ability to raise personal support tickets', ARRAY['view_tickets']);
      `);
      console.log('Seeded initial roles and permissions.');
    }

    console.log('Database tables for Projects and Roles & Permissions ready!');
  } catch (error) {
    console.error('Error setting up tables:', error);
  } finally {
    await pool.end();
  }
};

setupTables();
