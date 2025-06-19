/**
 * TiltMeasurer - 스마트폰 기울기 측정기
 * 주요 기능:
 * 1. 기기 지원 여부 (모바일, 센서) 확인
 * 2. '측정 시작' 클릭 시 iOS에서 센서 접근 권한 자동 요청
 * 3. 5초 카운트다운 후 2초간 기울기 측정
 * 4. 측정된 평균값을 2개의 각도계로 시각화
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

        this.init();
    }

    init() {
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
                    alert(window.i18n.t('alert.permission_denied'));
                }
            } catch (error) {
                console.error("Permission request error:", error);
                alert(window.i18n.t('alert.permission_error'));
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
            alert(window.i18n.t('alert.no_sensor_data'));
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
            // 원형 수평계의 반지름 (CSS에서 160px 원의 절반에서 버블 크기 고려)
            const maxRadius = 66; // 원 중심에서 가장자리까지의 최대 이동 거리
            
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
            
            this.elements.displays.levelStatus.textContent = window.i18n.t(statusKey);
        }
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

// i18n 시스템이 로드된 후 TiltMeasurer 초기화
document.addEventListener('DOMContentLoaded', () => {
    // i18n이 초기화될 때까지 대기
    const initTiltMeasurer = () => {
        if (window.i18n && window.i18n.getCurrentLanguage) {
            new TiltMeasurer();
        } else {
            setTimeout(initTiltMeasurer, 100);
        }
    };
    
    initTiltMeasurer();
});