import {
  AI_NAME_POOL,
  AWARDS_CATALOG,
  INITIAL_BILLETS,
  INITIAL_DIVISIONS,
  INITIAL_RANKS,
  ROAD_X,
  ROAD_Y,
  buildEmptyPermissions,
} from '../constants.js';
import { normalizeDutyProfile } from './propamSecurity.js';
import { ensureAkpolSubServer } from './akpolCohort.js';
import { ensurePerwiraSubServer } from './subServers.js';

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function createInitialState() {
  const ranks = INITIAL_RANKS.map((r) => ({
    ...r,
    permissions: r.isOwner ? { ...(r.permissions || {}) } : buildEmptyPermissions(r.permissions),
  }));
  const divisions = INITIAL_DIVISIONS.map((d) => ({
    ...d,
    headId: d.id === 'div-sabhara' ? 'ai-2' : d.id === 'div-lantas' ? 'ai-1' : null,
    viceHeadId: d.id === 'div-lantas' ? 'ai-3' : null,
    dailyIntakeQuota: 3,
    dailyIntakeCount: 0,
    lastQuotaDay: 0,
    proposalStatus: 'NONE',
    units: [],
    recruitmentOpen: false,
    lastInviteBroadcastSec: -9999,
    gateClearance: d.gateClearance !== false,
    dutyProfile: normalizeDutyProfile(d.dutyProfile, d),
    permissions: buildEmptyPermissions(d.permissions),
  }));
  const billets = INITIAL_BILLETS.map((b) => ({
    ...b,
    permissions: buildEmptyPermissions(b.permissions),
  }));

  const starterMembers = [
    createAiMember(AI_NAME_POOL[0], {
      id: 'ai-1',
      rankId: 'rank-briptu',
      divisionId: 'div-lantas',
      xp: 165,
      betahScore: 78,
      x: 470,
      y: 345,
      status: 'online-2d',
      bio: 'Anggota taktis Satlantas. Fokus penertiban Simpang Utama dan laporan radio 10-4.',
      awards: ['brv-pelopor', 'srt-diklat'],
      personalAuthority: { canOwnSubServer: true, canAffiliateServer: true },
      personality: { professionalism: 89, loyalty: 86, activityDrive: 84, ambition: 62, empathy: 74 },
    }),
    createAiMember(AI_NAME_POOL[1], {
      id: 'ai-2',
      rankId: 'rank-bripda',
      divisionId: 'div-sabhara',
      xp: 85,
      betahScore: 76,
      x: 185,
      y: 165,
      status: 'online-2d',
      bio: 'Personel Sabhara yang senang menyambut Taruna baru dan menjaga kekompakan OOC.',
      awards: ['srt-diklat'],
      personalAuthority: { canOwnSubServer: true, canAffiliateServer: false },
      personality: { professionalism: 76, loyalty: 88, activityDrive: 74, ambition: 48, empathy: 92 },
    }),
    createAiMember(AI_NAME_POOL[2], {
      id: 'ai-3',
      rankId: 'rank-bripda',
      divisionId: 'div-lantas',
      xp: 105,
      betahScore: 74,
      x: 755,
      y: 165,
      status: 'online-2d',
      bio: 'Piket malam aktif & pecinta kejar-kejaran balap liar di jalan raya Izumiya.',
      subRole: 'Helper',
      awards: ['srt-diklat'],
      personalAuthority: { canOwnSubServer: false, canAffiliateServer: false },
      personality: { professionalism: 72, loyalty: 69, activityDrive: 88, ambition: 84, empathy: 65 },
    }),
    createAiMember(AI_NAME_POOL[3], {
      id: 'ai-4',
      rankId: 'rank-taruna',
      divisionId: null,
      xp: 20,
      betahScore: 66,
      x: 215,
      y: 195,
      status: 'online-2d',
      needsWelcome: true,
      bio: 'Taruna baru di Kepolisian Republik Izumiya. Berharap struktur organisasi makin rapi!',
      personalAuthority: { canOwnSubServer: false, canAffiliateServer: false },
      personality: { professionalism: 41, loyalty: 44, activityDrive: 62, ambition: 86, empathy: 38 },
    }),
  ];

  const civilians = createInitialCivilians(7);

  const initialIncidents = [
    {
      id: 'inc-1',
      type: 'TILANG',
      label: 'Pelanggaran Marka & Kecepatan',
      x: 480,
      y: 355,
      rewardXp: 28,
      rewardRep: 6,
      color: '#F59E0B',
      progress: 0,
      duration: 3.5,
      assignedOfficerId: null,
      districtName: 'Simpang Utama',
    },
    {
      id: 'inc-2',
      type: 'KERIBUTAN',
      label: 'Keributan Area Pasar',
      x: 775,
      y: 155,
      rewardXp: 35,
      rewardRep: 8,
      color: '#EC4899',
      progress: 0,
      duration: 4.0,
      assignedOfficerId: null,
      districtName: 'Distrik Niaga & Pasar',
    },
  ];

  const messages = {
    'pengumuman-mabes': [
      {
        id: 'msg-init-1',
        authorId: 'owner',
        authorName: 'Kapolda Izumiya (Anda)',
        authorRole: 'Kapolda (Owner)',
        authorColor: '#D4A024',
        isOwner: true,
        text: 'Selamat datang di Markas Komando Kepolisian Republik Izumiya! Atur pangkat, divisi, brevet, serta wewenang WAKAPOLRI & Developer agar komunitas semakin hidup 24 jam.',
        timeLabel: '08:00',
        reactions: [{ emoji: '🫡', count: 3 }],
      },
    ],
    'akademi-lemdiklat': [
      {
        id: 'msg-init-akpol',
        authorId: 'system',
        authorName: 'Lemdiklat Akpol Izumiya',
        authorRole: 'Akademi',
        authorColor: '#0EA5E9',
        isSystem: true,
        text: 'Pendaftaran Akademi Kepolisian dibuka! Atur kuota, syarat seleksi, & target pangkat kelulusan di tab Struktur → Akademi.',
        timeLabel: '08:01',
        reactions: [],
      },
    ],
    'lobi-rekrutmen': [
      {
        id: 'msg-init-2',
        authorId: 'ai-4',
        authorName: 'Bagas Santoso',
        authorRole: 'Taruna',
        authorColor: '#94A3B8',
        isOwner: false,
        text: 'Izin melapor Komandan! Saya baru join sebagai Taruna. Siap ikut diklat Akademi dulu sebelum mendaftar ke #registrasi divisi.',
        timeLabel: '08:02',
        actionMemberId: 'ai-4',
        reactions: [],
      },
    ],
    'obrolan-ooc': [
      {
        id: 'msg-init-3',
        authorId: 'ai-2',
        authorName: 'Raka Wibowo',
        authorRole: 'Bripda · Sabhara',
        authorColor: '#38BDF8',
        isOwner: false,
        text: 'Pagi semua! Ketuk foto profil siapa saja di sini buat lihat bio, role berwarna, brevet, dan medali.',
        timeLabel: '08:03',
        reactions: [{ emoji: '🔥', count: 2 }],
      },
      {
        id: 'msg-init-4',
        authorId: 'ai-3',
        authorName: 'Nadia Kartika',
        authorRole: 'Bripda · Satlantas · Helper',
        authorColor: '#38BDF8',
        isOwner: false,
        text: 'Kalau ada yang dilantik jadi Developer & WAKAPOLRI dengan wewenang penuh, map 2D makin optimal dan rekrutmen jalan otomatis!',
        timeLabel: '08:04',
        reactions: [],
      },
    ],
    'laporan-patroli': [
      {
        id: 'msg-init-5',
        authorId: 'ai-1',
        authorName: 'Dimas Pratama',
        authorRole: 'Briptu · Satlantas',
        authorColor: '#22C55E',
        isOwner: false,
        text: '10-4 Komandan, unit Satlantas standby di Simpang Utama memantau arus pagi.',
        timeLabel: '08:05',
        reactions: [],
      },
    ],
    'ruang-komando': [
      {
        id: 'msg-init-6',
        authorId: 'system',
        authorName: 'Sistem Mabes',
        authorRole: 'Komando',
        authorColor: '#80848E',
        isSystem: true,
        text: 'Tip Komando: Tetapkan Kalemdiklat/Instruktur Diklat & atur izin Mendidik, Meluluskan, serta Menggugurkan Taruna di Akademi Kepolisian timur kota.',
        timeLabel: '08:05',
        reactions: [],
      },
    ],
  };

  const state = {
    serverName: 'Kepolisian Republik Izumiya',
    ownerName: 'Kapolda Izumiya',
    ownerProfile: {
      username: 'kapolda_izumiya',
      bio: 'Pendiri & Pimpinan Tertinggi Kepolisian Republik Izumiya. Merancang hierarki, menjaga keadilan, dan berpatroli langsung di lapangan.',
      subRole: 'Founder',
      awards: ['med-bhayangkara', 'srt-komando'],
    },
    simSeconds: 8 * 3600 + 6 * 60,
    speed: 1,
    muted: false,
    reputation: 120,
    directive: 'PATROLI_BEBAS',
    directiveTimer: 0,
    lastOwnerActionAt: 0,
    tech: {
      mapEfficiency: 100,
      systemHealth: 96,
      patchCounter: 1,
      lastPatchNote: 'Versi Awal Kota Izumiya 2D (Stabil)',
    },
    academy: {
      isOpen: true,
      quota: 4,
      minProfessionalism: 38,
      minActivityDrive: 45,
      minBetah: 50,
      targetRankId: 'rank-bripda',
      graduateBonusXp: 85,
      graduatesCount: 0,
      failedCount: 0,
      lastInviteBroadcastSec: -9999,
      lastRequestAt: -9999,
      curriculumFocus: 'Baris-Berbaris Serentak, Taktis & Etik',
    },
    bannedUsernames: [],
    ranks,
    divisions,
    billets,
    authorityDelegations: {},
    dms: [],
    divisionProposals: [],
    divisionRecruits: [],
    mabesSecurity: {
      gateOpen: true,
      gateUpdatedBy: 'KANIT PROPAM',
      lastAuditAt: 0,
    },
    members: starterMembers,
    subServers: [],
    player: {
      x: 180,
      y: 155,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 158,
      sirenOn: false,
      walkPhase: 0,
      handlingIncidentId: null,
      speechBubble: '',
      speechTimer: 0,
    },
    civilians,
    incidents: initialIncidents,
    messages,
    unreadByChannel: {
      'pengumuman-mabes': 0,
      'akademi-lemdiklat': 1,
      'lobi-rekrutmen': 1,
      'obrolan-ooc': 0,
      'laporan-patroli': 0,
      'ruang-komando': 0,
    },
    stats: {
      incidentsResolved: 0,
      totalJoins: starterMembers.length,
      totalLeaves: 0,
      promotionsGiven: 0,
    },
    cooldowns: {
      chatTick: 3.5,
      joinTick: 7.5,
      incidentTick: 5.5,
      moraleTick: 2.5,
      autonomyTick: 5.0,
    },
    nextId: 100,
  };
  ensureAkpolSubServer(state);
  ensurePerwiraSubServer(state);
  return state;
}

