/**
 * YT Smart Chapters Pro v2.0
 * made with 💖 by pavnxet
 * GitHub: https://github.com/pavnxet/yt-timestamp-skipper
 */
const isExtValid = () => {
    try {
        if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) return true;
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) return true;
        return false;
    } catch (_) {
        return false;
    }
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let timestamps = [];
let titles = [];
let allParsedChapters = []; // [{t: number, title: string, category: 'ques'|'ans'|'explain'|'other'}]
let currentChapterFilter = 'all'; // 'all' | 'ques' | 'ans' | 'explain'
let lastActiveIdx = -1;
let currentMode = 'normal';
let currentRawText = '';
let sbRawText = '';
let renderSponsorBlockCards = () => {};
let uploadSponsorBlockSegments = () => {};
let addManualSponsorBlockSegment = () => false;
let pendingSbStart = null;
let shortcuts = { next: 'BracketRight', prev: 'BracketLeft', add: 'KeyX', addAlt: true };

// --- Mini Widget UI ---
let miniWidget = null;
let showMiniWidget = false; // Default disabled to prevent double popups

function createMiniWidget() {
    if (miniWidget || !showMiniWidget) return;
    miniWidget = document.createElement('div');
    miniWidget.id = 'yt-skipper-mini-widget';
    miniWidget.title = 'Made with 💖 by pavnxet';
    miniWidget.innerHTML = `
        <div class="mini-widget-btn" id="mini-prev" title="Prev">◀</div>
        <div id="mini-current-title">No Chapters</div>
        <div class="mini-widget-btn" id="mini-next" title="Next">▶</div>
    `;
    document.body.appendChild(miniWidget);

    document.getElementById('mini-prev').onclick = () => skipRelative(-1);
    document.getElementById('mini-next').onclick = () => skipRelative(1);

    let isDragging = false, offset = [0,0];
    const startDrag = (clientX, clientY, target) => {
        if (target.classList && target.classList.contains('mini-widget-btn')) return;
        isDragging = true;
        offset = [miniWidget.offsetLeft - clientX, miniWidget.offsetTop - clientY];
    };
    const moveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        miniWidget.style.left = (clientX + offset[0]) + 'px';
        miniWidget.style.top = (clientY + offset[1]) + 'px';
        miniWidget.style.right = 'auto'; miniWidget.style.bottom = 'auto';
    };
    const endDrag = () => { isDragging = false; };

    miniWidget.onmousedown = (e) => startDrag(e.clientX, e.clientY, e.target);
    document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    // Touch support for mobile devices
    miniWidget.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
        }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches && e.touches[0]) {
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });
    document.addEventListener('touchend', endDrag);
}

function removeMiniWidget() {
    if (miniWidget) {
        miniWidget.remove();
        miniWidget = null;
    }
}

function updateMiniWidget() {
    if (!showMiniWidget) {
        removeMiniWidget();
        return;
    }
    if (!miniWidget) createMiniWidget();
    if (!miniWidget) return;
    const titleEl = document.getElementById('mini-current-title');
    if (lastActiveIdx >= 0) {
        titleEl.textContent = titles[lastActiveIdx] || formatTime(timestamps[lastActiveIdx]);
        miniWidget.style.opacity = '1';
    } else {
        titleEl.textContent = 'YT Skipper';
        miniWidget.style.opacity = '0.7';
    }
}

function skipRelative(dir) {
    const video = document.querySelector('video');
    if (!video || !timestamps.length) return;
    const curr = video.currentTime;
    if (dir === 1) {
        const next = timestamps.find(t => t > curr + 2.5);
        if (next !== undefined) video.currentTime = Math.max(0, next - 2);
    } else {
        let prev = null;
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (timestamps[i] < curr - 2.5) { prev = timestamps[i]; break; }
        }
        if (prev !== null) video.currentTime = Math.max(0, prev - 2);
    }
}

// --- Dashboard UI ---
let dashboard = null;

function toggleDashboard() {
    if (!dashboard) createDashboard();
    syncDashboardTheme();
    dashboard.classList.toggle('yt-sk-visible');
    if (dashboard.classList.contains('yt-sk-visible') && window.refreshDashboard) {
        window.refreshDashboard();
    }
}

function syncDashboardTheme() {
    if (!dashboard) return;
    const isDark = document.documentElement.hasAttribute('dark') || 
                   document.querySelector('html[dark]') !== null ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDark) {
        dashboard.classList.remove('yt-sk-light-theme');
        dashboard.classList.add('yt-sk-dark-theme');
    } else {
        dashboard.classList.remove('yt-sk-dark-theme');
        dashboard.classList.add('yt-sk-light-theme');
    }
}

