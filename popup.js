(function() {
    'use strict';

    const statusEl = document.getElementById('status');
    const textarea = document.getElementById('notes-textarea');
    const listContainer = document.getElementById('list-container');
    const loopBtn = document.getElementById('loop-btn');
    const shareBtn = document.getElementById('share-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const tursoUrlInput = document.getElementById('turso-url');
    const tursoTokenInput = document.getElementById('turso-token');
    const saveSettingsBtn = document.getElementById('save-settings');

    let timestamps = [];
    let titles = [];
    let currentVideoId = '';
    let isLooping = false;

    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

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
            item.className = 'chapter-item';
            item.innerHTML = `<span>${formatTime(sec)}</span><span style="font-weight: 500">${titles[i] || ''}</span>`;
            item.addEventListener('click', () => {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'SEEK', time: sec });
                });
            });
            listContainer.appendChild(item);
        });
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
                const title = line.replace(match[0], '').trim().replace(/^-/, '').trim();
                timestamps.push(sec);
                titles.push(title);
            }
        });

        const combined = timestamps.map((t, i) => ({ t, title: titles[i] }));
        combined.sort((a, b) => a.t - b.t);
        timestamps = combined.map(c => c.t);
        titles = combined.map(c => c.title);

        updateList();

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_CHAPTERS', timestamps, titles });
            }
        });

        if (currentVideoId) {
            const data = {};
            data['evts_local_' + currentVideoId] = textarea.value;
            chrome.storage.local.set(data);
        }
    }

    textarea.addEventListener('input', updateFromTextarea);

    loopBtn.onclick = () => {
        isLooping = !isLooping;
        loopBtn.textContent = `Loop Chapter: ${isLooping ? 'ON' : 'OFF'}`;
        loopBtn.style.background = isLooping ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255,255,255,0.4)';
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_LOOP', loop: isLooping });
        });
    };

    settingsBtn.onclick = () => {
        settingsModal.style.display = settingsModal.style.display === 'none' ? 'flex' : 'none';
    };

    saveSettingsBtn.onclick = () => {
        chrome.storage.local.set({
            'evts_turso_url': tursoUrlInput.value,
            'evts_turso_token': tursoTokenInput.value
        }, () => {
            settingsModal.style.display = 'none';
            statusEl.textContent = 'Settings saved!';
            initTurso();
        });
    };

    async function queryTurso(sql, args = []) {
        const items = await chrome.storage.local.get(['evts_turso_url', 'evts_turso_token']);
        const url = items.evts_turso_url;
        const token = items.evts_turso_token;
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
        if (!currentVideoId) return;
        const id = crypto.randomUUID();
        const contentText = textarea.value;
        const res = await queryTurso('INSERT OR REPLACE INTO notes (id, video_id, content) VALUES (?, ?, ?)', [id, currentVideoId, contentText]);
        return res ? id : null;
    }

    async function loadFromTurso(id) {
        const result = await queryTurso('SELECT content FROM notes WHERE id = ?', [id]);
        if (result && result.rows.length) {
            textarea.value = result.rows[0][0].value;
            updateFromTextarea();
        }
    }

    shareBtn.onclick = async () => {
        statusEl.textContent = 'Saving snapshot...';
        const id = await saveToTurso();
        if (id) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                const url = new URL(tabs[0].url);
                url.searchParams.set('evts_id', id);
                navigator.clipboard.writeText(url.toString());
                statusEl.textContent = 'Snapshot link copied!';
            });
        } else {
            statusEl.textContent = 'Turso failed. Check config.';
        }
    };

    function updateStatus() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (resp) => {
                if (chrome.runtime.lastError || !resp) return;

                const { currentTime, duration, videoId, isLooping: loopState } = resp;
                currentVideoId = videoId;
                isLooping = loopState;

                loopBtn.textContent = `Loop Chapter: ${isLooping ? 'ON' : 'OFF'}`;
                loopBtn.style.background = isLooping ? 'rgba(0, 255, 0, 0.25)' : 'rgba(255,255,255,0.4)';

                if (!timestamps.length) {
                    statusEl.textContent = 'No chapters found';
                    return;
                }

                let nextIdx = timestamps.findIndex(t => t > currentTime);
                if (nextIdx === -1) nextIdx = timestamps.length;
                const nextTime = nextIdx < timestamps.length ? timestamps[nextIdx] - currentTime : 0;
                statusEl.textContent = nextIdx < timestamps.length
                    ? `Next: ${formatTime(timestamps[nextIdx])} (${Math.round(nextTime)}s)`
                    : 'End of chapters';
            });
        });
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'TIMESTAMP_CAPTURED' && msg.videoId === currentVideoId) {
            textarea.value = msg.fullText;
            updateFromTextarea();
        }
    });

    async function init() {
        const items = await chrome.storage.local.get(['evts_turso_url', 'evts_turso_token']);
        tursoUrlInput.value = items.evts_turso_url || '';
        tursoTokenInput.value = items.evts_turso_token || '';

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]) return;
            const url = new URL(tabs[0].url);
            const videoId = url.searchParams.get('v');
            const evtsId = url.searchParams.get('evts_id');
            currentVideoId = videoId;

            if (videoId) {
                if (evtsId) {
                    statusEl.textContent = 'Loading shared notes...';
                    loadFromTurso(evtsId);
                } else {
                    chrome.storage.local.get('evts_local_' + videoId, (res) => {
                        const localSaved = res['evts_local_' + videoId];
                        if (localSaved) {
                            textarea.value = localSaved;
                            updateFromTextarea();
                        } else {
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'LOAD_CHAPTERS' }, (resp) => {
                                if (resp && resp.chapters && resp.chapters.length) {
                                    textarea.value = resp.chapters.map(c => `${formatTime(c.time)} ${c.title}`).join('\n');
                                    updateFromTextarea();
                                }
                            });
                        }
                    });
                }
            }
        });

        if (tursoUrlInput.value) {
            initTurso();
        }

        setInterval(updateStatus, 1000);
    }

    init();
})();
