/**
 * KERA Laser & Dermatology Physics Engine
 * Implements Selective Photothermolysis calculations:
 * - Melanin absorption coefficient vs. wavelength
 * - Tissue penetration depth (Beer-Lambert & scattering approximation)
 * - Thermal accumulation in Epidermis vs. Hair Follicle Bulb
 * - Clinical Safety and Burn Hazard Assessment
 */

export const FITZPATRICK_DATA = {
  1: {
    name: 'Type I',
    arabicName: 'النوع الأول (I) - بيضاء ناصعة / عاجية',
    skinColor: '#faeae3',
    epidermalMelanin: 0.05, // very low
    burnRiskBaseline: 'Very Low',
    description: 'بشرة عاجية ناصعة البياض، تحترق دائماً تحت الشمس ولا تسمر إطلاقاً. ميلانين البشرة شبه منعدم.'
  },
  2: {
    name: 'Type II',
    arabicName: 'النوع الثاني (II) - بيضاء فاتحة',
    skinColor: '#f3dcce',
    epidermalMelanin: 0.15,
    burnRiskBaseline: 'Low',
    description: 'بشرة أوروبية فاتحة، تحترق بسهولة وتسمر بصعوبة بالغة.'
  },
  3: {
    name: 'Type III',
    arabicName: 'النوع الثالث (III) - حنطية فاتحة / متوسطة',
    skinColor: '#e0bf9d',
    epidermalMelanin: 0.30,
    burnRiskBaseline: 'Moderate',
    description: 'بشرة حنطية شائعة في حوض المتوسط، تحترق باعتدال وتسمر تدريجياً.'
  },
  4: {
    name: 'Type IV',
    arabicName: 'النوع الرابع (IV) - قمحية / زيتونية',
    skinColor: '#be9568',
    epidermalMelanin: 0.52,
    burnRiskBaseline: 'High with 755nm',
    description: 'بشرة شرق أوسطية ولاتينية قمحية، نادراً ما تحترق وتسمر بسهولة وسرعة.'
  },
  5: {
    name: 'Type V',
    arabicName: 'النوع الخامس (V) - سمراء داكنة',
    skinColor: '#8a5c36',
    epidermalMelanin: 0.78,
    burnRiskBaseline: 'Severe Risk with 755nm',
    description: 'بشرة سمراء داكنة ذات تركيز ميلانين سطحي عالٍ جداً. نادراً ما تحترق من الشمس لكنها شديدة الحساسية لليزر قصير الموجة.'
  },
  6: {
    name: 'Type VI',
    arabicName: 'النوع السادس (VI) - داكنة جداً / سوداء',
    skinColor: '#432918',
    epidermalMelanin: 0.98,
    burnRiskBaseline: 'Critical Burn Risk with 755nm & 808nm',
    description: 'بشرة شديدة الصبغة ذات أعلى تركيز ميلانين في الطبقة القرنية والبشرة. تتطلب ليزر Nd:YAG 1064nm حصراً.'
  }
};

export const LASER_WAVELENGTHS = {
  755: {
    name: 'Alexandrite',
    wavelength: 755,
    colorHex: '#ff1744',
    beamGlow: 'rgba(255, 23, 68, 0.85)',
    penetrationDepthMm: 2.4, // Shallow to medium
    melaninAbsorptionFactor: 1.0, // High absorption peak relative reference
    waterAbsorptionFactor: 0.01,
    oxyhemoglobinAbsorption: 0.08,
    targetSkinTypes: [1, 2, 3],
    contraindicatedTypes: [5, 6],
    warningType4: 'يحتاج طاقة منخفضة وتبريد فائق على البشرة القمحية (Type IV).',
    description: 'أعلى امتصاص للميلانين وعمق اختراق متوسط. مثالي للبشرة الفاتحة والشعر الرقيق، لكنه شديد الخطورة على البشرة السمراء والداكنة.'
  },
  808: {
    name: 'Diode',
    wavelength: 808,
    colorHex: '#d50000',
    beamGlow: 'rgba(213, 0, 0, 0.75)',
    penetrationDepthMm: 3.8, // Medium to deep
    melaninAbsorptionFactor: 0.65, // Balanced absorption
    waterAbsorptionFactor: 0.03,
    oxyhemoglobinAbsorption: 0.04,
    targetSkinTypes: [1, 2, 3, 4],
    contraindicatedTypes: [6],
    warningType5: 'يتطلب حذراً شديداً ونبضات أطول مع تبريد تلامسي قوي للبشرة (Type V).',
    description: 'أكثر أطوال الموجات تنوعاً وتوازناً بين امتصاص الميلانين وعمق النفاذية. ممتاز للأنواع I-IV وفعال للشعر المتوسط والسميك.'
  },
  1064: {
    name: 'Nd:YAG',
    wavelength: 1064,
    colorHex: '#9c27b0', // Visualized as infrared/deep magenta
    beamGlow: 'rgba(156, 39, 176, 0.6)',
    penetrationDepthMm: 5.5, // Deepest penetration
    melaninAbsorptionFactor: 0.22, // Low superficial absorption = Safe!
    waterAbsorptionFactor: 0.12,
    oxyhemoglobinAbsorption: 0.02,
    targetSkinTypes: [3, 4, 5, 6],
    contraindicatedTypes: [],
    description: 'المعيار الذهبي والآمن للبشرة الداكنة (Types IV-VI). يتجاوز ميلانين البشرة السطحية بأمان ويخترق حتى أعمق بصيلات الشعر.'
  }
};

