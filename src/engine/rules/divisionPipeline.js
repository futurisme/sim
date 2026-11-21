import {
  DIVISION_TRAINING_PHASES,
  DIVISION_UNIT_TEMPLATES,
  SUB_SERVER_BLUEPRINTS,
} from '../constants.js';
import {
  buildDivisionRegistrationGuide,
  buildDivisionRegistrationSubmission,
} from '../aiBrain.js';
import {
  clamp,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import {
  appendSubServerMessage,
  createSubServerRecord,
  ensureSubServerRegistrasiChannel,
} from './subServers.js';
import {
  ensureDivisionHead,
  sendOwnerDm,
} from './dmOwnership.js';

export function buildDivisionUnitBlueprint(division) {
  const assignType = division?.dutyProfile?.assignmentType || 'GENERAL_PATROL';
  const templates = DIVISION_UNIT_TEMPLATES[assignType] || DIVISION_UNIT_TEMPLATES.GENERAL_PATROL;
  return templates.map((u) => ({
    id: `${division.id}-${u.id}`,
    name: u.name,
    roleTitle: u.roleTitle,
    subUnits: u.subUnits.map((su) => ({
      id: `${division.id}-${su.id}`,
      name: su.name,
      roleTitle: su.roleTitle,
      quota: su.quota,
      assignedMemberIds: [],
    })),
  }));
}

export function ensureDivisionSubServerAndRegistrasi(state, division, headMember = null) {
  if (!division) return null;
  if (!Array.isArray(state.subServers)) state.subServers = [];
  let sub = state.subServers.find((s) => s.linkedDivisionId === division.id && s.category === 'DIVISI');
  const head = headMember || (division.headId ? state.members.find((m) => m.id === division.headId) : null);

  if (!sub) {
    const blueprintMatch = /brimob/i.test(division.name)
      ? SUB_SERVER_BLUEPRINTS.find((b) => b.id === 'sub-brimob')
      : null;
    const isNameTaken = (n) => state.subServers.some((s) => s.name.toLowerCase() === n.toLowerCase());
    const targetName = blueprintMatch && !isNameTaken(blueprintMatch.name)
      ? blueprintMatch.name
      : isNameTaken(`DIVISI ${division.name.toUpperCase()}`)
        ? `SATUAN ${division.name.toUpperCase()} (${division.callsign})`
        : `DIVISI ${division.name.toUpperCase()}`;

    const regChId = `${division.id}-registrasi`;
    const channels = blueprintMatch && !isNameTaken(blueprintMatch.name)
      ? blueprintMatch.channels.map((c) => ({ ...c }))
      : [
          { id: regChId, name: 'registrasi', topic: `Pendaftaran calon anggota ${division.name} sesuai format divisi & seleksi Phase I–IV.` },
          { id: `${division.id}-pengumuman`, name: 'pengumuman-divisi', topic: `Arahan Ketua ${division.name} & jadwal Pelantikan.` },
          { id: `${division.id}-koordinasi`, name: 'ruang-unit', topic: `Koordinasi Unit & Sub-Unit internal ${division.name}.` },
        ];

    sub = createSubServerRecord(state, {
      name: targetName,
      shortCode: division.callsign,
      category: 'DIVISI',
      color: division.color,
      description: `Sub-Server resmi Divisi ${division.name} — pendaftaran #registrasi, Diklat Phase I–IV & penempatan Unit.`,
      ownerId: head?.id || 'owner',
      linkedDivisionId: division.id,
      affiliate: head ? Boolean(head.personalAuthority?.canAffiliateServer) : true,
      channels,
    });
  }

  if (sub) {
    const regCh = ensureSubServerRegistrasiChannel(sub);
    if (division.viceHeadId && state.members.some((m) => m.id === division.viceHeadId)) {
      if (!sub.memberIds.includes(division.viceHeadId)) sub.memberIds.push(division.viceHeadId);
      sub.memberRoles[division.viceHeadId] = {
        roleName: `WAKADIV ${division.callsign}`,
        color: division.color,
        canManageSubServer: true,
        badge: `Pimpinan ${division.callsign}`,
      };
    }
    if (regCh && (!sub.messages?.[regCh.id] || sub.messages[regCh.id].length === 0)) {
      const guide = buildDivisionRegistrationGuide(division, sub, state);
      appendSubServerMessage(state, sub.id, regCh.id, {
        authorId: head?.id || 'system',
        authorName: head ? head.icName : `KADIV ${division.name}`,
        authorRole: `KADIV ${division.callsign}`,
        authorColor: division.color,
        isSystem: !head,
        text: `📌 PAPAN RESMI #REGISTRASI ${division.name.toUpperCase()} [${division.callsign}]\n${guide.requirementsText}\n\n${guide.formatText}`,
      });
    }
  }
  return sub;
}

export function createDivisionProposalAndSendDm(state, divisionId, proposerId = null, dailyQuota = null) {
  const div = getDivisionById(state, divisionId);
  if (!div) return null;
  if (!Array.isArray(state.divisionProposals)) state.divisionProposals = [];

  const existingPending = state.divisionProposals.find((p) => p.divisionId === div.id && p.status === 'PENDING');
  if (existingPending) return existingPending;

  const head = (proposerId ? state.members.find((m) => m.id === proposerId) : null) || ensureDivisionHead(state, div);
  if (!head) return null;

  const currentDay = Math.floor((state.simSeconds || 0) / 86400);
  const resolvedQuota = clamp(Math.round(Number(dailyQuota) || div.dailyIntakeQuota || 3), 1, 20);
  div.dailyIntakeQuota = resolvedQuota;
  if (div.lastQuotaDay !== currentDay) {
    div.dailyIntakeCount = 0;
    div.lastQuotaDay = currentDay;
  }

  const units = buildDivisionUnitBlueprint(div);
  const proposal = {
    id: `prop-${++state.nextId}`,
    divisionId: div.id,
    divisionName: div.name,
    divisionCallsign: div.callsign,
    divisionColor: div.color,
    proposerId: head.id,
    proposerName: head.icName,
    dailyQuota: resolvedQuota,
    units,
    status: 'PENDING',
    createdAtSec: state.simSeconds,
    decidedAtSec: null,
    reviewerNote: '',
  };

  state.divisionProposals.push(proposal);
  div.proposalStatus = 'PENDING';

  const unitSummary = units
    .map(
      (u, idx) =>
        `${idx + 1}. ${u.name} (${u.roleTitle})\n` +
        u.subUnits.map((su) => `   • ${su.name} [0/${su.quota}]`).join('\n')
    )
    .join('\n');

  const permCount = state.members.filter((m) => m.divisionId === div.id).length;
  const soloNote =
    permCount <= 1
      ? `Saat ini saya masih merintis Divisi ${div.name} sendirian (solo). `
      : `Saat ini divisi memiliki ${permCount} anggota aktif. `;

  const dmText =
    `Mohon izin menghadap Kapolda 🙏\n` +
    `${soloNote}Saya selaku Ketua Divisi ${div.name} (${div.callsign}) telah menetapkan kuota penerimaan hari ini sebanyak ${resolvedQuota} slot dan mengajukan Proposal Rancangan Unit & Sub-Unit:\n\n` +
    `${unitSummary}\n\n` +
    `Jika Kapolda menyetujui rancangan ini, saya akan membuka #registrasi di sub-server divisi & rutin membagikan link undangan ke Lobi!`;

  sendOwnerDm(state, {
    peerId: head.id,
    senderId: head.id,
    text: dmText,
    proposalId: proposal.id,
    divisionId: div.id,
  });

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'DM Masuk Kapolda',
    authorRole: `Proposal ${div.callsign}`,
    authorColor: div.color,
    isSystem: true,
    text: `${head.icName} (Ketua ${div.name}) mengirim DM Proposal Kuota Harian (${resolvedQuota} slot) & Rancangan Unit/Sub-Unit ke Kotak Masuk Kapolda untuk disetujui.`,
  });

  return proposal;
}

