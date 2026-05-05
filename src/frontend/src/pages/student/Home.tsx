const StudentHome = () => {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Upcoming Workshops</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Discover and register for the latest events.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Placeholder for Workshop Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '100%', height: '150px', background: 'var(--bg-color)', borderRadius: '8px' }}></div>
          <h3>Career Fair 2026</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Learn how to ace your interviews with top tech companies.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>Free</span>
            <button className="btn btn-primary">Register Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
