### 2026-09-24 18:50 — PostgreSQL Database Connection Setup

**Change:** 
- Analyzed existing architecture (FastAPI, SQLAlchemy) and transitioned from SQLite to PostgreSQL.
- Updated `src/api/database.py` and `src/api/models.py` for PostgreSQL support.
- Added a new `User` model to link `firebase_uid` to PostgreSQL application data.
- Configured Alembic for database migrations and generated the initial configuration.
- Added `docker-compose.yml` for local PostgreSQL development.
- Added `scripts/test_db.py` to test connection in isolation.
- Created `/health` endpoint to verify app-to-db connection.
- Ensured `.env` secrets are fully gitignored and established `.env.example`.

**Reason:** 
- The project is entering the Database phase. We needed a strong foundation with PostgreSQL without duplicating or modifying the existing Firebase Authentication flow.

**Evidence/results:** 
- The backend accepts `DATABASE_URL`. SQLAlchemy can connect to PostgreSQL using `psycopg2-binary`. The migration system (Alembic) is fully prepared to create the `users`, `reports`, and `item_instances` tables.

**Next action:** 
- User to start the local Docker PostgreSQL container or provide production DB connection strings, and run `alembic upgrade head` to run initial schema migration. After that, expand schema mapping for match persistence, category tables, and eventual pgvector setup.
