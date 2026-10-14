import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import AdminUsers from './pages/AdminUsers/AdminUsers';
import AdminProjects from './pages/AdminProjects/AdminProjects';
import AdminRoles from './pages/AdminRoles/AdminRoles';
import AdminTickets from './pages/AdminTickets/AdminTickets';
import AdminReports from './pages/AdminReports/AdminReports';
import AdminApprovals from './pages/AdminApprovals/AdminApprovals';
import AdminDeployments from './pages/AdminDeployments/AdminDeployments';
import AdminWorkspacePage from './pages/AdminWorkspacePage/AdminWorkspacePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/projects" element={<AdminProjects />} />
        <Route path="/admin/roles-permissions" element={<AdminRoles />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/approvals" element={<AdminApprovals />} />
        <Route path="/admin/deployment-approval" element={<AdminDeployments />} />
        <Route path="/admin/settings" element={<AdminWorkspacePage section="settings" />} />
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;