import { 
  LayoutDashboard, 
  Upload, 
  Search, 
  ClipboardList, 
  LogOut, 
  Sparkles
} from 'lucide-react';
import type { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: any;
  logout: () => Promise<void>;
  restartTour: () => void;
  unresolvedFlagsCount: number;
  isProcessingBatch: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  logout,
  restartTour,
  unresolvedFlagsCount,
  isProcessingBatch,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">

        <span className="sidebar-brand">BreathESG</span>
      </div>

      <nav className="sidebar-nav">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <span className="nav-item-icon"><LayoutDashboard size={18} /></span>
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('ingestion')}
          className={`nav-item ${activeTab === 'ingestion' ? 'active' : ''}`}
        >
          <span className="nav-item-icon"><Upload size={18} /></span>
          <span>Data Ingestion</span>
          {isProcessingBatch && (
            <span className="badge processing" style={{ marginLeft: 'auto', padding: '2px 6px' }}>
              <span className="pulse-dot" />
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('review')}
          className={`nav-item ${activeTab === 'review' ? 'active' : ''}`}
        >
          <span className="nav-item-icon"><Search size={18} /></span>
          <span>Review Queue</span>
          {unresolvedFlagsCount > 0 && <span className="nav-badge">{unresolvedFlagsCount}</span>}
        </button>

        <button 
          onClick={() => setActiveTab('audit')}
          className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
        >
          <span className="nav-item-icon"><ClipboardList size={18} /></span>
          <span>Audit Trail</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <span className="user-email">{user?.email}</span>
          <span className="user-org">{user?.organization?.name || 'Company Organization'}</span>
          <span className="role-badge">{user?.role || 'Analyst'}</span>
        </div>
        <button 
          onClick={restartTour} 
          className="nav-item" 
          style={{ 
            padding: '8px 12px', 
            fontSize: '0.8rem', 
            border: '1px dashed rgba(0, 0, 0, 0.15)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <span className="nav-item-icon"><Sparkles size={14} style={{ color: 'var(--warning)' }} /></span>
          <span>Guided App Tour</span>
        </button>
        <button onClick={logout} className="signout-btn">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
