import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, timeout, switchMap, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AiSuggestion {
    textToSend: string;
    textToDisplay: string;
}

declare var puter: any;

@Injectable({
    providedIn: 'root'
})
export class AiService {

    private chat(prompt: string, isFix: boolean = false): Observable<string> {
        const apiKey = "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";
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        const requestBody = {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048
        };

        return from(fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        })).pipe(
            switchMap(res => {
                if (!res.ok) {
                    return from(res.json().then(err => {
                        throw new Error(err.error?.message || 'Хатогӣ ҳангоми пайвастшавӣ ба API');
                    }));
                }
                return from(res.json());
            }),
            map((data: any) => {
                let text = data.choices[0].message.content;
                let cleaned = (typeof text === 'string' ? text : String(text)).trim();
                
                if (isFix && cleaned.startsWith('`') && cleaned.endsWith('`')) {
                    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
                }
                return cleaned;
            }),
            catchError(err => {
                console.error('Groq AI Chat Error:', err);
                return of("Бубахшед, хатогӣ рӯй дод. Лутфан дубора кӯшиш кунед.");
            })
        );
    }

    fixSentence(text: string): Observable<string> {
        return this.chat(text, true);
    }

    generateSuggestions(
        history: string,
        myLanguage: string,
        partnerLanguage: string,
        myName: string
    ): Observable<AiSuggestion[]> {
        const prompt = `Analyze conversation for '${myName}'. Generate 3 short natural reply options. Format: "Text in ${partnerLanguage} | Text in ${myLanguage}".\nHistory:\n${history}`;

        return this.chat(prompt).pipe(
            map(response => {
                // Try to split by newlines first
                let lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                // If only one line, maybe it's comma separated or just one suggestion
                if (lines.length === 1 && lines[0].includes(',')) {
                    lines = lines[0].split(',').map(l => l.trim());
                }

                const suggestions = lines
                    .map(line => {
                        // Remove common prefixes like "1. ", "- ", "Suggestion: "
                        let cleanLine = line.replace(/^(\d+\.|-|\*|Suggestion:)\s*/i, '').trim();
                        
                        if (cleanLine.includes('|')) {
                            const parts = cleanLine.split('|');
                            return {
                                textToSend: parts[0]?.trim() || '',
                                textToDisplay: parts[1]?.trim() || parts[0]?.trim() || ''
                            };
                        } else {
                            return {
                                textToSend: cleanLine,
                                textToDisplay: cleanLine
                            };
                        }
                    })
                    .filter(s => s.textToSend.length > 2 && !s.textToSend.toLowerCase().includes('instruction:'))
                    .slice(0, 3);
                
                return suggestions;
            })
        );


    }

    generateIcebreakers(
        myInterests: string[],
        partnerInterests: string[],
        myLanguage: string,
        partnerLanguage: string
    ): Observable<AiSuggestion[]> {
        const myInts = myInterests.join(", ");
        const partnerInts = partnerInterests.join(", ");
        const prompt = `Act as a social icebreaker assistant.
User A interests: ${myInts}
User B interests: ${partnerInts}

Generate 3 short, engaging, and friendly icebreaker questions or conversation starters that User A can send to User B.
The questions MUST be written in User B's language: '${partnerLanguage}'.
BUT, you must also provide a translation of each question into User A's language: '${myLanguage}'.
Format each suggestion strictly as "Text in ${partnerLanguage} | Text in ${myLanguage}" on a single line.
Do not include any numbering, bullets, or extra text.`;

        return this.chat(prompt).pipe(
            map(response => {
                let lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length === 1 && lines[0].includes(',')) {
                    lines = lines[0].split(',').map(l => l.trim());
                }
                return lines.map(line => {
                    let cleanLine = line.replace(/^(\d+\.|-|\*|Suggestion:)\s*/i, '').trim();
                    if (cleanLine.includes('|')) {
                        const parts = cleanLine.split('|');
                        return { textToSend: parts[0]?.trim() || '', textToDisplay: parts[1]?.trim() || parts[0]?.trim() || '' };
                    } else {
                        return { textToSend: cleanLine, textToDisplay: cleanLine };
                    }
                }).filter(s => s.textToSend.length > 2).slice(0, 3);
            })
        );
    }

    askAi(question: string): Observable<string> {
        return this.chat(question);
    }

    generateImage(prompt: string): Observable<string> {
        if (typeof puter === 'undefined' || !puter.ai) {
            return throwError(() => new Error('Puter.js not loaded'));
        }
        // Explicitly specifying model to avoid "Missing model" error
        return from(puter.ai.txt2img(prompt, { model: 'gpt-image-1-mini' })).pipe(
            map((res: any) => {
                // Puter.js txt2img often returns an HTMLImageElement
                if (res instanceof HTMLImageElement) return res.src;
                if (res?.src) return res.src;
                // If it's a blob, we need to create a URL
                if (res instanceof Blob) return URL.createObjectURL(res);
                // If it's a string (URL)
                if (typeof res === 'string') return res;
                return res;
            }),
            catchError(err => {
                console.error('Puter AI txt2img Error:', err);
                return throwError(() => err);
            })
        );
    }

    textToSpeech(text: string): Promise<any> {
        if (typeof puter === 'undefined' || !puter.ai) {
            console.error('Puter.js not loaded');
            return Promise.reject('Puter.js not loaded');
        }
        
        // Using elevenlabs for better multilingual support (including Tajik)
        return puter.ai.txt2speech(text, { 
            provider: 'elevenlabs', 
            model: 'eleven_multilingual_v2' 
        }).then((res: any) => {
            let audio: HTMLAudioElement;
            if (res && typeof res.play === 'function') {
                audio = res;
            } else if (typeof res === 'string') {
                audio = new Audio(res);
            } else if (res instanceof Blob) {
                audio = new Audio(URL.createObjectURL(res));
            } else {
                throw new Error('Unsupported audio format from Puter');
            }
            
            audio.currentTime = 0; // Reset to start
            return audio.play();
        }).catch((err: any) => {
            console.error('TTS execution failed:', err);
            throw err;
        });
    }

    explainWord(word: string, translation: string = '', targetLang: string = 'en'): Observable<string> {
        const langNames: any = {
            'en': 'English',
            'ru': 'Russian',
            'tj': 'Tajik (Тоҷикӣ)',
            'es': 'Spanish',
            'ar': 'Arabic',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese',
            'hi': 'Hindi',
            'fa': 'Persian'
        };
        const langName = langNames[targetLang] || 'English';

        const prompt = `You are a professional language tutor. 
        Your task is to explain the foreign word/phrase: "${word}".
        The student's native language is: ${langName}.
        Known translation: "${translation}".
        
        Requirements:
        1. Provide the meaning of the foreign word "${word}" in ${langName}.
        2. Provide grammar notes for "${word}" in ${langName}.
        3. Provide an example sentence using "${word}" and its translation in ${langName}.
        
        CRITICAL: Your entire response MUST be written in the ${langName} language. 
        Do not explain "${translation}". Instead, use ${langName} to explain the usage and meaning of "${word}".`;
        return this.chat(prompt);
    }
}


