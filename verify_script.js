const fs = require('fs');
const path = require('path');

console.log('--- Verifying Extension Architecture ---');

const files = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'content.js'];
files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.log(`✗ ${file} is MISSING`);
        process.exit(1);
    }
});

// Basic content checks
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
if (manifest.manifest_version === 3) {
    console.log('✓ manifest_version is 3');
} else {
    console.log('✗ manifest_version is NOT 3');
    process.exit(1);
}

const contentJs = fs.readFileSync('content.js', 'utf8');
if (contentJs.includes('chrome.runtime.onMessage.addListener')) {
    console.log('✓ content.js has message listener');
} else {
    console.log('✗ content.js is missing message listener');
    process.exit(1);
}

const popupJs = fs.readFileSync('popup.js', 'utf8');
if (popupJs.includes('chrome.storage.local')) {
    console.log('✓ popup.js uses chrome.storage.local');
} else {
    console.log('✗ popup.js is missing chrome.storage.local');
    process.exit(1);
}

console.log('--- Verification Successful ---');
