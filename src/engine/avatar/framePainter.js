// 100% Custom-Engine Decorative Profile Frame Painter
// Renders rippling wavy borders, rainbow neon glows for Perwira Tinggi / Developers / Co-Owners,
// and evolutive complexity driven by Rank, Billet hierarchy, Certificate count, and Brevet count.

export function buildDecorativeFrameDefs(gid) {
  return `
    <linearGradient id="${gid}_rainbow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF007A"/>
      <stop offset="18%" stop-color="#7928CA"/>
      <stop offset="36%" stop-color="#0070F3"/>
      <stop offset="54%" stop-color="#00DFD8"/>
      <stop offset="72%" stop-color="#22C55E"/>
      <stop offset="88%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#FF007A"/>
    </linearGradient>
    <linearGradient id="${gid}_gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="45%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="${gid}_purna" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="50%" stop-color="#E2E8F0"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>
    <filter id="${gid}_neon_glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00DFD8" flood-opacity="0.6"/>
    </filter>
  `;
}

// 16-point sinusoidal wavy path wrapping around center (48,48)
function generateWavyCirclePath(baseRadius, amplitude, points = 16) {
  let d = '';
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const r = baseRadius + (i % 2 === 0 ? amplitude : -amplitude);
    const x = 48 + r * Math.cos(angle);
    const y = 48 + r * Math.sin(angle);
    if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    else {
      const prevAngle = ((i - 0.5) * 2 * Math.PI) / points;
      const ctrlR = baseRadius + (i % 2 === 0 ? amplitude * 0.4 : -amplitude * 0.4);
      const cx = 48 + ctrlR * Math.cos(prevAngle);
      const cy = 48 + ctrlR * Math.sin(prevAngle);
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  d += ' Z';
  return d;
}

export function buildDecorativeFrameSvg(identity, gid) {
  const {
    frameTier,
    hasBillet,
    billetColor,
    billetOrder = 0,
    certCount = 0,
    brevetCount = 0,
    isRainbowNeon = false,
  } = identity;

  // 1. Rainbow Neon Outer Glow Layer
  let rainbowNeonHtml = '';
  if (isRainbowNeon) {
    const wavyNeon = generateWavyCirclePath(46.2, 1.4, 16);
    rainbowNeonHtml = `
      <path d="${wavyNeon}" fill="none" stroke="url(#${gid}_rainbow)" stroke-width="3.4" filter="url(#${gid}_neon_glow)" opacity="0.95"/>
      <circle cx="48" cy="48" r="44.2" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.85" stroke-dasharray="3 3"/>
      <!-- Neon Sparkles at 45-degree angles -->
      <polygon points="17,17 19,14 21,17 19,20" fill="#FFFFFF"/>
      <polygon points="79,17 81,14 83,17 81,20" fill="#FFFFFF"/>
      <polygon points="17,79 19,76 21,79 19,82" fill="#FFFFFF"/>
      <polygon points="79,79 81,76 83,79 81,82" fill="#FFFFFF"/>
    `;
  }

  // 2. Base Wavy & Layered Rank Frame
  let baseFrameHtml = '';
  switch (frameTier) {
    case 'PURNAWIRAWAN': {
      // Ceremonial Platinum-Gold Laurel Wreath Frame with Sunburst Crest
      const wavyPurna = generateWavyCirclePath(45.5, 1.2, 16);
      baseFrameHtml = `
        <path d="${wavyPurna}" fill="none" stroke="url(#${gid}_purna)" stroke-width="4.2"/>
        <path d="${wavyPurna}" fill="none" stroke="url(#${gid}_gold)" stroke-width="2.2"/>
        <circle cx="48" cy="48" r="41.2" fill="none" stroke="#FEF08A" stroke-width="1.1" stroke-dasharray="4 2"/>
        <!-- Top Sunburst of Honor -->
        <polygon points="48,1.5 50.5,5.5 55,5.5 52,9 54,13 49.5,11.5 48,15.5 46.5,11.5 42,13 44,9 41,5.5 45.5,5.5" fill="url(#${gid}_gold)" stroke="#78350F" stroke-width="0.7"/>
        <circle cx="48" cy="8" r="2" fill="#DC2626"/>
        <!-- Bottom Dignified Sash Banner -->
        <rect x="36" y="87" width="24" height="6" rx="2" fill="#1E293B" stroke="url(#${gid}_gold)" stroke-width="1"/>
        <text x="48" y="91.5" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#FEF08A" font-family="sans-serif">PURNA</text>
      `;
      break;
    }

    case 'TARUNA': {
      baseFrameHtml = '';
      break;
    }

    case 'BHAYANGKARA': {
      const wavyBhay = generateWavyCirclePath(45.4, 0.9, 14);
      baseFrameHtml = `
        <circle cx="48" cy="48" r="45.2" fill="none" stroke="#38BDF8" stroke-width="2" opacity="0.88"/>
        <path d="${wavyBhay}" fill="none" stroke="#38BDF8" stroke-width="2.4" opacity="0.9"/>
        <circle cx="48" cy="48" r="42" fill="none" stroke="#BAE6FD" stroke-width="1" opacity="0.65"/>
        <line x1="2.5" y1="48" x2="7.5" y2="48" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="88.5" y1="48" x2="93.5" y2="48" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/>
      `;
      break;
    }

    case 'BINTARA': {
      const wavyBintara = generateWavyCirclePath(45.2, 1.2, 16);
      baseFrameHtml = `
        <circle cx="48" cy="48" r="45" fill="none" stroke="#22C55E" stroke-width="2.8"/>
        <path d="${wavyBintara}" fill="none" stroke="#22C55E" stroke-width="3"/>
        <circle cx="48" cy="48" r="42" fill="none" stroke="#A3E635" stroke-width="1.2" opacity="0.75"/>
        <path d="M43 5.5 L48 2.2 L53 5.5" fill="none" stroke="#A3E635" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M43 90.5 L48 93.8 L53 90.5" fill="none" stroke="#A3E635" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      `;
      break;
    }

    case 'PERWIRA_MUDA': {
      const wavyPama = generateWavyCirclePath(45.2, 1.4, 16);
      baseFrameHtml = `
        <circle cx="48" cy="48" r="44.8" fill="none" stroke="url(#${gid}_gold)" stroke-width="3.2"/>
        <path d="${wavyPama}" fill="none" stroke="url(#${gid}_gold)" stroke-width="3.5"/>
        <circle cx="48" cy="48" r="41.4" fill="none" stroke="rgba(254,240,138,0.55)" stroke-width="1.2"/>
        <path d="M15 15 A45 45 0 0 1 25 8.5 M81 15 A45 45 0 0 0 71 8.5 M15 81 A45 45 0 0 0 25 87.5 M81 81 A45 45 0 0 1 71 87.5" fill="none" stroke="#FEF08A" stroke-width="2.2" stroke-linecap="round"/>
        <polygon points="48,1.2 52,5.2 48,9.2 44,5.2" fill="#FACC15" stroke="#090D16" stroke-width="1"/>
      `;
      break;
    }

    case 'PERWIRA': {
      const wavyPamen = generateWavyCirclePath(45.2, 1.5, 16);
      baseFrameHtml = `
        <circle cx="48" cy="48" r="45" fill="none" stroke="#1D4ED8" stroke-width="4.5"/>
        <circle cx="48" cy="48" r="45" fill="none" stroke="url(#${gid}_gold)" stroke-width="2.4"/>
        <path d="${wavyPamen}" fill="none" stroke="#1D4ED8" stroke-width="4.6"/>
        <path d="${wavyPamen}" fill="none" stroke="url(#${gid}_gold)" stroke-width="2.8"/>
        <circle cx="48" cy="48" r="41.2" fill="none" stroke="#F59E0B" stroke-width="1.2"/>
        <path d="M6 56 C4 46 5 35 11 26 C9 36 9 46 11 56 Z" fill="#FACC15" opacity="0.9"/>
        <path d="M90 56 C92 46 91 35 85 26 C87 36 87 46 85 56 Z" fill="#FACC15" opacity="0.9"/>
        <path d="M43 2.8 H53 L50 9.5 L48 11.2 L46 9.5 Z" fill="#FACC15" stroke="#090D16" stroke-width="1"/>
      `;
      break;
    }

    case 'PERWIRA_TINGGI':
    default: {
      const wavyPati = generateWavyCirclePath(45.2, 1.6, 16);
      baseFrameHtml = `
        <circle cx="48" cy="48" r="45" fill="none" stroke="#78350F" stroke-width="5.2"/>
        <circle cx="48" cy="48" r="45" fill="none" stroke="url(#${gid}_gold)" stroke-width="3"/>
        <path d="${wavyPati}" fill="none" stroke="#78350F" stroke-width="5.4"/>
        <path d="${wavyPati}" fill="none" stroke="url(#${gid}_gold)" stroke-width="3.4"/>
        <circle cx="48" cy="48" r="41" fill="none" stroke="#FEF08A" stroke-width="1.2" stroke-dasharray="4 2"/>
        <path d="M7 66 C2 52 3 34 12 20 C9 34 9 50 13 64 Z" fill="url(#${gid}_gold)"/>
        <path d="M89 66 C94 52 93 34 84 20 C87 34 87 50 83 64 Z" fill="url(#${gid}_gold)"/>
        <circle cx="6.5" cy="48" r="2.4" fill="#FEF08A"/>
        <circle cx="89.5" cy="48" r="2.4" fill="#FEF08A"/>
        <path d="M39 7.8 L42.5 1.8 L48 5.2 L53.5 1.8 L57 7.8 L54 11 H42 Z" fill="url(#${gid}_gold)" stroke="#451A03" stroke-width="1"/>
        <circle cx="48" cy="7.2" r="1.6" fill="#DC2626"/>
      `;
      break;
    }
  }

  // 3. Evolutive Billet / Jabatan Accent (Evolves independently based on billetOrder!)
  let billetAccentHtml = '';
  if (hasBillet && billetColor) {
    if (billetOrder >= 68) {
      // High Billet (WAKAPOLRI, KADIV, KALEMDIKLAT): Large Intricate Command Crest
      billetAccentHtml = `
        <g transform="translate(0, 0)">
          <!-- Laurel arc under crest -->
          <path d="M38 90 Q48 97 58 90" fill="none" stroke="url(#${gid}_gold)" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Command Shield & Diamond Gem -->
          <polygon points="48,82 55,87 53,95 48,97 43,95 41,87" fill="#090D16" stroke="url(#${gid}_gold)" stroke-width="1.4"/>
          <polygon points="48,84 53,88 48,94 43,88" fill="${billetColor}"/>
          <circle cx="48" cy="88" r="1.8" fill="#FFFFFF"/>
        </g>
      `;
    } else if (billetOrder >= 48) {
      // Mid Billet (KANIT PROPAM, KANIT PATROLI, KANIT DIKLAT): Detailed Shield Gem with Crossed Anchors
      billetAccentHtml = `
        <polygon points="48,84 54,88.5 51,95 48,96 45,95 42,88.5" fill="#090D16" stroke="${billetColor}" stroke-width="1.2"/>
        <polygon points="48,85.5 52.5,89 48,93.5 43.5,89" fill="${billetColor}"/>
        <circle cx="48" cy="89" r="1.3" fill="#FFFFFF"/>
      `;
    } else {
      // Basic Billet: Clean Command Diamond
      billetAccentHtml = `
        <polygon points="48,86 52.5,90.5 48,95 43.5,90.5" fill="${billetColor}" stroke="#090D16" stroke-width="1.2"/>
      `;
    }
  }

  // 4. Certificates & Brevets Evolutive Wings & Stars
  let certBrevetHtml = '';
  if (certCount >= 2) {
    // 4 Corner Gold Starlet Studs for accredited officers
    certBrevetHtml += `
      <circle cx="16" cy="16" r="1.8" fill="#FACC15" stroke="#78350F" stroke-width="0.6"/>
      <circle cx="80" cy="16" r="1.8" fill="#FACC15" stroke="#78350F" stroke-width="0.6"/>
      <circle cx="16" cy="80" r="1.8" fill="#FACC15" stroke="#78350F" stroke-width="0.6"/>
      <circle cx="80" cy="80" r="1.8" fill="#FACC15" stroke="#78350F" stroke-width="0.6"/>
    `;
  }
  if (certCount >= 4) {
    // Upper Laurel Leaf Points
    certBrevetHtml += `
      <path d="M26 9 Q23 5 28 4 Q30 7 26 9 Z" fill="#FACC15"/>
      <path d="M70 9 Q73 5 68 4 Q66 7 70 9 Z" fill="#FACC15"/>
    `;
  }

  if (brevetCount >= 2) {
    // Lateral Winglets at 9 and 3 o'clock
    certBrevetHtml += `
      <path d="M3 45 L0.5 48 L3 51 L4.5 48 Z" fill="#38BDF8" stroke="#0F172A" stroke-width="0.5"/>
      <path d="M93 45 L95.5 48 L93 51 L91.5 48 Z" fill="#38BDF8" stroke="#0F172A" stroke-width="0.5"/>
    `;
  }
  if (brevetCount >= 4) {
    // Dual Wing Flares
    certBrevetHtml += `
      <path d="M4 42 L0 44 L4 46 Z" fill="#818CF8"/>
      <path d="M4 50 L0 52 L4 54 Z" fill="#818CF8"/>
      <path d="M92 42 L96 44 L92 46 Z" fill="#818CF8"/>
      <path d="M92 50 L96 52 L92 54 Z" fill="#818CF8"/>
    `;
  }

  return `
    ${rainbowNeonHtml}
    ${baseFrameHtml}
    ${certBrevetHtml}
    ${billetAccentHtml}
  `;
}