export function buildPersonalityFromProfile(profile, custom = null) {
  if (custom) {
    return {
      professionalism: clamp(Math.round(custom.professionalism ?? 65), 20, 98),
      loyalty: clamp(Math.round(custom.loyalty ?? 65), 20, 98),
      activityDrive: clamp(Math.round(custom.activityDrive ?? 65), 20, 98),
      ambition: clamp(Math.round(custom.ambition ?? 55), 20, 98),
      empathy: clamp(Math.round(custom.empathy ?? 60), 20, 98),
    };
  }
  const str = profile?.username || 'ai_user';
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const jitter = (offset) => (((h >>> offset) & 31) - 15);
  const baseByArchetype = {
    taktis: { professionalism: 82, loyalty: 76, activityDrive: 80, ambition: 62, empathy: 60 },
    ramah: { professionalism: 72, loyalty: 84, activityDrive: 74, ambition: 46, empathy: 88 },
    ambisius: { professionalism: 58, loyalty: 54, activityDrive: 86, ambition: 88, empathy: 52 },
    kritis: { professionalism: 48, loyalty: 50, activityDrive: 66, ambition: 74, empathy: 46 },
  };
  const base = baseByArchetype[profile?.archetype] || baseByArchetype.ramah;
  return {
    professionalism: clamp(base.professionalism + jitter(0), 28, 96),
    loyalty: clamp(base.loyalty + jitter(5), 28, 96),
    activityDrive: clamp(base.activityDrive + jitter(10), 30, 96),
    ambition: clamp(base.ambition + jitter(15), 25, 96),
    empathy: clamp(base.empathy + jitter(20), 28, 96),
  };
}

