# GetDeveloper MVP — User Flow (Step by Step)

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Recruiter visits website                           │
│  URL: http://localhost:8000/recruiter-search.html           │
│                                                             │
│  Sees: "Connect Google Drive" button in nav bar             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Click "Connect Google Drive"                       │
│                                                             │
│  Redirects to: /auth/google                                 │
│  Then to: Google OAuth login page                           │
│                                                             │
│  User enters Google credentials                             │
│  User sees: "GetDeveloper wants to access your Google Drive"│
│  User clicks: "Allow"                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Google redirects back                              │
│  URL: /auth/callback?code=xxx                               │
│                                                             │
│  Backend does:                                              │
│  1. Exchanges code for tokens (access_token + refresh_token)│
│  2. Gets user info (name, email, picture)                   │
│  3. Saves user to MongoDB (with refresh_token)              │
│  4. Sets session cookie in browser                          │
│                                                             │
│  Redirects back to: recruiter-search.html                   │
│                                                             │
│  Nav bar now shows: User name + avatar + "Logout"           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Click "Sync Drive" button                          │
│                                                             │
│  Backend receives: POST /api/drive/sync                     │
│  With: session cookie (identifies user)                     │
│                                                             │
│  Backend does:                                              │
│  1. Gets user's refresh_token from MongoDB                  │
│  2. Sends to n8n webhook: {user_id, refresh_token}          │
│                                                             │
│  n8n does:                                                  │
│  1. Gets new access_token from refresh_token                │
│  2. Lists all PDF files from user's Google Drive            │
│  3. Downloads each PDF                                      │
│  4. Parses PDF to text                                      │
│  5. Generates OpenAI embedding (1536-dim vector)            │
│  6. Saves to MongoDB: resumes collection                    │
│     Document: {user_id, drive_file_id, filename,            │
│                parsed_text, embedding, file_meta}           │
│                                                             │
│  Returns: {synced: 42} (how many resumes synced)            │
│                                                             │
│  Frontend shows: "Synced 42 resumes"                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Paste Job Description (JD)                         │
│                                                             │
│  User types/pastes:                                         │
│  "We need Senior Full-Stack Engineer with Next.js,         │
│   TypeScript, 5+ years experience..."                       │
│                                                             │
│  User clicks: "Run AI Match" button                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: AI Matching happens                                │
│                                                             │
│  Backend receives: POST /api/match                          │
│  Body: {jd: "...", filters: {}}                             │
│                                                             │
│  Backend sends to n8n webhook: {user_id, jd, filters}       │
│                                                             │
│  n8n does:                                                  │
│  1. Generates embedding for the JD text                     │
│  2. MongoDB Vector Search:                                  │
│     "Find resumes whose embedding is similar to JD embedding"│
│     Filter: {user_id: "current_user"}                       │
│     Returns: Top 20 matching resume chunks                  │
│  3. Sends top candidates + JD to OpenAI (gpt-4o-mini)      │
│  4. OpenAI generates for each candidate:                    │
│     - match_score (0-100)                                   │
│     - skills_match (0-100)                                  │
│     - experience_match (0-100)                              │
│     - domain_fit (0-100)                                    │
│     - explanation (2 sentences)                             │
│     - strengths (array)                                     │
│     - gaps (array)                                          │
│  5. Returns ranked JSON array                               │
│                                                             │
│  Backend forwards this JSON to frontend                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Results Page                                       │
│  URL: recruiter-results.html                                │
│                                                             │
│  Shows:                                                     │
│  - JD title                                                 │
│  - Stats: How many scanned, how many matched                │
│  - Ranked candidate cards:                                  │
│    ┌─────────────────────────────────────────────────┐     │
│    │ [94%]  Arun K.                                  │     │
│    │        Why 94% match: Strong Next.js + tRPC... │     │
│    │        Skills: 96% | Experience: 98%           │     │
│    │        [View Resume] [Shortlist]               │     │
│    └─────────────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────────────┐     │
│    │ [91%]  Rohan D.                                 │     │
│    │        Why 91% match: Excellent Postgres...    │     │
│    │        Skills: 90% | Experience: 100%          │     │
│    │        [View Resume] [Shortlist]               │     │
│    └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## What Each Tool Does

| Tool | Role in Flow |
|------|-------------|
| **Frontend (HTML/CSS/JS)** | User interface — forms, buttons, results display |
| **FastAPI Backend** | Auth handler, session manager, n8n proxy |
| **Google OAuth** | User login + Drive permission consent |
| **MongoDB Atlas** | Stores: user profiles, resumes, embeddings, match history |
| **n8n Cloud** | Workflow engine — automates: Drive fetch, parse, embed, match |
| **OpenAI** | Generates embeddings (vectors) + writes match explanations |
| **Google Drive API** | Source of resume PDFs |

---

## Data Flow Diagram (Simple)

```
[Recruiter Browser]
      │
      ├──► [FastAPI Backend] ──► [Google OAuth] (login)
      │                              │
      │                              ▼
      │                        [MongoDB: users collection]
      │                              │
      │◄─────────────────────────────┘ (session cookie set)
      │
      ├──► [FastAPI] ──► [n8n Webhook: drive-sync]
      │                       │
      │                       ├──► [Google Drive API] (fetch PDFs)
      │                       ├──► [PDF Parser] (text extract)
      │                       ├──► [OpenAI] (embeddings)
      │                       └──► [MongoDB: resumes collection]
      │
      ├──► [FastAPI] ──► [n8n Webhook: match-candidates]
      │                       │
      │                       ├──► [OpenAI] (JD embedding)
      │                       ├──► [MongoDB Vector Search] (find matches)
      │                       ├──► [OpenAI] (generate explanations)
      │                       └──► [JSON Results]
      │
      ▼
[Results Page: Ranked candidates]
```

---

## Key Points

1. **Each recruiter sees ONLY their own resumes** — `user_id` filter in every query
2. **No resume data stored in backend** — everything in MongoDB Atlas
3. **n8n does the heavy lifting** — backend just forwards requests
4. **Embeddings = "smart fingerprints"** — OpenAI converts text to 1536 numbers
5. **Vector Search = semantic matching** — finds meaning-wise similar resumes, not just keyword match
6. **Everything can be changed later** — add more filters, change LLM model, add more file types