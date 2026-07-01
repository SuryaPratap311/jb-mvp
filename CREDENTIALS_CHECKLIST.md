# CREDENTIALS CHECKLIST — Kahan Kya Daalna Hai

## 1. n8n Cloud (Already Done)

**Kahan:** https://surya-pratap-singh1.app.n8n.cloud

### Credentials Tab (Settings → Credentials)

| # | Credential Name | Type | Status |
|---|----------------|------|--------|
| 1 | **Google Drive account** | Google Drive OAuth2 API | Connect kar diya hai |
| 2 | **OpenAI account** | OpenAI | API key daali hai |
| 3 | **MongoDB account** | MongoDB | Connection string daali hai |

**Kaam complete hai — bas workflows mein select karni hain.**

---

## 2. Workflows Mein Credentials Kahan Lagani Hai

### Workflow 1: Drive Sync

| Node | Credential Select Karo | Kahan Milegi |
|------|----------------------|--------------|
| Google Drive - Search Files | `Google Drive account` | Dropdown mein |
| Google Drive - Download File | `Google Drive account` | Dropdown mein |
| OpenAI - Create Embedding | `OpenAI account` | Dropdown mein |
| MongoDB - Insert Update | `MongoDB account` | Dropdown mein |

### Workflow 2: Match Candidates

| Node | Credential Select Karo | Kahan Milegi |
|------|----------------------|--------------|
| OpenAI - Embed JD | `OpenAI account` | Dropdown mein |
| MongoDB - Vector Search | `MongoDB account` | Dropdown mein |
| OpenAI - Generate Scores | `OpenAI account` | Dropdown mein |

**Kaam:** Har node pe click karo → Credential dropdown mein apni credential select karo → Save.

---

## 3. Backend .env File

**File:** `backend/.env` (`.env.example` se copy karke banao)

```env
N8N_BASE_URL=https://surya-pratap-singh1.app.n8n.cloud
N8N_WEBHOOK_SYNC=/webhook/drive-sync
N8N_WEBHOOK_MATCH=/webhook/match-candidates
PORT=8000
FRONTEND_URL=*
```

**Kahan daalni hai:** `C:\Users\Admin\job-search-MVP\backend\.env`

---

## 4. MongoDB Atlas (Already Done)

**Check karo:**
- [ ] Cluster ban gaya: `getdeveloper-cluster`
- [ ] Database user: `n8n_user` (ya jo bhi banaya tha)
- [ ] Network Access: `0.0.0.0/0`
- [ ] Vector Search Index: `resume_vector_index` (path: `embedding`, dimensions: `1536`, similarity: `cosine`)

---

## 5. OpenAI (Already Done)

**Check karo:**
- [ ] Account: https://platform.openai.com
- [ ] API key banayi hai
- [ ] $5 credit add kiya hai

---

## 6. Google Cloud Console (Already Done)

**Check karo:**
- [ ] Project: `getdeveloper-mvp`
- [ ] APIs enabled: Google Drive API, People API
- [ ] OAuth Client ID banaya hai
- [ ] Redirect URI: `https://oauth.n8n.cloud/oauth2/callback`

---

## 7. Webhook URLs Summary

| Workflow | Test URL (for testing) | Production URL (for backend) |
|----------|----------------------|------------------------------|
| Drive Sync | `https://surya-pratap-singh1.app.n8n.cloud/webhook-test/drive-sync` | `https://surya-pratap-singh1.app.n8n.cloud/webhook/drive-sync` |
| Match Candidates | `https://surya-pratap-singh1.app.n8n.cloud/webhook-test/match-candidates` | `https://surya-pratap-singh1.app.n8n.cloud/webhook/match-candidates` |

**Backend production URL use karta hai.**

---

## 8. Backend Start Karne Ka Command

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Test:** http://localhost:8000/health → `{"status":"ok"}`

---

## Summary: Ab Kya Karna Hai

1. **Workflows import karo** (2 JSON files)
2. **Har node pe credential select karo**
3. **Save & Activate** both workflows
4. **backend/.env** banao (upar diya hua content)
5. **Backend chalao**: `uvicorn app.main:app --reload --port 8000`
6. **Frontend open karo**: `recruiter-search.html`
7. **Sync Drive** → **Paste JD** → **Run Match**

**Koi bhi step mein problem aaye toh screenshot bhejo.**