/**
 * KERA Optical Absorption Spectrum Chart
 * Renders the clinical absorption curve: Melanin, Oxyhemoglobin (HbO2), and Water (H2O)
 * High-DPI Canvas-based procedural renderer with active wavelength indicator.
 */

export class AbsorptionChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.currentWavelength = 808;

    this.initResize();
    this.draw();
  }

  initResize() {
    this.resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = Math.max(160, rect.height || 180);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.scale(dpr, dpr);
      this.draw();
    };

    window.addEventListener('resize', this.resize);
    // Initial call
    setTimeout(this.resize, 50);
  }

  setWavelength(wl) {
    this.currentWavelength = wl;
    this.draw();
  }

  // Melanin absorption approximation formula: μ_a ≈ 1.70e12 * λ^(-3.48) cm^-1
  getMelaninAbsorption(lambda) {
    return Math.pow(500 / lambda, 3.3);
  }

  // Oxyhemoglobin absorption approximation (peaks around 415, 542, 576 nm, then drops)
  getHbO2Absorption(lambda) {
    if (lambda < 600) {
      return 0.8 * Math.exp(-Math.pow((lambda - 560) / 45, 2)) + 0.3;
    }
    return 0.15 * Math.exp(-(lambda - 600) / 120) + 0.02;
  }

  // Water absorption (starts rising sharply past 900nm)
  getWaterAbsorption(lambda) {
    if (lambda < 900) return 0.01;
    return 0.01 + 0.7 * Math.pow((lambda - 900) / 300, 2.5);
  }

  draw() {
    if (!this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Margins
    const padL = 44;
    const padR = 20;
    const padT = 25;
    const padB = 28;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c111a');
    bgGrad.addColorStop(1, '#07090e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines & Axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(180, 200, 220, 0.65)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    const minLambda = 500;
    const maxLambda = 1150;

    const lambdaToX = (lambda) => padL + ((lambda - minLambda) / (maxLambda - minLambda)) * plotW;
    const valToY = (val) => padT + (1.0 - Math.min(1.0, Math.max(0.0, val))) * plotH;

    // Vertical wavelength grid
    const tickWavelengths = [600, 700, 800, 900, 1000, 1100];
    tickWavelengths.forEach(wl => {
      const x = lambdaToX(wl);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.fillText(`${wl}nm`, x, padT + plotH + 16);
    });

    // Therapeutic Optical Window Shading (650nm - 1100nm)
    const windowStart = lambdaToX(650);
    const windowEnd = lambdaToX(1100);
    ctx.fillStyle = 'rgba(0, 230, 255, 0.035)';
    ctx.fillRect(windowStart, padT, windowEnd - windowStart, plotH);

    ctx.fillStyle = 'rgba(0, 230, 255, 0.5)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('النافذة البصرية للعلاج (Optical Window)', windowStart + 6, padT + 13);

    // 1. Plot Oxyhemoglobin Curve (Red dotted)
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
    ctx.setLineDash([]); // reset

    // 2. Plot Water Absorption Curve (Cyan dotted)
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
    ctx.setLineDash([]); // reset

    // 3. Plot Melanin Absorption Curve (Gold gradient / Solid)
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

    // Chart Legends
    ctx.textAlign = 'right';
    ctx.font = '10px Inter, system-ui, sans-serif';
    
    // Melanin legend
    ctx.fillStyle = '#ffb300';
    ctx.fillText('● الميلانين (Melanin)', padL + plotW - 140, padT + 12);
    // HbO2 legend
    ctx.fillStyle = '#ef5350';
    ctx.fillText('-- الهيموغلوبين (HbO2)', padL + plotW - 40, padT + 12);

    // Highlight Selected Wavelength Vertical Laser Line
    const activeX = lambdaToX(this.currentWavelength);
    const activeMelaninY = valToY(this.getMelaninAbsorption(this.currentWavelength));

    // Glow line
    ctx.strokeStyle = this.currentWavelength === 755 ? 'rgba(255, 23, 68, 0.9)' :
                     (this.currentWavelength === 808 ? 'rgba(213, 0, 0, 0.9)' : 'rgba(171, 71, 188, 0.9)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(activeX, padT);
    ctx.lineTo(activeX, padT + plotH);
    ctx.stroke();

    // Intersection Target Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(activeX, activeMelaninY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff9100';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tag badge for selected laser
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const tagW = 60;
    const tagH = 18;
    const tagX = Math.min(padL + plotW - tagW, Math.max(padL, activeX - tagW / 2));
    ctx.fillRect(tagX, padT + plotH - tagH - 4, tagW, tagH);
    ctx.strokeRect(tagX, padT + plotH - tagH - 4, tagW, tagH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.currentWavelength} nm`, tagX + tagW / 2, padT + plotH - 8);
  }
}
