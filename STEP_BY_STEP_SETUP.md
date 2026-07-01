# GetDeveloper MVP — Step by Step Account Setup
## Follow karo ek-ek karke. Koi step skip mat karna.

---

## STEP 1: MongoDB Atlas (Database + Vector Search)

**Kahan jana hai:** https://www.mongodb.com/atlas

**Kya karna hai:**

1. Sign up karo (Google se ya email se)
2. "Create New Cluster" pe click karo
3. **M0 (Free Tier)** select karo
4. Cloud Provider: **AWS**
5. Region: **Mumbai (ap-south-1)** ya jo India ke paas ho
6. Cluster name: `i m`
7. Click **Create Deployment** (5-10 minute lagega)

**Database User banana:**
8. Left sidebar → **Database Access**
9. Click **Add New Database User**
10. Authentication: **Password**
11. Username: `getdeveloper_user`
12. Password: Koi strong password banao (save kar lo)
13. Built-in Role: **Read and write to any database**
14. Click **Add User**

**Network Access:**
15. Left sidebar → **Network Access**
16. Click **Add IP Address**
17. Click **Allow Access from Anywhere** → `0.0.0.0/0`
18. Click **Confirm**

**Connection String lena:**
19. Cluster page pe **Connect** button click karo
20. Click **Drivers**
21. Select **Python**
22. Copy connection string (kuch aisa dikhega):
    ```
    mongodb+srv://getdeveloper_user:<db_password>@getdeveloper-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
    ```mongodb+srv://getdeveloper_user:HQp#p3%wcGh!Xyscluster0.7e2cqzx.mongodb.net/?appName=Cluster0
23. `<db_password>` ko apne asli password se replace karo

**VECTOR SEARCH INDEX banana (Bahut zaroori hai):**
24. Atlas UI mein top tabs mein **Search** pe click karo
25. Click **Create Search Index**
26. Select **Atlas Vector Search**
27. Configuration fill karo:
    - Database: `getdeveloper`
    - Collection: `resumes`
    - Index name: `resume_vector_index`
    - Path: `embedding`
    - Dimensions: `1536`
    - Similarity function: `cosine`
28. Click **Create Index**

**✅ SAVE KARO: MongoDB Connection String (password ke saath)**

---

## STEP 2: OpenAI (Embeddings + Explanations)

**Kahan jana hai:** https://platform.openai.com/api-keys

**Kya karna hai:**

1. Sign up / Login karo
2. Top right → **Personal** → **View API Keys**
3. Click **Create new secret key**
4. Name: `getdeveloper-mvp`
5. Click **Create secret key**
6. **Key ko immediately copy karo** (baad mein nahi dikhega)
7. Left sidebar → **Billing** → **Add to credit balance** → $5 daalo

**✅ SAVE KARO: OpenAI API Key (sk-proj-... se start hota hai)**

---

## STEP 3: n8n Cloud (Workflow Engine)

**Kahan jana hai:** https://n8n.io/cloud

**Kya karna hai:**

1. Sign up karo (email + password)
2. Plan select karo (Free trial ya jo budget mein ho)
3. Account create hone ke baad tumhe ek URL milegi:
   ```
   https://username.n8n.cloud
   ```
   (jaise `https://rahul123.n8n.cloud`),https://surya-pratap-singh1.app.n8n.cloud/

**Credentials add karna n8n mein:**
4. n8n Cloud UI open karo
5. Left sidebar → **Settings** (gear icon) → **Credentials**
6. Click **Add Credential**
7. Search karo: **MongoDB**
8. Fill karo:
    - Connection String: (Step 1 wala MongoDB URI)
    - Database: `getdeveloper`
9. Click **Save**

10. Phir se **Add Credential**
11. Search karo: **OpenAI**
12. Fill karo:
    - API Key: (Step 2 wala OpenAI key)
13. Click **Save**

**✅ SAVE KARO: n8n Cloud URL (`https://username.n8n.cloud`)**

---

## STEP 4: Google Cloud Console (Drive OAuth)

**Kahan jana hai:** https://console.cloud.google.com

**Kya karna hai:**

1. Sign in with Google
2. Top bar mein project dropdown → **New Project**
3. Project name: `getdeveloper-mvp`
4. Click **Create**
5. Project create hone ke baad, top bar se woh project select karo

**APIs Enable karna:**
6. Left sidebar → **APIs & Services** → **Library**
7. Search karo: **Google Drive API** → Click → **Enable**
8. Wapas Library → Search karo: **People API** → Click → **Enable**

