// GetDeveloper MVP — Frontend JS (No Auth)
// Connects static HTML to FastAPI Backend → n8n Webhooks

const API_BASE = 'http://localhost:8000';

/* ===========================
   DRIVE SYNC
   =========================== */
async function syncDrive() {
  const btn = document.getElementById('sync-btn');
  if (btn) { btn.textContent = 'Syncing...'; btn.disabled = true; }

  try {
    const res = await fetch(`${API_BASE}/api/drive/sync`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      alert('Sync error: ' + data.error);
    } else {
      alert(data.message || `Synced: ${data.synced || 0} resumes`);
    }
  } catch (e) {
    alert('Sync failed: ' + e.message);
  } finally {
    if (btn) { btn.textContent = 'Sync Drive'; btn.disabled = false; }
  }
}

/* ===========================
   AI MATCH
   =========================== */
async function runMatch(e) {
  if (e) e.preventDefault();

  const jd = document.getElementById('jd')?.value.trim();
  if (!jd) { alert('Please paste a job description'); return; }

  const btn = document.querySelector('button[type="submit"]');
  const originalText = btn?.innerHTML;
  if (btn) { btn.innerHTML = 'Matching...'; btn.disabled = true; }

  try {
    const res = await fetch(`${API_BASE}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd })
    });
    const data = await res.json();

    if (data.error) {
      alert('Error: ' + data.error);
      if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
      return;
    }

    sessionStorage.setItem('match_results', JSON.stringify(data));
    sessionStorage.setItem('match_jd', jd);
    window.location.href = 'recruiter-results.html';

  } catch (err) {
    alert('Match failed: ' + err.message);
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
  }
}

/* ===========================
   RENDER RESULTS
   =========================== */
function renderResults() {
  const container = document.getElementById('results-container');
  if (!container) return;

  const raw = sessionStorage.getItem('match_results');
  const jd = sessionStorage.getItem('match_jd') || '';
  if (!raw) { container.innerHTML = '<p>No results. Run a search first.</p>'; return; }

  const data = JSON.parse(raw);
  const candidates = data.candidates || data;

  const jdTitle = document.getElementById('jd-title');
  if (jdTitle) jdTitle.textContent = jd.slice(0, 80) + (jd.length > 80 ? '...' : '');

  if (!Array.isArray(candidates) || candidates.length === 0) {
    container.innerHTML = '<p>No matching candidates found.</p>';
    return;
  }

  container.innerHTML = candidates.map((c, i) => `
    <div class="result-card" style="display:grid;grid-template-columns:100px 1fr auto;gap:20px;padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:center">
        <div class="score-ring" style="--p:${c.match_score || 0}"><span class="pct">${c.match_score || 0}%</span></div>
      </div>
      <div>
        <div class="flex-gap-12 mb-8" style="align-items:center">
          <div class="avatar lg">${getInitials(c.filename || 'R')}</div>
          <div>
            <h3 class="result-name" style="margin:0">${(c.filename || 'Resume').replace(/\.pdf$/i, '')}</h3>
            <p class="result-role" style="margin:2px 0 0;color:var(--muted)">${c.drive_file_id ? 'Drive ID: ' + c.drive_file_id.slice(0,12) + '...' : ''}</p>
          </div>
        </div>
        <p class="result-summary" style="color:var(--ink-2);font-size:14px;margin:10px 0 12px">
          <strong>Why ${c.match_score || 0}% match:</strong> ${c.explanation || 'No explanation generated.'}
        </p>
        <div class="breakdown" style="grid-template-columns:repeat(4,1fr);gap:10px;display:grid">
          <div class="breakdown-card" style="padding:10px;border:1px solid var(--line);border-radius:var(--radius)">
            <div class="lbl" style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:600">Skills</div>
            <div class="val" style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--primary-strong)">${c.skills_match || 0}%</div>
          </div>
          <div class="breakdown-card" style="padding:10px;border:1px solid var(--line);border-radius:var(--radius)">
            <div class="lbl" style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:600">Experience</div>
            <div class="val" style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--primary-strong)">${c.experience_match || 0}%</div>
          </div>
          <div class="breakdown-card" style="padding:10px;border:1px solid var(--line);border-radius:var(--radius)">
            <div class="lbl" style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:600">Domain Fit</div>
            <div class="val" style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--primary-strong)">${c.domain_fit || 0}%</div>
          </div>
          <div class="breakdown-card" style="padding:10px;border:1px solid var(--line);border-radius:var(--radius)">
            <div class="lbl" style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:600">Overall</div>
            <div class="val" style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--primary-strong)">${c.match_score || 0}%</div>
          </div>
        </div>
        ${c.strengths?.length ? `<div style="margin-top:10px"><strong style="font-size:12px;color:var(--muted)">Strengths:</strong> ${c.strengths.map(s => `<span class="tag tag-match">${s}</span>`).join('')}</div>` : ''}
        ${c.gaps?.length ? `<div style="margin-top:6px"><strong style="font-size:12px;color:var(--muted)">Gaps:</strong> ${c.gaps.map(g => `<span class="tag tag-miss">${g}</span>`).join('')}</div>` : ''}
      </div>
      <div class="result-actions" style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;justify-content:space-between;min-width:160px">
        <span class="pill pill-orange">${i === 0 ? 'Top match' : i < 3 ? 'Strong' : 'Promising'}</span>
        <div class="flex-col" style="gap:8px;width:100%;display:flex;flex-direction:column">
          <button class="btn btn-primary btn-sm">View resume</button>
          <button class="btn btn-outline btn-sm">Shortlist</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ===========================
   INIT
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  // Wire search form
  const form = document.getElementById('match-form');
  if (form && window.location.pathname.includes('recruiter-search')) {
    form.addEventListener('submit', runMatch);
  }

  // Render results if on results page
  if (window.location.pathname.includes('recruiter-results')) {
    renderResults();
  }

  // Add sync button to nav if on search page
  const nav = document.querySelector('.nav-links');
  if (nav && window.location.pathname.includes('recruiter-search')) {
    const syncBtn = document.createElement('a');
    syncBtn.href = '#';
    syncBtn.id = 'sync-btn';
    syncBtn.className = 'btn btn-primary btn-sm';
    syncBtn.style = 'margin-left:12px';
    syncBtn.textContent = 'Sync Drive';
    syncBtn.onclick = (e) => { e.preventDefault(); syncDrive(); };
    nav.appendChild(syncBtn);
  }
});