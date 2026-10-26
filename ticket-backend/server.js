import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { sendWelcomeEmail, generateTemporaryPassword } from './services/emailService.js';
import { initDatabase } from './init-db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Protected inbuilt system emails that cannot be edited or deleted
const PROTECTED_SYSTEM_EMAILS = ['manager@gmail.com', 'qalead@gmail.com'];
const DEFAULT_USER_PASSWORD = 'Welcome@123';

// Middleware
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Backend is running!', db_time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if the user exists in the database
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'You are not a registered user.' });
    }

    const user = userQuery.rows[0];

    // 2. Compare the entered password with the encrypted password in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // 3. Generate the JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email }, // Data packed inside the token
      process.env.JWT_SECRET,                 // The secret key to sign it
      { expiresIn: '24h' }                    // Token expires in 24 hours
    );

    // 4. Send the token and user details back to React
    res.json({ 
      message: 'Login successful', 
      token: token,
      user: { 
        id: user.id, 
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        emp_id: user.emp_id,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authenticated User Profile Endpoint
app.get('/api/auth/me', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
    const userQuery = await pool.query(
      'SELECT id, email, full_name, emp_id, department, role, status, avatar FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userQuery.rows[0] });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Admin Dashboard Stats Endpoint
app.get('/api/admin/dashboard-stats', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error verifying dashboard token:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }

  try {
    // Fetch total users, total projects, and total tickets from DB
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count, 10);

    const projectsResult = await pool.query('SELECT COUNT(*) FROM projects');
    const totalProjects = parseInt(projectsResult.rows[0].count, 10);

    const ticketsResult = await pool.query('SELECT COUNT(*) FROM tickets');
    const totalTickets = parseInt(ticketsResult.rows[0].count, 10);

    const pendingApprovalsResult = await pool.query("SELECT COUNT(*) FROM approvals WHERE status = 'Pending'");
    const pendingApprovals = parseInt(pendingApprovalsResult.rows[0].count, 10);

    // Send back real data
    res.json({
      totalProjects: totalProjects, // Real from DB!
      totalTickets: totalTickets,   // Real from DB!
      totalUsers: totalUsers,       // Real from DB!
      pendingApprovals: pendingApprovals // Real from DB!
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Admin Users: Get all users
app.get('/api/admin/users', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, emp_id, full_name, email, department, role, phone, status, avatar, created_at 
       FROM users 
       ORDER BY emp_id ASC NULLS LAST, id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users from database' });
  }
});

// Admin Users: Create a new user
app.post('/api/admin/users', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { emp_id, full_name, email, password, department, role, phone, status, avatar } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: 'Full name and email are required fields.' });
  }

  // Block creating users with protected emails
  if (PROTECTED_SYSTEM_EMAILS.includes(email.toLowerCase().trim())) {
    return res.status(400).json({ error: 'This email is reserved for an inbuilt system account.' });
  }

  try {
    // Check for existing email or employee ID
    const existingCheck = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR (emp_id IS NOT NULL AND emp_id = $2)`,
      [email.trim(), emp_id || '']
    );

    if (existingCheck.rows.length > 0) {
      const match = existingCheck.rows[0];
      if (match.email.toLowerCase() === email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'A user with this email address already exists.' });
      }
      if (emp_id && match.emp_id === emp_id) {
        return res.status(400).json({ error: 'A user with this Employee ID already exists.' });
      }
    }

    const generatedPlainPassword = password || generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPlainPassword, salt);

    const result = await pool.query(
      `INSERT INTO users (emp_id, full_name, email, password, department, role, phone, status, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, emp_id, full_name, email, department, role, phone, status, avatar, created_at`,
      [
        emp_id || null,
        full_name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        department || 'Quality Assurance',
        role || 'QA Member',
        phone || null,
        status || 'Active',
        avatar || null
      ]
    );

    const newUser = result.rows[0];

    // Trigger welcome email with role, department, and generated password via Nodemailer
    sendWelcomeEmail({
      to: newUser.email,
      fullName: newUser.full_name,
      empId: newUser.emp_id,
      role: newUser.role,
      department: newUser.department,
      password: generatedPlainPassword
    }).catch((emailErr) => {
      console.error('Welcome email dispatch error:', emailErr);
    });

    res.status(201).json({
      message: 'User created successfully and welcome email sent',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user in database.' });
  }
});

// Admin Users: Update user (Protected accounts cannot be edited)
app.put('/api/admin/users/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  const { emp_id, full_name, email, department, role, phone, status, avatar } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = userCheck.rows[0];

    // Enforce that manager@gmail.com and qalead@gmail.com cannot be edited
    if (PROTECTED_SYSTEM_EMAILS.includes(existingUser.email.toLowerCase())) {
      return res.status(403).json({
        error: `Inbuilt system user (${existingUser.email}) is protected and cannot be edited or modified.`
      });
    }

    // Ensure they don't change another account's email to a protected email
    if (email && email.toLowerCase().trim() !== existingUser.email.toLowerCase()) {
      if (PROTECTED_SYSTEM_EMAILS.includes(email.toLowerCase().trim())) {
        return res.status(400).json({ error: 'Cannot assign a reserved inbuilt system email address.' });
      }
      const conflict = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [email.trim(), id]);
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'A user with this email address already exists.' });
      }
    }

    const updated = await pool.query(
      `UPDATE users
       SET emp_id = COALESCE($1, emp_id),
           full_name = COALESCE($2, full_name),
           email = COALESCE($3, email),
           department = COALESCE($4, department),
           role = COALESCE($5, role),
           phone = COALESCE($6, phone),
           status = COALESCE($7, status),
           avatar = COALESCE($8, avatar)
       WHERE id = $9
       RETURNING id, emp_id, full_name, email, department, role, phone, status, avatar, created_at`,
      [
        emp_id !== undefined ? emp_id : existingUser.emp_id,
        full_name ? full_name.trim() : existingUser.full_name,
        email ? email.toLowerCase().trim() : existingUser.email,
        department || existingUser.department,
        role || existingUser.role,
        phone !== undefined ? phone : existingUser.phone,
        status || existingUser.status,
        avatar !== undefined ? avatar : existingUser.avatar,
        id
      ]
    );

    res.json({
      message: 'User updated successfully',
      user: updated.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user in database.' });
  }
});

// Admin Users: Delete user (Protected accounts cannot be deleted)
app.delete('/api/admin/users/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userCheck.rows[0];

    // Enforce that manager@gmail.com and qalead@gmail.com cannot be deleted
    if (PROTECTED_SYSTEM_EMAILS.includes(targetUser.email.toLowerCase())) {
      return res.status(403).json({
        error: `Inbuilt system user (${targetUser.email}) is protected and cannot be deleted.`
      });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'User deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user from database.' });
  }
});

// Admin Projects: Get all projects
app.get('/api/admin/projects', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, project_code, name, description, lead_name, department, status, priority, progress, start_date, end_date, created_at,
              COALESCE(test_cases, 0) as test_cases,
              COALESCE(documents, 0) as documents,
              COALESCE(tickets_count, 0) as tickets_count,
              COALESCE(team_members, 4) as team_members,
              COALESCE(folder_color, 'blue') as folder_color,
              COALESCE(folder_icon, 'folder') as folder_icon
       FROM projects 
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects from database.' });
  }
});

// Admin Projects: Create new project
app.post('/api/admin/projects', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { project_code, name, description, lead_name, department, status, priority, progress, start_date, end_date } = req.body;

  if (!project_code || !name) {
    return res.status(400).json({ error: 'Project Code and Project Name are required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM projects WHERE project_code = $1', [project_code.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A project with this Project Code already exists.' });
    }

    // Default progress based on status if not explicitly passed
    let calcProgress = progress !== undefined && progress !== null ? parseInt(progress, 10) : NaN;
    if (isNaN(calcProgress)) {
      if (status === 'Completed') calcProgress = 100;
      else if (status === 'In Progress') calcProgress = 30;
      else calcProgress = 0;
    }

    const cleanStartDate = start_date && start_date.toString().trim() !== ''
      ? start_date.toString().trim()
      : new Date().toISOString().split('T')[0];

    const cleanEndDate = end_date && end_date.toString().trim() !== ''
      ? end_date.toString().trim()
      : null;

    const result = await pool.query(
      `INSERT INTO projects (project_code, name, description, lead_name, department, status, priority, progress, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        project_code.trim(),
        name.trim(),
        description || '',
        lead_name || 'Admin User',
        department || 'Quality Assurance',
        status || 'In Progress',
        priority || 'Medium',
        calcProgress,
        cleanStartDate,
        cleanEndDate
      ]
    );

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project in database.' });
  }
});

// Admin Projects: Delete project
// Admin Projects: Update project
app.put('/api/admin/projects/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  const {
    name,
    description,
    lead_name,
    department,
    status,
    priority,
    progress,
    start_date,
    end_date,
    test_cases,
    documents,
    tickets_count,
    team_members,
    folder_color,
    folder_icon
  } = req.body;

  try {
    const projCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const cur = projCheck.rows[0];
    const updated = await pool.query(
      `UPDATE projects SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        lead_name = COALESCE($3, lead_name),
        department = COALESCE($4, department),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        progress = COALESCE($7, progress),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        test_cases = COALESCE($10, test_cases),
        documents = COALESCE($11, documents),
        tickets_count = COALESCE($12, tickets_count),
        team_members = COALESCE($13, team_members),
        folder_color = COALESCE($14, folder_color),
        folder_icon = COALESCE($15, folder_icon)
       WHERE id = $16
       RETURNING *`,
      [
        name ?? cur.name,
        description ?? cur.description,
        lead_name ?? cur.lead_name,
        department ?? cur.department,
        status ?? cur.status,
        priority ?? cur.priority,
        progress !== undefined ? parseInt(progress, 10) : cur.progress,
        start_date ?? cur.start_date,
        end_date ?? cur.end_date,
        test_cases !== undefined ? parseInt(test_cases, 10) : cur.test_cases,
        documents !== undefined ? parseInt(documents, 10) : cur.documents,
        tickets_count !== undefined ? parseInt(tickets_count, 10) : cur.tickets_count,
        team_members !== undefined ? parseInt(team_members, 10) : cur.team_members,
        folder_color ?? cur.folder_color,
        folder_icon ?? cur.folder_icon,
        id
      ]
    );

    res.json({
      message: 'Project updated successfully',
      project: updated.rows[0]
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;

  try {
    const projCheck = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({
      message: 'Project deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project from database.' });
  }
});

// ==========================================
// PROJECT SHEETS (Spreadsheet Module API)
// ==========================================

// Helper for default starter sheets
const generateDefaultSheets = (project) => {
  const projName = project?.name || 'QA Project';
  const projCode = project?.project_code || 'PRJ';
  return [
    {
      sheet_name: 'Test Execution Sheet',
      columns: [
        { id: 'col_id', label: 'TC ID', width: 110, type: 'text' },
        { id: 'col_title', label: 'Test Case Title', width: 260, type: 'text' },
        { id: 'col_module', label: 'Module', width: 140, type: 'text' },
        { id: 'col_priority', label: 'Priority', width: 120, type: 'priority' },
        { id: 'col_steps', label: 'Test Steps / Precondition', width: 280, type: 'text' },
        { id: 'col_expected', label: 'Expected Result', width: 240, type: 'text' },
        { id: 'col_status', label: 'Status', width: 130, type: 'status' },
        { id: 'col_assigned', label: 'Assigned QA', width: 160, type: 'text' },
        { id: 'col_date', label: 'Execution Date', width: 130, type: 'date' }
      ],
      rows: [
        {
          id: 'row-1',
          col_id: `${projCode}-TC-01`,
          col_title: 'Verify user authentication with valid credentials',
          col_module: 'Authentication',
          col_priority: 'High',
          col_steps: '1. Enter email, 2. Enter valid password, 3. Click Login',
          col_expected: 'User redirected to role workspace with active token',
          col_status: 'Pass',
          col_assigned: project?.lead_name || 'QA Team',
          col_date: '2026-10-22'
        },
        {
          id: 'row-2',
          col_id: `${projCode}-TC-02`,
          col_title: 'Sheet inline cell editing and live auto-save',
          col_module: 'Sheet Module',
          col_priority: 'Critical',
          col_steps: '1. Double-click cell, 2. Enter value, 3. Press Enter',
          col_expected: 'Cell updates instantly and syncs with database',
          col_status: 'Pass',
          col_assigned: 'Automation QA',
          col_date: '2026-10-23'
        },
        {
          id: 'row-3',
          col_id: `${projCode}-TC-03`,
          col_title: 'Filter test cases by status in spreadsheet table',
          col_module: 'Spreadsheet Grid',
          col_priority: 'Medium',
          col_steps: '1. Click filter, 2. Choose status = Fail, 3. View table',
          col_expected: 'Table displays only matching test case rows',
          col_status: 'Pass',
          col_assigned: 'Tester 1',
          col_date: '2026-10-23'
        },
        {
          id: 'row-4',
          col_id: `${projCode}-TC-04`,
          col_title: 'Export sheet data to CSV formatted spreadsheet',
          col_module: 'Export / Import',
          col_priority: 'High',
          col_steps: '1. Click Export CSV button on sheet toolbar',
          col_expected: 'CSV file generated with all headers and row entries',
          col_status: 'In Progress',
          col_assigned: project?.lead_name || 'QA Lead',
          col_date: '2026-10-23'
        },
        {
          id: 'row-5',
          col_id: `${projCode}-TC-05`,
          col_title: 'Formula calculation for pass percentage and totals',
          col_module: 'Summary Bar',
          col_priority: 'Medium',
          col_steps: '1. Inspect bottom formula status bar',
          col_expected: 'Displays accurate Pass Rate %, total test count',
          col_status: 'Untested',
          col_assigned: 'QA Engineer',
          col_date: '2026-10-24'
        }
      ]
    },
    {
      sheet_name: 'Requirements Matrix',
      columns: [
        { id: 'col_req_id', label: 'Req ID', width: 110, type: 'text' },
        { id: 'col_feature', label: 'Feature Description', width: 280, type: 'text' },
        { id: 'col_biz_priority', label: 'Business Priority', width: 140, type: 'priority' },
        { id: 'col_qa_lead', label: 'QA Lead', width: 160, type: 'text' },
        { id: 'col_dev_lead', label: 'Dev Lead', width: 160, type: 'text' },
        { id: 'col_coverage', label: 'Coverage Status', width: 150, type: 'status' },
        { id: 'col_signoff', label: 'Sign-Off Status', width: 140, type: 'status' }
      ],
      rows: [
        {
          id: 'row-1',
          col_req_id: 'REQ-01',
          col_feature: 'Spreadsheet-like Project Sheet View with inline edits',
          col_biz_priority: 'Critical',
          col_qa_lead: 'Santhosh',
          col_dev_lead: 'Karthikeyan',
          col_coverage: 'Pass',
          col_signoff: 'Pass'
        },
        {
          id: 'row-2',
          col_req_id: 'REQ-02',
          col_feature: 'Dedicated Project Sheets Module with custom columns & tabs',
          col_biz_priority: 'High',
          col_qa_lead: project?.lead_name || 'Manikandan',
          col_dev_lead: 'Pavishek',
          col_coverage: 'Pass',
          col_signoff: 'In Progress'
        },
        {
          id: 'row-3',
          col_req_id: 'REQ-03',
          col_feature: 'Formula bar and summary status calculations',
          col_biz_priority: 'Medium',
          col_qa_lead: 'Deepak Kumar',
          col_dev_lead: 'Eng Team',
          col_coverage: 'In Progress',
          col_signoff: 'Untested'
        }
      ]
    },
    {
      sheet_name: 'Defect Log',
      columns: [
        { id: 'col_bug_id', label: 'Defect ID', width: 110, type: 'text' },
        { id: 'col_summary', label: 'Defect Summary', width: 300, type: 'text' },
        { id: 'col_severity', label: 'Severity', width: 130, type: 'priority' },
        { id: 'col_repro', label: 'Reproducibility', width: 140, type: 'text' },
        { id: 'col_status', label: 'Defect Status', width: 140, type: 'status' },
        { id: 'col_assigned_dev', label: 'Assigned Engineer', width: 170, type: 'text' },
        { id: 'col_target', label: 'Target Release', width: 130, type: 'text' }
      ],
      rows: [
        {
          id: 'row-1',
          col_bug_id: 'DEF-101',
          col_summary: 'Ensure table cell focus outline doesn\'t overflow table border',
          col_severity: 'Low',
          col_repro: 'Consistent',
          col_status: 'Pass',
          col_assigned_dev: 'Frontend Team',
          col_target: 'v1.0.1'
        },
        {
          id: 'row-2',
          col_bug_id: 'DEF-102',
          col_summary: 'Sync formula bar text input with active selected cell',
          col_severity: 'Medium',
          col_repro: 'Edge case',
          col_status: 'Pass',
          col_assigned_dev: 'UI Lead',
          col_target: 'v1.0.1'
        }
      ]
    }
  ];
};

// GET /api/admin/projects/:id/sheets
app.get('/api/admin/projects/:id/sheets', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;

  try {
    // 1. Check if project exists
    const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    const project = projRes.rows[0];

    // 2. Fetch existing sheets
    const sheetsRes = await pool.query(
      'SELECT id, project_id, sheet_name, columns, rows, created_at, updated_at FROM project_sheets WHERE project_id = $1 ORDER BY id ASC',
      [id]
    );

    if (sheetsRes.rows.length > 0) {
      return res.json({
        project: project || { id, name: 'Project' },
        sheets: sheetsRes.rows
      });
    }

    // 3. If no sheets exist for this project, auto-seed default starter sheets
    const defaultSheets = generateDefaultSheets(project);
    const createdSheets = [];

    for (const sheet of defaultSheets) {
      const insertRes = await pool.query(
        `INSERT INTO project_sheets (project_id, sheet_name, columns, rows, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING id, project_id, sheet_name, columns, rows, created_at, updated_at`,
        [id, sheet.sheet_name, JSON.stringify(sheet.columns), JSON.stringify(sheet.rows)]
      );
      createdSheets.push(insertRes.rows[0]);
    }

    res.json({
      project: project || { id, name: 'Project' },
      sheets: createdSheets
    });
  } catch (error) {
    console.error('Error fetching project sheets:', error);
    res.status(500).json({ error: 'Failed to fetch project sheets.' });
  }
});

// POST /api/admin/projects/:id/sheets - Create a new sheet tab
app.post('/api/admin/projects/:id/sheets', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  const { sheet_name, columns, rows } = req.body;

  const finalName = sheet_name?.trim() || 'New Sheet';
  const defaultCols = columns && Array.isArray(columns) && columns.length > 0 ? columns : [
    { id: 'col_a', label: 'Column A', width: 140, type: 'text' },
    { id: 'col_b', label: 'Column B', width: 220, type: 'text' },
    { id: 'col_c', label: 'Column C', width: 160, type: 'text' },
    { id: 'col_status', label: 'Status', width: 130, type: 'status' }
  ];
  const defaultRows = rows && Array.isArray(rows) ? rows : [
    { id: 'row-1', col_a: '', col_b: '', col_c: '', col_status: 'Untested' }
  ];

  try {
    const insertRes = await pool.query(
      `INSERT INTO project_sheets (project_id, sheet_name, columns, rows, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, project_id, sheet_name, columns, rows, created_at, updated_at`,
      [id, finalName, JSON.stringify(defaultCols), JSON.stringify(defaultRows)]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    console.error('Error creating sheet tab:', error);
    res.status(500).json({ error: 'Failed to create sheet tab.' });
  }
});

// PUT /api/admin/projects/:id/sheets/:sheetId - Update sheet content or name
app.put('/api/admin/projects/:id/sheets/:sheetId', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id, sheetId } = req.params;
  const { sheet_name, columns, rows } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM project_sheets WHERE id = $1 AND project_id = $2',
      [sheetId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet tab not found.' });
    }

    const updateRes = await pool.query(
      `UPDATE project_sheets SET
        sheet_name = COALESCE($1, sheet_name),
        columns = COALESCE($2, columns),
        rows = COALESCE($3, rows),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND project_id = $5
       RETURNING id, project_id, sheet_name, columns, rows, created_at, updated_at`,
      [
        sheet_name !== undefined ? sheet_name.trim() : null,
        columns !== undefined ? JSON.stringify(columns) : null,
        rows !== undefined ? JSON.stringify(rows) : null,
        sheetId,
        id
      ]
    );

    res.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: 'Failed to update sheet.' });
  }
});

