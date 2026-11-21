// 100% Custom-Engine Procedural Portrait, Dynamic Rank Uniform, Mini Medal Rack & Decorative Profile Frame Generator
// Zero external dependencies, deterministic traits, ultra-lightweight FNV-1a memoized inline SVGs for 60Hz mobile performance.

import { AWARDS_CATALOG } from './constants.js';
import { buildDynamicUniformSvg } from './avatar/uniformPainter.js';
import { buildDecorativeFrameSvg, buildDecorativeFrameDefs } from './avatar/framePainter.js';

const SKIN_TONES = [
  { base: '#F5D0B5', shadow: '#D9A787' },
  { base: '#E8B896', shadow: '#C9906B' },
  { base: '#D49B72', shadow: '#B0754D' },
  { base: '#B87A52', shadow: '#915834' },
  { base: '#8D5534', shadow: '#693B20' },
  { base: '#F9DFCC', shadow: '#DEB89C' },
];

const HAIR_COLORS = [
  '#1A1B20', // Jet Black
  '#2D221C', // Dark Espresso
  '#4A3327', // Chestnut Brown
  '#6E4A32', // Warm Brown
  '#2E3440', // Charcoal Slate
  '#8C5A32', // Auburn
  '#3B4A6B', // Midnight Blue tint
  '#7C2D12', // Mahogany
];

const BG_PALETTES = [
  ['#1E293B', '#334155'],
  ['#172554', '#1E3A8A'],
  ['#064E3B', '#065F46'],
  ['#3B0764', '#581C87'],
  ['#451A03', '#78350F'],
  ['#312E81', '#4338CA'],
  ['#134E4A', '#115E59'],
  ['#4C0519', '#881337'],
  ['#27272A', '#3F3F46'],
  ['#1E1B4B', '#3730A3'],
];

const OUTFIT_COLORS = [
  '#1E293B', // Police Dark Navy
  '#334155', // Tactical Slate
  '#0F172A', // Mabes Black
  '#1F2937', // Patrol Charcoal
  '#1E3A5F', // Satlantas Blue
  '#3F3F46', // Hoodie Gray
  '#14532D', // Brimob Olive
  '#312E81', // Tech Dev Indigo
];

export const PROFILE_FRAME_META = {
  PURNAWIRAWAN: { tier: 'PURNAWIRAWAN', label: 'Purnawirawan (Kehormatan Platinum)', accent: '#E2E8F0' },
  TARUNA: { tier: 'TARUNA', label: 'Taruna (Non-Border)', accent: '#94A3B8' },
  BHAYANGKARA: { tier: 'BHAYANGKARA', label: 'Bhayangkara (Border Ringan)', accent: '#38BDF8' },
  BINTARA: { tier: 'BINTARA', label: 'Bintara (Border Standar)', accent: '#22C55E' },
  PERWIRA_MUDA: { tier: 'PERWIRA_MUDA', label: 'Perwira Muda (Emas Ringan)', accent: '#FACC15' },
  PERWIRA: { tier: 'PERWIRA', label: 'Perwira (Aksen Perwira)', accent: '#F59E0B' },
  PERWIRA_TINGGI: { tier: 'PERWIRA_TINGGI', label: 'Perwira Tinggi (Dekoratif Pati)', accent: '#FDE047' },
};

const AWARD_COLOR_LOOKUP = new Map(AWARDS_CATALOG.map((a) => [a.id, { color: a.color, category: a.category }]));

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildTraitTuple(seedIndex, hintStr = '') {
  const h1 = hashString(`${hintStr}#${seedIndex}#A`);
  const h2 = hashString(`${hintStr}#${seedIndex}#B`);
  const h3 = hashString(`${hintStr}#${seedIndex}#C`);

  return {
    skinIdx: h1 % SKIN_TONES.length,
    hairStyle: (h1 >>> 4) % 8,
    hairColorIdx: (h1 >>> 9) % HAIR_COLORS.length,
    bgIdx: h2 % BG_PALETTES.length,
    outfitIdx: (h2 >>> 5) % OUTFIT_COLORS.length,
    accessory: (h2 >>> 10) % 6,
    expression: h3 % 5,
    eyeColorIdx: (h3 >>> 4) % 4,
    collarType: (h3 >>> 8) % 3,
  };
}

function traitSignature(t) {
  return `${t.skinIdx}-${t.hairStyle}-${t.hairColorIdx}-${t.bgIdx}-${t.outfitIdx}-${t.accessory}-${t.expression}`;
}

