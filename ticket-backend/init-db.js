import bcrypt from 'bcryptjs';
import pool from './db.js';

export const initDatabase = async () => {
  try {
    // ========================
    // TABLE CREATION
    // ========================

    // 1. Users
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
        status VARCHAR(20) DEFAULT 'Active',
        avatar TEXT
      );
    `);

    // 2. Projects
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        test_cases INT DEFAULT 0,
        documents INT DEFAULT 0,
        tickets_count INT DEFAULT 0,
        team_members INT DEFAULT 4,
        folder_color VARCHAR(50) DEFAULT 'blue',
        folder_icon VARCHAR(50) DEFAULT 'folder'
      );
    `);

    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_cases INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS documents INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS tickets_count INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_members INT DEFAULT 4;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_color VARCHAR(50) DEFAULT 'blue';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_icon VARCHAR(50) DEFAULT 'folder';
    `);

    // 3. Roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Tickets
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
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
    `);

    // 5. Approvals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        req_code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(100) DEFAULT 'Access Request',
        requested_by VARCHAR(150) NOT NULL,
        priority VARCHAR(30) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Pending',
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Deployments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        deploy_code VARCHAR(50) UNIQUE NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        environment VARCHAR(50) DEFAULT 'Staging',
        version VARCHAR(50) NOT NULL,
        requested_by VARCHAR(150) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending Review',
        release_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Project Sheets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_sheets (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        sheet_name VARCHAR(150) NOT NULL,
        columns JSONB NOT NULL DEFAULT '[]',
        rows JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ========================
    // DEFAULT SYSTEM USERS
    // Created automatically on first run (when users table is empty)
    // ========================
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) === 0) {
      const salt = await bcrypt.genSalt(10);
      const managerHash = await bcrypt.hash('Kanavu@123', salt);
      const qaLeadHash = await bcrypt.hash('Kanavu@123', salt);

      await pool.query(
        `INSERT INTO users (emp_id, full_name, email, password, department, role, status)
         VALUES 
           ('EMP-001', 'Manager', 'manager@gmail.com', $1, 'Quality Assurance', 'Manager', 'Active'),
           ('EMP-002', 'QA Lead', 'qalead@gmail.com', $2, 'Quality Assurance', 'QA Lead', 'Active')
         ON CONFLICT (email) DO NOTHING;`,
        [managerHash, qaLeadHash]
      );
      console.log('Default users created: manager@gmail.com, qalead@gmail.com');
    }

    // ========================
    // DEFAULT ROLES
    // Created automatically on first run (when roles table is empty)
    // ========================
    const roleCount = await pool.query('SELECT COUNT(*) FROM roles');
    if (parseInt(roleCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO roles (role_name, description, permissions) VALUES
          ('Manager', 'Complete workspace administration, team management, project governance, and system security controls', 
           ARRAY['manage_users', 'manage_projects', 'manage_roles', 'view_reports', 'manage_tickets', 'approve_deployments']),
          ('QA Lead', 'Oversees test strategies, test runs, sprint ticket approvals, and production release sign-offs', 
           ARRAY['manage_tickets', 'view_reports', 'manage_projects', 'approve_deployments']),
          ('QA Member', 'Executes manual and automated test cases, logs bug reports, and verifies defect fixes', 
           ARRAY['manage_tickets', 'view_reports']),
          ('Developer', 'Investigates assigned defect tickets, develops code fixes, and submits fixes for QA verification', 
           ARRAY['manage_tickets']),
          ('Project Lead', 'Directs roadmap execution, sprint velocity, cross-department ticket triage, and delivery milestones', 
           ARRAY['manage_projects', 'manage_tickets', 'view_reports'])
        ON CONFLICT (role_name) DO NOTHING;
      `);
      console.log('Default roles created: Manager, QA Lead, QA Member, Developer, Project Lead');
    }

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};
