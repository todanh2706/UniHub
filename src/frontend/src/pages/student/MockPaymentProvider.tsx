import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { clearScopedIdempotencyKey, getScopedIdempotencyKey } from '../../api/axios';

interface MockProviderSession {
  registrationId: string;
  workshopTitle: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  checkoutToken: string;
}

interface MockProviderResult {
  registrationId: string;
  registrationStatus: string;
  paymentStatus: string;
  returnUrl: string;
}

const MockPaymentProvider = () => {
  const navigate = useNavigate();
  const { checkoutToken } = useParams<{ checkoutToken: string }>();

  const { data, isLoading, isError } = useQuery<MockProviderSession>({
    queryKey: ['mock-payment-provider', checkoutToken],
    queryFn: async () => {
      const response = await api.get(`/public/mock-payments/${checkoutToken}`);
      return response.data;
    },
    enabled: !!checkoutToken,
  });

  const outcomeMutation = useMutation<MockProviderResult, Error, 'SUCCESS' | 'FAIL' | 'TIMEOUT'>({
    mutationFn: async (outcome) => {
      const response = await api.post(`/public/mock-payments/${checkoutToken}/result`, { outcome }, {
        headers: {
          'Idempotency-Key': getScopedIdempotencyKey(`mock-provider:${checkoutToken}:${outcome}`),
        },
      });
      return response.data;
    },
    onSuccess: (result, outcome) => {
      clearScopedIdempotencyKey(`mock-provider:${checkoutToken}:${outcome}`);
      navigate(result.returnUrl || '/my-registrations');
    },
  });

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading mock payment provider...</div>;
  }

  if (isError || !data) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '12px' }}>Mock payment session unavailable</h1>
        <button className="btn btn-primary" onClick={() => navigate('/my-registrations')}>
          Back to My Registrations
        </button>
      </div>
    );
  }

  const isPending = outcomeMutation.isPending;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 24px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/my-registrations')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-body)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          <ArrowLeft size={16} /> Back to My Registrations
        </button>

        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.08em', marginBottom: '8px' }}>
              MOCK PAYMENT PROVIDER
            </div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#0F172A' }}>
              Complete payment for {data.workshopTitle}
            </h1>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div><strong>Amount:</strong> {data.amount} {data.currency}</div>
              <div><strong>Current status:</strong> {data.paymentStatus}</div>
              <div><strong>Registration ID:</strong> <span style={{ fontFamily: 'monospace' }}>{data.registrationId}</span></div>
            </div>
          </div>

          <p style={{ color: 'var(--text-body)', marginBottom: '20px', lineHeight: '1.6' }}>
            This is an internal demo-only payment page. Choose an outcome to simulate the external gateway redirect.
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => outcomeMutation.mutate('SUCCESS')}
              style={{
                background: '#16A34A',
                color: 'white',
                border: 'none',
                padding: '14px 18px',
                borderRadius: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} /> Simulate Success
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => outcomeMutation.mutate('FAIL')}
              style={{
                background: '#FFF7ED',
                color: '#C2410C',
                border: '1px solid #FDBA74',
                padding: '14px 18px',
                borderRadius: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <XCircle size={18} /> Simulate Failure
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => outcomeMutation.mutate('TIMEOUT')}
              style={{
                background: 'white',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                padding: '14px 18px',
                borderRadius: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Clock3 size={18} /> Simulate Timeout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockPaymentProvider;
