/**
 * Internationalization Manager
 * 다국어 지원을 위한 번역 관리자
 */
class I18nManager {
    constructor() {
        this.currentLang = 'en';
        this.supportedLanguages = ['en', 'ko', 'zh', 'ja', 'es', 'ar'];
        this.translations = window.translations || {};
        this.loadedLanguages = new Set();
        
        this.init();
    }

    async init() {
        // 언어 감지
        const detectedLang = this.detectLanguage();
        
        // 기본 언어 로드
        await this.loadLanguage(detectedLang);
        this.setLanguage(detectedLang);
    }

    detectLanguage() {
        // URL 파라미터에서 언어 확인
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        
        if (langFromUrl && this.supportedLanguages.includes(langFromUrl)) {
            return langFromUrl;
        }

        // 브라우저 언어 설정 확인
        const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
        
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // 기본 언어 반환
        return 'en';
    }

    async loadLanguage(lang) {
        if (this.loadedLanguages.has(lang)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `assets/js/lang/${lang}.js`;
            script.onload = () => {
                this.loadedLanguages.add(lang);
                resolve();
            };
            script.onerror = () => {
                console.error(`Failed to load language: ${lang}`);
                reject(new Error(`Failed to load language: ${lang}`));
            };
            document.head.appendChild(script);
        });
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Unsupported language: ${lang}, falling back to English`);
            lang = 'en';
        }

        // 언어 파일이 로드되지 않았으면 로드
        if (!this.loadedLanguages.has(lang)) {
            await this.loadLanguage(lang);
        }

        this.currentLang = lang;
        
        // HTML 언어 속성 설정
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // 페이지의 모든 번역 적용
        this.applyTranslations();
    }

    applyTranslations() {
        // data-i18n 속성을 가진 모든 요소 번역
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (key.startsWith('meta.')) {
                // 메타 태그는 content 속성 변경
                element.setAttribute('content', translation);
            } else {
                // 일반 요소는 innerHTML 변경
                element.innerHTML = translation;
            }
        });

        // 타이틀 태그 별도 처리
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = this.t('meta.title');
        }
    }

    t(key) {
        // 현재 언어의 번역이 있으면 반환
        if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
            return this.translations[this.currentLang][key];
        }
        
        // 영어 번역으로 폴백
        if (this.translations['en'] && this.translations['en'][key]) {
            return this.translations['en'][key];
        }
        
        // 번역이 없으면 키 반환
        console.warn(`Translation not found for key: ${key}`);
        return key;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
}

// 전역 i18n 인스턴스 생성
window.i18n = new I18nManager(); 