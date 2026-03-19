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
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleDashboard' }).catch(err => {
        console.warn("Could not toggle dashboard. Ensure you are on YouTube.", err);
    });
});
