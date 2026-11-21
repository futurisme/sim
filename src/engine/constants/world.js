export const WORLD_WIDTH = 1320;
export const WORLD_HEIGHT = 900;
export const MAX_AI_MEMBERS = 100;

export const STORAGE_KEY = 'izumiya_rp_sim_v2';
export const MANUAL_SAVES_KEY = 'izumiya_polisi_manual_saves_v1';
export const PREFS_KEY = 'izumiya_polisi_prefs_v1';

export const CHANNELS = [
  {
    id: 'pengumuman-mabes',
    name: 'pengumuman-mabes',
    category: 'MARKAS BESAR',
    topic: 'Arahan resmi Kapolda & pengumuman kenaikan pangkat Kepolisian Republik Izumiya.',
    mode: 'ic',
  },
  {
    id: 'akademi-lemdiklat',
    name: 'akademi-lemdiklat',
    category: 'PENDIDIKAN & AKPOL',
    topic: 'Seleksi pendaftaran Taruna, pelatihan Lemdiklat, pengumuman kelulusan & gugur.',
    mode: 'ic',
  },
  {
    id: 'lobi-rekrutmen',
    name: 'lobi-rekrutmen',
    category: 'REKRUTMEN',
    topic: 'Pendaftar baru bergabung ke server. Sambut & tetapkan pangkat awal agar mereka betah.',
    mode: 'ooc',
  },
  {
    id: 'obrolan-ooc',
    name: 'obrolan-ooc',
    category: 'KOMUNITAS',
    topic: 'Obrolan santai OOC anggota RP Kepolisian Republik Izumiya.',
    mode: 'ooc',
  },
  {
    id: 'laporan-patroli',
    name: 'laporan-patroli',
    category: 'OPERASIONAL 2D',
    topic: 'Sinkronisasi laporan radio 10-4 & penindakan langsung dari Kota Izumiya 2D.',
    mode: 'ic',
  },
  {
    id: 'ruang-komando',
    name: 'ruang-komando',
    category: 'KOMANDO',
    topic: 'Koordinasi taktis perwira, wewenang role, & log update Developer/Admin.',
    mode: 'ic',
  },
];

export const INCIDENT_TYPES = [
  { type: 'TILANG', label: 'Pelanggaran Marka & Kecepatan', rewardXp: 28, rewardRep: 6, color: '#F59E0B', duration: 3.5 },
  { type: 'BALAP_LIAR', label: 'Balap Liar Jalan Raya', rewardXp: 42, rewardRep: 10, color: '#EF4444', duration: 4.5 },
  { type: 'KERIBUTAN', label: 'Keributan Area Pasar', rewardXp: 35, rewardRep: 8, color: '#EC4899', duration: 4.0 },
  { type: 'MACET', label: 'Kemacetan Simpang Utama', rewardXp: 24, rewardRep: 5, color: '#06B6D4', duration: 3.0 },
  { type: 'PENGAWALAN', label: 'Pengamanan Pos Dermaga', rewardXp: 32, rewardRep: 7, color: '#3B82F6', duration: 3.8 },
];

export const MABES_ZONES = {
  compound: { x: 44, y: 44, w: 312, h: 278 },
  hq: { x: 56, y: 74, w: 158, h: 112 },
  courtyard: { x: 56, y: 198, w: 150, h: 102 },
  propamOffice: { x: 226, y: 74, w: 116, h: 98 },
  prison: {
    x: 226,
    y: 184,
    w: 116,
    h: 116,
    cells: [
      { x: 245, y: 242 },
      { x: 282, y: 242 },
      { x: 318, y: 242 },
    ],
  },
  eastGate: { x: 356, y: 155 },
  southGate: { x: 170, y: 322 },
};

export const DISTRICTS = [
  { id: 'mabes', name: 'Kompleks Mabes Polri & Propam', x: 44, y: 44, w: 312, h: 278, color: '#1A2433' },
  { id: 'simpang', name: 'Simpang Utama', x: 380, y: 270, w: 200, h: 170, color: '#1F2430' },
  { id: 'pasar', name: 'Distrik Niaga & Pasar', x: 670, y: 80, w: 230, h: 185, color: '#23272F' },
  { id: 'akademi', name: 'Akademi Kepolisian', x: 965, y: 65, w: 295, h: 255, color: '#17263D', isAcademy: true },
  { id: 'dermaga', name: 'Taman & Dermaga Selatan', x: 650, y: 645, w: 275, h: 195, color: '#1C2833' },
  { id: 'permukiman', name: 'Permukiman Timur', x: 95, y: 465, w: 230, h: 185, color: '#20242C' },
  { id: 'pelabuhan', name: 'Kawasan Logistik Timur', x: 965, y: 465, w: 295, h: 215, color: '#1F242D' },
];

export const ROAD_X = [170, 480, 790, 1110];
export const ROAD_Y = [155, 355, 555, 765];
