import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  PlusCircle,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';

const OrganizerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Workshops', path: '/organizer', icon: Calendar },
    { name: 'Analytics', path: '/organizer/analytics', icon: LayoutDashboard },
    { name: 'CSV Sync', path: '/organizer/csv-sync', icon: FileText },
    { name: 'Settings', path: '/organizer/settings', icon: Settings },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <Navbar />
      
      <div style={{ display: 'flex', paddingTop: '72px' }}>
        {/* Sidebar */}
        <aside style={{
          width: '280px',
          backgroundColor: 'var(--surface-color)',
          borderRight: '1px solid var(--neutral-200)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: '72px',
          bottom: 0,
          zIndex: 40
        }}>
          <nav style={{ flex: 1, padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => navigate('/organizer/workshops/new')}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <PlusCircle size={18} />
                <span>New Workshop</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/organizer' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: isActive ? 'var(--primary-color)' : 'var(--text-body)',
                      backgroundColor: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      fontWeight: isActive ? '600' : '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <item.icon size={20} />
                    <span>{item.name}</span>
                    {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div style={{ padding: '24px', borderTop: '1px solid var(--neutral-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--neutral-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color)',
                fontWeight: '600'
              }}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-body)', textTransform: 'capitalize' }}>Organizer</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px',
                border: 'none',
                background: 'none',
                color: 'var(--danger-color)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }}>
          <main style={{ padding: '40px', maxWidth: '1200px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default OrganizerLayout;

