/**
 * YT Smart Chapters Pro v3.0
 * made with 💖 by pavnxet
 * GitHub: https://github.com/pavnxet/yt-timestamp-skipper
 */

const DEFAULT_AIKIT_URL = "https://claude.aikit.club/qwen.aikit.club/v1";
const DEFAULT_AIKIT_TOKEN = "";
const DEFAULT_AIKIT_MODEL = "qwen3.8-max";
const DEFAULT_TRANSCRIPT_API_KEY = "sk_ZDrY9xqIVpMGguu0pWru_CEUtmHO-eMW1rWqf_Wk7WA";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchTranscriptFromApi') {
        fetchTranscriptFromApi(request.payload || {})
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
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

    if (request.action === 'fetchCustomModels') {
        fetchCustomModels(request.baseUrl, request.apiKey)
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

    if (request.action === 'analyzeRemovableSegments') {
        const tabId = sender?.tab?.id;
        analyzeRemovableSegments(request.text, tabId)
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'generateAllInOne') {
        const tabId = sender?.tab?.id;
        generateAllInOne(request.text, tabId)
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'submitSponsorBlock') {
        submitSponsorBlock(request.payload || {})
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

async function verifyAiConnection(payload) {
    const provider = payload.provider || 'aikit';

    if (provider === 'aikit') {
        const token = (payload.apiKey && payload.apiKey.trim()) ? payload.apiKey.trim() : DEFAULT_AIKIT_TOKEN;
        let model = (payload.model && payload.model.trim()) ? payload.model.trim() : DEFAULT_AIKIT_MODEL;
        if (!model.startsWith('qwen')) {
            model = DEFAULT_AIKIT_MODEL;
        }
        let baseUrl = (payload.baseUrl && payload.baseUrl.trim()) ? payload.baseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;
        const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

        if (!token) throw new Error('AIKit Token is required.');

        const testResp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': token,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Hi' }]
            })
        });

        if (!testResp.ok) {
            const errJson = await testResp.json().catch(() => ({}));
            throw new Error(`AIKit Error (${model}): ${errJson.error?.message || testResp.statusText}`);
        }

        return {
            provider: 'aikit',
            model: model,
            label: `AIKit (${model})`
        };

    } else if (provider === 'openrouter') {
        // OpenRouter
        const apiKey = payload.apiKey;
        const model = payload.model || 'google/gemma-4-31b-it:free';

        if (!apiKey) throw new Error('OpenRouter API Key is required.');

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



    } else if (provider === 'custom') {
        // Custom OpenAI-Compatible Provider (Local e.g. 127.0.0.1:8002/v1 or Remote)
        let baseUrl = (payload.baseUrl && payload.baseUrl.trim()) ? payload.baseUrl.trim() : 'http://127.0.0.1:8002/v1';
        baseUrl = baseUrl.replace(/\/+$/, '');
        const model = (payload.model && payload.model.trim()) ? payload.model.trim() : 'qwen3.8-flash';
        const apiKey = (payload.apiKey && payload.apiKey.trim()) ? payload.apiKey.trim() : '';
        const name = payload.providerName || 'Custom Provider';

        const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const testResp = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'user', content: 'Say hello in 5 words.' }
                    ],
                    max_tokens: 30,
                    temperature: 0.2
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!testResp.ok) {
                const errData = await testResp.json().catch(() => ({}));
                throw new Error(`Custom Provider Error (${testResp.status}): ${errData.error?.message || errData.message || testResp.statusText}`);
            }

            const data = await testResp.json();
            let reply = data.choices?.[0]?.message?.content || 'OK';
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

            return {
                provider: 'custom',
                label: `${name} (${model}) - Online ⚡`,
                model: model,
                replyPreview: reply.substring(0, 60)
            };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error(`Custom Provider request timed out (20s). Check that ${baseUrl} is reachable.`);
            }
            throw err;
        }
    }
}

