import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import { Link } from 'react-router-dom';

interface UpgradeRequest {
  requestedRole: string;
  status: string;
  reason: string;
}

const Profile = () => {
  const { user } = useAuthStore();
  const [request, setRequest] = useState<UpgradeRequest | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const res = await api.get('/profile/upgrade-request');
        if (res.data && res.data.status) {
          setRequest(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, []);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/profile/upgrade-request', { reason, requestedRole: 'ORGANIZER' });
      setRequest({ status: 'PENDING', reason, requestedRole: 'ORGANIZER' });
    } catch (err) {
      console.error(err);
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Profile</h1>
      
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>Account Information</h2>
        <div style={{ display: 'grid', gap: '1rem', lineHeight: '1.6' }}>
          <div><strong>Name:</strong> {user?.firstName} {user?.lastName}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          {user?.roles?.includes('ADMIN') && (
            <div style={{ marginTop: '1rem' }}>
              <Link to="/admin" className="btn btn-primary">Go to Admin Dashboard</Link>
            </div>
          )}
        </div>
      </div>

      {!user?.roles?.includes('ORGANIZER') && !user?.roles?.includes('ADMIN') && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>Upgrade to Organizer</h2>
          
          {loading ? (
            <p>Loading...</p>
          ) : request && request.status === 'PENDING' ? (
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--error-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-color)' }}>
              <h3 style={{ color: 'var(--warning-color)', marginBottom: '0.5rem' }}>Upgrade Request Pending</h3>
              <p>Your request to become an {request.requestedRole} is currently being reviewed by administrators.</p>
              <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--neutral-400)' }}>Reason provided: {request.reason}</p>
            </div>
          ) : request && request.status === 'APPROVED' ? (
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--success-bg, #f0fdf4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-color)' }}>
              <h3 style={{ color: 'var(--success-color)', marginBottom: '0.5rem' }}>You are an Organizer!</h3>
              <p>Your request has been approved. Please log out and log back in to see your new Organizer permissions and dashboard.</p>
            </div>
          ) : (
            <form onSubmit={submitRequest}>
              <p style={{ marginBottom: '1.5rem' }}>
                If you want to organize workshops and manage events on UniHub, you can request an Organizer role. Please provide a brief reason.
              </p>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reason for Upgrade</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., I am the president of IT Club and we want to host coding workshops."
                  style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-300)', fontFamily: 'inherit' }}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