export const HAIR_THICKNESS = {
  fine: {
    label: 'رفيعة / وبرية (Fine)',
    radiusMm: 0.025,
    melaninMassFactor: 0.35,
    thermalRelaxationTimeMs: 15 // Short TRT: cools quickly, requires higher peak power or shorter pulse
  },
  medium: {
    label: 'متوسطة (Medium)',
    radiusMm: 0.05,
    melaninMassFactor: 0.7,
    thermalRelaxationTimeMs: 40
  },
  coarse: {
    label: 'سميكة (Coarse / Terminal)',
    radiusMm: 0.085,
    melaninMassFactor: 1.2,
    thermalRelaxationTimeMs: 90 // Long TRT: retains heat longer
  }
};

export const HAIR_COLORS = {
  black: {
    label: 'أسود داكن (Dark Black)',
    colorHex: '#141110',
    melaninContent: 1.0,
    type: 'Eumelanin'
  },
  brown: {
    label: 'بني (Medium Brown)',
    colorHex: '#4a2c1b',
    melaninContent: 0.7,
    type: 'Eumelanin'
  },
  blonde: {
    label: 'أشقر / أحمر (Blonde/Red)',
    colorHex: '#bfa063',
    melaninContent: 0.25,
    type: 'Pheomelanin'
  },
  white: {
    label: 'أبيض / رمادي (White/Grey)',
    colorHex: '#e0e0e0',
    melaninContent: 0.02,
    type: 'None'
  }
};

/**
 * Calculates photothermolysis results based on current parameters.
 */
