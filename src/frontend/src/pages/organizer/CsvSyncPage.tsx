import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import api from '../../api/axios';

interface CsvJob {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  startedAt: string;
  finishedAt: string | null;
}

interface CsvError {
  id: string;
  rowNumber: number;
  rawData: string;
  errorCode: string;
  errorMessage: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PROCESSING: { label: 'Processing', color: 'var(--warning-color)', icon: <Clock size={16} /> },
  COMPLETED: { label: 'Completed', color: 'var(--success-color)', icon: <CheckCircle size={16} /> },
  PARTIALLY_COMPLETED: { label: 'Partial', color: 'var(--warning-color)', icon: <AlertCircle size={16} /> },
  FAILED: { label: 'Failed', color: 'var(--danger-color)', icon: <XCircle size={16} /> },
};

const CsvSyncPage: React.FC = () => {
  const [jobs, setJobs] = useState<CsvJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobErrors, setJobErrors] = useState<Record<string, CsvError[]>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.get('/csv-sync/jobs');
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to fetch CSV jobs', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setActiveJobId(jobId);

    pollRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/csv-sync/jobs/${jobId}`);
        const job: CsvJob = response.data;

        // Update in jobs list
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));

        // Stop polling when terminal
        if (job.status === 'COMPLETED' || job.status === 'PARTIALLY_COMPLETED' || job.status === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setActiveJobId(null);
          setIsSyncing(false);
        }
      } catch (err) {
        console.error('Polling error', err);
        if (pollRef.current) clearInterval(pollRef.current);
        setActiveJobId(null);
        setIsSyncing(false);
      }
    }, 3000);
  };

  const handleSync = async () => {
    setError(null);
    setIsSyncing(true);

    try {
      const response = await api.post('/csv-sync/trigger');
      const { jobId } = response.data;
      if (jobId) {
        // Add placeholder job to list
        setJobs(prev => [{
          id: jobId,
          fileName: 'Manual Sync',
          status: 'PROCESSING',
          totalRows: 0,
          successRows: 0,
          failedRows: 0,
          startedAt: new Date().toISOString(),
          finishedAt: null,
        }, ...prev]);
        startPolling(jobId);
      } else {
        setError('Sync completed but no new files were found.');
        setIsSyncing(false);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('A sync is already in progress.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to trigger sync');
      }
      setIsSyncing(false);
    }
  };

  const toggleExpand = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      return;
    }

    setExpandedJob(jobId);

    if (!jobErrors[jobId]) {
      try {
        const response = await api.get(`/csv-sync/jobs/${jobId}/errors`);
        setJobErrors(prev => ({ ...prev, [jobId]: response.data }));
      } catch (err) {
        console.error('Failed to fetch errors', err);
      }
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>CSV Data Sync</h1>
          <p style={{ color: 'var(--text-body)' }}>
            Import student data from CSV files. Files are automatically synced nightly, or trigger a manual sync below.
          </p>
        </div>
        <button
          onClick={handleSync}
          className="btn btn-primary"
          disabled={isSyncing}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isSyncing ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={20} />
          )}
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Active sync indicator */}
      {activeJobId && (
        <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Loader2 size={20} style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>Sync in progress...</span>
          <span style={{ color: 'var(--text-body)', fontSize: '14px' }}>Polling for updates every 3s</span>
        </div>
      )}

      {/* Job history */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={20} />
          Sync History
        </h3>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--neutral-200)',
              borderTopColor: 'var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-body)' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
            <p>No sync jobs yet. Place CSV files in the sync directory and click "Sync Now".</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 2fr 40px',
              gap: '12px',
              padding: '12px 16px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-body)',
              textTransform: 'uppercase',
              borderBottom: '2px solid var(--neutral-200)',
            }}>
              <span>File</span>
              <span>Status</span>
              <span>Total</span>
              <span>Success</span>
              <span>Failed</span>
              <span>Started</span>
              <span>Finished</span>
              <span></span>
            </div>

            {/* Rows */}
            {jobs.map((job) => {
              const cfg = statusConfig[job.status] || { label: job.status, color: 'var(--text-body)', icon: null };
              const isExpanded = expandedJob === job.id;
              const errors = jobErrors[job.id] || [];

              return (
                <React.Fragment key={job.id}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr 2fr 40px',
                      gap: '12px',
                      padding: '14px 16px',
                      alignItems: 'center',
                      fontSize: '14px',
                      borderBottom: '1px solid var(--neutral-100)',
                      backgroundColor: activeJobId === job.id ? 'rgba(79, 70, 229, 0.04)' : 'transparent',
                      cursor: job.failedRows > 0 ? 'pointer' : 'default',
                    }}
                    onClick={() => job.failedRows > 0 && toggleExpand(job.id)}
                  >
                    <span style={{ fontWeight: '500', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.fileName}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: cfg.color,
                      fontWeight: '500',
                      fontSize: '13px',
                    }}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span style={{ color: 'var(--text-body)' }}>{job.totalRows ?? '—'}</span>
                    <span style={{ color: 'var(--success-color)', fontWeight: '500' }}>{job.successRows ?? '—'}</span>
                    <span style={{
                      color: (job.failedRows ?? 0) > 0 ? 'var(--danger-color)' : 'var(--text-body)',
                      fontWeight: (job.failedRows ?? 0) > 0 ? '600' : '400',
                    }}>
                      {job.failedRows ?? '—'}
                    </span>
                    <span style={{ color: 'var(--text-body)', fontSize: '13px' }}>{formatDate(job.startedAt)}</span>
                    <span style={{ color: 'var(--text-body)', fontSize: '13px' }}>{formatDate(job.finishedAt)}</span>
                    <span>
                      {(job.failedRows ?? 0) > 0 && (
                        isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </span>
                  </div>

                  {/* Expanded error details */}
                  {isExpanded && errors.length > 0 && (
                    <div style={{
                      gridColumn: '1 / -1',
                      padding: '16px 16px 16px 48px',
                      backgroundColor: 'var(--neutral-50)',
                      borderBottom: '1px solid var(--neutral-200)',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-heading)' }}>
                        Error Details ({errors.length} rows)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {errors.map((err) => (
                          <div key={err.id} style={{
                            padding: '10px 12px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid var(--neutral-200)',
                            fontSize: '13px',
                          }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--danger-color)', fontWeight: '600' }}>Row {err.rowNumber}</span>
                              <span style={{ color: 'var(--text-body)', fontWeight: '500' }}>{err.errorCode}</span>
                            </div>
                            <div style={{ color: 'var(--text-body)', marginBottom: '4px' }}>{err.errorMessage}</div>
                            {err.rawData && (
                              <code style={{
                                display: 'block',
                                padding: '6px 8px',
                                backgroundColor: 'var(--neutral-50)',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '700px',
                              }}>
                                {err.rawData}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CsvSyncPage;
