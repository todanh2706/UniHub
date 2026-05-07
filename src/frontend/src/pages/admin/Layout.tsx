import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="glass-panel" style={{ width: '250px', padding: '2rem 1rem', borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--accent-color)' }}>Admin Panel</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <Link to="/admin" style={{ color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>Dashboard</Link>
          <Link to="/admin/workshops" style={{ color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>Workshops</Link>
          <Link to="/admin/students" style={{ color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>Students</Link>
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
