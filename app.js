/* Tape Deck — transcript viewer + shadowing trainer
   All state (highlights, drive IDs, practiced sentences) is stored in
   localStorage — nothing leaves the browser. */

const LS_HIGHLIGHTS = 'tapedeck:highlights';
const LS_DRIVE = 'tapedeck:driveIds';
const LS_PRACTICED = 'tapedeck:practiced';

let TRACKS = [];
let currentTrack = null;
let shadowIndex = 0;
let shadowMode = false;

const els = {};

async function init() {
  cacheEls();
  TRACKS = await fetch('tracks.json').then(r => r.json());
  renderTrackList(TRACKS);
  wireSidebar();
  wireTabs();
  wireAudioBox();
  wireHighlighting();
  wireShadowControls();

  const hash = decodeURIComponent(location.hash.replace('#', ''));
  const initial = TRACKS.find(t => String(t.track) === hash) || null;
  if (initial) selectTrack(initial);
}

function cacheEls() {
  ['trackList','emptyState','trackView','trackEyebrow','trackTitle','trackLevel',
   'trackWords','clearHighlights','driveIdInput','saveDriveId','playerWrap',
   'transcript','vocabBlock','speakingBlock','search','levelToggle','tabs',
   'shadowModeBtn','highlightPopover'
  ].forEach(id => els[id] = document.getElementById(id));
}

/* ---------------- Sidebar ---------------- */

function renderTrackList(list) {
  els.trackList.innerHTML = '';
  if (!list.length) {
    els.trackList.innerHTML = '<li class="no-results">Không tìm thấy bài nào.</li>';
    return;
  }
  list.forEach(t => {
    const li = document.createElement('li');
    li.className = 'track-item';
    li.dataset.track = t.track;
    li.innerHTML = `
      <span class="track-num">${String(t.track).padStart(2,'0')}</span>
      <span class="track-info">
        <span class="track-name">${t.title}</span>
        <span class="track-lvl">${t.level} · ${t.wordCount} từ</span>
      </span>`;
    li.addEventListener('click', () => selectTrack(t));
    if (currentTrack && currentTrack.track === t.track) li.classList.add('selected');
    els.trackList.appendChild(li);
  });
}

function wireSidebar() {
  els.search.addEventListener('input', applyFilters);
  els.levelToggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      els.levelToggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

function applyFilters() {
  const q = els.search.value.trim().toLowerCase();
  const level = els.levelToggle.querySelector('button.active').dataset.level;
  const filtered = TRACKS.filter(t => {
    const matchesQ = !q || t.title.toLowerCase().includes(q) || String(t.track).includes(q);
    const matchesLevel = level === 'all' || t.level === level;
    return matchesQ && matchesLevel;
  });
  renderTrackList(filtered);
}

/* ---------------- Track view ---------------- */

function selectTrack(t) {
  currentTrack = t;
  shadowMode = false;
  shadowIndex = 0;
  location.hash = t.track;

  document.querySelectorAll('.track-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.track == t.track);
  });

  els.emptyState.hidden = true;
  els.trackView.hidden = false;

  els.trackEyebrow.textContent = `Track ${t.track}`;
  els.trackTitle.textContent = t.title;
  els.trackLevel.textContent = t.level;
  els.trackWords.textContent = `${t.wordCount} từ · ${t.sentences.length} câu`;

  renderTranscript(t);
  els.vocabBlock.textContent = t.vocab || '(Không có dữ liệu từ vựng cho track này)';
  els.speakingBlock.textContent = t.speaking || '(Không có đề bài nói cho track này)';

  loadDriveId(t);
  resetTabs();
  els.transcript.classList.remove('shadow-mode');
  els.shadowModeBtn.textContent = '▶ Chế độ Shadowing';
  document.querySelector('.shadow-nav')?.remove();
}

function resetTabs() {
  els.tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === 'transcript'));
  ['transcript','vocab','speaking'].forEach(name => {
    document.getElementById('panel-' + name).hidden = name !== 'transcript';
  });
}

function wireTabs() {
  els.tabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      els.tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['transcript','vocab','speaking'].forEach(name => {
        document.getElementById('panel-' + name).hidden = name !== btn.dataset.tab;
      });
    });
  });
}

