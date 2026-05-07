import React from 'react';
import { AlertTriangle, Clock, ShieldOff, AlertCircle } from 'lucide-react';

type ErrorType = 'RATE_LIMITED' | 'PAYMENT_UNAVAILABLE' | 'REQUEST_IN_PROGRESS' | 'IDEMPOTENCY_CONFLICT' | 'GENERIC';

interface ApiErrorNoticeProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

const ApiErrorNotice: React.FC<ApiErrorNoticeProps> = ({ error, onRetry, className }) => {
  if (!error) return null;

  const status = error?.response?.status;
  const data = error?.response?.data;
  const errorCode = data?.error;

  const getErrorInfo = (): { type: ErrorType; message: string; icon: React.ReactNode; retryAfter?: number } => {
    if (status === 429) {
      return {
        type: 'RATE_LIMITED',
        message: data?.message || 'Ban dang gui yeu cau qua nhanh. Vui long thu lai sau vai giay.',
        icon: <Clock size={24} />,
        retryAfter: data?.retryAfterSeconds || parseInt(error?.response?.headers?.['retry-after']) || 3,
      };
    }

    if (status === 503 && errorCode === 'PAYMENT_UNAVAILABLE') {
      return {
        type: 'PAYMENT_UNAVAILABLE',
        message: data?.message || 'Cong thanh toan dang tam thoi gian doan. Vui long thu lai sau it phut.',
        icon: <ShieldOff size={24} />,
        retryAfter: data?.retryAfterSeconds || 30,
      };
    }

    if (status === 409) {
      if (errorCode === 'REQUEST_IN_PROGRESS') {
        return {
          type: 'REQUEST_IN_PROGRESS',
          message: data?.message || 'Yeu cau truoc do van dang duoc xu ly.',
          icon: <AlertCircle size={24} />,
        };
      }
      if (errorCode === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST') {
        return {
          type: 'IDEMPOTENCY_CONFLICT',
          message: data?.message || 'Co loi xay ra voi yeu cau. Vui long thu lai.',
          icon: <AlertTriangle size={24} />,
        };
      }
    }

    return {
      type: 'GENERIC',
      message: data?.message || error?.message || 'Co loi xay ra. Vui long thu lai.',
      icon: <AlertTriangle size={24} />,
    };
  };

  const { type, message, icon, retryAfter } = getErrorInfo();

  const bgColor = (() => {
    switch (type) {
      case 'RATE_LIMITED': return '#FEF3C7';
      case 'PAYMENT_UNAVAILABLE': return '#FEE2E2';
      case 'REQUEST_IN_PROGRESS': return '#DBEAFE';
      default: return '#FEF3C7';
    }
  })();

  const textColor = (() => {
    switch (type) {
      case 'RATE_LIMITED': return '#92400E';
      case 'PAYMENT_UNAVAILABLE': return '#991B1B';
      case 'REQUEST_IN_PROGRESS': return '#1E40AF';
      default: return '#92400E';
    }
  })();

  return (
    <div
      className={className}
      style={{
        background: bgColor,
        color: textColor,
        padding: '16px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        fontSize: '14px',
        lineHeight: '1.5',
        border: `1px solid ${textColor}20`,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          {type === 'RATE_LIMITED' && 'Gioi han yeu cau'}
          {type === 'PAYMENT_UNAVAILABLE' && 'Cong thanh toan khong kha dung'}
          {type === 'REQUEST_IN_PROGRESS' && 'Dang xu ly'}
          {type === 'IDEMPOTENCY_CONFLICT' && 'Xung dot yeu cau'}
          {type === 'GENERIC' && 'Loi'}
        </div>
        <div>{message}</div>
        {retryAfter && (
          <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>
            Thu lai sau {retryAfter} giay
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '10px',
              background: 'none',
              border: `1px solid ${textColor}`,
              color: textColor,
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Thu lai
          </button>
        )}
      </div>
    </div>
  );
};

export default ApiErrorNotice;
