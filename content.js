(function() {
    'use strict';

    console.log('[EVTS] Content script loaded');

    let isLooping = false;
    let timestamps = [];
    let titles = [];
    let lastVideoId = '';

    function parseToSeconds(str) {
        if (!str) return 0;
        const parts = str.trim().split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
        return parts[0] || 0;
    }

    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function loadChapters() {
        console.log('[EVTS] Attempting to load chapters');
        const desc = document.querySelector('#description-inline-expander, .yt-core-attributed-string');
        if (!desc) {
            console.log('[EVTS] Description not found yet');
            return [];
        }

        const text = desc.textContent || '';
        const lines = text.split('\n');
        const chapterRegex = /^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/i;
        let newChapters = [];

        lines.forEach(line => {
            const match = line.trim().match(chapterRegex);
            if (match) {
                const sec = parseToSeconds(match[1]);
                if (sec > 0) {
                    newChapters.push({ time: sec, title: match[2].trim() });
                }
            }
        });

        if (newChapters.length) {
            newChapters.sort((a, b) => a.time - b.time);
            timestamps = newChapters.map(c => c.time);
            titles = newChapters.map(c => c.title);
            console.log('[EVTS] Chapters loaded:', newChapters.length);
        }
        return newChapters;
    }

    function updateLooping() {
        const video = document.querySelector('video');
        if (!video || !isLooping || !timestamps.length) return;

        const curr = video.currentTime;
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

    async function captureTimestamp() {
        const video = document.querySelector('video');
        if (!video) return;
        const curr = video.currentTime;
        const formatted = formatTime(curr);
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        const storageKey = 'evts_local_' + videoId;
        const res = await chrome.storage.local.get(storageKey);
        const currentText = res[storageKey] || '';
        const newLine = `${formatted} - `;
        const updatedText = currentText + (currentText.endsWith('\n') || currentText === '' ? '' : '\n') + newLine;

        const data = {};
        data[storageKey] = updatedText;
        await chrome.storage.local.set(data);
        console.log('[EVTS] Timestamp captured to storage');

        // Notify popup if open
        chrome.runtime.sendMessage({
            type: 'TIMESTAMP_CAPTURED',
            formatted,
            videoId,
            fullText: updatedText
        }).catch(() => {}); // Ignore error if popup closed
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

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        const video = document.querySelector('video');
        if (!video) return;

        if (msg.type === 'GET_STATUS') {
            sendResponse({
                currentTime: video.currentTime,
                duration: video.duration,
                videoId: new URLSearchParams(window.location.search).get('v'),
                isLooping
            });
        } else if (msg.type === 'SEEK') {
            video.currentTime = msg.time;
        } else if (msg.type === 'SET_LOOP') {
            isLooping = msg.loop;
        } else if (msg.type === 'LOAD_CHAPTERS') {
            const chapters = loadChapters();
            sendResponse({ chapters });
        } else if (msg.type === 'SET_CHAPTERS') {
            timestamps = msg.timestamps;
            titles = msg.titles;
        }
    });

    setInterval(updateLooping, 1000);

    function init() {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId && videoId !== lastVideoId) {
            lastVideoId = videoId;
            timestamps = [];
            titles = [];
            setTimeout(loadChapters, 2000);
        }
    }

    window.addEventListener('yt-navigate-finish', () => {
        console.log('[EVTS] yt-navigate-finish');
        init();
    });

    const observer = new MutationObserver(() => {
        if (document.querySelector('video')) {
            init();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    init();
})();