/**
 * Resolves the exact decorative profile frame tier, dynamic uniform tier, and billet identity
 * from rank name/order, command billet, division, awards, and owner flag.
 */
export function resolveProfileIdentity({
  isOwner = false,
  rank = null,
  division = null,
  billet = null,
  awards = null,
  isRetired = false,
  subRole = null,
} = {}) {
  const rankName = String(rank?.name || '').toLowerCase();
  const rankOrder = Number(rank?.order) || 1;
  const billetOrder = Number(billet?.hierarchyOrder) || 0;

  let tier = 'TARUNA';
  let pipCount = 1;

  const isExplicitPerwiraTinggi =
    isOwner ||
    rank?.isOwner ||
    /\b(kapolda|jenderal|komjen|irjen|brigjen|kombes|akbp|perwira\s*tinggi|pati)\b/i.test(rankName);
  const isExplicitPerwira = /\b(akp|kompol|perwira(?!\s*muda))\b/i.test(rankName);
  const isExplicitPama = /\b(ipda|iptu|perwira\s*muda|pama)\b/i.test(rankName);
  const isExplicitBintara = /\b(briptu|brigadir|aipda|aiptu|bintara)\b/i.test(rankName);
  const isExplicitBhayangkara = /\b(bripda|bhayangkara|bharada|bharatu|bharaka)\b/i.test(rankName);
  const isExplicitTaruna = /\b(taruna|kadet|siswa)\b/i.test(rankName);

  if (isExplicitPerwiraTinggi) {
    tier = 'PERWIRA_TINGGI';
    pipCount =
      isOwner || /\b(kapolda|jenderal)\b/i.test(rankName)
        ? 4
        : /\b(komjen|kombes)\b/i.test(rankName)
          ? 3
          : /\b(irjen|akbp)\b/i.test(rankName)
            ? 2
            : 1;
  } else if (isExplicitPerwira) {
    tier = 'PERWIRA';
    pipCount = /\bkompol\b/i.test(rankName) ? 3 : 2;
  } else if (isExplicitPama) {
    tier = 'PERWIRA_MUDA';
    pipCount = /\biptu\b/i.test(rankName) ? 2 : 1;
  } else if (isExplicitBintara) {
    tier = 'BINTARA';
    pipCount = /\b(brigadir|aipda|aiptu)\b/i.test(rankName) ? 3 : 2;
  } else if (isExplicitBhayangkara) {
    tier = 'BHAYANGKARA';
    pipCount = /\b(bharaka|bharatu)\b/i.test(rankName) ? 2 : 1;
  } else if (isExplicitTaruna) {
    tier = 'TARUNA';
    pipCount = 1;
  } else if (rankOrder >= 8) {
    tier = 'PERWIRA_TINGGI';
    pipCount = Math.min(4, Math.max(1, rankOrder - 7));
  } else if (rankOrder >= 6) {
    tier = 'PERWIRA';
    pipCount = rankOrder >= 7 ? 3 : 2;
  } else if (rankOrder === 5) {
    tier = 'PERWIRA_MUDA';
    pipCount = 1;
  } else if (rankOrder >= 3) {
    tier = 'BINTARA';
    pipCount = rankOrder >= 4 ? 3 : 2;
  } else if (rankOrder === 2) {
    tier = 'BHAYANGKARA';
    pipCount = 1;
  } else {
    tier = 'TARUNA';
    pipCount = 1;
  }

  // Strategic Billet Identity boost on frame trim (e.g., WAKAPOLRI >= 80 elevates command frame ornament without hiding rank)
  const hasBillet = Boolean(billet);
  let frameTier = tier;
  if (billetOrder >= 82 && frameTier !== 'PERWIRA_TINGGI') {
    frameTier = 'PERWIRA_TINGGI';
  } else if (billetOrder >= 66 && (frameTier === 'TARUNA' || frameTier === 'BHAYANGKARA' || frameTier === 'BINTARA')) {
    frameTier = 'PERWIRA';
  }

  const rawAwards = Array.isArray(awards) ? awards : [];
  let certCount = 0;
  let brevetCount = 0;
  for (const id of rawAwards) {
    const info = AWARD_COLOR_LOOKUP.get(id);
    if (info?.category === 'Sertifikat' || id.startsWith('srt-')) certCount++;
    else if (info?.category === 'Brevet' || id.startsWith('brv-')) brevetCount++;
  }

  const isRainbowNeon = Boolean(
    isOwner ||
    tier === 'PERWIRA_TINGGI' ||
    frameTier === 'PERWIRA_TINGGI' ||
    /co-owner|developer/i.test(String(subRole || ''))
  );

  const finalUniformTier = isRetired ? 'PURNAWIRAWAN' : tier;
  const finalFrameTier = isRetired ? 'PURNAWIRAWAN' : frameTier;

  const awardItems = rawAwards
    .slice(0, 6)
    .map((id) => {
      const info = AWARD_COLOR_LOOKUP.get(id);
      return info || { color: '#38BDF8', category: 'Brevet' };
    });

  return {
    uniformTier: finalUniformTier,
    frameTier: finalFrameTier,
    frameMeta: PROFILE_FRAME_META[finalFrameTier] || PROFILE_FRAME_META.TARUNA,
    pipCount,
    divisionColor: division?.color || null,
    divisionCallsign: division?.callsign || null,
    hasBillet,
    billetColor: billet?.color || (isOwner ? '#FACC15' : null),
    billetOrder,
    awardItems,
    certCount,
    brevetCount,
    isRainbowNeon,
  };
}

