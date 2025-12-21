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
                'ABOUT': 'About',
                'HERO_TITLE_PREFIX': 'Connect with people who share your',
                'HERO_TITLE_SUFFIX': 'vibe.',
                'HERO_SUBTITLE': 'Experience real-time random chat with automatic translation and interest matching. Break language barriers and find your tribe.',
                'FEATURE_TRANS_TITLE': 'Real-Time Translation',
                'FEATURE_TRANS_DESC': 'Break language barriers with automatic message translation. Chat with anyone worldwide in your native language.',
                'FEATURE_MATCH_TITLE': 'Smart Matching',
                'FEATURE_MATCH_DESC': 'Our AI-powered algorithm matches you with people who share your interests and vibe for better conversations.',
                'FEATURE_INSTANT_TITLE': 'Instant Connection',
                'FEATURE_INSTANT_DESC': 'Connect with someone new in seconds. No waiting, no algorithms - just pure spontaneous conversation.',
                'FEATURE_PRIVACY_TITLE': 'Privacy First',
                'FEATURE_PRIVACY_DESC': 'Your conversations are encrypted and private. We don\'t store chat history or share your personal data.',
                'FEATURE_TAGS_TITLE': 'Interest Tags',
                'FEATURE_TAGS_DESC': 'Add interest tags to your profile and get matched with people who share your hobbies and passions.',
                'FEATURE_THEME_TITLE': 'Dark/Light Mode',
                'FEATURE_THEME_DESC': 'Choose your preferred theme with beautiful dark and light modes for comfortable chatting any time.',
                'SECTION_FEATURES_TITLE': 'Powerful Features',
                'SECTION_FEATURES_SUB': 'Everything you need for meaningful connections',
                'SECTION_ABOUT_TITLE': 'About Chatme',
                'SECTION_ABOUT_SUB': 'Breaking barriers, building connections',
                'MISSION_TITLE': 'Our Mission',
                'MISSION_DESC': 'Chatme was created with a simple yet powerful vision: to connect people from all walks of life, regardless of language or location. We believe that meaningful conversations can happen anywhere, at any time, between anyone.',
                'JOIN_TITLE': 'Join Our Community',
                'JOIN_DESC': 'Whether you\'re looking to practice a new language, make friends from around the world, or simply have interesting conversations with like-minded people, Chatme is here for you. Join thousands of users who are already breaking barriers and building connections.',
                'CTA_JOIN': 'Start Your Journey',
                'STATS_USERS': 'Active Users',
                'STATS_COUNTRIES': 'Countries',
                'STATS_CONVERSATIONS': 'Conversations',
                'STATS_LANGUAGES': 'Languages',
                'FOOTER_RIGHTS': '© 2025 Chatme. All rights reserved.'
            },
            'NAV': {
                'DASHBOARD': 'Dashboard',
                'CHAT': 'Chat',
                'PROFILE': 'Profile',
                'LOGOUT': 'Logout',
                'LOGIN': 'Login',
                'LANGUAGE': 'Language',
                'MESSAGES': 'Messages',
                'EXPLORE': 'Explore',
                'GUESTS': 'Guests',
                'ADMIN_PANEL': 'Admin Panel',
                'CONTACT_ADMIN': 'Contact Admin',
                'LIGHT_MODE': 'Light Mode',
                'DARK_MODE': 'Dark Mode'
            },
            'PROFILE': {
                'ABOUT': 'About',
                'LANGUAGES': 'Languages',
                'NATIVE': 'Native',
                'LEARNING': 'Learning',
                'INTERESTS': 'Interests',
                'COMMENTS_RATINGS': 'Comments & Ratings',
                'RATE_USER': 'Rate this user',
                'WRITE_COMMENT_OPTIONAL': 'Write a comment (optional)...',
                'SUBMIT_RATING': 'Submit Rating',
                'ADD_COMMENT': 'Add a comment',
                'WRITE_COMMENT': 'Write a comment...',
                'ADD_COMMENT_BTN': 'Add Comment',
                'REPLY': 'Reply',
                'SEND': 'Send',
                'SHOW': 'Show',
                'HIDE': 'Hide',
                'REPLIES': 'replies',
                'REPLY_SINGULAR': 'reply',
                'NO_COMMENTS': 'No comments yet.',
                'SEND_MESSAGE': 'Send Message'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Select a Conversation',
                'START_NOW': 'Start chatting now',
                'WELCOME': 'Welcome to Chatme',
                'WELCOME_SUB': 'Select a conversation or find a new match to start chatting.',
                'TYPE_MESSAGE': 'Type a message...',
                'ONLINE': 'Online',
                'OFFLINE': 'Offline',
                'CHAT_PARTNER': 'Chat Partner',
                'EMPTY_STATE_TITLE': 'Welcome to Chatme',
                'EMPTY_STATE_DESC': 'Select a conversation or find a new match to start chatting.',
                'SEND_IMAGE': 'Send Image',
                'SEND_STICKER': 'Send Sticker',
                'VOICE_MESSAGE': 'Voice Message',
                'RATING_TITLE': 'Rate Experience',
                'RATING_Question': 'How was your conversation?',
                'RATING_COMMENT_PLACEHOLDER': 'Any comments?',
                'SKIP': 'Skip',
                'SUBMIT': 'Submit',
                'REQUEST_TITLE': 'New Chat Request',
                'REQUEST_DESC': 'wants to chat with you!',
                'DECLINE': 'Decline',
                'ACCEPT': 'Accept',
                'FIND_MATCH_TITLE': 'Find Match',
                'GENDER': 'Gender',
                'ANY_GENDER': 'Any Gender',
                'MALE': 'Male',
                'FEMALE': 'Female',
                'LOCATION': 'Location',
                'ANY_LOCATION': 'Any Location',
                'ONLINE_ONLY': 'Online Only',
                'SEARCH': 'Search'
            },
            'COMMON': {
                'SAVE': 'Save',
                'CANCEL': 'Cancel',
                'CLOSE': 'Close',
                'SUBMIT': 'Submit',
                'SEARCH_PLACEHOLDER': 'Search...',
                'NO_RESULTS': 'No results found'
            }
        },
        'ru': {
            'HOME': {
                'TITLE': 'Chatme - Соединяйтесь с миром',
                'HERO_TITLE_PREFIX': 'Общайтесь с людьми, которые разделяют вашу',
                'HERO_TITLE_SUFFIX': 'атмосферу.',
                'HERO_SUBTITLE': 'Испытайте случайный чат в реальном времени с автоматическим переводом и подбором по интересам.',
                'FEATURE_TRANS_TITLE': 'Перевод в реальном времени',
                'FEATURE_TRANS_DESC': 'Преодолейте языковые барьеры с автоматическим переводом сообщений.',
                'FEATURE_MATCH_TITLE': 'Умный подбор',
                'FEATURE_MATCH_DESC': 'Наш алгоритм подбирает людей, разделяющих ваши интересы.',
                'FEATURE_INSTANT_TITLE': 'Мгновенное соединение',
                'FEATURE_INSTANT_DESC': 'Соединяйтесь с кем-то новым за секунды.',
                'FEATURE_PRIVACY_TITLE': 'Конфиденциальность',
                'FEATURE_PRIVACY_DESC': 'Ваши разговоры зашифрованы и приватны.',
                'FEATURE_TAGS_TITLE': 'Теги интересов',
                'FEATURE_TAGS_DESC': 'Добавьте теги интересов в ваш профиль.',
                'FEATURE_THEME_TITLE': 'Тёмная/Светлая тема',
                'FEATURE_THEME_DESC': 'Выберите предпочтительную тему для комфортного общения.',
                'SECTION_FEATURES_TITLE': 'Мощные функции',
                'SECTION_FEATURES_SUB': 'Всё, что нужно для значимых связей',
                'SECTION_ABOUT_TITLE': 'О Chatme',
                'SECTION_ABOUT_SUB': 'Разрушаем барьеры, строим связи',
                'MISSION_TITLE': 'Наша миссия',
                'MISSION_DESC': 'Chatme был создан с простой, но мощной идеей: соединять людей из всех слоев общества.',
                'JOIN_TITLE': 'Присоединяйтесь к сообществу',
                'JOIN_DESC': 'Ищете ли вы практику нового языка или новых друзей, Chatme для вас.',
                'CTA_JOIN': 'Начать путешествие',
                'START_CHATTING': 'Начать чат',
                'STATS_USERS': 'Активных пользователей',
                'STATS_COUNTRIES': 'Страны',
                'STATS_CONVERSATIONS': 'Разговоров',
                'STATS_LANGUAGES': 'Языков',
                'FOOTER_RIGHTS': '© 2025 Chatme. Все права защищены.'
            },
            'NAV': {
                'DASHBOARD': 'Панель',
                'CHAT': 'Чат',
                'PROFILE': 'Профиль',
                'LOGOUT': 'Выйти',
                'LOGIN': 'Войти',
                'LANGUAGE': 'Язык',
                'MESSAGES': 'Сообщения',
                'EXPLORE': 'Поиск',
                'GUESTS': 'Гости',
                'ADMIN_PANEL': 'Админ панель',
                'CONTACT_ADMIN': 'Связаться с админом',
                'LIGHT_MODE': 'Светлая тема',
                'DARK_MODE': 'Тёмная тема'
            },
            'PROFILE': {
                'ABOUT': 'О себе',
                'LANGUAGES': 'Языки',
                'NATIVE': 'Родной',
                'LEARNING': 'Изучаемый',
                'INTERESTS': 'Интересы',
                'COMMENTS_RATINGS': 'Комментарии и рейтинг',
                'RATE_USER': 'Оценить пользователя',
                'WRITE_COMMENT_OPTIONAL': 'Написать комментарий (необязательно)...',
                'SUBMIT_RATING': 'Отправить оценку',
                'ADD_COMMENT': 'Добавить комментарий',
                'WRITE_COMMENT': 'Написать комментарий...',
                'ADD_COMMENT_BTN': 'Добавить',
                'REPLY': 'Ответить',
                'SEND': 'Отправить',
                'SHOW': 'Показать',
                'HIDE': 'Скрыть',
                'REPLIES': 'ответов',
                'REPLY_SINGULAR': 'ответ',
                'NO_COMMENTS': 'Нет комментариев.',
                'SEND_MESSAGE': 'Отправить сообщение'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Выберите беседу',
                'START_NOW': 'Начните общаться прямо сейчас',
                'WELCOME': 'Добро пожаловать в Chatme',
                'WELCOME_SUB': 'Выберите беседу или найдите новую пару, чтобы начать чат.',
                'TYPE_MESSAGE': 'Введите сообщение...',
                'ONLINE': 'В сети',
                'OFFLINE': 'Не в сети',
                'CHAT_PARTNER': 'Собеседник',
                'EMPTY_STATE_TITLE': 'Добро пожаловать в Chatme',
                'EMPTY_STATE_DESC': 'Выберите беседу или найдите новую пару.',
                'SEND_IMAGE': 'Отправить фото',
                'SEND_STICKER': 'Отправить стикер',
                'VOICE_MESSAGE': 'Голосовое сообщение',
                'RATING_TITLE': 'Оцените опыт',
                'RATING_Question': 'Как прошел ваш разговор?',
                'RATING_COMMENT_PLACEHOLDER': 'Комментарии?',
                'SKIP': 'Пропустить',
                'SUBMIT': 'Отправить',
                'REQUEST_TITLE': 'Новый запрос чата',
                'REQUEST_DESC': 'хочет пообщаться с вами!',
                'DECLINE': 'Отклонить',
                'ACCEPT': 'Принять',
                'FIND_MATCH_TITLE': 'Найти пару',
                'GENDER': 'Пол',
                'ANY_GENDER': 'Любой пол',
                'MALE': 'Мужской',
                'FEMALE': 'Женский',
                'LOCATION': 'Местоположение',
                'ANY_LOCATION': 'Любое местоположение',
                'ONLINE_ONLY': 'Только онлайн',
                'SEARCH': 'Поиск'
            },
            'COMMON': {
                'SAVE': 'Сохранить',
                'CANCEL': 'Отмена',
                'CLOSE': 'Закрыть',
                'SUBMIT': 'Отправить',
                'SEARCH_PLACEHOLDER': 'Поиск...',
                'NO_RESULTS': 'Результаты не найдены'
            }
        },
        'tj': {
            'HOME': {
                'TITLE': 'Chatme - Бо ҷаҳон пайваст шавед',
                'HERO_TITLE_PREFIX': 'Бо одамоне пайваст шавед, ки',
                'HERO_TITLE_SUFFIX': 'ҳамфикри шумоянд.',
                'HERO_SUBTITLE': 'Сӯҳбати тасодуфии воқеӣ бо тарҷумаи автоматӣ ва мувофиқати манфиатҳо.',
                'FEATURE_TRANS_TITLE': 'Тарҷумаи воқеӣ',
                'FEATURE_TRANS_DESC': 'Монеаҳои забониро бо тарҷумаи автоматии паёмҳо бартараф кунед.',
                'FEATURE_MATCH_TITLE': 'Мувофиқати ҳушманд',
                'FEATURE_MATCH_DESC': 'Алгоритми мо шуморо бо одамоне, ки манфиатҳои муштарак доранд, пайваст мекунад.',
                'FEATURE_INSTANT_TITLE': 'Пайвастшавии фаврӣ',
                'FEATURE_INSTANT_DESC': 'Дар сонияҳо бо каси нав пайваст шавед.',
                'FEATURE_PRIVACY_TITLE': 'Махфият дар ҷои аввал',
                'FEATURE_PRIVACY_DESC': 'Сӯҳбатҳои шумо рамзгузорӣ шудаанд ва махфӣ мебошанд.',
                'FEATURE_TAGS_TITLE': 'Тегҳои манфиатҳо',
                'FEATURE_TAGS_DESC': 'Ба профили худ тегҳои манфиатҳоро илова кунед.',
                'FEATURE_THEME_TITLE': 'Реҷаи торик/равшан',
                'FEATURE_THEME_DESC': 'Мавзӯи писандидаи худро интихоб кунед.',
                'SECTION_FEATURES_TITLE': 'Имкониятҳои пурқувват',
                'SECTION_FEATURES_SUB': 'Ҳама чиз барои робитаҳои маънодор',
                'SECTION_ABOUT_TITLE': 'Дар бораи Chatme',
                'SECTION_ABOUT_SUB': 'Бартараф кардани монеаҳо, бунёди робитаҳо',
                'MISSION_TITLE': 'Мақсади мо',
                'MISSION_DESC': 'Chatme барои пайваст кардани одамон аз тамоми табақаҳои ҳаёт сохта шудааст.',
                'JOIN_TITLE': 'Ба ҷамъияти мо ҳамроҳ шавед',
                'JOIN_DESC': 'Хоҳ шумо забони навро омӯхтанӣ бошед, хоҳ дӯстони нав пайдо карданӣ бошед, Chatme барои шумост.',
                'CTA_JOIN': 'Оғози сафар',
                'START_CHATTING': 'Оғози сӯҳбат',
                'STATS_USERS': 'Корбарони фаъол',
                'STATS_COUNTRIES': 'Кишварҳо',
                'STATS_CONVERSATIONS': 'Сӯҳбатҳо',
                'STATS_LANGUAGES': 'Забонҳо',
                'FOOTER_RIGHTS': '© 2025 Chatme. Ҳама ҳуқуқ маҳфуз аст.'
            },
            'NAV': {
                'DASHBOARD': 'Панел',
                'CHAT': 'Чат',
                'PROFILE': 'Профил',
                'LOGOUT': 'Баромад',
                'LOGIN': 'Ворид шудан',
                'LANGUAGE': 'Забон',
                'MESSAGES': 'Паёмҳо',
                'EXPLORE': 'Ҷустуҷӯ',
                'GUESTS': 'Меҳмонон',
                'ADMIN_PANEL': 'Панели администратор',
                'CONTACT_ADMIN': 'Тамос бо админ',
                'LIGHT_MODE': 'Реҷаи равшан',
                'DARK_MODE': 'Реҷаи торик'
            },
            'PROFILE': {
                'ABOUT': 'Дар бораи ман',
                'LANGUAGES': 'Забонҳо',
                'NATIVE': 'Модарӣ',
                'LEARNING': 'Омӯхта истодаам',
                'INTERESTS': 'Манфиатҳо',
                'COMMENTS_RATINGS': 'Шарҳҳо ва баҳодиҳӣ',
                'RATE_USER': 'Баҳо додан',
                'WRITE_COMMENT_OPTIONAL': 'Шарҳ нависед (ихтиёрӣ)...',
                'SUBMIT_RATING': 'Фиристодани баҳо',
                'ADD_COMMENT': 'Илова кардани шарҳ',
                'WRITE_COMMENT': 'Шарҳ нависед...',
                'ADD_COMMENT_BTN': 'Илова кардан',
                'REPLY': 'Ҷавоб додан',
                'SEND': 'Равон кардан',
                'SHOW': 'Нишон додан',
                'HIDE': 'Пинҳон кардан',
                'REPLIES': 'ҷавобҳо',
                'REPLY_SINGULAR': 'ҷавоб',
                'NO_COMMENTS': 'Ҳанӯз шарҳ нест.',
                'SEND_MESSAGE': 'Равон кардани паём'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'Сӯҳбатро интихоб кунед',
                'START_NOW': 'Ҳозир ба сӯҳбат оғоз кунед',
                'WELCOME': 'Хуш омадед ба Chatme',
                'WELCOME_SUB': 'Барои оғози сӯҳбат ягон касро интихоб кунед ё ҳамсӯҳбати нав ҷӯед.',
                'TYPE_MESSAGE': 'Паём нависед...',
                'ONLINE': 'Дар шабака',
                'OFFLINE': 'Ғайрифаъол',
                'CHAT_PARTNER': 'Ҳамсӯҳбат',
                'EMPTY_STATE_TITLE': 'Хуш омадед ба Chatme',
                'EMPTY_STATE_DESC': 'Сӯҳбатро интихоб кунед ё ҷуфти нав пайдо кунед.',
                'SEND_IMAGE': 'Равон кардани акс',
                'SEND_STICKER': 'Равон кардани стикер',
                'VOICE_MESSAGE': 'Паёми овозӣ',
                'RATING_TITLE': 'Баҳо диҳед',
                'RATING_Question': 'Сӯҳбат чӣ гуна гузашт?',
                'RATING_COMMENT_PLACEHOLDER': 'Шарҳҳо?',
                'SKIP': 'Гузаштан',
                'SUBMIT': 'Равон кардан',
                'REQUEST_TITLE': 'Дархости нави чат',
                'REQUEST_DESC': 'мехоҳад бо шумо сӯҳбат кунад!',
                'DECLINE': 'Рад кардан',
                'ACCEPT': 'Қабул кардан',
                'FIND_MATCH_TITLE': 'Ҷустуҷӯи ҷуфт',
                'GENDER': 'Ҷинс',
                'ANY_GENDER': 'Ҳар гуна',
                'MALE': 'Мард',
                'FEMALE': 'Зан',
                'LOCATION': 'Макон',
                'ANY_LOCATION': 'Ҳар ҷо',
                'ONLINE_ONLY': 'Танҳо онлайн',
                'SEARCH': 'Ҷустуҷӯ'
            },
            'COMMON': {
                'SAVE': 'Захира кардан',
                'CANCEL': 'Бекор кардан',
                'CLOSE': 'Пӯшидан',
                'SUBMIT': 'Фиристодан',
                'SEARCH_PLACEHOLDER': 'Ҷустуҷӯ...',
                'NO_RESULTS': 'Натиҷаҳо ёфт нашуданд'
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
                'OFFLINE': 'Desconectado',
                'REQUEST_TITLE': 'New Chat Request',
                'REQUEST_DESC': 'wants to chat with you!',
                'DECLINE': 'Decline',
                'ACCEPT': 'Accept'
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
                'OFFLINE': 'غير متصل',
                'REQUEST_TITLE': 'New Chat Request',
                'REQUEST_DESC': 'wants to chat with you!',
                'DECLINE': 'Decline',
                'ACCEPT': 'Accept'
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
        },
        'fa': {
            'HOME': {
                'TITLE': 'Chatme - با جهان ارتباط برقرار کنید',
                'SUBTITLE': 'دوستان جدید پیدا کنید، زبان‌ها را تمرین کنید و با مردم سراسر جهان گفتگو کنید.',
                'START_CHATTING': 'شروع گفتگو',
                'FIND_MATCH': 'یافتن دوست',
                'FEATURES': 'ویژگی‌ها',
                'ABOUT': 'درباره ما',
                'HERO_TITLE_PREFIX': 'با افرادی که',
                'HERO_TITLE_SUFFIX': 'هم‌فرکانس شما هستند ارتباط برقرار کنید.',
                'HERO_SUBTITLE': 'تجربه چت تصادفی بلادرنگ با ترجمه خودکار و تطبیق علایق. موانع زبانی را بشکنید و قبیله خود را پیدا کنید.',
                'SECTION_FEATURES_TITLE': 'ویژگی‌های قدرتمند',
                'SECTION_FEATURES_SUB': 'همه چیز برای ارتباطات معنادار',
                'SECTION_ABOUT_TITLE': 'درباره چت‌می',
                'SECTION_ABOUT_SUB': 'شکستن موانع، ساختن ارتباطات',
                'MISSION_TITLE': 'ماموریت ما',
                'MISSION_DESC': 'چت‌می با یک چشم‌انداز ساده اما قدرتمند ایجاد شد: اتصال مردم از همه اقشار زندگی، صرف نظر از زبان یا مکان.',
                'JOIN_TITLE': 'به جامعه ما بپیوندید',
                'JOIN_DESC': 'چه به دنبال تمرین زبان جدید باشید، چه پیدا کردن دوستانی از سراسر جهان، چت‌می برای شماست.',
                'CTA_JOIN': 'شروع سفر',
                'STATS_USERS': 'کاربران فعال',
                'STATS_COUNTRIES': 'کشورها',
                'STATS_CONVERSATIONS': 'گفتگوها',
                'STATS_LANGUAGES': 'زبان‌ها',
                'FOOTER_RIGHTS': '© 2025 Chatme. تمامی حقوق محفوظ است.'
            },
            'NAV': {
                'DASHBOARD': 'داشبورد',
                'CHAT': 'چت',
                'PROFILE': 'پروفایل',
                'LOGOUT': 'خروج',
                'LOGIN': 'ورود',
                'LANGUAGE': 'زبان',
                'MESSAGES': 'پیام‌ها',
                'EXPLORE': 'کاوش',
                'GUESTS': 'مهمانان',
                'ADMIN_PANEL': 'پنل مدیریت',
                'CONTACT_ADMIN': 'تماس با مدیر',
                'LIGHT_MODE': 'حالت روشن',
                'DARK_MODE': 'حالت تاریک'
            },
            'PROFILE': {
                'ABOUT': 'درباره من',
                'LANGUAGES': 'زبان‌ها',
                'NATIVE': 'مادری',
                'LEARNING': 'در حال یادگیری',
                'INTERESTS': 'علایق',
                'COMMENTS_RATINGS': 'نظرات و امتیازات',
                'RATE_USER': 'امتیاز به کاربر',
                'WRITE_COMMENT_OPTIONAL': 'نظر بنویسید (اختیاری)...',
                'SUBMIT_RATING': 'ثبت امتیاز',
                'ADD_COMMENT': 'افزودن نظر',
                'WRITE_COMMENT': 'نظر بنویسید...',
                'ADD_COMMENT_BTN': 'افزودن',
                'REPLY': 'پاسخ',
                'SEND': 'ارسال',
                'SHOW': 'نمایش',
                'HIDE': 'پنهان کردن',
                'REPLIES': 'پاسخ‌ها',
                'REPLY_SINGULAR': 'پاسخ',
                'NO_COMMENTS': 'هنوز نظری ثبت نشده است.',
                'SEND_MESSAGE': 'ارسال پیام'
            },
            'CHAT': {
                'SELECT_CONVERSATION': 'انتخاب گفتگو',
                'START_NOW': 'همین حالا شروع کنید',
                'WELCOME': 'به چت‌می خوش آمدید',
                'WELCOME_SUB': 'یک گفتگو را انتخاب کنید یا برای شروع چت یک دوست جدید پیدا کنید.',
                'TYPE_MESSAGE': 'پیام بنویسید...',
                'ONLINE': 'آنلاین',
                'OFFLINE': 'آفلاین',
                'CHAT_PARTNER': 'هم‌صحبت',
                'EMPTY_STATE_TITLE': 'به چت‌می خوش آمدید',
                'EMPTY_STATE_DESC': 'یک گفتگو را انتخاب کنید یا برای شروع چت یک دوست جدید پیدا کنید.',
                'SEND_IMAGE': 'ارسال تصویر',
                'SEND_STICKER': 'ارسال استیکر',
                'VOICE_MESSAGE': 'پیام صوتی',
                'RATING_TITLE': 'امتیاز به تجربه',
                'RATING_Question': 'گفتگوی شما چطور بود؟',
                'RATING_COMMENT_PLACEHOLDER': 'نظری دارید؟',
                'SKIP': 'رد کردن',
                'SUBMIT': 'ثبت',
                'REQUEST_TITLE': 'درخواست چت جدید',
                'REQUEST_DESC': 'می‌خواهد با شما چت کند!',
                'DECLINE': 'رد کردن',
                'ACCEPT': 'پذیرفتن',
                'FIND_MATCH_TITLE': 'یافتن هم‌صحبت',
                'GENDER': 'جنسیت',
                'LOCATION': 'مکان',
                'ANY_LOCATION': 'هر مکانی',
                'ONLINE_ONLY': 'فقط آنلاین',
                'SEARCH': 'جستجو',
                'ANY_GENDER': 'هر جنسیتی',
                'MALE': 'مرد',
                'FEMALE': 'زن'
            },
            'COMMON': {
                'SAVE': 'ذخیره',
                'CANCEL': 'لغو',
                'CLOSE': 'بستن',
                'SUBMIT': 'ارسال',
                'SEARCH_PLACEHOLDER': 'جستجو...',
                'NO_RESULTS': 'نتیجه‌ای یافت نشد'
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
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'fa', name: 'فارسی', flag: '🇮🇷' }
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
