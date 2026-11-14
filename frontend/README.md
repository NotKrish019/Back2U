# Back2U Frontend

The Next.js 14 (App Router) web app for Back2U. It talks to the FastAPI backend at
`http://127.0.0.1:8000/api/v1` and uses Firebase Authentication for login.

## Run

```bash
cp .env.example .env.local   # fill in the Firebase web config (skip if .env.local already exists)
npm install
npm run dev                  # http://localhost:3000
```

`npm run build && npm start` runs a production build.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page: hero, how it works, research section |
| `/login` | Sign in / sign up (Firebase email or phone) |
| `/report/lost`, `/report/found` | File a lost or found report with photo, description, location and date |
| `/search` | Search by photo, text, or both; shows ranked matches from the ML pipeline |
| `/browse` | Public list of open reports |
| `/item/[id]`, `/item/[id]/compare` | Item detail and side-by-side comparison with a candidate match |
| `/reports`, `/reports/[id]` | The signed-in user's reports and their match status |
| `/matches` | Candidate matches and claim submission |
| `/map` | Campus hotspots with active reports |
| `/staff`, `/staff/login` | Staff dashboard: review candidate matches and approve/reject claims |
| `/notifications`, `/profile`, `/settings`, `/support`, `/privacy`, `/terms` | Account, help and legal pages |

## Structure

```
src/
├── app/            # routes (one folder per page)
├── components/     # page sections (hero, navigation, result card, ...)
│   └── ui/         # reusable UI pieces (buttons, footer, animations)
├── lib/firebase/   # Firebase config, auth service, AuthContext
└── services/api.ts # typed client for the backend REST API
public/             # images, icons and animation assets
```

Tech: Next.js 14, React 18, TypeScript, Tailwind CSS 4, Framer Motion, GSAP, Firebase JS SDK, Lucide icons.
