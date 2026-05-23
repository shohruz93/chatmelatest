import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LearningService, LearningStats, Flashcard } from '../../services/learning.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { AiService } from '../../services/ai.service';

@Component({
    selector: 'app-learning',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './learning.component.html',
    styleUrls: ['./learning.component.css']
})
export class LearningComponent implements OnInit, OnDestroy {
    private learningService = inject(LearningService);
    public languageService = inject(LanguageService);

    stats = signal<LearningStats | null>(null);
    flashcards = signal<Flashcard[]>([]);
    dueCards = signal<Flashcard[]>([]);
    loading = signal(false);

    // Study state
    isStudying = signal(false);
    currentIndex = signal(0);
    showAnswer = signal(false);
    studyFinished = signal(false);

    // New card form
    showAddModal = signal(false);
    newFront = '';
    newBack = '';

    // AI Chat
    private aiService = inject(AiService);
    showAiChat = signal(false);
    aiMessage = '';
    aiChatHistory = signal<{sender: 'user' | 'ai', text: string}[]>([]);
    isAiTyping = signal(false);
    aiExplanation = signal<string | null>(null);
    isExplaining = signal(false);

    // Voice Call States
    isVoiceCallActive = signal(false);
    voiceCallStatus = signal('Иртибот...'); // "Иртибот...", "Гӯш карда истодаам...", "ИИ фикр дорад...", "ИИ ҷавоб медиҳад..."
    isMuted = signal(false);
    isCameraOff = signal(false);
    lastUserSpoken = signal('');
    lastAiSpoken = signal('');
    callDuration = signal('00:00');
    isMouthMoving = signal(false);
    voiceCallInputText = '';
    voiceRecognitionLang = signal('ru-RU');
    showLangDropdown = signal(false);

    recognitionLangs = [
        { code: 'ru-RU', label: 'RU', flag: '🇷🇺', name: 'Русӣ' },
        { code: 'en-US', label: 'EN', flag: '🇺🇸', name: 'Англисӣ (АҚШ)' },
        { code: 'en-GB', label: 'EN-GB', flag: '🇬🇧', name: 'Англисӣ (Бритониё)' },
        { code: 'uz-UZ', label: 'UZ', flag: '🇺🇿', name: 'Ӯзбекӣ' },
        { code: 'fa-IR', label: 'FA', flag: '🇮🇷', name: 'Форсӣ' },
        { code: 'ar-SA', label: 'AR', flag: '🇸🇦', name: 'Арабӣ' },
        { code: 'tr-TR', label: 'TR', flag: '🇹🇷', name: 'Туркӣ' },
        { code: 'de-DE', label: 'DE', flag: '🇩🇪', name: 'Олмонӣ' },
        { code: 'fr-FR', label: 'FR', flag: '🇫🇷', name: 'Фаронсавӣ' },
        { code: 'es-ES', label: 'ES', flag: '🇪🇸', name: 'Испанӣ' },
        { code: 'zh-CN', label: 'ZH', flag: '🇨🇳', name: 'Хитоӣ' },
        { code: 'ja-JP', label: 'JA', flag: '🇯🇵', name: 'Японӣ' },
        { code: 'ko-KR', label: 'KO', flag: '🇰🇷', name: 'Кореягӣ' },
        { code: 'hi-IN', label: 'HI', flag: '🇮🇳', name: 'Ҳиндӣ' },
        { code: 'it-IT', label: 'IT', flag: '🇮🇹', name: 'Итолиёвӣ' },
        { code: 'pt-BR', label: 'PT', flag: '🇧🇷', name: 'Португалӣ' },
        { code: 'uk-UA', label: 'UK', flag: '🇺🇦', name: 'Украинӣ' },
        { code: 'pl-PL', label: 'PL', flag: '🇵🇱', name: 'Полякӣ' },
        { code: 'nl-NL', label: 'NL', flag: '🇳🇱', name: 'Нидерландӣ' },
    ];

    private callTimerInterval: any;
    private callSeconds = 0;
    private mediaStream: MediaStream | null = null;
    private recognition: any = null;
    private currentAudioElement: HTMLAudioElement | null = null;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private speechTimeout: any = null;

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        this.learningService.getStats().subscribe({
            next: (s) => this.stats.set(s),
            error: (err) => console.error('Failed to load stats', err)
        });

