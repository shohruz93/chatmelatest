import { Injectable } from '@angular/core';

export interface Country {
    code: string;       // ISO 3166-1 alpha-2 code (e.g., 'US', 'TJ')
    name: string;       // Full country name
    flagUrl: string;    // Path to flag image
    dialCode?: string;  // Optional dial code
}

export interface Language {
    code: string;       // ISO 639-1 code (e.g., 'en', 'tg')
    name: string;       // Language name
    flagUrl: string;    // Associated country flag
}

@Injectable({
    providedIn: 'root'
})
export class CountryService {
    private countries: Country[] = [
        { code: 'AF', name: 'Afghanistan', flagUrl: '/flags/af.png', dialCode: '+93' },
        { code: 'AL', name: 'Albania', flagUrl: '/flags/al.png', dialCode: '+355' },
        { code: 'DZ', name: 'Algeria', flagUrl: '/flags/dz.png', dialCode: '+213' },
        { code: 'AR', name: 'Argentina', flagUrl: '/flags/ar.png', dialCode: '+54' },
        { code: 'AM', name: 'Armenia', flagUrl: '/flags/am.png', dialCode: '+374' },
        { code: 'AU', name: 'Australia', flagUrl: '/flags/au.png', dialCode: '+61' },
        { code: 'AT', name: 'Austria', flagUrl: '/flags/at.png', dialCode: '+43' },
        { code: 'AZ', name: 'Azerbaijan', flagUrl: '/flags/az.png', dialCode: '+994' },
        { code: 'BD', name: 'Bangladesh', flagUrl: '/flags/bd.png', dialCode: '+880' },
        { code: 'BY', name: 'Belarus', flagUrl: '/flags/by.png', dialCode: '+375' },
        { code: 'BE', name: 'Belgium', flagUrl: '/flags/be.png', dialCode: '+32' },
        { code: 'BR', name: 'Brazil', flagUrl: '/flags/br.png', dialCode: '+55' },
        { code: 'BG', name: 'Bulgaria', flagUrl: '/flags/bg.png', dialCode: '+359' },
        { code: 'CA', name: 'Canada', flagUrl: '/flags/ca.png', dialCode: '+1' },
        { code: 'CL', name: 'Chile', flagUrl: '/flags/cl.png', dialCode: '+56' },
        { code: 'CN', name: 'China', flagUrl: '/flags/cn.png', dialCode: '+86' },
        { code: 'CO', name: 'Colombia', flagUrl: '/flags/co.png', dialCode: '+57' },
        { code: 'HR', name: 'Croatia', flagUrl: '/flags/hr.png', dialCode: '+385' },
        { code: 'CZ', name: 'Czech Republic', flagUrl: '/flags/cz.png', dialCode: '+420' },
        { code: 'DK', name: 'Denmark', flagUrl: '/flags/dk.png', dialCode: '+45' },
        { code: 'EG', name: 'Egypt', flagUrl: '/flags/eg.png', dialCode: '+20' },
        { code: 'EE', name: 'Estonia', flagUrl: '/flags/ee.png', dialCode: '+372' },
        { code: 'ET', name: 'Ethiopia', flagUrl: '/flags/et.png', dialCode: '+251' },
        { code: 'FI', name: 'Finland', flagUrl: '/flags/fi.png', dialCode: '+358' },
        { code: 'FR', name: 'France', flagUrl: '/flags/fr.png', dialCode: '+33' },
        { code: 'GE', name: 'Georgia', flagUrl: '/flags/ge.png', dialCode: '+995' },
        { code: 'DE', name: 'Germany', flagUrl: '/flags/de.png', dialCode: '+49' },
        { code: 'GR', name: 'Greece', flagUrl: '/flags/gr.png', dialCode: '+30' },
        { code: 'HU', name: 'Hungary', flagUrl: '/flags/hu.png', dialCode: '+36' },
        { code: 'IN', name: 'India', flagUrl: '/flags/in.png', dialCode: '+91' },
        { code: 'ID', name: 'Indonesia', flagUrl: '/flags/id.png', dialCode: '+62' },
        { code: 'IR', name: 'Iran', flagUrl: '/flags/ir.png', dialCode: '+98' },
        { code: 'IQ', name: 'Iraq', flagUrl: '/flags/iq.png', dialCode: '+964' },
        { code: 'IE', name: 'Ireland', flagUrl: '/flags/ie.png', dialCode: '+353' },
        { code: 'IL', name: 'Israel', flagUrl: '/flags/il.png', dialCode: '+972' },
        { code: 'IT', name: 'Italy', flagUrl: '/flags/it.png', dialCode: '+39' },
        { code: 'JP', name: 'Japan', flagUrl: '/flags/jp.png', dialCode: '+81' },
        { code: 'JO', name: 'Jordan', flagUrl: '/flags/jo.png', dialCode: '+962' },
        { code: 'KZ', name: 'Kazakhstan', flagUrl: '/flags/kz.png', dialCode: '+7' },
        { code: 'KE', name: 'Kenya', flagUrl: '/flags/ke.png', dialCode: '+254' },
        { code: 'KR', name: 'South Korea', flagUrl: '/flags/kr.png', dialCode: '+82' },
        { code: 'KW', name: 'Kuwait', flagUrl: '/flags/kw.png', dialCode: '+965' },
        { code: 'KG', name: 'Kyrgyzstan', flagUrl: '/flags/kg.png', dialCode: '+996' },
        { code: 'LV', name: 'Latvia', flagUrl: '/flags/lv.png', dialCode: '+371' },
        { code: 'LB', name: 'Lebanon', flagUrl: '/flags/lb.png', dialCode: '+961' },
        { code: 'LT', name: 'Lithuania', flagUrl: '/flags/lt.png', dialCode: '+370' },
        { code: 'MY', name: 'Malaysia', flagUrl: '/flags/my.png', dialCode: '+60' },
        { code: 'MX', name: 'Mexico', flagUrl: '/flags/mx.png', dialCode: '+52' },
        { code: 'MD', name: 'Moldova', flagUrl: '/flags/md.png', dialCode: '+373' },
        { code: 'MN', name: 'Mongolia', flagUrl: '/flags/mn.png', dialCode: '+976' },
        { code: 'MA', name: 'Morocco', flagUrl: '/flags/ma.png', dialCode: '+212' },
        { code: 'NP', name: 'Nepal', flagUrl: '/flags/np.png', dialCode: '+977' },
        { code: 'NL', name: 'Netherlands', flagUrl: '/flags/nl.png', dialCode: '+31' },
        { code: 'NZ', name: 'New Zealand', flagUrl: '/flags/nz.png', dialCode: '+64' },
        { code: 'NG', name: 'Nigeria', flagUrl: '/flags/ng.png', dialCode: '+234' },
        { code: 'NO', name: 'Norway', flagUrl: '/flags/no.png', dialCode: '+47' },
        { code: 'PK', name: 'Pakistan', flagUrl: '/flags/pk.png', dialCode: '+92' },
        { code: 'PE', name: 'Peru', flagUrl: '/flags/pe.png', dialCode: '+51' },
        { code: 'PH', name: 'Philippines', flagUrl: '/flags/ph.png', dialCode: '+63' },
        { code: 'PL', name: 'Poland', flagUrl: '/flags/pl.png', dialCode: '+48' },
        { code: 'PT', name: 'Portugal', flagUrl: '/flags/pt.png', dialCode: '+351' },
        { code: 'QA', name: 'Qatar', flagUrl: '/flags/qa.png', dialCode: '+974' },
        { code: 'RO', name: 'Romania', flagUrl: '/flags/ro.png', dialCode: '+40' },
        { code: 'RU', name: 'Russia', flagUrl: '/flags/ru.png', dialCode: '+7' },
        { code: 'SA', name: 'Saudi Arabia', flagUrl: '/flags/sa.png', dialCode: '+966' },
        { code: 'RS', name: 'Serbia', flagUrl: '/flags/rs.png', dialCode: '+381' },
        { code: 'SG', name: 'Singapore', flagUrl: '/flags/sg.png', dialCode: '+65' },
        { code: 'SK', name: 'Slovakia', flagUrl: '/flags/sk.png', dialCode: '+421' },
        { code: 'SI', name: 'Slovenia', flagUrl: '/flags/si.png', dialCode: '+386' },
        { code: 'ZA', name: 'South Africa', flagUrl: '/flags/za.png', dialCode: '+27' },
        { code: 'ES', name: 'Spain', flagUrl: '/flags/es.png', dialCode: '+34' },
        { code: 'LK', name: 'Sri Lanka', flagUrl: '/flags/lk.png', dialCode: '+94' },
        { code: 'SE', name: 'Sweden', flagUrl: '/flags/se.png', dialCode: '+46' },
        { code: 'CH', name: 'Switzerland', flagUrl: '/flags/ch.png', dialCode: '+41' },
        { code: 'SY', name: 'Syria', flagUrl: '/flags/sy.png', dialCode: '+963' },
        { code: 'TW', name: 'Taiwan', flagUrl: '/flags/tw.png', dialCode: '+886' },
        { code: 'TJ', name: 'Tajikistan', flagUrl: '/flags/tj.png', dialCode: '+992' },
        { code: 'TZ', name: 'Tanzania', flagUrl: '/flags/tz.png', dialCode: '+255' },
        { code: 'TH', name: 'Thailand', flagUrl: '/flags/th.png', dialCode: '+66' },
        { code: 'TN', name: 'Tunisia', flagUrl: '/flags/tn.png', dialCode: '+216' },
        { code: 'TR', name: 'Turkey', flagUrl: '/flags/tr.png', dialCode: '+90' },
        { code: 'TM', name: 'Turkmenistan', flagUrl: '/flags/tm.png', dialCode: '+993' },
        { code: 'UA', name: 'Ukraine', flagUrl: '/flags/ua.png', dialCode: '+380' },
        { code: 'AE', name: 'United Arab Emirates', flagUrl: '/flags/ae.png', dialCode: '+971' },
        { code: 'GB', name: 'United Kingdom', flagUrl: '/flags/gb.png', dialCode: '+44' },
        { code: 'US', name: 'United States', flagUrl: '/flags/us.png', dialCode: '+1' },
        { code: 'UZ', name: 'Uzbekistan', flagUrl: '/flags/uz.png', dialCode: '+998' },
        { code: 'VE', name: 'Venezuela', flagUrl: '/flags/ve.png', dialCode: '+58' },
        { code: 'VN', name: 'Vietnam', flagUrl: '/flags/vn.png', dialCode: '+84' },
        { code: 'YE', name: 'Yemen', flagUrl: '/flags/ye.png', dialCode: '+967' }
    ];

