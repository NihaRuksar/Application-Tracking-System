# Mini Applicant Tracking System (ATS)

A minimalist, high-efficiency Applicant Tracking System built for modern recruitment workflows. Designed for a full-stack internship assessment, this project emphasizes clean architectural separation, strict REST conventions, an ACID-compliant single-table SQLite database, and an intuitive two-page React interface.

---

## 1. Architecture Overview

The system is architected as a decoupled full-stack application:

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│                                                        │
│   Candidates View                 Dashboard View       │
│   - Live Search (?search=)        - Per-Stage Counters │
│   - Candidate Ingestion Modal     - Pipeline Funnel %  │
│   - Interactive Stage Selector    - Stage Filters      │
│   - Delete with Confirmation                           │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP / REST  │ JSON Payloads
                            ▼
┌────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.10+)            │
│                                                        │
│   Endpoints:                                           │
│   1. POST   /candidates           (Add Candidate)      │
│   2. GET    /candidates?search=   (List & Search)      │
│   3. PUT    /candidates/{id}      (Update Stage/Info)  │
│   4. DELETE /candidates/{id}      (Remove Candidate)   │
│   5. GET    /dashboard            (Stage Metrics)      │
└───────────────────────────┬────────────────────────────┘
                            │
               SQLAlchemy   │ Engine / Session
                            ▼
┌────────────────────────────────────────────────────────┐
│               SQLite Relational Database               │
│                                                        │
│   Table: candidates                                    │
│   File:  candidates.db                                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### Table: `candidates`

The system uses a single normalized relational table hosted in SQLite (`candidates.db`).

#### DDL (Data Definition Language)

```sql
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    role VARCHAR(100) NOT NULL,
    stage VARCHAR(50) NOT NULL DEFAULT 'Applied',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for fast unique lookups and duplicate checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Index on stage for fast aggregation queries in dashboard metrics
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);

-- Index on name and role for rapid full-text search filtering
CREATE INDEX IF NOT EXISTS idx_candidates_name_role ON candidates(name, role);
```

#### Column Reference

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | No | Auto-increment | Unique identifier (Primary Key) |
| `name` | `VARCHAR(100)` | No | None | Full legal name of the candidate |
| `email` | `VARCHAR(120)` | No | None | Unique electronic mail address (indexed) |
| `role` | `VARCHAR(100)` | No | None | Target position applied for (e.g. "Full Stack Intern") |
| `stage` | `VARCHAR(50)` | No | `'Applied'` | Current hiring stage in recruitment pipeline |
| `created_at` | `DATETIME` | Yes | `CURRENT_TIMESTAMP` | UTC timestamp of application receipt |

#### Pipeline Stages Enum

The `stage` column strictly conforms to one of the following 6 stages:
1. `Applied` *(Default)*
2. `Screening`
3. `Technical Interview`
4. `Culture Fit`
5. `Offer`
6. `Rejected`

---

## 3. REST API Documentation

The backend exposes 5 clean RESTful endpoints adhering to standard HTTP verbs and status codes.

### Base URL
- Local FastAPI: `http://localhost:8000`
- Integrated Applet: `http://localhost:3000`

---

### Endpoint 1: Add Candidate

Creates a new candidate record in the ATS.

- **Method**: `POST`
- **Path**: `/candidates`
- **Request Headers**: `Content-Type: application/json`

#### Request Body Schema
```json
{
  "name": "Alex Rivera",
  "email": "alex.rivera@example.com",
  "role": "Full Stack Intern",
  "stage": "Applied"
}
```
*Note: `stage` is optional and defaults to `"Applied"` if omitted.*

#### Success Response
- **Status**: `201 Created`
- **Body**:
```json
{
  "id": 1,
  "name": "Alex Rivera",
  "email": "alex.rivera@example.com",
  "role": "Full Stack Intern",
  "stage": "Applied",
  "created_at": "2026-10-17T11:00:00Z"
}
```

#### Error Responses
- **Status**: `400 Bad Request` — Email already registered:
  ```json
  { "detail": "A candidate with this email address already exists." }
  ```
- **Status**: `422 Unprocessable Entity` — Invalid stage or missing required fields:
  ```json
  { "detail": "Invalid stage 'Hired'. Must be one of: Applied, Screening, Technical Interview, Culture Fit, Offer, Rejected" }
  ```

#### cURL Example
```bash
curl -X POST http://localhost:8000/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Rivera",
    "email": "alex.rivera@example.com",
    "role": "Full Stack Intern",
    "stage": "Applied"
  }'
```

---

### Endpoint 2: List and Search Candidates

Retrieves candidates ordered by newest first, with optional search across name, role, and email.

- **Method**: `GET`
- **Path**: `/candidates`
- **Query Parameters**:
  - `search` *(optional, string)*: Filter term matching candidate name, role, or email case-insensitively.

#### Success Response
- **Status**: `200 OK`
- **Body**:
```json
[
  {
    "id": 2,
    "name": "Elena Rostova",
    "email": "elena.r@example.com",
    "role": "Frontend Developer",
    "stage": "Screening",
    "created_at": "2026-10-17T10:45:00Z"
  },
  {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex.rivera@example.com",
    "role": "Full Stack Intern",
    "stage": "Applied",
    "created_at": "2026-10-17T10:30:00Z"
  }
]
```

#### cURL Examples
```bash
# Retrieve all candidates
curl -X GET "http://localhost:8000/candidates"

# Search candidates for "Intern"
curl -X GET "http://localhost:8000/candidates?search=Intern"
```

---

