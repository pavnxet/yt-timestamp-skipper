let timestamps = [];
let titles = [];
let lastActiveIdx = -1;
let currentMode = 'normal';
let currentRawText = '';

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

function updateStateFromText(text) {
    currentRawText = text;
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

    renderMarkers();
    checkActiveChapter();
    return getState();
}

function getState() {
    return {
        text: currentRawText,
        timestamps: timestamps,
        titles: titles,
        mode: currentMode,
        activeIdx: lastActiveIdx
    };
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
        marker.style.left = pct + '%';
        progressList.appendChild(marker);
    });
}

function checkActiveChapter() {
    const video = document.querySelector('video');
    if (!video) return;
    const curr = video.currentTime;
    let activeIdx = -1;
    for (let i = timestamps.length - 1; i >= 0; i--) {
        if (curr >= timestamps[i]) { activeIdx = i; break; }
    }
    lastActiveIdx = activeIdx;
}

function loadChapters() {
    if (timestamps.length > 0) return; 
    const desc = document.querySelector('#description-inline-expander, .yt-core-attributed-string');
    if (!desc) return;
    const text = desc.textContent || '';
    const lines = text.split('\n');
    const chapterRegex = /^(\d{1,2}(?::\d{2}){1,2})\s+(.+)$/i;
    let found = [];
    lines.forEach(line => {
        const match = line.trim().match(chapterRegex);
        if (match) {
            const sec = parseToSeconds(match[1]);
            if (sec >= 0) {
                found.push(`${formatTime(sec)} ${match[2].trim()}`);
            }
        }
    });
    if (found.length > 0) {
        updateStateFromText(found.join('\n'));
    }
}

function loadFromDBOrDefault() {
    chrome.storage.local.get(['tursoUrl', 'tursoToken'], (res) => {
        let url = res.tursoUrl;
        const token = res.tursoToken;
        if (!url || !token) {
            loadChapters();
            return;
        }

        if (url.startsWith('libsql://')) {
            url = url.replace(/^libsql:\/\//i, 'https://');
        }

        const vid = new URLSearchParams(window.location.search).get("v");
        if (!vid) {
            loadChapters();
            return;
        }

        chrome.runtime.sendMessage({
            action: 'tursoQuery',
            payload: {
                url: url.trim(),
                token: token.trim(),
                sql: "SELECT timestamps FROM video_timestamps WHERE video_id = ?;",
                args: [{type: "text", value: vid}]
            }
        }, response => {
            if (response && response.success) {
                const data = response.data;
                const result = data.results && data.results[1];
                if (result && result.response && result.response.result.rows && result.response.result.rows.length > 0) {
                    const newText = result.response.result.rows[0][0].value;
                    updateStateFromText(newText);
                    console.log("YT Smart Chapters: Auto-loaded timestamps from Turso DB!");
                } else {
                    loadChapters();
                }
            } else {
                console.error("YT Smart Chapters: Auto-load from DB failed:", response);
                loadChapters();
            }
        });
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getState') {
        sendResponse(getState());
    } else if (msg.action === 'updateText') {
        sendResponse(updateStateFromText(msg.text));
    } else if (msg.action === 'updateMode') {
        currentMode = msg.mode;
        sendResponse({success: true});
    } else if (msg.action === 'seek') {
        const video = document.querySelector('video');
        if (video) video.currentTime = msg.time;
        sendResponse({success: true});
    } else if (msg.action === 'getVideoId') {
        const vid = new URLSearchParams(window.location.search).get("v");
        sendResponse({videoId: vid});
    }
});

document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const video = document.querySelector('video');
    if (!video) return;
    const curr = video.currentTime;

    if (e.key.toLowerCase() === 'x' && e.altKey) {
        const newTs = Math.floor(curr);
        const tsStr = formatTime(newTs);
        const currentLines = currentRawText.trim() ? currentRawText.trim().split('\n') : [];
        currentLines.push(`${tsStr} Custom Marker`);
        updateStateFromText(currentLines.join('\n'));
        e.preventDefault();
        return;
    }

    if (!timestamps.length) return;

    if (e.key === ']') {
        const next = timestamps.find(t => t > curr + 2.5);
        if (next !== undefined) video.currentTime = Math.max(0, next - 2);
        e.preventDefault();
    } else if (e.key === '[') {
        let prev = null;
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (timestamps[i] < curr - 2.5) { prev = timestamps[i]; break; }
        }
        if (prev !== null) video.currentTime = Math.max(0, prev - 2);
        e.preventDefault();
    }
});

setInterval(() => {
    const video = document.querySelector('video');
    if (!video) return;
    
    checkActiveChapter();
    
    if (currentMode === 'loop' && lastActiveIdx >= 0) {
        const curr = video.currentTime;
        const nextTime = (lastActiveIdx + 1 < timestamps.length) ? timestamps[lastActiveIdx+1] : video.duration;
        if (curr >= nextTime - 0.5) {
            video.currentTime = timestamps[lastActiveIdx]; 
        }
    }
}, 500);

setTimeout(loadFromDBOrDefault, 2000);

let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (document.querySelector('video') && window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        timestamps = []; 
        currentRawText = '';
        setTimeout(() => {
            renderMarkers(); 
            loadFromDBOrDefault();
        }, 1500);
    }
});
observer.observe(document.body, { childList: true, subtree: true });