// DELETE /api/admin/projects/:id/sheets/:sheetId - Delete a sheet tab
app.delete('/api/admin/projects/:id/sheets/:sheetId', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id, sheetId } = req.params;

  try {
    const delRes = await pool.query(
      'DELETE FROM project_sheets WHERE id = $1 AND project_id = $2 RETURNING id',
      [sheetId, id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet tab not found.' });
    }

    res.json({ message: 'Sheet deleted successfully', deletedId: sheetId });
  } catch (error) {
    console.error('Error deleting sheet:', error);
    res.status(500).json({ error: 'Failed to delete sheet.' });
  }
});


// Admin Roles: Get all roles & permissions
app.get('/api/admin/roles', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, role_name, description, permissions, created_at 
       FROM roles 
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles from database.' });
  }
});

// Admin Roles: Create new role
app.post('/api/admin/roles', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { role_name, description, permissions } = req.body;

  if (!role_name) {
    return res.status(400).json({ error: 'Role name is required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM roles WHERE LOWER(role_name) = LOWER($1)', [role_name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A role with this name already exists.' });
    }

    const perms = Array.isArray(permissions) ? permissions : [];

    const result = await pool.query(
      `INSERT INTO roles (role_name, description, permissions)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [role_name, description || '', perms]
    );

    res.status(201).json({
      message: 'Role created successfully',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role in database.' });
  }
});

const generateTicketCode = async () => {
  const today = new Date();
  const prefix = `TCK-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_code, '-', 3) AS INTEGER)), 0) + 1 AS next_number
     FROM tickets
     WHERE ticket_code LIKE $1`,
    [`${prefix}-%`]
  );

  const number = Number(result.rows[0]?.next_number ?? 1);
  return `${prefix}-${String(number).padStart(4, '0')}`;
};

// Admin Tickets: Get all tickets
app.get('/api/admin/tickets', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter, attachments, created_at
       FROM tickets 
       ORDER BY id DESC`
    );
    res.json(result.rows.map((row) => ({
      ...row,
      attachments: Array.isArray(row.attachments) ? row.attachments : []
    })));
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets from database.' });
  }
});

