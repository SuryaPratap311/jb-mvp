# Multi-Format Resume Support Guide

## Supported File Formats

Your MVP now supports fetching and parsing these resume formats from Google Drive:

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| PDF | `application/pdf` | .pdf |
| Microsoft Word (Old) | `application/msword` | .doc |
| Microsoft Word (New) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | .docx |
| Plain Text | `text/plain` | .txt |
| Rich Text Format | `application/rtf` | .rtf |

---

## Google Drive Search Query (n8n)

Replace the single PDF query with this multi-format query:

```
mimeType='application/pdf' or mimeType='application/msword' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/plain' or mimeType='application/rtf'
```

---

## Parser Logic for Different Formats (n8n Code Node)

Replace the simple PDF parser with this universal parser:

```python
import io

# Get file data and mime type from previous node
file_data = items[0].json.get('data', b'')
file_name = items[0].json.get('name', '')
mime_type = items[0].json.get('mimeType', '')

parsed_text = ""

# Parse based on MIME type
if mime_type == 'application/pdf':
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_data))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                parsed_text += page_text + "\n"
    except Exception as e:
        parsed_text = f"[PDF Parse Error: {str(e)}]"

elif mime_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
    try:
        # Try python-docx first (for .docx)
        from docx import Document
        doc = Document(io.BytesIO(file_data))
        parsed_text = "\n".join([para.text for para in doc.paragraphs])
    except:
        try:
            # Fallback for .doc files using antiword or textract
            # For n8n cloud, use Tika via HTTP request instead
            parsed_text = "[DOC/DOCX - Use Tika parser or upload as PDF]"
        except Exception as e:
            parsed_text = f"[DOC Parse Error: {str(e)}]"

elif mime_type == 'text/plain':
    try:
        parsed_text = file_data.decode('utf-8', errors='ignore')
    except Exception as e:
        parsed_text = f"[TXT Parse Error: {str(e)}]"

elif mime_type == 'application/rtf':
    try:
        # Simple RTF text extraction (strips RTF tags)
        import re
        text = file_data.decode('utf-8', errors='ignore')
        # Remove RTF control words
        text = re.sub(r'\\[a-z]+\d*\s?', '', text)
        text = re.sub(r'[{}]', '', text)
        parsed_text = text
    except Exception as e:
        parsed_text = f"[RTF Parse Error: {str(e)}]"

else:
    parsed_text = f"[Unsupported format: {mime_type}]"

return [{
    "json": {
        "drive_file_id": items[0].json.get('id'),
        "filename": file_name,
        "parsed_text": parsed_text[:30000],
        "mime_type": mime_type,
        "modified_time": items[0].json.get('modifiedTime'),
        "file_size": items[0].json.get('size')
    }
}]
```

---

## Alternative: Use Apache Tika (Recommended for n8n Cloud)

If n8n cloud mein Python libraries nahi hain, use Tika via HTTP Request:

### Step 1: Add HTTP Request Node (Tika Parser)
Replace the Code node with:

- **Node**: HTTP Request
- **Method**: POST
- **URL**: `https://tika.apache.org/tika` (ya self-hosted Tika: `http://your-tika:9998/tika`)
- **Body**: Binary data from Google Drive download
- **Headers**:
  | Name | Value |
  |------|-------|
  | `Content-Type` | `application/octet-stream` |
  | `Accept` | `text/plain` |

Tika automatically detects format (PDF, DOC, DOCX, etc.) and returns plain text.

---

## Backend Requirements Update

Add these packages to `requirements.txt` if parsing in backend:

```
pypdf==4.2.0
python-docx==1.1.2
```

For DOC files (old format), use:
- `antiword` (system package)
- Or `textract` (Python library)
- Or convert to PDF first using `libreoffice`

---

## Summary

**Simplest approach for MVP:**
1. Google Drive search query mein multiple MIME types add karo
2. n8n Code node mein format detection + parsing logic
3. Unsupported formats ke liye `[Format not supported]` message

**Best approach for production:**
1. Use Apache Tika (handles all formats automatically)
2. Self-host Tika Docker container
3. n8n HTTP Request node se Tika ko call karo

---

**Koi specific format support chahiye toh batao.**