export function calculateLaserShot({
  fitzpatrickType,
  wavelength,
  hairThicknessKey,
  hairColorKey,
  fluence = 28, // J/cm²
  pulseDuration = 30, // ms
  coolingEnabled = true
}) {
  const skin = FITZPATRICK_DATA[fitzpatrickType];
  const laser = LASER_WAVELENGTHS[wavelength];
  const thickness = HAIR_THICKNESS[hairThicknessKey];
  const hair = HAIR_COLORS[hairColorKey];

  // 1. Epidermal Melanin Competition:
  // How much light is trapped & absorbed by the epidermis before reaching the dermis
  const epidermalAbsorptionEfficiency = skin.epidermalMelanin * laser.melaninAbsorptionFactor;
  
  // Basal skin temperature (35°C)
  const baseTemp = 35.0;
  
  // Cooling factor reduces epidermal heating
  const coolingProtection = coolingEnabled ? 0.45 : 1.0;
  
  // Epidermal temperature rise ΔT
  // At 755nm on Type VI, epidermalAbsorptionEfficiency is ~ 0.98 * 1.0 = 0.98 (Massive!)
  // At 1064nm on Type VI, it is ~ 0.98 * 0.22 = 0.215 (Much lower!)
  const rawEpidermalDeltaT = (fluence * 1.4) * epidermalAbsorptionEfficiency * coolingProtection;
  const epidermalTemp = Math.min(115, baseTemp + rawEpidermalDeltaT);

  // 2. Light reaching the hair bulb at depth ~3.5mm:
  // Transmittance T = exp(- depth / penetrationDepth)
  const bulbDepthMm = 3.5;
  const tissueTransmission = Math.exp(-bulbDepthMm / laser.penetrationDepthMm);
  
  // Remaining fluence reaching the bulb after epidermal loss & tissue scattering:
  const fluenceAtBulb = fluence * (1.0 - Math.min(0.85, epidermalAbsorptionEfficiency * 0.75)) * tissueTransmission;

  // 3. Hair Bulb heating:
  // Bulb absorbs proportional to hair melanin content and laser absorption
  const hairAbsorptionCoeff = hair.melaninContent * thickness.melaninMassFactor * laser.melaninAbsorptionFactor;
  
  // Thermal relaxation mismatch: if pulse duration is too long relative to TRT, heat diffuses away
  const pulseEfficiency = pulseDuration > thickness.thermalRelaxationTimeMs * 1.5 ? 0.8 : 1.0;
  
  const bulbDeltaT = (fluenceAtBulb * 2.8) * hairAbsorptionCoeff * pulseEfficiency;
  const bulbTemp = Math.min(135, baseTemp + bulbDeltaT);

  // 4. Clinical Outcomes:
  // Destruction threshold for hair follicle stem cells (thermal coagulation): ~ 68°C to 72°C
  const follicleDestroyed = bulbTemp >= 70.0;
  const efficacyPercent = Math.min(100, Math.round((bulbTemp - baseTemp) / (72 - baseTemp) * 100));

  // 5. Safety Assessment & Burn Hazard:
  // Epidermal damage threshold:
  // > 55°C = Erythema / Mild hyperpigmentation risk
  // > 65°C = Blistering / Superficial 2nd-degree burn
  // > 75°C = Severe full-thickness epidermal burn / Permanent scarring / Hypopigmentation
  let safetyStatus = 'SAFE'; // SAFE, CAUTION, HIGH_RISK, CRITICAL_BURN
  let warningMessage = '';
  let arabicStatus = 'آمن وسليم (Safe)';

  if (epidermalTemp >= 70.0) {
    safetyStatus = 'CRITICAL_BURN';
    arabicStatus = 'خطر حرق سطحي كارثي (Severe Burn Hazard)';
    warningMessage = `تحذير سريري حاد! طول الموجة ${laser.wavelength}nm يتنافس بشدة مع صبغة الميلانين العالية في بشرة (${skin.name}). امتصت الطبقة القرنية معظم الطاقة مما رفع حرارة السطح إلى ${epidermalTemp.toFixed(1)}°C مسبباً فقاعات وحروقاً بالغة! يجب الانتقال فوراً إلى ليزر Nd:YAG 1064nm لحماية البشرة.`;
  } else if (epidermalTemp >= 55.0) {
    safetyStatus = 'HIGH_RISK';
    arabicStatus = 'خطر تصبغات وحروق طفيفة (High Risk)';
    warningMessage = `حذر سريري: حرارة البشرة السطحية ارتفعت إلى ${epidermalTemp.toFixed(1)}°C. هناك خطر حقيقي لحدوث تصبغات ما بعد الالتهاب (PIH). قم بتفعيل التبريد الفائق أو تقليل الجول (Fluence) أو استخدام 1064nm.`;
  } else if (epidermalTemp >= 48.0) {
    safetyStatus = 'CAUTION';
    arabicStatus = 'مقبول مع مراقبة التبريد (Caution)';
    warningMessage = `احمرار سطحي مؤقت متوقع. تأكد من ثبات نظام التبريد قبل إطلاق النبضات المتتالية.`;
  } else {
    safetyStatus = 'SAFE';
    arabicStatus = 'آمن تماماً وفعال سريرياً (Safe)';
    if (follicleDestroyed) {
      warningMessage = `معايير مثالية! تم تدمير بصيلة الشعر بالكامل بالتحلل الضوئي الحراري الانتقائي دون أي ضرر أو خطر على سطح البشرة.`;
    } else {
      if (hair.melaninContent < 0.1) {
        warningMessage = `الليزر آمن على البشرة، لكنه غير مجدٍ سريرياً لأن الشعرة خالية من الميلانين (بيضاء/رمادية)، فلا يوجد صبغ مستهدف لامتصاص الضوء.`;
      } else {
        warningMessage = `الليزر آمن على البشرة، لكن طاقة النبضة الحالية غير كافية لرفع حرارة البصيلة إلى عتبة التخثر (70°C). ارفع الجول (Fluence).`;
      }
    }
  }

  return {
    skin,
    laser,
    thickness,
    hair,
    fluence,
    pulseDuration,
    coolingEnabled,
    epidermalTemp: Number(epidermalTemp.toFixed(1)),
    bulbTemp: Number(bulbTemp.toFixed(1)),
    follicleDestroyed,
    efficacyPercent: Math.max(0, efficacyPercent),
    safetyStatus,
    arabicStatus,
    warningMessage,
    isBurn: safetyStatus === 'CRITICAL_BURN'
  };
}
