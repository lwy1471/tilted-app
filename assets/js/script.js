/**
 * TiltMeasurer - 스마트폰 기울기 측정기
 * 주요 기능:
 * 1. 기기 지원 여부 (모바일, 센서) 확인
 * 2. 다국어 자동 감지 및 적용 (6개 국어)
 * 3. '측정 시작' 클릭 시 iOS에서 센서 접근 권한 자동 요청
 * 4. 5초 카운트다운 후 2초간 기울기 측정
 * 5. 측정된 평균값을 2개의 각도계로 시각화
 */
class TiltMeasurer {
    constructor() {
        this.elements = {
            cards: {
                mobileOnly: document.getElementById('mobile-only'),
                mainGuide: document.getElementById('main-guide'),
                measuring: document.getElementById('measuring-card'),
                result: document.getElementById('result-card'),
            },
            buttons: {
                start: document.getElementById('start-btn'),
                remeasure: document.getElementById('remeasure-btn'),
            },
            displays: {
                countdown: document.getElementById('countdown'),
                progress: document.getElementById('progress'),
                rollNeedle: document.getElementById('roll-needle'),
                pitchNeedle: document.getElementById('pitch-needle'),
                rollValue: document.getElementById('roll-value'),
                pitchValue: document.getElementById('pitch-value'),
                levelBubble: document.getElementById('level-bubble'),
                levelStatus: document.getElementById('level-status'),
            },
        };

        this.isSupported = 'DeviceOrientationEvent' in window;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.measurements = [];
        this.countdownTimer = null;
        this.currentLang = 'en';

        this.init();
    }

    init() {
        this.setupTranslations();
        this.bindEvents();
        this.showInitialScreen();
        this.initializeAds();
    }

    bindEvents() {
        this.elements.buttons.start?.addEventListener('click', () => this.start());
        this.elements.buttons.remeasure?.addEventListener('click', () => this.showInitialScreen());
    }

    showInitialScreen() {
        this.hideAllCards();
        if (!this.isMobile || !this.isSupported) {
            this.elements.cards.mobileOnly.style.display = 'flex';
        } else {
            this.elements.cards.mainGuide.style.display = 'flex';
        }
    }

    hideAllCards() {
        Object.values(this.elements.cards).forEach(card => {
            if (card) card.style.display = 'none';
        });
    }

