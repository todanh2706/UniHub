import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ShieldCheck, 
  Share2, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ArrowRight,
  Ticket
} from 'lucide-react';
import api, { clearScopedIdempotencyKey, getScopedIdempotencyKey } from '../../api/axios';
import ApiErrorNotice from '../../components/ApiErrorNotice';
import { useAuthStore } from '../../store/authStore';
import '../../styles/Skeleton.css';

interface WorkshopDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  capacity: number;
  activeSeats: number;
  remainingSeats: number;
  registrable: boolean;
  priceAmount: number;
  currency: string;
  roomId: string;
  roomName: string;
  eventId: string;
  eventName: string;
  thumbnail?: string;
}

interface Registration {
  id: string;
  workshopId: string;
  workshopTitle: string;
  status: string;
  qrToken: string;
  qrPayload: string;
  createdAt: string;
}

interface CreatedRegistration {
  id: string;
  status: string;
}

interface PaymentCheckout {
  checkoutUrl: string;
}

const WorkshopDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [registerCooldownMs, setRegisterCooldownMs] = useState<number | null>(null);

  // Fetch workshop details
  const { data: workshop, isLoading, isError } = useQuery<WorkshopDetail>({
    queryKey: ['workshop', id],
    queryFn: async () => {
      const response = await api.get(`/public/workshops/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  // Fetch AI summary using public endpoint
  const { data: aiSummary } = useQuery<AiSummaryResponse | null>({
    queryKey: ['workshop-summary', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/public/workshops/${id}/summary`);
        if (response.status === 204 || !response.data) return null;
        return response.data;
      } catch (err) {
        console.error('Failed to fetch AI summary', err);
        return null;
      }
    },
    enabled: !!id
  });

  // Fetch my registrations to check if already registered
  const { data: myRegistrations } = useQuery<Registration[]>({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const response = await api.get('/registrations/me');
      return response.data;
    },
    enabled: isAuthenticated && !!id
  });

  const isAlreadyRegistered = myRegistrations?.some(r => r.workshopId === id && r.status !== 'CANCELLED');

  type ApiError = {
    message?: string;
    response?: {
      status?: number;
      data?: {
        error?: string;
        message?: string;
        retryAfterSeconds?: number;
      };
      headers?: {
        'retry-after'?: string | number;
      };
    };
  };

  useEffect(() => {
    if (registerCooldownMs === null) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRegisterCooldownMs(null);
    }, registerCooldownMs);

    return () => window.clearTimeout(timeoutId);
  }, [registerCooldownMs]);

  const isRegisterCooldownActive = registerCooldownMs !== null;

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (): Promise<CreatedRegistration> => {
      const response = await api.post('/registrations', { workshopId: id });
      return response.data;
    },
    onSuccess: async (registration) => {
      setApiError(null);
      setRegisterCooldownMs(null);
      await queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      await queryClient.invalidateQueries({ queryKey: ['workshop', id] });

      if (registration.status === 'PENDING_PAYMENT') {
        const checkoutResponse = await api.post<PaymentCheckout>(`/registrations/${registration.id}/payment/checkout`, null, {
          headers: {
            'Idempotency-Key': getScopedIdempotencyKey(`payment-checkout:${registration.id}`),
          },
        });
        clearScopedIdempotencyKey(`payment-checkout:${registration.id}`);
        navigate(checkoutResponse.data.checkoutUrl);
        return;
      }

      navigate('/my-registrations');
    },
    onError: (err: ApiError) => {
      if (err.response?.status === 429) {
        const retryAfterHeader = Number(err.response.headers?.['retry-after']);
        const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader
          : (err.response.data?.retryAfterSeconds || 3);
        setRegisterCooldownMs(retryAfterSeconds * 1000);
      }

      setApiError(err);
    }
  });

  const handleRegister = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/workshops/${id}` } });
      return;
    }
    if (isRegisterCooldownActive) {
      return;
    }
    setApiError(null);
    registerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="shimmer" style={{ height: '32px', width: '200px', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          <div>
            <div className="shimmer" style={{ height: '400px', width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: '32px' }}></div>
            <div className="shimmer" style={{ height: '48px', width: '70%', marginBottom: '24px' }}></div>
            <div className="shimmer" style={{ height: '100px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>
          </div>
          <div className="shimmer" style={{ height: '400px', width: '100%', borderRadius: 'var(--radius-lg)' }}></div>
        </div>
      </div>
    );
  }

  if (isError || !workshop) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <AlertCircle size={64} color="var(--danger-color)" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Workshop Not Found</h1>
        <p style={{ color: 'var(--text-body)', marginBottom: '32px' }}>The workshop you are looking for does not exist or has been removed.</p>
        <Link to="/workshops" className="btn btn-primary">Back to Workshops</Link>
      </div>
    );
  }

  const startDate = new Date(workshop.startTime);
  const endDate = new Date(workshop.endTime);
  const isExpired = new Date() > new Date(workshop.registrationClosesAt);
  const isFull = workshop.remainingSeats <= 0;
  const isNotYetOpen = new Date() < new Date(workshop.registrationOpensAt);

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Breadcrumbs & Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link to="/workshops" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-body)', textDecoration: 'none', gap: '4px', fontWeight: '500' }}>
              <ChevronLeft size={16} /> Back to Workshops
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '48px', alignItems: 'start' }}>
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
          >
            {/* Header Image/Card */}
            <div style={{ 
              background: 'var(--surface-color)', 
              borderRadius: 'var(--radius-xl)', 
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--neutral-200)'
            }}>
              <div style={{ height: '450px', width: '100%', position: 'relative' }}>
                <img 
                  src={workshop.thumbnail || `https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&q=80&w=1200`} 
                  alt={workshop.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  left: '24px', 
                  display: 'flex', 
                  gap: '12px' 
                }}>
                  <span style={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(4px)',
                    color: 'var(--text-heading)', 
                    padding: '6px 16px', 
                    borderRadius: 'var(--radius-pill)', 
                    fontSize: '13px', 
                    fontWeight: '700',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {workshop.eventName}
                  </span>
                  {workshop.priceAmount === 0 && (
                    <span style={{ 
                      background: 'var(--success-color)', 
                      color: 'white', 
                      padding: '6px 16px', 
                      borderRadius: 'var(--radius-pill)', 
                      fontSize: '13px', 
                      fontWeight: '700',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      Free Entry
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ padding: '48px' }}>
                <h1 style={{ fontSize: '42px', fontWeight: '800', color: 'var(--text-heading)', marginBottom: '24px', lineHeight: '1.2' }}>
                  {workshop.title}
                </h1>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <Calendar className="icon" style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-body)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-heading)' }}>
                        {startDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <Clock className="icon" style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-body)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-heading)' }}>
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <MapPin className="icon" style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-body)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-heading)' }}>{workshop.roomName}</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '40px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-heading)', marginBottom: '20px' }}>About this Workshop</h3>
                  <div style={{ fontSize: '18px', color: 'var(--text-body)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {workshop.description}
                  </div>
                </div>

                {/* AI Summary Section */}
                {aiSummary && aiSummary.status === 'COMPLETED' && aiSummary.summaryText && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '32px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 10px 30px -15px rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    {/* Decorative glowing gradient blur */}
                    <div style={{
                      position: 'absolute',
                      top: '-50px',
                      right: '-50px',
                      width: '150px',
                      height: '150px',
                      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%)',
                      filter: 'blur(20px)',
                      pointerEvents: 'none'
                    }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)',
                        padding: '10px',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>AI Workshop Summary</h3>
                          <span style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>Smart AI</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-body)', opacity: 0.8 }}>Automatically generated from the workshop introductory document</p>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '16px',
                      color: 'var(--text-body)',
                      lineHeight: '1.75',
                      fontWeight: '500',
                      background: 'rgba(255, 255, 255, 0.4)',
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8)'
                    }}>
                      {aiSummary.summaryText}
                    </div>
                  </motion.div>
                )}

                <div style={{ marginTop: '40px', padding: '24px', background: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <ShieldCheck size={40} color="var(--primary-color)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-heading)' }}>Certified Workshop</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-body)' }}>Complete this workshop to earn a participation certificate from UniHub.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar / Registration */}
          <aside style={{ position: 'sticky', top: '112px' }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                background: 'var(--surface-color)', 
                padding: '40px', 
                borderRadius: 'var(--radius-xl)', 
                border: '1px solid var(--neutral-200)',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-body)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Registration Fee</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: '800', color: 'var(--text-heading)' }}>
                    {workshop.priceAmount === 0 ? 'FREE' : `${workshop.priceAmount}`}
                  </span>
                  {workshop.priceAmount > 0 && <span style={{ fontSize: '18px', color: 'var(--text-body)', fontWeight: '600' }}>{workshop.currency}</span>}
                </div>
              </div>

              {isAlreadyRegistered ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ 
                    padding: '24px', 
                    background: 'var(--success-light)', 
                    borderRadius: 'var(--radius-lg)', 
                    border: '1px solid var(--success-color)',
                    color: 'var(--success-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px'
                  }}>
                    <CheckCircle2 size={40} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '18px' }}>You are registered!</div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>Your ticket is confirmed. See you there!</div>
                    </div>
                  </div>
                  <Link to="/my-registrations" className="btn btn-primary" style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Ticket size={20} /> View My Ticket
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-body)' }}>Total Capacity</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-heading)' }}>{workshop.capacity}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-body)' }}>Available Seats</span>
                      <span style={{ fontWeight: '700', color: isFull ? 'var(--danger-color)' : 'var(--success-color)' }}>
                        {workshop.remainingSeats} left
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--neutral-200)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(workshop.activeSeats / workshop.capacity) * 100}%`, 
                        height: '100%', 
                        background: isFull ? 'var(--danger-color)' : 'var(--primary-color)',
                        transition: 'width 1s ease-out'
                      }}></div>
                    </div>
                  </div>

                  {apiError && (
                    <ApiErrorNotice
                      error={apiError}
                      className="workshop-registration-error"
                    />
                  )}

                  <button 
                    onClick={handleRegister}
                    disabled={registerMutation.isPending || isRegisterCooldownActive || isFull || isExpired || isNotYetOpen || (isAuthenticated && !user?.roles?.includes('STUDENT'))}
                    className={`btn btn-primary ${registerMutation.isPending ? 'loading' : ''}`}
                    style={{ 
                      width: '100%', 
                      padding: '18px', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    {registerMutation.isPending ? 'Processing...' : 
                     isFull ? 'Workshop Full' : 
                     isExpired ? 'Registration Closed' :
                     isNotYetOpen ? 'Registration Not Yet Open' :
                     'Secure My Spot'}
                    {!registerMutation.isPending && !isFull && !isExpired && !isNotYetOpen && <ArrowRight size={20} />}
                  </button>

                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-body)' }}>
                      <Info size={16} color="var(--primary-color)" />
                      <span>Registration closes on {new Date(workshop.registrationClosesAt).toLocaleDateString()}</span>
                    </div>
                    {!isAuthenticated && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-body)', padding: '12px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                        <Users size={16} color="var(--primary-color)" />
                        <span>Sign in as a student to register for this workshop</span>
                      </div>
                    )}
                    {isAuthenticated && !user?.roles?.includes('STUDENT') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--danger-color)', padding: '12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>
                        <AlertCircle size={16} />
                        <span>Only students can register for workshops.</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>

            {/* Additional Info Box */}
            <div style={{ 
              marginTop: '24px', 
              padding: '32px', 
              background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e40af 100%)', 
              borderRadius: 'var(--radius-xl)',
              color: 'white'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: '700' }}>Need help?</h4>
              <p style={{ margin: '0 0 20px', fontSize: '14px', opacity: 0.9 }}>If you have any questions about this workshop or the registration process, please contact the organizer.</p>
              <button style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Contact Organizer
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default WorkshopDetails;