export function respondDivisionProposal(state, proposalId, approved, reviewerNote = '', actorLabel = null) {
  const proposal = (state.divisionProposals || []).find((p) => p.id === proposalId);
  const div = proposal ? getDivisionById(state, proposal.divisionId) : null;
  if (!proposal || !div) return { ok: false, reason: 'Proposal tidak ditemukan' };

  const ownerLabel = actorLabel || state.ownerName;
  const head = state.members.find((m) => m.id === proposal.proposerId) || ensureDivisionHead(state, div);
  proposal.decidedAtSec = state.simSeconds;
  proposal.reviewerNote = reviewerNote || (approved ? 'Disetujui Kapolda' : 'Perlu revisi');
  state.lastOwnerActionAt = state.simSeconds;

  if (approved) {
    proposal.status = 'APPROVED';
    div.proposalStatus = 'APPROVED';
    div.units = proposal.units;
    div.recruitmentOpen = true;
    div.dailyIntakeQuota = proposal.dailyQuota || div.dailyIntakeQuota || 3;
    div.dailyIntakeCount = 0;

    const sub = ensureDivisionSubServerAndRegistrasi(state, div, head);
    const regCh = sub ? ensureSubServerRegistrasiChannel(sub) : null;
    if (sub && regCh) {
      const guide = buildDivisionRegistrationGuide(div, sub, state);
      const unitNames = (div.units || []).map((u) => u.name).join(' & ');
      appendSubServerMessage(state, sub.id, regCh.id, {
        authorId: head?.id || 'system',
        authorName: head ? head.icName : `KADIV ${div.name}`,
        authorRole: head ? `KADIV ${div.callsign}` : `Pimpinan ${div.callsign}`,
        authorColor: div.color,
        isSystem: !head,
        text: `[PENDAFTARAN #REGISTRASI RESMI DIBUKA]\nKuota Hari Ini: ${div.dailyIntakeQuota} slot · Syarat: Lulus Akpol (Min. Bripda, Bukan Taruna) · Unit Tujuan: ${unitNames || div.name}.\nAlur: Kirim Format -> Seleksi Berkas -> Diklat Phase I–IV -> Pelantikan Unit.\n\n${guide.formatText}`,
      });
    }

    if (head) {
      sendOwnerDm(state, {
        peerId: head.id,
        senderId: 'owner',
        text: `ACC / Disetujui (${ownerLabel}). Silakan buka #registrasi sub-server ${div.name}, sebar link rutin sesuai format khusus divisi, seleksi hingga Phase I–IV, dan isi kekosongan Unit/Sub-Unit sesuai rancangan!`,
        divisionId: div.id,
      });
      sendOwnerDm(state, {
        peerId: head.id,
        senderId: head.id,
        text: `Siap dilaksanakan Kapolda! Sub-server ${sub?.name || div.name} (#registrasi) sudah aktif dan saya segera bagikan tautan rekrutmen rutin untuk menjaring personel non-Taruna yang memenuhi syarat.`,
        divisionId: div.id,
      });
    }

    appendChannelMessage(state, 'pengumuman-mabes', {
      authorId: 'system',
      authorName: 'SKep Pembukaan Divisi',
      authorRole: `ACC ${div.callsign}`,
      authorColor: div.color,
      isSystem: true,
      text: `Proposal Rancangan Unit & Sub-Unit Divisi ${div.name} (${div.callsign}) resmi DISETUJUI oleh ${ownerLabel}! Pendaftaran dibuka di sub-server #registrasi (Kuota Hari Ini: ${div.dailyIntakeQuota} slot).`,
    });

    state.reputation += 8;
    return { ok: true, status: 'APPROVED', proposal, subServer: sub };
  }

  proposal.status = 'REJECTED';
  div.proposalStatus = 'NONE';
  div.recruitmentOpen = false;
  if (head) {
    sendOwnerDm(state, {
      peerId: head.id,
      senderId: 'owner',
      text: `Proposal Unit/Sub-Unit ${div.name} sementara belum disetujui (${proposal.reviewerNote}). Silakan sesuaikan kuota/rancangan sebelum mengajukan ulang.`,
      divisionId: div.id,
    });
  }
  return { ok: true, status: 'REJECTED', proposal };
}

