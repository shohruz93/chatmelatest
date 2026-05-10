import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, timeout, switchMap, of } from 'rxjs';

export interface AiSuggestion {
    textToSend: string;
    textToDisplay: string;
}

@Injectable({
    providedIn: 'root'
})
export class AiService {
    // Primary: RWKV Space
    private rwkvBaseUrl = 'https://blinkdl-rwkv-gradio-1.hf.space/';
    private rwkvInitiateUrl = 'https://blinkdl-rwkv-gradio-1.hf.space/gradio_api/call/evaluate';
    
    // Fallback: Pollinations AI
    private pollinationsUrl = 'https://text.pollinations.ai/';

    private chat(prompt: string, isFix: boolean = false): Observable<string> {
        // Improved prompt for RWKV to prevent looping and labels
        const formattedPrompt = isFix 
            ? `Instruction: Correct the grammar and spelling of the text below. Use the same script (Cyrillic or Latin) as the input. Return ONLY the corrected text.\nInput: ${prompt}\nResponse:`
            : `Instruction: ${prompt}\nResponse:`;

        const body = JSON.stringify({
            data: [
                formattedPrompt,
                200,  // token_count
                0.2,  // temperature (Lower for stability)
                0.3,  // top_p
                0.4,  // presencePenalty (Higher to prevent repetition)
                0.4,  // countPenalty (Higher to prevent repetition)
                0.99  // penalty_decay
            ]
        });

        const fetchInitiate = fetch(this.rwkvInitiateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        }).then(async res => {
            if (!res.ok) throw new Error(`RWKV Initiate Error ${res.status}`);
            const json = await res.json();
            if (json.event_id) return json.event_id;
            throw new Error('No event_id returned from RWKV');
        });

        return from(fetchInitiate).pipe(
            switchMap(eventId => this.pollRwkvResult(eventId)),
            timeout(20000),
            map(res => this.cleanRwkvResponse(res)),
            catchError(err => {
                console.warn('RWKV failed, falling back to DeepSeek:', err);
                return this.chatFallback(prompt);
            })
        );
    }

    private cleanRwkvResponse(text: string): string {
        // RWKV sometimes includes labels or repeats them. Clean them up.
        let cleaned = text.replace(/Response:|Instruction:|Input:|Corrected text:/gi, '').trim();
        // If it still contains a loop or is very long/repetitive, we might want to flag it, 
        // but for now just returning the trimmed version.
        return cleaned;
    }

    private pollRwkvResult(eventId: string): Observable<string> {
        const statusUrl = `${this.rwkvBaseUrl}gradio_api/call/evaluate/${eventId}`;
        
        const fetchResult = fetch(statusUrl).then(async res => {
            if (!res.ok) throw new Error(`RWKV Status Error ${res.status}`);
            const reader = res.body?.getReader();
            if (!reader) throw new Error('No reader');

            let lastData = '';
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (Array.isArray(data) && data.length > 0) {
                                lastData = data[0];
                            }
                        } catch (e) {}
                    }
                }
            }
            
            if (lastData) return lastData;
            throw new Error('Empty stream');
        });

        return from(fetchResult);
    }

    private chatFallback(prompt: string): Observable<string> {
        const body = JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'deepseek'
        });

        return from(fetch(this.pollinationsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        }).then(res => res.ok ? res.text() : Promise.reject('Fallback failed'))).pipe(
            map(t => t.trim()),
            catchError(() => of("Бубахшед, хатогӣ рӯй дод."))
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
                console.log('AI Raw Response:', response);
                
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
                
                console.log('Parsed Suggestions Final:', suggestions);
                return suggestions;
            })
        );


    }

    askAi(question: string): Observable<string> {
        return this.chat(question);
    }
}


