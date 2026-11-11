/**
 * Shared helpers for counting written test case rows in `project_sheets`
 * and synchronizing `projects.test_cases` in PostgreSQL.
 */

const ROW_METADATA_KEYS = new Set([
  'id',
  'ticket_id',
  'ticket_code',
  'ticket_status',
  'ticket_raised_at',
  'formatting',
  '_rowIndex'
]);

const DEFAULT_STATUS_PLACEHOLDER = 'untested';

/**
 * Identifies untouched starter template stub rows previously created when adding a new tab.
 */
const isUntouchedStarterStub = (row) => {
  const status = String(row.col_status ?? '').trim().toLowerCase();
  if (status && status !== DEFAULT_STATUS_PLACEHOLDER) {
    return false;
  }
  if (
    row.id === 'row-1' &&
    String(row.col_a ?? '') === '01' &&
    String(row.col_b ?? '') === 'Sample row entry' &&
    String(row.col_c ?? '') === 'General'
  ) {
    return true;
  }
  if (
    (row.id === 'row-2' && String(row.col_a ?? '') === '02') ||
    (row.id === 'row-3' && String(row.col_a ?? '') === '03')
  ) {
    return String(row.col_b ?? '').trim() === '' && String(row.col_c ?? '').trim() === '';
  }
  return false;
};

/**
 * Safely parses a JSONB column or stringified JSON value into an array.
 */
export const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Returns true if a sheet row contains at least one written cell value
 * (ignoring row metadata keys, whitespace-only values, and lone default 'Untested' statuses).
 */
export const isWrittenTestCaseRow = (row, columns = []) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return false;
  }
  if (isUntouchedStarterStub(row)) {
    return false;
  }

  const parsedCols = parseJsonArray(columns);
  const statusColIds = new Set(['col_status', 'status']);
  const candidateKeys = new Set();

  for (const col of parsedCols) {
    if (!col || !col.id || ROW_METADATA_KEYS.has(col.id)) continue;
    candidateKeys.add(col.id);
    if (col.type === 'status') {
      statusColIds.add(col.id);
    }
  }

  for (const key of Object.keys(row)) {
    if (!ROW_METADATA_KEYS.has(key)) {
      candidateKeys.add(key);
    }
  }

  for (const key of candidateKeys) {
    const rawVal = row[key];
    if (rawVal === null || rawVal === undefined) continue;
    const text = String(rawVal).trim();
    if (!text) continue;
    if (statusColIds.has(key) && text.toLowerCase() === DEFAULT_STATUS_PLACEHOLDER) {
      continue;
    }
    return true;
  }

  return false;
};

/**
 * Filters a project_sheets record down to its written test case rows.
 */
export const getWrittenTestCaseRows = (sheet) => {
  if (!sheet) return [];
  const columns = parseJsonArray(sheet.columns);
  const rows = parseJsonArray(sheet.rows);
  return rows.filter((row) => isWrittenTestCaseRow(row, columns));
};

/**
 * Counts written test cases within a single sheet object.
 */
export const countWrittenTestCasesInSheet = (sheet) => {
  return getWrittenTestCaseRows(sheet).length;
};

/**
 * Batch-computes total written test case counts across all sheets per project_id.
 */
export const countWrittenTestCasesByProject = async (pool, projectIds) => {
  const countsMap = new Map();
  const numericIds = Array.from(
    new Set(
      (projectIds || [])
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  for (const id of numericIds) {
    countsMap.set(id, 0);
  }

  if (numericIds.length === 0) {
    return countsMap;
  }

  const sheetsRes = await pool.query(
    'SELECT project_id, columns, rows FROM project_sheets WHERE project_id = ANY($1::int[])',
    [numericIds]
  );

  for (const sheet of sheetsRes.rows) {
    const pid = parseInt(sheet.project_id, 10);
    const prev = countsMap.get(pid) || 0;
    countsMap.set(pid, prev + countWrittenTestCasesInSheet(sheet));
  }

  return countsMap;
};

/**
 * Recomputes written test cases for a project and persists `projects.test_cases`.
 */
export const syncProjectTestCasesCount = async (pool, projectId) => {
  const pid = parseInt(projectId, 10);
  if (!Number.isInteger(pid) || pid <= 0) return 0;

  const sheetsRes = await pool.query(
    'SELECT columns, rows FROM project_sheets WHERE project_id = $1',
    [pid]
  );

  let total = 0;
  for (const sheet of sheetsRes.rows) {
    total += countWrittenTestCasesInSheet(sheet);
  }

  await pool.query(
    'UPDATE projects SET test_cases = $1 WHERE id = $2',
    [total, pid]
  );

  return total;
};

/**
 * Synchronizes `projects.test_cases` for all projects against their `project_sheets`.
 */
export const backfillAllProjectTestCasesCounts = async (pool) => {
  const projRes = await pool.query('SELECT id, COALESCE(test_cases, 0) AS test_cases FROM projects');
  const projectIds = projRes.rows.map((p) => p.id);
  const countsMap = await countWrittenTestCasesByProject(pool, projectIds);

  for (const proj of projRes.rows) {
    const computed = countsMap.get(proj.id) || 0;
    const stored = parseInt(proj.test_cases, 10) || 0;
    if (computed !== stored) {
      await pool.query('UPDATE projects SET test_cases = $1 WHERE id = $2', [computed, proj.id]);
    }
  }
};
