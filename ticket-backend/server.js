import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { sendWelcomeEmail, generateTemporaryPassword } from './services/emailService.js';
import { initDatabase } from './init-db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerWorkflowRoutes, getUserFromReq } from './services/leadDevWorkflow.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_production';

// Protected inbuilt system emails that cannot be edited or deleted
const PROTECTED_SYSTEM_EMAILS = ['manager@gmail.com', 'qalead@gmail.com'];
const DEFAULT_USER_PASSWORD = 'Welcome@123';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      JWT_SECRET,                 // The secret key to sign it
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
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Authenticated User Profile Endpoint
app.get('/api/auth/me', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    let emailStatus = { success: false, simulated: false };
    try {
      emailStatus = await sendWelcomeEmail({
        to: newUser.email,
        fullName: newUser.full_name,
        empId: newUser.emp_id,
        role: newUser.role,
        department: newUser.department,
        password: generatedPlainPassword
      });
    } catch (emailErr) {
      console.error('Welcome email dispatch error:', emailErr);
      emailStatus = { success: false, error: emailErr.message };
    }

    res.status(201).json({
      message: emailStatus.success
        ? (emailStatus.simulated ? 'User created. Credentials logged to server console (live SMTP not configured).' : 'User created and credentials email successfully delivered!')
        : 'User created, but email delivery failed: ' + (emailStatus.error || 'Unknown error'),
      user: newUser,
      email_status: emailStatus
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user in database.' });
  }
});

// Admin Users: Resend Invitation & Credentials Email
app.post('/api/admin/users/:id/resend-invite', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userRes.rows[0];
    const temporaryPassword = generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);

    const emailStatus = await sendWelcomeEmail({
      to: targetUser.email,
      fullName: targetUser.full_name,
      empId: targetUser.emp_id,
      role: targetUser.role,
      department: targetUser.department,
      password: temporaryPassword
    });

    if (emailStatus.success) {
      return res.json({
        message: emailStatus.simulated
          ? 'Credentials generated and logged to console (SMTP unconfigured).'
          : 'Credentials email successfully resent to ' + targetUser.email,
        email_status: emailStatus
      });
    } else {
      return res.status(500).json({
        error: 'Failed to deliver credentials email: ' + (emailStatus.error || 'SMTP delivery error'),
        email_status: emailStatus
      });
    }
  } catch (err) {
    console.error('Error resending invite:', err);
    res.status(500).json({ error: 'Failed to resend credentials: ' + err.message });
  }
});