**OAuth Consent Screen:**
9. Left sidebar → **APIs & Services** → **OAuth consent screen**
10. User Type: **External** → Click **Create**
11. App name: `GetDeveloper MVP`
12. User support email: Apna email daalo
13. Developer contact information: Wahi email daalo
14. Click **Save and Continue** (3 baar, har page pe bas Save)
15. Last page pe **Back to Dashboard**

**OAuth Client ID banana:**
16. Left sidebar → **APIs & Services** → **Credentials**
17. Click **Create Credentials** → **OAuth client ID**
18. Application type: **Web application**
19. Name: `GetDeveloper Web Client`
20. **Authorized redirect URIs** mein ADD karo:
    ```
    https://username.n8n.cloud/rest/oauth2-credential/callback
    ```
    (Yahan `username` ko apna n8n cloud username daalo)
21. Click **Create**
22. Popup aayega → **Client ID** aur **Client Secret** copy karo

**✅ SAVE KARO: Google Client ID + Client Secret**

---

## STEP 5: Google Drive OAuth n8n mein connect karna

**Kahan jana hai:** n8n Cloud UI (`https://username.n8n.cloud`)

**Kya karna hai:**

1. Left sidebar → **Settings** → **Credentials**
2. Click **Add Credential**
3. Search karo: **Google Drive OAuth2 API**
4. Fill karo:
    - Client ID: (Step 4 wala)
    - Client Secret: (Step 4 wala)
    - Scopes: `https://www.googleapis.com/auth/drive.readonly`
5. Click **Sign in with Google**
6. Google login popup aayega → Apna wahi account select karo jisme resumes hain
7. **Allow** karo permissions ko

**✅ Ab n8n ko tumhare Google Drive ka access mil gaya hai.**

---

## STEP 6: n8n Workflow 1 — Drive Sync

**Kya karna hai:** n8n Cloud UI mein new workflow banao

### Workflow Steps:

**1. Trigger: Webhook**
   - Add node → **Webhook**
   - Method: `POST`
   - Path: `drive-sync`
   - Click **Save** → Copy webhook URL (kuch aisa: `https://username.n8n.cloud/webhook/drive-sync`)
https://surya-pratap-singh1.app.n8n.cloud/webhook-test/drive-sync
**2. Google Drive: List Files**
   - Add node → **Google Drive**
   - Operation: `List Files`
   - Query: `mimeType='application/pdf'`
   - Credential: (Jo Step 5 mein connect ki thi)

**3. Split In Batches**
   - Add node → **Split In Batches**
   - Batch Size: `1`

**4. Google Drive: Download File**
   - Add node → **Google Drive**
   - Operation: `Download File`
   - File ID: `{{ $json.id }}`

**5. Code Node: Parse PDF**
   - Add node → **Code**
   - Language: **Python**
   - Code:
   ```python
   import io
   from pypdf import PdfReader

   pdf_bytes = items[0].json['data']
   reader = PdfReader(io.BytesIO(pdf_bytes))
   text = ""
   for page in reader.pages:
       text += page.extract_text() or ""

   return [{
       "json": {
           "drive_file_id": items[0].json.get('id'),
           "filename": items[0].json.get('name'),
           "parsed_text": text[:30000],  # Limit for OpenAI
           "mimeType": items[0].json.get('mimeType'),
           "modifiedTime": items[0].json.get('modifiedTime')
       }
   }]
   ```

**6. OpenAI: Create Embedding**
   - Add node → **OpenAI**
   - Operation: `Create Embedding`
   - Model: `text-embedding-3-small`
   - Input: `{{ $json.parsed_text }}`
   - Credential: (Step 3 wali)

**7. MongoDB: Insert/Update**
   - Add node → **MongoDB**
   - Operation: `Insert/Update`
   - Collection: `resumes`
   - Document:
     ```json
     {
       "drive_file_id": "={{ $json.drive_file_id }}",
       "filename": "={{ $json.filename }}",
       "parsed_text": "={{ $json.parsed_text }}",
       "embedding": "={{ $('OpenAI').item.json.embedding }}",
       "file_meta": {
         "mime_type": "={{ $json.mimeType }}",
         "drive_modified_time": "={{ $json.modifiedTime }}"
       },
       "updated_at": "={{ $now }}"
     }
     ```
   - Upsert: `true`
   - Update Key: `drive_file_id`

**8. Respond to Webhook**
   - Add node → **Respond to Webhook**
   - Status Code: `200`
   - Response Body:
     ```json
     {"synced": "success", "file": "={{ $json.filename }}"}
     ```

