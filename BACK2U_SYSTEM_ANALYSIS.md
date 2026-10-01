# Back2U — Existing System Analysis

## 1. Executive Summary
Back2U is a university lost and found platform designed to facilitate the reporting and retrieval of lost items on campus. The repository contains a partially implemented full-stack application featuring a Next.js frontend, a FastAPI backend, a PostgreSQL database (via SQLAlchemy), and Firebase Authentication. While the backend data model and API are largely implemented for core operations (reporting, user management, admin flows), the Multimodal Machine Learning retrieval system is currently decoupled and mocked within the primary user flow. 

## 2. Project Identity
**Project Name:** Back2U (formerly CampusFind)
**Domain:** University Lost & Found
**Goal:** Provide a centralized platform for students to report lost/found items and potentially use image-based and textual multimodal search to match candidates.

## 3. Current Technology Stack
**Frontend:**
- **Framework:** Next.js 16.3.6 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (custom via `globals.css`)
- **Animation:** Framer Motion 13
- **Components:** Lucide React (icons), React Datepicker
- **Testing:** Playwright E2E

**Backend:**
- **Framework:** FastAPI
- **Language:** Python 3.11+
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Testing:** Pytest

**Database:**
- **Engine:** SQLite (`app.db`) locally, configured for PostgreSQL/Supabase in production.
- **Tables:** users, item_instances, reports, candidate_matches, claims, report_embeddings.

**Authentication:**
- **Provider:** Firebase Authentication (Phone, Email)
- **Backend Validation:** `firebase-admin` with local `PyJWT` fallback.

**Machine Learning (Decoupled):**
- **Architecture:** PyTorch, Siamese Network / DINOv2 / SigLIP experiments.
- **Retrieval:** FAISS (in experiments).
- **Status:** *MOCKED* in API route.

## 4. Current Architecture
```text
User
   |
   v
Back2U Frontend (Next.js)
   |
   +--------> Firebase Auth (Token generation)
   |
   v
FastAPI Backend (REST API)
   |
   +--------> PyJWT / Firebase Admin (Token validation)
   |
   +--------> SQLite / PostgreSQL (Data persistence)
   |
   +--------> RetrievalService 
                 |
                 +--> MockRetrievalService (CURRENT ACTIVE)
                 +--> RealRetrievalService (PLANNED / DECOUPLED)
```

## 5. Frontend Analysis
| Route | Page Name | Purpose | Auth | API | Status |
|---|---|---|---|---|---|
| `/` | Home | Landing page, interactive Search Lens | No | None | IMPLEMENTED |
| `/search` | Search | Visual/Text search form | Yes | `/retrieval/search` | IMPLEMENTED (Mock Data) |
| `/report` | Report | Create lost/found report | Yes | `/reports` | IMPLEMENTED |
| `/my-reports` | My Reports | List user's reports | Yes | `/users/me/reports` | IMPLEMENTED |
| `/map` | Campus Hotspots | Show areas with active reports | No | `/reports` | IMPLEMENTED |
| `/admin` | Admin Dashboard | Overview of matches, claims | Yes (Admin) | `/admin/*` | IMPLEMENTED |
| `/admin/login` | Admin Login | Staff auth flow | No | Firebase | IMPLEMENTED |
| `/item/[id]` | Item Detail | View specific report | No | `/reports/{id}` | IMPLEMENTED |
| `/settings` | Settings | User preferences | Yes | `/users/me` | IMPLEMENTED |
| `/login` | Login | User authentication | No | Firebase | IMPLEMENTED |
| `/browse` | Browse | List public reports | No | `/reports` | IMPLEMENTED |
| `/privacy`, `/terms`, `/faq` | Static | Legal and help | No | None | IMPLEMENTED |

