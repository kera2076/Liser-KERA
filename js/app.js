/**
 * KERA Laser Photothermolysis & Fitzpatrick 3D Clinical Simulator
 * Master Standalone Application Engine - v3.0 Ultra Medical Edition
 * Features:
 * - High-Fidelity Medical Handpiece with Candela-style Dual Distance Gauge Pins & Fiber Cable
 * - Multi-Layer Laser Optical Beam (Core Plasma Beam, Volumetric Corona, Traveling Energy Rings, Subsurface Scattering Light)
 * - Dynamic Thermal Propagation Heat Waves & Animated Temperature Counters
 * - Post-Shot Clinical Outcome Modal & Telemetry
 * - Slow-Motion Simulation Mode
 * - 100% Procedural 3D WebGL (No external 3D assets required)
 * - Zero CORS restrictions (Runs from file:// or http:// or GitHub Pages)
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CLINICAL PHYSICS & PHOTOTHERMOLYSIS CONSTANTS & ENGINE
     ========================================================================== */
  const FITZPATRICK_DATA = {
    1: {
      name: 'Type I',
      arabicName: 'النوع الأول (I) - بيضاء ناصعة / عاجية',
      skinColor: '#faeae3',
      dermisColor: '#d66a6a',
      epidermalMelanin: 0.05,
      burnRiskBaseline: 'Very Low',
      description: 'بشرة عاجية ناصعة البياض، تحترق دائماً تحت الشمس ولا تسمر إطلاقاً. ميلانين البشرة السطحية شبه منعدم.'
    },
    2: {
      name: 'Type II',
      arabicName: 'النوع الثاني (II) - بيضاء فاتحة',
      skinColor: '#f3dcce',
      dermisColor: '#d46565',
      epidermalMelanin: 0.15,
      burnRiskBaseline: 'Low',
      description: 'بشرة أوروبية فاتحة، تحترق بسهولة وتسمر بصعوبة بالغة.'
    },
    3: {
      name: 'Type III',
      arabicName: 'النوع الثالث (III) - حنطية فاتحة / متوسطة',
      skinColor: '#e0bf9d',
      dermisColor: '#cf5e5e',
      epidermalMelanin: 0.30,
      burnRiskBaseline: 'Moderate',
      description: 'بشرة حنطية شائعة في حوض المتوسط، تحترق باعتدال وتسمر تدريجياً.'
    },
    4: {
      name: 'Type IV',
      arabicName: 'النوع الرابع (IV) - قمحية / زيتونية',
      skinColor: '#be9568',
      dermisColor: '#c95757',
      epidermalMelanin: 0.52,
      burnRiskBaseline: 'High with 755nm',
      description: 'بشرة شرق أوسطية ولاتينية قمحية، نادراً ما تحترق وتسمر بسهولة وسرعة.'
    },
    5: {
      name: 'Type V',
      arabicName: 'النوع الخامس (V) - سمراء داكنة',
      skinColor: '#8a5c36',
      dermisColor: '#be4e4e',
      epidermalMelanin: 0.78,
      burnRiskBaseline: 'Severe Risk with 755nm',
      description: 'بشرة سمراء داكنة ذات تركيز ميلانين سطحي عالٍ جداً. شديدة الحساسية لليزر قصير الموجة.'
    },
    6: {
      name: 'Type VI',
      arabicName: 'النوع السادس (VI) - داكنة جداً / سوداء',
      skinColor: '#432918',
      dermisColor: '#b34545',
      epidermalMelanin: 0.98,
      burnRiskBaseline: 'Critical Burn Risk with 755nm & 808nm',
      description: 'بشرة شديدة الصبغة ذات أعلى تركيز ميلانين في الطبقة القرنية والبشرة. تتطلب ليزر Nd:YAG 1064nm حصراً.'
    }
  };

  const LASER_WAVELENGTHS = {
    755: {
      name: 'Alexandrite',
      wavelength: 755,
      colorHex: '#ff1744',
      glowColorHex: '#ff5252',
      beamGlow: 'rgba(255, 23, 68, 0.85)',
      penetrationDepthMm: 2.4,
      melaninAbsorptionFactor: 1.0,
      description: 'أعلى امتصاص للميلانين وعمق اختراق متوسط (~2.4mm). مثالي للبشرة الفاتحة، وخطر حروق كارثي على البشرة الداكنة.'
    },
    808: {
      name: 'Diode',
      wavelength: 808,
      colorHex: '#d50000',
      glowColorHex: '#ff1744',
      beamGlow: 'rgba(213, 0, 0, 0.75)',
      penetrationDepthMm: 3.8,
      melaninAbsorptionFactor: 0.65,
      description: 'توازن مثالي بين امتصاص الميلانين وعمق النفاذية (~3.8mm). مناسب للأنواع I-IV.'
    },
    1064: {
      name: 'Nd:YAG',
      wavelength: 1064,
      colorHex: '#ab47bc',
      glowColorHex: '#e040fb',
      beamGlow: 'rgba(171, 71, 188, 0.65)',
      penetrationDepthMm: 5.5,
      melaninAbsorptionFactor: 0.22,
      description: 'المعيار الذهبي والآمن للبشرة الداكنة (Types IV-VI). يتجاوز ميلانين السطح بأمان ويصل لأعمق الجذور (~5.5mm).'
    }
  };

  const HAIR_THICKNESS = {
    fine: { label: 'وبرية (Fine)', radiusMm: 0.025, melaninMassFactor: 0.35, trtMs: 15 },
    medium: { label: 'متوسطة (Medium)', radiusMm: 0.05, melaninMassFactor: 0.7, trtMs: 40 },
    coarse: { label: 'سميكة (Coarse)', radiusMm: 0.085, melaninMassFactor: 1.2, trtMs: 90 }
  };

  const HAIR_COLORS = {
    black: { label: 'أسود داكن', colorHex: '#141110', melaninContent: 1.0 },
    brown: { label: 'بني', colorHex: '#4a2c1b', melaninContent: 0.7 },
    blonde: { label: 'أشقر / أحمر', colorHex: '#bfa063', melaninContent: 0.25 },
    white: { label: 'أبيض / رمادي', colorHex: '#e0e0e0', melaninContent: 0.02 }
  };

  function calculateLaserShot(params) {
    const skin = FITZPATRICK_DATA[params.fitzpatrickType];
    const laser = LASER_WAVELENGTHS[params.wavelength];
    const thickness = HAIR_THICKNESS[params.hairThicknessKey];
    const hair = HAIR_COLORS[params.hairColorKey];
    const fluence = params.fluence;
    const pulseDuration = params.pulseDuration;
    const coolingEnabled = params.coolingEnabled;

    const epidermalAbsorptionEfficiency = skin.epidermalMelanin * laser.melaninAbsorptionFactor;
    const baseTemp = 35.0;
    const coolingProtection = coolingEnabled ? 0.42 : 1.0;

    const rawEpidermalDeltaT = (fluence * 1.55) * epidermalAbsorptionEfficiency * coolingProtection;
    const epidermalTemp = Math.min(115, baseTemp + rawEpidermalDeltaT);

    const bulbDepthMm = 3.5;
    const tissueTransmission = Math.exp(-bulbDepthMm / laser.penetrationDepthMm);
    const fluenceAtBulb = fluence * (1.0 - Math.min(0.85, epidermalAbsorptionEfficiency * 0.75)) * tissueTransmission;

    const hairAbsorptionCoeff = hair.melaninContent * thickness.melaninMassFactor * laser.melaninAbsorptionFactor;
    const pulseEfficiency = pulseDuration > thickness.trtMs * 1.5 ? 0.8 : 1.0;

    const bulbDeltaT = (fluenceAtBulb * 2.9) * hairAbsorptionCoeff * pulseEfficiency;
    const bulbTemp = Math.min(135, baseTemp + bulbDeltaT);

    const follicleDestroyed = bulbTemp >= 70.0;
    const efficacyPercent = Math.min(100, Math.max(0, Math.round(((bulbTemp - baseTemp) / (72 - baseTemp)) * 100)));

    let safetyStatus = 'SAFE';
    let warningMessage = '';

    if (epidermalTemp >= 70.0) {
      safetyStatus = 'CRITICAL_BURN';
      warningMessage = `تحذير سريري حاد! طول الموجة ${laser.wavelength}nm يتنافس بشدة مع صبغة الميلانين العالية في بشرة (${skin.name}). امتصت الطبقة السطحية معظم الطاقة وارتفعت حرارتها إلى ${epidermalTemp.toFixed(1)}°C مسببة فقاعات وتسلخات بالغة! يجب استخدام ليزر Nd:YAG 1064nm لحماية سطح الجلد.`;
    } else if (epidermalTemp >= 55.0) {
      safetyStatus = 'HIGH_RISK';
      warningMessage = `حذر سريري: حرارة البشرة السطحية ارتفعت إلى ${epidermalTemp.toFixed(1)}°C. هناك خطر حقيقي لحدوث تصبغات ما بعد الالتهاب (PIH). قم بتفعيل التبريد الفائق أو استخدام طول موجي أطول (1064nm).`;
    } else if (epidermalTemp >= 48.0) {
      safetyStatus = 'CAUTION';
      warningMessage = `احمرار سطحي مؤقت متوقع. تأكد من ثبات نظام التبريد قبل تكرار النبضات.`;
    } else {
      safetyStatus = 'SAFE';
      if (follicleDestroyed) {
        warningMessage = `معايير مثالية! تم تدمير بصيلة الشعر بالكامل بالتحلل الضوئي الحراري الانتقائي دون أي ضرر أو خطر على سطح البشرة.`;
      } else {
        if (hair.melaninContent < 0.1) {
          warningMessage = `الليزر آمن على البشرة، لكنه غير مجدٍ لأن الشعرة خالية من الميلانين (بيضاء/رمادية). يتطلب ذلك التحليل الكهربائي.`;
        } else {
          warningMessage = `الليزر آمن على البشرة، لكن طاقة النبضة الحالية غير كافية لرفع حرارة البصيلة إلى عتبة التخثر (70°C). ارفع الجول (Fluence).`;
        }
      }
    }

    return {
      skin, laser, thickness, hair, fluence, pulseDuration, coolingEnabled,
      epidermalTemp: Number(epidermalTemp.toFixed(1)),
      bulbTemp: Number(bulbTemp.toFixed(1)),
      follicleDestroyed,
      efficacyPercent,
      safetyStatus,
      warningMessage,
      isBurn: safetyStatus === 'CRITICAL_BURN'
    };
  }

  /* ==========================================================================
     2. PROCEDURAL AUDIO SYNTHESIZER (Web Audio API)
     ========================================================================== */
  class LaserAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      return this.isMuted;
    }

    playLaserShot(params) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Heavy acoustic capacitor discharge
      const osc = this.ctx.createOscillator();
      const gainOsc = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = params.wavelength === 755 ? 160 : (params.wavelength === 808 ? 120 : 80);
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.2);

      gainOsc.gain.setValueAtTime(0.65, t);
      gainOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gainOsc);
      gainOsc.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);

      // High voltage plasma snap
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(params.wavelength === 755 ? 2800 : (params.wavelength === 808 ? 1700 : 1200), t);
      filter.Q.setValueAtTime(3.0, t);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.5, t);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      whiteNoise.connect(filter);
      filter.connect(gainNoise);
      gainNoise.connect(this.ctx.destination);
      whiteNoise.start(t);
      whiteNoise.stop(t + 0.19);

      if (params.isBurn) {
        setTimeout(() => this.playBurnAlarm(), 150);
      }
    }

    playCryoCooling() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.7;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4000, t);
      filter.frequency.exponentialRampToValueAtTime(1200, t + 0.22);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.23);
    }

    playBurnAlarm() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [0, 0.12, 0.24, 0.36].forEach(delay => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, t + delay);
        osc.frequency.setValueAtTime(1150, t + delay + 0.04);
        gain.gain.setValueAtTime(0.3, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + delay);
        osc.stop(t + delay + 0.09);
      });
    }

    playDialClick() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  const sound = new LaserAudioEngine();

  /* ==========================================================================
     3. OPTICAL ABSORPTION SPECTRUM CHART (HTML5 Canvas)
     ========================================================================== */
  class AbsorptionChart {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.currentWavelength = 808;
      this.initResize();
    }

    initResize() {
      this.resize = () => {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 300;
        this.height = Math.max(160, rect.height || 180);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(dpr, dpr);
        this.draw();
      };

      window.addEventListener('resize', this.resize);
      setTimeout(this.resize, 60);
    }

    setWavelength(wl) {
      this.currentWavelength = wl;
      this.draw();
    }

    getMelaninAbsorption(lambda) {
      return Math.pow(500 / lambda, 3.3);
    }

    getHbO2Absorption(lambda) {
      if (lambda < 600) {
        return 0.8 * Math.exp(-Math.pow((lambda - 560) / 45, 2)) + 0.3;
      }
      return 0.15 * Math.exp(-(lambda - 600) / 120) + 0.02;
    }

    getWaterAbsorption(lambda) {
      if (lambda < 900) return 0.01;
      return 0.01 + 0.7 * Math.pow((lambda - 900) / 300, 2.5);
    }

    draw() {
      if (!this.width || !this.height) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      const padL = 40;
      const padR = 20;
      const padT = 32;
      const padB = 26;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0c111a');
      bgGrad.addColorStop(1, '#07090e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(180, 200, 220, 0.65)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';

      const minLambda = 500;
      const maxLambda = 1150;
      const lambdaToX = (lambda) => padL + ((lambda - minLambda) / (maxLambda - minLambda)) * plotW;
      const valToY = (val) => padT + (1.0 - Math.min(1.0, Math.max(0.0, val))) * plotH;

      [600, 700, 800, 900, 1000, 1100].forEach(wl => {
        const x = lambdaToX(wl);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        ctx.fillText(`${wl}nm`, x, padT + plotH + 15);
      });

      // Optical Window
      const windowStart = lambdaToX(650);
      const windowEnd = lambdaToX(1100);
      ctx.fillStyle = 'rgba(0, 230, 255, 0.04)';
      ctx.fillRect(windowStart, padT, windowEnd - windowStart, plotH);
      ctx.fillStyle = 'rgba(0, 230, 255, 0.65)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Optical Window (650-1100nm)', windowStart + 6, padT - 10);

      // HbO2
      ctx.strokeStyle = '#e53935';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let wl = minLambda; wl <= maxLambda; wl += 10) {
        const x = lambdaToX(wl);
        const y = valToY(this.getHbO2Absorption(wl));
        if (wl === minLambda) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Water
      ctx.strokeStyle = '#00bcd4';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let wl = minLambda; wl <= maxLambda; wl += 10) {
        const x = lambdaToX(wl);
        const y = valToY(this.getWaterAbsorption(wl));
        if (wl === minLambda) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Melanin
      const melaninGrad = ctx.createLinearGradient(padL, 0, padL + plotW, 0);
      melaninGrad.addColorStop(0, '#ffb300');
      melaninGrad.addColorStop(0.4, '#ff9100');
      melaninGrad.addColorStop(1, '#ff3d00');

      ctx.strokeStyle = melaninGrad;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let wl = minLambda; wl <= maxLambda; wl += 5) {
        const x = lambdaToX(wl);
        const y = valToY(this.getMelaninAbsorption(wl));
        if (wl === minLambda) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Legends in header margin
      ctx.textAlign = 'right';
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ffb300';
      ctx.fillText('● Melanin', padL + plotW - 65, padT - 10);
      ctx.fillStyle = '#ef5350';
      ctx.fillText('-- HbO2', padL + plotW - 10, padT - 10);

      // Active Laser Line
      const activeX = lambdaToX(this.currentWavelength);
      const activeMelaninY = valToY(this.getMelaninAbsorption(this.currentWavelength));

      ctx.strokeStyle = this.currentWavelength === 755 ? 'rgba(255, 23, 68, 0.95)' :
                       (this.currentWavelength === 808 ? 'rgba(213, 0, 0, 0.95)' : 'rgba(171, 71, 188, 0.95)');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(activeX, padT);
      ctx.lineTo(activeX, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(activeX, activeMelaninY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff9100';
      ctx.lineWidth = 2;
      ctx.stroke();

      const tagW = 56;
      const tagH = 16;
      const tagX = Math.min(padL + plotW - tagW, Math.max(padL, activeX - tagW / 2));
      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.fillRect(tagX, padT + plotH - tagH - 4, tagW, tagH);
      ctx.strokeRect(tagX, padT + plotH - tagH - 4, tagW, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.currentWavelength}nm`, tagX + tagW / 2, padT + plotH - 8);
    }
  }

  /* ==========================================================================
     4. PROCEDURAL 3D CLINICAL ANATOMICAL SCENE (Three.js WebGL)
     ========================================================================== */
  class SkinLaser3DScene {
    constructor(containerElement) {
      this.container = containerElement;
      this.width = Math.max(320, containerElement.clientWidth || window.innerWidth * 0.5);
      this.height = Math.max(500, containerElement.clientHeight || window.innerHeight * 0.65);

      this.currentFitzpatrick = 3;
      this.currentWavelength = 808;
      this.currentThickness = 'medium';
      this.currentColor = 'black';
      this.isFiring = false;
      this.pulseProgress = 0;
      this.pulseSpeed = 1.0; // standard speed or slow-mo
      this.activeBurnVisual = false;
      this.activeDestructionVisual = false;

      this.initRenderer();
      this.initScene();
      this.initCamera();
      this.initLights();
      this.buildPedestal();
      this.buildSkinBlock();
      this.buildHairFollicle();
      this.buildCapillaries();
      this.buildLaserHandpiece();
      this.buildHighImpactLaserVFX();

      window.addEventListener('resize', () => this.onResize());

      this.clock = new THREE.Clock();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initRenderer() {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x080b12);
    }

    initCamera() {
      this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
      this.camera.position.set(11, 4.5, 12);

      if (THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, -0.6, 0);
        this.controls.maxPolarAngle = Math.PI / 2 + 0.08;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 24;
      }
    }

    initLights() {
      const ambientLight = new THREE.AmbientLight(0xa5b8cc, 0.65);
      this.scene.add(ambientLight);

      this.mainLight = new THREE.DirectionalLight(0xfffaed, 1.3);
      this.mainLight.position.set(7, 12, 8);
      this.mainLight.castShadow = true;
      this.scene.add(this.mainLight);

      const fillLight = new THREE.DirectionalLight(0xcde0f5, 0.5);
      fillLight.position.set(-8, 5, -6);
      this.scene.add(fillLight);

      // Dynamic intense point light inside tissue when firing
      this.subsurfaceLight = new THREE.PointLight(0xff1744, 0, 10);
      this.subsurfaceLight.position.set(0, -1.8, 0);
      this.scene.add(this.subsurfaceLight);

      // Handpiece indicator LED light
      this.handpieceLedLight = new THREE.PointLight(0xff1744, 0.8, 4);
      this.handpieceLedLight.position.set(0, 5.0, 0);
      this.scene.add(this.handpieceLedLight);
    }

    // Clinical Titanium Mounting Pedestal
    buildPedestal() {
      const baseGeom = new THREE.BoxGeometry(9.6, 0.4, 7.6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x18202d,
        metalness: 0.85,
        roughness: 0.25
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.position.set(0, -6.35, 0);
      this.scene.add(baseMesh);

      // Clinical scale markings along the side
      const rulerMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.4 });
      for (let y = 0.1; y >= -6.0; y -= 1.0) {
        const markGeom = new THREE.BoxGeometry(0.08, 0.04, 0.4);
        const mark = new THREE.Mesh(markGeom, rulerMat);
        mark.position.set(-4.85, y, 3.82);
        this.scene.add(mark);
      }
    }

    buildSkinBlock() {
      this.skinGroup = new THREE.Group();
      this.scene.add(this.skinGroup);

      const blockWidth = 9.0;
      const blockDepth = 7.0;

      // 1. Epidermis (Dynamic Tone based on Fitzpatrick)
      const epiThickness = 0.35;
      const epiGeom = new THREE.BoxGeometry(blockWidth, epiThickness, blockDepth);
      this.epidermisMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(FITZPATRICK_DATA[this.currentFitzpatrick].skinColor),
        roughness: 0.62,
        metalness: 0.04
      });
      this.epidermisMesh = new THREE.Mesh(epiGeom, this.epidermisMaterial);
      this.epidermisMesh.position.set(0, 0.0, 0);
      this.epidermisMesh.receiveShadow = true;
      this.skinGroup.add(this.epidermisMesh);

      // Burn blister overlay
      const burnGeom = new THREE.CylinderGeometry(1.6, 1.8, 0.1, 32);
      this.burnMaterial = new THREE.MeshStandardMaterial({
        color: 0xff1100,
        emissive: 0xcc0000,
        emissiveIntensity: 0.0,
        roughness: 0.25,
        transparent: true,
        opacity: 0.0
      });
      this.burnMesh = new THREE.Mesh(burnGeom, this.burnMaterial);
      this.burnMesh.position.set(0, epiThickness / 2 + 0.05, 0);
      this.skinGroup.add(this.burnMesh);

      // 2. Dermis (Rich vascular pink/crimson with translucency)
      const dermisThickness = 3.6;
      const dermisGeom = new THREE.BoxGeometry(blockWidth, dermisThickness, blockDepth);
      this.dermisMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(FITZPATRICK_DATA[this.currentFitzpatrick].dermisColor),
        roughness: 0.48,
        metalness: 0.05,
        transparent: true,
        opacity: 0.94
      });
      this.dermisMesh = new THREE.Mesh(dermisGeom, this.dermisMaterial);
      this.dermisMesh.position.set(0, -(epiThickness / 2 + dermisThickness / 2), 0);
      this.skinGroup.add(this.dermisMesh);

      // 3. Hypodermis (Warm golden adipose fat lobules)
      const hypoThickness = 2.2;
      const hypoGeom = new THREE.BoxGeometry(blockWidth, hypoThickness, blockDepth);
      this.hypoMaterial = new THREE.MeshStandardMaterial({
        color: 0xecb842,
        roughness: 0.75,
        metalness: 0.05
      });
      this.hypoMesh = new THREE.Mesh(hypoGeom, this.hypoMaterial);
      this.hypoMesh.position.set(0, -(epiThickness / 2 + dermisThickness + hypoThickness / 2), 0);
      this.skinGroup.add(this.hypoMesh);

      // Adipose Globules along cutaway
      const fatSphereGeom = new THREE.SphereGeometry(0.35, 12, 12);
      const fatMat = new THREE.MeshStandardMaterial({ color: 0xf4c856, roughness: 0.35 });
      const fatClusterGroup = new THREE.Group();
      for (let i = -3.8; i <= 3.8; i += 0.75) {
        for (let j = -4.5; j >= -5.8; j -= 0.65) {
          const fatGlobule = new THREE.Mesh(fatSphereGeom, fatMat);
          fatGlobule.scale.set(0.9 + Math.random() * 0.4, 0.8 + Math.random() * 0.3, 0.9);
          fatGlobule.position.set(i + (Math.random() - 0.5) * 0.3, j, blockDepth / 2 + 0.05);
          fatClusterGroup.add(fatGlobule);
        }
      }
      this.skinGroup.add(fatClusterGroup);
    }

    buildHairFollicle() {
      this.hairGroup = new THREE.Group();
      this.scene.add(this.hairGroup);

      // Shaft
      this.shaftRadius = 0.11;
      this.shaftGeom = new THREE.CylinderGeometry(this.shaftRadius, this.shaftRadius * 1.15, 4.6, 20);
      this.shaftMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(HAIR_COLORS[this.currentColor].colorHex),
        roughness: 0.35,
        metalness: 0.25
      });
      this.shaftMesh = new THREE.Mesh(this.shaftGeom, this.shaftMat);
      this.shaftMesh.position.set(0, -0.4, 0);
      this.hairGroup.add(this.shaftMesh);

      // Dermal Papilla Bulb
      const bulbGeom = new THREE.SphereGeometry(0.5, 24, 24);
      bulbGeom.scale(1, 1.45, 1);
      this.bulbMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(HAIR_COLORS[this.currentColor].colorHex),
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.4
      });
      this.bulbMesh = new THREE.Mesh(bulbGeom, this.bulbMat);
      this.bulbMesh.position.set(0, -2.7, 0);
      this.hairGroup.add(this.bulbMesh);

      // Sheath
      const sheathGeom = new THREE.CylinderGeometry(0.24, 0.48, 3.2, 16);
      const sheathMat = new THREE.MeshStandardMaterial({
        color: 0xffd4d4,
        roughness: 0.3,
        transparent: true,
        opacity: 0.45
      });
      this.sheathMesh = new THREE.Mesh(sheathGeom, sheathMat);
      this.sheathMesh.position.set(0, -1.2, 0);
      this.hairGroup.add(this.sheathMesh);

      // Sebaceous Gland
      const glandGeom = new THREE.DodecahedronGeometry(0.42, 1);
      const glandMat = new THREE.MeshStandardMaterial({ color: 0xe4cc8a, roughness: 0.65 });
      this.glandMesh = new THREE.Mesh(glandGeom, glandMat);
      this.glandMesh.position.set(0.48, -0.85, 0.1);
      this.glandMesh.scale.set(1.2, 0.9, 0.8);
      this.hairGroup.add(this.glandMesh);

      // Arrector Pili Muscle (Diagonal connection)
      const muscleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.3, -1.6, 0.0),
        new THREE.Vector3(1.2, -0.9, 0.1),
        new THREE.Vector3(1.9, -0.25, 0.0)
      ]);
      const muscleGeom = new THREE.TubeGeometry(muscleCurve, 12, 0.08, 6, false);
      const muscleMat = new THREE.MeshStandardMaterial({ color: 0xb53535, roughness: 0.5 });
      const muscleMesh = new THREE.Mesh(muscleGeom, muscleMat);
      this.hairGroup.add(muscleMesh);
    }

    buildCapillaries() {
      const capillaryGroup = new THREE.Group();
      const capMat = new THREE.MeshStandardMaterial({ color: 0xbd1e1e, roughness: 0.4 });

      const paths = [
        [new THREE.Vector3(-2.8, -1.2, 0.3), new THREE.Vector3(-1.8, -0.7, 0.4), new THREE.Vector3(-0.9, -1.3, 0.2)],
        [new THREE.Vector3(0.9, -1.4, -0.3), new THREE.Vector3(1.9, -0.8, -0.2), new THREE.Vector3(3.0, -1.5, 0.1)],
        [new THREE.Vector3(-1.5, -2.2, 0.5), new THREE.Vector3(-0.8, -2.6, 0.3), new THREE.Vector3(0.2, -3.1, 0.4)]
      ];

      paths.forEach(pts => {
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeom = new THREE.TubeGeometry(curve, 14, 0.06, 6, false);
        const tube = new THREE.Mesh(tubeGeom, capMat);
        capillaryGroup.add(tube);
      });
      this.skinGroup.add(capillaryGroup);
    }

    // High-Fidelity Medical Laser Handpiece (Candela / GentleLase / Soprano style)
    buildLaserHandpiece() {
      this.handpieceGroup = new THREE.Group();
      this.scene.add(this.handpieceGroup);

      // Main Ergonomic Handpiece Body
      const bodyGeom = new THREE.CylinderGeometry(1.2, 1.35, 3.8, 32);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x18202d,
        roughness: 0.2,
        metalness: 0.8
      });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      bodyMesh.position.set(0, 5.8, 0);
      this.handpieceGroup.add(bodyMesh);

      // Metal Accent Grip Rings
      const ringGeom = new THREE.TorusGeometry(1.25, 0.06, 12, 32);
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8e3f0, metalness: 0.95, roughness: 0.1 });
      const ring1 = new THREE.Mesh(ringGeom, chromeMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.set(0, 4.6, 0);
      this.handpieceGroup.add(ring1);

      const ring2 = new THREE.Mesh(ringGeom, chromeMat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.set(0, 6.8, 0);
      this.handpieceGroup.add(ring2);

      // Status LED Ring on Handpiece (Reflects active wavelength color!)
      const ledRingGeom = new THREE.TorusGeometry(1.22, 0.08, 12, 32);
      this.ledRingMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
        emissive: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
        emissiveIntensity: 0.8,
        roughness: 0.1
      });
      this.ledRing = new THREE.Mesh(ledRingGeom, this.ledRingMat);
      this.ledRing.rotation.x = Math.PI / 2;
      this.ledRing.position.set(0, 5.2, 0);
      this.handpieceGroup.add(this.ledRing);

      // Flexible Fiber-Optic Cable curving off top
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 7.7, 0),
        new THREE.Vector3(0.5, 9.2, -0.8),
        new THREE.Vector3(2.5, 11.0, -2.5)
      ]);
      const cableGeom = new THREE.TubeGeometry(cableCurve, 16, 0.28, 12, false);
      const cableMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.5 });
      const cableMesh = new THREE.Mesh(cableGeom, cableMat);
      this.handpieceGroup.add(cableMesh);

      // Optical Delivery Nozzle
      const nozzleGeom = new THREE.CylinderGeometry(0.75, 1.2, 1.6, 32);
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x0f141d, roughness: 0.25, metalness: 0.9 });
      const nozzleMesh = new THREE.Mesh(nozzleGeom, nozzleMat);
      nozzleMesh.position.set(0, 3.1, 0);
      this.handpieceGroup.add(nozzleMesh);

      // Chilled Sapphire Lens Ring
      const lensGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.2, 32);
      this.lensMat = new THREE.MeshStandardMaterial({
        color: 0x80deea,
        emissive: 0x00bcd4,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });
      const lensMesh = new THREE.Mesh(lensGeom, this.lensMat);
      lensMesh.position.set(0, 2.2, 0);
      this.handpieceGroup.add(lensMesh);

      // Classic Candela Dual Distance Gauge Pins (Contact Spacers)
      const pinGeom = new THREE.CylinderGeometry(0.045, 0.045, 2.0, 12);
      const pin1 = new THREE.Mesh(pinGeom, chromeMat);
      pin1.position.set(0.65, 1.2, 0);
      this.handpieceGroup.add(pin1);

      const pin2 = new THREE.Mesh(pinGeom, chromeMat);
      pin2.position.set(-0.65, 1.2, 0);
      this.handpieceGroup.add(pin2);

      // Spot Size Targeting Reticle Circle on Skin
      const reticleGeom = new THREE.RingGeometry(0.85, 0.95, 32);
      this.reticleMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      });
      this.reticle = new THREE.Mesh(reticleGeom, this.reticleMat);
      this.reticle.rotation.x = Math.PI / 2;
      this.reticle.position.set(0, 0.2, 0);
      this.skinGroup.add(this.reticle);
    }

    // High-Impact Multi-Layered Laser Beam & Photothermal VFX
    buildHighImpactLaserVFX() {
      // 1. Core High-Intensity Laser Cylinder (Bright white/colored center)
      const coreGeom = new THREE.CylinderGeometry(0.25, 0.35, 2.0, 24);
      this.beamCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });
      this.beamCore = new THREE.Mesh(coreGeom, this.beamCoreMat);
      this.beamCore.position.set(0, 1.2, 0);
      this.scene.add(this.beamCore);

      // 2. Outer Volumetric Plasma Glow Cone
      const coneGeom = new THREE.ConeGeometry(0.85, 2.0, 32, 1, true);
      coneGeom.translate(0, 1.0, 0);
      coneGeom.rotateX(Math.PI);
      this.beamCoronaMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      this.beamCorona = new THREE.Mesh(coneGeom, this.beamCoronaMat);
      this.beamCorona.position.set(0, 0.2, 0);
      this.scene.add(this.beamCorona);

      // 3. Traveling Energy Rings (Wave pulses descending down the beam)
      this.energyRings = [];
      const ringGeom = new THREE.TorusGeometry(0.55, 0.04, 12, 24);
      for (let i = 0; i < 3; i++) {
        const rMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending
        });
        const rMesh = new THREE.Mesh(ringGeom, rMat);
        rMesh.rotation.x = Math.PI / 2;
        rMesh.position.set(0, 1.8 - i * 0.6, 0);
        this.scene.add(rMesh);
        this.energyRings.push(rMesh);
      }

      // 4. Sub-Surface Penetration Light Column (Deep tissue light)
      this.penetrationDepthMax = 5.4;
      const subGeom = new THREE.ConeGeometry(2.4, this.penetrationDepthMax, 32, 1, true);
      subGeom.translate(0, -this.penetrationDepthMax / 2, 0);
      this.subConeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      this.subConeMesh = new THREE.Mesh(subGeom, this.subConeMat);
      this.subConeMesh.position.set(0, 0.18, 0);
      this.scene.add(this.subConeMesh);

      // 5. Thermal Propagation Heat Wave Sphere (Expands from follicle bulb)
      const heatGeom = new THREE.SphereGeometry(0.6, 24, 24);
      this.heatSphereMat = new THREE.MeshBasicMaterial({
        color: 0xff3d00,
        transparent: true,
        opacity: 0.0,
        wireframe: true,
        blending: THREE.AdditiveBlending
      });
      this.heatSphere = new THREE.Mesh(heatGeom, this.heatSphereMat);
      this.heatSphere.position.set(0, -2.7, 0);
      this.scene.add(this.heatSphere);

      // 6. Impact Surface Shockwave Ring
      const shockGeom = new THREE.RingGeometry(0.1, 0.25, 32);
      this.shockMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      this.shockRing = new THREE.Mesh(shockGeom, this.shockMat);
      this.shockRing.rotation.x = Math.PI / 2;
      this.shockRing.position.set(0, 0.22, 0);
      this.scene.add(this.shockRing);

      // 7. Dynamic Photon Particles in Tissue
      const photonCount = 400;
      const photonPositions = new Float32Array(photonCount * 3);
      for (let i = 0; i < photonCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.9;
        photonPositions[i * 3] = Math.cos(angle) * radius;
        photonPositions[i * 3 + 1] = 0.2 - Math.random() * 5.2;
        photonPositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      this.photonGeom = new THREE.BufferGeometry();
      this.photonGeom.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
      this.photonMat = new THREE.PointsMaterial({
        color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
        size: 0.16,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });
      this.photonPoints = new THREE.Points(this.photonGeom, this.photonMat);
      this.scene.add(this.photonPoints);
    }

    setFitzpatrick(typeNumber) {
      this.currentFitzpatrick = typeNumber;
      const skinData = FITZPATRICK_DATA[typeNumber];
      if (skinData && this.epidermisMaterial && this.dermisMaterial) {
        this.epidermisMaterial.color.set(skinData.skinColor);
        this.dermisMaterial.color.set(skinData.dermisColor);
      }
    }

    setWavelength(wl) {
      this.currentWavelength = wl;
      const laser = LASER_WAVELENGTHS[wl];
      if (laser) {
        const col = new THREE.Color(laser.colorHex);
        this.beamCoronaMat.color = col;
        this.subConeMat.color = col;
        this.photonMat.color = col;
        this.ledRingMat.color = col;
        this.ledRingMat.emissive = col;
        this.subsurfaceLight.color = col;
        this.handpieceLedLight.color = col;
        this.energyRings.forEach(r => r.material.color = col);

        const depthScale = laser.penetrationDepthMm / 5.5;
        this.subConeMesh.scale.set(1.0 + depthScale * 0.4, depthScale, 1.0 + depthScale * 0.4);
      }
    }

    setHairThickness(thickKey) {
      this.currentThickness = thickKey;
      const tData = HAIR_THICKNESS[thickKey];
      if (tData && this.shaftMesh) {
        const radiusScale = tData.radiusMm / 0.05;
        this.shaftMesh.scale.set(radiusScale, 1, radiusScale);
      }
    }

    setHairColor(colorKey) {
      this.currentColor = colorKey;
      const cData = HAIR_COLORS[colorKey];
      if (cData && this.shaftMat && this.bulbMat) {
        const col = new THREE.Color(cData.colorHex);
        this.shaftMat.color = col;
        this.bulbMat.color = col;
      }
    }

    firePulse(physicsResult, onProgress, onComplete) {
      this.isFiring = true;
      this.pulseProgress = 0;
      this.lastPhysicsResult = physicsResult;
      this.activeBurnVisual = physicsResult.isBurn;
      this.activeDestructionVisual = physicsResult.follicleDestroyed;
      this.onPulseProgress = onProgress;
      this.onPulseComplete = onComplete;

      // Reset previous states
      this.bulbMat.emissive.set(0x000000);
      this.bulbMat.emissiveIntensity = 0;
      this.burnMaterial.opacity = 0;
      this.burnMaterial.emissiveIntensity = 0;
      this.shockRing.scale.set(1, 1, 1);
    }

    setCameraPreset(presetName) {
      if (presetName === 'cross') {
        this.animateCameraTo(new THREE.Vector3(11, 4.5, 12), new THREE.Vector3(0, -0.6, 0));
      } else if (presetName === 'top') {
        this.animateCameraTo(new THREE.Vector3(0.2, 11.5, 3.5), new THREE.Vector3(0, 0.2, 0));
      } else if (presetName === 'bulb') {
        this.animateCameraTo(new THREE.Vector3(3.2, -2.3, 3.8), new THREE.Vector3(0, -2.7, 0));
      }
    }

    animateCameraTo(targetPos, targetLookAt) {
      const startPos = this.camera.position.clone();
      const startTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3();
      let progress = 0;
      const stepAnim = () => {
        progress += 0.05;
        this.camera.position.lerpVectors(startPos, targetPos, progress);
        if (this.controls) {
          this.controls.target.lerpVectors(startTarget, targetLookAt, progress);
        }
        if (progress < 1) {
          requestAnimationFrame(stepAnim);
        }
      };
      stepAnim();
    }

    onResize() {
      this.width = Math.max(320, this.container.clientWidth || window.innerWidth * 0.5);
      this.height = Math.max(500, this.container.clientHeight || window.innerHeight * 0.65);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }

    animate() {
      requestAnimationFrame(this.animate);
      const delta = this.clock.getDelta();

      if (this.controls) {
        this.controls.update();
      }

      if (this.reticle) {
        this.reticle.rotation.z += 0.008;
      }

      // HIGH-IMPACT LASER PULSE ANIMATION
      if (this.isFiring) {
        // Controlled pulse duration (~0.9s for dramatic observation)
        const rate = (this.pulseSpeed || 1.0) * 1.15;
        this.pulseProgress += delta * rate;

        if (this.pulseProgress <= 1.0) {
          const intensity = Math.sin(this.pulseProgress * Math.PI);

          // 1. Core beam & corona glow
          this.beamCoreMat.opacity = intensity * 0.95;
          this.beamCoronaMat.opacity = intensity * 0.85;
          this.subConeMat.opacity = intensity * 0.55;
          this.photonMat.opacity = intensity * 0.9;
          this.subsurfaceLight.intensity = intensity * 4.8;

          // 2. Energy waves traveling down handpiece to skin
          this.energyRings.forEach((ring, idx) => {
            ring.material.opacity = intensity * 0.8;
            ring.position.y -= delta * 3.5;
            if (ring.position.y < 0.25) {
              ring.position.y = 2.1;
            }
          });

          // 3. Shockwave expansion on surface
          const shockScale = 1.0 + this.pulseProgress * 5.0;
          this.shockRing.scale.set(shockScale, shockScale, 1);
          this.shockMat.opacity = Math.max(0, (1.0 - this.pulseProgress) * 0.7);

          // 4. Photon movement in tissue
          const positions = this.photonGeom.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= delta * 14.0;
            if (positions[i + 1] < -5.2) {
              positions[i + 1] = 0.2;
            }
          }
          this.photonGeom.attributes.position.needsUpdate = true;

          // 5. Thermal Heat Wave Expanding from Follicle Bulb
          if (this.lastPhysicsResult) {
            const bulbRatio = Math.min(1.0, (this.lastPhysicsResult.bulbTemp - 35) / 60);
            if (bulbRatio > 0.1) {
              this.bulbMat.emissive.set(0xff5500);
              this.bulbMat.emissiveIntensity = intensity * bulbRatio * 4.0;

              // Expanding thermal sphere
              const heatScale = 1.0 + this.pulseProgress * 2.5 * bulbRatio;
              this.heatSphere.scale.set(heatScale, heatScale * 1.3, heatScale);
              this.heatSphereMat.opacity = intensity * 0.65 * bulbRatio;
            }

            // Epidermal Burn Damage Animation
            if (this.activeBurnVisual) {
              this.burnMaterial.opacity = Math.min(0.95, intensity * 1.4);
              this.burnMaterial.emissiveIntensity = intensity * 3.0;
              this.burnMesh.scale.set(1 + intensity * 0.4, 1 + intensity * 0.9, 1 + intensity * 0.4);
            }

            // Real-time counter callback
            if (this.onPulseProgress) {
              this.onPulseProgress(this.pulseProgress);
            }
          }
        } else {
          // Pulse complete
          this.isFiring = false;
          this.beamCoreMat.opacity = 0;
          this.beamCoronaMat.opacity = 0;
          this.subConeMat.opacity = 0;
          this.photonMat.opacity = 0;
          this.subsurfaceLight.intensity = 0;
          this.heatSphereMat.opacity = 0;
          this.shockMat.opacity = 0;
          this.energyRings.forEach(r => r.material.opacity = 0);

          // Retain charred look if destroyed or burned
          if (this.activeBurnVisual) {
            this.burnMaterial.opacity = 0.85;
            this.burnMaterial.emissiveIntensity = 0.4;
          }
          if (this.activeDestructionVisual) {
            this.bulbMat.color.set(0x181212);
            this.bulbMat.emissive.set(0x000000);
          }

          if (this.onPulseComplete) {
            this.onPulseComplete(this.lastPhysicsResult);
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ==========================================================================
     5. MAIN CONTROLLER & USER INTERFACE BINDINGS
     ========================================================================== */
  class LaserSimulatorApp {
    constructor() {
      this.state = {
        fitzpatrickType: 3,
        wavelength: 808,
        hairThicknessKey: 'medium',
        hairColorKey: 'black',
        fluence: 28,
        pulseDuration: 30,
        coolingEnabled: true,
        slowMo: false
      };

      this.initComponents();
      this.bindEvents();
      this.updateAll();
    }

    initComponents() {
      const viewportContainer = document.getElementById('viewport3d');
      this.scene3d = new SkinLaser3DScene(viewportContainer);

      const canvas = document.getElementById('absorptionCanvas');
      this.chart = new AbsorptionChart(canvas);
    }

    bindEvents() {
      // Fitzpatrick Slider & Swatches
      const fitzSlider = document.getElementById('fitzSlider');
      const swatches = document.querySelectorAll('.fitz-swatch');

      fitzSlider.addEventListener('input', (e) => {
        this.state.fitzpatrickType = parseInt(e.target.value, 10);
        sound.playDialClick();
        this.updateFitzpatrickUI();
        this.updateAll();
      });

      swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
          const type = parseInt(swatch.dataset.type, 10);
          this.state.fitzpatrickType = type;
          fitzSlider.value = type;
          sound.playDialClick();
          this.updateFitzpatrickUI();
          this.updateAll();
        });
      });

      // Hair Thickness
      const thicknessBtns = document.querySelectorAll('.thickness-btn');
      thicknessBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          thicknessBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.hairThicknessKey = btn.dataset.thickness;
          sound.playDialClick();
          this.scene3d.setHairThickness(this.state.hairThicknessKey);
          this.updateAll();
        });
      });

      // Hair Color
      const colorBtns = document.querySelectorAll('.color-btn');
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          colorBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.hairColorKey = btn.dataset.color;
          sound.playDialClick();
          this.scene3d.setHairColor(this.state.hairColorKey);
          this.updateAll();
        });
      });

      // Laser Selection Cards
      const laserCards = document.querySelectorAll('.laser-card');
      laserCards.forEach(card => {
        card.addEventListener('click', () => {
          laserCards.forEach(c => c.classList.remove('active-755', 'active-808', 'active-1064'));
          const wl = parseInt(card.dataset.wavelength, 10);
          card.classList.add(`active-${wl}`);
          this.state.wavelength = wl;
          sound.playDialClick();
          this.scene3d.setWavelength(wl);
          this.chart.setWavelength(wl);
          this.updateAll();
        });
      });

      // Fluence Slider
      const fluenceSlider = document.getElementById('fluenceSlider');
      const fluenceValDisplay = document.getElementById('fluenceValue');
      fluenceSlider.addEventListener('input', (e) => {
        this.state.fluence = parseInt(e.target.value, 10);
        fluenceValDisplay.textContent = `${this.state.fluence} J/cm²`;
        this.updateAll();
      });

      // Pulse Duration Slider
      const pulseSlider = document.getElementById('pulseSlider');
      const pulseValDisplay = document.getElementById('pulseValue');
      pulseSlider.addEventListener('input', (e) => {
        this.state.pulseDuration = parseInt(e.target.value, 10);
        pulseValDisplay.textContent = `${this.state.pulseDuration} ms`;
        this.updateAll();
      });

      // Cooling Toggle
      const coolingToggle = document.getElementById('coolingToggle');
      coolingToggle.addEventListener('change', (e) => {
        this.state.coolingEnabled = e.target.checked;
        if (this.state.coolingEnabled) {
          sound.playCryoCooling();
        } else {
          sound.playDialClick();
        }
        this.updateAll();
      });

      // Slow-Mo Toggle
      const slowMoToggle = document.getElementById('slowMoToggle');
      if (slowMoToggle) {
        slowMoToggle.addEventListener('change', (e) => {
          this.state.slowMo = e.target.checked;
          this.scene3d.pulseSpeed = this.state.slowMo ? 0.35 : 1.0;
        });
      }

      // Camera Presets
      const viewBtns = document.querySelectorAll('.view-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          viewBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.scene3d.setCameraPreset(btn.dataset.view);
        });
      });

      // Audio Toggle
      const audioBtn = document.getElementById('audioToggleBtn');
      audioBtn.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        audioBtn.innerHTML = isMuted 
          ? `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> كتم الصوت`
          : `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> الصوت مفعّل`;
      });

      // Laser Fire Button
      const fireBtn = document.getElementById('fireLaserBtn');
      fireBtn.addEventListener('click', () => this.fireLaser());

      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          this.fireLaser();
        }
      });

      // Quick Scenario Chips
      const scenarioChips = document.querySelectorAll('.scenario-chip');
      scenarioChips.forEach(chip => {
        chip.addEventListener('click', () => {
          this.loadScenario(chip.dataset.scenario);
        });
      });

      // Close Result Modal
      const closeModalBtn = document.getElementById('closeResultModal');
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
          document.getElementById('shotResultModal').classList.remove('show');
        });
      }
    }

    loadScenario(scenarioName) {
      sound.playDialClick();
      if (scenarioName === 'ideal-fair') {
        this.state.fitzpatrickType = 1;
        this.state.wavelength = 755;
        this.state.hairColorKey = 'black';
        this.state.hairThicknessKey = 'medium';
        this.state.fluence = 28;
        this.state.coolingEnabled = true;
      } else if (scenarioName === 'burn-hazard') {
        this.state.fitzpatrickType = 6;
        this.state.wavelength = 755;
        this.state.hairColorKey = 'black';
        this.state.hairThicknessKey = 'coarse';
        this.state.fluence = 36;
        this.state.coolingEnabled = false;
      } else if (scenarioName === 'gold-standard-dark') {
        this.state.fitzpatrickType = 6;
        this.state.wavelength = 1064;
        this.state.hairColorKey = 'black';
        this.state.hairThicknessKey = 'coarse';
        this.state.fluence = 42;
        this.state.coolingEnabled = true;
      } else if (scenarioName === 'blonde-challenge') {
        this.state.fitzpatrickType = 2;
        this.state.wavelength = 808;
        this.state.hairColorKey = 'white';
        this.state.hairThicknessKey = 'fine';
        this.state.fluence = 30;
        this.state.coolingEnabled = true;
      }

      this.syncUIFromState();
      this.updateAll();
    }

    syncUIFromState() {
      document.getElementById('fitzSlider').value = this.state.fitzpatrickType;
      document.getElementById('fluenceSlider').value = this.state.fluence;
      document.getElementById('fluenceValue').textContent = `${this.state.fluence} J/cm²`;
      document.getElementById('pulseSlider').value = this.state.pulseDuration;
      document.getElementById('pulseValue').textContent = `${this.state.pulseDuration} ms`;
      document.getElementById('coolingToggle').checked = this.state.coolingEnabled;

      document.querySelectorAll('.laser-card').forEach(c => {
        c.classList.remove('active-755', 'active-808', 'active-1064');
        if (parseInt(c.dataset.wavelength, 10) === this.state.wavelength) {
          c.classList.add(`active-${this.state.wavelength}`);
        }
      });

      document.querySelectorAll('.thickness-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.thickness === this.state.hairThicknessKey);
      });

      document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.color === this.state.hairColorKey);
      });

      this.updateFitzpatrickUI();
      this.scene3d.setFitzpatrick(this.state.fitzpatrickType);
      this.scene3d.setWavelength(this.state.wavelength);
      this.scene3d.setHairThickness(this.state.hairThicknessKey);
      this.scene3d.setHairColor(this.state.hairColorKey);
      this.chart.setWavelength(this.state.wavelength);
    }

    updateFitzpatrickUI() {
      const type = this.state.fitzpatrickType;
      const skin = FITZPATRICK_DATA[type];
      
      document.querySelectorAll('.fitz-swatch').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.type, 10) === type);
      });

      document.getElementById('fitzName').textContent = skin.arabicName;
      document.getElementById('fitzDesc').textContent = skin.description;
      this.scene3d.setFitzpatrick(type);
    }

    fireLaser() {
      if (this.scene3d.isFiring) return;

      const fireBtn = document.getElementById('fireLaserBtn');
      fireBtn.classList.add('active-firing');
      fireBtn.querySelector('span:first-of-type').textContent = 'جاري إطلاق النبضة وتفريغ الطاقة...';

      if (this.state.coolingEnabled) {
        sound.playCryoCooling();
      }

      const result = calculateLaserShot(this.state);

      setTimeout(() => {
        sound.playLaserShot({
          wavelength: this.state.wavelength,
          isBurn: result.isBurn
        });
      }, this.state.coolingEnabled ? 60 : 0);

      const epiTempEl = document.getElementById('epidermalTemp');
      const bulbTempEl = document.getElementById('bulbTemp');
      const startEpi = 35.0;
      const targetEpi = result.epidermalTemp;
      const startBulb = 35.0;
      const targetBulb = result.bulbTemp;

      // Dynamic climbing temperature counter during shot
      this.scene3d.firePulse(
        result,
        (progress) => {
          const curEpi = startEpi + (targetEpi - startEpi) * progress;
          const curBulb = startBulb + (targetBulb - startBulb) * progress;
          epiTempEl.textContent = `${curEpi.toFixed(1)}°C`;
          bulbTempEl.textContent = `${curBulb.toFixed(1)}°C`;
        },
        (completedResult) => {
          fireBtn.classList.remove('active-firing');
          fireBtn.querySelector('span:first-of-type').textContent = 'إطلاق نبضة الليزر (FIRE LASER)';
          this.renderTelemetry(completedResult);
          this.showShotResultCard(completedResult);
        }
      );
    }

    showShotResultCard(result) {
      const modal = document.getElementById('shotResultModal');
      const title = document.getElementById('resultModalTitle');
      const badge = document.getElementById('resultModalBadge');
      const details = document.getElementById('resultModalDetails');
      const summary = document.getElementById('resultModalSummary');

      if (!modal) return;

      if (result.isBurn) {
        title.innerHTML = '⚠️ تحذير سريري حاد: حروق جلدية بالغة!';
        badge.className = 'result-status-badge badge-burn';
        badge.textContent = 'خطر حروق وتسلخات (Thermal Injury)';
      } else if (result.follicleDestroyed) {
        title.innerHTML = '✓ نجاح التحلل الحراري الانتقائي!';
        badge.className = 'result-status-badge badge-success';
        badge.textContent = 'تم القضاء على البصيلة بنجاح (Target Coagulated)';
      } else {
        title.innerHTML = 'ℹ️ لم يتم تدمير بصيلة الشعر!';
        badge.className = 'result-status-badge badge-ineffective';
        badge.textContent = 'طاقة غير كافية أو غياب الميلانين';
      }

      details.innerHTML = `
        <div class="result-metric-row">
          <span>حرارة سطح البشرة القصوى:</span>
          <strong style="color: ${result.isBurn ? '#ff1744' : '#10b981'}">${result.epidermalTemp}°C ${result.isBurn ? '(تجاوزت عتبة الحرق!)' : '(ضمن النطاق الآمن)'}</strong>
        </div>
        <div class="result-metric-row">
          <span>حرارة بصيلة وجذر الشعر:</span>
          <strong style="color: ${result.follicleDestroyed ? '#10b981' : '#f59e0b'}">${result.bulbTemp}°C ${result.follicleDestroyed ? '(تجاوزت 70°C وتم التخثير)' : '(لم تصل لعتبة التخثير 70°C)'}</strong>
        </div>
        <div class="result-metric-row">
          <span>طول الموجة وامتصاص الميلانين:</span>
          <strong>${result.laser.name} (${result.laser.wavelength}nm) | نفاذية ${result.laser.penetrationDepthMm}mm</strong>
        </div>
      `;

      summary.textContent = result.warningMessage;
      modal.classList.add('show');
    }

    updateAll() {
      const result = calculateLaserShot(this.state);
      this.renderTelemetry(result);
    }

    renderTelemetry(result) {
      const epiTempEl = document.getElementById('epidermalTemp');
      const epiFillEl = document.getElementById('epidermalFill');
      epiTempEl.textContent = `${result.epidermalTemp}°C`;
      
      const epiPercent = Math.min(100, Math.max(0, ((result.epidermalTemp - 35) / 65) * 100));
      epiFillEl.style.width = `${epiPercent}%`;
      if (result.epidermalTemp >= 70) {
        epiFillEl.style.backgroundColor = '#ff1744';
        epiTempEl.style.color = '#ff1744';
      } else if (result.epidermalTemp >= 55) {
        epiFillEl.style.backgroundColor = '#f59e0b';
        epiTempEl.style.color = '#f59e0b';
      } else {
        epiFillEl.style.backgroundColor = '#10b981';
        epiTempEl.style.color = '#34d399';
      }

      const bulbTempEl = document.getElementById('bulbTemp');
      const bulbFillEl = document.getElementById('bulbFill');
      bulbTempEl.textContent = `${result.bulbTemp}°C`;
      const bulbPercent = Math.min(100, Math.max(0, ((result.bulbTemp - 35) / 95) * 100));
      bulbFillEl.style.width = `${bulbPercent}%`;
      bulbFillEl.style.backgroundColor = result.follicleDestroyed ? '#10b981' : '#f59e0b';
      bulbTempEl.style.color = result.follicleDestroyed ? '#34d399' : '#fbbf24';

      const efficacyEl = document.getElementById('efficacyVal');
      efficacyEl.textContent = `${result.efficacyPercent}%`;

      const banner = document.getElementById('safetyBanner');
      const bannerTitle = document.getElementById('safetyBannerTitle');
      const bannerDesc = document.getElementById('safetyBannerDesc');

      banner.className = 'safety-banner';
      if (result.safetyStatus === 'CRITICAL_BURN') {
        banner.classList.add('critical-burn');
        bannerTitle.innerHTML = `⚠️ تحذير سريري حاد: خطر حروق بالغة <span class="ltr-text">[Burn Hazard!]</span>`;
      } else if (result.safetyStatus === 'HIGH_RISK') {
        banner.classList.add('high-risk');
        bannerTitle.innerHTML = `⚠️ حذر شديد: خطر تصبغات <span class="ltr-text">[High PIH Risk]</span>`;
      } else if (result.safetyStatus === 'CAUTION') {
        banner.classList.add('caution');
        bannerTitle.innerHTML = `ℹ️ تنبيه سريري: احمرار متوقع <span class="ltr-text">[Mild Erythema]</span>`;
      } else {
        banner.classList.add('safe');
        bannerTitle.innerHTML = `✓ الوضع آمن ومتوافق سريرياً <span class="ltr-text">[Clinical Safe Zone]</span>`;
      }
      bannerDesc.textContent = result.warningMessage;
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new LaserSimulatorApp();
    });
  } else {
    window.app = new LaserSimulatorApp();
  }

})();
