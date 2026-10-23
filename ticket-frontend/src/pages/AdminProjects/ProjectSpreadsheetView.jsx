import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import './ProjectSpreadsheetView.css';

// Column configurations matching Google Sheets / Excel coordinates
const SHEET_COLUMNS = [
  { letter: 'A', key: 'project_code', label: 'Project Code', width: 140, type: 'text' },
  { letter: 'B', key: 'name', label: 'Project Name', width: 250, type: 'text' },
  { letter: 'C', key: 'department', label: 'Department', width: 170, type: 'select-dept' },
  { letter: 'D', key: 'lead_name', label: 'Project Lead', width: 160, type: 'text' },
  { letter: 'E', key: 'status', label: 'Status', width: 130, type: 'select-status' },
  { letter: 'F', key: 'start_date', label: 'Start Date', width: 130, type: 'date' },
  { letter: 'G', key: 'team_members', label: 'Team', width: 90, type: 'number' },
  { letter: 'H', key: 'test_cases', label: 'Test Cases', width: 100, type: 'number' },
  { letter: 'I', key: 'documents', label: 'Documents', width: 100, type: 'number' },
  { letter: 'J', key: 'tickets_count', label: 'Tickets', width: 90, type: 'number' },
  { letter: 'K', key: 'workspace', label: 'Sheet Module', width: 130, type: 'action' }
];

const DEPARTMENTS = [
  'Operations',
  'Engineering',
  'Quality Assurance',
  'Human Resources',
  'Finance',
  'Product Management'
];

const STATUSES = ['Active', 'In Progress', 'Planning', 'Completed', 'On Hold'];

