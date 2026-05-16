import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { NotificationBell } from './NotificationBell';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const hasRole = (role: string) => {
    return user?.roles?.includes(role) || user?.roles?.includes(`ROLE_${role}`);
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

  const isStudentOrGuest = !isAuthenticated || hasRole('STUDENT');

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
          <motion.div
            whileHover={{ rotate: -5, scale: 1.05 }}
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--primary-color)',
              color: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>U</motion.div>
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
            {isStudentOrGuest && (
              <>
                <Link to="/" style={getLinkStyle('/')}>
                  Workshops
                  {isActive('/') && (
                    <motion.div
                      layoutId="nav-underline"
                      style={{ position: 'absolute', bottom: '-12px', left: 0, right: 0, height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }}
                    />
                  )}
                </Link>
                {isAuthenticated && (
                  <Link to="/my-registrations" style={getLinkStyle('/my-registrations')}>
                    My Registrations
                    {isActive('/my-registrations') && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{ position: 'absolute', bottom: '-12px', left: 0, right: 0, height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }}
                      />
                    )}
                  </Link>
                )}
              </>
            )}
            {hasRole('ORGANIZER') && (
              <Link to="/organizer" style={getLinkStyle('/organizer')}>
                Organizer Dashboard
                {isActive('/organizer') && (
                  <motion.div
                    layoutId="nav-underline"
                    style={{ position: 'absolute', bottom: '-12px', left: 0, right: 0, height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }}
                  />
                )}
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell />
            <div style={{ width: '1px', height: '24px', background: 'var(--neutral-200)', margin: '0 8px' }}></div>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'var(--neutral-200)' }}
                  whileTap={{ scale: 0.95 }}
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
                >
                  <User size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="btn btn-danger"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: 'var(--shadow-md)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '14px' }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;


