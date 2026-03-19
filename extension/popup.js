document.addEventListener('DOMContentLoaded', () => {
    const statusObj = document.getElementById('status');
    const textarea = document.getElementById('textarea');
    const highlights = document.getElementById('textarea-highlights');
    const list = document.getElementById('list');
    const modeSelect = document.getElementById('mode');
    const urlInput = document.getElementById('turso-url');
    const tokenInput = document.getElementById('turso-token');
    const settingsPanel = document.getElementById('settings-panel');
    const btnToggleSettings = document.getElementById('btn-toggle-settings');
    
    // --- Syntax Highlighting Logic ---
    function applyHighlights(text) {
        let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const chapterRegex = /\b\d{1,2}(?::\d{2}){1,2}\b/g;
        escaped = escaped.replace(chapterRegex, '<span class="ts-highlight">$&</span>');
        
        // Browsers collapse trailing newlines, so we add a zero-width space or break
        if (text.endsWith('\n')) {
            escaped += '<br>';
        }
        highlights.innerHTML = escaped;
    }

    function updateTextarea(text) {
        textarea.value = text;
        applyHighlights(text);
    }

    textarea.addEventListener('input', () => {
        applyHighlights(textarea.value);
        sendMessageToContent({ action: 'updateText', text: textarea.value }, res => {
            if (res) {
                currentTimestampData = res;
                renderList(res);
            }
        });
    });

    textarea.addEventListener('scroll', () => {
        highlights.scrollTop = textarea.scrollTop;
        highlights.scrollLeft = textarea.scrollLeft;
    });
    // ----------------------------------

    btnToggleSettings.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
    });

    chrome.storage.local.get(['tursoUrl', 'tursoToken'], (res) => {
        if (res.tursoUrl) urlInput.value = res.tursoUrl;
        if (res.tursoToken) tokenInput.value = res.tursoToken;
    });

    function setStatus(msg, color = 'var(--accent)') {
        statusObj.textContent = msg;
        statusObj.style.color = color;
        clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            statusObj.textContent = 'Active 🟢';
            statusObj.style.color = 'var(--text-muted)';
        }, 3000);
    }

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        let url = urlInput.value.trim();
        const token = tokenInput.value.trim();
        
        if (url.startsWith('libsql://')) {
            url = url.replace(/^libsql:\/\//i, 'https://');
        }
        
        if (!url || !token) {
            setStatus('Needs URL & Token', '#ff4b4b');
            return;
        }

        setStatus('Validating...', 'var(--accent)');

        chrome.runtime.sendMessage({
            action: 'tursoQuery',
            payload: {
                url: url,
                token: token,
                sql: "SELECT 1;",
                args: []
            }
        }, response => {
            if (response && response.success) {
                chrome.storage.local.set({ tursoUrl: url, tursoToken: token }, () => {
                    setStatus('Connected!', '#00e676');
                    setTimeout(() => settingsPanel.classList.remove('open'), 1000);
                });
            } else {
                setStatus('Failed Auth', '#ff4b4b');
            }
        });
    });

    let currentTimestampData = { timestamps: [], titles: [], activeIdx: -1 };

    function renderList(data) {
        list.innerHTML = '';
        if (!data.timestamps || data.timestamps.length === 0) {
            list.innerHTML = '<div style="padding:15px;text-align:center;color:var(--text-muted);font-size:11px;font-style:italic;">No timestamps tracked.<br>Use Alt+X on video or load from DB.</div>';
            return;
        }

        data.timestamps.forEach((sec, i) => {
            const item = document.createElement('div');
            item.className = 'item' + (i === data.activeIdx ? ' active' : '');
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'time';
            timeSpan.textContent = formatTime(sec);
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = data.titles[i] || '';
            Object.assign(titleSpan.style, {
                textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', maxWidth: '170px'
            });
            
            item.appendChild(timeSpan);
            item.appendChild(titleSpan);

            item.addEventListener('click', () => {
                sendMessageToContent({ action: 'seek', time: Math.max(0, sec - 2) });
            });
            list.appendChild(item);
        });
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) sec = 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${h ? h+':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function sendMessageToContent(msg, callback) {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, msg, response => {
                    if (chrome.runtime.lastError) {
                        setStatus('Open YouTube first', '#ff4b4b');
                    } else if (callback) {
                        callback(response);
                    }
                });
            }
        });
    }

    sendMessageToContent({ action: 'getState' }, (res) => {
        if (res) {
            updateTextarea(res.text);
            modeSelect.value = res.mode;
            currentTimestampData = res;
            renderList(res);
            setStatus(`Loaded ${res.timestamps.length} markers`);
        }
    });

    modeSelect.addEventListener('change', () => {
        sendMessageToContent({ action: 'updateMode', mode: modeSelect.value });
    });

    setInterval(() => {
        sendMessageToContent({ action: 'getState' }, res => {
            if (res) {
                if (res.text !== textarea.value && document.activeElement !== textarea) {
                    updateTextarea(res.text);
                }
                currentTimestampData = res;
                renderList(res);
            }
        });
    }, 1000);

    document.getElementById('btn-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(textarea.value).then(() => {
            setStatus('Copied!');
        });
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        if (!urlInput.value || !tokenInput.value) {
            setStatus('Setup Turso first', '#ff4b4b');
            settingsPanel.classList.add('open');
            return;
        }
        sendMessageToContent({ action: 'getVideoId' }, res => {
            if (res && res.videoId) {
                const vid = res.videoId;
                setStatus('Saving API...', 'var(--accent)');
                chrome.runtime.sendMessage({
                    action: 'tursoQuery',
                    payload: {
                        url: urlInput.value.trim().replace(/^libsql:\/\//i, 'https://'),
                        token: tokenInput.value.trim(),
                        sql: "INSERT INTO video_timestamps (video_id, timestamps) VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET timestamps = excluded.timestamps;",
                        args: [{type: "text", value: vid}, {type: "text", value: textarea.value}]
                    }
                }, response => {
                    if (response && response.success) setStatus('Saved to DB!', '#00e676');
                    else setStatus('Save Failed', '#ff4b4b');
                });
            }
        });
    });

    document.getElementById('btn-load').addEventListener('click', () => {
        if (!urlInput.value || !tokenInput.value) {
            setStatus('Setup Turso first', '#ff4b4b');
            settingsPanel.classList.add('open');
            return;
        }
        sendMessageToContent({ action: 'getVideoId' }, res => {
            if (res && res.videoId) {
                const vid = res.videoId;
                setStatus('Loading API...', 'var(--accent)');
                chrome.runtime.sendMessage({
                    action: 'tursoQuery',
                    payload: {
                        url: urlInput.value.trim().replace(/^libsql:\/\//i, 'https://'),
                        token: tokenInput.value.trim(),
                        sql: "SELECT timestamps FROM video_timestamps WHERE video_id = ?;",
                        args: [{type: "text", value: vid}]
                    }
                }, response => {
                    if (response && response.success) {
                        const data = response.data;
                        const result = data.results && data.results[1];
                        if (result && result.response && result.response.result.rows && result.response.result.rows.length > 0) {
                            const newText = result.response.result.rows[0][0].value;
                            updateTextarea(newText);
                            setStatus('DB Load Success!', '#00e676');
                            
                            // Send to content script so it syncs its state
                            sendMessageToContent({ action: 'updateText', text: newText });

                        } else {
                            setStatus('No DB Data Found', '#ffb74d');
                        }
                    } else {
                        setStatus('Load Failed', '#ff4b4b');
                    }
                });
            }
        });
    });
});
