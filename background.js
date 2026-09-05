/**
 * YT Smart Chapters Pro v3.0
 * made with 💖 by pavnxet
 * GitHub: https://github.com/pavnxet/yt-timestamp-skipper
 */

const DEFAULT_AIKIT_URL = "https://claude.aikit.club/qwen.aikit.club/v1";
const DEFAULT_AIKIT_TOKEN = "";
const DEFAULT_AIKIT_MODEL = "qwen3.8-max";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tursoQuery') {
        const { url, token, sql, args } = request.payload;

        fetch(url + '/v2/pipeline', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    { type: "execute", stmt: { sql: "CREATE TABLE IF NOT EXISTS video_timestamps (video_id TEXT PRIMARY KEY, timestamps TEXT);" } },
                    { type: "execute", stmt: { sql: sql, args: args } },
                    { type: "close" }
                ]
            })
        })
        .then(res => res.json())
        .then(data => {
            sendResponse({ success: true, data: data });
        })
        .catch(err => {
            sendResponse({ success: false, error: err.message });
        });

        return true; 
    }

    if (request.action === 'verifyAi' || request.action === 'verifyOpenRouter') {
        verifyAiConnection(request.payload || {})
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'generateChapters') {
        const tabId = sender?.tab?.id;
        generateChapters(request.text, tabId)
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

async function verifyAiConnection(payload) {
    const provider = payload.provider || 'aikit';

    if (provider === 'aikit') {
        const token = (payload.apiKey && payload.apiKey.trim()) ? payload.apiKey.trim() : DEFAULT_AIKIT_TOKEN;
        const model = (payload.model && payload.model.trim()) ? payload.model.trim() : DEFAULT_AIKIT_MODEL;
        const baseUrl = (payload.baseUrl && payload.baseUrl.trim()) ? payload.baseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;

        const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': token,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Ping' }]
            })
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error?.message || `AIKit Error (HTTP ${resp.status})`);
        }

        return {
            provider: 'aikit',
            model: model,
            label: 'AIKit Qwen Connected'
        };
    } else {
        // OpenRouter
        const apiKey = payload.apiKey?.trim();
        if (!apiKey) throw new Error('OpenRouter API Key is required.');
        const model = (payload.model && payload.model.trim()) ? payload.model.trim() : 'google/gemma-4-31b-it:free';

        const keyResp = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': 'Bearer ' + apiKey }
        });

        if (!keyResp.ok) {
            const errJson = await keyResp.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `API key invalid (HTTP ${keyResp.status})`);
        }

        const keyData = await keyResp.json().catch(() => ({}));

        const testResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
                'HTTP-Referer': 'https://github.com/pavnxet/yt-timestamp-skipper',
                'X-Title': 'YT Smart Chapters Pro'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Ping' }],
                max_tokens: 3
            })
        });

        if (!testResp.ok) {
            const modelErr = await testResp.json().catch(() => ({}));
            throw new Error(`Model Error (${model}): ${modelErr.error?.message || testResp.statusText}`);
        }

        return {
            provider: 'openrouter',
            label: keyData.data?.label || 'OpenRouter Active Key',
            isFreeTier: keyData.data?.is_free_tier,
            model: model
        };
    }
}

