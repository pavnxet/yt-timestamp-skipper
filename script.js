// ==UserScript==
// @name Easy Video Timestamp Skipper - Smart + Auto Chapters v1.6
// @namespace http://tampermonkey.net/
// @version 1.6.1
// @description Starts minimized. Smart nearest [ ] jumps + auto-load YouTube chapters + clickable list
// @author You
// @match *://www.youtube.com/*
// @match *://*.vimeo.com/*
// @grant none
// ==/UserScript==
(function() {
    'use strict';
    // === UI Setup (reliable glassy style) ===
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
        width: '260px', background: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', color: '#000',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
        display: 'none' // CHANGED: Hide main box by default
    });
    const titleBar = document.createElement('div');
    Object.assign(titleBar.style, {
        padding: '10px 14px', background: 'rgba(0,0,0,0.08)',
        cursor: 'pointer', fontWeight: '600', fontSize: '14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    });
    titleBar.textContent = 'Smart Chapters −';
    const content = document.createElement('div');
    Object.assign(content.style, { padding: '0 14px 14px', maxHeight: '400px', overflowY: 'auto' });
    const status = document.createElement('div');
    Object.assign(status.style, { fontSize: '12px', color: 'rgba(0,0,0,0.7)', textAlign: 'center', margin: '6px 0' });
    status.textContent = 'Loading chapters...';
    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
        width: '100%', height: '90px', margin: '8px 0 6px', padding: '8px',
        borderRadius: '10px', border: '1px solid rgba(0,0,0,0.18)',
        background: 'rgba(255,255,255,0.35)', fontSize: '13px', resize: 'vertical'
    });
    textarea.placeholder = 'Timestamps (auto-loaded if available)';
    const listContainer = document.createElement('div');
    Object.assign(listContainer.style, { marginTop: '10px' });
    const hint = document.createElement('div');
    Object.assign(hint.style, { fontSize: '11px', color: 'rgba(0,0,0,0.65)', textAlign: 'center', marginTop: '8px' });
    hint.textContent = '[ Prev nearest ] Next nearest';
    content.appendChild(status);
    content.appendChild(textarea);
    content.appendChild(listContainer);
    content.appendChild(hint);
    container.appendChild(titleBar);
    container.appendChild(content);
    const miniBtn = document.createElement('div');
    Object.assign(miniBtn.style, {
        position: 'fixed', top: '20px', right: '20px', width: '50px', height: '50px',
        background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        display: 'flex', // CHANGED: Show mini button by default
        alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', cursor: 'pointer', zIndex: '999999'
    });
    miniBtn.textContent = '⏱'; miniBtn.title = 'Open Smart Chapters';
    document.body.appendChild(container);
    document.body.appendChild(miniBtn);
    // === Minimize toggle ===
    let minimized = true; // CHANGED: Set logic to true by default
    function toggleMinimize() {
        minimized = !minimized;
        container.style.display = minimized ? 'none' : 'block';
        miniBtn.style.display = minimized ? 'flex' : 'none';
        titleBar.textContent = minimized ? 'Chapters +' : 'Smart Chapters −';
    }
    titleBar.addEventListener('click', toggleMinimize);
    miniBtn.addEventListener('click', toggleMinimize);
    // === Core Logic ===
    let timestamps = []; // sorted seconds
    let titles = []; // optional chapter names
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
                padding: '6px 10px', background: 'rgba(0,0,0,0.05)',
                margin: '4px 0', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', display: 'flex', justifyContent: 'space-between'
            });
            item.innerHTML = `<span>${formatTime(sec)}</span><span>${titles[i] || ''}</span>`;
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
        if (!video || !timestamps.length) {
            status.textContent = timestamps.length ? 'Ready' : 'No chapters';
            return;
        }
        const curr = video.currentTime;
        let nextIdx = timestamps.findIndex(t => t > curr);
        if (nextIdx === -1) nextIdx = timestamps.length;
        const nextTime = nextIdx < timestamps.length ? timestamps[nextIdx] - curr : 0;
        status.textContent = nextIdx < timestamps.length
            ? `Next: ${formatTime(timestamps[nextIdx])} (${Math.round(nextTime)}s)`
            : 'At end';
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
                if (sec > 0) {
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
            status.textContent = 'Paste or edit timestamps';
        }
    }
    textarea.addEventListener('input', () => {
        const text = textarea.value;
        const matches = text.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g) || [];
        timestamps = [...new Set(matches.map(parseToSeconds).filter(t => t > 0))].sort((a,b)=>a-b);
        titles = [];
        updateList();
    });
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
        const video = document.querySelector('video');
        if (!video || !timestamps.length) return;
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
    const observer = new MutationObserver(() => {
        if (document.querySelector('video')) {
            loadChapters();
            updateStatus();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(updateStatus, 5000);
})();
