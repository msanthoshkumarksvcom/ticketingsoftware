import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function resetProductionDatabase() {
  console.log('\n======================================================');
  console.log('🚀 INITIALIZING CLEAN PRODUCTION DATABASE RESET');
  console.log('======================================================\n');

  try {
    // 1. Truncate all project, ticket, sheet, approval, deployment, and assignment tables
    console.log('1. Clearing all test projects, tickets, sheets, assignments, and audit logs...');
    await pool.query(`
      TRUNCATE TABLE 
        ticket_history,
        notifications,
        project_sheets,
        project_developer_assignments,
        project_lead_assignments,
        tickets,
        projects,
        approvals,
        deployments
      RESTART IDENTITY CASCADE;
    `);
    console.log('   ✓ All test projects, sheets, and tickets cleared.');

    // 2. Clean users table: remove all test users and keep only clean default system roles
    console.log('2. Resetting users table to clean production baseline...');
    await pool.query(`
      DELETE FROM users;
    `);
    
    // Reset users sequence
    try {
      await pool.query(`ALTER SEQUENCE users_id_seq RESTART WITH 1;`);
    } catch (seqErr) {
      // quiet if sequence name differs
    }

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Kanavu@123', salt);

    await pool.query(`
      INSERT INTO users (emp_id, full_name, email, password, department, role, status)
      VALUES 
        ('EMP-001', 'Manager', 'manager@gmail.com', $1, 'Administration', 'Manager', 'Active'),
        ('EMP-002', 'QA Lead', 'qalead@gmail.com', $1, 'Quality Assurance', 'QA Lead', 'Active')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = 'Active';
    `, [defaultPasswordHash]);
    console.log('   ✓ Clean system accounts seeded (Manager & QA Lead, Password: Kanavu@123).');

    // 3. Ensure official roles are seeded
    console.log('3. Seeding standard production roles...');
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
      ON CONFLICT (role_name) DO UPDATE SET
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions;
    `);
    console.log('   ✓ Production roles verified.');

    // 4. Clean uploads/tickets folder of test files
    const uploadsDir = path.join(__dirname, 'uploads', 'tickets');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
          } catch (e) {}
        }
      }
      console.log('4. Cleared test screenshot uploads from disk.');
    }

    console.log('\n======================================================');
    console.log('✅ PRODUCTION DATABASE IS PRISTINE, EMPTY & READY FOR LIVE USE!');
    console.log('   - 0 Projects');
    console.log('   - 0 Tickets');
    console.log('   - 0 Test Case Sheets');
    console.log('   - 0 Dummy Assignments');
    console.log('   - Default System Users: manager@gmail.com, qalead@gmail.com (Password: Kanavu@123)');
    console.log('======================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting production database:', error);
    process.exit(1);
  }
}

resetProductionDatabase();

