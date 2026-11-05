/**
 * YT Smart Chapters Pro — embed launcher
 *
 * On any site that has a YouTube video embedded, show a small launcher and ask the panel
 * inside the embed frame to open. The panel itself runs in the frame (content.js) because
 * a cross-origin iframe cannot be inspected or controlled from this page.
 */
(() => {
    'use strict';

    const EMBED_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{11})/;
    let button = null;
    let scheduled = false;

    function findEmbed() {
        for (const frame of document.querySelectorAll('iframe')) {
            const src = frame.src || frame.getAttribute('data-src') || '';
            if (EMBED_RE.test(src)) return frame;
        }
        return null;
    }

    function createButton() {
        const el = document.createElement('div');
        el.id = 'ytsk-embed-launcher';
        el.textContent = '\u26A1';
        el.title = 'Open YT Smart Chapters for this embedded video';
        el.setAttribute('role', 'button');
        el.style.cssText = [
            'position:fixed', 'right:16px', 'bottom:16px', 'width:44px', 'height:44px',
            'border-radius:50%', 'background:#D97757', 'color:#fff', 'display:flex',
            'align-items:center', 'justify-content:center', 'font-size:20px',
            'cursor:pointer', 'z-index:2147483647', 'box-shadow:0 6px 18px rgba(0,0,0,.28)',
            'user-select:none', 'font-family:system-ui,sans-serif'
        ].join(';');
        el.addEventListener('click', () => {
            const frame = findEmbed();
            if (!frame || !frame.contentWindow) return;
            frame.contentWindow.postMessage({ type: 'YTSK_TOGGLE_PANEL' }, '*');
            if (frame.scrollIntoView) frame.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return el;
    }

    function refresh() {
        scheduled = false;
        if (!document.body) return;
        const frame = findEmbed();
        if (!frame) {
            if (button) { button.remove(); button = null; }
            return;
        }
        if (!button) button = createButton();
        if (!button.isConnected) document.body.appendChild(button);
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        setTimeout(refresh, 400);
    }

    if (document.body) schedule();
    else document.addEventListener('DOMContentLoaded', schedule, { once: true });

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
