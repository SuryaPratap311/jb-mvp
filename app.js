// GetDeveloper MVP — Frontend JS (No Auth)
// Connects static HTML to FastAPI Backend → n8n Webhooks

const API_BASE = 'http://localhost:8000';

/* ===========================
   DRIVE SYNC
   =========================== */
/* ===========================
   SYNC STATUS HELPERS
   =========================== */
function showSyncBanner(status, title, msg, icon, progressPct, synced, total) {
  const banner = document.getElementById('sync-status-banner');
  const iconEl = document.getElementById('sync-status-icon');
  const titleEl = document.getElementById('sync-status-title');
  const msgEl = document.getElementById('sync-status-msg');
  const progressEl = document.getElementById('sync-progress');
  const progressBar = document.getElementById('sync-progress-bar');
  const countEl = document.getElementById('sync-status-count');

  if (!banner) return;

  banner.style.display = 'block';
  banner.style.borderLeft = '3px solid ' + (
    status === 'error' ? 'var(--red)' :
    status === 'done' ? 'var(--green)' : 'var(--primary)'
  );

  if (iconEl) iconEl.textContent = icon || '⏳';
  if (titleEl) titleEl.textContent = title || '';
  if (msgEl) msgEl.textContent = msg || '';

  if (progressEl) progressEl.style.display = progressPct !== undefined ? 'block' : 'none';
  if (progressBar && progressPct !== undefined) progressBar.style.width = progressPct + '%';
  if (countEl && synced !== undefined) {
    countEl.style.display = 'inline';
    countEl.textContent = `${synced} / ${total}`;
  }
}

function hideSyncBanner() {
  const banner = document.getElementById('sync-status-banner');
  if (banner) banner.style.display = 'none';
}

