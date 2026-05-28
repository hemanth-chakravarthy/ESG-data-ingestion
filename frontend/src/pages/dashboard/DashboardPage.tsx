import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import './Dashboard.css';

import { 
  type StatData, 
  type Batch, 
  type ReviewFlag, 
  type NormalizedRecord, 
  type AuditLog, 
  type TabType, 
  tourSteps 
} from './types';

// Modular Components
import Sidebar from './components/Sidebar';
import OverviewTab from './components/OverviewTab';
import IngestionTab from './components/IngestionTab';
import ReviewQueueTab from './components/ReviewQueueTab';
import AuditTrailTab from './components/AuditTrailTab';
import FlagResolutionModal from './components/FlagResolutionModal';
import TourGuide from './components/TourGuide';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Stats State
  const [stats, setStats] = useState<StatData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Ingestion State
  const [sourceType, setSourceType] = useState<'SAP' | 'UTILITY' | 'TRAVEL'>('SAP');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [pollingBatchIds, setPollingBatchIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tour Guide State
  const [tourStep, setTourStep] = useState<number | null>(null);
  const currentStepConfig = tourSteps.find(s => s.step === tourStep);

  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none';
  }>({ top: 0, left: 0, arrowDirection: 'none' });

  const [highlightCoords, setHighlightCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Review Queue State
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    scope: '',
    hasFlags: false,
  });
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    date: string;
    activity_type: string;
    consumption_value: number;
    unit: string;
    scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  } | null>(null);

  // Flags Modal State
  const [selectedFlag, setSelectedFlag] = useState<{
    flag: ReviewFlag;
    recordId: string;
  } | null>(null);
  const [resolvingFlag, setResolvingFlag] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // ──────────────────────────────────────────────
  // Data Fetching Helpers
  // ──────────────────────────────────────────────

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/dashboard/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await api.get('/uploads/list/');
      setBatches(res.data);
      
      // Auto-detect processing batches to poll
      const processing = res.data
        .filter((b: Batch) => b.status === 'PROCESSING')
        .map((b: Batch) => b.id);
      if (processing.length > 0) {
        setPollingBatchIds(prev => Array.from(new Set([...prev, ...processing])));
      }
    } catch (err) {
      console.error('Error fetching batches', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      let query = '?';
      if (filters.status) query += `status=${filters.status}&`;
      if (filters.scope) query += `scope=${filters.scope}&`;
      if (filters.hasFlags) query += `has_flags=true&`;

      const res = await api.get(`/records/${query}`);
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching records', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudits(true);
    try {
      const res = await api.get('/audit-logs/');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Error fetching audit logs', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  // ──────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────

  useEffect(() => {
    fetchStats();
    
    // Auto start guided tour on first sign-in
    const tourCompleted = localStorage.getItem('esg_tour_completed');
    if (!tourCompleted) {
      setTourStep(1);
    }
  }, []);

  useEffect(() => {
    if (tourStep !== null) {
      updateTourCoords();
    }
  }, [tourStep, activeTab]);

  useEffect(() => {
    if (tourStep !== null) {
      window.addEventListener('resize', updateTourCoords);
      window.addEventListener('scroll', updateTourCoords);
      return () => {
        window.removeEventListener('resize', updateTourCoords);
        window.removeEventListener('scroll', updateTourCoords);
      };
    }
  }, [tourStep]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'ingestion') {
      fetchBatches();
    } else if (activeTab === 'review') {
      fetchRecords();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, filters]);

  // Polling Effect for Processing Batches
  useEffect(() => {
    if (pollingBatchIds.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const completedBatchIds: string[] = [];
        
        for (const bid of pollingBatchIds) {
          const res = await api.get(`/uploads/${bid}/`);
          const status = res.data.status;
          
          if (status !== 'PROCESSING') {
            completedBatchIds.push(bid);
          }
        }

        if (completedBatchIds.length > 0) {
          // Remove completed IDs from polling list
          setPollingBatchIds(prev => prev.filter(id => !completedBatchIds.includes(id)));
          
          // Refresh views
          fetchStats();
          if (activeTab === 'ingestion') fetchBatches();
        }
      } catch (err) {
        console.error('Error polling batch status', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingBatchIds, activeTab]);

  // ──────────────────────────────────────────────
  // Handlers – Auth & Navigation
  // ──────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ──────────────────────────────────────────────
  // Handlers – Ingestion
  // ──────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Invalid format. Please upload CSV or XLSX files.');
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('source_type', sourceType);

    try {
      const res = await api.post('/uploads/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add to polling queue immediately
      setPollingBatchIds(prev => [...prev, res.data.id]);
      setSelectedFile(null);
      
      // Force switch to batches list or refresh
      fetchBatches();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this ingestion batch? All raw/normalized records and review flags associated with it will be permanently deleted.'
    );
    if (!confirmed) return;

    try {
      await api.delete(`/uploads/${batchId}/`);
      // Refresh local states
      fetchBatches();
      fetchStats();
      fetchRecords();
      fetchAuditLogs();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete batch.');
    }
  };

  // ──────────────────────────────────────────────
  // Handlers – Review Queue & Actions
  // ──────────────────────────────────────────────

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(records.map(r => r.id));
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(prev => [...prev, id]);
    } else {
      setSelectedRecordIds(prev => prev.filter(rid => rid !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRecordIds.length === 0) return;
    try {
      await api.post('/records/approve/', { record_ids: selectedRecordIds });
      setSelectedRecordIds([]);
      fetchRecords();
      fetchStats();
    } catch (err) {
      console.error('Error during bulk approval', err);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRecordIds.length === 0) return;
    try {
      await api.post('/records/reject/', { record_ids: selectedRecordIds });
      setSelectedRecordIds([]);
      fetchRecords();
      fetchStats();
    } catch (err) {
      console.error('Error during bulk rejection', err);
    }
  };

  // Inline Editing
  const startEditing = (record: NormalizedRecord) => {
    setEditingRecordId(record.id);
    setEditForm({
      date: record.date,
      activity_type: record.activity_type,
      consumption_value: record.consumption_value,
      unit: record.unit,
      scope: record.scope,
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm) return;
    try {
      await api.put(`/records/${id}/`, editForm);
      setEditingRecordId(null);
      setEditForm(null);
      fetchRecords();
      fetchStats();
    } catch (err) {
      console.error('Failed to save edit', err);
    }
  };

  // Resolve Flags
  const handleResolveFlag = async () => {
    if (!selectedFlag) return;
    setResolvingFlag(true);
    try {
      await api.post('/flags/resolve/', { flag_ids: [selectedFlag.flag.id] });
      setSelectedFlag(null);
      fetchRecords();
      fetchStats();
    } catch (err) {
      console.error('Failed to resolve flag', err);
    } finally {
      setResolvingFlag(false);
    }
  };

  // Guided Tour Handlers
  const handleNextTourStep = () => {
    if (tourStep === null) return;
    const nextStep = tourStep + 1;
    if (nextStep > tourSteps.length) {
      handleCompleteTour();
    } else {
      setTourStep(nextStep);
      const nextConfig = tourSteps.find(s => s.step === nextStep);
      if (nextConfig) {
        setActiveTab(nextConfig.tab);
      }
    }
  };

  const handlePrevTourStep = () => {
    if (tourStep === null || tourStep <= 1) return;
    const prevStep = tourStep - 1;
    setTourStep(prevStep);
    const prevConfig = tourSteps.find(s => s.step === prevStep);
    if (prevConfig) {
      setActiveTab(prevConfig.tab);
    }
  };

  const handleCompleteTour = () => {
    localStorage.setItem('esg_tour_completed', 'true');
    setTourStep(null);
    setHighlightCoords(null);
  };

  const restartTour = () => {
    setTourStep(1);
    setActiveTab('overview');
  };

  const getArrowStyle = (direction: 'up' | 'down' | 'left' | 'right' | 'none') => {
    const size = '8px';
    const borderVal = `${size} solid transparent`;
    const borderCol = `${size} solid #ffffff`;

    if (direction === 'up') {
      return {
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderBottom: borderCol,
        borderLeft: borderVal,
        borderRight: borderVal,
      };
    }
    if (direction === 'down') {
      return {
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderTop: borderCol,
        borderLeft: borderVal,
        borderRight: borderVal,
      };
    }
    if (direction === 'left') {
      return {
        right: '100%',
        top: '20px',
        borderRight: borderCol,
        borderTop: borderVal,
        borderBottom: borderVal,
      };
    }
    if (direction === 'right') {
      return {
        left: '100%',
        top: '20px',
        borderLeft: borderCol,
        borderTop: borderVal,
        borderBottom: borderVal,
      };
    }
    return {};
  };

  const updateTourCoords = () => {
    if (tourStep === null) return;
    const config = tourSteps.find(s => s.step === tourStep);
    if (!config || !config.targetId) {
      setPopoverCoords({ top: 0, left: 0, arrowDirection: 'none' });
      setHighlightCoords(null);
      return;
    }

    setTimeout(() => {
      const el = document.getElementById(config.targetId!);
      const workspaceEl = document.querySelector('.workspace');
      if (!el || !workspaceEl) {
        setPopoverCoords({ top: 0, left: 0, arrowDirection: 'none' });
        setHighlightCoords(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      const workspaceRect = workspaceEl.getBoundingClientRect();
      
      const scrollTop = workspaceEl.scrollTop;
      const scrollLeft = workspaceEl.scrollLeft;

      // Calculate absolute positions relative to .workspace's scroll container canvas
      const elementTop = rect.top - workspaceRect.top + scrollTop;
      const elementLeft = rect.left - workspaceRect.left + scrollLeft;

      let top = 0;
      let left = 0;
      let arrowDirection: 'up' | 'down' | 'left' | 'right' | 'none' = 'none';

      const position = config.position || 'bottom';

      if (position === 'bottom') {
        top = elementTop + rect.height + 12;
        left = elementLeft + rect.width / 2 - 230; // 460px / 2 = 230px
        arrowDirection = 'up';
      } else if (position === 'top') {
        top = elementTop - 220; // estimate popover height
        left = elementLeft + rect.width / 2 - 230;
        arrowDirection = 'down';
      } else if (position === 'right') {
        top = elementTop + rect.height / 2 - 80;
        left = elementLeft + rect.width + 12;
        arrowDirection = 'left';
      } else if (position === 'left') {
        top = elementTop + rect.height / 2 - 80;
        left = elementLeft - 472; // 460px + 12px = 472px
        arrowDirection = 'right';
      }

      // Constrain left inside workspace scroll width
      const workspaceWidth = workspaceRect.width;
      if (left < 16) left = 16;
      if (left + 460 > workspaceWidth - 16) {
        left = workspaceWidth - 476;
      }

      // Constrain top inside workspace scroll height
      if (top < 16) top = 16;

      setPopoverCoords({ top, left, arrowDirection });
      setHighlightCoords({
        top: elementTop,
        left: elementLeft,
        width: rect.width,
        height: rect.height,
      });

      // Smooth scroll the workspace container to center the target element
      workspaceEl.scrollTo({
        top: elementTop - workspaceRect.height / 2 + rect.height / 2,
        behavior: 'smooth'
      });
    }, 150);
  };

  // ──────────────────────────────────────────────
  // Render Main Layout
  // ──────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        logout={handleLogout}
        restartTour={restartTour}
        unresolvedFlagsCount={stats?.unresolved_flags || 0}
        isProcessingBatch={pollingBatchIds.length > 0}
      />
      
      <main className="workspace">
        <header className="workspace-header">
          <div className="workspace-title-section">
            <h1>
              {activeTab === 'overview' && 'Organization Overview'}
              {activeTab === 'ingestion' && 'Data Ingestion Hub'}
              {activeTab === 'review' && 'Data Validation & Review Queue'}
              {activeTab === 'audit' && 'System Audit Trail'}
            </h1>
            <p>
              {activeTab === 'overview' && 'Aggregated metrics, KPIs, and status updates for your carbon assets.'}
              {activeTab === 'ingestion' && 'Import raw spreadsheets (CSV/XLSX) from SAP, Utility providers, and Travel databases.'}
              {activeTab === 'review' && 'Audit and modify raw/flagged consumption values. Multi-row approval blocks them.'}
              {activeTab === 'audit' && 'Immutable ledger recording all record updates, uploads, and analyst approvals.'}
            </p>
          </div>
        </header>

        <section className="workspace-content">
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              loadingStats={loadingStats}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'ingestion' && (
            <IngestionTab
              sourceType={sourceType}
              setSourceType={setSourceType}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              uploading={uploading}
              uploadError={uploadError}
              batches={batches}
              loadingBatches={loadingBatches}
              fileInputRef={fileInputRef}
              handleUploadSubmit={handleUploadSubmit}
              handleFileChange={handleFileChange}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              onDeleteBatch={handleDeleteBatch}
            />
          )}
          {activeTab === 'review' && (
            <ReviewQueueTab
              records={records}
              loadingRecords={loadingRecords}
              filters={filters}
              setFilters={setFilters}
              selectedRecordIds={selectedRecordIds}
              editingRecordId={editingRecordId}
              setEditingRecordId={setEditingRecordId}
              editForm={editForm}
              setEditForm={setEditForm}
              setSelectedFlag={setSelectedFlag}
              saveEdit={saveEdit}
              startEditing={startEditing}
              handleBulkApprove={handleBulkApprove}
              handleBulkReject={handleBulkReject}
              handleSelectAll={handleSelectAll}
              handleSelectRecord={handleSelectRecord}
              fetchRecords={fetchRecords}
              fetchStats={fetchStats}
            />
          )}
          {activeTab === 'audit' && (
            <AuditTrailTab
              auditLogs={auditLogs}
              loadingAudits={loadingAudits}
            />
          )}
        </section>

        <TourGuide
          tourStep={tourStep}
          currentStepConfig={currentStepConfig}
          popoverCoords={popoverCoords}
          highlightCoords={highlightCoords}
          handleCompleteTour={handleCompleteTour}
          handlePrevTourStep={handlePrevTourStep}
          handleNextTourStep={handleNextTourStep}
          getArrowStyle={getArrowStyle}
        />
      </main>

      <FlagResolutionModal
        selectedFlag={selectedFlag}
        setSelectedFlag={setSelectedFlag}
        resolvingFlag={resolvingFlag}
        handleResolveFlag={handleResolveFlag}
      />
    </div>
  );
}
