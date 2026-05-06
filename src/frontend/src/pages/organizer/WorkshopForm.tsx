import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  MapPin, 
  Type, 
  AlignLeft, 
  Users, 
  DollarSign,
  Clock
} from 'lucide-react';
import api from '../../api/axios';

const WorkshopForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventId: '',
    roomId: '',
    capacity: 50,
    priceAmount: 0,
    currency: 'VND',
    startTime: '',
    endTime: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    status: 'DRAFT'
  });

  const [events, setEvents] = useState<{id: string, name: string}[]>([]);
  const [rooms, setRooms] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchMetadata();
    if (isEdit) {
      fetchWorkshop();
    }
  }, [id]);

  const fetchMetadata = async () => {
    try {
      const [eventsRes, roomsRes] = await Promise.all([
        api.get('/organizer/workshops/events'),
        api.get('/organizer/workshops/rooms')
      ]);
      setEvents(eventsRes.data);
      setRooms(roomsRes.data);
      
      // Auto-select first item if creating new
      if (!isEdit) {
        setFormData(prev => ({
          ...prev,
          eventId: eventsRes.data[0]?.id || '',
          roomId: roomsRes.data[0]?.id || ''
        }));
      }
    } catch (error) {
      console.error('Failed to fetch metadata', error);
      // Fallback/Mock data if endpoints aren't ready - Use valid UUID format
      const fallbackId = '00000000-0000-0000-0000-000000000000';
      setEvents([{id: fallbackId, name: 'UniHub Spring Workshop 2026'}]);
      setRooms([{id: fallbackId, name: 'Phòng 401 - Tòa A'}]);
    }
  };

  const fetchWorkshop = async () => {
    try {
      const response = await api.get(`/organizer/workshops/${id}`);
      const data = response.data;
      // Convert ISO strings to datetime-local format for inputs
      const formatToInput = (dateStr: string) => new Date(dateStr).toISOString().slice(0, 16);
      
      setFormData({
        ...data,
        startTime: formatToInput(data.startTime),
        endTime: formatToInput(data.endTime),
        registrationOpensAt: formatToInput(data.registrationOpensAt),
        registrationClosesAt: formatToInput(data.registrationClosesAt)
      });
    } catch (error) {
      console.error('Failed to fetch workshop', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        registrationOpensAt: new Date(formData.registrationOpensAt).toISOString(),
        registrationClosesAt: new Date(formData.registrationClosesAt).toISOString()
      };

      if (isEdit) {
        await api.put(`/organizer/workshops/${id}`, payload);
      } else {
        await api.post('/organizer/workshops', payload);
      }
      navigate('/organizer');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save workshop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
          {isEdit ? 'Edit Workshop' : 'Create New Workshop'}
        </h1>
        <p style={{ color: 'var(--text-body)' }}>
          {isEdit ? 'Update workshop details and scheduling' : 'Fill in the information to host a new learning session'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Info Section */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Type size={20} color="var(--primary-color)" />
              Basic Information
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Workshop Title</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Introduction to React Design Patterns"
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Description</label>
                <textarea 
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what students will learn..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} color="var(--primary-color)" />
              Event Schedule
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Start Time</label>
                <input 
                  type="datetime-local" 
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>End Time</label>
                <input 
                  type="datetime-local" 
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Registration Opens</label>
                <input 
                  type="datetime-local" 
                  name="registrationOpensAt"
                  required
                  value={formData.registrationOpensAt}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Registration Closes</label>
                <input 
                  type="datetime-local" 
                  name="registrationClosesAt"
                  required
                  value={formData.registrationClosesAt}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Settings Section */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Venue & Capacity</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Event</label>
                <select 
                  name="eventId" 
                  value={formData.eventId} 
                  onChange={handleChange} 
                  required
                  style={inputStyle}
                >
                  <option value="">Select Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Room</label>
                <select 
                  name="roomId" 
                  value={formData.roomId} 
                  onChange={handleChange} 
                  required
                  style={inputStyle}
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Capacity</label>
                <div style={{ position: 'relative' }}>
                  <Users size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                  <input 
                    type="number" 
                    name="capacity"
                    required
                    value={formData.capacity}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Registration Fee</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                  <input 
                    type="number" 
                    name="priceAmount"
                    required
                    value={formData.priceAmount}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange} 
                  style={inputStyle}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            style={{ width: '100%', padding: '16px', fontSize: '16px' }}
          >
            {isLoading ? 'Saving...' : (
              <>
                <Save size={20} />
                <span>{isEdit ? 'Update Workshop' : 'Create Workshop'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid var(--neutral-200)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  backgroundColor: 'white'
};

export default WorkshopForm;
