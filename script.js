// ==UserScript==
// @name Easy Video Timestamp Skipper - Smart + Auto Chapters v1.6
// @namespace http://tampermonkey.net/
// @version 1.6.2
// @description Starts minimized. Smart nearest [ ] jumps + auto-load YouTube chapters + clickable list
// @author You
// @match *://www.youtube.com/*
// @match *://*.vimeo.com/*
// @grant none
// ==/UserScript==
(function() {
    'use strict';

    console.log('[EVTS] Script loaded');

    // === UI Setup (reliable glassy style) ===
    const savedPos = JSON.parse(localStorage.getItem('evts_pos') || '{}');
    const savedMiniPos = JSON.parse(localStorage.getItem('evts_mini_pos') || '{}');

    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed',
        top: savedPos.top || '20px',
        left: (savedPos.left && savedPos.left !== 'auto') ? savedPos.left : '',
        right: (savedPos.right && savedPos.right !== 'auto') ? savedPos.right : (savedPos.left && savedPos.left !== 'auto' ? 'auto' : '20px'),
        zIndex: '999999',
        width: '260px', background: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', color: '#000',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
        display: 'none'
    });
    const titleBar = document.createElement('div');
    Object.assign(titleBar.style, {
        padding: '10px 14px', background: 'rgba(0,0,0,0.08)',
        cursor: 'pointer', fontWeight: '600', fontSize: '14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        userSelect: 'none'
    });
    titleBar.innerHTML = '<span>Smart Chapters -</span>';
    const settingsBtn = document.createElement('span');
    settingsBtn.innerHTML = 'Settings';
    settingsBtn.style.cursor = 'pointer';
    settingsBtn.style.fontSize = '16px';
    settingsBtn.title = 'Turso Settings';
    titleBar.appendChild(settingsBtn);

    const content = document.createElement('div');
    Object.assign(content.style, { padding: '0 14px 14px', maxHeight: '400px', overflowY: 'auto' });

    // === Settings Modal ===
    const settingsModal = document.createElement('div');
    Object.assign(settingsModal.style, {
        display: 'none', flexDirection: 'column', gap: '8px', padding: '12px',
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', marginTop: '10px',
        border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    });
    const tursoUrlInput = document.createElement('input');
    tursoUrlInput.placeholder = 'Turso HTTP URL';
    tursoUrlInput.value = localStorage.getItem('evts_turso_url') || '';
    Object.assign(tursoUrlInput.style, { padding: '6px', borderRadius: '6px', border: '1px solid #ccc' });
    const tursoTokenInput = document.createElement('input');
    tursoTokenInput.placeholder = 'Turso Auth Token';
    tursoTokenInput.type = 'password';
    tursoTokenInput.value = localStorage.getItem('evts_turso_token') || '';
    Object.assign(tursoTokenInput.style, { padding: '6px', borderRadius: '6px', border: '1px solid #ccc' });
    const saveSettingsBtn = document.createElement('button');
    saveSettingsBtn.textContent = 'Save Turso Config';
    Object.assign(saveSettingsBtn.style, {
        padding: '8px', borderRadius: '6px', border: 'none',
        background: '#007AFF', color: '#fff', cursor: 'pointer'
    });
    saveSettingsBtn.onclick = () => {
        localStorage.setItem('evts_turso_url', tursoUrlInput.value);
        localStorage.setItem('evts_turso_token', tursoTokenInput.value);
        settingsModal.style.display = 'none';
        status.textContent = 'Settings saved!';
    };
    settingsModal.appendChild(tursoUrlInput);
    settingsModal.appendChild(tursoTokenInput);
    settingsModal.appendChild(saveSettingsBtn);
    settingsBtn.onclick = (e) => {
        e.stopPropagation();
        settingsModal.style.display = settingsModal.style.display === 'none' ? 'flex' : 'none';
    };

    const controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'center' });

    const loopBtn = document.createElement('button');
    loopBtn.textContent = 'Loop Chapter: OFF';
    Object.assign(loopBtn.style, {
        flex: '1', padding: '8px', fontSize: '11px', borderRadius: '10px',
        border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', fontWeight: '500'
    });
    let isLooping = false;
    loopBtn.onclick = () => {
        isLooping = !isLooping;
        loopBtn.textContent = `Loop Chapter: ${isLooping ? 'ON' : 'OFF'}`;
        loopBtn.style.background = isLooping ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255,255,255,0.4)';
    };

    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share Link';
    Object.assign(shareBtn.style, {
        flex: '1', padding: '8px', fontSize: '11px', borderRadius: '10px',
        border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', fontWeight: '500'
    });

    const status = document.createElement('div');
    Object.assign(status.style, { fontSize: '12px', color: 'rgba(0,0,0,0.7)', textAlign: 'center', margin: '6px 0' });
    status.textContent = 'Loading chapters...';

    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '110px', margin: '8px 0 6px', padding: '8px',
        borderRadius: '10px', border: '1px solid rgba(0,0,0,0.18)',
        background: 'rgba(255,255,255,0.35)', fontSize: '13px', resize: 'vertical'
    });
    textarea.placeholder = 'Timestamps (auto-loaded if available)';
    const listContainer = document.createElement('div');
    Object.assign(listContainer.style, { marginTop: '10px' });
    const hint = document.createElement('div');
    Object.assign(hint.style, { fontSize: '11px', color: 'rgba(0,0,0,0.65)', textAlign: 'center', marginTop: '8px' });
    hint.textContent = '[ Prev ] Next | "u" to capture current time';

    controls.appendChild(loopBtn);
    controls.appendChild(shareBtn);
    content.appendChild(settingsModal);
    content.appendChild(controls);
    content.appendChild(status);
    content.appendChild(textarea);
    content.appendChild(listContainer);
    content.appendChild(hint);
    container.appendChild(titleBar);
    container.appendChild(content);
    const miniBtn = document.createElement('div');
    Object.assign(miniBtn.style, {
        position: 'fixed',
        top: savedMiniPos.top || '20px',
        left: (savedMiniPos.left && savedMiniPos.left !== 'auto') ? savedMiniPos.left : '',
        right: (savedMiniPos.right && savedMiniPos.right !== 'auto') ? savedMiniPos.right : (savedMiniPos.left && savedMiniPos.left !== 'auto' ? 'auto' : '20px'),
        width: '50px', height: '50px',
        background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', cursor: 'pointer', zIndex: '999999',
        userSelect: 'none'
    });
    miniBtn.textContent = 'Open'; miniBtn.title = 'Open Smart Chapters';

    function injectUI() {
        if (!document.body || document.getElementById('evts-container')) return;
        container.id = 'evts-container';
        miniBtn.id = 'evts-mini-btn';
        document.body.appendChild(container);
        document.body.appendChild(miniBtn);
        console.log('[EVTS] UI Injected');
    }

    // === Minimize toggle ===
    let minimized = true;
    function toggleMinimize() {
        minimized = !minimized;
        container.style.display = minimized ? 'none' : 'block';
        miniBtn.style.display = minimized ? 'flex' : 'none';
        titleBar.querySelector('span').textContent = minimized ? 'Chapters +' : 'Smart Chapters -';
    }

    titleBar.addEventListener('click', (e) => {
        if (isDragging) return;
        toggleMinimize();
    });
    miniBtn.addEventListener('click', (e) => {
        if (isDragging) return;
        toggleMinimize();
    });

    // === Draggability ===
    let isDragging = false;
    function makeDraggable(el, handle, storageKey) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            isDragging = false;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            isDragging = true;
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            if (isDragging) {
                localStorage.setItem(storageKey, JSON.stringify({
                    top: el.style.top,
                    left: el.style.left
                }));
            }
            setTimeout(() => { isDragging = false; }, 100);
        }
    }
    makeDraggable(container, titleBar, 'evts_pos');
    makeDraggable(miniBtn, miniBtn, 'evts_mini_pos');

    // === Turso Storage Logic ===
    async function queryTurso(sql, args = []) {
        const url = localStorage.getItem('evts_turso_url');
        const token = localStorage.getItem('evts_turso_token');
        if (!url || !token) return null;

        try {
            const response = await fetch(`${url}/v2/pipeline`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        { type: 'execute', stmt: { sql, args } },
                        { type: 'close' }
                    ]
                })
            });
            const data = await response.json();
            return data.results[0].response.result;
        } catch (e) {
            console.error('Turso Error:', e);
            return null;
        }
    }

    async function initTurso() {
        await queryTurso('CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, video_id TEXT, content TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    }

    async function saveToTurso() {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;
        const id = crypto.randomUUID();
        const contentText = textarea.value;
        await queryTurso('INSERT OR REPLACE INTO notes (id, video_id, content) VALUES (?, ?, ?)', [id, videoId, contentText]);
        return id;
    }

    async function loadFromTurso(id) {
        const result = await queryTurso('SELECT content FROM notes WHERE id = ?', [id]);
        if (result && result.rows.length) {
            textarea.value = result.rows[0][0].value;
            updateFromTextarea();
        }
    }

    shareBtn.onclick = async () => {
        status.textContent = 'Saving snapshot...';
        const id = await saveToTurso();
        if (id) {
            const shareUrl = new URL(window.location.href);
            shareUrl.searchParams.set('evts_id', id);
            navigator.clipboard.writeText(shareUrl.toString());
            status.textContent = 'Snapshot link copied!';
        } else {
            status.textContent = 'Turso failed. Check config.';
        }
    };

    // === Core Logic ===
    let timestamps = [];
    let titles = [];
    function parseToSeconds(str) {
        if (!str) return 0;
        const parts = str.trim().split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
        return parts[0] || 0;
    }
    function updateList() {
        listContainer.innerHTML = '';
        timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                padding: '8px 12px', background: 'rgba(0,0,0,0.06)',
                margin: '6px 0', borderRadius: '10px', cursor: 'pointer',
                fontSize: '13px', display: 'flex', justifyContent: 'space-between',
                transition: 'background 0.2s'
            });
            item.onmouseover = () => item.style.background = 'rgba(0,0,0,0.12)';
            item.onmouseout = () => item.style.background = 'rgba(0,0,0,0.06)';
            item.innerHTML = `<span>${formatTime(sec)}</span><span style="font-weight: 500">${titles[i] || ''}</span>`;
            item.addEventListener('click', () => {
                const video = document.querySelector('video');
                if (video) video.currentTime = sec;
            });
            listContainer.appendChild(item);
        });
    }
    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    function updateStatus() {
        const video = document.querySelector('video');
        if (!video) return;

        const curr = video.currentTime;

        if (isLooping && timestamps.length) {
            let nextIdx = timestamps.findIndex(t => t > curr);
            let prevIdx = -1;
            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i] <= curr) { prevIdx = i; break; }
            }

            if (prevIdx !== -1) {
                const start = timestamps[prevIdx];
                const end = nextIdx !== -1 ? timestamps[nextIdx] : video.duration;
                if (curr >= end - 0.5) {
                    video.currentTime = start;
                }
            }
        }

        if (!timestamps.length) {
            status.textContent = 'No chapters found';
            return;
        }

        let nextIdx = timestamps.findIndex(t => t > curr);
        if (nextIdx === -1) nextIdx = timestamps.length;
        const nextTime = nextIdx < timestamps.length ? timestamps[nextIdx] - curr : 0;
        status.textContent = nextIdx < timestamps.length
            ? `Next: ${formatTime(timestamps[nextIdx])} (${Math.round(nextTime)}s)`
            : 'End of chapters';
    }

    function loadChapters() {
        console.log('[EVTS] Attempting to load chapters');
        const desc = document.querySelector('#description-inline-expander, .yt-core-attributed-string');
        if (!desc) {
            console.log('[EVTS] Description not found yet');
            return;
        }
        const text = desc.textContent || '';
        const lines = text.split('\n');
        const chapterRegex = /^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/i;
        let newTimestamps = [];
        let newTitles = [];
        lines.forEach(line => {
            const match = line.trim().match(chapterRegex);
            if (match) {
                const sec = parseToSeconds(match[1]);
                if (sec > 0) {
                    newTimestamps.push(sec);
                    newTitles.push(match[2].trim());
                }
            }
        });
        if (newTimestamps.length) {
            timestamps = newTimestamps;
            titles = newTitles;
            timestamps = [...new Set(timestamps)].sort((a,b)=>a-b);
            textarea.value = timestamps.map((t,i) => `${formatTime(t)} ${titles[i] || ''}`).join('\n');
            status.textContent = `Loaded ${timestamps.length} chapters!`;
            updateList();
            console.log('[EVTS] Chapters loaded:', timestamps.length);
        } else {
            console.log('[EVTS] No chapters found in description');
            status.textContent = 'Paste/Capture timestamps below';
        }
    }

    function updateFromTextarea() {
        const text = textarea.value;
        const lines = text.split('\n');
        const chapterRegex = /(\d{1,2}(?::\d{2}){1,2})/;

        timestamps = [];
        titles = [];

        lines.forEach(line => {
            const match = line.match(chapterRegex);
            if (match) {
                const sec = parseToSeconds(match[0]);
                const title = line.replace(match[0], '').trim();
                timestamps.push(sec);
                titles.push(title);
            }
        });

        const combined = timestamps.map((t, i) => ({ t, title: titles[i] }));
        combined.sort((a, b) => a.t - b.t);
        timestamps = combined.map(c => c.t);
        titles = combined.map(c => c.title);

        updateList();

        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            localStorage.setItem('evts_local_' + videoId, textarea.value);
        }
    }

    textarea.addEventListener('input', updateFromTextarea);

    function captureTimestamp() {
        const video = document.querySelector('video');
        if (!video) return;
        const curr = video.currentTime;
        const formatted = formatTime(curr);
        const newLine = `${formatted} - `;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        textarea.value = text.substring(0, start) + newLine + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + newLine.length;

        updateFromTextarea();
    }

    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
        const video = document.querySelector('video');
        if (!video) return;

        if (e.key === 'u') {
            captureTimestamp();
            e.preventDefault();
        }

        if (!timestamps.length) return;
        const curr = video.currentTime;
        if (e.key === ']') {
            const next = timestamps.find(t => t > curr);
            if (next !== undefined) video.currentTime = next;
            e.preventDefault();
        } else if (e.key === '[') {
            let prev = null;
            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i] < curr) { prev = timestamps[i]; break; }
            }
            if (prev !== null) video.currentTime = prev;
            e.preventDefault();
        }
    });

    let lastVideoId = '';
    async function init() {
        injectUI();
        const urlParams = new URLSearchParams(window.location.search);
        const evtsId = urlParams.get('evts_id');
        const videoId = urlParams.get('v');

        if (videoId && videoId !== lastVideoId) {
            console.log('[EVTS] New video detected:', videoId);
            lastVideoId = videoId;
            timestamps = [];
            titles = [];
            textarea.value = '';

            if (evtsId) {
                status.textContent = 'Loading shared notes...';
                await loadFromTurso(evtsId);
            } else {
                const localSaved = localStorage.getItem('evts_local_' + videoId);
                if (localSaved) {
                    textarea.value = localSaved;
                    updateFromTextarea();
                } else {
                    setTimeout(loadChapters, 1500);
                }
            }
        }

        if (localStorage.getItem('evts_turso_url')) {
            initTurso();
        }
    }

    // Handle YouTube SPA Navigation
    window.addEventListener('yt-navigate-finish', () => {
        console.log('[EVTS] yt-navigate-finish');
        init();
    });

    const observer = new MutationObserver(() => {
        if (document.querySelector('video')) {
            injectUI();
            init();
        }
    });

    function start() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            init();
        } else {
            setTimeout(start, 50);
        }
    }
    start();

    setInterval(updateStatus, 1000);
})();
