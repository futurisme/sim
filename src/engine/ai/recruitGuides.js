// AI Division Registration Templates, Eligibility Rules & Recruitment Invites
import { ASSIGNMENT_TYPES } from '../constants.js';
import { getCircadianProfile } from './hierarchyAi.js';
import { computeSpeechStyle } from './nlpParser.js';

/**
 * Builds division-tailored eligibility rules and registration template for #registrasi.
 */
export function buildDivisionRegistrationGuide(division, subServer = null, _state = null) {
  const assignType = division?.dutyProfile?.assignmentType || 'GENERAL_PATROL';
  const divName = division?.name || subServer?.name || 'Satuan Operasional';
  const code = division?.callsign || subServer?.shortCode || 'DIV';

  const specs = {
    INTERNAL_SECURITY: {
      minProf: 72,
      minLoyalty: 70,
      minActivity: 58,
      extraLabel: 'Profesionalisme ≥ 72%, Loyalitas ≥ 70%, Rekam Etik Bersih (0 Pelanggaran Berat)',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Riwayat Catatan Etik : [Bersih / Tanpa Teguran Berat Propam]',
        '• Unit Pilihan (Propam): [Sub-Unit Gerbang / Patroli Markas / Paminal Rutan]',
        '• Komitmen Integritas  : [Siap Menindak Pelanggaran Tanpa Pandang Bulu]',
      ],
    },
    TRAFFIC: {
      minProf: 58,
      minLoyalty: 55,
      minActivity: 65,
      extraLabel: 'Profesionalisme ≥ 58%, Keaktifan Patroli ≥ 65%, Siap Piket Simpang Utama',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Jam Rawan Siap Piket : [Pagi / Siang / Prime Time / Malam]',
        '• Unit Pilihan (Lantas): [Sub-Unit Turjawali / Patwal Anti-Balap / Gakkum Tilang]',
        '• Pengalaman Penindakan: [Pemahaman Marka, Razia & Sandi 10-4]',
      ],
    },
    TACTICAL: {
      minProf: 65,
      minLoyalty: 62,
      minActivity: 68,
      extraLabel: 'Profesionalisme ≥ 65%, Keaktifan ≥ 68%, Kesiapan Taktis & Anti-Teror',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Kesiapan Taktis CQB  : [Skor Latihan / Mental Lapangan]',
        '• Unit Pilihan (Taktis): [Detasemen Anti-Teror / Batalyon Pelopor]',
        '• Komitmen Phase I–IV  : [Sanggup Ikuti Uji Fisik, Radio & Pelantikan]',
      ],
    },
    INVESTIGATION: {
      minProf: 64,
      minLoyalty: 62,
      minActivity: 58,
      extraLabel: 'Profesionalisme ≥ 64%, Loyalitas ≥ 62%, Ketelitian Analisis TKP',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Spesialisasi Sidik   : [Buser / Olah TKP Inafis / Resmob / Pemberkasan]',
        '• Contoh Penanganan TKP: [Ringkas Pengalaman Penyidikan]',
        '• Komitmen Kerahasiaan : [Menjaga Info Kasus Hingga Pelantikan]',
      ],
    },
    INTEL: {
      minProf: 66,
      minLoyalty: 68,
      minActivity: 55,
      extraLabel: 'Profesionalisme ≥ 66%, Loyalitas ≥ 68%, Disiplin Kerahasiaan Sandi',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Sektor Penggalangan  : [Observasi Lapangan / Pulbaket / Kontra-Intel]',
        '• Kesiapan Operasi Senyap: [Pernyataan Disiplin Sandi]',
      ],
    },
    MARITIME: {
      minProf: 56,
      minLoyalty: 55,
      minActivity: 60,
      extraLabel: 'Profesionalisme ≥ 56%, Keaktifan ≥ 60%, Fokus Dermaga & Pelabuhan Timur',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Unit Pilihan Maritim : [Patroli Perairan / Pos Dermaga / SAR Pelabuhan]',
        '• Jam Jaga Pesisir     : [Jadwal Aktif Kota 2D]',
      ],
    },
    MEDICAL: {
      minProf: 60,
      minLoyalty: 60,
      minActivity: 55,
      extraLabel: 'Profesionalisme ≥ 60%, Empati & Kesiapan Evakuasi Medis',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Bidang Dokkes        : [Evakuasi Medis TKP / Pos Dokkes / Forensik]',
        '• Motivasi Kemanusiaan : [Alasan Bergabung Tim Medis Polri]',
      ],
    },
    EDUCATION: {
      minProf: 68,
      minLoyalty: 68,
      minActivity: 58,
      extraLabel: 'Profesionalisme ≥ 68%, Loyalitas ≥ 68%, Teladan Etika bagi Taruna',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Peran Lemdiklat      : [Instruktur Etik / Pelatih Halang Rintang / Pengasuh]',
        '• Visi Pembinaan Taruna: [Rencana Pembinaan Angkatan Baru]',
      ],
    },
    PUBLIC_RELATIONS: {
      minProf: 54,
      minLoyalty: 56,
      minActivity: 58,
      extraLabel: 'Profesionalisme ≥ 54%, Empati ≥ 58%, Komunikasi OOC/IC Komunikatif',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Bidang Humas & Siber : [Dokumentasi RP / Moderasi Info / Panitia Event]',
        '• Ide Acara Komunitas  : [Konsep Giat Bersama]',
      ],
    },
    COMMUNITY: {
      minProf: 54,
      minLoyalty: 58,
      minActivity: 56,
      extraLabel: 'Profesionalisme ≥ 54%, Loyalitas ≥ 58%, Empati Warga Tinggi',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Unit Pilihan Binmas  : [Bhabin Permukiman Timur / Mediasi Warga]',
        '• Pendekatan Dialogis  : [Cara Menjaga Kondusivitas Permukiman]',
      ],
    },
    GENERAL_PATROL: {
      minProf: 52,
      minLoyalty: 52,
      minActivity: 58,
      extraLabel: 'Profesionalisme ≥ 52%, Keaktifan ≥ 58%, Siap Patroli Poros & Pengawalan',
      formatFields: [
        '• Nama IC & Username  : [Nama Lengkap] (@username)',
        '• Pangkat & Status Akpol: [Min. Bripda / Lulus Diklat]',
        '• Unit Pilihan Sabhara : [Samapta Poros Kota / Unit Dalmas & Kawal]',
        '• Jam Aktif Patroli    : [Pagi / Siang / Prime Time / Malam]',
      ],
    },
  };

  const chosen = specs[assignType] || specs.GENERAL_PATROL;
  const minRankOrder = 2;
  const reqList = [
    'Min. Pangkat Bripda (Taruna wajib lulus Akpol terlebih dahulu)',
    'Sudah terverifikasi di Lobi & tidak sedang masa Diklat Akpol',
    chosen.extraLabel,
    'Wajib lulus seleksi berkas #registrasi & Diklat Phase I–IV hingga Pelantikan',
  ];

  const quotaInfo =
    division && typeof division.dailyIntakeQuota === 'number'
      ? `Kuota Hari Ini: ${division.dailyIntakeCount || 0}/${division.dailyIntakeQuota} slot`
      : '';

  const formatText = [
    `📋 FORMAT #REGISTRASI DIVISI ${divName.toUpperCase()} [${code}]${quotaInfo ? ` · ${quotaInfo}` : ''}:`,
    ...chosen.formatFields,
  ].join('\n');

  const requirementsText = [
    `📌 SYARAT RESMI DIVISI ${divName.toUpperCase()} (${ASSIGNMENT_TYPES[assignType]?.shortLabel || 'Operasional'}):`,
    ...reqList.map((r, i) => `${i + 1}. ${r}`),
  ].join('\n');

  return {
    assignType,
    minRankOrder,
    minProf: chosen.minProf,
    minLoyalty: chosen.minLoyalty,
    minActivity: chosen.minActivity,
    reqList,
    formatFields: chosen.formatFields,
    formatText,
    requirementsText,
    defaultUnitName: division?.units?.[0]?.subUnits?.[0]?.name || `${divName} Sektor I`,
  };
}