// Admin Tickets: Create new ticket
app.post('/api/admin/tickets', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { title, description, project_code, assigned_to, priority, type, status, reporter, attachments } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Ticket title is required.' });
  }

  try {
    const ticket_code = await generateTicketCode();
    const safeAttachments = Array.isArray(attachments) ? attachments : [];

    const result = await pool.query(
      `INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        ticket_code,
        title.trim(),
        description || '',
        project_code || 'General',
        assigned_to || 'Unassigned',
        priority || 'Medium',
        type || 'Bug',
        status || 'Open',
        reporter || 'Admin User',
        JSON.stringify(safeAttachments)
      ]
    );

    const newTicket = {
      ...result.rows[0],
      attachments: Array.isArray(result.rows[0].attachments) ? result.rows[0].attachments : []
    };

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: newTicket
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket in database.' });
  }
});

// Admin Tickets: Update ticket status
app.put('/api/admin/tickets/:id/status', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { status } = req.body;
  const allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Choose a valid ticket status.' });
  }

  try {
    const result = await pool.query(
      `UPDATE tickets
       SET status = $1
       WHERE id = $2
       RETURNING id, ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter, attachments, created_at`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({
      message: 'Ticket status updated successfully.',
      ticket: {
        ...result.rows[0],
        attachments: Array.isArray(result.rows[0].attachments) ? result.rows[0].attachments : []
      }
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

// Admin Approvals: Get all approval requests
app.get('/api/admin/approvals', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, req_code, title, category, requested_by, priority, status, details, created_at 
       FROM approvals 
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals from database.' });
  }
});

// Admin Approvals: Create new approval request
app.post('/api/admin/approvals', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { req_code, title, category, requested_by, priority, status, details } = req.body;

  if (!req_code || !title) {
    return res.status(400).json({ error: 'Request Code and Title are required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM approvals WHERE req_code = $1', [req_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An approval with this Request Code already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO approvals (req_code, title, category, requested_by, priority, status, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req_code,
        title,
        category || 'Access Request',
        requested_by || 'Admin User',
        priority || 'Medium',
        status || 'Pending',
        details || ''
      ]
    );

    res.status(201).json({
      message: 'Approval request created successfully',
      approval: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating approval request:', error);
    res.status(500).json({ error: 'Failed to create approval request in database.' });
  }
});

// Admin Deployments: Get all deployment requests
app.get('/api/admin/deployments', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, deploy_code, service_name, environment, version, requested_by, status, release_notes, created_at 
       FROM deployments 
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments from database.' });
  }
});

// Admin Deployments: Create new deployment request
app.post('/api/admin/deployments', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { deploy_code, service_name, environment, version, requested_by, status, release_notes } = req.body;

  if (!deploy_code || !service_name || !version) {
    return res.status(400).json({ error: 'Deployment Code, Service Name, and Version are required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM deployments WHERE deploy_code = $1', [deploy_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A deployment with this Code already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO deployments (deploy_code, service_name, environment, version, requested_by, status, release_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        deploy_code,
        service_name,
        environment || 'Staging',
        version,
        requested_by || 'Admin User',
        status || 'Pending Review',
        release_notes || ''
      ]
    );

    res.status(201).json({
      message: 'Deployment request created successfully',
      deployment: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Failed to create deployment in database.' });
  }
});

// Admin Reports Analytics summary
app.get('/api/admin/reports-summary', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const [ticketsByPriority, ticketsByType, ticketsByStatus, projectsByStatus] = await Promise.all([
      pool.query(`SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority`),
      pool.query(`SELECT type, COUNT(*) as count FROM tickets GROUP BY type`),
      pool.query(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM projects GROUP BY status`)
    ]);

    res.json({
      ticketsByPriority: ticketsByPriority.rows,
      ticketsByType: ticketsByType.rows,
      ticketsByStatus: ticketsByStatus.rows,
      projectsByStatus: projectsByStatus.rows
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ error: 'Failed to generate report summaries.' });
  }
});

app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server is running on http://localhost:${PORT}`);
});
