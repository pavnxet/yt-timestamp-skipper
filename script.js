// ==UserScript==
// @name Easy Video Timestamp Skipper - Smart + Auto Chapters v1.7
// @namespace http://tampermonkey.net/
// @version 1.7.0
// @description Starts minimized. Smart nearest jumps, auto-load YouTube chapters, draggable UI, Turso DB integration, custom markers.
// @author You
// @match *://www.youtube.com/*
// @grant GM_setClipboard
// @grant GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    // === Turso DB Config ===
    const TURSO_DB_URL = "https://your-database-name.turso.io";
    const TURSO_AUTH_TOKEN = "your_auth_token_here";

    // === UI Setup ===
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', top: '20px', left: (window.innerWidth - 280) + 'px', zIndex: '999999',
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

    const content = document.createElement('div');
    Object.assign(content.style, { padding: '0 14px 14px', maxHeight: '400px', overflowY: 'auto' });
    const status = document.createElement('div');
    Object.assign(status.style, { fontSize: '12px', color: 'rgba(0,0,0,0.7)', textAlign: 'center', margin: '6px 0' });
    status.textContent = 'Loading chapters...';
    
    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '70px', margin: '4px 0', padding: '8px',
        borderRadius: '8px', border: '1px solid rgba(0,0,0,0.18)',
        background: 'rgba(255,255,255,0.35)', fontSize: '12px', resize: 'vertical'
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
    hint.textContent = '[ Prev nearest ] Next nearest | Alt+X: Add';

    content.appendChild(status);
    content.appendChild(textarea);
    content.appendChild(toolbar);
    content.appendChild(modeSelect);
    content.appendChild(listContainer);
    content.appendChild(hint);
    container.appendChild(content);

    const miniBtn = document.createElement('div');
    Object.assign(miniBtn.style, {
        position: 'fixed', top: '20px', right: '20px', width: '50px', height: '50px',
        background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
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

    // === Minimize toggle ===
    let minimized = true;
    function toggleMinimize() {
        minimized = !minimized;
        container.style.display = minimized ? 'none' : 'block';
        miniBtn.style.display = minimized ? 'flex' : 'none';
        
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

    function parseToSeconds(str) {
        if (!str) return 0;
        const parts = str.trim().split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
        return parts[0] || 0;
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) sec = 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

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

    function loadChapters() {
        const desc = document.querySelector('#description-inline-expander, .yt-core-attributed-string');
        if (!desc) return;
        const text = desc.textContent || '';
        const lines = text.split('\n');
        const chapterRegex = /^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/i;
        timestamps = [];
        titles = [];
        lines.forEach(line => {
            const match = line.trim().match(chapterRegex);
            if (match) {
                const sec = parseToSeconds(match[1]);
                if (sec >= 0) {
                    timestamps.push(sec);
                    titles.push(match[2].trim());
                }
            }
        });
        if (timestamps.length) {
            timestamps = [...new Set(timestamps)].sort((a,b)=>a-b);
            textarea.value = timestamps.map((t,i) => `${formatTime(t)} ${titles[i] || ''}`).join('\n');
            status.textContent = `Auto-loaded ${timestamps.length} chapters!`;
            updateList();
        } else {
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

    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
        const video = document.querySelector('video');
        if (!video) return;
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

})();
