import pool from './db.js';

export const initDatabase = async () => {
  try {
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

    // Ensure columns exist
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

    // 7. Project Sheets (Spreadsheet Module)
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

    console.log('Database tables verified and initialized successfully.');
  } catch (error) {
    console.error('Database initialization warning:', error.message);
  }
};
