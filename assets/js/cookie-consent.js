// 쿠키 동의 관리
class CookieConsent {
    constructor() {
        this.consentKey = 'cookie_consent';
        this.init();
    }

    init() {
        // 이미 동의했는지 확인
        if (!this.hasConsent()) {
            this.showConsentBanner();
        }
    }

    hasConsent() {
        return localStorage.getItem(this.consentKey) === 'accepted';
    }

    getCurrentLanguage() {
        // URL 파라미터에서 언어 확인
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && cookieMessages[langParam]) {
            return langParam;
        }
        
        // 브라우저 언어 확인
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        return cookieMessages[langCode] ? langCode : 'en';
    }

    showConsentBanner() {
        // 현재 언어 감지
        const currentLang = this.getCurrentLanguage();
        const messages = cookieMessages[currentLang] || cookieMessages.en;
        
        // 동의 배너 생성
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-text">
                    <p>${messages.message}</p>
                </div>
                <div class="cookie-buttons">
                    <button id="cookie-accept" class="cookie-btn accept">${messages.accept}</button>
                    <button id="cookie-decline" class="cookie-btn decline">${messages.decline}</button>
                    <button id="cookie-settings" class="cookie-btn settings">${messages.settings}</button>
                </div>
            </div>
        `;

        // 스타일 추가
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            z-index: 10000;
            border-top: 3px solid #007AFF;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(banner);

        // 이벤트 리스너 추가
        document.getElementById('cookie-accept').addEventListener('click', () => {
            this.acceptCookies();
        });

        document.getElementById('cookie-decline').addEventListener('click', () => {
            this.declineCookies();
        });

        document.getElementById('cookie-settings').addEventListener('click', () => {
            this.showSettings();
        });
    }

    acceptCookies() {
        localStorage.setItem(this.consentKey, 'accepted');
        this.removeBanner();
        // Google AdSense 활성화
        this.enableAds();
    }

    declineCookies() {
        localStorage.setItem(this.consentKey, 'declined');
        this.removeBanner();
        // 광고 비활성화
        this.disableAds();
    }

    showSettings() {
        alert('쿠키 설정 페이지로 이동합니다.');
        // 상세 설정 페이지 구현
    }

    removeBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.remove();
        }
    }

    enableAds() {
        // AdSense 광고 활성화
        if (window.adsbygoogle) {
            console.log('Ads enabled with consent');
        }
    }

    disableAds() {
        // 광고 비활성화 로직
        console.log('Ads disabled - user declined consent');
    }
}

// 다국어 지원 메시지
const cookieMessages = {
    en: {
        message: "This site uses cookies for ad personalization and analytics. By continuing to use this site, you consent to our use of cookies.",
        accept: "Accept",
        decline: "Decline", 
        settings: "Settings"
    },
    ko: {
        message: "이 사이트는 광고 개인화 및 사이트 분석을 위해 쿠키를 사용합니다. 계속 사용하시면 쿠키 사용에 동의한 것으로 간주됩니다.",
        accept: "동의",
        decline: "거부",
        settings: "설정"
    },
    zh: {
        message: "本网站使用Cookie进行广告个性化和网站分析。继续使用本网站即表示您同意我们使用Cookie。",
        accept: "接受",
        decline: "拒绝",
        settings: "设置"
    },
    ja: {
        message: "このサイトは広告のパーソナライゼーションとサイト分析のためにCookieを使用しています。このサイトを継続して使用することで、Cookieの使用に同意したものとみなされます。",
        accept: "同意",
        decline: "拒否", 
        settings: "設定"
    },
    es: {
        message: "Este sitio utiliza cookies para personalización de anuncios y análisis del sitio. Al continuar usando este sitio, usted consiente nuestro uso de cookies.",
        accept: "Aceptar",
        decline: "Rechazar",
        settings: "Configuración"
    },
    ar: {
        message: "يستخدم هذا الموقع ملفات تعريف الارتباط لتخصيص الإعلانات وتحليل الموقع. من خلال الاستمرار في استخدام هذا الموقع، فإنك توافق على استخدامنا لملفات تعريف الارتباط.",
        accept: "قبول",
        decline: "رفض",
        settings: "الإعدادات"
    }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new CookieConsent();
}); 