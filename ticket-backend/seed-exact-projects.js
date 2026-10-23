import pool from './db.js';

export const seedExactProjects = async () => {
  try {
    // 1. Ensure table and columns exist
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

    // Ensure all columns exist
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_cases INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS documents INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS tickets_count INT DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_members INT DEFAULT 4;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_color VARCHAR(50) DEFAULT 'blue';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_icon VARCHAR(50) DEFAULT 'folder';
    `);

    // Clear and re-seed the exact projects from the design screenshot
    await pool.query('TRUNCATE TABLE projects RESTART IDENTITY CASCADE');

    const exactProjects = [
      {
        project_code: 'PRJ-PORTAL-03',
        name: 'Customer Support Portal',
        description: 'Self-service customer support ticketing and knowledge base platform',
        department: 'Operations',
        lead_name: 'Manikandan',
        status: 'Active',
        priority: 'High',
        progress: 65,
        start_date: '2026-10-12',
        end_date: '2026-11-20',
        test_cases: 24,
        documents: 8,
        tickets_count: 6,
        team_members: 5,
        folder_color: 'blue',
        folder_icon: 'CS'
      },
      {
        project_code: 'PRJ-CORE-02',
        name: 'Ticketing API Service',
        description: 'Core REST microservices gateway for high throughput ticket dispatch',
        department: 'Engineering',
        lead_name: 'Karthikeyan',
        status: 'In Progress',
        priority: 'Critical',
        progress: 50,
        start_date: '2026-10-10',
        end_date: '2026-11-15',
        test_cases: 18,
        documents: 5,
        tickets_count: 12,
        team_members: 4,
        folder_color: 'purple',
        folder_icon: 'API'
      },
      {
        project_code: 'PRJ-QA-01',
        name: 'Automation Test Suite V2',
        description: 'End-to-end regression and UI test automation framework',
        department: 'Quality Assurance',
        lead_name: 'Santhosh',
        status: 'Planning',
        priority: 'Medium',
        progress: 20,
        start_date: '2026-10-09',
        end_date: '2026-11-30',
        test_cases: 10,
        documents: 5,
        tickets_count: 13,
        team_members: 3,
        folder_color: 'amber',
        folder_icon: 'settings'
      },
      {
        project_code: 'PRJ-VENDOR-04',
        name: 'Vendor Management System',
        description: 'Procurement tracking, supplier scoring, and compliance portal',
        department: 'Operations',
        lead_name: 'Deepak Kumar',
        status: 'Active',
        priority: 'High',
        progress: 75,
        start_date: '2026-10-08',
        end_date: '2026-11-10',
        test_cases: 32,
        documents: 11,
        tickets_count: 9,
        team_members: 6,
        folder_color: 'pink',
        folder_icon: 'cart'
      },
      {
        project_code: 'PRJ-HR-05',
        name: 'HR Management',
        description: 'Employee onboarding, appraisals, and leaves management suite',
        department: 'Human Resources',
        lead_name: 'Pavishek',
        status: 'Not Started',
        priority: 'Medium',
        progress: 0,
        start_date: '2026-10-06',
        end_date: '2026-11-25',
        test_cases: 0,
        documents: 3,
        tickets_count: 0,
        team_members: 4,
        folder_color: 'teal',
        folder_icon: 'graduation'
      },
      {
        project_code: 'PRJ-FIN-07',
        name: 'Finance Management',
        description: 'Multi-currency invoicing, tax auditing, and ledger reporting engine',
        department: 'Finance',
        lead_name: 'Varhun',
        status: 'In Progress',
        priority: 'High',
        progress: 40,
        start_date: '2026-10-04',
        end_date: '2026-11-18',
        test_cases: 8,
        documents: 6,
        tickets_count: 5,
        team_members: 4,
        folder_color: 'violet',
        folder_icon: 'building'
      },
      {
        project_code: 'PRJ-SEC-06',
        name: 'Cloud Security Gateway',
        description: 'Zero-trust network access, audit logs, and IAM enforcement service',
        department: 'Engineering',
        lead_name: 'Arun Kumar',
        status: 'In Progress',
        priority: 'Critical',
        progress: 35,
        start_date: '2026-10-02',
        end_date: '2026-11-28',
        test_cases: 15,
        documents: 7,
        tickets_count: 4,
        team_members: 5,
        folder_color: 'blue',
        folder_icon: 'shield'
      },
      {
        project_code: 'PRJ-CRM-08',
        name: 'Enterprise CRM Migration',
        description: 'Legacy customer data pipelines, sync agents, and reporting dashboards',
        department: 'Operations',
        lead_name: 'Priya Raj',
        status: 'Completed',
        priority: 'Medium',
        progress: 100,
        start_date: '2026-09-15',
        end_date: '2026-10-01',
        test_cases: 42,
        documents: 14,
        tickets_count: 1,
        team_members: 6,
        folder_color: 'emerald',
        folder_icon: 'check'
      }
    ];

    for (const p of exactProjects) {
      await pool.query(
        `INSERT INTO projects (
          project_code, name, description, department, lead_name, status, 
          priority, progress, start_date, end_date, test_cases, documents, 
          tickets_count, team_members, folder_color, folder_icon
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          p.project_code,
          p.name,
          p.description,
          p.department,
          p.lead_name,
          p.status,
          p.priority,
          p.progress,
          p.start_date,
          p.end_date,
          p.test_cases,
          p.documents,
          p.tickets_count,
          p.team_members,
          p.folder_color,
          p.folder_icon
        ]
      );
    }

    console.log(`Successfully seeded ${exactProjects.length} exact projects matching the UI screenshot!`);
  } catch (error) {
    console.error('Error seeding exact projects:', error);
    throw error;
  }
};

if (process.argv[1]?.endsWith('seed-exact-projects.js')) {
  seedExactProjects()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
