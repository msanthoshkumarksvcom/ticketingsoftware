import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

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

    const salt = await bcrypt.genSalt(10);
    const userPassword = password || DEFAULT_USER_PASSWORD;
    const hashedPassword = await bcrypt.hash(userPassword, salt);

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

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
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
      `SELECT id, project_code, name, description, lead_name, department, status, priority, start_date, end_date, created_at 
       FROM projects 
       ORDER BY id DESC`
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

  const { project_code, name, description, lead_name, department, status, priority, start_date, end_date } = req.body;

  if (!project_code || !name) {
    return res.status(400).json({ error: 'Project Code and Project Name are required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM projects WHERE project_code = $1', [project_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A project with this Project Code already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO projects (project_code, name, description, lead_name, department, status, priority, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        project_code,
        name,
        description || '',
        lead_name || 'Admin User',
        department || 'Quality Assurance',
        status || 'In Progress',
        priority || 'Medium',
        start_date || new Date().toISOString().split('T')[0],
        end_date || null
      ]
    );

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project in database.' });
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
      `SELECT id, ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter, created_at 
       FROM tickets 
       ORDER BY id DESC`
    );
    res.json(result.rows);
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

  const { ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter } = req.body;

  if (!ticket_code || !title) {
    return res.status(400).json({ error: 'Ticket Code and Title are required.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM tickets WHERE ticket_code = $1', [ticket_code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A ticket with this Ticket Code already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (ticket_code, title, description, project_code, assigned_to, priority, type, status, reporter)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        ticket_code,
        title,
        description || '',
        project_code || 'General',
        assigned_to || 'Unassigned',
        priority || 'Medium',
        type || 'Bug',
        status || 'Open',
        reporter || 'Admin User'
      ]
    );

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket in database.' });
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