async function fetchCustomModels(rawBaseUrl, rawApiKey) {
    let baseUrl = (rawBaseUrl && rawBaseUrl.trim()) ? rawBaseUrl.trim() : 'http://127.0.0.1:8002/v1';
    baseUrl = baseUrl.replace(/\/+$/, '');
    if (baseUrl.endsWith('/chat/completions')) {
        baseUrl = baseUrl.replace(/\/chat\/completions$/, '');
    }
    const endpoint = baseUrl.endsWith('/models') ? baseUrl : `${baseUrl}/models`;

    const headers = { 'Accept': 'application/json' };
    if (rawApiKey && rawApiKey.trim()) {
        headers['Authorization'] = `Bearer ${rawApiKey.trim()}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
        const resp = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(`Endpoint returned HTTP ${resp.status}: ${errData.error?.message || resp.statusText}`);
        }

        const data = await resp.json();
        let models = [];
        if (Array.isArray(data.data)) {
            models = data.data.map(m => (typeof m === 'string' ? m : (m.id || m.name || ''))).filter(Boolean);
        } else if (Array.isArray(data.models)) {
            models = data.models.map(m => (typeof m === 'string' ? m : (m.name || m.id || m.model || ''))).filter(Boolean);
        } else if (Array.isArray(data)) {
            models = data.map(m => (typeof m === 'string' ? m : (m.id || m.name || ''))).filter(Boolean);
        }

        return {
            models: models,
            baseUrl: baseUrl
        };
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('Connection timed out (12s). Check if server is running.');
        }
        throw err;
    }
}

async function getAiConfig() {
    return await new Promise(resolve => chrome.storage.local.get([
        'aiProvider', 
        'aiToken', 
        'aiModel', 
        'aiBaseUrl', 
        'openrouterKey',
        'openrouterModel',
        'customUrl',
        'customApiKey',
        'customModel',
        'customProviderName',
        'customProviders'
    ], resolve));
}

function parseSec(tsStr) {
    if (!tsStr) return 0;
    const p = tsStr.trim().split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
}

function formatSec(sec) {
    if (!sec || isNaN(sec)) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function splitTextIntoCharChunks(text, maxCharLimit = 3800) {
    const lines = text.split('\n');
    const chunks = [];
    let currentLines = [];
    let currentLength = 0;

    for (const line of lines) {
        if (currentLength + line.length + 1 > maxCharLimit && currentLines.length > 0) {
            chunks.push(currentLines.join('\n'));
            currentLines = [line];
            currentLength = line.length;
        } else {
            currentLines.push(line);
            currentLength += line.length + 1;
        }
    }
    if (currentLines.length > 0) {
        chunks.push(currentLines.join('\n'));
    }
    return chunks;
}

function isNoChunkingModel(model, config = {}) {
    if (!model && typeof config === 'object') {
        const prov = config.aiProvider || 'aikit';
        if (prov === 'custom') model = config.customModel;
        else if (prov === 'openrouter') model = config.openrouterModel;
        else model = config.aiModel;
    }
    const m = (model || '').toLowerCase().trim();
    if (config.disableChunking === true || config.noChunking === true) {
        return true;
    }
    return m.includes('glm-5') || m.includes('glm5') || m.includes('glm 5') || m.includes('lumo-max') || m.includes('lucky-cat');
}

function cleanAiOutput(rawContent) {
    if (!rawContent) return '';
    let content = rawContent;

    // Remove closed thinking/reasoning blocks
    content = content.replace(/<(?:think|thought|reasoning)>[\s\S]*?<\/(?:think|thought|reasoning)>/gi, '');

    // Handle cut-off or unclosed thinking tag
    if (/<(?:think|thought|reasoning)>/i.test(content) && !/<\/(?:think|thought|reasoning)>/i.test(content)) {
        const tableStartMatch = content.match(/(?:\||\={2,}|#{1,4})\s*(?:Q#|#|SECTION)/i);
        if (tableStartMatch) {
            content = content.substring(tableStartMatch.index);
        } else {
            content = content.replace(/<(?:think|thought|reasoning)>[\s\S]*$/i, '');
        }
    }

    // Remove outer code fence wrapping if present
    content = content.trim();
    content = content.replace(/^```(?:markdown|md)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    return content.trim();
}

async function generateChapters(text, tabId = null) {
    console.log("Generating chapters for text length:", text.length);
    const config = await getAiConfig();
    let provider = config.aiProvider || 'aikit';

    if (provider === 'openrouter' && !config.openrouterKey) {
        provider = 'aikit';
    }

    const noChunking = isNoChunkingModel(config.customModel, config);

    if (noChunking) {
        console.log(`GLM 5.3 / Full-Context Model: Sending complete transcript without chunking (${text.length} chars)...`);
        const singleResult = await callAiForChapters(text, provider, config);
        return singleResult || "NO CHAPTERS FOUND";
    }

    // For custom provider only: split text into ~3800 character chunks to respect server limits
    if (provider === 'custom' && text.length > 3800) {
        const charChunks = splitTextIntoCharChunks(text, 3800);
        console.log(`Custom Provider: Splitting chapters into ${charChunks.length} chunks (~3800 chars each)...`);
        const tableRows = [];

        for (let i = 0; i < charChunks.length; i++) {
            console.log(`Custom Chapter Chunk ${i + 1}/${charChunks.length}...`);
            const chunkResult = await callAiForChapters(charChunks[i], provider, config);
            if (chunkResult) {
                chunkResult.split('\n').forEach(l => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('question start') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
                        tableRows.push(trimmed);
                    }
                });
            }

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
                    totalHours: charChunks.length,
                    partialText: progressiveText
                }).catch(() => {});
            }

            if (i < charChunks.length - 1) {
                await new Promise(res => setTimeout(res, 2000));
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
        return "NO CHAPTERS FOUND";
    }

    const lines = text.split('\n');
    const tsRegex = /\b(\d{1,2}(?::\d{2}){1,2})\b/;

    let maxTimestampSec = 0;
    for (const line of lines) {
        const m = line.match(tsRegex);
        if (m) {
            const s = parseSec(m[1]);
            if (s > maxTimestampSec) maxTimestampSec = s;
        }
    }

    const CHUNK_DURATION = 1800; // 30 minutes
    if (maxTimestampSec > CHUNK_DURATION + 180) {
        const totalChunks = Math.ceil(maxTimestampSec / CHUNK_DURATION);
        console.log(`Video duration (~${(maxTimestampSec / 60).toFixed(0)} mins). Splitting into ${totalChunks} safe chunks (30 mins each)...`);

        const timeChunks = Array.from({ length: totalChunks }, () => []);
        let currentBucket = 0;
        for (const line of lines) {
            const m = line.match(tsRegex);
            if (m) {
                const s = parseSec(m[1]);
                currentBucket = Math.min(totalChunks - 1, Math.floor(s / CHUNK_DURATION));
            }
            timeChunks[currentBucket].push(line);
        }

        const validChunks = timeChunks.map(c => c.join('\n')).filter(c => c.trim().length > 0);
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

            if (i < validChunks.length - 1) {
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
    const prompt = `You are an expert video lecture analyst and timestamp extraction specialist with deep expertise in Hindi, Hinglish, and bilingual competitive exam lectures.
Analyze the transcript and extract structured, highly accurate timestamps for every distinct multiple-choice exam question discussed.

## PRIMARY OBJECTIVE & QUESTION EVENT CONCEPT
Treat each exam question as a single "Question Event" (Transition -> Question Stem/Introduction -> Options -> Student solving -> Answer/Solution).
Assign the timestamp where the teacher ACTUALLY BEGINS PRESENTING/INTRODUCING the exam question, NOT just rhetorical questions, NOT when students finish solving, and NOT the solution timestamp.

## ADVANCED DETECTION & TIMESTAMP RULES

1. **Strong Transition Signals (Question Announcements)**:
   - "अगला प्रश्न", "अगला सवाल", "नेक्स्ट", "नेक्स्ट सवाल", "अगला क्वेश्चन", "next question"
   - "चलिए अगला सवाल", "अगले प्रश्न की ओर चलते हैं", "आगे बढ़ते हैं", "अब इस प्रश्न को देखते हैं"
   - "प्रश्न नंबर [X]", "Question number [X]", "सवाल नंबर [X]", "अब करेंगे प्रश्न 10"
   *TRANSITION ≠ QUESTION START*: Never blindly pick a generic transition if the question content starts a few seconds later. If at [02:00] teacher says "चलिए अगला सवाल लेते हैं..." and at [02:05] begins "1962 में नील रत्न बनर्जी ने...", the Question Start is [02:05].

2. **Look-Ahead & Look-Back**:
   - *Look-Ahead*: After a transition, check subsequent lines to find where the question topic/stem begins.
   - *Look-Back*: Sometimes introduction begins before formal question wording (e.g., at [17:57] "राजस्थान की पुरातात्विक सभ्यताओं से जुड़ा सवाल..." and at [18:04] "बालाथल पुरस्थल पर विचार कीजिए"). Question Start is [17:57].

3. **Not Every Question-Like Sentence is a New Question (DO NOT SPLIT)**:
   - Teachers ask rhetorical or intermediate questions during explanation: "कौन से मंत्रालय था इनके पास?", "कब हुआ था?", "किसने किया?", "आप कहेंगे सर...?", "गोगा नवमी कब आती है?".
   - These are EXPLANATION/FOLLOW-UP of the current question, NOT new exam questions! Maintain Question Event continuity.
   - Previous-Year Question (PYQ) mentions or book references ("यह सवाल 2020 में भी आया था") are references, not new questions.

4. **Options & Answer Timestamps**:
   - *Question Start*: Earliest second question presentation begins. Do NOT wait until options appear or until interrogative phrase ("व्यवस्थित करें") at the end.
   - *Correct Option Timestamp*: Exact second teacher confirms/reveals the correct option ("इसका सही उत्तर B होगा", "Option C बिल्कुल सही है", "Lock कर दीजिए D को").
   - *Answer Start*: Exact second teacher begins explaining the solution/reasoning after revealing the answer (or N/A if no explanation).

OUTPUT FORMAT:
Return ONLY the markdown table below in chronological order:

| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | B              |

Rules:
- Strictly use HH:MM:SS (or MM:SS) format for all timestamps.
- Correct Option must be A, B, C, D, or Unclear.
- Do NOT output any introductory text, markdown commentary, or notes outside the table.

Transcript to process:
${textChunk}`;

    return await callRawAi(prompt, provider, config);
}

// --- REMOVABLE CONTENT & SPONSORBLOCK ANALYZER ---
async function analyzeRemovableSegments(text, tabId = null) {
    console.log("Analyzing removable segments for text length:", text.length);
    const config = await getAiConfig();
    let provider = config.aiProvider || 'aikit';

    if (provider === 'openrouter' && !config.openrouterKey) {
        provider = 'aikit';
    }

    const noChunking = isNoChunkingModel(config.customModel, config);

    if (noChunking) {
        console.log(`GLM 5.3 / Full-Context Model detected: Sending complete transcript for SponsorBlock (${text.length} chars)...`);
        const singleResult = await callAiForRemovableSegments(text, provider, config);
        return ensureInitialIntroSegment(singleResult, text);
    }

    const lines = text.split('\n');
    const tsRegex = /\b(\d{1,2}(?::\d{2}){1,2})\b/;

    let maxTimestampSec = 0;
    for (const line of lines) {
        const m = line.match(tsRegex);
        if (m) {
            const s = parseSec(m[1]);
            if (s > maxTimestampSec) maxTimestampSec = s;
        }
    }

    // For custom provider only: split text into ~3800 character chunks to respect server limits
    if (provider === 'custom' && text.length > 3800) {
        const charChunks = splitTextIntoCharChunks(text, 3800);
        console.log(`Custom Provider: Splitting removable segments into ${charChunks.length} chunks (~3800 chars each)...`);
        const allTableRows = [];
        const allIntervals = [];

        for (let i = 0; i < charChunks.length; i++) {
            console.log(`Custom Removable Chunk ${i + 1}/${charChunks.length}...`);
            const chunkResult = await callAiForRemovableSegments(charChunks[i], provider, config);
            if (chunkResult) {
                const { rows, intervals } = parseRemovableResponse(chunkResult);
                rows.forEach(r => allTableRows.push(r));
                intervals.forEach(intv => allIntervals.push(intv));
            }

            if (tabId && allIntervals.length > 0) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'removableProgress',
                    currentHour: i + 1,
                    totalHours: charChunks.length,
                    intervalsCount: allIntervals.length
                }).catch(() => {});
            }

            if (i < charChunks.length - 1) {
                await new Promise(res => setTimeout(res, 2000));
            }
        }

        if (allTableRows.length > 0 || allIntervals.length > 0) {
            if (allTableRows.length === 0) {
                allIntervals.forEach((intv, idx) => {
                    const m = intv.match(/\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?(?:\s+([A-Za-z0-9_-]+))?(?:\s+(.*))?/);
                    if (m) {
                        allTableRows.push(`| ${idx + 1} | ${m[1]} | ${m[2]} | ${m[3] || 'SPONSOR'} | ${m[4] || 'Non-educational segment'} |`);
                    }
                });
            }
            if (allIntervals.length === 0) {
                allTableRows.forEach(row => {
                    const tsMatches = row.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g);
                    if (tsMatches && tsMatches.length >= 2) {
                        allIntervals.push(`[${tsMatches[0]}]-[${tsMatches[1]}]`);
                    }
                });
            }
            const header = "| # | Start    | End      | Category        | Reason                        |\n| - | -------- | -------- | --------------- | ----------------------------- |";
            let cIndex = 1;
            const renumbered = allTableRows.map(r => {
                const parts = r.split('|');
                if (parts.length >= 6) {
                    parts[1] = ` ${cIndex++} `;
                    return parts.join('|');
                }
                return r;
            });
            const tableStr = `${header}\n${renumbered.join('\n')}`;
            const intervalsStr = Array.from(new Set(allIntervals)).join('\n');
            const combinedResult = `${tableStr}\n\n${intervalsStr}`;
            return ensureInitialIntroSegment(combinedResult, text);
        } else {
            return ensureInitialIntroSegment("NO REMOVABLE SEGMENTS FOUND", text);
        }
    }

    const CHUNK_DURATION = 1800; // 30 minutes safe chunks
    if (maxTimestampSec > CHUNK_DURATION + 180) {
        const totalChunks = Math.ceil(maxTimestampSec / CHUNK_DURATION);
        console.log(`Splitting removable segment analysis into ${totalChunks} chunks...`);

        const timeChunks = Array.from({ length: totalChunks }, () => []);
        let currentBucket = 0;
        for (const line of lines) {
            const m = line.match(tsRegex);
            if (m) {
                const s = parseSec(m[1]);
                currentBucket = Math.min(totalChunks - 1, Math.floor(s / CHUNK_DURATION));
            }
            timeChunks[currentBucket].push(line);
        }

        const validChunks = timeChunks.map(c => c.join('\n')).filter(c => c.trim().length > 0);
        const allTableRows = [];
        const allIntervals = [];

        for (let i = 0; i < validChunks.length; i++) {
            console.log(`Removable analysis Chunk ${i + 1}/${validChunks.length}...`);
            const chunkResult = await callAiForRemovableSegments(validChunks[i], provider, config);
            if (chunkResult) {
                const { rows, intervals } = parseRemovableResponse(chunkResult);
                rows.forEach(r => allTableRows.push(r));
                intervals.forEach(intv => allIntervals.push(intv));
            }

            if (tabId && allIntervals.length > 0) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'removableProgress',
                    currentHour: i + 1,
                    totalHours: validChunks.length,
                    intervalsCount: allIntervals.length
                }).catch(() => {});
            }

            if (i < validChunks.length - 1) {
                await new Promise(res => setTimeout(res, 6000));
            }
        }

        if (allTableRows.length > 0 || allIntervals.length > 0) {
            if (allTableRows.length === 0) {
                allIntervals.forEach((intv, idx) => {
                    const m = intv.match(/\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?(?:\s+([A-Za-z0-9_-]+))?(?:\s+(.*))?/);
                    if (m) {
                        allTableRows.push(`| ${idx + 1} | ${m[1]} | ${m[2]} | ${m[3] || 'SPONSOR'} | ${m[4] || 'Non-educational segment'} |`);
                    }
                });
            }
            if (allIntervals.length === 0) {
                allTableRows.forEach(row => {
                    const tsMatches = row.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g);
                    if (tsMatches && tsMatches.length >= 2) {
                        allIntervals.push(`[${tsMatches[0]}]-[${tsMatches[1]}]`);
                    }
                });
            }
            const header = "| # | Start    | End      | Category        | Reason                        |\n| - | -------- | -------- | --------------- | ----------------------------- |";
            let cIndex = 1;
            const renumbered = allTableRows.map(r => {
                const parts = r.split('|');
                if (parts.length >= 6) {
                    parts[1] = ` ${cIndex++} `;
                    return parts.join('|');
                }
                return r;
            });
            const tableStr = `${header}\n${renumbered.join('\n')}`;
            const intervalsStr = Array.from(new Set(allIntervals)).join('\n');
            const combinedResult = `${tableStr}\n\n${intervalsStr}`;
            return ensureInitialIntroSegment(combinedResult, text);
        } else {
            return ensureInitialIntroSegment("NO REMOVABLE SEGMENTS FOUND", text);
        }
    }

    const singleResult = await callAiForRemovableSegments(text, provider, config);
    return ensureInitialIntroSegment(singleResult, text);
}