function createDashboard() {
    if (dashboard) return;
    dashboard = document.createElement('div');
    dashboard.id = 'yt-skipper-dashboard';
    dashboard.innerHTML = `
        <div class="yt-sk-header" id="yt-sk-header" title="Double click to Minimize / Expand">
            <div class="yt-sk-header-left">
                <h2>Skipper Pro</h2>
                <div class="yt-sk-status" id="yt-sk-status">Active</div>
            </div>
            <div class="yt-sk-header-center">
                <button class="yt-sk-btn yt-sk-header-dual-btn" id="yt-sk-btn-header-dual-scan" title="1-Click Dual AI Scan: Generates Question Chapters & Detects SponsorBlock Segments">⚡ Dual Scan</button>
            </div>
            <div class="yt-sk-header-actions">
                <div class="yt-sk-icon-btn" id="yt-sk-btn-min" title="Minimize / Restore">—</div>
                <div class="yt-sk-icon-btn yt-sk-close-btn" id="yt-sk-btn-close" title="Close">✕</div>
            </div>
        </div>

        <div class="yt-sk-tabs">
            <button class="yt-sk-tab-btn active" data-tab="chapters">📌 Chapters</button>
            <button class="yt-sk-tab-btn" data-tab="editor">📝 Editor</button>
            <button class="yt-sk-tab-btn" data-tab="sponsorblock">🚫 SponsorBlock</button>
            <button class="yt-sk-tab-btn" data-tab="settings">⚙️ Settings</button>
        </div>

        <!-- TAB 1: CHAPTERS -->
        <div class="yt-sk-tab-content active" id="yt-sk-tab-chapters">
            <div class="yt-sk-top-bar">
                <select id="yt-sk-mode" class="yt-sk-mode-select">
                    <option value="normal">Mode: Normal Navigation</option>
                    <option value="loop">Mode: Loop Current Chapter</option>
                </select>
            </div>

            <!-- Chapter Category Filter Chips -->
            <div class="yt-sk-filter-chips" id="yt-sk-filter-chips">
                <button class="yt-sk-chip active" data-filter="all" title="Show all extracted timestamps">All</button>
                <button class="yt-sk-chip" data-filter="ques" title="Show only Question Start timestamps">❓ Ques</button>
                <button class="yt-sk-chip" data-filter="ans" title="Show only Correct Option timestamps">🎯 Option</button>
                <button class="yt-sk-chip" data-filter="explain" title="Show only Answer Explanation timestamps">💡 Explain</button>
            </div>

            <div class="yt-sk-list" id="yt-sk-list">
                <div class="yt-sk-empty-placeholder">
                    No chapters loaded yet.<br>Click <b>⚡ Dual Scan</b> above or use the <b>📝 Editor</b>.
                </div>
            </div>
            <div class="yt-sk-btn-row">
                <button class="yt-sk-btn yt-sk-btn-success" id="yt-sk-btn-save" title="Save to Turso DB">☁️ Save to DB</button>
                <button class="yt-sk-btn" id="yt-sk-btn-load" title="Load from Turso DB">🔄 Load DB</button>
                <button class="yt-sk-btn" id="yt-sk-btn-copy-chapters" title="Copy chapters markdown">📋 Copy</button>
            </div>
        </div>

        <!-- TAB 2: EDITOR (For Question / MCQs / Lecture Notes) -->
        <div class="yt-sk-tab-content" id="yt-sk-tab-editor">
            <div class="yt-sk-editor-toolbar">
                <button class="yt-sk-btn" id="yt-sk-btn-fetch-transcript" title="Auto-fetch video transcript with timestamps">📜 Fetch Transcript</button>
                <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-btn-ai" title="AI Generate Question & Chapter Names">✨ AI Generate Titles</button>
                <button class="yt-sk-btn" id="yt-sk-btn-clean" title="Sort & format timestamps">🧹 Clean</button>
                <button class="yt-sk-btn" id="yt-sk-btn-copy" title="Copy raw editor text">📋 Copy</button>
            </div>
            <div class="yt-sk-textarea-container">
                <div id="yt-sk-textarea-highlights" class="yt-sk-textarea-layer"></div>
                <textarea id="yt-sk-textarea" class="yt-sk-textarea-layer" spellcheck="false" placeholder="Enter timestamps e.g.&#10;01:23 Introduction&#10;04:56 Topic Discussion&#10;08:12 Q1: Question title"></textarea>
            </div>
            <div class="yt-sk-editor-hint">
                Format: <code>MM:SS Title</code> or <code>HH:MM:SS Title</code> • Syncs live with Chapters
            </div>
        </div>

        <!-- TAB 3: SPONSORBLOCK (Dedicated Non-Educational & Sponsor Segments) -->
        <div class="yt-sk-tab-content" id="yt-sk-tab-sponsorblock">
            <!-- Action Bar -->
            <div class="yt-sk-sb-actions-bar">
                <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-btn-scan-removable" title="Scan transcript for sponsors, tangents, and jokes">🤖 AI Scan Segments</button>
                <button class="yt-sk-btn" id="yt-sk-sb-btn-toggle-paste" title="Paste table or intervals text">📋 Quick Paste</button>
                <button class="yt-sk-btn" id="yt-sk-sb-btn-toggle-manual" title="Add interval manually (Alt+S)">➕ Add Manual</button>
            </div>

            <!-- Collapsible Quick Paste Drawer -->
            <div class="yt-sk-sb-drawer" id="yt-sk-sb-paste-drawer" style="display:none;">
                <div class="yt-sk-sb-drawer-header">
                    <span>📋 Quick Paste (Markdown Table or Intervals)</span>
                    <button class="yt-sk-drawer-close" id="yt-sk-sb-btn-close-paste" title="Close">✕</button>
                </div>
                <textarea id="yt-sk-sb-quick-paste-input" class="yt-sk-turso-input yt-sk-drawer-textarea" placeholder="| 1 | 00:00 | 00:10 | INTRO | Greeting |&#10;or [04:14]-[04:31] SELFPROMO"></textarea>
                <div class="yt-sk-btn-row">
                    <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-sb-btn-apply-paste" style="flex:1;">⚡ Import Segments</button>
                    <button class="yt-sk-btn" id="yt-sk-sb-btn-paste-clipboard">📋 Paste Clipboard</button>
                </div>
            </div>

            <!-- Collapsible Manual Segment Drawer -->
            <div class="yt-sk-sb-drawer" id="yt-sk-sb-manual-drawer" style="display:none;">
                <div class="yt-sk-sb-drawer-header">
                    <span>⚡ Add Manual Interval</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="yt-sk-hotkey-badge" title="Press Alt+S while video plays">Hotkey: Alt+S</span>
                        <button class="yt-sk-drawer-close" id="yt-sk-sb-btn-close-manual" title="Close">✕</button>
                    </div>
                </div>
                <div class="yt-sk-sb-manual-grid">
                    <div class="yt-sk-sb-time-group">
                        <label>Start</label>
                        <div class="yt-sk-sb-time-wrap">
                            <input type="text" id="yt-sk-sb-input-start" class="yt-sk-turso-input yt-sk-sb-mini-input" placeholder="00:00:00">
                            <button class="yt-sk-btn yt-sk-sb-curr-btn" id="yt-sk-sb-btn-curr-start" title="Grab current video time as Start">Now</button>
                        </div>
                    </div>
                    <div class="yt-sk-sb-time-group">
                        <label>End</label>
                        <div class="yt-sk-sb-time-wrap">
                            <input type="text" id="yt-sk-sb-input-end" class="yt-sk-turso-input yt-sk-sb-mini-input" placeholder="00:00:00">
                            <button class="yt-sk-btn yt-sk-sb-curr-btn" id="yt-sk-sb-btn-curr-end" title="Grab current video time as End">Now</button>
                        </div>
                    </div>
                </div>
                <div class="yt-sk-sb-manual-row" style="margin-top:6px;">
                    <select id="yt-sk-sb-select-cat" class="yt-sk-turso-input" style="flex:1; cursor:pointer; font-weight:600; padding:6px 8px; margin-bottom:0;">
                        <option value="SPONSOR" selected>Sponsor (Paid Ad)</option>
                        <option value="SELFPROMO">Self-Promotion (App, Course, Book)</option>
                        <option value="INTERACTION">Interaction (Like, Sub, Bell, Telegram)</option>
                        <option value="INTRO">Intro (Greetings, Silence)</option>
                        <option value="OUTRO">Outro (Endcards, Goodbye)</option>
                        <option value="PREVIEW">Preview (Recap, Timeline)</option>
                        <option value="FILLER">Filler (Banter, Tangents, Jokes)</option>
                    </select>
                </div>
                <div class="yt-sk-sb-manual-row" style="margin-top:6px;">
                    <input type="text" id="yt-sk-sb-input-reason" class="yt-sk-turso-input" style="flex:1; margin-bottom:0;" placeholder="Reason (e.g. App promo, casual chat)...">
                    <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-sb-btn-add-segment" style="white-space:nowrap; padding:6px 12px; font-weight:700;">➕ Add</button>
                </div>
            </div>

            <!-- Safety Limit Status Card -->
            <div class="yt-sk-sb-safety-card" id="yt-sk-sb-safety">
                <div class="yt-sk-safety-header">
                    <span class="yt-sk-safety-title">🛡️ Safety Limit (Max 80% video)</span>
                    <span id="yt-sk-sb-ratio" class="yt-sk-safety-badge safe">0% (Safe)</span>
                </div>
                <div class="yt-sk-safety-track">
                    <div id="yt-sk-sb-safety-fill" class="yt-sk-safety-fill" style="width: 0%;"></div>
                </div>
            </div>

            <!-- Cards Header & View Toggle -->
            <div class="yt-sk-sb-meta-bar">
                <span id="yt-sk-sb-count-badge" class="yt-sk-meta-count">0 Segments</span>
                <div class="yt-sk-sb-toggle-view" id="yt-sk-sb-toggle-view">
                    <span id="yt-sk-sb-toggle-label">👁️ View: Cards</span>
                    <span style="font-size:10px; opacity:0.7;">Switch to Raw ⇄</span>
                </div>
            </div>

            <!-- Card View -->
            <div id="yt-sk-sb-cards" class="yt-sk-sb-cards-container">
                <div class="yt-sk-empty-placeholder">
                    No segments detected yet.<br>Click <b>🤖 AI Scan</b> or <b>📋 Quick Paste</b> above.
                </div>
            </div>

            <!-- Raw Text / Intervals View (Initially hidden) -->
            <div id="yt-sk-sb-raw-container" style="display:none; flex-direction:column; gap:8px;">
                <textarea id="yt-sk-sb-raw-textarea" class="yt-sk-turso-input" style="height:120px; font-family:'Fira Code', monospace; font-size:11px; line-height:1.4; resize:vertical; margin-bottom:0;" placeholder="Detected table and [HH:MM:SS]-[HH:MM:SS] intervals will appear here..."></textarea>
            </div>

            <!-- Single Source of Truth Upload Toolbar -->
            <div class="yt-sk-sb-footer-bar">
                <button class="yt-sk-btn yt-sk-btn-primary yt-sk-sb-upload-btn" id="yt-sk-btn-upload-sb" title="Upload all detected segments to SponsorBlock API">🚀 Upload to SponsorBlock</button>
                <button class="yt-sk-btn" id="yt-sk-btn-copy-sb" title="Copy SponsorBlock intervals to clipboard">📋 Copy Format</button>
            </div>
        </div>

        <!-- TAB 4: SETTINGS -->
        <div class="yt-sk-tab-content" id="yt-sk-tab-settings">
            <div class="yt-sk-section-title">Custom Shortcuts</div>
            <div class="yt-sk-shortcut-grid">
                <div class="yt-sk-shortcut-item">
                    <label>Next Chapter</label>
                    <div id="yt-sk-sc-next" class="yt-sk-shortcut-input">]</div>
                </div>
                <div class="yt-sk-shortcut-item">
                    <label>Prev Chapter</label>
                    <div id="yt-sk-sc-prev" class="yt-sk-shortcut-input">[</div>
                </div>
                <div class="yt-sk-shortcut-item">
                    <label>Add Timestamp</label>
                    <div id="yt-sk-sc-add" class="yt-sk-shortcut-input">Alt+X</div>
                </div>
                <div class="yt-sk-shortcut-item">
                    <label>Mark Sponsor (SB)</label>
                    <div id="yt-sk-sc-sb" class="yt-sk-shortcut-input" title="Press once for Start, again for End">Alt+S</div>
                </div>
            </div>

            <div class="yt-sk-section-title" style="margin-top:6px;">AI Provider</div>
            <select id="yt-sk-ai-provider" style="width:100%; padding:8px 10px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#00f2fe; cursor:pointer; outline:none; margin-bottom:8px; font-weight:600;">
                <option value="aikit">AIKit Qwen (Claude Code API) - Active</option>
                <option value="openrouter">OpenRouter AI</option>
                <option value="custom">🛠️ Custom Provider (Local / OpenAI-compatible)</option>
            </select>

            <!-- AIKit (Claude Code API / Qwen) -->
            <div id="yt-sk-panel-aikit">
                <div class="yt-sk-section-title">Model</div>
                <select id="yt-sk-aikit-model" style="width:100%; padding:8px 10px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; outline:none; margin-bottom:6px;">
                    <option value="qwen3.8-max">qwen3.8-max (Recommended - Fast & Powerful)</option>
                    <option value="qwen3.7-plus">qwen3.7-plus</option>
                </select>
                <div class="yt-sk-section-title">Auth Token (JWT)</div>
                <input type="password" id="yt-sk-aikit-token" class="yt-sk-turso-input" placeholder="ANTHROPIC_AUTH_TOKEN">
                <div class="yt-sk-section-title">Endpoint URL</div>
                <input type="text" id="yt-sk-aikit-url" class="yt-sk-turso-input" value="https://claude.aikit.club/qwen.aikit.club/v1">
            </div>

            <!-- OpenRouter -->
            <div id="yt-sk-panel-openrouter" style="display:none;">
                <div class="yt-sk-section-title">OpenRouter API Key</div>
                <input type="password" id="yt-sk-openrouter-key" class="yt-sk-turso-input" placeholder="sk-or-v1-...">
                <div class="yt-sk-section-title">Model</div>
                <input type="text" id="yt-sk-openrouter-model" class="yt-sk-turso-input" placeholder="google/gemma-4-31b-it:free">
            </div>

            <!-- Custom OpenAI-compatible Provider (Local e.g. 127.0.0.1:8002/v1 or Remote) -->
            <div id="yt-sk-panel-custom" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div class="yt-sk-section-title" style="margin:0;">Custom Profiles</div>
                    <div style="display:flex; gap:4px;">
                        <button id="yt-sk-custom-btn-new-profile" class="yt-sk-btn yt-sk-btn-sm" style="font-size:10px; padding:2px 7px;">➕ New</button>
                        <button id="yt-sk-custom-btn-del-profile" class="yt-sk-btn yt-sk-btn-sm" style="font-size:10px; padding:2px 7px; color:#ff6b6b;">🗑️</button>
                    </div>
                </div>
                <select id="yt-sk-custom-profile-select" style="width:100%; padding:6px 8px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; outline:none; margin-bottom:6px;">
                    <option value="default">Local Radio House (8002)</option>
                </select>

                <div class="yt-sk-section-title">Provider Name</div>
                <input type="text" id="yt-sk-custom-name" class="yt-sk-turso-input" value="Local Radio House (8002)" placeholder="e.g. Local vLLM, Ollama, DeepSeek">

                <div class="yt-sk-section-title">Base URL / Endpoint</div>
                <input type="text" id="yt-sk-custom-url" class="yt-sk-turso-input" value="http://127.0.0.1:8002/v1" placeholder="http://127.0.0.1:8002/v1">
                <div style="font-size:10px; color:var(--yt-sk-text-muted); margin-top:-4px; margin-bottom:6px;">
                    Endpoint: <code>http://127.0.0.1:8002/v1</code> or any OpenAI-compatible base.
                </div>

                <div class="yt-sk-section-title">API Key (Optional)</div>
                <input type="password" id="yt-sk-custom-key" class="yt-sk-turso-input" placeholder="Leave empty for local servers without auth">

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div class="yt-sk-section-title" style="margin:0;">Model</div>
                    <button id="yt-sk-custom-btn-fetch-models" class="yt-sk-btn yt-sk-btn-sm" style="font-size:10px; padding:2px 8px; background:rgba(0,242,254,0.15); color:var(--yt-sk-accent); border:1px solid rgba(0,242,254,0.3);">🔄 Fetch Models</button>
                </div>
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                    <select id="yt-sk-custom-model-select" style="flex:1; padding:7px 8px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; outline:none;">
                        <option value="qwen3.8-flash" selected>qwen3.8-flash (Recommended)</option>
                        <option value="deepseek-v4-flash-0731">deepseek-v4-flash-0731</option>
                        <option value="gemma-4-31b-it">gemma-4-31b-it</option>
                        <option value="__custom__">✏️ Enter Custom Model Name...</option>
                    </select>
                    <input type="text" id="yt-sk-custom-model-manual" class="yt-sk-turso-input" style="flex:1; display:none; margin:0;" placeholder="model name">
                </div>
                <div id="yt-sk-custom-models-status" style="font-size:10px; color:var(--yt-sk-text-muted); margin-top:-4px; margin-bottom:6px; display:none;"></div>

                <div class="yt-sk-toggle-row" style="margin-top:6px; margin-bottom:8px; padding:6px 8px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
                    <div class="yt-sk-toggle-text">
                        <div class="yt-sk-toggle-title" style="display:flex; align-items:center; gap:6px;">
                            <span>⚡ Full Transcript (No Chunking)</span>
                            <span id="yt-sk-custom-128k-badge" style="display:none; font-size:9px; background:rgba(0,242,254,0.2); color:#00f2fe; padding:1px 5px; border-radius:4px; font-weight:700;">128k+ OK</span>
                        </div>
                        <div class="yt-sk-toggle-desc">Send entire transcript at once. Auto-enabled for GLM 5.3 (Lucky Cat / Proton Lumo).</div>
                    </div>
                    <label class="yt-sk-switch">
                        <input type="checkbox" id="yt-sk-custom-no-chunking">
                        <span class="yt-sk-slider"></span>
                    </label>
                </div>
            </div>
            
            <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-btn-test-ai" style="margin-top:4px; margin-bottom: 6px;">⚡ Test AI Connection</button>
            <div id="yt-sk-ai-test-result" style="display:none; font-size:11px; padding:6px 10px; border-radius:6px; margin-bottom:8px; line-height: 1.4;"></div>

            <!-- SponsorBlock Integration -->
            <div class="yt-sk-section-title" style="margin-top:6px;">SponsorBlock API Integration</div>
            <input type="password" id="yt-sk-sb-user-id" class="yt-sk-turso-input" placeholder="SponsorBlock Private User ID (UUID)">
            <div style="font-size:10px; color:var(--yt-sk-text-muted); margin-top:-4px; margin-bottom:6px;">Find in SponsorBlock Extension Options > Settings > Copy Private User ID.</div>
            <select id="yt-sk-sb-category-mode" style="width:100%; padding:8px 10px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#00f2fe; cursor:pointer; outline:none; margin-bottom:8px; font-weight:600;">
                <option value="sponsor_only">Category: Permanent "Sponsor" (Safe Default)</option>
                <option value="mapped">Category: Map AI Categories (Sponsor / SelfPromo / Filler / Intro / Outro)</option>
            </select>

            <!-- TranscriptAPI.com Fallback -->
            <div class="yt-sk-section-title" style="margin-top:6px;">TranscriptAPI.com (Fallback Fetcher)</div>
            <input type="password" id="yt-sk-transcript-api-key" class="yt-sk-turso-input" placeholder="sk_ZDrY9xqIVpMGguu0pWru_CEUtmHO-eMW1rWqf_Wk7WA (Default)">
            <div style="font-size:10px; color:var(--yt-sk-text-muted); margin-top:-4px; margin-bottom:6px;">Automatic fallback when native YouTube transcript is unavailable or blocked.</div>

            <div class="yt-sk-section-title" style="margin-top:6px;">Turso Database (Optional)</div>
            <input type="text" id="yt-sk-turso-url" class="yt-sk-turso-input" placeholder="Turso Database URL">
            <input type="password" id="yt-sk-turso-token" class="yt-sk-turso-input" placeholder="Turso Auth Token">


            <div class="yt-sk-section-title" style="margin-top:8px;">Auto Timestamp Maker (AI)</div>
            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Auto Generate on Video Open</div>
                    <div class="yt-sk-toggle-desc">Auto-extract transcript & generate chapters with AI</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-auto-generate">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Auto Save to DB & Post Comment</div>
                    <div class="yt-sk-toggle-desc">Automatically save to Turso DB & post comment on YouTube</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-auto-save-sync">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Auto SponsorBlock Segment Uploader</div>
                    <div class="yt-sk-toggle-desc">Scan removable intervals & auto-upload to SponsorBlock after chapters</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-auto-upload-sb">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <div class="yt-sk-section-title" style="margin-top:4px;">Manual Save Preferences</div>
            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Post timestamps as comment</div>
                    <div class="yt-sk-toggle-desc">Auto-post concise Q# & Ans on YouTube when saving</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-auto-comment">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <div class="yt-sk-section-title" style="margin-top:4px;">Mini Floating Player</div>
            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Show Mini Player Widget</div>
                    <div class="yt-sk-toggle-desc">Floating bar at bottom with next/prev buttons</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-show-mini-widget">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <!-- COMPLETION SOUND EFFECT -->
            <div class="yt-sk-section-title" style="margin-top:6px;">Completion Sound Effect</div>
            <div class="yt-sk-toggle-row">
                <div class="yt-sk-toggle-text">
                    <div class="yt-sk-toggle-title">Play Sound on AI Done</div>
                    <div class="yt-sk-toggle-desc">Play audio alert when chapters finish generating</div>
                </div>
                <label class="yt-sk-switch">
                    <input type="checkbox" id="yt-sk-sound-enabled">
                    <span class="yt-sk-slider"></span>
                </label>
            </div>

            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                <input type="text" id="yt-sk-sound-url" class="yt-sk-turso-input" style="margin-bottom:0;" placeholder="Default: Anime Wow (or paste MP3 URL / select file)">
                <button class="yt-sk-btn" id="yt-sk-btn-browse-sound" style="padding: 7px 10px; font-size:10px; white-space:nowrap;" title="Upload custom audio file">📁 File</button>
                <input type="file" id="yt-sk-sound-file-input" accept="audio/*" style="display:none;">
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; background: var(--yt-sk-btn-bg); padding: 7px 10px; border-radius: 8px; border: 1px solid var(--yt-sk-btn-border);">
                <div style="display:flex; align-items:center; gap: 8px; flex: 1;">
                    <span style="font-size:11px; font-weight:600; color:var(--yt-sk-text);">🔊 Volume</span>
                    <input type="range" id="yt-sk-sound-volume" min="0" max="100" value="80" style="flex:1; cursor:pointer; accent-color: var(--yt-sk-accent);">
                    <span id="yt-sk-volume-val" style="font-size:10px; font-weight:700; color:var(--yt-sk-accent); min-width:28px;">80%</span>
                </div>
                <button class="yt-sk-btn" id="yt-sk-btn-test-sound" style="margin-left: 10px; padding: 4px 10px; font-size: 10px; font-weight: 700; border-color: var(--yt-sk-accent);" title="Play test sound">▶ Test</button>
            </div>

            <button id="yt-sk-btn-save-settings">Save All Settings</button>
        </div>

        <!-- FOOTER -->
        <div class="yt-sk-footer">
            made with 💖 by <a href="https://github.com/pavnxet/yt-timestamp-skipper" target="_blank">pavnxet</a>
        </div>
    `;
    document.body.appendChild(dashboard);

    const statusObj = document.getElementById('yt-sk-status');
    const textarea = document.getElementById('yt-sk-textarea');
    const highlights = document.getElementById('yt-sk-textarea-highlights');
    const list = document.getElementById('yt-sk-list');
    const modeSelect = document.getElementById('yt-sk-mode');
    const urlInput = document.getElementById('yt-sk-turso-url');
    const tokenInput = document.getElementById('yt-sk-turso-token');
    const scNext = document.getElementById('yt-sk-sc-next');
    const scPrev = document.getElementById('yt-sk-sc-prev');
    const scAdd = document.getElementById('yt-sk-sc-add');

    const aiProviderSelect = document.getElementById('yt-sk-ai-provider');
    const panelAikit = document.getElementById('yt-sk-panel-aikit');
    const panelOpenrouter = document.getElementById('yt-sk-panel-openrouter');
    const aikitModelSelect = document.getElementById('yt-sk-aikit-model');
    const aikitTokenInput = document.getElementById('yt-sk-aikit-token');
    const aikitUrlInput = document.getElementById('yt-sk-aikit-url');
    const openrouterKeyInput = document.getElementById('yt-sk-openrouter-key');
    const openrouterModelInput = document.getElementById('yt-sk-openrouter-model');
    
    // Custom Provider Elements
    const panelCustom = document.getElementById('yt-sk-panel-custom');
    const customProfileSelect = document.getElementById('yt-sk-custom-profile-select');
    const btnCustomNewProfile = document.getElementById('yt-sk-custom-btn-new-profile');
    const btnCustomDelProfile = document.getElementById('yt-sk-custom-btn-del-profile');
    const customNameInput = document.getElementById('yt-sk-custom-name');
    const customUrlInput = document.getElementById('yt-sk-custom-url');
    const customKeyInput = document.getElementById('yt-sk-custom-key');
    const customModelSelect = document.getElementById('yt-sk-custom-model-select');
    const customModelManual = document.getElementById('yt-sk-custom-model-manual');
    const btnCustomFetchModels = document.getElementById('yt-sk-custom-btn-fetch-models');
    const customModelsStatus = document.getElementById('yt-sk-custom-models-status');
    const customNoChunkingToggle = document.getElementById('yt-sk-custom-no-chunking');
    const custom128kBadge = document.getElementById('yt-sk-custom-128k-badge');

    // SponsorBlock Elements
    const sbUserIdInput = document.getElementById('yt-sk-sb-user-id');
    const sbCategoryModeSelect = document.getElementById('yt-sk-sb-category-mode');
    const transcriptApiKeyInput = document.getElementById('yt-sk-transcript-api-key');
    const btnScanRemovable = document.getElementById('yt-sk-btn-scan-removable');
    const btnUploadSb = document.getElementById('yt-sk-btn-upload-sb');
    const sbCardsContainer = document.getElementById('yt-sk-sb-cards');
    const sbRawContainer = document.getElementById('yt-sk-sb-raw-container');
    const sbRawTextarea = document.getElementById('yt-sk-sb-raw-textarea');
    const btnCopySb = document.getElementById('yt-sk-btn-copy-sb');
    const sbToggleView = document.getElementById('yt-sk-sb-toggle-view');
    const sbToggleLabel = document.getElementById('yt-sk-sb-toggle-label');
    const sbCountBadge = document.getElementById('yt-sk-sb-count-badge');
    const sbRatioBadge = document.getElementById('yt-sk-sb-ratio');
    const sbSafetyFill = document.getElementById('yt-sk-sb-safety-fill');

    // Drawer Toggles
    const btnTogglePaste = document.getElementById('yt-sk-sb-btn-toggle-paste');
    const pasteDrawer = document.getElementById('yt-sk-sb-paste-drawer');
    const btnClosePaste = document.getElementById('yt-sk-sb-btn-close-paste');
    const sbQuickPasteInput = document.getElementById('yt-sk-sb-quick-paste-input');
    const sbBtnApplyPaste = document.getElementById('yt-sk-sb-btn-apply-paste');
    const sbBtnPasteClipboard = document.getElementById('yt-sk-sb-btn-paste-clipboard');

    const btnToggleManual = document.getElementById('yt-sk-sb-btn-toggle-manual');
    const manualDrawer = document.getElementById('yt-sk-sb-manual-drawer');
    const btnCloseManual = document.getElementById('yt-sk-sb-btn-close-manual');
    const sbInputStart = document.getElementById('yt-sk-sb-input-start');
    const sbInputEnd = document.getElementById('yt-sk-sb-input-end');
    const sbBtnCurrStart = document.getElementById('yt-sk-sb-btn-curr-start');
    const sbBtnCurrEnd = document.getElementById('yt-sk-sb-btn-curr-end');
    const sbSelectCat = document.getElementById('yt-sk-sb-select-cat');
    const sbInputReason = document.getElementById('yt-sk-sb-input-reason');
    const sbBtnAddSegment = document.getElementById('yt-sk-sb-btn-add-segment');

    // Header & Utility
    const headerDualScanBtn = document.getElementById('yt-sk-btn-header-dual-scan');
    const btnCopyChapters = document.getElementById('yt-sk-btn-copy-chapters');
    const btnTestAi = document.getElementById('yt-sk-btn-test-ai');
    const aiTestResult = document.getElementById('yt-sk-ai-test-result');
    const btnClose = document.getElementById('yt-sk-btn-close');
    const btnMin = document.getElementById('yt-sk-btn-min');
    const header = document.getElementById('yt-sk-header');

    // Toggle Paste Drawer
    if (btnTogglePaste && pasteDrawer) {
        btnTogglePaste.onclick = () => {
            const isHidden = pasteDrawer.style.display === 'none';
            pasteDrawer.style.display = isHidden ? 'flex' : 'none';
            if (manualDrawer) manualDrawer.style.display = 'none';
            if (isHidden && sbQuickPasteInput) sbQuickPasteInput.focus();
        };
    }
    if (btnClosePaste && pasteDrawer) {
        btnClosePaste.onclick = () => pasteDrawer.style.display = 'none';
    }

    // Toggle Manual Drawer
    if (btnToggleManual && manualDrawer) {
        btnToggleManual.onclick = () => {
            const isHidden = manualDrawer.style.display === 'none';
            manualDrawer.style.display = isHidden ? 'flex' : 'none';
            if (pasteDrawer) pasteDrawer.style.display = 'none';
            if (isHidden && sbInputStart) sbInputStart.focus();
        };
    }
    if (btnCloseManual && manualDrawer) {
        btnCloseManual.onclick = () => manualDrawer.style.display = 'none';
    }

    // Dragging Logic for Dashboard Header (Mouse & Touch)
    let isDraggingDash = false, dashOffset = [0, 0];
    const startDashDrag = (clientX, clientY, target) => {
        if (window.innerWidth <= 600) return; // On mobile, dashboard is docked to bottom sheet
        if (target.closest && target.closest('.yt-sk-header-actions')) return;
        isDraggingDash = true;
        const rect = dashboard.getBoundingClientRect();
        dashOffset = [rect.left - clientX, rect.top - clientY];
        dashboard.style.transition = 'none';
    };
    const moveDashDrag = (clientX, clientY) => {
        if (!isDraggingDash) return;
        const left = Math.max(10, Math.min(window.innerWidth - dashboard.offsetWidth - 10, clientX + dashOffset[0]));
        const top = Math.max(10, Math.min(window.innerHeight - 50, clientY + dashOffset[1]));
        dashboard.style.left = left + 'px';
        dashboard.style.top = top + 'px';
        dashboard.style.right = 'auto';
    };
    const endDashDrag = () => {
        if (isDraggingDash) {
            isDraggingDash = false;
            dashboard.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
        }
    };

    header.onmousedown = (e) => startDashDrag(e.clientX, e.clientY, e.target);
    document.addEventListener('mousemove', (e) => moveDashDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDashDrag);

    header.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
            startDashDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
        }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (isDraggingDash && e.touches && e.touches[0]) {
            moveDashDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });
    document.addEventListener('touchend', endDashDrag);

    // Close & Minimize
    btnClose.onclick = () => dashboard.classList.remove('yt-sk-visible');
    btnMin.onclick = () => dashboard.classList.toggle('yt-sk-minimized');

    // Double-click header to Minimize / Maximize
    header.ondblclick = (e) => {
        if (e.target.closest('.yt-sk-header-actions')) return;
        dashboard.classList.toggle('yt-sk-minimized');
    };

    // Tab Switching
    dashboard.querySelectorAll('.yt-sk-tab-btn').forEach(btn => {
        btn.onclick = () => {
            dashboard.querySelectorAll('.yt-sk-tab-btn').forEach(b => b.classList.remove('active'));
            dashboard.querySelectorAll('.yt-sk-tab-content').forEach(c => {
                c.classList.remove('active');
                c.style.display = '';
            });
            btn.classList.add('active');
            const tabId = 'yt-sk-tab-' + btn.getAttribute('data-tab');
            const panel = document.getElementById(tabId);
            if (panel) panel.classList.add('active');
            if (btn.getAttribute('data-tab') === 'editor' && textarea) {
                textarea.value = currentRawText;
                applyHighlights(currentRawText);
            }
        };
    });

    aiProviderSelect.onchange = () => {
        const prov = aiProviderSelect.value;
        panelAikit.style.display = (prov === 'aikit') ? 'block' : 'none';
        panelOpenrouter.style.display = (prov === 'openrouter') ? 'block' : 'none';
        if (panelCustom) panelCustom.style.display = (prov === 'custom') ? 'block' : 'none';
    };

    // Custom Provider Profile & Model logic
    let customProfiles = [
        {
            id: 'default',
            name: 'Local Radio House (8002)',
            url: 'http://127.0.0.1:8002/v1',
            key: '',
            model: 'qwen3.8-flash',
            models: ['qwen3.8-flash', 'deepseek-v4-flash-0731', 'gemma-4-31b-it', 'gpt-oss-120b']
        }
    ];

    const renderCustomProfilesSelect = (activeId) => {
        if (!customProfileSelect) return;
        customProfileSelect.innerHTML = '';
        customProfiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.model || 'default'})`;
            if (p.id === activeId) opt.selected = true;
            customProfileSelect.appendChild(opt);
        });
    };

    const applyCustomProfile = (prof) => {
        if (!prof) return;
        if (customNameInput) customNameInput.value = prof.name || '';
        if (customUrlInput) customUrlInput.value = prof.url || 'http://127.0.0.1:8002/v1';
        if (customKeyInput) customKeyInput.value = prof.key || '';
        
        // Populate model dropdown
        if (customModelSelect) {
            customModelSelect.innerHTML = '';
            const list = Array.isArray(prof.models) && prof.models.length ? prof.models : ['qwen3.8-flash', 'deepseek-v4-flash-0731', 'gemma-4-31b-it'];
            list.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                if (m === prof.model) opt.selected = true;
                customModelSelect.appendChild(opt);
            });
            const customOpt = document.createElement('option');
            customOpt.value = '__custom__';
            customOpt.textContent = '✏️ Enter Custom Model Name...';
            customModelSelect.appendChild(customOpt);

            if (prof.model && !list.includes(prof.model)) {
                customOpt.selected = true;
                if (customModelManual) {
                    customModelManual.style.display = 'block';
                    customModelManual.value = prof.model;
                }
            } else {
                if (customModelManual) customModelManual.style.display = 'none';
            }

            if (customNoChunkingToggle) {
                const mStr = (prof.model || '').toLowerCase();
                const isGlm = mStr.includes('glm-5') || mStr.includes('glm5') || mStr.includes('glm 5') || mStr.includes('lumo-max') || mStr.includes('lucky-cat');
                customNoChunkingToggle.checked = prof.disableChunking === true || isGlm;
                if (custom128kBadge) custom128kBadge.style.display = (prof.disableChunking === true || isGlm) ? 'inline-block' : 'none';
            }
        }
    };

    function checkAndUpdateGlmAutoToggle() {
        const chosen = (customModelSelect && customModelSelect.value !== '__custom__')
            ? customModelSelect.value
            : (customModelManual ? customModelManual.value.trim() : '');
        const isGlm = chosen.toLowerCase().includes('glm-5') || chosen.toLowerCase().includes('glm5') || chosen.toLowerCase().includes('glm 5') || chosen.toLowerCase().includes('lumo-max') || chosen.toLowerCase().includes('lucky-cat');
        if (isGlm && customNoChunkingToggle) {
            customNoChunkingToggle.checked = true;
        }
        if (custom128kBadge) {
            custom128kBadge.style.display = (customNoChunkingToggle?.checked || isGlm) ? 'inline-block' : 'none';
        }
    }

    if (customNoChunkingToggle) {
        customNoChunkingToggle.onchange = () => {
            if (custom128kBadge) custom128kBadge.style.display = customNoChunkingToggle.checked ? 'inline-block' : 'none';
        };
    }

    if (customModelSelect) {
        customModelSelect.onchange = () => {
            if (customModelSelect.value === '__custom__') {
                if (customModelManual) {
                    customModelManual.style.display = 'block';
                    customModelManual.focus();
                }
            } else {
                if (customModelManual) customModelManual.style.display = 'none';
            }
            checkAndUpdateGlmAutoToggle();
        };
    }

    if (customModelManual) {
        customModelManual.oninput = () => {
            checkAndUpdateGlmAutoToggle();
        };
    }

    if (customProfileSelect) {
        customProfileSelect.onchange = () => {
            const selId = customProfileSelect.value;
            const found = customProfiles.find(p => p.id === selId);
            if (found) applyCustomProfile(found);
        };
    }

    if (btnCustomNewProfile) {
        btnCustomNewProfile.onclick = () => {
            const newName = prompt('Enter name for new Custom Provider profile:', 'My Local AI');
            if (!newName) return;
            const newId = 'prof_' + Date.now();
            const newProf = {
                id: newId,
                name: newName.trim(),
                url: 'http://127.0.0.1:8002/v1',
                key: '',
                model: 'qwen3.8-flash',
                models: ['qwen3.8-flash', 'deepseek-v4-flash-0731', 'gemma-4-31b-it']
            };
            customProfiles.push(newProf);
            renderCustomProfilesSelect(newId);
            applyCustomProfile(newProf);
            chrome.storage.local.set({ customProfiles, customActiveProfileId: newId });
            showToast('➕ Created new profile: ' + newProf.name);
        };
    }

    if (btnCustomDelProfile) {
        btnCustomDelProfile.onclick = () => {
            if (customProfiles.length <= 1) {
                showToast('⚠️ Cannot delete the only remaining profile.');
                return;
            }
            const activeId = customProfileSelect.value;
            const toDel = customProfiles.find(p => p.id === activeId);
            if (!confirm(`Delete profile "${toDel?.name || 'this'}"?`)) return;
            customProfiles = customProfiles.filter(p => p.id !== activeId);
            renderCustomProfilesSelect(customProfiles[0].id);
            applyCustomProfile(customProfiles[0]);
            chrome.storage.local.set({ customProfiles, customActiveProfileId: customProfiles[0].id });
            showToast('🗑️ Profile deleted');
        };
    }

    if (btnCustomFetchModels) {
        btnCustomFetchModels.onclick = () => {
            const rawUrl = customUrlInput ? customUrlInput.value.trim() : 'http://127.0.0.1:8002/v1';
            const rawKey = customKeyInput ? customKeyInput.value.trim() : '';
            
            btnCustomFetchModels.disabled = true;
            btnCustomFetchModels.textContent = '⏳ Fetching...';
            if (customModelsStatus) {
                customModelsStatus.style.display = 'block';
                customModelsStatus.style.color = 'var(--yt-sk-accent)';
                customModelsStatus.textContent = 'Connecting to ' + rawUrl + '/models...';
            }

            chrome.runtime.sendMessage({
                action: 'fetchCustomModels',
                baseUrl: rawUrl,
                apiKey: rawKey
            }, res => {
                btnCustomFetchModels.disabled = false;
                btnCustomFetchModels.textContent = '🔄 Fetch Models';
                if (res && res.success && Array.isArray(res.data?.models) && res.data.models.length > 0) {
                    const fetchedModels = res.data.models;
                    if (customModelsStatus) {
                        customModelsStatus.style.color = '#00e676';
                        customModelsStatus.textContent = `✅ Successfully fetched ${fetchedModels.length} models!`;
                    }
                    if (customModelSelect) {
                        const currentVal = customModelSelect.value;
                        customModelSelect.innerHTML = '';
                        fetchedModels.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m;
                            opt.textContent = m;
                            if (m === currentVal || (!currentVal && m.includes('flash'))) opt.selected = true;
                            customModelSelect.appendChild(opt);
                        });
                        const customOpt = document.createElement('option');
                        customOpt.value = '__custom__';
                        customOpt.textContent = '✏️ Enter Custom Model Name...';
                        customModelSelect.appendChild(customOpt);
                        if (customModelManual) customModelManual.style.display = 'none';
                    }

                    // Update active profile in memory
                    const activeId = customProfileSelect ? customProfileSelect.value : 'default';
                    const activeProf = customProfiles.find(p => p.id === activeId);
                    if (activeProf) {
                        activeProf.models = fetchedModels;
                        if (customModelSelect) activeProf.model = customModelSelect.value;
                        chrome.storage.local.set({ customProfiles });
                    }
                } else {
                    if (customModelsStatus) {
                        customModelsStatus.style.color = '#ff6b6b';
                        customModelsStatus.textContent = '❌ Failed: ' + (res?.error || 'Could not fetch models from server');
                    }
                }
            });
        };
    }

    if (!isExtValid()) return;
    chrome.storage.local.get([
        'tursoUrl', 'tursoToken', 
        'aiProvider', 'aiToken', 'aiModel', 'aiBaseUrl',
        'openrouterKey', 'openrouterModel',
        'customUrl', 'customApiKey', 'customModel', 'customProviderName', 'customProfiles', 'customActiveProfileId', 'disableChunking',
        'shortcuts',
        'autoComment', 'showMiniWidget', 'autoGenerate', 'autoSaveSync', 'autoUploadSb',
        'sbUserId', 'sbCategoryMode',
        'transcriptApiKey',
        'soundEnabled', 'soundUrl', 'soundVolume', 'soundCustomData'
    ], (res) => {
        if (!isExtValid() || !res) return;
        if (res.tursoUrl) urlInput.value = res.tursoUrl;
        if (res.tursoToken) tokenInput.value = res.tursoToken;

        // Auto Generate toggle
        const autoGenToggle = document.getElementById('yt-sk-auto-generate');
        if (autoGenToggle) {
            autoGenToggle.checked = !!res.autoGenerate;
            autoGenToggle.onchange = () => {
                chrome.storage.local.set({ autoGenerate: autoGenToggle.checked });
            };
        }

        // Auto Save to DB & Post Comment toggle
        const autoSaveSyncToggle = document.getElementById('yt-sk-auto-save-sync');
        if (autoSaveSyncToggle) {
            autoSaveSyncToggle.checked = !!res.autoSaveSync;
            autoSaveSyncToggle.onchange = () => {
                chrome.storage.local.set({ autoSaveSync: autoSaveSyncToggle.checked });
            };
        }

        // Auto SponsorBlock Segment Uploader toggle
        const autoUploadSbToggle = document.getElementById('yt-sk-auto-upload-sb');
        if (autoUploadSbToggle) {
            autoUploadSbToggle.checked = !!res.autoUploadSb;
            autoUploadSbToggle.onchange = () => {
                chrome.storage.local.set({ autoUploadSb: autoUploadSbToggle.checked });
            };
        }

        if (typeof res.autoComment !== 'undefined') {
            document.getElementById('yt-sk-auto-comment').checked = !!res.autoComment;
        } else {
            document.getElementById('yt-sk-auto-comment').checked = true; // default enabled
        }

        // Completion Sound Effect Settings
        const soundEnabledToggle = document.getElementById('yt-sk-sound-enabled');
        const soundUrlInput = document.getElementById('yt-sk-sound-url');
        const soundVolSlider = document.getElementById('yt-sk-sound-volume');
        const soundVolVal = document.getElementById('yt-sk-volume-val');
        const btnBrowseSound = document.getElementById('yt-sk-btn-browse-sound');
        const soundFileInput = document.getElementById('yt-sk-sound-file-input');
        const btnTestSound = document.getElementById('yt-sk-btn-test-sound');

        if (soundEnabledToggle) {
            soundEnabledToggle.checked = typeof res.soundEnabled === 'undefined' ? true : !!res.soundEnabled;
            soundEnabledToggle.onchange = () => {
                chrome.storage.local.set({ soundEnabled: soundEnabledToggle.checked });
            };
        }

        if (soundUrlInput) {
            soundUrlInput.value = res.soundUrl || '';
        }

        if (soundVolSlider) {
            const vol = typeof res.soundVolume !== 'undefined' ? res.soundVolume : 80;
            soundVolSlider.value = vol;
            if (soundVolVal) soundVolVal.textContent = vol + '%';
            soundVolSlider.oninput = () => {
                if (soundVolVal) soundVolVal.textContent = soundVolSlider.value + '%';
            };
            soundVolSlider.onchange = () => {
                chrome.storage.local.set({ soundVolume: Number(soundVolSlider.value) });
            };
        }

        if (btnBrowseSound && soundFileInput) {
            btnBrowseSound.onclick = () => soundFileInput.click();
            soundFileInput.onchange = () => {
                const file = soundFileInput.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataUrl = e.target.result;
                        chrome.storage.local.set({ 
                            soundCustomData: dataUrl,
                            soundUrl: file.name
                        }, () => {
                            if (soundUrlInput) soundUrlInput.value = file.name;
                            setStatus('SOUND LOADED', '#00e676');
                            playCompletionSound();
                        });
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (btnTestSound) {
            btnTestSound.onclick = () => {
                playCompletionSound();
                setStatus('PLAYING SOUND', '#00f2fe');
            };
        }

        // Restore Mini Floating Player preference into state + UI checkbox
        showMiniWidget = !!res.showMiniWidget;
        const miniToggleEl = document.getElementById('yt-sk-show-mini-widget');
        if (miniToggleEl) miniToggleEl.checked = showMiniWidget;
        updateMiniWidget();
        
        // Custom Provider profiles load
        if (Array.isArray(res.customProfiles) && res.customProfiles.length > 0) {
            customProfiles = res.customProfiles;
        }
        const activeProfId = res.customActiveProfileId || (customProfiles[0] ? customProfiles[0].id : 'default');
        renderCustomProfilesSelect(activeProfId);
        const activeProf = customProfiles.find(p => p.id === activeProfId) || customProfiles[0];
        if (activeProf) {
            applyCustomProfile(activeProf);
        }
        if (typeof res.disableChunking !== 'undefined' && customNoChunkingToggle) {
            customNoChunkingToggle.checked = !!res.disableChunking;
            if (custom128kBadge) custom128kBadge.style.display = res.disableChunking ? 'inline-block' : 'none';
        }
        if (res.customUrl && customUrlInput) customUrlInput.value = res.customUrl;
        if (res.customApiKey && customKeyInput) customKeyInput.value = res.customApiKey;
        if (res.customProviderName && customNameInput) customNameInput.value = res.customProviderName;

        // AI Provider selection
        let prov = res.aiProvider;
        if (prov !== 'openrouter' && prov !== 'custom') {
            prov = 'aikit';
        }
        aiProviderSelect.value = prov;
        aiProviderSelect.onchange();

        // AIKit credentials
        const aikitToken = res.aiToken || "";
        let aikitUrl = res.aiBaseUrl || "https://claude.aikit.club/qwen.aikit.club/v1";
        let aikitModel = res.aiModel;
        if (!aikitModel || !aikitModel.startsWith('qwen')) {
            aikitModel = 'qwen3.8-max';
        }

        aikitTokenInput.value = aikitToken;
        aikitUrlInput.value = aikitUrl;
        aikitModelSelect.value = aikitModel;

        // Auto-persist AIKit defaults if not previously set
        if (!res.aiProvider) {
            chrome.storage.local.set({
                aiProvider: 'aikit',
                aiToken: aikitToken,
                aiModel: aikitModel,
                aiBaseUrl: aikitUrl
            });
        }

        // OpenRouter credentials
        if (res.openrouterKey) openrouterKeyInput.value = res.openrouterKey;
        if (res.openrouterModel) openrouterModelInput.value = res.openrouterModel;

        // SponsorBlock credentials
        if (res.sbUserId && sbUserIdInput) sbUserIdInput.value = res.sbUserId;
        if (res.sbCategoryMode && sbCategoryModeSelect) sbCategoryModeSelect.value = res.sbCategoryMode;

        // TranscriptAPI fallback key
        if (transcriptApiKeyInput) {
            transcriptApiKeyInput.value = (res.transcriptApiKey && res.transcriptApiKey.trim()) 
                ? res.transcriptApiKey.trim() 
                : 'sk_ZDrY9xqIVpMGguu0pWru_CEUtmHO-eMW1rWqf_Wk7WA';
        }

        if (res.shortcuts) {
            shortcuts = res.shortcuts;
            updateShortcutUI();
        }
    });

    function updateShortcutUI() {
        scNext.textContent = shortcuts.next.replace('BracketRight', ']').replace('Key', '');
        scPrev.textContent = shortcuts.prev.replace('BracketLeft', '[').replace('Key', '');
        scAdd.textContent = (shortcuts.addAlt ? 'Alt+' : '') + shortcuts.add.replace('Key', '');
    }

    function recordShortcut(target) {
        target.textContent = '...';
        const handler = (e) => {
            e.preventDefault();
            const key = e.code;
            if (target.id === 'yt-sk-sc-next') shortcuts.next = key;
            if (target.id === 'yt-sk-sc-prev') shortcuts.prev = key;
            if (target.id === 'yt-sk-sc-add') { shortcuts.add = key; shortcuts.addAlt = e.altKey; }
            chrome.storage.local.set({ shortcuts });
            updateShortcutUI();
            window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
    }
    scNext.onclick = () => recordShortcut(scNext);
    scPrev.onclick = () => recordShortcut(scPrev);
    scAdd.onclick = () => recordShortcut(scAdd);

    function applyHighlights(text) {
        if (!text) text = '';
        let escaped = escapeHtml(text);
        const chapterRegex = /\b\d{1,2}(?::\d{2}){1,2}\b/g;
        escaped = escaped.replace(chapterRegex, '<span class="yt-sk-ts-highlight">$&</span>');
        if (text.endsWith('\n')) escaped += '<br>';
        highlights.innerHTML = escaped;
    }

    textarea.oninput = () => { applyHighlights(textarea.value); updateStateFromText(textarea.value); };
    textarea.onscroll = () => highlights.scrollTop = textarea.scrollTop;
    modeSelect.onchange = () => currentMode = modeSelect.value;

    function setStatus(msg, color = '#00f2fe') {
        statusObj.textContent = msg; statusObj.style.color = color;
        clearTimeout(statusObj.timeout);
        statusObj.timeout = setTimeout(() => { statusObj.textContent = 'Active'; statusObj.style.color = '#00f2fe'; }, 3000);
    }

    document.getElementById('yt-sk-btn-copy').onclick = () => {
        navigator.clipboard.writeText(textarea.value).then(() => setStatus('COPIED'));
        const v = document.querySelector('video');
        if (v) v.focus();
    };

    // --- AI Testing (AIKit & OpenRouter) ---
    btnTestAi.onclick = () => {
        const prov = aiProviderSelect.value;
        const payload = { provider: prov };

        if (prov === 'aikit') {
            payload.apiKey = aikitTokenInput.value.trim();
            payload.model = aikitModelSelect.value;
            payload.baseUrl = aikitUrlInput.value.trim();
            if (!payload.apiKey) {
                aiTestResult.style.display = 'block';
                aiTestResult.style.background = 'rgba(255, 75, 75, 0.15)';
                aiTestResult.style.border = '1px solid rgba(255, 75, 75, 0.4)';
                aiTestResult.style.color = '#ff6b6b';
                aiTestResult.innerHTML = '⚠️ Please enter your AIKit Auth Token.';
                return;
            }
        } else if (prov === 'custom') {
            const rawUrl = customUrlInput ? customUrlInput.value.trim() : 'http://127.0.0.1:8002/v1';
            let chosenModel = (customModelSelect && customModelSelect.value !== '__custom__') 
                ? customModelSelect.value 
                : (customModelManual ? customModelManual.value.trim() : '');
            if (!chosenModel) chosenModel = 'qwen3.8-flash';

            payload.baseUrl = rawUrl;
            payload.apiKey = customKeyInput ? customKeyInput.value.trim() : '';
            payload.model = chosenModel;
            payload.providerName = customNameInput ? customNameInput.value.trim() : 'Local Radio House (8002)';

            if (!payload.baseUrl) {
                aiTestResult.style.display = 'block';
                aiTestResult.style.background = 'rgba(255, 75, 75, 0.15)';
                aiTestResult.style.border = '1px solid rgba(255, 75, 75, 0.4)';
                aiTestResult.style.color = '#ff6b6b';
                aiTestResult.innerHTML = '⚠️ Please enter Base URL (e.g. http://127.0.0.1:8002/v1).';
                return;
            }
        } else {
            payload.apiKey = openrouterKeyInput.value.trim();
            payload.model = openrouterModelInput.value.trim() || 'google/gemma-4-31b-it:free';
            if (!payload.apiKey) {
                aiTestResult.style.display = 'block';
                aiTestResult.style.background = 'rgba(255, 75, 75, 0.15)';
                aiTestResult.style.border = '1px solid rgba(255, 75, 75, 0.4)';
                aiTestResult.style.color = '#ff6b6b';
                aiTestResult.innerHTML = '⚠️ Please enter your OpenRouter API Key.';
                return;
            }
        }

        btnTestAi.disabled = true;
        btnTestAi.textContent = '⏳ Testing Connection...';
        aiTestResult.style.display = 'block';
        aiTestResult.style.background = 'rgba(0, 242, 254, 0.1)';
        aiTestResult.style.border = '1px solid rgba(0, 242, 254, 0.3)';
        aiTestResult.style.color = '#00f2fe';
        const displayLabel = prov === 'aikit' ? 'AIKit Qwen (' + payload.model + ')' : 
                             (prov === 'custom' ? (payload.providerName || 'Custom') + ' (' + payload.model + ')' : 'OpenRouter (' + payload.model + ')');
        aiTestResult.textContent = `Connecting to ${displayLabel}...`;

        chrome.runtime.sendMessage({
            action: 'verifyAi',
            payload
        }, res => {
            btnTestAi.disabled = false;
            btnTestAi.textContent = '⚡ Test AI Connection';
            aiTestResult.replaceChildren();
            if (res && res.success) {
                const info = res.data;
                aiTestResult.style.background = 'rgba(0, 230, 118, 0.15)';
                aiTestResult.style.border = '1px solid rgba(0, 230, 118, 0.4)';
                aiTestResult.style.color = '#00e676';
                
                const titleNode = document.createElement('b');
                titleNode.textContent = 'Working!';
                const codeNode = document.createElement('code');
                codeNode.textContent = String(info.model || '');
                const subSpan = document.createElement('span');
                subSpan.style.opacity = '0.8';
                subSpan.style.fontSize = '10px';
                const provLabel = prov === 'aikit' ? 'AIKit Qwen (Claude Code Protocol)' : 
                                 (prov === 'custom' ? (payload.providerName || 'Custom OpenAI Endpoint') : 'OpenRouter');
                subSpan.textContent = `Provider: ${provLabel}`;

                aiTestResult.append('✅ ', titleNode, ' Connected to ', codeNode, '.', document.createElement('br'), subSpan);
                setStatus('AI VALIDATED', '#00e676');

                // Automatically save working settings
                const saveObj = { aiProvider: prov };
                if (prov === 'aikit') {
                    saveObj.aiToken = payload.apiKey;
                    saveObj.aiModel = payload.model;
                    saveObj.aiBaseUrl = payload.baseUrl;
                } else if (prov === 'custom') {
                    saveObj.customUrl = payload.baseUrl;
                    saveObj.customApiKey = payload.apiKey;
                    saveObj.customModel = payload.model;
                    saveObj.customProviderName = payload.providerName;
                    saveObj.disableChunking = customNoChunkingToggle ? customNoChunkingToggle.checked : false;
                } else {
                    saveObj.openrouterKey = payload.apiKey;
                    saveObj.openrouterModel = payload.model;
                }
                chrome.storage.local.set(saveObj);
            } else {
                aiTestResult.style.background = 'rgba(255, 75, 75, 0.15)';
                aiTestResult.style.border = '1px solid rgba(255, 75, 75, 0.4)';
                aiTestResult.style.color = '#ff6b6b';
                
                const errBold = document.createElement('b');
                errBold.textContent = 'Test Failed: ';
                aiTestResult.append('❌ ', errBold, document.createTextNode(res?.error || 'Connection error'));
                setStatus('AI TEST FAILED', '#ff4b4b');
            }
        });
    };

    document.getElementById('yt-sk-btn-save-settings').onclick = () => {
        let url = urlInput.value.trim().replace(/^libsql:\/\//i, 'https://');
        const token = tokenInput.value.trim();
        const prov = aiProviderSelect.value;

        const autoComment = document.getElementById('yt-sk-auto-comment').checked;
        const autoGenerate = document.getElementById('yt-sk-auto-generate')?.checked || false;
        const autoSaveSync = document.getElementById('yt-sk-auto-save-sync')?.checked || false;
        const miniChecked = document.getElementById('yt-sk-show-mini-widget')?.checked || false;
        const soundEnabled = document.getElementById('yt-sk-sound-enabled')?.checked ?? true;
        const soundUrl = document.getElementById('yt-sk-sound-url')?.value.trim() || '';
        const soundVolume = Number(document.getElementById('yt-sk-sound-volume')?.value || 80);

        setStatus('SAVING...');
        const toSave = { 
            aiProvider: prov,
            autoComment: autoComment,
            autoGenerate: autoGenerate,
            autoSaveSync: autoSaveSync,
            showMiniWidget: miniChecked,
            soundEnabled: soundEnabled,
            soundUrl: soundUrl,
            soundVolume: soundVolume,
            sbUserId: sbUserIdInput ? sbUserIdInput.value.trim() : '',
            sbCategoryMode: sbCategoryModeSelect ? sbCategoryModeSelect.value : 'sponsor_only',
            transcriptApiKey: transcriptApiKeyInput ? transcriptApiKeyInput.value.trim() : ''
        };
        showMiniWidget = miniChecked;
        updateMiniWidget();

        if (prov === 'aikit') {
            toSave.aiToken = aikitTokenInput.value.trim();
            toSave.aiModel = aikitModelSelect.value;
            toSave.aiBaseUrl = aikitUrlInput.value.trim();
        } else if (prov === 'custom') {
            let chosenModel = (customModelSelect && customModelSelect.value !== '__custom__') 
                ? customModelSelect.value 
                : (customModelManual ? customModelManual.value.trim() : '');
            if (!chosenModel) chosenModel = 'qwen3.8-flash';

            toSave.customUrl = customUrlInput ? customUrlInput.value.trim() : 'http://127.0.0.1:8002/v1';
            toSave.customApiKey = customKeyInput ? customKeyInput.value.trim() : '';
            toSave.customModel = chosenModel;
            toSave.customProviderName = customNameInput ? customNameInput.value.trim() : 'Local Radio House (8002)';
            toSave.disableChunking = customNoChunkingToggle ? customNoChunkingToggle.checked : false;

            const activeId = customProfileSelect ? customProfileSelect.value : 'default';
            const curProf = customProfiles.find(p => p.id === activeId);
            if (curProf) {
                curProf.disableChunking = toSave.disableChunking;
                curProf.model = chosenModel;
                curProf.url = toSave.customUrl;
                curProf.key = toSave.customApiKey;
                curProf.name = toSave.customProviderName;
            }
            toSave.customProfiles = customProfiles;
            toSave.customActiveProfileId = activeId;
        } else {
            toSave.openrouterKey = openrouterKeyInput.value.trim();
            toSave.openrouterModel = openrouterModelInput.value.trim();
        }

        if (url && token) {
            chrome.runtime.sendMessage({ action: 'tursoQuery', payload: { url, token, sql: "SELECT 1;", args: [] } }, res => {
                if (res && res.success) {
                    toSave.tursoUrl = url;
                    toSave.tursoToken = token;
                    chrome.storage.local.set(toSave, () => setStatus('SAVED ALL', '#00e676'));
                } else {
                    if (Object.keys(toSave).length) chrome.storage.local.set(toSave);
                    setStatus('DB FAILED, AI SAVED', '#ffb74d');
                }
            });
        } else {
            chrome.storage.local.set(toSave, () => setStatus('SAVED SETTINGS', '#00e676'));
        }
    };

    document.getElementById('yt-sk-btn-clean').onclick = () => {
        const text = textarea.value;
        const tsRegex = /(?:\d{1,2}:)?\d{1,2}:\d{2}/g;
        const matches = text.match(tsRegex);
        if (!matches) return setStatus('NO TIMESTAMPS', '#ff4b4b');

        const timeMap = new Map();
        matches.forEach(ts => {
            const sec = parseToSeconds(ts);
            if (!timeMap.has(sec) || ts.length > timeMap.get(sec).length) timeMap.set(sec, ts);
        });

        const sorted = Array.from(timeMap.keys()).sort((a,b)=>a-b);
        const cleanLines = sorted.map(sec => `${timeMap.get(sec)} Custom Marker`);
        textarea.value = cleanLines.join('\n');
        textarea.oninput();
        setStatus('CLEANED');
    };

    // --- Auto Fetch YouTube Transcript ---
    const btnFetchTranscript = document.getElementById('yt-sk-btn-fetch-transcript');
    if (btnFetchTranscript) {
        btnFetchTranscript.onclick = async () => {
            btnFetchTranscript.disabled = true;
            btnFetchTranscript.textContent = '⏳ Fetching...';
            setStatus('LOADING TRANSCRIPT...', '#00f2fe');

            let transcript = await extractYouTubeTranscriptWithTimestamps();
            if (!transcript || !transcript.trim()) {
                setStatus('TRYING API FALLBACK...', '#00f2fe');
                transcript = await fetchTranscriptViaApiFallback(getCurrentVideoId());
            }

            btnFetchTranscript.disabled = false;
            btnFetchTranscript.textContent = '📜 Fetch Transcript';

            if (transcript) {
                textarea.value = transcript;
                textarea.oninput();
                setStatus('TRANSCRIPT LOADED', '#00e676');
            } else {
                setStatus('NO TRANSCRIPT FOUND', '#ff4b4b');
                alert('Could not fetch YouTube transcript.\nEnsure the video has captions/transcript available on YouTube, or paste text directly.');
            }
        };
    }

    document.getElementById('yt-sk-btn-ai').onclick = async () => {
        let text = textarea.value;

        // If textarea is empty, automatically fetch the transcript with timestamps first!
        if (!text.trim()) {
            setStatus('AUTO-FETCHING TRANSCRIPT...', '#00f2fe');
            const aiBtn = document.getElementById('yt-sk-btn-ai');
            aiBtn.disabled = true;
            aiBtn.textContent = '⏳ Fetching Transcript...';

            text = await extractYouTubeTranscriptWithTimestamps();
            if (!text || !text.trim()) {
                setStatus('TRYING API FALLBACK...', '#00f2fe');
                text = await fetchTranscriptViaApiFallback(getCurrentVideoId());
            }

            aiBtn.disabled = false;
            aiBtn.textContent = '✨ AI Generate Titles';

            if (!text || !text.trim()) {
                setStatus('NO TRANSCRIPT', '#ff4b4b');
                alert('No text in editor and could not fetch transcript from YouTube.\nMake sure captions are available or paste into Editor.');
                return;
            }

            textarea.value = text;
            textarea.oninput();
        }
        
        if (isAutoGenerating) {
            setStatus('AI ALREADY RUNNING', '#ffb74d');
            showToast('AI is already processing this video in background...', '⏳', 3500);
            return;
        }

        chrome.storage.local.get(['aiProvider', 'aiToken', 'openrouterKey'], res => {
            const prov = res.aiProvider || 'aikit';
            if (prov === 'aikit' && !res.aiToken) {
                setStatus('SET AI TOKEN FIRST', '#ffb74d');
                const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                if (setTabBtn) setTabBtn.click();
                return;
            }
            if (prov === 'openrouter' && !res.openrouterKey) {
                setStatus('SET AI KEY FIRST', '#ffb74d');
                const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                if (setTabBtn) setTabBtn.click();
                return;
            }

            setStatus('AI GENERATING...');
            const aiBtn = document.getElementById('yt-sk-btn-ai');
            aiBtn.disabled = true;
            isAutoGenerating = true;

            chrome.runtime.sendMessage({ action: 'generateChapters', text }, r => {
                aiBtn.disabled = false;
                isAutoGenerating = false;
                if (r && r.success) {
                    textarea.value = r.data.trim();
                    textarea.oninput();
                    setStatus('AI COMPLETE', '#00e676');
                    playCompletionSound();
                } else {
                    const err = r?.error || 'AI Failed';
                    setStatus(err.length > 20 ? 'AI ERROR' : err.toUpperCase(), '#ff4b4b');
                    alert('AI Generation Error:\n' + err);
                    console.error(r?.error);
                }
            });
        });
    };

    // Chapters Tab Copy
    if (btnCopyChapters) {
        btnCopyChapters.onclick = () => {
            if (!currentRawText.trim()) return setStatus('NO CHAPTERS', '#ff4b4b');
            navigator.clipboard.writeText(currentRawText.trim()).then(() => {
                setStatus('COPIED');
                showToast('Chapters copied to clipboard!', '📋', 3000);
            });
        };
    }

    // --- 1-CLICK DUAL AI SCAN (CHAPTERS + SPONSORBLOCK) ---
    const runDualScan = async () => {
        if (isAutoGenerating) {
            setStatus('AI RUNNING', '#ffb74d');
            showToast('AI is already processing in background...', '⏳', 3500);
            return;
        }

        setStatus('FETCHING TRANSCRIPT...', '#00f2fe');
        if (headerDualScanBtn) {
            headerDualScanBtn.disabled = true;
            headerDualScanBtn.textContent = '⏳ Scanning...';
        }

        let text = textarea ? textarea.value.trim() : '';
        if (!text) {
            text = await extractYouTubeTranscriptWithTimestamps();
            if (!text || !text.trim()) {
                console.log("[DualScan] Native transcript extraction returned empty. Attempting TranscriptAPI fallback directly...");
                setStatus('API FALLBACK...', '#00f2fe');
                const vid = getCurrentVideoId();
                if (vid) {
                    text = await fetchTranscriptViaApiFallback(vid);
                }
            }
            if (text && textarea) {
                textarea.value = text;
                textarea.oninput();
            }
        }

        if (!text || !text.trim()) {
            if (headerDualScanBtn) {
                headerDualScanBtn.disabled = false;
                headerDualScanBtn.textContent = '⚡ Dual Scan';
            }
            setStatus('NO TRANSCRIPT', '#ff4b4b');
            alert('Could not fetch YouTube transcript for this video.\nMake sure captions/subtitles are available or paste into Editor.');
            return;
        }

        chrome.storage.local.get(['aiProvider', 'aiToken', 'openrouterKey', 'autoSaveSync', 'autoUploadSb'], res => {
            const prov = res.aiProvider || 'aikit';
            if (prov === 'aikit' && !res.aiToken) {
                if (headerDualScanBtn) { headerDualScanBtn.disabled = false; headerDualScanBtn.textContent = '⚡ Dual Scan'; }
                setStatus('SET AI TOKEN', '#ffb74d');
                const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                if (setTabBtn) setTabBtn.click();
                return;
            }
            if (prov === 'openrouter' && !res.openrouterKey) {
                if (headerDualScanBtn) { headerDualScanBtn.disabled = false; headerDualScanBtn.textContent = '⚡ Dual Scan'; }
                setStatus('SET AI KEY', '#ffb74d');
                const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                if (setTabBtn) setTabBtn.click();
                return;
            }

            setStatus('DUAL SCANNING...', '#00f2fe');
            isAutoGenerating = true;

            chrome.runtime.sendMessage({ action: 'generateAllInOne', text }, r => {
                if (headerDualScanBtn) {
                    headerDualScanBtn.disabled = false;
                    headerDualScanBtn.textContent = '⚡ Dual Scan';
                }
                isAutoGenerating = false;

                if (r && r.success && r.data) {
                    const { chapters, sponsorBlock, questionsCount, sponsorCount } = r.data;

                    // 1. Populate Chapters
                    if (chapters && chapters.trim()) {
                        currentRawText = chapters.trim();
                        if (textarea) {
                            textarea.value = currentRawText;
                            textarea.oninput();
                        }
                        updateStateFromText(currentRawText);
                    }

                    // 2. Populate SponsorBlock
                    if (sponsorBlock && sponsorBlock.trim()) {
                        sbRawText = sponsorBlock.trim();
                        if (sbRawTextarea) sbRawTextarea.value = sbRawText;
                        renderSponsorBlockCards(sbRawText);

                        const vid = new URLSearchParams(window.location.search).get('v');
                        if (vid) {
                            chrome.storage.local.set({ ['sb_segments_' + vid]: sbRawText });
                        }
                    }

                    setStatus('SCAN COMPLETE', '#00e676');
                    playCompletionSound();
                    showToast(`Dual Scan Complete: ${questionsCount || 0} Questions, ${sponsorCount || 0} Sponsor intervals.`, '🎉', 4500);

                    // Auto-Save to DB if enabled
                    if (res.autoSaveSync && chapters) {
                        const btnSave = document.getElementById('yt-sk-btn-save');
                        if (btnSave) btnSave.click();
                    }

                    // Auto-Upload to SponsorBlock if enabled
                    if (res.autoUploadSb && sponsorBlock && !sponsorBlock.includes('NO REMOVABLE SEGMENTS FOUND')) {
                        uploadSponsorBlockSegments(true);
                    }
                } else {
                    const err = r?.error || 'Dual scan failed';
                    setStatus(err.length > 20 ? 'AI ERROR' : err.toUpperCase(), '#ff4b4b');
                    alert('Dual Scan Error:\n' + err);
                }
            });
        });
    };

    if (headerDualScanBtn) {
        headerDualScanBtn.onclick = runDualScan;
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'dualProgress') {
            setStatus(`SCANNING CHUNK ${msg.currentChunk}/${msg.totalChunks} (${msg.chaptersCount}Q / ${msg.sponsorCount}SB)...`, '#00f2fe');
        }
    });

    // --- SPONSORBLOCK DIRECT API & PARSING HELPERS ---
    function resolveSponsorCategory(catStr) {
        if (!catStr) return 'sponsor';
        const c = catStr.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (c.includes('SELF') || c.includes('PROMO') || c.includes('APP') || c.includes('BATCH') || c.includes('BOOK')) return 'selfpromo';
        if (c.includes('EXCLUSIVE')) return 'exclusive_access';
        if (c.includes('INTERACTION') || c.includes('SUBSCRIBE') || c.includes('LIKE') || c.includes('BELL')) return 'interaction';
        if (c.includes('HIGHLIGHT')) return 'highlight';
        if (c.includes('INTRO') || c.includes('INTERMISSION') || c.includes('ANIMATION') || c.includes('SILENCE')) return 'intro';
        if (c.includes('OUTRO') || c.includes('ENDCARD') || c.includes('CREDIT') || c.includes('CLOSING') || c.includes('SIGN_OFF')) return 'outro';
        if (c.includes('PREVIEW') || c.includes('RECAP')) return 'preview';
        if (c.includes('HOOK') || c.includes('GREETING')) return 'hook';
        if (c.includes('FILLER') || c.includes('TANGENT') || c.includes('JOKE') || c.includes('BANTER') || c.includes('NON_EDUCATIONAL') || c.includes('OFF_TOPIC')) return 'filler';
        if (c.includes('SPONSOR') || c.includes('AD')) return 'sponsor';
        return 'sponsor';
    }

    function timeToSec(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.trim().split(':').map(p => parseInt(p, 10) || 0);

        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }

        if (parts.length === 3) {
            const [p0, p1, p2] = parts;
            const standardSec = p0 * 3600 + p1 * 60 + p2;
            const videoEl = (typeof document !== 'undefined') ? document.querySelector('video') : null;
            const videoDuration = videoEl?.duration ? Math.round(videoEl.duration) : undefined;
            if (videoDuration && standardSec > videoDuration && (p0 * 60 + p1) <= videoDuration) {
                return p0 * 60 + p1;
            }
            return standardSec;
        }

        let seconds = 0;
        const rev = [...parts].reverse();
        for (let i = 0; i < rev.length; i++) {
            seconds += rev[i] * Math.pow(60, i);
        }
        return seconds;
    }

    function parseSponsorSegmentsFromText(rawText) {
        if (!rawText || !rawText.trim() || rawText.includes('NO REMOVABLE SEGMENTS FOUND')) {
            return [];
        }

        const KNOWN_CATS = ['SPONSOR', 'SELFPROMO', 'INTERACTION', 'INTRO', 'OUTRO', 'PREVIEW', 'FILLER'];
        const CAT_ALIASES = {
            'SELF-PROMO': 'SELFPROMO',
            'SELF_PROMO': 'SELFPROMO',
            'PROMO': 'SELFPROMO',
            'AD': 'SPONSOR',
            'ADVERTISEMENT': 'SPONSOR',
            'SPONSORED': 'SPONSOR'
        };

        const lines = rawText.split('\n');
        const segmentMap = new Map();
        let orderIndex = 1;

        function detectCategoryAndReason(cellsOrWords) {
            let detectedCat = '';
            let detectedReason = '';

            if (Array.isArray(cellsOrWords)) {
                for (const item of cellsOrWords) {
                    const upper = (item || '').toUpperCase().trim();
                    if (KNOWN_CATS.includes(upper)) {
                        detectedCat = upper;
                        break;
                    } else if (CAT_ALIASES[upper]) {
                        detectedCat = CAT_ALIASES[upper];
                        break;
                    } else {
                        for (const cat of KNOWN_CATS) {
                            if (upper.includes(cat)) {
                                detectedCat = cat;
                                break;
                            }
                        }
                        if (detectedCat) break;
                    }
                }

                // Filter out metadata cells/words (index numbers, timestamps, and category)
                const textTokens = cellsOrWords.filter(c => {
                    const u = (c || '').toUpperCase().trim();
                    if (!u) return false;
                    if (/^\d+$/.test(u)) return false; // purely row number
                    if (/^\d{1,2}(?::\d{2}){1,2}$/.test(u)) return false; // single timestamp
                    if (/^\[?\s*\d{1,2}(?::\d{2}){1,2}\s*\]?\s*(?:-|–|—|to)\s*\[?\s*\d{1,2}(?::\d{2}){1,2}\s*\]?$/.test(u)) return false; // timestamp range
                    if (KNOWN_CATS.includes(u) || CAT_ALIASES[u]) return false;
                    if (u === detectedCat) return false;
                    return true;
                });

                if (textTokens.length > 0) {
                    detectedReason = textTokens.join(' - ')
                        .replace(/\b\d{1,2}(?::\d{2}){1,2}\b/g, '')
                        .replace(/^[–—\-\:\s|]+|[–—\-\:\s|]+$/g, '')
                        .trim();
                }
            }
            return { cat: detectedCat || 'SPONSOR', reason: detectedReason };
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/^\|?[\s\-:|]+\|?$/.test(trimmed)) return; // Markdown table divider like |---|---|

            // Extract all timestamps found on this line
            const tsMatches = trimmed.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g);
            if (!tsMatches || tsMatches.length < 2) return;

            // Skip Markdown table header lines (e.g. | # | Start | End | Category | Reason |)
            // A header row NEVER has valid timestamp values in its cells
            if (trimmed.startsWith('|')) {
                const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
                const hasTimestampCell = cells.some(c => /\b\d{1,2}(?::\d{2}){1,2}\b/.test(c));
                if (!hasTimestampCell) return;
            }

            const startSec = timeToSec(tsMatches[0]);
            const endSec = timeToSec(tsMatches[1]);
            if (endSec <= startSec) return;

            const key = `${startSec}-${endSec}`;
            let cat = 'SPONSOR';
            let reason = '';

            if (trimmed.startsWith('|')) {
                const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
                const detected = detectCategoryAndReason(cells);
                cat = detected.cat;
                reason = detected.reason;
            } else {
                // Non-table line (e.g. [00:04:14]-[00:04:31] SELFPROMO Course starts today)
                const remaining = trimmed
                    .replace(tsMatches[0], '')
                    .replace(tsMatches[1], '')
                    .replace(/[\[\]\(\)\-\–\—\:\>\#\|]/g, ' ')
                    .trim();
                const words = remaining.split(/\s+/).filter(w => w.length > 0);
                const detected = detectCategoryAndReason(words);
                cat = detected.cat;
                reason = remaining.replace(new RegExp('\\b' + cat + '\\b', 'i'), '')
                    .replace(/^[–—\-\:\s|]+|[–—\-\:\s|]+$/g, '')
                    .trim();
            }

            if (!reason) {
                if (cat === 'INTRO') reason = 'Initial intro / silence';
                else if (cat === 'OUTRO') reason = 'Closing remarks / outro';
                else if (cat === 'SELFPROMO') reason = 'Self-promotion / announcement';
                else if (cat === 'INTERACTION') reason = 'Interaction reminder (like/sub)';
                else if (cat === 'PREVIEW') reason = 'Recap / upcoming preview';
                else if (cat === 'FILLER') reason = 'Off-topic discussion / banter';
                else reason = 'Non-educational segment';
            }

            if (segmentMap.has(key)) {
                const existing = segmentMap.get(key);
                if (existing.cat === 'SPONSOR' && cat !== 'SPONSOR') {
                    existing.cat = cat;
                }
                if ((!existing.reason || existing.reason === 'Non-educational segment') && reason && reason !== 'Non-educational segment') {
                    existing.reason = reason;
                }
            } else {
                segmentMap.set(key, {
                    idx: orderIndex++,
                    start: formatTime(startSec),
                    end: formatTime(endSec),
                    startSec,
                    endSec,
                    cat,
                    reason,
                    rawLine: line
                });
            }
        });

        const sorted = Array.from(segmentMap.values()).sort((a, b) => a.startSec - b.startSec);
        sorted.forEach((item, idx) => {
            item.idx = idx + 1;
        });

        return sorted;
    }

    function formatSponsorSegmentsToRawText(segments) {
        if (!segments || segments.length === 0) return '';
        let table = '| # | Start | End | Category | Reason |\n| - | ----- | --- | -------- | ------ |\n';
        let intervals = '\n';
        segments.forEach((s, i) => {
            const idx = i + 1;
            const startStr = typeof s.start === 'string' ? s.start : formatTime(s.start);
            const endStr = typeof s.end === 'string' ? s.end : formatTime(s.end);
            const catStr = (s.cat || 'SPONSOR').toUpperCase();
            const reasonStr = (s.reason || 'Non-educational segment').replace(/[|\n]/g, ' ').trim();
            table += `| ${idx} | ${startStr} | ${endStr} | ${catStr} | ${reasonStr} |\n`;
            intervals += `[${startStr}]-[${endStr}] ${catStr} ${reasonStr}\n`;
        });
        return (table + intervals).trim();
    }

    function applyPastedSponsorSegments(textToParse, andUpload = false) {
        const text = (textToParse || '').trim();
        if (!text) {
            showToast('Please paste a markdown table or timestamps interval first.', '⚠️', 3500);
            return;
        }

        const segments = parseSponsorSegmentsFromText(text);
        if (!segments || segments.length === 0) {
            setStatus('NO SEGMENTS PARSED', '#ff4b4b');
            alert('Could not find any timestamp intervals (e.g. 00:00 - 00:10) in the pasted text.\nPlease check your format.');
            return;
        }

        const formatted = formatSponsorSegmentsToRawText(segments);
        sbRawText = formatted;
        if (sbRawTextarea) sbRawTextarea.value = formatted;
        renderSponsorBlockCards(formatted);

        const vid = new URLSearchParams(window.location.search).get('v');
        if (vid) {
            chrome.storage.local.set({ ['sb_segments_' + vid]: formatted });
        }

        setStatus(`LOADED ${segments.length} SEGMENTS`, '#00e676');
        showToast(`Successfully loaded ${segments.length} segments!`, '🎉', 3500);

        if (andUpload) {
            setTimeout(() => {
                uploadSponsorBlockSegments(false);
            }, 250);
        }
    }

    sbRawText = '';

    renderSponsorBlockCards = function(rawText) {
        if (!sbCardsContainer) return;

        if (!rawText || !rawText.trim() || rawText.includes('NO REMOVABLE SEGMENTS FOUND')) {
            const emptyHtml = `
                <div class="yt-sk-empty-placeholder">
                    ${rawText && rawText.includes('NO REMOVABLE') ? '✅ No removable segments found in video.' : 'No segments detected yet.<br>Click <b>🤖 AI Scan</b> or <b>📋 Quick Paste</b> above.'}
                </div>
            `;
            sbCardsContainer.innerHTML = emptyHtml;
            if (sbCountBadge) sbCountBadge.textContent = '0 Segments';
            if (sbRatioBadge) {
                sbRatioBadge.className = 'yt-sk-safety-badge safe';
                sbRatioBadge.textContent = '0% (Safe)';
            }
            if (sbSafetyFill) sbSafetyFill.style.width = '0%';
            if (btnUploadSb) btnUploadSb.disabled = true;
            return;
        }

        const parsedSegments = parseSponsorSegmentsFromText(rawText);

        // Compute duration ratio to protect against 80% SponsorBlock limit
        const v = document.querySelector('video');
        const videoDuration = v && !isNaN(v.duration) ? v.duration : 0;
        let totalSbSec = 0;
        parsedSegments.forEach(s => {
            if (s.endSec > s.startSec) totalSbSec += (s.endSec - s.startSec);
        });

        if (sbCountBadge) sbCountBadge.textContent = `${parsedSegments.length} Segments`;
        
        let pct = 0;
        if (videoDuration > 0) {
            pct = Math.round((totalSbSec / videoDuration) * 100);
        }

        if (sbRatioBadge) {
            if (videoDuration > 0) {
                if (pct >= 80) {
                    sbRatioBadge.className = 'yt-sk-safety-badge danger';
                    sbRatioBadge.textContent = `⚠️ ${pct}% (${Math.round(totalSbSec)}s - Limit >80%!)`;
                } else if (pct >= 50) {
                    sbRatioBadge.className = 'yt-sk-safety-badge warning';
                    sbRatioBadge.textContent = `⚡ ${pct}% (${Math.round(totalSbSec)}s)`;
                } else {
                    sbRatioBadge.className = 'yt-sk-safety-badge safe';
                    sbRatioBadge.textContent = `🟢 ${pct}% (${Math.round(totalSbSec)}s - Safe)`;
                }
            } else {
                sbRatioBadge.className = 'yt-sk-safety-badge safe';
                sbRatioBadge.textContent = `${Math.round(totalSbSec)}s total`;
            }
        }

        if (sbSafetyFill) {
            const displayPct = Math.min(100, pct);
            sbSafetyFill.style.width = displayPct + '%';
            sbSafetyFill.className = 'yt-sk-safety-fill ' + (pct >= 80 ? 'danger' : pct >= 50 ? 'warning' : 'safe');
        }

        if (btnUploadSb) {
            btnUploadSb.disabled = (parsedSegments.length === 0 || pct >= 80);
        }

        sbCardsContainer.replaceChildren();
        if (parsedSegments.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'yt-sk-empty-placeholder';
            emptyEl.textContent = 'Scanned raw intervals ready in Raw View.';
            sbCardsContainer.appendChild(emptyEl);
            return;
        }

        parsedSegments.forEach(item => {
            const card = document.createElement('div');
            card.className = 'yt-sk-sb-card';
            const catLower = item.cat.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const cardHeader = document.createElement('div');
            cardHeader.className = 'yt-sk-sb-card-header';

            const badge = document.createElement('span');
            badge.className = `yt-sk-sb-badge ${catLower}`;
            badge.textContent = `#${item.idx} ${item.cat}`;

            const timeRange = document.createElement('span');
            timeRange.className = 'yt-sk-sb-timerange';
            timeRange.title = 'Click to seek to start';
            timeRange.textContent = `${item.start} ➔ ${item.end}`;
            timeRange.onclick = () => {
                const video = document.querySelector('video');
                if (video) video.currentTime = parseToSeconds(item.start);
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'yt-sk-icon-btn';
            delBtn.style.cssText = 'width:20px; height:20px; font-size:11px; margin-left:auto; color:var(--yt-sk-text-muted); cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center;';
            delBtn.title = 'Remove segment';
            delBtn.textContent = '✕';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                const remaining = parsedSegments.filter(s => s !== item);
                const updated = formatSponsorSegmentsToRawText(remaining);
                sbRawText = updated;
                if (sbRawTextarea) sbRawTextarea.value = updated;
                renderSponsorBlockCards(updated);
                const vid = new URLSearchParams(window.location.search).get('v');
                if (vid) {
                    chrome.storage.local.set({ ['sb_segments_' + vid]: updated });
                }
            };

            cardHeader.appendChild(badge);
            cardHeader.appendChild(timeRange);
            cardHeader.appendChild(delBtn);

            const cardReason = document.createElement('div');
            cardReason.className = 'yt-sk-sb-card-reason';
            cardReason.textContent = item.reason;

            card.appendChild(cardHeader);
            card.appendChild(cardReason);

            sbCardsContainer.appendChild(card);
        });
    };

    if (sbToggleView) {
        sbToggleView.onclick = () => {
            if (sbCardsContainer.style.display === 'none') {
                sbCardsContainer.style.display = 'flex';
                sbRawContainer.style.display = 'none';
                sbToggleLabel.textContent = '👁️ View: Card List';
            } else {
                sbCardsContainer.style.display = 'none';
                sbRawContainer.style.display = 'flex';
                sbToggleLabel.textContent = '👁️ View: Raw / Intervals';
                if (sbRawTextarea) sbRawTextarea.value = sbRawText;
            }
        };
    }

    if (btnCopySb) {
        btnCopySb.onclick = () => {
            const val = (sbRawTextarea?.value || sbRawText || '').trim();
            if (!val) return setStatus('NO SB DATA', '#ff4b4b');
            navigator.clipboard.writeText(val).then(() => {
                setStatus('SB COPIED', '#00e676');
                showToast('SponsorBlock intervals copied to clipboard!', '📋', 3000);
            });
        };
    }

    // --- Manual SponsorBlock Segment Creation Helper ---
    addManualSponsorBlockSegment = function(startStr, endStr, category = 'SPONSOR', reason = 'Custom segment') {
        const sSec = parseToSeconds(startStr);
        const eSec = parseToSeconds(endStr);
        if (eSec <= sSec) {
            alert('Error: End time must be greater than Start time.');
            return false;
        }

        // Format clean timestamps
        const sClean = formatTime(sSec);
        const eClean = formatTime(eSec);
        const catClean = (category || 'SPONSOR').toUpperCase();
        const reasonClean = (reason || 'Custom segment').replace(/[|\n]/g, ' ').trim();

        let curText = (sbRawTextarea?.value || sbRawText || '').trim();
        const tableHeader = '| # | Start | End | Category | Reason |\n| - | - | - | - | - |';
        
        let lines = curText ? curText.split('\n') : [];
        let tableLines = lines.filter(l => l.trim().startsWith('|'));
        let intervalLines = lines.filter(l => !l.trim().startsWith('|') && l.trim().length > 0);

        if (tableLines.length === 0) {
            tableLines = tableHeader.split('\n');
        }

        const dataRows = tableLines.filter(l => !l.toLowerCase().includes('category') && !/^\|?[\s\-:|]+\|?$/.test(l.trim()));
        const nextIdx = dataRows.length + 1;
        const newRow = `| ${nextIdx} | ${sClean} | ${eClean} | ${catClean} | ${reasonClean} |`;
        const newInterval = `[${sClean}]-[${eClean}]`;

        // Insert new row into table section
        tableLines.push(newRow);
        if (!intervalLines.includes(newInterval)) {
            intervalLines.push(newInterval);
        }

        const updated = `${tableLines.join('\n')}\n\n${intervalLines.join('\n')}`.trim();
        sbRawText = updated;
        if (sbRawTextarea) sbRawTextarea.value = updated;
        renderSponsorBlockCards(updated);

        const vid = new URLSearchParams(window.location.search).get('v');
        if (vid) {
            chrome.storage.local.set({ ['sb_segments_' + vid]: updated });
        }

        setStatus(`ADDED #${nextIdx} ${catClean}`, '#00e676');
        showToast(`Added segment #${nextIdx}: ${sClean} ➔ ${eClean} (${catClean})`, '⚡', 3500);
        return true;
    }

    // Bind Manual Form Buttons
    if (sbBtnCurrStart) {
        sbBtnCurrStart.onclick = () => {
            const video = document.querySelector('video');
            if (video && sbInputStart) {
                sbInputStart.value = formatTime(Math.floor(video.currentTime));
            }
        };
    }

    if (sbBtnCurrEnd) {
        sbBtnCurrEnd.onclick = () => {
            const video = document.querySelector('video');
            if (video && sbInputEnd) {
                sbInputEnd.value = formatTime(Math.floor(video.currentTime));
            }
        };
    }

    if (sbBtnAddSegment) {
        sbBtnAddSegment.onclick = () => {
            const startVal = (sbInputStart?.value || '').trim();
            const endVal = (sbInputEnd?.value || '').trim();
            const catVal = sbSelectCat?.value || 'SPONSOR';
            const reasonVal = (sbInputReason?.value || '').trim() || 'Custom segment';

            if (!startVal || !endVal) {
                alert('Please enter both Start and End timestamps (e.g. 01:23 or click Now).');
                return;
            }

            const success = addManualSponsorBlockSegment(startVal, endVal, catVal, reasonVal);
            if (success) {
                if (sbInputStart) sbInputStart.value = '';
                if (sbInputEnd) sbInputEnd.value = '';
                if (sbInputReason) sbInputReason.value = '';
            }
        };
    }

    // Bind Quick Paste & Parse Segments Box Buttons
    if (sbBtnApplyPaste) {
        sbBtnApplyPaste.onclick = () => {
            const val = sbQuickPasteInput?.value || '';
            applyPastedSponsorSegments(val, false);
        };
    }

    if (sbBtnPasteClipboard) {
        sbBtnPasteClipboard.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    if (sbQuickPasteInput) sbQuickPasteInput.value = text;
                    applyPastedSponsorSegments(text, false);
                } else {
                    showToast('Clipboard is empty or does not contain text.', '⚠️', 3000);
                }
            } catch (err) {
                alert('Clipboard access notice: ' + err.message + '\nYou can also paste directly into the box with Ctrl+V.');
            }
        };
    }

    if (sbQuickPasteInput) {
        sbQuickPasteInput.onpaste = () => {
            setTimeout(() => {
                const val = sbQuickPasteInput.value.trim();
                if (val) {
                    const found = parseSponsorSegmentsFromText(val);
                    if (found.length > 0) {
                        setStatus(`DETECTED ${found.length} SEGMENTS`, '#00f2fe');
                        showToast(`Detected ${found.length} segments! Click "Import Segments".`, '⚡', 3500);
                    }
                }
            }, 50);
        };
    }

    // Bidirectional sync when user edits in Raw textarea
    if (sbRawTextarea) {
        sbRawTextarea.oninput = () => {
            sbRawText = sbRawTextarea.value;
            renderSponsorBlockCards(sbRawText);
            const vid = new URLSearchParams(window.location.search).get('v');
            if (vid) {
                chrome.storage.local.set({ ['sb_segments_' + vid]: sbRawText });
            }
        };
    }

    // --- Scan Non-Educational / Removable Content ---
    if (btnScanRemovable) {
        btnScanRemovable.onclick = async () => {
            let text = textarea ? textarea.value.trim() : '';

            // If Editor is empty, autonomously fetch from YouTube!
            if (!text) {
                setStatus('FETCHING TRANSCRIPT...', '#00f2fe');
                btnScanRemovable.disabled = true;
                btnScanRemovable.textContent = '⏳ Fetching Transcript...';

                text = await extractYouTubeTranscriptWithTimestamps();
                if (!text || !text.trim()) {
                    setStatus('TRYING API FALLBACK...', '#00f2fe');
                    text = await fetchTranscriptViaApiFallback(getCurrentVideoId());
                }
                btnScanRemovable.disabled = false;
                btnScanRemovable.textContent = '🤖 AI Scan Segments';

                if (!text || !text.trim()) {
                    setStatus('NO TRANSCRIPT', '#ff4b4b');
                    alert('Could not fetch YouTube transcript.\nEnsure captions/transcript are available for this video, or paste into Editor.');
                    return;
                }

                if (textarea) {
                    textarea.value = text;
                    textarea.oninput();
                }
            }

            if (isAutoGenerating) {
                setStatus('AI ALREADY RUNNING', '#ffb74d');
                showToast('AI is already processing in background...', '⏳', 3500);
                return;
            }

            chrome.storage.local.get(['aiProvider', 'aiToken', 'openrouterKey'], res => {
                const prov = res.aiProvider || 'aikit';
                if (prov === 'aikit' && !res.aiToken) {
                    setStatus('SET AI TOKEN FIRST', '#ffb74d');
                    const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                    if (setTabBtn) setTabBtn.click();
                    return;
                }
                if (prov === 'openrouter' && !res.openrouterKey) {
                    setStatus('SET AI KEY FIRST', '#ffb74d');
                    const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                    if (setTabBtn) setTabBtn.click();
                    return;
                }

                setStatus('SCANNING SEGMENTS...');
                btnScanRemovable.disabled = true;
                btnScanRemovable.textContent = '⏳ Scanning...';
                isAutoGenerating = true;

                chrome.runtime.sendMessage({ action: 'analyzeRemovableSegments', text }, r => {
                    btnScanRemovable.disabled = false;
                    btnScanRemovable.textContent = '🤖 AI Scan Segments';
                    isAutoGenerating = false;

                    if (r && r.success) {
                        sbRawText = r.data.trim();
                        if (sbRawTextarea) sbRawTextarea.value = sbRawText;
                        renderSponsorBlockCards(sbRawText);
                        setStatus('SCAN COMPLETE', '#00e676');
                        playCompletionSound();
                        showToast('Removable segments identified & loaded in SponsorBlock tab!', '🚫', 4500);
                    } else {
                        const err = r?.error || 'Analysis failed';
                        setStatus(err.length > 20 ? 'SCAN ERROR' : err.toUpperCase(), '#ff4b4b');
                        alert('Removable Segments Error:\n' + err);
                        console.error(r?.error);
                    }
                });
            });
        };
    }

    uploadSponsorBlockSegments = function(isAuto = false) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');

        if (!videoId) {
            setStatus('NO VIDEO ID', '#ff4b4b');
            if (!isAuto) alert('ERROR: Not on an active YouTube video page.');
            return;
        }

        chrome.storage.local.get(['sbUserId', 'sbCategoryMode'], res => {
            const userId = (res.sbUserId || '').trim();
            if (!userId) {
                setStatus('SET USER ID FIRST', '#ffb74d');
                if (!isAuto) {
                    alert('SponsorBlock Private User ID is required!\nPlease enter it in Settings > SponsorBlock API Integration.');
                    const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                    if (setTabBtn) setTabBtn.click();
                    const sbInput = document.getElementById('yt-sk-sb-user-id');
                    if (sbInput) sbInput.focus();
                } else {
                    showToast('⚠️ SponsorBlock User ID missing in Settings. Skipping upload.', '⚠️', 4500);
                }
                return;
            }

            if (userId.length < 32) {
                setStatus('INVALID USER ID', '#ff4b4b');
                if (!isAuto) {
                    alert(`Private User ID looks too short (${userId.length} chars).\nSponsorBlock requires the 32+ character Private User ID from the official SponsorBlock extension settings (not your public username/ID).`);
                    const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                    if (setTabBtn) setTabBtn.click();
                    const sbInput = document.getElementById('yt-sk-sb-user-id');
                    if (sbInput) sbInput.focus();
                }
                return;
            }

            let rawText = (sbRawTextarea?.value || sbRawText || '').trim();
            if (!rawText || rawText.includes('NO REMOVABLE SEGMENTS FOUND')) {
                const pasteVal = (sbQuickPasteInput?.value || '').trim();
                if (pasteVal) {
                    applyPastedSponsorSegments(pasteVal, false);
                    rawText = (sbRawTextarea?.value || sbRawText || '').trim();
                }
            }

            if (!rawText || rawText.includes('NO REMOVABLE SEGMENTS FOUND')) {
                setStatus('NO SEGMENTS', '#ff4b4b');
                if (!isAuto) alert('No removable segments found to upload.\nPaste segments in Quick Paste or click AI Scan Segments first.');
                return;
            }

            const videoEl = document.querySelector('video');
            const videoDuration = videoEl?.duration ? Math.round(videoEl.duration) : undefined;
            const categoryMode = res.sbCategoryMode || 'mapped';

            const parsed = parseSponsorSegmentsFromText(rawText);
            const segmentsArray = parsed.map(item => {
                const finalCat = (categoryMode === 'sponsor_only') ? 'sponsor' : resolveSponsorCategory(item.cat);
                return {
                    segment: [item.startSec, item.endSec],
                    category: finalCat,
                    actionType: 'skip'
                };
            });

            if (segmentsArray.length === 0) {
                setStatus('NO VALID INTERVALS', '#ff4b4b');
                if (!isAuto) alert('No valid timestamp intervals found to upload.');
                return;
            }

            if (!isAuto) {
                if (!confirm(`Ready to submit ${segmentsArray.length} removable segment(s) to SponsorBlock server?\n\nVideo ID: ${videoId}\nUser ID: ${userId.substring(0, 8)}...\nCategory Mode: ${categoryMode}`)) {
                    return;
                }
            }

            setStatus('UPLOADING TO SB...', '#00f2fe');
            if (btnUploadSb) { btnUploadSb.disabled = true; btnUploadSb.textContent = '⏳ Uploading...'; }

            chrome.runtime.sendMessage({
                action: 'submitSponsorBlock',
                payload: {
                    videoId: videoId,
                    userId: userId,
                    segments: segmentsArray,
                    videoDuration: videoDuration
                }
            }, resp => {
                if (btnUploadSb) { btnUploadSb.disabled = false; btnUploadSb.textContent = '🚀 Upload to SponsorBlock'; }

                if (resp && resp.success) {
                    setStatus(`UPLOADED (${segmentsArray.length})`, '#00e676');
                    showToast(`SUCCESS: ${segmentsArray.length} segments uploaded to SponsorBlock!`, '🎉', 5000);
                    playCompletionSound();
                } else {
                    const err = resp?.error || 'Upload failed';
                    setStatus('SB UPLOAD ERROR', '#ff4b4b');
                    if (!isAuto) alert('SponsorBlock Upload Error:\n' + err);
                    showToast(`SponsorBlock Upload Failed: ${err}`, '⚠️', 5000);
                    console.error("SponsorBlock Upload Error:", resp);
                }
            });
        });
    }


    if (btnUploadSb) {
        btnUploadSb.onclick = () => uploadSponsorBlockSegments(false);
    }

    document.getElementById('yt-sk-btn-save').onclick = () => {
        const vid = new URLSearchParams(window.location.search).get("v");
        if (!vid) return setStatus('NO VIDEO', '#ff4b4b');
        chrome.storage.local.get(['tursoUrl', 'tursoToken', 'autoComment'], res => {
            const shouldAutoComment = typeof res.autoComment === 'undefined' ? true : !!res.autoComment;

            if (shouldAutoComment && currentRawText.trim()) {
                postYouTubeComment(currentRawText);
            }

            if (!res.tursoUrl) {
                if (shouldAutoComment) {
                    setStatus('COMMENTING...', '#00f2fe');
                } else {
                    setStatus('NO DB URL', '#ffb74d');
                    const setTabBtn = dashboard.querySelector('.yt-sk-tab-btn[data-tab="settings"]');
                    if (setTabBtn) setTabBtn.click();
                }
                return;
            }
            setStatus('SAVING...');
            chrome.runtime.sendMessage({ action: 'tursoQuery', payload: {
                url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'), token: res.tursoToken,
                sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                args: [{type: "text", value: vid}, {type: "text", value: currentRawText}]
            }}, r => {
                if(r && r.success) {
                    setStatus(shouldAutoComment ? 'SAVED & POSTING' : 'SAVED', '#00e676');
                } else {
                    setStatus('ERROR', '#ff4b4b');
                }
                if (r && !r.success) console.error(r);
            });
        });
    };

    document.getElementById('yt-sk-btn-load').onclick = () => {
        const status = loadFromDBOrDefault(true);
        if (status === 'fetching') setStatus('LOADING...');
    };

    // Filter Chips Event Listeners
    dashboard.querySelectorAll('.yt-sk-chip').forEach(chip => {
        chip.onclick = () => {
            const filterType = chip.getAttribute('data-filter');
            applyChapterFilter(filterType);
        };
    });

    window.refreshDashboard = function() {
        if (!dashboard) return;
        if (document.activeElement !== textarea) {
            textarea.value = currentRawText;
            applyHighlights(currentRawText);
        }
        
        list.replaceChildren();

        if (!timestamps.length) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'yt-sk-empty-placeholder';
            emptyEl.textContent = 'No Chapters Found';
            list.appendChild(emptyEl);
            return;
        }
        timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            item.className = 'yt-sk-item' + (i === lastActiveIdx ? ' yt-sk-active' : '');
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'yt-sk-item-time';
            timeSpan.textContent = formatTime(sec);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'yt-sk-item-title';
            titleSpan.textContent = titles[i] || 'Chapter ' + (i + 1);

            item.appendChild(timeSpan);
            item.appendChild(titleSpan);

            item.onclick = () => { 
                const v = document.querySelector('video'); 
                if (v) v.currentTime = Math.max(0, sec - 2); 
            };
            list.appendChild(item);

            // Auto-scroll to keep currently active chapter in view as time progresses
            if (i === lastActiveIdx) {
                requestAnimationFrame(() => {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }
        });
    };
}


