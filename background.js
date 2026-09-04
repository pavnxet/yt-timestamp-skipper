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
        generateChapters(request.text)
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

async function generateChapters(text) {
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

    const ONE_HOUR = 3600; // 3600 seconds = 1 hour
    if (maxTimestampSec > ONE_HOUR + 300) { // More than 1 hour (with 5 min grace)
        const totalHours = Math.ceil(maxTimestampSec / ONE_HOUR);
        console.log(`Long lecture detected (~${(maxTimestampSec / 3600).toFixed(1)} hrs). Splitting into ${totalHours} hourly chunks (1 hour per chunk)...`);

        const hourChunks = [];
        for (let h = 0; h < totalHours; h++) {
            hourChunks.push([]);
        }

        let currentHourBucket = 0;
        for (const line of lines) {
            const m = line.match(tsRegex);
            if (m) {
                const s = parseSec(m[1]);
                currentHourBucket = Math.min(totalHours - 1, Math.floor(s / ONE_HOUR));
            }
            hourChunks[currentHourBucket].push(line);
        }

        const validChunks = hourChunks
            .map(c => c.join('\n'))
            .filter(c => c.trim().length > 0);

        console.log(`Created ${validChunks.length} hourly chunks. Processing sequentially...`);
        const tableRows = [];

        for (let i = 0; i < validChunks.length; i++) {
            console.log(`Processing Hour ${i + 1}/${validChunks.length}...`);
            const chunkResult = await callAiForChapters(validChunks[i], provider, config);
            if (chunkResult) {
                chunkResult.split('\n').forEach(l => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('question start') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
                        tableRows.push(trimmed);
                    }
                });
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
    const prompt = `## ROLE

You are an expert **video/audio lecture analyst and timestamp extraction specialist**. Your task is to analyze the entire recording carefully and extract structured, second-accurate timestamps for every multiple-choice question discussed by the teacher.

## MISSION

Identify **every question presented or discussed in the recording**, determine its correct option from the teacher's own explanation or identification, and record three precise timestamps:

1. **Question Start Timestamp** — when the teacher begins presenting/reading the question.
2. **Correct Option Timestamp** — the exact second when the teacher explicitly states, reveals, identifies, or clearly confirms the correct option (A/B/C/D).
3. **Answer Start Timestamp** — when the teacher begins explaining the answer/reasoning after revealing or establishing the correct option.

Do not omit questions merely because the teacher moves quickly, repeats a question, or presents it indirectly.

## ANALYSIS INSTRUCTIONS

### 1. Analyze the complete recording

* Process the recording from beginning to end.
* Do not stop after finding an initial set of questions.
* Maintain chronological order based on the actual recording timeline.
* Distinguish individual questions from general discussion, examples, explanations, and unrelated commentary.

### 2. Identify Question Start

For each question, locate the timestamp where the teacher **actually starts presenting the question**.

Use the point where the question itself begins, not:

* the beginning of a preceding discussion,
* the moment options are displayed,
* the moment the teacher asks students to answer,
* or the moment the teacher reveals the answer.

If the teacher introduces a question verbally before reading/displaying it, use the timestamp where the actual question presentation begins.

### 3. Identify the Correct Option

Determine which option is correct **from the recording itself**.

Record the timestamp where the teacher:

* explicitly says the correct option, e.g. "Option B is correct",
* identifies the answer by option letter,
* clearly selects an option,
* or unmistakably reveals the correct option through the answer discussion.

Do **not** infer the correct option merely from outside knowledge.

If the teacher states the answer without saying the letter but clearly identifies one of the displayed options, map it to A/B/C/D only when the recording provides enough evidence to do so reliably.

### 4. Identify Answer Start

Record the timestamp where the teacher **begins explaining why the answer is correct**.

This should be the beginning of the substantive answer explanation, not merely:

* the moment the teacher says "correct",
* a brief confirmation,
* reading the correct option,
* or a transition such as "now let's see why."

If the explanation starts immediately after the correct-option reveal, use that exact second.

### 5. Handle ambiguous cases carefully

* Use **HH:MM:SS** timestamps accurate to the nearest second.
* Never fabricate or guess a timestamp.
* If the exact boundary falls between seconds, choose the second in which the relevant speech/action actually begins.
* If audio/video synchronization is imperfect, prioritize the actual recording timeline.
* If the teacher revisits the same question, treat it as the same question unless a genuinely new question is introduced.
* If a question is repeated for clarification, do not create a duplicate Q# unless it is clearly a separate question.
* If the teacher discusses an answer before explicitly stating the option letter, identify the correct-option timestamp at the earliest point where the correct option becomes unambiguous from the teacher's words.
* If the correct option cannot be determined reliably from the recording, do not invent one; mark it as **"Unclear"** and still provide the available timestamps.
* If no substantive answer explanation occurs, mark **Answer Start** as **"N/A"** rather than inventing a timestamp.

## OUTPUT FORMAT

Return **only one table** containing all identified questions in chronological order.

Use exactly these columns:

| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| 1  | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | B              |
| 2  | HH:MM:SS       | HH:MM:SS                 | HH:MM:SS     | D              |

### Formatting Rules

* Number questions sequentially: Q1, Q2, Q3... or 1, 2, 3...
* Use \`HH:MM:SS\` for every available timestamp.
* Do not add explanations, notes, commentary, confidence scores, or summaries outside the table.
* Preserve chronological order.
* Include **all** questions found in the recording.
* The **Correct Option** column must contain only \`A\`, \`B\`, \`C\`, or \`D\`, unless the recording genuinely does not establish the answer, in which case use \`Unclear\`.
* Use \`N/A\` only when a required event genuinely does not occur in the recording.

## QUALITY CONTROL

Before producing the final table, internally verify every row:

* Does the Question Start timestamp correspond to the beginning of that specific question?
* Does the Correct Option Timestamp correspond to the teacher actually identifying/revealing the correct answer?
* Does the Answer Start timestamp correspond to the beginning of substantive explanation?
* Is the correct option supported by the recording?
* Are timestamps accurate to the second?
* Are all questions included?
* Are duplicate/repeated discussions correctly handled?
* Are rows in exact chronological order?
* Have any timestamps or answers been guessed?

Text/Transcript to process:
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
