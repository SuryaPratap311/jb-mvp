# n8n Workflows — Step by Step Guide
## Follow exactly. Har step ka screenshot le lo confusion ke liye.

---

## PART 1: Credentials Add Karna n8n Mein

Pehle 3 credentials add karo. Left sidebar → **Settings** (gear icon) → **Credentials**

---

### Credential 1: MongoDB

1. Click **Add Credential**
2. Search: **MongoDB**
3. Select: **MongoDB**
4. Configuration Type: **Connection String**
5. Connection String paste karo (MongoDB Atlas se jo mila tha):
   ```
   mongodb+srv://n8n_user:PASSWORD@cluster0.xxxxx.mongodb.net/getdeveloper?retryWrites=true&w=majority
   ```
6. Database: `getdeveloper`
7. **Use TLS**: Toggle ON (green) karo
8. Click **Save**
9. Agar error aaye → Password simple banao (sirf letters+numbers), special chars hatao

**✅ MongoDB connected**

---

### Credential 2: OpenAI

1. Click **Add Credential**
2. Search: **OpenAI**
3. Select: **OpenAI**
4. API Key paste karo:
   ```
   sk-proj-xxxxxxxxxxxxxxxx
   ```
5. Click **Save**

**✅ OpenAI connected**

---

### Credential 3: Google Drive OAuth2

1. Click **Add Credential**
2. Search: **Google**
3. Select: **Google Drive OAuth2 API**
4. OAuth Redirect URL dikhega:
   ```
   https://oauth.n8n.cloud/oauth2/callback
   ```
   (Isi ko Google Console mein daala tha na?)
5. Client ID paste karo (Google Console se)
6. Client Secret paste karo (Google Console se)
7. Scopes mein yeh add karo:
   ```
   https://www.googleapis.com/auth/drive.readonly
   ```
8. Click **Sign in with Google**
9. Google popup aayega → Apna account select karo → **Allow**
10. Click **Save**

**✅ Google Drive connected**

---

## PART 2: Workflow 1 — Drive Sync

**Kaam:** User ke Google Drive se PDFs fetch karo → Parse karo → Embedding banao → MongoDB mein save karo

---

### Step 1: New Workflow Banao

1. n8n UI mein left sidebar → **Workflows**
2. Click **Add Workflow**
3. Top right **untitled** pe click karo → Name: `Drive Sync`
4. Press Enter

---

### Step 2: Webhook Node (Trigger)

1. Canvas pe **+** button click karo
2. Search: **Webhook**
3. Select **Webhook**
4. Right panel mein configure karo:
   - **Method**: POST
   - **Path**: `drive-sync`
   - **Response Mode**: Last Node
5. Click **Execute Node** (test ke liye)
6. Copy **Webhook URL** (example: `https://surya-pratap-singh1.app.n8n.cloud/webhook/drive-sync`)
   - Ye URL backend .env mein daalna hai

---

### Step 3: Google Drive — List Files

1. Webhook node ke baad **+** click karo
2. Search: **Google Drive**
3. Select **Google Drive**
4. Configure:
   - **Operation**: List Files
   - **Credential**: (Jo Step 5 mein banayi thi)
   - **Query**: `mimeType='application/pdf'`
   - **Fields**: `id,name,mimeType,modifiedTime,size`
   - **Limit**: `1000`
5. Click **Execute Node**
6. Check karo output mein files aa rahi hain ya nahi

---

### Step 4: Split In Batches (Loop)

1. Google Drive node ke baad **+** click karo
2. Search: **Split In Batches**
3. Select **Split In Batches**
4. Configure:
   - **Batch Size**: `1`
5. Ye har file ko ek-ek karke process karega

---

### Step 5: Google Drive — Download File

1. Split In Batches ke baad **+** click karo
2. Search: **Google Drive**
3. Select **Google Drive**
4. Configure:
   - **Operation**: Download File
   - **Credential**: (Same Google Drive)
   - **File ID**: `{{ $json.id }}`
5. Click **Execute Node**

---

### Step 6: Code Node — Parse PDF

1. Download File node ke baad **+** click karo
2. Search: **Code**
3. Select **Code**
4. Language select karo: **Python**
5. Code paste karo:

```python
import io
from pypdf import PdfReader

# Get binary data from previous node
pdf_bytes = items[0].json['data']

# Parse PDF
reader = PdfReader(io.BytesIO(pdf_bytes))
text = ""
for page in reader.pages:
    page_text = page.extract_text()
    if page_text:
        text += page_text + "\n"

# Return parsed data
return [{
    "json": {
        "drive_file_id": items[0].json.get('id'),
        "filename": items[0].json.get('name'),
        "parsed_text": text[:30000],  # Limit for embedding
        "mime_type": items[0].json.get('mimeType'),
        "modified_time": items[0].json.get('modifiedTime'),
        "file_size": items[0].json.get('size')
    }
}]
```

6. Click **Execute Node**

**⚠️ Agar pypdf error aaye:**
- n8n Cloud mein built-in hota hai, phir bhi error aaye toh JavaScript version use karo:

```javascript
// JavaScript alternative (if Python not available)
const pdfData = items[0].json.data;
// For n8n cloud, you might need to use HTTP Request to Tika instead
return [{
  json: {
    drive_file_id: items[0].json.id,
    filename: items[0].json.name,
    parsed_text: "PDF parsed text will go here",
    mime_type: items[0].json.mimeType,
    modified_time: items[0].json.modifiedTime
  }
}];
```

**Agar parsing mushkil lage → Tika use karo:**
- Code node ke jagah **HTTP Request** node lagao
- Method: POST
- URL: `http://your-tika-server:9998/tika` (ya Docling API)
- Body: Binary file from previous node

---

### Step 7: OpenAI — Create Embedding

1. Code node ke baad **+** click karo
2. Search: **OpenAI**
3. Select **OpenAI**
4. Configure:
   - **Operation**: Create Embedding
   - **Credential**: (Jo OpenAI credential banayi thi)
   - **Model**: `text-embedding-3-small`
   - **Input**: `{{ $json.parsed_text }}`
5. Click **Execute Node**

---

### Step 8: MongoDB — Insert/Update

1. OpenAI node ke baad **+** click karo
2. Search: **MongoDB**
3. Select **MongoDB**
4. Configure:
   - **Operation**: Insert/Update
   - **Credential**: (Jo MongoDB credential banayi thi)
   - **Database**: `getdeveloper`
   - **Collection**: `resumes`
   - **Upsert**: Yes (toggle ON)
   - **Update Key**: `drive_file_id`
   - **Document** (JSON):
     ```json
     {
       "user_id": "={{ $('Webhook').item.json.user_id }}",
       "drive_file_id": "={{ $json.drive_file_id }}",
       "filename": "={{ $json.filename }}",
       "parsed_text": "={{ $json.parsed_text }}",
       "embedding": "={{ $('OpenAI').item.json.embedding }}",
       "file_meta": {
         "mime_type": "={{ $json.mime_type }}",
         "size": "={{ $json.file_size }}",
         "drive_modified_time": "={{ $json.modified_time }}"
       },
       "updated_at": "={{ $now }}"
     }
     ```
5. Click **Execute Node**

---

### Step 9: Respond to Webhook

1. MongoDB node ke baad **+** click karo
2. Search: **Respond to Webhook**
3. Select **Respond to Webhook**
4. Configure:
   - **Status Code**: 200
   - **Response Body**:
     ```json
     {
       "synced": "success",
       "file": "={{ $json.filename }}"
     }
     ```

---

### Step 10: Save & Activate

1. Top right **Save** button click karo
2. Toggle switch se workflow **Activate** karo (grey se green)
3. Workflow active dikhega

**✅ Workflow 1: Drive Sync — READY**

---

## PART 3: Workflow 2 — Match Candidates

**Kaam:** JD se embedding banao → Vector search karo → OpenAI se match scores lo → Results bhejo

---

### Step 1: New Workflow Banao

1. Left sidebar → **Workflows**
2. Click **Add Workflow**
3. Name: `Match Candidates`
4. Press Enter

---

### Step 2: Webhook Node (Trigger)

1. **+** → Search: **Webhook** → Select
2. Configure:
   - **Method**: POST
   - **Path**: `match-candidates`
   - **Response Mode**: Last Node
3. Copy Webhook URL:
   ```
   https://surya-pratap-singh1.app.n8n.cloud/webhook/match-candidates
   ```
   (Backend .env mein daalna hai)

---

### Step 3: OpenAI — Create Embedding (for JD)

