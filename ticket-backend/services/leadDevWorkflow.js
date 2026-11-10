import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_production';

// Ensure uploads/tickets folder exists
const uploadsDir = path.join(__dirname, '../uploads');
const ticketsUploadsDir = path.join(uploadsDir, 'tickets');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(ticketsUploadsDir)) fs.mkdirSync(ticketsUploadsDir, { recursive: true });

// Helper to authenticate and fetch user record
export const getUserFromReq = async (req) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const token = authorization.slice('Bearer '.length);
    const decoded = jwt.verify(token, JWT_SECRET);
    const res = await pool.query(
      'SELECT id, email, full_name, role, emp_id, department FROM users WHERE id = $1',
      [decoded.userId]
    );
    return res.rows[0] || null;
  } catch (err) {
    return null;
  }
};

// Helper: Save Base64 Image to disk
export const saveBase64Image = (base64Str, originalName = 'screenshot.png') => {
  if (!base64Str || typeof base64Str !== 'string') return null;
  
  // If already an HTTP or relative upload URL, keep as is
  if (base64Str.startsWith('http://') || base64Str.startsWith('https://') || base64Str.startsWith('/uploads/')) {
    return base64Str;
  }

  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  let ext = 'png';
  let buffer;
  if (matches) {
    ext = matches[1].replace('jpeg', 'jpg');
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    try {
      buffer = Buffer.from(base64Str, 'base64');
    } catch (e) {
      return null;
    }
  }

  const sanitizedExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'png';
  const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${sanitizedExt}`;
  const filePath = path.join(ticketsUploadsDir, cleanName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/tickets/${cleanName}`;
};

