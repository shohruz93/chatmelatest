const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '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';

const langs = [
    { code: 'ru', name: 'Russian' },
    { code: 'tj', name: 'Tajik' },
    { code: 'es', name: 'Spanish' },
    { code: 'ar', name: 'Arabic' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Simplified Chinese' },
    { code: 'hi', name: 'Hindi' },
    { code: 'fa', name: 'Persian' }
];

const i18nPath = path.join(__dirname, 'public', 'i18n');
const enData = JSON.parse(fs.readFileSync(path.join(i18nPath, 'en.json'), 'utf8'));

// Helper to get missing keys
function getMissing(source, target) {
    let missing = {};
    let hasMissing = false;
    for (let key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key] || typeof target[key] !== 'object') {
                missing[key] = source[key];
                hasMissing = true;
            } else {
                let subMissing = getMissing(source[key], target[key]);
                if (subMissing.hasMissing) {
                    missing[key] = subMissing.missing;
                    hasMissing = true;
                }
            }
        } else {
            if (target[key] === undefined) {
                missing[key] = source[key];
                hasMissing = true;
            }
        }
    }
    return { missing, hasMissing };
}

// Deep merge
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

async function groqTranslate(missingJsonObj, langName) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional JSON translator. Translate the values of the following JSON object to ${langName}. Preserve all keys exactly. Preserve all variables like {{name}} or {{count}}. DO NOT output any markdown blocks like \`\`\`json. Output ONLY the raw JSON object string so it can be parsed with JSON.parse().`
                },
                {
                    role: 'user',
                    content: JSON.stringify(missingJsonObj)
                }
            ],
            temperature: 0.1
        });

        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error('API Error:', data);
                    return reject(new Error('API failed with ' + res.statusCode));
                }
                try {
                    const response = JSON.parse(data);
                    let resultContent = response.choices[0].message.content.trim();
                    // Just in case the model returns markdown block
                    if (resultContent.startsWith('```json')) {
                        resultContent = resultContent.replace(/^```json/, '').replace(/```$/, '').trim();
                    }
                    if (resultContent.startsWith('```')) {
                        resultContent = resultContent.replace(/^```/, '').replace(/```$/, '').trim();
                    }
                    const translatedJson = JSON.parse(resultContent);
                    resolve(translatedJson);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    for (const lang of langs) {
        const filePath = path.join(i18nPath, `${lang.code}.json`);
        let langData = {};
        if (fs.existsSync(filePath)) {
            langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        const { missing, hasMissing } = getMissing(enData, langData);
        
        if (!hasMissing) {
            console.log(`[${lang.code}] already fully translated.`);
            continue;
        }

        console.log(`[${lang.code}] Translating missing keys...`);
        let success = false;
        let retries = 3;
        while (!success && retries > 0) {
            try {
                const translatedObj = await groqTranslate(missing, lang.name);
                const merged = deepMerge(langData, translatedObj);
                fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
                console.log(`[${lang.code}] Successfully updated.`);
                success = true;
                
                // Wait 45 seconds to refresh TPM rate limit (12000 TPM, each takes ~8000)
                console.log('Waiting 45 seconds for rate limit...');
                await new Promise(r => setTimeout(r, 45000));
            } catch (err) {
                console.error(`[${lang.code}] Failed to translate:`, err.message);
                retries--;
                if (retries > 0) {
                    console.log(`Retrying in 40 seconds...`);
                    await new Promise(r => setTimeout(r, 40000));
                }
            }
        }
    }
    console.log('All translations done!');
}

run();
