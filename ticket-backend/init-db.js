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
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_lead_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(150);
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_assigned_at TIMESTAMP;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_assigned_by VARCHAR(150);
    `);

    // 2.1 Project Lead Assignments History
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_lead_assignments (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        project_lead_id INT REFERENCES users(id) ON DELETE CASCADE,
        lead_name VARCHAR(150),
        lead_email VARCHAR(255),
        assigned_by VARCHAR(150),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT
      );
    `);

    // 2.2 Project Developer Assignments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_developer_assignments (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        developer_id INT REFERENCES users(id) ON DELETE CASCADE,
        developer_name VARCHAR(150),
        developer_email VARCHAR(255),
        assigned_by VARCHAR(150),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        CONSTRAINT unique_project_developer UNIQUE (project_id, developer_id)
      );
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
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS project_id INT REFERENCES projects(id) ON DELETE CASCADE;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS test_case_id VARCHAR(100);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS module VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sub_module VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS test_scenario TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS test_steps TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS test_data TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS expected_result TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS actual_result TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'Medium';
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Functional Bug';
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS raised_by VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS raised_by_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_developer_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_developer_name VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_developer_email VARCHAR(255);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_description TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fix_implemented TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS files_changed TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_remarks TEXT;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_attachments JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_by_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_by VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_by_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reopened_by VARCHAR(150);
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMP;
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reopen_comments TEXT;
    `);

    // 4.1 Ticket History (Audit Log)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id SERIAL PRIMARY KEY,
        ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        performed_by VARCHAR(150),
        performed_by_id INT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4.2 In-App Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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
    // ========================
    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('Kanavu@123', salt);

    // Insert essential role accounts if they don't already exist
    await pool.query(`
      INSERT INTO users (emp_id, full_name, email, password, department, role, status)
      VALUES 
        ('EMP-001', 'Manager', 'manager@gmail.com', $1, 'Quality Assurance', 'Manager', 'Active'),
        ('EMP-002', 'QA Lead', 'qalead@gmail.com', $1, 'Quality Assurance', 'QA Lead', 'Active'),
        ('EMP-005', 'Project Lead', 'projectlead@gmail.com', $1, 'Engineering', 'Project Lead', 'Active'),
        ('EMP-006', 'Developer', 'developer@gmail.com', $1, 'Development', 'Developer', 'Active')
      ON CONFLICT (email) DO NOTHING;
    `, [defaultHash]);

    // Backfill project_id on existing tickets if matching project_code
    await pool.query(`
      UPDATE tickets t
      SET project_id = p.id
      FROM projects p
      WHERE t.project_code = p.project_code AND t.project_id IS NULL;
    `);

    // Link lead_name to project_lead_id if project_lead_id is null
    await pool.query(`
      UPDATE projects p
      SET project_lead_id = u.id
      FROM users u
      WHERE (LOWER(p.lead_name) = LOWER(u.full_name) OR LOWER(p.lead_name) = LOWER(u.email))
        AND p.project_lead_id IS NULL;
    `);

    // ========================
    // DEFAULT ROLES
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
