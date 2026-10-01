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
- NO REAL DATABASE
- NO REAL ML
- NO SUPABASE / FIREBASE CONNECTION

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

## Future Integration Notes
The eventual plan is to integrate this UI with the main Back2U application backend, database, and ML inference engines.
When doing so:
- Replace `src/data/mockData.ts` functions with actual API calls.
- Integrate real user authentication (e.g., Firebase).
- Feed real model inferences into the Candidate Match states.
- Connect form submissions to the real PostgreSQL/Supabase database.
