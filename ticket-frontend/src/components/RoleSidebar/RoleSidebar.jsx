import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Activity } from 'lucide-react';
import { SmallCubeLogo } from '../AdminSidebar/AdminSidebar';
import '../AdminSidebar/AdminSidebar.css';

export default function RoleSidebar({ roleName = 'Member', homeRoute = '/admin', onLogout }) {
  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" to={homeRoute} aria-label={`${roleName} Dashboard`}>
        <SmallCubeLogo />
        <div className="brand-text-col">
          <span className="brand-name"><span>QA</span> Software</span>
          <span className="brand-tagline">Quality Management System</span>
        </div>
      </Link>

      <div className="sidebar-section-label">MAIN MENU</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavLink
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          to={homeRoute}
          end
        >
          <LayoutDashboard className="nav-icon" /> Dashboard
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="workspace-card">
          <div className="workspace-card-icon"><Activity size={17} /></div>
          <div>
            <strong>QA Workspace</strong>
            <span>{roleName} Console</span>
          </div>
          <span className="connection-dot" />
        </div>
        <button className="nav-item nav-logout" onClick={onLogout}>
          <LogOut className="nav-icon" /> Sign out
        </button>
      </div>
    </aside>
  );
}
