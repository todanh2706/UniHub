import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';


const StudentLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--neutral-200)',
        height: '72px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          width: '100%', 
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <Link to="/" style={{ 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'var(--primary-color)', 
              color: 'white', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>U</div>
            <span style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: 'var(--text-heading)',
              fontFamily: 'var(--font-display)'
            }}>UniHub</span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              <Link to="/" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>Workshops</Link>
              <Link to="/my-registrations" style={{ color: 'var(--text-body)', fontWeight: '500', textDecoration: 'none' }}>My Bookings</Link>
              <Link to="/about" style={{ color: 'var(--text-body)', fontWeight: '500', textDecoration: 'none' }}>About</Link>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button style={{ 
                background: 'var(--neutral-100)', 
                border: 'none', 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-body)'
              }}>
                <Search size={20} />
              </button>
              <button style={{ 
                background: 'var(--neutral-100)', 
                border: 'none', 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-body)',
                position: 'relative'
              }}>
                <Bell size={20} />
                <span style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  width: '8px', 
                  height: '8px', 
                  background: 'var(--danger-color)', 
                  borderRadius: '50%',
                  border: '2px solid white'
                }}></span>
              </button>
              <div style={{ width: '1px', height: '24px', background: 'var(--neutral-200)', margin: '0 8px' }}></div>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary" 
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                Sign In
              </button>
            </div>
          </nav>
        </div>
      </header>

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
