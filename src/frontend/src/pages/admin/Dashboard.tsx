import { useState } from 'react';
import UsersManagement from './UsersManagement';
import RequestsManagement from './RequestsManagement';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests'>('users');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Dashboard</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--neutral-200)', marginTop: '2rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'overview' ? 'var(--primary-color)' : 'var(--text-body)',
            fontWeight: activeTab === 'overview' ? 'bold' : 'normal'
          }}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'users' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--text-body)',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal'
          }}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'requests' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'requests' ? 'var(--primary-color)' : 'var(--text-body)',
            fontWeight: activeTab === 'requests' ? 'bold' : 'normal'
          }}
        >
          Role Requests
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-body)' }}>Total Registrations</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>1,248</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-body)' }}>Active Workshops</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>12</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-body)' }}>Revenue (Mock)</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>$0.00</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UsersManagement />}
      {activeTab === 'requests' && <RequestsManagement />}

    </div>
  );
};

export default AdminDashboard;