async function syncDrive() {
  const btn = document.getElementById('sync-btn');
  if (btn) { btn.textContent = 'Syncing...'; btn.disabled = true; }

  showSyncBanner('in_progress', 'Syncing resumes', 'Connecting to Google Drive...', '⏳');

  try {
    // Trigger sync via n8n
    const triggerRes = await fetch(`${API_BASE}/api/drive/sync`, { method: 'POST' });
    const triggerData = await triggerRes.json();

    if (triggerRes.status === 409) {
      showSyncBanner('in_progress', 'Sync already running', 'Please wait for the current sync to finish', '⏳');
      setTimeout(hideSyncBanner, 3000);
      if (btn) { btn.textContent = 'Sync Drive'; btn.disabled = false; }
      return;
    }

    if (triggerData.error || !triggerRes.ok) {
      showSyncBanner('error', 'Sync failed', triggerData.detail || triggerData.error || 'Unknown error', '❌');
      setTimeout(hideSyncBanner, 4000);
      if (btn) { btn.textContent = 'Sync Drive'; btn.disabled = false; }
      return;
    }

    // Poll for sync status
    let status = 'in_progress';
    let total = 0;
    while (status === 'in_progress') {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const statusRes = await fetch(`${API_BASE}/api/drive/status`);
        const statusData = await statusRes.json();
        status = statusData.sync_status?.status || 'completed';
        total = statusData.sync_status?.files_total || 0;
        const synced = statusData.sync_status?.files_synced || 0;
        const message = statusData.sync_status?.message || 'Syncing...';

        const pct = total > 0 ? Math.round((synced / total) * 100) : 0;
        showSyncBanner('in_progress', `Syncing resumes (${synced}/${total})`, message, '🔄', pct, synced, total);
      } catch {
        showSyncBanner('in_progress', 'Syncing...', 'Checking status...', '🔄');
        break;
      }
    }

    const finalRes = await fetch(`${API_BASE}/api/drive/status`);
    const finalData = await finalRes.json();
    const finalStatus = finalData.sync_status;
    const totalResumes = finalData.total_resumes || 0;

    showSyncBanner('done', 'Sync complete', `${totalResumes} resumes synced from Google Drive`, '✅');
    setTimeout(hideSyncBanner, 5000);
  } catch (e) {
    showSyncBanner('error', 'Sync failed', e.message, '❌');
    setTimeout(hideSyncBanner, 4000);
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
  const candidates = data.rankings || data.candidates || data;

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
          <button class="btn btn-primary btn-sm" onclick="viewResume('${c.drive_file_id}')">View resume</button>
          <button class="btn btn-outline btn-sm">Shortlist</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ===========================
   VIEW RESUME / CANDIDATE DETAIL
   =========================== */
function viewResume(drive_file_id) {
  sessionStorage.setItem('candidate_id', drive_file_id);
  window.location.href = 'recruiter-resume-detail.html?id=' + encodeURIComponent(drive_file_id);
}

async function loadCandidateDetail() {
  const params = new URLSearchParams(window.location.search);
  const candidateId = params.get('id');
  const container = document.getElementById('candidate-profile');
  if (!container) return;

  if (!candidateId) {
    container.innerHTML = '<p>No candidate selected. <a href="recruiter-results.html">Back to results</a>.</p>';
    return;
  }

  // Show loading state
  container.innerHTML = '<p style="padding:24px">Loading candidate...</p>';

  // Try API first
  try {
    const res = await fetch(`${API_BASE}/api/resumes/${encodeURIComponent(candidateId)}`);
    if (res.ok) {
      const c = await res.json();
      renderCandidateProfile(c);
      return;
    }
  } catch { /* fall through to sessionStorage */ }

  // Fallback: find in sessionStorage match_results
  const raw = sessionStorage.getItem('match_results');
  if (raw) {
    const data = JSON.parse(raw);
    const rankings = data.rankings || data.candidates || data;
    const candidate = rankings.find(c => c.drive_file_id === candidateId);
    if (candidate) {
      renderCandidateProfile(candidate);
      return;
    }
  }

  container.innerHTML = '<p>Could not load candidate. <a href="recruiter-results.html">Back to results</a>.</p>';
}

function renderCandidateProfile(c) {
  const container = document.getElementById('candidate-profile');
  if (!container) return;

  // Avatar initials
  const avatarEl = document.getElementById('candidate-avatar');
  if (avatarEl) avatarEl.textContent = getInitials(c.filename || c.name || 'R');

  // Name
  const nameEl = document.getElementById('candidate-name');
  if (nameEl) nameEl.textContent = (c.filename || c.name || 'Resume').replace(/\.pdf$/i, '');

  // Match score
  const scoreEl = document.getElementById('candidate-score');
  if (scoreEl) {
    scoreEl.textContent = (c.match_score || 0) + '%';
    const ring = scoreEl.closest('.score-ring');
    if (ring) ring.style.setProperty('--p', c.match_score || 0);
  }

  // Verdict
  const verdictEl = document.getElementById('candidate-verdict');
  if (verdictEl) {
    const score = c.match_score || 0;
    if (score >= 85) verdictEl.textContent = 'AI Verdict: Strong recommendation';
    else if (score >= 70) verdictEl.textContent = 'AI Verdict: Worth considering';
    else verdictEl.textContent = 'AI Verdict: Partial match only';
  }

  // Summary / explanation
  const summaryEl = document.getElementById('candidate-summary');
  if (summaryEl) summaryEl.textContent = c.explanation || '';

  // Strengths
  const strengthsEl = document.getElementById('candidate-strengths');
  if (strengthsEl) {
    if (c.strengths?.length) {
      strengthsEl.innerHTML = c.strengths.map(s => `<span class="tag tag-match">${s}</span>`).join('');
    } else {
      strengthsEl.innerHTML = '<span class="text-sm text-muted">No specific strengths noted</span>';
    }
  }

  // Gaps
  const gapsEl = document.getElementById('candidate-gaps');
  if (gapsEl) {
    if (c.gaps?.length) {
      gapsEl.innerHTML = c.gaps.map(g => `<span class="tag tag-miss">${g}</span>`).join('');
    } else {
      gapsEl.innerHTML = '<span class="text-sm text-muted">No significant gaps noted</span>';
    }
  }

  // Match breakdown
  const skillsEl = document.getElementById('breakdown-skills');
  const expEl = document.getElementById('breakdown-experience');
  const domainEl = document.getElementById('breakdown-domain');
  if (skillsEl) skillsEl.textContent = (c.skills_match || 0) + '%';
  if (expEl) expEl.textContent = (c.experience_match || 0) + '%';
  if (domainEl) domainEl.textContent = (c.domain_fit || 0) + '%';

  // Resume content (from API parsed_text)
  const resumeContentEl = document.getElementById('resume-content');
  if (resumeContentEl && c.parsed_text) {
    resumeContentEl.innerHTML = '<pre style="white-space:pre-wrap;font-size:13px;color:var(--ink-2)">' + c.parsed_text.slice(0, 3000) + '</pre>';
  }

  // Drive file ID reference
  const driveIdEl = document.getElementById('drive-file-id');
  if (driveIdEl) driveIdEl.textContent = c.drive_file_id || '--';
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

  // Load candidate detail if on detail page
  if (window.location.pathname.includes('recruiter-resume-detail')) {
    loadCandidateDetail();
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