export function checkDivisionCandidateEligibility(candidate, division, state) {
  const guide = buildDivisionRegistrationGuide(division, null, state);
  const reasons = [];
  if (!candidate || !division) {
    return { eligible: false, reasons: ['Data kandidat/divisi tidak valid'], guide };
  }
  if (candidate.divisionId === division.id) {
    reasons.push(`Sudah tercatat sebagai anggota tetap ${division.name}`);
  }
  if (candidate.needsWelcome) {
    reasons.push('Belum terverifikasi di Lobi Rekrutmen Mabes');
  }
  const rank = getRankById(state, candidate.rankId);
  if ((rank?.order || 1) < guide.minRankOrder) {
    reasons.push(`Pangkat masih ${rank?.name || 'Taruna'} — harus lulus Diklat Akpol & minimal Bripda`);
  }
  if (candidate.academyStatus === 'ENROLLED') {
    reasons.push('Sedang berstatus Taruna aktif di Akademi Kepolisian');
  }
  if (division.proposalStatus !== 'APPROVED' || !division.recruitmentOpen) {
    reasons.push('Pendaftaran divisi belum dibuka / belum disetujui Kapolda');
  }
  if ((division.dailyIntakeCount || 0) >= (division.dailyIntakeQuota || 3)) {
    reasons.push(`Kuota penerimaan harian (${division.dailyIntakeCount}/${division.dailyIntakeQuota}) sudah penuh`);
  }
  const divMembersCount = state.members.filter((m) => m.divisionId === division.id).length;
  if (divMembersCount >= (division.quota || 10)) {
    reasons.push(`Kapasitas total Divisi ${division.name} sudah penuh`);
  }

  const p = candidate.personality || { professionalism: 60, loyalty: 60, activityDrive: 60 };
  if (p.professionalism < guide.minProf) {
    reasons.push(`Profesionalisme ${Math.round(p.professionalism)}% < ${guide.minProf}%`);
  }
  if ((candidate.loyalty ?? p.loyalty) < guide.minLoyalty) {
    reasons.push(`Loyalitas ${Math.round(candidate.loyalty ?? p.loyalty)}% < ${guide.minLoyalty}%`);
  }
  if (p.activityDrive < guide.minActivity) {
    reasons.push(`Keaktifan ${Math.round(p.activityDrive)}% < ${guide.minActivity}%`);
  }
  if ((candidate.violationCount || 0) >= 2 && guide.assignType === 'INTERNAL_SECURITY') {
    reasons.push('Memiliki rekam pelanggaran disiplin (>= 2x)');
  }

  return { eligible: reasons.length === 0, reasons, guide };
}