    private languages: Language[] = [
        { code: 'en', name: 'English', flagUrl: '/flags/gb.png' },
        { code: 'es', name: 'Spanish', flagUrl: '/flags/es.png' },
        { code: 'fr', name: 'French', flagUrl: '/flags/fr.png' },
        { code: 'de', name: 'German', flagUrl: '/flags/de.png' },
        { code: 'ru', name: 'Russian', flagUrl: '/flags/ru.png' },
        { code: 'zh', name: 'Chinese', flagUrl: '/flags/cn.png' },
        { code: 'ja', name: 'Japanese', flagUrl: '/flags/jp.png' },
        { code: 'ko', name: 'Korean', flagUrl: '/flags/kr.png' },
        { code: 'ar', name: 'Arabic', flagUrl: '/flags/sa.png' },
        { code: 'pt', name: 'Portuguese', flagUrl: '/flags/pt.png' },
        { code: 'hi', name: 'Hindi', flagUrl: '/flags/in.png' },
        { code: 'tg', name: 'Tajik', flagUrl: '/flags/tj.png' },
        { code: 'tr', name: 'Turkish', flagUrl: '/flags/tr.png' },
        { code: 'it', name: 'Italian', flagUrl: '/flags/it.png' },
        { code: 'nl', name: 'Dutch', flagUrl: '/flags/nl.png' },
        { code: 'sv', name: 'Swedish', flagUrl: '/flags/se.png' },
        { code: 'no', name: 'Norwegian', flagUrl: '/flags/no.png' },
        { code: 'da', name: 'Danish', flagUrl: '/flags/dk.png' },
        { code: 'fi', name: 'Finnish', flagUrl: '/flags/fi.png' },
        { code: 'el', name: 'Greek', flagUrl: '/flags/gr.png' },
        { code: 'he', name: 'Hebrew', flagUrl: '/flags/il.png' },
        { code: 'cs', name: 'Czech', flagUrl: '/flags/cz.png' },
        { code: 'ro', name: 'Romanian', flagUrl: '/flags/ro.png' },
        { code: 'hu', name: 'Hungarian', flagUrl: '/flags/hu.png' },
        { code: 'fa', name: 'Persian', flagUrl: '/flags/ir.png' },
        { code: 'bn', name: 'Bengali', flagUrl: '/flags/bd.png' },
        { code: 'ms', name: 'Malay', flagUrl: '/flags/my.png' },
        { code: 'fil', name: 'Filipino', flagUrl: '/flags/ph.png' },
        { code: 'pl', name: 'Polish', flagUrl: '/flags/pl.png' },
        { code: 'uk', name: 'Ukrainian', flagUrl: '/flags/ua.png' },
        { code: 'vi', name: 'Vietnamese', flagUrl: '/flags/vn.png' },
        { code: 'th', name: 'Thai', flagUrl: '/flags/th.png' },
        { code: 'id', name: 'Indonesian', flagUrl: '/flags/id.png' },
        { code: 'sk', name: 'Slovak', flagUrl: '/flags/sk.png' },
        { code: 'bg', name: 'Bulgarian', flagUrl: '/flags/bg.png' },
        { code: 'hr', name: 'Croatian', flagUrl: '/flags/hr.png' },
        { code: 'sr', name: 'Serbian', flagUrl: '/flags/rs.png' },
        { code: 'sl', name: 'Slovenian', flagUrl: '/flags/si.png' },
        { code: 'lt', name: 'Lithuanian', flagUrl: '/flags/lt.png' },
        { code: 'lv', name: 'Latvian', flagUrl: '/flags/lv.png' },
        { code: 'et', name: 'Estonian', flagUrl: '/flags/ee.png' },
        { code: 'ka', name: 'Georgian', flagUrl: '/flags/ge.png' },
        { code: 'hy', name: 'Armenian', flagUrl: '/flags/am.png' },
        { code: 'az', name: 'Azerbaijani', flagUrl: '/flags/az.png' },
        { code: 'kk', name: 'Kazakh', flagUrl: '/flags/kz.png' },
        { code: 'uz', name: 'Uzbek', flagUrl: '/flags/uz.png' },
        { code: 'ky', name: 'Kyrgyz', flagUrl: '/flags/kg.png' },
        { code: 'mn', name: 'Mongolian', flagUrl: '/flags/mn.png' },
        { code: 'ne', name: 'Nepali', flagUrl: '/flags/np.png' },
        { code: 'si', name: 'Sinhala', flagUrl: '/flags/lk.png' },
        { code: 'ur', name: 'Urdu', flagUrl: '/flags/pk.png' },
        { code: 'sw', name: 'Swahili', flagUrl: '/flags/tz.png' },
        { code: 'af', name: 'Afrikaans', flagUrl: '/flags/za.png' },
        { code: 'am', name: 'Amharic', flagUrl: '/flags/et.png' }
    ];

