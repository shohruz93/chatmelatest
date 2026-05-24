import { Injectable, signal } from '@angular/core';

export interface AiMemoryProfile {
    interests: string[];
    knownWords: string[];
    recentMistakes: string[];
    currentLevel: string;
    personality: string;
    progressHistory: { date: string; score: number }[];
    totalXp: number;
    nativeLanguage: string;
    learningLanguage: string;
}

export interface AiChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class AiMemoryService {
    private readonly MEMORY_KEY = 'chatme_ai_memory_profile';
    private readonly CHAT_KEY = 'chatme_ai_chat_history';

    public memoryProfile = signal<AiMemoryProfile>(this.loadMemory());
    public chatHistory = signal<AiChatMessage[]>(this.loadChatHistory());

    constructor() {}

    private loadMemory(): AiMemoryProfile {
        const stored = localStorage.getItem(this.MEMORY_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure all arrays exist
                return {
                    interests: parsed.interests || [],
                    knownWords: parsed.knownWords || [],
                    recentMistakes: parsed.recentMistakes || [],
                    currentLevel: parsed.currentLevel || 'Beginner',
                    personality: parsed.personality || 'Friendly and funny',
                    progressHistory: parsed.progressHistory || [],
                    totalXp: parsed.totalXp || 0,
                    nativeLanguage: parsed.nativeLanguage || 'Unknown',
                    learningLanguage: parsed.learningLanguage || 'Unknown'
                };
            } catch (e) {
                console.error('Failed to parse AI memory', e);
            }
        }
        
        // Default
        const todayStr = new Date().toISOString().split('T')[0];
            return {
                interests: [],
                knownWords: [],
                recentMistakes: [],
                currentLevel: 'Beginner',
                personality: 'Friendly and funny',
                progressHistory: [{ date: todayStr, score: 10 }],
                totalXp: 10,
                nativeLanguage: 'Unknown',
                learningLanguage: 'Unknown'
            };
    }

    private loadChatHistory(): AiChatMessage[] {
        const stored = localStorage.getItem(this.CHAT_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {}
        }
        return [];
    }

    public saveMemory(profile: Partial<AiMemoryProfile>) {
        const current = this.memoryProfile();
        const updated = { ...current, ...profile };
        localStorage.setItem(this.MEMORY_KEY, JSON.stringify(updated));
        this.memoryProfile.set(updated);
    }

    public addChatMessage(sender: 'user' | 'ai', text: string) {
        const current = this.chatHistory();
        const newMsg: AiChatMessage = {
            id: crypto.randomUUID(),
            sender,
            text,
            timestamp: Date.now()
        };
        const updated = [...current, newMsg];
        
        // Keep only last 100 messages to prevent localStorage overflow
        if (updated.length > 100) {
            updated.splice(0, updated.length - 100);
        }
        
        localStorage.setItem(this.CHAT_KEY, JSON.stringify(updated));
        this.chatHistory.set(updated);
    }

    public clearChatHistory() {
        localStorage.removeItem(this.CHAT_KEY);
        this.chatHistory.set([]);
    }

    public addProgressScore(points: number) {
        const current = this.memoryProfile();
        const todayStr = new Date().toISOString().split('T')[0];
        
        let history = [...current.progressHistory];
        const todayEntry = history.find(h => h.date === todayStr);
        
        if (todayEntry) {
            todayEntry.score += points;
        } else {
            history.push({ date: todayStr, score: points });
        }

        // Keep last 14 days
        if (history.length > 14) {
            history.shift();
        }

        this.saveMemory({ 
            progressHistory: history,
            totalXp: current.totalXp + points
        });
    }

    // Convert memory to a string for the AI system prompt
    public getMemoryPromptString(): string {
        const profile = this.memoryProfile();
        return `
- Native Language: ${profile.nativeLanguage}
- Target Learning Language: ${profile.learningLanguage}
- User Interests: ${profile.interests.length ? profile.interests.join(', ') : 'Unknown yet'}
- User Current Level: ${profile.currentLevel}
- Known Target Words: ${profile.knownWords.length ? profile.knownWords.slice(-20).join(', ') : 'None extracted yet'}
- Recent Mistakes: ${profile.recentMistakes.length ? profile.recentMistakes.slice(-10).join(', ') : 'None'}
`;
    }
}