function ensureInitialIntroSegment(rawResult, fullText) {
    if (!fullText) return rawResult;

    // Find the very first timestamp mentioned in the transcript
    const tsRegex = /\b(\d{1,2}(?::\d{2}){1,2})\b/;
    let firstSpeechSec = 0;
    let firstSpeechTsStr = '';

    for (const line of fullText.split('\n')) {
        const m = line.match(tsRegex);
        if (m) {
            firstSpeechSec = parseSec(m[1]);
            firstSpeechTsStr = m[1];
            break;
        }
    }

    // If first speech happens at >= 5 seconds (e.g. 12s, 15s, 42s), the gap from 0 to speech start is an intro/silence
    if (firstSpeechSec < 5) {
        return rawResult;
    }

    const startTs = "00:00:00";
    const endTs = formatSec(firstSpeechSec);
    const { rows, intervals } = parseRemovableResponse(rawResult || '');

    // Check if an existing segment already covers from 00:00:00
    let alreadyHasStartCovered = false;
    for (const intv of intervals) {
        const m = intv.match(/\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?/);
        if (m) {
            const s = parseSec(m[1]);
            const e = parseSec(m[2]);
            if (s === 0 && e >= firstSpeechSec) {
                alreadyHasStartCovered = true;
                break;
            }
        }
    }

    if (alreadyHasStartCovered) {
        return rawResult;
    }

    const introRow = `| 1 | ${startTs} | ${endTs} | INTRO           | Initial intro silence before speech begins |`;
    const introInterval = `[${startTs}]-[${endTs}]`;

    const updatedRows = [introRow, ...rows];
    const uniqueIntervals = Array.from(new Set([introInterval, ...intervals]));

    const header = "| # | Start    | End      | Category        | Reason                        |\n| - | -------- | -------- | --------------- | ----------------------------- |";
    let cIndex = 1;
    const renumbered = updatedRows.map(r => {
        const parts = r.split('|');
        if (parts.length >= 6) {
            parts[1] = ` ${cIndex++} `;
            return parts.join('|');
        }
        return r;
    });

    return `${header}\n${renumbered.join('\n')}\n\n${uniqueIntervals.join('\n')}`;
}

