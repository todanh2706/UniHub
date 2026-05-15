import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  X,
  AlertCircle,
  CheckCircle2,
  Timer,
  Download,
  Trash2,
  Ticket,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/Skeleton.css';

interface Registration {
  id: string;
  workshopId: string;
  workshopTitle: string;
  status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED' | 'CHECKED_IN';
  qrToken: string;
  qrPayload: string;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  workshopStartTime: string;
  workshopEndTime: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CONFIRMED: {
    label: 'Confirmed',
    color: '#059669',
    bg: '#ECFDF5',
    icon: <CheckCircle2 size={14} />,
  },
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: <Timer size={14} />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: <AlertCircle size={14} />,
  },
  CHECKED_IN: {
    label: 'Checked In',
    color: 'var(--primary-color)',
    bg: 'rgba(79, 70, 229, 0.1)',
    icon: <UserCheck size={14} />,
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${s.toLocaleTimeString('en-US', opts)} - ${e.toLocaleTimeString('en-US', opts)}`;
}

function isActive(status: string) {
  return status === 'CONFIRMED' || status === 'PENDING_PAYMENT' || status === 'CHECKED_IN';
}

const MyRegistrations = () => {
  const queryClient = useQueryClient();
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const {
    data: registrations,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Registration[]>({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const res = await api.get('/registrations/me');
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      await api.delete(`/registrations/${registrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setCancelConfirmId(null);
      setSelectedReg((prev) => (prev ? { ...prev, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : null));
    },
  });

  const handleCancel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCancelConfirmId(id);
  };

  const confirmCancel = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    cancelMutation.mutate(id);
  };

  const dismissCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelConfirmId(null);
  };

  const activeCount = registrations?.filter((r) => isActive(r.status)).length ?? 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Ticket size={28} color="var(--primary-color)" />
          My Registrations
        </h1>
        <p style={{ color: 'var(--text-body)' }}>
          {isLoading
            ? 'Loading your registrations...'
            : registrations && registrations.length > 0
              ? `You have ${activeCount} active registration${activeCount !== 1 ? 's' : ''} out of ${registrations.length} total.`
              : 'You have not registered for any workshops yet.'}
        </p>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface-color)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--neutral-200)',
                padding: '28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="skeleton" style={{ height: '24px', width: '60%' }}></div>
                <div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: 'var(--radius-pill)' }}></div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div className="skeleton" style={{ height: '16px', width: '200px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '150px' }}></div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <div className="skeleton" style={{ height: '40px', width: '120px', borderRadius: 'var(--radius-md)' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-200)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <AlertCircle size={40} color="#DC2626" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>Failed to Load</h2>
          <p style={{ color: 'var(--text-body)', marginBottom: '24px' }}>
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not fetch your registrations. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
            style={{ padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={18} /> Retry
          </button>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && registrations && registrations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-200)',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--neutral-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Ticket size={48} color="var(--neutral-400)" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>No Registrations Yet</h2>
          <p style={{ color: 'var(--text-body)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
            You haven't registered for any workshops. Browse upcoming workshops and secure your spot!
          </p>
          <Link to="/">
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
              Browse Workshops
            </button>
          </Link>
        </motion.div>
      )}

      {/* Registration List */}
      {!isLoading && !isError && registrations && registrations.length > 0 && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {registrations.map((reg, index) => {
            const config = STATUS_CONFIG[reg.status];
            const active = isActive(reg.status);
            const isCancelling = cancelMutation.isPending && cancelConfirmId === reg.id;

            return (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                onClick={() => setSelectedReg(reg)}
                style={{
                  background: 'var(--surface-color)',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${active ? 'var(--neutral-200)' : 'var(--neutral-200)'}`,
                  padding: '24px 28px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: reg.status === 'CANCELLED' ? 0.7 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                whileHover={
                  active
                    ? {
                        borderColor: 'var(--primary-color)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)',
                        y: -2,
                      }
                    : {}
                }
              >
                {/* Active indicator bar */}
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: reg.status === 'CONFIRMED' ? 'var(--success-color)' : 'var(--warning-color)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: 'var(--text-heading)',
                        marginBottom: '6px',
                      }}
                    >
                      {reg.workshopTitle}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: config.bg,
                          color: config.color,
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        {config.icon} {config.label}
                      </span>
                      {reg.status === 'PENDING_PAYMENT' && (
                        <span style={{ fontSize: '13px', color: 'var(--warning-color)', fontWeight: '500' }}>
                          Payment expires soon
                        </span>
                      )}
                    </div>
                  </div>

                  {active && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {cancelConfirmId === reg.id ? (
                        <div
                          style={{ display: 'flex', gap: '8px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => confirmCancel(e, reg.id)}
                            disabled={isCancelling}
                            className="btn"
                            style={{
                              background: 'var(--danger-color)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              fontSize: '13px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {isCancelling ? (
                              <>
                                <div
                                  className="spinner-sm"
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                  }}
                                ></div>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} /> Confirm
                              </>
                            )}
                          </button>
                          <button
                            onClick={dismissCancel}
                            className="btn"
                            style={{
                              background: 'var(--neutral-100)',
                              color: 'var(--text-body)',
                              border: 'none',
                              padding: '6px 14px',
                              fontSize: '13px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                            }}
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleCancel(e, reg.id)}
                          className="btn"
                          style={{
                            background: 'transparent',
                            color: 'var(--text-body)',
                            border: '1px solid var(--neutral-300)',
                            padding: '6px 14px',
                            fontSize: '13px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#FEF2F2';
                            e.currentTarget.style.color = '#DC2626';
                            e.currentTarget.style.borderColor = '#FECACA';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-body)';
                            e.currentTarget.style.borderColor = 'var(--neutral-300)';
                          }}
                        >
                          <Trash2 size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                    color: 'var(--text-body)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="var(--primary-color)" />
                    {formatDate(reg.workshopStartTime)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--primary-color)" />
                    {formatTimeRange(reg.workshopStartTime, reg.workshopEndTime)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--primary-color)',
                      fontWeight: '500',
                      marginLeft: 'auto',
                    }}
                  >
                    View Details <ExternalLink size={14} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Slide-Over Panel */}
      <AnimatePresence>
        {selectedReg && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedReg(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 100,
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '480px',
                maxWidth: '100vw',
                background: 'var(--surface-color)',
                borderLeft: '1px solid var(--neutral-200)',
                boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
                zIndex: 101,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 28px',
                  borderBottom: '1px solid var(--neutral-200)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedReg(null)}
                    style={{
                      background: 'var(--neutral-100)',
                      border: 'none',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-body)',
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Registration Details</h2>
                </div>
                <button
                  onClick={() => setSelectedReg(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--neutral-400)',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Panel Body */}
              <div style={{ padding: '28px', flex: 1 }}>
                {/* Status Badge + Title */}
                <div style={{ marginBottom: '24px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: STATUS_CONFIG[selectedReg.status].bg,
                      color: STATUS_CONFIG[selectedReg.status].color,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '12px',
                    }}
                  >
                    {STATUS_CONFIG[selectedReg.status].icon} {STATUS_CONFIG[selectedReg.status].label}
                  </span>
                  <h3 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-heading)' }}>
                    {selectedReg.workshopTitle}
                  </h3>
                </div>

                {/* Info Card */}
                <div
                  style={{
                    background: 'var(--neutral-100)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={18} color="var(--primary-color)" />
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>Date</div>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{formatDate(selectedReg.workshopStartTime)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={18} color="var(--primary-color)" />
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>Time</div>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>
                        {formatTimeRange(selectedReg.workshopStartTime, selectedReg.workshopEndTime)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Ticket size={18} color="var(--primary-color)" />
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>Registration ID</div>
                      <div
                        style={{
                          fontWeight: '500',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          color: 'var(--text-body)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {selectedReg.id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Timeline</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <TimelineItem
                      icon={<Ticket size={16} />}
                      label="Registered"
                      time={selectedReg.createdAt}
                      active={true}
                    />
                    <TimelineItem
                      icon={<CheckCircle2 size={16} />}
                      label="Confirmed"
                      time={selectedReg.confirmedAt}
                      active={selectedReg.status === 'CONFIRMED'}
                    />
                    <TimelineItem
                      icon={<AlertCircle size={16} />}
                      label="Cancelled"
                      time={selectedReg.cancelledAt}
                      active={selectedReg.status === 'CANCELLED'}
                      muted={selectedReg.status !== 'CANCELLED'}
                    />
                  </div>
                </div>

                {/* QR Code Card */}
                {selectedReg.status === 'CONFIRMED' && (
                  <div
                    style={{
                      background: 'white',
                      border: '2px dashed var(--primary-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      textAlign: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <img
                      src={`${api.defaults.baseURL}/public/registrations/qr/${selectedReg.qrToken}`}
                      alt={`QR code for ${selectedReg.workshopTitle}`}
                      style={{
                        width: '180px',
                        height: '180px',
                        margin: '0 auto 16px',
                        borderRadius: 'var(--radius-md)',
                        display: 'block',
                      }}
                    />
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      Show this QR at check-in
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-body)', marginBottom: '16px' }}>
                      Present this code at the venue to check in
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const response = await api.get(`/public/registrations/qr/${selectedReg.qrToken}`, {
                            responseType: 'blob'
                          });
                          const url = URL.createObjectURL(response.data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `qr-${selectedReg.workshopTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error('Failed to download QR code:', err);
                        }
                      }}
                      className="btn"
                      style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        fontSize: '14px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Download size={16} /> Download QR
                    </button>
                  </div>
                )}

                {/* Cancel Action in Panel */}
                {isActive(selectedReg.status) && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      border: '1px solid #FECACA',
                    }}
                  >
                    <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#991B1B', marginBottom: '8px' }}>
                      Cancel Registration
                    </h4>
                    <p style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '16px', lineHeight: '1.5' }}>
                      Cancelling will free your seat for other students. This action cannot be undone.
                    </p>
                    {cancelConfirmId === selectedReg.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => confirmCancel(e, selectedReg.id)}
                          disabled={cancelMutation.isPending}
                          className="btn"
                          style={{
                            background: 'var(--danger-color)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 18px',
                            fontSize: '14px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={dismissCancel}
                          className="btn"
                          style={{
                            background: 'white',
                            color: 'var(--text-body)',
                            border: '1px solid var(--neutral-300)',
                            padding: '8px 18px',
                            fontSize: '14px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                          }}
                        >
                          Keep Registration
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelConfirmId(selectedReg.id);
                        }}
                        className="btn"
                        style={{
                          background: 'var(--danger-color)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 18px',
                          fontSize: '14px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={14} /> Cancel Registration
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spinner keyframes */}
      <style>{`
        .spinner-sm {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/* Timeline Item Sub-Component */
interface TimelineItemProps {
  icon: React.ReactNode;
  label: string;
  time: string | null;
  active: boolean;
  muted?: boolean;
}

const TimelineItem = ({ icon, label, time, active, muted }: TimelineItemProps) => {
  const isCompleted = !!time;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        opacity: muted && !isCompleted ? 0.4 : 1,
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: active && isCompleted ? '#ECFDF5' : 'var(--neutral-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active && isCompleted ? '#059669' : 'var(--neutral-400)',
          flexShrink: 0,
          border: `2px solid ${active && isCompleted ? '#A7F3D0' : 'var(--neutral-200)'}`,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-heading)' }}>{label}</div>
        {isCompleted ? (
          <div style={{ fontSize: '13px', color: 'var(--text-body)' }}>
            {new Date(time).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: active ? 'var(--warning-color)' : 'var(--neutral-400)' }}>
            {active ? 'Waiting...' : 'Not yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRegistrations;
