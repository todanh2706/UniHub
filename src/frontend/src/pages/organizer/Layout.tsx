import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  PlusCircle,
  ChevronRight,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
    // { name: 'Registrations', path: '/organizer/registrations', icon: Users },
    { name: 'Analytics', path: '/organizer/analytics', icon: LayoutDashboard },
    { name: 'Settings', path: '/organizer/settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--neutral-200)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 100
      }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '20px'
          }}>U</div>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-heading)' }}>UniHub Admin</span>
        </div>

        <nav style={{ flex: 1, padding: '12px' }}>
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
        <header style={{
          height: '80px',
          backgroundColor: 'var(--surface-color)',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <button style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-body)',
            cursor: 'pointer',
            position: 'relative',
            padding: '8px'
          }}>
            <Bell size={22} />
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--danger-color)',
              borderRadius: '50%',
              border: '2px solid white'
            }}></span>
          </button>
        </header>

        <main style={{ padding: '40px', maxWidth: '1200px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OrganizerLayout;
