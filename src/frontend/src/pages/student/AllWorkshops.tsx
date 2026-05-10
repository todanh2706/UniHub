import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/Skeleton.css';

const AllWorkshops = () => {
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['workshops', keyword, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: '12'
      });
      if (keyword) params.append('keyword', keyword);
      const response = await api.get(`/public/workshops?${params.toString()}`);
      return response.data;
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(0);
  };

  const workshops = data?.content || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>All Workshops</h1>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              <input 
                type="text" 
                placeholder="Search workshops by title or description..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
              Search
            </button>
          </form>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '32px'
        }}>
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-200)', overflow: 'hidden' }}>
                <div className="shimmer" style={{ height: '220px', width: '100%' }}></div>
                <div style={{ padding: '24px' }}>
                  <div className="shimmer" style={{ height: '24px', width: '80%', marginBottom: '12px' }}></div>
                  <div className="shimmer" style={{ height: '16px', width: '100%', marginBottom: '8px' }}></div>
                  <div className="shimmer" style={{ height: '60px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>
                </div>
              </div>
            ))
          ) : workshops.length > 0 ? (
            workshops.map((workshop: any, index: number) => (
              <motion.div
                key={workshop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
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
                      <Users size={16} color="var(--primary-color)" /> {workshop.capacity} Capacity
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
                        Details
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-body)' }}>
              <h3>No workshops found matching your criteria.</h3>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '48px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={page === 0} 
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span style={{ padding: '10px 16px', fontWeight: '600' }}>Page {page + 1} of {totalPages}</span>
            <button 
              className="btn btn-secondary" 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllWorkshops;
