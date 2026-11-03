import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  Minus,
  RemoveFormatting,
  WrapText,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  Rows,
  Search,
  X,
  AlertTriangle,
  LogOut,
  Copy,
  Scissors,
  Clipboard,
  ChevronDown,
  Printer,
  PaintBucket,
  Menu,
  MoreHorizontal,
  Layers,
  ArrowUp,
  ArrowDown,
  Check,
  Edit2,
  Image,
  Upload,
  Maximize2,
  Folder
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import RaiseBugTicketModal from '../../components/RaiseBugTicketModal/RaiseBugTicketModal';
import { Bug } from 'lucide-react';
import './AdminProjectSheet.css';

// Letters for columns: A, B, C, ... Z, AA, AB...
const getColLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Fallback starter sheets if backend is empty or offline
const FALLBACK_STARTER_SHEETS = [
  {
    id: 1,
    sheet_name: 'Test Execution Sheet',
    tab_color: '#0F9D58',
    columns: [
      { id: 'col_id', label: 'TC ID', width: 110, type: 'text' },
      { id: 'col_title', label: 'Test Case Title', width: 280, type: 'text' },
      { id: 'col_module', label: 'Module', width: 150, type: 'text' },
      { id: 'col_priority', label: 'Priority', width: 120, type: 'priority' },
      { id: 'col_steps', label: 'Test Steps / Precondition', width: 290, type: 'text' },
      { id: 'col_expected', label: 'Expected Result', width: 250, type: 'text' },
      { id: 'col_status', label: 'Status', width: 130, type: 'status' },
      { id: 'col_screenshot', label: 'Screenshot / Proof', width: 170, type: 'image' },
      { id: 'col_assigned', label: 'Assigned QA', width: 160, type: 'text' },
      { id: 'col_date', label: 'Execution Date', width: 130, type: 'date' }
    ],
    rows: [
      {
        id: 'row-1',
        col_id: 'TC-001',
        col_title: 'Verify user authentication with valid credentials',
        col_module: 'Authentication',
        col_priority: 'High',
        col_steps: '1. Enter email, 2. Enter valid password, 3. Click Login',
        col_expected: 'User redirected to role workspace with active session token',
        col_status: 'Pass',
        col_assigned: 'QA Lead',
        col_date: '2026-10-22'
      },
      {
        id: 'row-2',
        col_id: 'TC-002',
        col_title: 'Spreadsheet cell inline editing and keyboard navigation',
        col_module: 'Sheet Module',
        col_priority: 'Critical',
        col_steps: '1. Double-click or Enter, 2. Edit value, 3. Press Enter / Tab',
        col_expected: 'Cell updates instantly and synchronizes with storage',
        col_status: 'Pass',
        col_assigned: 'Automation QA',
        col_date: '2026-10-23'
      },
      {
        id: 'row-3',
        col_id: 'TC-003',
        col_title: 'Copy & Paste entire row and column contents across sheet',
        col_module: 'Spreadsheet Grid',
        col_priority: 'High',
        col_steps: '1. Click row # or col letter, 2. Ctrl+C, 3. Select target, 4. Ctrl+V',
        col_expected: 'All row/column values pasted accurately with formatting',
        col_status: 'Pass',
        col_assigned: 'Lead QA',
        col_date: '2026-10-23'
      },
      {
        id: 'row-4',
        col_id: 'TC-004',
        col_title: 'Support N number of multiple sheet tabs with rename & colors',
        col_module: 'Tabs Engine',
        col_priority: 'Critical',
        col_steps: '1. Click + button, 2. Double-click to rename, 3. Pick tab color',
        col_expected: 'Multiple sheet tabs created, duplicated, and saved smoothly',
        col_status: 'Pass',
        col_assigned: 'Tester 1',
        col_date: '2026-10-24'
      },
      {
        id: 'row-5',
        col_id: 'TC-005',
        col_title: 'Real-time QA calculation metrics and CSV export',
        col_module: 'Reporting',
        col_priority: 'Medium',
        col_steps: '1. Update row status, 2. Inspect bottom formula calculations bar',
        col_expected: 'Pass rate % and issue counts recalculate in real-time',
        col_status: 'In Progress',
        col_screenshot: '',
        col_assigned: 'QA Engineer',
        col_date: '2026-10-25'
      },
      {
        id: 'row-6',
        col_id: 'TC-006',
        col_title: 'Paste image or screenshot directly from clipboard into cell',
        col_module: 'Screenshots / Media',
        col_priority: 'High',
        col_steps: '1. Take screenshot with Win+Shift+S, 2. Select image cell, 3. Press Ctrl+V',
        col_expected: 'Image preview thumbnail displays in cell, click to open lightbox',
        col_status: 'Pass',
        col_screenshot: '',
        col_assigned: 'QA Lead',
        col_date: '2026-10-25'
      },
      {
        id: 'row-7',
        col_id: 'TC-007',
        col_title: 'Conditional red row highlighting when status is Fail or Failed',
        col_module: 'Formatting Engine',
        col_priority: 'Critical',
        col_steps: '1. Click status dropdown in row, 2. Select Fail',
        col_expected: 'Entire row background turns soft red with red row number border',
        col_status: 'Pass',
        col_screenshot: '',
        col_assigned: 'Automation QA',
        col_date: '2026-10-26'
      },
      {
        id: 'row-8',
        col_id: 'TC-008',
        col_title: 'Add arbitrary N rows via bottom Google Sheets input',
        col_module: 'Row Generator',
        col_priority: 'Medium',
        col_steps: '1. Enter row count (e.g. 20), 2. Click Add rows at bottom button',
        col_expected: 'N rows instantly appended to bottom of current sheet tab',
        col_status: 'Pass',
        col_screenshot: '',
        col_assigned: 'Tester 2',
        col_date: '2026-10-26'
      },
      {
        id: 'row-9',
        col_id: 'TC-009',
        col_title: 'Verify regression tests run on latest staging deployment build',
        col_module: 'Deployments',
        col_priority: 'High',
        col_steps: '1. Check CI build hash, 2. Run Cypress end-to-end suite',
        col_expected: 'All test assertions pass with zero critical defects',
        col_status: 'Untested',
        col_screenshot: '',
        col_assigned: 'Automation QA',
        col_date: '2026-10-27'
      },
      {
        id: 'row-10',
        col_id: 'TC-010',
        col_title: 'Validate responsiveness across desktop, tablet, and mobile',
        col_module: 'UI / Layout',
        col_priority: 'Medium',
        col_steps: '1. Open devtools, 2. Test 1080p, 768p and mobile viewports',
        col_expected: 'Layout adapts smoothly with fluid toolbar and scrollable grid',
        col_status: 'Untested',
        col_screenshot: '',
        col_assigned: 'QA Member',
        col_date: '2026-10-27'
      }
    ]
  },
  {
    id: 2,
    sheet_name: 'Requirements Matrix',
    tab_color: '#1a73e8',
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
        col_feature: 'Google Sheets-level spreadsheet workspace with multi-tabs',
        col_biz_priority: 'Critical',
        col_qa_lead: 'Santhosh',
        col_dev_lead: 'Karthikeyan',
        col_coverage: 'Pass',
        col_signoff: 'Pass'
      },
      {
        id: 'row-2',
        col_req_id: 'REQ-02',
        col_feature: 'Full row and column copy-paste with keyboard shortcuts',
        col_biz_priority: 'High',
        col_qa_lead: 'Manikandan',
        col_dev_lead: 'Pavishek',
        col_coverage: 'Pass',
        col_signoff: 'Pass'
      }
    ]
  },
  {
    id: 3,
    sheet_name: 'Defect Log',
    tab_color: '#d93025',
    columns: [
      { id: 'col_bug_id', label: 'Defect ID', width: 110, type: 'text' },
      { id: 'col_summary', label: 'Defect Summary', width: 300, type: 'text' },
      { id: 'col_severity', label: 'Severity', width: 130, type: 'priority' },
      { id: 'col_repro', label: 'Reproducibility', width: 140, type: 'text' },
      { id: 'col_status', label: 'Defect Status', width: 140, type: 'status' },
      { id: 'col_screenshot', label: 'Bug Screenshot', width: 170, type: 'image' },
      { id: 'col_assigned_dev', label: 'Assigned Engineer', width: 170, type: 'text' },
      { id: 'col_target', label: 'Target Release', width: 130, type: 'text' }
    ],
    rows: [
      {
        id: 'row-1',
        col_bug_id: 'DEF-101',
        col_summary: 'Ensure table cell focus outline doesn\'t overflow table borders',
        col_severity: 'Low',
        col_repro: 'Consistent',
        col_status: 'Pass',
        col_assigned_dev: 'Frontend Team',
        col_target: 'v1.0.1'
      }
    ]
  }
];

const TAB_COLORS = [
  { name: 'Default', hex: '' },
  { name: 'Green', hex: '#0F9D58' },
  { name: 'Blue', hex: '#1a73e8' },
  { name: 'Red', hex: '#d93025' },
  { name: 'Yellow', hex: '#f9ab00' },
  { name: 'Purple', hex: '#a142f4' },
  { name: 'Orange', hex: '#e8710a' },
  { name: 'Teal', hex: '#12b5cb' }
];

const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Google Sans', value: '"Google Sans", sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' }
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#491b1d', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
];

const FILL_COLORS = [
  { label: 'None', hex: '' },
  { label: 'Light Green', hex: '#e6f4ea' },
  { label: 'Light Blue', hex: '#e8f0fe' },
  { label: 'Light Yellow', hex: '#fef7e0' },
  { label: 'Light Red', hex: '#fce8e6' },
  { label: 'Light Purple', hex: '#f3e8fd' },
  { label: 'Light Orange', hex: '#feefe3' },
  { label: 'Light Cyan', hex: '#e1f5fe' },
  { label: 'Light Gray', hex: '#f1f3f4' },
  { label: 'Soft Green', hex: '#ceead6' },
  { label: 'Soft Blue', hex: '#d2e3fc' },
  { label: 'Soft Yellow', hex: '#feefc3' },
  { label: 'Soft Red', hex: '#fad2cf' },
  { label: 'Soft Purple', hex: '#e8dff5' },
  { label: 'Soft Orange', hex: '#fedfc8' },
  { label: 'Green', hex: '#34a853' },
  { label: 'Blue', hex: '#1a73e8' },
  { label: 'Yellow', hex: '#fbbc04' },
  { label: 'Red', hex: '#ea4335' },
  { label: 'Purple', hex: '#a142f4' },
  { label: 'Orange', hex: '#fa7b17' },
  { label: 'Dark Gray', hex: '#5f6368' },
  { label: 'White', hex: '#ffffff' }
];

const CELL_BG_COLORS = FILL_COLORS;

const DEFAULT_CONDITIONAL_RULES = [
  { id: 'cr-1', enabled: true, condition: 'equals', value: 'Pass', bgColor: '#d1fae5', color: '#065f46', label: 'Pass -> Soft Green' },
  { id: 'cr-2', enabled: true, condition: 'equals', value: 'Fail', bgColor: '#fee2e2', color: '#991b1b', label: 'Fail -> Soft Red' },
  { id: 'cr-3', enabled: true, condition: 'equals', value: 'Blocked', bgColor: '#fef3c7', color: '#92400e', label: 'Blocked -> Soft Amber' },
  { id: 'cr-4', enabled: true, condition: 'equals', value: 'In Progress', bgColor: '#e0f2fe', color: '#075985', label: 'In Progress -> Soft Blue' }
];

