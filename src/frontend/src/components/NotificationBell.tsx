import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, useUnreadCount, useMarkAsRead } from '../hooks/useNotifications';

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years ago";
  if (interval === 1) return interval + " year ago";
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months ago";
  if (interval === 1) return interval + " month ago";
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days ago";
  if (interval === 1) return interval + " day ago";
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours ago";
  if (interval === 1) return interval + " hour ago";
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes ago";
  if (interval === 1) return interval + " minute ago";
  
  return "just now";
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications(0, 5);
  const { mutate: markAsRead } = useMarkAsRead();

  const unreadCount = unreadData?.count || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: string, readAt: string | null) => {
    if (!readAt) {
      markAsRead(id);
    }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: 'var(--neutral-200)' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          background: 'var(--neutral-100)',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? 'var(--primary-color)' : 'var(--text-body)',
          cursor: 'pointer',
          transition: 'color 0.2s ease, box-shadow 0.2s ease',
          width: '40px',
          height: '40px',
          boxShadow: isOpen ? '0 0 0 2px var(--primary-color)' : 'none'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            display: 'flex',
            height: '18px',
            minWidth: '18px',
            padding: '0 4px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--danger-color)',
            color: 'white',
            fontSize: '10px',
            fontWeight: '700',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'absolute',
              right: 0,
              marginTop: '12px',
              width: '360px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--neutral-200)',
              zIndex: 100,
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--neutral-100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(to right, #ffffff, var(--bg-color))'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Notifications</h3>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  color: 'var(--primary-color)',
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 600
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral-400)' }}>
                  <div className="shimmer" style={{ height: '60px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}></div>
                  <div className="shimmer" style={{ height: '60px', borderRadius: 'var(--radius-sm)' }}></div>
                </div>
              ) : notificationsData?.content && notificationsData.content.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {notificationsData.content.map((notification) => (
                    <li 
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification.id, notification.readAt)}
                      style={{
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        borderBottom: '1px solid var(--neutral-100)',
                        backgroundColor: !notification.readAt ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                        display: 'flex',
                        gap: '12px',
                        position: 'relative'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = !notification.readAt ? 'rgba(79, 70, 229, 0.03)' : 'transparent'}
                    >
                      {!notification.readAt && (
                        <div style={{
                          position: 'absolute',
                          left: '6px',
                          top: '22px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-color)'
                        }} />
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: !notification.readAt ? 600 : 500,
                            color: 'var(--text-heading)' 
                          }}>
                            {notification.title}
                          </span>
                        </div>
                        <p style={{ 
                          fontSize: '13px', 
                          color: 'var(--text-body)', 
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {notification.body}
                        </p>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          marginTop: '8px',
                          fontSize: '11px',
                          color: 'var(--neutral-400)'
                        }}>
                          <Clock size={12} />
                          {timeAgo(notification.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <Bell size={40} style={{ color: 'var(--neutral-200)', marginBottom: '12px' }} />
                  <p style={{ color: 'var(--neutral-400)', fontSize: '14px', margin: 0 }}>
                    No notifications yet
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ 
              padding: '12px', 
              textAlign: 'center', 
              background: 'var(--bg-color)',
              borderTop: '1px solid var(--neutral-200)'
            }}>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 12px'
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