/* ---------------- Transcript rendering ---------------- */

function renderTranscript(t) {
  const practiced = getPracticed(t.track);
  let sentenceCounter = 0;
  const paraHtml = t.paragraphs.map(para => {
    // naive per-paragraph sentence split matching the global sentence list order
    const sentencesInPara = splitSentences(para);
    const spans = sentencesInPara.map(s => {
      const idx = sentenceCounter++;
      const done = practiced.includes(idx) ? ' practiced' : '';
      return `<span class="sentence${done}" data-idx="${idx}">${escapeHtml(s)}</span>`;
    }).join(' ');
    return `<p>${spans}</p>`;
  }).join('');

  els.transcript.innerHTML = paraHtml;
  applyStoredHighlights(t.track);

  els.transcript.querySelectorAll('.sentence').forEach(span => {
    span.addEventListener('click', (e) => {
      if (window.getSelection().toString().length > 0) return; // don't fire during text selection
      const idx = Number(span.dataset.idx);
      if (shadowMode) {
        shadowIndex = idx;
        renderShadowState();
      } else {
        span.classList.toggle('active');
      }
    });
  });
}

function splitSentences(paragraph) {
  const matches = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  return matches ? matches.map(s => s.trim()).filter(Boolean) : [paragraph];
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

/* ---------------- Shadowing mode ---------------- */

function wireShadowControls() {
  els.shadowModeBtn.addEventListener('click', () => {
    shadowMode = !shadowMode;
    els.shadowModeBtn.textContent = shadowMode ? '■ Thoát Shadowing' : '▶ Chế độ Shadowing';
    els.transcript.classList.toggle('shadow-mode', shadowMode);
    document.querySelectorAll('.sentence.active').forEach(s => s.classList.remove('active'));
    if (shadowMode) {
      shadowIndex = 0;
      ensureShadowNav();
      renderShadowState();
    } else {
      document.querySelector('.shadow-nav')?.remove();
    }
  });
}

function ensureShadowNav() {
  if (document.querySelector('.shadow-nav')) return;
  const nav = document.createElement('div');
  nav.className = 'shadow-nav';
  nav.innerHTML = `
    <button id="shadowPrev">← Câu trước</button>
    <span class="counter" id="shadowCounter"></span>
    <button id="shadowNext">Câu sau →</button>
    <button id="shadowDone">Đánh dấu đã luyện ✓</button>`;
  els.transcript.after(nav);
  nav.querySelector('#shadowPrev').addEventListener('click', () => stepShadow(-1));
  nav.querySelector('#shadowNext').addEventListener('click', () => stepShadow(1));
  nav.querySelector('#shadowDone').addEventListener('click', markPracticed);
}

function stepShadow(dir) {
  const total = currentTrack.sentences.length;
  shadowIndex = Math.min(total - 1, Math.max(0, shadowIndex + dir));
  renderShadowState();
}

function renderShadowState() {
  document.querySelectorAll('.sentence').forEach(s => {
    s.classList.toggle('active', Number(s.dataset.idx) === shadowIndex);
  });
  const total = currentTrack.sentences.length;
  const counter = document.getElementById('shadowCounter');
  if (counter) counter.textContent = `Câu ${shadowIndex + 1} / ${total}`;
  const prev = document.getElementById('shadowPrev');
  const next = document.getElementById('shadowNext');
  if (prev) prev.disabled = shadowIndex === 0;
  if (next) next.disabled = shadowIndex === total - 1;
  document.querySelector(`.sentence[data-idx="${shadowIndex}"]`)?.scrollIntoView({block:'center', behavior:'smooth'});
}

function markPracticed() {
  const all = getAllPracticed();
  const key = currentTrack.track;
  const set = new Set(all[key] || []);
  set.add(shadowIndex);
  all[key] = [...set];
  localStorage.setItem(LS_PRACTICED, JSON.stringify(all));
  document.querySelector(`.sentence[data-idx="${shadowIndex}"]`)?.classList.add('practiced');
}

function getAllPracticed() {
  try { return JSON.parse(localStorage.getItem(LS_PRACTICED)) || {}; }
  catch { return {}; }
}
function getPracticed(trackNum) {
  return getAllPracticed()[trackNum] || [];
}

/* ---------------- Audio (Google Drive) ---------------- */

function extractDriveId(input) {
  input = input.trim();
  const m = input.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || input.match(/id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
  return '';
}

function wireAudioBox() {
  els.saveDriveId.addEventListener('click', () => {
    const id = extractDriveId(els.driveIdInput.value);
    if (!id) { alert('Không đọc được ID từ link đó. Hãy dán link dạng .../file/d/FILE_ID/view'); return; }
    const all = getAllDriveIds();
    all[currentTrack.track] = id;
    localStorage.setItem(LS_DRIVE, JSON.stringify(all));
    renderPlayer(id);
  });
}

function getAllDriveIds() {
  try { return JSON.parse(localStorage.getItem(LS_DRIVE)) || {}; }
  catch { return {}; }
}

function loadDriveId(t) {
  const stored = getAllDriveIds()[t.track] || t.driveFileId || '';
  els.driveIdInput.value = stored;
  renderPlayer(stored);
}

function renderPlayer(id) {
  if (!id) {
    els.playerWrap.innerHTML = '<p class="audio-hint" style="margin:0;">Chưa có audio cho track này — dán link Drive ở trên.</p>';
    return;
  }
  els.playerWrap.innerHTML = `<iframe src="https://drive.google.com/file/d/${id}/preview" allow="autoplay" title="Audio track ${currentTrack.track}"></iframe>`;
}

/* ---------------- Highlighting ---------------- */

function wireHighlighting() {
  document.addEventListener('mouseup', (e) => {
    if (!els.transcript.contains(e.target) && e.target !== els.highlightPopover) {
      if (!els.highlightPopover.contains(e.target)) hidePopover();
    }
    const sel = window.getSelection();
    if (!els.transcript.contains(sel.anchorNode) || sel.isCollapsed) return;
    showPopover(e.clientX, e.clientY);
  });

  els.highlightPopover.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = window.getSelection();
      if (btn.dataset.color === 'remove') {
        removeHighlightAtSelection(sel);
      } else {
        wrapSelectionWithMark(sel, getComputedColor(btn));
      }
      hidePopover();
      sel.removeAllRanges();
      persistHighlights();
    });
  });

  els.clearHighlights.addEventListener('click', () => {
    if (!currentTrack) return;
    if (!confirm('Xoá tất cả highlight của track này?')) return;
    const all = getAllHighlights();
    delete all[currentTrack.track];
    localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(all));
    els.transcript.querySelectorAll('mark').forEach(m => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    els.transcript.normalize();
  });
}

