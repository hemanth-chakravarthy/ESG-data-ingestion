import type { Dispatch, SetStateAction } from 'react';
import { 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles
} from 'lucide-react';
import type { NormalizedRecord, ReviewFlag } from '../types';
import api from '../../../lib/api';

interface ReviewQueueTabProps {
  records: NormalizedRecord[];
  loadingRecords: boolean;
  filters: { status: string; scope: string; hasFlags: boolean };
  setFilters: Dispatch<SetStateAction<{ status: string; scope: string; hasFlags: boolean }>>;
  selectedRecordIds: string[];
  editingRecordId: string | null;
  setEditingRecordId: (id: string | null) => void;
  editForm: {
    date: string;
    activity_type: string;
    consumption_value: number;
    unit: string;
    scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  } | null;
  setEditForm: Dispatch<SetStateAction<{
    date: string;
    activity_type: string;
    consumption_value: number;
    unit: string;
    scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  } | null>>;
  setSelectedFlag: (flag: { flag: ReviewFlag; recordId: string } | null) => void;
  saveEdit: (id: string) => Promise<void>;
  startEditing: (record: NormalizedRecord) => void;
  handleBulkApprove: () => Promise<void>;
  handleBulkReject: () => Promise<void>;
  handleSelectAll: (checked: boolean) => void;
  handleSelectRecord: (id: string, checked: boolean) => void;
  fetchRecords: () => void;
  fetchStats: () => void;
}

