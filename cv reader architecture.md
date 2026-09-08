# Smart Talent Screening & Matcher — Module Architecture

Branch = module. 90 min total.

| Module | Branch | Time | Deliverable |
|---|---|---|---|
| 0 | `main` | 10m | Env setup, cred verify |
| 1 | `feature/fastapi-groq-matcher` | 25m | AI engine (FastAPI + Groq) |
| 2 | `feature/node-supabase-storage` | 20m | Gateway (Node + Supabase) |
| 3 | `feature/react-recruiter-ui` | 20m | Dashboard (React/Next) |
| 4 | `release/v1-cloud-deploy` | 15m | Live deploy |

---

## Module 0 — Environment Setup (`main`) — 10m

Purpose: prep repo, verify creds before feature code starts.

Steps:
1. `git init`, `.gitignore` → `node_modules`, `.env`, `__pycache__`, `venv`, `.next`
2. Confirm Claude Code CLI runs
3. Grab Supabase URL + service key, Groq API key → local `.env` (never commit)
4. Ping script (Node or Python): hit Supabase (`select 1`) + Groq (minimal chat completion) → confirm both reachable
5. Commit direct to `main` — only stage this is allowed, no feature branch exists yet

---

## Module 1 — FastAPI + Groq Matcher (`feature/fastapi-groq-matcher`) — 25m

Purpose: standalone AI microservice. Resume + JD in → structured match analysis out.

Folder:
```
/ai-engine
  main.py          # FastAPI app, /analyze route
  schemas.py       # Pydantic models
  groq_client.py   # Groq API wrapper
  prompts.py       # prompt template builder
  requirements.txt
  .env             # GROQ_API_KEY
```

Schema (`schemas.py`):
```python
class MatchResult(BaseModel):
    match_score: int          # 0-100
    seniority_level: str
    years_experience: float
    technical_skills: list[str]
    strengths: list[str]
    gaps: list[str]
    interview_questions: list[str]  # exactly 3
```

Endpoint: `POST /analyze` — body `{resume_text, job_description}` → returns `MatchResult`

Flow: resume+JD → build prompt (system msg: "return JSON per schema, nothing else") → Groq `chat.completions.create` (model=`llama-3.3-70b-versatile`, `response_format=json_object`) → parse → validate against `MatchResult` → on validation fail, retry once with stricter prompt → return JSON.

Git:
```bash
git checkout -b feature/fastapi-groq-matcher
# build, test locally:
curl -X POST localhost:8000/analyze -d '{"resume_text":"...","job_description":"..."}'
git add . && git commit -m "fastapi groq matcher"
```
Push / PR / merge to `main`: manual.

---

## Module 2 — Node + Supabase Storage (`feature/node-supabase-storage`) — 20m

Purpose: gateway. Persist candidate + resume file, call AI engine, store result.

Folder:
```
/gateway
  index.js
  routes/candidates.js
  lib/supabaseClient.js
  lib/aiEngineClient.js   # calls FastAPI /analyze
  .env                    # SUPABASE_URL, SUPABASE_KEY, AI_ENGINE_URL
```

Supabase:
- Storage bucket: `resumes`
- Table `candidates`:
```sql
id uuid primary key default gen_random_uuid(),
name text,
email text,
resume_url text,
job_description text,
match_score int,
seniority_level text,
skills jsonb,
strengths jsonb,
gaps jsonb,
interview_questions jsonb,
status text default 'pending',  -- pending | shortlisted | rejected
created_at timestamptz default now()
```

Endpoints:
- `POST /candidates` — multipart (resume file + JD text) → upload to `resumes` bucket → call FastAPI `/analyze` → insert row → return candidate
- `GET /candidates` — list, sorted by `match_score` desc
- `GET /candidates/:id` — full detail
- `PATCH /candidates/:id` — body `{status}` → shortlist/reject

Flow: React → Node `POST /candidates` → [Supabase Storage upload] + [FastAPI `/analyze` call] → Supabase DB insert → response to React.

