import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import '../../styles/Skeleton.css';

const StudentHome = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['home_workshops'],
    queryFn: async () => {
      const response = await api.get('/public/workshops?page=0&size=3');
      return response.data;
    }
  });

  const workshops = data?.content || [];



  return (
    <div style={{ background: 'var(--bg-color)' }}>
      {/* Hero Section */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)',
        textAlign: 'center',
        borderBottom: '1px solid var(--neutral-200)'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: '800px', margin: '0 auto' }}
        >
          <span style={{
            background: 'rgba(79, 70, 229, 0.1)',
            color: 'var(--primary-color)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '24px',
            display: 'inline-block'
          }}>
            Ignite Your Potential
          </span>
          <h1 style={{
            fontSize: '56px',
            lineHeight: '1.1',
            marginBottom: '24px',
            background: 'linear-gradient(to right, #0F172A, #4F46E5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            Discover & Register for <br /> Future-Ready Workshops
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'var(--text-body)',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Join thousands of students at UniHub. Learn from industry experts, <br />
            build your network, and accelerate your career.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/workshops" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
                Explore Workshops <ArrowRight size={20} />
              </button>
            </Link>
            <button className="btn" style={{
              background: 'white',
              border: '1px solid var(--neutral-300)',
              padding: '14px 32px',
              fontSize: '16px'
            }}>
              How it works
            </button>
          </div>
        </motion.div>
      </section>

      {/* Featured Workshops */}
      <section style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '48px'
        }}>
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Upcoming Workshops</h2>
            <p style={{ color: 'var(--text-body)' }}>Handpicked learning experiences for you.</p>
          </div>
          <Link to="/workshops" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all workshops <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '32px'
        }}>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-200)', overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: '220px', width: '100%' }}></div>
                <div style={{ padding: '24px' }}>
                  <div className="skeleton" style={{ height: '24px', width: '80%', marginBottom: '12px' }}></div>
                  <div className="skeleton" style={{ height: '16px', width: '100%', marginBottom: '8px' }}></div>
                  <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '24px' }}></div>
                  <div className="skeleton" style={{ height: '60px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>
                </div>
              </div>
            ))
          ) : (
            workshops.map((workshop: any, index: number) => (
              <motion.div
                key={workshop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{
                  background: 'var(--surface-color)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--neutral-200)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s ease'
                }}
                whileHover={{ y: -8, boxShadow: 'var(--shadow-md)' }}
              >
                <div style={{ position: 'relative', height: '220px' }}>
                  {workshop.thumbnail ? (
                    <img
                      src={workshop.thumbnail}
                      alt={workshop.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="shimmer" style={{ width: '100%', height: '100%' }}></div>
                  )}
                </div>

                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px', lineHeight: '1.4' }}>{workshop.title}</h3>
                  <p style={{ color: 'var(--text-body)', fontSize: '15px', marginBottom: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {workshop.description || 'No description available.'}
                  </p>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '24px',
                    padding: '16px',
                    background: 'var(--neutral-100)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-heading)' }}>
                      <Calendar size={16} color="var(--primary-color)" /> {new Date(workshop.startTime).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-heading)' }}>
                      <MapPin size={16} color="var(--primary-color)" /> {workshop.roomName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-heading)' }}>
                      <Users size={16} color="var(--primary-color)" /> {workshop.capacity} attendees
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '14px', color: 'var(--text-body)' }}>Entry Fee</span>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: workshop.priceAmount === 0 ? 'var(--success-color)' : 'var(--text-heading)' }}>
                        {workshop.priceAmount === 0 ? 'Free' : `${workshop.priceAmount} ${workshop.currency}`}
                      </div>
                    </div>
                    <Link to={`/workshops/${workshop.id}`}>
                      <button className="btn btn-primary" style={{ padding: '10px 24px' }}>
                        Register
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '80px 24px', background: 'var(--text-heading)', color: 'white' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '8px' }}>50+</div>
            <div style={{ color: 'var(--neutral-400)' }}>Monthly Workshops</div>
          </div>
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '8px' }}>10k+</div>
            <div style={{ color: 'var(--neutral-400)' }}>Active Students</div>
          </div>
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '8px' }}>15+</div>
            <div style={{ color: 'var(--neutral-400)' }}>Partner Universities</div>
          </div>
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '8px' }}>98%</div>
            <div style={{ color: 'var(--neutral-400)' }}>Satisfaction Rate</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentHome;
