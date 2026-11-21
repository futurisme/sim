import { clamp, getRankById } from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import { appendSubServerMessage } from './subServers.js';
import {
  ensureAkpolSubServer,
  getAkpolCohortStatus,
  getAkpolFormationSlotCoords,
  isMemberInAkpolSubServer,
  leadAkpolCohortDrill,
} from './akpolCohort.js';

export function getAcademyEnrolledCount(state) {
  return state.members.filter((m) => m.academyStatus === 'ENROLLED').length;
}

export function checkAcademyEligibility(member, state) {
  if (!member || !state.academy) {
    return { eligible: false, reasons: ['Data tidak valid'] };
  }
  const ac = state.academy;
  const reasons = [];
  if (!ac.isOpen) reasons.push('Pendaftaran Akademi sedang ditutup');
  if (member.academyStatus === 'ENROLLED') reasons.push('Sedang menempuh pendidikan');
  if (member.academyStatus === 'GRADUATED') reasons.push('Sudah lulus Akademi');

  const inSubAkpol = isMemberInAkpolSubServer(member, state);
  if (!inSubAkpol || !member.akpolRegistered) {
    reasons.push('Wajib gabung sub-server AKADEMI KEPOLISIAN & daftar di #registrasi dulu');
  }

  const enrolledCount = getAcademyEnrolledCount(state);
  if (enrolledCount >= (ac.quota || 4)) {
    reasons.push(`Kuota penuh (${enrolledCount}/${ac.quota})`);
  }

  const p = member.personality || { professionalism: 60, activityDrive: 60 };
  if (p.professionalism < (ac.minProfessionalism || 0)) {
    reasons.push(`Profesionalisme ${p.professionalism}% < ${ac.minProfessionalism}%`);
  }
  if (p.activityDrive < (ac.minActivityDrive || 0)) {
    reasons.push(`Keaktifan ${p.activityDrive}% < ${ac.minActivityDrive}%`);
  }
  if ((member.betahScore || 0) < (ac.minBetah || 0)) {
    reasons.push(`Betah ${Math.round(member.betahScore)}% < ${ac.minBetah}%`);
  }

  return { eligible: reasons.length === 0, reasons };
}

