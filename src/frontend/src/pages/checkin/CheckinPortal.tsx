const CheckinPortal = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--primary-color)', background: 'transparent' }}>
        <p style={{ color: 'var(--text-secondary)' }}>[ QR Scanner Camera Placeholder ]</p>
      </div>
      
      <div style={{ marginTop: '2rem', width: '100%', maxWidth: '400px' }}>
        <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
          Sync Offline Data
        </button>
      </div>
    </div>
  );
};

export default CheckinPortal;
