// Indonesian Socio-Pragmatic NLP Intent Parser & Speech Register Stylizer
import { DISTRICTS } from '../constants.js';

/**
 * Computes Indonesian socio-linguistic speech style (formality & politeness) directly from AI stats, rank, & morale.
 */
export function computeSpeechStyle(member, state) {
  const p = member?.personality || {
    professionalism: 60,
    loyalty: 60,
    activityDrive: 60,
    ambition: 55,
    empathy: 60,
  };
  const rankObj = state?.ranks?.find((r) => r.id === member?.rankId);
  const rankOrder = rankObj ? Math.min(10, Number(rankObj.order) || 1) : 1;
  const hasBillet = Boolean(member?.billetId);
  const betah = member?.betahScore ?? 68;

  const archFormalityOffset =
    member?.archetype === 'taktis' ? 8 : member?.archetype === 'ramah' ? -8 : member?.archetype === 'kritis' ? -4 : 0;
  const formality = Math.max(
    10,
    Math.min(99, Math.round(p.professionalism * 0.62 + rankOrder * 3.5 + (hasBillet ? 12 : 0) + archFormalityOffset))
  );

  const betahBoost = betah >= 68 ? 10 : betah < 48 ? -16 : 0;
  const archPoliteOffset =
    member?.archetype === 'ramah' ? 10 : member?.archetype === 'kritis' ? -12 : 0;
  const politeness = Math.max(
    10,
    Math.min(99, Math.round(p.empathy * 0.56 + p.loyalty * 0.34 + betahBoost + archPoliteOffset))
  );

  const register = formality >= 74 ? 'BAKU' : formality >= 48 ? 'SEMI' : 'SANTAI';
  const courtesy = politeness >= 70 ? 'SANTUN' : politeness >= 45 ? 'NETRAL' : 'KETUS';

  return { formality, politeness, register, courtesy };
}

/**
 * Normalizes informal Indonesian chat text, slang, and common Discord abbreviations for robust NLP matching.
 */
