import { Outlet } from 'react-router-dom';

const CheckinLayout = () => {
  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Check-in Scanner</h3>
        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--success-color)', borderRadius: '12px', color: '#fff' }}>Online</span>
      </header>
      <main style={{ flex: 1, padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default CheckinLayout;