async function generateChapters(text, tabId = null) {
    console.log("Generating chapters for text length:", text.length);
    
    const config = await new Promise(resolve => chrome.storage.local.get([
        'aiProvider', 
        'aiToken', 
        'aiModel', 
        'aiBaseUrl', 
        'openrouterKey',
        'openrouterModel'
    ], resolve));

    let provider = config.aiProvider;
    if (provider !== 'openrouter') {
        provider = 'aikit';
    }

    // --- Time-Based Chunking for Long Transcripts (1 hour / 3600s per chunk) ---
    // Instead of random character cutoffs, we split intelligently by 1-hour video blocks
    const lines = text.split('\n');
    const tsRegex = /\b(\d{1,2}(?::\d{2}){1,2})\b/;

    function parseSec(tsStr) {
        if (!tsStr) return 0;
        const p = tsStr.trim().split(':').map(Number);
        if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
        if (p.length === 2) return p[0] * 60 + p[1];
        return p[0] || 0;
    }

    // Find the max timestamp in the transcript to know video length
    let maxTimestampSec = 0;
    for (const line of lines) {
        const m = line.match(tsRegex);
        if (m) {
            const s = parseSec(m[1]);
            if (s > maxTimestampSec) maxTimestampSec = s;
        }
    }

    const CHUNK_DURATION = 1800; // 1800 seconds = 30 minutes (safe payload size for AIKit / Qwen WAF)
    if (maxTimestampSec > CHUNK_DURATION + 180) { // More than 30 mins (with 3 min grace)
        const totalChunks = Math.ceil(maxTimestampSec / CHUNK_DURATION);
        console.log(`Video duration (~${(maxTimestampSec / 60).toFixed(0)} mins). Splitting into ${totalChunks} safe chunks (30 mins each)...`);

        const timeChunks = [];
        for (let h = 0; h < totalChunks; h++) {
            timeChunks.push([]);
        }

        let currentBucket = 0;
        for (const line of lines) {
            const m = line.match(tsRegex);
            if (m) {
                const s = parseSec(m[1]);
                currentBucket = Math.min(totalChunks - 1, Math.floor(s / CHUNK_DURATION));
            }
            timeChunks[currentBucket].push(line);
        }

        const validChunks = timeChunks
            .map(c => c.join('\n'))
            .filter(c => c.trim().length > 0);

        console.log(`Created ${validChunks.length} safe chunks. Processing sequentially...`);
        const tableRows = [];

        for (let i = 0; i < validChunks.length; i++) {
            console.log(`Processing Chunk ${i + 1}/${validChunks.length}...`);
            const chunkResult = await callAiForChapters(validChunks[i], provider, config);
            if (chunkResult) {
                chunkResult.split('\n').forEach(l => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('question start') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
                        tableRows.push(trimmed);
                    }
                });
            }

            // Immediately send current accumulated rows to UI so user sees live progress!
            if (tabId && tableRows.length > 0) {
                const header = "| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |\n| -- | -------------- | ------------------------ | ------------ | -------------- |";
                let tempCounter = 1;
                const progressiveRows = tableRows.map(row => {
                    const parts = row.split('|');
                    if (parts.length >= 6) {
                        parts[1] = ` Q${tempCounter++} `;
                        return parts.join('|');
                    }
                    return row;
                });
                const progressiveText = `${header}\n${progressiveRows.join('\n')}`;
                chrome.tabs.sendMessage(tabId, {
                    action: 'chunkProgress',
                    currentHour: i + 1,
                    totalHours: validChunks.length,
                    partialText: progressiveText
                }).catch(() => {});
            }

            // Cooldown delay between consecutive chunks to prevent Qwen / Cloudflare CAPTCHA rate limiting
            if (i < validChunks.length - 1) {
                console.log(`Cooling down 6 seconds before processing next chunk (${i + 2}/${validChunks.length})...`);
                await new Promise(res => setTimeout(res, 6000));
            }
        }

        if (tableRows.length > 0) {
            const header = "| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |\n| -- | -------------- | ------------------------ | ------------ | -------------- |";
            let qCounter = 1;
            const renumberedRows = tableRows.map(row => {
                const parts = row.split('|');
                if (parts.length >= 6) {
                    parts[1] = ` Q${qCounter++} `;
                    return parts.join('|');
                }
                return row;
            });
            return `${header}\n${renumberedRows.join('\n')}`;
        }
    }

    return await callAiForChapters(text, provider, config);
}

async function callAiForChapters(textChunk, provider, config) {
    const prompt = `You are an expert video lecture timestamp extraction specialist.
Analyze the transcript and extract structured, accurate timestamps for every multiple-choice question discussed.

Identify:
1. Question Start: exact timestamp where question presentation begins.
2. Correct Option Timestamp: when teacher reveals/confirms the correct option (A/B/C/D).
3. Answer Start: when teacher starts explaining why the answer is correct (or N/A).

OUTPUT FORMAT:
Return ONLY the markdown table below with all questions in chronological order:

| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | B              |

Rules:
- Strictly use HH:MM:SS (or MM:SS) format.
- Correct Option must be A, B, C, D, or Unclear.
- Do NOT output any introductory text, markdown headers, or concluding remarks outside the table.

Transcript to process:
${textChunk}`;

    if (provider === 'aikit') {
        const token = (config.aiToken && config.aiToken.trim()) ? config.aiToken.trim() : DEFAULT_AIKIT_TOKEN;
        let model = (config.aiModel && config.aiModel.trim()) ? config.aiModel.trim() : DEFAULT_AIKIT_MODEL;
        if (!model.startsWith('qwen')) {
            model = DEFAULT_AIKIT_MODEL;
        }
        const baseUrl = (config.aiBaseUrl && config.aiBaseUrl.trim()) ? config.aiBaseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;
        const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

        console.log(`Using AIKit Claude Code: model=${model} endpoint=${endpoint}`);

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': token,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(`AIKit Error (${model}): ${errData.error?.message || resp.statusText}`);
        }

        const data = await resp.json();
        const rawContent = data.content?.[0]?.text || '';
        const cleaned = rawContent.replace(/<!--\s*qwen_metadata:.*?-->/gs, '').trim();
        return cleaned;

    } else {
        // OpenRouter Provider (Fixed bug: using config.openrouterModel instead of aiModel)
        const apiKey = config.openrouterKey;
        const model = (config.openrouterModel && config.openrouterModel.trim()) ? config.openrouterModel.trim() : 'google/gemma-4-31b-it:free';

        if (!apiKey) {
            throw new Error('OpenRouter API key not configured. Check settings.');
        }

        console.log("Using OpenRouter model:", model);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
                'HTTP-Referer': 'https://github.com/pavnxet/yt-timestamp-skipper',
                'X-Title': 'YT Smart Chapters Pro'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
}

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDashboard' }).catch(err => {
        console.warn("Could not toggle dashboard. Ensure you are on YouTube.", err);
    });
});