        this.learningService.getFlashcards().subscribe({
            next: (cards) => {
                this.flashcards.set(cards);
                this.filterDueCards(cards);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load cards', err);
                this.loading.set(false);
            }
        });
    }

    filterDueCards(cards: Flashcard[]) {
        const now = Date.now();
        this.dueCards.set(cards.filter(c => c.nextReview <= now));
    }

    startStudy() {
        if (this.dueCards().length === 0) return;
        this.isStudying.set(true);
        this.currentIndex.set(0);
        this.showAnswer.set(false);
        this.studyFinished.set(false);
    }

    flipCard() {
        this.showAnswer.set(true);
        this.aiExplanation.set(null);
    }

    getAiExplanation() {
        const card = this.dueCards()[this.currentIndex()];
        const lang = this.languageService.currentLang();
        this.aiExplanation.set(null); // Clear previous
        this.isExplaining.set(true);
        this.aiService.explainWord(card.front, card.back, lang).subscribe({
            next: (res) => {
                this.aiExplanation.set(res);
                this.isExplaining.set(false);
            },
            error: () => {
                this.aiExplanation.set("Бубахшед, шарҳро омода карда нашуд.");
                this.isExplaining.set(false);
            }
        });
    }

    submitGrade(grade: number) {
        const card = this.dueCards()[this.currentIndex()];
        const updated = this.applySM2(card, grade);
        
        // Flip the card back first
        this.showAnswer.set(false);

        // Wait for the flip animation (halfway point) before swapping content
        setTimeout(() => {
            this.learningService.saveFlashcard(updated).subscribe({
                next: () => {
                    if (this.currentIndex() < this.dueCards().length - 1) {
                        this.currentIndex.update(i => i + 1);
                    } else {
                        this.studyFinished.set(true);
                        this.loadData();
                    }
                }
            });
        }, 300);
    }

    private applySM2(card: Flashcard, grade: number): Flashcard {
        let { interval, repetition, efactor } = card;

        if (grade >= 3) {
            if (repetition === 0) {
                interval = 1;
            } else if (repetition === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * efactor);
            }
            repetition++;
        } else {
            repetition = 0;
            interval = 1;
        }

        efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        if (efactor < 1.3) efactor = 1.3;

        const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

        return { ...card, interval, repetition, efactor, nextReview };
    }

    saveNewCard() {
        if (!this.newFront.trim() || !this.newBack.trim()) return;

        const newCard: Flashcard = {
            id: crypto.randomUUID(),
            front: this.newFront,
            back: this.newBack,
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextReview: Date.now()
        };

        this.learningService.saveFlashcard(newCard).subscribe({
            next: () => {
                this.loadData();
                this.showAddModal.set(false);
                this.newFront = '';
                this.newBack = '';
            }
        });
    }

    deleteCard(id: string) {
        if (!confirm('Are you sure?')) return;
        this.learningService.deleteFlashcard(id).subscribe({
            next: () => this.loadData()
        });
    }

    toggleAiChat() {
        this.showAiChat.update(v => !v);
    }

    sendAiMessage() {
        if (!this.aiMessage.trim()) return;
        
        const msg = this.aiMessage;
        this.aiChatHistory.update(h => [...h, {sender: 'user', text: msg}]);
        this.aiMessage = '';
        this.isAiTyping.set(true);

        this.aiService.askAi(msg).subscribe({
            next: (res) => {
                this.aiChatHistory.update(h => [...h, {sender: 'ai', text: res}]);
                this.isAiTyping.set(false);
            },
            error: () => {
                this.aiChatHistory.update(h => [...h, {sender: 'ai', text: 'Sorry, I encountered an error.'}]);
                this.isAiTyping.set(false);
            }
        });
    }

    ngOnDestroy() {
        this.stopVoiceCall();
    }

    startVoiceCall() {
        this.isVoiceCallActive.set(true);
        this.voiceCallStatus.set('Иртибот...');
        this.lastUserSpoken.set('');
        this.lastAiSpoken.set('Салом! Ман тайёрам. Кадом мавзӯъро меомӯзем?');
        
        this.callSeconds = 0;
        this.callDuration.set('00:00');
        this.callTimerInterval = setInterval(() => {
            this.callSeconds++;
            const mins = Math.floor(this.callSeconds / 60).toString().padStart(2, '0');
            const secs = (this.callSeconds % 60).toString().padStart(2, '0');
            this.callDuration.set(`${mins}:${secs}`);
        }, 1000);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                this.mediaStream = stream;
                setTimeout(() => {
                    const videoEl = document.getElementById('userCameraStream') as HTMLVideoElement;
                    if (videoEl) {
                        videoEl.srcObject = stream;
                    }
                }, 300);
                
                this.initSpeechRecognition();
                this.startListening();
                this.speakFallback(this.lastAiSpoken());
            })
            .catch(err => {
                console.warn('Camera/mic access failed or denied, starting voice only', err);
                this.initSpeechRecognition();
                this.startListening();
                this.speakFallback(this.lastAiSpoken());
            });
    }

    stopVoiceCall() {
        this.isVoiceCallActive.set(false);
        if (this.callTimerInterval) {
            clearInterval(this.callTimerInterval);
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        this.stopListening();
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement = null;
        }
        if (this.speechTimeout) {
            clearTimeout(this.speechTimeout);
            this.speechTimeout = null;
        }
        this.currentUtterance = null;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    toggleMute() {
        this.isMuted.update(m => {
            const next = !m;
            if (this.mediaStream) {
                this.mediaStream.getAudioTracks().forEach(track => track.enabled = !next);
            }
            if (next) {
                this.stopListening();
            } else {
                this.startListening();
            }
            return next;
        });
    }

    toggleCamera() {
        this.isCameraOff.update(c => {
            const next = !c;
            if (this.mediaStream) {
                this.mediaStream.getVideoTracks().forEach(track => track.enabled = !next);
            }
            return next;
        });
    }

    sendVoiceCallTextInput() {
        const text = this.voiceCallInputText.trim();
        if (!text || text.length < 1) return;
        this.lastUserSpoken.set(text);
        this.voiceCallInputText = '';
        this.processVoiceCommand(text);
    }

    private initSpeechRecognition() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.voiceRecognitionLang();
        console.log('Speech recognition initialized with lang:', this.recognition.lang);

        this.recognition.onstart = () => {
            if (this.isVoiceCallActive()) {
                this.voiceCallStatus.set('Гӯш карда истодаам...');
            }
        };

        this.recognition.onresult = (event: any) => {
            const text = (event.results[0][0].transcript || '').trim();
            // Ignore empty or whitespace-only transcripts, require at least 2 real chars
            if (!text || text.length < 2 || !/\S/.test(text)) {
                console.log('Voice recognition: ignoring empty or too short transcript:', JSON.stringify(text));
                this.startListening();
                return;
            }
            this.lastUserSpoken.set(text);
            this.processVoiceCommand(text);
        };

        this.recognition.onerror = (event: any) => {
            if (event.error === 'no-speech' && this.isVoiceCallActive() && this.voiceCallStatus() === 'Гӯш карда истодаам...') {
                this.startListening();
            }
        };

        this.recognition.onend = () => {
            if (this.isVoiceCallActive() && this.voiceCallStatus() === 'Гӯш карда истодаам...') {
                this.startListening();
            }
        };
    }

    getActiveLangFlag(): string {
        return this.recognitionLangs.find(l => l.code === this.voiceRecognitionLang())?.flag ?? '🎤';
    }

    toggleLangDropdown() {
        this.showLangDropdown.update(v => !v);
    }

    closeLangDropdown() {
        this.showLangDropdown.set(false);
    }

    switchRecognitionLang(langCode: string) {
        if (this.voiceRecognitionLang() === langCode) {
            this.showLangDropdown.set(false);
            return;
        }
        this.voiceRecognitionLang.set(langCode);
        this.showLangDropdown.set(false);
        // Stop current recognition, reinit with new language, then restart
        this.stopListening();
        this.initSpeechRecognition();
        if (this.isVoiceCallActive() && this.voiceCallStatus() !== 'ИИ фикр дорад...' && this.voiceCallStatus() !== 'ИИ ҷавоб медиҳад...') {
            this.startListening();
        }
    }

    private startListening() {
        if (!this.recognition) return;
        try {
            this.recognition.start();
        } catch (e) {}
    }

    private stopListening() {
        if (!this.recognition) return;
        try {
            this.recognition.stop();
        } catch (e) {}
    }

    private processVoiceCommand(text: string) {
        // Guard: ignore empty or whitespace-only input
        const cleanText = text.trim();
        if (!cleanText || cleanText.length < 1) {
            console.log('processVoiceCommand: skipping empty input');
            if (this.isVoiceCallActive()) {
                this.voiceCallStatus.set('Гӯш карда истодаам...');
                this.startListening();
            }
            return;
        }

        this.voiceCallStatus.set('ИИ фикр дорад...');
        this.stopListening();
        this.lastAiSpoken.set('');
        
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement = null;
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        this.aiService.askAiVoiceCall(cleanText).subscribe({
            next: (res) => {
                const cleanRes = (res || '').trim();
                // Guard: ignore empty AI responses
                if (!cleanRes || cleanRes.length < 1) {
                    console.log('processVoiceCommand: AI returned empty response, resuming listening');
                    if (this.isVoiceCallActive()) {
                        this.voiceCallStatus.set('Гӯш карда истодаам...');
                        this.startListening();
                    }
                    return;
                }
                this.lastAiSpoken.set(cleanRes);
                this.voiceCallStatus.set('ИИ ҷавоб медиҳад...');
                this.speakFallback(cleanRes);
            },
            error: () => {
                const errMsg = 'Хатогие рӯй дод. Лутфан дубора санҷед.';
                this.lastAiSpoken.set(errMsg);
                this.voiceCallStatus.set('ИИ ҷавоб медиҳад...');
                this.speakFallback(errMsg);
            }
        });
    }

    private onSpeechFinished() {
        this.currentAudioElement = null;
        this.currentUtterance = null;
        if (this.isVoiceCallActive()) {
            this.voiceCallStatus.set('Гӯш карда истодаам...');
            this.startListening();
        }
    }

    private normalizeTajikText(text: string): string {
        // Replace Tajik-specific Cyrillic letters with their closest Russian phonetic equivalents
        // so that Russian TTS voice can pronounce them correctly.
        return text
            .replace(/ҷ/g, 'ч')   // j -> ch
            .replace(/Ҷ/g, 'Ч')
            .replace(/ӯ/g, 'у')   // uu -> u
            .replace(/Ӯ/g, 'У')
            .replace(/ғ/g, 'г')   // gh -> g
            .replace(/Ғ/g, 'Г')
            .replace(/қ/g, 'к')   // q -> k
            .replace(/Қ/g, 'К')
            .replace(/ҳ/g, 'х')   // h -> kh
            .replace(/Ҳ/g, 'Х')
            .replace(/ӣ/g, 'и')   // ii -> i
            .replace(/Ӣ/g, 'И');
    }

    private speakFallback(text: string) {
        if (this.speechTimeout) {
            clearTimeout(this.speechTimeout);
            this.speechTimeout = null;
        }

        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement = null;
        }

        // Normalize Tajik letters to Russian phonetic equivalents so TTS can pronounce them
        const normalizedText = this.normalizeTajikText(text);
        this.playLocalSpeechSynthesis(normalizedText);
    }

    private playLocalSpeechSynthesis(text: string) {
        const startTimestamp = Date.now();
        let hasSpoken = false;

        const useTimerFallback = () => {
            console.log('Using timer fallback for avatar speaking animation');
            this.isMouthMoving.set(true);
            
            const mouthInterval = setInterval(() => {
                if (this.isVoiceCallActive() && this.voiceCallStatus() === 'ИИ ҷавоб медиҳад...') {
                    this.isMouthMoving.update(v => !v);
                } else {
                    clearInterval(mouthInterval);
                }
            }, 250);

            const duration = Math.min(8000, Math.max(3000, text.length * 65));
            this.speechTimeout = setTimeout(() => {
                clearInterval(mouthInterval);
                this.isMouthMoving.set(false);
                this.onSpeechFinished();
            }, duration);
        };

        if ('speechSynthesis' in window) {
            try {
                // 1. Cancel any active speech first
                window.speechSynthesis.cancel();

                // 2. Wake up the Web Audio Context
                this.wakeUpAudioContext();

                // 3. Create the utterance
                const utterance = new SpeechSynthesisUtterance(text);
                const currentLang = this.languageService.currentLang();
                const selectedRecognitionLang = this.voiceRecognitionLang ? this.voiceRecognitionLang() : null;
                const selectedRecognitionBase = selectedRecognitionLang ? selectedRecognitionLang.split('-')[0] : null;
                
                // Detect if the text contains Cyrillic characters (Russian or Tajik)
                const hasCyrillic = /[а-яА-ЯёЁӣҷҳқӯў]/i.test(text);
                // Detect if the text contains Arabic-script characters (Persian, Arabic, Urdu, etc.)
                const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(text);

                let langCode = 'en-US';
                if (selectedRecognitionBase === 'fa' || currentLang === 'fa' || hasArabic) {
                    langCode = 'fa-IR';
                } else if (selectedRecognitionBase === 'tg' || currentLang === 'tj') {
                    langCode = 'tg-TJ';
                } else if (selectedRecognitionBase === 'ru' || currentLang === 'ru' || (hasCyrillic && currentLang !== 'tj' && currentLang !== 'fa')) {
                    langCode = 'ru-RU';
                }

                this.currentUtterance = utterance;

                utterance.onstart = () => {
                    hasSpoken = true;
                    this.isMouthMoving.set(true);
                    console.log('Local SpeechSynthesis started playing successfully');
                };

                utterance.onboundary = (event) => {
                    if (event.name === 'word') {
                        this.isMouthMoving.set(true);
                        setTimeout(() => {
                            if (this.currentUtterance === utterance) {
                                this.isMouthMoving.set(false);
                            }
                        }, 150);
                    }
                };
                
                utterance.onend = () => {
                    console.log('Local SpeechSynthesis finished successfully');
                    const elapsed = Date.now() - startTimestamp;
                    if (elapsed < 500 && !hasSpoken) {
                        useTimerFallback();
                    } else {
                        if (this.speechTimeout) clearTimeout(this.speechTimeout);
                        this.isMouthMoving.set(false);
                        this.onSpeechFinished();
                    }
                };

                utterance.onerror = (err) => {
                    console.warn('Local SpeechSynthesis error occurred', err);
                    if (this.speechTimeout) clearTimeout(this.speechTimeout);
                    
                    const elapsed = Date.now() - startTimestamp;
                    if (elapsed < 500 && !hasSpoken) {
                        useTimerFallback();
                    } else {
                        this.isMouthMoving.set(false);
                        this.onSpeechFinished();
                    }
                };

                const estimatedDuration = Math.max(4000, text.length * 120 + 2000);
                this.speechTimeout = setTimeout(() => {
                    if (!hasSpoken) {
                        console.warn('Local SpeechSynthesis safety timeout fired: no speech started. Falling back.');
                        window.speechSynthesis.cancel();
                        useTimerFallback();
                    } else {
                        console.warn('Local SpeechSynthesis safety timeout fired during active speech.');
                        window.speechSynthesis.cancel();
                        this.isMouthMoving.set(false);
                        this.onSpeechFinished();
                    }
                }, estimatedDuration);

                // 4. Delay speaking to avoid Chromium lockups (deadlocks)
                setTimeout(() => {
                    try {
                        const voices = window.speechSynthesis.getVoices();
                        const normalizeLang = (value: string) => (value || '').toLowerCase();
                        const targetLang = langCode.toLowerCase();
                        let matchedVoice = null;
                        let actualLangCode = langCode;

                        if (voices && voices.length > 0) {

                            // Try to match target language code first
                            matchedVoice = voices.find(v => normalizeLang(v.lang).startsWith(targetLang));

                            // Fallback for Tajik or Cyrillic text: prefer Russian voices
                            if (!matchedVoice && (langCode === 'tg-TJ' || hasCyrillic)) {
                                matchedVoice = voices.find(v => normalizeLang(v.lang).startsWith('ru'));
                            }

                            // Fallback for Persian/Arabic script: prefer Persian then Arabic voices
                            if (!matchedVoice && langCode === 'fa-IR') {
                                matchedVoice = voices.find(v => normalizeLang(v.lang).startsWith('fa')) || voices.find(v => normalizeLang(v.lang).startsWith('ar'));
                            }

                            // Fallback by voice name if there is no lang code match
                            if (!matchedVoice && langCode === 'fa-IR') {
                                matchedVoice = voices.find(v => /persian|farsi|iran/i.test(v.name || '')) || voices.find(v => /arabic|arab/i.test(v.name || ''));
                            }

                            // General fallback if still no match found
                            if (!matchedVoice) {
                                matchedVoice = voices.find(v => normalizeLang(v.lang).startsWith('en')) || voices[0];
                            }

                            if (matchedVoice) {
                                actualLangCode = matchedVoice.lang;
                            }
                        }

                        const isFaFallbackVoice = matchedVoice && langCode === 'fa-IR' && !normalizeLang(matchedVoice.lang).startsWith('fa') && !normalizeLang(matchedVoice.lang).startsWith('ar');
                        utterance.lang = isFaFallbackVoice ? langCode : actualLangCode;
                        if (matchedVoice) {
                            utterance.voice = matchedVoice;
                        }

                        console.log(`Local SpeechSynthesis starting speak: "${text.substring(0, 20)}..." in lang ${actualLangCode} with voice ${matchedVoice?.name || 'default'}`);
                        window.speechSynthesis.resume();
                        window.speechSynthesis.speak(utterance);
                    } catch (speakErr) {
                        console.error('Inner speak call failed:', speakErr);
                        useTimerFallback();
                    }
                }, 150); // 150ms delay prevents Chrome deadlock!
            } catch (e) {
                console.error('Local SpeechSynthesis initialization failed:', e);
                useTimerFallback();
            }
        } else {
            useTimerFallback();
        }
    }

    private wakeUpAudioContext() {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0, ctx.currentTime); // Silent beep
                osc.start(0);
                osc.stop(0.02);
                console.log('Audio subsystem woke up successfully');
            }
        } catch (e) {
            console.warn('Audio subsystem wake up warning:', e);
        }
    }
}

