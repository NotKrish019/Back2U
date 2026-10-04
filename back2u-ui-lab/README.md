# Back2U UI Lab

This is an isolated frontend prototype. It does not connect to the Back2U backend, database, or ML system.

## Purpose
This project is a UI redesign and design lab for the Back2U application. It serves as a practice/design demo to evaluate a modern, premium, and sophisticated user experience. Everything in this project is mock data to ensure that we can rapidly iterate on the visual hierarchy, layouts, animations, and typography without worrying about backend architecture or machine learning inference.

## How to Install
1. Ensure you have Node.js installed.
2. Run `npm install` inside the `back2u-ui-lab` folder.

## How to Run
Run the development server on its dedicated port:
```bash
npm run dev
```

## Localhost Port
This project runs explicitly on **http://localhost:3001** to avoid conflicting with the existing Back2U application.

## Mock Data Only Nature
This is strictly a frontend/design prototype. 
- NO REAL BACKEND
- **CONNECTED TO REAL DATABASE (PostgreSQL)**
- **CONNECTED TO REAL BACKEND (FastAPI)**
- **CONNECTED TO REAL AUTH (Firebase)**

The mock service layer and all static mock data are located in `src/data/mockData.ts`.

## Pages Included
- **Home / Landing** (`/`)
- **Search** (`/search`)
- **Search Results** (`/search/results`)
- **Item Detail** (`/item/[id]`)
- **Report Lost** (`/report/lost`)
- **Report Found** (`/report/found`)
- **My Reports** (`/reports`)
- **Matches / Claim** (`/matches`)
- **Notifications** (`/notifications`)
- **Profile** (`/profile`)
- **Support / FAQ** (`/support`)

## Migration Notes
This frontend has successfully been migrated and is now integrated with the main Back2U application backend, database, and authentication systems.

- The original `src/data/mockData.ts` has been removed and replaced with actual API calls in `src/services/api.ts`.
- Real Firebase authentication is fully integrated (`src/lib/firebase`).
- Claim submission, search, and staff dashboards operate against the live PostgreSQL database.