function ensureIntroSegment(text, rawSbResult) {
    if (typeof text === 'string' && typeof rawSbResult === 'string') {
        if (text.startsWith('|') || text.includes('REMOVABLE') || text.includes(']-[')) {
            return ensureInitialIntroSegment(text, rawSbResult);
        }
        return ensureInitialIntroSegment(rawSbResult, text);
    }
    return ensureInitialIntroSegment(rawSbResult, text);
}

function parseRemovableResponse(rawText) {
    if (!rawText) return { rows: [], intervals: [] };
    const lines = rawText.split('\n');
    const rows = [];
    const intervals = [];
    const seenIntervals = new Set();
    const intvRegex = /\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?(?:\s+([A-Za-z0-9_-]+))?(?:\s+(.*))?/;

    lines.forEach(l => {
        const trimmed = l.trim();
        if (!trimmed || /^\|?[\s\-:|]+\|?$/.test(trimmed)) return;

        const tsMatches = trimmed.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g);

        if (trimmed.startsWith('|')) {
            const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
            const hasTs = cells.some(c => /\b\d{1,2}(?::\d{2}){1,2}\b/.test(c));
            if (!hasTs) return; // Header row

            rows.push(trimmed);
            if (tsMatches && tsMatches.length >= 2) {
                const intvKey = `[${tsMatches[0]}]-[${tsMatches[1]}]`;
                if (!seenIntervals.has(intvKey)) {
                    seenIntervals.add(intvKey);
                    intervals.push(intvKey);
                }
            }
        } else {
            const m = trimmed.match(intvRegex);
            if (m) {
                const intvKey = `[${m[1]}]-[${m[2]}]`;
                if (!seenIntervals.has(intvKey)) {
                    seenIntervals.add(intvKey);
                    const catStr = m[3] ? ` ${m[3]}` : '';
                    const reasonStr = m[4] ? ` ${m[4]}` : '';
                    intervals.push(`${intvKey}${catStr}${reasonStr}`.trim());
                }
            }
        }
    });

    return { rows, intervals };
}

