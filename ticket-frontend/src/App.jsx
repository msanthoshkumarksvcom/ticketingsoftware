import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import AdminTickets from './pages/AdminTickets/AdminTickets';
import AdminReports from './pages/AdminReports/AdminReports';
import AdminApprovals from './pages/AdminApprovals/AdminApprovals';
import AdminDeployments from './pages/AdminDeployments/AdminDeployments';
import AdminWorkspacePage from './pages/AdminWorkspacePage/AdminWorkspacePage';
import { getValidToken } from './utils/auth';
import { getRoleHomeRoute } from './utils/roleRoutes';
import './styles/design-system.css';

const ROLE_PREFIXES = ['/admin', '/manager', '/qa-lead', '/qa-member', '/project-lead', '/developer'];

function RoleRoute({ allowedRoles, fallback = '/', children }) {
  const token = getValidToken();
  const userRole = localStorage.getItem('userRole') || '';

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleHomeRoute(userRole) || fallback} replace />;
  }

  return children;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Role-Specific Dedicated Dashboards */}
        <Route
          path="/developer"
          element={
            <RoleRoute allowedRoles={['Developer']}>
              <DeveloperDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/project-lead"
          element={
            <RoleRoute allowedRoles={['Project Lead']}>
              <ProjectLeadDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/qa-member"
          element={
            <RoleRoute allowedRoles={['QA Member']}>
              <QAMemberDashboard />
            </RoleRoute>
          }
        />
        {['/admin', '/manager', '/qa-lead'].map((prefix) => (
          <Route
            key={`${prefix}-dashboard`}
            path={prefix}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
        ))}

        {/* Shared Module Routes across all role prefixes (/manager/*, /qa-lead/*, /admin/*, etc.) */}
        {ROLE_PREFIXES.flatMap((prefix) => [
          <Route
            key={`${prefix}-users`}
            path={`${prefix}/users`}
            element={
              <RoleRoute allowedRoles={['Admin', 'Super Admin', 'Manager', 'QA Lead']}>
                <AdminUsers />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-employees`}
            path={`${prefix}/employees`}
            element={
              <RoleRoute allowedRoles={['Admin', 'Super Admin', 'Manager', 'QA Lead']}>
                <AdminUsers />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-projects`}
            path={`${prefix}/projects`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']}>
                <AdminProjects />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-project-workspace`}
            path={`${prefix}/projects/:projectId`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']}>
                <AdminProjectWorkspace />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-project-sheet`}
            path={`${prefix}/projects/:projectId/sheet`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']} fallback="/developer">
                <AdminProjectSheet />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-tickets`}
            path={`${prefix}/tickets`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']}>
                <AdminTickets />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-reports`}
            path={`${prefix}/reports`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']}>
                <AdminReports />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-approvals`}
            path={`${prefix}/approvals`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
                <AdminApprovals />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-deployment-approval`}
            path={`${prefix}/deployment-approval`}
            element={
              <RoleRoute allowedRoles={['Manager', 'QA Lead']}>
                <AdminDeployments />
              </RoleRoute>
            }
          />,
          <Route
            key={`${prefix}-settings`}
            path={`${prefix}/settings`}
            element={
              <RoleRoute allowedRoles={['Admin', 'Super Admin', 'Manager', 'QA Lead', 'QA Member', 'Project Lead', 'Developer']}>
                <AdminWorkspacePage section="settings" />
              </RoleRoute>
            }
          />,
        ])}

        <Route path="/admin/roles-permissions" element={<Navigate to="/admin" replace />} />
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
