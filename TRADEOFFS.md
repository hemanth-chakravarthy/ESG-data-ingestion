# Technical Tradeoffs (TRADEOFFS.md)

This document details three specific features we deliberately chose **not** to build in this prototype and the technical/product reasoning behind these decisions.

---

## 1. Dynamic Emissions Calculations ($CO_2e$)

*   **What was omitted**: Automatic translation of activity values (e.g., liters of Diesel, kWh of electricity) into carbon equivalent ($CO_2e$) metrics.
*   **Why**: Calculating emissions is highly complex and depends on a vast database of geographical and temporal factors. For example, the emission factor for electricity in California differs from that in Germany or India and changes yearly. Hardcoding a single factor would be a poor representation of a production system. We chose to focus on building a robust ingestion pipeline, unit normalization, flag-resolution, and a secure audit ledger. The calculation layer can be integrated later via specialized services like the Climatiq API.

---

## 2. Production-Grade Cloud Infrastructure (S3 Streaming & Redis Clusters)

*   **What was omitted**: Real-time direct-to-S3 file streaming and cloud-hosted queues (like AWS SQS or Redis).
*   **Why**: Setting up cloud infrastructure requires specific AWS/Redis credentials, which would make the repository difficult to run and evaluate locally. We chose to store files locally in `/uploads/` and configured a Celery eager fallback that runs tasks synchronously if a Redis connection is offline. This ensures the app runs out-of-the-box locally, while maintaining an API design that can transition to cloud hosting with minimal configuration changes.

---

## 3. Dynamic Column Mapping UI (Schema Mapper)

*   **What was omitted**: A frontend interface allowing users to map arbitrary spreadsheet columns to database fields.
*   **Why**: In a real-world scenario, every client spreadsheet has different headers (e.g. `consumption`, `quantity`, `Menge`). Building a drag-and-drop column-mapper UI is time-consuming and secondary to the core data pipeline. Instead, we defined standard expected schemas for the three data sources (`SAP`, `UTILITY`, `TRAVEL`) and cleaned column names programmatically (lowercasing and replacing spaces with underscores). This establishes a robust data contract while keeping the import process fast and reliable.
