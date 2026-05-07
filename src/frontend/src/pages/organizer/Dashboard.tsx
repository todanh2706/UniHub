import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  MapPin, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Filter
} from 'lucide-react';
import api from '../../api/axios';

interface Workshop {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  capacity: number;
  roomName: string;
}

const OrganizerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const response = await api.get('/organizer/workshops');
      setWorkshops(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch workshops', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this workshop?')) {
      try {
        await api.delete(`/organizer/workshops/${id}`);
        fetchWorkshops();
      } catch (error) {
        alert('Failed to cancel workshop');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED': return 'var(--success-color)';
      case 'DRAFT': return 'var(--secondary-color)';
      case 'CANCELLED': return 'var(--danger-color)';
      case 'CLOSED': return 'var(--text-body)';
      default: return 'var(--primary-color)';
    }
  };

  const filteredWorkshops = workshops.filter(w => 
    w.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Workshops</h1>
          <p style={{ color: 'var(--text-body)' }}>Manage your upcoming events and registrations</p>
        </div>
        <button 
          onClick={() => navigate('/organizer/workshops/new')}
          className="btn btn-primary"
        >
          <Plus size={20} />
          <span>Create Workshop</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input 
            type="text" 
            placeholder="Search workshops..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 44px', 
              borderRadius: '8px', 
              border: '1px solid var(--neutral-200)',
              backgroundColor: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        <button style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '0 20px', 
          borderRadius: '8px', 
          border: '1px solid var(--neutral-200)',
          backgroundColor: 'white',
          color: 'var(--text-body)',
          cursor: 'pointer'
        }}>
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--neutral-200)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {filteredWorkshops.map((workshop) => (
            <div key={workshop.id} className="glass-panel" style={{ padding: '24px', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ 
                  backgroundColor: `${getStatusColor(workshop.status)}15`, 
                  color: getStatusColor(workshop.status),
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {workshop.status}
                </span>
                <div style={{ position: 'relative' }}>
                   {/* More menu could be added here */}
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => navigate(`/organizer/workshops/${workshop.id}/edit`)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-body)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(workshop.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              </div>

              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{workshop.title}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-body)', fontSize: '14px' }}>
                  <Calendar size={16} />
                  <span>{new Date(workshop.startTime).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-body)', fontSize: '14px' }}>
                  <MapPin size={16} />
                  <span>{workshop.roomName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-body)', fontSize: '14px' }}>
                  <Users size={16} />
                  <span>Capacity: {workshop.capacity} seats</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => navigate(`/organizer/workshops/${workshop.id}/registrations`)}
                  className="btn" 
                  style={{ flex: 1, backgroundColor: 'var(--neutral-100)', color: 'var(--text-heading)', fontSize: '14px' }}
                >
                  <Users size={16} />
                  <span>Registrations</span>
                </button>
                <button 
                  onClick={() => navigate(`/workshops/${workshop.id}`)}
                  className="btn" 
                  style={{ backgroundColor: 'var(--neutral-100)', color: 'var(--text-heading)', padding: '0 12px' }}
                  title="View Public Page"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}

          {filteredWorkshops.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: 'var(--text-body)' }}>
              No workshops found. Create your first one!
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OrganizerDashboard;