Git:
```bash
git checkout main   # after module 1 merged manually
git checkout -b feature/node-supabase-storage
git add . && git commit -m "node supabase storage"
```
Push / PR / merge to `main`: manual.

---

## Module 3 — React Recruiter UI (`feature/react-recruiter-ui`) — 20m

Purpose: hiring-manager dashboard + upload form.

Folder (Next.js, app router):
```
/app
  page.tsx                 # dashboard: candidate table
  upload/page.tsx          # resume+JD ingestion form
  components/
    CandidateTable.tsx
    ScoreBadge.tsx          # green/yellow/red
    CandidateDrawer.tsx     # detail + shortlist/reject
    UploadForm.tsx
  lib/api.ts                # fetch wrapper -> Node gateway (not FastAPI directly)
```

Flow: dashboard loads → `GET /candidates` (Node) → render table, `ScoreBadge` (≥80 green, 50–79 yellow, <50 red) → click row → `CandidateDrawer` — resume link, strengths/gaps/questions, shortlist/reject buttons → `PATCH /candidates/:id`.

Upload form → file input + JD textarea → `POST /candidates` multipart → on success, refresh table.

Angular→React quick map, since your base is Angular:
- Component = function returning JSX, no template/decorator split
- State: `useState`/`useEffect`, not RxJS/services
- Props instead of `@Input`
- No DI — just import + call

Git:
```bash
git checkout main   # after module 2 merged manually
git checkout -b feature/react-recruiter-ui
git add . && git commit -m "react recruiter ui"
```
Push / PR / merge to `main`: manual.

---

## Module 4 — Cloud Deploy (`release/v1-cloud-deploy`) — 15m

Purpose: ship all 3 services live, wired together.

Targets:
- FastAPI → Render / Railway
- Node gateway → Railway / Render
- React/Next → Vercel

Env vars:
- FastAPI: `GROQ_API_KEY`
- Node: `SUPABASE_URL`, `SUPABASE_KEY`, `AI_ENGINE_URL` (live FastAPI URL)
- React: `NEXT_PUBLIC_API_URL` (live Node gateway URL)

CORS:
- FastAPI: allow Node's live URL
- Node: allow Vercel's live domain

Final: live test payload end-to-end with evaluator (upload → score → dashboard → shortlist).

Git:
```bash
git checkout main   # after module 3 merged manually
git checkout -b release/v1-cloud-deploy
# deploy configs, env setup
git commit -m "cloud deploy config"
```
Push / merge into `main`: manual, after live verify.

---

## Antigravity Workflow & Prompts

Repo: https://github.com/rsshhll/ai-cv-reader-.git

Rule for every module: agent builds + commits on its feature branch, pushes that branch to origin. It never merges into `main`, never pushes to `main`. You review + merge each PR manually on GitHub.

### Setup in Antigravity
1. Open Antigravity, pick **Agent-Assisted Development** mode (not Autopilot) — you approve each step.
2. Terminal Policy: Agent Decides is fine — the hard rules in the prompt block main anyway.
3. Let the agent clone the repo itself (Prompt 1 does this) or `File > Open Folder` after cloning it yourself.
4. Paste **Prompt 1** to kick off Module 1. After you merge PR #1 on GitHub, paste **Prompt 2**. Repeat through Module 4.

### Prompt 1 — Setup + Module 1 (FastAPI + Groq Matcher)
```
Repo: https://github.com/rsshhll/ai-cv-reader-.git

Hard rules — do not break these:
- Never commit or push directly to `main`. Do not merge any branch into `main`. I will review and merge PRs myself on GitHub.
- Never commit secrets (.env, API keys, Supabase keys) to git. Add .env to .gitignore first.
- All work happens on feature branches only.

Task:
1. Clone the repo if not already local. Check current branches and confirm `main` exists.
2. Create and check out branch `feature/fastapi-groq-matcher` from latest `main`.
3. Build a standalone FastAPI microservice at /ai-engine:
   - main.py: FastAPI app with POST /analyze endpoint
   - schemas.py: Pydantic model MatchResult with fields: match_score (int 0-100), seniority_level (str), years_experience (float), technical_skills (list[str]), strengths (list[str]), gaps (list[str]), interview_questions (list[str], exactly 3)
   - groq_client.py: wrapper around Groq API using model "llama-3.3-70b-versatile"
   - prompts.py: builds a prompt instructing the model to return only JSON matching the schema
   - requirements.txt with fastapi, uvicorn, pydantic, groq, python-dotenv
   - .env.example (no real key) showing GROQ_API_KEY is required
4. POST /analyze takes {resume_text, job_description}, calls Groq, validates response against MatchResult, retries once on validation failure, returns the validated JSON.
5. Test locally with a sample resume + JD via curl and show me the output.
6. Commit with a clear message, push the branch to origin. Do NOT open a PR or touch main — stop here and tell me it's ready for me to review and merge.
```