async function callAiForRemovableSegments(textChunk, provider, config) {
    const prompt = `# ROLE

You are an expert educational video transcript analyst and timestamp extraction specialist.

Your task is to analyze a complete YouTube lecture transcript and identify portions that should be REMOVED from the educational content because they are:

1. SPONSOR / ADVERTISEMENT
2. NON-EDUCATIONAL CONTENT
3. JOKES / HUMOR / CASUAL BANTER
4. TANGENTS / OFF-TOPIC DISCUSSION

Your goal is NOT to summarize the lecture.
Your goal is to identify precise timestamp intervals that can later be automatically submitted to a video-segment filtering system.

---

# IMPORTANT OBJECTIVE

Analyze the ENTIRE transcript from beginning to end.
For every removable portion, determine:
* Exact START timestamp
* Exact END timestamp
* Category
* Short reason

Only mark a segment for removal when there is sufficient evidence from the transcript.
Do NOT remove educational explanations merely because they are informal, conversational, or contain an occasional joke.
The PRIMARY criterion is:
> Would removing this interval improve the video's educational focus without removing meaningful educational information?

---

# CATEGORIES

You must classify each removable segment into EXACTLY ONE of the official SponsorBlock categories:

### SPONSOR
Paid promotion, paid advertisements, commercial spots, brand promotions, sponsored course discounts, or referral programs.

### SELFPROMO
Unpaid self-promotion, promoting the teacher's own paid courses, app downloads (e.g. Maths Mahindra app), books, test series, or upcoming batches.

### INTERACTION
Interaction reminders such as asking viewers to like the video, subscribe to the channel, hit the bell icon, or follow social media pages.

### INTRO
Opening greetings, channel intro sequences, title cards, silence/waiting at video start, festival wishes, religious prayers/chants, or introductory slogans before actual study begins.
*CRITICAL FOR VIDEO START*: If the video's speech or transcript starts at a timestamp after 00:00:00 (e.g. at 00:12 or 00:15), the gap from [00:00:00] until the speech begins is considered INTRO/silence. If greetings or intro slogans continue after speech starts, include them in the INTRO interval starting at [00:00:00].

### OUTRO
End cards, sign-off greetings, closing remarks, final festival wishes after the lesson is completed.

### PREVIEW
Preview or recap of upcoming lectures, exam dates, syllabus logistics discussion, or file availability announcements.

### FILLER
Tangents, casual jokes, personal anecdotes, off-topic discussions, spiritual advice, or non-educational chit-chat during class.

---

# IMPORTANT GUIDELINE

Do NOT invent new category names. Every row in your table MUST strictly use one of:
\`SPONSOR\`, \`SELFPROMO\`, \`INTERACTION\`, \`INTRO\`, \`OUTRO\`, \`PREVIEW\`, or \`FILLER\`.

---

# TIMESTAMP RULES
Every output segment MUST contain:
START and END timestamps.
Use the EXACT timestamps from the transcript.
Format: [HH:MM:SS]-[HH:MM:SS] (or [00:MM:SS] if under 1 hour).
*CRITICAL FORMAT REQUIREMENT*: 
- Timestamps must NEVER have duplicated units (e.g. NEVER write [00:34:34] for 34 seconds; write [00:00:34]. NEVER write [07:09:09] for 7m 9s; write [00:07:09]).
- Standard format is ALWAYS [HH:MM:SS], where HH is hours, MM is minutes (00-59), and SS is seconds (00-59).
- For a 34-second mark, write [00:00:34]. For 7 minutes 9 seconds, write [00:07:09]. For 33 minutes 26 seconds, write [00:33:26].

---

# SEGMENT BOUNDARIES & MERGING

- Be conservative and precise. Do NOT include surrounding educational material.
- If multiple consecutive sentences belong to the same removable section, combine them into ONE interval.
- When uncertain, KEEP the content (do NOT remove definitions, derivations, formulas, examples, questions).

---

# OUTPUT FORMAT

Return ONLY the following table:

| # | Start    | End      | Category        | Reason                        |
| - | -------- | -------- | --------------- | ----------------------------- |
| 1 | 00:03:15 | 00:04:42 | SPONSOR         | Product promotion             |

If there are NO removable segments, return:
NO REMOVABLE SEGMENTS FOUND

---

# AUTOMATION OUTPUT

After the table, output a second section containing ONLY the timestamp intervals, one per line:
[00:03:15]-[00:04:42]
[00:18:20]-[00:19:05]

DO NOT add explanations, bullets, labels, or commentary to the automation section.

Transcript to analyze:
${textChunk}`;

    return await callRawAi(prompt, provider, config);
}

