import type { RefObject } from 'react';
import { 
  Flame, 
  Zap, 
  Plane, 
  FileSpreadsheet, 
  FileText, 
  X, 
  FolderOpen,
  Trash2
} from 'lucide-react';
import type { Batch } from '../types';

interface IngestionTabProps {
  sourceType: 'SAP' | 'UTILITY' | 'TRAVEL';
  setSourceType: (type: 'SAP' | 'UTILITY' | 'TRAVEL') => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploading: boolean;
  uploadError: string | null;
  batches: Batch[];
  loadingBatches: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleUploadSubmit: (e: React.FormEvent) => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  onDeleteBatch: (batchId: string) => Promise<void>;
}

export default function IngestionTab({
  sourceType,
  setSourceType,
  selectedFile,
  setSelectedFile,
  uploading,
  uploadError,
  batches,
  loadingBatches,
  fileInputRef,
  handleUploadSubmit,
  handleFileChange,
  handleDragOver,
  handleDrop,
  onDeleteBatch,
}: IngestionTabProps) {
  return (
    <div className="ingestion-layout">
      <form onSubmit={handleUploadSubmit} className="upload-panel">
        <h3>Ingest New ESG Dataset</h3>
        
        <div className="source-selector" id="tour-source-selector">
          <div 
            className={`source-card ${sourceType === 'SAP' ? 'active' : ''}`}
            onClick={() => setSourceType('SAP')}
          >
            <div className="source-card-icon"><Flame size={24} style={{ color: 'var(--error)' }} /></div>
            <span className="source-card-name">SAP Fuel Ingestion</span>
            <span className="source-card-desc">Scope 1 · Diesel, Natural Gas, Petrol</span>
          </div>

          <div 
            className={`source-card ${sourceType === 'UTILITY' ? 'active' : ''}`}
            onClick={() => setSourceType('UTILITY')}
          >
            <div className="source-card-icon"><Zap size={24} style={{ color: 'var(--warning)' }} /></div>
            <span className="source-card-name">Utility Bills Ingestion</span>
            <span className="source-card-desc">Scope 2 · Electricity, Heating Grid</span>
          </div>

          <div 
            className={`source-card ${sourceType === 'TRAVEL' ? 'active' : ''}`}
            onClick={() => setSourceType('TRAVEL')}
          >
            <div className="source-card-icon"><Plane size={24} style={{ color: 'var(--primary)' }} /></div>
            <span className="source-card-name">Business Travel Ingestion</span>
            <span className="source-card-desc">Scope 3 · Flights, Hotels, Rail, Taxi</span>
          </div>
        </div>

        <div 
          className="dropzone"
          id="tour-dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
          />
          <div className="dropzone-icon"><FileSpreadsheet size={40} style={{ color: 'var(--primary)' }} /></div>
          <p className="dropzone-text">
            Drag and drop your spreadsheet here, or <span>browse files</span>
          </p>
          <p className="dropzone-subtext">Supports CSV, XLSX up to 25MB</p>
        </div>

        {selectedFile && (
          <div className="selected-file-banner">
            <div className="selected-file-info">
              <span><FileText size={16} /></span>
              <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button 
              type="button"
              onClick={() => setSelectedFile(null)}
              className="remove-file-btn"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="auth-error" style={{ margin: 0 }}>
            <span className="auth-error-icon">!</span>
            {uploadError}
          </div>
        )}

        <div className="upload-action-bar">
          <button 
            type="submit" 
            className="upload-submit-btn"
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Processing Data...' : 'Begin Ingestion'}
          </button>
        </div>
      </form>

      {/* Full Batches Table */}
      <div className="batch-history-panel" id="tour-batches-panel">
        <h3>Ingestion History & Status</h3>
        {loadingBatches && batches.length === 0 ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading ingestion history...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FolderOpen size={36} /></div>
            <div className="empty-state-title">No batches ingested</div>
            <p className="empty-state-desc">Ingest a file using the form above to see processing logs.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="esg-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Source Type</th>
                  <th>Status</th>
                  <th>Total Rows</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{batch.id}</td>
                    <td>
                      <span className="badge info">{batch.source_type}</span>
                    </td>
                    <td>
                      {batch.status === 'COMPLETED' && <span className="badge success">Completed</span>}
                      {batch.status === 'FAILED' && <span className="badge error">Failed</span>}
                      {batch.status === 'PROCESSING' && (
                        <span className="badge processing">
                          <span className="pulse-dot" /> Processing
                        </span>
                      )}
                    </td>
                    <td>{batch.total_rows} rows</td>
                    <td>{batch.uploaded_by_email}</td>
                    <td>{new Date(batch.created_at).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onDeleteBatch(batch.id)}
                        disabled={batch.status === 'PROCESSING'}
                        className="delete-batch-btn"
                        title="Delete this ingestion batch"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: batch.status === 'PROCESSING' ? 'var(--text-muted)' : 'var(--error)',
                          cursor: batch.status === 'PROCESSING' ? 'not-allowed' : 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

