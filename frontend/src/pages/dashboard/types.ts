export interface StatData {
  total_batches: number;
  total_records: number;
  pending_review: number;
  approved: number;
  rejected: number;
  unresolved_flags: number;
  resolved_flags: number;
  recent_batches: Batch[];
}

export interface Batch {
  id: string;
  source_type: 'SAP' | 'UTILITY' | 'TRAVEL';
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total_rows: number;
  uploaded_by_email: string;
  created_at: string;
}

export interface ReviewFlag {
  id: string;
  flag_type: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

export interface NormalizedRecord {
  id: string;
  scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  activity_type: string;
  consumption_value: number;
  unit: string;
  date: string;
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  locked: boolean;
  flags: ReviewFlag[];
}

export interface AuditLog {
  id: string;
  action: 'UPLOAD' | 'APPROVE' | 'REJECT' | 'EDIT' | 'RESOLVE_FLAG';
  actor_email: string;
  actor?: { email: string };
  timestamp: string;
  details: any;
}

export type TabType = 'overview' | 'ingestion' | 'review' | 'audit';

export interface TourStepConfig {
  step: number;
  title: string;
  content: string;
  tab: TabType;
  targetId?: string;
  position?: 'bottom' | 'top' | 'right' | 'left';
}

export const tourSteps: TourStepConfig[] = [
  {
    step: 1,
    title: "Welcome to Breathe ESG! 🌟",
    content: "This guided tour will walk you through each feature of the platform. We will show you how to ingest carbon emissions spreadsheets, inspect anomaly flags, run approvals, and view compliance audits.",
    tab: 'overview'
  },
  {
    step: 2,
    title: "Organization KPIs 📊",
    content: "These summary cards show your high-level ESG metrics: Ingested Batches (total upload sessions), Approved Records (locked rows), Pending Review (unlocked rows), and Unresolved Flags (detected anomalies).",
    tab: 'overview',
    targetId: 'tour-kpi-grid',
    position: 'bottom'
  },
  {
    step: 3,
    title: "Record Status Overview 📈",
    content: "This chart displays the percentage of records that are Approved, Pending Review, or Rejected. Resolving anomaly flags clears the alerts, but records must still be approved to move from 'Pending Review' to 'Approved' and lock them.",
    tab: 'overview',
    targetId: 'tour-status-overview',
    position: 'right'
  },
  {
    step: 4,
    title: "Data Distribution 🍩",
    content: "This donut chart details the health of your ESG records. It compares clean, validated rows (Valid Rows) against rows that contain anomalies (Flagged Rows) needing analyst attention.",
    tab: 'overview',
    targetId: 'tour-data-distribution',
    position: 'left'
  },
  {
    step: 5,
    title: "Recent Data Uploads 📋",
    content: "This table provides a history of your uploaded datasets. You can see the Batch ID, file source type (SAP, Utility, Travel), processing status, row counts, and timestamps.",
    tab: 'overview',
    targetId: 'tour-recent-uploads',
    position: 'top'
  },
  {
    step: 6,
    title: "Spreadsheet Source Categories 📤",
    content: "Select the appropriate channel before uploading: SAP (direct fuel use), Utility (electricity/heating bills), or Travel (flight and business booking logs). Each has tailored normalization rules.",
    tab: 'ingestion',
    targetId: 'tour-source-selector',
    position: 'bottom'
  },
  {
    step: 7,
    title: "Drag & Drop Upload Zone 📂",
    content: "Drag your CSV or XLSX file here, or click to browse. The platform standardizes dates, scales consumption values, converts units, and auto-generates audit logs in real-time.",
    tab: 'ingestion',
    targetId: 'tour-dropzone',
    position: 'bottom'
  },
  {
    step: 8,
    title: "Ingestion Batch Status 🔄",
    content: "Track batches here as they process. If a batch is in 'Processing' status, the platform runs background validation checks. Once complete, it populates the Review Queue.",
    tab: 'ingestion',
    targetId: 'tour-batches-panel',
    position: 'top'
  },
  {
    step: 9,
    title: "Review Filters 🔍",
    content: "Use these controls to filter records by scope (Scope 1, 2, or 3), review status, or to show only records containing active anomaly flags.",
    tab: 'review',
    targetId: 'tour-filters-bar',
    position: 'bottom'
  },
  {
    step: 10,
    title: "Verification Ledger Table 🧾",
    content: "Here is your granular review queue. You can inspect date mappings, scope mappings, consumption values, and clicked flag badges (pills) to view or resolve anomalies.",
    tab: 'review',
    targetId: 'tour-review-table',
    position: 'top'
  },
  {
    step: 11,
    title: "Row Actions & Approvals ⚡",
    content: "You can edit any row inline to correct typos, and click 'Approve' or 'Reject' directly on the row. For large datasets, check multiple boxes to activate the bulk action bar at the top.",
    tab: 'review',
    targetId: 'tour-review-table',
    position: 'bottom'
  },
  {
    step: 12,
    title: "Compliance Audit Trail 🛡️",
    content: "This is the final compliance ledger. It preserves an immutable, chronological history of every action (upload, edit, flag resolution, approval) along with user emails and detailed value differences.",
    tab: 'audit',
    targetId: 'tour-audit-timeline',
    position: 'top'
  }
];
