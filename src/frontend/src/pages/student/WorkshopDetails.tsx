import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, ShieldCheck, Share2, Info, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const WorkshopDetails: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    if (!showPayment) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showPayment]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegister = () => {
    setIsRegistering(true);
    setTimeout(() => {
      setIsRegistering(false);
      setShowPayment(true);
    }, 1500);
  };

  const isLowTime = timeLeft < 180; // Less than 3 minutes

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-body)' }}>
        <Link to="/" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <Link to="/workshops" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Workshops</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>AI & Machine Learning</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        {/* Main Content */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'var(--surface-color)', 
              borderRadius: 'var(--radius-lg)', 
              overflow: 'hidden',
              border: '1px solid var(--neutral-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ height: '400px', width: '100%' }}>
              <img 
                src="https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&q=80&w=1200" 
                alt="Workshop" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            
            <div style={{ padding: '40px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <span style={{ background: 'var(--neutral-100)', color: 'var(--text-body)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: '600' }}>Technology</span>
                <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 12px', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Certified
                </span>
              </div>

              <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>AI & Machine Learning: Building the Future</h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '24px', background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar className="icon" style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>Date</div>
                    <div style={{ fontWeight: '600' }}>Oct 20, 2026</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock className="icon" style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>Time</div>
                    <div style={{ fontWeight: '600' }}>09:00 - 16:00</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MapPin className="icon" style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>Location</div>
                    <div style={{ fontWeight: '600' }}>Lab 302, Sci Bldg</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '18px', color: 'var(--text-body)', lineHeight: '1.8' }}>
                <p style={{ marginBottom: '20px' }}>
                  Dive into the world of Artificial Intelligence and Machine Learning in this intensive one-day workshop. 
                  Designed for students who want to move beyond theory and build real-world applications.
                </p>
                <h3 style={{ color: 'var(--text-heading)', marginBottom: '16px' }}>What you will learn:</h3>
                <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '16px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" /> Neural Network Basics
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" /> PyTorch Fundamentals
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" /> Data Preprocessing
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" /> Model Deployment
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar / Registration */}
        <div>
          <AnimatePresence mode="wait">
            {!showPayment ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ 
                  background: 'var(--surface-color)', 
                  padding: '32px', 
                  borderRadius: 'var(--radius-lg)', 
                  border: '1px solid var(--neutral-200)',
                  boxShadow: 'var(--shadow-md)',
                  position: 'sticky',
                  top: '112px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <span style={{ fontSize: '16px', color: 'var(--text-body)' }}>Registration Fee</span>
                  <span style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-heading)' }}>$20.00</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#FEF3C7', borderRadius: 'var(--radius-sm)', color: '#92400E', fontSize: '14px', marginBottom: '24px' }}>
                  <Users size={18} /> <span>Only 12 seats left!</span>
                </div>

                <button 
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className={`btn btn-primary ${isRegistering ? 'loading' : ''}`}
                  style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: '600' }}
                >
                  {isRegistering ? (
                    <>
                      <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                      Processing...
                    </>
                  ) : 'Register Now'}
                </button>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-body)' }}>
                    <Info size={16} /> Secure payment via Stripe
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-body)' }}>
                    <Share2 size={16} /> Share with friends
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ 
                  background: 'var(--surface-color)', 
                  padding: '32px', 
                  borderRadius: 'var(--radius-lg)', 
                  border: '1px solid var(--danger-color)',
                  boxShadow: '0 20px 25px -5px rgba(225, 29, 72, 0.1)',
                  position: 'sticky',
                  top: '112px'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: isLowTime ? 'var(--danger-color)' : 'var(--warning-color)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }} className={isLowTime ? 'pulse-effect' : ''}>
                    <Clock size={16} /> {isLowTime ? 'URGENT: PAYMENT EXPIRES IN' : 'TIME REMAINING TO PAY'}
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: '800', 
                    fontFamily: 'var(--font-display)',
                    color: isLowTime ? 'var(--danger-color)' : 'var(--text-heading)'
                  }}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span>Workshop Fee</span>
                    <span>$20.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '18px' }}>
                    <span>Total Due</span>
                    <span>$20.00</span>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }}>
                  Pay Now
                </button>

                <button 
                  onClick={() => setShowPayment(false)}
                  style={{ width: '100%', background: 'none', border: 'none', marginTop: '16px', color: 'var(--neutral-400)', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel Registration
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .pulse-effect {
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WorkshopDetails;