// --- Sync & Storage ---
chrome.storage.local.get(['shortcuts'], (res) => {
    if (res.shortcuts) shortcuts = res.shortcuts;
});

// --- Core Logic ---
function parseToSeconds(str) {
    if (!str) return 0;
    const parts = str.trim().split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return parts[0] || 0;
}

function formatTime(sec) {
    if (!sec || isNaN(sec)) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h?h+':':''}${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function applyChapterFilter(filterType) {
    currentChapterFilter = filterType || 'all';
    
    // Update chip active classes
    const chipContainer = document.getElementById('yt-sk-filter-chips');
    if (chipContainer) {
        chipContainer.querySelectorAll('.yt-sk-chip').forEach(btn => {
            if (btn.getAttribute('data-filter') === currentChapterFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Filter items
    let filtered = [];
    if (currentChapterFilter === 'all') {
        filtered = [...allParsedChapters];
    } else {
        filtered = allParsedChapters.filter(item => {
            if (item.category === currentChapterFilter) return true;
            // Also handle merged categories e.g. 'ques & ans' or title matches
            if (currentChapterFilter === 'ques' && item.title.toLowerCase().includes('question')) return true;
            if (currentChapterFilter === 'ans' && (item.title.toLowerCase().includes('correct option') || item.title.toLowerCase().includes('answer start'))) return true;
            if (currentChapterFilter === 'explain' && item.title.toLowerCase().includes('explanation')) return true;
            return false;
        });
    }

    timestamps = filtered.map(x => x.t);
    titles = filtered.map(x => x.title);
    renderMarkers();
    if (window.refreshDashboard) window.refreshDashboard();
}

function updateStateFromText(text) {
    if (!text) text = '';

    // Check if input text contains both dual sections:
    const sbHeaderRegex = /(?:={2,}|#{1,4}|\*{2,})?\s*SECTION(?:\s*\d+)?\s*:\s*(?:REMOVABLE\s*(?:\/|\s)\s*)?SPONSORBLOCK[^\n]*|#{1,4}\s*(?:REMOVABLE(?:\s*SEGMENTS)?|SPONSORBLOCK[^\n]*)/i;
    const sbMatch = text.match(sbHeaderRegex);
    if (sbMatch) {
        const sbPos = text.search(sbHeaderRegex);
        const chaptersPart = text.substring(0, sbPos)
            .replace(/(?:={2,}|#{1,4}|\*{2,})?\s*SECTION(?:\s*\d+)?\s*:\s*(?:QUESTION\s+)?CHAPTERS[^\n]*/i, '')
            .trim();
        const sponsorPart = text.substring(sbPos + sbMatch[0].length).trim();

        if (sponsorPart && !sponsorPart.includes('NO REMOVABLE SEGMENTS FOUND')) {
            sbRawText = sponsorPart;
            if (sbRawTextarea) sbRawTextarea.value = sbRawText;
            renderSponsorBlockCards(sbRawText);
            const vid = new URLSearchParams(window.location.search).get('v');
            if (vid) {
                chrome.storage.local.set({ ['sb_segments_' + vid]: sbRawText });
            }
        }
        text = chaptersPart;
    }

    currentRawText = text;
    allParsedChapters = [];
    
    const tempItems = []; // {t: number, title: string, category: string}

    text.split('\n').filter(l => l.trim()).forEach(line => {
        // Skip markdown table header separators like |---|---|
        if (/^\|?[\s\-:|]+\|?$/.test(line.trim())) return;

        // If it's a markdown table row: | Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
        if (line.includes('|')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
            if (cells.length >= 2) {
                // Header row skip & SponsorBlock table skip
                if (cells[0].toLowerCase().includes('q#') || cells[1].toLowerCase().includes('question start')) return;
                if (cells[3]?.toLowerCase().includes('category') || cells[4]?.toLowerCase().includes('reason')) return;
                if (cells[3] && !cells[0].startsWith('Q') && !cells[0].startsWith('q') && (cells[3].toUpperCase().includes('SPONSOR') || cells[3].toUpperCase().includes('BANTER') || cells[3].toUpperCase().includes('TANGENT') || cells[3].toUpperCase().includes('INTRO') || cells[3].toUpperCase().includes('OUTRO') || cells[3].toUpperCase().includes('FILLER'))) return;

                const qNum = cells[0].startsWith('Q') ? cells[0] : `Q${cells[0]}`;
                const qStart = cells[1];
                const optTs = cells[2] || '';
                const ansStart = cells[3] || '';
                const optLetter = cells[4] || '';

                const tsRegex = /\b\d{1,2}(?::\d{2}){1,2}\b/;

                // 1. Question Start Timestamp (ques)
                const matchQ = qStart.match(tsRegex);
                if (matchQ) {
                    const secQ = parseToSeconds(matchQ[0]);
                    let label = `${qNum}: Question Start`;
                    if (optLetter && optLetter !== 'N/A' && optLetter !== 'Unclear') label += ` (Ans: ${optLetter})`;
                    tempItems.push({ t: secQ, title: label, category: 'ques' });
                }

                // 2. Correct Option Timestamp (ans)
                const matchOpt = optTs.match(tsRegex);
                if (matchOpt && optTs !== 'N/A') {
                    const secOpt = parseToSeconds(matchOpt[0]);
                    let label = `${qNum}: Correct Option`;
                    if (optLetter && optLetter !== 'N/A' && optLetter !== 'Unclear') label += ` (${optLetter})`;
                    tempItems.push({ t: secOpt, title: label, category: 'ans' });
                }

                // 3. Answer Explanation Start Timestamp (explain)
                const matchAns = ansStart.match(tsRegex);
                if (matchAns && ansStart !== 'N/A') {
                    const secAns = parseToSeconds(matchAns[0]);
                    let label = `${qNum}: Answer Explanation`;
                    tempItems.push({ t: secAns, title: label, category: 'explain' });
                }
                return;
            }
        }

        // Standard line parsing: timestamp title
        const tsMatch = line.match(/(\d{1,2}(?::\d{2}){1,2})/);
        if (tsMatch) {
            const tsString = tsMatch[1];
            const seconds = parseToSeconds(tsString);
            
            let titlePart = line.split(tsString).slice(1).join(tsString); 
            titlePart = titlePart.replace(/^[-:–—\s.|]+/, '').replace(/\|+$/, '').trim();
            const label = titlePart || 'Chapter';
            
            // Detect category from title if present
            let category = 'other';
            const lower = label.toLowerCase();
            if (lower.includes('question') || lower.includes('ques')) category = 'ques';
            else if (lower.includes('correct option') || lower.includes('option') || lower.includes('ans:')) category = 'ans';
            else if (lower.includes('explanation') || lower.includes('explain')) category = 'explain';

            tempItems.push({ t: seconds, title: label, category });
        }
    });

    // Sort and merge items that have the exact same timestamp
    const sorted = tempItems.sort((a,b) => a.t - b.t);
    const merged = [];
    sorted.forEach(item => {
        if (merged.length > 0 && merged[merged.length - 1].t === item.t) {
            // Same second: combine label and merge categories if needed
            if (!merged[merged.length - 1].title.includes(item.title)) {
                merged[merged.length - 1].title += ` & ${item.title.split(': ').slice(1).join(': ')}`;
            }
            if (merged[merged.length - 1].category !== item.category) {
                merged[merged.length - 1].category += ` & ${item.category}`;
            }
        } else {
            merged.push(item);
        }
    });

    allParsedChapters = merged;
    applyChapterFilter(currentChapterFilter);
}

function renderMarkers() {
    document.querySelectorAll('.yt-ts-custom-marker').forEach(el => el.remove());
    const video = document.querySelector('video');
    if (!video || !video.duration) return;
    const progressList = document.querySelector('.ytp-progress-list');
    if (!progressList) return;
    timestamps.forEach(ts => {
        const marker = document.createElement('div');
        marker.className = 'yt-ts-custom-marker';
        marker.style.left = (ts / video.duration * 100) + '%';
        progressList.appendChild(marker);
    });
}

function resetVideoState() {
    timestamps = [];
    titles = [];
    allParsedChapters = [];
    currentRawText = '';
    lastActiveIdx = -1;
    renderMarkers();
    if (window.refreshDashboard) window.refreshDashboard();
    const textarea = document.getElementById('yt-sk-textarea');
    if (textarea) {
        textarea.value = '';
        if (typeof applyHighlights === 'function') applyHighlights('');
    }
    sbRawText = '';
    if (typeof renderSponsorBlockCards === 'function') renderSponsorBlockCards('');
    const rawSbArea = document.getElementById('yt-sk-sb-raw-textarea');
    if (rawSbArea) rawSbArea.value = '';
    const sbQuickPasteArea = document.getElementById('yt-sk-sb-quick-paste-input');
    if (sbQuickPasteArea) sbQuickPasteArea.value = '';
}

function loadFromDBOrDefault(forceShowToast = false) {
    return new Promise((resolve) => {
        if (!isExtValid()) {
            resolve(false);
            return;
        }
        const vid = new URLSearchParams(window.location.search).get("v");
        if (!vid) {
            loadFromDescription();
            resolve(timestamps.length > 0);
            return;
        }

        chrome.storage.local.get(['tursoUrl', 'tursoToken'], (res) => {
            if (!isExtValid()) {
                resolve(false);
                return;
            }
            // Guard: If user navigated away while getting storage
            const currentVid = new URLSearchParams(window.location.search).get("v");
            if (currentVid !== vid) {
                resolve(false);
                return;
            }

            if (!res.tursoUrl || !res.tursoToken) {
                if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB URL';
                loadFromDescription();
                resolve(timestamps.length > 0);
                return;
            }

            chrome.runtime.sendMessage({
                action: 'tursoQuery',
                payload: {
                    url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                    token: res.tursoToken,
                    sql: "SELECT timestamps FROM video_timestamps WHERE video_id = ?;",
                    args: [{type: "text", value: vid}]
                }
            }, response => {
                // Guard: If user navigated to another video while query was executing
                const currentVidAfterQuery = new URLSearchParams(window.location.search).get("v");
                if (currentVidAfterQuery !== vid) {
                    resolve(false);
                    return;
                }

                const rows = response?.data?.results?.[1]?.response?.result?.rows;
                if (response && response.success && rows && rows.length > 0 && rows[0]?.[0]?.value) {
                    const rowVal = rows[0][0].value;
                    updateStateFromText(rowVal);
                    if (forceShowToast && dashboard) {
                        const st = document.getElementById('yt-sk-status');
                        st.textContent = 'LOADED'; st.style.color = '#00e676';
                    }

                    // Also restore cached SponsorBlock segments for this video
                    chrome.storage.local.get(['sb_segments_' + vid], sbRes => {
                        if (sbRes && sbRes['sb_segments_' + vid]) {
                            sbRawText = sbRes['sb_segments_' + vid];
                            const sbRawTextarea = document.getElementById('yt-sk-sb-raw-textarea');
                            if (sbRawTextarea) sbRawTextarea.value = sbRawText;
                            renderSponsorBlockCards(sbRawText);
                        }
                    });

                    resolve(true); // Found in Turso DB!
                } else {
                    if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB DATA';
                    loadFromDescription();

                    // Still check if we have cached SponsorBlock segments
                    chrome.storage.local.get(['sb_segments_' + vid], sbRes => {
                        if (sbRes && sbRes['sb_segments_' + vid]) {
                            sbRawText = sbRes['sb_segments_' + vid];
                            const sbRawTextarea = document.getElementById('yt-sk-sb-raw-textarea');
                            if (sbRawTextarea) sbRawTextarea.value = sbRawText;
                            renderSponsorBlockCards(sbRawText);
                        }
                    });

                    resolve(timestamps.length > 0);
                }
            });
        });
    });
}

function loadFromDescription() {
    const desc = document.querySelector('#description-inline-expander, .yt-core-attributed-string');
    if (!desc) return;
    const found = [];
    (desc.innerText || desc.textContent).split('\n').forEach(line => {
        const match = line.trim().match(/^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/i);
        if (match) found.push(`${match[1]} ${match[2].trim()}`);
        else {
             const fb = line.match(/\b\d{1,2}(?::\d{2}){1,2}\b/);
             if (fb) found.push(`${fb[0]} Custom`);
        }
    });
    if (found.length) updateStateFromText(found.join('\n'));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!isExtValid()) return false;
    if (msg.action === 'toggleDashboard') {
        toggleDashboard();
        sendResponse({success: true});
        return true;
    } else if (msg.action === 'chunkProgress') {
        // Real-time progressive UI update as each hour is analyzed
        if (msg.partialText) {
            updateStateFromText(msg.partialText);
            const textarea = document.getElementById('yt-sk-textarea');
            if (textarea && document.activeElement !== textarea) {
                textarea.value = msg.partialText;
                if (typeof applyHighlights === 'function') applyHighlights(msg.partialText);
            }
            showToast(`Analyzed Part ${msg.currentHour}/${msg.totalHours} (${timestamps.length} chapters loaded)...`, '⏳', 4000);
        }
        sendResponse({success: true});
        return true;
    } else if (msg.action === 'removableProgress') {
        const statusObj = document.getElementById('yt-sk-status');
        if (statusObj) {
            statusObj.textContent = `SCANNING ${msg.currentHour}/${msg.totalHours}`;
            statusObj.style.color = '#00f2fe';
        }
        showToast(`Analyzing part ${msg.currentHour}/${msg.totalHours}... (${msg.intervalsCount} segments found)`, '🚫', 3000);
        sendResponse({ success: true });
        return true;
    }
});

document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const video = document.querySelector('video');
    if (!video) return;

    if (e.code === shortcuts.add && (!shortcuts.addAlt || e.altKey)) {
        const tsStr = formatTime(Math.floor(video.currentTime));
        const currentLines = currentRawText.trim() ? currentRawText.trim().split('\n') : [];
        currentLines.push(`${tsStr} Custom Marker`);
        updateStateFromText(currentLines.join('\n'));
        e.preventDefault();
        if (dashboard && !dashboard.classList.contains('yt-sk-visible')) {
            toggleDashboard(); // Auto UI popup on add
        }
    } else if (e.altKey && e.code === 'KeyS') {
        // Alt+S: Quick SponsorBlock segment marker
        e.preventDefault();
        const currSec = Math.floor(video.currentTime);
        const currStr = formatTime(currSec);

        if (pendingSbStart === null) {
            pendingSbStart = currSec;
            showToast(`Marked Sponsor START at ${currStr}. Press Alt+S again to finish segment.`, '⏱️', 4500);
            setStatus(`SB START: ${currStr}`, '#00f2fe');

            if (!dashboard) createDashboard();
            const startInput = document.getElementById('yt-sk-sb-input-start');
            if (startInput) startInput.value = currStr;
        } else {
            const startSec = pendingSbStart;
            const endSec = currSec;
            pendingSbStart = null;

            if (endSec <= startSec) {
                showToast(`End time (${currStr}) must be after start time (${formatTime(startSec)})`, '⚠️', 4000);
            } else {
                const sStr = formatTime(startSec);
                const eStr = formatTime(endSec);
                if (typeof addManualSponsorBlockSegment === 'function') {
                    addManualSponsorBlockSegment(sStr, eStr, 'SPONSOR', 'Manual shortcut mark');
                }
                const endInput = document.getElementById('yt-sk-sb-input-end');
                if (endInput) endInput.value = eStr;

                if (dashboard && !dashboard.classList.contains('yt-sk-visible')) {
                    toggleDashboard();
                    const sbTab = dashboard.querySelector('.yt-sk-tab-btn[data-tab="sponsorblock"]');
                    if (sbTab) sbTab.click();
                }
            }
        }
    } else if (e.code === shortcuts.next) {
        skipRelative(1); e.preventDefault();
    } else if (e.code === shortcuts.prev) {
        skipRelative(-1); e.preventDefault();
    }
});

const trackerInterval = setInterval(() => {
    if (!isExtValid()) {
        clearInterval(trackerInterval);
        return;
    }
    const video = document.querySelector('video');
    if (!video) return;
    const curr = video.currentTime;
    let activeIdx = -1;
    for (let i = timestamps.length - 1; i >= 0; i--) {
        if (curr >= timestamps[i]) { activeIdx = i; break; }
    }
    if (activeIdx !== lastActiveIdx) {
        lastActiveIdx = activeIdx;
        updateMiniWidget();
        if (window.refreshDashboard) window.refreshDashboard();
    }
    if (currentMode === 'loop' && lastActiveIdx >= 0) {
        const nextTime = (lastActiveIdx + 1 < timestamps.length) ? timestamps[lastActiveIdx+1] : video.duration;
        if (curr >= nextTime - 0.5) video.currentTime = timestamps[lastActiveIdx];
    }
}, 500);

// --- Floating Toast Notification ---
function showToast(msg, icon = '⚡', duration = 4500) {
    let toast = document.getElementById('yt-sk-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'yt-sk-toast';
        document.body.appendChild(toast);
    }
    toast.replaceChildren();

    const iconSpan = document.createElement('span');
    iconSpan.className = 'yt-sk-toast-icon';
    iconSpan.textContent = icon;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'yt-sk-toast-msg';
    msgSpan.textContent = msg;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toast.className = 'yt-sk-toast-visible';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = '';
    }, duration);
}

// Unlock audio on first user click anywhere in the page (satisfies Chrome Autoplay Policy)
let audioUnlocked = false;
function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
        const dummyAudio = new Audio();
        dummyAudio.play().catch(() => {});
    } catch (_) {}
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
}
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// --- Audio Alert on AI Completion ---
function playCompletionSound() {
    if (!isExtValid()) return;
    chrome.storage.local.get(['soundEnabled', 'soundUrl', 'soundVolume', 'soundCustomData'], res => {
        if (!isExtValid()) return;
        // Enabled by default unless explicitly set to false
        const enabled = typeof res.soundEnabled === 'undefined' ? true : !!res.soundEnabled;
        if (!enabled) return;

        let src = res.soundCustomData || res.soundUrl;
        if (!src || !src.trim()) {
            src = chrome.runtime.getURL('anime-wow.mp3');
        }

        const vol = typeof res.soundVolume !== 'undefined' ? Number(res.soundVolume) / 100 : 0.8;
        try {
            const audio = new Audio(src);
            audio.volume = Math.max(0, Math.min(1, vol));
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Audio playback blocked by browser autoplay policy or network error:", e);
                    // Fallback attempt with bundled file if custom URL had CORS/network error
                    if (src !== chrome.runtime.getURL('anime-wow.mp3')) {
                        const fallback = new Audio(chrome.runtime.getURL('anime-wow.mp3'));
                        fallback.volume = Math.max(0, Math.min(1, vol));
                        fallback.play().catch(() => {});
                    }
                });
            }
        } catch (err) {
            console.error("Audio error:", err);
        }
    });
}

