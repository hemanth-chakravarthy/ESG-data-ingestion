# Architecture Decisions (DECISIONS.md)

This document outlines the major architectural and design decisions made while building the ESG Ingestion Platform, the rationale behind them, and what would be asked of the PM for production scaling.

---

## 1. Stack Selection: Django + React Monorepo

*   **Decision**: Pivot from the initial design (Node/NextJS) to **Django REST Framework (DRF) + React (Vite)**.
*   **Rationale**: The Breath ESG Intern PDF explicitly requests: *"Build a prototype in Django and React."* DRF provides database migrations, ORM, authentication backends, and simple serializers out of the box, ensuring rapid, robust backend development. Vite provides a lightweight, fast, and modern compilation environment for standard React development.

---

## 2. Ingestion Mechanism: Local File Upload with S3 Compatibility

*   **Decision**: Files are uploaded directly to a local `/uploads/` folder and represented in the database as local file paths under a `URLField`.
*   **Rationale**: Setting up local storage simplifies local testing without requiring AWS credentials. However, the schema uses a `file_url` property so that transitioning to Amazon S3 (using `django-storages` and Boto3) is a drop-in config change.
*   **Tradeoff**: Local storage does not scale horizontally. In production, we would stream uploads directly to S3.

---

## 3. Celery Offline Fallback (Eager Mode)

*   **Decision**: Implemented an automated Redis connectivity check in [settings.py](file:///d:/Web%20Development/ESG-data-ingestion/backend/core/settings.py). If Redis is down, it sets `CELERY_TASK_ALWAYS_EAGER = True`.
*   **Rationale**: In development, requiring a local Redis instance often causes configuration friction. When Redis is down, Celery runs task queues synchronously inside the Django request thread. If Redis is running, it runs asynchronously, providing a plug-and-play developer experience.

---

## 4. Anomaly Detection and Flagging Rules

*   **Decision**: Implemented rule-based anomaly flags:
    1.  `NEGATIVE_VALUE`: Consumption value < 0.
    2.  `MISSING_DATA`: Consumption value == 0, or missing unit, or invalid date format.
    3.  `INVALID_DATE`: Unparseable date strings default to the current ingestion date and flag the record.
    4.  `OUTLIER` (Simulated duplicate): MD5 hashing of the raw payload is checked. Rows with identical hashes in the same upload batch are flagged.
*   **Rationale**: These checks catch standard data quality issues (errors in manual excel logs, negative entries, missing numbers) instantly during ingestion, preparing the queue for analyst signoff.

---

## 5. What We Would Ask the PM

1.  **Emissions Factor Library**: Can we integrate a third-party API (like Climatiq or EPA databases) to translate normalized consumption directly to $CO_2e$ values based on geography and activity?
2.  **Organization Hierarchies**: Should organizations support child accounts (e.g. parent company with subsidiary facilities)?
3.  **Third-party Integrations**: Should we build direct API connectors for Concur/Navan and utility portals instead of file uploads, or is file uploading the permanent ingestion method?