**9. Workflow ko Activate karo** (top right toggle)

---

## STEP 7: n8n Workflow 2 — Match Candidates

**Kya karna hai:** n8n Cloud UI mein doosra workflow banao

### Workflow Steps:

**1. Trigger: Webhook**
   - Add node → **Webhook**
   - Method: `POST`
   - Path: `match-candidates`
   - Click **Save** → Copy webhook URL

**2. OpenAI: Create Embedding**
   - Add node → **OpenAI**
   - Operation: `Create Embedding`
   - Model: `text-embedding-3-small`
   - Input: `{{ $('Webhook').item.json.jd }}`

**3. MongoDB: Aggregate**
   - Add node → **MongoDB**
   - Operation: `Aggregate`
   - Collection: `resumes`
   - Aggregation Pipeline (JSON):
     ```json
     [
       {
         "$vectorSearch": {
           "index": "resume_vector_index",
           "path": "embedding",
           "queryVector": "={{ $('OpenAI').item.json.embedding }}",
           "numCandidates": 100,
           "limit": 20
         }
       }
     ]
     ```

**4. Code Node: Format for LLM**
   - Add node → **Code**
   - Language: **JavaScript**
   - Code:
   ```javascript
   const candidates = $input.all()[0].json;
   const formatted = candidates.map((c, i) => 
     `Candidate ${i+1}:\nFile: ${c.filename}\nText: ${c.parsed_text?.substring(0, 1200) || ''}`
   ).join('\n\n---\n\n');

   return [{
     json: {
       candidates_text: formatted,
       candidate_list: candidates
     }
   }];
   ```

**5. OpenAI: Send Message (JSON Mode)**
   - Add node → **OpenAI**
   - Operation: `Send Message`
   - Model: `gpt-4o-mini`
   - System Prompt:
     ```
     You are a recruiter AI. Given a job description and candidate profiles, return a STRICT JSON array.
     Each item must have these exact fields:
     - drive_file_id (string)
     - filename (string)
     - match_score (number 0-100)
     - skills_match (number 0-100)
     - experience_match (number 0-100)
     - domain_fit (number 0-100)
     - explanation (string, 2 sentences max)
     - strengths (array of strings)
     - gaps (array of strings)
     ```
   - User Message:
     ```
     Job Description:
     {{ $('Webhook').item.json.jd }}

     Candidates:
     {{ $json.candidates_text }}
     ```
   - JSON Output: `true`

**6. Respond to Webhook**
   - Add node → **Respond to Webhook**
   - Status Code: `200`
   - Response Body: `{{ $json }}`

**7. Workflow ko Activate karo**

---

## STEP 8: Backend Setup & Start

**Kya karna hai:**

1. Project folder mein jao → `backend` folder
2. `.env.example` ko copy kar ke `.env` banao
3. `.env` mein sirf yeh fill karo:
   ```env
   N8N_BASE_URL=https://username.n8n.cloud
   N8N_WEBHOOK_SYNC=/webhook/drive-sync
   N8N_WEBHOOK_MATCH=/webhook/match-candidates
   PORT=8000
   ```
4. Terminal open karo:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
5. Browser mein check karo: http://localhost:8000/health
   - Response: `{"status":"ok"}`

---

## STEP 9: Frontend Use Karna

1. `recruiter-search.html` ko browser mein khol do (Live Server ya directly)
2. **Sync Drive** button click karo → n8n workflow trigger hoga
3. Wait for sync (pehli baar thoda time lagega)
4. Job Description paste karo
5. **Run AI Match** click karo → Results page pe ranked candidates dikhenge

---

## Credential Summary Table

| # | Credential | Kahan Se Mila | Kahan Use Hoga |
|---|-----------|---------------|----------------|
| 1 | MongoDB Connection String | MongoDB Atlas (Step 1) | n8n MongoDB node mein |
| 2 | OpenAI API Key | OpenAI Platform (Step 2) | n8n OpenAI node mein |
| 3 | n8n Cloud URL | n8n Cloud (Step 3) | backend/.env mein |
| 4 | Google Client ID | Google Cloud Console (Step 4) | n8n Google Drive OAuth mein |
| 5 | Google Client Secret | Google Cloud Console (Step 4) | n8n Google Drive OAuth mein |

---

**Koi bhi step mein problem aaye → Screenshot bhejo. Main turant help karunga.**










[Google OAuth credentials removed for security]