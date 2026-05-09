import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const NetworkStatusToast: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [prevOnline, setPrevOnline] = useState(true);

  useEffect(() => {
    if (isOnline && !prevOnline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevOnline(isOnline);
  }, [isOnline, prevOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 24, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            fontWeight: '600',
            width: 'max-content',
            minWidth: '320px'
          }}
        >
          <WifiOff size={20} />
          <span>Mất kết nối! Chế độ Offline đã kích hoạt.</span>
        </motion.div>
      )}

      {isOnline && showOnlineToast && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 24, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            fontWeight: '600',
            width: 'max-content',
            minWidth: '320px'
          }}
        >
          <Wifi size={20} />
          <span>Đã có mạng! Đang tự động đồng bộ dữ liệu...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusToast;