// --- ALL-IN-ONE DUAL EXTRACTION (CHAPTERS + SPONSORBLOCK IN SINGLE QUERY) ---
async function generateAllInOne(text, tabId = null) {
    console.log("Generating All-in-One extraction for text length:", text.length);
    const config = await getAiConfig();
    let provider = config.aiProvider || 'aikit';

    if (provider === 'openrouter' && !config.openrouterKey) {
        provider = 'aikit';
    }

    const lines = text.split('\n');
    const tsRegex = /\b(\d{1,2}(?::\d{2}){1,2})\b/;

    let maxTimestampSec = 0;
    for (const line of lines) {
        const m = line.match(tsRegex);
        if (m) {
            const s = parseSec(m[1]);
            if (s > maxTimestampSec) maxTimestampSec = s;
        }
    }

    const allChapterRows = [];
    const allSponsorRows = [];
    const allSponsorIntervals = [];

    const noChunking = isNoChunkingModel(config.customModel, config);

    if (noChunking) {
        console.log(`GLM 5.3 / Full-Context Model detected: Sending complete transcript for Dual Scan (${text.length} chars)...`);
        const singleResult = await callAiForDualExtraction(text, provider, config);
        if (singleResult) {
            const parsed = parseDualResponse(singleResult);
            parsed.chapterRows.forEach(r => allChapterRows.push(r));
            parsed.sponsorRows.forEach(r => allSponsorRows.push(r));
            parsed.sponsorIntervals.forEach(intv => allSponsorIntervals.push(intv));
        }
    } else if (provider === 'custom' && text.length > 3800) {
        const charChunks = splitTextIntoCharChunks(text, 3800);
        console.log(`Custom Provider: Splitting All-in-One into ${charChunks.length} chunks (~3800 chars each)...`);
        for (let i = 0; i < charChunks.length; i++) {
            console.log(`Custom All-in-One Chunk ${i + 1}/${charChunks.length}...`);
            const chunkResult = await callAiForDualExtraction(charChunks[i], provider, config);
            if (chunkResult) {
                const parsed = parseDualResponse(chunkResult);
                parsed.chapterRows.forEach(r => allChapterRows.push(r));
                parsed.sponsorRows.forEach(r => allSponsorRows.push(r));
                parsed.sponsorIntervals.forEach(intv => allSponsorIntervals.push(intv));
            }

            if (tabId) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'dualProgress',
                    currentChunk: i + 1,
                    totalChunks: charChunks.length,
                    chaptersCount: allChapterRows.length,
                    sponsorCount: allSponsorIntervals.length
                }).catch(() => {});
            }

            if (i < charChunks.length - 1) {
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    } else if (maxTimestampSec > CHUNK_DURATION + 180) {
        const totalChunks = Math.ceil(maxTimestampSec / CHUNK_DURATION);
        console.log(`All-in-One: Video duration (~${(maxTimestampSec / 60).toFixed(0)} mins). Splitting into ${totalChunks} chunks...`);

        const timeChunks = Array.from({ length: totalChunks }, () => []);
        let currentBucket = 0;
        for (const line of lines) {
            const m = line.match(tsRegex);
            if (m) {
                const s = parseSec(m[1]);
                currentBucket = Math.min(totalChunks - 1, Math.floor(s / CHUNK_DURATION));
            }
            timeChunks[currentBucket].push(line);
        }

        const validChunks = timeChunks.map(c => c.join('\n')).filter(c => c.trim().length > 0);

        for (let i = 0; i < validChunks.length; i++) {
            console.log(`All-in-One Chunk ${i + 1}/${validChunks.length}...`);
            const chunkResult = await callAiForDualExtraction(validChunks[i], provider, config);
            if (chunkResult) {
                const parsed = parseDualResponse(chunkResult);
                parsed.chapterRows.forEach(r => allChapterRows.push(r));
                parsed.sponsorRows.forEach(r => allSponsorRows.push(r));
                parsed.sponsorIntervals.forEach(intv => allSponsorIntervals.push(intv));
            }

            if (tabId) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'dualProgress',
                    currentChunk: i + 1,
                    totalChunks: validChunks.length,
                    chaptersCount: allChapterRows.length,
                    sponsorCount: allSponsorIntervals.length
                }).catch(() => {});
            }

            if (i < validChunks.length - 1) {
                await new Promise(res => setTimeout(res, 5000));
            }
        }
    } else {
        const singleResult = await callAiForDualExtraction(text, provider, config);
        if (singleResult) {
            const parsed = parseDualResponse(singleResult);
            parsed.chapterRows.forEach(r => allChapterRows.push(r));
            parsed.sponsorRows.forEach(r => allSponsorRows.push(r));
            parsed.sponsorIntervals.forEach(intv => allSponsorIntervals.push(intv));
        }
    }

    // 1. Format Chapters table with sequential Q1, Q2, ...
    const chapterHeader = "| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |\n| -- | -------------- | ------------------------ | ------------ | -------------- |";
    let qCounter = 1;
    const renumberedChapterRows = allChapterRows.map(row => {
        const parts = row.split('|');
        if (parts.length >= 6) {
            parts[1] = ` Q${qCounter++} `;
            return parts.join('|');
        }
        return row;
    });
    const finalChaptersText = renumberedChapterRows.length > 0 ? `${chapterHeader}\n${renumberedChapterRows.join('\n')}` : '';

    // 2. Format SponsorBlock table & intervals with safety checks
    let rawSbResult = '';
    if (allSponsorRows.length > 0 || allSponsorIntervals.length > 0) {
        if (allSponsorRows.length === 0) {
            allSponsorIntervals.forEach((intv, idx) => {
                const m = intv.match(/\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?\s*(?:-|–|—|to)\s*\[?\s*(\d{1,2}(?::\d{2}){1,2})\s*\]?(?:\s+([A-Za-z0-9_-]+))?(?:\s+(.*))?/);
                if (m) {
                    allSponsorRows.push(`| ${idx + 1} | ${m[1]} | ${m[2]} | ${m[3] || 'SPONSOR'} | ${m[4] || 'Non-educational segment'} |`);
                }
            });
        }
        if (allSponsorIntervals.length === 0) {
            allSponsorRows.forEach(row => {
                const tsMatches = row.match(/\b\d{1,2}(?::\d{2}){1,2}\b/g);
                if (tsMatches && tsMatches.length >= 2) {
                    allSponsorIntervals.push(`[${tsMatches[0]}]-[${tsMatches[1]}]`);
                }
            });
        }
        const sbHeader = "| # | Start    | End      | Category        | Reason                        |\n| - | -------- | -------- | --------------- | ----------------------------- |";
        rawSbResult = `${sbHeader}\n${allSponsorRows.join('\n')}\n\n${Array.from(new Set(allSponsorIntervals)).join('\n')}`;
    } else {
        rawSbResult = 'NO REMOVABLE SEGMENTS FOUND';
    }
    const finalSbText = ensureInitialIntroSegment(rawSbResult, text);

    return {
        chapters: finalChaptersText,
        sponsorBlock: finalSbText,
        questionsCount: renumberedChapterRows.length,
        sponsorCount: Array.from(new Set(allSponsorIntervals)).length
    };
}

