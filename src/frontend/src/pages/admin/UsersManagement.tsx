import { useState, useEffect } from 'react';
import api from '../../api/axios';

interface User {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, statusFilter]);

  const toggleStatus = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}/toggle-status`);
      fetchUsers();
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser({ ...selectedUser, status: selectedUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="Search by name or email" 
          value={search} 
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-300)', flex: 1 }}
        />
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-300)' }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)', backgroundColor: 'var(--neutral-100)' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{user.fullName}</td>
                <td style={{ padding: '1rem' }}>{user.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: 'var(--radius-pill)', 
                    fontSize: '0.875rem',
                    backgroundColor: user.status === 'ACTIVE' ? 'var(--success-color)' : 'var(--neutral-300)',
                    color: '#fff'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: 'var(--neutral-200)', color: 'var(--text-heading)' }} onClick={() => setSelectedUser(user)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--neutral-200)' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--neutral-200)' }}>Prev</button>
          <span style={{ padding: '0.4rem' }}>{page + 1} / {totalPages || 1}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--neutral-200)' }}>Next</button>
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', width: '400px', maxWidth: '90%' }}>
            <h2>User Details</h2>
            <div style={{ margin: '1.5rem 0', lineHeight: '2' }}>
              <p><strong>Name:</strong> {selectedUser.fullName}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
              <p><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                style={{ backgroundColor: selectedUser.status === 'ACTIVE' ? 'var(--warning-color)' : 'var(--success-color)', color: '#fff' }}
                onClick={() => toggleStatus(selectedUser.id)}
              >
                {selectedUser.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
              <button className="btn" style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }} onClick={() => deleteUser(selectedUser.id)}>
                Delete
              </button>
              <button className="btn" style={{ backgroundColor: 'var(--neutral-200)' }} onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
