# AI ResumeScreen: Hire Smarter. Faster. Fairer.

AI resume screening and candidate shortlisting dashboard (human-in-the-loop).

| Part | Folder | Tech | Deploy to |
|---|---|---|---|
| Frontend | `frontend/` | React + Vite + TypeScript + Tailwind + Recharts | Vercel |
| Backend API | `backend/` | Node.js + Express | Render |
| Database | `supabase/migration.sql` | PostgreSQL | Supabase |
| Resume files | bucket `resumes` | Supabase Storage (private) | Supabase |

No external AI API is used. The analyzer (`backend/engine.js`) does skill extraction, synonym and related-skill matching, and weighted scoring (required 60 / preferred 15 / experience 15 / education 10, configurable in the app). Sensitive attributes are never used.

## Demo data and login
- Demo HR login: **hr@demo.com / demo123** (change with `DEMO_EMAIL` / `DEMO_PASSWORD`).
- On first start the backend creates the tables, the demo user, 5 jobs (AI Engineer, Data Scientist, Python Developer, ML Engineer, Data Analyst) and 7 sample candidates, already analyzed.
- AI Engineer samples: Aarav Mehta 88% APPROVE, Priya Nair 77% REVIEW, Sarah Sharma 64% REVIEW, Rahul Singh 45% REJECT, Kunal Verma (web developer) 22% REJECT.
- **Reset demo data** (top bar) restores them at any time.
- `sample-resumes/` has real PDF and DOCX files to upload live: strong (about 91% APPROVE), average (about 64% REVIEW), web developer (about 8% REJECT), against the AI Engineer job.

## 1. Run locally
You need Node 18+ and a Supabase project (or any Postgres) for `DATABASE_URL`.
```bash
cd backend  && npm install && cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
npm start                                            # http://localhost:4000

cd frontend && npm install && cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev                                          # http://localhost:5173
```
Other commands: `npm run build`, `npm run preview` (frontend); `npm run test:e2e` (backend; starts a throwaway Postgres and tests the whole workflow).

## 2. GitHub
```bash
git init && git add . && git commit -m "AI ResumeScreen"
git branch -M main
git remote add origin https://github.com/YOUR_USER/ai-resumescreen.git
git push -u origin main
```
Push the whole repository (both `frontend/` and `backend/`, plus `supabase/`, `sample-resumes/`, `render.yaml`, `README.md`, `.env.example` files). `.gitignore` already keeps `node_modules` and `.env` out. Never commit real keys.

## 3. Supabase
1. supabase.com > New project. Save the **database password**.
2. **SQL Editor** > New query > paste `supabase/migration.sql` > Run. (The backend also runs this file on startup, so this step is optional but recommended.)
3. **Project Settings > Database > Connection string > URI**: copy it into `DATABASE_URL`. On Render use the **Session pooler** string (port 5432), replacing `[YOUR-PASSWORD]`.
4. **Project Settings > API**: copy the Project URL (`SUPABASE_URL`), the `anon` key (`SUPABASE_ANON_KEY`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`).
5. **Storage > New bucket**: name `resumes`, keep it **private**. Uploaded resumes are saved here (the file path is stored in `candidates.storage_path`). If the Storage variables are missing, uploads still work and the extracted text is stored in the database.

Tables: `users, jobs, candidates, analysis_results, hr_decisions, settings`. The AI recommendation (`analysis_results`) and the HR decision (`hr_decisions`) are stored separately. Row Level Security is on for all tables; only the backend can read them.

## 4. Render (backend)
1. render.com > New > **Web Service** > connect the GitHub repo.
2. Root Directory `backend` | Build Command `npm install` | Start Command `npm start` | Health Check Path `/health`. (Or use New > Blueprint with the included `render.yaml`.)
3. Add the environment variables in section 6.
4. Deploy, then open `https://YOUR-API.onrender.com/health`. It should return `{"ok":true,...}`. Copy this URL.

The server listens on `process.env.PORT` and `0.0.0.0`. On the free plan the service sleeps when idle, so the first request can take about a minute: open `/health` before your demo.

## 5. Vercel (frontend)
1. vercel.com > Add New > Project > import the repo.
2. Root Directory `frontend` (Framework: Vite, Build `npm run build`, Output `dist`).
3. Environment Variable `VITE_API_URL` = your Render URL (no trailing slash). Deploy.
4. Copy your Vercel URL (for example `https://ai-resumescreen.vercel.app`).
5. Go back to Render and set `CORS_ORIGINS` to that Vercel URL (no trailing slash). Render redeploys. Set `ALLOW_VERCEL_PREVIEWS=true` if you also want preview URLs to work.

`VITE_API_URL` is read at build time. If you change it, redeploy the frontend.

## 6. Environment variables
| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | Vercel | Backend URL used for all API calls |
| `DATABASE_URL` | Render | Supabase Postgres connection string |
| `SUPABASE_URL` | Render | Project URL (Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Render | Server-side Storage access. **Secret, never in the frontend** |
| `SUPABASE_ANON_KEY` | Render (optional) | Reserved. The backend does not need it |
| `SUPABASE_BUCKET` | Render | Bucket name, default `resumes` |
| `JWT_SECRET` | Render | Long random string that signs login tokens |
| `CORS_ORIGINS` | Render | Allowed frontend origin(s), comma separated |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Render (optional) | Demo HR login |
| `PORT` | Render (automatic) | Set by Render |

## 7. Test the deployed app
1. Open the Render `/health` URL: `ok: true`.
2. Open the Vercel URL and log in with hr@demo.com / demo123. The dashboard shows 7 resumes and the charts.
3. **Jobs > New job**: create "AI Engineer" with the required and preferred skills, then Save job.
4. **Upload resumes**: select the job, drop `sample-resumes/strong_ai_engineer_maya_rao.pdf`, click **Analyze**. You see the score, recommendation, matched and missing skills, and the "why" reasons.
5. Click **Approve** or **Reject**. The status updates immediately and the **Dashboard** counts change.
6. In Supabase **Table Editor**, `hr_decisions` has the new row and the `resumes` bucket has the uploaded file.
7. **Demo mode** jumps to a strong (APPROVE), average (REVIEW) and weak (REJECT) candidate.

Troubleshooting: "Cannot reach the server" means the Render service is waking up (wait and retry) or `VITE_API_URL` is wrong. A browser CORS error means `CORS_ORIGINS` does not exactly match the Vercel URL. A database error at startup usually means a wrong `DATABASE_URL` or password.

## Ethics
The AI gives a recommendation from job-related qualifications only. Final decisions stay with HR, scores are explainable, and bias monitoring is recommended. See the in-app "AI fairness & transparency" page.