/**
 * Generates an authentic filled-out #registrasi application message for a candidate AI-person.
 */
export function buildDivisionRegistrationSubmission(candidate, division, subServer = null, state = null) {
  const rank = state?.ranks?.find((r) => r.id === candidate?.rankId) || { name: 'Taruna', order: 1 };
  const guide = buildDivisionRegistrationGuide(division, subServer, state);
  const subUnitOptions = [];
  (division?.units || []).forEach((u) => {
    (u.subUnits || []).forEach((su) => subUnitOptions.push(su));
  });
  const pickedSubUnit =
    subUnitOptions.find((su) => (su.assignedMemberIds?.length || 0) < (su.quota || 2)) ||
    subUnitOptions[0];
  const slotLabel = pickedSubUnit ? pickedSubUnit.name : guide.defaultUnitName;
  const shiftLabel = candidate.nightOwl ? 'Shift Malam & Prime Time' : 'Shift Pagi / Siang';
  const divLabel = division?.name || subServer?.name || 'Divisi';

  return [
    `Izin mengajukan pendaftaran ke #registrasi ${divLabel} [${division?.callsign || subServer?.shortCode || 'DIV'}]:`,
    `• Nama IC & Username  : ${candidate.icName} (@${candidate.username})`,
    `• Pangkat & Status Akpol: ${rank.name} (Status Akpol: ${candidate.academyStatus || 'NONE'})`,
    `• Minat Unit / Sub-Unit: ${slotLabel}`,
    `• Jam Aktif & Etika    : ${shiftLabel} · Pelanggaran: ${candidate.violationCount || 0}`,
    '• Komitmen Diklat      : Siap menjalani seleksi berkas, Phase I–IV hingga Pelantikan resmi!',
  ].join('\n');
}

