const fetch = require('node-fetch');

async function debugFetch() {
    const url = 'https://shphbjeio23.chatme.tj/profile?userId=1';
    console.log(`Checking ${url}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
        console.log('Timeout triggered (10s)');
        controller.abort();
    }, 10000);

    try {
        const start = Date.now();
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        console.log(`Response received in ${Date.now() - start}ms`);
        console.log(`Status: ${response.status} ${response.statusText}`);
    } catch (err) {
        clearTimeout(timeout);
        console.error('Fetch caught error:');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Errno:', err.errno);
        console.error('Stack:', err.stack);
    }
}

async function runMultiple() {
    for (let i = 0; i < 5; i++) {
        console.log(`--- Attempt ${i + 1} ---`);
        await debugFetch();
        await new Promise(r => setTimeout(r, 1000));
    }
}

runMultiple();