export function submitDivisionRegistration(state, candidateId, divisionId, customFormText = '') {
  const candidate = state.members.find((m) => m.id === candidateId);
  const div = getDivisionById(state, divisionId);
  if (!candidate || !div) return { ok: false, reason: 'Kandidat atau divisi tidak ditemukan' };
  if (!Array.isArray(state.divisionRecruits)) state.divisionRecruits = [];

  const existingActive = state.divisionRecruits.find(
    (r) => r.memberId === candidate.id && r.divisionId === div.id && r.stage !== 'REJECTED' && r.stage !== 'INAUGURATED'
  );
  if (existingActive) return { ok: false, reason: 'Sudah memiliki berkas aktif di divisi ini', recruit: existingActive };

  const head = ensureDivisionHead(state, div);
  const sub = ensureDivisionSubServerAndRegistrasi(state, div, head);
  const regCh = ensureSubServerRegistrasiChannel(sub);

  if (sub && !sub.memberIds.includes(candidate.id)) {
    sub.memberIds.push(candidate.id);
    if (!sub.memberRoles) sub.memberRoles = {};
    sub.memberRoles[candidate.id] = {
      roleName: 'Calon Pendaftar (#registrasi)',
      color: '#94A3B8',
      canManageSubServer: false,
      canAffiliate: false,
      badge: 'Pendaftar Divisi',
    };
  }

  const formText = customFormText || buildDivisionRegistrationSubmission(candidate, div, sub, state);
  const rank = getRankById(state, candidate.rankId);

  if (sub && regCh) {
    appendSubServerMessage(state, sub.id, regCh.id, {
      authorId: candidate.id,
      authorName: candidate.icName,
      authorRole: `${rank.name} · Calon ${div.callsign}`,
      authorColor: rank.color,
      isOwner: false,
      text: formText,
    });
  }

  let preferredSubUnitId = null;
  for (const u of div.units || []) {
    const vacant = (u.subUnits || []).find((su) => (su.assignedMemberIds?.length || 0) < (su.quota || 2));
    if (vacant) {
      preferredSubUnitId = vacant.id;
      break;
    }
  }

  const recruit = {
    id: `rec-${++state.nextId}`,
    memberId: candidate.id,
    memberName: candidate.icName,
    divisionId: div.id,
    subServerId: sub?.id || null,
    stage: 'APPLIED',
    phaseProgress: 0,
    preferredSubUnitId,
    formText,
    feedback: '',
    createdAtSec: state.simSeconds,
  };
  state.divisionRecruits.push(recruit);
  return { ok: true, recruit, subServer: sub };
}