    async start() {
        // 측정 시작 전 광고 표시
        this.showAdBetweenMeasurement();
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    this.startMeasurementFlow();
                } else {
                    alert(this.t('alert.permission_denied'));
                }
            } catch (error) {
                console.error("Permission request error:", error);
                alert(this.t('alert.permission_error'));
            }
        } else {
            this.startMeasurementFlow();
        }
    }

    startMeasurementFlow() {
        this.hideAllCards();
        this.elements.cards.measuring.style.display = 'flex';
        this.measurements = [];
        
        let count = 5;
        this.elements.displays.countdown.textContent = count;
        this.elements.displays.progress.style.width = '0%';

        this.countdownTimer = setInterval(() => {
            count--;
            this.elements.displays.countdown.textContent = count;
            this.elements.displays.progress.style.width = `${((5 - count) / 5) * 100}%`;
            
            if (count <= 0) {
                clearInterval(this.countdownTimer);
                this.readSensors();
            }
        }, 1000);
    }

    readSensors() {
        const handleOrientation = (event) => {
            if (event.beta !== null && event.gamma !== null) {
                this.measurements.push({ pitch: event.beta, roll: event.gamma });
            }
        };

        window.addEventListener('deviceorientation', handleOrientation);

        setTimeout(() => {
            window.removeEventListener('deviceorientation', handleOrientation);
            this.calculateAndShowResults();
        }, 2000);
    }

    calculateAndShowResults() {
        if (this.measurements.length === 0) {
            alert(this.t('alert.no_sensor_data'));
            this.showInitialScreen();
            return;
        }

        const avgPitch = this.measurements.reduce((sum, m) => sum + m.pitch, 0) / this.measurements.length;
        const avgRoll = this.measurements.reduce((sum, m) => sum + m.roll, 0) / this.measurements.length;

        this.hideAllCards();
        this.elements.cards.result.style.display = 'flex';
        this.updateResultDisplay(avgRoll, avgPitch);
    }

    updateResultDisplay(roll, pitch) {
        this.elements.displays.rollValue.textContent = `${roll.toFixed(1)}°`;
        this.elements.displays.pitchValue.textContent = `${pitch.toFixed(1)}°`;
        
        // 각도계 바늘 회전 (-90 to 90 degrees)
        const rollAngle = Math.max(-90, Math.min(90, roll));
        const pitchAngle = Math.max(-90, Math.min(90, pitch));

        this.elements.displays.rollNeedle.style.transform = `translateX(-50%) rotate(${rollAngle}deg)`;
        this.elements.displays.pitchNeedle.style.transform = `translateX(-50%) rotate(${pitchAngle}deg)`;
        
        // 2D 버블 수평계 업데이트 (Roll과 Pitch 모두 반영)
        if (this.elements.displays.levelBubble) {
            // 원형 수평계의 반지름 (CSS에서 200px 원의 절반에서 버블 크기 고려)
            const maxRadius = 80; // 원 중심에서 가장자리까지의 최대 이동 거리
            
            // 각도를 제한 (-30도 ~ 30도)
            const limitedRoll = Math.max(-30, Math.min(30, roll));
            const limitedPitch = Math.max(-30, Math.min(30, pitch));
            
            // 각도를 픽셀 이동거리로 변환
            const offsetX = (limitedRoll / 30) * maxRadius;
            const offsetY = (limitedPitch / 30) * maxRadius;
            
            // 2D 변환 적용
            this.elements.displays.levelBubble.style.transform = 
                `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        }
        
        // 수평 상태 텍스트 업데이트
        if (this.elements.displays.levelStatus) {
            const totalTilt = Math.sqrt(roll * roll + pitch * pitch);
            let statusKey;
            
            if (totalTilt < 1.0) {
                statusKey = 'result.level_perfect';
            } else if (totalTilt < 3.0) {
                statusKey = 'result.level_good';
            } else {
                statusKey = 'result.level_tilted';
            }
            
            this.elements.displays.levelStatus.textContent = this.t(statusKey);
        }
    }
    
    // --- 다국어 지원 ---
    setupTranslations() {
        const translations = {
            en: {
                "meta.title": "Tilt - Smartphone Level Tool",
                "meta.description": "An accurate and easy-to-use tilt meter and level tool on your smartphone. Perfect for DIY, construction, and home projects.",
                "title": "📱 Tilt Level",
                "welcome": "Accurate tilt measurement for your smartphone.",
                "mobile_only.title": "Not available on Desktop",
                "mobile_only.description": "This app uses your smartphone's sensors. Please use a mobile device.",
                "guide.title": "Press the button to start measuring",
                "buttons.start": "📐 Start Measurement",
                "buttons.remeasure": "Measure Again",
                "measuring.title": "Measuring...",
                "measuring.instruction": "Hold your smartphone still.",
                "result.title": "Measurement Result",
                "result.roll_label": "Roll",
                "result.pitch_label": "Pitch",
                "result.level_checking": "Checking...",
                "result.level_perfect": "Perfect Level! 🎯",
                "result.level_good": "Nearly Level ✓",
                "result.level_tilted": "Tilted",
                "footer.text": "Tilt Level Tool",
                "alert.permission_denied": "Permission denied. Please enable Motion & Orientation Access in your browser settings.",
                "alert.permission_error": "Could not request permission. Please try again.",
                "alert.no_sensor_data": "Could not read sensor data. Please check if your device is supported."
            },
            ko: {
                "meta.title": "Tilt - 스마트폰 기울기 측정기",
                "meta.description": "스마트폰을 이용한 정확하고 사용하기 쉬운 기울기 측정 및 수평계 도구. DIY, 건축, 인테리어 작업에 적합합니다.",
                "title": "📱 기울기 측정기",
                "welcome": "스마트폰의 기울기를 정확하게 측정하세요.",
                "mobile_only.title": "PC에서는 사용할 수 없습니다",
                "mobile_only.description": "이 앱은 스마트폰의 센서를 사용합니다. 모바일 기기로 접속해주세요.",
                "guide.title": "버튼을 눌러 측정을 시작하세요",
                "buttons.start": "📐 측정 시작",
                "buttons.remeasure": "다시 측정",
                "measuring.title": "측정 중...",
                "measuring.instruction": "스마트폰을 움직이지 말고 기다려주세요.",
                "result.title": "측정 결과",
                "result.roll_label": "좌우 기울기",
                "result.pitch_label": "앞뒤 기울기",
                "result.level_checking": "확인 중...",
                "result.level_perfect": "완벽한 수평! 🎯",
                "result.level_good": "거의 수평 ✓",
                "result.level_tilted": "기울어짐",
                "footer.text": "Tilt 기울기 측정 도구",
                "alert.permission_denied": "권한이 거부되었습니다. 브라우저 설정에서 '동작 및 방향' 접근을 허용해주세요.",
                "alert.permission_error": "권한을 요청할 수 없습니다. 다시 시도해주세요.",
                "alert.no_sensor_data": "센서 데이터를 읽을 수 없습니다. 기기가 지원되는지 확인해주세요."
            },
            zh: {
                "meta.title": "Tilt - 智能手机水平仪",
                "meta.description": "一款精确且易于使用的智能手机倾斜计和水平仪工具。非常适合DIY、建筑和家居项目。",
                "title": "📱 倾斜仪",
                "welcome": "精确测量智能手机的倾斜度。",
                "mobile_only.title": "无法在电脑上使用",
                "mobile_only.description": "本应用需使用智能手机的传感器，请用移动设备访问。",
                "guide.title": "按按钮开始测量",
                "buttons.start": "📐 开始测量",
                "buttons.remeasure": "重新测量",
                "measuring.title": "测量中…",
                "measuring.instruction": "请保持手机静止。",
                "result.title": "测量结果",
                "result.roll_label": "左右倾斜",
                "result.pitch_label": "前后倾斜",
                "result.level_checking": "检查中...",
                "result.level_perfect": "完美水平! 🎯",
                "result.level_good": "接近水平 ✓",
                "result.level_tilted": "倾斜",
                "footer.text": "Tilt 倾斜水平工具",
                "alert.permission_denied": "权限被拒绝。请在浏览器设置中启用\"运动和方向访问\"。",
                "alert.permission_error": "无法请求权限，请重试。",
                "alert.no_sensor_data": "无法读取传感器数据，请检查您的设备是否受支持。"
            },
            ja: {
                "meta.title": "Tilt - スマートフォン水準器",
                "meta.description": "正確で使いやすいスマートフォン傾斜計および水準器ツール。DIY、建設、家庭プロジェクトに最適です。",
                "title": "📱 傾斜計",
                "welcome": "スマートフォンの傾きを正確に測定します。",
                "mobile_only.title": "PCでは利用できません",
                "mobile_only.description": "このアプリはスマートフォンのセンサーを使用します。モバイルデバイスでアクセスしてください。",
                "guide.title": "ボタンを押して測定を開始",
                "buttons.start": "📐 測定開始",
                "buttons.remeasure": "再測定",
                "measuring.title": "測定中…",
                "measuring.instruction": "スマートフォンを動かさないでください。",
                "result.title": "測定結果",
                "result.roll_label": "左右の傾き",
                "result.pitch_label": "前後の傾き",
                "result.level_checking": "確認中...",
                "result.level_perfect": "完璧な水平! 🎯",
                "result.level_good": "ほぼ水平 ✓",
                "result.level_tilted": "傾斜",
                "footer.text": "Tilt 傾斜水準ツール",
                "alert.permission_denied": "権限が拒否されました。ブラウザの設定で「モーションと方向へのアクセス」を有効にしてください。",
                "alert.permission_error": "権限を要求できませんでした。もう一度お試しください。",
                "alert.no_sensor_data": "センサーデータを読み取れませんでした。お使いのデバイスが対応しているか確認してください。"
            },
            es: {
                "meta.title": "Tilt - Nivel para Smartphone",
                "meta.description": "Un medidor de inclinación y nivel preciso y fácil de usar en tu smartphone. Perfecto para bricolaje, construcción y proyectos domésticos.",
                "title": "📱 Nivel de Inclinación",
                "welcome": "Medición precisa de la inclinación para tu smartphone.",
                "mobile_only.title": "No disponible en escritorio",
                "mobile_only.description": "Esta aplicación utiliza los sensores de tu smartphone. Por favor, úsala en un dispositivo móvil.",
                "guide.title": "Pulsa el botón para empezar a medir",
                "buttons.start": "📐 Iniciar Medición",
                "buttons.remeasure": "Medir de Nuevo",
                "measuring.title": "Midiendo...",
                "measuring.instruction": "Mantén tu smartphone quieto.",
                "result.title": "Resultado de la Medición",
                "result.roll_label": "Inclinación Lateral",
                "result.pitch_label": "Inclinación Frontal",
                "result.level_checking": "Verificando...",
                "result.level_perfect": "¡Nivel Perfecto! 🎯",
                "result.level_good": "Casi Nivelado ✓",
                "result.level_tilted": "Inclinado",
                "footer.text": "Herramienta de Nivel Tilt",
                "alert.permission_denied": "Permiso denegado. Por favor, activa el acceso a 'Movimiento y Orientación' en los ajustes de tu navegador.",
                "alert.permission_error": "No se pudo solicitar el permiso. Por favor, inténtalo de nuevo.",
                "alert.no_sensor_data": "No se pudieron leer los datos del sensor. Por favor, comprueba si tu dispositivo es compatible."
            },
            ar: {
                "meta.title": "Tilt - ميزان استواء للهواتف الذكية",
                "meta.description": "مقياس ميل وميزان استواء دقيق وسهل الاستخدام على هاتفك الذكي. مثالي للمشاريع اليدوية والبناء والمشاريع المنزلية.",
                "title": "📱 مقياس الميل",
                "welcome": "قياس دقيق لميل هاتفك الذكي.",
                "mobile_only.title": "غير متوفر على سطح المكتب",
                "mobile_only.description": "هذا التطبيق يستخدم مستشعرات هاتفك الذكي. يرجى استخدامه على جهاز محمول.",
                "guide.title": "اضغط على الزر لبدء القياس",
                "buttons.start": "📐 بدء القياس",
                "buttons.remeasure": "إعادة القياس",
                "measuring.title": "جاري القياس...",
                "measuring.instruction": "أبقِ هاتفك الذكي ثابتًا.",
                "result.title": "نتيجة القياس",
                "result.roll_label": "الميل الجانبي",
                "result.pitch_label": "الميل الأمامي",
                "result.level_checking": "جاري التحقق...",
                "result.level_perfect": "مستوى مثالي! 🎯",
                "result.level_good": "مستوى جيد ✓",
                "result.level_tilted": "مائل",
                "footer.text": "أداة مستوى الميل Tilt",
                "alert.permission_denied": "تم رفض الإذن. يرجى تمكين 'الوصول إلى الحركة والاتجاه' في إعدادات متصفحك.",
                "alert.permission_error": "تعذر طلب الإذن. يرجى المحاولة مرة أخرى.",
                "alert.no_sensor_data": "تعذر قراءة بيانات المستشعر. يرجى التحقق مما إذا كان جهازك مدعومًا."
            }
        };
        this.translations = translations;

        // URL의 'lang' 파라미터 또는 브라우저 언어 설정에 따라 언어 감지
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
        
        let initialLang = 'en'; // 기본값
        if (langFromUrl && this.translations[langFromUrl]) {
            initialLang = langFromUrl;
        } else if (this.translations[browserLang]) {
            initialLang = browserLang;
        }
        
        this.setLanguage(initialLang);
    }
    
    setLanguage(lang) {
        this.currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (key.startsWith('meta.')) {
                el.setAttribute('content', translation);
            } else {
                el.innerHTML = translation;
            }
        });

        // 타이틀 태그는 innerHTML이 아닌 textContent로 변경해야 합니다.
        const titleEl = document.querySelector('title');
        if(titleEl) {
            titleEl.textContent = this.t('meta.title');
        }
    }

    t(key) {
        return this.translations[this.currentLang]?.[key] || this.translations['en'][key];
    }

    // --- 광고 관리 ---
    initializeAds() {
        // AdSense가 로드되면 광고 초기화
        if (typeof adsbygoogle !== 'undefined') {
            try {
                // 모든 광고 슬롯 초기화
                const adElements = document.querySelectorAll('.adsbygoogle');
                adElements.forEach((ad, index) => {
                    if (!ad.hasAttribute('data-adsbygoogle-status')) {
                        (adsbygoogle = window.adsbygoogle || []).push({});
                    }
                });
            } catch (error) {
                console.log('AdSense initialization error:', error);
            }
        } else {
            // AdSense 로드를 기다림
            setTimeout(() => this.initializeAds(), 1000);
        }
    }

    showAdBetweenMeasurement() {
        // 측정 시작 전 추가 광고 표시 (선택사항)
        // 인터스티셜 광고나 배너 광고를 여기서 트리거할 수 있음
        console.log('Showing ads before measurement...');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TiltMeasurer();
});