## 6. Backend Analysis
The FastAPI backend acts as a standard CRUD REST API with role-based dependencies (Admin vs User). It heavily utilizes SQLAlchemy to persist data. The architecture structurally separates `ItemInstance` (the physical object) from `Report` (the user's claim about the object).

## 7. Authentication
**Status:** IMPLEMENTED
**Flow:**
1. Frontend uses `firebase` SDK to authenticate (Email/Password or Phone via Recaptcha).
2. Frontend receives an ID Token.
3. Frontend passes token via `Authorization: Bearer` to FastAPI.
4. FastAPI validates via `firebase_auth.verify_id_token` or `PyJWT` fallback.
5. If valid, FastAPI creates or fetches the `User` in PostgreSQL by `firebase_uid`.

*Limitation:* Backend gracefully falls back to insecure PyJWT decoding for local dev if `GOOGLE_APPLICATION_CREDENTIALS` are missing.

## 8. Database
**Status:** IMPLEMENTED
Schema is managed by SQLAlchemy and Alembic. 
- **`users`**: Stores `firebase_uid`, `email`, `is_admin`.
- **`item_instances`**: Represents a canonical physical item.
- **`reports`**: A lost/found submission linked to an `item_instance` and `user`.
- **`candidate_matches`**: A junction table linking a Lost Report and Found Report with a `similarity_score`.
- **`claims`**: Workflow table for users trying to claim a matched item.
- **`report_embeddings`**: Stores `model_version`. (Actual vector storage via `pgvector` is planned but NOT fully implemented).

## 9. API Inventory
| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | No | DB connection check | IMPLEMENTED |
| GET | `/api/v1/retrieval/health` | No | ML service check | IMPLEMENTED |
| POST| `/api/v1/retrieval/search` | Yes | Search candidates | MOCK |
| POST| `/api/v1/reports` | Yes | Create report | IMPLEMENTED |
| GET | `/api/v1/reports` | No | List reports | IMPLEMENTED |
| GET | `/api/v1/reports/{id}` | No | Get report detail | IMPLEMENTED |
| PUT | `/api/v1/reports/{id}` | Yes | Update report | IMPLEMENTED |
| DEL | `/api/v1/reports/{id}` | Yes | Delete report | IMPLEMENTED |
| GET | `/api/v1/users/me` | Yes | Get current user | IMPLEMENTED |
| GET | `/api/v1/users/me/reports`| Yes | Get user's reports| IMPLEMENTED |
| POST| `/api/v1/claims` | Yes | Create claim | IMPLEMENTED |
| GET | `/api/v1/admin/overview` | Admin | Staff dashboard | IMPLEMENTED |

## 10. User Flows
### FLOW A — Authentication
User -> `/login` -> Firebase Auth (Phone/Email) -> Gets JWT -> Frontend sets API header -> Validated by backend `get_current_user` dependency. Works correctly.

### FLOW B — Report Lost/Found
User -> `/report` -> Submits form -> POST `/reports` -> Backend creates `ItemInstance` -> Backend creates `Report` -> Database -> UI redirects to `/my-reports`. Works correctly.

### FLOW C — Search
User -> `/search` -> Enters criteria -> POST `/retrieval/search` -> FastAPI hits `MockRetrievalService` -> Returns empty list -> UI shows no results (or mock results). **Retrieval is currently mocked.**

### FLOW D — Browse / Hotspots
User -> `/map` -> GET `/reports` -> Frontend computes frequency of `location` strings -> Renders `hotspots-board` UI -> Clicking hotspot filters local list. Works correctly.

## 11. Search System
- **Text Search:** PARTIALLY IMPLEMENTED (basic DB filters available on `/reports` via query params).
- **Image Search:** MOCK (API accepts base64 images, but `MockRetrievalService` ignores them).
- **Similarity Search / Vector Database:** PLANNED (Schema has `ReportEmbedding`, but no pgvector queries are active).
- **Current active backend flow:** Returns fake/empty results from `MockRetrievalService`.

## 12. Image/File Handling
- **Storage Provider:** NOT FOUND.
- **Upload Flow:** Frontend converts images to base64 strings and stores them as `image_reference` in the database directly or passes them to the ML query. No direct S3/Firebase Storage bucket uploading is implemented in the API.

## 13. ML / Retrieval Status
**Status:** DECOUPLED / EXPERIMENTAL
- The repository contains extensive ML experiments (`scripts/train_m4.py`, `src/embeddings/`, `reports/evaluation/`). 
- **However**, the inference code is NOT integrated into the live API. 
- The `src/api/routers/retrieval.py` endpoint is hardcoded to `MockRetrievalService`.
- A `RealRetrievalService` exists in code, which attempts to POST to an external `ML_SERVICE_URL`, implying the actual ML model runs on a separate, undocumented microservice.

## 14. Current Data / Demo Data
- **Mock Data:** Scripts like `scripts/seed_mock_data.py` generate fake users, reports (e.g., "Black canvas backpack", "Silver water bottle"), and matches for the database.
- These are strictly used for environment seeding and UI testing, not hardcoded in the application layer.

## 15. Security
- **Auth:** Solid dependency enforcement (`get_current_user`).
- **Authorization:** Ownership checks are enforced on PUT/DELETE `/reports/{id}`.
- **Admin:** `get_admin_user` protects `/admin` routes.
- **Weaknesses:** Local PyJWT fallback skips signature verification. Images are stored as raw base64 or insecure strings rather than signed URLs.

## 16. Testing
- **E2E:** `tests/frontend.spec.ts` (Playwright) - IMPLEMENTED.
- **API Tests:** `tests/api/test_integration.py` (Pytest) - IMPLEMENTED.
- Tests pass locally based on CI/CD output logs.

## 17. Current UI/UX
- **Design System:** Sleek, dark-mode focused, large typography ("Syne" font). 
- **Interaction:** Uses Framer Motion for smooth transitions (e.g., Search Lens).
- **Navigation:** Standard Header, responsive.
- **Weakness:** `/map` doesn't actually display a geographic map; it's a styled list of "hotspots".

## 18. Existing System Limitations
- **Search:** The core multimodal search is a mock. The application cannot actually match a lost item to a found item visually right now.
- **Images:** Base64 storage in relational databases is highly unscalable.
- **ML Integration:** Segmented architecture requires spinning up a separate ML service that is not fully containerized in the current `docker-compose.yml` (which only spins up Postgres).

## 19. Proposed Back2U Direction
**Current System:** A functional CRUD application for managing Lost and Found reports with authentication and an admin dashboard.
**Proposed System (Future Work):** Integrating the decoupled PyTorch/FAISS multimodal retrieval system to allow real-time image-to-image and text-to-image candidate generation via `pgvector`. 

## 20. Academic Presentation Material

### 20.1 Title
"Back2U: A Multimodal University Lost and Found System"

### 20.2 Background and Domain
University campuses generate high volumes of lost property. Traditional solutions rely on manual keyword entry and fragmented physical desks. Back2U leverages a centralized digital platform. The domain intersects web architecture, access control, and information retrieval.

### 20.3 Literature Review and Existing System
Existing research explored by this project includes Siamese networks, Triplet Loss for metric learning, and DINOv2 vision transformers (referenced in `experiments/dinov2_frozen_baseline.md`). The existing system establishes the data acquisition pipeline and UI foundation necessary to capture these multimodal queries.

### 20.4 Problem Identification / Limitations
Current lost-and-found platforms fail because users cannot accurately describe items with standardized keywords. Back2U's current limitation is that its ML retrieval engine is decoupled and mocked, meaning it currently operates purely as a standard CRUD platform lacking the intelligent candidate-matching required to solve the domain problem. 

### 20.5 Project Planning / Proposal
**Proposed Architecture:**
User -> Photo/Text -> FastAPI Backend -> PyTorch Inference Service -> Vector Similarity Search -> Candidate Matches -> User Review.
*Note: The Frontend, Backend, and DB are CURRENT. The PyTorch Inference Service integration and Vector Similarity Search are PROPOSED.*

### 20.6 References
- DINOv2: Learning Robust Visual Features without Supervision (Oquab et al., 2023).
- Objectron: A Large Scale Dataset of Object-Centric Videos (Ahmadyan et al., 2021) - referenced in dataset audit.

## 21. Verified Facts vs Assumptions
- **Verified:** Frontend UI, FastAPI CRUD, SQLite/Postgres DB schema, Firebase Auth, API Test coverage.
- **Assumption Avoided:** I did not assume the ML engine was live. It is explicitly mocked in `retrieval.py`.

## 22. Open Questions / Unknowns
- Does `ML_SERVICE_URL` point to a functioning external service in production, or is it purely theoretical at this stage?
- How will the system transition from base64 image strings to a scalable cloud storage bucket?

## VERIFIED IMPLEMENTATION MATRIX

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Authentication | IMPLEMENTED | `src/api/auth.py`, `frontend/src/app/login` | Uses Firebase Admin with PyJWT fallback. |
| Lost reporting | IMPLEMENTED | `src/api/routers/reports.py` | Works via POST `/reports`. |
| Found reporting | IMPLEMENTED | `src/api/routers/reports.py` | Same route, `report_type="found"`. |
| Search UI | IMPLEMENTED | `/search` frontend route | UI form exists and submits data. |
| Text search API | PARTIAL | `src/api/routers/reports.py` | Basic exact-match filtering. |
| Image upload | PARTIAL | `schemas.py` | Accepts Base64 strings. No cloud storage. |
| Multimodal retrieval | MOCK | `retrieval.py` | Hardcoded to `MockRetrievalService`. |
| Database persistence| IMPLEMENTED | `database.py`, `models.py` | Full SQLAlchemy/Alembic setup. |
| User reports | IMPLEMENTED | `/my-reports`, `/users/me/reports` | Filtering by `user_id` verified. |
| Notifications | NOT FOUND | No routes or UI | Not implemented in current codebase. |
| Hotspots | IMPLEMENTED | `/map` route | Groups reports by text location. No actual map UI. |
| Profile / Settings | IMPLEMENTED | `/settings` route | Updates user metadata. |
| API | IMPLEMENTED | `src/api/main.py` | Complete FastAPI implementation. |
| ML integration | PLANNED | `retrieval_service.py` | `RealRetrievalService` exists but is not the active dependency. |