export function evaluateDivisionCandidate(state, recruitId, evaluatorId = null) {
  const recruit = (state.divisionRecruits || []).find((r) => r.id === recruitId);
  if (!recruit || recruit.stage !== 'APPLIED') return { ok: false, reason: 'Berkas tidak berstatus APPLIED' };

  const candidate = state.members.find((m) => m.id === recruit.memberId);
  const div = getDivisionById(state, recruit.divisionId);
  const sub = (state.subServers || []).find((s) => s.id === recruit.subServerId);
  const evaluator =
    (evaluatorId ? state.members.find((m) => m.id === evaluatorId) : null) ||
    (div ? ensureDivisionHead(state, div) : null);

  if (!candidate || !div) {
    recruit.stage = 'REJECTED';
    recruit.feedback = 'Data personel tidak aktif';
    return { ok: false, stage: 'REJECTED' };
  }

  const check = checkDivisionCandidateEligibility(candidate, div, state);
  const regCh = sub ? ensureSubServerRegistrasiChannel(sub) : null;
  const evalName = evaluator ? evaluator.icName : `Ketua ${div.name}`;
  const evalRole = evaluator ? `${getRankById(state, evaluator.rankId).name} · Ketua ${div.callsign}` : `Petinggi ${div.callsign}`;

  if (!check.eligible) {
    recruit.stage = 'REJECTED';
    recruit.feedback = check.reasons[0] || 'Belum memenuhi syarat divisi';
    if (sub && candidate.divisionId !== div.id) {
      sub.memberIds = (sub.memberIds || []).filter((id) => id !== candidate.id);
      if (sub.memberRoles) delete sub.memberRoles[candidate.id];
    }
    if (sub && regCh) {
      appendSubServerMessage(state, sub.id, regCh.id, {
        authorId: evaluator?.id || 'system',
        authorName: evalName,
        authorRole: evalRole,
        authorColor: '#DA373C',
        isSystem: !evaluator,
        text: `[HASIL SELEKSI DITOLAK] @${candidate.icName}: Berkas #registrasi belum dapat diterima karena ${check.reasons.join('; ')}.`,
      });
    }
    return { ok: true, stage: 'REJECTED', reasons: check.reasons };
  }

  recruit.stage = 'PHASE_1';
  recruit.phaseProgress = 12;
  recruit.feedback = 'Berkas disetujui — memasuki Diklat Phase I';
  div.dailyIntakeCount = (div.dailyIntakeCount || 0) + 1;

  if (sub) {
    if (!sub.memberIds.includes(candidate.id)) sub.memberIds.push(candidate.id);
    if (!sub.memberRoles) sub.memberRoles = {};
    sub.memberRoles[candidate.id] = {
      roleName: 'Calon Diklat · Phase I',
      color: '#F59E0B',
      canManageSubServer: false,
      canAffiliate: false,
      badge: `Taruna ${div.callsign} Phase I`,
    };
  }
  candidate.betahScore = clamp(candidate.betahScore + 6, 0, 100);
  candidate.speechBubble = `Lolos Seleksi ${div.callsign}!`;
  candidate.speechTimer = 2.6;

  if (sub && regCh) {
    appendSubServerMessage(state, sub.id, regCh.id, {
      authorId: evaluator?.id || 'system',
      authorName: evalName,
      authorRole: evalRole,
      authorColor: div.color,
      isSystem: !evaluator,
      text: `[BERKAS DITERIMA] Selamat @${candidate.icName}! Kamu lolos seleksi #registrasi ${div.name} (Slot ${div.dailyIntakeCount}/${div.dailyIntakeQuota}) dan resmi memulai PHASE I: Orientasi & Kode Etik.`,
    });
  }
  return { ok: true, stage: 'PHASE_1', recruit };
}

