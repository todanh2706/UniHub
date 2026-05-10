import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="glass-panel" style={{ width: '250px', padding: '2rem 1rem', borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--accent-color)' }}>Admin Panel</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <Link to="/admin" style={{ 
            color: isActive('/admin') ? 'var(--text-primary)' : 'var(--text-secondary)', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px', 
            background: isActive('/admin') ? 'rgba(255,255,255,0.05)' : 'transparent',
            fontWeight: isActive('/admin') ? '600' : '400',
            textDecoration: 'none'
          }}>Dashboard</Link>
          <Link to="/admin/workshops" style={{ 
            color: isActive('/admin/workshops') ? 'var(--text-primary)' : 'var(--text-secondary)', 
            padding: '0.5rem 1rem',
            background: isActive('/admin/workshops') ? 'rgba(255,255,255,0.05)' : 'transparent',
            borderRadius: '8px',
            fontWeight: isActive('/admin/workshops') ? '600' : '400',
            textDecoration: 'none'
          }}>Workshops</Link>
          <Link to="/admin/students" style={{ 
            color: isActive('/admin/students') ? 'var(--text-primary)' : 'var(--text-secondary)', 
            padding: '0.5rem 1rem',
            background: isActive('/admin/students') ? 'rgba(255,255,255,0.05)' : 'transparent',
            borderRadius: '8px',
            fontWeight: isActive('/admin/students') ? '600' : '400',
            textDecoration: 'none'
          }}>Students</Link>
        </nav>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            color: 'var(--danger-color)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }} className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
