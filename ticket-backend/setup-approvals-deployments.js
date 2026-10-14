import pool from './db.js';

const setupRemainingTables = async () => {
  try {
    // 1. Approvals Table
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

    // 2. Deployments Table
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

    // Seed sample Approvals if empty
    const appCount = await pool.query('SELECT COUNT(*) FROM approvals');
    if (parseInt(appCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO approvals (req_code, title, category, requested_by, priority, status, details)
        VALUES 
          ('REQ-401', 'Elevate to QA Lead permissions for test cycle', 'Permission Change', 'John Doe', 'High', 'Pending', 'Requires access to approve release test runs for Q3 release.'),
          ('REQ-402', 'Deploy Cypress runner to AWS staging cluster', 'Resource Allocation', 'Admin User', 'Critical', 'Approved', 'Runner capacity needed for regression suite parallel execution.'),
          ('REQ-403', 'Database snapshot export for compliance audit', 'Data Access', 'Super Admin', 'Medium', 'Pending', 'Semi-annual QA security review audit extract.');
      `);
      console.log('Seeded sample approvals.');
    }

    // Seed sample Deployments if empty
    const depCount = await pool.query('SELECT COUNT(*) FROM deployments');
    if (parseInt(depCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO deployments (deploy_code, service_name, environment, version, requested_by, status, release_notes)
        VALUES 
          ('DEP-801', 'Ticketing API Gateway', 'Production', 'v2.4.0', 'Admin User', 'Pending Review', 'Critical hotfix for session token validation and database pool sizing.'),
          ('DEP-802', 'QA Automation Runner Service', 'Staging', 'v1.12.3', 'Super Admin', 'Approved', 'Upgrades Playwright runner to Chromium 128 with test retry improvements.'),
          ('DEP-803', 'Customer Support Portal UI', 'Production', 'v3.0.1', 'Admin User', 'Deployed', 'Client ticket upload view with department filtering.');
      `);
      console.log('Seeded sample deployments.');
    }

    console.log('Approvals and Deployments tables setup completed successfully!');
  } catch (error) {
    console.error('Error setting up approvals and deployments:', error);
  } finally {
    await pool.end();
  }
};

setupRemainingTables();
