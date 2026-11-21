export const WORLD_WIDTH = 1560;
export const WORLD_HEIGHT = 1020;
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
  compound: { x: 44, y: 44, w: 320, h: 290 },
  hq: { x: 58, y: 74, w: 162, h: 116 },
  courtyard: { x: 58, y: 202, w: 154, h: 118 },
  propamOffice: { x: 232, y: 74, w: 118, h: 102 },
  prison: {
    x: 232,
    y: 188,
    w: 118,
    h: 122,
    cells: [
      { x: 252, y: 250 },
      { x: 291, y: 250 },
      { x: 330, y: 250 },
    ],
  },
  eastGate: { x: 364, y: 165 },
  southGate: { x: 175, y: 334 },
};

export const DISTRICTS = [
  { id: 'mabes', name: 'Kompleks Mabes Polri & Propam', x: 44, y: 44, w: 320, h: 290, color: '#1A2433' },
  { id: 'spn', name: 'Sekolah Kepolisian Negara (SPN)', x: 400, y: 44, w: 310, h: 270, color: '#1B2A32', isSpn: true },
  { id: 'universitas', name: 'Universitas Izumiya', x: 755, y: 44, w: 340, h: 270, color: '#2C1E3D', isUniversity: true },
  { id: 'akademi', name: 'Akademi Kepolisian (Akpol)', x: 1130, y: 44, w: 385, h: 270, color: '#17263D', isAcademy: true },
  { id: 'permukiman', name: 'Permukiman Sektor Barat', x: 44, y: 365, w: 320, h: 320, color: '#20242C' },
  { id: 'simpang', name: 'Simpang Raya Kota Izumiya', x: 400, y: 345, w: 310, h: 185, color: '#1F2430' },
  { id: 'pasar', name: 'Distrik Niaga & Pasar', x: 755, y: 345, w: 340, h: 185, color: '#23272F' },
  { id: 'dermaga', name: 'Taman & Dermaga Selatan', x: 400, y: 560, w: 695, h: 230, color: '#1C2833' },
  { id: 'pelabuhan', name: 'Kawasan Logistik & Pelabuhan', x: 1130, y: 345, w: 385, h: 445, color: '#1F242D' },
];

export const ROAD_X = [190, 560, 930, 1310];
export const ROAD_Y = [170, 390, 610, 840];