/**
 * Evaluates whether an AI-person meets a Sub-Server's recruitment requirements.
 */
export function checkSubServerEligibility(member, subServer, state) {
  if (!member || !subServer) return { eligible: false, reasons: ['Data tidak valid'], reqList: [] };
  const p = member.personality || { professionalism: 60, loyalty: 60, activityDrive: 60, ambition: 55, empathy: 60 };
  const rank = state.ranks.find((r) => r.id === member.rankId) || state.ranks[0];
  const rankOrder = rank?.order || 1;
  const reasons = [];
  const reqList = [];

  const linkedDiv = subServer.linkedDivisionId
    ? state.divisions?.find((d) => d.id === subServer.linkedDivisionId)
    : null;

  if (linkedDiv && subServer.category === 'DIVISI') {
    const guide = buildDivisionRegistrationGuide(linkedDiv, subServer, state);
    reqList.push(...guide.reqList);
    if (member.needsWelcome) reasons.push('Belum terverifikasi / baru masuk lobi');
    if (rankOrder < guide.minRankOrder) reasons.push(`Masih berpangkat ${rank.name} (minimal Bripda)`);
    if (member.academyStatus === 'ENROLLED') reasons.push('Sedang aktif mengikuti pendidikan Taruna Akpol');
    if (p.professionalism < guide.minProf) reasons.push(`Profesionalisme ${Math.round(p.professionalism)}% < ${guide.minProf}%`);
    if ((member.loyalty ?? p.loyalty) < guide.minLoyalty) {
      reasons.push(`Loyalitas ${Math.round(member.loyalty ?? p.loyalty)}% < ${guide.minLoyalty}%`);
    }
    if (p.activityDrive < guide.minActivity) reasons.push(`Keaktifan ${Math.round(p.activityDrive)}% < ${guide.minActivity}%`);
    if ((member.violationCount || 0) >= 2 && guide.assignType === 'INTERNAL_SECURITY') {
      reasons.push('Memiliki catatan pelanggaran disiplin');
    }
    if (!linkedDiv.recruitmentOpen || linkedDiv.proposalStatus !== 'APPROVED') {
      reasons.push('Proposal Unit/Sub-Unit divisi belum dibuka atau belum disetujui Kapolda');
    } else if ((linkedDiv.dailyIntakeCount || 0) >= (linkedDiv.dailyIntakeQuota || 3)) {
      reasons.push(`Kuota rekrutmen harian ${linkedDiv.name} sudah penuh (${linkedDiv.dailyIntakeCount}/${linkedDiv.dailyIntakeQuota})`);
    }
    return { eligible: reasons.length === 0, reasons, reqList };
  }

  if (subServer.category === 'PERWIRA' || /perwira/i.test(subServer.name) || subServer.id === 'sub-perwira') {
    reqList.push('Perwira Aktif (Ipda ke atas) / Purnawirawan Perwira / Kapolda', 'Klasifikasi RAHASIA', 'Anti-Abuse Pimpinan');
    const isPerwira =
      member.id === 'owner' ||
      member.isOwner ||
      (member.isRetired && ((member.retiredRankOrder || 0) >= 5 || /(ipda|iptu|akp|kompol|akbp|kombes|brigjen|irjen|komjen|jenderal|kapolda|perwira)/i.test(member.retiredRankName || ''))) ||
      rank?.isOwner ||
      rankOrder >= 5 ||
      /(ipda|iptu|akp|kompol|akbp|kombes|brigjen|irjen|komjen|jenderal|kapolda|perwira\s*tinggi|perwira\s*menengah|perwira\s*muda|perwira(?!\s*non))/i.test(rank?.name || '') ||
      Boolean(member.billetId && (state.billets?.find((b) => b.id === member.billetId)?.hierarchyOrder || 0) >= 60);

    if (!isPerwira) {
      reasons.push('Sub-Server PERWIRA-ONLY bersifat RAHASIA dan hanya diperuntukkan bagi jajaran Perwira (Ipda ke atas) & Kapolda');
    }
    return { eligible: reasons.length === 0, reasons, reqList };
  } else if (subServer.category === 'AKADEMI' || /akademi|akpol/i.test(subServer.name)) {
    const minProf = state.academy?.minProfessionalism ?? 38;
    const minBetah = state.academy?.minBetah ?? 50;
    reqList.push(`Profesionalisme ≥ ${minProf}%`, `Betah ≥ ${minBetah}%`, 'Siap mengikuti kurikulum Lemdiklat');
    if (p.professionalism < minProf) reasons.push(`Profesionalisme ${p.professionalism}% < ${minProf}%`);
    if ((member.betahScore ?? 65) < minBetah) reasons.push(`Betah ${Math.round(member.betahScore)}% < ${minBetah}%`);
  } else if (subServer.category === 'EVENT' || /event|humas/i.test(subServer.name)) {
    reqList.push('Betah ≥ 55%', 'Empati & Komunikasi ≥ 55%', 'Aktif meramaikan giat komunitas');
    if ((member.betahScore ?? 65) < 55) reasons.push(`Betah ${Math.round(member.betahScore)}% < 55%`);
    if (p.empathy < 55) reasons.push(`Empati ${p.empathy}% < 55%`);
  } else if (/brimob/i.test(subServer.name) || subServer.shortCode === 'BRM') {
    reqList.push('Min. Pangkat Bripda', 'Profesionalisme ≥ 65%', 'Keaktifan ≥ 68%');
    if (rankOrder < 2) reasons.push('Minimal berpangkat Bripda');
    if (p.professionalism < 65) reasons.push(`Profesionalisme ${p.professionalism}% < 65%`);
    if (p.activityDrive < 68) reasons.push(`Keaktifan ${p.activityDrive}% < 68%`);
  } else if (/reskrim/i.test(subServer.name) || subServer.shortCode === 'RSK') {
    reqList.push('Min. Pangkat Bripda', 'Profesionalisme ≥ 65%', 'Loyalitas ≥ 60%');
    if (rankOrder < 2) reasons.push('Minimal berpangkat Bripda');
    if (p.professionalism < 65) reasons.push(`Profesionalisme ${p.professionalism}% < 65%`);
    if (p.loyalty < 60) reasons.push(`Loyalitas ${p.loyalty}% < 60%`);
  } else if (/propam/i.test(subServer.name) || subServer.shortCode === 'PRP') {
    reqList.push('Profesionalisme ≥ 74%', 'Loyalitas ≥ 72%', 'Integritas Tinggi (Anti-Abuse)');
    if (p.professionalism < 74) reasons.push(`Profesionalisme ${p.professionalism}% < 74%`);
    if (p.loyalty < 72) reasons.push(`Loyalitas ${p.loyalty}% < 72%`);
  } else {
    reqList.push('Min. Pangkat Bripda', 'Profesionalisme ≥ 52%', 'Betah ≥ 50%', 'Disiplin radio & patroli aktif');
    if (rankOrder < 2) reasons.push('Minimal berpangkat Bripda');
    if (p.professionalism < 52) reasons.push(`Profesionalisme ${p.professionalism}% < 52%`);
    if ((member.betahScore ?? 65) < 50) reasons.push(`Betah ${Math.round(member.betahScore)}% < 50%`);
  }

  return { eligible: reasons.length === 0, reasons, reqList };
}

