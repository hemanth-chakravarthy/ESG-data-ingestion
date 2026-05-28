# Breathe ESG — Automated Data Ingestion & Compliance Audit Platform

Breathe ESG is a production-grade prototype application designed to automate the ingestion, normalization, validation, and compliance audit workflows of complex environmental data (Scope 1, 2, and 3 emissions).

The platform accommodates fuel metrics (SAP), utility portals electricity outputs, and corporate travel datasets. It automatically scans uploads for data anomalies (negative values, duplicates/outliers, date format issues, missing values), logs inline edits to an audit trail diff timeline, and permits compliance auditors to bulk approve or reject verified records.

---

## Key Features

* **Secure Authentication**: Multi-tenant login and registration with token-based JWT rotation.
* **Multi-Source Data Ingestion**: Drag-and-drop file uploader supporting CSV and Excel (`.xlsx`, `.xls`) with custom mappings for SAP (Scope 1), Utilities (Scope 2), and Business Travel (Scope 3).
* **Asynchronous Execution Pipeline**: Offloads heavy spreadsheet calculations and anomaly checks to Celery background task workers backed by Redis. Includes an eager fallback mode for Windows developer environments.
* **Automated Rule Engine**: Flags incoming entries for validation errors:
  * `NEGATIVE_VALUE` (e.g., negative fuel entries)
  * `MISSING_DATA` (e.g., blank consumption fields or missing units)
  * `INVALID_DATE` (e.g., unparseable date formats)
  * `OUTLIER` (identifies duplicate rows by computing payload hashes)
* **Auditor Review Queue**:
  * Clean, compact tabular view designed to fit standard screens without scrolling.
  * Inline editing for date, activity, consumption, scope, and unit.
  * Checkboxes and top banner for bulk validation approvals and lock controls.
  * Row-level quick actions to verify or reject individual records.
* **Compliance Audit Timeline**: Chronological log recording exact changes, previous values, actor emails, and action classifications (uploads, approvals, resolutions).
* **Guided Onboarding Tour**: A 12-step element-specific walkthrough with highlighting masks and coordinate-anchored tooltips that guide non-engineers through all pages.
* **Sleek Light Theme**: Visual layout styled in high-contrast white and black elements to ensure legibility and professional aesthetics.

---

## Architecture & Tech Stack

* **Frontend**: React (v19), Vite (v8), TypeScript (v6), and Lucide Icons. Designed using container-presentational pattern with separated modular widgets.
* **Backend**: Django Web Framework (v5) and Django REST Framework.
* **Task Broker & Queue**: Celery with Redis broker interface.
* **Data Processing**: Pandas engine.
* **Database**: SQLite (Local Dev) / PostgreSQL (Production).

---

## Repository Structure

```
├── backend/                  # Django Web Server
│   ├── core/                 # Project configuration, Celery worker initializations
│   ├── accounts/             # Tenant registrations, user roles, JWT tokens
│   ├── ingestion/            # Pandas normalization, validation rule engines, API endpoints
│   ├── uploads/              # Local disk storage mock for ingested files
│   ├── sample_data/          # Mock spreadsheets representing SAP, Utility, and Travel sources
│   ├── manage.py
│   └── requirements.txt      # Backend Python dependencies
│
├── frontend/                 # React SPA Client
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/         # Login & Register views
│   │   │   └── dashboard/    # Sidebar, tabs, widgets, tables, modals, tours
│   │   └── stores/           # Zustand state managers
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Bundler configuration
│
└── README.md                 # Project Documentation
```

---

## Local Installation & Setup

### 1. Prerequisites
Ensure you have the following installed:
* **Python 3.10+**
* **Node.js 18+**
* **Redis Server** (optional for local fallback, required for background tasks)

---

### 2. Backend Installation (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` configuration file inside `backend/` (see `backend/.env` template):
   ```env
   SECRET_KEY=dev-secret-key-only
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   DATABASE_URL=sqlite:///db.sqlite3
   CELERY_BROKER_URL=redis://localhost:6379/0
   REDIS_URL=redis://localhost:6379/1
   ```
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver 8000
   ```

---

### 3. Background Task Runner (Celery & Redis)
Ensure Redis is running locally:
```bash
redis-server
```
In a new terminal window (with the virtual environment activated), start the Celery worker:
```bash
# Windows (requires gevent or fallback event loop)
celery -A core worker --loglevel=info -P gevent

# macOS/Linux
celery -A core worker --loglevel=info
```
*Note: If Redis is offline, the backend automatically runs tasks synchronously in eager fallback mode (`CELERY_TASK_ALWAYS_EAGER = True`).*

---

### 4. Frontend Installation (React + Vite)

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## Testing the Pipeline

You can simulate an automated end-to-end ingestion and validation pipeline using the mock script:
1. Ensure the backend server is running on port `8000`.
2. Run the script:
   ```bash
   cd backend
   # Make sure venv is active
   python test_upload.py
   ```
This script registers a test user, uploads mock spreadsheet files, and triggers the normalization and anomaly flagging engine.

---

## Component documentation

For deep-dive architectural decisions and design criteria, refer to:
* **[MODEL.md](MODEL.md)**: Database schemas, relational tables, and audit logs logic.
* **[DECISIONS.md](DECISIONS.md)**: Rationale behind framework choices, asynchronous Fallback loops, and validation engines.
* **[TRADEOFFS.md](TRADEOFFS.md)**: Details on prototype scopes, S3 streaming constraints, and future roadmap enhancements.
* **[SOURCES.md](SOURCES.md)**: Structure, properties, and edge-case anomalies of raw SAP, Utility, and corporate travel files.
