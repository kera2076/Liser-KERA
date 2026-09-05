/**
 * KERA Laser & Dermatology 3D Anatomical Scene
 * Procedurally generated anatomical skin cross-section, hair follicle,
 * laser handpiece, volumetric photon scattering, and photothermal reaction.
 * 100% Procedural WebGL via Three.js (No external 3D files needed).
 */

const THREE = window.THREE;
const OrbitControls = window.THREE ? window.THREE.OrbitControls : null;
import { FITZPATRICK_DATA, LASER_WAVELENGTHS, HAIR_THICKNESS, HAIR_COLORS } from './physics.js';

export class SkinLaser3DScene {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = Math.max(320, containerElement.clientWidth || window.innerWidth * 0.5);
    this.height = Math.max(450, containerElement.clientHeight || window.innerHeight * 0.65);

    // State
    this.currentFitzpatrick = 3;
    this.currentWavelength = 808;
    this.currentThickness = 'medium';
    this.currentColor = 'black';
    this.isFiring = false;
    this.pulseProgress = 0;
    this.pulseDurationMs = 300; // visual pulse duration
    this.activeBurnVisual = false;
    this.activeDestructionVisual = false;

    // Initialization
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.buildSkinBlock();
    this.buildHairFollicle();
    this.buildCapillaries();
    this.buildLaserHandpiece();
    this.buildBeamAndScatter();
    this.buildThermalEffects();

    // Event listeners
    window.addEventListener('resize', () => this.onResize());

