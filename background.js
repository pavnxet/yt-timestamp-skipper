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

    if (request.action === 'analyzeRemovableSegments') {
        const tabId = sender?.tab?.id;
        analyzeRemovableSegments(request.text, tabId)
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
        const baseUrl = (payload.baseUrl && payload.baseUrl.trim()) ? payload.baseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;
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

    } else {
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
    }
}

async function getAiConfig() {
    return await new Promise(resolve => chrome.storage.local.get([
        'aiProvider', 
        'aiToken', 
        'aiModel', 
        'aiBaseUrl', 
        'openrouterKey',
        'openrouterModel'
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

async function generateChapters(text, tabId = null) {
    console.log("Generating chapters for text length:", text.length);
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

        if (allTableRows.length > 0) {
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
            const intervalsStr = allIntervals.join('\n');
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

    // If first speech happens at >= 5 seconds (e.g. 12s, 15s), the gap from 0 to speech start is an intro/silence
    if (firstSpeechSec < 5) {
        return rawResult;
    }

    const startTs = "00:00:00";
    const endTs = formatSec(firstSpeechSec);
    const { rows, intervals } = parseRemovableResponse(rawResult || '');

    // Check if an existing segment already covers from 00:00:00
    let alreadyHasStartCovered = false;
    for (const intv of intervals) {
        const m = intv.match(/\[\s*(\d{1,2}(?::\d{2}){1,2})\s*\]\s*-\s*\[\s*(\d{1,2}(?::\d{2}){1,2})\s*\]/);
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

    // If there is an existing segment starting around 0 to firstSpeechSec, extend or insert
    const introRow = `| 1 | ${startTs} | ${endTs} | INTRO           | Initial intro/silence before speech starts |`;
    const introInterval = `[${startTs}]-[${endTs}]`;

    // Filter out any segment that was starting at firstSpeechSec if it was classified as INTRO to avoid micro-duplication, or prepend
    const updatedRows = [introRow, ...rows];
    const updatedIntervals = [introInterval, ...intervals];

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

    return `${header}\n${renumbered.join('\n')}\n\n${updatedIntervals.join('\n')}`;
}

function parseRemovableResponse(rawText) {
    if (!rawText) return { rows: [], intervals: [] };
    const lines = rawText.split('\n');
    const rows = [];
    const intervals = [];
    const intvRegex = /\[\s*(\d{1,2}(?::\d{2}){1,2})\s*\]\s*-\s*\[\s*(\d{1,2}(?::\d{2}){1,2})\s*\]/;

    lines.forEach(l => {
        const trimmed = l.trim();
        if (trimmed.startsWith('|') && !trimmed.toLowerCase().includes('category') && !/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
            rows.push(trimmed);
        } else {
            const m = trimmed.match(intvRegex);
            if (m) {
                intervals.push(`[${m[1]}]-[${m[2]}]`);
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
Use the timestamps provided in the transcript.
Format: [HH:MM:SS]-[HH:MM:SS] (or [00:MM:SS] if MM:SS).

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

async function callRawAi(prompt, provider, config) {
    if (provider === 'aikit') {
        const token = (config.aiToken && config.aiToken.trim()) ? config.aiToken.trim() : DEFAULT_AIKIT_TOKEN;
        let model = (config.aiModel && config.aiModel.trim()) ? config.aiModel.trim() : DEFAULT_AIKIT_MODEL;
        if (!model.startsWith('qwen')) {
            model = DEFAULT_AIKIT_MODEL;
        }
        const baseUrl = (config.aiBaseUrl && config.aiBaseUrl.trim()) ? config.aiBaseUrl.trim().replace(/\/+$/, '') : DEFAULT_AIKIT_URL;
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
        return data.choices?.[0]?.message?.content || '';
    }
}

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDashboard' }).catch(err => {
        console.warn("Could not toggle dashboard. Ensure you are on YouTube.", err);
    });
});
