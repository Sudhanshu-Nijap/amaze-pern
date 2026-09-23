document.addEventListener('DOMContentLoaded', async () => {
    const urlInput = document.getElementById('urlInput');
    const trackBtn = document.getElementById('trackBtn');
    const messageEl = document.getElementById('message');
    
    const AMAZE_FRONTEND_URL = 'http://localhost';

    const showMessage = (msg, isError = false) => {
        messageEl.textContent = msg;
        messageEl.style.display = 'block';
        messageEl.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
    };

    const trackUrl = (urlToTrack) => {
        if (!urlToTrack || (!urlToTrack.includes('amazon') && !urlToTrack.includes('amzn'))) {
            showMessage("Please enter a valid Amazon URL.", true);
            return;
        }
        const redirectUrl = `${AMAZE_FRONTEND_URL}/result?url=${encodeURIComponent(urlToTrack)}`;
        
        // Use Chrome API if available (in extension), otherwise standard window open (if opening file directly)
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: redirectUrl });
        } else {
            window.open(redirectUrl, '_blank');
        }
    };

    // Handle manual track click
    trackBtn.addEventListener('click', () => {
        trackUrl(urlInput.value.trim());
    });

    try {
        // Try to auto-detect Amazon URL from active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            const isAmazon = tab.url.includes('amazon.in') || tab.url.includes('amazon.com') || tab.url.includes('amazon.co.uk');
            const isProductPage = tab.url.includes('/dp/') || tab.url.includes('/gp/product/');
            
            if (isAmazon && isProductPage) {
                urlInput.value = tab.url;
                showMessage("Product detected! Click Track to analyze.");
            }
        }
    } catch (err) {
        // Ignored. They might just be opening the HTML file directly.
    }
});
