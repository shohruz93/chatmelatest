import { Component, OnInit, inject, signal } from '@angular/core';
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
export class LearningComponent implements OnInit {
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
}