export function createAiMember(profile, overrides = {}) {
  const defaultBios = {
    taktis: 'Mengutamakan kedisiplinan radio 10-4, formasi patroli presisi, dan penanganan TKP cepat.',
    ramah: 'Senang bersosialisasi di OOC, membantu rekan baru beradaptasi, dan menjaga suasana server hangat.',
    ambisius: 'Fokus meniti jenjang karir pangkat setinggi mungkin dan mengejar medali kehormatan.',
    kritis: 'Aktif memberi masukan konstruktif soal struktur organisasi, pembagian divisi, dan keaktifan admin.',
  };
  const personality = buildPersonalityFromProfile(profile, overrides.personality || profile.personality || null);

  return {
    id: overrides.id || `ai-${Math.random().toString(36).slice(2, 8)}`,
    username: profile.username,
    icName: profile.icName,
    avatarColor: profile.avatarColor,
    archetype: profile.archetype,
    speechQuirk: overrides.speechQuirk || profile.speechQuirk || 'standar',
    nightOwl: overrides.nightOwl ?? Boolean(profile.nightOwl),
    personality,
    bio: overrides.bio || defaultBios[profile.archetype] || 'Anggota aktif Kepolisian Republik Izumiya.',
    rankId: overrides.rankId || 'rank-taruna',
    divisionId: overrides.divisionId ?? null,
    divisionUnitId: overrides.divisionUnitId ?? null,
    divisionSubUnitId: overrides.divisionSubUnitId ?? null,
    divisionUnitRole: overrides.divisionUnitRole ?? null,
    billetId: overrides.billetId ?? null,
    subRole: overrides.subRole ?? null,
    awards: overrides.awards ? [...overrides.awards] : [],
    xp: overrides.xp ?? 0,
    betahScore: overrides.betahScore ?? 68,
    loyalty: overrides.loyalty ?? personality.loyalty,
    violationCount: overrides.violationCount ?? 0,
    personalAuthority: overrides.personalAuthority
      ? { ...overrides.personalAuthority }
      : { canOwnSubServer: false, canAffiliateServer: false },
    academyStatus: overrides.academyStatus || 'NONE',
    akpolRegistered: overrides.akpolRegistered ?? Boolean(overrides.academyStatus === 'ENROLLED' || overrides.academyStatus === 'GRADUATED'),
    akpolRequestSent: false,
    trainingProgress: overrides.trainingProgress ?? 0,
    trainingSessions: overrides.trainingSessions ?? 0,
    status: overrides.status || 'online-2d',
    needsWelcome: overrides.needsWelcome ?? false,
    promotionAsked: false,
    x: overrides.x ?? 180,
    y: overrides.y ?? 160,
    vx: 0,
    vy: 0,
    angle: 0,
    targetX: overrides.x ?? 480,
    targetY: overrides.y ?? 355,
    aiState: 'PATROL',
    waitTimer: 0,
    walkPhase: 0,
    speechBubble: '',
    speechTimer: 0,
    detainedRemaining: overrides.detainedRemaining ?? 0,
    detentionReason: overrides.detentionReason ?? '',
    prisonCell: overrides.prisonCell ?? null,
    joinedAtSec: overrides.joinedAtSec ?? 8 * 3600,
  };
}

