let timestamps = [];
let titles = [];
let lastActiveIdx = -1;
let currentMode = 'normal';
let currentRawText = '';
let shortcuts = { next: 'BracketRight', prev: 'BracketLeft', add: 'KeyX', addAlt: true };

// --- Mini Widget UI ---
let miniWidget = null;
function createMiniWidget() {
    if (miniWidget) return;
    miniWidget = document.createElement('div');
    miniWidget.id = 'yt-skipper-mini-widget';
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

function updateMiniWidget() {
    if (!miniWidget) createMiniWidget();
    const titleEl = document.getElementById('mini-current-title');
    if (lastActiveIdx >= 0) {
        titleEl.textContent = titles[lastActiveIdx] || formatTime(timestamps[lastActiveIdx]);
        miniWidget.style.opacity = '1';
    } else {
        titleEl.textContent = 'Ready';
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
    dashboard.classList.toggle('yt-sk-visible');
    if (dashboard.classList.contains('yt-sk-visible') && window.refreshDashboard) {
        window.refreshDashboard();
    }
}

function createDashboard() {
    if (dashboard) return;
    dashboard = document.createElement('div');
    dashboard.id = 'yt-skipper-dashboard';
    dashboard.innerHTML = `
        <div class="yt-sk-header">
            <h2>Skipper v2.0</h2>
            <div class="yt-sk-status" id="yt-sk-status">Active</div>
        </div>
        <div class="yt-sk-textarea-container">
            <div id="yt-sk-textarea-highlights" class="yt-sk-textarea-layer"></div>
            <textarea id="yt-sk-textarea" class="yt-sk-textarea-layer" spellcheck="false" placeholder="Enter timestamps..."></textarea>
        </div>
        <div class="yt-sk-btn-group">
            <button id="yt-sk-btn-copy">Copy</button>
            <button id="yt-sk-btn-save">Save DB</button>
            <button id="yt-sk-btn-load">Load DB</button>
        </div>
        <select id="yt-sk-mode">
            <option value="normal">Mode: Normal</option>
            <option value="loop">Mode: Loop Chapter</option>
        </select>
        <div class="yt-sk-list" id="yt-sk-list"></div>
        
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

        <div class="yt-sk-settings-btn" id="yt-sk-toggle-settings">Configure Turso DB</div>
        <div id="yt-sk-settings-panel">
            <input type="text" id="yt-sk-turso-url" class="yt-sk-turso-input" placeholder="Turso URL">
            <input type="password" id="yt-sk-turso-token" class="yt-sk-turso-input" placeholder="Auth Token">
            <button id="yt-sk-btn-save-settings">Verify & Save</button>
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
    const settingsPanel = document.getElementById('yt-sk-settings-panel');
    const btnToggleSettings = document.getElementById('yt-sk-toggle-settings');
    const scNext = document.getElementById('yt-sk-sc-next');
    const scPrev = document.getElementById('yt-sk-sc-prev');
    const scAdd = document.getElementById('yt-sk-sc-add');

    chrome.storage.local.get(['tursoUrl', 'tursoToken', 'shortcuts'], (res) => {
        if (res.tursoUrl) urlInput.value = res.tursoUrl;
        if (res.tursoToken) tokenInput.value = res.tursoToken;
        if (res.shortcuts) {
            shortcuts = res.shortcuts;
            updateShortcutUI();
        }
    });

    btnToggleSettings.onclick = () => settingsPanel.classList.toggle('yt-sk-active');

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
        statusObj.timeout = setTimeout(() => { statusObj.textContent = 'Active'; statusObj.style.color = 'rgba(255,255,255,0.6)'; }, 3000);
    }

    document.getElementById('yt-sk-btn-copy').onclick = () => {
        navigator.clipboard.writeText(textarea.value).then(() => setStatus('COPIED'));
        const v = document.querySelector('video');
        if (v) v.focus();
    };

    document.getElementById('yt-sk-btn-save-settings').onclick = () => {
        let url = urlInput.value.trim().replace(/^libsql:\/\//i, 'https://');
        const token = tokenInput.value.trim();
        if (!url || !token) return setStatus('MISSING INFO', '#ff4b4b');
        setStatus('VALIDATING...');
        chrome.runtime.sendMessage({ action: 'tursoQuery', payload: { url, token, sql: "SELECT 1;", args: [] } }, res => {
            if (res && res.success) {
                chrome.storage.local.set({ tursoUrl: url, tursoToken: token }, () => {
                    setStatus('SAVED DB', '#00e676'); settingsPanel.classList.remove('yt-sk-active');
                });
            } else setStatus('FAILED', '#ff4b4b');
        });
    };

    document.getElementById('yt-sk-btn-save').onclick = () => {
        const vid = new URLSearchParams(window.location.search).get("v");
        if (!vid) return setStatus('NO VIDEO', '#ff4b4b');
        chrome.storage.local.get(['tursoUrl', 'tursoToken'], res => {
            if (!res.tursoUrl) {
                setStatus('NO DB URL', '#ffb74d');
                settingsPanel.classList.add('yt-sk-active');
                return;
            }
            setStatus('SAVING...');
            chrome.runtime.sendMessage({ action: 'tursoQuery', payload: {
                url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'), token: res.tursoToken,
                sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                args: [{type: "text", value: vid}, {type: "text", value: currentRawText}]
            }}, r => {
                if(r && r.success) setStatus('SAVED', '#00e676'); else setStatus('ERROR', '#ff4b4b');
                if (r && !r.success) console.error(r);
            });
        });
    };

    document.getElementById('yt-sk-btn-load').onclick = () => {
        const status = loadFromDBOrDefault(true);
        if (status === 'fetching') setStatus('LOADING...');
    };

    window.refreshDashboard = function() {
        if (!dashboard) return;
        if (document.activeElement !== textarea) {
            textarea.value = currentRawText;
            applyHighlights(currentRawText);
        }
        
        list.innerHTML = '';
        if (!timestamps.length) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.5);font-size:10px;">No Chapters</div>';
            return;
        }
        timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            item.className = 'yt-sk-item' + (i === lastActiveIdx ? ' yt-sk-active' : '');
            item.innerHTML = `<span>${formatTime(sec)}</span><span style="opacity:0.7;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${titles[i] || ''}</span>`;
            item.onclick = () => { const v = document.querySelector('video'); if (v) v.currentTime = Math.max(0, sec - 2); };
            list.appendChild(item);
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

function updateStateFromText(text) {
    if (!text) text = '';
    currentRawText = text;
    timestamps = []; titles = [];
    text.split('\n').filter(l => l.trim()).forEach(line => {
        const match = line.match(/^(\d{1,2}(?::\d{2}){1,2})\s*(.*)$/i);
        if (match) {
            timestamps.push(parseToSeconds(match[1]));
            titles.push(match[2].trim() || 'Custom');
        } else {
             const fb = line.match(/\b\d{1,2}(?::\d{2}){1,2}\b/);
             if (fb) {
                 timestamps.push(parseToSeconds(fb[0]));
                 titles.push("Custom");
             }
        }
    });
    let combined = timestamps.map((t,i) => ({t, title: titles[i]})).sort((a,b)=>a.t-b.t);
    combined = combined.filter((v,i,a) => i === 0 || a[i-1].t !== v.t);
    timestamps = combined.map(x=>x.t); titles = combined.map(x=>x.title);
    renderMarkers();
    if (window.refreshDashboard) window.refreshDashboard();
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
    chrome.storage.local.get(['tursoUrl', 'tursoToken'], (res) => {
        if (!res.tursoUrl || !res.tursoToken) {
            if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB URL';
            return loadFromDescription();
        }
        const vid = new URLSearchParams(window.location.search).get("v");
        if (!vid) return loadFromDescription();

        chrome.runtime.sendMessage({
            action: 'tursoQuery',
            payload: {
                url: res.tursoUrl.replace(/^libsql:\/\//i, 'https://'),
                token: res.tursoToken,
                sql: "SELECT timestamps FROM video_timestamps WHERE video_id = ?;",
                args: [{type: "text", value: vid}]
            }
        }, response => {
            if (response && response.success && response.data.results[1].response.result.rows.length > 0) {
                updateStateFromText(response.data.results[1].response.result.rows[0][0].value);
                if (forceShowToast && dashboard) {
                    const st = document.getElementById('yt-sk-status');
                    st.textContent = 'LOADED'; st.style.color = '#00e676';
                }
            } else {
                if (forceShowToast && dashboard) document.getElementById('yt-sk-status').textContent = 'NO DB DATA';
                loadFromDescription();
            }
        });
    });
    return 'fetching';
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

let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (document.querySelector('video') && window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        timestamps = []; currentRawText = '';
        setTimeout(() => { renderMarkers(); loadFromDBOrDefault(); }, 1500);
    }
});
observer.observe(document.body, { childList: true, subtree: true });
createMiniWidget();
setTimeout(loadFromDBOrDefault, 2000);
