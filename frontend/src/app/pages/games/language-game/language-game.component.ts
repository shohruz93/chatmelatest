import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService } from '../../../services/gamification.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { FormsModule } from '@angular/forms';

enum GameMode { CONFIG, PLAYING, FINISHED }
enum QuestionType { QUIZ, ANAGRAM }
enum QuestionDirection { NATIVE_TO_LEARNING, LEARNING_TO_NATIVE }

interface Question {
  word: string;
  options: string[];
  correctIndex: number;
  hint: string;
  scrambled: string[];
}

@Component({
  selector: 'app-language-game',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormsModule],
  template: `
    <div class="game-container">
      @if (mode() === GameMode.CONFIG) {
        <div class="config-screen">
          <div class="icon-header">🌍</div>
          <h1>{{ (type() === QuestionType.QUIZ ? 'GAMES.QUIZ_TITLE' : 'GAMES.ANAGRAM_TITLE') | translate }}</h1>
          <p>{{ 'GAMES.SUBTITLE' | translate }}</p>

          <div class="lang-selectors">
            <div class="lang-box">
              <span class="flag">{{ getFlag(nativeLang()) }}</span>
              <select [(ngModel)]="nativeLang">
                @for (l of langs; track l) { <option [value]="l">{{ l.toUpperCase() }}</option> }
              </select>
              <label>Native</label>
            </div>
            
            <button class="swap-btn" (click)="swapDirection()">⇄</button>

            <div class="lang-box">
              <span class="flag">{{ getFlag(learningLang()) }}</span>
              <select [(ngModel)]="learningLang">
                @for (l of langs; track l) { <option [value]="l">{{ l.toUpperCase() }}</option> }
              </select>
              <label>Learning</label>
            </div>
          </div>

          <div class="slider-box">
            <label>Questions: {{ questionsCount() }}</label>
            <input type="range" min="5" max="50" step="5" [(ngModel)]="questionsCount">
          </div>

          <div class="fixed-bet">
            <span>{{ 'GAMES.BET_AMOUNT' | translate }}: 1 🪙</span>
          </div>

          <button class="start-btn pulse" (click)="startGame()">{{ 'GAMES.START' | translate }}</button>
        </div>
      }

      @if (mode() === GameMode.PLAYING) {
        <div class="playing-screen">
          <div class="game-header">
            <div class="progress-bar">
              <div class="fill" [style.width.%]="progress()"></div>
            </div>
            <div class="stats">
              <span>{{ currentIndex() + 1 }} / {{ questions().length }}</span>
              <span class="score">⭐ {{ score() }}</span>
            </div>
          </div>

          <div class="question-card">
            @if (type() === QuestionType.QUIZ) {
              <h2 class="word">{{ currentQuestion().word }}</h2>
            } @else {
              <div class="hint-box">
                <span class="label">Hint:</span>
                <span class="val">{{ currentQuestion().hint }}</span>
              </div>
              <div class="anagram-display">
                @for (char of currentQuestion().word; track $index) {
                  <div class="char-box" [class.filled]="guess()[$index]" [class.correct]="hasAnswered() && isCorrect()" [class.wrong]="hasAnswered() && !isCorrect()">
                    {{ guess()[$index] || '' }}
                  </div>
                }
              </div>
            }
          </div>

          @if (type() === QuestionType.QUIZ) {
            <div class="options-grid">
              @for (opt of currentQuestion().options; track $index) {
                <button class="opt-btn" 
                  [class.correct]="hasAnswered() && $index === currentQuestion().correctIndex"
                  [class.wrong]="hasAnswered() && selectedIndex() === $index && $index !== currentQuestion().correctIndex"
                  [disabled]="hasAnswered()"
                  (click)="submitAnswer($index)">
                  {{ opt }}
                </button>
              }
            </div>
          } @else {
            <div class="letter-bank">
              @for (char of currentQuestion().scrambled; track $index) {
                <button class="letter-btn" 
                  [disabled]="hasAnswered() || usedIndices().has($index)"
                  (click)="addLetter(char, $index)">
                  {{ char }}
                </button>
              }
              <button class="back-btn" (click)="removeLetter()" [disabled]="hasAnswered() || guess().length === 0">⌫</button>
            </div>
          }

          @if (hasAnswered()) {
            <div class="footer-actions">
              @if (!isCorrect() && type() === QuestionType.ANAGRAM) {
                <p class="correct-reveal">Correct: <span>{{ currentQuestion().word }}</span></p>
              }
              <button class="next-btn" (click)="nextQuestion()">
                {{ (currentIndex() + 1 < questions().length ? 'GAMES.NEXT' : 'GAMES.RESULTS') | translate }}
              </button>
            </div>
          }
        </div>
      }

      @if (mode() === GameMode.FINISHED) {
        <div class="result-screen">
          <div class="result-icon">{{ percentage() >= 80 ? '🏆' : '👍' }}</div>
          <h1>{{ (percentage() >= 80 ? 'GAMES.PERFECT' : 'GAMES.GOOD_JOB') | translate }}</h1>
          <div class="score-circle">
            <span class="num">{{ score() }}</span>
            <span class="total">/ {{ questions().length }}</span>
          </div>
          <div class="rewards">
             @if (coinsAdded() > 0) { <div class="reward-item">🪙 +{{ coinsAdded() }}</div> }
             @if (xpAdded() > 0) { <div class="reward-item xp">✨ +{{ xpAdded() }} XP</div> }
          </div>
          <div class="actions">
            <button class="play-again" (click)="reset()">{{ 'GAMES.PLAY_AGAIN' | translate }}</button>
            <button class="exit" (click)="exit()">{{ 'GAMES.EXIT' | translate }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .game-container {
      min-height: 100vh;
      background: #0f172a;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      font-family: 'Outfit', sans-serif;
    }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 10px; }
    p { color: #94a3b8; }

    /* Config */
    .config-screen { text-align: center; width: 100%; max-width: 500px; }
    .icon-header { font-size: 5rem; margin-bottom: 20px; }
    .lang-selectors { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 40px 0; }
    .lang-box { display: flex; flex-direction: column; align-items: center; }
    .flag { font-size: 3rem; margin-bottom: 10px; }
    select { background: #1e293b; color: white; border: 1px solid #334155; padding: 10px; border-radius: 10px; }
    .swap-btn { background: #334155; border: none; color: white; font-size: 20px; padding: 10px; border-radius: 50%; cursor: pointer; }
    .slider-box { margin-bottom: 40px; }
    input[type=range] { width: 100%; }
    .start-btn { background: #6366f1; color: white; border: none; padding: 15px 50px; border-radius: 30px; font-weight: 700; font-size: 1.2rem; cursor: pointer; }
    .pulse { animation: pulse 2s infinite; }

    /* Playing */
    .playing-screen { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 30px; }
    .progress-bar { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; }
    .progress-bar .fill { height: 100%; background: #6366f1; transition: width 0.3s ease; }
    .stats { display: flex; justify-content: space-between; font-weight: 700; color: #94a3b8; margin-top: 10px; }
    .score { color: #fbbf24; }
    
    .question-card { background: #1e293b; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    .word { font-size: 2.5rem; font-weight: 900; }
    
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .opt-btn { background: #334155; border: none; color: white; padding: 20px; border-radius: 15px; font-weight: 600; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; }
    .opt-btn:hover:not(:disabled) { background: #475569; }
    .opt-btn.correct { background: #22c55e !important; transform: scale(1.05); }
    .opt-btn.wrong { background: #ef4444 !important; }

    /* Anagram */
    .hint-box { margin-bottom: 20px; font-size: 1.2rem; }
    .hint-box .label { color: #64748b; margin-right: 10px; }
    .anagram-display { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .char-box { width: 45px; height: 55px; background: #334155; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; border-bottom: 4px solid #1e293b; }
    .char-box.filled { background: #475569; border-bottom-color: #6366f1; }
    .char-box.correct { background: #22c55e; border-bottom-color: #15803d; }
    .char-box.wrong { background: #ef4444; border-bottom-color: #991b1b; }
    .letter-bank { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    .letter-btn { width: 50px; height: 50px; background: #1e293b; border: 2px solid #334155; color: white; border-radius: 12px; font-weight: 700; font-size: 1.2rem; cursor: pointer; }
    .letter-btn:disabled { opacity: 0.3; cursor: default; }
    .back-btn { width: 60px; height: 50px; background: #ef4444; border: none; color: white; border-radius: 12px; font-size: 1.5rem; cursor: pointer; }
    .correct-reveal { color: #ef4444; font-weight: 700; margin-bottom: 10px; text-align: center; }
    .correct-reveal span { color: #22c55e; }

    .footer-actions { display: flex; flex-direction: column; align-items: center; animation: slideUp 0.3s ease-out; }
    .next-btn { background: #6366f1; color: white; border: none; padding: 15px 60px; border-radius: 15px; font-weight: 700; font-size: 1.1rem; cursor: pointer; width: 100%; }

    /* Results */
    .result-screen { text-align: center; width: 100%; max-width: 400px; }
    .result-icon { font-size: 5rem; margin-bottom: 20px; }
    .score-circle { width: 150px; height: 150px; border: 8px solid #6366f1; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 30px auto; }
    .score-circle .num { font-size: 3rem; font-weight: 900; }
    .score-circle .total { color: #64748b; font-size: 1.2rem; }
    .rewards { display: flex; justify-content: center; gap: 20px; margin-bottom: 40px; }
    .reward-item { background: #facc15; color: #854d0e; padding: 10px 20px; border-radius: 20px; font-weight: 800; }
    .reward-item.xp { background: #6366f1; color: white; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    .play-again { background: #6366f1; border: none; color: white; padding: 15px; border-radius: 15px; font-weight: 700; cursor: pointer; }
    .exit { background: transparent; border: 2px solid #334155; color: #94a3b8; padding: 15px; border-radius: 15px; font-weight: 700; cursor: pointer; }

    .fixed-bet {
      margin-bottom: 24px;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.1);
      padding: 8px 16px;
      border-radius: 12px;
      display: inline-block;
    }

    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class LanguageGameComponent implements OnInit {
  private gamification = inject(GamificationService);
  private router = inject(Router);

  GameMode = GameMode;
  QuestionType = QuestionType;
  mode = signal(GameMode.CONFIG);
  type = signal(QuestionType.QUIZ);
  
  nativeLang = signal('tg');
  learningLang = signal('en');
  questionsCount = signal(10);
  
  questions = signal<Question[]>([]);
  currentIndex = signal(0);
  score = signal(0);
  hasAnswered = signal(false);
  selectedIndex = signal<number | null>(null);
  guess = signal<string[]>([]);
  usedIndices = signal<Set<number>>(new Set());
  isCorrect = signal(false);
  
  progress = computed(() => (this.currentIndex() + 1) / this.questions().length * 100);
  currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  
  coinsAdded = signal(0);
  xpAdded = signal(0);

  langs = ['en', 'tg', 'ru', 'es', 'fr', 'de', 'ar', 'zh', 'hi', 'fa'];
  
  dictionary = [
    {en: "Apple", ru: "Яблоко", tg: "Себ", es: "Manzana", fr: "Pomme", de: "Apfel", ar: "تفاحة", zh: "苹果", hi: "सेब", fa: "سیب"},
    {en: "House", ru: "Дом", tg: "Хона", es: "Casa", fr: "Maison", de: "Haus", ar: "منزل", zh: "房子", hi: "घर", fa: "خانه"},
    {en: "Book", ru: "Книга", tg: "Китоб", es: "Libro", fr: "Livre", de: "Buch", ar: "كتاب", zh: "书", hi: "किताब", fa: "کتاب"},
    {en: "Water", ru: "Вода", tg: "Об", es: "Agua", fr: "Eau", de: "Wasser", ar: "ماء", zh: "水", hi: "पानी", fa: "آب"},
    {en: "Fire", ru: "Огонь", tg: "Оташ", es: "Fuego", fr: "Feu", de: "Feuer", ar: "نار", zh: "火", hi: "आग", fa: "آتش"},
    {en: "Sun", ru: "Солнце", tg: "Офтоб", es: "Sol", fr: "Soleil", de: "Sonne", ar: "شمس", zh: "太阳", hi: "सूरज", fa: "آفتاب"},
    {en: "Moon", ru: "Луна", tg: "Моҳтоб", es: "Luna", fr: "Lune", de: "Mond", ar: "قمر", zh: "月亮", hi: "चांद", fa: "ماه"},
    {en: "Car", ru: "Машина", tg: "Мошин", es: "Coche", fr: "Voiture", de: "Auto", ar: "سيارة", zh: "汽车", hi: "गाड़ी", fa: "ماشین"},
    {en: "Tree", ru: "Дерево", tg: "Дарахт", es: "Árbol", fr: "Arbre", de: "Baum", ar: "شجرة", zh: "树", hi: "पेड़", fa: "درخت"},
    {en: "Cat", ru: "Кот", tg: "Гурба", es: "Gato", fr: "Chat", de: "Katze", ar: "قطة", zh: "猫", hi: "बिल्ली", fa: "گربه"},
    {en: "Dog", ru: "Собака", tg: "Саг", es: "Perro", fr: "Chien", de: "Hund", ar: "كلب", zh: "狗", hi: "कुत्ता", fa: "سگ"},
    {en: "Bread", ru: "Хлеб", tg: "Нон", es: "Pan", fr: "Pain", de: "Brot", ar: "خبز", zh: "面包", hi: "रोटी", fa: "نان"},
    {en: "Sky", ru: "Небо", tg: "Осмон", es: "Cielo", fr: "Ciel", de: "Himmel", ar: "سماء", zh: "天空", hi: "आसमान", fa: "آسمان"},
    {en: "Earth", ru: "Земля", tg: "Замин", es: "Tierra", fr: "Terre", de: "Erde", ar: "أرض", zh: "地球", hi: "पृथ्वी", fa: "زمین"},
    {en: "Friend", ru: "Друг", tg: "Дӯст", es: "Amigo", fr: "Ami", de: "Freund", ar: "صديق", zh: "朋友", hi: "दोस्त", fa: "دوست"},
    {en: "Love", ru: "Любовь", tg: "Ишқ", es: "Amor", fr: "Amour", de: "Liebe", ar: "حب", zh: "爱", hi: "प्यार", fa: "عشق"},
    {en: "Time", ru: "Время", tg: "Вақт", es: "Tiempo", fr: "Temps", de: "Zeit", ar: "وقت", zh: "时间", hi: "समय", fa: "زمان"},
    {en: "Life", ru: "Жизнь", tg: "Ҳаёт", es: "Vida", fr: "Vie", de: "Leben", ar: "حياة", zh: "生活", hi: "जीवन", fa: "زندگی"},
    {en: "City", ru: "Город", tg: "Шаҳр", es: "Ciudad", fr: "Ville", de: "Stadt", ar: "مدينة", zh: "城市", hi: "शहर", fa: "شهر"},
    {en: "School", ru: "Школа", tg: "Мактаб", es: "Escuela", fr: "École", de: "Schule", ar: "مدرسة", zh: "学校", hi: "स्कूल", fa: "مدرسه"},
  ];

  ngOnInit() {
    const url = this.router.url;
    if (url.includes('anagram')) this.type.set(QuestionType.ANAGRAM);
    else this.type.set(QuestionType.QUIZ);
  }

  getFlag(lang: string) {
    const flags: any = { en: '🇺🇸', tg: '🇹🇯', ru: '🇷🇺', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', ar: '🇸🇦', zh: '🇨🇳', hi: '🇮🇳', fa: '🇮🇷' };
    return flags[lang] || '🏳️';
  }

  swapDirection() {
    const temp = this.nativeLang();
    this.nativeLang.set(this.learningLang());
    this.learningLang.set(temp);
  }

  startGame() {
    const questions: Question[] = [];
    const pool = [...this.dictionary].sort(() => Math.random() - 0.5);
    const count = Math.min(this.questionsCount(), pool.length);
    
    const source = this.nativeLang();
    const target = this.learningLang();

    this.gamification.bet(1, this.type() === QuestionType.QUIZ ? 'quiz' : 'anagram').subscribe(() => {
      for (let i = 0; i < count; i++) {
        const entry: any = pool[i];
        const word = entry[source];
        const correct = entry[target];

        if (this.type() === QuestionType.QUIZ) {
          const distractors = this.dictionary.filter(d => d !== entry).sort(() => Math.random() - 0.5).slice(0, 3).map((d: any) => d[target]);
          const options = [...distractors, correct].sort(() => Math.random() - 0.5);
          questions.push({ word, options, correctIndex: options.indexOf(correct), hint: '', scrambled: [] });
        } else {
          const scrambled = correct.toUpperCase().split('').sort(() => Math.random() - 0.5);
          questions.push({ word: correct.toUpperCase(), options: [], correctIndex: -1, hint: word, scrambled });
        }
      }
      
      this.questions.set(questions);
      this.currentIndex.set(0);
      this.score.set(0);
      this.mode.set(GameMode.PLAYING);
      this.resetQuestion();
    });
  }

  resetQuestion() {
    this.hasAnswered.set(false);
    this.selectedIndex.set(null);
    this.guess.set([]);
    this.usedIndices.set(new Set());
    this.isCorrect.set(false);
  }

  submitAnswer(index: number) {
    if (this.hasAnswered()) return;
    this.selectedIndex.set(index);
    this.hasAnswered.set(true);
    const correct = index === this.currentQuestion().correctIndex;
    this.isCorrect.set(correct);
    if (correct) this.score.update(s => s + 1);
  }

  addLetter(char: string, index: number) {
    if (this.hasAnswered()) return;
    this.guess.update(g => [...g, char]);
    this.usedIndices.update(s => { s.add(index); return new Set(s); });
    
    if (this.guess().length === this.currentQuestion().word.length) {
      this.checkAnagram();
    }
  }

  removeLetter() {
    if (this.hasAnswered() || this.guess().length === 0) return;
    const last = this.guess()[this.guess().length - 1];
    this.guess.update(g => g.slice(0, -1));
    
    // Find last used index of this char
    const scrambled = this.currentQuestion().scrambled;
    let targetIdx = -1;
    for (let i = scrambled.length - 1; i >= 0; i--) {
      if (scrambled[i] === last && this.usedIndices().has(i)) {
        targetIdx = i; break;
      }
    }
    if (targetIdx !== -1) {
      this.usedIndices.update(s => { s.delete(targetIdx); return new Set(s); });
    }
  }

  checkAnagram() {
    this.hasAnswered.set(true);
    const correct = this.guess().join('') === this.currentQuestion().word;
    this.isCorrect.set(correct);
    if (correct) this.score.update(s => s + 1);
  }

  nextQuestion() {
    if (this.currentIndex() + 1 < this.questions().length) {
      this.currentIndex.update(i => i + 1);
      this.resetQuestion();
    } else {
      this.finishGame();
    }
  }

  finishGame() {
    this.mode.set(GameMode.FINISHED);
    const winAmount = Math.floor(this.score() / this.questions().length * 10);
    if (winAmount > 0) {
      this.gamification.win(winAmount, this.type() === QuestionType.QUIZ ? 'quiz' : 'anagram').subscribe(res => {
        this.coinsAdded.set(winAmount);
        this.xpAdded.set(10);
      });
    }
  }

  percentage() { return (this.score() / this.questions().length) * 100; }

  reset() { this.mode.set(GameMode.CONFIG); }
  exit() { this.router.navigate(['/dashboard/games']); }
}