// Admin Users: Update user (Protected accounts cannot be edited)
app.put('/api/admin/users/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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

// Admin Projects: Get potential project leads (all active users except manager, qa member, admin)
app.get('/api/admin/project-leads', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      `SELECT id, emp_id, full_name, email, department, role 
       FROM users 
       WHERE LOWER(role) NOT IN ('admin', 'manager', 'super admin', 'qa member')
         AND LOWER(email) NOT LIKE '%admin%'
         AND LOWER(email) != 'manager@gmail.com'
         AND status = 'Active'
       ORDER BY full_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project leads:', error);
    res.status(500).json({ error: 'Failed to fetch project leads' });
  }
});

// Admin Projects: Get all projects (Role-filtered)
app.get('/api/admin/projects', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let query = `
      SELECT p.id, p.project_code, p.name, p.description, p.lead_name, p.project_lead_id, p.client_name,
             p.department, p.status, p.priority, p.progress, p.start_date, p.end_date, p.created_at,
             COALESCE(p.test_cases, 0) as test_cases,
             COALESCE(p.documents, 0) as documents,
             COALESCE(p.tickets_count, 0) as tickets_count,
             COALESCE(p.team_members, 0) as team_members,
             COALESCE(p.folder_color, 'blue') as folder_color,
             COALESCE(p.folder_icon, 'folder') as folder_icon,
             COALESCE((SELECT COUNT(*) FROM project_developer_assignments WHERE project_id = p.id AND status = 'Active'), 0) as assigned_devs_count
      FROM projects p
    `;
    const params = [];

    if (user.role === 'Project Lead') {
      params.push(user.id);
      params.push(user.full_name);
      query += ` WHERE (p.project_lead_id = $1 OR LOWER(p.lead_name) = LOWER($2))`;
    } else if (user.role === 'Developer') {
      params.push(user.id);
      query += ` WHERE p.id IN (SELECT project_id FROM project_developer_assignments WHERE developer_id = $1 AND status = 'Active')`;
    }

    query += ` ORDER BY p.id ASC`;

    const result = await pool.query(query, params);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { project_code, name, description, lead_name, project_lead_id, client_name, department, status, priority, progress, start_date, end_date, team_members } = req.body;

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

    const cleanTeamMembers = team_members !== undefined && team_members !== null && !isNaN(parseInt(team_members, 10))
      ? Math.min(Math.max(1, parseInt(team_members, 10)), 9)
      : 4;

    let resolvedLeadName = lead_name || 'Admin User';
    let leadAssignedAt = null;
    let leadAssignedBy = null;
    let leadId = project_lead_id ? parseInt(project_lead_id, 10) : null;

    if (leadId) {
      const leadUserRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [leadId]);
      if (leadUserRes.rows.length > 0) {
        resolvedLeadName = leadUserRes.rows[0].full_name || resolvedLeadName;
        leadAssignedAt = new Date();
        leadAssignedBy = 'Admin';
      }
    }

    const result = await pool.query(
      `INSERT INTO projects (project_code, name, description, lead_name, project_lead_id, client_name, lead_assigned_at, lead_assigned_by, department, status, priority, progress, start_date, end_date, team_members)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        project_code.trim(),
        name.trim(),
        description || '',
        resolvedLeadName,
        leadId,
        client_name || '',
        leadAssignedAt,
        leadAssignedBy,
        department || 'Quality Assurance',
        status || 'In Progress',
        priority || 'Medium',
        calcProgress,
        cleanStartDate,
        cleanEndDate,
        cleanTeamMembers
      ]
    );

    const createdProject = result.rows[0];

    if (leadId) {
      try {
        const leadUserRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [leadId]);
        const leadUser = leadUserRes.rows[0];
        await pool.query(
          `INSERT INTO project_lead_assignments (project_id, project_lead_id, lead_name, lead_email, project_lead_name, project_lead_email, assigned_by, notes)
           VALUES ($1, $2, $3, $4, $3, $4, $5, $6)`,
          [
            createdProject.id,
            leadId,
            leadUser?.full_name || resolvedLeadName,
            leadUser?.email || '',
            'Admin',
            'Assigned during project creation'
          ]
        );
      } catch (histErr) {
        console.warn('Could not record initial lead assignment history:', histErr.message);
      }
    }

    res.status(201).json({
      message: 'Project created successfully',
      project: createdProject
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

  let decodedUser = null;
  try {
    decodedUser = jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  const {
    name,
    description,
    lead_name,
    project_lead_id,
    client_name,
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

    // Clean dates safely: convert empty string "" or null to null for optional end_date
    const cleanStartDate = (start_date !== undefined && start_date !== null && String(start_date).trim() !== '')
      ? String(start_date).trim()
      : cur.start_date;

    const cleanEndDate = end_date !== undefined
      ? (end_date !== null && String(end_date).trim() !== '' ? String(end_date).trim() : null)
      : cur.end_date;

    // Clean project lead id and lead name
    let leadId = cur.project_lead_id;
    if (project_lead_id !== undefined) {
      leadId = (project_lead_id !== null && String(project_lead_id).trim() !== '')
        ? parseInt(project_lead_id, 10)
        : null;
    }

    let resolvedLeadName = lead_name !== undefined ? (lead_name ? String(lead_name).trim() : '') : cur.lead_name;
    if (leadId && (!resolvedLeadName || resolvedLeadName.trim() === '')) {
      const leadUserRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [leadId]);
      if (leadUserRes.rows.length > 0) {
        resolvedLeadName = leadUserRes.rows[0].full_name || leadUserRes.rows[0].email;
      }
    }

    const cleanClientName = client_name !== undefined
      ? (client_name ? String(client_name).trim() : '')
      : cur.client_name;

    const cleanTeamMembers = (team_members !== undefined && team_members !== null && String(team_members).trim() !== '' && !isNaN(parseInt(team_members, 10)))
      ? Math.min(Math.max(1, parseInt(team_members, 10)), 9)
      : cur.team_members;

    const cleanProgress = progress !== undefined && progress !== null && !isNaN(parseInt(progress, 10))
      ? parseInt(progress, 10)
      : cur.progress;

    const updated = await pool.query(
      `UPDATE projects SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        lead_name = COALESCE($3, lead_name),
        project_lead_id = $4,
        client_name = COALESCE($5, client_name),
        department = COALESCE($6, department),
        status = COALESCE($7, status),
        priority = COALESCE($8, priority),
        progress = COALESCE($9, progress),
        start_date = COALESCE($10, start_date),
        end_date = $11,
        test_cases = COALESCE($12, test_cases),
        documents = COALESCE($13, documents),
        tickets_count = COALESCE($14, tickets_count),
        team_members = COALESCE($15, team_members),
        folder_color = COALESCE($16, folder_color),
        folder_icon = COALESCE($17, folder_icon)
       WHERE id = $18
       RETURNING *`,
      [
        name !== undefined ? (name ? name.trim() : cur.name) : cur.name,
        description !== undefined ? description : cur.description,
        resolvedLeadName || cur.lead_name,
        leadId,
        cleanClientName,
        department !== undefined ? (department ? department.trim() : cur.department) : cur.department,
        status !== undefined ? (status ? status.trim() : cur.status) : cur.status,
        priority !== undefined ? (priority ? priority.trim() : cur.priority) : cur.priority,
        cleanProgress,
        cleanStartDate,
        cleanEndDate,
        test_cases !== undefined ? parseInt(test_cases, 10) : cur.test_cases,
        documents !== undefined ? parseInt(documents, 10) : cur.documents,
        tickets_count !== undefined ? parseInt(tickets_count, 10) : cur.tickets_count,
        cleanTeamMembers,
        folder_color ?? cur.folder_color,
        folder_icon ?? cur.folder_icon,
        id
      ]
    );

    // If project lead changed, log assignment in project_lead_assignments
    if (leadId && leadId !== cur.project_lead_id) {
      try {
        const leadUserRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [leadId]);
        const leadUser = leadUserRes.rows[0];
        const assignedByName = decodedUser?.full_name || decodedUser?.email || 'Admin';
        await pool.query(
          `INSERT INTO project_lead_assignments (project_id, project_lead_id, lead_name, lead_email, project_lead_name, project_lead_email, assigned_by)
           VALUES ($1, $2, $3, $4, $3, $4, $5)`,
          [
            id,
            leadId,
            leadUser?.full_name || resolvedLeadName,
            leadUser?.email || '',
            assignedByName
          ]
        );
        await pool.query(
          `UPDATE projects SET lead_assigned_at = CURRENT_TIMESTAMP, lead_assigned_by = $1 WHERE id = $2`,
          [assignedByName, id]
        );
      } catch (leadAssignErr) {
        console.warn('Could not record lead assignment history during project update:', leadAssignErr.message);
      }
    }

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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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

// Helper for default starter sheets: clean sheet with no predefined dummy rows
const generateDefaultSheets = (project) => {
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
        { id: 'col_screenshot', label: 'Screenshot / Proof', width: 170, type: 'image' },
        { id: 'col_assigned', label: 'Assigned QA', width: 160, type: 'text' },
        { id: 'col_date', label: 'Execution Date', width: 130, type: 'date' }
      ],
      rows: []
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;

  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  // RBAC: Developers are strictly restricted from full test sheets
  if (user.role === 'Developer') {
    return res.status(403).json({ error: 'Developers are restricted from accessing complete test case sheets. You can view your assigned bug tickets.' });
  }

  try {
    // 1. Check if project exists
    const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    const project = projRes.rows[0];

    // 2. Fetch existing sheets
    const sheetsRes = await pool.query(
      'SELECT id, project_id, sheet_name, columns, rows, formatting, created_at, updated_at FROM project_sheets WHERE project_id = $1 ORDER BY id ASC',
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
        `INSERT INTO project_sheets (project_id, sheet_name, columns, rows, formatting, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id, project_id, sheet_name, columns, rows, formatting, created_at, updated_at`,
        [id, sheet.sheet_name, JSON.stringify(sheet.columns), JSON.stringify(sheet.rows), JSON.stringify(sheet.formatting || {})]
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;
  const { sheet_name, columns, rows, formatting } = req.body;

  const finalName = sheet_name?.trim() || 'New Sheet';
  const defaultCols = columns && Array.isArray(columns) && columns.length > 0 ? columns : [
    { id: 'col_a', label: 'Column A', width: 140, type: 'text' },
    { id: 'col_b', label: 'Column B', width: 220, type: 'text' },
    { id: 'col_c', label: 'Column C', width: 160, type: 'text' },
    { id: 'col_status', label: 'Status', width: 130, type: 'status' }
  ];
  const defaultRows = rows && Array.isArray(rows) ? rows : [];

  try {
    const insertRes = await pool.query(
      `INSERT INTO project_sheets (project_id, sheet_name, columns, rows, formatting, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, project_id, sheet_name, columns, rows, formatting, created_at, updated_at`,
      [id, finalName, JSON.stringify(defaultCols), JSON.stringify(defaultRows), JSON.stringify(formatting || {})]
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id, sheetId } = req.params;
  const { sheet_name, columns, rows, formatting } = req.body;

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
        formatting = COALESCE($4, formatting),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND project_id = $6
       RETURNING id, project_id, sheet_name, columns, rows, formatting, created_at, updated_at`,
      [
        sheet_name !== undefined ? sheet_name.trim() : null,
        columns !== undefined ? JSON.stringify(columns) : null,
        rows !== undefined ? JSON.stringify(rows) : null,
        formatting !== undefined ? JSON.stringify(formatting) : null,
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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

// GET /api/admin/projects/:id/documents - Get project documents
app.get('/api/admin/projects/:id/documents', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { id } = req.params;

  try {
    const projRes = await pool.query(
      'SELECT id FROM projects WHERE id::text = $1 OR project_code = $1',
      [id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    const projId = projRes.rows[0].id;

    const docsRes = await pool.query(
      `SELECT id, project_id, name, file_url, file_size, file_type, uploaded_by, uploaded_by_id, uploaded_at 
       FROM project_documents 
       WHERE project_id = $1 
       ORDER BY uploaded_at DESC`,
      [projId]
    );
    res.json(docsRes.rows);
  } catch (error) {
    console.error('Error fetching project documents:', error);
    res.status(500).json({ error: 'Failed to fetch project documents.' });
  }
});

// POST /api/admin/projects/:id/documents - Upload document (Manager & assigned Project Lead only)
app.post('/api/admin/projects/:id/documents', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;
  const { name, file_url, file_size, file_type } = req.body;

  if (!name || !file_url) {
    return res.status(400).json({ error: 'Document name and file data are required.' });
  }

  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'ppt', 'pptx'];
  const fileExt = name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    return res.status(400).json({ error: 'Invalid file type. Allowed formats: PDF, DOC/DOCX, XLS/XLSX/CSV, TXT, PNG, JPG/JPEG, PPT/PPTX.' });
  }

  try {
    const projRes = await pool.query(
      'SELECT id, project_lead_id, lead_name FROM projects WHERE id::text = $1 OR project_code = $1',
      [id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    const proj = projRes.rows[0];
    const projId = proj.id;

    const isManager = ['Manager', 'Super Admin', 'Admin'].includes(user.role);
    const isAssignedLead = Boolean(
      (proj.project_lead_id && String(proj.project_lead_id) === String(user.id)) ||
      (proj.lead_name && user.full_name && proj.lead_name.trim().toLowerCase() === user.full_name.trim().toLowerCase()) ||
      (proj.lead_name && user.email && proj.lead_name.trim().toLowerCase() === user.email.trim().toLowerCase())
    );

    if (!isManager && !isAssignedLead) {
      return res.status(403).json({ error: 'Access denied. Document upload is restricted to the Manager and the assigned Project Lead.' });
    }

    const result = await pool.query(
      `INSERT INTO project_documents (project_id, name, file_url, file_size, file_type, uploaded_by, uploaded_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projId,
        name.trim(),
        file_url,
        file_size || 'Unknown',
        file_type || fileExt.toUpperCase(),
        user.full_name || 'Admin',
        user.id
      ]
    );

    // Sync projects.documents count
    await pool.query(
      `UPDATE projects 
       SET documents = (SELECT COUNT(*) FROM project_documents WHERE project_id = $1)
       WHERE id = $1`,
      [projId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// DELETE /api/admin/projects/:id/documents/:docId - Delete document (Manager & assigned Project Lead only)
app.delete('/api/admin/projects/:id/documents/:docId', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id, docId } = req.params;

  try {
    const projRes = await pool.query(
      'SELECT id, project_lead_id, lead_name FROM projects WHERE id::text = $1 OR project_code = $1',
      [id]
    );
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    const proj = projRes.rows[0];
    const projId = proj.id;

    const isManager = ['Manager', 'Super Admin', 'Admin'].includes(user.role);
    const isAssignedLead = Boolean(
      (proj.project_lead_id && String(proj.project_lead_id) === String(user.id)) ||
      (proj.lead_name && user.full_name && proj.lead_name.trim().toLowerCase() === user.full_name.trim().toLowerCase()) ||
      (proj.lead_name && user.email && proj.lead_name.trim().toLowerCase() === user.email.trim().toLowerCase())
    );

    if (!isManager && !isAssignedLead) {
      return res.status(403).json({ error: 'Access denied. Only the Manager and the assigned Project Lead can delete documents.' });
    }

    const delRes = await pool.query(
      'DELETE FROM project_documents WHERE id = $1 AND project_id = $2 RETURNING id',
      [docId, projId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Sync projects.documents count
    await pool.query(
      `UPDATE projects 
       SET documents = (SELECT COUNT(*) FROM project_documents WHERE project_id = $1)
       WHERE id = $1`,
      [projId]
    );

    res.json({ message: 'Document deleted successfully', deletedId: docId });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});


// Admin Roles: Get all roles & permissions
app.get('/api/admin/roles', async (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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

// Admin Tickets: Get all tickets (Role-filtered)
app.get('/api/admin/tickets', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { project_id, status } = req.query;

  try {
    let query = `
      SELECT t.*, 
             p.name as project_name, p.lead_name as project_lead_name, p.project_lead_id
      FROM tickets t
      LEFT JOIN projects p ON p.id = t.project_id OR p.project_code = t.project_code
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'Developer') {
      params.push(user.id);
      params.push(user.full_name);
      params.push(user.email);
      query += ` AND (
        t.assigned_developer_id = $1 
        OR LOWER(t.assigned_to) = LOWER($2) 
        OR LOWER(t.assigned_to) = LOWER($3)
        OR t.project_id IN (SELECT project_id FROM project_developer_assignments WHERE developer_id = $1)
      )`;
    } else if (user.role === 'Project Lead') {
      params.push(user.id);
      params.push(user.full_name);
      query += ` AND (
        p.project_lead_id = $1 
        OR LOWER(p.lead_name) = LOWER($2)
        OR t.project_id IN (SELECT project_id FROM project_lead_assignments WHERE project_lead_id = $1)
      )`;
    }

    if (project_id) {
      params.push(project_id);
      query += ` AND t.project_id = ${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND t.status = ${params.length}`;
    }

    query += ` ORDER BY t.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map((row) => {
      let atts = [];
      try {
        atts = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : (row.attachments || []);
      } catch (e) { atts = []; }
      let resAtts = [];
      try {
        resAtts = typeof row.resolution_attachments === 'string' ? JSON.parse(row.resolution_attachments) : (row.resolution_attachments || []);
      } catch (e) { resAtts = []; }
      return {
        ...row,
        attachments: Array.isArray(atts) ? atts : [],
        resolution_attachments: Array.isArray(resAtts) ? resAtts : []
      };
    }));
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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
    jwt.verify(authorization.slice('Bearer '.length), JWT_SECRET);
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

// Register Project Lead Management, Developer Assignment & Bug Ticket Automation Routes
registerWorkflowRoutes(app);

// ==========================================
// REAL-TIME COLLABORATIVE WEBSOCKET (SOCKET.IO)
// ==========================================
// Tracks active viewers: Map<roomId, Map<socketId, userInfo>>
const roomViewers = new Map();

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  // 1. Join Sheet Room
  socket.on('join_sheet_room', ({ projectId, sheetId, user }) => {
    if (!projectId) return;
    const roomId = `project_sheet_${projectId}`;
    currentRoom = roomId;
    currentUser = user || { id: socket.id, name: 'Team Member', role: 'Viewer' };

    socket.join(roomId);

    if (!roomViewers.has(roomId)) {
      roomViewers.set(roomId, new Map());
    }
    roomViewers.get(roomId).set(socket.id, currentUser);

    const viewersList = Array.from(roomViewers.get(roomId).values());
    io.to(roomId).emit('sheet_presence_updated', {
      roomId,
      viewers: viewersList
    });
  });

  // 2. Leave Sheet Room
  socket.on('leave_sheet_room', ({ projectId }) => {
    const roomId = `project_sheet_${projectId}`;
    socket.leave(roomId);
    if (roomViewers.has(roomId)) {
      roomViewers.get(roomId).delete(socket.id);
      const viewersList = Array.from(roomViewers.get(roomId).values());
      io.to(roomId).emit('sheet_presence_updated', {
        roomId,
        viewers: viewersList
      });
    }
  });

  // 3. Live Instant Cell Edit Broadcast
  socket.on('sheet_cell_edited', (data) => {
    const { projectId, sheetId, rowIndex, colId, value, user } = data;
    const roomId = `project_sheet_${projectId}`;
    socket.to(roomId).emit('sheet_cell_updated', {
      sheetId,
      rowIndex,
      colId,
      value,
      user
    });
  });

  // 4. Live Full Sheet Data Sync (e.g. after adding rows, columns, or bulk changes)
  socket.on('sheet_data_synced', (data) => {
    const { projectId, sheetId, sheets, updatedBy } = data;
    const roomId = `project_sheet_${projectId}`;
    socket.to(roomId).emit('sheet_data_synced', {
      sheetId,
      sheets,
      updatedBy
    });
  });

  // 5. Live Cell Focus / Selection (Shows colored border indicating someone is on that cell)
  socket.on('sheet_cell_focused', (data) => {
    const { projectId, sheetId, rowIndex, colId, user } = data;
    const roomId = `project_sheet_${projectId}`;
    socket.to(roomId).emit('sheet_cell_focused', {
      sheetId,
      rowIndex,
      colId,
      user,
      socketId: socket.id
    });
  });

  // 6. Handle Disconnect
  socket.on('disconnect', () => {
    if (currentRoom && roomViewers.has(currentRoom)) {
      roomViewers.get(currentRoom).delete(socket.id);
      const viewersList = Array.from(roomViewers.get(currentRoom).values());
      io.to(currentRoom).emit('sheet_presence_updated', {
        roomId: currentRoom,
        viewers: viewersList
      });
      if (roomViewers.get(currentRoom).size === 0) {
        roomViewers.delete(currentRoom);
      }
    }
  });
});

httpServer.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server is running with Socket.IO on http://localhost:${PORT}`);
});
