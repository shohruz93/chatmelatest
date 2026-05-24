import { Component, OnInit, OnDestroy, inject, signal, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { AiService } from '../../services/ai.service';
import { AiMemoryService, AiMemoryProfile, AiChatMessage } from '../../services/ai-memory.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-learning',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './learning.component.html',
    styleUrls: ['./learning.component.css']
})
export class LearningComponent implements OnInit, OnDestroy, AfterViewChecked {
    public languageService = inject(LanguageService);
    private aiService = inject(AiService);
    public aiMemory = inject(AiMemoryService);
    private authService = inject(AuthService);

    @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

    // Chat State
    messageText = '';
    isTyping = signal(false);
    messages = this.aiMemory.chatHistory;
    memoryProfile = this.aiMemory.memoryProfile;

    // UI Toggles
    showSidebar = signal(false);

    // Voice Call States (Integrated seamlessly)
    isVoiceMode = signal(false);
    voiceCallStatus = signal('Гӯш карда истодаам...');
    voiceRecognitionLang = signal('ru-RU');
    isMouthMoving = signal(false);

    // Cooldown state
    cooldownTimer = signal(0);
    private cooldownInterval: any;

    private recognition: any = null;
    private speechTimeout: any = null;
    private currentAudioElement: HTMLAudioElement | null = null;
    private msgCountSinceExtraction = 0;

    constructor() {
        effect(() => {
            // Optional: reacts to message changes if needed
            const msgs = this.messages();
            if (msgs.length > 0) {
                this.scrollToBottom();
            }
        });
    }