    // Map for quick code-to-name lookup
    private countryCodeToName: Map<string, string> = new Map();
    private countryNameToCode: Map<string, string> = new Map();

    constructor() {
        // Build lookup maps
        this.countries.forEach(c => {
            this.countryCodeToName.set(c.code.toLowerCase(), c.name);
            this.countryNameToCode.set(c.name.toLowerCase(), c.code.toLowerCase());
        });
    }

    /**
     * Get all countries sorted alphabetically
     */
    getAllCountries(): Country[] {
        return [...this.countries].sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get countries as dropdown options with 'Any' option
     */
    getCountryOptions(includeAny: boolean = true): { value: string; label: string; flagUrl: string }[] {
        const options = this.countries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => ({
                value: c.name,  // Use country name as value for consistency
                label: c.name,
                flagUrl: c.flagUrl
            }));

        if (includeAny) {
            return [{ value: 'any', label: 'Any Location', flagUrl: '' }, ...options];
        }
        return options;
    }

    /**
     * Get all languages sorted alphabetically
     */
    getAllLanguages(): Language[] {
        return [...this.languages].sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get languages as dropdown options with 'Any' option
     */
    getLanguageOptions(includeAny: boolean = true): { value: string; label: string; flagUrl: string }[] {
        const options = this.languages
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(l => ({
                value: l.code,
                label: l.name,
                flagUrl: l.flagUrl
            }));

        if (includeAny) {
            return [{ value: 'any', label: 'Any Language', flagUrl: '' }, ...options];
        }
        return options;
    }

    /**
     * Get country by code
     */
    getCountryByCode(code: string): Country | undefined {
        return this.countries.find(c => c.code.toLowerCase() === code.toLowerCase());
    }

    /**
     * Get country by name
     */
    getCountryByName(name: string): Country | undefined {
        return this.countries.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Get language by code
     */
    getLanguageByCode(code: string): Language | undefined {
        return this.languages.find(l => l.code.toLowerCase() === code.toLowerCase());
    }

    /**
     * Get flag URL for a country (by code or name)
     */
    getFlagUrl(countryCodeOrName: string): string {
        if (!countryCodeOrName) return '';

        const input = countryCodeOrName.toLowerCase().trim();

        // Check if it's a 2-letter code
        if (input.length === 2) {
            const country = this.getCountryByCode(input);
            return country?.flagUrl || `/flags/${input}.png`;
        }

        // Try to find by name
        const country = this.getCountryByName(countryCodeOrName);
        if (country) {
            return country.flagUrl;
        }

        // Fallback: try using the input as a code
        return `/flags/${input}.png`;
    }

    /**
     * Get flag URL for a language
     */
    getLanguageFlagUrl(langCode: string): string {
        if (!langCode) return '';
        const lang = this.getLanguageByCode(langCode);
        return lang?.flagUrl || '';
    }

    /**
     * Get country name by code
     */
    getCountryName(code: string): string {
        const country = this.getCountryByCode(code);
        return country?.name || code;
    }

    /**
     * Get language name by code
     */
    getLanguageName(code: string): string {
        const lang = this.getLanguageByCode(code);
        return lang?.name || code;
    }

    /**
     * Get country code from name
     */
    getCountryCode(name: string): string {
        const country = this.getCountryByName(name);
        return country?.code.toLowerCase() || name.toLowerCase();
    }

    /**
     * Get primary language code for a country (name or code)
     */
    getLanguageFromCountry(countryNameOrCode: string): string {
        if (!countryNameOrCode) return 'en';

        const countryCode = this.getCountryCode(countryNameOrCode).toLowerCase();

        // Manual mapping for translation support
        const countryToLang: { [key: string]: string } = {
            'tj': 'tg', // Tajikistan -> Tajik
            'ru': 'ru', // Russia -> Russian
            'us': 'en', 'gb': 'en', 'ca': 'en', 'au': 'en',
            'es': 'es', 'mx': 'es', 'co': 'es',
            'fr': 'fr',
            'de': 'de',
            'it': 'it',
            'pt': 'pt', 'br': 'pt',
            'cn': 'zh',
            'jp': 'ja',
            'kr': 'ko',
            'in': 'hi',
            'sa': 'ar', 'ae': 'ar', 'eg': 'ar',
            'tr': 'tr',
            'pl': 'pl',
            'ua': 'uk',
            'vn': 'vi',
            'th': 'th',
            'id': 'id',
            'uz': 'uz',
            'kz': 'kk',
            'kg': 'ky',
            'am': 'hy',
            'az': 'az',
            'ge': 'ka'
        };

        return countryToLang[countryCode] || 'en';
    }
}
