import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, CheckCircle, User, Calendar, ChevronRight, Filter,
  RefreshCw, QrCode, Database, ArrowLeft, Camera, X, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/axios';
import { saveCheckin, getPendingCount, getPendingCheckins, markAsSynced } from '../../api/offlineDb';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface Workshop {
  id: string;
  title: string;
  startTime: string;
  roomName: string;
}

interface Attendee {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const CheckinPortal: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localCheckedInIds, setLocalCheckedInIds] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [pendingCount, setPendingCount] = useState(0);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try { setPendingCount(await getPendingCount()); } catch { /* ignore */ }
  }, []);

  const fetchWorkshops = useCallback(async () => {
    try {
      const res = await api.get('/organizer/workshops');
      setWorkshops(res.data);
    } catch { console.error('Failed to fetch workshops'); }
  }, []);

  const fetchAttendees = useCallback(async (workshopId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/organizer/workshops/${workshopId}/registrations`, { params: { size: 100 } });
      setAttendees(res.data.content || []);
    } catch { console.error('Failed to fetch attendees'); }
    finally { setIsLoading(false); }
  }, []);

  const syncPendingCheckins = useCallback(async () => {
    if (!isOnline) return 0;

    try {
      const pending = await getPendingCheckins();
      if (pending.length === 0) return 0;

      const items = pending.map(p => ({
        qrToken: p.qr_token,
        clientEventId: p.client_event_id,
        checkedInAt: p.checked_in_at
      }));

      const response = await api.post('/checkins/sync', { items });
      const { synced, errors } = response.data;

      let successCount = 0;
      if (synced && synced.length > 0) {
        successCount = synced.length;
        const syncedEventIds = synced.map((s: any) => s.clientEventId);
        await markAsSynced(syncedEventIds);
      }

      if (errors && errors.length > 0) {
        const firstError = errors[0];
        console.error('Sync partial failure:', errors);
        showToast(`Lỗi đồng bộ: ${firstError.message}`, 'error');
      }

      await refreshPendingCount();

      if (selectedWorkshop && successCount > 0) {
        fetchAttendees(selectedWorkshop.id);
      }
      return successCount;
    } catch (err) {
      console.error('Failed to sync pending checkins:', err);
      showToast('Lỗi kết nối server khi đồng bộ.', 'error');
      return 0;
    }
  }, [isOnline, refreshPendingCount, selectedWorkshop, showToast, fetchAttendees]);

  // --- Effects ---
  useEffect(() => {
    fetchWorkshops();
    refreshPendingCount();
  }, [fetchWorkshops, refreshPendingCount]);

  useEffect(() => {
    if (selectedWorkshop) fetchAttendees(selectedWorkshop.id);
  }, [selectedWorkshop, fetchAttendees]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPendingCheckins();
    }
  }, [isOnline, syncPendingCheckins]);



  const handleQrScanned = useCallback(async (qrToken: string) => {
    const clientEventId = generateUUID();
    const checkedInAt = new Date().toISOString();

    try {
      await saveCheckin(qrToken, clientEventId, checkedInAt);
      await refreshPendingCount();

      let syncedSuccessfully = false;
      if (isOnline) {
        const count = await syncPendingCheckins();
        syncedSuccessfully = (count ?? 0) > 0;
      }

      if (syncedSuccessfully) {
        showToast('✅ Check-in thành công!', 'success');
      } else if (!isOnline) {
        showToast('📱 Đã lưu offline! Sẽ đồng bộ khi có mạng.', 'info');
      } else {
        // Online but sync count was 0 (meaning error or already synced)
        // syncPendingCheckins already shows specific error toast
      }
    } catch (err) {
      console.error('QR handle error:', err);
      showToast('Lỗi xử lý mã QR.', 'error');
    }
  }, [isOnline, refreshPendingCount, syncPendingCheckins, showToast]);

  const startScanner = useCallback(async () => {
    setShowScanner(true);
    setScannerReady(false);

    // Wait for DOM to render the container
    await new Promise(r => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      // Try to get available cameras (fixes issues on Macbooks/Laptops without back camera)
      const devices = await Html5Qrcode.getCameras();
      let cameraConfig: any = { facingMode: 'environment' };

      if (devices && devices.length > 0) {
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        cameraConfig = backCamera ? backCamera.id : devices[0].id;
      }

      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText) => {
          // Pause scanning briefly to avoid duplicate scans
          try { await scanner.pause(true); } catch { /* ignore */ }
          await handleQrScanned(decodedText);
          // Resume scanning after a short delay
          setTimeout(() => {
            try { scanner.resume(); } catch { /* scanner may have been stopped */ }
          }, 2000);
        },
        () => { /* QR scan error - ignore, scanner keeps trying */ }
      );
      setScannerReady(true);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      showToast('Không thể mở camera. Kiểm tra quyền truy cập.', 'error');
      setShowScanner(false);
    }
  }, [handleQrScanned, showToast]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await scannerRef.current.stop();
        }
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScannerReady(false);
  }, []);

  const handleManualCheckin = async (registrationId: string) => {
    const clientEventId = generateUUID();
    const checkedInAt = new Date().toISOString();

    if (isOnline) {
      try {
        await api.post('/checkins/sync', {
          items: [{ qrToken: registrationId, clientEventId, checkedInAt }]
        });
        setAttendees(prev => prev.map(a =>
          a.id === registrationId ? { ...a, status: 'CHECKED_IN' } : a
        ));
        showToast('✅ Check-in thành công!', 'success');
        return;
      } catch { console.warn('Online sync failed, falling back to offline'); }
    }

    try {
      await saveCheckin(registrationId, clientEventId, checkedInAt);
      setLocalCheckedInIds(prev => new Set(prev).add(registrationId));
      setAttendees(prev => prev.map(a =>
        a.id === registrationId ? { ...a, status: 'CHECKED_IN' } : a
      ));
      await refreshPendingCount();
      showToast('📱 Đã lưu offline! Sẽ đồng bộ khi có mạng.', 'info');
    } catch { showToast('Lỗi khi lưu dữ liệu.', 'error'); }
  };

  const filteredAttendees = attendees.filter(a =>
    a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Toast Component ---
  const ToastNotification = () => (
    <AnimatePresence>
      {toast.show && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 24, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10001, padding: '14px 28px', borderRadius: '14px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)', fontWeight: 600,
            width: 'max-content', maxWidth: '90vw', fontSize: '15px',
            color: 'white',
            backgroundColor: toast.type === 'success' ? '#10b981'
              : toast.type === 'error' ? '#ef4444' : '#6366f1',
          }}
        >
          {toast.type === 'success' && <CheckCircle size={20} />}
          <span>{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // --- QR Scanner Modal ---
  const scannerModalNode = (
    <AnimatePresence>
      {showScanner && (
        <motion.div
          key="scanner-modal"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'relative',
              width: '100%', maxWidth: '420px',
              backgroundColor: 'white',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--neutral-100, #f1f5f9)',
              backgroundColor: 'white', zIndex: 10
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-heading, #1e293b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} color="var(--primary-color, #6366f1)" />
                Quét mã QR Check-in
              </h2>
              <button onClick={stopScanner} style={{
                background: 'var(--neutral-100, #f1f5f9)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-body, #64748b)',
                transition: 'all 0.2s ease'
              }} onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'rotate(90deg)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--neutral-100, #f1f5f9)'; e.currentTarget.style.color = 'var(--text-body, #64748b)'; e.currentTarget.style.transform = 'none'; }}>
                <X size={20} />
              </button>
            </div>

            {/* Camera Area */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', backgroundColor: '#000' }}>
              {!scannerReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 500, zIndex: 1 }}>
                  <RefreshCw size={20} className="animate-spin" style={{ marginRight: '8px' }} />
                  Đang khởi động Camera...
                </div>
              )}
              <div id={scannerContainerId} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }} />
            </div>

            {/* Footer Status */}
            <div style={{ padding: '16px 20px', backgroundColor: 'var(--neutral-50, #f8fafc)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                backgroundColor: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                color: isOnline ? 'var(--success-color, #10b981)' : 'var(--warning-color, #f59e0b)',
              }}>
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                {isOnline ? 'Online — Tự động đồng bộ' : 'Offline — Đang lưu tạm trên máy'}
              </div>

              {pendingCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '12px', color: 'var(--text-body, #64748b)', fontWeight: 500
                }}>
                  <Database size={14} />
                  {pendingCount} bản ghi chờ đồng bộ lên hệ thống
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // --- Main Render ---
  return (
    <div className="checkin-portal-wrapper" style={{ maxWidth: selectedWorkshop ? '1200px' : '900px', margin: '0 auto' }}>
      <ToastNotification />
      {scannerModalNode}

      {!selectedWorkshop ? (
        /* --- Workshop Selection Screen --- */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontSize: '32px', color: 'var(--text-heading)', marginBottom: '12px' }}>Check-in Portal</h1>
            <p style={{ color: 'var(--text-body)', fontSize: '18px' }}>Select an active workshop to begin the attendance process</p>
          </div>

          {/* Quick QR Scan Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={startScanner}
            style={{
              marginBottom: '32px', padding: '20px', borderRadius: '16px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
              color: 'white', fontWeight: 700, fontSize: '17px',
              boxShadow: '0 8px 30px rgba(99,102,241,0.3)',
            }}>
            <QrCode size={26} />
            Quét QR Check-in nhanh
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.25)', padding: '4px 12px',
                borderRadius: '20px', fontSize: '13px',
              }}>{pendingCount} chờ sync</span>
            )}
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
            {workshops.map(w => (
              <motion.div key={w.id}
                whileHover={{ y: -5, boxShadow: 'var(--shadow-md)' }} whileTap={{ scale: 0.98 }}
                className="glass-panel"
                style={{
                  padding: '24px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-color)'
                }}
                onClick={() => setSelectedWorkshop(w)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '56px', height: '56px', backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    borderRadius: '14px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--primary-color)'
                  }}><Calendar size={28} /></div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-heading)' }}>{w.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-body)', fontSize: '14px' }}>
                      <span>{w.roomName || 'Room TBD'}</span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span>{new Date(w.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={24} color="var(--neutral-300)" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* --- Attendee List Screen --- */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
            <div>
              <button onClick={() => setSelectedWorkshop(null)} className="btn"
                style={{ background: 'none', color: 'var(--primary-color)', padding: 0, marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Back to Workshops
              </button>
              <h1 style={{ fontSize: '28px', color: 'var(--text-heading)' }}>{selectedWorkshop.title}</h1>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={startScanner} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                <QrCode size={18} />
                <span>Scan QR</span>
              </button>
              <button className="btn btn-secondary" style={{ backgroundColor: 'white', border: '1px solid var(--neutral-200)', color: 'var(--text-heading)' }}
                onClick={() => fetchAttendees(selectedWorkshop.id)}>
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'var(--surface-color)', border: '1px solid var(--neutral-200)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', gap: '16px', background: 'rgba(248, 250, 252, 0.5)' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                <input type="text" placeholder="Search by student name or email..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 14px 14px 44px', borderRadius: '10px',
                    border: '1px solid var(--neutral-200)', fontSize: '15px', outline: 'none',
                    transition: 'border-color 0.2s', fontFamily: 'var(--font-sans)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--neutral-200)'}
                />
              </div>
              <button className="btn" style={{ background: 'white', border: '1px solid var(--neutral-200)', padding: '0 16px' }}>
                <Filter size={18} color="var(--text-body)" />
              </button>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--neutral-100)', zIndex: 10 }}>
                  <tr>
                    <th style={thStyle}>STUDENT DETAILS</th>
                    <th style={thStyle}>REGISTRATION STATUS</th>
                    <th style={thStyle}>ATTENDANCE ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredAttendees.map((a, index) => (
                      <motion.tr key={a.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        style={{ borderBottom: '1px solid var(--neutral-100)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '12px',
                              backgroundColor: 'var(--neutral-200)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)'
                            }}><User size={20} /></div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-heading)' }}>{a.studentName}</div>
                              <div style={{ fontSize: '13px', color: 'var(--text-body)' }}>{a.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '12px', fontWeight: '700', padding: '6px 12px',
                            borderRadius: 'var(--radius-pill)', textTransform: 'uppercase', letterSpacing: '0.5px',
                            backgroundColor: a.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: a.status === 'CONFIRMED' ? 'var(--success-color)' : 'var(--warning-color)',
                          }}>{a.status}</span>
                        </td>
                        <td style={tdStyle}>
                          {a.status === 'CHECKED_IN' || localCheckedInIds.has(a.id) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', fontWeight: '600', fontSize: '14px' }}>
                              <CheckCircle size={20} />
                              <span>Check-in Successful</span>
                              {localCheckedInIds.has(a.id) && (
                                <span title="Stored in local SQLite" style={{
                                  color: 'var(--warning-color)', display: 'flex', alignItems: 'center',
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px',
                                  borderRadius: '6px', fontSize: '11px'
                                }}>
                                  <Database size={12} style={{ marginRight: '4px' }} /> OFFLINE
                                </span>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => handleManualCheckin(a.id)} className="btn btn-primary"
                              style={{ padding: '8px 20px', fontSize: '14px' }}>
                              Confirm Presence
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredAttendees.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '80px' }}>
                        <div style={{ color: 'var(--neutral-400)', marginBottom: '16px' }}>
                          <Search size={48} strokeWidth={1} style={{ margin: '0 auto' }} />
                        </div>
                        <p style={{ color: 'var(--text-body)', fontSize: '16px' }}>No students found matching your search criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '700',
  color: 'var(--secondary-color)', borderBottom: '1px solid var(--neutral-200)', letterSpacing: '1px'
};

const tdStyle: React.CSSProperties = { padding: '18px 24px' };

export default CheckinPortal;

