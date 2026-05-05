import { Outlet, Link } from 'react-router-dom';

const StudentLayout = () => {
  return (
    <div className="app-layout">
      <nav className="navbar glass-panel">
        <div className="logo" style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          UniHub
        </div>
        <div className="nav-links">
          <Link to="/" style={{ color: 'var(--text-primary)', marginRight: '1rem' }}>Home</Link>
          <Link to="/profile" style={{ color: 'var(--text-primary)' }}>Profile</Link>
        </div>
      </nav>
      <main className="page-container animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