const PROCEDURAL_FIRST_NAMES = [
  'Aditya', 'Bagas', 'Cakra', 'Danu', 'Eka', 'Farhan', 'Gilang', 'Haris',
  'Indra', 'Jaka', 'Kurnia', 'Lutfi', 'Maulana', 'Naufal', 'Oka', 'Pandu',
  'Qori', 'Raka', 'Satria', 'Taufik', 'Umar', 'Vino', 'Wahyu', 'Yuda', 'Zaki',
];
const PROCEDURAL_LAST_NAMES = [
  'Pratama', 'Wibowo', 'Saputra', 'Nugroho', 'Kusuma', 'Hidayat', 'Santoso', 'Mahendra',
  'Permana', 'Ramadhan', 'Purnama', 'Fadillah', 'Setiawan', 'Gunawan', 'Wijaya', 'Lestari',
];
const PROCEDURAL_ARCHETYPES = ['taktis', 'ramah', 'ambisius', 'kritis'];
const PROCEDURAL_QUIRKS = ['radio', 'kalem', 'santai', 'kritis', 'tegas', 'humoris', 'analitis', 'semangat'];
const PROCEDURAL_COLORS = ['#38BDF8', '#34D399', '#A78BFA', '#F59E0B', '#F472B6', '#60A5FA', '#FB923C', '#22D3EE'];