// --- Auto Timestamp Generation on Video Load ---
let isAutoGenerating = false;
let lastProcessedVideoId = null;

async function checkAndTriggerAutoGeneration() {
    if (!isExtValid()) return;
    const video = document.querySelector('video');
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    if (!video || !videoId) return;
    if (videoId === lastProcessedVideoId || isAutoGenerating) return;

    chrome.storage.local.get([
        'autoGenerate', 'aiProvider', 'aiToken', 'openrouterKey',
        'allInOneMode', 'autoSaveSync', 'autoComment', 'autoUploadSb', 'tursoUrl', 'tursoToken', 'sbUserId', 'sbCategoryMode'
    ], async (res) => {
        if (!isExtValid()) return;
        if (!res.autoGenerate) return;

        // Ensure AI key/token is available
        const prov = res.aiProvider || 'aikit';
        if (prov === 'aikit' && !res.aiToken) return;
        if (prov === 'openrouter' && !res.openrouterKey) return;

        // If timestamps already exist from DB or description, skip auto-generation
        if (timestamps.length > 0) return;

        isAutoGenerating = true;
        lastProcessedVideoId = videoId;
        showToast('Auto Timestamp Maker: Fetching transcript...', '⏳', 3500);

        try {
            let transcript = await extractYouTubeTranscriptWithTimestamps();
            if (!transcript || !transcript.trim()) {
                transcript = await fetchTranscriptViaApiFallback(videoId || getCurrentVideoId());
            }
            
            // Check if user changed the video while fetching transcript
            const currentVidAfterTranscript = new URLSearchParams(window.location.search).get('v');
            if (currentVidAfterTranscript !== videoId) {
                console.log(`Video changed from ${videoId} to ${currentVidAfterTranscript}. Aborting previous generation.`);
                isAutoGenerating = false;
                return;
            }

            if (!transcript || !transcript.trim()) {
                console.log("Auto Timestamp Maker: No transcript found for this video.");
                isAutoGenerating = false;
                return;
            }

            const isAio = typeof res.allInOneMode !== 'undefined' ? !!res.allInOneMode : true;

            if (isAio) {
                showToast('⚡ All-in-One: Scanning Chapters & SponsorBlock...', '⚡', 5000);
                chrome.runtime.sendMessage({ action: 'generateAllInOne', text: transcript }, r => {
                    isAutoGenerating = false;
                    const currentVidNow = new URLSearchParams(window.location.search).get('v');
                    if (currentVidNow !== videoId) {
                        // Background sync if user navigated away
                        if (res.autoSaveSync && res.tursoUrl && res.tursoToken && r && r.success && r.data?.chapters) {
                            chrome.runtime.sendMessage({ action: 'tursoQuery', payload: {
                                url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                                token: res.tursoToken,
                                sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                                args: [{type: "text", value: videoId}, {type: "text", value: r.data.chapters.trim()}]
                            }});
                        }
                        return;
                    }

                    if (r && r.success && r.data) {
                        const { chapters, sponsorBlock, questionsCount, sponsorCount } = r.data;

                        // 1. Populate Chapters
                        if (chapters && chapters.trim()) {
                            currentRawText = chapters.trim();
                            const textarea = document.getElementById('yt-sk-textarea');
                            if (textarea) {
                                textarea.value = currentRawText;
                                textarea.oninput();
                            }
                            updateStateFromText(currentRawText);
                        }

                        // 2. Populate SponsorBlock
                        if (sponsorBlock && sponsorBlock.trim()) {
                            sbRawText = sponsorBlock.trim();
                            const sbRawTextarea = document.getElementById('yt-sk-sb-raw-textarea');
                            if (sbRawTextarea) sbRawTextarea.value = sbRawText;
                            renderSponsorBlockCards(sbRawText);
                            chrome.storage.local.set({ ['sb_segments_' + videoId]: sbRawText });
                        }

                        showToast(`✨ All-in-One Complete! (${questionsCount || 0} Questions, ${sponsorCount || 0} Sponsor intervals)`, '🎉', 5500);
                        playCompletionSound();

                        // Auto Save Chapters & Comment (honour autoComment preference)
                        if (res.autoSaveSync && chapters) {
                            const shouldComment = typeof res.autoComment === 'undefined' ? true : !!res.autoComment;
                            if (shouldComment) {
                                showToast('Auto Saving to DB & Commenting...', '☁️', 4000);
                                postYouTubeComment(chapters);
                            } else {
                                showToast('Auto Saving to DB...', '☁️', 4000);
                            }
                            if (res.tursoUrl && res.tursoToken) {
                                chrome.runtime.sendMessage({
                                    action: 'tursoQuery',
                                    payload: {
                                        url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                                        token: res.tursoToken,
                                        sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                                        args: [{type: "text", value: videoId}, {type: "text", value: chapters.trim()}]
                                    }
                                });
                            }
                        }

                        // Auto Upload SponsorBlock
                        if (res.autoUploadSb && sponsorBlock && !sponsorBlock.includes('NO REMOVABLE SEGMENTS FOUND')) {
                            uploadSponsorBlockSegments(true);
                        }
                    } else {
                        const err = r?.error || 'All-in-One scan failed';
                        showToast(`Auto All-in-One Error: ${err}`, '⚠️', 5000);
                    }
                });
                return;
            }

            showToast('Auto Timestamp Maker: AI is generating chapters...', '🧠', 5000);

            chrome.runtime.sendMessage({ action: 'generateChapters', text: transcript }, r => {
                isAutoGenerating = false;

                // Check if user switched video while AI was responding
                const currentVidNow = new URLSearchParams(window.location.search).get('v');
                if (currentVidNow !== videoId) {
                    console.log(`AI result received for old video ${videoId}, but user is now on ${currentVidNow}. Discarding UI update & comment.`);
                    // Still save to Turso DB in background so old video has timestamps ready for future!
                    chrome.storage.local.get(['autoSaveSync', 'tursoUrl', 'tursoToken'], saveRes => {
                        if (saveRes.autoSaveSync && saveRes.tursoUrl && saveRes.tursoToken && r && r.success && r.data) {
                            chrome.runtime.sendMessage({ action: 'tursoQuery', payload: {
                                url: saveRes.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                                token: saveRes.tursoToken,
                                sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                                args: [{type: "text", value: videoId}, {type: "text", value: r.data.trim()}]
                            }});
                        }
                    });
                    return;
                }

                if (r && r.success && r.data) {
                    const generatedText = r.data.trim();
                    updateStateFromText(generatedText);
                    const count = timestamps.length;
                    showToast(`✨ Timestamps Generated! (${count} chapters ready)`, '✅', 5000);
                    playCompletionSound(); // Play audio alert!
                    
                    const textarea = document.getElementById('yt-sk-textarea');
                    if (textarea) {
                        textarea.value = generatedText;
                        textarea.oninput();
                    }

                    // If Auto Save to DB toggle is active (honour autoComment preference)
                    chrome.storage.local.get(['autoSaveSync', 'autoComment', 'autoUploadSb', 'tursoUrl', 'tursoToken', 'sbUserId', 'sbCategoryMode'], async (saveRes) => {
                        if (saveRes.autoSaveSync) {
                            const shouldComment = typeof saveRes.autoComment === 'undefined' ? true : !!saveRes.autoComment;
                            if (shouldComment) {
                                showToast('Auto Saving to DB & Commenting...', '☁️', 4000);
                                postYouTubeComment(generatedText);
                            } else {
                                showToast('Auto Saving to DB...', '☁️', 4000);
                            }

                            // Save to Turso Database if configured
                            if (saveRes.tursoUrl && saveRes.tursoToken) {
                                chrome.runtime.sendMessage({ action: 'tursoQuery', payload: {
                                    url: saveRes.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                                    token: saveRes.tursoToken,
                                    sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                                    args: [{type: "text", value: videoId}, {type: "text", value: generatedText}]
                                }}, dbRes => {
                                    if (dbRes && dbRes.success) {
                                        showToast('Saved to DB & Comment Posted!', '🎉', 4500);
                                    } else {
                                        console.warn("Auto DB save error:", dbRes);
                                    }
                                });
                            }
                        }

                        // Sequential Step 2: Auto SponsorBlock Segment Analysis & Upload
                        if (saveRes.autoUploadSb) {
                            // Check if still on the same video before continuing
                            if (new URLSearchParams(window.location.search).get('v') !== videoId) return;

                            const userId = (saveRes.sbUserId || '').trim();
                            if (!userId || userId.length < 32) {
                                showToast('⚠️ SponsorBlock User ID missing in Settings. Skipping SB upload.', '⚠️', 5000);
                                return;
                            }

                            // 7-second cooldown to strictly prevent rate limiting
                            showToast('Cooldown before SponsorBlock scan...', '⏳', 4000);
                            await new Promise(resolve => setTimeout(resolve, 7000));

                            // Re-check navigation after delay
                            if (new URLSearchParams(window.location.search).get('v') !== videoId) return;

                            showToast('Auto SB: Scanning removable segments...', '🚫', 4500);
                            const sbStatusObj = document.getElementById('yt-sk-status');
                            if (sbStatusObj) {
                                sbStatusObj.textContent = 'SCANNING SB...';
                                sbStatusObj.style.color = '#00f2fe';
                            }

                            chrome.runtime.sendMessage({ action: 'analyzeRemovableSegments', text: transcript }, sbResp => {
                                if (new URLSearchParams(window.location.search).get('v') !== videoId) return;

                                if (sbResp && sbResp.success && sbResp.data) {
                                    const rawSbData = sbResp.data.trim();
                                    sbRawText = rawSbData;
                                    const sbRawTextarea = document.getElementById('yt-sk-sb-raw-textarea');
                                    if (sbRawTextarea) sbRawTextarea.value = rawSbData;
                                    renderSponsorBlockCards(rawSbData);

                                    // Helper: Intelligently Convert Time to Seconds with duration awareness
                                    const videoEl = document.querySelector('video');
                                    const videoDuration = videoEl?.duration ? Math.round(videoEl.duration) : undefined;

                                    function timeToSec(timeStr) {
                                        if (!timeStr) return 0;
                                        const parts = timeStr.trim().split(':').map(p => parseInt(p, 10) || 0);

                                        // Case A: 2 parts [MM, SS] -> MM*60 + SS
                                        if (parts.length === 2) {
                                            return parts[0] * 60 + parts[1];
                                        }

                                        // Case B: 3 parts [A, B, C]
                                        if (parts.length === 3) {
                                            const [p0, p1, p2] = parts;
                                            const standardSec = p0 * 3600 + p1 * 60 + p2;
                                            if (videoDuration && standardSec > videoDuration && (p0 * 60 + p1) <= videoDuration) {
                                                return p0 * 60 + p1;
                                            }
                                            return standardSec;
                                        }

                                        let seconds = 0;
                                        const rev = [...parts].reverse();
                                        for (let i = 0; i < rev.length; i++) {
                                            seconds += rev[i] * Math.pow(60, i);
                                        }
                                        return seconds;
                                    }

                                    const lines = rawSbData.split('\n');
                                    const segmentsArray = [];
                                    const regex = /\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?/;
                                    const categoryMode = saveRes.sbCategoryMode || 'sponsor_only';

                                    const tableCategoryMap = new Map();
                                    lines.forEach(line => {
                                        const trimmed = line.trim();
                                        if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('category') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
                                            const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
                                            if (cells.length >= 4) {
                                                const start = cells[1];
                                                const end = cells[2];
                                                const cat = (cells[3] || '').toUpperCase();
                                                tableCategoryMap.set(`${start}-${end}`, cat);
                                            }
                                        }
                                    });

                                    lines.forEach(line => {
                                        const trimmed = line.trim();
                                        if (trimmed.startsWith('|')) return;

                                        const match = trimmed.match(regex);
                                        if (match) {
                                            const startStr = match[1];
                                            const endStr = match[2];
                                            const startSec = timeToSec(startStr);
                                            const endSec = timeToSec(endStr);

                                            if (endSec > startSec) {
                                                let sbCategory = 'sponsor';
                                                if (categoryMode === 'mapped') {
                                                    const detectedCat = (tableCategoryMap.get(`${startStr}-${endStr}`) || '').toUpperCase();
                                                    if (detectedCat === 'SPONSOR') sbCategory = 'sponsor';
                                                    else if (detectedCat === 'SELFPROMO') sbCategory = 'selfpromo';
                                                    else if (detectedCat === 'INTERACTION') sbCategory = 'interaction';
                                                    else if (detectedCat === 'INTRO') sbCategory = 'intro';
                                                    else if (detectedCat === 'OUTRO') sbCategory = 'outro';
                                                    else if (detectedCat === 'PREVIEW') sbCategory = 'preview';
                                                    else if (detectedCat === 'FILLER' || detectedCat === 'JOKE' || detectedCat === 'NON_EDUCATIONAL' || detectedCat === 'TANGENT') sbCategory = 'filler';
                                                    else sbCategory = 'sponsor';
                                                }

                                                segmentsArray.push({
                                                    segment: [startSec, endSec],
                                                    category: sbCategory,
                                                    actionType: "skip"
                                                });
                                            }
                                        }
                                    });

                                    if (segmentsArray.length === 0) {
                                        showToast('Auto SB: No removable intervals detected.', 'ℹ️', 4000);
                                        return;
                                    }


                                    showToast(`Auto SB: Uploading ${segmentsArray.length} segments...`, '🚀', 4000);

                                    chrome.runtime.sendMessage({
                                        action: 'submitSponsorBlock',
                                        payload: {
                                            videoId: videoId,
                                            userId: userId,
                                            segments: segmentsArray,
                                            videoDuration: videoDuration
                                        }
                                    }, uploadResp => {
                                        if (uploadResp && uploadResp.success) {
                                            setStatus(`AUTO SB DONE (${segmentsArray.length})`, '#00e676');
                                            showToast(`🎉 Both Chapters & SponsorBlock (${segmentsArray.length} segments) completed!`, '🚀', 6000);
                                            playCompletionSound();
                                        } else {
                                            const err = uploadResp?.error || 'SB Upload failed';
                                            console.warn("Auto SB Upload Error:", uploadResp);
                                            showToast(`Auto SB Error: ${err}`, '⚠️', 5000);
                                        }
                                    });
                                } else {
                                    console.warn("Auto SB scan failed:", sbResp?.error);
                                }
                            });
                        }
                    });
                } else {
                    const err = r?.error || 'AI generation failed';
                    console.error("Auto Timestamp Maker Error:", err);
                    showToast(`AI Error: ${err}`, '⚠️', 4000);
                }
            });
        } catch (err) {
            isAutoGenerating = false;
            console.error("Auto Timestamp Maker Exception:", err);
        }
    });
}

