import { Component, ChangeDetectionStrategy, Output, EventEmitter, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService, Language } from '../../services/country.service';
import { AdsterraBannerComponent } from '../adsterra-banner/adsterra-banner.component';

export enum QuestionDirection {
  NATIVE_TO_LEARNING,
  LEARNING_TO_NATIVE
}

export interface GameConfig {
  nativeLanguage: string;
  learningLanguage: string;
  questionsCount: number;
  direction: QuestionDirection;
}

export interface Question {
  word: string;
  options: string[];
  correctIndex: number;
}

export type GameState = 'config' | 'loading' | 'playing' | 'finished' | 'error';

// The offline dictionary mapping 10 languages
const LOCAL_DICTIONARY: { [lang: string]: string }[] = [
  { "en": "Apple", "ru": "Яблоко", "tg": "Себ", "es": "Manzana", "fr": "Pomme", "de": "Apfel", "ar": "تفاحة", "zh": "苹果", "hi": "सेब", "fa": "سیب" },
  { "en": "House", "ru": "Дом", "tg": "Хона", "es": "Casa", "fr": "Maison", "de": "Haus", "ar": "منزل", "zh": "房子", "hi": "घर", "fa": "خانه" },
  { "en": "Book", "ru": "Книга", "tg": "Китоб", "es": "Libro", "fr": "Livre", "de": "Buch", "ar": "كتاب", "zh": "书", "hi": "किताब", "fa": "کتاب" },
  { "en": "Water", "ru": "Вода", "tg": "Об", "es": "Agua", "fr": "Eau", "de": "Wasser", "ar": "ماء", "zh": "水", "hi": "पानी", "fa": "آب" },
  { "en": "Fire", "ru": "Огонь", "tg": "Оташ", "es": "Fuego", "fr": "Feu", "de": "Feuer", "ar": "نار", "zh": "火", "hi": "आग", "fa": "آتش" },
  { "en": "Sun", "ru": "Солнце", "tg": "Офтоб", "es": "Sol", "fr": "Soleil", "de": "Sonne", "ar": "شمس", "zh": "太阳", "hi": "सूरज", "fa": "آفتاب" },
  { "en": "Moon", "ru": "Луна", "tg": "Моҳтоб", "es": "Luna", "fr": "Lune", "de": "Mond", "ar": "قمر", "zh": "月亮", "hi": "चांद", "fa": "ماه" },
  { "en": "Car", "ru": "Машина", "tg": "Мошин", "es": "Coche", "fr": "Voiture", "de": "Auto", "ar": "سيارة", "zh": "汽车", "hi": "गाड़ी", "fa": "ماشین" },
  { "en": "Tree", "ru": "Дерево", "tg": "Дарахт", "es": "Árbol", "fr": "Arbre", "de": "Baum", "ar": "شجرة", "zh": "树", "hi": "पेड़", "fa": "درخت" },
  { "en": "Cat", "ru": "Кот", "tg": "Гурба", "es": "Gato", "fr": "Chat", "de": "Katze", "ar": "قطة", "zh": "猫", "hi": "बिल्ली", "fa": "گربه" },
  { "en": "Dog", "ru": "Собака", "tg": "Саг", "es": "Perro", "fr": "Chien", "de": "Hund", "ar": "كلب", "zh": "狗", "hi": "कुत्ता", "fa": "سگ" },
  { "en": "Bread", "ru": "Хлеб", "tg": "Нон", "es": "Pan", "fr": "Pain", "de": "Brot", "ar": "خبز", "zh": "面包", "hi": "रोटी", "fa": "نان" },
  { "en": "Child", "ru": "Ребенок", "tg": "Кӯдак", "es": "Niño", "fr": "Enfant", "de": "Kind", "ar": "طفل", "zh": "孩子", "hi": "बच्चा", "fa": "کودک" },
  { "en": "Sky", "ru": "Небо", "tg": "Осмон", "es": "Cielo", "fr": "Ciel", "de": "Himmel", "ar": "سماء", "zh": "天空", "hi": "आसमान", "fa": "آسمان" },
  { "en": "Earth", "ru": "Земля", "tg": "Замин", "es": "Tierra", "fr": "Terre", "de": "Erde", "ar": "أرض", "zh": "地球", "hi": "पृथ्वी", "fa": "زمین" },
  { "en": "Friend", "ru": "Друг", "tg": "Дӯст", "es": "Amigo", "fr": "Ami", "de": "Freund", "ar": "صديق", "zh": "朋友", "hi": "दोस्त", "fa": "دوست" },
  { "en": "Love", "ru": "Любовь", "tg": "Ишқ", "es": "Amor", "fr": "Amour", "de": "Liebe", "ar": "حب", "zh": "爱", "hi": "प्यार", "fa": "عشق" },
  { "en": "Time", "ru": "Время", "tg": "Вақт", "es": "Tiempo", "fr": "Temps", "de": "Zeit", "ar": "وقت", "zh": "时间", "hi": "समय", "fa": "زمان" },
  { "en": "Life", "ru": "Жизнь", "tg": "Ҳаёт", "es": "Vida", "fr": "Vie", "de": "Leben", "ar": "حياة", "zh": "生活", "hi": "जीवन", "fa": "زندگی" },
  { "en": "Day", "ru": "День", "tg": "Рӯз", "es": "Día", "fr": "Jour", "de": "Tag", "ar": "يوم", "zh": "天", "hi": "दिन", "fa": "روز" },
  { "en": "Night", "ru": "Ночь", "tg": "Шаб", "es": "Noche", "fr": "Nuit", "de": "Nacht", "ar": "ليل", "zh": "晚", "hi": "रात", "fa": "شب" },
  { "en": "Mountain", "ru": "Гора", "tg": "Кӯҳ", "es": "Montaña", "fr": "Montagne", "de": "Berg", "ar": "جبل", "zh": "山", "hi": "पहाड़", "fa": "کوه" },
  { "en": "River", "ru": "Река", "tg": "Дарё", "es": "Río", "fr": "Rivière", "de": "Fluss", "ar": "نهر", "zh": "河", "hi": "नदी", "fa": "رودخانه" },
  { "en": "Wind", "ru": "Ветер", "tg": "Шамол", "es": "Viento", "fr": "Vent", "de": "Wind", "ar": "رياح", "zh": "风", "hi": "हवा", "fa": "باد" },
  { "en": "Snow", "ru": "Снег", "tg": "Барф", "es": "Nieve", "fr": "Neige", "de": "Schnee", "ar": "ثلج", "zh": "雪", "hi": "बर्फ", "fa": "برف" },
  { "en": "Rain", "ru": "Дождь", "tg": "Борон", "es": "Lluvia", "fr": "Pluie", "de": "Regen", "ar": "مطر", "zh": "雨", "hi": "बारिश", "fa": "باران" },
  { "en": "Color", "ru": "Цвет", "tg": "Ранг", "es": "Color", "fr": "Couleur", "de": "Farbe", "ar": "لون", "zh": "颜色", "hi": "रंग", "fa": "رنگ" },
  { "en": "Heart", "ru": "Сердце", "tg": "Дил", "es": "Corazón", "fr": "Cœur", "de": "Herz", "ar": "قلب", "zh": "心", "hi": "दिल", "fa": "قلب" },
  { "en": "Dream", "ru": "Сон", "tg": "Хоб", "es": "Sueño", "fr": "Rêve", "de": "Traum", "ar": "حلم", "zh": "梦", "hi": "सपना", "fa": "رویا" },
  { "en": "Music", "ru": "Музыка", "tg": "Мусиқӣ", "es": "Música", "fr": "Musique", "de": "Musik", "ar": "موسيقى", "zh": "音乐", "hi": "संगीत", "fa": "موسیقی" },
  { "en": "Bird", "ru": "Птица", "tg": "Парранда", "es": "Pájaro", "fr": "Oiseau", "de": "Vogel", "ar": "طائر", "zh": "鸟", "hi": "पक्षी", "fa": "پرنده" },
  { "en": "Flower", "ru": "Цветок", "tg": "Гул", "es": "Flor", "fr": "Fleur", "de": "Blume", "ar": "زهرة", "zh": "花", "hi": "फूल", "fa": "گل" },
  { "en": "Sword", "ru": "Меч", "tg": "Шамшер", "es": "Espada", "fr": "Épée", "de": "Schwert", "ar": "سيف", "zh": "剑", "hi": "तलवार", "fa": "شمشیر" },
  { "en": "Gold", "ru": "Золото", "tg": "Тилло", "es": "Oro", "fr": "Or", "de": "Gold", "ar": "ذهب", "zh": "金", "hi": "सोना", "fa": "طلا" },
  { "en": "King", "ru": "Король", "tg": "Шоҳ", "es": "Rey", "fr": "Roi", "de": "König", "ar": "ملك", "zh": "国王", "hi": "राजा", "fa": "پادشاه" },
  { "en": "Queen", "ru": "Королева", "tg": "Малика", "es": "Reina", "fr": "Reine", "de": "Königin", "ar": "ملكة", "zh": "女王", "hi": "रानी", "fa": "ملکه" },
  { "en": "City", "ru": "Город", "tg": "Шаҳр", "es": "Ciudad", "fr": "Ville", "de": "Stadt", "ar": "مدينة", "zh": "城市", "hi": "शहर", "fa": "شهر" },
  { "en": "Village", "ru": "Деревня", "tg": "Деҳа", "es": "Pueblo", "fr": "Village", "de": "Dorf", "ar": "قرية", "zh": "村庄", "hi": "गांव", "fa": "روستا" },
  { "en": "Road", "ru": "Дорога", "tg": "Роҳ", "es": "Camino", "fr": "Route", "de": "Straße", "ar": "طريق", "zh": "路", "hi": "सड़क", "fa": "جاده" },
  { "en": "Bridge", "ru": "Мост", "tg": "Пул", "es": "Puente", "fr": "Pont", "de": "Brücke", "ar": "جسر", "zh": "桥", "hi": "पुल", "fa": "پل" }
];

