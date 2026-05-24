import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface LanguageItem {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private http = inject(HttpClient);
    private translations: any = {};
    private fallbackTranslations: any = {};
    
    private languageMap: { [key: string]: string } = {
        'en': 'en', 'en-us': 'en', 'en-gb': 'en', 'en-au': 'en', 'en-ca': 'en', 'en-nz': 'en', 'en-ie': 'en', 'en-za': 'en',
        'ru': 'ru', 'ru-ru': 'ru', 'ru-by': 'ru', 'ru-kz': 'ru',
        'tj': 'tj', 'tg': 'tj', 'tg-tj': 'tj', 'tg-cyrl': 'tj', 'tg-cyrl-tj': 'tj',
        'es': 'es', 'es-es': 'es', 'es-mx': 'es', 'es-ar': 'es', 'es-co': 'es', 'es-pe': 'es', 'es-cl': 'es', 'es-ve': 'es',
        'ar': 'ar', 'ar-sa': 'ar', 'ar-ae': 'ar', 'ar-eg': 'ar', 'ar-dz': 'ar', 'ar-ma': 'ar', 'ar-tn': 'ar', 'ar-sy': 'ar', 'ar-jo': 'ar', 'ar-lb': 'ar', 'ar-kw': 'ar', 'ar-bh': 'ar', 'ar-qa': 'ar', 'ar-om': 'ar', 'ar-ye': 'ar', 'ar-ps': 'ar', 'ar-iq': 'ar',
        'fr': 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr', 'fr-be': 'fr', 'fr-ch': 'fr', 'fr-lu': 'fr', 'fr-ht': 'fr',
        'de': 'de', 'de-de': 'de', 'de-at': 'de', 'de-ch': 'de', 'de-li': 'de', 'de-lu': 'de',
        'zh': 'zh', 'zh-cn': 'zh', 'zh-hans': 'zh', 'zh-hans-cn': 'zh', 'zh-sg': 'zh', 'zh-tw': 'zh', 'zh-hant': 'zh', 'zh-hant-tw': 'zh', 'zh-hk': 'zh', 'zh-mo': 'zh',
        'hi': 'hi', 'hi-in': 'hi', 'hi-latn': 'hi', 'hi-latn-in': 'hi',
        'fa': 'fa', 'fa-ir': 'fa', 'fa-fatn': 'fa', 'fa-fatn-ir': 'fa',
    };

    supportedLanguages: LanguageItem[] = [
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
        { code: 'tj', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯' },
        { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
        { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
        { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
        { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' }
    ];

    public currentLang = signal(this.getInitialLanguage());

    constructor() {
        this.updateLayoutDirection(this.currentLang());
        this.loadTranslations('en', true); // Load fallback
        this.loadTranslations(this.currentLang());
    }

    private getInitialLanguage(): string {
        const savedLang = localStorage.getItem('lang');
        const supportedCodes = this.supportedLanguages.map(l => l.code);

        if (savedLang && supportedCodes.includes(savedLang)) return savedLang;

        const systemLang = navigator.language.toLowerCase();
        const mappedLang = this.languageMap[systemLang];
        if (mappedLang && supportedCodes.includes(mappedLang)) return mappedLang;

        const baseLang = systemLang.split('-')[0];
        const mappedBaseLang = this.languageMap[baseLang];
        if (mappedBaseLang && supportedCodes.includes(mappedBaseLang)) return mappedBaseLang;

        return 'en';
    }

    async loadTranslations(code: string, isFallback: boolean = false) {
        try {
            const data = await firstValueFrom(this.http.get(`/i18n/${code}.json`));
            if (isFallback) {
                this.fallbackTranslations = data;
            } else {
                this.translations = data;
                // Force signal update if needed
                this.currentLang.set(code);
            }
        } catch (err) {
            console.error(`Failed to load translations for ${code}`, err);
        }
    }

    public get(key: string, params?: any): string {
        return this.translate(key, params);
    }

    public translate(key: string, params: any = null): string {
        const keys = key.split('.');
        let result = this.translations;

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k];
            } else {
                // Fallback
                let fallback = this.fallbackTranslations;
                let foundFallback = true;
                for (const fk of keys) {
                    if (fallback && fallback[fk]) {
                        fallback = fallback[fk];
                    } else {
                        foundFallback = false;
                        break;
                    }
                }
                result = foundFallback ? fallback : key;
                break;
            }
        }

        if (typeof result === 'string' && params) {
            Object.keys(params).forEach(p => {
                const placeholder = `{{${p}}}`;
                result = (result as string).replace(new RegExp(placeholder, 'g'), params[p]);
            });
        }

        return typeof result === 'string' ? result : key;
    }

    setLanguage(code: string) {
        if (this.supportedLanguages.find(l => l.code === code)) {
            this.currentLang.set(code);
            localStorage.setItem('lang', code);
            this.updateLayoutDirection(code);
            this.loadTranslations(code);
        }
    }

    getCurrentLanguage() {
        return this.currentLang();
    }

    private updateLayoutDirection(code: string) {
        const isRtl = code === 'ar' || code === 'fa';
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = code;
    }
}