export function updateAcademySettings(state, patch) {
  if (!state.academy) return false;
  if (typeof patch.isOpen === 'boolean') state.academy.isOpen = patch.isOpen;
  if (patch.quota !== undefined) state.academy.quota = clamp(Math.round(Number(patch.quota) || 4), 2, 10);
  if (patch.minProfessionalism !== undefined) {
    state.academy.minProfessionalism = clamp(Math.round(Number(patch.minProfessionalism) || 35), 10, 90);
  }
  if (patch.minActivityDrive !== undefined) {
    state.academy.minActivityDrive = clamp(Math.round(Number(patch.minActivityDrive) || 40), 10, 90);
  }
  if (patch.minBetah !== undefined) {
    state.academy.minBetah = clamp(Math.round(Number(patch.minBetah) || 45), 10, 90);
  }
  if (patch.targetRankId) state.academy.targetRankId = patch.targetRankId;
  if (patch.graduateBonusXp !== undefined) {
    state.academy.graduateBonusXp = clamp(Math.round(Number(patch.graduateBonusXp) || 80), 20, 400);
  }
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function enrollMemberInAcademy(state, memberId, actorLabel = 'Kapolda') {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, reasons: ['Anggota tidak ditemukan'] };
  const check = checkAcademyEligibility(member, state);
  if (!check.eligible) {
    return { ok: false, reasons: check.reasons };
  }

  const slotIndex = getAcademyEnrolledCount(state);
  const coords = getAkpolFormationSlotCoords(slotIndex, state.academy?.quota || 4);

  member.academyStatus = 'ENROLLED';
  member.trainingProgress = 0;
  member.trainingSessions = 0;
  member.akpolRequestSent = false;
  member.aiState = 'TRAINING';
  member.needsWelcome = false;
  member.status = 'online-2d';
  member.targetX = coords.x;
  member.targetY = coords.y;

  const newTotal = getAcademyEnrolledCount(state);
  const quota = state.academy?.quota || 4;
  member.speechBubble = newTotal >= quota ? 'Kuota Penuh! Siap Baris!' : `Baris Akpol (${newTotal}/${quota})`;
  member.speechTimer = 2.8;
  member.betahScore = clamp(member.betahScore + 8, 0, 100);
  state.lastOwnerActionAt = state.simSeconds;

  const sub = ensureAkpolSubServer(state);
  if (sub) {
    if (!sub.memberIds.includes(member.id)) sub.memberIds.push(member.id);
    if (!sub.memberRoles) sub.memberRoles = {};
    sub.memberRoles[member.id] = {
      roleName: 'Taruna Akpol Aktif',
      color: '#0EA5E9',
      canManageSubServer: false,
      badge: `Angkatan Akpol`,
    };
    const boardCh = sub.channels.find((c) => c.name === 'papan-taruna');
    if (boardCh) {
      appendSubServerMessage(state, sub.id, boardCh.id, {
        authorId: 'system',
        authorName: 'Lemdiklat Akpol',
        authorRole: 'Diterima',
        authorColor: '#0EA5E9',
        isSystem: true,
        text: `${member.icName} lolos verifikasi #registrasi (disetujui ${actorLabel}). Posisi barisan: ${newTotal}/${quota} Taruna. ${newTotal >= quota ? 'Kuota terpenuhi! Segera kirim #request pelatih.' : 'Menunggu kuota angkatan penuh sebelum baris-berbaris serentak dimulai.'}`,
      });
    }
  }

  appendChannelMessage(state, 'akademi-lemdiklat', {
    authorId: 'system',
    authorName: 'Lemdiklat Akpol Izumiya',
    authorRole: 'Seleksi Lulus',
    authorColor: '#0EA5E9',
    isSystem: true,
    actionMemberId: member.id,
    text: `${member.icName} lolos #registrasi sub-server Akpol (oleh ${actorLabel}) [${newTotal}/${quota}]. Berbaris di Lapangan Akpol menunggu kuota penuh & pelatih!`,
  });

  return { ok: true, member };
}

export function educateAcademyCadet(state, cadetId, educatorMember = null, progressBoost = 24) {
  const cadet = state.members.find((m) => m.id === cadetId);
  if (!cadet || cadet.academyStatus !== 'ENROLLED') return false;

  const cohort = getAkpolCohortStatus(state);
  if (!cohort.quotaMet) {
    cadet.speechBubble = `Tunggu Kuota (${cohort.enrolledCadets.length}/${cohort.quota})`;
    cadet.speechTimer = 2.4;
    return false;
  }

  const res = leadAkpolCohortDrill(state, educatorMember, progressBoost);
  return Boolean(res.ok);
}