1. Webhook ke baad **+** → **OpenAI**
2. Configure:
   - **Operation**: Create Embedding
   - **Credential**: OpenAI
   - **Model**: `text-embedding-3-small`
   - **Input**: `{{ $('Webhook').item.json.jd }}`

---

### Step 4: MongoDB — Aggregate (Vector Search)

1. OpenAI ke baad **+** → **MongoDB**
2. Configure:
   - **Operation**: Aggregate
   - **Credential**: MongoDB
   - **Database**: `getdeveloper`
   - **Collection**: `resumes`
   - **Aggregation Pipeline** (JSON):
     ```json
     [
       {
         "$vectorSearch": {
           "index": "resume_vector_index",
           "path": "embedding",
           "queryVector": "={{ $('OpenAI').item.json.embedding }}",
           "numCandidates": 100,
           "limit": 20,
           "filter": {
             "user_id": "={{ $('Webhook').item.json.user_id }}"
           }
         }
       }
     ]
     ```

**⚠️ Agar $vectorSearch error aaye:**
- MongoDB Atlas mein confirm karo `resume_vector_index` ban gaya hai
- Ya pipeline mein $searchMeta use karo

---

### Step 5: Code Node — Format Candidates

1. MongoDB ke baad **+** → **Code**
2. Language: **JavaScript**
3. Code:

```javascript
const candidates = $input.all()[0].json;

const formatted = candidates.map((c, i) => {
  const text = c.parsed_text ? c.parsed_text.substring(0, 1200) : '';
  return `Candidate ${i+1}:
File: ${c.filename || 'Unknown'}
Text: ${text}`;
}).join('\n\n---\n\n');

return [{
  json: {
    candidates_text: formatted,
    candidate_list: candidates
  }
}];
```

---

### Step 6: OpenAI — Send Message (JSON Mode)

1. Code node ke baad **+** → **OpenAI**
2. Configure:
   - **Operation**: Send Message
   - **Credential**: OpenAI
   - **Model**: `gpt-4o-mini`
   - **System Prompt**:
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
     - strengths (array of strings, max 3)
     - gaps (array of strings, max 3)

     Return ONLY valid JSON array. No markdown, no explanation, just JSON.
     ```
   - **User Message**:
     ```
     Job Description:
     {{ $('Webhook').item.json.jd }}

     Candidates:
     {{ $json.candidates_text }}
     ```
   - **JSON Output**: Yes (toggle ON)

---

### Step 7: Respond to Webhook

1. OpenAI ke baad **+** → **Respond to Webhook**
2. Configure:
   - **Status Code**: 200
   - **Response Body**: `{{ $json }}`

---

### Step 8: Save & Activate

1. Top right **Save**
2. Toggle **Activate**

**✅ Workflow 2: Match Candidates — READY**

---

## PART 4: Backend .env Update

`backend/.env` file banao ya update karo:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MONGODB_URI=mongodb+srv://n8n_user:PASSWORD@cluster0.xxxxx.mongodb.net/getdeveloper?retryWrites=true&w=majority
N8N_BASE_URL=https://surya-pratap-singh1.app.n8n.cloud
N8N_WEBHOOK_SYNC=/webhook/drive-sync
N8N_WEBHOOK_MATCH=/webhook/match-candidates
SECRET_KEY=kuch-bhi-random-32-char-string
FRONTEND_URL=*
PORT=8000
```

---

## PART 5: Test Karo

1. **Backend chalao:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend khol do:** `recruiter-search.html`

3. **"Connect Google Drive"** pe click karo → Google login → Allow

4. **"Sync Drive"** pe click karo → Wait → "Synced: X resumes"

5. **JD paste karo** → **"Run AI Match"**

6. **Results page** pe ranked candidates dikhenge

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection fail | Password simple banao (no #, %, !) |
| Google Drive no files | Confirm Drive mein PDFs hain |
| PDF parse error | Tika ya Docling use karo (HTTP Request node) |
| Vector search no results | MongoDB Atlas mein index ban gaya? confirm karo |
| OpenAI rate limit | $5 credit add karo; ya model gpt-3.5-turbo try karo |
| Backend CORS error | `FRONTEND_URL=*` rakho .env mein |

---

**Koi bhi step mein problem aaye → Screenshot bhejo → Main help karunga.**
