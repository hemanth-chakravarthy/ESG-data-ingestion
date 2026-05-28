import { 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FolderOpen,
  Sparkles
} from 'lucide-react';
import type { StatData, TabType } from '../types';

interface OverviewTabProps {
  stats: StatData | null;
  loadingStats: boolean;
  setActiveTab: (tab: TabType) => void;
}

export default function OverviewTab({
  stats,
  loadingStats,
  setActiveTab,
}: OverviewTabProps) {
  if (loadingStats && !stats) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading overview analytics...</p>
      </div>
    );
  }

  const {
    total_batches = 0,
    total_records = 0,
    pending_review = 0,
    approved = 0,
    rejected = 0,
    unresolved_flags = 0,
    recent_batches = [],
  } = stats || {};

  // Ratio Calculations for Simulated Chart
  const approvedPct = total_records > 0 ? (approved / total_records) * 100 : 0;
  const pendingPct = total_records > 0 ? (pending_review / total_records) * 100 : 0;
  const rejectedPct = total_records > 0 ? (rejected / total_records) * 100 : 0;

  // Helper formatting numbers
  const formatNum = (num: number) => {
    return Number(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  return (
    <div className="overview-tab">
      {unresolved_flags === 0 && pending_review > 0 && (
        <div className="workflow-alert-banner">
          <div className="workflow-alert-icon">
            <Sparkles size={20} />
          </div>
          <div className="workflow-alert-content">
            <h4>Ready for Compliance Approval</h4>
            <p>
              All anomaly flags have been resolved! You have <strong>{pending_review}</strong> record{pending_review > 1 ? 's' : ''} waiting to be finalized. Go to the <span className="banner-link" onClick={() => setActiveTab('review')}>Review Queue</span> to approve and lock them.
            </p>
          </div>
          <button className="banner-action-btn" onClick={() => setActiveTab('review')}>
            Go to Review Queue →
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" id="tour-kpi-grid">
        <div className="stat-card primary">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}><Upload size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{total_batches}</span>
            <span className="stat-label">Ingested Batches</span>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}><CheckCircle2 size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{approved}</span>
            <span className="stat-label">Approved Records</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}><Clock size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{pending_review}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>

        <div className="stat-card error">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}><AlertTriangle size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{unresolved_flags}</span>
            <span className="stat-label">Unresolved Flags</span>
          </div>
        </div>
      </div>

      {/* Charts Simulated Row */}
      <div className="overview-row">
        <div className="overview-card" id="tour-status-overview">
          <h3>Record Status Overview</h3>
          <div className="bar-chart-container">
            <div className="chart-bar-row">
              <div className="chart-bar-info">
                <span>Approved Records</span>
                <span>{formatNum(approvedPct)}% ({approved})</span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${approvedPct}%`, background: 'var(--success)' }} />
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-bar-info">
                <span>Pending Review</span>
                <span>{formatNum(pendingPct)}% ({pending_review})</span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${pendingPct}%`, background: 'var(--warning)' }} />
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-bar-info">
                <span>Rejected Records</span>
                <span>{formatNum(rejectedPct)}% ({rejected})</span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${rejectedPct}%`, background: 'var(--error)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="overview-card" id="tour-data-distribution" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Data Distribution</h3>
          <div className="chart-donut-indicator">
            <div className="chart-donut-circle">
              <div className="donut-label-container">
                <span className="donut-val">{total_records}</span>
                <span className="donut-lbl">Total Rows</span>
              </div>
            </div>
            
            <div className="donut-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ background: 'var(--success)' }} />
                <span>Valid Rows ({total_records - unresolved_flags})</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: 'var(--error)' }} />
                <span>Flagged Rows ({unresolved_flags})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Batches List */}
      <div className="batch-history-panel" id="tour-recent-uploads">
        <h3>Recent Data Uploads</h3>
        {recent_batches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FolderOpen size={36} /></div>
            <div className="empty-state-title">No batches uploaded yet</div>
            <p className="empty-state-desc">Head over to the Ingestion tab to import your ESG Excel or CSV files.</p>
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
                  <th>Ingested At</th>
                </tr>
              </thead>
              <tbody>
                {recent_batches.map(batch => (
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