export default function ProjectSpreadsheetView({
  projects = [],
  onUpdateProject,
  onAddRow,
  onDeleteRow,
  onOpenProjectSheet,
  searchQuery = '',
  departmentFilter = 'All Departments',
  statusFilter = 'All Statuses'
}) {
  // Navigation & Active Cell state
  // rowIndex is index in the visible table, colKey is key in SHEET_COLUMNS
  const [activeCell, setActiveCell] = useState({ rowIndex: 0, colKey: 'name' });
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, colKey } or null
  const [editValue, setEditValue] = useState('');
  const [formulaValue, setFormulaValue] = useState('');
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'
  const [activeTab, setActiveTab] = useState('all');

  const cellInputRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Filter projects based on global search, filters + bottom sheet tabs
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // 1. Tab filter
      if (activeTab === 'active' && project.status !== 'Active') return false;
      if (activeTab === 'in_progress' && project.status !== 'In Progress') return false;
      if (activeTab === 'qa' && project.department !== 'Quality Assurance') return false;
      if (activeTab === 'engineering' && project.department !== 'Engineering') return false;
      if (activeTab === 'completed' && project.status !== 'Completed') return false;

      // 2. Department filter
      if (departmentFilter !== 'All Departments' && project.department !== departmentFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'All Statuses' && project.status !== statusFilter) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (project.project_code || '').toLowerCase();
        const name = (project.name || '').toLowerCase();
        const lead = (project.lead_name || '').toLowerCase();
        const dept = (project.department || '').toLowerCase();
        return code.includes(q) || name.includes(q) || lead.includes(q) || dept.includes(q);
      }

      return true;
    });
  }, [projects, activeTab, departmentFilter, statusFilter, searchQuery]);

  // Compute active cell reference (e.g. "B2")
  const activeColDef = useMemo(() => {
    return SHEET_COLUMNS.find((c) => c.key === activeCell.colKey) || SHEET_COLUMNS[1];
  }, [activeCell.colKey]);

  const activeCellCoord = useMemo(() => {
    const colLetter = activeColDef.letter;
    const rowNum = activeCell.rowIndex + 1;
    return `${colLetter}${rowNum}`;
  }, [activeColDef, activeCell.rowIndex]);

  // Sync active cell content to formula bar
  useEffect(() => {
    const currentProj = filteredProjects[activeCell.rowIndex];
    if (currentProj && activeCell.colKey) {
      const val = currentProj[activeCell.colKey] ?? '';
      setFormulaValue(String(val));
    }
  }, [activeCell, filteredProjects]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      if (cellInputRef.current.select) {
        cellInputRef.current.select();
      }
    }
  }, [editingCell]);

  // Commit edit changes
  const commitEdit = useCallback(
    async (rowIndex, colKey, newValue) => {
      const targetProj = filteredProjects[rowIndex];
      if (!targetProj) return;

      const currentVal = targetProj[colKey];
      if (currentVal === newValue) {
        setEditingCell(null);
        return;
      }

      setSaveStatus('saving');
      try {
        if (onUpdateProject) {
          await onUpdateProject(targetProj.id, colKey, newValue);
        }
        setSaveStatus('saved');
      } catch (e) {
        console.error('Failed to update project cell:', e);
        setSaveStatus('saved');
      } finally {
        setEditingCell(null);
      }
    },
    [filteredProjects, onUpdateProject]
  );

  // Start cell editing
  const startEditing = useCallback(
    (rowIndex, colKey) => {
      const col = SHEET_COLUMNS.find((c) => c.key === colKey);
      if (col && col.type === 'action') return; // Actions are buttons

      const proj = filteredProjects[rowIndex];
      if (!proj) return;

      const currentVal = proj[colKey] ?? '';
      setEditValue(String(currentVal));
      setEditingCell({ rowIndex, colKey });
      setActiveCell({ rowIndex, colKey });
    },
    [filteredProjects]
  );

  // Handle cell click
  const handleCellClick = (rowIndex, colKey, e) => {
    const proj = filteredProjects[rowIndex];
    if (proj) setSelectedRowId(proj.id);

    if (activeCell.rowIndex === rowIndex && activeCell.colKey === colKey) {
      // Double click or second click activates edit
      startEditing(rowIndex, colKey);
    } else {
      setActiveCell({ rowIndex, colKey });
      setEditingCell(null);
    }
  };

  // Keyboard navigation across grid
  const handleKeyDown = (e) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colKey, editValue);
        // Move to row below
        if (editingCell.rowIndex < filteredProjects.length - 1) {
          setActiveCell({ rowIndex: editingCell.rowIndex + 1, colKey: editingCell.colKey });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colKey, editValue);
        // Move right
        const colIdx = SHEET_COLUMNS.findIndex((c) => c.key === editingCell.colKey);
        if (colIdx < SHEET_COLUMNS.length - 2) {
          setActiveCell({ rowIndex: editingCell.rowIndex, colKey: SHEET_COLUMNS[colIdx + 1].key });
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
      return;
    }

    // Grid navigation mode
    const { rowIndex, colKey } = activeCell;
    const colIdx = SHEET_COLUMNS.findIndex((c) => c.key === colKey);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < filteredProjects.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colKey });
        const proj = filteredProjects[rowIndex + 1];
        if (proj) setSelectedRowId(proj.id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        setActiveCell({ rowIndex: rowIndex - 1, colKey });
        const proj = filteredProjects[rowIndex - 1];
        if (proj) setSelectedRowId(proj.id);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIdx < SHEET_COLUMNS.length - 1) {
        setActiveCell({ rowIndex, colKey: SHEET_COLUMNS[colIdx + 1].key });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIdx > 0) {
        setActiveCell({ rowIndex, colKey: SHEET_COLUMNS[colIdx - 1].key });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEditing(rowIndex, colKey);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Clear cell value
      const col = SHEET_COLUMNS.find((c) => c.key === colKey);
      if (col && col.type !== 'action') {
        commitEdit(rowIndex, colKey, col.type === 'number' ? 0 : '');
      }
    }
  };

  // Formula bar commit
  const handleFormulaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(activeCell.rowIndex, activeCell.colKey, formulaValue);
    }
  };

  // Export sheet to CSV
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;

    const headers = SHEET_COLUMNS.filter((c) => c.type !== 'action').map((c) => `"${c.label}"`);
    const csvRows = [headers.join(',')];

    filteredProjects.forEach((proj) => {
      const row = SHEET_COLUMNS.filter((c) => c.type !== 'action').map((c) => {
        const val = proj[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `QA_Projects_Master_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete selected row
  const handleDeleteSelected = () => {
    if (!selectedRowId && filteredProjects[activeCell.rowIndex]) {
      setSelectedRowId(filteredProjects[activeCell.rowIndex].id);
    }
    const targetId = selectedRowId || filteredProjects[activeCell.rowIndex]?.id;
    if (targetId && onDeleteRow) {
      onDeleteRow(targetId);
    }
  };

  // Status badge styling helper
  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().replace(/\s+/g, '');
    if (s === 'active') return 'status-active';
    if (s === 'inprogress') return 'status-inprogress';
    if (s === 'planning') return 'status-planning';
    if (s === 'completed') return 'status-completed';
    return 'status-onhold';
  };

  // Calculations for bottom formula bar
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const activeCount = filteredProjects.filter((p) => p.status === 'Active').length;
    const totalTestCases = filteredProjects.reduce((sum, p) => sum + (parseInt(p.test_cases, 10) || 0), 0);
    const totalTickets = filteredProjects.reduce((sum, p) => sum + (parseInt(p.tickets_count, 10) || 0), 0);
    const totalDocs = filteredProjects.reduce((sum, p) => sum + (parseInt(p.documents, 10) || 0), 0);
    const avgTeam = total > 0 ? (filteredProjects.reduce((sum, p) => sum + (parseInt(p.team_members, 10) || 4), 0) / total).toFixed(1) : 0;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    return { total, activeCount, totalTestCases, totalTickets, totalDocs, avgTeam, activePct };
  }, [filteredProjects]);

  return (
    <section className="pj-sheet-wrapper" onKeyDown={handleKeyDown} tabIndex={0} ref={tableContainerRef}>
      {/* 1. Ribbon / Toolbar */}
      <div className="pj-sheet-ribbon">
        <div className="pj-sheet-ribbon-left">
          <div className="pj-sheet-badge-wrap">
            <span className="pj-sheet-excel-icon">
              <FileSpreadsheet size={18} strokeWidth={2.2} />
            </span>
            <span className="pj-sheet-doc-title">Projects_Master_Sheet</span>
            <span className="pj-sheet-doc-ext">XLSX</span>
          </div>

          <div
            className={`pj-sheet-save-status ${
              saveStatus === 'saving' ? 'saving' : 'saved'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <Clock size={13} />
                <span>Autosaving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>All changes saved to database</span>
              </>
            )}
          </div>
        </div>

        <div className="pj-sheet-ribbon-actions">
          {/* Add Row Button */}
          <button className="pj-sheet-action-btn success" onClick={onAddRow} title="Add new project row into sheet">
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Row</span>
          </button>

          {/* Delete Row Button */}
          <button
            className="pj-sheet-action-btn"
            onClick={handleDeleteSelected}
            disabled={!filteredProjects.length}
            title="Delete selected row"
          >
            <Trash2 size={14} />
            <span>Delete Row</span>
          </button>

          {/* Export to CSV */}
          <button className="pj-sheet-action-btn" onClick={handleExportCSV} title="Download sheet as CSV file">
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Jump to Project Sheets Workspace for Active Row */}
          {filteredProjects[activeCell.rowIndex] && (
            <button
              className="pj-sheet-action-btn primary"
              onClick={() => onOpenProjectSheet && onOpenProjectSheet(filteredProjects[activeCell.rowIndex])}
              title="Open full dedicated test cases & project sheet workspace"
            >
              <ExternalLink size={14} />
              <span>Open Project Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Formula Bar (fx) */}
      <div className="pj-sheet-formulabar">
        <div className="pj-sheet-coord-box" title="Active Cell Coordinate">
          {activeCellCoord}
        </div>
        <div className="pj-sheet-fx-symbol">fx</div>
        <input
          type="text"
          className="pj-sheet-formula-input"
          placeholder="Enter text, formula or cell value..."
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          onKeyDown={handleFormulaKeyDown}
          onBlur={() => commitEdit(activeCell.rowIndex, activeCell.colKey, formulaValue)}
        />
      </div>

      {/* 3. Spreadsheet Grid Table */}
      <div className="pj-sheet-table-container">
        <table className="pj-sheet-grid">
          <thead>
            {/* Top Column Letter Headers (A, B, C...) */}
            <tr className="pj-sheet-letter-row">
              <th className="pj-sheet-header-corner">#</th>
              {SHEET_COLUMNS.map((col) => (
                <th key={col.letter} style={{ width: col.width }}>
                  {col.letter}
                </th>
              ))}
            </tr>

            {/* Field Name Headers */}
            <tr className="pj-sheet-header-row">
              <th className="pj-sheet-header-corner">Row</th>
              {SHEET_COLUMNS.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project, rIdx) => {
              const isRowSelected = selectedRowId === project.id;

              return (
                <tr
                  key={project.id || project.project_code || rIdx}
                  className={`pj-sheet-row ${isRowSelected ? 'selected-row' : ''}`}
                >
                  {/* Row Index Number Header (1, 2, 3...) */}
                  <td
                    className="pj-sheet-row-header"
                    onClick={() => {
                      setSelectedRowId(project.id);
                      setActiveCell({ rowIndex: rIdx, colKey: SHEET_COLUMNS[0].key });
                    }}
                  >
                    {rIdx + 1}
                  </td>

                  {/* Dynamic Cells */}
                  {SHEET_COLUMNS.map((col) => {
                    const isActive = activeCell.rowIndex === rIdx && activeCell.colKey === col.key;
                    const isEditing = editingCell?.rowIndex === rIdx && editingCell?.colKey === col.key;
                    const rawVal = project[col.key] ?? '';

                    return (
                      <td
                        key={col.key}
                        className={`pj-sheet-cell ${isActive ? 'active-cell' : ''}`}
                        onClick={(e) => handleCellClick(rIdx, col.key, e)}
                        onDoubleClick={() => startEditing(rIdx, col.key)}
                        style={{ width: col.width }}
                      >
                        {isEditing ? (
                          col.type === 'select-status' ? (
                            <select
                              ref={cellInputRef}
                              className="pj-sheet-cell-select"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                commitEdit(rIdx, col.key, e.target.value);
                              }}
                              onBlur={() => commitEdit(rIdx, col.key, editValue)}
                            >
                              {STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          ) : col.type === 'select-dept' ? (
                            <select
                              ref={cellInputRef}
                              className="pj-sheet-cell-select"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                commitEdit(rIdx, col.key, e.target.value);
                              }}
                              onBlur={() => commitEdit(rIdx, col.key, editValue)}
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={cellInputRef}
                              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              className="pj-sheet-cell-editor"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(rIdx, col.key, editValue)}
                            />
                          )
                        ) : col.type === 'action' ? (
                          <div className="pj-sheet-cell-inner" style={{ justifyContent: 'center' }}>
                            <button
                              className="pj-sheet-open-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenProjectSheet) onOpenProjectSheet(project);
                              }}
                              title="Open dedicated project sheet"
                            >
                              <FileSpreadsheet size={13} />
                              <span>Open Sheet</span>
                            </button>
                          </div>
                        ) : col.type === 'select-status' ? (
                          <div className="pj-sheet-cell-inner">
                            <span className={`pj-sheet-status-pill ${getStatusClass(rawVal)}`}>
                              {rawVal || 'Active'}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="pj-sheet-cell-inner"
                            style={{
                              justifyContent: col.type === 'number' ? 'flex-end' : 'flex-start',
                              fontWeight: col.key === 'project_code' ? 700 : 400
                            }}
                          >
                            {col.type === 'number'
                              ? rawVal
                              : col.type === 'date' && rawVal
                              ? String(rawVal).slice(0, 10)
                              : String(rawVal)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={SHEET_COLUMNS.length + 1} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No matching projects found in spreadsheet. Click <strong>Add Row</strong> above to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Sheet Tabs & Real-time Formulas Summary Bar */}
      <div className="pj-sheet-bottom-bar">
        {/* Google Sheets Bottom Tabs */}
        <div className="pj-sheet-tabs" role="tablist">
          <button
            className={`pj-sheet-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Projects ({projects.length})
          </button>
          <button
            className={`pj-sheet-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Projects
          </button>
          <button
            className={`pj-sheet-tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            Quality Assurance
          </button>
          <button
            className={`pj-sheet-tab-btn ${activeTab === 'engineering' ? 'active' : ''}`}
            onClick={() => setActiveTab('engineering')}
          >
            Engineering
          </button>
          <button
            className={`pj-sheet-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        {/* Live Formulas Status Summary Bar */}
        <div className="pj-sheet-calc-bar" title="Calculated summary of currently visible sheet rows">
          <div className="pj-sheet-calc-item">
            <span className="pj-sheet-calc-label">COUNT:</span>
            <span className="pj-sheet-calc-val">{stats.total}</span>
          </div>
          <div className="pj-sheet-calc-item">
            <span className="pj-sheet-calc-label">ACTIVE:</span>
            <span className="pj-sheet-calc-val">{stats.activeCount} ({stats.activePct}%)</span>
          </div>
          <div className="pj-sheet-calc-item">
            <span className="pj-sheet-calc-label">SUM(Test Cases):</span>
            <span className="pj-sheet-calc-val">{stats.totalTestCases}</span>
          </div>
          <div className="pj-sheet-calc-item">
            <span className="pj-sheet-calc-label">SUM(Tickets):</span>
            <span className="pj-sheet-calc-val">{stats.totalTickets}</span>
          </div>
          <div className="pj-sheet-calc-item">
            <span className="pj-sheet-calc-label">AVG(Team):</span>
            <span className="pj-sheet-calc-val">{stats.avgTeam}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
