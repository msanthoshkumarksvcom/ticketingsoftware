import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard/DeveloperDashboard';
import ProjectLeadDashboard from './pages/ProjectLeadDashboard/ProjectLeadDashboard';
import QAMemberDashboard from './pages/QAMemberDashboard/QAMemberDashboard';
import AdminUsers from './pages/AdminUsers/AdminUsers';
import AdminProjects from './pages/AdminProjects/AdminProjects';
import AdminProjectSheet from './pages/AdminProjectSheet/AdminProjectSheet';
import AdminProjectWorkspace from './pages/AdminProjectWorkspace/AdminProjectWorkspace';
import AdminRoles from './pages/AdminRoles/AdminRoles';
import AdminTickets from './pages/AdminTickets/AdminTickets';
import AdminReports from './pages/AdminReports/AdminReports';
import AdminApprovals from './pages/AdminApprovals/AdminApprovals';
import AdminDeployments from './pages/AdminDeployments/AdminDeployments';
import AdminWorkspacePage from './pages/AdminWorkspacePage/AdminWorkspacePage';
import './styles/design-system.css';

function RoleRoute({ allowedRoles, fallback = '/', children }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || '';

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'QA Member') return <Navigate to="/qa-member" replace />;
    if (userRole === 'Developer') return <Navigate to="/developer" replace />;
    if (userRole === 'Project Lead') return <Navigate to="/project-lead" replace />;
    return <Navigate to={fallback} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Role-Specific Dedicated Dashboards */}
        <Route path="/developer" element={<DeveloperDashboard />} />
        <Route path="/project-lead" element={<ProjectLeadDashboard />} />
        <Route path="/qa-member" element={<QAMemberDashboard />} />

        {/* Admin & Management Console Routes */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/projects" element={<AdminProjects />} />
        <Route path="/admin/projects/:projectId" element={<AdminProjectWorkspace />} />
        <Route path="/admin/projects/:projectId/sheet" element={<AdminProjectSheet />} />
        <Route
          path="/admin/roles-permissions"
          element={
            <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
              <AdminRoles />
            </RoleRoute>
          }
        />
        <Route path="/admin/tickets" element={<AdminTickets />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route
          path="/admin/approvals"
          element={
            <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
              <AdminApprovals />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/deployment-approval"
          element={
            <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
              <AdminDeployments />
            </RoleRoute>
          }
        />
        <Route path="/admin/settings" element={<AdminWorkspacePage section="settings" />} />
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