export function graduateCadetFromAcademy(state, cadetId, actorLabel = 'Kapolda / Lemdiklat') {
  const cadet = state.members.find((m) => m.id === cadetId);
  if (!cadet || cadet.academyStatus !== 'ENROLLED') return { ok: false };

  const ac = state.academy || { targetRankId: 'rank-bripda', graduateBonusXp: 85 };
  const targetRank = getRankById(state, ac.targetRankId);
  const currentRank = getRankById(state, cadet.rankId);

  cadet.academyStatus = 'GRADUATED';
  cadet.trainingProgress = 100;
  cadet.aiState = 'PATROL';
  cadet.xp += ac.graduateBonusXp || 85;
  cadet.betahScore = clamp(cadet.betahScore + 15, 0, 100);

  if (targetRank && !targetRank.isOwner && targetRank.order > currentRank.order) {
    cadet.rankId = targetRank.id;
    state.stats.promotionsGiven += 1;
  }

  if (!cadet.personality) {
    cadet.personality = { professionalism: 65, loyalty: 65, activityDrive: 65, ambition: 55, empathy: 65 };
  }
  cadet.personality.professionalism = clamp(cadet.personality.professionalism + 6, 20, 98);
  cadet.personality.loyalty = clamp(cadet.personality.loyalty + 6, 20, 98);
  cadet.personality.activityDrive = clamp(cadet.personality.activityDrive + 4, 20, 98);
  cadet.loyalty = clamp(cadet.loyalty + 8, 0, 100);

  if (!cadet.awards) cadet.awards = [];
  if (!cadet.awards.includes('srt-diklat')) cadet.awards.push('srt-diklat');
  if (!cadet.awards.includes('srt-baris')) cadet.awards.push('srt-baris');

  cadet.speechBubble = 'Lulus Akpol!';
  cadet.speechTimer = 3.2;
  state.academy.graduatesCount = (state.academy.graduatesCount || 0) + 1;
  state.reputation += 15;

  const finalRank = getRankById(state, cadet.rankId);
  const sub = ensureAkpolSubServer(state);
  if (sub) {
    sub.memberRoles[cadet.id] = {
      roleName: `Alumni Akpol · ${finalRank.name}`,
      color: '#23A55A',
      canManageSubServer: false,
      badge: 'Lulusan Akpol',
    };
    const boardCh = sub.channels.find((c) => c.name === 'papan-taruna');
    if (boardCh) {
      appendSubServerMessage(state, sub.id, boardCh.id, {
        authorId: 'system',
        authorName: 'SKep Kelulusan Akpol',
        authorRole: 'LULUS',
        authorColor: '#23A55A',
        isSystem: true,
        text: `SELAMAT! ${cadet.icName} LULUS baris-berbaris & diklat Akpol (dilantik ke ${finalRank.name} oleh ${actorLabel})!`,
      });
    }
  }

  appendChannelMessage(state, 'akademi-lemdiklat', {
    authorId: 'system',
    authorName: 'SKep Kelulusan Akpol',
    authorRole: 'LULUS',
    authorColor: '#23A55A',
    isSystem: true,
    text: `SELAMAT! ${cadet.icName} resmi LULUS Akademi Kepolisian oleh ${actorLabel} — dilantik ke pangkat ${finalRank.name} (+${ac.graduateBonusXp} XP, Sertifikat Diklat & PBB)! Kini memenuhi syarat mendaftar ke #registrasi divisi.`,
  });
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Lemdiklat Mabes',
    authorRole: 'Alumni Akpol',
    authorColor: '#0EA5E9',
    isSystem: true,
    text: `${cadet.icName} menyelesaikan pendidikan Akademi Kepolisian sebagai ${finalRank.name} dan siap mengikuti seleksi #registrasi & Phase Diklat divisi.`,
  });

  return { ok: true, rank: finalRank };
}

export function failCadetFromAcademy(
  state,
  cadetId,
  reason = 'Tidak memenuhi standar kelulusan Lemdiklat',
  actorLabel = 'Lemdiklat / Kapolda'
) {
  const cadet = state.members.find((m) => m.id === cadetId);
  if (!cadet || cadet.academyStatus !== 'ENROLLED') return false;

  cadet.academyStatus = 'FAILED';
  cadet.trainingProgress = 0;
  cadet.aiState = 'PATROL';
  cadet.xp = Math.max(0, cadet.xp - 15);
  cadet.betahScore = clamp(cadet.betahScore - 16, 0, 100);
  if (cadet.personality) {
    cadet.personality.loyalty = clamp(cadet.personality.loyalty - 5, 20, 98);
  }
  cadet.speechBubble = 'Gugur Akpol...';
  cadet.speechTimer = 2.8;

  if (state.academy) {
    state.academy.failedCount = (state.academy.failedCount || 0) + 1;
  }
  state.reputation = Math.max(0, state.reputation - 4);

  appendChannelMessage(state, 'akademi-lemdiklat', {
    authorId: 'system',
    authorName: 'Dewan Evaluasi Akpol',
    authorRole: 'GUGUR',
    authorColor: '#DA373C',
    isSystem: true,
    text: `${cadet.icName} dinyatakan GUGUR dari Akademi Kepolisian oleh ${actorLabel}. Alasan: ${reason}.`,
  });

  return true;
}
