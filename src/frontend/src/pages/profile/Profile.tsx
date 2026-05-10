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
        } else {
          setRequest(null);
        }
      } catch (err) {
        console.error('Error fetching upgrade request:', err);
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
      // After posting, we can just fetch again or set locally
      setRequest({ status: 'PENDING', reason, requestedRole: 'ORGANIZER' });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderUpgradeSection = () => {
    if (loading) return <div className="shimmer" style={{ height: '100px', borderRadius: 'var(--radius-sm)' }}></div>;

    if (request?.status === 'PENDING') {
      return (
        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-color)' }}>
          <h3 style={{ color: 'var(--warning-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span> Upgrade Request Pending
          </h3>
          <p>Your request to become an {request.requestedRole} is currently being reviewed by administrators.</p>
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '4px', borderLeft: '3px solid var(--warning-color)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Reason provided:</p>
            <p style={{ fontStyle: 'italic', color: 'var(--text-body)', fontSize: '0.9rem' }}>{request.reason}</p>
          </div>
        </div>
      );
    }

    if (request?.status === 'APPROVED') {
      return (
        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-color)' }}>
          <h3 style={{ color: 'var(--success-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span> Request Approved!
          </h3>
          <p>You are now an Organizer. Please log out and log back in to activate your new permissions and access the Organizer Dashboard.</p>
        </div>
      );
    }

    return (
      <form onSubmit={submitRequest}>
        {request?.status === 'REJECTED' && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--error-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-color)' }}>
            <h4 style={{ color: 'var(--danger-color)', marginBottom: '0.25rem' }}>Previous Request Rejected</h4>
            <p style={{ fontSize: '0.9rem' }}>Your previous request was not approved. You can submit a new request with more details if you wish.</p>
          </div>
        )}
        <p style={{ marginBottom: '1.5rem' }}>
          If you want to organize workshops and manage events on UniHub, you can request an Organizer role. Please provide a brief reason why you should be granted this role.
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reason for Upgrade</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., I am the president of IT Club and we want to host coding workshops for members."
            style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-300)', fontFamily: 'inherit', resize: 'vertical' }}
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
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }} className="animate-fade-in">
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
          {renderUpgradeSection()}
        </div>
      )}
    </div>
  );
};

export default Profile;
