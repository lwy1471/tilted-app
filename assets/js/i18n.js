/**
 * Internationalization Manager
 * 다국어 지원을 위한 번역 관리자
 */
class I18nManager {
    constructor() {
        this.currentLang = 'en';
        this.supportedLanguages = ['en', 'ko', 'zh', 'ja', 'es', 'ar', 'ru'];
        this.translations = window.translations || {};
        this.loadedLanguages = new Set();
        this.isReady = false;
        
        // 이미 로드된 언어 파일들 감지
        this.detectPreloadedLanguages();
        
        // 즉시 초기화 시작
        this.init();
    }

    detectPreloadedLanguages() {
        // window.translations 객체에서 이미 로드된 언어들 확인
        if (window.translations) {
            Object.keys(window.translations).forEach(lang => {
                if (this.supportedLanguages.includes(lang)) {
                    this.loadedLanguages.add(lang);
                    console.log(`Pre-loaded language detected: ${lang}`);
                }
            });
        }
    }

    async init() {
        try {
            // 언어 감지
            const detectedLang = this.detectLanguage();
            
            // 필요한 언어 파일들 로드
            const languagesToLoad = [];
            
            // 영어는 항상 필요 (폴백용)
            if (!this.loadedLanguages.has('en')) {
                languagesToLoad.push(this.loadLanguage('en'));
            }
            
            // 감지된 언어가 영어가 아니고 아직 로드되지 않았다면 로드
            if (detectedLang !== 'en' && !this.loadedLanguages.has(detectedLang)) {
                languagesToLoad.push(this.loadLanguage(detectedLang));
            }
            
            // 필요한 언어들 로드 완료 대기
            if (languagesToLoad.length > 0) {
                await Promise.all(languagesToLoad);
            }
            
            this.setLanguage(detectedLang);
            this.isReady = true;
            
            // 초기화 완료 이벤트 발생
            window.dispatchEvent(new CustomEvent('i18nReady'));
            console.log(`I18n initialized with language: ${detectedLang}`);
            
        } catch (error) {
            console.error('I18n initialization failed:', error);
            // 실패해도 기본 언어로 설정
            this.currentLang = 'en';
            this.isReady = true;
            window.dispatchEvent(new CustomEvent('i18nReady'));
        }
    }

    detectLanguage() {
        // URL 파라미터에서 언어 확인
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        
        if (langFromUrl && this.supportedLanguages.includes(langFromUrl)) {
            return langFromUrl;
        }

        // 브라우저 언어 설정 확인 (더 정교한 감지)
        const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
        
        for (const lang of browserLanguages) {
            const langCode = lang.split('-')[0];
            if (this.supportedLanguages.includes(langCode)) {
                return langCode;
            }
        }

        // 지역별 기본 언어 설정
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // 한국 시간대면 한국어 우선
        if (timezone.includes('Seoul') || timezone.includes('Asia/Seoul')) {
            return 'ko';
        }
        
        // 중국 시간대면 중국어 우선
        if (timezone.includes('Shanghai') || timezone.includes('Beijing') || timezone.includes('Asia/Shanghai')) {
            return 'zh';
        }
        
        // 일본 시간대면 일본어 우선
        if (timezone.includes('Tokyo') || timezone.includes('Asia/Tokyo')) {
            return 'ja';
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
                console.log(`Language loaded: ${lang}`);
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

        // Open Graph 및 Twitter 메타 태그 업데이트
        this.updateSocialMetaTags();
    }

    updateSocialMetaTags() {
        // Open Graph 태그들 업데이트
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const twitterTitle = document.querySelector('meta[property="twitter:title"]');
        const twitterDescription = document.querySelector('meta[property="twitter:description"]');

        if (ogTitle) ogTitle.setAttribute('content', this.t('meta.title'));
        if (ogDescription) ogDescription.setAttribute('content', this.t('meta.description'));
        if (twitterTitle) twitterTitle.setAttribute('content', this.t('meta.title'));
        if (twitterDescription) twitterDescription.setAttribute('content', this.t('meta.description'));
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

    // 준비 상태 확인
    ready() {
        return this.isReady;
    }

    // 준비될 때까지 대기
    waitForReady() {
        return new Promise((resolve) => {
            if (this.isReady) {
                resolve();
            } else {
                window.addEventListener('i18nReady', () => resolve(), { once: true });
            }
        });
    }
}

// 전역 i18n 인스턴스 생성
window.i18n = new I18nManager();

// DOM이 로드되면 번역 적용
document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n && window.i18n.ready()) {
        window.i18n.applyTranslations();
    }
}); 