class AvatarEngine {
  constructor() {
    this.assignedByMember = new Map();
    this.usedSignatures = new Set();
    this.svgCache = new Map();
  }

  getTraitsForMember(memberId, seedHint = '') {
    if (this.assignedByMember.has(memberId)) {
      return this.assignedByMember.get(memberId);
    }

    let attempt = 0;
    let traits = buildTraitTuple(attempt, `${memberId}:${seedHint}`);
    while (this.usedSignatures.has(traitSignature(traits)) && attempt < 600) {
      attempt += 1;
      traits = buildTraitTuple(attempt, `${memberId}:${seedHint}:${attempt}`);
    }

    const sig = traitSignature(traits);
    this.usedSignatures.add(sig);
    this.assignedByMember.set(memberId, traits);
    return traits;
  }

  _buildDynamicUniformSvg(identity, isOwner, hairOutfitColor) {
    return buildDynamicUniformSvg(identity, isOwner, hairOutfitColor);
  }

  _buildDecorativeFrameSvg(identity, gid) {
    return buildDecorativeFrameSvg(identity, gid);
  }

  /**
   * Produces a fast memoized SVG string with dynamic uniform, rank insignia, mini medal rack & decorative frame.
   */
  renderSvg(memberId, seedHint = '', opts = {}) {
    const isOwner = Boolean(opts.isOwner);
    const member = opts.member || null;
    const state = opts.state || null;
    const isRetired = Boolean(opts.isRetired || member?.isRetired);
    const subRole = opts.subRole || member?.subRole || (isOwner ? 'Co-Owner' : null);

    const rank =
      opts.rank ||
      (isOwner && state?.ranks?.find((r) => r.isOwner)) ||
      (member && state?.ranks?.find((r) => r.id === member.rankId)) ||
      null;
    const division =
      opts.division ||
      (member && member.divisionId && state?.divisions?.find((d) => d.id === member.divisionId)) ||
      null;
    const billet =
      opts.billet ||
      (member && member.billetId && state?.billets?.find((b) => b.id === member.billetId)) ||
      null;
    const awards =
      opts.awards ||
      (isOwner ? state?.ownerProfile?.awards : member?.awards) ||
      [];

    const identity = resolveProfileIdentity({ isOwner, rank, division, billet, awards, isRetired, subRole });
    const awardsKey = awards.slice(0, 6).join(',');
    const cacheKey = `${memberId}|${seedHint}|${isOwner ? '1' : '0'}|${identity.uniformTier}:${identity.pipCount}|${identity.frameTier}|${identity.isRainbowNeon ? 'rb' : 'std'}|${identity.divisionCallsign || ''}|${identity.billetOrder}|${awardsKey}|${opts.sizeClass || 'std'}`;
    if (this.svgCache.has(cacheKey)) {
      return this.svgCache.get(cacheKey);
    }

    const t = this.getTraitsForMember(memberId, seedHint);
    const skin = SKIN_TONES[t.skinIdx];
    const hair = HAIR_COLORS[t.hairColorIdx];
    const bg = isOwner ? ['#451A03', '#B45309'] : BG_PALETTES[t.bgIdx];
    const outfit = isOwner ? '#090D16' : OUTFIT_COLORS[t.outfitIdx];
    const eyeColors = ['#1E1B18', '#3B2F2F', '#1E3A5F', '#2F4F4F'];
    const eyeCol = eyeColors[t.eyeColorIdx];

    const hashId = hashString(cacheKey).toString(36);
    const gradId = `avbg_${hashId}`;
    const clipId = `avclip_${hashId}`;

    // Back hair / hijab
    let backHair = '';
    if (t.accessory === 5) {
      backHair = `<path d="M18 46 C18 22 78 22 78 46 L82 88 H14 Z" fill="${outfit}" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>`;
    } else if (t.hairStyle === 5 || t.hairStyle === 6) {
      backHair = `<path d="M22 44 C20 22 76 22 74 44 L76 74 H20 Z" fill="${hair}"/>`;
    }

    // Front hair variants
    let frontHair = '';
    if (t.accessory !== 5) {
      switch (t.hairStyle) {
        case 0:
          frontHair = `<path d="M25 44 C25 22 71 22 71 44 C66 32 54 28 38 32 C31 34 27 38 25 44 Z" fill="${hair}"/>`;
          break;
        case 1:
          frontHair = `<path d="M27 40 C28 24 68 24 69 40 C62 30 34 30 27 40 Z" fill="${hair}"/>`;
          break;
        case 2:
          frontHair = `<path d="M25 44 C24 21 72 21 71 44 L64 36 L55 40 L46 34 L36 40 L29 36 Z" fill="${hair}"/>`;
          break;
        case 3:
          frontHair = `<path d="M26 42 C24 19 72 17 70 42 C63 29 44 26 26 42 Z" fill="${hair}"/>`;
          break;
        case 4:
          frontHair = `<path d="M24 44 C22 25 35 19 48 21 C61 19 74 25 72 44 C64 33 32 33 24 44 Z" fill="${hair}"/>`;
          break;
        case 5:
          frontHair = `<path d="M24 46 C24 21 72 21 72 46 C64 31 32 31 24 46 Z" fill="${hair}"/>`;
          break;
        case 6:
          frontHair = `<path d="M24 46 C24 20 72 20 72 46 C62 30 50 28 48 35 C46 28 34 30 24 46 Z" fill="${hair}"/>`;
          break;
        default:
          frontHair = `<path d="M28 38 C30 25 66 25 68 38 C60 31 36 31 28 38 Z" fill="${hair}" opacity="0.88"/>`;
          break;
      }
    }

    // Headwear aligned with rank tier & division beret!
    let headwear = '';
    const isTacticalOrGuard =
      identity.divisionCallsign === 'BRM' ||
      identity.divisionCallsign === 'D88' ||
      identity.divisionCallsign === 'GGN' ||
      identity.divisionCallsign === 'PRP' ||
      identity.divisionCallsign === 'PRV';
    const highRankCap =
      isOwner ||
      identity.uniformTier === 'PERWIRA_TINGGI' ||
      identity.uniformTier === 'PERWIRA' ||
      t.accessory === 3;
    if (highRankCap) {
      const capColor = isOwner || identity.uniformTier === 'PERWIRA_TINGGI' ? '#090D16' : '#1E293B';
      const badgeColor =
        isOwner || identity.uniformTier === 'PERWIRA_TINGGI' || identity.uniformTier === 'PERWIRA'
          ? '#FACC15'
          : identity.uniformTier === 'PERWIRA_MUDA'
            ? '#FDE047'
            : '#94A3B8';
      const visorTrim =
        isOwner || identity.uniformTier === 'PERWIRA_TINGGI'
          ? `<path d="M25 31 Q48 35 71 31" fill="none" stroke="#FACC15" stroke-width="1.3"/>`
          : '';
      headwear = `
        <path d="M24 31 C28 18 68 18 72 31 Z" fill="${capColor}"/>
        <path d="M22 31 Q48 36 74 31 L71 28 Q48 32 25 28 Z" fill="#090D16"/>
        ${visorTrim}
        <circle cx="48" cy="24" r="3" fill="${badgeColor}"/>
      `;
    } else if ((t.accessory === 4 || isTacticalOrGuard) && t.accessory !== 5) {
      const beretColor = identity.divisionColor || '#312E81';
      headwear = `<path d="M24 32 C26 17 65 15 73 28 C64 25 36 27 24 32 Z" fill="${beretColor}"/><circle cx="62" cy="24" r="2.2" fill="#FACC15"/>`;
    }

    let faceGear = '';
    if (t.accessory === 1) {
      faceGear = `
        <rect x="31" y="42" width="13" height="8.5" rx="2.5" fill="rgba(255,255,255,0.08)" stroke="#CBD5E1" stroke-width="1.6"/>
        <rect x="52" y="42" width="13" height="8.5" rx="2.5" fill="rgba(255,255,255,0.08)" stroke="#CBD5E1" stroke-width="1.6"/>
        <line x1="44" y1="46" x2="52" y2="46" stroke="#CBD5E1" stroke-width="1.6"/>
      `;
    } else if (t.accessory === 2) {
      faceGear = `
        <path d="M25 46 C25 27 71 27 71 46" fill="none" stroke="#475569" stroke-width="2.2"/>
        <rect x="21" y="42" width="5" height="11" rx="2" fill="#334155"/>
        <path d="M24 52 Q32 60 41 60" fill="none" stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round"/>
      `;
    }

    let mouth = `<path d="M41 59 Q48 63 55 59" fill="none" stroke="#6E3B2B" stroke-width="2" stroke-linecap="round"/>`;
    let stubble = '';
    if (t.expression === 2) {
      stubble = `<path d="M31 53 C32 65 64 65 65 53 C61 62 35 62 31 53 Z" fill="rgba(20,20,25,0.16)"/>`;
    } else if (t.expression === 3) {
      mouth = `<path d="M40 58 Q48 65 56 58 Z" fill="#FFFFFF" stroke="#6E3B2B" stroke-width="1.2"/>`;
    } else if (t.expression === 4) {
      mouth = `<line x1="42" y1="60" x2="54" y2="60" stroke="#6E3B2B" stroke-width="2" stroke-linecap="round"/>`;
    }

    const uniformSvg = this._buildDynamicUniformSvg(identity, isOwner, outfit);
    const frameSvg = this._buildDecorativeFrameSvg(identity, gradId);

    const svg = `<svg viewBox="0 0 96 96" class="${opts.sizeClass || 'w-full h-full'}" aria-hidden="true">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg[0]}"/>
          <stop offset="100%" stop-color="${bg[1]}"/>
        </linearGradient>
        <linearGradient id="${gradId}_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FEF08A"/>
          <stop offset="50%" stop-color="#FACC15"/>
          <stop offset="100%" stop-color="#B45309"/>
        </linearGradient>
        <clipPath id="${clipId}">
          <circle cx="48" cy="48" r="43.5"/>
        </clipPath>
        ${buildDecorativeFrameDefs(gradId)}
      </defs>
      <g clip-path="url(#${clipId})">
        <rect width="96" height="96" fill="url(#${gradId})"/>
        <circle cx="48" cy="40" r="34" fill="rgba(255,255,255,0.05)"/>
        ${backHair}
        ${uniformSvg}
        <rect x="41" y="59" width="14" height="14" rx="5" fill="${skin.shadow}"/>
        <circle cx="27" cy="48" r="4.5" fill="${skin.shadow}"/>
        <circle cx="69" cy="48" r="4.5" fill="${skin.shadow}"/>
        <path d="M28 43 C28 27 68 27 68 43 C68 59 59 67 48 67 C37 67 28 59 28 43 Z" fill="${skin.base}"/>
        ${stubble}
        <path d="M34 41 Q38 39 42 41" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
        <path d="M54 41 Q58 39 62 41" fill="none" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="38" cy="46" r="2.6" fill="${eyeCol}"/>
        <circle cx="58" cy="46" r="2.6" fill="${eyeCol}"/>
        <circle cx="39" cy="45" r="0.8" fill="#FFFFFF"/>
        <circle cx="59" cy="45" r="0.8" fill="#FFFFFF"/>
        <path d="M48 47 L46.5 53 L49.5 53.5" fill="none" stroke="${skin.shadow}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${mouth}
        ${frontHair}
        ${faceGear}
        ${headwear}
      </g>
      ${frameSvg}
    </svg>`;

    if (this.svgCache.size > 800) {
      const firstKey = this.svgCache.keys().next().value;
      this.svgCache.delete(firstKey);
    }
    this.svgCache.set(cacheKey, svg);
    return svg;
  }

  getBannerColor(memberId) {
    const t = this.getTraitsForMember(memberId);
    return BG_PALETTES[t.bgIdx][1];
  }
}

export const avatarEngine = new AvatarEngine();
