import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Clock,
  MoreHorizontal
} from 'lucide-react';
import api from '../../api/axios';

interface Registration {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
}

interface Summary {
  capacity: number;
  confirmedCount: number;
  pendingPaymentCount: number;
  activeSeats: number;
  remainingSeats: number;
}

const RegistrationList: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [id, filterStatus]);

  const fetchData = async () => {
    try {
      const [regRes, summaryRes] = await Promise.all([
        api.get(`/organizer/workshops/${id}/registrations`, {
          params: { status: filterStatus === 'ALL' ? '' : filterStatus }
        }),
        api.get(`/organizer/workshops/${id}/registration-summary`)
      ]);
      
      // The API returns a Page object, so we get content
      const regContent = regRes.data?.content || (Array.isArray(regRes.data) ? regRes.data : []);
      setRegistrations(regContent);
      setSummary(summaryRes.data || null);
    } catch (error) {
      console.error('Failed to fetch registration data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (regId: string, status: string) => {
    try {
      await api.patch(`/organizer/workshops/registrations/${regId}/status`, null, {
        params: { status }
      });
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    let bg = 'var(--neutral-100)';
    let color = 'var(--text-body)';
    
    if (s === 'CONFIRMED') { bg = `${getStatusColor('PUBLISHED')}15`; color = getStatusColor('PUBLISHED'); }
    else if (s === 'PENDING_PAYMENT') { bg = `${getStatusColor('DRAFT')}15`; color = getStatusColor('DRAFT'); }
    else if (s === 'CANCELLED') { bg = `${getStatusColor('CANCELLED')}15`; color = getStatusColor('CANCELLED'); }

    return (
      <span style={{ 
        backgroundColor: bg, 
        color: color,
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {s}
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED': return 'var(--success-color)';
      case 'DRAFT': return 'var(--warning-color)';
      case 'CANCELLED': return 'var(--danger-color)';
      default: return 'var(--primary-color)';
    }
  };

  return (
    <div className="animate-fade-in">
      <button 
        onClick={() => navigate('/organizer')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--text-body)', 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        <ArrowLeft size={20} />
        <span>Back to Workshops</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Registration List</h1>
          <p style={{ color: 'var(--text-body)' }}>Manage students and their registration status</p>
        </div>
        <button className="btn btn-secondary" style={{ backgroundColor: 'white', color: 'var(--text-heading)', border: '1px solid var(--neutral-200)' }}>
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Total Capacity', value: summary?.capacity || 0, color: 'var(--text-heading)' },
          { label: 'Confirmed', value: summary?.confirmedCount || 0, color: 'var(--success-color)' },
          { label: 'Pending', value: summary?.pendingPaymentCount || 0, color: 'var(--warning-color)' },
          { label: 'Remaining', value: summary?.remainingSeats || 0, color: 'var(--primary-color)' },
        ].map((card, i) => (
          <div key={i} className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-body)', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Table Header / Filters */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['ALL', 'CONFIRMED', 'PENDING_PAYMENT', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: filterStatus === s ? 'var(--primary-color)' : 'transparent',
                  color: filterStatus === s ? 'white' : 'var(--text-body)',
                  transition: 'all 0.2s ease'
                }}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            <input 
              type="text" 
              placeholder="Filter by student name..." 
              style={{ 
                width: '100%', 
                padding: '10px 12px 10px 40px', 
                borderRadius: '8px', 
                border: '1px solid var(--neutral-200)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--neutral-100)' }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Registered Date</th>
                <th style={thStyle}>Confirmed Date</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                 <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : registrations.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-heading)' }}>{reg.studentName || 'Student Name'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} />
                          {reg.studentEmail || 'email@university.edu'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{getStatusBadge(reg.status)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Clock size={14} color="var(--neutral-400)" />
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {reg.confirmedAt ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <CheckCircle size={14} color="var(--success-color)" />
                        {new Date(reg.confirmedAt).toLocaleDateString()}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {reg.status !== 'CONFIRMED' && (
                        <button 
                          onClick={() => handleUpdateStatus(reg.id, 'CONFIRMED')}
                          style={{ background: 'none', border: 'none', color: 'var(--success-color)', cursor: 'pointer', padding: '4px' }}
                          title="Confirm Registration"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {reg.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => handleUpdateStatus(reg.id, 'CANCELLED')}
                          style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '4px' }}
                          title="Cancel Registration"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-body)', cursor: 'pointer', padding: '4px' }}>
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && registrations.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-body)' }}>No registrations found for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '16px 24px',
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-body)',
  borderBottom: '1px solid var(--neutral-200)'
};

const tdStyle: React.CSSProperties = {
  padding: '20px 24px',
  verticalAlign: 'middle'
};

export default RegistrationList;