export function assignInauguratedToSubUnit(state, memberId, divisionId, preferredSubUnitId = null) {
  const member = state.members.find((m) => m.id === memberId);
  const div = getDivisionById(state, divisionId);
  if (!member || !div) return null;

  if (!Array.isArray(div.units) || div.units.length === 0) {
    div.units = buildDivisionUnitBlueprint(div);
  }

  div.units.forEach((u) => {
    (u.subUnits || []).forEach((su) => {
      if (!Array.isArray(su.assignedMemberIds)) su.assignedMemberIds = [];
      su.assignedMemberIds = su.assignedMemberIds.filter((id) => id !== member.id);
    });
  });

  let chosenUnit = null;
  let chosenSubUnit = null;

  if (preferredSubUnitId) {
    for (const u of div.units) {
      const match = (u.subUnits || []).find(
        (su) => su.id === preferredSubUnitId && su.assignedMemberIds.length < (su.quota || 2)
      );
      if (match) {
        chosenUnit = u;
        chosenSubUnit = match;
        break;
      }
    }
  }

  if (!chosenSubUnit) {
    for (const u of div.units) {
      const vacant = (u.subUnits || []).find((su) => su.assignedMemberIds.length < (su.quota || 2));
      if (vacant) {
        chosenUnit = u;
        chosenSubUnit = vacant;
        break;
      }
    }
  }

  if (!chosenSubUnit && div.units[0]?.subUnits?.[0]) {
    chosenUnit = div.units[0];
    chosenSubUnit = div.units[0].subUnits[0];
  }

  if (chosenUnit && chosenSubUnit) {
    chosenSubUnit.assignedMemberIds.push(member.id);
    member.divisionUnitId = chosenUnit.id;
    member.divisionSubUnitId = chosenSubUnit.id;
    member.divisionUnitRole = chosenSubUnit.roleTitle;
  }

  return { unit: chosenUnit, subUnit: chosenSubUnit };
}