    ngOnInit() {
        // Init TTS and STT
        this.initSpeechRecognition();

        // If chat is empty, AI starts
        if (this.messages().length === 0) {
            this.sendWelcomeMessage();
        }
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    private scrollToBottom() {
        try {
            if (this.chatScrollContainer) {
                const el = this.chatScrollContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        } catch (err) { }
    }

    private sendWelcomeMessage() {
        const currentUser = this.authService.currentUserValue;
        const name = currentUser ? (currentUser.displayName || currentUser.name || currentUser.username) : this.languageService.translate('LEARNING.MY_FRIEND');

        // Get native language based on the app's current language selection
        const langCode = this.languageService.currentLang();
        const langKey = langCode.toUpperCase() === 'TJ' || langCode.toUpperCase() === 'RU' ? langCode.toUpperCase() : 'EN';
        const nativeLangStr = this.languageService.translate(`LEARNING.LANG_${langKey}`);
        const englishNativeLang = langCode === 'tj' ? 'Tajik' : (langCode === 'ru' ? 'Russian' : 'English');

        let text = this.languageService.translate('LEARNING.WELCOME_MSG_1', { name });
        if (currentUser) {
            text += ' ' + this.languageService.translate('LEARNING.WELCOME_MSG_2', { lang: nativeLangStr });
        } else {
            text += ' ' + this.languageService.translate('LEARNING.WELCOME_MSG_3');
        }

        this.aiMemory.addChatMessage('ai', text);

        // Pre-fill native language in AI memory
        const profile = this.aiMemory.memoryProfile();
        if (profile.nativeLanguage === 'Unknown') {
            this.aiMemory.saveMemory({ nativeLanguage: englishNativeLang });
        }
    }

    sendMessage() {
        const text = this.messageText.trim();
        if (!text || this.cooldownTimer() > 0) return;

        this.messageText = '';
        this.aiMemory.addChatMessage('user', text);
        this.msgCountSinceExtraction++;

        this.isTyping.set(true);

        const memoryPrompt = this.aiMemory.getMemoryPromptString();
        const profile = this.aiMemory.memoryProfile();

        // Get User Info from Auth Service
        const currentUser = this.authService.currentUserValue;
        const userInfo = currentUser
            ? `USER PROFILE:\n- Name: ${currentUser.displayName || currentUser.name || currentUser.username}\n- Gender: ${currentUser.gender || 'Unknown'}\n- Location: ${currentUser.location || 'Unknown'}`
            : 'USER PROFILE: Unknown';

        // Determine languages based on AI Memory or fallback to app defaults if unknown
        const nativeLang = profile.nativeLanguage !== 'Unknown' ? profile.nativeLanguage : (this.languageService.currentLang() === 'tj' ? 'Tajik' : 'Russian');
        const learningLang = profile.learningLanguage !== 'Unknown' ? profile.learningLanguage : 'Unknown';

        const fullMemoryPrompt = `${userInfo}\n\n${memoryPrompt}`;

        this.aiService.askAiTutor(text, fullMemoryPrompt, this.messages(), learningLang, nativeLang).subscribe({
            next: (res) => {
                this.aiMemory.addChatMessage('ai', res);
                this.isTyping.set(false);

                // If in voice mode, speak it
                if (this.isVoiceMode()) {
                    this.voiceCallStatus.set('ИИ ҷавоб медиҳад...');
                    this.speakFallback(res);
                }

                // Check if we should extract memory
                if (this.msgCountSinceExtraction >= 4) {
                    this.triggerMemoryExtraction();
                }
            },
            error: (err) => {
                if (err && err.message === 'RATE_LIMIT') {
                    this.startCooldown();
                    this.aiMemory.addChatMessage('ai', this.languageService.translate('LEARNING.RATE_LIMIT_MSG'));
                } else {
                    this.aiMemory.addChatMessage('ai', this.languageService.translate('LEARNING.ERROR_MSG'));
                }
                this.isTyping.set(false);
            }
        });
    }

    startCooldown() {
        this.cooldownTimer.set(60);
        if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        this.cooldownInterval = setInterval(() => {
            this.cooldownTimer.update(t => t - 1);
            if (this.cooldownTimer() <= 0) {
                clearInterval(this.cooldownInterval);
            }
        }, 1000);
    }

    private triggerMemoryExtraction() {
        this.msgCountSinceExtraction = 0;
        const recentMsgs = this.messages().slice(-6).map(m => m.sender + ": " + m.text).join('\n');

        this.aiService.extractMemory(recentMsgs).subscribe(data => {
            if (!data) return;

            const currentMem = this.memoryProfile();
            const newInterests = data.newInterests || [];
            const newKnown = data.newKnownWords || [];
            const newMistakes = data.newMistakes || [];

            const mergedInterests = Array.from(new Set([...currentMem.interests, ...newInterests]));
            const mergedKnown = Array.from(new Set([...currentMem.knownWords, ...newKnown]));
            const mergedMistakes = Array.from(new Set([...currentMem.recentMistakes, ...newMistakes]));

            this.aiMemory.saveMemory({
                interests: mergedInterests,
                knownWords: mergedKnown,
                recentMistakes: mergedMistakes,
                currentLevel: data.levelEstimate || currentMem.currentLevel
            });

            if (data.scoreIncrease) {
                this.aiMemory.addProgressScore(data.scoreIncrease);
            }
        });
    }

    toggleSidebar() {
        this.showSidebar.update(v => !v);
    }

    toggleVoiceMode() {
        const next = !this.isVoiceMode();
        this.isVoiceMode.set(next);
        if (next) {
            this.voiceCallStatus.set('Гӯш карда истодаам...');
            this.startListening();
        } else {
            this.stopListening();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    }

    clearChat() {
        if (confirm('Тамоми суҳбатро тоза кунем?')) {
            this.aiMemory.clearChatHistory();
            this.sendWelcomeMessage();
        }
    }

    // ==========================================
    // VOICE LOGIC (Reused and Simplified)
    // ==========================================
    private initSpeechRecognition() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.voiceRecognitionLang();

        this.recognition.onstart = () => {
            if (this.isVoiceMode()) this.voiceCallStatus.set('Гӯш карда истодаам...');
        };

        this.recognition.onresult = (event: any) => {
            const text = (event.results[0][0].transcript || '').trim();
            if (!text || text.length < 2) {
                this.startListening();
                return;
            }
            this.voiceCallStatus.set('ИИ фикр дорад...');
            this.messageText = text;
            this.sendMessage(); // Automatically send
        };

        this.recognition.onerror = (event: any) => {
            if (event.error === 'no-speech' && this.isVoiceMode()) {
                this.startListening();
            }
        };

        this.recognition.onend = () => {
            if (this.isVoiceMode() && this.voiceCallStatus() === 'Гӯш карда истодаам...') {
                this.startListening();
            }
        };
    }

    private startListening() {
        if (!this.recognition) return;
        try { this.recognition.start(); } catch (e) { }
    }

    private stopListening() {
        if (!this.recognition) return;
        try { this.recognition.stop(); } catch (e) { }
    }

    private speakFallback(text: string) {
        if (this.speechTimeout) clearTimeout(this.speechTimeout);
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            // Normalize for TTS
            const normalizedText = text
                .replace(/ҷ/g, 'ч').replace(/Ҷ/g, 'Ч').replace(/ӯ/g, 'у').replace(/Ӯ/g, 'У')
                .replace(/ғ/g, 'г').replace(/Ғ/g, 'Г').replace(/қ/g, 'к').replace(/Қ/g, 'К')
                .replace(/ҳ/g, 'х').replace(/Ҳ/g, 'Х').replace(/ӣ/g, 'и').replace(/Ӣ/g, 'И');

            const utterance = new SpeechSynthesisUtterance(normalizedText);
            utterance.lang = 'ru-RU'; // Use Russian voice

            utterance.onstart = () => this.isMouthMoving.set(true);
            utterance.onend = () => {
                this.isMouthMoving.set(false);
                if (this.isVoiceMode()) {
                    this.voiceCallStatus.set('Гӯш карда истодаам...');
                    this.startListening();
                }
            };
            utterance.onerror = () => {
                this.isMouthMoving.set(false);
                if (this.isVoiceMode()) {
                    this.voiceCallStatus.set('Гӯш карда истодаам...');
                    this.startListening();
                }
            };

            setTimeout(() => window.speechSynthesis.speak(utterance), 100);
        }
    }

    ngOnDestroy() {
        this.stopListening();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
        }
    }
}

