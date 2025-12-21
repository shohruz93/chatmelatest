import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private currentLang = signal(localStorage.getItem('lang') || 'en');

    private translations: any = {
        'en': {
            'HOME': {
                'TITLE': 'Chatme - Connect with the World',
                'SUBTITLE': 'Find new friends, practice languages, and chat with people across the globe.',
                'START_CHATTING': 'Start Chatting Now',
                'FIND_MATCH': 'Find a Match',
                'FEATURES': 'Features',
                'ABOUT': 'About'
            },
            'NAV': {
                'DASHBOARD': 'Dashboard',
                'CHAT': 'Chat',
                'PROFILE': 'Profile',
                'LOGOUT': 'Logout',
                'LANGUAGE': 'Language'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Select a Conversation',
                'START_NOW': 'Start chatting now',
                'WELCOME': 'Welcome to Chatme',
                'WELCOME_SUB': 'Select a conversation or find a new match to start chatting.',
                'TYPE_MESSAGE': 'Type a message...',
                'ONLINE': 'Online',
                'OFFLINE': 'Offline'
            },
            'COMMON': {
                'SAVE': 'Save',
                'CANCEL': 'Cancel',
                'CLOSE': 'Close',
                'SUBMIT': 'Submit'
            }
        },
        'ru': {
            'HOME': {
                'TITLE': 'Chatme - Соединяйтесь с миром',
                'SUBTITLE': 'Находите новых друзей, практикуйте языки и общайтесь с людьми по всему миру.',
                'START_CHATTING': 'Начать чат сейчас',
                'FIND_MATCH': 'Найти пару',
                'FEATURES': 'Функции',
                'ABOUT': 'О нас'
            },
            'NAV': {
                'DASHBOARD': 'Панель',
                'CHAT': 'Чат',
                'PROFILE': 'Профиль',
                'LOGOUT': 'Выйти',
                'LANGUAGE': 'Язык'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Выберите беседу',
                'START_NOW': 'Начните общаться прямо сейчас',
                'WELCOME': 'Добро пожаловать в Chatme',
                'WELCOME_SUB': 'Выберите беседу или найдите новую пару, чтобы начать чат.',
                'TYPE_MESSAGE': 'Введите сообщение...',
                'ONLINE': 'В сети',
                'OFFLINE': 'Не в сети'
            },
            'COMMON': {
                'SAVE': 'Сохранить',
                'CANCEL': 'Отмена',
                'CLOSE': 'Закрыть',
                'SUBMIT': 'Отправить'
            }
        },
        'tj': {
            'HOME': {
                'TITLE': 'Chatme - Бо ҷаҳон пайваст шавед',
                'SUBTITLE': 'Дӯстони нав пайдо кунед, забонҳоро омӯзед ва бо одамон дар саросари ҷаҳон сӯҳбат кунед.',
                'START_CHATTING': 'Ҳозир ба сӯҳбат оғоз кунед',
                'FIND_MATCH': 'Ҷустуҷӯи ҳамсӯҳбат',
                'FEATURES': 'Имкониятҳо',
                'ABOUT': 'Дар бораи мо'
            },
            'NAV': {
                'DASHBOARD': 'Панел',
                'CHAT': 'Чат',
                'PROFILE': 'Профил',
                'LOGOUT': 'Баромад',
                'LANGUAGE': 'Забон'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Сӯҳбатро интихоб кунед',
                'START_NOW': 'Ҳозир ба сӯҳбат оғоз кунед',
                'WELCOME': 'Хуш омадед ба Chatme',
                'WELCOME_SUB': 'Барои оғози сӯҳбат ягон касро интихоб кунед ё ҳамсӯҳбати нав ҷӯед.',
                'TYPE_MESSAGE': 'Паём нависед...',
                'ONLINE': 'Дар шабака',
                'OFFLINE': 'Ғайрифаъол'
            },
            'COMMON': {
                'SAVE': 'Захира кардан',
                'CANCEL': 'Бекор кардан',
                'CLOSE': 'Пӯшидан',
                'SUBMIT': 'Фиристодан'
            }
        },
        'es': {
            'HOME': {
                'TITLE': 'Chatme - Conecta con el mundo',
                'SUBTITLE': 'Encuentra nuevos amigos, practica idiomas y chatea con personas de todo el mundo.',
                'START_CHATTING': 'Empieza a chatear ahora',
                'FIND_MATCH': 'Encontrar pareja',
                'FEATURES': 'Características',
                'ABOUT': 'Acerca de'
            },
            'NAV': {
                'DASHBOARD': 'Panel',
                'CHAT': 'Chat',
                'PROFILE': 'Perfil',
                'LOGOUT': 'Cerrar sesión',
                'LANGUAGE': 'Idioma'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Selecciona una conversación',
                'START_NOW': 'Empieza a chatear ahora',
                'WELCOME': 'Bienvenido a Chatme',
                'WELCOME_SUB': 'Selecciona una conversación o busca una nueva coincidencia para empezar a chatear.',
                'TYPE_MESSAGE': 'Escribe un mensaje...',
                'ONLINE': 'En línea',
                'OFFLINE': 'Desconectado'
            },
            'COMMON': {
                'SAVE': 'Guardar',
                'CANCEL': 'Cancelar',
                'CLOSE': 'Cerrar',
                'SUBMIT': 'Enviar'
            }
        },
        'ar': {
            'HOME': {
                'TITLE': 'Chatme - تواصل مع العالم',
                'SUBTITLE': 'ابحث عن أصدقاء جدد، ومارس اللغات، ودردش مع أشخاص من جميع أنحاء العالم.',
                'START_CHATTING': 'ابدأ الدردشة الآن',
                'FIND_MATCH': 'البحث عن صديق',
                'FEATURES': 'المميزات',
                'ABOUT': 'حول'
            },
            'NAV': {
                'DASHBOARD': 'لوحة التحكم',
                'CHAT': 'الدردشة',
                'PROFILE': 'الملف الشخصي',
                'LOGOUT': 'تسجيل الخروج',
                'LANGUAGE': 'اللغة'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'اختر محادثة',
                'START_NOW': 'ابدأ الدردشة الآن',
                'WELCOME': 'مرحباً بك في Chatme',
                'WELCOME_SUB': 'اختر محادثة أو ابحث عن صديق جديد لبدء الدردشة.',
                'TYPE_MESSAGE': 'اكتب رسالة...',
                'ONLINE': 'متصل',
                'OFFLINE': 'غير متصل'
            },
            'COMMON': {
                'SAVE': 'حفظ',
                'CANCEL': 'إلغاء',
                'CLOSE': 'إغلاق',
                'SUBMIT': 'إرسال'
            }
        },
        'fr': {
            'HOME': {
                'TITLE': 'Chatme - Connectez-vous au monde',
                'SUBTITLE': 'Trouvez de nouveaux amis, pratiquez les langues et discutez avec des gens du monde entier.',
                'START_CHATTING': 'Commencez à discuter maintenant',
                'FIND_MATCH': 'Trouver un match',
                'FEATURES': 'Fonctionnalités',
                'ABOUT': 'À propos'
            },
            'NAV': {
                'DASHBOARD': 'Tableau de bord',
                'CHAT': 'Chat',
                'PROFILE': 'Profil',
                'LOGOUT': 'Déconnexion',
                'LANGUAGE': 'Langue'
            }
        },
        'de': {
            'HOME': {
                'TITLE': 'Chatme - Verbinde dich mit der Welt',
                'SUBTITLE': 'Finde neue Freunde, übe Sprachen und chatte mit Menschen auf der ganzen Welt.',
                'START_CHATTING': 'Jetzt chatten',
                'FIND_MATCH': 'Einen Match finden',
                'FEATURES': 'Funktionen',
                'ABOUT': 'Über uns'
            }
        },
        'zh': {
            'HOME': {
                'TITLE': 'Chatme - 与世界联系',
                'SUBTITLE': '寻找新朋友，练习语言，并与世界各地的人聊天。',
                'START_CHATTING': '现在开始聊天',
                'FIND_MATCH': '寻找匹配',
                'FEATURES': '功能',
                'ABOUT': '关于'
            }
        },
        'hi': {
            'HOME': {
                'TITLE': 'Chatme - दुनिया से जुड़ें',
                'SUBTITLE': 'नए दोस्त खोजें, भाषाओं का अभ्यास करें, और दुनिया भर के लोगों के साथ चैट करें।',
                'START_CHATTING': 'अभी चैट शुरू करें',
                'FIND_MATCH': 'मैच खोजें',
                'FEATURES': 'विशेषताएं',
                'ABOUT': 'हमारे बारे में'
            }
        }
    };

    supportedLanguages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'tj', name: 'Тоҷикӣ', flag: '🇹🇯' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
    ];

    translate(key: string): string {
        const lang = this.currentLang();
        const keys = key.split('.');
        let result = this.translations[lang] || this.translations['en'];

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k];
            } else {
                // Fallback to English if key missing in current language
                let fallback = this.translations['en'];
                for (const fk of keys) {
                    if (fallback && fallback[fk]) {
                        fallback = fallback[fk];
                    } else {
                        return key; // Return key if not found at all
                    }
                }
                return fallback;
            }
        }
        return result;
    }

    setLanguage(code: string) {
        if (this.translations[code] || this.supportedLanguages.find(l => l.code === code)) {
            this.currentLang.set(code);
            localStorage.setItem('lang', code);
            // Some languages are RTL
            this.updateLayoutDirection(code);
        }
    }

    getCurrentLanguage() {
        return this.currentLang();
    }

    private updateLayoutDirection(code: string) {
        const isRtl = code === 'ar';
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = code;
    }

    // Initialize layout direction on service creation
    constructor() {
        this.updateLayoutDirection(this.currentLang());
    }
}
