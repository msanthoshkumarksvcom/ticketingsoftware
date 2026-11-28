import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Code2,
  Crown,
  Eye,
  Headphones,
  IdCard,
  LayoutGrid,
  List,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
  X
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import { formatIndianDate } from '../../utils/dateFormat';
import { getValidToken } from '../../utils/auth';
import '../../styles/admin.css';
import '../AdminTickets/AdminTickets.css';
import './AdminUsers.css';

const PROTECTED_EMAILS = ['admin@gmail.com'];

const AVAILABLE_ROLES = [
  'Manager',
  'QA Lead',
  'QA Member',
  'Developer',
  'Project Lead'
];

const SYSTEM_PERMISSIONS = [
  {
    id: 'manage_users',
    label: 'Manage Employees & Users',
    desc: 'Create, edit, view team members and assign roles (excluding Manager/Admin accounts)'
  },
  {
    id: 'manage_projects',
    label: 'Manage Projects & Workspaces',
    desc: 'Create projects, configure workspaces, lock links and documents, and assign project leads'
  },
  {
    id: 'manage_tickets',
    label: 'Manage Bug Tickets',
    desc: 'Full ticket lifecycle control: creating, triaging, assigning, and resolving bug tickets'
  },
  {
    id: 'view_reports',
    label: 'View Reports & Analytics',
    desc: 'Access QA quality metrics, test run reports, and project performance summaries'
  },
  {
    id: 'approve_deployments',
    label: 'Approve Releases & Deployments',
    desc: 'Sign off on staging and production deployment requests and release approvals'
  },
  {
    id: 'manage_roles',
    label: 'Manage Role Configurations',
    desc: 'Configure company roles and permission matrices'
  }
];

const AVAILABLE_DEPARTMENTS = [
  'Quality Assurance',
  'Development',
  'Operations',
  'Support',
  'Management'
];

const DEPARTMENT_FILTER_OPTIONS = [
  { value: 'All', label: 'All Departments', icon: <Building2 size={14} color="#64748b" /> },
  ...AVAILABLE_DEPARTMENTS.map((dept) => ({
    value: dept,
    label: dept,
    icon: <Building2 size={14} color="#64748b" />
  }))
];

const ROLE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Roles', icon: <ShieldCheck size={14} color="#64748b" /> },
  ...['Admin', ...AVAILABLE_ROLES].map((role) => ({
    value: role,
    label: role,
    icon: <ShieldCheck size={14} color="#64748b" />
  }))
];

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active', dotColor: '#10b981' },
  { value: 'Inactive', label: 'Inactive', dotColor: '#ef4444' }
];

const SORT_BY_OPTIONS = [
  { value: 'default', label: 'Sort by', icon: <ArrowUpDown size={14} color="#64748b" /> },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'empid', label: 'Employee ID' },
  { value: 'role', label: 'Role' }
];

const MODAL_DEPARTMENT_OPTIONS = AVAILABLE_DEPARTMENTS.map((dept) => ({
  value: dept,
  label: dept,
  icon: <Building2 size={15} color="#64748b" />
}));

const MODAL_ROLE_OPTIONS = AVAILABLE_ROLES.map((role) => ({
  value: role,
  label: role,
  icon: <ShieldCheck size={15} color="#64748b" />
}));

const MODAL_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', dotColor: '#10b981' },
  { value: 'Inactive', label: 'Inactive', dotColor: '#ef4444' }
];

// No default selections - must be selected by the user, status defaults to Active
const initialFormData = {
  emp_id: '',
  full_name: '',
  email: '',
  department: '',
  role: '',
  phone: '',
  status: 'Active',
  avatar: ''
};

const UM_FILTER_LOCK_STORAGE_KEY = 'um_locked_filters';

