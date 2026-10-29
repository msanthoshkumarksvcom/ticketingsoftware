import bcrypt from 'bcryptjs';
import pool from './db.js';

const reseedSystem = async () => {
  try {
    console.log('--- Starting System Users and Roles Reseed ---');

    // 1. Ensure table structure is updated
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

    // Ensure columns exist if table was already created
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emp_id VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'QA Member',
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
    `);

    // 2. Remove old admin accounts specified by user
    await pool.query(`
      DELETE FROM users WHERE email IN ('admin1@gmail.com', 'admin@gmail.com');
    `);
    console.log('Removed legacy admin1@gmail.com and admin@gmail.com accounts.');

    const removedDemoUsers = await pool.query(`
      DELETE FROM users
      WHERE (emp_id, email) IN (
        ('EMP-003', 'karthik@company.com'),
        ('EMP-004', 'pavishek@company.com'),
        ('EMP-005', 'varhun@company.com'),
        ('EMP-006', 'deepak@company.com')
      )
      RETURNING emp_id;
    `);
    console.log(`Removed ${removedDemoUsers.rowCount} screenshot demo users (EMP-003-EMP-006).`);

    // 3. Hash password Kanavu@123
    const salt = await bcrypt.genSalt(10);
    const systemPasswordHash = await bcrypt.hash('Kanavu@123', salt);

    // 4. Seed manager@gmail.com and qalead@gmail.com (inbuilt, protected)
    const systemUsers = [
      {
        emp_id: 'EMP-001',
        full_name: 'Manager',
        email: 'manager@gmail.com',
        password: systemPasswordHash,
        department: 'Quality Assurance',
        role: 'Manager',
        phone: '+1 (555) 019-2831',
        status: 'Active',
        created_at: new Date('2026-10-08T09:00:00Z')
      },
      {
        emp_id: 'EMP-002',
        full_name: 'QA Lead',
        email: 'qalead@gmail.com',
        password: systemPasswordHash,
        department: 'Quality Assurance',
        role: 'QA Lead',
        phone: '+1 (555) 014-9922',
        status: 'Active',
        created_at: new Date('2026-10-08T09:30:00Z')
      },
      {
        emp_id: 'EMP-003',
        full_name: 'QA Member',
        email: 'qamember@gmail.com',
        password: systemPasswordHash,
        department: 'Quality Assurance',
        role: 'QA Member',
        phone: '+1 (555) 017-4321',
        status: 'Active',
        created_at: new Date('2026-10-08T10:00:00Z')
      }
    ];

    for (const u of systemUsers) {
      await pool.query(
        `INSERT INTO users (emp_id, full_name, email, password, department, role, phone, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET
           emp_id = EXCLUDED.emp_id,
           full_name = EXCLUDED.full_name,
           password = EXCLUDED.password,
           department = EXCLUDED.department,
           role = EXCLUDED.role,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status;`,
        [u.emp_id, u.full_name, u.email, u.password, u.department, u.role, u.phone, u.status, u.created_at]
      );
    }
    console.log('Seeded manager@gmail.com, qalead@gmail.com, and qamember@gmail.com successfully.');

    // 5. Update Roles Table with the 5 required roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const standardRoles = [
      {
        role_name: 'Manager',
        description: 'Complete workspace administration, team management, project governance, and system security controls',
        permissions: ['manage_users', 'manage_projects', 'manage_roles', 'view_reports', 'manage_tickets', 'approve_deployments']
      },
      {
        role_name: 'QA Lead',
        description: 'Oversees test strategies, test runs, sprint ticket approvals, and production release sign-offs',
        permissions: ['manage_tickets', 'view_reports', 'manage_projects', 'approve_deployments']
      },
      {
        role_name: 'QA Member',
        description: 'Executes manual and automated test cases, logs bug reports, and verifies defect fixes',
        permissions: ['manage_tickets', 'view_reports']
      },
      {
        role_name: 'Developer',
        description: 'Investigates assigned defect tickets, develops code fixes, and submits fixes for QA verification',
        permissions: ['manage_tickets']
      },
      {
        role_name: 'Project Lead',
        description: 'Directs roadmap execution, sprint velocity, cross-department ticket triage, and delivery milestones',
        permissions: ['manage_projects', 'manage_tickets', 'view_reports']
      }
    ];

    for (const r of standardRoles) {
      await pool.query(
        `INSERT INTO roles (role_name, description, permissions)
         VALUES ($1, $2, $3)
         ON CONFLICT (role_name) DO UPDATE SET
           description = EXCLUDED.description,
           permissions = EXCLUDED.permissions;`,
        [r.role_name, r.description, r.permissions]
      );
    }
    console.log('Roles table updated with Manager, QA Lead, QA Member, Developer, Project Lead.');

    // 6. Update reference names in other tables if they used old "Admin User" / "Super Admin"
    await pool.query(`
      UPDATE projects SET lead_name = 'Manager' WHERE lead_name IN ('Admin User', 'Super Admin');
      UPDATE tickets SET reporter = 'QA Lead' WHERE reporter IN ('Admin User', 'Super Admin');
      UPDATE tickets SET assigned_to = 'Manager' WHERE assigned_to IN ('Admin User', 'Super Admin');
      UPDATE approvals SET requested_by = 'Manager' WHERE requested_by IN ('Admin User', 'Super Admin');
      UPDATE deployments SET requested_by = 'Manager' WHERE requested_by IN ('Admin User', 'Super Admin');
    `);
    console.log('Updated legacy user references in projects, tickets, approvals, deployments.');

    console.log('--- Reseed Completed Successfully! ---');
  } catch (err) {
    console.error('Error during reseed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

reseedSystem();
