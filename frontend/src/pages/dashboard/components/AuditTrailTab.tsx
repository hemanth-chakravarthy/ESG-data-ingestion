import { 
  ClipboardList, 
  Upload, 
  CheckCircle2, 
  X, 
  Edit2, 
  Wrench
} from 'lucide-react';
import type { AuditLog } from '../types';

interface AuditTrailTabProps {
  auditLogs: AuditLog[];
  loadingAudits: boolean;
}

export default function AuditTrailTab({
  auditLogs,
  loadingAudits,
}: AuditTrailTabProps) {
  if (loadingAudits && auditLogs.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading audit timeline...</p>
      </div>
    );
  }

  return (
    <div className="audit-timeline-container" id="tour-audit-timeline">
      {auditLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardList size={36} /></div>
          <div className="empty-state-title">Timeline empty</div>
          <p className="empty-state-desc">Audit events will automatically populate as uploads, edits, and approvals are executed.</p>
        </div>
      ) : (
        <div className="timeline">
          {auditLogs.map(log => {
            const actorEmail = log.actor?.email || log.actor_email || 'System / Task';
            
            return (
              <div key={log.id} className="timeline-item">
                <div className={`timeline-marker ${log.action}`} />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-action-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {log.action === 'UPLOAD' && (
                        <>
                          <Upload size={16} />
                          Dataset Ingestion Uploaded
                        </>
                      )}
                      {log.action === 'APPROVE' && (
                        <>
                          <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                          Record Verification Approved
                        </>
                      )}
                      {log.action === 'REJECT' && (
                        <>
                          <X size={16} style={{ color: 'var(--error)' }} />
                          Record Rejected
                        </>
                      )}
                      {log.action === 'EDIT' && (
                        <>
                          <Edit2 size={16} style={{ color: 'var(--warning)' }} />
                          Record Inline Edit Saved
                        </>
                      )}
                      {log.action === 'RESOLVE_FLAG' && (
                        <>
                          <Wrench size={16} style={{ color: '#a78bfa' }} />
                          Review Flag Resolved
                        </>
                      )}
                    </span>
                    <span className="timeline-time">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  
                  <div className="timeline-actor">
                    Executed by: <span style={{ color: '#ffffff', fontWeight: 500 }}>{actorEmail}</span>
                  </div>

                  <div className="timeline-details">
                    {/* Upload Details */}
                    {log.action === 'UPLOAD' && log.details && (
                      <div>
                        <div className="timeline-detail-row">
                          <span className="timeline-detail-key">Source Ingested:</span>
                          <span>{log.details.source_type}</span>
                        </div>
                        <div className="timeline-detail-row">
                          <span className="timeline-detail-key">Total rows loaded:</span>
                          <span>{log.details.total_rows} rows</span>
                        </div>
                        <div className="timeline-detail-row">
                          <span className="timeline-detail-key">Validation Flags:</span>
                          <span>{log.details.flags_generated} anomalies found</span>
                        </div>
                      </div>
                    )}

                    {/* Edit Details */}
                    {log.action === 'EDIT' && log.details && (
                      <div className="audit-diff">
                        <span className="timeline-detail-key" style={{ marginBottom: '4px', display: 'block' }}>Changes Applied:</span>
                        {Object.keys(log.details.changes || {}).map(field => {
                          const prevVal = log.details.previous?.[field];
                          const newVal = log.details.changes?.[field];
                          
                          return (
                            <div key={field} className="diff-field">
                              <span className="diff-field-name">{field.replace('_', ' ')}:</span>
                              <span className="diff-value-old">{prevVal !== null && prevVal !== undefined ? String(prevVal) : 'none'}</span>
                              <span className="diff-arrow">→</span>
                              <span className="diff-value-new">{newVal !== null && newVal !== undefined ? String(newVal) : 'none'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Resolve Flag Details */}
                    {log.action === 'RESOLVE_FLAG' && log.details && (
                      <div>
                        <div className="timeline-detail-row">
                          <span className="timeline-detail-key">Resolved Flag Type:</span>
                          <span>{log.details.flag_type}</span>
                        </div>
                        <div className="timeline-detail-row">
                          <span className="timeline-detail-key">Severity Level:</span>
                          <span>{log.details.severity}</span>
                        </div>
                      </div>
                    )}

                    {/* Approve/Reject generic detail */}
                    {(log.action === 'APPROVE' || log.action === 'REJECT') && (
                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Record state changed and locked.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
