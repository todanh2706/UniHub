import { Outlet, Link } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="glass-panel" style={{ width: '250px', padding: '2rem 1rem', borderRadius: 0, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--accent-color)' }}>Admin Panel</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link to="/admin" style={{ color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>Dashboard</Link>
          <Link to="/admin/workshops" style={{ color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>Workshops</Link>
          <Link to="/admin/students" style={{ color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>Students</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }} className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
