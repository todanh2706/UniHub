import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, RefreshCw, AlertCircle, CheckCircle, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../../api/axios';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  processingStatus: string;
  errorMessage?: string;
}

interface Summary {
  summaryId: string;
  documentId: string;
  model: string;
  status: string;
  summaryText?: string;
  errorMessage?: string;
  createdAt: string;
}

const statusBadge: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { label: 'Completed', color: 'var(--success-color)', icon: <CheckCircle size={16} /> },
  EXTRACTING: { label: 'Extracting...', color: 'var(--warning-color)', icon: <Clock size={16} /> },
  EXTRACTED: { label: 'Extracted', color: 'var(--warning-color)', icon: <CheckCircle size={16} /> },
  SUMMARIZING: { label: 'Summarizing...', color: 'var(--warning-color)', icon: <Loader2 size={16} /> },
  NO_TEXT: { label: 'No Text', color: 'var(--danger-color)', icon: <AlertCircle size={16} /> },
  EXTRACTION_FAILED: { label: 'Extraction Failed', color: 'var(--danger-color)', icon: <AlertCircle size={16} /> },
  SUMMARY_FAILED: { label: 'Summary Failed', color: 'var(--danger-color)', icon: <AlertCircle size={16} /> },
};

const AiSummaryPage: React.FC = () => {
  const { id: workshopId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [latestSummary, setLatestSummary] = useState<Summary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchData = useCallback(async () => {
    if (!workshopId) return;
    try {
      const [docRes, summaryRes] = await Promise.all([
        api.get(`/ai/workshops/${workshopId}/documents`),
        api.get(`/ai/workshops/${workshopId}/summary`),
      ]);
      setDocuments(docRes.data ?? []);
      setLatestSummary(summaryRes.data ?? null);
    } catch (err: any) {
      if (err.response?.status !== 204) {
        setError('Failed to load data');
      }
    }
  }, [workshopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (file: File) => {
    if (!workshopId) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/ai/workshops/${workshopId}/documents`, formData);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRegenerate = async (documentId: string) => {
    setRegenerating(true);
    setError(null);
    try {
      await api.post(`/ai/documents/${documentId}/summarize`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const isValidFileType = (file: File) => {
    const name = file.name.toLowerCase();
    return file.type.includes('pdf') || 
           file.type.includes('markdown') || 
           file.type.includes('text/plain') || 
           name.endsWith('.pdf') || 
           name.endsWith('.md') || 
           name.endsWith('.txt');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }
      if (!isValidFileType(file)) {
        setError('Only PDF, Markdown (.md), and plain text (.txt) files are accepted.');
        return;
      }
      handleUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!isValidFileType(file)) {
        setError('Only PDF, Markdown (.md), and plain text (.txt) files are accepted.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }
      handleUpload(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate('/organizer')}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-heading)' }}>AI Summary</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-body)', fontSize: '14px' }}>
            Upload PDF documents and generate AI-powered summaries
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="card"
        style={{
          padding: '40px',
          textAlign: 'center',
          border: `2px dashed ${dragOver ? 'var(--primary-color)' : 'var(--neutral-200)'}`,
          backgroundColor: dragOver ? 'rgba(79, 70, 229, 0.04)' : 'var(--surface-color)',
          transition: 'all 0.2s ease',
          marginBottom: '32px',
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('pdf-upload')?.click()}
      >
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={40} style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-body)', margin: 0 }}>Uploading and processing...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Upload size={40} style={{ color: 'var(--primary-color)' }} />
            <div>
              <p style={{ color: 'var(--text-heading)', fontWeight: '600', margin: 0 }}>
                Drop a PDF, Markdown, or text file here or click to upload
              </p>
              <p style={{ color: 'var(--text-body)', fontSize: '14px', margin: '4px 0 0' }}>
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Documents & Summary section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Documents list */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            Uploaded Documents
          </h3>

          {documents.length === 0 ? (
            <p style={{ color: 'var(--text-body)', fontSize: '14px' }}>No documents uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <FileText size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.fileName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-body)' }}>
                      {formatFileSize(doc.fileSize)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: statusBadge[doc.processingStatus]?.color ?? 'var(--text-body)',
                  }}>
                    {statusBadge[doc.processingStatus]?.icon}
                    <span>{statusBadge[doc.processingStatus]?.label ?? doc.processingStatus}</span>
                  </div>
                  {doc.processingStatus === 'COMPLETED' && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                      onClick={(e) => { e.stopPropagation(); handleRegenerate(doc.id); }}
                      disabled={regenerating}
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary display */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            AI Summary
          </h3>

          {regenerating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning-color)' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Regenerating summary...</span>
            </div>
          ) : latestSummary ? (
            <div>
              {latestSummary.status === 'COMPLETED' && latestSummary.summaryText ? (
                <div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: 'var(--text-body)',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '16px',
                  }}>
                    {latestSummary.summaryText}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--neutral-200)',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>Model: {latestSummary.model}</span>
                    <span>Generated: {new Date(latestSummary.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)' }}>
                  <AlertCircle size={16} />
                  <span>{latestSummary.errorMessage || 'Summary generation failed'}</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-body)', fontSize: '14px' }}>
              {documents.length > 0
                ? 'Processing... Summary will appear here once generated.'
                : 'Upload a PDF document to generate an AI summary.'}
            </p>
          )}
        </div>
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

export default AiSummaryPage;
