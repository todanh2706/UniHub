import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const StudentLayout = () => {
  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: '1', paddingTop: '72px' }}>
        <Outlet />
      </main>

      <footer style={{
        background: 'var(--surface-color)',
        borderTop: '1px solid var(--neutral-200)',
        padding: '48px 24px 24px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>U</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-heading)' }}>UniHub</span>
            </div>
            <p style={{ color: 'var(--text-body)', fontSize: '14px' }}>Connecting students with high-quality workshops and learning opportunities.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '16px' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <li><Link to="/" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Upcoming Workshops</Link></li>
              <li><Link to="/about" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>About Us</Link></li>
              <li><Link to="/contact" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginBottom: '16px' }}>Support</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <li><Link to="/faq" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>FAQ</Link></li>
              <li><Link to="/terms" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Terms of Service</Link></li>
              <li><Link to="/privacy" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: '1280px', margin: '48px auto 0', paddingTop: '24px', borderTop: '1px solid var(--neutral-100)', textAlign: 'center', fontSize: '14px', color: 'var(--neutral-400)' }}>
          {"\u00A9"} 2026 UniHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default StudentLayout;