@Component({
  selector: 'app-language-game',
  standalone: true,
  imports: [CommonModule, FormsModule, AdsterraBannerComponent],
  templateUrl: './language-game.component.html',
  styleUrls: ['./language-game.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageGameComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private countryService = inject(CountryService);
  private cdr = inject(ChangeDetectorRef);

  state: GameState = 'config';
  
  // Config state
  nativeLanguage = 'tg';
  learningLanguage = 'en';
  questionsCount = 5;
  direction = QuestionDirection.NATIVE_TO_LEARNING;
  QuestionDirection = QuestionDirection; // Expose to template
  
  // Available languages from dictionary support
  availableLangs = ['en', 'tg', 'ru', 'es', 'ar', 'fr', 'de', 'zh', 'hi', 'fa'];
  languages: Language[] = [];

  // Playing state
  questions: Question[] = [];
  currentIndex = 0;
  score = 0;
  hasAnswered = false;
  selectedIndex: number | null = null;
  shakeIncorrect = false;

  ngOnInit() {
    this.languages = this.countryService.getAllLanguages().filter(l => this.availableLangs.includes(l.code));
  }

  getFlag(code: string): string {
    return this.countryService.getLanguageFlagUrl(code);
  }

  getLangName(code: string): string {
    return this.countryService.getLanguageName(code);
  }

  swapDirection() {
    this.direction = this.direction === QuestionDirection.NATIVE_TO_LEARNING 
      ? QuestionDirection.LEARNING_TO_NATIVE 
      : QuestionDirection.NATIVE_TO_LEARNING;
  }

  startGame() {
    this.state = 'loading';
    this.cdr.detectChanges();

    setTimeout(() => {
      this.generateQuestions();
      this.state = 'playing';
      this.cdr.detectChanges();
    }, 600); // Simulate mock loading for better UX transition
  }

  private generateQuestions() {
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.hasAnswered = false;
    this.selectedIndex = null;

    const wordIndices = Array.from({ length: LOCAL_DICTIONARY.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    let qIndex = 0;
    for (let i = 0; i < this.questionsCount; i++) {
        if (qIndex + 3 >= wordIndices.length) break;

        const correctIdx = wordIndices[qIndex];
        const wrongIdx1 = wordIndices[qIndex+1];
        const wrongIdx2 = wordIndices[qIndex+2];
        const wrongIdx3 = wordIndices[qIndex+3];
        qIndex += 4;

        const sourceLang = this.direction === QuestionDirection.NATIVE_TO_LEARNING ? this.nativeLanguage : this.learningLanguage;
        const targetLang = this.direction === QuestionDirection.NATIVE_TO_LEARNING ? this.learningLanguage : this.nativeLanguage;

        const sourceWord = this.getWord(correctIdx, sourceLang);
        const correctTargetWord = this.getWord(correctIdx, targetLang);
        const wrongTargetWords = [
            this.getWord(wrongIdx1, targetLang),
            this.getWord(wrongIdx2, targetLang),
            this.getWord(wrongIdx3, targetLang)
        ];

        const options = [...wrongTargetWords];
        const correctIndex = Math.floor(Math.random() * 4);
        options.splice(correctIndex, 0, correctTargetWord);

        this.questions.push({
            word: sourceWord,
            options,
            correctIndex
        });
    }

    if (this.questions.length === 0) {
      this.state = 'error';
    }
  }

  private getWord(index: number, lang: string): string {
    return LOCAL_DICTIONARY[index][lang] || LOCAL_DICTIONARY[index]['en'] || 'Unknown';
  }

  onAnswer(index: number) {
    if (this.hasAnswered) return;

    this.hasAnswered = true;
    this.selectedIndex = index;

    const isCorrect = index === this.currentQuestion.correctIndex;
    if (isCorrect) {
      this.score++;
    } else {
      this.shakeIncorrect = true;
      setTimeout(() => {
        this.shakeIncorrect = false;
        this.cdr.detectChanges();
      }, 500);
    }
  }

  nextQuestion() {
    if (!this.hasAnswered) return;

    if (this.currentIndex + 1 < this.questions.length) {
      this.currentIndex++;
      this.hasAnswered = false;
      this.selectedIndex = null;
    } else {
      this.state = 'finished';
    }
  }

  resetGame() {
    this.state = 'config';
  }

  closeGame() {
    this.close.emit();
  }

  get currentQuestion(): Question {
    return this.questions[this.currentIndex];
  }

  get progressPercentage(): number {
    if (!this.questions.length) return 0;
    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }
}
