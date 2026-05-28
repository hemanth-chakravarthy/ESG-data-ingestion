import { X } from 'lucide-react';
import type { ReviewFlag } from '../types';

interface FlagResolutionModalProps {
  selectedFlag: { flag: ReviewFlag; recordId: string } | null;
  setSelectedFlag: (flag: { flag: ReviewFlag; recordId: string } | null) => void;
  resolvingFlag: boolean;
  handleResolveFlag: () => Promise<void>;
}

export default function FlagResolutionModal({
  selectedFlag,
  setSelectedFlag,
  resolvingFlag,
  handleResolveFlag,
}: FlagResolutionModalProps) {
  if (!selectedFlag) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedFlag(null)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Resolve Flag: {selectedFlag.flag.flag_type}</h3>
          <button 
            className="modal-close-btn" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={() => setSelectedFlag(null)}
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            An anomaly of type <strong style={{ color: 'white' }}>{selectedFlag.flag.flag_type}</strong> (Severity: <strong style={{ color: 'var(--error)' }}>{selectedFlag.flag.severity}</strong>) was automatically generated for this record.
          </p>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
            Resolving this flag will mark it as resolved in the dashboard and remove it from the alert counter. Make sure the record value has been inspected and adjusted if necessary.
          </p>
        </div>

        <div className="modal-footer">
          <button className="table-btn" onClick={() => setSelectedFlag(null)}>Cancel</button>
          <button 
            onClick={handleResolveFlag} 
            className="btn-bulk-approve"
            disabled={resolvingFlag}
            style={{ background: 'var(--primary)', boxShadow: '0 2px 8px var(--primary-glow)' }}
          >
            {resolvingFlag ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}