    // Animation loop
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d14); // Sleek medical dark slate
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
    this.camera.position.set(11, 4.5, 12);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, -0.5, 0);
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go deep under table
    this.controls.minDistance = 5;
    this.controls.maxDistance = 25;
  }

  initLights() {
    // Ambient clinical light
    const ambientLight = new THREE.AmbientLight(0xdce7f5, 0.9);
    this.scene.add(ambientLight);

    // Directional surgical spot light
    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.mainLight.position.set(8, 14, 10);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 30;
    this.mainLight.shadow.bias = -0.0005;
    this.scene.add(this.mainLight);

    // Soft rim light for anatomical separation
    const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.8);
    rimLight.position.set(-10, -3, -8);
    this.scene.add(rimLight);

    // Dynamic laser beam flash point light
    this.laserFlashLight = new THREE.PointLight(0xff1744, 0, 15);
    this.laserFlashLight.position.set(0, 0.5, 0);
    this.scene.add(this.laserFlashLight);

    // Dynamic thermal bulb point light
    this.bulbThermalLight = new THREE.PointLight(0xff7700, 0, 8);
    this.bulbThermalLight.position.set(0, -2.5, 0);
    this.scene.add(this.bulbThermalLight);
  }

  /**
   * Procedural Anatomical Skin Block with Cutaway Cross-Section
   */
  buildSkinBlock() {
    this.skinGroup = new THREE.Group();
    this.scene.add(this.skinGroup);

    const blockWidth = 9.0;
    const blockDepth = 7.0;

    // 1. Epidermis (Stratum Corneum + Basal Layer) - Thin top layer
    const epiThickness = 0.35;
    const epiGeom = new THREE.BoxGeometry(blockWidth, epiThickness, blockDepth);
    this.epidermisMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(FITZPATRICK_DATA[this.currentFitzpatrick].skinColor),
      roughness: 0.65,
      metalness: 0.05,
      bumpScale: 0.02
    });
    this.epidermisMesh = new THREE.Mesh(epiGeom, this.epidermisMaterial);
    this.epidermisMesh.position.set(0, 0.0, 0);
    this.epidermisMesh.receiveShadow = true;
    this.epidermisMesh.castShadow = true;
    this.skinGroup.add(this.epidermisMesh);

    // Epidermal burn blister overlay (shows when skin burns)
    const burnGeom = new THREE.CylinderGeometry(1.6, 1.8, 0.08, 32);
    this.burnMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1100,
      emissive: 0x990000,
      emissiveIntensity: 0.0,
      roughness: 0.3,
      transparent: true,
      opacity: 0.0
    });
    this.burnMesh = new THREE.Mesh(burnGeom, this.burnMaterial);
    this.burnMesh.position.set(0, epiThickness / 2 + 0.04, 0);
    this.skinGroup.add(this.burnMesh);

    // 2. Dermis (Collageneous Vascular Bed) - Mid layer (pinkish/translucent)
    const dermisThickness = 3.6;
    const dermisGeom = new THREE.BoxGeometry(blockWidth, dermisThickness, blockDepth);
    this.dermisMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdf8484,
      roughness: 0.5,
      metalness: 0.0,
      transmission: 0.35, // Translucent tissue feel
      thickness: 1.8,
      transparent: true,
      opacity: 0.94
    });
    this.dermisMesh = new THREE.Mesh(dermisGeom, this.dermisMaterial);
    this.dermisMesh.position.set(0, -(epiThickness / 2 + dermisThickness / 2), 0);
    this.dermisMesh.receiveShadow = true;
    this.skinGroup.add(this.dermisMesh);

    // 3. Hypodermis (Subcutaneous Adipose Tissue) - Bottom layer (yellowish fat globules)
    const hypoThickness = 2.2;
    const hypoGeom = new THREE.BoxGeometry(blockWidth, hypoThickness, blockDepth);
    this.hypoMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5d77f,
      roughness: 0.85,
      metalness: 0.05
    });
    this.hypoMesh = new THREE.Mesh(hypoGeom, this.hypoMaterial);
    this.hypoMesh.position.set(0, -(epiThickness / 2 + dermisThickness + hypoThickness / 2), 0);
    this.skinGroup.add(this.hypoMesh);

    // Add procedural adipose (fat) clusters along the cutaway front face
    const fatSphereGeom = new THREE.SphereGeometry(0.35, 12, 12);
    const fatMat = new THREE.MeshStandardMaterial({
      color: 0xf9e082,
      roughness: 0.4,
      metalness: 0.1
    });
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

    // Anatomical Layer Boundary Labels / Depth Scale Lines
    this.buildDepthScale(-epiThickness / 2 - dermisThickness - hypoThickness, blockDepth / 2);
  }

  buildDepthScale(bottomY, frontZ) {
    const linesGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x5a738e, transparent: true, opacity: 0.6 });

    // Mark 0mm (Surface), 1mm, 2mm, 3mm, 4mm, 5mm depths
    const depths = [
      { label: '0.0 mm (Surface)', y: 0.18 },
      { label: '1.0 mm (Epidermis/Papillary)', y: -0.8 },
      { label: '2.5 mm (Alexandrite 755nm)', y: -2.0 },
      { label: '3.8 mm (Diode 808nm)', y: -3.2 },
      { label: '5.5 mm (Nd:YAG 1064nm)', y: -5.0 }
    ];

    depths.forEach(d => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4.6, d.y, frontZ + 0.02),
        new THREE.Vector3(-4.3, d.y, frontZ + 0.02)
      ]);
      const line = new THREE.Line(geom, lineMat);
      linesGroup.add(line);
    });
    this.skinGroup.add(linesGroup);
  }

  /**
   * Hair Follicle with Dermal Papilla Bulb, Outer Root Sheath, and Shaft
   */
  buildHairFollicle() {
    this.hairGroup = new THREE.Group();
    this.scene.add(this.hairGroup);

    // 1. Hair Shaft (Emerging from bulb at -2.7 up to +1.8 in air)
    this.shaftRadius = 0.11; // base size
    this.shaftGeom = new THREE.CylinderGeometry(this.shaftRadius, this.shaftRadius * 1.15, 4.6, 24);
    this.shaftMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(HAIR_COLORS[this.currentColor].colorHex),
      roughness: 0.4,
      metalness: 0.2
    });
    this.shaftMesh = new THREE.Mesh(this.shaftGeom, this.shaftMat);
    this.shaftMesh.position.set(0, -0.4, 0); // centered between -2.7 and +1.9
    this.shaftMesh.castShadow = true;
    this.hairGroup.add(this.shaftMesh);

    // 2. Dermal Papilla / Bulb (Target of photothermolysis)
    const bulbGeom = new THREE.SphereGeometry(0.48, 24, 24);
    bulbGeom.scale(1, 1.45, 1);
    this.bulbMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(HAIR_COLORS[this.currentColor].colorHex),
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.5,
      metalness: 0.1
    });
    this.bulbMesh = new THREE.Mesh(bulbGeom, this.bulbMat);
    this.bulbMesh.position.set(0, -2.7, 0);
    this.hairGroup.add(this.bulbMesh);

    // 3. Translucent Follicle Sheath
    const sheathGeom = new THREE.CylinderGeometry(0.24, 0.46, 3.2, 20);
    const sheathMat = new THREE.MeshPhysicalMaterial({
      color: 0xffcccc,
      roughness: 0.3,
      metalness: 0.0,
      transmission: 0.7,
      transparent: true,
      opacity: 0.4
    });
    this.sheathMesh = new THREE.Mesh(sheathGeom, sheathMat);
    this.sheathMesh.position.set(0, -1.2, 0);
    this.hairGroup.add(this.sheathMesh);

    // 4. Sebaceous Gland (attached to upper follicle)
    const glandGeom = new THREE.DodecahedronGeometry(0.45, 1);
    const glandMat = new THREE.MeshStandardMaterial({
      color: 0xecd599,
      roughness: 0.7,
      metalness: 0.05
    });
    this.glandMesh = new THREE.Mesh(glandGeom, glandMat);
    this.glandMesh.position.set(0.45, -0.85, 0.1);
    this.glandMesh.scale.set(1.2, 0.9, 0.8);
    this.hairGroup.add(this.glandMesh);
  }

  /**
   * Anatomical Dermal Capillaries (Micro-vessels in Dermis)
   */
  buildCapillaries() {
    const capillaryGroup = new THREE.Group();
    const capMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.4 });

    const capillaryPaths = [
      [new THREE.Vector3(-2.8, -1.2, 0.3), new THREE.Vector3(-1.8, -0.7, 0.4), new THREE.Vector3(-0.9, -1.3, 0.2)],
      [new THREE.Vector3(0.9, -1.4, -0.3), new THREE.Vector3(1.9, -0.8, -0.2), new THREE.Vector3(3.0, -1.5, 0.1)],
      [new THREE.Vector3(-1.5, -2.2, 0.5), new THREE.Vector3(-0.8, -2.6, 0.3), new THREE.Vector3(0.2, -3.1, 0.4)]
    ];

    capillaryPaths.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeom = new THREE.TubeGeometry(curve, 16, 0.06, 8, false);
      const tube = new THREE.Mesh(tubeGeom, capMat);
      capillaryGroup.add(tube);
    });
    this.skinGroup.add(capillaryGroup);
  }

  /**
   * Medical Laser Handpiece (Applicator Nozzle)
   */
  buildLaserHandpiece() {
    this.handpieceGroup = new THREE.Group();
    this.scene.add(this.handpieceGroup);

    // Nozzle Cone
    const nozzleGeom = new THREE.CylinderGeometry(0.7, 1.4, 2.0, 32, 1, true);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x212b36,
      roughness: 0.3,
      metalness: 0.85
    });
    const nozzleMesh = new THREE.Mesh(nozzleGeom, nozzleMat);
    nozzleMesh.position.set(0, 3.8, 0);
    this.handpieceGroup.add(nozzleMesh);

    // Handpiece Upper Body
    const bodyGeom = new THREE.CylinderGeometry(1.4, 1.4, 3.5, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x11161f,
      roughness: 0.25,
      metalness: 0.9
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.set(0, 6.5, 0);
    this.handpieceGroup.add(bodyMesh);

    // Sapphire Chilled Optical Ring (Cold tip contact surface)
    const ringGeom = new THREE.TorusGeometry(0.75, 0.08, 16, 32);
    this.chilledRingMat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      emissive: 0x00bcd4,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    this.chilledRing = new THREE.Mesh(ringGeom, this.chilledRingMat);
    this.chilledRing.rotation.x = Math.PI / 2;
    this.chilledRing.position.set(0, 2.78, 0);
    this.handpieceGroup.add(this.chilledRing);

    // Spot Size Target Reticle on the skin
    const reticleGeom = new THREE.RingGeometry(0.85, 0.95, 32);
    this.reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.reticle = new THREE.Mesh(reticleGeom, this.reticleMat);
    this.reticle.rotation.x = Math.PI / 2;
    this.reticle.position.set(0, 0.2, 0);
    this.skinGroup.add(this.reticle);
  }

  /**
   * Optical Laser Beam Cone & Tissue Photon Scattering System
   */
  buildBeamAndScatter() {
    // 1. External Air Beam (from nozzle to skin)
    const airBeamGeom = new THREE.ConeGeometry(0.85, 2.6, 32, 1, true);
    airBeamGeom.translate(0, 1.3, 0);
    airBeamGeom.rotateX(Math.PI);
    this.airBeamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.airBeamMesh = new THREE.Mesh(airBeamGeom, this.airBeamMat);
    this.airBeamMesh.position.set(0, 0.2, 0);
    this.scene.add(this.airBeamMesh);

    // 2. Sub-surface Tissue Penetration Cone (Expanding scattering into skin)
    this.tissueDepthMax = 5.2;
    const tissueConeGeom = new THREE.ConeGeometry(2.4, this.tissueDepthMax, 32, 1, true);
    tissueConeGeom.translate(0, -this.tissueDepthMax / 2, 0);
    this.tissueConeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.tissueConeMesh = new THREE.Mesh(tissueConeGeom, this.tissueConeMat);
    this.tissueConeMesh.position.set(0, 0.18, 0);
    this.scene.add(this.tissueConeMesh);

    // 3. Dynamic Photon Particles (Sub-surface Monte Carlo scattering visualization)
    const photonCount = 450;
    const photonPositions = new Float32Array(photonCount * 3);
    const photonAlphas = new Float32Array(photonCount);

    for (let i = 0; i < photonCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8;
      photonPositions[i * 3] = Math.cos(angle) * radius;
      photonPositions[i * 3 + 1] = 0.2 - Math.random() * 5.0;
      photonPositions[i * 3 + 2] = Math.sin(angle) * radius;
      photonAlphas[i] = Math.random();
    }

    this.photonGeom = new THREE.BufferGeometry();
    this.photonGeom.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    this.photonGeom.setAttribute('alpha', new THREE.BufferAttribute(photonAlphas, 1));

    this.photonMat = new THREE.PointsMaterial({
      color: new THREE.Color(LASER_WAVELENGTHS[this.currentWavelength].colorHex),
      size: 0.14,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.photonPoints = new THREE.Points(this.photonGeom, this.photonMat);
    this.scene.add(this.photonPoints);
  }

  /**
   * Photothermal Destruction Particles (Micro steam/coagulation)
   */
  buildThermalEffects() {
    const steamCount = 80;
    const steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) {
      steamPos[i * 3] = (Math.random() - 0.5) * 0.5;
      steamPos[i * 3 + 1] = -2.7 + Math.random() * 1.5;
      steamPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    this.steamGeom = new THREE.BufferGeometry();
    this.steamGeom.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    this.steamMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.steamPoints = new THREE.Points(this.steamGeom, this.steamMat);
    this.scene.add(this.steamPoints);
  }

  /**
   * Update Fitzpatrick Skin Tone
   */
  setFitzpatrick(typeNumber) {
    this.currentFitzpatrick = typeNumber;
    const skinData = FITZPATRICK_DATA[typeNumber];
    if (skinData && this.epidermisMaterial) {
      // Smooth color transition
      this.epidermisMaterial.color.set(skinData.skinColor);
    }
  }

  /**
   * Update Laser Wavelength (755, 808, 1064)
   */
  setWavelength(wl) {
    this.currentWavelength = wl;
    const laser = LASER_WAVELENGTHS[wl];
    if (laser) {
      const col = new THREE.Color(laser.colorHex);
      this.airBeamMat.color = col;
      this.tissueConeMat.color = col;
      this.photonMat.color = col;
      this.laserFlashLight.color = col;

      // Adjust penetration cone depth visually
      const depthScale = laser.penetrationDepthMm / 5.5; // normalized to max Nd:YAG
      this.tissueConeMesh.scale.set(1.0 + depthScale * 0.4, depthScale, 1.0 + depthScale * 0.4);
    }
  }

  /**
   * Update Hair Follicle thickness
   */
  setHairThickness(thickKey) {
    this.currentThickness = thickKey;
    const tData = HAIR_THICKNESS[thickKey];
    if (tData && this.shaftMesh) {
      const radiusScale = tData.radiusMm / 0.05; // relative to medium
      this.shaftMesh.scale.set(radiusScale, 1, radiusScale);
    }
  }

  /**
   * Update Hair Pigment Color
   */
  setHairColor(colorKey) {
    this.currentColor = colorKey;
    const cData = HAIR_COLORS[colorKey];
    if (cData && this.shaftMat && this.bulbMat) {
      const col = new THREE.Color(cData.colorHex);
      this.shaftMat.color = col;
      this.bulbMat.color = col;
    }
  }

  /**
   * Trigger Laser Pulse (Shot) Animation
   */
  firePulse(physicsResult) {
    this.isFiring = true;
    this.pulseProgress = 0;
    this.lastPhysicsResult = physicsResult;
    this.activeBurnVisual = physicsResult.isBurn;
    this.activeDestructionVisual = physicsResult.follicleDestroyed;

    // Reset thermal flashes
    this.bulbMat.emissive.set(0x000000);
    this.bulbMat.emissiveIntensity = 0;
    this.burnMaterial.opacity = 0;
    this.burnMaterial.emissiveIntensity = 0;
  }

  /**
   * Camera Presets
   */
  setCameraPreset(presetName) {
    if (presetName === 'cross') {
      // Default anatomical view
      this.animateCameraTo(new THREE.Vector3(11, 4.5, 12), new THREE.Vector3(0, -0.5, 0));
    } else if (presetName === 'top') {
      // Top down surface view
      this.animateCameraTo(new THREE.Vector3(0.5, 12, 4), new THREE.Vector3(0, 0.2, 0));
    } else if (presetName === 'bulb') {
      // Zoomed in directly on hair follicle bulb
      this.animateCameraTo(new THREE.Vector3(3.5, -2.2, 4.0), new THREE.Vector3(0, -2.6, 0));
    }
  }

  animateCameraTo(targetPos, targetLookAt) {
    // Simple smooth interpolation
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    let progress = 0;

    const stepAnim = () => {
      progress += 0.05;
      this.camera.position.lerpVectors(startPos, targetPos, progress);
      this.controls.target.lerpVectors(startTarget, targetLookAt, progress);
      if (progress < 1) {
        requestAnimationFrame(stepAnim);
      }
    };
    stepAnim();
  }

  onResize() {
    this.width = Math.max(320, this.container.clientWidth || window.innerWidth * 0.5);
    this.height = Math.max(450, this.container.clientHeight || window.innerHeight * 0.65);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.controls.update();

    // Subtle breathing reticle pulse
    if (this.reticle) {
      this.reticle.rotation.z += 0.006;
    }

    // Laser Pulse Animation Handling
    if (this.isFiring) {
      this.pulseProgress += delta * 2.2; // pulse speed

      if (this.pulseProgress <= 1.0) {
        // Attack & Sustain of beam:
        const intensity = Math.sin(this.pulseProgress * Math.PI);
        this.airBeamMat.opacity = intensity * 0.85;
        this.tissueConeMat.opacity = intensity * 0.45;
        this.photonMat.opacity = intensity * 0.9;
        this.laserFlashLight.intensity = intensity * 4.5;

        // Animate photon particles streaming downwards
        const positions = this.photonGeom.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= delta * 12.0; // move down
          if (positions[i + 1] < -5.0) {
            positions[i + 1] = 0.2; // loop
          }
        }
        this.photonGeom.attributes.position.needsUpdate = true;

        // Follicle Bulb Photothermal Heating:
        if (this.lastPhysicsResult) {
          const bulbTempRatio = Math.min(1.0, (this.lastPhysicsResult.bulbTemp - 35) / 60);
          if (bulbTempRatio > 0.15) {
            this.bulbMat.emissive.set(0xff5500);
            this.bulbMat.emissiveIntensity = intensity * bulbTempRatio * 3.5;
            this.bulbThermalLight.intensity = intensity * bulbTempRatio * 3.0;
          }

          // Epidermal Burn Blistering Animation:
          if (this.activeBurnVisual) {
            this.burnMaterial.opacity = Math.min(0.9, intensity * 1.2);
            this.burnMaterial.emissiveIntensity = intensity * 2.5;
            this.burnMesh.scale.set(1 + intensity * 0.3, 1 + intensity * 0.8, 1 + intensity * 0.3);
          }

          // Thermal destruction steam/smoke particles
          if (this.activeDestructionVisual && intensity > 0.4) {
            this.steamMat.opacity = (intensity - 0.4) * 1.5;
            const sPos = this.steamGeom.attributes.position.array;
            for (let i = 0; i < sPos.length; i += 3) {
              sPos[i + 1] += delta * 1.5; // steam rising
            }
            this.steamGeom.attributes.position.needsUpdate = true;
          }
        }
      } else {
        // Cooldown phase (Release)
        this.isFiring = false;
        this.airBeamMat.opacity = 0;
        this.tissueConeMat.opacity = 0;
        this.photonMat.opacity = 0;
        this.laserFlashLight.intensity = 0;
        this.steamMat.opacity = 0;

        // Keep residual burn mark if burned!
        if (this.activeBurnVisual) {
          this.burnMaterial.opacity = 0.75;
          this.burnMaterial.emissiveIntensity = 0.4;
        }

        // Keep slight charred look on destroyed bulb
        if (this.activeDestructionVisual) {
          this.bulbMat.color.set(0x1a1515);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
