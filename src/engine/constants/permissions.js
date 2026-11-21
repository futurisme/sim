export const AUTHORITY_CATEGORIES = [
  { id: 'PERSONEL', label: 'Personel & Rekrutmen', color: '#5865F2' },
  { id: 'STRUKTUR', label: 'Struktur, Jabatan & Patroli', color: '#F59E0B' },
  { id: 'AKADEMI', label: 'Akademi & Diklat Akpol', color: '#0EA5E9' },
  { id: 'PROPAM', label: 'Propam, Rutan & Keamanan', color: '#10B981' },
  { id: 'SUBSERVER', label: 'Sub-Server & Tata Kelola', color: '#8B5CF6' },
];

export const PERMISSION_DEFINITIONS = [
  // PERSONEL (8)
  { key: 'canPromote', label: 'Promosi Pangkat', desc: 'Menaikkan pangkat bawahan di bawah hierarki komando', category: 'PERSONEL' },
  { key: 'canDemote', label: 'Demosi Pangkat', desc: 'Menurunkan pangkat bawahan karena evaluasi atau sanksi', category: 'PERSONEL', defaultRisk: true },
  { key: 'canKick', label: 'Kick Anggota', desc: 'Mengeluarkan anggota bermasalah di bawah hierarki', category: 'PERSONEL', defaultRisk: true },
  { key: 'canBan', label: 'Ban Permanen', desc: 'Memblokir permanen anggota pelanggar berat dari server', category: 'PERSONEL', defaultRisk: true },
  { key: 'canAcceptRecruit', label: 'Terima Rekrutan', desc: 'Menyambut, menyeleksi & menempatkan rekrutan baru ke divisi', category: 'PERSONEL' },
  { key: 'canTransferDivision', label: 'Mutasi Divisi', desc: 'Memindahkan penugasan divisi operasional & unit personel', category: 'PERSONEL' },
  { key: 'canMuteChat', label: 'Moderasi Chat', desc: 'Menegur, membatasi & menjaga ketertiban obrolan Discord', category: 'PERSONEL' },
  { key: 'canGrantAwards', label: 'Beri Brevet & Penghargaan', desc: 'Menyematkan Brevet, Sertifikat & Medali Penghargaan ke personel', category: 'PERSONEL' },

  // STRUKTUR (9)
  { key: 'canAnnounce', label: 'Pengumuman Mabes', desc: 'Mengirim pengumuman resmi & instruksi komando ke seluruh server', category: 'STRUKTUR' },
  { key: 'canCreateRank', label: 'Buat Pangkat', desc: 'Menambah jenjang kepangkatan baru dalam struktur Polri', category: 'STRUKTUR' },
  { key: 'canCreateDivision', label: 'Buat Divisi', desc: 'Membuka divisi kepolisian & unit operasional baru', category: 'STRUKTUR' },
  { key: 'canCreateBillet', label: 'Buat Jabatan', desc: 'Membentuk jabatan struktural baru (KADIV/WAKADIV/KANIT)', category: 'STRUKTUR' },
  { key: 'canAppointUnitLeader', label: 'Lantik KADIV / KANIT', desc: 'Menunjuk & melantik pejabat KADIV, WAKADIV, dan KANIT unit', category: 'STRUKTUR' },
  { key: 'canManageDivisionQuota', label: 'Atur Kuota Divisi', desc: 'Menambah atau menyesuaikan batas kuota anggota per divisi', category: 'STRUKTUR' },
  { key: 'canConfigureDivisionDuty', label: 'Atur Tugas Divisi', desc: 'Mengubah zona patroli, jaga gerbang & prioritas TKP divisi', category: 'STRUKTUR' },
  { key: 'canCommandPatrol', label: 'Komando Patroli 2D', desc: 'Mengarahkan unit patroli, formasi konvoi & pengamanan kota', category: 'STRUKTUR' },
  { key: 'canManageEvents', label: 'Kelola Event RP', desc: 'Menggelar acara komunitas, upacara akbar & konvoi resmi', category: 'STRUKTUR' },

  // AKADEMI (6)
  { key: 'canManageAcademy', label: 'Seleksi & Kuota Akpol', desc: 'Memverifikasi #registrasi Akpol & menerima Taruna sesuai kuota', category: 'AKADEMI' },
  { key: 'canEducate', label: 'Didik & Latih Taruna', desc: 'Membina etika, disiplin kepribadian & keterampilan dasar Taruna', category: 'AKADEMI' },
  { key: 'canLeadAkpolDrill', label: 'Pimpin Baris-Berbaris', desc: 'Memimpin latihan baris-berbaris serentak di lapangan Kampus Akpol', category: 'AKADEMI' },
  { key: 'canRespondAkpolRequest', label: 'Tanggapi #Request Akpol', desc: 'Menerima panggilan #request Taruna & hadir melatih ke Akpol', category: 'AKADEMI' },
  { key: 'canGraduateCadet', label: 'Luluskan Taruna', desc: 'Menetapkan kelulusan Taruna & pelantikan menjadi Bintara', category: 'AKADEMI' },
  { key: 'canFailCadet', label: 'Gugurkan Taruna', desc: 'Menggugurkan Taruna yang gagal memenuhi evaluasi akademi', category: 'AKADEMI', defaultRisk: true },

  // PROPAM (4)
  { key: 'canAuditIntegrity', label: 'Audit & Sidik Etik', desc: 'Memeriksa indikasi abuse wewenang & laporan internal Propam', category: 'PROPAM' },
  { key: 'canArrestDetainee', label: 'Penahanan Rutan', desc: 'Memasukkan pelanggar kode etik atau buronan ke Sel Rutan Mabes', category: 'PROPAM', defaultRisk: true },
  { key: 'canReleaseDetainee', label: 'Bebaskan Tahanan', desc: 'Mengeluarkan tahanan dari Sel Rutan Mabes usai masa evaluasi', category: 'PROPAM' },
  { key: 'canControlPropamGate', label: 'Gerbang Penjaga Propam', desc: 'Membuka atau mengunci akses portal Gerbang Markas Mabes', category: 'PROPAM' },

  // SUBSERVER (3)
  { key: 'canShareSubServerInvite', label: 'Bagikan Link Sub-Server', desc: 'Membagikan link undangan resmi sub-server Akpol & Divisi', category: 'SUBSERVER' },
  { key: 'canManageSubServerInternal', label: 'Kelola Internal Sub-Server', desc: 'Mengubah konfigurasi, channel & role pengelola internal sub-server', category: 'SUBSERVER' },
  { key: 'canTakeoverSubServer', label: 'Alih Pimpinan Sub-Server', desc: 'Mengambil alih kepemimpinan sub-server saat owner mutasi atau vakum', category: 'SUBSERVER', defaultRisk: true },
];

export function buildEmptyPermissions(overrides = {}) {
  const map = {};
  for (const p of PERMISSION_DEFINITIONS) {
    map[p.key] = Boolean(overrides[p.key]);
  }
  return map;
}

export function buildAllPermissions() {
  const map = {};
  for (const p of PERMISSION_DEFINITIONS) {
    map[p.key] = true;
  }
  return map;
}
