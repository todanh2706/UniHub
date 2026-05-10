import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getLinkStyle = (path: string) => ({
    color: isActive(path) ? 'var(--primary-color)' : 'var(--text-body)',
    fontWeight: isActive(path) ? '600' : '500',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    position: 'relative' as const
  });

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neutral-200)',
      height: '72px',
      display: 'flex',
      alignItems: 'center'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <Link to="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--primary-color)',
            color: 'white',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '20px'
          }}>U</div>
          <span style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text-heading)',
            fontFamily: 'var(--font-display)'
          }}>UniHub</span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            <Link to="/" style={getLinkStyle('/')}>Workshops</Link>
            <Link to="/my-registrations" style={getLinkStyle('/my-registrations')}>My Registrations</Link>
            <Link to="/about" style={getLinkStyle('/about')}>About</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{
              background: 'var(--neutral-100)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-body)'
            }}>
              <Search size={20} />
            </button>
            <button style={{
              background: 'var(--neutral-100)',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-body)',
              position: 'relative'
            }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '8px',
                height: '8px',
                background: 'var(--danger-color)',
                borderRadius: '50%',
                border: '2px solid white'
              }}></span>
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--neutral-200)', margin: '0 8px' }}></div>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => navigate('/profile')}
                  style={{
                    background: 'var(--neutral-100)',
                    border: 'none',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive('/profile') ? 'var(--primary-color)' : 'var(--text-body)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive('/profile') ? '0 0 0 2px var(--primary-color)' : 'none'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--neutral-200)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                >
                  <User size={20} />
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-danger"
                  style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
