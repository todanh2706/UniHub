import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface RequestItem {
  id: string;
  user: { fullName: string; email: string };
  requestedRole: string;
  status: string;
  reason: string;
  createdAt: string;
}

const RequestsManagement = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 10 };
      if (statusFilter) params.status = statusFilter;
      
      const res = await api.get('/admin/requests', { params });
      setRequests(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const processRequest = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await api.put(`/admin/requests/${id}/process`, { action });
      await fetchRequests();
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message === 'Request already processed') {
         // Silently ignore if already processed, just refresh
         await fetchRequests();
      } else {
         alert('Failed to process request');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-300)' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)', backgroundColor: 'var(--neutral-100)' }}>
              <th style={{ padding: '1rem' }}>User</th>
              <th style={{ padding: '1rem' }}>Requested Role</th>
              <th style={{ padding: '1rem' }}>Reason</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : requests.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{req.user.fullName}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>{req.user.email}</div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{req.requestedRole}</td>
                <td style={{ padding: '1rem', maxWidth: '200px' }}>{req.reason}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: 'var(--radius-pill)', 
                    fontSize: '0.875rem',
                    backgroundColor: req.status === 'PENDING' ? 'var(--warning-color)' : req.status === 'APPROVED' ? 'var(--success-color)' : 'var(--danger-color)',
                    color: '#fff'
                  }}>
                    {req.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {req.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: processingId === req.id ? 'var(--neutral-300)' : 'var(--success-color)', color: '#fff' }} 
                        onClick={() => processRequest(req.id, 'APPROVED')}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? '...' : 'Approve'}
                      </button>
                      <button 
                        className="btn" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: processingId === req.id ? 'var(--neutral-300)' : 'var(--danger-color)', color: '#fff' }} 
                        onClick={() => processRequest(req.id, 'REJECTED')}
                        disabled={processingId === req.id}
                      >
                        {processingId === req.id ? '...' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--neutral-400)', fontSize: '0.875rem' }}>Processed</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No requests found.</td></tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--neutral-200)' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--neutral-200)' }}>Prev</button>
          <span style={{ padding: '0.4rem' }}>{page + 1} / {totalPages || 1}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--neutral-200)' }}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default RequestsManagement;
