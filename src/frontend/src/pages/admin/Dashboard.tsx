const AdminDashboard = () => {
  return (
    <div>
      <h1>Dashboard Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>Total Registrations</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>1,248</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>Active Workshops</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>12</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>Revenue (Mock)</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>$0.00</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
