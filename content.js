/**
 * YT Smart Chapters Pro v2.0
 * made with 💖 by pavnxet
 * GitHub: https://github.com/pavnxet/yt-timestamp-skipper
 */
let timestamps = [];
let titles = [];
let allParsedChapters = []; // [{t: number, title: string, category: 'ques'|'ans'|'explain'|'other'}]
let currentChapterFilter = 'all'; // 'all' | 'ques' | 'ans' | 'explain'
let lastActiveIdx = -1;
let currentMode = 'normal';
let currentRawText = '';
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
    miniWidget.onmousedown = (e) => {
        if (e.target.classList.contains('mini-widget-btn')) return;
        isDragging = true;
        offset = [miniWidget.offsetLeft - e.clientX, miniWidget.offsetTop - e.clientY];
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        miniWidget.style.left = (e.clientX + offset[0]) + 'px';
        miniWidget.style.top = (e.clientY + offset[1]) + 'px';
        miniWidget.style.right = 'auto'; miniWidget.style.bottom = 'auto';
    };
    document.onmouseup = () => isDragging = false;
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
                <h2>Skipper v3.0</h2>
                <div class="yt-sk-status" id="yt-sk-status">Active</div>
            </div>
            <div class="yt-sk-header-actions">
                <div class="yt-sk-icon-btn" id="yt-sk-btn-min" title="Minimize / Restore">—</div>
                <div class="yt-sk-icon-btn yt-sk-close-btn" id="yt-sk-btn-close" title="Close">✕</div>
            </div>
        </div>

        <div class="yt-sk-tabs">
            <button class="yt-sk-tab-btn active" data-tab="chapters">📌 Chapters</button>
            <button class="yt-sk-tab-btn" data-tab="editor">📝 Editor</button>
            <button class="yt-sk-tab-btn" data-tab="settings">⚙️ Settings</button>
        </div>

        <!-- TAB 1: CHAPTERS -->
        <div class="yt-sk-tab-content active" id="yt-sk-tab-chapters">
            <select id="yt-sk-mode">
                <option value="normal">Mode: Normal Navigation</option>
                <option value="loop">Mode: Loop Current Chapter</option>
            </select>

            <!-- Chapter Category Filter Chips -->
            <div class="yt-sk-filter-chips" id="yt-sk-filter-chips">
                <button class="yt-sk-chip active" data-filter="all" title="Show all extracted timestamps">All</button>
                <button class="yt-sk-chip" data-filter="ques" title="Show only Question Start timestamps">❓ Ques</button>
                <button class="yt-sk-chip" data-filter="ans" title="Show only Correct Option timestamps">🎯 Option</button>
                <button class="yt-sk-chip" data-filter="explain" title="Show only Answer Explanation timestamps">💡 Explain</button>
            </div>

            <div class="yt-sk-list" id="yt-sk-list"></div>
            <div class="yt-sk-btn-row">
                <button class="yt-sk-btn" id="yt-sk-btn-save" title="Save to Turso DB">☁️ Save to DB</button>
                <button class="yt-sk-btn" id="yt-sk-btn-load" title="Load from Turso DB">🔄 Load DB</button>
            </div>
        </div>

        <!-- TAB 2: EDITOR -->
        <div class="yt-sk-tab-content" id="yt-sk-tab-editor">
            <div class="yt-sk-textarea-container">
                <div id="yt-sk-textarea-highlights" class="yt-sk-textarea-layer"></div>
                <textarea id="yt-sk-textarea" class="yt-sk-textarea-layer" spellcheck="false" placeholder="Enter timestamps e.g.&#10;01:23 Introduction&#10;04:56 Topic Discussion"></textarea>
            </div>
            <div class="yt-sk-btn-row">
                <button class="yt-sk-btn" id="yt-sk-btn-fetch-transcript" title="Auto-fetch video transcript with timestamps">📜 Fetch Transcript</button>
                <button class="yt-sk-btn" id="yt-sk-btn-clean" title="Sort & format timestamps">🧹 Clean</button>
                <button class="yt-sk-btn" id="yt-sk-btn-copy" title="Copy to clipboard">📋 Copy</button>
            </div>
            <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-btn-ai" title="AI Generate Chapter Names">✨ AI Generate Titles</button>
        </div>

        <!-- TAB 3: SETTINGS -->
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
                    <label>Status</label>
                    <div id="yt-sk-sc-save" class="yt-sk-shortcut-input" style="color:#00e676; pointer-events:none;">OK</div>
                </div>
            </div>

            <div class="yt-sk-section-title" style="margin-top:6px;">AI Provider</div>
            <select id="yt-sk-ai-provider" style="width:100%; padding:8px 10px; border-radius:6px; font-size:11px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.1); color:#00f2fe; cursor:pointer; outline:none; margin-bottom:8px; font-weight:600;">
                <option value="aikit">AIKit Qwen (Claude Code API) - Active</option>
                <option value="openrouter">OpenRouter AI</option>
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
            
            <button class="yt-sk-btn yt-sk-btn-primary" id="yt-sk-btn-test-ai" style="margin-top:4px; margin-bottom: 6px;">⚡ Test AI Connection</button>
            <div id="yt-sk-ai-test-result" style="display:none; font-size:11px; padding:6px 10px; border-radius:6px; margin-bottom:8px; line-height: 1.4;"></div>

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
    const btnTestAi = document.getElementById('yt-sk-btn-test-ai');
    const aiTestResult = document.getElementById('yt-sk-ai-test-result');
    const btnClose = document.getElementById('yt-sk-btn-close');
    const btnMin = document.getElementById('yt-sk-btn-min');
    const header = document.getElementById('yt-sk-header');

    // Dragging Logic for Dashboard Header
    let isDraggingDash = false, dashOffset = [0, 0];
    header.onmousedown = (e) => {
        if (e.target.closest('.yt-sk-header-actions')) return;
        isDraggingDash = true;
        const rect = dashboard.getBoundingClientRect();
        dashOffset = [rect.left - e.clientX, rect.top - e.clientY];
        dashboard.style.transition = 'none';
    };
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingDash) return;
        const left = Math.max(10, Math.min(window.innerWidth - dashboard.offsetWidth - 10, e.clientX + dashOffset[0]));
        const top = Math.max(10, Math.min(window.innerHeight - 50, e.clientY + dashOffset[1]));
        dashboard.style.left = left + 'px';
        dashboard.style.top = top + 'px';
        dashboard.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
        if (isDraggingDash) {
            isDraggingDash = false;
            dashboard.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
        }
    });

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
            dashboard.querySelectorAll('.yt-sk-tab-content').forEach(c => c.classList.remove('active'));
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
        if (prov === 'aikit') {
            panelAikit.style.display = 'block';
            panelOpenrouter.style.display = 'none';
        } else {
            panelAikit.style.display = 'none';
            panelOpenrouter.style.display = 'block';
        }
    };

    chrome.storage.local.get([
        'tursoUrl', 'tursoToken', 
        'aiProvider', 'aiToken', 'aiModel', 'aiBaseUrl',
        'openrouterKey', 'openrouterModel', 'shortcuts',
        'autoComment', 'showMiniWidget', 'autoGenerate', 'autoSaveSync'
    ], (res) => {
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

        if (typeof res.autoComment !== 'undefined') {
            document.getElementById('yt-sk-auto-comment').checked = !!res.autoComment;
        } else {
            document.getElementById('yt-sk-auto-comment').checked = true; // default enabled
        }

        showMiniWidget = !!res.showMiniWidget; // Default false (no second popup)
        const miniToggle = document.getElementById('yt-sk-show-mini-widget');
        if (miniToggle) {
            miniToggle.checked = showMiniWidget;
            miniToggle.onchange = () => {
                showMiniWidget = miniToggle.checked;
                chrome.storage.local.set({ showMiniWidget });
                updateMiniWidget();
            };
        }
        updateMiniWidget();
        
        // AI Provider selection
        let prov = res.aiProvider;
        if (prov !== 'openrouter') {
            prov = 'aikit';
        }
        aiProviderSelect.value = prov;
        aiProviderSelect.onchange();

        // AIKit credentials
        const aikitToken = res.aiToken || "";
        const aikitUrl = res.aiBaseUrl || "https://claude.aikit.club/qwen.aikit.club/v1";
        let aikitModel = res.aiModel;
        if (!aikitModel || !aikitModel.startsWith('qwen')) {
            aikitModel = 'qwen3.8-max';
        }

        aikitTokenInput.value = aikitToken;
        aikitUrlInput.value = aikitUrl;
        aikitModelSelect.value = aikitModel;

        // Auto-persist AIKit defaults if not previously set
        if (!res.aiProvider || !res.aiToken || !res.aiModel?.startsWith('qwen')) {
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
        let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        aiTestResult.innerHTML = `Connecting to ${prov === 'aikit' ? 'AIKit Qwen (' + payload.model + ')' : 'OpenRouter (' + payload.model + ')'}...`;

        chrome.runtime.sendMessage({
            action: 'verifyAi',
            payload
        }, res => {
            btnTestAi.disabled = false;
            btnTestAi.textContent = '⚡ Test AI Connection';
            if (res && res.success) {
                const info = res.data;
                aiTestResult.style.background = 'rgba(0, 230, 118, 0.15)';
                aiTestResult.style.border = '1px solid rgba(0, 230, 118, 0.4)';
                aiTestResult.style.color = '#00e676';
                aiTestResult.innerHTML = `✅ <b>Working!</b> Connected to <code>${info.model}</code>.<br><span style="opacity:0.8; font-size:10px;">Provider: ${prov === 'aikit' ? 'AIKit Qwen (Claude Code Protocol)' : 'OpenRouter'}</span>`;
                setStatus('AI VALIDATED', '#00e676');

                // Automatically save working settings
                const saveObj = { aiProvider: prov };
                if (prov === 'aikit') {
                    saveObj.aiToken = payload.apiKey;
                    saveObj.aiModel = payload.model;
                    saveObj.aiBaseUrl = payload.baseUrl;
                } else {
                    saveObj.openrouterKey = payload.apiKey;
                    saveObj.openrouterModel = payload.model;
                }
                chrome.storage.local.set(saveObj);
            } else {
                aiTestResult.style.background = 'rgba(255, 75, 75, 0.15)';
                aiTestResult.style.border = '1px solid rgba(255, 75, 75, 0.4)';
                aiTestResult.style.color = '#ff6b6b';
                aiTestResult.innerHTML = `❌ <b>Test Failed:</b> ${res?.error || 'Connection error'}`;
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

        setStatus('SAVING...');
        const toSave = { 
            aiProvider: prov,
            autoComment: autoComment,
            autoGenerate: autoGenerate,
            autoSaveSync: autoSaveSync,
            showMiniWidget: miniChecked
        };
        showMiniWidget = miniChecked;
        updateMiniWidget();

        if (prov === 'aikit') {
            toSave.aiToken = aikitTokenInput.value.trim();
            toSave.aiModel = aikitModelSelect.value;
            toSave.aiBaseUrl = aikitUrlInput.value.trim();
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

            const transcript = await extractYouTubeTranscriptWithTimestamps();
            btnFetchTranscript.disabled = false;
            btnFetchTranscript.textContent = '📜 Fetch Transcript';

            if (transcript) {
                textarea.value = transcript;
                textarea.oninput();
                setStatus('TRANSCRIPT LOADED', '#00e676');
            } else {
                setStatus('NO TRANSCRIPT FOUND', '#ff4b4b');
                alert('Could not fetch YouTube transcript.\nEnsure the video has captions/transcript available on YouTube.');
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
            aiBtn.disabled = false;
            aiBtn.textContent = '✨ AI Generate Titles';

            if (!text || !text.trim()) {
                setStatus('NO TRANSCRIPT', '#ff4b4b');
                alert('No text in editor and could not fetch transcript from YouTube.\nMake sure the video has transcripts/captions available.');
                return;
            }

            textarea.value = text;
            textarea.oninput();
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

            chrome.runtime.sendMessage({ action: 'generateChapters', text }, r => {
                aiBtn.disabled = false;
                if (r && r.success) {
                    textarea.value = r.data.trim();
                    textarea.oninput();
                    setStatus('AI COMPLETE', '#00e676');
                } else {
                    const err = r?.error || 'AI Failed';
                    setStatus(err.length > 20 ? 'AI ERROR' : err.toUpperCase(), '#ff4b4b');
                    alert('AI Generation Error:\n' + err);
                    console.error(r?.error);
                }
            });
        });
    };

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
        
        list.innerHTML = '';
        if (!timestamps.length) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.4);font-size:11px;">No Chapters Found</div>';
            return;
        }
        timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            item.className = 'yt-sk-item' + (i === lastActiveIdx ? ' yt-sk-active' : '');
            item.innerHTML = `
                <span class="yt-sk-item-time">${formatTime(sec)}</span>
                <span class="yt-sk-item-title">${titles[i] || 'Chapter ' + (i + 1)}</span>
            `;
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
                // Header row skip
                if (cells[0].toLowerCase().includes('q#') || cells[1].toLowerCase().includes('question start')) return;

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

function loadFromDBOrDefault(forceShowToast = false) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['tursoUrl', 'tursoToken'], (res) => {
            if (!res.tursoUrl || !res.tursoToken) {
                if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB URL';
                loadFromDescription();
                resolve(timestamps.length > 0);
                return;
            }
            const vid = new URLSearchParams(window.location.search).get("v");
            if (!vid) {
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
                if (response && response.success && response.data.results[1]?.response?.result?.rows?.length > 0) {
                    const rowVal = response.data.results[1].response.result.rows[0][0].value;
                    updateStateFromText(rowVal);
                    if (forceShowToast && dashboard) {
                        const st = document.getElementById('yt-sk-status');
                        st.textContent = 'LOADED'; st.style.color = '#00e676';
                    }
                    resolve(true); // Found in Turso DB!
                } else {
                    if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB DATA';
                    loadFromDescription();
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
    if (msg.action === 'toggleDashboard') {
        toggleDashboard();
        sendResponse({success: true});
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
    } else if (e.code === shortcuts.next) {
        skipRelative(1); e.preventDefault();
    } else if (e.code === shortcuts.prev) {
        skipRelative(-1); e.preventDefault();
    }
});

setInterval(() => {
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
    toast.innerHTML = `<span class="yt-sk-toast-icon">${icon}</span><span class="yt-sk-toast-msg">${msg}</span>`;
    toast.className = 'yt-sk-toast-visible';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = '';
    }, duration);
}

// --- Auto Timestamp Generation on Video Load ---
let isAutoGenerating = false;
let lastProcessedVideoId = null;

async function checkAndTriggerAutoGeneration() {
    const video = document.querySelector('video');
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    if (!video || !videoId) return;
    if (videoId === lastProcessedVideoId || isAutoGenerating) return;

    chrome.storage.local.get(['autoGenerate', 'aiProvider', 'aiToken', 'openrouterKey'], async (res) => {
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
            const transcript = await extractYouTubeTranscriptWithTimestamps();
            if (!transcript || !transcript.trim()) {
                console.log("Auto Timestamp Maker: No transcript found for this video.");
                isAutoGenerating = false;
                return;
            }

            showToast('Auto Timestamp Maker: AI is generating chapters...', '🧠', 5000);

            chrome.runtime.sendMessage({ action: 'generateChapters', text: transcript }, r => {
                isAutoGenerating = false;
                if (r && r.success && r.data) {
                    const generatedText = r.data.trim();
                    updateStateFromText(generatedText);
                    const count = timestamps.length;
                    showToast(`✨ Timestamps Generated! (${count} chapters ready)`, '✅', 5000);
                    
                    const textarea = document.getElementById('yt-sk-textarea');
                    if (textarea) {
                        textarea.value = generatedText;
                        textarea.oninput();
                    }

                    // If Auto Save to DB & Post Comment toggle is active
                    chrome.storage.local.get(['autoSaveSync', 'tursoUrl', 'tursoToken'], saveRes => {
                        if (saveRes.autoSaveSync) {
                            showToast('Auto Saving to DB & Commenting...', '☁️', 4000);
                            
                            // Post comment on YouTube
                            postYouTubeComment(generatedText);

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
    const video = document.querySelector('video');
    if (!video) return;

    renderMarkers();
    const foundInDB = await loadFromDBOrDefault();
    if (foundInDB && timestamps.length > 0) {
        showToast(`Loaded ${timestamps.length} chapters from Cloud Database!`, '☁️', 3500);
        return; // Already exists in DB - NO AI FETCH NEEDED!
    }

    // Only if not found in DB or description, trigger Auto Timestamp Maker
    checkAndTriggerAutoGeneration();
}

let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (document.querySelector('video') && window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        timestamps = []; currentRawText = '';
        setTimeout(onVideoPageLoaded, 1200);
    }
    syncDashboardTheme();
});
observer.observe(document.body, { childList: true, subtree: true });

// Also observe html attribute changes (YouTube dark mode toggle adds/removes 'dark' attribute on <html>)
const htmlThemeObserver = new MutationObserver(() => {
    syncDashboardTheme();
});
htmlThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });

createMiniWidget();
setTimeout(onVideoPageLoaded, 1500);

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
    const existingPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #content');
    if (existingPanel && existingPanel.querySelector('ytd-transcript-segment-renderer')) {
        const res = collectTranscriptSegments(existingPanel);
        restorePlaylist();
        if (res) return res;
    }

    // Step 1: Look for direct "Show transcript" button in description / actions
    let transcriptBtn = document.querySelector('[aria-label="Show transcript"], ytd-video-description-transcript-section-renderer button');
    
    // Step 2: If not visible, expand description or click "More actions" (...)
    if (!transcriptBtn || transcriptBtn.offsetParent === null) {
        // Try clicking description "more" if collapsed
        const descExpandBtn = document.querySelector('#expand, #description-inline-expander #expand');
        if (descExpandBtn && descExpandBtn.offsetParent !== null) {
            descExpandBtn.click();
            await new Promise(r => setTimeout(r, 400));
            transcriptBtn = document.querySelector('[aria-label="Show transcript"], ytd-video-description-transcript-section-renderer button');
        }
    }

    if (!transcriptBtn || transcriptBtn.offsetParent === null) {
        // Try the "..." More actions button in the actions bar
        const moreActionsButton = document.querySelector('button[aria-label="More actions"], #top-level-buttons-computed button[aria-label="More actions"]');
        if (moreActionsButton) {
            moreActionsButton.click();
            await new Promise(r => setTimeout(r, 400));
            transcriptBtn = document.querySelector('[aria-label="Show transcript"]');
        }
    }

    if (!transcriptBtn) {
        // Check once more under the description transcript renderer
        transcriptBtn = document.querySelector('ytd-video-description-transcript-section-renderer button, button[aria-label="Show transcript"]');
    }

    if (!transcriptBtn) {
        console.warn("Could not find 'Show transcript' button on this video.");
        restorePlaylist();
        return null;
    }

    // Step 3: Click the transcript button to open the panel
    transcriptBtn.click();

    // Step 4: Wait for transcript segments to load (polling up to 12 seconds)
    const transcriptText = await new Promise((resolve) => {
        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts++;
            const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #content');
            if (panel && panel.querySelector('ytd-transcript-segment-renderer')) {
                clearInterval(intervalId);
                const result = collectTranscriptSegments(panel);
                resolve(result);
                return;
            }

            if (attempts > 24) { // 12 seconds
                clearInterval(intervalId);
                console.error("Timed out waiting for transcript segments to load.");
                resolve(null);
            }
        }, 500);
    });

    restorePlaylist();
    return transcriptText;
}

function collectTranscriptSegments(panel) {
    if (!panel) return null;
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments || segments.length === 0) return null;

    const lines = [];
    segments.forEach(seg => {
        const timeEl = seg.querySelector('.segment-timestamp');
        const textEl = seg.querySelector('.segment-text');
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

