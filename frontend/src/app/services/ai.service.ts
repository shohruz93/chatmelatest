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
        if (typeof puter === 'undefined' || !puter.ai) {
            return throwError(() => new Error('Puter.js not loaded'));
        }

        // Puter.js chat returns a promise, we wrap it in an Observable
        return from(puter.ai.chat(prompt)).pipe(
            map((res: any) => {
                let text = '';
                
                if (typeof res === 'string') {
                    text = res;
                } else if (res?.result?.message?.content && Array.isArray(res.result.message.content)) {
                    text = res.result.message.content[0]?.text || '';
                } else if (typeof res?.result?.message?.content === 'string') {
                    text = res.result.message.content;
                } else if (res?.message?.content && Array.isArray(res.message.content)) {
                    text = res.message.content[0]?.text || '';
                } else if (typeof res?.message?.content === 'string') {
                    text = res.message.content;
                } else if (res?.text) {
                    text = res.text;
                } else {
                    try { text = JSON.stringify(res); } catch(e) {}
                }

                let cleaned = (typeof text === 'string' ? text : String(text)).trim();
                if (isFix && cleaned.startsWith('`') && cleaned.endsWith('`')) {
                    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
                }
                return cleaned;
            }),
            catchError(err => {
                console.error('Puter AI Chat Error:', err);
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