async function onVideoPageLoaded() {
    if (!isExtValid()) return;
    const video = document.querySelector('video');
    if (!video) return;

    const currentVid = new URLSearchParams(window.location.search).get('v');
    if (!currentVid) return;

    const foundInDB = await loadFromDBOrDefault();
    if (!isExtValid()) return;
    // Verify user is still on the same video after DB check
    if (new URLSearchParams(window.location.search).get('v') !== currentVid) return;

    if (foundInDB && timestamps.length > 0) {
        showToast(`Loaded ${timestamps.length} chapters from Cloud Database!`, '☁️', 3500);
        return; // Already exists in DB - NO AI FETCH NEEDED!
    }

    // Only if not found in DB or description, trigger Auto Timestamp Maker
    checkAndTriggerAutoGeneration();
}

let lastUrl = window.location.href;
function handleNavigationChange() {
    if (!isExtValid()) return;
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        resetVideoState();
        lastProcessedVideoId = null; // Allow auto-generation for the new video
        setTimeout(onVideoPageLoaded, 1000);
    }
    setupMobileToggleButton();
    syncDashboardTheme();
}

// 1. YouTube custom SPA event (fires instantly when navigating between videos)
window.addEventListener('yt-navigate-finish', handleNavigationChange);

// 2. DOM MutationObserver fallback
const observer = new MutationObserver(() => {
    handleNavigationChange();
});
observer.observe(document.body, { childList: true, subtree: true });

