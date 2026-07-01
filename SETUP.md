# GetDeveloper MVP Setup Guide (No Auth Version)

## Architecture
- **Backend**: FastAPI proxy (serves frontend + forwards to n8n)
- **n8n Cloud**: Workflow engine (Drive sync + AI matching)
- **MongoDB Atlas**: Vector database (resumes + embeddings)
- **OpenAI**: Embeddings + explanations

NO backend auth. User connects Drive via n8n OAuth directly.

---

## Accounts Needed

### 1. MongoDB Atlas
- https://mongodb.com/atlas
- Free M0 cluster
- Create user: read/write any database
- Allow IP: 0.0.0.0/0
- Save connection string
- Create Vector Search Index:
  - Database: getdeveloper
  - Collection: resumes
  - Index name: resume_vector_index
  - Path: embedding
  - Dimensions: 1536
  - Similarity: cosine

### 2. OpenAI
- https://platform.openai.com/api-keys
- Add $5 credit
- Create API key

### 3. n8n Cloud
- https://n8n.io/cloud
- Sign up for free trial / paid plan
- You will get a URL like: `https://username.n8n.cloud`
- Save this URL — you need it in backend/.env

### 4. Google Cloud Console (for n8n Drive OAuth)
- https://console.cloud.google.com
- New project: getdeveloper-mvp
- Enable APIs: Google Drive API
- Credentials -> OAuth Client ID -> Web application
- Authorized redirect URI: `https://username.n8n.cloud/rest/oauth2-credential/callback`
  (Replace username with your actual n8n cloud subdomain)
- Save Client ID + Client Secret
- Add these to n8n Google Drive OAuth credentials (inside n8n cloud UI)

---

## n8n Workflows

### Workflow 1: Drive Sync
Trigger: Webhook POST /webhook/drive-sync

Steps:
1. Webhook (POST, path: drive-sync)
2. Google Drive node (list files, filter: PDF)
3. Loop through files
4. Download each PDF
5. Parse PDF to text (Code node or HTTP to Tika)
6. OpenAI: Create embedding (text-embedding-3-small)
7. MongoDB: Insert/Update (upsert by drive_file_id)
   - Document fields: drive_file_id, filename, parsed_text, embedding, file_meta

### Workflow 2: Match Candidates
Trigger: Webhook POST /webhook/match-candidates

Steps:
1. Webhook (POST, path: match-candidates)
2. OpenAI: Create embedding for JD
3. MongoDB: Vector Search (aggregate with $vectorSearch)
   - Index: resume_vector_index
   - Path: embedding
   - queryVector: JD embedding
   - limit: 20
4. Format candidates for LLM
5. OpenAI Chat: Generate match scores + explanations (JSON mode)
   - System: "Return JSON array with: drive_file_id, filename, match_score, skills_match, experience_match, domain_fit, explanation, strengths, gaps"
6. Respond to Webhook: return JSON

---

## Backend Setup

1. Copy backend/.env.example to backend/.env
2. Fill your n8n cloud URL:
   ```
   N8N_BASE_URL=https://username.n8n.cloud
   N8N_WEBHOOK_SYNC=/webhook/drive-sync
   N8N_WEBHOOK_MATCH=/webhook/match-candidates
   ```
3. Install:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. Run:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Test: http://localhost:8000/health

---

## Frontend

Open frontend HTML files directly or via Live Server.
- recruiter-search.html: Paste JD, click "Sync Drive", click "Run AI Match"
- recruiter-results.html: Shows ranked candidates

No login required.