function parseDualResponse(rawText) {
    if (!rawText) return { chapterRows: [], sponsorRows: [], sponsorIntervals: [] };

    let chaptersSection = '';
    let sponsorSection = '';

    const sbHeaderRegex = /(?:={2,}|#{1,4}|\*{2,})?\s*SECTION(?:\s*\d+)?\s*:\s*(?:REMOVABLE\s*(?:\/|\s)\s*)?SPONSORBLOCK[^\n]*|#{1,4}\s*(?:REMOVABLE(?:\s*SEGMENTS)?|SPONSORBLOCK[^\n]*)/i;
    const chHeaderRegex = /(?:={2,}|#{1,4}|\*{2,})?\s*SECTION(?:\s*\d+)?\s*:\s*(?:QUESTION\s+)?CHAPTERS[^\n]*|#{1,4}\s*(?:QUESTION\s+)?CHAPTERS[^\n]*/i;

    const sbPos = rawText.search(sbHeaderRegex);
    const chPos = rawText.search(chHeaderRegex);

    if (chPos !== -1 && sbPos !== -1) {
        if (chPos < sbPos) {
            chaptersSection = rawText.substring(chPos, sbPos);
            sponsorSection = rawText.substring(sbPos);
        } else {
            sponsorSection = rawText.substring(sbPos, chPos);
            chaptersSection = rawText.substring(chPos);
        }
    } else if (chPos !== -1) {
        chaptersSection = rawText.substring(chPos);
    } else if (sbPos !== -1) {
        sponsorSection = rawText.substring(sbPos);
    } else {
        chaptersSection = rawText;
        sponsorSection = rawText;
    }

    // Parse Chapter Rows
    const chapterRows = [];
    chaptersSection.split('\n').forEach(l => {
        const trimmed = l.trim();
        if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('question start') && !trimmed.toLowerCase().includes('category') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
            const isSponsor = /(SPONSOR|SELFPROMO|INTERACTION|INTRO|OUTRO|PREVIEW|FILLER)/i.test(trimmed);
            if (!isSponsor) {
                chapterRows.push(trimmed);
            }
        }
    });

    // Parse Sponsor Rows & Intervals
    const { rows: sponsorRows, intervals: sponsorIntervals } = parseRemovableResponse(sponsorSection);

    // Filter out chapter rows that might have leaked into sponsorRows
    const filteredSponsorRows = sponsorRows.filter(r => {
        const lower = r.toLowerCase();
        if (lower.includes('question start') || lower.includes('correct option')) return false;
        if (/\|\s*Q\d+\s*\|/i.test(r)) return false;
        return true;
    });

    return { chapterRows, sponsorRows: filteredSponsorRows, sponsorIntervals };
}

async function callAiForDualExtraction(textChunk, provider, config) {
    const prompt = `You are an expert educational video analyst and dual-extraction specialist.
Your task is to analyze the lecture transcript and produce TWO DISTINCT STRUCTURED SECTIONS in a single response:

1. SECTION 1: QUESTION CHAPTERS (Accurate exam question timestamps for video navigation)
2. SECTION 2: REMOVABLE / SPONSORBLOCK SEGMENTS (Promos, banter, tangents, or intro to filter out)

----------------------------------------------------
### RULES FOR SECTION 1: QUESTION CHAPTERS
----------------------------------------------------
Treat each exam question as a single "Question Event" (Transition -> Question Presentation -> Options -> Solution).
- Assign the timestamp where the teacher ACTUALLY BEGINS PRESENTING/INTRODUCING the exam question.
- "Next question" signals: "अगला सवाल", "नेक्स्ट", "Question number [X]", "चलिए अगला प्रश्न".
- Look-ahead: If transition is at [02:00] and question reading begins at [02:05], Question Start is [02:05].
- Look-back: If topic context begins at [17:57] before question text at [18:04], Question Start is [17:57].
- Do NOT split rhetorical / follow-up / explanation questions. Maintain question continuity.
- Correct Option Timestamp: Exact second teacher reveals/confirms the answer (e.g. "Option B lock kar do").
- Answer Start: Exact second teacher begins explaining the reasoning.
Format:
| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | B              |

----------------------------------------------------
### RULES FOR SECTION 2: REMOVABLE / SPONSORBLOCK SEGMENTS
----------------------------------------------------
Identify non-educational portions that should be skipped.
You MUST classify each segment into EXACTLY ONE of the official SponsorBlock categories:
- SPONSOR: Paid promotions, commercial spots, brand ads, paid course deals.
- SELFPROMO: Unpaid self-promotion, promoting the teacher's own mobile app (e.g. Maths Mahindra App), books, test series, batch launches, or WhatsApp group.
- INTERACTION: Reminders to like the video, subscribe to the channel, press the bell icon, or follow social media.
- INTRO: Opening greetings, intro sequence, title cards, silence/waiting before lecture starts.
- OUTRO: Endcards, class schedule announcements, closing remarks, final sign-off greetings.
- PREVIEW: Lecture preview, recap, syllabus logistics discussion.
- FILLER: Tangents, casual jokes, banter, teasing students, off-topic personal stories (>15s).
- HOOK: Opening video teaser or hook.
NEVER cut educational definitions, formulas, or question explanations!
Timestamp Format: Strict [HH:MM:SS] or MM:SS (Never duplicate digits like [00:34:34] for 34s; write [00:00:34]).
Format:
| # | Start    | End      | Category        | Reason                        |
| - | -------- | -------- | --------------- | ----------------------------- |
| 1 | HH:MM:SS | HH:MM:SS | SPONSOR         | Promo description             |

Followed by the raw intervals, one per line:
[HH:MM:SS]-[HH:MM:SS]

If no removable segments exist in this chunk, write:
NO REMOVABLE SEGMENTS FOUND

----------------------------------------------------
### OUTPUT FORMAT (MANDATORY DELIMITERS)
----------------------------------------------------
You MUST separate the two sections using the exact delimiters shown below:

=== SECTION: CHAPTERS ===
| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | B              |

=== SECTION: SPONSORBLOCK ===
| # | Start    | End      | Category        | Reason                        |
| - | -------- | -------- | --------------- | ----------------------------- |
| 1 | HH:MM:SS | HH:MM:SS | SPONSOR         | Product pitch                 |

[HH:MM:SS]-[HH:MM:SS]

Transcript to analyze:
${textChunk}`;

    return await callRawAi(prompt, provider, config);
}

// --- SPONSORBLOCK DIRECT API SUBMITTER ---
async function submitSponsorBlock({ videoId, userId, segments, videoDuration }) {
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        throw new Error('Invalid YouTube Video ID.');
    }
    const cleanUserId = (userId || '').trim();
    if (!cleanUserId) {
        throw new Error('Private User ID is required for SponsorBlock.');
    }
    if (cleanUserId.length < 32) {
        throw new Error(`Invalid Private User ID (length is ${cleanUserId.length}). SponsorBlock requires a private UUID of 32+ characters (do not use public User ID).`);
    }
    if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error('No valid segments provided for upload.');
    }

    const payload = {
        videoID: videoId,
        userID: cleanUserId,
        service: "YouTube",
        userAgent: "SponsorBlock-Skipper-Extension/3.0",
        segments: segments
    };

    if (typeof videoDuration === 'number' && videoDuration > 0) {
        payload.videoDuration = videoDuration;
        
        // Safety: Validate segments don't exceed video duration
        let totalSegmentDuration = 0;
        segments.forEach(s => {
            const segStart = Math.min(s.segment[0], videoDuration);
            const segEnd = Math.min(s.segment[1], videoDuration);
            if (segEnd > segStart) {
                totalSegmentDuration += (segEnd - segStart);
            }
        });

        // SponsorBlock strictly rejects if total segments length >= 80% of video
        if (totalSegmentDuration >= videoDuration * 0.8) {
            const pct = Math.round((totalSegmentDuration / videoDuration) * 100);
            throw new Error(`Safety Block: Total removable segments (${Math.round(totalSegmentDuration)}s) equal ${pct}% of video (${videoDuration}s). SponsorBlock allows at most 80%. Please review and refine intervals.`);
        }
    }

    console.log("Submitting to SponsorBlock API:", JSON.stringify(payload));

    const response = await fetch("https://sponsor.ajay.app/api/skipSegments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        const resData = await response.json().catch(() => null);
        return { success: true, count: segments.length, data: resData };
    } else if (response.status === 403) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Error 403 (Forbidden): ${errBody || 'Invalid User ID or auto-moderator rejected the submission.'}`);
    } else if (response.status === 409) {
        throw new Error('Error 409 (Duplicate): These segments or overlapping segments have already been submitted.');
    } else if (response.status === 429) {
        throw new Error('Error 429 (Rate Limit): Too many submissions. Please wait a few moments before trying again.');
    } else {
        const errorText = await response.text().catch(() => '');
        throw new Error(`SponsorBlock Error ${response.status}: ${errorText || response.statusText}`);
    }
}

// --- TRANSCRIPTAPI.COM FALLBACK FETCHER ---
async function fetchTranscriptFromApi({ videoId, apiKey }) {
    if (!videoId) throw new Error('Missing video ID');

    // Robust ID sanitization
    let cleanId = videoId.trim();
    if (cleanId.includes('v=')) {
        const m = cleanId.match(/v=([a-zA-Z0-9_-]{11})/);
        if (m) cleanId = m[1];
    } else if (cleanId.includes('/shorts/')) {
        const m = cleanId.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (m) cleanId = m[1];
    } else if (cleanId.includes('youtu.be/')) {
        const m = cleanId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (m) cleanId = m[1];
    } else if (cleanId.length > 11 && !cleanId.startsWith('http')) {
        cleanId = cleanId.slice(0, 11);
    }

    const key = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_TRANSCRIPT_API_KEY;
    const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(cleanId)}`;

    console.log(`[TranscriptAPI] Fetching transcript fallback for video: ${cleanId}...`);
    let resp = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${key}`
        }
    });

    // If 408 (retry) or 503, retry once after 1.5 seconds
    if (resp.status === 408 || resp.status === 503) {
        console.warn(`[TranscriptAPI] Status ${resp.status}, retrying in 1.5s...`);
        await new Promise(r => setTimeout(r, 1500));
        resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
    }

    let data;
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        try {
            const errJson = JSON.parse(errText);
            // If requested language not found but other languages are available:
            if (errJson && Array.isArray(errJson.available_languages) && errJson.available_languages.length > 0) {
                const targetLang = errJson.available_languages[0].code;
                console.log(`[TranscriptAPI] Retrying with available language: ${targetLang}`);
                const retryUrl = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(cleanId)}&language=${encodeURIComponent(targetLang)}`;
                const retryResp = await fetch(retryUrl, {
                    headers: { 'Authorization': `Bearer ${key}` }
                });
                if (retryResp.ok) {
                    data = await retryResp.json();
                }
            }
        } catch (e) {
            // Not JSON
        }

        if (!data) {
            throw new Error(`TranscriptAPI error (${resp.status}): ${errText || resp.statusText}`);
        }
    } else {
        data = await resp.json();
    }

    if (!data || !Array.isArray(data.transcript) || data.transcript.length === 0) {
        throw new Error('TranscriptAPI returned empty transcript.');
    }

    // Convert segments to formatted "MM:SS Text" or "HH:MM:SS Text"
    const lines = [];
    data.transcript.forEach(seg => {
        if (!seg || typeof seg.start === 'undefined') return;
        const totalSec = Math.floor(Number(seg.start) || 0);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = Math.floor(totalSec % 60);
        const timeStr = `${h ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        const textStr = (seg.text || '').replace(/\s+/g, ' ').trim();
        if (textStr) {
            lines.push(`${timeStr} ${textStr}`);
        }
    });

    if (lines.length === 0) {
        throw new Error('TranscriptAPI had no readable text segments.');
    }

    return lines.join('\n');
}

async function callRawAi(prompt, provider, config) {
    if (provider === 'aikit') {
        const token = (config.aiToken && config.aiToken.trim()) ? config.aiToken.trim() : DEFAULT_AIKIT_TOKEN;
        let model = (config.aiModel && config.aiModel.trim()) ? config.aiModel.trim() : DEFAULT_AIKIT_MODEL;
        if (!model.startsWith('qwen')) {
            model = DEFAULT_AIKIT_MODEL;
        }
        let baseUrl = (config.aiBaseUrl && config.aiBaseUrl.trim()) ? config.aiBaseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;
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

    } else if (provider === 'custom') {
        // Custom OpenAI-Compatible Provider (Local e.g. 127.0.0.1:8002/v1 or Remote)
        let baseUrl = (config.customUrl && config.customUrl.trim()) ? config.customUrl.trim() : 'http://127.0.0.1:8002/v1';
        baseUrl = baseUrl.replace(/\/+$/, '');
        const model = (config.customModel && config.customModel.trim()) ? config.customModel.trim() : 'qwen3.8-flash';
        const apiKey = (config.customApiKey && config.customApiKey.trim()) ? config.customApiKey.trim() : '';

        const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
        console.log("Using Custom AI endpoint:", endpoint, "Model:", model);

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes for full 128k context requests

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 16384
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Custom Provider Error (${response.status}): ${errorData.error?.message || errorData.message || response.statusText}`);
            }

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content || '';
            if (!content && data.choices?.[0]?.message?.reasoning_content) {
                content = data.choices[0].message.reasoning_content;
            }
            content = cleanAiOutput(content);
            return content;
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
                throw new Error(`Custom Provider request timed out (300s). Endpoint: ${endpoint}`);
            }
            throw fetchErr;
        }

    } else {
        // OpenRouter Provider
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
        let content = data.choices?.[0]?.message?.content || '';
        if (!content && data.choices?.[0]?.message?.reasoning_content) {
            content = data.choices[0].message.reasoning_content;
        }
        return cleanAiOutput(content);
    }
}

const actionApi = (typeof browser !== 'undefined' && browser.action) || 
                  (typeof chrome !== 'undefined' && chrome.action) || 
                  (typeof browser !== 'undefined' && browser.browserAction) || 
                  (typeof chrome !== 'undefined' && chrome.browserAction);

if (actionApi && actionApi.onClicked) {
    actionApi.onClicked.addListener((tab) => {
        const runtimeApi = (typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : chrome.tabs;
        runtimeApi.sendMessage(tab.id, { action: 'toggleDashboard' }).catch(err => {
            console.warn("Could not toggle dashboard. Ensure you are on YouTube.", err);
        });
    });
}