// Also observe html attribute changes (YouTube dark mode toggle adds/removes 'dark' attribute on <html>)
const htmlThemeObserver = new MutationObserver(() => {
    syncDashboardTheme();
});
htmlThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });

// --- Floating Toggle Launcher Button (Desktop & Mobile) ---
let mobileToggleBtn = null;

createMiniWidget();
setupMobileToggleButton();
setTimeout(onVideoPageLoaded, 1200);

function setupMobileToggleButton() {
    if (!document.body) return;
    let existing = document.getElementById('yt-skipper-mobile-toggle');
    if (!existing) {
        mobileToggleBtn = document.createElement('div');
        mobileToggleBtn.id = 'yt-skipper-mobile-toggle';
        mobileToggleBtn.title = 'Open YT Skipper Dashboard (or press Alt+X / click extension icon)';
        mobileToggleBtn.innerHTML = '⚡';
        mobileToggleBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDashboard();
        };
        document.body.appendChild(mobileToggleBtn);
    } else {
        mobileToggleBtn = existing;
    }
}

// --- Auto Comment on YouTube Feature ---
function formatCommentText(rawText) {
    let cleanComment = '';
    
    // Check if it's a markdown table
    if (rawText.includes('|') && (rawText.toLowerCase().includes('question start') || rawText.toLowerCase().includes('q#'))) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const questionsList = [];
        
        lines.forEach(line => {
            if (/^\|?[\s\-:|]+\|?$/.test(line)) return;
            if (line.includes('|')) {
                const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
                if (cells.length >= 2) {
                    if (cells[0].toLowerCase().includes('q#') || cells[1].toLowerCase().includes('question start')) return;
                    
                    const qNum = cells[0].startsWith('Q') ? cells[0] : `Q${cells[0]}`;
                    const qStart = cells[1];
                    const optTs = cells[2] || '';
                    const ansStart = cells[3] || '';
                    const optLetter = cells[4] || '';
                    const tsRegex = /\b\d{1,2}(?::\d{2}){1,2}\b/;
                    
                    const matchQ = qStart.match(tsRegex);
                    const matchAns = (ansStart && ansStart !== 'N/A') ? ansStart.match(tsRegex) : null;
                    const matchOpt = (optTs && optTs !== 'N/A') ? optTs.match(tsRegex) : null;

                    // Choose answer timestamp: prefer Answer Start, fallback to Correct Option
                    const ansTimeMatch = matchAns || matchOpt;

                    if (matchQ) {
                        let lineStr = `${qNum}: Question ${matchQ[0]}`;
                        if (ansTimeMatch) {
                            lineStr += ` | Answer ${ansTimeMatch[0]}`;
                            if (optLetter && optLetter !== 'N/A' && optLetter !== 'Unclear') {
                                lineStr += ` (${optLetter})`;
                            }
                        } else if (optLetter && optLetter !== 'N/A' && optLetter !== 'Unclear') {
                            lineStr += ` (Ans: ${optLetter})`;
                        }
                        questionsList.push(lineStr);
                    }
                }
            }
        });

        if (questionsList.length > 0) {
            cleanComment = "📌 Questions & Answers Timestamps:\n" + questionsList.join('\n');
        } else {
            cleanComment = rawText.trim();
        }
    } else {
        cleanComment = rawText.trim();
    }

    const watermark = "\n\n━━━━━━━━━━━━━━━━━━━━\nmade with 💖 by pavnxet(https://github.com/pavnxet/yt-timestamp-skipper)";
    return cleanComment + watermark;
}

