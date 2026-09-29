# Admin / Staff Operations Dashboard Implementation

## Overview
The Admin Operations Dashboard provides authorized staff with an interface to manage the core workflows of the application: reviewing candidate matches and adjudicating claims on found items. The implementation extends both the FastAPI backend and the Next.js frontend, adhering to existing patterns and the global design system.

## Backend Architecture
- **Data Model:** An `is_admin` string column (using `"true"`/`"false"`) was added to the existing `User` model to designate admin users without altering the schema types.
- **Authentication:** A new `get_admin_user` dependency in `src/api/auth.py` validates that the current user has `is_admin == "true"`, rejecting unauthorized access with a 403 Forbidden response.
- **Routing:** Created `src/api/routers/admin.py` for all admin endpoints under `/api/v1/admin/*`, including:
  - `GET /overview`: Summary metrics of pending claims, matches, and reports.
  - `GET /claims` & `PATCH /claims/{id}`: List and adjudicate claims.
  - `GET /candidates` & `PATCH /candidates/{id}`: List and adjudicate candidate matches (including uncertain <80% cases).
  - `GET /reports`: View all open reports.
  - `GET /items`: View resolved/returned items.

## Frontend Integration
- **Route Guards:** Created `frontend/src/app/admin/layout.tsx` which strictly verifies the user's `is_admin` status using the `useAuth` hook and the backend `/users/me` API. Unauthenticated or non-admin users are immediately redirected and denied access.
- **API Client:** Added strongly-typed service methods to `frontend/src/services/api.ts` to consume the new admin endpoints.
- **Navigation:** Updated the global `Header` component to conditionally include an "Admin" link for quick access (added to main nav array for visibility). Fixed previous duplicate header bugs.
- **UI Implementation:** Refined `frontend/src/app/admin/page.tsx` into a highly functional Staff Operations Center. 
  - Integrated the overview metrics cleanly into the top header (removing the large empty space).
  - Designed distinct tabs for five queues: **Candidate Matches**, **Uncertain Cases**, **Claims**, **Open Reports**, and **Returned Items**.
  - Review views feature detailed side-by-side comparisons of lost/found imagery and AI similarity scores, with clear Approve/Reject actions, specifically labeling **CLAIMANT**, **LOST REPORT**, **FOUND ITEM**, **OWNERSHIP EVIDENCE**, and **AI MATCH EVIDENCE** components. No new CSS classes were introduced, ensuring visual consistency.

## Development Admin Setup
To test the Admin functionality locally without tampering with production data:
1. Ensure the user exists (login at least once via the frontend to create their Firebase UID in the DB).
2. Run the provided script from the project root:
   ```bash
   python scripts/create_admin.py <firebase_uid>
   ```
   *Note: You can find your `firebase_uid` in the local PostgreSQL `users` table.*
3. Log in at **`/admin/login`**.

## Testing
- **Backend:** Added integration tests in `tests/api/test_admin.py` that utilize dependency overrides to mock admin authentication and verify route responses. All tests pass successfully.
- **Frontend:** Implemented Playwright tests in `frontend/tests/admin.spec.ts` mocking the admin API responses and verifying the UI components render the claims, candidate data correctly, and transition states as expected. All UI tests pass successfully.
