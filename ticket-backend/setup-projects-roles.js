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
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

    // Seed initial projects if empty
    const projCount = await pool.query('SELECT COUNT(*) FROM projects');
    if (parseInt(projCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO projects (project_code, name, description, lead_name, department, status, priority)
        VALUES 
          ('PRJ-QA-01', 'Automation Test Suite V2', 'E2E regression suite automation using Cypress and Playwright', 'Admin User', 'Quality Assurance', 'In Progress', 'High'),
          ('PRJ-CORE-02', 'Ticketing API Service', 'Core REST API gateway for ticket submission and routing', 'Super Admin', 'Engineering', 'Active', 'Critical'),
          ('PRJ-PORTAL-03', 'Customer Support Portal', 'Self-service bug reporting interface for client onboarding', 'Admin User', 'Operations', 'Planning', 'Medium');
      `);
      console.log('Seeded initial projects.');
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