### Endpoint 3: Update Candidate

Updates candidate details or advances/regresses their hiring stage.

- **Method**: `PUT`
- **Path**: `/candidates/{id}`
- **Path Parameters**:
  - `id` *(integer, required)*: The candidate ID.
- **Request Headers**: `Content-Type: application/json`

#### Request Body Schema (Partial Updates Supported)
```json
{
  "stage": "Technical Interview"
}
```

#### Success Response
- **Status**: `200 OK`
- **Body**:
```json
{
  "id": 1,
  "name": "Alex Rivera",
  "email": "alex.rivera@example.com",
  "role": "Full Stack Intern",
  "stage": "Technical Interview",
  "created_at": "2026-10-17T10:30:00Z"
}
```

#### Error Responses
- **Status**: `404 Not Found` — ID does not exist:
  ```json
  { "detail": "Candidate with ID 999 not found." }
  ```
- **Status**: `422 Unprocessable Entity` — Invalid stage provided:
  ```json
  { "detail": "Invalid stage 'Onsite'. Must be one of: Applied, Screening, Technical Interview, Culture Fit, Offer, Rejected" }
  ```

#### cURL Example
```bash
curl -X PUT http://localhost:8000/candidates/1 \
  -H "Content-Type: application/json" \
  -d '{"stage": "Technical Interview"}'
```

---

### Endpoint 4: Remove Candidate

Deletes a candidate record permanently from the database.

- **Method**: `DELETE`
- **Path**: `/candidates/{id}`
- **Path Parameters**:
  - `id` *(integer, required)*: The candidate ID to delete.

#### Success Response
- **Status**: `200 OK`
- **Body**:
```json
{
  "message": "Candidate removed successfully",
  "id": 1
}
```

#### Error Response
- **Status**: `404 Not Found`:
  ```json
  { "detail": "Candidate with ID 999 not found." }
  ```

#### cURL Example
```bash
curl -X DELETE http://localhost:8000/candidates/1
```

---

### Endpoint 5: Get Dashboard Metrics

Calculates aggregate metrics and the breakdown of candidate counts for each pipeline stage.

- **Method**: `GET`
- **Path**: `/dashboard`

#### Success Response
- **Status**: `200 OK`
- **Body**:
```json
{
  "total": 6,
  "stages": {
    "Applied": 2,
    "Screening": 1,
    "Technical Interview": 1,
    "Culture Fit": 1,
    "Offer": 1,
    "Rejected": 0
  }
}
```

#### cURL Example
```bash
curl -X GET http://localhost:8000/dashboard
```

---

## 4. Project Structure

```
├── backend/
│   ├── database.py         # SQLAlchemy engine, Candidate ORM model, get_db dependency
│   ├── main.py             # FastAPI application with the 5 REST routes and CORS
│   └── requirements.txt    # Python dependencies (fastapi, uvicorn, sqlalchemy, pydantic)
├── src/
│   ├── api/
│   │   └── client.ts       # Typed REST client interfacing with the 5 API endpoints
│   ├── components/
│   │   ├── CandidateModal.tsx     # Add / Edit Candidate modal dialog
│   │   ├── CandidateTable.tsx     # Tabular data grid with search, stage dropdown, delete
│   │   ├── DashboardView.tsx      # Stage metric cards and pipeline distribution
│   │   └── RepositoryDocModal.tsx # In-app API doc & schema viewer
│   ├── types/
│   │   └── candidate.ts    # TypeScript interfaces & stage enum types
│   ├── App.tsx             # Master page switcher (Candidates <-> Dashboard)
│   ├── index.css           # Tailwind CSS configuration and typography
│   └── main.tsx            # React 19 entry point
├── server.ts               # Full-stack Node/Express server with SQLite persistence
├── repository.md           # Master assessment documentation (this file)
└── package.json            # Frontend & full-stack dependencies
```

---

## 5. Local Setup & Running Instructions

### Prerequisites
- Node.js 18+ (Node 22 recommended)
- Python 3.10+ (if running the Python FastAPI backend directly)

---

### Option A: Running the Full Application (Single Command)

This repository includes a full-stack runner with integrated SQLite persistence and Vite middleware:

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Visit `http://localhost:3000` in your browser. The application runs with persistent SQLite storage and serves both the React UI and the 5 REST APIs.

---

### Option B: Running the Python FastAPI Backend Standalone

To run the dedicated Python FastAPI service:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the Uvicorn server
uvicorn main:app --reload --port 8000
```

The FastAPI backend will start on `http://localhost:8000`.
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc API Reference**: `http://localhost:8000/redoc`

---

## 6. Assessment Evaluation Checklist

| Requirement | Implementation Details | Status |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI + SQLite (`backend/main.py`, `backend/database.py`) | Supported |
| **No Extras Policy** | No PostgreSQL, no JWT login, no resume uploads, no complex bloat | Supported |
| **Single Table** | `candidates` (`id`, `name`, `email`, `role`, `stage`, `created_at`) | Supported |
| **5 REST APIs** | `POST /candidates`, `GET /candidates?search=`, `PUT /candidates/{id}`, `DELETE /candidates/{id}`, `GET /dashboard` | Supported |
| **2 Pages** | 1) Candidates (Table, Add Form, Stage Select, Search) 2) Dashboard (Counts per stage) | Supported |
| **6 Pipeline Stages** | `Applied`, `Screening`, `Technical Interview`, `Culture Fit`, `Offer`, `Rejected` | Supported |
| **Documentation** | `repository.md` with DB DDL, API reference, cURL, setup steps | Supported |
