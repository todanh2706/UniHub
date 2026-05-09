import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const CheckinLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const isOnline = useOnlineStatus();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', background: 'var(--surface-color)', borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Check-in Scanner</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isOnline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-pill)', color: 'var(--success-color)' }}>
              <Wifi size={16} />
              <span>Online</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', padding: '6px 12px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: 'var(--radius-pill)', color: 'var(--danger-color)' }}>
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: '1px solid var(--neutral-200)',
              background: 'white',
              color: 'var(--danger-color)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all var(--transition-speed)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--error-bg)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default CheckinLayout;