/**
 * Generates a structured Discord Sub-Server Recruitment Invite Message with Format Rekrutmen & Syarat Text.
 */
export function buildSubServerRecruitmentInvite(subServer, ownerMember, state) {
  const style = computeSpeechStyle(ownerMember, state);
  const rank = state.ranks.find((r) => r.id === ownerMember?.rankId) || state.ranks[0];
  const linkedDiv = subServer.linkedDivisionId
    ? state.divisions?.find((d) => d.id === subServer.linkedDivisionId)
    : null;

  let formatText;
  let requirementsText;
  let extraOpenerNote = '';

  if (linkedDiv && subServer.category === 'DIVISI') {
    const guide = buildDivisionRegistrationGuide(linkedDiv, subServer, state);
    formatText = guide.formatText;
    requirementsText = guide.requirementsText;
    const isSoloHead = state.members.filter((m) => m.divisionId === linkedDiv.id).length <= 1;
    extraOpenerNote = isSoloHead
      ? ` Saat ini saya masih merintis satuan sendirian (${linkedDiv.dailyIntakeCount || 0}/${linkedDiv.dailyIntakeQuota || 3} kuota hari ini terisi) — yang belum berdivisi dan minimal Bripda, ayo masuk ke #registrasi!`
      : ` Kuota hari ini tersisa ${Math.max(0, (linkedDiv.dailyIntakeQuota || 3) - (linkedDiv.dailyIntakeCount || 0))} slot; pelamar lolos masuk Phase I–IV hingga Pelantikan Unit!`;
  } else {
    const { reqList } = checkSubServerEligibility(ownerMember, subServer, state);
    formatText = [
      `📋 FORMAT PENDAFTARAN [${subServer.shortCode}]:`,
      '• Nama IC / Username : [Nama Lengkap] (@username)',
      '• Pangkat & Divisi   : [Pangkat Saat Ini] / [Divisi]',
      '• Jam Aktif Patroli  : [Pagi / Siang / Malam]',
      `• Motivasi & Komitmen: [Alasan bergabung ke ${subServer.name}]`,
    ].join('\n');
    requirementsText = [
      `📌 SYARAT REKRUTMEN (${subServer.category}):`,
      ...reqList.map((r, i) => `${i + 1}. ${r}`),
      '4. Mematuhi hierarki Mabes & menjaga tata krama chat RP.',
    ].join('\n');
  }

  const opener =
    style.register === 'BAKU'
      ? `Assalamu'alaikum / Selamat ${getCircadianProfile(state.simSeconds).isNight ? 'malam' : 'bertugas'} rekan-rekan sejawat. Saya ${ownerMember.icName} (${rank.name}) selaku Ketua/Pengelola ${subServer.name} resmi membuka pendaftaran di channel #registrasi.${extraOpenerNote}`
      : style.register === 'SEMI'
        ? `Halo rekan-rekan! Saya ${ownerMember.icName} lagi buka rekrutmen resmi buat gabung ${subServer.name} [${subServer.shortCode}] lewat #registrasi nih.${extraOpenerNote}`
        : `Info nih bro/sis, ${subServer.name} lagi open recruitment!${extraOpenerNote} Langsung klik tautan & isi format di #registrasi ya.`;

  const regCh = (subServer.channels || []).find((c) => c.name === 'registrasi');
  return {
    text: opener,
    recruitInvite: {
      subServerId: subServer.id,
      subServerName: subServer.name,
      shortCode: subServer.shortCode,
      category: subServer.category,
      color: subServer.color,
      linkedDivisionId: linkedDiv?.id || null,
      targetChannelId: regCh?.id || subServer.channels?.[0]?.id || null,
      affiliatedToMain: Boolean(subServer.affiliatedToMain),
      inviteSlug: `discord.gg/izumiya-${subServer.shortCode.toLowerCase()}/registrasi`,
      formatText,
      requirementsText,
    },
  };
}