export function normalizeIndonesianText(rawText) {
  let s = String(rawText || '').toLowerCase().trim();
  const replacements = [
    [/\byg\b/g, 'yang'],
    [/\bdgn\b/g, 'dengan'],
    [/\butk\b|\buntk\b|\bbuat\b/g, 'untuk'],
    [/\bbkn\b|\bbikin\b/g, 'buat'],
    [/\bnaikin\b|\bnaekin\b|\bnaikan\b/g, 'naikkan'],
    [/\bturunin\b|\bturunkn\b/g, 'turunkan'],
    [/\bpindahin\b|\bmasukin\b/g, 'masukkan'],
    [/\blulusin\b/g, 'luluskan'],
    [/\bgugurin\b|\bgagalin\b/g, 'gugurkan'],
    [/\bkeluarin\b|\bpecatin\b/g, 'keluarkan'],
    [/\bgmn\b|\bgmna\b|\bgimn\b/g, 'bagaimana'],
    [/\bbrp\b/g, 'berapa'],
    [/\bkpn\b/g, 'kapan'],
    [/\bsapa\b|\bsiapa sih\b/g, 'siapa'],
    [/\bknp\b|\bkenap\b/g, 'kenapa'],
    [/\bskrg\b|\bskrng\b|\bskng\b/g, 'sekarang'],
    [/\btlg\b|\bplis\b|\bmhn\b/g, 'tolong'],
    [/\bmksh\b|\bmakasih\b|\bthx\b|\btq\b/g, 'terima kasih'],
    [/\bsub[\s-]*server\b/g, 'sub-server'],
    [/\bacc\b|\bapprove\b/g, 'terima'],
    [/\botw\b/g, 'meluncur'],
    [/\bcek\b|\bcheck\b|\bpantau\b/g, 'cek'],
    [/\binfo\b|\bkabar\b|\blapor\b/g, 'laporan'],
    [/\bkuy\b|\byuk\b|\bayok\b/g, 'ayo'],
    [/\bmantul\b|\bkeren banget\b|\bgg\b/g, 'mantap'],
  ];
  for (const [re, sub] of replacements) {
    s = s.replace(re, sub);
  }
  return s.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses natural Indonesian text from the Owner/Kapolda into structured intents & targets.
 */
export function parseOwnerNaturalCommand(rawText, state) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const norm = normalizeIndonesianText(text);

  // Target member match: full name, username, first name, last name, or @mention
  const targetMember =
    state.members.find((m) => {
      const parts = m.icName.toLowerCase().split(/\s+/);
      const first = escapeRegExp(parts[0]);
      const last = parts.length > 1 ? escapeRegExp(parts[parts.length - 1]) : '';
      return (
        lower.includes(m.icName.toLowerCase()) ||
        lower.includes(m.username.toLowerCase()) ||
        (first && new RegExp(`@?\\b${first}\\b`, 'i').test(lower)) ||
        (last && parts[parts.length - 1].length >= 4 && new RegExp(`\\b${last}\\b`, 'i').test(lower))
      );
    }) || null;

  // Target division match: exact name/callsign first, then Indonesian unit synonyms
  const targetDivision =
    state.divisions.find((d) => {
      const dn = d.name.toLowerCase();
      const cs = escapeRegExp(d.callsign.toLowerCase());
      return lower.includes(dn) || (cs && new RegExp(`\\b${cs}\\b`, 'i').test(lower));
    }) ||
    state.divisions.find((d) => {
      const dn = d.name.toLowerCase();
      if (dn.includes('lantas') && /(lalu\s*lintas|lalin|tilang)/.test(norm)) return true;
      if (dn.includes('sabhara') && /(samapta|sabhara)/.test(norm)) return true;
      if (dn.includes('reskrim') && /(reserse|kriminal|penyidik)/.test(norm)) return true;
      if (dn.includes('propam') && /(etik|disiplin\s*internal|propam|provos|gerbang)/.test(norm)) return true;
      if (dn.includes('intel') && /(intelijen|sandi|intel)/.test(norm)) return true;
      if (dn.includes('polair') && /(laut|perairan|udara|polair|maritim|dermaga)/.test(norm)) return true;
      if (dn.includes('brimob') && /(brimob|taktis|gegana)/.test(norm)) return true;
      if (dn.includes('narkoba') && /(narkoba|narkotika|resnarkoba)/.test(norm)) return true;
      if (dn.includes('densus') && /(densus|anti\s*teror|88)/.test(norm)) return true;
      if (dn.includes('inafis') && /(inafis|forensik|sidik\s*jari)/.test(norm)) return true;
      if (dn.includes('humas') && /(humas|siber|cyber|publik)/.test(norm)) return true;
      if (dn.includes('binmas') && /(binmas|bhabin|penyuluhan|warga)/.test(norm)) return true;
      if (dn.includes('dokkes') && /(dokkes|medis|kesehatan|p3k)/.test(norm)) return true;
      if (dn.includes('pamobvit') && /(pamobvit|objek\s*vital|vip)/.test(norm)) return true;
      if (dn.includes('lemdiklat') && /(lemdiklat|akademi|diklat|taruna)/.test(norm)) return true;
      if (dn.includes('k9') && /(k9|satwa|pelacak)/.test(norm)) return true;
      if (dn.includes('tik') && /(tik|komunikasi|server|it\b)/.test(norm)) return true;
      return false;
    }) ||
    null;

  // Target sub-server match
  const targetSubServer =
    (state.subServers || []).find((s) => {
      const sn = s.name.toLowerCase();
      const sc = escapeRegExp(s.shortCode.toLowerCase());
      return (
        lower.includes(sn) ||
        (sc && new RegExp(`\\b${sc}\\b`, 'i').test(lower)) ||
        (s.category === 'PERWIRA' && /perwira/.test(norm)) ||
        (s.category === 'AKADEMI' && /(akademi|akpol|lemdiklat)/.test(norm)) ||
        (s.category === 'EVENT' && /(panitia|event)/.test(norm)) ||
        (/brimob/.test(sn) && /brimob/.test(norm))
      );
    }) || null;

  // Target district match with rich aliases
  const targetDistrict =
    DISTRICTS.find(
      (d) =>
        lower.includes(d.name.toLowerCase()) ||
        (d.id === 'pasar' && /(pasar|niaga|toko)/.test(norm)) ||
        (d.id === 'akademi' && /(akademi|akpol|lemdiklat|spn|kampus)/.test(norm)) ||
        (d.id === 'dermaga' && /(dermaga|selatan|taman|pantai)/.test(norm)) ||
        (d.id === 'pelabuhan' && /(logistik|pelabuhan|gudang)/.test(norm)) ||
        (d.id === 'simpang' && /(simpang|pusat\s*kota|alun)/.test(norm)) ||
        (d.id === 'mabes' && /(mabes|markas|kantor\s*pusat)/.test(norm)) ||
        (d.id === 'permukiman' && /(permukiman|perumahan|timur|warga)/.test(norm))
    ) || null;

  // 1a. Division Proposal Approval / Rejection via Chat or DM
  if (/(setuju|acc|setujui|terima|izinkan).*(proposal|rancangan|divisi|rekrutmen|unit)/i.test(norm)) {
    return { intent: 'APPROVE_DIVISION_PROPOSAL', targetDivision, rawText: text };
  }
  if (/(tolak|batal|tunda|revisi).*(proposal|rancangan|divisi|rekrutmen|unit)/i.test(norm)) {
    return { intent: 'REJECT_DIVISION_PROPOSAL', targetDivision, rawText: text };
  }

  // 1b. Sub-server recruitment link / invite broadcast intent
  if (
    (/(link|tautan|invite|undangan|rekrut|promosi|sebar|bagikan|kirim).*(sub-server|server|join|gabung|registrasi)/i.test(norm) ||
      /(rekrutmen|buka\s*pendaftaran).*(sub-server|divisi|brimob|perwira|akademi|event|registrasi)/i.test(norm)) &&
    !/^(buat|tambah|buka)\s*sub-server/i.test(norm)
  ) {
    return { intent: 'RECRUIT_SUB_SERVER_LINK', targetMember, targetDivision, targetSubServer, rawText: text };
  }

  // 2. Academy graduation / fail / enrollment / cohort baris-berbaris drill
  if (/(pimpin\s*baris|baris[\s-]*berbaris|latih\s*(akpol|taruna|serentak)|turun\s*ke\s*akpol)/i.test(norm)) {
    return { intent: 'LEAD_AKPOL_DRILL', targetMember, rawText: text };
  }
  if (/(request\s*(pelatih|latihan|akpol)|panggil\s*pelatih\s*akpol)/i.test(norm)) {
    return { intent: 'REQUEST_AKPOL_DRILL', targetMember, rawText: text };
  }
  if (/(luluskan|wisuda|dilantik\s*akpol)/i.test(norm) && targetMember) {
    return { intent: 'GRADUATE_CADET', targetMember, rawText: text };
  }
  if (/(gugurkan|drop\s*out|do\s*akpol)/i.test(norm) && targetMember) {
    return { intent: 'FAIL_CADET', targetMember, rawText: text };
  }
  if (/(daftar.*akademi|masukkan.*akademi|seleksi.*akademi|ikut.*diklat|sekolah.*akpol)/i.test(norm) && targetMember) {
    return { intent: 'ENROLL_ACADEMY', targetMember, rawText: text };
  }

  // 3. Structural creation & Division Quota / Duty configuration
  if (/(buat|tambah|buka|dirikan)\s*(sub-server|server\s*divisi|server\s*baru)/i.test(norm)) {
    return { intent: 'CREATE_SUB_SERVER', targetMember, targetDivision, targetSubServer, rawText: text };
  }
  if (/(afiliasi|tautkan|hubungkan|sambungkan).*server/i.test(norm)) {
    return { intent: 'AFFILIATE_SUB_SERVER', targetMember, targetSubServer, rawText: text };
  }
  if (/(kuota|kapasitas|slot).*divisi|((naikkan|turunkan|ubah|atur|tambah|kurangi)\s*(kuota|kapasitas|slot))/i.test(norm)) {
    const numMatch = norm.match(/\b(\d{1,2})\b/);
    const explicitQuota = numMatch ? Number(numMatch[1]) : null;
    const isDecrease = /(turunkan|kurangi|perkecil)/.test(norm);
    return {
      intent: 'ADJUST_DIVISION_QUOTA',
      targetDivision,
      targetQuota: explicitQuota,
      explicitQuota,
      delta: isDecrease ? -2 : 3,
      rawText: text,
    };
  }
  if (/(atur|ubah|set|ganti|fokus)\s*(tugas|penugasan|aktivitas|patroli|zona|kegiatan)/i.test(norm) && targetDivision) {
    let assignmentType = null;
    if (/(gerbang|mabes|markas|etik|provos|rutan)/.test(norm)) assignmentType = 'INTERNAL_SECURITY';
    else if (/(lalin|lalu\s*lintas|tilang|macet|balap|jalan)/.test(norm)) assignmentType = 'TRAFFIC';
    else if (/(laut|dermaga|pelabuhan|maritim|perairan)/.test(norm)) assignmentType = 'MARITIME';
    else if (/(sidik|reserse|tkp|kriminal)/.test(norm)) assignmentType = 'INVESTIGATION';
    else if (/(taktis|anti\s*teror|brimob|densus)/.test(norm)) assignmentType = 'TACTICAL';
    else if (/(intel|sandi|pantau)/.test(norm)) assignmentType = 'INTEL';
    else if (/(warga|permukiman|binmas|sambang)/.test(norm)) assignmentType = 'COMMUNITY';
    else if (/(medis|dokkes|kesehatan|evakuasi)/.test(norm)) assignmentType = 'MEDICAL';
    else if (/(humas|event|siber|publik)/.test(norm)) assignmentType = 'PUBLIC_RELATIONS';
    else if (/(akpol|akademi|taruna|diklat)/.test(norm)) assignmentType = 'EDUCATION';
    else if (/(umum|kota|patroli\s*bebas)/.test(norm)) assignmentType = 'GENERAL_PATROL';
    return {
      intent: 'CONFIGURE_DIVISION_DUTY',
      targetDivision,
      targetDistrict,
      assignmentType,
      rawText: text,
    };
  }
  if (/(buat|tambah|buka)\s*divisi/i.test(norm)) {
    return { intent: 'CREATE_DIVISION', rawText: text };
  }
  if (/(buat|tambah|buka)\s*pangkat/i.test(norm)) {
    return { intent: 'CREATE_RANK', rawText: text };
  }
  if (/(buat|tambah|buka)\s*jabatan/i.test(norm)) {
    return { intent: 'CREATE_BILLET', rawText: text };
  }
  if (/(gelar|adakan|buat|mulai|selenggarakan)\s*event/i.test(norm)) {
    return { intent: 'HOST_EVENT', targetMember, rawText: text };
  }

  // 3b. Propam Gate & Penjara Mabes Intents
  if (/(buka|tutup|kunci|lock|unlock).*(gerbang|portal|gate|pintu)/i.test(norm)) {
    return { intent: 'TOGGLE_PROPAM_GATE', gateOpen: /(buka|unlock|open)/.test(norm), rawText: text };
  }
  if (/(bebaskan|keluarkan.*(penjara|sel|rutan)|lepas.*tahanan)/i.test(norm) && targetMember) {
    return { intent: 'RELEASE_MEMBER', targetMember, rawText: text };
  }
  if (/(tahan|penjara|masukkan.*sel|jebloskan|selkan|kurung)/i.test(norm) && targetMember) {
    return { intent: 'ARREST_MEMBER', targetMember, rawText: text };
  }

  // 4. Member management (Promote, Demote, Kick, Division Assign)
  if (/(promosi|naik\s*pangkat|naikkan|upgrade\s*pangkat)/i.test(norm) && targetMember) {
    return { intent: 'PROMOTE_MEMBER', targetMember, rawText: text };
  }
  if (/(demosi|turunkan\s*pangkat|turunkan\s*jabatan)/i.test(norm) && targetMember) {
    return { intent: 'DEMOTE_MEMBER', targetMember, rawText: text };
  }
  if (/(kick|keluarkan|ban\b|blokir)/i.test(norm) && targetMember) {
    return { intent: 'KICK_MEMBER', targetMember, rawText: text };
  }
  if (/(pindah|masukkan|tugas\s*di|masuk\s*divisi|tempatkan)/i.test(norm) && targetMember && targetDivision) {
    return { intent: 'ASSIGN_DIVISION', targetMember, targetDivision, rawText: text };
  }

  // 5. Tech, Moderation & Directives
  if (/(jangan\s*(spam|caps|capslock|flood|ooc)|pakai\s*ooc|jaga\s*(etika|sikap|omongan|tata\s*krama)|tegur|tertib\s*chat|peringatkan)/i.test(norm)) {
    return { intent: 'WARN_MODERATION', targetMember, rawText: text };
  }
  if (/(fix|perbaiki|bug|error|patch|update\s*(map|sistem|fitur)|optimasi|maintenance)/i.test(norm)) {
    return { intent: 'TECH_MAINTENANCE', rawText: text };
  }
  if (/(apel|kumpul|briefing|baris|upacara)/i.test(norm)) {
    return { intent: 'DIRECTIVE_APEL', rawText: text };
  }
  if (/(razia|operasi|siaga|cegat|penertiban)/i.test(norm)) {
    return { intent: 'DIRECTIVE_RAZIA', targetDistrict, rawText: text };
  }
  if (/(patroli|meluncur|gerak|sebar|bubar|lanjutkan)/i.test(norm)) {
    return { intent: 'DIRECTIVE_PATROL', targetDistrict, rawText: text };
  }

  // 6. Live State Queries & Open Indonesian Questions
  if (
    /(kondisi|status|laporan|bagaimana|ramai|berapa|cek\s*kota|cek\s*server|aman\s*kah|situasi)/i.test(norm) &&
    !/(siapa|kenapa|kapan|saran|masukan|rekomendasi|rawan|kosong)/i.test(norm)
  ) {
    return { intent: 'STATUS_QUERY', targetMember, targetDistrict, rawText: text };
  }
  if (/(siapa|kenapa|kapan|saran|masukan|rekomendasi|rawan|kosong|bagus|terbaik|butuh\s*apa|\?)/i.test(norm)) {
    return { intent: 'QUESTION_ASK', targetMember, targetDivision, targetDistrict, targetSubServer, rawText: text };
  }

  // 7. Praise / Warm Social
  if (
    /(selamat|halo|hai|pagi|siang|sore|malam|sambut|welcome|terima\s*kasih|bagus|mantap|semangat|apresiasi|hebat|sukses)/i.test(
      norm
    )
  ) {
    return { intent: targetMember ? 'PRAISE_MEMBER' : 'WARM_SOCIAL', targetMember, rawText: text };
  }

  return { intent: 'GENERAL_CHAT', targetMember, targetDistrict, targetDivision, targetSubServer, rawText: text };
}