async function postYouTubeComment(rawText) {
    const commentBody = formatCommentText(rawText);
    const statusObj = document.getElementById('yt-sk-status');

    try {
        // 1. Scroll slightly down towards comments section so YouTube loads the comments component
        const commentsSection = document.querySelector('ytd-comments#comments, #comments');
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            window.scrollBy({ top: 400, behavior: 'smooth' });
        }

        // 2. Wait for comment box placeholder or input container to appear (up to 4 seconds)
        let placeholder = null;
        for (let attempt = 0; attempt < 8; attempt++) {
            placeholder = document.querySelector('#simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area');
            if (placeholder && placeholder.offsetParent !== null) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (!placeholder) {
            console.warn("Could not find YouTube comment box (may be signed out or comments disabled).");
            if (statusObj) {
                statusObj.textContent = 'COMMENTS UNAVAIL';
                statusObj.style.color = '#ffb74d';
            }
            return;
        }

        // 3. Click placeholder to activate the rich editor
        placeholder.click();
        await new Promise(r => setTimeout(r, 400));

        // 4. Find the editable text container
        const editable = document.querySelector('#contenteditable-root[contenteditable="true"], ytd-comment-simplebox-renderer #contenteditable-root');
        if (!editable) {
            console.warn("Could not find contenteditable element for YouTube comment.");
            return;
        }

        // Focus and insert comment text
        editable.focus();
        // Clear existing placeholder content
        editable.textContent = '';
        
        // Use document.execCommand to trigger YouTube internal input event listeners cleanly
        const inserted = document.execCommand('insertText', false, commentBody);
        if (!inserted) {
            editable.textContent = commentBody;
            editable.dispatchEvent(new Event('input', { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 600));

        // 5. Find Submit / Comment Button and Click
        const submitBtn = document.querySelector('#submit-button ytd-button-renderer button, #submit-button button');
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            console.log("YouTube comment posted successfully with watermark!");
            if (statusObj) {
                statusObj.textContent = 'COMMENT POSTED!';
                statusObj.style.color = '#00e676';
            }
        } else {
            console.log("Comment filled in box. Submit button waiting or disabled.");
            if (statusObj) {
                statusObj.textContent = 'COMMENT READY';
                statusObj.style.color = '#00e676';
            }
        }
    } catch (err) {
        console.error("Auto-comment error:", err);
        if (statusObj) {
            statusObj.textContent = 'COMMENT FAILED';
            statusObj.style.color = '#ff4b4b';
        }
    }
}

// --- YouTube Video ID Helper ---
function getCurrentVideoId() {
    let vid = (new URLSearchParams(window.location.search)).get('v');
    if (!vid) {
        const flexy = document.querySelector('ytd-watch-flexy');
        if (flexy && flexy.getAttribute('video-id')) {
            vid = flexy.getAttribute('video-id');
        }
    }
    if (!vid) {
        const m = window.location.pathname.match(/\/(?:shorts|live|embed|v)\/([a-zA-Z0-9_-]{11})/);
        if (m) vid = m[1];
    }
    if (!vid) {
        const link = document.querySelector('link[rel="canonical"]');
        if (link && link.href) {
            const m = link.href.match(/v=([a-zA-Z0-9_-]{11})/);
            if (m) vid = m[1];
        }
    }
    return vid || null;
}

// --- TranscriptAPI Fallback Fetcher Helper ---
async function fetchTranscriptViaApiFallback(videoId) {
    const vid = videoId || getCurrentVideoId();
    if (!vid) {
        console.warn("[TranscriptAPI] Could not determine videoId for fallback");
        return null;
    }
    console.log(`[TranscriptAPI] Initiating fallback transcript fetch for videoId: ${vid}`);
    return new Promise(resolve => {
        if (!isExtValid()) return resolve(null);
        chrome.storage.local.get(['transcriptApiKey'], res => {
            const apiKey = (res && res.transcriptApiKey && res.transcriptApiKey.trim())
                ? res.transcriptApiKey.trim()
                : 'sk_ZDrY9xqIVpMGguu0pWru_CEUtmHO-eMW1rWqf_Wk7WA';
            chrome.runtime.sendMessage({
                action: 'fetchTranscriptFromApi',
                payload: { videoId: vid, apiKey }
            }, r => {
                if (r && r.success && r.data) {
                    console.log(`[TranscriptAPI] Successfully fetched transcript fallback (${r.data.split('\n').length} lines)`);
                    resolve(r.data);
                } else {
                    console.warn("[TranscriptAPI] Fallback failed:", r?.error);
                    resolve(null);
                }
            });
        });
    });
}

// --- Autonomous YouTube Transcript Extraction with Timestamps ---
async function extractYouTubeTranscriptWithTimestamps() {
    console.log("Starting autonomous transcript extraction...");

    // Temporarily minimize conflict with playlist panels
    const playlistPanel = document.querySelector('ytd-playlist-panel-renderer#playlist');
    const prevPlaylistDisplay = playlistPanel ? playlistPanel.style.display : null;
    if (playlistPanel) playlistPanel.style.display = 'none';

    function restorePlaylist() {
        if (playlistPanel && prevPlaylistDisplay !== null) {
            playlistPanel.style.display = prevPlaylistDisplay;
        }
    }

    // Check if transcript panel is already open and populated
    const existingPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #content, ytm-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ytd-transcript-renderer, ytm-transcript-renderer');
    if (existingPanel && existingPanel.querySelector('ytd-transcript-segment-renderer, ytm-transcript-segment-renderer, .transcript-segment')) {
        const res = collectTranscriptSegments(existingPanel);
        restorePlaylist();
        if (res) return res;
    }

    // Step 1: Look for direct "Show transcript" button in description / actions
    let transcriptBtn = document.querySelector('[aria-label="Show transcript"], ytd-video-description-transcript-section-renderer button, ytm-video-description-transcript-section-renderer button, button[aria-label*="transcript" i]');
    
    // Step 2: If not visible, expand description or click "More actions" (...)
    if (!transcriptBtn || transcriptBtn.offsetParent === null) {
        // Try clicking description "more" if collapsed
        const descExpandBtn = document.querySelector('#expand, #description-inline-expander #expand, .ytd-text-inline-expander #expand, ytm-expandable-video-description-body-renderer .expand-button, .expand-button');
        if (descExpandBtn && descExpandBtn.offsetParent !== null) {
            descExpandBtn.click();
            await new Promise(r => setTimeout(r, 350));
            transcriptBtn = document.querySelector('[aria-label="Show transcript"], ytd-video-description-transcript-section-renderer button, ytm-video-description-transcript-section-renderer button, button[aria-label*="transcript" i]');
        }
    }

    if (!transcriptBtn || transcriptBtn.offsetParent === null) {
        // Try the "..." More actions button in the actions bar
        const moreActionsButton = document.querySelector('button[aria-label="More actions"], #top-level-buttons-computed button[aria-label="More actions"], ytm-menu-renderer button');
        if (moreActionsButton) {
            moreActionsButton.click();
            await new Promise(r => setTimeout(r, 350));
            transcriptBtn = document.querySelector('[aria-label="Show transcript"], button[aria-label*="transcript" i]');
        }
    }

    if (!transcriptBtn) {
        // Check once more under the description transcript renderer
        transcriptBtn = document.querySelector('ytd-video-description-transcript-section-renderer button, ytm-video-description-transcript-section-renderer button, button[aria-label="Show transcript"], button[aria-label*="transcript" i]');
    }

    if (!transcriptBtn) {
        console.warn("Could not find 'Show transcript' button on YouTube page. Triggering TranscriptAPI fallback immediately...");
        restorePlaylist();
        const fallback = await fetchTranscriptViaApiFallback(getCurrentVideoId());
        if (fallback) {
            showToast('Loaded transcript via TranscriptAPI fallback', '⚡', 3000);
            return fallback;
        }
        return null;
    }

    // Step 3: Click the transcript button to open the panel
    transcriptBtn.click();

    // Step 4: Wait for transcript segments to load (polling up to 5 seconds)
    const transcriptText = await new Promise((resolve) => {
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #content, ytm-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ytd-transcript-renderer, ytm-transcript-renderer');
            if (panel) {
                // If segments loaded, return them!
                if (panel.querySelector('ytd-transcript-segment-renderer, ytm-transcript-segment-renderer, .transcript-segment')) {
                    clearInterval(intervalId);
                    const result = collectTranscriptSegments(panel);
                    resolve(result);
                    return;
                }

                // Check if YouTube displayed an explicit unavailable/empty state
                const errorState = panel.querySelector('ytd-transcript-search-panel-renderer [id="message"], #empty-state, #error, ytd-message-renderer');
                if (errorState && errorState.textContent && errorState.textContent.trim()) {
                    console.warn("[Transcript] Native panel indicated transcript unavailable:", errorState.textContent.trim());
                    clearInterval(intervalId);
                    resolve(null);
                    return;
                }
            }

            if (attempts > 10) { // 5 seconds is plenty for local DOM
                clearInterval(intervalId);
                console.warn("Timed out (5s) waiting for native transcript segments to load. Falling back to API...");
                resolve(null);
            }
        }, 500);
    });

    restorePlaylist();
    if (!transcriptText || !transcriptText.trim()) {
        console.warn("Native transcript empty or timed out. Trying TranscriptAPI fallback...");
        const fallback = await fetchTranscriptViaApiFallback(getCurrentVideoId());
        if (fallback) {
            showToast('Loaded transcript via TranscriptAPI fallback', '⚡', 3000);
            return fallback;
        }
    }
    return transcriptText;
}

function collectTranscriptSegments(panel) {
    if (!panel) return null;
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer, ytm-transcript-segment-renderer, .transcript-segment');
    if (!segments || segments.length === 0) return null;

    const lines = [];
    segments.forEach(seg => {
        const timeEl = seg.querySelector('.segment-timestamp, .transcript-segment-timestamp');
        const textEl = seg.querySelector('.segment-text, .transcript-segment-text');
        if (timeEl && textEl) {
            const timeStr = timeEl.textContent.trim();
            const textStr = textEl.textContent.trim();
            if (timeStr && textStr) {
                lines.push(`${timeStr} ${textStr}`);
            }
        }
    });

    return lines.join('\n');
}

