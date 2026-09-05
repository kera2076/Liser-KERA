/**
 * KERA Medical Physics & Laser Dermatology Simulator
 * Main Application Orchestrator
 * Coordinates UI events, 3D procedural engine, physics telemetry, and audio synthesizer.
 */

import { calculateLaserShot, FITZPATRICK_DATA, LASER_WAVELENGTHS } from './physics.js';
import { SkinLaser3DScene } from './scene3d.js';
import { sound } from './audio.js';
import { AbsorptionChart } from './chart.js';

class LaserSimulatorApp {
  constructor() {
    // Current Clinical State
    this.state = {
      fitzpatrickType: 3,
      wavelength: 808,
      hairThicknessKey: 'medium',
      hairColorKey: 'black',
      fluence: 28,
      pulseDuration: 30,
      coolingEnabled: true
    };

    this.initComponents();
    this.bindEvents();
    this.updateAll();
  }

  initComponents() {
    // 1. Initialize 3D Procedural Scene
    const viewportContainer = document.getElementById('viewport3d');
    this.scene3d = new SkinLaser3DScene(viewportContainer);

    // 2. Initialize Absorption Chart
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

    // Hair Thickness Buttons
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

    // Hair Color Buttons
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
        laserCards.forEach(c => {
          c.classList.remove('active-755', 'active-808', 'active-1064');
        });
        const wl = parseInt(card.dataset.wavelength, 10);
        card.classList.add(`active-${wl}`);
        this.state.wavelength = wl;
        sound.playDialClick();
        this.scene3d.setWavelength(wl);
        this.chart.setWavelength(wl);
        this.updateAll();
      });
    });

    // Fluence (J/cm²) Slider
    const fluenceSlider = document.getElementById('fluenceSlider');
    const fluenceValDisplay = document.getElementById('fluenceValue');
    fluenceSlider.addEventListener('input', (e) => {
      this.state.fluence = parseInt(e.target.value, 10);
      fluenceValDisplay.textContent = `${this.state.fluence} J/cm²`;
      this.updateAll();
    });

    // Pulse Duration (ms) Slider
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

    // View Angle Preset Buttons
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene3d.setCameraPreset(btn.dataset.view);
      });
    });

    // Audio Mute Toggle
    const audioBtn = document.getElementById('audioToggleBtn');
    audioBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      audioBtn.innerHTML = isMuted 
        ? `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> كتم الصوت`
        : `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> الصوت مفعّل`;
    });

    // Laser Fire Trigger
    const fireBtn = document.getElementById('fireLaserBtn');
    fireBtn.addEventListener('click', () => this.fireLaser());

    // Spacebar keyboard shortcut for firing
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        this.fireLaser();
      }
    });

    // Clinical Preset Scenario Chips
    const scenarioChips = document.querySelectorAll('.scenario-chip');
    scenarioChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.loadScenario(chip.dataset.scenario);
      });
    });
  }

  loadScenario(scenarioName) {
    sound.playDialClick();
    if (scenarioName === 'ideal-fair') {
      // Type I, Alexandrite 755nm, Dark Hair
      this.state.fitzpatrickType = 1;
      this.state.wavelength = 755;
      this.state.hairColorKey = 'black';
      this.state.hairThicknessKey = 'medium';
      this.state.fluence = 28;
      this.state.coolingEnabled = true;
    } else if (scenarioName === 'burn-hazard') {
      // Type VI, Alexandrite 755nm (Extreme Burn Danger!)
      this.state.fitzpatrickType = 6;
      this.state.wavelength = 755;
      this.state.hairColorKey = 'black';
      this.state.hairThicknessKey = 'coarse';
      this.state.fluence = 35;
      this.state.coolingEnabled = false; // No cooling makes it catastrophically clear
    } else if (scenarioName === 'gold-standard-dark') {
      // Type VI, Nd:YAG 1064nm (Safe and effective for dark skin)
      this.state.fitzpatrickType = 6;
      this.state.wavelength = 1064;
      this.state.hairColorKey = 'black';
      this.state.hairThicknessKey = 'coarse';
      this.state.fluence = 42;
      this.state.coolingEnabled = true;
    } else if (scenarioName === 'blonde-challenge') {
      // Type II, Diode 808nm, White/Grey Hair (No target melanin)
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

    // Laser card
    document.querySelectorAll('.laser-card').forEach(c => {
      c.classList.remove('active-755', 'active-808', 'active-1064');
      if (parseInt(c.dataset.wavelength, 10) === this.state.wavelength) {
        c.classList.add(`active-${this.state.wavelength}`);
      }
    });

    // Thickness
    document.querySelectorAll('.thickness-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.thickness === this.state.hairThicknessKey);
    });

    // Color
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
    
    // Update active swatch
    document.querySelectorAll('.fitz-swatch').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.type, 10) === type);
    });

    // Update Info Card
    document.getElementById('fitzName').textContent = skin.arabicName;
    document.getElementById('fitzDesc').textContent = skin.description;

    // Tell 3D scene to update skin surface color
    this.scene3d.setFitzpatrick(type);
  }

  fireLaser() {
    if (this.scene3d.isFiring) return; // prevent spam during pulse

    // Pre-pulse cooling sound if enabled
    if (this.state.coolingEnabled) {
      sound.playCryoCooling();
    }

    // Execute physics calculation
    const result = calculateLaserShot(this.state);

    // Play discharge sound
    setTimeout(() => {
      sound.playLaserShot({
        wavelength: this.state.wavelength,
        isBurn: result.isBurn
      });
    }, this.state.coolingEnabled ? 60 : 0);

    // Trigger 3D visual pulse & thermal reaction
    this.scene3d.firePulse(result);

    // Update Telemetry & Safety Gauges
    this.renderTelemetry(result);
  }

  updateAll() {
    const result = calculateLaserShot(this.state);
    this.renderTelemetry(result);
  }

  renderTelemetry(result) {
    // 1. Epidermal Temperature
    const epiTempEl = document.getElementById('epidermalTemp');
    const epiFillEl = document.getElementById('epidermalFill');
    epiTempEl.textContent = `${result.epidermalTemp}°C`;
    
    // Scale 35°C (0%) to 100°C (100%)
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

    // 2. Bulb Temperature
    const bulbTempEl = document.getElementById('bulbTemp');
    const bulbFillEl = document.getElementById('bulbFill');
    bulbTempEl.textContent = `${result.bulbTemp}°C`;
    const bulbPercent = Math.min(100, Math.max(0, ((result.bulbTemp - 35) / 95) * 100));
    bulbFillEl.style.width = `${bulbPercent}%`;
    bulbFillEl.style.backgroundColor = result.follicleDestroyed ? '#10b981' : '#f59e0b';
    bulbTempEl.style.color = result.follicleDestroyed ? '#34d399' : '#fbbf24';

    // 3. Efficacy
    const efficacyEl = document.getElementById('efficacyVal');
    efficacyEl.textContent = `${result.efficacyPercent}%`;

    // 4. Safety Banner
    const banner = document.getElementById('safetyBanner');
    const bannerTitle = document.getElementById('safetyBannerTitle');
    const bannerDesc = document.getElementById('safetyBannerDesc');

    banner.className = 'safety-banner';
    if (result.safetyStatus === 'CRITICAL_BURN') {
      banner.classList.add('critical-burn');
      bannerTitle.innerHTML = `⚠️ تحذير سريري حاد: خطر حروق بالغة (Burn Hazard!)`;
    } else if (result.safetyStatus === 'HIGH_RISK') {
      banner.classList.add('high-risk');
      bannerTitle.innerHTML = `⚠️ حذر شديد: خطر تصبغات (High PIH Risk)`;
    } else if (result.safetyStatus === 'CAUTION') {
      banner.classList.add('caution');
      bannerTitle.innerHTML = `ℹ️ تنبيه سريري: احمرار متوقع (Mild Erythema)`;
    } else {
      banner.classList.add('safe');
      bannerTitle.innerHTML = `✓ الوضع آمن ومتوافق سريرياً (Clinical Safe Zone)`;
    }
    bannerDesc.textContent = result.warningMessage;
  }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new LaserSimulatorApp();
});