export function generateUniqueAiProfile(existingUsernames, existingIcNames, seedNum = 1) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const idx = seedNum + attempt;
    const f = PROCEDURAL_FIRST_NAMES[idx % PROCEDURAL_FIRST_NAMES.length];
    const l = PROCEDURAL_LAST_NAMES[(Math.floor(idx / 3) + attempt) % PROCEDURAL_LAST_NAMES.length];
    const suffix = idx > 40 ? `_${(idx % 97) + 2}` : `_${(idx % 9) + 1}`;
    const username = `${f.toLowerCase()}_${l.toLowerCase().slice(0, 4)}${suffix}`;
    const icName = attempt < 25 ? `${f} ${l}` : `${f} ${l} ${((idx % 9) + 2)}`;
    if (!existingUsernames.has(username) && !existingIcNames.has(icName.toLowerCase())) {
      return {
        username,
        icName,
        archetype: PROCEDURAL_ARCHETYPES[idx % PROCEDURAL_ARCHETYPES.length],
        speechQuirk: PROCEDURAL_QUIRKS[idx % PROCEDURAL_QUIRKS.length],
        avatarColor: PROCEDURAL_COLORS[idx % PROCEDURAL_COLORS.length],
        nightOwl: idx % 3 === 0,
      };
    }
  }
  const fallbackTag = `${seedNum}_${Math.floor(Math.random() * 900 + 100)}`;
  return {
    username: `personel_${fallbackTag}`,
    icName: `Perwira ${fallbackTag}`,
    archetype: 'taktis',
    speechQuirk: 'radio',
    avatarColor: '#38BDF8',
    nightOwl: false,
  };
}

export function createInitialCivilians(count) {
  const list = [];
  const colors = ['#64748B', '#78716C', '#94A3B8', '#A1A1AA', '#D97706', '#0D9488'];
  for (let i = 0; i < count; i++) {
    const horizontal = i % 2 === 0;
    const x = horizontal ? 120 + i * 110 : ROAD_X[i % ROAD_X.length];
    const y = horizontal ? ROAD_Y[i % ROAD_Y.length] : 110 + i * 75;
    list.push({
      id: `civ-${i + 1}`,
      x,
      y,
      horizontal,
      dir: i % 3 === 0 ? -1 : 1,
      speed: 45 + (i % 4) * 14,
      color: colors[i % colors.length],
    });
  }
  return list;
}

export function formatSimClock(simSeconds) {
  const totalMins = Math.floor(simSeconds / 60) % (24 * 60);
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getRankById(state, rankId) {
  return state.ranks.find((r) => r.id === rankId) || state.ranks[0];
}

export function getDivisionById(state, divisionId) {
  if (!divisionId) return null;
  return state.divisions.find((d) => d.id === divisionId) || null;
}

export function getBilletById(state, billetId) {
  if (!billetId) return null;
  return state.billets.find((b) => b.id === billetId) || null;
}

export function getAwardById(awardId) {
  return AWARDS_CATALOG.find((a) => a.id === awardId) || null;
}