// Helper: Generate unique project bug ticket code: e.g. [PROJ_CODE]-BUG-001
export const generateBugTicketCode = async (projectCode) => {
  const prefix = (projectCode || 'PRJ').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const result = await pool.query(
    `SELECT ticket_code FROM tickets WHERE ticket_code LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}-BUG-%`]
  );
  let nextNum = 1;
  if (result.rows.length > 0) {
    const parts = result.rows[0].ticket_code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}-BUG-${String(nextNum).padStart(3, '0')}`;
};

// Helper: Log ticket action in ticket_history
export const logTicketHistory = async (ticketId, action, prevStatus, newStatus, performedBy, performedById, details) => {
  try {
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, action, previous_status, new_status, performed_by, performed_by_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ticketId, action, prevStatus, newStatus, performedBy, performedById, details]
    );
  } catch (err) {
    console.error('Error logging ticket history:', err);
  }
};

// Helper: Send in-app notification
export const sendInAppNotification = async (userId, title, message, type = 'info', link = '') => {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, message, type, link]
    );
  } catch (err) {
    console.error('Error sending in-app notification:', err);
  }
};

export function registerWorkflowRoutes(app, io) {
  // ==========================================
  // 1. IMAGE UPLOAD
  // ==========================================
  app.post('/api/admin/tickets/upload-image', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { imageBase64, filename, fileType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    try {
      const url = saveBase64Image(imageBase64, filename || 'screenshot.png');
      if (!url) {
        return res.status(400).json({ error: 'Invalid image format. Supported: PNG, JPG, JPEG, WEBP' });
      }
      res.json({ url, filename: filename || path.basename(url) });
    } catch (err) {
      console.error('Image upload error:', err);
      res.status(500).json({ error: 'Failed to process and store image.' });
    }
  });

  // ==========================================
  // 2. PROJECT LEADS & ASSIGNMENT
  // ==========================================
  // List all available Project Leads
  app.get('/api/admin/project-leads', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT id, emp_id, full_name, email, department, role, status
         FROM users 
         WHERE role = 'Project Lead' AND status = 'Active'
         ORDER BY full_name ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching project leads:', err);
      res.status(500).json({ error: 'Failed to fetch project leads' });
    }
  });

  // Assign or Reassign Project Lead to a Project
  app.post('/api/admin/projects/:id/lead', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // Permissions: Only Manager and QA Lead (plus Super Admin, Admin) can assign Project Lead
    const allowedRoles = ['Manager', 'QA Lead', 'Super Admin', 'Admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Only Managers and QA Leads can assign or reassign a Project Lead.' });
    }

    const projectId = req.params.id;
    const { project_lead_id, notes } = req.body;

    try {
      // 1. Check project
      const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      const project = projRes.rows[0];

      // 2. If assigning null (unassign)
      if (!project_lead_id) {
        await pool.query(
          `UPDATE projects 
           SET project_lead_id = NULL, lead_name = NULL, lead_assigned_at = NULL, lead_assigned_by = NULL
           WHERE id = $1`,
          [projectId]
        );
        // Mark previous assignments as inactive
        await pool.query(
          `UPDATE project_lead_assignments SET status = 'Removed' WHERE project_id = $1 AND status = 'Active'`,
          [projectId]
        );
        return res.json({ message: 'Project Lead unassigned successfully.', project: { ...project, project_lead_id: null, lead_name: null } });
      }

      // 3. Verify lead user
      const leadRes = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [project_lead_id]);
      if (leadRes.rows.length === 0) {
        return res.status(404).json({ error: 'Selected Project Lead user does not exist.' });
      }
      const leadUser = leadRes.rows[0];

      // Mark previous active assignment as Reassigned
      await pool.query(
        `UPDATE project_lead_assignments SET status = 'Reassigned' WHERE project_id = $1 AND status = 'Active'`,
        [projectId]
      );

      // Record new assignment in history with both column sets for guaranteed backwards compatibility
      await pool.query(
        `INSERT INTO project_lead_assignments (project_id, project_lead_id, lead_name, lead_email, project_lead_name, project_lead_email, assigned_by, status, notes)
         VALUES ($1, $2, $3, $4, $3, $4, $5, 'Active', $6)`,
        [projectId, leadUser.id, leadUser.full_name, leadUser.email, user.full_name, notes || 'Assigned by management']
      );

      // Update project record
      const updateRes = await pool.query(
        `UPDATE projects 
         SET project_lead_id = $1, lead_name = $2, lead_assigned_at = CURRENT_TIMESTAMP, lead_assigned_by = $3
         WHERE id = $4
         RETURNING *`,
        [leadUser.id, leadUser.full_name, user.full_name, projectId]
      );

      // Send in-app notification to the assigned Project Lead
      await sendInAppNotification(
        leadUser.id,
        'Project Assigned',
        `You have been assigned as Project Lead for "${project.name}" (${project.project_code}).`,
        'project_assigned',
        `/admin/projects/${projectId}`
      );

      res.json({
        message: 'Project Lead assigned successfully.',
        project: updateRes.rows[0]
      });
    } catch (err) {
      console.error('Error assigning project lead:', err);
      res.status(500).json({ error: 'Failed to assign project lead.' });
    }
  });

  // Get Project Lead assignment history
  app.get('/api/admin/projects/:id/lead-history', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT pla.id, pla.project_id, pla.project_lead_id,
                COALESCE(u.full_name, pla.project_lead_name, pla.lead_name) as project_lead_name,
                COALESCE(u.full_name, pla.project_lead_name, pla.lead_name) as lead_name,
                COALESCE(u.email, pla.project_lead_email, pla.lead_email) as project_lead_email,
                COALESCE(u.email, pla.project_lead_email, pla.lead_email) as lead_email,
                pla.assigned_by, pla.assigned_at, pla.status, pla.notes
         FROM project_lead_assignments pla
         LEFT JOIN users u ON u.id = pla.project_lead_id
         WHERE pla.project_id = $1
         ORDER BY pla.assigned_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching lead history:', err);
      res.status(500).json({ error: 'Failed to fetch lead assignment history.' });
    }
  });

  // ==========================================
  // 3. DEVELOPER ASSIGNMENTS TO PROJECT
  // ==========================================
  // List all available Developers
  app.get('/api/admin/developers', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT id, emp_id, full_name, email, department, role, status
         FROM users 
         WHERE role = 'Developer' AND status = 'Active'
         ORDER BY full_name ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching developers:', err);
      res.status(500).json({ error: 'Failed to fetch developers' });
    }
  });

  // List developers assigned to a specific project
  app.get('/api/admin/projects/:id/developers', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT pda.id, pda.project_id, pda.developer_id, pda.developer_name, pda.developer_email,
                pda.assigned_by, pda.assigned_at, pda.status, pda.notes,
                u.emp_id, u.department, u.phone, u.avatar
         FROM project_developer_assignments pda
         JOIN users u ON u.id = pda.developer_id
         WHERE pda.project_id = $1 AND pda.status = 'Active'
         ORDER BY pda.assigned_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching project developers:', err);
      res.status(500).json({ error: 'Failed to fetch project developers' });
    }
  });

  // Assign one or more developers to a project
  app.post('/api/admin/projects/:id/developers', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const projectId = req.params.id;
    const { developer_ids, notes } = req.body;

    if (!Array.isArray(developer_ids) || developer_ids.length === 0) {
      return res.status(400).json({ error: 'Please select at least one developer to assign.' });
    }

    try {
      // Check project
      const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      const project = projRes.rows[0];

      // Permission check: Only Manager and QA Lead (plus Super Admin, Admin) can assign developers
      const allowedRoles = ['Manager', 'QA Lead', 'Super Admin', 'Admin'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Only Managers and QA Leads can assign developers to this project.' });
      }

      const assignedDevs = [];
      for (const devId of developer_ids) {
        const devUserRes = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [devId]);
        if (devUserRes.rows.length === 0) continue;
        const devUser = devUserRes.rows[0];

        // Upsert into project_developer_assignments
        const insertRes = await pool.query(
          `INSERT INTO project_developer_assignments (project_id, developer_id, developer_name, developer_email, assigned_by, status, notes)
           VALUES ($1, $2, $3, $4, $5, 'Active', $6)
           ON CONFLICT (project_id, developer_id) 
           DO UPDATE SET status = 'Active', assigned_at = CURRENT_TIMESTAMP, assigned_by = $5, notes = $6
           RETURNING *`,
          [projectId, devUser.id, devUser.full_name, devUser.email, user.full_name, notes || 'Assigned by management']
        );
        assignedDevs.push(insertRes.rows[0]);

        // Send notification to developer
        await sendInAppNotification(
          devUser.id,
          'Assigned to Project',
          `You have been added as an engineering developer on "${project.name}" (${project.project_code}).`,
          'project_assigned',
          `/developer`
        );
      }

      res.status(201).json({
        message: `Successfully assigned ${assignedDevs.length} developer(s) to project.`,
        assignedDevelopers: assignedDevs
      });
    } catch (err) {
      console.error('Error assigning developers:', err);
      res.status(500).json({ error: 'Failed to assign developers to project.' });
    }
  });

  // Remove a developer from a project
  app.delete('/api/admin/projects/:id/developers/:developerId', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { id: projectId, developerId } = req.params;

    try {
      const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
      const project = projRes.rows[0];

      // Permission check: Only Manager and QA Lead (plus Super Admin, Admin) can remove developers
      const allowedRoles = ['Manager', 'QA Lead', 'Super Admin', 'Admin'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Only Managers and QA Leads can remove developers from this project.' });
      }

      await pool.query(
        `UPDATE project_developer_assignments 
         SET status = 'Removed' 
         WHERE project_id = $1 AND developer_id = $2`,
        [projectId, developerId]
      );

      res.json({ message: 'Developer removed from project successfully.' });
    } catch (err) {
      console.error('Error removing developer:', err);
      res.status(500).json({ error: 'Failed to remove developer from project.' });
    }
  });

  // Developer assignment history for a project
  app.get('/api/admin/projects/:id/developer-history', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT pda.id, pda.project_id, pda.developer_id, pda.developer_name, pda.developer_email,
                pda.assigned_by, pda.assigned_at, pda.status, pda.notes
         FROM project_developer_assignments pda
         WHERE pda.project_id = $1
         ORDER BY pda.assigned_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching developer assignment history:', err);
      res.status(500).json({ error: 'Failed to fetch developer history' });
    }
  });

  // ==========================================
  // 4. FAILED TEST CASE -> BUG TICKET AUTOMATION
  // ==========================================
  app.post('/api/admin/tickets/from-test-case', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const {
      project_id,
      project_code,
      project_name,
      test_case_id,
      module,
      sub_module,
      test_scenario,
      test_steps,
      test_data,
      expected_result,
      actual_result,
      title,
      description,
      steps_to_reproduce,
      severity,
      priority,
      category,
      attachments,
      force
    } = req.body;

    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'Project ID and Bug Title are required.' });
    }

    try {
      // 1. Fetch project info
      const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: 'Project does not exist.' });
      }
      const project = projRes.rows[0];

      // 2. Prevent duplicate open bug tickets for the same test case unless force=true
      if (test_case_id && !force) {
        const existingOpen = await pool.query(
          `SELECT id, ticket_code, title, status FROM tickets 
           WHERE project_id = $1 AND test_case_id = $2 AND status IN ('Open', 'In Progress', 'Reopened')
           LIMIT 1`,
          [project_id, test_case_id]
        );
        if (existingOpen.rows.length > 0) {
          return res.status(409).json({
            warning: `A bug ticket (${existingOpen.rows[0].ticket_code}) is already active for Test Case ${test_case_id}.`,
            existingTicket: existingOpen.rows[0]
          });
        }
      }

      // 3. Generate Ticket ID based on project code
      const ticket_code = await generateBugTicketCode(project.project_code || project_code);

      // 4. Process and store image attachments if provided
      let processedAttachments = [];
      if (Array.isArray(attachments)) {
        for (const item of attachments) {
          if (typeof item === 'string') {
            const savedUrl = saveBase64Image(item);
            if (savedUrl) processedAttachments.push(savedUrl);
          } else if (item?.url) {
            const savedUrl = saveBase64Image(item.url, item.name);
            if (savedUrl) processedAttachments.push(savedUrl);
          }
        }
      }

      const fullDescription = description || steps_to_reproduce || test_scenario || '';

      // 5. Insert bug ticket under PROJECT
      const insertRes = await pool.query(
        `INSERT INTO tickets (
          ticket_code, title, description, project_id, project_code,
          test_case_id, module, sub_module, test_scenario, test_steps, test_data,
          expected_result, actual_result, severity, priority, category,
          type, status, reporter, raised_by, raised_by_id, raised_at, assigned_to, attachments
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          'Bug', 'Open', $17, $17, $18, CURRENT_TIMESTAMP, 'Project Team', $19
        )
        RETURNING *`,
        [
          ticket_code,
          title.trim(),
          fullDescription,
          project.id,
          project.project_code,
          test_case_id || 'TC-GEN',
          module || 'General',
          sub_module || '',
          test_scenario || title,
          test_steps || '',
          test_data || '',
          expected_result || '',
          actual_result || '',
          severity || 'Medium',
          priority || 'Medium',
          category || 'Functional Bug',
          user.full_name || user.email,
          user.id,
          JSON.stringify(processedAttachments)
        ]
      );

      const createdTicket = insertRes.rows[0];

      // 6. Record in ticket_history
      await logTicketHistory(
        createdTicket.id,
        'Created',
        null,
        'Open',
        user.full_name,
        user.id,
        `Bug ticket raised from failed test case ${test_case_id || ''}.`
      );

      // 7. Increment tickets count on project
      await pool.query('UPDATE projects SET tickets_count = COALESCE(tickets_count, 0) + 1 WHERE id = $1', [project.id]);

      // 8. Notify Project Lead if assigned
      if (project.project_lead_id) {
        await sendInAppNotification(
          project.project_lead_id,
          'New Bug Ticket Raised',
          `Ticket ${ticket_code} raised for failed test case ${test_case_id || ''} in "${project.name}".`,
          'ticket_created',
          `/admin/tickets`
        );
      }

      // 9. Stamp ticket_code onto the test case in project_sheets
      let updatedSheetRows = null;
      if (test_case_id) {
        try {
          const targetTcKey = test_case_id.trim().toLowerCase();
          const targetRowId = req.body.row_id ? String(req.body.row_id).trim().toLowerCase() : '';
          const sheetsRes = await pool.query('SELECT id, rows FROM project_sheets WHERE project_id = $1', [project.id]);
          for (const s of sheetsRes.rows) {
            if (Array.isArray(s.rows)) {
              let found = false;
              const updatedRows = s.rows.map(r => {
                const kCol = String(r.col_id || '').trim().toLowerCase();
                const kId = String(r.id || '').trim().toLowerCase();
                if ((targetTcKey && (kCol === targetTcKey || kId === targetTcKey)) || (targetRowId && (kId === targetRowId || kCol === targetRowId))) {
                  found = true;
                  return {
                    ...r,
                    ticket_code: createdTicket.ticket_code,
                    ticket_id: createdTicket.id,
                    ticket_status: 'Open',
                    ticket_raised_at: new Date().toISOString()
                  };
                }
                return r;
              });
              if (found) {
                await pool.query('UPDATE project_sheets SET rows = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(updatedRows), s.id]);
                if (!updatedSheetRows) updatedSheetRows = updatedRows;
              }
            }
          }
        } catch (stampErr) {
          console.warn('Could not stamp ticket_code onto project_sheets:', stampErr.message);
        }
      }

      res.status(201).json({
        message: 'Bug ticket created successfully under project.',
        ticket: {
          ...createdTicket,
          attachments: processedAttachments
        },
        updatedRows: updatedSheetRows
      });
    } catch (err) {
      console.error('Error creating ticket from test case:', err);
      res.status(500).json({ error: 'Failed to create bug ticket.' });
    }
  });

  // ========================================================
  // 4.1 BULK FAILED & RECOMMENDATION TEST CASES -> PROJECT TICKETS
  // ========================================================
  app.post('/api/admin/tickets/bulk-from-sheet', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const {
      project_id,
      sheet_id,
      sheet_name,
      test_cases
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    try {
      // 1. Fetch project info
      const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [project_id]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ error: 'Project does not exist.' });
      }
      const project = projRes.rows[0];

      // 2. Either use provided test_cases array, or read from project_sheets if sheet_id provided
      let candidateRows = Array.isArray(test_cases) ? test_cases : [];
      if (candidateRows.length === 0 && sheet_id) {
        const sheetRes = await pool.query('SELECT rows FROM project_sheets WHERE id = $1 AND project_id = $2', [sheet_id, project_id]);
        if (sheetRes.rows.length > 0 && Array.isArray(sheetRes.rows[0].rows)) {
          candidateRows = sheetRes.rows[0].rows;
        }
      }

      // Filter candidate rows where status is 'fail', 'failed', or 'recommendation' / 'recommended'
      // If a row ALREADY has ticket_code set, it is ALREADY RAISED and must be excluded!
      const eligibleRows = candidateRows.filter(row => {
        if (row.ticket_code && String(row.ticket_code).trim()) {
          return false;
        }
        let st = '';
        for (const k of Object.keys(row)) {
          if (k.toLowerCase().includes('status')) {
            st = String(row[k] ?? '').toLowerCase().trim();
            if (st) break;
          }
        }
        if (!st) st = String(row.col_status || row.status || '').toLowerCase().trim();
        return st === 'fail' || st === 'failed' || st === 'recommendation' || st === 'recommended';
      });

      if (eligibleRows.length === 0) {
        return res.json({
          message: 'No new unraised failed or recommendation test cases found.',
          createdCount: 0,
          skippedCount: 0,
          tickets: []
        });
      }

      // Check which test cases already have active tickets in this project
      const existingTicketsRes = await pool.query(
        `SELECT id, ticket_code, test_case_id, status FROM tickets 
         WHERE project_id = $1 AND test_case_id IS NOT NULL AND status IN ('Open', 'In Progress', 'Reopened', 'Resolved')`,
        [project_id]
      );
      const existingTcMap = new Map();
      existingTicketsRes.rows.forEach(r => {
        if (r.test_case_id) {
          existingTcMap.set(String(r.test_case_id).trim().toLowerCase(), r);
        }
      });

      const createdTickets = [];
      const tcToTicketMap = new Map();
      let skippedCount = 0;

      for (const tc of eligibleRows) {
        const tcId = (tc.col_id || tc.id || '').trim();
        const tcKey = tcId.toLowerCase();
        const altIdKey = tc.id ? String(tc.id).trim().toLowerCase() : '';
        const altColKey = tc.col_id ? String(tc.col_id).trim().toLowerCase() : '';

        // If an active ticket already exists for this test case, stamp it and skip creating duplicate
        const existingTicket = (tcKey && existingTcMap.get(tcKey)) || (altColKey && existingTcMap.get(altColKey)) || (altIdKey && existingTcMap.get(altIdKey));
        if (existingTicket) {
          skippedCount++;
          const tInfo = {
            ticket_code: existingTicket.ticket_code,
            ticket_id: existingTicket.id,
            ticket_status: existingTicket.status || 'Open',
            ticket_raised_at: new Date().toISOString()
          };
          if (tcKey) tcToTicketMap.set(tcKey, tInfo);
          if (altColKey) tcToTicketMap.set(altColKey, tInfo);
          if (altIdKey) tcToTicketMap.set(altIdKey, tInfo);
          if (tc._rowIndex !== undefined) tcToTicketMap.set(`row_idx_${tc._rowIndex}`, tInfo);
          continue;
        }

        let st = '';
        for (const k of Object.keys(tc)) {
          if (k.toLowerCase().includes('status')) {
            st = String(tc[k] ?? '').toLowerCase().trim();
            if (st) break;
          }
        }
        if (!st) st = String(tc.col_status || tc.status || '').toLowerCase().trim();
        const isRecommendation = st === 'recommendation' || st === 'recommended';

        const ticket_code = await generateBugTicketCode(project.project_code);
        const tcTitle = tc.col_title || tc.title || tc.scenario || 'Test Scenario Execution';
        const title = `[${tcId || 'TC'}] ${tcTitle} - ${isRecommendation ? 'Recommendation' : 'Test Failure'}`;
        const steps = tc.col_steps || tc.steps || tc.test_steps || '1. Navigate to target screen\n2. Execute test case steps\n3. Observe outcome';
        const expected = tc.col_expected || tc.expected || tc.expected_result || 'Expected behavior per specification';
        const actual = tc.col_actual || tc.actual || tc.actual_result || (isRecommendation ? 'QA recommends workflow or UI enhancement.' : 'Test execution resulted in defect or unexpected failure.');
        const moduleName = tc.col_module || tc.module || 'General';

        const fullDesc = `Test Case ID: ${tcId || 'N/A'}\nModule: ${moduleName}\nType: ${isRecommendation ? 'Recommendation' : 'Defect / Failure'}\n\nSteps to Reproduce / Details:\n${steps}\n\nExpected Result:\n${expected}\n\nActual Result:\n${actual}`;

        let processedAttachments = [];
        if (tc.col_screenshot && typeof tc.col_screenshot === 'string' && tc.col_screenshot.trim() !== '') {
          const savedUrl = saveBase64Image(tc.col_screenshot.trim(), `${tcId || 'proof'}.png`);
          if (savedUrl) processedAttachments.push(savedUrl);
        }
        if (Array.isArray(tc.attachments)) {
          for (const a of tc.attachments) {
            const url = typeof a === 'string' ? a : a?.url;
            if (url) {
              const savedUrl = saveBase64Image(url);
              if (savedUrl) processedAttachments.push(savedUrl);
            }
          }
        }

        const insertRes = await pool.query(
          `INSERT INTO tickets (
            ticket_code, title, description, project_id, project_code,
            test_case_id, module, sub_module, test_scenario, test_steps, test_data,
            expected_result, actual_result, severity, priority, category,
            type, status, reporter, raised_by, raised_by_id, raised_at, 
            assigned_to, attachments
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, 'Open', $18, $18, $19, CURRENT_TIMESTAMP,
            $20, $21
          )
          RETURNING *`,
          [
            ticket_code,
            title,
            fullDesc,
            project.id,
            project.project_code,
            tcId || 'TC-GEN',
            moduleName,
            tc.col_submodule || '',
            tcTitle,
            steps,
            tc.col_data || '',
            expected,
            actual,
            tc.col_priority === 'Critical' ? 'Critical' : (tc.col_priority || 'High'),
            tc.col_priority === 'Critical' ? 'Urgent' : (tc.col_priority || 'High'),
            isRecommendation ? 'Quality Recommendation' : 'Functional Bug',
            isRecommendation ? 'Recommendation' : 'Bug',
            user.full_name || user.email,
            user.id,
            'Project Team', // Assigned to the Project Team pool!
            JSON.stringify(processedAttachments)
          ]
        );

        const created = insertRes.rows[0];
        createdTickets.push(created);
        const tInfo = {
          ticket_code: created.ticket_code,
          ticket_id: created.id,
          ticket_status: 'Open',
          ticket_raised_at: new Date().toISOString()
        };
        if (tcKey) tcToTicketMap.set(tcKey, tInfo);
        if (altColKey) tcToTicketMap.set(altColKey, tInfo);
        if (altIdKey) tcToTicketMap.set(altIdKey, tInfo);
        if (tc._rowIndex !== undefined) tcToTicketMap.set(`row_idx_${tc._rowIndex}`, tInfo);

        // Audit Log in ticket_history
        await logTicketHistory(
          created.id,
          'Created',
          null,
          'Open',
          user.full_name,
          user.id,
          `${isRecommendation ? 'Recommendation' : 'Bug'} ticket created via bulk run from sheet "${sheet_name || 'Test Execution Sheet'}".`
        );
      }

      // Update project tickets count
      if (createdTickets.length > 0) {
        await pool.query('UPDATE projects SET tickets_count = COALESCE(tickets_count, 0) + $1 WHERE id = $2', [createdTickets.length, project.id]);

        // In-app notification to Project Lead
        if (project.project_lead_id) {
          await sendInAppNotification(
            project.project_lead_id,
            'Bulk Tickets Generated from Test Sheet',
            `${createdTickets.length} new defect/recommendation tickets generated by ${user.full_name} for "${project.name}". Assigned to Project Team.`,
            'ticket_bulk_created',
            `/admin/tickets`
          );
        }
      }

      // 6. Stamp generated ticket_code directly onto the sheet rows in project_sheets!
      let updatedSheetRows = null;
      if (tcToTicketMap.size > 0) {
        try {
          const currentSheetRes = await pool.query(
            'SELECT id, rows FROM project_sheets WHERE project_id = $1',
            [project.id]
          );
          for (const s of currentSheetRes.rows) {
            if (Array.isArray(s.rows)) {
              let sheetModified = false;
              const stamped = s.rows.map((row, rIdx) => {
                const kCol = String(row.col_id || '').trim().toLowerCase();
                const kId = String(row.id || '').trim().toLowerCase();
                const tInfo = (kCol && tcToTicketMap.get(kCol)) || 
                              (kId && tcToTicketMap.get(kId)) || 
                              tcToTicketMap.get(`row_idx_${rIdx}`);
                if (tInfo) {
                  sheetModified = true;
                  return {
                    ...row,
                    ticket_code: tInfo.ticket_code,
                    ticket_id: tInfo.ticket_id,
                    ticket_status: tInfo.ticket_status,
                    ticket_raised_at: tInfo.ticket_raised_at || new Date().toISOString()
                  };
                }
                return row;
              });
              if (sheetModified) {
                await pool.query('UPDATE project_sheets SET rows = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(stamped), s.id]);
                if (String(s.id) === String(sheet_id) || !updatedSheetRows) {
                  updatedSheetRows = stamped;
                }
              }
            }
          }
        } catch (stampErr) {
          console.warn('Error stamping ticket_code onto project_sheets:', stampErr.message);
        }
      }

      res.status(201).json({
        message: `Successfully created ${createdTickets.length} tickets assigned to the Project Team.${skippedCount > 0 ? ` (${skippedCount} already had active tickets and were skipped).` : ''}`,
        createdCount: createdTickets.length,
        skippedCount,
        tickets: createdTickets,
        updatedRows: updatedSheetRows
      });
    } catch (err) {
      console.error('Error in bulk tickets from sheet:', err);
      res.status(500).json({ error: 'Failed to bulk-generate tickets from sheet.' });
    }
  });

  // Get complete ticket details + history
  app.get('/api/admin/tickets/:id/details', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const ticketRes = await pool.query(
        `SELECT t.*, 
                p.name as project_name, p.lead_name as project_lead_name, p.project_lead_id
         FROM tickets t
         LEFT JOIN projects p ON p.id = t.project_id OR p.project_code = t.project_code
         WHERE t.id = $1`,
        [req.params.id]
      );

      if (ticketRes.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketRes.rows[0];

      // Developer permission check: Developer can only view tickets assigned to them
      if (user.role === 'Developer') {
        const isAssigned = ticket.assigned_developer_id === user.id ||
                           ticket.assigned_to?.toLowerCase() === user.full_name?.toLowerCase() ||
                           ticket.assigned_to?.toLowerCase() === user.email?.toLowerCase();
        if (!isAssigned) {
          return res.status(403).json({ error: 'You are only authorized to view tickets assigned to you.' });
        }
      }

      // Project Lead permission check: Can only view tickets for projects assigned to them
      if (user.role === 'Project Lead') {
        const isLead = ticket.project_lead_id === user.id || ticket.project_lead_name?.toLowerCase() === user.full_name?.toLowerCase();
        if (!isLead && ticket.project_id) {
          return res.status(403).json({ error: 'You are only authorized to view tickets for your assigned projects.' });
        }
      }

      // Fetch history
      const historyRes = await pool.query(
        `SELECT * FROM ticket_history WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );

      // Parse attachments safely
      let parsedAttachments = [];
      try {
        parsedAttachments = typeof ticket.attachments === 'string' ? JSON.parse(ticket.attachments) : (ticket.attachments || []);
      } catch (e) {
        parsedAttachments = [];
      }

      let parsedResAttachments = [];
      try {
        parsedResAttachments = typeof ticket.resolution_attachments === 'string' ? JSON.parse(ticket.resolution_attachments) : (ticket.resolution_attachments || []);
      } catch (e) {
        parsedResAttachments = [];
      }

      res.json({
        ...ticket,
        attachments: parsedAttachments,
        resolution_attachments: parsedResAttachments,
        history: historyRes.rows
      });
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      res.status(500).json({ error: 'Failed to fetch ticket details.' });
    }
  });

  // Assign Developer to Ticket (Project Lead or Manager action)
  app.put('/api/admin/tickets/:id/assign-developer', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const ticketId = req.params.id;
    const { developer_id, notes } = req.body;

    try {
      const ticketRes = await pool.query(
        `SELECT t.*, p.name as project_name, p.project_lead_id, p.lead_name 
         FROM tickets t 
         LEFT JOIN projects p ON p.id = t.project_id 
         WHERE t.id = $1`,
        [ticketId]
      );
      if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketRes.rows[0];

      // Permission check: Project Lead or Manager
      if (user.role === 'Project Lead') {
        if (ticket.project_lead_id !== user.id && ticket.lead_name?.toLowerCase() !== user.full_name?.toLowerCase()) {
          return res.status(403).json({ error: 'You can only assign tickets for projects assigned to you.' });
        }
      } else if (!['Manager', 'QA Lead', 'Super Admin'].includes(user.role)) {
        return res.status(403).json({ error: 'Not authorized to assign developers to tickets.' });
      }

      let devUser = null;
      if (developer_id) {
        const devRes = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [developer_id]);
        if (devRes.rows.length === 0) return res.status(404).json({ error: 'Developer not found.' });
        devUser = devRes.rows[0];
      }

      const prevAssigned = ticket.assigned_to || 'Unassigned';
      const newAssignedName = devUser ? devUser.full_name : 'Unassigned';

      const updateRes = await pool.query(
        `UPDATE tickets 
         SET assigned_developer_id = $1, 
             assigned_developer_name = $2, 
             assigned_developer_email = $3,
             assigned_to = $2,
             assigned_by = $4,
             assigned_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [devUser ? devUser.id : null, newAssignedName, devUser ? devUser.email : null, user.full_name, ticketId]
      );

      // Log in history
      await logTicketHistory(
        ticketId,
        'Assigned Developer',
        ticket.status,
        ticket.status,
        user.full_name,
        user.id,
        devUser ? `Assigned to developer ${devUser.full_name}. ${notes || ''}` : 'Unassigned developer.'
      );

      // Send notification to developer
      if (devUser) {
        await sendInAppNotification(
          devUser.id,
          'Ticket Assigned',
          `Bug ticket ${ticket.ticket_code} ("${ticket.title}") has been assigned to you.`,
          'ticket_assigned',
          `/developer`
        );
      }

      res.json({
        message: 'Developer assigned to ticket successfully.',
        ticket: updateRes.rows[0]
      });
    } catch (err) {
      console.error('Error assigning developer to ticket:', err);
      res.status(500).json({ error: 'Failed to assign developer to ticket.' });
    }
  });

  // Developer starts working on ticket
  app.put('/api/admin/tickets/:id/start-progress', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const ticketId = req.params.id;

    try {
      const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
      if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketRes.rows[0];

      const prevStatus = ticket.status;
      const updateRes = await pool.query(
        `UPDATE tickets 
         SET status = 'In Progress',
             assigned_to = COALESCE(NULLIF(assigned_to, 'Unassigned'), $2),
             assigned_developer_id = COALESCE(assigned_developer_id, $3),
             assigned_developer_name = COALESCE(assigned_developer_name, $2),
             assigned_developer_email = COALESCE(assigned_developer_email, $4),
             assigned_by = COALESCE(assigned_by, $2),
             assigned_at = COALESCE(assigned_at, CURRENT_TIMESTAMP)
         WHERE id = $1 
         RETURNING *`,
        [ticketId, user.full_name, user.id, user.email]
      );

      await logTicketHistory(
        ticketId,
        'Status Changed',
        prevStatus,
        'In Progress',
        user.full_name,
        user.id,
        'Developer marked ticket as In Progress.'
      );

      res.json({ message: 'Ticket moved to In Progress.', ticket: updateRes.rows[0] });
    } catch (err) {
      console.error('Error updating ticket progress:', err);
      res.status(500).json({ error: 'Failed to start ticket progress.' });
    }
  });

  // Developer claims real-time exclusive lock to resolve ticket (Intimates & locks out other developers)
  app.post('/api/admin/tickets/:id/lock', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const ticketId = req.params.id;
    try {
      const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
      if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found.' });
      const ticket = ticketRes.rows[0];

      // If already locked by ANOTHER developer within the last 15 minutes, prevent collision
      const isLockedByOther = ticket.locked_by_id && 
                              Number(ticket.locked_by_id) !== Number(user.id) && 
                              ticket.locked_at && 
                              (Date.now() - new Date(ticket.locked_at).getTime() < 15 * 60 * 1000);

      if (isLockedByOther) {
        return res.status(423).json({
          error: `Ticket is currently being resolved by ${ticket.locked_by}. Please wait or coordinate with them.`,
          locked_by: ticket.locked_by,
          locked_by_id: ticket.locked_by_id,
          locked_at: ticket.locked_at
        });
      }

      // Lock ticket for this developer and move to In Progress if currently Open
      const updateRes = await pool.query(
        `UPDATE tickets 
         SET locked_by = $1, 
             locked_by_id = $2, 
             locked_at = CURRENT_TIMESTAMP,
             status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END
         WHERE id = $3
         RETURNING *`,
        [user.full_name, user.id, ticketId]
      );

      const lockedTicket = updateRes.rows[0];

      // Broadcast real-time lock across WebSocket
      if (io) {
        io.emit('ticket_lock_changed', {
          ticketId,
          locked_by: user.full_name,
          locked_by_id: user.id,
          locked_at: lockedTicket.locked_at,
          status: lockedTicket.status
        });
      }

      res.json({
        message: `Ticket locked by ${user.full_name}.`,
        ticket: lockedTicket
      });
    } catch (err) {
      console.error('Error locking ticket:', err);
      res.status(500).json({ error: 'Failed to claim ticket lock.' });
    }
  });

  // Release lock on ticket (e.g. developer cancelled or closed resolution form)
  app.post('/api/admin/tickets/:id/unlock', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const ticketId = req.params.id;
    try {
      const updateRes = await pool.query(
        `UPDATE tickets 
         SET locked_by = NULL, locked_by_id = NULL, locked_at = NULL 
         WHERE id = $1
         RETURNING *`,
        [ticketId]
      );

      if (io) {
        io.emit('ticket_lock_changed', {
          ticketId,
          locked_by: null,
          locked_by_id: null,
          locked_at: null
        });
      }

      res.json({ message: 'Ticket lock released.', ticket: updateRes.rows[0] });
    } catch (err) {
      console.error('Error unlocking ticket:', err);
      res.status(500).json({ error: 'Failed to release ticket lock.' });
    }
  });

  // Developer resolves bug ticket (Mandatory resolution form)
  app.put('/api/admin/tickets/:id/resolve', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const ticketId = req.params.id;
    const {
      resolution_description,
      root_cause,
      fix_implemented,
      files_changed,
      resolution_remarks,
      resolution_attachments
    } = req.body;

    // Enforce mandatory resolution fields
    if (!resolution_description?.trim() || !root_cause?.trim() || !fix_implemented?.trim() || !resolution_remarks?.trim()) {
      return res.status(400).json({
        error: 'Mandatory resolution details missing: Description, Root Cause, Fix Implemented, and Remarks are required.'
      });
    }

    try {
      const ticketRes = await pool.query(
        `SELECT t.*, p.project_lead_id, p.name as project_name 
         FROM tickets t 
         LEFT JOIN projects p ON p.id = t.project_id 
         WHERE t.id = $1`,
        [ticketId]
      );
      if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketRes.rows[0];

      // Save resolution attachments if any
      let processedResAttachments = [];
      if (Array.isArray(resolution_attachments)) {
        for (const item of resolution_attachments) {
          if (typeof item === 'string') {
            const savedUrl = saveBase64Image(item, 'fix-evidence.png');
            if (savedUrl) processedResAttachments.push(savedUrl);
          } else if (item?.url) {
            const savedUrl = saveBase64Image(item.url, item.name || 'fix-evidence.png');
            if (savedUrl) processedResAttachments.push(savedUrl);
          }
        }
      }

      const updateRes = await pool.query(
        `UPDATE tickets
         SET status = 'Resolved',
             resolution_description = $1,
             root_cause = $2,
             fix_implemented = $3,
             files_changed = $4,
             resolution_remarks = $5,
             resolution_attachments = $6,
             resolved_by = $7,
             resolved_by_id = $8,
             resolved_at = CURRENT_TIMESTAMP,
             assigned_to = COALESCE(NULLIF(assigned_to, 'Unassigned'), $7),
             assigned_developer_id = COALESCE(assigned_developer_id, $8),
             assigned_developer_name = COALESCE(assigned_developer_name, $7),
             assigned_developer_email = COALESCE(assigned_developer_email, $10),
             locked_by = NULL,
             locked_by_id = NULL,
             locked_at = NULL
         WHERE id = $9
         RETURNING *`,
        [
          resolution_description.trim(),
          root_cause.trim(),
          fix_implemented.trim(),
          files_changed || '',
          resolution_remarks.trim(),
          JSON.stringify(processedResAttachments),
          user.full_name,
          user.id,
          ticketId,
          user.email
        ]
      );

      if (io) {
        io.emit('ticket_lock_changed', {
          ticketId,
          locked_by: null,
          locked_by_id: null,
          locked_at: null,
          status: 'Resolved'
        });
      }

      // Log in history
      await logTicketHistory(
        ticketId,
        'Resolved (Ready for QA)',
        ticket.status,
        'Resolved',
        user.full_name,
        user.id,
        `Developer resolved ticket. Root cause: ${root_cause.substring(0, 100)}...`
      );

      // Notify Project Lead and QA
      if (ticket.project_lead_id) {
        await sendInAppNotification(
          ticket.project_lead_id,
          'Ticket Resolved - Ready for QA',
          `Developer ${user.full_name} resolved ticket ${ticket.ticket_code}. Ready for verification.`,
          'ticket_resolved',
          `/admin/tickets`
        );
      }
      if (ticket.raised_by_id) {
        await sendInAppNotification(
          ticket.raised_by_id,
          'Ticket Resolved - Ready for QA',
          `Your reported bug ${ticket.ticket_code} has been resolved and is ready for re-testing.`,
          'ticket_resolved',
          `/admin/tickets`
        );
      }

      res.json({
        message: 'Resolution submitted successfully. Ticket is now pending QA verification.',
        ticket: {
          ...updateRes.rows[0],
          resolution_attachments: processedResAttachments
        }
      });
    } catch (err) {
      console.error('Error resolving ticket:', err);
      res.status(500).json({ error: 'Failed to submit resolution.' });
    }
  });

  // QA Verification: Approve & Close OR Reopen ticket
  app.put('/api/admin/tickets/:id/verify-qa', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // Developer cannot verify/close ticket
    if (user.role === 'Developer') {
      return res.status(403).json({ error: 'Developers cannot verify or close tickets. A QA Member or Lead must perform verification.' });
    }

    const ticketId = req.params.id;
    const { action, reopen_comments } = req.body; // 'approve' | 'reopen'

    if (!['approve', 'reopen'].includes(action)) {
      return res.status(400).json({ error: 'Invalid verification action. Choose "approve" or "reopen".' });
    }

    if (action === 'reopen' && (!reopen_comments || !reopen_comments.trim())) {
      return res.status(400).json({ error: 'Reopening comments are mandatory when rejecting a resolution.' });
    }

    try {
      const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
      if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketRes.rows[0];

      if (action === 'approve') {
        const updateRes = await pool.query(
          `UPDATE tickets 
           SET status = 'Closed', 
               closed_by = $1, 
               closed_by_id = $2, 
               closed_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [user.full_name, user.id, ticketId]
        );

        await logTicketHistory(
          ticketId,
          'Closed',
          ticket.status,
          'Closed',
          user.full_name,
          user.id,
          'QA verified and approved the fix. Ticket closed successfully.'
        );

        // Notify developer
        if (ticket.assigned_developer_id) {
          await sendInAppNotification(
            ticket.assigned_developer_id,
            'Ticket Verified & Closed',
            `Ticket ${ticket.ticket_code} has been verified and successfully closed by ${user.full_name}.`,
            'ticket_closed',
            `/developer`
          );
        }

        res.json({ message: 'Ticket successfully verified and closed.', ticket: updateRes.rows[0] });
      } else {
        // Reopen
        const updateRes = await pool.query(
          `UPDATE tickets 
           SET status = 'Reopened', 
               reopened_by = $1, 
               reopened_at = CURRENT_TIMESTAMP,
               reopen_comments = $2
           WHERE id = $3
           RETURNING *`,
          [user.full_name, reopen_comments.trim(), ticketId]
        );

        await logTicketHistory(
          ticketId,
          'Reopened',
          ticket.status,
          'Reopened',
          user.full_name,
          user.id,
          `QA rejected fix: ${reopen_comments.trim()}`
        );

        // Notify developer
        if (ticket.assigned_developer_id) {
          await sendInAppNotification(
            ticket.assigned_developer_id,
            'Ticket Reopened by QA',
            `Ticket ${ticket.ticket_code} was reopened with comments: "${reopen_comments.trim()}".`,
            'ticket_reopened',
            `/developer`
          );
        }

        res.json({ message: 'Ticket has been reopened and returned to developer.', ticket: updateRes.rows[0] });
      }
    } catch (err) {
      console.error('Error during QA verification:', err);
      res.status(500).json({ error: 'Failed to process QA verification.' });
    }
  });

  // ==========================================
  // 5. PROJECT LEAD DASHBOARD STATS
  // ==========================================
  app.get('/api/project-lead/dashboard-stats', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      // Find all projects where this user is the Project Lead (or all projects if manager)
      const leadFilter = (user.role === 'Manager' || user.role === 'QA Lead' || user.role === 'Super Admin')
        ? '1=1'
        : `(p.project_lead_id = ${user.id} OR LOWER(p.lead_name) = '${user.full_name.toLowerCase().replace(/'/g, "''")}')`;

      const projectsRes = await pool.query(
        `SELECT p.id, p.project_code, p.name, p.status, p.progress, p.priority, p.lead_name,
                COALESCE((SELECT COUNT(*) FROM project_sheets WHERE project_id = p.id), 0) as sheets_count,
                COALESCE((SELECT COUNT(*) FROM project_developer_assignments WHERE project_id = p.id AND status = 'Active'), 0) as assigned_devs_count,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id), 0) as tickets_count,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status = 'Open'), 0) as open_tickets,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status = 'In Progress'), 0) as in_progress_tickets,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status = 'Resolved'), 0) as resolved_tickets,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status = 'Closed'), 0) as closed_tickets,
                COALESCE((SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status = 'Reopened'), 0) as reopened_tickets
         FROM projects p
         WHERE ${leadFilter}
         ORDER BY p.id ASC`
      );

      const projects = projectsRes.rows;
      const projectIds = projects.map(p => p.id);

      // Aggregate test cases across all sheets for these projects
      let totalTestCases = 0;
      let passedTestCases = 0;
      let failedTestCases = 0;
      let blockedTestCases = 0;
      let inProgressTestCases = 0;

      if (projectIds.length > 0) {
        const sheetsRes = await pool.query(
          `SELECT rows FROM project_sheets WHERE project_id = ANY($1::int[])`,
          [projectIds]
        );

        for (const sheet of sheetsRes.rows) {
          const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
          for (const row of rows) {
            totalTestCases++;
            const st = String(row.col_status || row.status || '').toLowerCase().trim();
            if (st === 'pass' || st === 'passed') passedTestCases++;
            else if (st === 'fail' || st === 'failed') failedTestCases++;
            else if (st === 'blocked') blockedTestCases++;
            else if (st === 'in progress' || st === 'inprogress') inProgressTestCases++;
          }
        }
      }

      // Aggregate ticket numbers
      const totalBugTickets = projects.reduce((acc, p) => acc + parseInt(p.tickets_count, 10), 0);
      const openTickets = projects.reduce((acc, p) => acc + parseInt(p.open_tickets, 10), 0);
      const inProgressTickets = projects.reduce((acc, p) => acc + parseInt(p.in_progress_tickets, 10), 0);
      const resolvedTickets = projects.reduce((acc, p) => acc + parseInt(p.resolved_tickets, 10), 0);
      const closedTickets = projects.reduce((acc, p) => acc + parseInt(p.closed_tickets, 10), 0);
      const reopenedTickets = projects.reduce((acc, p) => acc + parseInt(p.reopened_tickets, 10), 0);
      const totalSheets = projects.reduce((acc, p) => acc + parseInt(p.sheets_count, 10), 0);

      res.json({
        summary: {
          totalAssignedProjects: projects.length,
          totalTestCases,
          passedTestCases,
          failedTestCases,
          blockedTestCases,
          inProgressTestCases,
          totalSheets,
          totalBugTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          reopenedTickets
        },
        projects
      });
    } catch (err) {
      console.error('Error fetching project lead stats:', err);
      res.status(500).json({ error: 'Failed to fetch project lead dashboard stats.' });
    }
  });

  // ==========================================
  // 6. DEVELOPER DASHBOARD STATS
  // ==========================================
  app.get('/api/developer/dashboard-stats', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      // 1. Projects assigned to developer
      const projectsRes = await pool.query(
        `SELECT p.id, p.project_code, p.name, p.status, p.progress, p.lead_name,
                pda.assigned_at
         FROM projects p
         JOIN project_developer_assignments pda ON pda.project_id = p.id
         WHERE pda.developer_id = $1 AND pda.status = 'Active'
         ORDER BY pda.assigned_at DESC`,
        [user.id]
      );

      // 2. Tickets assigned to developer OR for projects developer is allocated to
      const ticketsRes = await pool.query(
        `SELECT t.*, p.name as project_name
         FROM tickets t
         LEFT JOIN projects p ON p.id = t.project_id OR p.project_code = t.project_code
         WHERE (t.assigned_developer_id = $1 
            OR LOWER(t.assigned_to) = LOWER($2) 
            OR LOWER(t.assigned_to) = LOWER($3)
            OR t.project_id IN (SELECT project_id FROM project_developer_assignments WHERE developer_id = $1))
         ORDER BY t.id DESC`,
        [user.id, user.full_name, user.email]
      );

      const tickets = ticketsRes.rows.map(row => ({
        ...row,
        attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : (row.attachments || [])
      }));

      const openTickets = tickets.filter(t => t.status === 'Open').length;
      const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
      const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;
      const reopenedTickets = tickets.filter(t => t.status === 'Reopened').length;
      const closedTickets = tickets.filter(t => t.status === 'Closed').length;

      res.json({
        summary: {
          assignedProjectsCount: projectsRes.rows.length,
          totalAssignedTickets: tickets.length,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          reopenedTickets,
          closedTickets
        },
        projects: projectsRes.rows,
        tickets
      });
    } catch (err) {
      console.error('Error fetching developer stats:', err);
      res.status(500).json({ error: 'Failed to fetch developer stats.' });
    }
  });

  // ==========================================
  // 7. IN-APP NOTIFICATIONS
  // ==========================================
  app.get('/api/notifications', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 30`,
        [user.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
        [req.params.id, user.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });
}