const readLockedUserFiltersState = () => {
  try {
    const raw = localStorage.getItem(UM_FILTER_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.locked ? parsed : null;
  } catch {
    return null;
  }
};

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersLocked, setFiltersLocked] = useState(() => Boolean(readLockedUserFiltersState()));
  const [departmentFilter, setDepartmentFilter] = useState(
    () => readLockedUserFiltersState()?.departmentFilter || 'All'
  );
  const [roleFilter, setRoleFilter] = useState(
    () => readLockedUserFiltersState()?.roleFilter || 'All'
  );
  const [statusFilter, setStatusFilter] = useState(
    () => readLockedUserFiltersState()?.statusFilter || 'All'
  );
  const [sortBy, setSortBy] = useState(
    () => readLockedUserFiltersState()?.sortBy || 'default'
  );

  const toggleFilterLock = () => {
    const nextLocked = !filtersLocked;
    setFiltersLocked(nextLocked);
    try {
      if (nextLocked) {
        localStorage.setItem(
          UM_FILTER_LOCK_STORAGE_KEY,
          JSON.stringify({
            locked: true,
            departmentFilter,
            roleFilter,
            statusFilter,
            sortBy
          })
        );
      } else {
        localStorage.removeItem(UM_FILTER_LOCK_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write failures
    }
  };

  // Modals
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form states & validation errors
  const [formData, setFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(null);
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
  const currentUserId = localStorage.getItem('userId') || '';
  const currentUserRole = localStorage.getItem('userRole') || '';
  const normalizedUserRole = currentUserRole.toLowerCase().trim();
  const isAdmin =
    normalizedUserRole === 'admin' ||
    normalizedUserRole === 'super admin' ||
    normalizedUserRole === 'system admin' ||
    normalizedUserRole === 'administrator' ||
    userEmail === 'admin@gmail.com';
  const isManager = normalizedUserRole === 'manager';
  const isQALead = normalizedUserRole === 'qa lead';
  const isQAMember = normalizedUserRole === 'qa member';
  const [formError, setFormError] = useState('');

  // Manager role permissions modal state (for Admin)
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [currentRolePerms, setCurrentRolePerms] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permsSuccessMsg, setPermsSuccessMsg] = useState('');
  const [permsErrorMsg, setPermsErrorMsg] = useState('');

  const modalRoleOptions = useMemo(() => {
    // Admin: can assign all roles
    // Manager: can assign Project Lead, QA Lead, QA Member, Developer
    // QA Lead: cannot create/assign another QA Lead (only Project Lead, QA Member, Developer)
    const roles = isAdmin
      ? ['Manager', 'Project Lead', 'QA Lead', 'QA Member', 'Developer', 'Admin']
      : isManager
      ? ['Project Lead', 'QA Lead', 'QA Member', 'Developer']
      : ['Project Lead', 'QA Member', 'Developer'];

    return roles.map((role) => ({
      value: role,
      label: role === 'Project Lead' ? 'Project Lead (Project Manager)' : role,
      icon: <ShieldCheck size={15} color="#64748b" />
    }));
  }, [isAdmin, isManager]);

  const isCurrentUserRecord = useCallback((user) => {
    if (!user) return false;
    const matchByEmail = Boolean(userEmail && user.email?.toLowerCase().trim() === userEmail);
    const matchById = Boolean(currentUserId && user.id !== undefined && String(user.id) === String(currentUserId));
    return matchByEmail || matchById;
  }, [currentUserId, userEmail]);

  const canEditUser = useCallback((user) => {
    if (!user) return false;
    if (isQAMember) return false;
    if (isAdmin) return true;
    if (isCurrentUserRecord(user)) {
      return true;
    }
    if (isManager && user.email?.toLowerCase() !== 'admin@gmail.com') {
      return true;
    }
    const targetRoleLower = String(user.role || '').trim().toLowerCase();
    if (isQALead && targetRoleLower === 'qa lead') {
      return false;
    }
    if (user.role === 'Manager' || user.role === 'Admin' || user.role === 'Super Admin' || PROTECTED_EMAILS.includes(user.email?.toLowerCase())) {
      return false;
    }
    return true;
  }, [isAdmin, isCurrentUserRecord, isManager, isQALead, isQAMember]);

  const canDeleteUser = useCallback((user) => {
    if (!user) return false;
    if (isQAMember) return false;
    if (isCurrentUserRecord(user)) return false;
    if (isAdmin) {
      return user.email?.toLowerCase() !== 'admin@gmail.com';
    }
    const targetRoleLower = String(user.role || '').trim().toLowerCase();
    if (isQALead && targetRoleLower === 'qa lead') {
      return false;
    }
    if (user.role === 'Manager' || user.role === 'Admin' || user.role === 'Super Admin' || PROTECTED_EMAILS.includes(user.email?.toLowerCase())) {
      return false;
    }
    return true;
  }, [isAdmin, isCurrentUserRecord, isQALead, isQAMember]);

  const handleOpenPermissionsModal = async () => {
    setPermsSuccessMsg('');
    setPermsErrorMsg('');
    setIsPermsModalOpen(true);

    try {
      const token = getValidToken();
      const res = await axios.get('http://localhost:5000/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mgrRole = res.data.find((r) => r.role_name === 'Manager');
      if (mgrRole) {
        setCurrentRolePerms(mgrRole.permissions || []);
      } else {
        setCurrentRolePerms([
          'manage_users',
          'manage_projects',
          'manage_tickets',
          'view_reports',
          'approve_deployments'
        ]);
      }
    } catch (err) {
      console.error('Failed to load Manager role permissions:', err);
      setPermsErrorMsg('Failed to load role permissions from server.');
    }
  };

  const handleTogglePermission = (permId) => {
    setCurrentRolePerms((prev) => {
      if (prev.includes(permId)) {
        return prev.filter((p) => p !== permId);
      } else {
        return [...prev, permId];
      }
    });
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    setPermsErrorMsg('');
    setPermsSuccessMsg('');

    try {
      const token = getValidToken();
      await axios.put(
        'http://localhost:5000/api/admin/roles/by-name/Manager',
        { permissions: currentRolePerms },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPermsSuccessMsg('Manager role permissions updated successfully!');
      setSuccessToast({
        title: 'Permissions Saved',
        message: 'Manager role access controls updated in database.'
      });
      setTimeout(() => {
        setIsPermsModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to save permissions:', err);
      setPermsErrorMsg(err.response?.data?.error || 'Failed to save role permissions.');
    } finally {
      setSavingPerms(false);
    }
  };

  const createFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const isProtectedUser = (email) => {
    return Boolean(email && PROTECTED_EMAILS.includes(email.toLowerCase().trim()));
  };

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    const token = getValidToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const silentRefreshUsers = useCallback(() => {
    fetchUsers({ silent: true });
  }, [fetchUsers]);

  useRealtimeSync(['users', 'roles'], silentRefreshUsers);

  // Compute next auto-generated Employee ID
  const getNextEmpId = useCallback(() => {
    if (!users || users.length === 0) return 'EMP-007';
    let maxNum = 0;
    users.forEach((u) => {
      if (u.emp_id) {
        const match = u.emp_id.match(/EMP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  }, [users]);

  // Validation helpers
  const validateFullName = (value, isSubmitting = false) => {
    if (!value || !value.trim()) {
      return 'Full Name is required.';
    }
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      return 'Minimum 3 characters required.';
    }
    if (value.length > 50) {
      return 'Maximum 50 characters allowed.';
    }
    // Only letters and spaces (no numbers or special symbols)
    if (!/^[a-zA-Z ]+$/.test(value)) {
      return 'Only letters and spaces allowed (no numbers or symbols).';
    }
    if (isSubmitting && !/^[a-zA-Z]+( [a-zA-Z]+)*$/.test(trimmed)) {
      return 'Please enter a valid name using letters and single spaces.';
    }
    return '';
  };

  const validateEmail = (value) => {
    if (!value || !value.trim()) {
      return 'Email Address is required.';
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) {
      return 'Enter a valid email address (e.g. name@company.com).';
    }
    if (isProtectedUser(value.trim())) {
      return 'This email is reserved for a protected system account.';
    }
    return '';
  };

  const validatePhone = (value) => {
    if (!value || !value.trim()) {
      return 'Mobile number is required.';
    }
    const digits = value.replace(/\D/g, '');
    if (!/^[6-9]/.test(digits)) {
      return 'Indian mobile number must start with 6, 7, 8, or 9.';
    }
    if (digits.length !== 10) {
      return `Must be exactly 10 digits (${digits.length}/10 entered).`;
    }
    return '';
  };

  const validateDepartment = (value) => {
    if (!value || !value.trim()) {
      return 'Please select a department.';
    }
    return '';
  };

  const validateRole = (value) => {
    if (!value || !value.trim()) {
      return 'Please select a role.';
    }
    return '';
  };

  const validateStatus = (value) => {
    if (!value || !value.trim()) {
      return 'Please select account status.';
    }
    return '';
  };

  // Allow space while typing letters, but disallow leading space or double spaces
  const handleNameKeyDown = (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      const val = e.target.value;
      if (!val || val.length === 0 || val.endsWith(' ')) {
        e.preventDefault();
      }
    }
  };

  // Open Create Modal with auto-generated ID & default Active status
  const handleOpenCreateModal = () => {
    setFormError('');
    setCreateFieldErrors({});
    const autoId = getNextEmpId();
    setFormData({
      ...initialFormData,
      emp_id: autoId,
      department: '',
      role: '',
      status: 'Active',
      avatar: ''
    });
    setIsCreateModalOpen(true);
  };

  // Form Input Change Handlers with On-Field Validation
  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'full_name') {
      // Allow letters and spaces; block numbers and special symbols; max 50 chars
      let sanitized = value.replace(/[^a-zA-Z ]/g, '');
      sanitized = sanitized.replace(/^\s+/, ''); // no leading space
      sanitized = sanitized.replace(/\s{2,}/g, ' '); // collapse double spaces
      sanitized = sanitized.slice(0, 50);

      setFormData((prev) => ({ ...prev, full_name: sanitized }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        full_name: validateFullName(sanitized, false)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'email') {
      setFormData((prev) => ({ ...prev, email: value }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        email: validateEmail(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'phone') {
      // Allow only digits, max 10
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digits }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        phone: validatePhone(digits)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'department') {
      setFormData((prev) => ({ ...prev, department: value }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        department: validateDepartment(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'role') {
      setFormData((prev) => ({ ...prev, role: value }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        role: validateRole(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'status') {
      setFormData((prev) => ({ ...prev, status: value }));
      setCreateFieldErrors((prev) => ({
        ...prev,
        status: validateStatus(value)
      }));
      if (formError) setFormError('');
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'full_name') {
      let sanitized = value.replace(/[^a-zA-Z ]/g, '');
      sanitized = sanitized.replace(/^\s+/, '');
      sanitized = sanitized.replace(/\s{2,}/g, ' ');
      sanitized = sanitized.slice(0, 50);

      setEditFormData((prev) => ({ ...prev, full_name: sanitized }));
      setEditFieldErrors((prev) => ({
        ...prev,
        full_name: validateFullName(sanitized, false)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'email') {
      setEditFormData((prev) => ({ ...prev, email: value }));
      setEditFieldErrors((prev) => ({
        ...prev,
        email: validateEmail(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setEditFormData((prev) => ({ ...prev, phone: digits }));
      setEditFieldErrors((prev) => ({
        ...prev,
        phone: validatePhone(digits)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'department') {
      setEditFormData((prev) => ({ ...prev, department: value }));
      setEditFieldErrors((prev) => ({
        ...prev,
        department: validateDepartment(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'role') {
      setEditFormData((prev) => ({ ...prev, role: value }));
      setEditFieldErrors((prev) => ({
        ...prev,
        role: validateRole(value)
      }));
      if (formError) setFormError('');
      return;
    }

    if (name === 'status') {
      setEditFormData((prev) => ({ ...prev, status: value }));
      setEditFieldErrors((prev) => ({
        ...prev,
        status: validateStatus(value)
      }));
      if (formError) setFormError('');
      return;
    }

    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  // Avatar Image Selection Handler
  const handleAvatarSelect = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, avatar: base64 }));
      } else {
        setFormData((prev) => ({ ...prev, avatar: base64 }));
      }
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = (isEdit = false) => {
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, avatar: '' }));
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    } else {
      setFormData((prev) => ({ ...prev, avatar: '' }));
      if (createFileInputRef.current) createFileInputRef.current.value = '';
    }
  };

  // Open Edit Modal
  const openEditModal = (user) => {
    if (!canEditUser(user)) return;
    setFormError('');
    setEditFieldErrors({});
    let rawPhone = user.phone || '';
    rawPhone = rawPhone.replace(/^\+91\s*/, '').replace(/\D/g, '').slice(0, 10);
    setEditFormData({
      id: user.id,
      emp_id: user.emp_id || '',
      full_name: user.full_name || '',
      email: user.email || '',
      department: user.department || '',
      role: user.role || '',
      phone: rawPhone,
      status: user.status || 'Active',
      avatar: user.avatar || ''
    });
    setIsEditModalOpen(true);
  };

  // Create User Submission
  const [resendingUserId, setResendingUserId] = useState(null);

  const handleResendInvite = async (targetUser) => {
    if (!targetUser?.id) return;
    setResendingUserId(targetUser.id);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `http://localhost:5000/api/admin/users/${targetUser.id}/resend-invite`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 25000 }
      );
      const emailStatus = response.data?.email_status;
      const temporaryPass = response.data?.temporary_password;

      if (emailStatus?.success && !emailStatus?.simulated) {
        setSuccessToast({
          title: 'Credentials Email Resent',
          message: `Welcome credentials have been sent successfully to ${targetUser.email}.`
        });
      } else {
        const errorMsg = emailStatus?.error || 'Email could not be delivered';
        const isQuota = errorMsg.includes('Daily user sending limit exceeded') || errorMsg.includes('550');
        setSuccessToast({
          title: 'Password Reset (Email Not Delivered)',
          type: 'warning',
          message: isQuota
            ? `New temporary password generated for ${targetUser.full_name}, but Google Mail daily quota is exceeded. Temporary Password: ${temporaryPass || '(check console)'}. Share this password with the user directly.`
            : `Password reset, but email delivery failed (${errorMsg}). Temporary Password: ${temporaryPass || '(check console)'}`
        });
      }
      setTimeout(() => setSuccessToast(null), 12000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to resend credentials email.');
    } finally {
      setResendingUserId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    const nameErr = validateFullName(formData.full_name, true);
    const emailErr = validateEmail(formData.email);
    const phoneErr = validatePhone(formData.phone);
    const deptErr = validateDepartment(formData.department);
    const roleErr = validateRole(formData.role);

    const errors = {
      full_name: nameErr,
      email: emailErr,
      phone: phoneErr,
      department: deptErr,
      role: roleErr
    };

    setCreateFieldErrors(errors);

    if (nameErr || emailErr || phoneErr || deptErr || roleErr) {
      setFormError('Please resolve all validation errors before submitting.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      let formattedPhone = formData.phone.trim();
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91 ${formattedPhone}`;
      }

      const payload = {
        ...formData,
        status: 'Active',
        phone: formattedPhone
      };

      const response = await axios.post(
        'http://localhost:5000/api/admin/users',
        payload,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 25000 }
      );

      if (response.data?.user) {
        setUsers((prev) => [...prev, response.data.user]);
      }
      await fetchUsers({ silent: true });
      setIsCreateModalOpen(false);
      setFormData(initialFormData);

      const emailStatus = response.data?.email_status;
      const temporaryPass = response.data?.temporary_password;

      if (emailStatus?.success && !emailStatus?.simulated) {
        setSuccessToast({
          title: 'User Created & Invitation Sent',
          message: `Account for ${response.data.user.full_name} (${response.data.user.role}) was created successfully. A welcome email with secure login credentials was dispatched to ${response.data.user.email}.`
        });
      } else {
        const errorMsg = emailStatus?.error || 'Email could not be delivered';
        const isQuota = errorMsg.includes('Daily user sending limit exceeded') || errorMsg.includes('550');
        setSuccessToast({
          title: 'User Created (Action Required: Email Not Delivered)',
          type: 'warning',
          message: isQuota
            ? `Account for ${response.data.user.full_name} was created, but Google Mail reported: "Daily sending limit exceeded". Please provide the temporary password directly: ${temporaryPass || '(check console)'}. To restore email dispatch, update EMAIL_USER in ticket-backend/.env with fresh credentials.`
            : `Account for ${response.data.user.full_name} was created, but email delivery failed: ${errorMsg}. Temporary Password: ${temporaryPass || '(check console)'}`
        });
      }
      setTimeout(() => setSuccessToast(null), 14000);
    } catch (error) {
      console.error('Error creating user:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update User Submission
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    const nameErr = validateFullName(editFormData.full_name, true);
    const emailErr = validateEmail(editFormData.email);
    const phoneErr = validatePhone(editFormData.phone);
    const deptErr = validateDepartment(editFormData.department);
    const roleErr = validateRole(editFormData.role);
    const statusErr = validateStatus(editFormData.status);

    const errors = {
      full_name: nameErr,
      email: emailErr,
      phone: phoneErr,
      department: deptErr,
      role: roleErr,
      status: statusErr
    };

    setEditFieldErrors(errors);

    if (nameErr || emailErr || phoneErr || deptErr || roleErr || statusErr) {
      setFormError('Please resolve all validation errors before submitting.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      let formattedPhone = editFormData.phone.trim();
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91 ${formattedPhone}`;
      }

      const payload = {
        ...editFormData,
        phone: formattedPhone
      };

      const response = await axios.put(
        `http://localhost:5000/api/admin/users/${editFormData.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setUsers((prev) =>
          prev.map((u) => (Number(u.id) === Number(editFormData.id) ? { ...u, ...updatedUser } : u))
        );
      }
      await fetchUsers({ silent: true });
      setIsEditModalOpen(false);
      setEditFormData(null);
      setSuccessToast({
        title: 'User Updated',
        message: `Account details for ${editFormData.full_name || 'user'} were updated successfully.`
      });
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (error) {
      console.error('Error updating user:', error);
      setFormError(
        error.response?.data?.error || 'Failed to update user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User Confirmation
  const confirmDeleteUser = async () => {
    if (!userToDelete || !canDeleteUser(userToDelete)) return;

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  // Metrics Calculations
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status !== 'Inactive').length;
    const inactive = users.filter((u) => u.status === 'Inactive').length;
    const departments = new Set(users.map((u) => u.department).filter(Boolean)).size || AVAILABLE_DEPARTMENTS.length;

    return {
      total,
      active,
      inactive,
      departments
    };
  }, [users]);

  // Filtering and Sorting
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.emp_id?.toLowerCase().includes(query) ||
          u.department?.toLowerCase().includes(query) ||
          u.role?.toLowerCase().includes(query);

        const matchesDept =
          departmentFilter === 'All' || u.department === departmentFilter;
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        const matchesStatus =
          statusFilter === 'All' || (u.status || 'Active') === statusFilter;

        return matchesSearch && matchesDept && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.full_name || '').localeCompare(b.full_name || '');
        }
        if (sortBy === 'empid') {
          return (a.emp_id || '').localeCompare(b.emp_id || '');
        }
        if (sortBy === 'role') {
          return (a.role || '').localeCompare(b.role || '');
        }
        if (a.emp_id && b.emp_id) {
          return a.emp_id.localeCompare(b.emp_id);
        }
        return a.id - b.id;
      });
  }, [users, searchQuery, departmentFilter, roleFilter, statusFilter, sortBy]);

  // Avatar Color Palette for fallback letter circles
  const getAvatarStyle = (index, name = '') => {
    const colors = [
      '#2563eb', // Blue
      '#9333ea', // Purple
      '#3b82f6', // Sky
      '#db2777', // Pink
      '#ea580c', // Orange
      '#0891b2', // Cyan
      '#059669', // Emerald
      '#4f46e5'  // Indigo
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const color = colors[(index + sum) % colors.length];
    return { backgroundColor: color };
  };

  const getAvatarColor = (name = '', index = 0) => getAvatarStyle(index, name);

  const getInitials = (name = '') => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Badge renderers
  const renderDepartmentBadge = (dept) => {
    const d = dept || 'Quality Assurance';
    let className = 'dept-qa';
    let Icon = Building2;

    if (d.toLowerCase().includes('develop')) {
      className = 'dept-dev';
      Icon = Code2;
    } else if (d.toLowerCase().includes('operat')) {
      className = 'dept-ops';
      Icon = Settings;
    } else if (d.toLowerCase().includes('support')) {
      className = 'dept-support';
      Icon = Headphones;
    } else if (d.toLowerCase().includes('manage')) {
      className = 'dept-management';
      Icon = Briefcase;
    }

    return (
      <span className={`um-dept-badge ${className}`}>
        <Icon size={13} />
        <span>{d}</span>
      </span>
    );
  };

  const renderRoleBadge = (role) => {
    const r = role || 'QA Member';
    let className = 'role-qamember';
    let Icon = Search;

    if (r.toLowerCase() === 'manager' || r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator') {
      className = 'role-manager';
      Icon = Crown;
    } else if (r.toLowerCase().includes('lead') && r.toLowerCase().includes('qa')) {
      className = 'role-qalead';
      Icon = Crown;
    } else if (r.toLowerCase().includes('project') || r.toLowerCase().includes('lead')) {
      className = 'role-projectlead';
      Icon = Briefcase;
    } else if (r.toLowerCase().includes('dev')) {
      className = 'role-developer';
      Icon = Code2;
    } else if (r.toLowerCase().includes('qa')) {
      className = 'role-qamember';
      Icon = Search;
    } else {
      className = 'role-fallback';
      Icon = UserCheck;
    }

    return (
      <span className={`um-role-badge ${className}`}>
        <Icon size={13} />
        <span>{r}</span>
      </span>
    );
  };

  return (
    <div className="admin-layout users-page">
      {/* Role-Based Sidebar Navigation */}
      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Area */}
      <main id="um-main-content" className="main-content">
        <TopNavbar pageTitle={isAdmin ? 'Employee Management' : isQAMember ? 'Team Directory' : 'Users Directory'} />
        {/* Dashboard Body */}
        <div className="dashboard-container">
          {/* Email Invitation / Action Success Toast */}
          {successToast && (
            <div id="um-success-toast" className={`um-success-toast${successToast.type === 'warning' ? ' um-toast-warning' : ''}`} role="alert">
              <div className="um-success-toast-content">
                <span className={`um-toast-check${successToast.type === 'warning' ? ' um-toast-warn-icon' : ''}`}>
                  {successToast.type === 'warning' ? '!' : '✓'}
                </span>
                <div>
                  <strong>{successToast.title}</strong>
                  <p>{successToast.message}</p>
                </div>
              </div>
              <button
                id="um-toast-close-btn"
                className="um-toast-close-btn"
                onClick={() => setSuccessToast(null)}
                aria-label="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          <div className="users-page-layout">
            {/* Page Header matching Projects & Tickets Workspace */}
            <header id="um-header-section" className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <Users size={22} color="#2563EB" />
                </div>
                <div className="um-header-titles">
                  <h1 id="um-page-heading">
                    {isAdmin ? 'User Management' : isQAMember ? 'Team Directory' : 'User Management'}
                  </h1>
                  <p>
                    Manage team members, employee credentials, roles, and department permissions.
                  </p>
                </div>
              </div>

              <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isAdmin && (
                  <button
                    id="um-manage-role-perms-btn"
                    type="button"
                    className="ticket-view-button"
                    style={{
                      height: '38px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '13px',
                      fontWeight: '600',
                      background: '#ffffff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer'
                    }}
                    onClick={handleOpenPermissionsModal}
                  >
                    <ShieldCheck size={16} color="#2563eb" />
                    <span>Permissions</span>
                  </button>
                )}

                {!isQAMember && (
                  <button
                    id="um-create-user-btn"
                    className="um-btn-create"
                    onClick={handleOpenCreateModal}
                  >
                    <Plus size={18} />
                    <span>{isAdmin ? 'Add Employee' : 'Create User'}</span>
                  </button>
                )}
              </div>
            </header>

            {/* QA Member Read-Only Notice */}
            {isQAMember && (
              <div id="um-qa-readonly-notice" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '12px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: '500',
                marginBottom: '18px'
              }}>
                <ShieldCheck size={18} color="#16a34a" />
                <span>
                  <strong>QA Member Directory View:</strong> You have view-only access to inspect user profiles and contact info. User administration and role assignment are reserved for Managers.
                </span>
              </div>
            )}

            {/* 4 Summary Stat Cards */}
            <section id="um-stats-grid" className="um-stats-grid">
              {/* Card 1: Total Users */}
              <div id="um-stat-total-card" className="um-stat-card card-total">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-blue">
                    <Users size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Total Members</span>
                    <span className="um-stat-number">{stats.total}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-blue">All Members</span>
              </div>

              {/* Card 2: Active Users */}
              <div id="um-stat-active-card" className="um-stat-card card-active">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-green">
                    <UserCheck size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Active Members</span>
                    <span className="um-stat-number">{stats.active}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-green">Active</span>
              </div>

              {/* Card 3: Inactive Users */}
              <div id="um-stat-inactive-card" className="um-stat-card card-inactive">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-orange">
                    <UserX size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Inactive Members</span>
                    <span className="um-stat-number">{stats.inactive}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-orange">Inactive</span>
              </div>

              {/* Card 4: Departments */}
              <div id="um-stat-departments-card" className="um-stat-card card-departments">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-purple">
                    <Building2 size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Departments</span>
                    <span className="um-stat-number">{stats.departments}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-purple">Departments</span>
              </div>
            </section>

            {/* Filter and Search Bar */}
            <div className="um-controls-bar">
              <div className="um-search-container">
                <Search size={16} color="#64748b" />
                <input
                  id="um-search-input"
                  type="text"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Search by name, email, employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="um-search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="um-filter-selects">
                {/* Department Dropdown */}
                <CustomSelect
                  id="um-filter-department"
                  value={departmentFilter}
                  onChange={(val) => {
                    if (!filtersLocked) setDepartmentFilter(val);
                  }}
                  options={DEPARTMENT_FILTER_OPTIONS}
                  icon={<Building2 size={14} color="#64748b" />}
                  placeholder="All Departments"
                  variant="filter"
                  disabled={filtersLocked}
                />

                {/* Role Dropdown */}
                <CustomSelect
                  id="um-filter-role"
                  value={roleFilter}
                  onChange={(val) => {
                    if (!filtersLocked) setRoleFilter(val);
                  }}
                  options={ROLE_FILTER_OPTIONS}
                  icon={<ShieldCheck size={14} color="#64748b" />}
                  placeholder="All Roles"
                  variant="filter"
                  disabled={filtersLocked}
                />

                {/* Status Dropdown */}
                <CustomSelect
                  id="um-filter-status"
                  value={statusFilter}
                  onChange={(val) => {
                    if (!filtersLocked) setStatusFilter(val);
                  }}
                  options={STATUS_FILTER_OPTIONS}
                  placeholder="All Status"
                  variant="filter"
                  disabled={filtersLocked}
                />

                {/* Sort By Dropdown & Filter Lock */}
                <div className="um-sort-lock-group">
                  <CustomSelect
                    id="um-filter-sort"
                    value={sortBy}
                    onChange={(val) => {
                      if (!filtersLocked) setSortBy(val);
                    }}
                    options={SORT_BY_OPTIONS}
                    icon={<ArrowUpDown size={14} color="#64748b" />}
                    placeholder="Sort by"
                    variant="filter"
                    disabled={filtersLocked}
                  />

                  <button
                    id="um-filter-lock-btn"
                    type="button"
                    className={`um-fix-filter-chip ${filtersLocked ? 'is-locked' : ''}`}
                    onClick={toggleFilterLock}
                    aria-pressed={filtersLocked}
                    aria-label={filtersLocked ? 'Unlock filters' : 'Lock filters'}
                  >
                    {filtersLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Section Header with Pill Badge matching Tickets */}
            <div className="ticket-folders-section-header" style={{ marginBottom: '14px' }}>
              <div className="ticket-folders-section-title">
                <Users size={18} color="#2563eb" />
                <span>{isAdmin ? 'Employee Records' : 'Team Members'}</span>
                <span className="ticket-folders-total-pill">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <section id="um-cards-section" className="um-users-cards-grid">
                {loading ? (
                  <div className="um-empty-state-card" style={{ gridColumn: '1 / -1' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 12px' }} />
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                      Loading workspace users directory...
                    </p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="um-empty-state-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="um-empty-icon-wrap">
                      <Users size={32} />
                    </div>
                    <h3 id="um-empty-heading">
                      {users.length === 0 ? 'No Team Members Yet' : 'No Team Members Found'}
                    </h3>
                    <p className="um-empty-description">
                      {users.length === 0
                        ? 'Your employee directory is clean and ready. Add your first team member or invite staff to get started.'
                        : "We couldn't find any team members matching your search or filters. Try adjusting your query or resetting filters."}
                    </p>
                    {users.length === 0 ? (
                      !isQAMember && (
                        <button
                          id="um-empty-add-user-btn"
                          className="um-btn-create"
                          onClick={handleOpenCreateModal}
                          style={{ marginTop: 8 }}
                        >
                          <Plus size={16} />
                          <span>{isAdmin ? 'Add First Employee' : 'Add First User'}</span>
                        </button>
                      )
                    ) : (
                      <button
                        id="um-reset-filters-btn"
                        className="um-btn-reset-filters"
                        onClick={() => {
                          setSearchQuery('');
                          if (!filtersLocked) {
                            setDepartmentFilter('All');
                            setRoleFilter('All');
                            setStatusFilter('All');
                            setSortBy('default');
                          }
                        }}
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredUsers.map((user, index) => {
                    const initials = getInitials(user.full_name || user.email);
                    const avatarStyle = getAvatarColor(user.full_name || user.email, index);
                    const canEdit = canEditUser(user);
                    const canDelete = canDeleteUser(user);

                    return (
                      <article
                        id={`um-user-card-${user.id}`}
                        key={user.id}
                        className="um-user-card"
                        onDoubleClick={() => {
                          if (canEdit) openEditModal(user);
                          else setViewingUser(user);
                        }}
                      >
                        <div className="um-user-card-header">
                          <div className="um-user-avatar-wrap">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.full_name} className="um-avatar-img" />
                            ) : (
                              <div className="um-avatar-placeholder" style={avatarStyle}>
                                {initials}
                              </div>
                            )}
                            <span className={`um-status-indicator ${(user.status || 'Active').toLowerCase()}`} />
                          </div>

                          <div className="um-user-card-badges">
                            <span className={`um-status-badge ${(user.status || 'Active').toLowerCase()}`}>
                              <span className="status-dot" />
                              {user.status || 'Active'}
                            </span>
                          </div>
                        </div>

                        <div className="um-user-card-body">
                          <div className="um-user-card-name-row">
                            <h3 className="um-user-card-name">{user.full_name}</h3>
                            <span className="um-emp-id-pill">
                              <IdCard size={12} />
                              <span>{user.emp_id || `EMP-${String(user.id).padStart(3, '0')}`}</span>
                            </span>
                          </div>

                          <div className="um-user-card-tags">
                            {renderRoleBadge(user.role)}
                            {renderDepartmentBadge(user.department)}
                          </div>

                          <div className="um-user-card-contact-list">
                            <div className="um-contact-item" title={user.email}>
                              <Mail size={13} color="#64748b" />
                              <span className="um-contact-text">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="um-contact-item">
                                <Calendar size={13} color="#64748b" />
                                <span className="um-contact-text">{user.phone}</span>
                              </div>
                            )}
                            <div className="um-contact-item joined-date">
                              <Calendar size={13} color="#94a3b8" />
                              <span className="um-contact-text" style={{ color: '#94a3b8' }}>
                                Joined {formatIndianDate(user.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isQAMember && (
                          <div className="um-user-card-footer">
                            <button
                              id={`um-card-view-btn-${user.id}`}
                              type="button"
                              className="um-card-action-btn view"
                              title="View user details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingUser(user);
                              }}
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>

                            <button
                              id={`um-card-resend-btn-${user.id}`}
                              type="button"
                              className="um-card-action-btn invite"
                              disabled={resendingUserId === user.id}
                              title="Resend welcome email with temporary credentials"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResendInvite(user);
                              }}
                            >
                              <MailCheck size={14} />
                              <span>{resendingUserId === user.id ? 'Sending...' : 'Invite'}</span>
                            </button>

                            {!canEdit ? (
                              <button
                                className="um-card-action-btn edit disabled"
                                disabled
                                title="This account is protected"
                              >
                                <Lock size={14} />
                                <span>Locked</span>
                              </button>
                            ) : (
                              <button
                                id={`um-card-edit-btn-${user.id}`}
                                type="button"
                                className="um-card-action-btn edit"
                                title="Edit user"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(user);
                                }}
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </button>
                            )}

                            {!canDelete ? (
                              <button
                                className="um-card-action-btn delete disabled"
                                disabled
                                title={isCurrentUserRecord(user) ? 'You cannot delete your own account' : 'Protected account cannot be deleted'}
                              >
                                <Lock size={14} />
                              </button>
                            ) : (
                              <button
                                id={`um-card-delete-btn-${user.id}`}
                                type="button"
                                className="um-card-action-btn delete"
                                title="Delete user"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToDelete(user);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </section>
            ) : (
              /* Users Table Card */
              <section id="um-table-section" className="um-table-card">
              <div className="um-table-scroll">
                <table id="um-users-table" className="um-table">
                  <thead>
                    <tr>
                      <th>EMP ID / USER ID</th>
                      <th>USER DETAILS</th>
                      <th>DEPARTMENT</th>
                      <th>ROLE(S)</th>
                      <th>STATUS</th>
                      <th>JOINED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '12px' }}>
                          <SkeletonLoader variant="table" rows={5} />
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7">
                          <div className="um-empty-state-card">
                            <div className="um-empty-icon-wrap">
                              <Users size={32} />
                            </div>
                            <h3 id="um-empty-heading">
                              {users.length === 0 ? 'No Team Members Yet' : 'No Team Members Found'}
                            </h3>
                            <p className="um-empty-description">
                              {users.length === 0
                                ? 'Your employee directory is clean and ready. Add your first team member or invite staff to get started.'
                                : "We couldn't find any team members matching your search or filters. Try adjusting your query or resetting filters."}
                            </p>
                            {users.length === 0 ? (
                              !isQAMember && (
                                <button
                                  id="um-empty-add-user-btn"
                                  className="um-btn-create"
                                  onClick={handleOpenCreateModal}
                                  style={{ marginTop: 8 }}
                                >
                                  <Plus size={16} />
                                  <span>{isAdmin ? 'Add First Employee' : 'Add First User'}</span>
                                </button>
                              )
                            ) : (
                              <button
                                id="um-reset-filters-btn"
                                className="um-btn-reset-filters"
                                onClick={() => {
                                  setSearchQuery('');
                                  if (!filtersLocked) {
                                    setDepartmentFilter('All');
                                    setRoleFilter('All');
                                    setStatusFilter('All');
                                    setSortBy('default');
                                  }
                                }}
                              >
                                <RefreshCw size={14} />
                                <span>Clear All Filters</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, idx) => {
                        const protectedAcc = isProtectedUser(user.email);
                        const empIdText =
                          user.emp_id || `EMP-${String(user.id).padStart(3, '0')}`;
                        const initialLetter = (user.full_name || user.email || 'U')
                          .charAt(0)
                          .toUpperCase();
                        const joinedDateStr = formatIndianDate(user.created_at, '08/10/2026');

                        return (
                          <tr key={user.id}>
                            {/* EMP ID */}
                            <td>
                              <span className="um-emp-badge">{empIdText}</span>
                            </td>

                            {/* USER DETAILS */}
                            <td>
                              <div className="um-user-cell">
                                {user.avatar ? (
                                  <img
                                    src={user.avatar}
                                    alt={user.full_name}
                                    className="um-avatar-img"
                                  />
                                ) : (
                                  <div
                                    className="um-avatar-circle"
                                    style={getAvatarStyle(idx, user.full_name || user.email)}
                                  >
                                    {initialLetter}
                                  </div>
                                )}
                                <div className="um-user-text">
                                  <div className="um-user-name-row">
                                    <span className="um-user-name">
                                      {user.full_name || 'Team Member'}
                                    </span>
                                  </div>
                                  <span className="um-user-email">{user.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* DEPARTMENT */}
                            <td>{renderDepartmentBadge(user.department)}</td>

                            {/* ROLE(S) */}
                            <td>{renderRoleBadge(user.role)}</td>

                            {/* STATUS */}
                            <td>
                              <span
                                className={`um-status-pill ${
                                  user.status === 'Inactive'
                                    ? 'status-inactive'
                                    : 'status-active'
                                }`}
                              >
                                <span className="um-status-dot" />
                                {user.status || 'Active'}
                              </span>
                            </td>

                            {/* JOINED */}
                            <td>
                              <div className="um-joined-cell">
                                <Calendar size={14} color="#64748b" />
                                <span>{joinedDateStr}</span>
                              </div>
                            </td>

                            {/* ACTIONS */}
                            <td>
                              <div className="um-actions-cell">
                                {/* View Action */}
                                <button
                                  id={`um-view-user-btn-${user.id}`}
                                  className="um-btn-icon"
                                  title="View user profile"
                                  onClick={() => setViewingUser(user)}
                                >
                                  <Eye size={15} />
                                </button>

                                {/* Resend Credentials Email Action */}
                                {!isQAMember && canEditUser(user) && (
                                  <button
                                    id={`um-resend-invite-btn-${user.id}`}
                                    className="um-btn-icon"
                                    title="Resend welcome email with login credentials"
                                    disabled={resendingUserId === user.id}
                                    onClick={() => handleResendInvite(user)}
                                  >
                                    <Mail size={15} color="#2563EB" />
                                  </button>
                                )}

                                {/* Edit Action */}
                                {!isQAMember && (
                                  !canEditUser(user) ? (
                                    <button
                                      id={`um-edit-locked-btn-${user.id}`}
                                      className="um-btn-icon is-locked"
                                      disabled
                                      title={user.role === 'Manager' || user.role === 'Admin' ? "Manager & Admin accounts can only be modified by System Administrator" : "Protected system user cannot be edited"}
                                    >
                                      <Lock size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      id={`um-edit-user-btn-${user.id}`}
                                      className="um-btn-icon"
                                      title="Edit user"
                                      onClick={() => openEditModal(user)}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )
                                )}

                                {/* Delete / More Action */}
                                {!isQAMember && (
                                  !canDeleteUser(user) ? (
                                    <button
                                      id={`um-delete-locked-btn-${user.id}`}
                                      className="um-btn-icon is-locked"
                                      disabled
                                      title={
                                        isCurrentUserRecord(user)
                                          ? 'You cannot delete your own account'
                                          : user.email?.toLowerCase() === 'admin@gmail.com'
                                          ? 'Primary Administrator account cannot be deleted'
                                          : isQALead && String(user.role || '').trim().toLowerCase() === 'qa lead'
                                          ? 'QA Lead accounts can only be deleted by Manager or System Administrator'
                                          : 'Manager & Admin accounts can only be managed by System Administrator'
                                      }
                                    >
                                      <Lock size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      id={`um-delete-user-btn-${user.id}`}
                                      className="um-btn-icon btn-delete"
                                      title="Delete user"
                                      onClick={() => setUserToDelete(user)}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          </div>
        </div>
      </main>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div
          id="um-create-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div id="um-create-modal" className="um-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="create-user-title">Create New User</h3>
                <p>Fill in team member details and configure workspace access.</p>
              </div>
              <button
                id="um-create-modal-close-btn"
                className="um-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form id="um-create-user-form" onSubmit={handleCreateUser} className="um-modal-form" noValidate>
              <div className="um-modal-body">
                {formError && <div className="um-error-banner">{formError}</div>}

                {/* 1. Avatar Image Upload Section (User picks optionally, not forced) */}
                <div className="um-avatar-upload-row">
                  <div className="um-avatar-preview-box">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar Preview" className="um-avatar-preview-img" />
                    ) : (
                      <div className="um-avatar-preview-placeholder">
                        <Camera size={22} />
                      </div>
                    )}
                  </div>
                  <div className="um-avatar-upload-controls">
                    <div className="um-avatar-btn-row">
                      <label className="um-btn-upload" htmlFor="create-avatar-upload">
                        <Upload size={14} />
                        <span>{formData.avatar ? 'Change Photo' : 'Select Photo'}</span>
                        <input
                          id="create-avatar-upload"
                          ref={createFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => handleAvatarSelect(e, false)}
                        />
                      </label>
                      {formData.avatar && (
                        <button
                          id="um-create-remove-avatar-btn"
                          type="button"
                          className="um-btn-remove-avatar"
                          onClick={() => handleRemoveAvatar(false)}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="um-avatar-upload-hint">
                      Optional: Select a profile image (PNG, JPG, up to 2MB). If unselected, a colored initial avatar is used.
                    </p>
                  </div>
                </div>

                {/* 2. Basic Info: Emp ID (Auto-generated & Non-editable) and Full Name */}
                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <div className="um-form-label-row">
                      <label htmlFor="create-emp-id">Employee ID</label>
                      <span className="um-auto-badge">Auto-generated</span>
                    </div>
                    <div className="um-input-box um-input-box-disabled" title="Auto-generated by system and cannot be edited">
                      <IdCard size={17} className="um-field-icon" />
                      <input
                        id="create-emp-id"
                        type="text"
                        name="emp_id"
                        autoComplete="off"
                        value={formData.emp_id}
                        readOnly
                        disabled
                        tabIndex={-1}
                      />
                      <Lock size={14} className="um-field-lock" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-full-name">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${createFieldErrors.full_name ? 'um-input-error' : ''}`}>
                      <UserRound size={17} className="um-field-icon" />
                      <input
                        id="create-full-name"
                        type="text"
                        name="full_name"
                        autoComplete="name"
                        placeholder="e.g. Rahul Sharma"
                        maxLength={50}
                        value={formData.full_name}
                        onChange={handleCreateInputChange}
                        onKeyDown={handleNameKeyDown}
                        onBlur={() =>
                          setCreateFieldErrors((prev) => ({
                            ...prev,
                            full_name: validateFullName(formData.full_name, true)
                          }))
                        }
                      />
                    </div>
                    {createFieldErrors.full_name && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {createFieldErrors.full_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Contact Info: Email & Indian Mobile Number */}
                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <label htmlFor="create-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${createFieldErrors.email ? 'um-input-error' : ''}`}>
                      <Mail size={17} className="um-field-icon" />
                      <input
                        id="create-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="e.g. rahul.sharma@company.com"
                        value={formData.email}
                        onChange={handleCreateInputChange}
                        onBlur={() =>
                          setCreateFieldErrors((prev) => ({
                            ...prev,
                            email: validateEmail(formData.email)
                          }))
                        }
                      />
                    </div>
                    {createFieldErrors.email && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {createFieldErrors.email}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-phone">
                      Mobile Number <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${createFieldErrors.phone ? 'um-input-error' : ''}`}>
                      <span className="um-country-prefix">IN +91</span>
                      <input
                        id="create-phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="98765 43210"
                        maxLength={10}
                        value={formData.phone}
                        onChange={handleCreateInputChange}
                        onBlur={() =>
                          setCreateFieldErrors((prev) => ({
                            ...prev,
                            phone: validatePhone(formData.phone)
                          }))
                        }
                      />
                    </div>
                    {createFieldErrors.phone && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {createFieldErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Work Info: Department, Role & Account Status in 3-column layout */}
                <div className="um-form-grid-3">
                  <div className="um-form-group">
                    <label htmlFor="create-department">
                      Department <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      id="create-department"
                      value={formData.department}
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, department: val }));
                        setCreateFieldErrors((prev) => ({
                          ...prev,
                          department: validateDepartment(val)
                        }));
                        if (formError) setFormError('');
                      }}
                      options={MODAL_DEPARTMENT_OPTIONS}
                      placeholder="Select Department"
                      icon={<Building2 size={16} color="#64748b" />}
                      variant="form"
                      error={createFieldErrors.department}
                    />
                    {createFieldErrors.department && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {createFieldErrors.department}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-role">
                      Role <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      id="create-role"
                      value={formData.role}
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, role: val }));
                        setCreateFieldErrors((prev) => ({
                          ...prev,
                          role: validateRole(val)
                        }));
                        if (formError) setFormError('');
                      }}
                      options={modalRoleOptions}
                      placeholder="Select Role"
                      icon={<ShieldCheck size={16} color="#64748b" />}
                      variant="form"
                      error={createFieldErrors.role}
                    />
                    {createFieldErrors.role && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {createFieldErrors.role}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label id="create-status-label">
                      Account Status
                    </label>
                    <div className="um-status-readonly-box" title="New accounts are automatically activated upon creation">
                      <div className="um-status-readonly-left">
                        <span className="um-status-dot-sm dot-active" />
                        <span className="um-status-readonly-text">Active</span>
                      </div>
                      <span className="um-status-readonly-badge">Default</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="um-modal-footer">
                <button
                  id="um-create-cancel-btn"
                  type="button"
                  className="um-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="um-create-submit-btn"
                  type="submit"
                  className="um-btn-primary"
                  disabled={submitting}
                >
                  <UserPlus size={16} />
                  {submitting ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && editFormData && (
        <div
          id="um-edit-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div id="um-edit-modal" className="um-modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="edit-user-title">Edit User</h3>
                <p>Update team member details and assigned workspace permissions.</p>
              </div>
              <button
                id="um-edit-modal-close-btn"
                className="um-modal-close"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form id="um-edit-user-form" onSubmit={handleUpdateUser} className="um-modal-form" noValidate>
              <div className="um-modal-body">
                {formError && <div className="um-error-banner">{formError}</div>}

                {/* Avatar Image Edit / Change */}
                <div className="um-avatar-upload-row">
                  <div className="um-avatar-preview-box">
                    {editFormData.avatar ? (
                      <img src={editFormData.avatar} alt="Avatar" className="um-avatar-preview-img" />
                    ) : (
                      <div className="um-avatar-preview-placeholder">
                        <Camera size={22} />
                      </div>
                    )}
                  </div>
                  <div className="um-avatar-upload-controls">
                    <div className="um-avatar-btn-row">
                      <label className="um-btn-upload" htmlFor="edit-avatar-upload">
                        <Upload size={14} />
                        <span>{editFormData.avatar ? 'Change Photo' : 'Select Photo'}</span>
                        <input
                          id="edit-avatar-upload"
                          ref={editFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => handleAvatarSelect(e, true)}
                        />
                      </label>
                      {editFormData.avatar && (
                        <button
                          id="um-edit-remove-avatar-btn"
                          type="button"
                          className="um-btn-remove-avatar"
                          onClick={() => handleRemoveAvatar(true)}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="um-avatar-upload-hint">
                      Select a profile image (PNG, JPG, up to 2MB). Optional.
                    </p>
                  </div>
                </div>

                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <div className="um-form-label-row">
                      <label htmlFor="edit-emp-id">Employee ID</label>
                      <span className="um-auto-badge">Auto-generated</span>
                    </div>
                    <div className="um-input-box um-input-box-disabled" title="Employee ID cannot be edited">
                      <IdCard size={17} className="um-field-icon" />
                      <input
                        id="edit-emp-id"
                        type="text"
                        name="emp_id"
                        autoComplete="off"
                        value={editFormData.emp_id}
                        readOnly
                        disabled
                        tabIndex={-1}
                      />
                      <Lock size={14} className="um-field-lock" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-full-name">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${editFieldErrors.full_name ? 'um-input-error' : ''}`}>
                      <UserRound size={17} className="um-field-icon" />
                      <input
                        id="edit-full-name"
                        type="text"
                        name="full_name"
                        autoComplete="name"
                        placeholder="e.g. Rahul Sharma"
                        maxLength={50}
                        value={editFormData.full_name}
                        onChange={handleEditInputChange}
                        onKeyDown={handleNameKeyDown}
                        onBlur={() =>
                          setEditFieldErrors((prev) => ({
                            ...prev,
                            full_name: validateFullName(editFormData.full_name, true)
                          }))
                        }
                      />
                    </div>
                    {editFieldErrors.full_name && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.full_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <label htmlFor="edit-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${editFieldErrors.email ? 'um-input-error' : ''}`}>
                      <Mail size={17} className="um-field-icon" />
                      <input
                        id="edit-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        onBlur={() =>
                          setEditFieldErrors((prev) => ({
                            ...prev,
                            email: validateEmail(editFormData.email)
                          }))
                        }
                      />
                    </div>
                    {editFieldErrors.email && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.email}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-phone">
                      Mobile Number <span className="req-star">*</span>
                    </label>
                    <div className={`um-input-box ${editFieldErrors.phone ? 'um-input-error' : ''}`}>
                      <span className="um-country-prefix">IN +91</span>
                      <input
                        id="edit-phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="98765 43210"
                        maxLength={10}
                        value={editFormData.phone}
                        onChange={handleEditInputChange}
                        onBlur={() =>
                          setEditFieldErrors((prev) => ({
                            ...prev,
                            phone: validatePhone(editFormData.phone)
                          }))
                        }
                      />
                    </div>
                    {editFieldErrors.phone && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Work Info: Department, Role & Status in 3-column layout */}
                <div className="um-form-grid-3">
                  <div className="um-form-group">
                    <label htmlFor="edit-department">
                      Department <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      id="edit-department"
                      value={editFormData.department}
                      onChange={(val) => {
                        setEditFormData((prev) => ({ ...prev, department: val }));
                        setEditFieldErrors((prev) => ({
                          ...prev,
                          department: validateDepartment(val)
                        }));
                        if (formError) setFormError('');
                      }}
                      options={MODAL_DEPARTMENT_OPTIONS}
                      placeholder="Select Department"
                      icon={<Building2 size={16} color="#64748b" />}
                      variant="form"
                      error={editFieldErrors.department}
                    />
                    {editFieldErrors.department && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.department}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-role">
                      Role <span className="req-star">*</span>
                    </label>
                    {isQALead && isCurrentUserRecord(editFormData) ? (
                      <div className="um-input-box um-input-box-disabled" title="Your QA Lead role cannot be modified here">
                        <ShieldCheck size={16} className="um-field-icon" />
                        <input
                          id="edit-role"
                          type="text"
                          value={editFormData.role || 'QA Lead'}
                          readOnly
                          disabled
                          tabIndex={-1}
                        />
                        <Lock size={14} className="um-field-lock" />
                      </div>
                    ) : (
                      <CustomSelect
                        id="edit-role"
                        value={editFormData.role}
                        onChange={(val) => {
                          setEditFormData((prev) => ({ ...prev, role: val }));
                          setEditFieldErrors((prev) => ({
                            ...prev,
                            role: validateRole(val)
                          }));
                          if (formError) setFormError('');
                        }}
                        options={modalRoleOptions}
                        placeholder="Select Role"
                        icon={<ShieldCheck size={16} color="#64748b" />}
                        variant="form"
                        error={editFieldErrors.role}
                      />
                    )}
                    {editFieldErrors.role && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.role}
                      </span>
                    )}
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-status">
                      Account Status <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      id="edit-status"
                      value={editFormData.status}
                      onChange={(val) => {
                        setEditFormData((prev) => ({ ...prev, status: val }));
                        setEditFieldErrors((prev) => ({
                          ...prev,
                          status: validateStatus(val)
                        }));
                        if (formError) setFormError('');
                      }}
                      options={MODAL_STATUS_OPTIONS}
                      placeholder="Select Status"
                      variant="form"
                      error={editFieldErrors.status}
                    />
                    {editFieldErrors.status && (
                      <span className="um-field-error">
                        <AlertCircle size={12} /> {editFieldErrors.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="um-modal-footer">
                <button
                  id="um-edit-cancel-btn"
                  type="button"
                  className="um-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="um-edit-submit-btn"
                  type="submit"
                  className="um-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div
          id="um-view-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingUser(null);
          }}
        >
          <div id="um-view-modal" className="um-modal-card" style={{ maxWidth: '560px' }} role="dialog" aria-modal="true">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="um-view-modal-title">User Details</h3>
                <p>Detailed workspace membership profile.</p>
              </div>
              <button
                id="um-view-modal-close-btn"
                className="um-modal-close"
                onClick={() => setViewingUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-view-profile-header">
                {viewingUser.avatar ? (
                  <img
                    src={viewingUser.avatar}
                    alt={viewingUser.full_name}
                    className="um-view-avatar-img"
                  />
                ) : (
                  <div
                    className="um-view-avatar"
                    style={getAvatarStyle(0, viewingUser.full_name || viewingUser.email)}
                  >
                    {(viewingUser.full_name || viewingUser.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 id="um-view-user-name" style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                    {viewingUser.full_name || 'Team Member'}
                  </h4>
                  <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '2px' }}>
                    {viewingUser.email}
                  </div>
                </div>
              </div>

              <div className="um-view-grid">
                <div className="um-view-item">
                  <div className="um-view-label">Employee ID</div>
                  <div className="um-view-val">
                    {viewingUser.emp_id || `EMP-${String(viewingUser.id).padStart(3, '0')}`}
                  </div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Department</div>
                  <div className="um-view-val">{renderDepartmentBadge(viewingUser.department)}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Assigned Role</div>
                  <div className="um-view-val">{renderRoleBadge(viewingUser.role)}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Account Status</div>
                  <div className="um-view-val">
                    <span
                      className={`um-status-pill ${
                        viewingUser.status === 'Inactive'
                          ? 'status-inactive'
                          : 'status-active'
                      }`}
                    >
                      <span className="um-status-dot" />
                      {viewingUser.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Mobile Number</div>
                  <div className="um-view-val">{viewingUser.phone || 'Not provided'}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Joined Date</div>
                  <div className="um-view-val">
                    {formatIndianDate(viewingUser.created_at, '08/10/2026')}
                  </div>
                </div>
              </div>
            </div>

            <div className="um-modal-footer">
              {!isQAMember && canEditUser(viewingUser) && (
                <button
                  id="um-view-edit-footer-btn"
                  type="button"
                  className="um-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    openEditModal(u);
                  }}
                >
                  <Pencil size={14} />
                  <span>Edit Profile</span>
                </button>
              )}
              {!isQAMember && !PROTECTED_EMAILS.includes(viewingUser.email?.toLowerCase()) && (
                <button
                  id="um-view-resend-invite-btn"
                  type="button"
                  className="um-btn-secondary"
                  style={{ color: '#2563EB', borderColor: '#BFDBFE', background: '#EFF6FF', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  disabled={resendingUserId === viewingUser.id}
                  onClick={() => handleResendInvite(viewingUser)}
                >
                  <Mail size={14} />
                  <span>{resendingUserId === viewingUser.id ? 'Sending...' : 'Resend Credentials Email'}</span>
                </button>
              )}
              <button
                id="um-view-close-footer-btn"
                type="button"
                className="um-btn-secondary"
                onClick={() => setViewingUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div
          id="um-delete-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setUserToDelete(null);
          }}
        >
          <div id="um-delete-modal" className="um-modal-card" style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="um-modal-header">
              <h3 id="um-delete-modal-title" style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <AlertTriangle size={20} color="#dc2626" /> Delete User
              </h3>
              <button
                id="um-delete-modal-close-btn"
                className="um-modal-close"
                onClick={() => setUserToDelete(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <p style={{ margin: 0, fontSize: '0.94rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete user{' '}
                <strong>{userToDelete.full_name || userToDelete.email}</strong> (
                {userToDelete.email})?
              </p>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '10px' }}>
                This action cannot be undone. Associated workspace permissions will be revoked.
              </p>
            </div>

            <div className="um-modal-footer">
              <button
                id="um-delete-cancel-btn"
                type="button"
                className="um-btn-secondary"
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </button>
              <button
                id="um-delete-confirm-btn"
                type="button"
                className="um-btn-danger"
                disabled={submitting}
                onClick={confirmDeleteUser}
              >
                {submitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER ROLE PERMISSIONS MODAL (ADMIN ONLY) */}
      {isPermsModalOpen && (
        <div
          id="um-perms-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingPerms) setIsPermsModalOpen(false);
          }}
        >
          <div
            id="um-perms-modal"
            className="um-modal-card"
            style={{ maxWidth: '640px', width: '100%', borderRadius: '16px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="perms-modal-title"
          >
            <div className="um-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 id="perms-modal-title" style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    Manager Role Permissions & Access Control
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Configure system module permissions and capabilities granted to the Manager role.
                  </p>
                </div>
              </div>
              <button
                className="um-modal-close"
                onClick={() => setIsPermsModalOpen(false)}
                disabled={savingPerms}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body" style={{ padding: '20px 24px' }}>
              {permsSuccessMsg && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.88rem'
                }}>
                  <ShieldCheck size={16} />
                  <span>{permsSuccessMsg}</span>
                </div>
              )}

              {permsErrorMsg && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.88rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{permsErrorMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {SYSTEM_PERMISSIONS.map((perm) => {
                  const isChecked = currentRolePerms.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        background: isChecked ? '#f0f7ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginTop: '2px',
                          accentColor: '#2563eb',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: isChecked ? '#1e3a8a' : '#1e293b' }}>
                          {perm.label}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          {perm.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="um-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="um-btn-cancel"
                onClick={() => setIsPermsModalOpen(false)}
                disabled={savingPerms}
              >
                Cancel
              </button>
              <button
                type="button"
                className="um-btn-create"
                onClick={handleSavePermissions}
                disabled={savingPerms}
              >
                {savingPerms ? 'Saving Changes...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          id="um-logout-modal-overlay"
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section id="um-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon">
              <LogOut size={21} />
            </div>
            <h2 id="um-logout-modal-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account credentials.</p>
            <div className="modal-actions">
              <button
                id="um-logout-cancel-btn"
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button id="um-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