export default function AdminProjectSheet() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Project metadata
  const [project, setProject] = useState(() => location.state?.project || {
    id: projectId || 1,
    project_code: `PRJ-${projectId || '01'}`,
    name: 'Project Sheet Workspace',
    lead_name: 'Lead Tester',
    status: 'In Progress'
  });

  // Sheets data (N number of sheets)
  const [sheets, setSheets] = useState(FALLBACK_STARTER_SHEETS);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Selection state: mode can be 'cell', 'row', 'column', 'all'
  const [selectionMode, setSelectionMode] = useState('cell');
  const [activeCell, setActiveCell] = useState({ rowIndex: 0, colId: 'col_title' });
  const [selectedRowIndices, setSelectedRowIndices] = useState([]); // Array of selected row indices
  const [lastRowClicked, setLastRowClicked] = useState(null);
  const [selectedColId, setSelectedColId] = useState(null);

  const selectedRowIndex = selectedRowIndices[0] ?? null;
  const setSelectedRowIndex = (val) => {
    if (val === null || val === undefined) {
      setSelectedRowIndices([]);
      setLastRowClicked(null);
    } else {
      setSelectedRowIndices([val]);
      setLastRowClicked(val);
    }
  };

  // Active editing state
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, colId }
  const [editValue, setEditValue] = useState('');
  const [formulaValue, setFormulaValue] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  // Formatting & Modals state
  const [openColorPopover, setOpenColorPopover] = useState(null); // 'text' | 'fill' | null
  const [showConditionalModal, setShowConditionalModal] = useState(false);
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('equals');
  const [newRuleBgColor, setNewRuleBgColor] = useState('#d1fae5');
  const [newRuleColor, setNewRuleColor] = useState('#065f46');

  // Undo / Redo history stack
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Internal Clipboard state
  // Stores: { type: 'row', data: rowObj, values: [...] } OR { type: 'column', colId, values: [...] } OR { type: 'cell', value }
  const [sheetClipboard, setSheetClipboard] = useState(null);
  const [copiedIndicator, setCopiedIndicator] = useState(null); // { type: 'row'|'column'|'cell', id, index }

  // Context Menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'cell'|'row'|'col', rowIndex, colId }

  // Active Dropdown Menus (File, Edit, View, Insert, Format, Data)
  const [activeMenu, setActiveMenu] = useState(null);

  // Number of rows to add input state (N rows generator)
  const [rowsToAddInput, setRowsToAddInput] = useState(10);

  // Tab renaming inline
  const [editingTabIdx, setEditingTabIdx] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [tabMenuIndex, setTabMenuIndex] = useState(null); // Index of sheet tab whose dropdown is open

  // Modals
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [showAllSheetsModal, setShowAllSheetsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  // Cloud save status
  const [cloudStatus, setCloudStatus] = useState('saved'); // 'saved' | 'saving'

  const cellInputRef = useRef(null);
  const tableRef = useRef(null);
  const tabRenameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Image Lightbox & Upload state
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [raiseBugModalOpen, setRaiseBugModalOpen] = useState(false);
  const [selectedFailTestCase, setSelectedFailTestCase] = useState(null);
  const [pendingUploadCell, setPendingUploadCell] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2800);
  }, []);

  // Active Sheet Object
  const currentSheet = sheets[activeSheetIndex] || sheets[0] || { columns: [], rows: [] };
  const currentColumns = currentSheet.columns || [];
  const currentRows = currentSheet.rows || [];

  // Filtered rows for in-sheet search
  const visibleRows = useMemo(() => {
    if (!searchFilter.trim()) return currentRows;
    const q = searchFilter.toLowerCase();
    return currentRows.filter((r) => {
      return Object.values(r).some((val) => String(val).toLowerCase().includes(q));
    });
  }, [currentRows, searchFilter]);

  // Authentic Google Sheets grid: always display at least 30 interactive rows
  const MIN_DISPLAY_ROWS = 30;

  const displayRows = useMemo(() => {
    if (searchFilter.trim()) return visibleRows;
    if (currentRows.length >= MIN_DISPLAY_ROWS) return currentRows;

    const padded = [...currentRows];
    for (let i = currentRows.length; i < MIN_DISPLAY_ROWS; i++) {
      const blankRow = { id: `row-blank-${i + 1}` };
      currentColumns.forEach((c) => {
        blankRow[c.id] = '';
      });
      padded.push(blankRow);
    }
    return padded;
  }, [currentRows, visibleRows, searchFilter, currentColumns]);

  // Active column definition & coordinate (e.g. "B2")
  const activeColIndex = useMemo(() => {
    return currentColumns.findIndex((c) => c.id === activeCell.colId);
  }, [currentColumns, activeCell.colId]);

  const activeCoord = useMemo(() => {
    if (selectionMode === 'all') return 'All';
    if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      if (selectedRowIndices.length === 1) return `Row ${selectedRowIndices[0] + 1}`;
      const sorted = [...selectedRowIndices].sort((a, b) => a - b);
      const isContiguous = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1);
      if (isContiguous) {
        return `${sorted[0] + 1}:${sorted[sorted.length - 1] + 1}`;
      }
      return `Rows (${selectedRowIndices.length})`;
    }
    if (selectionMode === 'column' && selectedColId) {
      const idx = currentColumns.findIndex((c) => c.id === selectedColId);
      return `Col ${getColLetter(idx >= 0 ? idx : 0)}`;
    }
    const letter = getColLetter(activeColIndex >= 0 ? activeColIndex : 0);
    const rowNum = activeCell.rowIndex + 1;
    return `${letter}${rowNum}`;
  }, [selectionMode, selectedRowIndices, selectedColId, activeColIndex, activeCell.rowIndex, currentColumns]);

  // Load sheets from backend API or localStorage
  const loadProjectSheets = useCallback(async () => {
    const token = localStorage.getItem('token');
    const localKey = `pjs_sheets_${projectId}`;

    if (token) {
      try {
        const res = await axios.get(`http://localhost:5000/api/admin/projects/${projectId}/sheets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          if (res.data.project) setProject(res.data.project);
          if (Array.isArray(res.data.sheets) && res.data.sheets.length > 0) {
            setSheets(res.data.sheets);
            localStorage.setItem(localKey, JSON.stringify(res.data.sheets));
            return;
          }
        }
      } catch (err) {
        console.warn('Backend sheets API not reachable, loading fallback cache:', err.message);
      }
    }

    // Local storage fallback
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        setSheets(JSON.parse(cached));
      } catch (e) {
        setSheets(FALLBACK_STARTER_SHEETS);
      }
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectSheets();
  }, [loadProjectSheets]);

  // Sync active cell value to formula bar
  useEffect(() => {
    if (selectionMode === 'cell') {
      const targetRow = displayRows[activeCell.rowIndex];
      if (targetRow && activeCell.colId) {
        const val = targetRow[activeCell.colId] ?? '';
        setFormulaValue(String(val));
      } else {
        setFormulaValue('');
      }
    }
  }, [activeCell, displayRows, selectionMode]);

  // Auto focus input in edit mode
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      if (cellInputRef.current.select) cellInputRef.current.select();
    }
  }, [editingCell]);

  // Auto focus tab renaming input
  useEffect(() => {
    if (editingTabIdx !== null && tabRenameInputRef.current) {
      tabRenameInputRef.current.focus();
      tabRenameInputRef.current.select();
    }
  }, [editingTabIdx]);

  // Close menus & context menu on window click
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenu(null);
      setContextMenu(null);
      setTabMenuIndex(null);
      setOpenColorPopover(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Save changes to backend & localStorage
  const persistSheetChanges = async (updatedSheets) => {
    setCloudStatus('saving');
    const localKey = `pjs_sheets_${projectId}`;
    localStorage.setItem(localKey, JSON.stringify(updatedSheets));

    const token = localStorage.getItem('token');
    const targetSheet = updatedSheets[activeSheetIndex];
    if (token && targetSheet?.id) {
      try {
        await axios.put(
          `http://localhost:5000/api/admin/projects/${projectId}/sheets/${targetSheet.id}`,
          {
            sheet_name: targetSheet.sheet_name,
            tab_color: targetSheet.tab_color,
            columns: targetSheet.columns,
            rows: targetSheet.rows,
            formatting: targetSheet.formatting || {}
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn('Could not sync to cloud, stored locally:', err.message);
      }
    }

    setTimeout(() => {
      setCloudStatus('saved');
    }, 400);
  };

  // Push state to undo stack
  const recordUndo = () => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.stringify(sheets)]);
    setRedoStack([]);
  };

  // Resolve Cell Style with fallback inheritance: sheet_all -> col -> row -> cell + conditional formatting
  const resolveCellStyle = useCallback((rIdx, colId) => {
    const formatting = currentSheet.formatting || {};
    const allStyle = formatting['sheet_all'] || {};
    const colStyle = formatting[`col_${colId}`] || {};
    const rowStyle = formatting[`row_${rIdx}`] || {};
    const cellStyle = formatting[`${rIdx}_${colId}`] || {};

    const fontFamily = cellStyle.fontFamily || rowStyle.fontFamily || colStyle.fontFamily || allStyle.fontFamily || 'Arial, sans-serif';
    const fontSize = cellStyle.fontSize || rowStyle.fontSize || colStyle.fontSize || allStyle.fontSize || 12;
    const isBold = (cellStyle.bold !== undefined ? cellStyle.bold : (rowStyle.bold !== undefined ? rowStyle.bold : (colStyle.bold !== undefined ? colStyle.bold : allStyle.bold))) || false;
    const isItalic = (cellStyle.italic !== undefined ? cellStyle.italic : (rowStyle.italic !== undefined ? rowStyle.italic : (colStyle.italic !== undefined ? colStyle.italic : allStyle.italic))) || false;
    const isUnderline = (cellStyle.underline !== undefined ? cellStyle.underline : (rowStyle.underline !== undefined ? rowStyle.underline : (colStyle.underline !== undefined ? colStyle.underline : allStyle.underline))) || false;
    const isStrikethrough = (cellStyle.strikethrough !== undefined ? cellStyle.strikethrough : (rowStyle.strikethrough !== undefined ? rowStyle.strikethrough : (colStyle.strikethrough !== undefined ? colStyle.strikethrough : allStyle.strikethrough))) || false;
    const align = cellStyle.align || rowStyle.align || colStyle.align || allStyle.align || 'left';
    const valign = cellStyle.valign || rowStyle.valign || colStyle.valign || allStyle.valign || 'middle';
    const wrap = cellStyle.wrap || rowStyle.wrap || colStyle.wrap || allStyle.wrap || 'overflow';

    // Evaluate conditional formatting rules
    const rawVal = String(displayRows[rIdx]?.[colId] ?? '').trim();
    const lowerVal = rawVal.toLowerCase();
    const rules = currentSheet.conditionalRules || DEFAULT_CONDITIONAL_RULES;
    let conditionalBg = null;
    let conditionalColor = null;

    if (rawVal) {
      for (const rule of rules) {
        if (!rule.enabled) continue;
        const ruleVal = String(rule.value || '').trim().toLowerCase();
        let match = false;
        if (rule.condition === 'equals' && lowerVal === ruleVal) match = true;
        else if (rule.condition === 'contains' && lowerVal.includes(ruleVal)) match = true;
        else if (rule.condition === 'starts_with' && lowerVal.startsWith(ruleVal)) match = true;

        if (match) {
          conditionalBg = rule.bgColor;
          conditionalColor = rule.color;
          break;
        }
      }
    }

    const color = cellStyle.color || rowStyle.color || colStyle.color || allStyle.color || conditionalColor || '#202124';
    const bgColor = cellStyle.bgColor || rowStyle.bgColor || colStyle.bgColor || allStyle.bgColor || conditionalBg || '';

    return {
      fontFamily,
      fontSize: `${fontSize}px`,
      rawFontSize: fontSize,
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: [isUnderline ? 'underline' : '', isStrikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
      color,
      backgroundColor: bgColor,
      textAlign: align,
      verticalAlign: valign,
      wrap,
      isBold,
      isItalic,
      isUnderline,
      isStrikethrough
    };
  }, [currentSheet.formatting, currentSheet.conditionalRules, displayRows]);

  // Active Selection Style for Toolbar reflection
  const activeStyle = useMemo(() => {
    if (selectionMode === 'all') {
      const allStyle = currentSheet.formatting?.['sheet_all'] || {};
      return {
        fontFamily: allStyle.fontFamily || 'Arial, sans-serif',
        fontSize: allStyle.fontSize || 12,
        bold: !!allStyle.bold,
        italic: !!allStyle.italic,
        underline: !!allStyle.underline,
        strikethrough: !!allStyle.strikethrough,
        color: allStyle.color || '#202124',
        bgColor: allStyle.bgColor || '',
        align: allStyle.align || 'left',
        valign: allStyle.valign || 'middle',
        wrap: allStyle.wrap || 'overflow'
      };
    }
    if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      const rIdx = selectedRowIndices[0];
      const rowStyle = currentSheet.formatting?.[`row_${rIdx}`] || {};
      return {
        fontFamily: rowStyle.fontFamily || 'Arial, sans-serif',
        fontSize: rowStyle.fontSize || 12,
        bold: !!rowStyle.bold,
        italic: !!rowStyle.italic,
        underline: !!rowStyle.underline,
        strikethrough: !!rowStyle.strikethrough,
        color: rowStyle.color || '#202124',
        bgColor: rowStyle.bgColor || '',
        align: rowStyle.align || 'left',
        valign: rowStyle.valign || 'middle',
        wrap: rowStyle.wrap || 'overflow'
      };
    }
    if (selectionMode === 'column' && selectedColId) {
      const colStyle = currentSheet.formatting?.[`col_${selectedColId}`] || {};
      return {
        fontFamily: colStyle.fontFamily || 'Arial, sans-serif',
        fontSize: colStyle.fontSize || 12,
        bold: !!colStyle.bold,
        italic: !!colStyle.italic,
        underline: !!colStyle.underline,
        strikethrough: !!colStyle.strikethrough,
        color: colStyle.color || '#202124',
        bgColor: colStyle.bgColor || '',
        align: colStyle.align || 'left',
        valign: colStyle.valign || 'middle',
        wrap: colStyle.wrap || 'overflow'
      };
    }
    const resolved = resolveCellStyle(activeCell.rowIndex, activeCell.colId);
    return {
      fontFamily: resolved.fontFamily,
      fontSize: resolved.rawFontSize,
      bold: resolved.isBold,
      italic: resolved.isItalic,
      underline: resolved.isUnderline,
      strikethrough: resolved.isStrikethrough,
      color: resolved.color,
      bgColor: resolved.backgroundColor,
      align: resolved.textAlign,
      valign: resolved.verticalAlign,
      wrap: resolved.wrap
    };
  }, [selectionMode, selectedRowIndices, selectedColId, activeCell, resolveCellStyle, currentSheet.formatting]);

  // Apply Formatting to Selection (All, Row, Column, or Active Cell)
  const applyFormatting = (property, value) => {
    recordUndo();
    const currentFmt = { ...(currentSheet.formatting || {}) };

    if (selectionMode === 'all') {
      const existing = currentFmt['sheet_all'] || {};
      currentFmt['sheet_all'] = { ...existing, [property]: value };
    } else if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      selectedRowIndices.forEach((rIdx) => {
        const existing = currentFmt[`row_${rIdx}`] || {};
        currentFmt[`row_${rIdx}`] = { ...existing, [property]: value };
      });
    } else if (selectionMode === 'column' && selectedColId) {
      const existing = currentFmt[`col_${selectedColId}`] || {};
      currentFmt[`col_${selectedColId}`] = { ...existing, [property]: value };
    } else {
      const targetKey = `${activeCell.rowIndex}_${activeCell.colId}`;
      const existing = currentFmt[targetKey] || {};
      currentFmt[targetKey] = { ...existing, [property]: value };
    }

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      formatting: currentFmt
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
  };

  // Clear Formatting
  const handleClearFormatting = () => {
    recordUndo();
    const currentFmt = { ...(currentSheet.formatting || {}) };

    if (selectionMode === 'all') {
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = {
        ...currentSheet,
        formatting: {}
      };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      showToast('Cleared all formatting in sheet');
      return;
    }

    if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      selectedRowIndices.forEach((rIdx) => {
        delete currentFmt[`row_${rIdx}`];
        currentColumns.forEach((c) => delete currentFmt[`${rIdx}_${c.id}`]);
      });
    } else if (selectionMode === 'column' && selectedColId) {
      delete currentFmt[`col_${selectedColId}`];
      displayRows.forEach((_, rIdx) => delete currentFmt[`${rIdx}_${selectedColId}`]);
    } else {
      delete currentFmt[`${activeCell.rowIndex}_${activeCell.colId}`];
    }

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      formatting: currentFmt
    };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    showToast('Cleared formatting');
  };

  // Font Size +/- step increment
  const handleFontSizeStep = (delta) => {
    const currentSize = activeStyle.fontSize || 12;
    const currIdx = FONT_SIZES.indexOf(currentSize);
    let nextIdx;
    if (currIdx === -1) {
      nextIdx = delta > 0 ? FONT_SIZES.findIndex((s) => s > currentSize) : FONT_SIZES.slice().reverse().findIndex((s) => s < currentSize);
      if (nextIdx === -1) nextIdx = delta > 0 ? FONT_SIZES.length - 1 : 0;
    } else {
      nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, currIdx + delta));
    }
    applyFormatting('fontSize', FONT_SIZES[nextIdx]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.stringify(sheets)]);
    setUndoStack((prev) => prev.slice(0, -1));
    const restored = JSON.parse(lastState);
    setSheets(restored);
    persistSheetChanges(restored);
    showToast('Undo action applied');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.stringify(sheets)]);
    setRedoStack((prev) => prev.slice(0, -1));
    const restored = JSON.parse(nextState);
    setSheets(restored);
    persistSheetChanges(restored);
    showToast('Redo action applied');
  };

  // Commit Cell Edit
  const commitEdit = (rowIndex, colId, newVal) => {
    const row = displayRows[rowIndex];
    if (!row) {
      setEditingCell(null);
      return;
    }

    if (row[colId] === newVal) {
      setEditingCell(null);
      return;
    }

    recordUndo();

    let updatedRows = [...currentRows];
    if (rowIndex >= currentRows.length) {
      // Padded row: materialize all rows up to rowIndex
      for (let i = currentRows.length; i <= rowIndex; i++) {
        if (!updatedRows[i]) {
          const newRowObj = { id: `row-${Date.now()}-${i + 1}` };
          currentColumns.forEach((c) => {
            newRowObj[c.id] = '';
          });
          updatedRows[i] = newRowObj;
        }
      }
      updatedRows[rowIndex][colId] = newVal;
    } else {
      updatedRows = currentRows.map((r, idx) => {
        if (idx === rowIndex || r.id === row.id) {
          return { ...r, [colId]: newVal };
        }
        return r;
      });
    }

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      rows: updatedRows
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setEditingCell(null);
  };

  // Global Clipboard Paste Listener for Images & Screenshots
  useEffect(() => {
    const handleImagePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (uploadEvt) => {
              const base64Data = uploadEvt.target.result;
              let targetColId = activeCell.colId;
              const activeCol = currentColumns.find((c) => c.id === activeCell.colId);
              if (activeCol?.type !== 'image') {
                const imgCol = currentColumns.find((c) => c.type === 'image');
                if (imgCol) targetColId = imgCol.id;
              }
              commitEdit(activeCell.rowIndex, targetColId, base64Data);
              showToast('Screenshot / image pasted into cell!');
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleImagePaste);
    return () => window.removeEventListener('paste', handleImagePaste);
  }, [activeCell, currentColumns, commitEdit, showToast]);

  // Start cell editing
  const startEditing = (rowIndex, colId) => {
    const row = displayRows[rowIndex];
    if (!row) return;

    setEditValue(String(row[colId] ?? ''));
    setEditingCell({ rowIndex, colId });
    setActiveCell({ rowIndex, colId });
    setSelectionMode('cell');
  };

  // Cell click
  const handleCellClick = (rowIndex, colId) => {
    setSelectionMode('cell');
    setSelectedRowIndices([]);
    setLastRowClicked(null);
    setSelectedColId(null);
    if (activeCell.rowIndex === rowIndex && activeCell.colId === colId) {
      startEditing(rowIndex, colId);
    } else {
      setActiveCell({ rowIndex, colId });
      setEditingCell(null);
    }
  };

  // Select entire row(s) with Shift+click range and Ctrl/Cmd+click multi-selection
  const handleSelectRow = (rIdx, e) => {
    setSelectionMode('row');
    setSelectedColId(null);
    setEditingCell(null);
    setActiveCell({ rowIndex: rIdx, colId: currentColumns[0]?.id || 'col_title' });

    if (e && e.shiftKey && lastRowClicked !== null) {
      // Contiguous range selection from lastRowClicked to rIdx
      const start = Math.min(lastRowClicked, rIdx);
      const end = Math.max(lastRowClicked, rIdx);
      const range = [];
      for (let i = start; i <= end; i++) range.push(i);
      setSelectedRowIndices(range);
    } else if (e && (e.ctrlKey || e.metaKey)) {
      // Toggle row in selection
      setSelectedRowIndices((prev) => {
        if (prev.includes(rIdx)) {
          const next = prev.filter((i) => i !== rIdx);
          return next.length > 0 ? next : [rIdx];
        } else {
          return [...prev, rIdx];
        }
      });
      setLastRowClicked(rIdx);
    } else {
      // Single row selection
      setSelectedRowIndices([rIdx]);
      setLastRowClicked(rIdx);
    }
  };

  // Select entire column
  const handleSelectColumn = (colId) => {
    setSelectionMode('column');
    setSelectedColId(colId);
    setSelectedRowIndices([]);
    setLastRowClicked(null);
    setActiveCell({ rowIndex: 0, colId });
    setEditingCell(null);
  };

  // Select all cells
  const handleSelectAll = () => {
    setSelectionMode('all');
    setSelectedRowIndices([]);
    setLastRowClicked(null);
    setSelectedColId(null);
    setActiveCell({ rowIndex: 0, colId: currentColumns[0]?.id || 'col_title' });
    setEditingCell(null);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // COPY & PASTE ENGINE (Entire Row, Entire Column, and Cell/Range)
  // ═════════════════════════════════════════════════════════════════════════════

  // Copy Action
  const handleCopy = useCallback(async () => {
    if (selectionMode === 'all') {
      const tsvRows = displayRows.map((r) =>
        currentColumns.map((col) => String(r[col.id] ?? '')).join('\t')
      );
      const tsvText = tsvRows.join('\n');
      const clipData = {
        type: 'all',
        tsv: tsvText,
        rows: displayRows.map((r) => ({ ...r })),
        columns: [...currentColumns]
      };
      setSheetClipboard(clipData);
      setCopiedIndicator({ type: 'all' });
      try {
        await navigator.clipboard.writeText(tsvText);
      } catch (err) {}
      showToast('Entire sheet copied to clipboard');
    } else if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      const sortedIndices = [...selectedRowIndices].sort((a, b) => a - b);
      const tsvLines = sortedIndices.map((rIdx) => {
        const row = displayRows[rIdx];
        return currentColumns.map((col) => String(row?.[col.id] ?? '')).join('\t');
      });
      const tsvText = tsvLines.join('\n');
      const clipData = {
        type: 'rows',
        indices: sortedIndices,
        values: tsvLines,
        singleRowValues: currentColumns.map((col) => String(displayRows[sortedIndices[0]]?.[col.id] ?? ''))
      };
      setSheetClipboard(clipData);
      setCopiedIndicator({ type: 'rows', indices: sortedIndices });
      try {
        await navigator.clipboard.writeText(tsvText);
      } catch (err) {}
      showToast(sortedIndices.length === 1 ? `Row ${sortedIndices[0] + 1} copied` : `${sortedIndices.length} rows copied to clipboard`);
    } else if (selectionMode === 'column' && selectedColId) {
      const col = currentColumns.find((c) => c.id === selectedColId);
      const colValues = displayRows.map((r) => String(r[selectedColId] ?? ''));
      const clipData = {
        type: 'column',
        colId: selectedColId,
        colLabel: col?.label || 'Column',
        values: colValues
      };
      setSheetClipboard(clipData);
      setCopiedIndicator({ type: 'column', id: selectedColId });
      try {
        await navigator.clipboard.writeText(colValues.join('\n'));
      } catch (err) {}
      showToast(`Column "${col?.label || 'Selected'}" copied to clipboard`);
    } else {
      const row = displayRows[activeCell.rowIndex];
      const val = String(row?.[activeCell.colId] ?? '');
      setSheetClipboard({ type: 'cell', value: val });
      setCopiedIndicator({ type: 'cell', rowIndex: activeCell.rowIndex, colId: activeCell.colId });
      try {
        await navigator.clipboard.writeText(val);
      } catch (err) {}
      showToast('Cell copied');
    }
  }, [selectionMode, selectedRowIndices, selectedColId, displayRows, currentColumns, activeCell, showToast]);

  // Cut Action
  const handleCut = useCallback(() => {
    handleCopy();
    recordUndo();
    if (selectionMode === 'all') {
      const updatedRows = currentRows.map((r) => {
        const cleared = { id: r.id };
        currentColumns.forEach((c) => {
          cleared[c.id] = '';
        });
        return cleared;
      });
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      showToast('Entire sheet cut');
    } else if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      const targetIndices = new Set(selectedRowIndices);
      const updatedRows = currentRows.map((r, idx) => {
        if (targetIndices.has(idx)) {
          const cleared = { id: r.id };
          currentColumns.forEach((c) => { cleared[c.id] = ''; });
          return cleared;
        }
        return r;
      });
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      showToast(selectedRowIndices.length === 1 ? `Row ${selectedRowIndices[0] + 1} cut` : `${selectedRowIndices.length} rows cut`);
    } else if (selectionMode === 'column' && selectedColId) {
      const col = currentColumns.find((c) => c.id === selectedColId);
      const updatedRows = currentRows.map((r) => ({
        ...r,
        [selectedColId]: ''
      }));
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      showToast(`Column "${col?.label}" cut`);
    } else {
      commitEdit(activeCell.rowIndex, activeCell.colId, '');
    }
  }, [handleCopy, selectionMode, selectedRowIndices, selectedColId, displayRows, currentRows, currentColumns, sheets, activeSheetIndex, currentSheet, activeCell, showToast]);

  // Paste Action
  const handlePaste = useCallback(async () => {
    let clipboardText = '';
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch (err) {}

    recordUndo();

    // 0. PASTING INTO ENTIRE SHEET
    if (selectionMode === 'all') {
      let tsvText = '';
      if (sheetClipboard?.type === 'all' && sheetClipboard.tsv) {
        tsvText = sheetClipboard.tsv;
      } else if (clipboardText) {
        tsvText = clipboardText;
      }

      if (tsvText) {
        const lines = tsvText.split(/\r?\n/).filter((l) => l.length > 0);
        let updatedRows = [...currentRows];
        while (updatedRows.length < lines.length) {
          const blank = { id: `row-${Date.now()}-${updatedRows.length + 1}` };
          currentColumns.forEach((c) => { blank[c.id] = ''; });
          updatedRows.push(blank);
        }

        lines.forEach((line, rIdx) => {
          const cells = line.split('\t');
          const patchedRow = { ...updatedRows[rIdx] };
          cells.forEach((val, cIdx) => {
            if (currentColumns[cIdx]) {
              patchedRow[currentColumns[cIdx].id] = val;
            }
          });
          updatedRows[rIdx] = patchedRow;
        });

        const updatedSheets = [...sheets];
        updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
        setSheets(updatedSheets);
        persistSheetChanges(updatedSheets);
        showToast(`Pasted into entire sheet (${lines.length} rows)`);
        return;
      }
    }

    // 1. PASTING AN ENTIRE ROW / MULTIPLE ROWS
    if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      const targetStartRow = Math.min(...selectedRowIndices);
      let lines = [];
      if (sheetClipboard?.type === 'rows' && sheetClipboard.values) {
        lines = sheetClipboard.values;
      } else if (sheetClipboard?.type === 'row' && sheetClipboard.values) {
        lines = [sheetClipboard.values.join('\t')];
      } else if (clipboardText) {
        lines = clipboardText.split(/\r?\n/).filter(Boolean);
      }

      if (lines.length > 0) {
        let updatedRows = [...currentRows];
        const maxNeeded = targetStartRow + lines.length;
        while (updatedRows.length < maxNeeded) {
          const blank = { id: `row-${Date.now()}-${updatedRows.length + 1}` };
          currentColumns.forEach((c) => { blank[c.id] = ''; });
          updatedRows.push(blank);
        }

        lines.forEach((line, offset) => {
          const rIdx = targetStartRow + offset;
          const vals = line.split('\t');
          const patched = { ...updatedRows[rIdx] };
          currentColumns.forEach((col, cIdx) => {
            if (vals[cIdx] !== undefined) {
              patched[col.id] = vals[cIdx];
            }
          });
          updatedRows[rIdx] = patched;
        });

        const updatedSheets = [...sheets];
        updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
        setSheets(updatedSheets);
        persistSheetChanges(updatedSheets);
        showToast(`Pasted ${lines.length} row${lines.length > 1 ? 's' : ''} starting at Row ${targetStartRow + 1}`);
        return;
      }
    }

    // 2. PASTING AN ENTIRE COLUMN
    if (selectionMode === 'column' && selectedColId) {
      const targetCol = currentColumns.find((c) => c.id === selectedColId);
      let valuesToPaste = [];

      if (sheetClipboard?.type === 'column') {
        valuesToPaste = sheetClipboard.values;
      } else if (clipboardText) {
        valuesToPaste = clipboardText.split(/\r?\n/).filter(Boolean);
      }

      if (valuesToPaste.length > 0) {
        let updatedRows = [...currentRows];
        while (updatedRows.length < valuesToPaste.length) {
          const blank = { id: `row-${Date.now()}-${updatedRows.length + 1}` };
          currentColumns.forEach((c) => { blank[c.id] = ''; });
          updatedRows.push(blank);
        }

        updatedRows = updatedRows.map((r, idx) => {
          if (valuesToPaste[idx] !== undefined) {
            return { ...r, [selectedColId]: valuesToPaste[idx] };
          }
          return r;
        });

        const updatedSheets = [...sheets];
        updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
        setSheets(updatedSheets);
        persistSheetChanges(updatedSheets);
        showToast(`Pasted column contents into "${targetCol?.label || 'Selected Column'}"`);
        return;
      }
    }

    // 3. PASTING INTO CELL OR MULTI-CELL (Google Sheets / Excel multi-cell paste)
    if (clipboardText && (clipboardText.includes('\t') || clipboardText.includes('\n'))) {
      const lines = clipboardText.split(/\r?\n/).filter((l) => l.length > 0);
      const startRowIdx = activeCell.rowIndex;
      const startColIdx = activeColIndex >= 0 ? activeColIndex : 0;

      let updatedRows = [...currentRows];
      const maxNeededRows = startRowIdx + lines.length;
      while (updatedRows.length < maxNeededRows) {
        const blank = { id: `row-${Date.now()}-${updatedRows.length + 1}` };
        currentColumns.forEach((c) => { blank[c.id] = ''; });
        updatedRows.push(blank);
      }

      lines.forEach((line, rOffset) => {
        const targetRIdx = startRowIdx + rOffset;
        const cells = line.split('\t');
        const patchedRow = { ...updatedRows[targetRIdx] };
        cells.forEach((val, cOffset) => {
          const targetCol = currentColumns[startColIdx + cOffset];
          if (targetCol) {
            patchedRow[targetCol.id] = val;
          }
        });
        updatedRows[targetRIdx] = patchedRow;
      });

      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      showToast(`Pasted grid block (${lines.length} rows)`);
      return;
    }

    // Single value paste into active cell
    const valToPaste = clipboardText || (sheetClipboard?.value ?? '');
    if (valToPaste !== '') {
      commitEdit(activeCell.rowIndex, activeCell.colId, valToPaste);
      showToast('Pasted into cell');
    }
  }, [selectionMode, selectedRowIndices, selectedColId, displayRows, sheetClipboard, currentRows, currentColumns, sheets, activeSheetIndex, currentSheet, activeCell, activeColIndex, showToast]);

  // Keyboard navigation & global shortcuts
  const handleKeyDown = (e) => {
    // Check shortcuts with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        if (!editingCell) {
          e.preventDefault();
          handleCopy();
        }
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        if (!editingCell) {
          e.preventDefault();
          handlePaste();
        }
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        if (!editingCell) {
          e.preventDefault();
          handleCut();
        }
        return;
      }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        if (!editingCell) {
          e.preventDefault();
          handleSelectAll();
        }
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormatting('bold', !activeStyle.bold);
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormatting('italic', !activeStyle.italic);
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyFormatting('underline', !activeStyle.underline);
        return;
      }
    }

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colId, editValue);
        if (editingCell.rowIndex < displayRows.length - 1) {
          setActiveCell({ rowIndex: editingCell.rowIndex + 1, colId: editingCell.colId });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colId, editValue);
        const nextIdx = (activeColIndex + 1) % currentColumns.length;
        setActiveCell({ rowIndex: editingCell.rowIndex, colId: currentColumns[nextIdx].id });
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
      return;
    }

    const { rowIndex, colId } = activeCell;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < displayRows.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colId });
        if (selectionMode === 'row') setSelectedRowIndex(rowIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        setActiveCell({ rowIndex: rowIndex - 1, colId });
        if (selectionMode === 'row') setSelectedRowIndex(rowIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeColIndex < currentColumns.length - 1) {
        const nextColId = currentColumns[activeColIndex + 1].id;
        setActiveCell({ rowIndex, colId: nextColId });
        if (selectionMode === 'column') setSelectedColId(nextColId);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeColIndex > 0) {
        const prevColId = currentColumns[activeColIndex - 1].id;
        setActiveCell({ rowIndex, colId: prevColId });
        if (selectionMode === 'column') setSelectedColId(prevColId);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEditing(rowIndex, colId);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectionMode === 'all') {
        recordUndo();
        const updatedRows = currentRows.map((r) => {
          const cleared = { id: r.id };
          currentColumns.forEach((c) => {
            cleared[c.id] = '';
          });
          return cleared;
        });
        const updatedSheets = [...sheets];
        updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
        setSheets(updatedSheets);
        persistSheetChanges(updatedSheets);
        showToast('Cleared entire sheet content');
      } else if (selectionMode === 'row' && selectedRowIndices.length > 0) {
        handleDeleteRow();
      } else if (selectionMode === 'column' && selectedColId) {
        recordUndo();
        const updatedRows = currentRows.map((r) => ({
          ...r,
          [selectedColId]: ''
        }));
        const updatedSheets = [...sheets];
        updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
        setSheets(updatedSheets);
        persistSheetChanges(updatedSheets);
        showToast('Cleared column content');
      } else {
        commitEdit(rowIndex, colId, '');
      }
    }
  };

  // Add N Rows automatically from input count (all fields empty)
  const handleAddNRows = (count = 1, position = 'bottom') => {
    const numRows = Math.max(1, Math.min(1000, parseInt(count, 10) || 1));
    recordUndo();
    const now = Date.now();
    const newRowsList = [];
    for (let i = 0; i < numRows; i++) {
      const newRow = { id: `row-${now}-${i}` };
      currentColumns.forEach((col) => {
        newRow[col.id] = ''; // Do NOT add any default data
      });
      newRowsList.push(newRow);
    }

    let updatedRows = [...currentRows];
    if (position === 'bottom') {
      updatedRows.push(...newRowsList);
    } else if (position === 'above') {
      const idx = selectionMode === 'row' && selectedRowIndices.length > 0 ? Math.min(...selectedRowIndices) : activeCell.rowIndex;
      updatedRows.splice(idx, 0, ...newRowsList);
    } else if (position === 'below') {
      const idx = selectionMode === 'row' && selectedRowIndices.length > 0 ? Math.max(...selectedRowIndices) : activeCell.rowIndex;
      updatedRows.splice(idx + 1, 0, ...newRowsList);
    }

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    const targetIdx = position === 'bottom' ? updatedRows.length - 1 : (position === 'above' ? activeCell.rowIndex : activeCell.rowIndex + 1);
    setActiveCell({ rowIndex: targetIdx, colId: currentColumns[0]?.id || 'col_title' });
    showToast(`Added ${numRows} new row${numRows > 1 ? 's' : ''}`);
  };

  // Add Single Row
  const handleAddRow = (position = 'bottom') => {
    handleAddNRows(1, position);
  };

  // Delete Row(s)
  const handleDeleteRow = () => {
    if (currentRows.length === 0) return;
    recordUndo();

    if (selectionMode === 'row' && selectedRowIndices.length > 0) {
      const toDeleteIds = new Set();
      selectedRowIndices.forEach((rIdx) => {
        const row = visibleRows[rIdx];
        if (row?.id) toDeleteIds.add(row.id);
      });
      const updatedRows = currentRows.filter((r) => !toDeleteIds.has(r.id));
      const count = selectedRowIndices.length;
      const updatedSheets = [...sheets];
      updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
      setSheets(updatedSheets);
      persistSheetChanges(updatedSheets);
      setSelectedRowIndices([]);
      setLastRowClicked(null);
      if (updatedRows.length > 0) {
        setActiveCell({ rowIndex: Math.min(activeCell.rowIndex, updatedRows.length - 1), colId: activeCell.colId });
      }
      showToast(`Deleted ${count} row${count > 1 ? 's' : ''}`);
      return;
    }

    const targetIdx = activeCell.rowIndex;
    const rowToDelete = visibleRows[targetIdx];
    if (!rowToDelete) return;

    const updatedRows = currentRows.filter((r) => r.id !== rowToDelete.id);
    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    if (targetIdx >= updatedRows.length && updatedRows.length > 0) {
      setActiveCell({ rowIndex: updatedRows.length - 1, colId: activeCell.colId });
    }
    showToast(`Row ${targetIdx + 1} deleted`);
  };

  // Add Column
  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;

    recordUndo();
    const newColId = `col_${Date.now()}`;
    const newCol = {
      id: newColId,
      label: newColLabel.trim(),
      width: 160,
      type: newColType
    };

    const updatedColumns = [...currentColumns, newCol];
    const updatedRows = currentRows.map((r) => ({
      ...r,
      [newColId]: '' // Blank data
    }));

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      columns: updatedColumns,
      rows: updatedRows
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setShowAddColModal(false);
    setNewColLabel('');
    setNewColType('text');
    showToast(`Column "${newCol.label}" inserted`);
  };

  // Image Double Click Trigger for upload
  const handleImageDoubleClick = (rIdx, colId) => {
    setPendingUploadCell({ rowIndex: rIdx, colId });
    fileInputRef.current?.click();
  };

  // Conditional Formatting Rules management
  const handleAddConditionalRule = (e) => {
    e.preventDefault();
    if (!newRuleValue.trim()) return;

    recordUndo();
    const newRule = {
      id: `cr-${Date.now()}`,
      enabled: true,
      condition: newRuleCondition,
      value: newRuleValue.trim(),
      bgColor: newRuleBgColor,
      color: newRuleColor,
      label: `"${newRuleValue.trim()}" -> Highlight`
    };

    const currentRules = currentSheet.conditionalRules || [...DEFAULT_CONDITIONAL_RULES];
    const updatedRules = [...currentRules, newRule];

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      conditionalRules: updatedRules
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setNewRuleValue('');
    showToast(`Added rule for "${newRule.value}"`);
  };

  const handleToggleConditionalRule = (ruleId) => {
    recordUndo();
    const currentRules = currentSheet.conditionalRules || [...DEFAULT_CONDITIONAL_RULES];
    const updatedRules = currentRules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      conditionalRules: updatedRules
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
  };

  const handleDeleteConditionalRule = (ruleId) => {
    recordUndo();
    const currentRules = currentSheet.conditionalRules || [...DEFAULT_CONDITIONAL_RULES];
    const updatedRules = currentRules.filter((r) => r.id !== ruleId);

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      conditionalRules: updatedRules
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    showToast('Conditional rule removed');
  };

  // Delete Column
  const handleDeleteColumn = (colId) => {
    if (currentColumns.length <= 1) {
      alert('A sheet must have at least one column.');
      return;
    }
    recordUndo();
    const targetCol = currentColumns.find((c) => c.id === colId);
    const updatedColumns = currentColumns.filter((c) => c.id !== colId);
    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, columns: updatedColumns };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    if (activeCell.colId === colId) {
      setActiveCell({ rowIndex: activeCell.rowIndex, colId: updatedColumns[0].id });
      setSelectedColId(updatedColumns[0].id);
    }
    showToast(`Column "${targetCol?.label || 'Selected'}" deleted`);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // N NUMBER OF SHEETS (Tabs Engine)
  // ═════════════════════════════════════════════════════════════════════════════

  // Add New Sheet Tab (+)
  const handleAddSheetTab = async () => {
    recordUndo();
    const sheetNum = sheets.length + 1;
    const sheetName = `Sheet ${sheetNum}`;

    const newSheet = {
      id: Date.now(),
      sheet_name: sheetName,
      tab_color: TAB_COLORS[(sheetNum - 1) % TAB_COLORS.length].hex,
      columns: [
        { id: 'col_a', label: 'Item / ID', width: 120, type: 'text' },
        { id: 'col_b', label: 'Title / Description', width: 280, type: 'text' },
        { id: 'col_c', label: 'Category', width: 150, type: 'text' },
        { id: 'col_status', label: 'Status', width: 130, type: 'status' }
      ],
      rows: [
        { id: 'row-1', col_a: '01', col_b: 'Sample row entry', col_c: 'General', col_status: 'Untested' },
        { id: 'row-2', col_a: '02', col_b: '', col_c: '', col_status: 'Untested' },
        { id: 'row-3', col_a: '03', col_b: '', col_c: '', col_status: 'Untested' }
      ]
    };

    // Try creating via API if available
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await axios.post(
          `http://localhost:5000/api/admin/projects/${projectId}/sheets`,
          { sheet_name: newSheet.sheet_name, columns: newSheet.columns, rows: newSheet.rows },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.id) {
          newSheet.id = res.data.id;
        }
      } catch (err) {
        console.warn('Backend sheet create failed, keeping local id:', err.message);
      }
    }

    const updatedSheets = [...sheets, newSheet];
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setActiveSheetIndex(updatedSheets.length - 1);
    setActiveCell({ rowIndex: 0, colId: 'col_a' });
    setSelectionMode('cell');
    showToast(`Created ${sheetName}`);
  };

  // Duplicate Sheet Tab
  const handleDuplicateSheet = (index) => {
    recordUndo();
    const sourceSheet = sheets[index];
    if (!sourceSheet) return;

    const newSheet = {
      ...JSON.parse(JSON.stringify(sourceSheet)),
      id: Date.now(),
      sheet_name: `Copy of ${sourceSheet.sheet_name}`
    };

    const updatedSheets = [...sheets];
    updatedSheets.splice(index + 1, 0, newSheet);
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setActiveSheetIndex(index + 1);
    setTabMenuIndex(null);
    showToast(`Duplicated "${sourceSheet.sheet_name}"`);
  };

  // Inline Rename Sheet Tab
  const startTabRename = (index) => {
    setEditingTabIdx(index);
    setEditingTabName(sheets[index].sheet_name);
    setTabMenuIndex(null);
  };

  const commitTabRename = () => {
    if (editingTabIdx === null) return;
    const finalName = editingTabName.trim() || `Sheet ${editingTabIdx + 1}`;
    recordUndo();
    const updatedSheets = [...sheets];
    updatedSheets[editingTabIdx] = {
      ...updatedSheets[editingTabIdx],
      sheet_name: finalName
    };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setEditingTabIdx(null);
    showToast(`Renamed to "${finalName}"`);
  };

  // Change Tab Color
  const handleChangeTabColor = (index, colorHex) => {
    recordUndo();
    const updatedSheets = [...sheets];
    updatedSheets[index] = {
      ...updatedSheets[index],
      tab_color: colorHex
    };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setTabMenuIndex(null);
    showToast('Tab color updated');
  };

  // Delete Sheet Tab
  const handleDeleteTab = async (index, e) => {
    if (e) e.stopPropagation();
    if (sheets.length <= 1) {
      alert('Cannot delete the last sheet tab. A workbook must have at least one sheet.');
      return;
    }
    const targetSheet = sheets[index];
    if (!window.confirm(`Delete sheet tab "${targetSheet.sheet_name}"?`)) return;

    recordUndo();
    const token = localStorage.getItem('token');
    if (token && targetSheet.id) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/projects/${projectId}/sheets/${targetSheet.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Backend delete sheet tab error:', err.message);
      }
    }

    const updatedSheets = sheets.filter((_, idx) => idx !== index);
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setActiveSheetIndex(Math.max(0, index - 1));
    setTabMenuIndex(null);
    showToast(`Deleted sheet "${targetSheet.sheet_name}"`);
  };

  // Export Sheet to CSV
  const handleExportCSV = () => {
    if (currentRows.length === 0) return;
    const headers = currentColumns.map((c) => `"${c.label}"`);
    const csvContent = [headers.join(',')];

    currentRows.forEach((r) => {
      const row = currentColumns.map((c) => `"${String(r[c.id] ?? '').replace(/"/g, '""')}"`);
      csvContent.push(row.join(','));
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.project_code || 'Project'}_${currentSheet.sheet_name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV downloaded');
  };

  // Right-Click Context Menu
  const handleContextMenu = (e, type, rowIndex = null, colId = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'row' && rowIndex !== null) {
      handleSelectRow(rowIndex);
    } else if (type === 'col' && colId) {
      handleSelectColumn(colId);
    } else if (type === 'cell') {
      handleCellClick(rowIndex, colId);
    }

    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 300),
      type,
      rowIndex,
      colId
    });
  };

  // QA Metrics Calculations
  const qaMetrics = useMemo(() => {
    const total = currentRows.length;
    let pass = 0;
    let fail = 0;
    let blocked = 0;
    let inProgress = 0;
    let untested = 0;

    currentRows.forEach((r) => {
      const statusCol = currentColumns.find((c) => c.type === 'status' || c.id === 'col_status' || c.label?.toLowerCase().includes('status'));
      const statusVal = String(statusCol ? r[statusCol.id] : (r.col_status || r.status || '')).trim().toLowerCase();
      if (statusVal === 'pass' || statusVal === 'passed') pass++;
      else if (statusVal === 'fail' || statusVal === 'failed') fail++;
      else if (statusVal === 'blocked') blocked++;
      else if (statusVal === 'in progress' || statusVal === 'inprogress') inProgress++;
      else untested++;
    });

    const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
    const failRate = total > 0 ? Math.round((fail / total) * 100) : 0;
    const blockedRate = total > 0 ? Math.round((blocked / total) * 100) : 0;

    return { total, pass, fail, blocked, inProgress, untested, passRate, failRate, blockedRate };
  }, [currentRows]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDepartment');
    navigate('/', { replace: true });
  };

  return (
    <div className="pjs-layout">
      {/* Logout confirmation */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Main Left App Sidebar (collapsed for maximum sheet area) */}
      <AdminSidebar defaultCollapsed onLogout={() => setShowLogoutModal(true)} />

      {/* Main Google Sheets Application Viewport */}
      <main className="pjs-main" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
        
        {/* 1. Google Sheets App Header Bar */}
        <header className="pjs-header">
          <div className="pjs-header-left">
            <button
              className="pjs-back-btn"
              onClick={() => navigate('/admin/projects')}
              title="Return to Projects Catalog"
            >
              <ArrowLeft size={16} />
              <span>Projects</span>
            </button>
            <button
              className="pjs-back-btn pjs-back-btn-secondary"
              onClick={() => navigate(`/admin/projects/${projectId}`, { state: { project } })}
              title="Return to Project Workspace Details"
            >
              <Folder size={14} />
              <span>Workspace</span>
            </button>

            {/* Google Sheets Green Logo Emblem */}
            <div className="pjs-gsheets-logo" title="Google Sheets-Style Project Sheet">
              <FileSpreadsheet size={24} color="#0F9D58" strokeWidth={2.4} />
            </div>

            <div className="pjs-doc-identity">
              <div className="pjs-doc-title-row">
                <span className="pjs-doc-title">{project.name || 'Project Sheet'}</span>
                <span className="pjs-doc-pill">{project.project_code}</span>
                <span className={`pjs-cloud-pill ${cloudStatus}`}>
                  {cloudStatus === 'saving' ? (
                    <>
                      <Clock size={12} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Saved to Drive</span>
                    </>
                  )}
                </span>
              </div>

              {/* Google Sheets Menu Row (File, Edit, View, Insert, Format, Data, Tools, Help) */}
              <nav className="pjs-menu-bar" aria-label="Sheet Menus">
                {/* File Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'file' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                  >
                    File
                  </button>
                  {activeMenu === 'file' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="pjs-dropdown-opt" onClick={() => { handleAddSheetTab(); setActiveMenu(null); }}>
                        <Plus size={14} /> New Sheet Tab
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handleExportCSV(); setActiveMenu(null); }}>
                        <Download size={14} /> Download as CSV
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { window.print(); setActiveMenu(null); }}>
                        <Printer size={14} /> Print Sheet
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => navigate('/admin/projects')}>
                        <ArrowLeft size={14} /> Close to Projects Catalog
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => navigate(`/admin/projects/${projectId}`, { state: { project } })}>
                        <Folder size={14} /> Close to Project Workspace
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'edit' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}
                  >
                    Edit
                  </button>
                  {activeMenu === 'edit' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="pjs-dropdown-opt" onClick={() => { handleUndo(); setActiveMenu(null); }}>
                        <RotateCcw size={14} /> Undo <span className="pjs-shortcut">Ctrl+Z</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handleRedo(); setActiveMenu(null); }}>
                        <RotateCw size={14} /> Redo <span className="pjs-shortcut">Ctrl+Y</span>
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { handleCut(); setActiveMenu(null); }}>
                        <Scissors size={14} /> Cut <span className="pjs-shortcut">Ctrl+X</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handleCopy(); setActiveMenu(null); }}>
                        <Copy size={14} /> Copy <span className="pjs-shortcut">Ctrl+C</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handlePaste(); setActiveMenu(null); }}>
                        <Clipboard size={14} /> Paste <span className="pjs-shortcut">Ctrl+V</span>
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { handleSelectAll(); setActiveMenu(null); }}>
                        Select all <span className="pjs-shortcut">Ctrl+A</span>
                      </button>
                      <button className="pjs-dropdown-opt danger" onClick={() => { handleDeleteRow(); setActiveMenu(null); }}>
                        <Trash2 size={14} /> Delete Selected Row
                      </button>
                    </div>
                  )}
                </div>

                {/* View Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'view' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                  >
                    View
                  </button>
                  {activeMenu === 'view' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="pjs-dropdown-opt" onClick={() => { setZoomLevel(100); setActiveMenu(null); }}>
                        Zoom: 100% {zoomLevel === 100 && <Check size={14} />}
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { setZoomLevel(125); setActiveMenu(null); }}>
                        Zoom: 125% {zoomLevel === 125 && <Check size={14} />}
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { setZoomLevel(75); setActiveMenu(null); }}>
                        Zoom: 75% {zoomLevel === 75 && <Check size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Insert Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'insert' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'insert' ? null : 'insert'); }}
                  >
                    Insert
                  </button>
                  {activeMenu === 'insert' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="pjs-dropdown-opt" onClick={() => { handleAddRow('above'); setActiveMenu(null); }}>
                        <ArrowUp size={14} /> Row above
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handleAddRow('below'); setActiveMenu(null); }}>
                        <ArrowDown size={14} /> Row below
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { setShowAddColModal(true); setActiveMenu(null); }}>
                        <Columns size={14} /> Insert Column
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { handleAddSheetTab(); setActiveMenu(null); }}>
                        <Plus size={14} /> New Sheet Tab
                      </button>
                    </div>
                  )}
                </div>

                {/* Format Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'format' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'format' ? null : 'format'); }}
                  >
                    Format
                  </button>
                  {activeMenu === 'format' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('bold', !activeStyle.bold); setActiveMenu(null); }}>
                        <Bold size={14} /> Bold <span className="pjs-shortcut">Ctrl+B</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('italic', !activeStyle.italic); setActiveMenu(null); }}>
                        <Italic size={14} /> Italic <span className="pjs-shortcut">Ctrl+I</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('underline', !activeStyle.underline); setActiveMenu(null); }}>
                        <Underline size={14} /> Underline <span className="pjs-shortcut">Ctrl+U</span>
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('strikethrough', !activeStyle.strikethrough); setActiveMenu(null); }}>
                        <Strikethrough size={14} /> Strikethrough
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('wrap', 'wrap'); setActiveMenu(null); showToast('Wrap text enabled'); }}>
                        <WrapText size={14} /> Text Wrapping: Wrap
                      </button>
                      <button className="pjs-dropdown-opt" onClick={() => { applyFormatting('wrap', 'overflow'); setActiveMenu(null); showToast('Overflow enabled'); }}>
                        <WrapText size={14} /> Text Wrapping: Overflow
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { setShowConditionalModal(true); setActiveMenu(null); }}>
                        <Sparkles size={14} color="#1a73e8" /> Conditional formatting...
                      </button>
                      <div className="pjs-dropdown-divider" />
                      <button className="pjs-dropdown-opt" onClick={() => { handleClearFormatting(); setActiveMenu(null); }}>
                        <RemoveFormatting size={14} /> Clear Formatting
                      </button>
                    </div>
                  )}
                </div>

                {/* Data Menu */}
                <div className="pjs-menu-item-wrap">
                  <button
                    className={`pjs-menu-item-btn ${activeMenu === 'data' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'data' ? null : 'data'); }}
                  >
                    Data
                  </button>
                  {activeMenu === 'data' && (
                    <div className="pjs-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="pjs-dropdown-opt"
                        onClick={() => {
                          recordUndo();
                          const sortedRows = [...currentRows].sort((a, b) =>
                            String(a[activeCell.colId] ?? '').localeCompare(String(b[activeCell.colId] ?? ''))
                          );
                          const updatedSheets = [...sheets];
                          updatedSheets[activeSheetIndex] = { ...currentSheet, rows: sortedRows };
                          setSheets(updatedSheets);
                          persistSheetChanges(updatedSheets);
                          setActiveMenu(null);
                          showToast('Sorted A → Z');
                        }}
                      >
                        Sort column A → Z
                      </button>
                      <button
                        className="pjs-dropdown-opt"
                        onClick={() => {
                          recordUndo();
                          const sortedRows = [...currentRows].sort((a, b) =>
                            String(b[activeCell.colId] ?? '').localeCompare(String(a[activeCell.colId] ?? ''))
                          );
                          const updatedSheets = [...sheets];
                          updatedSheets[activeSheetIndex] = { ...currentSheet, rows: sortedRows };
                          setSheets(updatedSheets);
                          persistSheetChanges(updatedSheets);
                          setActiveMenu(null);
                          showToast('Sorted Z → A');
                        }}
                      >
                        Sort column Z → A
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>

          {/* Header Right: Project QA Summary Chips */}
          <div className="pjs-header-right">
            <div className="pjs-header-stat-chip">
              <span className="dot pass" />
              <span>Pass: {qaMetrics.passRate}%</span>
            </div>
            <div className="pjs-header-stat-chip">
              <span className="dot fail" />
              <span>Issues: {qaMetrics.fail + qaMetrics.blocked}</span>
            </div>
            <button className="pjs-share-btn" onClick={handleExportCSV} title="Export CSV Spreadsheet">
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* 2. Google Sheets Action Toolbar */}
        <div className="pjs-toolbar">
          {/* History */}
          <button className="pjs-tb-btn" onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={undoStack.length === 0}>
            <RotateCcw size={15} />
          </button>
          <button className="pjs-tb-btn" onClick={handleRedo} title="Redo (Ctrl+Y)" disabled={redoStack.length === 0}>
            <RotateCw size={15} />
          </button>
          <button className="pjs-tb-btn" onClick={() => window.print()} title="Print">
            <Printer size={15} />
          </button>

          <div className="pjs-tb-divider" />

          {/* Zoom */}
          <select
            className="pjs-tb-select"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            title="Zoom"
          >
            <option value={75}>75%</option>
            <option value={90}>90%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>

          <div className="pjs-tb-divider" />

          {/* Font Family */}
          <select
            className="pjs-tb-font-select"
            value={activeStyle.fontFamily}
            onChange={(e) => applyFormatting('fontFamily', e.target.value)}
            title="Font Family"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font Size Step Controls */}
          <div className="pjs-tb-font-size-group">
            <button
              className="pjs-tb-size-btn"
              onClick={() => handleFontSizeStep(-1)}
              title="Decrease font size"
            >
              <Minus size={13} />
            </button>
            <select
              className="pjs-tb-size-select"
              value={activeStyle.fontSize}
              onChange={(e) => applyFormatting('fontSize', Number(e.target.value))}
              title="Font size"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className="pjs-tb-size-btn"
              onClick={() => handleFontSizeStep(1)}
              title="Increase font size"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="pjs-tb-divider" />

          {/* Text Formatting */}
          <button
            className={`pjs-tb-btn ${activeStyle.bold ? 'active' : ''}`}
            onClick={() => applyFormatting('bold', !activeStyle.bold)}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.italic ? 'active' : ''}`}
            onClick={() => applyFormatting('italic', !activeStyle.italic)}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.underline ? 'active' : ''}`}
            onClick={() => applyFormatting('underline', !activeStyle.underline)}
            title="Underline (Ctrl+U)"
          >
            <Underline size={15} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.strikethrough ? 'active' : ''}`}
            onClick={() => applyFormatting('strikethrough', !activeStyle.strikethrough)}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>

          {/* Text color picker */}
          <div className="pjs-color-picker-wrap">
            <button
              className="pjs-tb-btn pjs-tb-color-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setOpenColorPopover(openColorPopover === 'text' ? null : 'text');
              }}
              title="Text Color"
            >
              <Baseline size={15} />
              <span className="pjs-color-bar" style={{ backgroundColor: activeStyle.color || '#202124' }} />
            </button>
            {openColorPopover === 'text' && (
              <div className="pjs-color-palette-popover" onClick={(e) => e.stopPropagation()}>
                <div className="pjs-palette-title">Text Color</div>
                <div className="pjs-palette-grid">
                  {TEXT_COLORS.map((hex) => (
                    <button
                      key={hex}
                      className={`pjs-palette-swatch ${activeStyle.color === hex ? 'selected' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => {
                        applyFormatting('color', hex);
                        setOpenColorPopover(null);
                      }}
                      title={hex}
                    />
                  ))}
                </div>
                <button
                  className="pjs-palette-reset-btn"
                  onClick={() => {
                    applyFormatting('color', '#202124');
                    setOpenColorPopover(null);
                  }}
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>

          {/* Fill color picker */}
          <div className="pjs-color-picker-wrap">
            <button
              className="pjs-tb-btn pjs-tb-color-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setOpenColorPopover(openColorPopover === 'fill' ? null : 'fill');
              }}
              title="Fill Color"
            >
              <PaintBucket size={15} />
              <span className="pjs-color-bar" style={{ backgroundColor: activeStyle.bgColor || '#ffffff' }} />
            </button>
            {openColorPopover === 'fill' && (
              <div className="pjs-color-palette-popover" onClick={(e) => e.stopPropagation()}>
                <div className="pjs-palette-title">Fill Color</div>
                <div className="pjs-palette-grid">
                  {FILL_COLORS.map((c) => (
                    <button
                      key={c.label}
                      className={`pjs-palette-swatch ${activeStyle.bgColor === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex || '#ffffff', border: c.hex ? '1px solid #dadce0' : '1px dashed #9aa0a6' }}
                      onClick={() => {
                        applyFormatting('bgColor', c.hex);
                        setOpenColorPopover(null);
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
                <button
                  className="pjs-palette-reset-btn"
                  onClick={() => {
                    applyFormatting('bgColor', '');
                    setOpenColorPopover(null);
                  }}
                >
                  Reset / No Fill
                </button>
              </div>
            )}
          </div>

          <div className="pjs-tb-divider" />

          {/* Horizontal Alignment */}
          <button
            className={`pjs-tb-btn ${activeStyle.align === 'left' ? 'active' : ''}`}
            onClick={() => applyFormatting('align', 'left')}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.align === 'center' ? 'active' : ''}`}
            onClick={() => applyFormatting('align', 'center')}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.align === 'right' ? 'active' : ''}`}
            onClick={() => applyFormatting('align', 'right')}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>

          {/* Vertical Alignment */}
          <button
            className={`pjs-tb-btn ${activeStyle.valign === 'top' ? 'active' : ''}`}
            onClick={() => applyFormatting('valign', 'top')}
            title="Align Top"
          >
            <ArrowUp size={13} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.valign === 'middle' ? 'active' : ''}`}
            onClick={() => applyFormatting('valign', 'middle')}
            title="Align Middle"
          >
            <AlignCenter size={13} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button
            className={`pjs-tb-btn ${activeStyle.valign === 'bottom' ? 'active' : ''}`}
            onClick={() => applyFormatting('valign', 'bottom')}
            title="Align Bottom"
          >
            <ArrowDown size={13} />
          </button>

          <div className="pjs-tb-divider" />

          {/* Text Wrap */}
          <button
            className={`pjs-tb-btn ${activeStyle.wrap === 'wrap' ? 'active' : ''}`}
            onClick={() => {
              const nextWrap = activeStyle.wrap === 'wrap' ? 'overflow' : 'wrap';
              applyFormatting('wrap', nextWrap);
              showToast(`Text wrap: ${nextWrap}`);
            }}
            title={`Text Wrap (${activeStyle.wrap || 'overflow'})`}
          >
            <WrapText size={15} />
          </button>

          {/* Conditional Formatting Modal Launcher */}
          <button
            className={`pjs-tb-btn ${showConditionalModal ? 'active' : ''}`}
            onClick={() => setShowConditionalModal(true)}
            title="Conditional Formatting Rules"
          >
            <Sparkles size={15} color="#1a73e8" />
          </button>

          {/* Clear Formatting */}
          <button
            className="pjs-tb-btn"
            onClick={handleClearFormatting}
            title="Clear formatting"
          >
            <RemoveFormatting size={15} />
          </button>

          <div className="pjs-tb-divider" />

          {/* Copy, Cut, Paste Tools */}
          <button className="pjs-tb-btn" onClick={handleCopy} title="Copy Selected (Ctrl+C)">
            <Copy size={15} />
          </button>
          <button className="pjs-tb-btn" onClick={handleCut} title="Cut Selected (Ctrl+X)">
            <Scissors size={15} />
          </button>
          <button className="pjs-tb-btn" onClick={handlePaste} title="Paste Content (Ctrl+V)">
            <Clipboard size={15} />
          </button>

          <div className="pjs-tb-divider" />

          {/* Row & Column Insertion with N Rows Input */}
          <div className="pjs-tb-row-input-group" title="Add N Rows at bottom">
            <button
              className="pjs-tb-pill-btn"
              onClick={() => handleAddNRows(rowsToAddInput, 'bottom')}
              title={`Add ${rowsToAddInput || 1} rows at bottom`}
            >
              <Plus size={14} />
              <span>Row</span>
            </button>
            <input
              type="number"
              min="1"
              max="1000"
              className="pjs-tb-row-count-input"
              value={rowsToAddInput}
              onChange={(e) => setRowsToAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNRows(rowsToAddInput, 'bottom');
                }
              }}
              title="Number of rows to add (Press Enter to add)"
            />
          </div>
          <button className="pjs-tb-pill-btn" onClick={() => setShowAddColModal(true)} title="Insert New Column">
            <Columns size={14} />
            <span>Column</span>
          </button>
          <button className="pjs-tb-btn danger" onClick={handleDeleteRow} title="Delete Selected Row">
            <Trash2 size={15} />
          </button>

          {/* Search bar inside toolbar */}
          <div className="pjs-tb-search">
            <Search size={14} color="#5f6368" />
            <input
              type="text"
              placeholder="Find in sheet..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button className="pjs-tb-search-clear" onClick={() => setSearchFilter('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 3. Google Sheets Formula Bar */}
        <div className="pjs-formula-bar">
          <div className="pjs-name-box" title="Cell / Row / Column Coordinate">
            {activeCoord}
          </div>
          <div className="pjs-fx-icon" title="Formula Function Indicator">
            fx
          </div>
          <input
            type="text"
            className="pjs-formula-input"
            placeholder="Type value or formula for selected cell..."
            value={formulaValue}
            onChange={(e) => setFormulaValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit(activeCell.rowIndex, activeCell.colId, formulaValue);
              }
            }}
            onBlur={() => commitEdit(activeCell.rowIndex, activeCell.colId, formulaValue)}
          />
        </div>

        {/* 4. Google Sheets Spreadsheet Grid Viewport */}
        <div
          className="pjs-grid-viewport"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        >
          <table className="pjs-table">
            <thead>
              {/* Column Letter Row (A, B, C...) with Whole-Column Selection */}
              <tr className="pjs-col-letter-row">
                {/* Select All Corner Box */}
                <th
                  className={`pjs-select-all-cell ${selectionMode === 'all' ? 'active' : ''}`}
                  onClick={handleSelectAll}
                  title="Select all cells (Ctrl+A)"
                >
                  <div className="pjs-select-all-triangle" />
                </th>

                {currentColumns.map((col, cIdx) => {
                  const isColSelected = selectionMode === 'column' && selectedColId === col.id;
                  const isCopiedCol = copiedIndicator?.type === 'column' && copiedIndicator.id === col.id;
                  const isAllSelected = selectionMode === 'all';

                  return (
                    <th
                      key={col.id}
                      className={`pjs-col-letter-th ${isAllSelected ? 'all-selected' : ''} ${isColSelected ? 'selected' : ''} ${isCopiedCol ? 'copied' : ''}`}
                      style={{ width: col.width }}
                      onClick={() => handleSelectColumn(col.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'col', null, col.id)}
                      title={`Column ${getColLetter(cIdx)} - Click to select column`}
                    >
                      <div className="pjs-col-letter-inner">
                        <span>{getColLetter(cIdx)}</span>
                        {/* Column menu trigger arrow */}
                        <span
                          className="pjs-col-menu-arrow"
                          onClick={(e) => handleContextMenu(e, 'col', null, col.id)}
                        >
                          <ChevronDown size={11} />
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Column Name / Header Row */}
              <tr className="pjs-col-name-row">
                <th className="pjs-row-header-th">#</th>
                {currentColumns.map((col) => (
                  <th key={col.id} style={{ width: col.width }}>
                    <div className="pjs-col-header-inner">
                      <span className="pjs-col-label">{col.label}</span>
                      <button
                        className="pjs-col-del-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn(col.id);
                        }}
                        title={`Delete column "${col.label}"`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, rIdx) => {
                const isRowSelected = selectionMode === 'row' && selectedRowIndices.includes(rIdx);
                const isCopiedRow = copiedIndicator?.type === 'rows' ? copiedIndicator.indices?.includes(rIdx) : (copiedIndicator?.type === 'row' && copiedIndicator.index === rIdx);

                // Check if any status column or status property in this row indicates "Fail"
                const isFailRow = currentColumns.some((col) => {
                  const isStatus = col.type === 'status' || col.id === 'col_status' || col.id === 'status' || col.label?.toLowerCase().includes('status');
                  if (isStatus) {
                    const val = String(row[col.id] ?? '').trim().toLowerCase();
                    return val === 'fail' || val === 'failed';
                  }
                  return false;
                }) || ['fail', 'failed'].includes(String(row.col_status ?? row.status ?? '').trim().toLowerCase());

                return (
                  <tr
                    key={row.id || rIdx}
                    className={`pjs-row ${isFailRow ? 'row-status-fail' : ''} ${isRowSelected ? 'row-selected' : ''} ${isCopiedRow ? 'row-copied' : ''}`}
                  >
                    {/* Row Index Number Header (1, 2, 3...) with Whole-Row Selection */}
                    <td
                      className={`pjs-row-number-td ${selectionMode === 'all' ? 'all-selected' : ''} ${isRowSelected ? 'selected' : ''}`}
                      onClick={(e) => handleSelectRow(rIdx, e)}
                      onContextMenu={(e) => handleContextMenu(e, 'row', rIdx)}
                      title={`Row ${rIdx + 1} - Click to select row (Shift+click for range, Ctrl+click for multi)`}
                    >
                      {rIdx + 1}
                    </td>

                    {/* Cells in Row */}
                    {currentColumns.map((col, cIdx) => {
                      const isActiveCell = activeCell.rowIndex === rIdx && activeCell.colId === col.id;
                      const isEditing = editingCell?.rowIndex === rIdx && editingCell?.colId === col.id;
                      const isColSelected = selectionMode === 'column' && selectedColId === col.id;
                      const isAllSelected = selectionMode === 'all';
                      const rawVal = row[col.id] ?? '';
                      const cellStyle = resolveCellStyle(rIdx, col.id);

                      return (
                        <td
                          key={col.id}
                          className={`pjs-cell ${isFailRow ? 'fail-row-cell' : ''} ${isActiveCell ? 'active' : ''} ${isAllSelected ? 'all-selected-cell' : ''} ${isRowSelected ? 'row-highlight' : ''} ${isColSelected ? 'col-highlight' : ''}`}
                          style={{
                            width: col.width,
                            backgroundColor: isAllSelected ? undefined : (cellStyle.backgroundColor || undefined),
                            fontFamily: cellStyle.fontFamily,
                            fontSize: cellStyle.fontSize,
                            color: cellStyle.color,
                            textAlign: cellStyle.textAlign,
                            verticalAlign: cellStyle.verticalAlign
                          }}
                          onClick={() => handleCellClick(rIdx, col.id)}
                          onDoubleClick={() => startEditing(rIdx, col.id)}
                          onContextMenu={(e) => handleContextMenu(e, 'cell', rIdx, col.id)}
                        >
                          {isEditing ? (
                            col.type === 'status' ? (
                              <select
                                ref={cellInputRef}
                                className="pjs-status-cover-select"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  commitEdit(rIdx, col.id, e.target.value);
                                }}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              >
                                <option value="">(Empty)</option>
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                                <option value="Blocked">Blocked</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Untested">Untested</option>
                              </select>
                            ) : col.type === 'priority' ? (
                              <select
                                ref={cellInputRef}
                                className="pjs-cell-select"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  commitEdit(rIdx, col.id, e.target.value);
                                }}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              >
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            ) : col.type === 'image' ? (
                              <div className="pjs-cell-img-edit-box">
                                <input
                                  ref={cellInputRef}
                                  type="text"
                                  placeholder="Paste image URL or Ctrl+V..."
                                  className="pjs-cell-editor"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(rIdx, col.id, editValue)}
                                />
                                <button
                                  type="button"
                                  className="pjs-img-upload-trigger"
                                  onClick={() => {
                                    setPendingUploadCell({ rowIndex: rIdx, colId: col.id });
                                    fileInputRef.current?.click();
                                  }}
                                  title="Browse image file"
                                >
                                  <Upload size={12} />
                                </button>
                              </div>
                            ) : (
                              <input
                                ref={cellInputRef}
                                type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                                className="pjs-cell-editor"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              />
                            )
                          ) : col.type === 'status' ? (
                            !rawVal ? (
                              <div
                                className="pjs-status-cover-empty"
                                onClick={() => startEditing(rIdx, col.id)}
                                title="Click to set status"
                              >
                                —
                              </div>
                            ) : (
                              <div className="pjs-status-cell-wrapper">
                                <div
                                  className={`pjs-status-cover ${String(rawVal).toLowerCase().replace(/\s+/g, '')}`}
                                  onClick={() => startEditing(rIdx, col.id)}
                                  title={`Status: ${rawVal} (Click to change)`}
                                >
                                  <span>{rawVal}</span>
                                  <span className="pjs-status-cover-arrow">
                                    <ChevronDown size={11} />
                                  </span>
                                </div>
                                {isFailRow && (
                                  <button
                                    type="button"
                                    className="pjs-cell-raise-bug-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFailTestCase(row);
                                      setRaiseBugModalOpen(true);
                                    }}
                                    title="Click to raise project bug ticket for this failure"
                                  >
                                    <Bug size={11} />
                                    <span>Raise Bug</span>
                                  </button>
                                )}
                              </div>
                            )
                          ) : col.type === 'priority' ? (
                            <div
                              className="pjs-cell-content"
                              style={{
                                justifyContent: cellStyle.textAlign === 'center' ? 'center' : cellStyle.textAlign === 'right' ? 'flex-end' : 'flex-start'
                              }}
                            >
                              <span className={`pjs-priority-chip ${String(rawVal).toLowerCase()}`}>
                                {rawVal || 'Medium'}
                              </span>
                            </div>
                          ) : col.type === 'image' ? (
                            rawVal ? (
                              <div
                                className="pjs-cell-img-content"
                                onClick={() => handleCellClick(rIdx, col.id)}
                                onDoubleClick={() => handleImageDoubleClick(rIdx, col.id)}
                              >
                                <img
                                  src={rawVal}
                                  alt="Screenshot"
                                  className="pjs-cell-img-thumb"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageModal(rawVal);
                                  }}
                                  title="Click to view full image, dbl-click to replace"
                                />
                                <button
                                  className="pjs-cell-img-expand-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImageModal(rawVal);
                                  }}
                                  title="Enlarge screenshot"
                                >
                                  <Maximize2 size={11} />
                                </button>
                                <button
                                  className="pjs-cell-img-clear-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    commitEdit(rIdx, col.id, '');
                                    showToast('Image cleared');
                                  }}
                                  title="Remove image"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`pjs-cell-img-box ${isActiveCell ? 'active-target' : ''}`}
                                onClick={() => handleCellClick(rIdx, col.id)}
                                onDoubleClick={() => handleImageDoubleClick(rIdx, col.id)}
                                title="Click to select cell (Ctrl+V to paste screenshot) | Double-click to browse file"
                              >
                                <Image size={13} className="pjs-cell-img-empty-icon" />
                                <span>{isActiveCell ? 'Paste (Ctrl+V) / Dbl-click' : 'Paste or dbl-click'}</span>
                              </div>
                            )
                          ) : (
                            <div
                              className={`pjs-cell-content ${cellStyle.wrap === 'wrap' ? 'wrap-text' : (cellStyle.wrap === 'clip' ? 'clip-text' : '')}`}
                              style={{
                                justifyContent: cellStyle.textAlign === 'center' ? 'center' : cellStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                fontWeight: cellStyle.fontWeight,
                                fontStyle: cellStyle.fontStyle,
                                textDecoration: cellStyle.textDecoration,
                                color: cellStyle.color,
                                fontFamily: cellStyle.fontFamily,
                                fontSize: cellStyle.fontSize,
                                whiteSpace: cellStyle.wrap === 'wrap' ? 'normal' : 'nowrap',
                                wordBreak: cellStyle.wrap === 'wrap' ? 'break-word' : 'normal'
                              }}
                            >
                              {rawVal}
                            </div>
                          )}

                          {/* Authentic Google Sheets Bottom-Right Cell Handle */}
                          {isActiveCell && <div className="pjs-cell-handle" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Google Sheets-Style "Add N more rows at bottom" Control */}
          <div className="pjs-bottom-add-rows-bar">
            <div className="pjs-bottom-add-rows-left">
              <span className="pjs-add-rows-txt">Add</span>
              <input
                type="number"
                min="1"
                max="1000"
                className="pjs-add-rows-input"
                value={rowsToAddInput}
                onChange={(e) => setRowsToAddInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNRows(rowsToAddInput, 'bottom');
                  }
                }}
                title="Enter number of rows to add"
              />
              <span className="pjs-add-rows-txt">more rows at bottom.</span>
              <button
                className="pjs-add-rows-action-btn"
                onClick={() => handleAddNRows(rowsToAddInput, 'bottom')}
                title={`Add ${rowsToAddInput || 1} rows`}
              >
                <Plus size={14} strokeWidth={2.4} />
                <span>Add {rowsToAddInput || 1} rows</span>
              </button>
            </div>

            <div className="pjs-quick-add-chips">
              <span className="pjs-quick-add-label">Quick:</span>
              <button className="pjs-quick-chip" onClick={() => handleAddNRows(1, 'bottom')}>+1</button>
              <button className="pjs-quick-chip" onClick={() => handleAddNRows(5, 'bottom')}>+5</button>
              <button className="pjs-quick-chip" onClick={() => handleAddNRows(10, 'bottom')}>+10</button>
              <button className="pjs-quick-chip" onClick={() => handleAddNRows(50, 'bottom')}>+50</button>
              <button className="pjs-quick-chip" onClick={() => handleAddNRows(100, 'bottom')}>+100</button>
            </div>
          </div>
        </div>

        {/* 5. Google Sheets Bottom Tab Bar (N number of sheets) & Status Calculations */}
        <footer className="pjs-bottom-bar">
          <div className="pjs-sheet-tabs-container">
            {/* Add Sheet Tab Button (+) */}
            <button className="pjs-tab-action-btn" onClick={handleAddSheetTab} title="Add new sheet tab">
              <Plus size={16} strokeWidth={2.5} />
            </button>

            {/* All Sheets Menu Button (≡) */}
            <button
              className="pjs-tab-action-btn"
              onClick={() => setShowAllSheetsModal(true)}
              title="All sheets in workbook"
            >
              <Menu size={16} />
            </button>

            {/* Scrollable Tabs List */}
            <div className="pjs-tabs-scroll-area">
              {sheets.map((sh, idx) => {
                const isActive = activeSheetIndex === idx;
                const isEditingName = editingTabIdx === idx;

                return (
                  <div
                    key={sh.id || idx}
                    className={`pjs-sheet-tab ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSheetIndex(idx);
                      setActiveCell({ rowIndex: 0, colId: sheets[idx]?.columns?.[0]?.id || 'col_title' });
                      setSelectionMode('cell');
                    }}
                    onDoubleClick={() => startTabRename(idx)}
                  >
                    {/* Tab Color Indicator Stripe */}
                    {sh.tab_color && (
                      <span className="pjs-tab-color-stripe" style={{ backgroundColor: sh.tab_color }} />
                    )}

                    {/* Tab Name or Inline Rename Input */}
                    {isEditingName ? (
                      <input
                        ref={tabRenameInputRef}
                        type="text"
                        className="pjs-tab-rename-input"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onBlur={commitTabRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitTabRename();
                          if (e.key === 'Escape') setEditingTabIdx(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="pjs-tab-title">{sh.sheet_name || `Sheet ${idx + 1}`}</span>
                    )}

                    {/* Dropdown Options Arrow on Tab */}
                    <button
                      className="pjs-tab-dropdown-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabMenuIndex(tabMenuIndex === idx ? null : idx);
                      }}
                      title="Sheet options"
                    >
                      <ChevronDown size={12} />
                    </button>

                    {/* Sheet Tab Dropdown Menu */}
                    {tabMenuIndex === idx && (
                      <div className="pjs-tab-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="pjs-tab-menu-item" onClick={() => startTabRename(idx)}>
                          <Edit2 size={13} /> Rename
                        </button>
                        <button className="pjs-tab-menu-item" onClick={() => handleDuplicateSheet(idx)}>
                          <Copy size={13} /> Duplicate
                        </button>
                        <div className="pjs-tab-menu-divider" />
                        <div className="pjs-tab-color-section">
                          <span className="pjs-tab-color-label">Tab color</span>
                          <div className="pjs-tab-colors-grid">
                            {TAB_COLORS.map((c) => (
                              <button
                                key={c.name}
                                className="pjs-tab-color-dot"
                                style={{ backgroundColor: c.hex || '#e2e8f0' }}
                                title={c.name}
                                onClick={() => handleChangeTabColor(idx, c.hex)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="pjs-tab-menu-divider" />
                        <button
                          className="pjs-tab-menu-item danger"
                          onClick={(e) => handleDeleteTab(idx, e)}
                          disabled={sheets.length <= 1}
                        >
                          <Trash2 size={13} /> Delete Sheet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Calculations / Status Summary Bar */}
          <div className="pjs-calc-bar">
            <span>Rows: <strong>{qaMetrics.total}</strong></span>
            <span>Cols: <strong>{currentColumns.length}</strong></span>
            <span className="pjs-calc-stat pass">Pass: <strong>{qaMetrics.passRate}%</strong></span>
            <span className="pjs-calc-stat issues">Issues: <strong>{qaMetrics.fail + qaMetrics.blocked}</strong></span>
            <div className="pjs-calc-progress" title={`Pass: ${qaMetrics.passRate}%`}>
              <div className="pjs-calc-progress-fill" style={{ width: `${qaMetrics.passRate}%` }} />
            </div>
          </div>
        </footer>

        {/* 6. Right-Click Context Menu (Google Sheets Style) */}
        {contextMenu && (
          <div
            className="pjs-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="pjs-ctx-item" onClick={() => { handleCut(); setContextMenu(null); }}>
              <Scissors size={14} /> Cut <span className="pjs-shortcut">Ctrl+X</span>
            </button>
            <button className="pjs-ctx-item" onClick={() => { handleCopy(); setContextMenu(null); }}>
              <Copy size={14} /> Copy <span className="pjs-shortcut">Ctrl+C</span>
            </button>
            <button className="pjs-ctx-item" onClick={() => { handlePaste(); setContextMenu(null); }}>
              <Clipboard size={14} /> Paste <span className="pjs-shortcut">Ctrl+V</span>
            </button>

            <div className="pjs-ctx-divider" />

            {/* Row specific context items */}
            {contextMenu.type === 'row' && (
              <>
                <button className="pjs-ctx-item" onClick={() => { handleCopy(); setContextMenu(null); }}>
                  <Copy size={14} /> Copy Entire Row
                </button>
                <button className="pjs-ctx-item" onClick={() => { handlePaste(); setContextMenu(null); }}>
                  <Clipboard size={14} /> Paste Entire Row
                </button>
                <button className="pjs-ctx-item" onClick={() => { handleAddRow('above'); setContextMenu(null); }}>
                  <ArrowUp size={14} /> Insert 1 row above
                </button>
                <button className="pjs-ctx-item" onClick={() => { handleAddRow('below'); setContextMenu(null); }}>
                  <ArrowDown size={14} /> Insert 1 row below
                </button>
                <button className="pjs-ctx-item danger" onClick={() => { handleDeleteRow(); setContextMenu(null); }}>
                  <Trash2 size={14} /> Delete row
                </button>
              </>
            )}

            {/* Column specific context items */}
            {contextMenu.type === 'col' && (
              <>
                <button className="pjs-ctx-item" onClick={() => { handleCopy(); setContextMenu(null); }}>
                  <Copy size={14} /> Copy Entire Column
                </button>
                <button className="pjs-ctx-item" onClick={() => { handlePaste(); setContextMenu(null); }}>
                  <Clipboard size={14} /> Paste Entire Column
                </button>
                <button className="pjs-ctx-item" onClick={() => { setShowAddColModal(true); setContextMenu(null); }}>
                  <Columns size={14} /> Insert column
                </button>
                <button
                  className="pjs-ctx-item danger"
                  onClick={() => { handleDeleteColumn(contextMenu.colId); setContextMenu(null); }}
                >
                  <Trash2 size={14} /> Delete column
                </button>
              </>
            )}

            {/* Cell specific items */}
            {contextMenu.type === 'cell' && (
              <>
                <button className="pjs-ctx-item" onClick={() => { handleAddRow('below'); setContextMenu(null); }}>
                  <ArrowDown size={14} /> Insert row below
                </button>
                <button className="pjs-ctx-item" onClick={() => { setShowAddColModal(true); setContextMenu(null); }}>
                  <Columns size={14} /> Insert column
                </button>
                <button className="pjs-ctx-item" onClick={() => { commitEdit(activeCell.rowIndex, activeCell.colId, ''); setContextMenu(null); }}>
                  Clear content
                </button>
              </>
            )}
          </div>
        )}

        {/* 7. Toast Notification */}
        {toastMessage && (
          <div className="pjs-toast">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 8. Insert Column Modal */}
        {showAddColModal && (
          <div
            className="pjs-modal-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && setShowAddColModal(false)}
          >
            <div className="pjs-modal-box">
              <div className="pjs-modal-header">
                <h3 className="pjs-modal-title">Insert Column</h3>
                <button className="pjs-modal-close" onClick={() => setShowAddColModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddColumnSubmit}>
                <div className="pjs-form-group">
                  <label>Column Header Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Expected Result, Jira Ticket, Build"
                    value={newColLabel}
                    onChange={(e) => setNewColLabel(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="pjs-form-group">
                  <label>Column Data Type</label>
                  <select value={newColType} onChange={(e) => setNewColType(e.target.value)}>
                    <option value="text">Text (General string)</option>
                    <option value="status">Status Badge (Pass, Fail, Blocked, Untested)</option>
                    <option value="priority">Priority Badge (Critical, High, Medium, Low)</option>
                    <option value="date">Date Picker (YYYY-MM-DD)</option>
                    <option value="number">Number</option>
                    <option value="image">Image / Screenshot (Paste from clipboard or upload)</option>
                  </select>
                </div>

                <div className="pjs-modal-actions">
                  <button type="button" className="pjs-action-pill-btn" onClick={() => setShowAddColModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="pjs-action-pill-btn primary">
                    Insert Column
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 9. All Sheets Navigator Modal (≡) */}
        {showAllSheetsModal && (
          <div
            className="pjs-modal-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && setShowAllSheetsModal(false)}
          >
            <div className="pjs-modal-box sheets-nav">
              <div className="pjs-modal-header">
                <h3 className="pjs-modal-title">All Sheets in Workbook ({sheets.length})</h3>
                <button className="pjs-modal-close" onClick={() => setShowAllSheetsModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="pjs-all-sheets-list">
                {sheets.map((sh, idx) => (
                  <div
                    key={sh.id || idx}
                    className={`pjs-all-sheets-item ${activeSheetIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSheetIndex(idx);
                      setShowAllSheetsModal(false);
                      showToast(`Switched to "${sh.sheet_name}"`);
                    }}
                  >
                    <div className="pjs-sheet-info-left">
                      <span
                        className="pjs-sheet-color-badge"
                        style={{ backgroundColor: sh.tab_color || '#107c41' }}
                      />
                      <span className="pjs-sheet-name-text">{sh.sheet_name}</span>
                    </div>
                    <span className="pjs-sheet-rows-count">
                      {sh.rows?.length || 0} rows · {sh.columns?.length || 0} cols
                    </span>
                  </div>
                ))}
              </div>
              <div className="pjs-modal-actions">
                <button
                  type="button"
                  className="pjs-action-pill-btn primary"
                  onClick={() => {
                    handleAddSheetTab();
                    setShowAllSheetsModal(false);
                  }}
                >
                  <Plus size={14} /> Add New Sheet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Formatting Modal */}
        {showConditionalModal && (
          <div
            className="pjs-modal-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && setShowConditionalModal(false)}
          >
            <div className="pjs-modal-box pjs-conditional-modal">
              <div className="pjs-modal-header">
                <div className="pjs-modal-title-with-icon">
                  <Sparkles size={18} color="#1a73e8" />
                  <h3 className="pjs-modal-title">Conditional Formatting Rules</h3>
                </div>
                <button className="pjs-modal-close" onClick={() => setShowConditionalModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#5f6368' }}>
                  Highlight cells automatically when cell content matches any active rule below:
                </p>

                <div className="pjs-cond-rules-list">
                  {(currentSheet.conditionalRules || DEFAULT_CONDITIONAL_RULES).map((rule) => (
                    <div key={rule.id} className="pjs-cond-rule-item">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleConditionalRule(rule.id)}
                        title="Enable or disable rule"
                      />
                      <span
                        className="pjs-cond-rule-chip"
                        style={{ backgroundColor: rule.bgColor, color: rule.color }}
                      >
                        {rule.condition === 'equals' ? 'Exact: ' : rule.condition === 'contains' ? 'Contains: ' : 'Starts with: '}
                        "{rule.value}"
                      </span>
                      <button
                        type="button"
                        className="pjs-cond-del-btn"
                        onClick={() => handleDeleteConditionalRule(rule.id)}
                        title="Delete rule"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddConditionalRule} style={{ borderTop: '1px solid #dadce0', paddingTop: '14px', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: '#202124' }}>Add Custom Rule</h4>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <select
                      value={newRuleCondition}
                      onChange={(e) => setNewRuleCondition(e.target.value)}
                      style={{ padding: '6px 8px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px', background: '#fff' }}
                    >
                      <option value="equals">Exact match</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts with</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. Pass, Fail, Blocked, Done, High..."
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '12px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      Bg:
                      <input
                        type="color"
                        value={newRuleBgColor}
                        onChange={(e) => setNewRuleBgColor(e.target.value)}
                        style={{ width: '28px', height: '26px', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                    </label>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      Text:
                      <input
                        type="color"
                        value={newRuleColor}
                        onChange={(e) => setNewRuleColor(e.target.value)}
                        style={{ width: '28px', height: '26px', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                    </label>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        backgroundColor: newRuleBgColor,
                        color: newRuleColor,
                        fontSize: '11px',
                        fontWeight: 'bold',
                        marginLeft: 'auto'
                      }}
                    >
                      {newRuleValue || 'Preview'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="pjs-action-pill-btn primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && pendingUploadCell) {
              const reader = new FileReader();
              reader.onload = (loadEvt) => {
                commitEdit(pendingUploadCell.rowIndex, pendingUploadCell.colId, loadEvt.target.result);
                showToast('Image uploaded successfully');
                setPendingUploadCell(null);
              };
              reader.readAsDataURL(file);
            }
            e.target.value = '';
          }}
        />

        {/* Raise Bug Ticket Automation Modal */}
        <RaiseBugTicketModal
          isOpen={raiseBugModalOpen}
          onClose={() => setRaiseBugModalOpen(false)}
          project={project}
          testCaseData={selectedFailTestCase}
          onTicketCreated={(createdTicket) => {
            showToast(`Bug ticket ${createdTicket.ticket_code} created successfully!`);
          }}
        />

        {/* 10. Image / Screenshot Lightbox Modal */}
        {previewImageModal && (
          <div
            className="pjs-image-lightbox-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && setPreviewImageModal(null)}
          >
            <div className="pjs-image-lightbox-box">
              <div className="pjs-image-lightbox-header">
                <div className="pjs-lightbox-title">
                  <Image size={18} color="#0F9D58" />
                  <span>Screenshot / Image Preview</span>
                </div>
                <div className="pjs-lightbox-actions">
                  <a
                    href={previewImageModal}
                    download={`screenshot-${Date.now()}.png`}
                    className="pjs-lightbox-btn download"
                    title="Download high-resolution image"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
                  <button
                    className="pjs-lightbox-btn close"
                    onClick={() => setPreviewImageModal(null)}
                    title="Close preview"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="pjs-image-lightbox-body">
                <img
                  src={previewImageModal}
                  alt="Full resolution preview"
                  className="pjs-lightbox-full-img"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
