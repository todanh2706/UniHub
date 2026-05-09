import { Outlet } from 'react-router-dom';

const CheckinLayout = () => {
  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1.25rem 2rem', 
        background: 'var(--surface-color)', 
        borderBottom: '1px solid var(--neutral-200)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10
      }}>
        <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 700 }}>
          UniHub <span style={{ color: 'var(--text-heading)', fontWeight: 500 }}>Check-in</span>
        </h3>
      </header>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default CheckinLayout;