### Prompt 2 — Module 2 (Node + Supabase Storage)
*paste after PR #1 is merged*
```
Same hard rules as before: never touch `main` directly, never commit secrets, feature branches only.

1. Pull latest `main` (confirm PR #1 is merged first).
2. Create and check out branch `feature/node-supabase-storage` from updated `main`.
3. Build a Node.js gateway at /gateway:
   - index.js, routes/candidates.js, lib/supabaseClient.js, lib/aiEngineClient.js (calls the FastAPI /analyze service)
   - .env.example listing SUPABASE_URL, SUPABASE_KEY, AI_ENGINE_URL
4. Set up Supabase: storage bucket "resumes", and a `candidates` table with columns: id (uuid pk), name, email, resume_url, job_description, match_score, seniority_level, skills (jsonb), strengths (jsonb), gaps (jsonb), interview_questions (jsonb), status (default 'pending'), created_at. Write the SQL migration file — don't run it against production, just generate and show me.
5. Endpoints: POST /candidates (multipart resume+JD → upload to storage → call FastAPI /analyze → insert row), GET /candidates, GET /candidates/:id, PATCH /candidates/:id (status).
6. Test locally against the FastAPI service from module 1.
7. Commit, push the branch to origin. Do not merge or touch main — stop and tell me it's ready for review.
```

### Prompt 3 — Module 3 (React Recruiter UI)
*paste after PR #2 is merged*
```
Same hard rules: never touch `main` directly, feature branches only, no secrets committed.

1. Pull latest `main` (confirm PR #2 merged).
2. Create and check out branch `feature/react-recruiter-ui`.
3. Build a Next.js app (app router) that talks only to the Node gateway, never FastAPI directly:
   - page.tsx: dashboard listing candidates from GET /candidates, with a ScoreBadge component (green ≥80, yellow 50-79, red <50)
   - upload/page.tsx or modal: resume file + JD text form, POSTs to /candidates
   - CandidateDrawer component: resume link + AI breakdown (strengths, gaps, interview questions), Shortlist/Reject buttons calling PATCH /candidates/:id
   - lib/api.ts: fetch wrapper pointed at an env var for the gateway URL
4. Keep components as plain functional components with hooks (useState/useEffect) — I'm coming from Angular, so favor plain fetch over heavy state libraries.
5. Test against the Node gateway locally.
6. Commit, push the branch to origin. Do not merge or touch main — stop for my review.
```

### Prompt 4 — Module 4 (Cloud Deploy)
*paste after PR #3 is merged*
```
Same hard rules: never touch `main` directly.

1. Pull latest `main` (confirm PR #3 merged).
2. Create and check out branch `release/v1-cloud-deploy`.
3. Add deployment configs for: FastAPI service (Render or Railway), Node gateway (Railway or Render), Next.js app (Vercel).
4. Document required env vars per service: FastAPI (GROQ_API_KEY), Node (SUPABASE_URL, SUPABASE_KEY, AI_ENGINE_URL), React (NEXT_PUBLIC_API_URL).
5. Add CORS config: FastAPI allows the Node gateway's deployed URL, Node allows the Vercel deployed URL.
6. Commit, push the branch to origin. Do not merge or touch main — I'll deploy and merge manually.
```
