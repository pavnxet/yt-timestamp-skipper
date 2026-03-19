// ==UserScript==
// @name Easy Video Timestamp Skipper - Smart + Auto Chapters v1.7
// @namespace http://tampermonkey.net/
<<<<<<< HEAD
// @version 1.7.0
// @description Starts minimized. Smart nearest jumps, auto-load YouTube chapters, draggable UI, Turso DB integration, custom markers.
=======
// @version 1.6.2
// @description Starts minimized. Smart nearest [ ] jumps + auto-load YouTube chapters + clickable list
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
// @author You
// @match *://www.youtube.com/*
// @grant GM_setClipboard
// @grant GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
<<<<<<< HEAD
    // === Turso DB Config ===
    const TURSO_DB_URL = "https://your-database-name.turso.io";
    const TURSO_AUTH_TOKEN = "your_auth_token_here";

    // === UI Setup ===
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', top: '20px', left: (window.innerWidth - 280) + 'px', zIndex: '999999',
=======

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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
        width: '260px', background: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', color: '#000',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
        display: 'none'
    });
    
    const titleContainer = document.createElement('div');
    Object.assign(titleContainer.style, {
        padding: '10px 14px', background: 'rgba(0,0,0,0.08)',
<<<<<<< HEAD
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    });
    
    const dragHandle = document.createElement('div');
    dragHandle.textContent = '≡ Smart Chapters';
    Object.assign(dragHandle.style, {
        cursor: 'grab', fontWeight: '600', fontSize: '14px', flexGrow: 1, userSelect: 'none'
    });
    
    const minToggle = document.createElement('div');
    minToggle.textContent = '−';
    Object.assign(minToggle.style, {
        cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', paddingLeft: '10px'
    });

    titleContainer.appendChild(dragHandle);
    titleContainer.appendChild(minToggle);
    container.appendChild(titleContainer);
=======
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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085

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
<<<<<<< HEAD
    
    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '70px', margin: '4px 0', padding: '8px',
        borderRadius: '8px', border: '1px solid rgba(0,0,0,0.18)',
        background: 'rgba(255,255,255,0.35)', fontSize: '12px', resize: 'vertical'
=======

    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '110px', margin: '8px 0 6px', padding: '8px',
        borderRadius: '10px', border: '1px solid rgba(0,0,0,0.18)',
        background: 'rgba(255,255,255,0.35)', fontSize: '13px', resize: 'vertical'
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
    });
    textarea.placeholder = 'Timestamps (Alt+X to capture)';

    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, { display: 'flex', gap: '4px', marginTop: '4px' });
    
    const copyBtn = createBtn('Copy');
    const saveBtn = createBtn('Save (DB)');
    const loadBtn = createBtn('Load (DB)');
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(loadBtn);

    const modeSelect = document.createElement('select');
    Object.assign(modeSelect.style, { width: '100%', marginTop: '8px', padding: '4px', borderRadius: '4px', fontSize: '12px', background: 'rgba(255,255,255,0.5)' });
    modeSelect.innerHTML = `<option value="normal">Mode: Normal Playback</option><option value="loop">Mode: Loop Current Chapter</option>`;

    const listContainer = document.createElement('div');
    Object.assign(listContainer.style, { marginTop: '10px' });
    const hint = document.createElement('div');
    Object.assign(hint.style, { fontSize: '11px', color: 'rgba(0,0,0,0.65)', textAlign: 'center', marginTop: '8px' });
<<<<<<< HEAD
    hint.textContent = '[ Prev nearest ] Next nearest | Alt+X: Add';

=======
    hint.textContent = '[ Prev ] Next | "u" to capture current time';

    controls.appendChild(loopBtn);
    controls.appendChild(shareBtn);
    content.appendChild(settingsModal);
    content.appendChild(controls);
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
    content.appendChild(status);
    content.appendChild(textarea);
    content.appendChild(toolbar);
    content.appendChild(modeSelect);
    content.appendChild(listContainer);
    content.appendChild(hint);
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
<<<<<<< HEAD
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', cursor: 'pointer', zIndex: '999999'
    });
    miniBtn.textContent = '⏱'; miniBtn.title = 'Open Smart Chapters';

    document.body.appendChild(container);
    document.body.appendChild(miniBtn);

    function createBtn(text) {
        const btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, { flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.5)' });
        return btn;
    }

    // === Dragging Logic ===
    let isDragging = false, dragStartX, dragStartY, containerStartX, containerStartY;
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragHandle.style.cursor = 'grabbing';
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        containerStartX = parseInt(container.style.left) || 20;
        containerStartY = parseInt(container.style.top) || 20;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        container.style.left = (containerStartX + e.clientX - dragStartX) + 'px';
        container.style.top = (containerStartY + e.clientY - dragStartY) + 'px';
    });
    document.addEventListener('mouseup', () => { 
        isDragging = false; 
        dragHandle.style.cursor = 'grab';
    });

