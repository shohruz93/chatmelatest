const fetch = require('node-fetch');

// Copy of the function from server.js for testing
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    const timeout = options.timeout || 10000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
        ...options,
        signal: controller.signal
    };

    try {
        console.log(`[TEST] Fetching ${url}... (Retries left: ${retries})`);
        const response = await fetch(url, requestOptions);
        clearTimeout(id);

        if (!response.ok && retries > 0 && (response.status >= 500 || response.status === 429)) {
            console.warn(`[TEST] Retrying due to status ${response.status}`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }

        return response;
    } catch (err) {
        clearTimeout(id);
        if (retries > 0) {
            console.warn(`[TEST] Retrying due to error: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

async function runTest() {
    console.log('--- Starting Retry Logic Test ---');

    // Test with a non-existent URL (should retry and then fail)
    try {
        await fetchWithRetry('https://this-domain-does-not-exist-12345.com', { timeout: 2000 }, 2, 500);
    } catch (err) {
        console.log('[TEST] Expected failure caught:', err.message);
    }

    console.log('--- Test Finished ---');
}

runTest();