export function advanceDivisionTraineePhase(state, recruitId, evaluatorId = null, progressDelta = 34) {
  const recruit = (state.divisionRecruits || []).find((r) => r.id === recruitId);
  if (!recruit) return { ok: false, reason: 'Peserta diklat tidak ditemukan' };
  if (recruit.stage === 'APPLIED' || recruit.stage === 'REJECTED' || recruit.stage === 'INAUGURATED') {
    return { ok: false, reason: 'Status peserta tidak dalam Phase I–IV' };
  }

  const candidate = state.members.find((m) => m.id === recruit.memberId);
  const div = getDivisionById(state, recruit.divisionId);
  const sub = (state.subServers || []).find((s) => s.id === recruit.subServerId);
  if (!candidate || !div) return { ok: false, reason: 'Kandidat/divisi tidak valid' };

  const evaluator =
    (evaluatorId ? state.members.find((m) => m.id === evaluatorId) : null) ||
    ensureDivisionHead(state, div);
  const regCh = sub ? ensureSubServerRegistrasiChannel(sub) : null;
  const evalName = evaluator ? evaluator.icName : `Ketua ${div.name}`;
  const evalRole = evaluator ? `${getRankById(state, evaluator.rankId).name} · Ketua ${div.callsign}` : `Petinggi ${div.callsign}`;

  const prevStage = recruit.stage;
  recruit.phaseProgress = clamp((recruit.phaseProgress || 0) + (Number(progressDelta) || 34), 0, 100);

  let nextStage = prevStage;
  if (recruit.phaseProgress >= 100) nextStage = 'INAUGURATED';
  else if (recruit.phaseProgress >= 75) nextStage = 'PHASE_4';
  else if (recruit.phaseProgress >= 50) nextStage = 'PHASE_3';
  else if (recruit.phaseProgress >= 25) nextStage = 'PHASE_2';
  else nextStage = 'PHASE_1';

  recruit.stage = nextStage;
  candidate.xp += 10;
  candidate.betahScore = clamp(candidate.betahScore + 2.5, 0, 100);

  if (nextStage === 'INAUGURATED') {
    candidate.divisionId = div.id;
    candidate.needsWelcome = false;
    candidate.xp += 35;
    candidate.betahScore = clamp(candidate.betahScore + 12, 0, 100);
    candidate.status = 'online-2d';
    candidate.speechBubble = `Dilantik ${div.callsign}!`;
    candidate.speechTimer = 3.2;
    state.reputation += 8;

    const placement = assignInauguratedToSubUnit(state, candidate.id, div.id, recruit.preferredSubUnitId);
    const subUnitLabel = placement?.subUnit ? `${placement.subUnit.name} (${placement.subUnit.roleTitle})` : `Unit Utama ${div.name}`;

    if (sub) {
      if (!sub.memberIds.includes(candidate.id)) sub.memberIds.push(candidate.id);
      if (!sub.memberRoles) sub.memberRoles = {};
      sub.memberRoles[candidate.id] = {
        roleName: `Anggota Tetap · ${placement?.subUnit?.roleTitle || div.callsign}`,
        color: div.color,
        canManageSubServer: false,
        canAffiliate: false,
        badge: placement?.unit?.name || div.name,
      };
    }

    if (sub && regCh) {
      appendSubServerMessage(state, sub.id, regCh.id, {
        authorId: evaluator?.id || 'system',
        authorName: evalName,
        authorRole: evalRole,
        authorColor: '#23A55A',
        isSystem: !evaluator,
        text: `[PELANTIKAN RESMI] Selamat @${candidate.icName}! Lulus Phase I–IV dan resmi menjadi ANGGOTA TETAP ${div.name}, ditugaskan mengisi kekosongan pada ${subUnitLabel}!`,
      });
    }

    appendChannelMessage(state, 'pengumuman-mabes', {
      authorId: 'system',
      authorName: `Pelantikan ${div.callsign}`,
      authorRole: 'Anggota Tetap & Unit',
      authorColor: div.color,
      isSystem: true,
      text: `${candidate.icName} resmi menyelesaikan Phase I–IV & dilantik menjadi anggota tetap Divisi ${div.name} pada jabatan ${subUnitLabel}!`,
    });

    return { ok: true, stage: 'INAUGURATED', recruit, placement };
  }

  if (nextStage !== prevStage) {
    const phaseMeta = DIVISION_TRAINING_PHASES.find((p) => p.id === nextStage);
    if (sub && sub.memberRoles?.[candidate.id]) {
      const existing = sub.memberRoles[candidate.id];
      if (typeof existing === 'object') {
        existing.roleName = `Calon Diklat · ${phaseMeta?.shortLabel || nextStage}`;
        existing.badge = `Taruna ${div.callsign} ${phaseMeta?.shortLabel || nextStage}`;
      } else {
        sub.memberRoles[candidate.id] = {
          roleName: `Calon Diklat · ${phaseMeta?.shortLabel || nextStage}`,
          color: '#F59E0B',
          badge: `Taruna ${div.callsign} ${phaseMeta?.shortLabel || nextStage}`,
        };
      }
    }
    if (sub && regCh) {
      appendSubServerMessage(state, sub.id, regCh.id, {
        authorId: evaluator?.id || 'system',
        authorName: evalName,
        authorRole: evalRole,
        authorColor: '#F59E0B',
        isSystem: !evaluator,
        text: `[PROGRES DIKLAT] @${candidate.icName} naik ke ${phaseMeta?.label || nextStage} (${Math.round(recruit.phaseProgress)}%). ${phaseMeta?.desc || ''}`,
      });
    }
  }

  return { ok: true, stage: nextStage, recruit };
}
