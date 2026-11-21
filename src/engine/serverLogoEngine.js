// 100% Custom Procedural Emblem & Crest SVG Generator for Main Server & Sub-Servers
// Tailor-made per server type, division, function, and purpose — zero external assets, FNV-1a memoized.

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hexToRgb(hex) {
  const clean = String(hex || '#38BDF8').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 56, g: 189, b: 248 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function darkenHex(hex, factor = 0.42) {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.max(8, Math.round(r * factor));
  const dg = Math.max(10, Math.round(g * factor));
  const db = Math.max(14, Math.round(b * factor));
  return `rgb(${dr},${dg},${db})`;
}

function lightenHex(hex, factor = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `rgb(${lr},${lg},${lb})`;
}

/**
 * Resolves specialization profile from sub-server category, name, shortCode, and linked division.
 */
export function resolveServerProfile(sub = {}) {
  const hay = `${sub.id || ''} ${sub.name || ''} ${sub.shortCode || ''} ${sub.category || ''} ${sub.description || ''}`.toLowerCase();

  if (hay.includes('densus') || hay.includes('d88') || hay.includes('kontra-teror')) {
    return 'DENSUS';
  }
  if (hay.includes('narkoba') || hay.includes('nrk')) {
    return 'NARKOBA';
  }
  if (hay.includes('brimob') || hay.includes('brm') || hay.includes('gegana') || hay.includes('ggn') || hay.includes('taktis') || hay.includes('teror')) {
    return 'BRIMOB';
  }
  if (hay.includes('inafis') || hay.includes('inf') || hay.includes('forensik') || hay.includes('labfor')) {
    return 'INAFIS';
  }
  if (hay.includes('reskrim') || hay.includes('rsk') || hay.includes('kriminal') || hay.includes('penyidik')) {
    return 'RESKRIM';
  }
  if (hay.includes('provos') || hay.includes('prv') || hay.includes('paminal') || hay.includes('propam') || hay.includes('prp') || hay.includes('etik') || hay.includes('disiplin')) {
    return 'PROPAM';
  }
  if (hay.includes('pamobvit') || hay.includes('obv') || hay.includes('objek vital')) {
    return 'PAMOBVIT';
  }
  if (hay.includes('k-9') || hay.includes('k9') || hay.includes('satwa')) {
    return 'K9';
  }
  if (hay.includes('dokkes') || hay.includes('dkm') || hay.includes('medis') || hay.includes('kesehatan')) {
    return 'DOKKES';
  }
  if (hay.includes('binmas') || hay.includes('bnm') || hay.includes('warga') || hay.includes('kamtibmas')) {
    return 'BINMAS';
  }
  if (hay.includes('intel') || hay.includes('int') || hay.includes('sandi')) {
    return 'INTELKAM';
  }
  if (hay.includes('polair') || hay.includes('air') || hay.includes('dermaga') || hay.includes('pelabuhan')) {
    return 'POLAIRUD';
  }
  if (hay.includes('tik') || hay.includes('siber') || hay.includes('cctv')) {
    return 'TIK';
  }
  if (hay.includes('lantas') || hay.includes('lnt') || hay.includes('lalin') || hay.includes('tilang')) {
    return 'SATLANTAS';
  }
  if (hay.includes('sabhara') || hay.includes('sbr') || hay.includes('patroli')) {
    return 'SABHARA';
  }
  if (sub.category === 'PERWIRA' || hay.includes('perwira') || hay.includes('prw') || hay.includes('pimpinan')) {
    return 'PERWIRA';
  }
  if (sub.category === 'AKADEMI' || hay.includes('akademi') || hay.includes('akpol') || hay.includes('akp') || hay.includes('lemdiklat') || hay.includes('pusdik') || hay.includes('ptw')) {
    return 'AKADEMI';
  }
  if (sub.category === 'EVENT' || hay.includes('event') || hay.includes('evt') || hay.includes('humas') || hay.includes('hms') || hay.includes('panitia')) {
    return 'EVENT';
  }
  return 'CUSTOM';
}

class ServerLogoEngine {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Main Server Ceremonial Crest (Kepolisian Republik Izumiya)
   */
  renderMainLogo(sizeClass = 'w-10 h-10') {
    const key = `main|${sizeClass}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const gid = `mcrest_${fnv1a(key).toString(36)}`;
    const svg = `<svg viewBox="0 0 96 96" class="${sizeClass}" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FEF08A"/>
          <stop offset="50%" stop-color="#FACC15"/>
          <stop offset="100%" stop-color="#B45309"/>
        </linearGradient>
        <linearGradient id="${gid}_navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1E293B"/>
          <stop offset="100%" stop-color="#090D16"/>
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill="#0B0F19" stroke="rgba(250,204,21,0.22)" stroke-width="1.5"/>
      <path d="M16 58 C12 44 16 30 25 22 C21 34 21 47 25 58 Z" fill="url(#${gid}_gold)" opacity="0.72"/>
      <path d="M80 58 C84 44 80 30 71 22 C75 34 75 47 71 58 Z" fill="url(#${gid}_gold)" opacity="0.72"/>
      <path d="M48 8 L78 20 V48 C78 68 64 81 48 88 C32 81 18 68 18 48 V20 Z" fill="url(#${gid}_navy)" stroke="url(#${gid}_gold)" stroke-width="3.2"/>
      <path d="M48 15 L71 25 V47 C71 63 60 74 48 80 C36 74 25 63 25 47 V25 Z" fill="none" stroke="rgba(250,204,21,0.38)" stroke-width="1.2"/>
      <path d="M35 61 L61 33 M61 61 L35 33" stroke="rgba(250,204,21,0.32)" stroke-width="2.6" stroke-linecap="round"/>
      <polygon points="48,22 52,35 65,31 56,42 68,48 56,54 65,65 52,61 48,74 44,61 31,65 40,54 28,48 40,42 31,31 44,35" fill="rgba(250,204,21,0.16)"/>
      <polygon points="48,25 52.8,37.8 66.5,38 55.6,46.2 59.6,59.4 48,51.6 36.4,59.4 40.4,46.2 29.5,38 43.2,37.8" fill="url(#${gid}_gold)" stroke="#78350F" stroke-width="1"/>
      <circle cx="48" cy="44" r="4.5" fill="#0F172A" stroke="#FEF08A" stroke-width="1.2"/>
      <path d="M36 67 L48 73 L60 67" fill="none" stroke="url(#${gid}_gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M39 72 L48 77 L57 72" fill="none" stroke="url(#${gid}_gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    </svg>`;

    this._setCache(key, svg);
    return svg;
  }

  _setCache(key, svg) {
    if (this.cache.size > 250) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, svg);
  }

  /**
   * Tailored Sub-Server Emblem Generator by Division, Category, and Function.
   */
  renderSubServerLogo(sub = {}, opts = {}) {
    const sizeClass = opts.sizeClass || 'w-11 h-11';
    const compact = Boolean(opts.compact);
    const color = sub.color || '#38BDF8';
    const code = escapeXml((sub.shortCode || sub.name?.slice(0, 3) || 'SUB').toUpperCase().slice(0, 4));
    const profile = resolveServerProfile(sub);
    const seedKey = `${sub.id || ''}|${sub.name || ''}|${code}|${profile}|${color}|${sizeClass}|${compact ? 1 : 0}`;

    if (this.cache.has(seedKey)) return this.cache.get(seedKey);

    const hash = fnv1a(seedKey);
    const gid = `sub_${hash.toString(36)}`;
    const darkBg = darkenHex(color, 0.28);
    const midBg = darkenHex(color, 0.56);
    const lightTint = lightenHex(color, 0.55);

    let frameSvg = '';
    let motifSvg = '';
    let microPattern = '';

    switch (profile) {
      case 'DENSUS':
        microPattern = `<path d="M16 48 H80 M48 14 V78" stroke="#EF4444" stroke-width="1" stroke-dasharray="3 3" opacity="0.22"/>`;
        frameSvg = `
          <polygon points="48,7 84,22 78,66 48,89 18,66 12,22" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <polygon points="48,14 77,26 72,62 48,81 24,62 19,26" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <path d="M22 39 L40 33 L38 44 L24 46 Z M74 39 L56 33 L58 44 L72 46 Z" fill="${lightTint}"/>
          <polygon points="48,20 55,38 48,60 41,38" fill="#0F172A" stroke="#FEF08A" stroke-width="1.8"/>
          <circle cx="48" cy="39" r="3" fill="#EF4444"/>
        `;
        break;

      case 'NARKOBA':
        microPattern = `<circle cx="48" cy="44" r="24" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.2"/>`;
        frameSvg = `
          <polygon points="28,8 68,8 88,28 88,68 68,88 28,88 8,68 8,28" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <polygon points="48,22 66,34 60,55 36,55 30,34" fill="#0F172A" stroke="${lightTint}" stroke-width="2"/>
          <path d="M36 48 L48 29 L60 48" fill="none" stroke="#FACC15" stroke-width="2.4" stroke-linecap="round"/>
          <line x1="34" y1="32" x2="62" y2="54" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round"/>
        `;
        break;

      case 'INAFIS':
        microPattern = `<circle cx="48" cy="42" r="19" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.22"/><circle cx="48" cy="42" r="13" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.22"/>`;
        frameSvg = `
          <polygon points="48,7 84,26 84,66 48,89 12,66 12,26" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <path d="M36 48 C36 30 60 30 60 48 M40 50 C40 35 56 35 56 50 M44 52 C44 40 52 40 52 52" fill="none" stroke="${lightTint}" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="48" cy="45" r="2.6" fill="#FACC15"/>
        `;
        break;

      case 'DOKKES':
        microPattern = `<circle cx="48" cy="45" r="26" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.22"/>`;
        frameSvg = `
          <circle cx="48" cy="48" r="40" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <rect x="43" y="24" width="10" height="32" rx="2" fill="#F8FAFC"/>
          <rect x="32" y="35" width="32" height="10" rx="2" fill="#F8FAFC"/>
          <rect x="45.5" y="27" width="5" height="26" rx="1" fill="${color}"/>
          <rect x="35" y="37.5" width="26" height="5" rx="1" fill="${color}"/>
        `;
        break;

      case 'BINMAS':
        microPattern = `<path d="M22 44 H74" stroke="${lightTint}" stroke-width="1" opacity="0.16"/>`;
        frameSvg = `
          <path d="M48 8 L81 19 V48 C81 67 66 80 48 88 C30 80 15 67 15 48 V19 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <circle cx="38" cy="36" r="5" fill="#FACC15"/>
          <circle cx="58" cy="36" r="5" fill="#F8FAFC"/>
          <path d="M28 54 C30 43 46 43 48 54 C50 43 66 43 68 54" fill="none" stroke="${lightTint}" stroke-width="2.6" stroke-linecap="round"/>
        `;
        break;

      case 'PAMOBVIT':
        microPattern = `<rect x="24" y="24" width="48" height="40" rx="6" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.18"/>`;
        frameSvg = `
          <path d="M20 14 H76 L83 34 L74 72 L48 88 L22 72 L13 34 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <polygon points="48,22 65,36 59,56 37,56 31,36" fill="#0F172A" stroke="#FACC15" stroke-width="2"/>
          <circle cx="48" cy="40" r="6" fill="${lightTint}"/>
        `;
        break;

      case 'K9':
        microPattern = `<circle cx="48" cy="44" r="24" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.2"/>`;
        frameSvg = `
          <polygon points="48,8 83,24 83,64 48,88 13,64 13,24" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <ellipse cx="48" cy="49" rx="10" ry="8" fill="#FACC15"/>
          <circle cx="35" cy="37" r="4" fill="${lightTint}"/>
          <circle cx="43" cy="31" r="4" fill="${lightTint}"/>
          <circle cx="53" cy="31" r="4" fill="${lightTint}"/>
          <circle cx="61" cy="37" r="4" fill="${lightTint}"/>
        `;
        break;

      case 'TIK':
        microPattern = `<path d="M22 28 H36 L44 36 H52 L60 28 H74" fill="none" stroke="${lightTint}" stroke-width="1.2" opacity="0.28"/>`;
        frameSvg = `
          <rect x="12" y="12" width="72" height="72" rx="18" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
        `;
        motifSvg = `
          <rect x="30" y="26" width="36" height="26" rx="5" fill="#0F172A" stroke="${lightTint}" stroke-width="2"/>
          <circle cx="48" cy="39" r="5" fill="${color}"/>
          <circle cx="48" cy="39" r="10" fill="none" stroke="#FACC15" stroke-width="1.4" stroke-dasharray="3 2"/>
        `;
        break;

      case 'BRIMOB':
        microPattern = `<path d="M18 18 L78 78 M26 14 L82 70 M14 26 L70 82" stroke="${color}" stroke-width="1" opacity="0.14"/>`;
        frameSvg = `
          <polygon points="28,8 68,8 88,28 88,68 68,88 28,88 8,68 8,28" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <polygon points="31,14 65,14 82,31 82,65 65,82 31,82 14,65 14,31" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>
          <circle cx="31" cy="14" r="2" fill="${lightTint}"/><circle cx="65" cy="14" r="2" fill="${lightTint}"/>
        `;
        motifSvg = `
          <path d="M19 42 L38 38 L34 46 L21 48 Z M77 42 L58 38 L62 46 L75 48 Z" fill="${lightTint}" opacity="0.88"/>
          <path d="M23 50 L39 48 L36 54 L25 55 Z M73 50 L57 48 L60 54 L71 55 Z" fill="${color}" opacity="0.9"/>
          <polygon points="48,20 62,38 48,64 34,38" fill="#0F172A" stroke="${lightTint}" stroke-width="2"/>
          <polygon points="50,25 42,42 49,42 45,57 55,39 48,39" fill="#FACC15"/>
        `;
        break;

      case 'RESKRIM':
        microPattern = `<circle cx="48" cy="44" r="26" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="3 3" opacity="0.24"/>`;
        frameSvg = `
          <polygon points="48,7 84,26 84,66 48,89 12,66 12,26" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <polygon points="48,14 78,30 78,63 48,82 18,63 18,30" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <circle cx="46" cy="41" r="15" fill="#0F172A" stroke="${lightTint}" stroke-width="2.4"/>
          <circle cx="46" cy="41" r="8" fill="none" stroke="${color}" stroke-width="1.5"/>
          <path d="M46 22 V30 M46 52 V60 M27 41 H35 M57 41 H65" stroke="${lightTint}" stroke-width="2" stroke-linecap="round"/>
          <line x1="57" y1="52" x2="68" y2="63" stroke="#F8FAFC" stroke-width="4" stroke-linecap="round"/>
          <circle cx="46" cy="41" r="2.8" fill="#EF4444"/>
        `;
        break;

      case 'PROPAM':
        microPattern = `<path d="M48 14 V78 M20 44 H76" stroke="${color}" stroke-width="1" opacity="0.16"/>`;
        frameSvg = `
          <path d="M48 8 L82 20 V50 C82 70 66 82 48 89 C30 82 14 70 14 50 V20 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <path d="M48 15 L75 25 V49 C75 65 62 75 48 81 C34 75 21 65 21 49 V25 Z" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <line x1="48" y1="22" x2="48" y2="60" stroke="${lightTint}" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="29" y1="31" x2="67" y2="31" stroke="#F8FAFC" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M29 31 L23 44 H35 Z M67 31 L61 44 H73 Z" fill="rgba(255,255,255,0.14)" stroke="${lightTint}" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M34 52 Q48 43 62 52 Q48 61 34 52 Z" fill="#0F172A" stroke="${lightTint}" stroke-width="1.6"/>
          <circle cx="48" cy="52" r="3" fill="${color}"/>
        `;
        break;

      case 'INTELKAM':
        microPattern = `<path d="M24 26 L36 38 H60 L72 26 M26 60 L38 48 H58 L70 60" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.24"/>`;
        frameSvg = `
          <polygon points="48,7 84,22 72,72 48,89 24,72 12,22" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <polygon points="48,14 76,27 66,67 48,81 30,67 20,27" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <polygon points="48,22 68,46 48,62 28,46" fill="#0F172A" stroke="${lightTint}" stroke-width="2"/>
          <ellipse cx="48" cy="43" rx="13" ry="7.5" fill="none" stroke="#FACC15" stroke-width="1.8"/>
          <circle cx="48" cy="43" r="4.2" fill="${color}"/>
          <circle cx="49" cy="42" r="1.4" fill="#FFFFFF"/>
        `;
        break;

      case 'POLAIRUD':
        microPattern = `<circle cx="48" cy="46" r="31" fill="none" stroke="${lightTint}" stroke-width="1" stroke-dasharray="2 4" opacity="0.28"/>`;
        frameSvg = `
          <circle cx="48" cy="48" r="40" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <path d="M18 39 L40 42 L38 48 L22 45 Z M78 39 L56 42 L58 48 L74 45 Z" fill="${lightTint}" opacity="0.88"/>
          <circle cx="48" cy="25" r="3.5" fill="none" stroke="#FACC15" stroke-width="2"/>
          <line x1="48" y1="29" x2="48" y2="59" stroke="#F8FAFC" stroke-width="2.6" stroke-linecap="round"/>
          <line x1="39" y1="36" x2="57" y2="36" stroke="#F8FAFC" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M33 49 C35 61 61 61 63 49" fill="none" stroke="#FACC15" stroke-width="2.5" stroke-linecap="round"/>
        `;
        break;

      case 'SATLANTAS':
        microPattern = `<path d="M18 32 H78 M18 60 H78" stroke="${color}" stroke-width="1" opacity="0.16"/>`;
        frameSvg = `
          <path d="M22 14 H74 L84 32 L74 72 L48 88 L22 72 L12 32 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <path d="M26 20 H70 L77 34 L69 67 L48 80 L27 67 L19 34 Z" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <path d="M19 41 L36 41 L34 47 L22 47 Z M77 41 L60 41 L62 47 L74 47 Z" fill="${lightTint}"/>
          <circle cx="48" cy="43" r="14" fill="#0F172A" stroke="#F8FAFC" stroke-width="2.2"/>
          <path d="M40 53 L48 31 L56 53" fill="none" stroke="#FACC15" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="48" y1="35" x2="48" y2="54" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
        `;
        break;

      case 'SABHARA':
        microPattern = `<rect x="22" y="22" width="52" height="44" rx="8" fill="none" stroke="${color}" stroke-width="1" opacity="0.14"/>`;
        frameSvg = `
          <path d="M48 8 L81 19 V48 C81 67 66 80 48 88 C30 80 15 67 15 48 V19 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <path d="M48 15 L74 24 V47 C74 62 62 73 48 80 C34 73 22 62 22 47 V24 Z" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <polygon points="48,21 52,32 64,32 54,39 58,50 48,43 38,50 42,39 32,32 44,32" fill="${lightTint}"/>
          <path d="M33 53 L48 61 L63 53" fill="none" stroke="#F8FAFC" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M36 60 L48 67 L60 60" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        break;

      case 'PERWIRA':
        microPattern = `<path d="M22 64 C16 48 18 30 28 20 M74 64 C80 48 78 30 68 20" fill="none" stroke="#FACC15" stroke-width="2" stroke-dasharray="3 3" opacity="0.45"/>`;
        frameSvg = `
          <path d="M48 8 L80 18 L84 50 C80 70 65 82 48 89 C31 82 16 70 12 50 L16 18 Z" fill="url(#${gid}_bg)" stroke="#FACC15" stroke-width="3"/>
          <path d="M48 15 L73 23 L76 49 C73 65 61 75 48 81 C35 75 23 65 20 49 L23 23 Z" fill="none" stroke="rgba(250,204,21,0.35)" stroke-width="1.3"/>
        `;
        motifSvg = `
          <path d="M32 33 L39 24 L48 31 L57 24 L64 33 L61 39 H35 Z" fill="#FACC15"/>
          <circle cx="35" cy="50" r="4" fill="#FEF08A"/>
          <circle cx="48" cy="47" r="5" fill="#FACC15"/>
          <circle cx="61" cy="50" r="4" fill="#FEF08A"/>
          <path d="M34 61 H62" stroke="#FACC15" stroke-width="2.2" stroke-linecap="round"/>
        `;
        break;

      case 'AKADEMI':
        microPattern = `<path d="M24 22 H72 M24 70 H72" stroke="${lightTint}" stroke-width="1" opacity="0.16"/>`;
        frameSvg = `
          <path d="M20 14 H76 V48 C76 68 62 81 48 88 C34 81 20 68 20 48 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>
          <path d="M26 20 H70 V47 C70 63 59 74 48 80 C37 74 26 63 26 47 Z" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <path d="M48 19 C54 26 53 33 48 37 C43 33 42 26 48 19 Z" fill="#FACC15"/>
          <rect x="46" y="37" width="4" height="15" rx="1" fill="#F8FAFC"/>
          <path d="M29 52 Q39 48 48 54 Q57 48 67 52 V63 Q57 59 48 65 Q39 59 29 63 Z" fill="#0F172A" stroke="${lightTint}" stroke-width="1.8" stroke-linejoin="round"/>
        `;
        break;

      case 'EVENT':
        microPattern = `<circle cx="48" cy="48" r="24" fill="none" stroke="${lightTint}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.32"/>`;
        frameSvg = `
          <polygon points="48,6 60,18 78,16 80,34 91,48 80,62 78,80 60,78 48,90 36,78 18,80 16,62 5,48 16,34 18,16 36,18" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="2.8" stroke-linejoin="round"/>
          <circle cx="48" cy="48" r="29" fill="#0F172A" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>
        `;
        motifSvg = `
          <polygon points="48,24 53,36 66,37 56,45 59,58 48,51 37,58 40,45 30,37 43,36" fill="#FACC15"/>
          <circle cx="28" cy="30" r="2.2" fill="${lightTint}"/>
          <circle cx="68" cy="30" r="2.2" fill="${lightTint}"/>
          <circle cx="67" cy="60" r="2" fill="#F8FAFC"/>
        `;
        break;

      default: {
        const shapeMode = hash % 3;
        if (shapeMode === 0) {
          frameSvg = `<polygon points="48,8 84,26 84,66 48,88 12,66 12,26" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>`;
        } else if (shapeMode === 1) {
          frameSvg = `<rect x="12" y="12" width="72" height="72" rx="20" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>`;
        } else {
          frameSvg = `<path d="M48 8 L82 20 V48 C82 69 66 82 48 89 C30 82 14 69 14 48 V20 Z" fill="url(#${gid}_bg)" stroke="${color}" stroke-width="3"/>`;
        }
        microPattern = `<circle cx="48" cy="44" r="22" fill="none" stroke="${lightTint}" stroke-width="1" opacity="0.22"/>`;
        motifSvg = `
          <polygon points="48,22 64,42 48,60 32,42" fill="#0F172A" stroke="${lightTint}" stroke-width="2"/>
          <circle cx="48" cy="41" r="6" fill="${color}"/>
        `;
        break;
      }
    }

    const monogramPill = compact
      ? ''
      : `
        <rect x="24" y="64" width="48" height="17" rx="6" fill="#090D16" stroke="${color}" stroke-width="1.4"/>
        <text x="48" y="75.5" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace" font-weight="800" font-size="10.5" fill="#F8FAFC" letter-spacing="0.6">${code}</text>
      `;

    const svg = `<svg viewBox="0 0 96 96" class="${sizeClass}" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${midBg}"/>
          <stop offset="100%" stop-color="${darkBg}"/>
        </linearGradient>
      </defs>
      ${frameSvg}
      ${microPattern}
      ${motifSvg}
      ${monogramPill}
    </svg>`;

    this._setCache(seedKey, svg);
    return svg;
  }
}

export const serverLogoEngine = new ServerLogoEngine();