export default function ReviewQueueTab({
  records,
  loadingRecords,
  filters,
  setFilters,
  selectedRecordIds,
  editingRecordId,
  setEditingRecordId,
  editForm,
  setEditForm,
  setSelectedFlag,
  saveEdit,
  startEditing,
  handleBulkApprove,
  handleBulkReject,
  handleSelectAll,
  handleSelectRecord,
  fetchRecords,
  fetchStats,
}: ReviewQueueTabProps) {
  const isSelected = (id: string) => selectedRecordIds.includes(id);

  // Helper mapping Scope Names
  const formatScopeName = (scope: string) => {
    if (scope === 'SCOPE_1') return 'Scope 1 (Direct)';
    if (scope === 'SCOPE_2') return 'Scope 2 (Indirect)';
    if (scope === 'SCOPE_3') return 'Scope 3 (Supply Chain)';
    return scope;
  };

  // Helper formatting numbers
  const formatNum = (num: number) => {
    return Number(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  return (
    <div className="review-queue-layout">
      {/* Filters Panel */}
      <div className="filters-bar" id="tour-filters-bar">
        <div className="filter-group">
          <label>Review Status:</label>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Emission Scope:</label>
          <select 
            value={filters.scope}
            onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
            className="filter-select"
          >
            <option value="">All Scopes</option>
            <option value="SCOPE_1">Scope 1 (Direct)</option>
            <option value="SCOPE_2">Scope 2 (Indirect)</option>
            <option value="SCOPE_3">Scope 3 (Travel)</option>
          </select>
        </div>

        <div className="filter-group" style={{ marginLeft: '10px' }}>
          <label className="checkbox-label">
            <span 
              className={`custom-checkbox ${filters.hasFlags ? 'checked' : ''}`}
              onClick={() => setFilters({ ...filters, hasFlags: !filters.hasFlags })}
            />
            Show Flagged Records Only
          </label>
        </div>
      </div>

      {/* Workflow Info Alert */}
      <div className="workflow-info-notice" style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '20px',
        fontSize: '0.84rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        lineHeight: '1.4'
      }}>
        <Sparkles size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          <strong>Compliance Review Process:</strong> Resolve anomalies by clicking the flag badges first. Once resolved, you must explicitly approve the records (either using the checkboxes and the <strong>Approve Selected</strong> bar at the top, or the individual row <strong>Approve</strong> buttons) to lock the values and update the dashboard overview status.
        </span>
      </div>

      {/* Bulk Action Header Banner */}
      {selectedRecordIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-info">
            {selectedRecordIds.length} records selected for review.
          </span>
          <div className="bulk-buttons">
            <button onClick={handleBulkApprove} className="btn-bulk-approve" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> Approve Selected (Lock)
            </button>
            <button onClick={handleBulkReject} className="btn-bulk-reject" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <X size={16} /> Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Records Queue Table */}
      {loadingRecords && records.length === 0 ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading validation review queue...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={36} /></div>
          <div className="empty-state-title">No records match filters</div>
          <p className="empty-state-desc">Try clearing filters or check back later once new datasets are uploaded.</p>
        </div>
      ) : (
        <div className="table-wrapper" id="tour-review-table">
          <table className="esg-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <span 
                    className={`custom-checkbox ${selectedRecordIds.length === records.length ? 'checked' : ''}`}
                    onClick={() => handleSelectAll(selectedRecordIds.length !== records.length)}
                  />
                </th>
                <th>Date</th>
                <th>Activity Type</th>
                <th>Scope</th>
                <th>Consumption Value</th>
                <th>Unit</th>
                <th>Anomalies / Flags</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const isEditing = editingRecordId === record.id;
                const hasUnresolvedFlags = record.flags.some(f => !f.resolved);

                return (
                  <tr key={record.id} style={hasUnresolvedFlags ? { background: 'rgba(239, 68, 68, 0.015)' } : {}}>
                    <td>
                      <span 
                        className={`custom-checkbox ${isSelected(record.id) ? 'checked' : ''}`}
                        onClick={() => handleSelectRecord(record.id, !isSelected(record.id))}
                      />
                    </td>

                    {/* Date */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="date"
                          value={editForm?.date || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, date: e.target.value } : null)}
                          className="edit-input"
                        />
                      ) : (
                        new Date(record.date).toLocaleDateString()
                      )}
                    </td>

                    {/* Activity Type */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editForm?.activity_type || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, activity_type: e.target.value } : null)}
                          className="edit-input"
                        />
                      ) : (
                        record.activity_type
                      )}
                    </td>

                    {/* Scope */}
                    <td>
                      {isEditing ? (
                        <select
                          value={editForm?.scope || 'SCOPE_1'}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, scope: e.target.value as any } : null)}
                          className="edit-select"
                        >
                          <option value="SCOPE_1">Scope 1</option>
                          <option value="SCOPE_2">Scope 2</option>
                          <option value="SCOPE_3">Scope 3</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{formatScopeName(record.scope)}</span>
                      )}
                    </td>

                    {/* Consumption Value */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="number"
                          step="any"
                          value={editForm?.consumption_value ?? 0}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, consumption_value: parseFloat(e.target.value) || 0 } : null)}
                          className="edit-input"
                        />
                      ) : (
                        formatNum(record.consumption_value)
                      )}
                    </td>

                    {/* Unit */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editForm?.unit || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, unit: e.target.value } : null)}
                          className="edit-input"
                        />
                      ) : (
                        record.unit
                      )}
                    </td>

                    {/* Flags */}
                    <td>
                      {record.flags.map(flag => (
                        <span 
                          key={flag.id} 
                          onClick={() => !flag.resolved && setSelectedFlag({ flag, recordId: record.id })}
                          className={`flag-pill ${flag.resolved ? 'resolved' : ''}`}
                          title={flag.resolved ? 'Resolved' : 'Click to inspect/resolve'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <AlertCircle size={12} /> {flag.flag_type}
                        </span>
                      ))}
                      {record.flags.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>

                    {/* Status */}
                    <td>
                      {record.review_status === 'APPROVED' && <span className="badge success">Approved</span>}
                      {record.review_status === 'REJECTED' && <span className="badge error">Rejected</span>}
                      {record.review_status === 'PENDING' && <span className="badge warning">Pending</span>}
                    </td>

                    {/* Actions */}
                    <td>
                      {record.locked ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Locked (Approved)</span>
                      ) : isEditing ? (
                        <div className="action-buttons">
                          <button onClick={() => saveEdit(record.id)} className="table-btn success">Save</button>
                          <button onClick={() => setEditingRecordId(null)} className="table-btn">Cancel</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button onClick={() => startEditing(record)} className="table-btn primary">Edit</button>
                          {record.review_status !== 'APPROVED' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.post('/records/approve/', { record_ids: [record.id] });
                                  fetchRecords();
                                  fetchStats();
                                } catch (err) {
                                  console.error('Error approving record', err);
                                }
                              }} 
                              className="table-btn success"
                              title="Approve and lock this record"
                            >
                              Approve
                            </button>
                          )}
                          {record.review_status !== 'REJECTED' && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.post('/records/reject/', { record_ids: [record.id] });
                                  fetchRecords();
                                  fetchStats();
                                } catch (err) {
                                  console.error('Error rejecting record', err);
                                }
                              }} 
                              className="table-btn danger"
                              title="Reject this record"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
