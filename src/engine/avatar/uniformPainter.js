// 100% Custom-Engine Rank Uniform & Insignia Painter
// Generates ultra-precise, distinct procedural uniforms across Tamtama, Bintara, Pama, Pamen, Pati, and Purnawirawan.

export function buildDynamicUniformSvg(identity, isOwner, hairOutfitColor) {
  const { uniformTier, pipCount, divisionColor, divisionCallsign, hasBillet, billetColor, awardItems } = identity;
  const divAccent = divisionColor || '#38BDF8';

  let tunicFill = hairOutfitColor || '#1E293B';
  let collarFill = 'rgba(255,255,255,0.12)';
  let tieHtml = '';
  let collarTabs = '';
  let cordHtml = '';
  let chestBadge = '';
  let sashHtml = '';

  if (uniformTier === 'PURNAWIRAWAN') {
    // PURNAWIRAWAN: Dignified Ceremonial Ivory-Slate Tunic + Gold-Crimson Diagonal Sash + Honor Oak Leaves
    tunicFill = '#1E222D';
    collarFill = '#F8FAFC';
    tieHtml = `<path d="M45.2 75 L50.8 75 L50 96 L46 96 Z" fill="#991B1B"/><rect x="45.5" y="83" width="5" height="1.8" fill="#FDE047"/>`;
    collarTabs = `
      <path d="M33 70 L42 78 L38 80 L31 72 Z" fill="#FACC15"/>
      <path d="M63 70 L54 78 L58 80 L65 72 Z" fill="#FACC15"/>
    `;
    // Ceremonial Sash across chest from right shoulder (x=75) to left hip (x=15)
    sashHtml = `
      <path d="M72 73 L77 75 L22 96 L16 96 Z" fill="#D97706" opacity="0.9"/>
      <path d="M73.5 73.5 L75.5 74.5 L20 96 L18 96 Z" fill="#FEF08A"/>
    `;
    chestBadge = `
      <circle cx="62" cy="83" r="3.8" fill="#FDE047" stroke="#92400E" stroke-width="0.8"/>
      <polygon points="62,80 63,82.5 65.5,82.7 63.5,84.5 64,87 62,85.5 60,87 60.5,84.5 58.5,82.7 61,82.5" fill="#B45309"/>
    `;
  } else if (uniformTier === 'TARUNA') {
    // TARUNA: Academy slate-gray tunic, clean inner collar, cadet epaulet bar
    tunicFill = '#334155';
    collarFill = '#64748B';
    collarTabs = `<rect x="40" y="71" width="16" height="3" rx="1" fill="#94A3B8" opacity="0.75"/>`;
    chestBadge = `<rect x="58" y="81" width="8" height="3.5" rx="0.8" fill="#0F172A" stroke="#94A3B8" stroke-width="0.6"/>`;
  } else if (uniformTier === 'BHAYANGKARA') {
    // BHAYANGKARA (Bharada): Field tactical navy with crisp sky collar piping
    tunicFill = '#1E293B';
    collarFill = '#38BDF8';
    collarTabs = `<line x1="38" y1="72" x2="42" y2="76" stroke="#38BDF8" stroke-width="1.3"/><line x1="58" y1="72" x2="54" y2="76" stroke="#38BDF8" stroke-width="1.3"/>`;
    chestBadge = `<circle cx="62" cy="83" r="2.8" fill="#64748B" stroke="#BAE6FD" stroke-width="0.8"/>`;
  } else if (uniformTier === 'BINTARA') {
    // BINTARA: Police Patrol Navy with crisp silver collar & dark navy tie + silver police star
    tunicFill = '#172554';
    collarFill = '#E2E8F0';
    tieHtml = `<path d="M46 76 L50 76 L49.5 95 L46.5 95 Z" fill="#0F172A"/>`;
    collarTabs = `<path d="M37 72 L42 77 M59 72 L54 77" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>`;
    chestBadge = `<polygon points="62,79 63.1,81.6 66,81.8 63.8,83.5 64.5,86.2 62,84.7 59.5,86.2 60.2,83.5 58,81.8 60.9,81.6" fill="#E2E8F0" stroke="#475569" stroke-width="0.5"/>`;
  } else if (uniformTier === 'PERWIRA_MUDA') {
    // PERWIRA MUDA (Pama): Mabes Dark Navy + white dress shirt + gold tie clip + gold starlet
    tunicFill = '#0F172A';
    collarFill = '#F8FAFC';
    tieHtml = `<path d="M45.8 75 L50.2 75 L49.5 95 L46.5 95 Z" fill="#1E293B"/><rect x="46" y="83" width="4" height="1.4" fill="#FACC15"/>`;
    collarTabs = `<line x1="36" y1="71" x2="41" y2="75" stroke="#FACC15" stroke-width="1.5"/><line x1="60" y1="71" x2="55" y2="75" stroke="#FACC15" stroke-width="1.5"/>`;
    chestBadge = `<polygon points="62,79 63.2,81.6 66,81.8 63.8,83.6 64.5,86.3 62,84.8 59.5,86.3 60.2,83.6 58,81.8 60.8,81.6" fill="#FACC15" stroke="#A16207" stroke-width="0.5"/>`;
  } else if (uniformTier === 'PERWIRA') {
    // PERWIRA (Pamen): Deep Officer Midnight Navy, gold-piped lapels, formal tie + gold melati emblem
    tunicFill = '#0B132B';
    collarFill = '#FFFFFF';
    tieHtml = `<path d="M45.5 75 L50.5 75 L49.8 96 L46.2 96 Z" fill="#111827"/><rect x="45.8" y="83" width="4.4" height="1.6" fill="#F59E0B"/>`;
    collarTabs = `<path d="M35 70 L42 78 M61 70 L54 78" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>`;
    chestBadge = `<circle cx="62" cy="83" r="3.4" fill="#F59E0B" stroke="#FEF08A" stroke-width="0.9"/><circle cx="62" cy="83" r="1.3" fill="#0B132B"/>`;
  } else {
    // PERWIRA_TINGGI / Kapolda Owner: Ceremonial PDU Obsidian Navy + gold collar leaves + crimson/gold sash
    tunicFill = '#090D16';
    collarFill = '#FFFFFF';
    tieHtml = `<path d="M45.2 75 L50.8 75 L50 96 L46 96 Z" fill="#7F1D1D"/><rect x="45.5" y="83" width="5" height="1.8" fill="#FDE047"/>`;
    collarTabs = `
      <path d="M34 70 L42 78 L39 79.5 L33 72.5 Z" fill="#FACC15"/>
      <path d="M62 70 L54 78 L57 79.5 L63 72.5 Z" fill="#FACC15"/>
    `;
    sashHtml = `
      <path d="M73 73 L78 75 L22 96 L16 96 Z" fill="#DC2626" opacity="0.88"/>
      <path d="M74.5 73.5 L76.5 74.5 L20 96 L18 96 Z" fill="#FDE047"/>
    `;
    chestBadge = `<polygon points="62,78 63.5,81.4 67.2,81.7 64.4,84.1 65.3,87.7 62,85.7 58.7,87.7 59.6,84.1 56.8,81.7 60.5,81.4" fill="#FDE047" stroke="#B45309" stroke-width="0.6"/>`;
  }

  // Division subtle pocket piping & tactical armlet
  const divPiping = divisionColor
    ? `<line x1="25" y1="89" x2="39" y2="89" stroke="${divAccent}" stroke-width="1.6" opacity="0.9"/>${
        divisionCallsign === 'PRP' || divisionCallsign === 'PRV'
          ? `<rect x="13" y="81" width="6.5" height="7" rx="1.4" fill="#059669" stroke="#6EE7B7" stroke-width="0.7"/>`
          : ''
      }`
    : '';

  // Command aiguillette cords
  if (hasBillet || isOwner) {
    const cCol = billetColor || '#FACC15';
    cordHtml = `<path d="M68 74 Q70 84 61 88" fill="none" stroke="${cCol}" stroke-width="1.7" stroke-dasharray="2.5 1.2" opacity="0.92"/>`;
  }

  // Shoulder Epaulettes & Rank Insignia
  let leftIns = '';
  let rightIns = '';
  let boardBg = '#1E293B';
  let boardStroke = 'rgba(255,255,255,0.22)';

  if (uniformTier === 'PURNAWIRAWAN') {
    // Purnawirawan: Gold Laurel Wreath honor epaulet
    boardBg = '#27272A';
    boardStroke = '#FDE047';
    leftIns = `<circle cx="23.2" cy="76" r="2.2" fill="none" stroke="#FDE047" stroke-width="0.9"/><circle cx="23.2" cy="76" r="1.1" fill="#FEF08A"/>`;
    rightIns = `<circle cx="72.8" cy="76" r="2.2" fill="none" stroke="#FDE047" stroke-width="0.9"/><circle cx="72.8" cy="76" r="1.1" fill="#FEF08A"/>`;
  } else if (uniformTier === 'TARUNA') {
    boardBg = '#475569';
    boardStroke = '#94A3B8';
    leftIns = `<line x1="22.5" y1="74" x2="22.5" y2="78" stroke="#FACC15" stroke-width="2"/>`;
    rightIns = `<line x1="73.5" y1="74" x2="73.5" y2="78" stroke="#FACC15" stroke-width="2"/>`;
  } else if (uniformTier === 'BHAYANGKARA') {
    boardBg = '#0F172A';
    boardStroke = '#38BDF8';
    for (let i = 0; i < Math.min(2, pipCount); i++) {
      const ox = i * 3.5;
      leftIns += `<path d="M${20 + ox} 77.5 L${22.2 + ox} 74.5 L${24.4 + ox} 77.5" fill="none" stroke="#38BDF8" stroke-width="1.4" stroke-linecap="round"/>`;
      rightIns += `<path d="M${75.6 - ox} 77.5 L${73.4 - ox} 74.5 L${71.2 - ox} 77.5" fill="none" stroke="#38BDF8" stroke-width="1.4" stroke-linecap="round"/>`;
    }
  } else if (uniformTier === 'BINTARA') {
    boardBg = '#0F172A';
    boardStroke = '#22C55E';
    const chevCol = pipCount >= 3 ? '#A3E635' : '#4ADE80';
    for (let i = 0; i < Math.min(3, pipCount); i++) {
      const ox = i * 3;
      leftIns += `<path d="M${18.5 + ox} 77.6 L${20.5 + ox} 74.4 L${22.5 + ox} 77.6" fill="none" stroke="${chevCol}" stroke-width="1.4" stroke-linecap="round"/>`;
      rightIns += `<path d="M${77.5 - ox} 77.6 L${75.5 - ox} 74.4 L${73.5 - ox} 77.6" fill="none" stroke="${chevCol}" stroke-width="1.4" stroke-linecap="round"/>`;
    }
  } else if (uniformTier === 'PERWIRA_MUDA') {
    boardBg = '#1E293B';
    boardStroke = '#FACC15';
    for (let i = 0; i < Math.min(3, pipCount); i++) {
      const cxL = pipCount === 1 ? 23.2 : 19.5 + i * 3.8;
      const cxR = pipCount === 1 ? 72.8 : 76.5 - i * 3.8;
      leftIns += `<rect x="${cxL - 1.2}" y="74.2" width="2.4" height="3.6" rx="0.5" fill="#FACC15"/>`;
      rightIns += `<rect x="${cxR - 1.2}" y="74.2" width="2.4" height="3.6" rx="0.5" fill="#FACC15"/>`;
    }
  } else if (uniformTier === 'PERWIRA') {
    boardBg = '#111827';
    boardStroke = '#F59E0B';
    for (let i = 0; i < Math.min(3, pipCount); i++) {
      const cxL = 19.3 + i * 3.8;
      const cxR = 76.7 - i * 3.8;
      // 5-petal Melati flower pip
      leftIns += `<polygon points="${cxL},74.1 ${cxL + 1.5},76 ${cxL},77.9 ${cxL - 1.5},76" fill="#FACC15"/>`;
      rightIns += `<polygon points="${cxR},74.1 ${cxR + 1.5},76 ${cxR},77.9 ${cxR - 1.5},76" fill="#FACC15"/>`;
    }
  } else {
    // PERWIRA_TINGGI: 1 to 4 gold stars (Brigjen..Jenderal)
    boardBg = '#78350F';
    boardStroke = '#FDE047';
    const stars = Math.min(4, Math.max(1, pipCount));
    for (let i = 0; i < stars; i++) {
      const cxL = stars === 1 ? 23.2 : 18.2 + (i * 10.0) / Math.max(1, stars - 1);
      const cxR = stars === 1 ? 72.8 : 77.8 - (i * 10.0) / Math.max(1, stars - 1);
      leftIns += `<polygon points="${cxL},74.2 ${cxL + 0.8},75.6 ${cxL + 1.8},75.8 ${cxL + 0.9},76.6 ${cxL + 1.2},77.8 ${cxL},77.1 ${cxL - 1.2},77.8 ${cxL - 0.9},76.6 ${cxL - 1.8},75.8 ${cxL - 0.8},75.6" fill="#FEF08A"/>`;
      rightIns += `<polygon points="${cxR},74.2 ${cxR + 0.8},75.6 ${cxR + 1.8},75.8 ${cxR + 0.9},76.6 ${cxR + 1.2},77.8 ${cxR},77.1 ${cxR - 1.2},77.8 ${cxR - 0.9},76.6 ${cxR - 1.8},75.8 ${cxR - 0.8},75.6" fill="#FEF08A"/>`;
    }
  }

  const shoulderBoards = `
    <rect x="16" y="73" width="14.5" height="6" rx="1.6" fill="${boardBg}" stroke="${boardStroke}" stroke-width="1"/>
    <rect x="65.5" y="73" width="14.5" height="6" rx="1.6" fill="${boardBg}" stroke="${boardStroke}" stroke-width="1"/>
    ${leftIns}
    ${rightIns}
  `;

  // Miniature Ribbon Rack on Left Chest
  let medalRackHtml = '';
  if (awardItems && awardItems.length > 0) {
    const bars = awardItems
      .map((aw, idx) => {
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const bx = 25 + col * 5.2;
        const by = 80.5 + row * 3.6;
        const isMedal = aw.category === 'Medali';
        const isCert = aw.category === 'Sertifikat';
        return `
          <rect x="${bx}" y="${by}" width="4.4" height="2.7" rx="0.4" fill="${aw.color}"/>
          ${
            isMedal
              ? `<rect x="${bx + 1.6}" y="${by}" width="1.2" height="2.7" fill="#FEF08A"/>`
              : isCert
                ? `<circle cx="${bx + 2.2}" cy="${by + 1.35}" r="0.7" fill="#FFFFFF" opacity="0.9"/>`
                : `<line x1="${bx}" y1="${by + 1.35}" x2="${bx + 4.4}" y2="${by + 1.35}" stroke="rgba(255,255,255,0.6)" stroke-width="0.6"/>`
          }
        `;
      })
      .join('');
    const rackRows = Math.ceil(awardItems.length / 3);
    const rackCols = Math.min(3, awardItems.length);
    medalRackHtml = `
      <rect x="24" y="79.5" width="${rackCols * 5.2 + 1.2}" height="${rackRows * 3.6 + 1.2}" rx="1" fill="#090D16" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>
      ${bars}
    `;
  }

  return `
    <path d="M10 96 C12 73 29 69 48 69 C67 69 84 73 86 96 Z" fill="${tunicFill}"/>
    <path d="M38 69 L48 81 L58 69 Z" fill="${collarFill}" opacity="0.92"/>
    ${tieHtml}
    ${collarTabs}
    ${sashHtml}
    ${divPiping}
    ${cordHtml}
    ${chestBadge}
    ${medalRackHtml}
    ${shoulderBoards}
  `;
}