function getComputedColor(btn) {
  return getComputedStyle(btn).getPropertyValue('--hl').trim() || '#F4D35E';
}

function showPopover(x, y) {
  els.highlightPopover.hidden = false;
  els.highlightPopover.style.left = Math.min(x, window.innerWidth - 160) + 'px';
  els.highlightPopover.style.top = (y + 12) + 'px';
}
function hidePopover() { els.highlightPopover.hidden = true; }

function wrapSelectionWithMark(sel, color) {
  if (sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const mark = document.createElement('mark');
  mark.style.setProperty('--hl', color);
  try {
    range.surroundContents(mark);
  } catch {
    // selection spans multiple elements — fall back to extracting+wrapping
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
}

function removeHighlightAtSelection(sel) {
  if (sel.rangeCount === 0) return;
  let node = sel.anchorNode;
  while (node && node !== els.transcript) {
    if (node.nodeName === 'MARK') {
      node.replaceWith(document.createTextNode(node.textContent));
      els.transcript.normalize();
      return;
    }
    node = node.parentNode;
  }
}

function persistHighlights() {
  if (!currentTrack) return;
  const all = getAllHighlights();
  all[currentTrack.track] = els.transcript.innerHTML;
  localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(all));
}

function getAllHighlights() {
  try { return JSON.parse(localStorage.getItem(LS_HIGHLIGHTS)) || {}; }
  catch { return {}; }
}

function applyStoredHighlights(trackNum) {
  const saved = getAllHighlights()[trackNum];
  if (saved) els.transcript.innerHTML = saved;
}

init();