=======
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

>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
    // === Minimize toggle ===
    let minimized = true;
    function toggleMinimize() {
        minimized = !minimized;
        container.style.display = minimized ? 'none' : 'block';
        miniBtn.style.display = minimized ? 'flex' : 'none';
<<<<<<< HEAD
        
        // update left pos on open in case window resized
        if (!minimized && !container.style.left) {
            container.style.left = (window.innerWidth - 280) + 'px';
        }
    }
    minToggle.addEventListener('click', toggleMinimize);
    miniBtn.addEventListener('click', toggleMinimize);

    // === Core Logic ===
    let timestamps = [];
    let titles = []; 
    let lastActiveIdx = -1;

=======
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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
    function parseToSeconds(str) {
        if (!str) return 0;
        const parts = str.trim().split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
        return parts[0] || 0;
    }
<<<<<<< HEAD

=======
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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
    function formatTime(sec) {
        if (!sec || isNaN(sec)) sec = 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
<<<<<<< HEAD

    function updateList() {
        listContainer.innerHTML = '';
        timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            const isActive = (i === lastActiveIdx);
            Object.assign(item.style, {
                padding: '6px 10px', background: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
                margin: '4px 0', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', display: 'flex', justifyContent: 'space-between',
                fontWeight: isActive ? 'bold' : 'normal',
                border: isActive ? '1px solid rgba(0,0,0,0.3)' : '1px solid transparent',
                color: isActive ? '#000' : 'rgba(0,0,0,0.8)',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            });
            item.innerHTML = `<span>${formatTime(sec)}</span><span style="text-align:right">${titles[i] || ''}</span>`;
            item.addEventListener('click', () => {
                const video = document.querySelector('video');
                if (video) video.currentTime = Math.max(0, sec - 2); // 2-second pre-roll offset
            });
            listContainer.appendChild(item);
        });
        renderMarkers();
    }

    function renderMarkers() {
        document.querySelectorAll('.yt-ts-custom-marker').forEach(el => el.remove());
        const video = document.querySelector('video');
        if (!video || !video.duration) return;
        const progressList = document.querySelector('.ytp-progress-list');
        if (!progressList) return;

        timestamps.forEach(ts => {
            const pct = (ts / video.duration) * 100;
            const marker = document.createElement('div');
            marker.className = 'yt-ts-custom-marker';
            Object.assign(marker.style, {
                position: 'absolute', left: pct + '%', bottom: '0',
                width: '3px', height: '100%',
                backgroundColor: '#ffd700', zIndex: '99',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
            });
            progressList.appendChild(marker);
        });
    }

=======
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

>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
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
<<<<<<< HEAD
                if (sec >= 0) {
                    timestamps.push(sec);
                    titles.push(match[2].trim());
=======
                if (sec > 0) {
                    newTimestamps.push(sec);
                    newTitles.push(match[2].trim());
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
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
<<<<<<< HEAD
            status.textContent = 'Paste or capture timestamps';
        }
    }

    textarea.addEventListener('input', () => {
        const text = textarea.value;
        timestamps = [];
        titles = [];
        const lines = text.split('\n');
        const chapterRegex = /^(\d{1,2}(?::\d{2}){1,2})\s*(.*)$/i;
        lines.forEach(line => {
             const match = line.trim().match(chapterRegex);
             if (match) {
                 const sec = parseToSeconds(match[1]);
                 if (sec >= 0) {
                     timestamps.push(sec);
                     titles.push(match[2].trim());
                 }
             } else {
                 const fallbackMatch = line.match(/\b\d{1,2}(?::\d{2}){1,2}\b/);
                 if (fallbackMatch) {
                     timestamps.push(parseToSeconds(fallbackMatch[0]));
                     titles.push("Custom");
                 }
             }
        });
        
        let combined = timestamps.map((t,i) => ({t, title: titles[i]}));
        combined.sort((a,b)=>a.t - b.t);
        combined = combined.filter((v,i,a) => i === 0 || a[i-1].t !== v.t);
        timestamps = combined.map(x=>x.t);
        titles = combined.map(x=>x.title);

        updateList();
    });
=======
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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085

    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
        const video = document.querySelector('video');
        if (!video) return;
<<<<<<< HEAD
=======

        if (e.key === 'u') {
            captureTimestamp();
            e.preventDefault();
        }

        if (!timestamps.length) return;
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
        const curr = video.currentTime;

        // Custom Alt+X Hotkey
        if (e.key.toLowerCase() === 'x' && e.altKey) {
            const newTs = Math.floor(curr);
            const tsStr = formatTime(newTs);
            const currentLines = textarea.value.trim() ? textarea.value.trim().split('\n') : [];
            currentLines.push(`${tsStr} Custom Marker`);
            textarea.value = currentLines.join('\n');
            textarea.dispatchEvent(new Event('input')); // Trigger list update
            status.textContent = `Added marker at ${tsStr}`;
            e.preventDefault();
            return;
        }

        if (!timestamps.length) return;

        if (e.key === ']') {
            const next = timestamps.find(t => t > curr + 1);
            if (next !== undefined) video.currentTime = Math.max(0, next - 2);
            e.preventDefault();
        } else if (e.key === '[') {
            let prev = null;
            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i] < curr - 3) { prev = timestamps[i]; break; }
            }
            if (prev !== null) video.currentTime = Math.max(0, prev - 2);
            e.preventDefault();
        }
    });

<<<<<<< HEAD
    // === Turso DB Logic ===
    function runTursoQuery(sql, args, callback) {
        if (!TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN === "your_auth_token_here") {
            status.textContent = 'Error: Add Turso token in script config';
            return;
        }
        status.textContent = 'Querying DB...';
        GM_xmlhttpRequest({
            method: 'POST',
            url: TURSO_DB_URL + '/v2/pipeline',
            headers: { 'Authorization': 'Bearer ' + TURSO_AUTH_TOKEN, 'Content-Type': 'application/json' },
            data: JSON.stringify({
                requests: [
                    { type: "execute", stmt: { sql: "CREATE TABLE IF NOT EXISTS video_timestamps (video_id TEXT PRIMARY KEY, timestamps TEXT);" } },
                    { type: "execute", stmt: { sql: sql, args: args } },
                    { type: "close" }
                ]
            }),
            onload: function(res) {
                try {
                    const data = JSON.parse(res.responseText);
                    const result = data.results[1]; 
                    if (result && result.response) callback(null, result.response.result);
                    else callback(data, null);
                } catch(e) { callback(e, null); }
            },
            onerror: function(err) { callback(err, null); }
        });
    }

    function getVideoId() {
        return new URLSearchParams(window.location.search).get("v");
    }

    saveBtn.addEventListener('click', () => {
        const vid = getVideoId();
        if (!vid) { status.textContent = 'No Video ID found'; return; }
        runTursoQuery("INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;", 
        [{type: "text", value: vid}, {type: "text", value: textarea.value}], 
        (err) => {
            if (err) status.textContent = 'DB Save Failed';
            else status.textContent = 'Saved to DB!';
        });
    });

    loadBtn.addEventListener('click', () => {
        const vid = getVideoId();
        if (!vid) return;
        runTursoQuery("SELECT timestamps FROM video_timestamps WHERE video_id = ?;", 
        [{type: "text", value: vid}], 
        (err, res) => {
            if (err) status.textContent = 'DB Load Failed';
            else if (res && res.cols && res.rows && res.rows.length > 0) {
                textarea.value = res.rows[0][0].value;
                textarea.dispatchEvent(new Event('input'));
                status.textContent = 'Loaded from DB!';
            } else {
                status.textContent = 'No data in DB';
            }
        });
    });

    copyBtn.addEventListener('click', () => {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(textarea.value, 'text');
            status.textContent = 'Copied to clipboard!';
        } else {
            status.textContent = 'Clipboard grant missing';
        }
    });

    // === Update Loop & Highlight ===
    setInterval(() => {
        const video = document.querySelector('video');
        if (!video) return;

        // Active Chapter Highlight
        const curr = video.currentTime;
        let activeIdx = -1;
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (curr >= timestamps[i]) { activeIdx = i; break; }
        }
        if (activeIdx !== lastActiveIdx) {
            lastActiveIdx = activeIdx;
            updateList();
        }

        // Loop Mode Logic
        if (modeSelect.value === 'loop' && activeIdx >= 0) {
            const nextTime = (activeIdx + 1 < timestamps.length) ? timestamps[activeIdx+1] : video.duration;
            if (curr >= nextTime - 0.5) {
                video.currentTime = timestamps[activeIdx]; // loop back to start of chapter
            }
        }
    }, 500);

    const observer = new MutationObserver(() => {
        if (document.querySelector('video')) {
            loadChapters();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

=======
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
>>>>>>> 91c6e6be10828a70e1313433e578886ef76af085
})();
