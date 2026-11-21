import { DISTRICTS, SUB_SERVER_BLUEPRINTS } from '../constants.js';
import { getMemberEffectiveAuthorities } from '../aiBrain.js';
import { clamp, getRankById } from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import { appendSubServerMessage } from './subServers.js';

export const AKPOL_SUB_SERVER_ID = 'sub-akademi';

export function isPointInAkpol(x, y) {
  const d = DISTRICTS.find((dist) => dist.id === 'akademi');
  if (!d) return false;
  return x >= d.x - 10 && x <= d.x + d.w + 10 && y >= d.y - 10 && y <= d.y + d.h + 10;
}

export function getAkpolFormationSlotCoords(slotIndex, totalSlots = 4) {
  const d = DISTRICTS.find((dist) => dist.id === 'akademi') || { x: 965, y: 65, w: 295, h: 255 };
  const cols = Math.min(4, Math.max(2, totalSlots >= 4 ? 4 : totalSlots));
  const col = slotIndex % cols;
  const row = Math.floor(slotIndex / cols);
  const startX = d.x + (d.w - (cols - 1) * 52) * 0.5;
  return {
    x: startX + col * 52,
    y: d.y + 132 + row * 48,
    trainerX: d.x + d.w * 0.5,
    trainerY: d.y + 62,
  };
}

export function ensureAkpolSubServer(state) {
  if (!state) return null;
  if (!Array.isArray(state.subServers)) state.subServers = [];

  const blueprint = SUB_SERVER_BLUEPRINTS.find((b) => b.id === AKPOL_SUB_SERVER_ID);
  let sub = state.subServers.find((s) => s.id === AKPOL_SUB_SERVER_ID);

  const kalemdiklatHolder = (state.members || []).find((m) => m.billetId === 'billet-kalemdiklat');
  const kanitDiklatHolder = (state.members || []).find((m) => m.billetId === 'billet-instruktur');
  const defaultOwnerId = kalemdiklatHolder?.id || kanitDiklatHolder?.id || 'owner';

  if (!sub) {
    const channels = (blueprint?.channels || []).map((c) => ({ ...c }));
    const messages = {};
    const unreadByChannel = {};
    channels.forEach((c) => {
      messages[c.id] = [];
      unreadByChannel[c.id] = 0;
    });
    sub = {
      id: AKPOL_SUB_SERVER_ID,
      name: blueprint?.name || 'AKADEMI KEPOLISIAN',
      shortCode: blueprint?.shortCode || 'AKP',
      category: 'AKADEMI',
      color: blueprint?.color || '#0EA5E9',
      description:
        blueprint?.description ||
        'Sub-server wajib Akademi Kepolisian: gerbang #registrasi calon Taruna, #request pelatihan & baris-berbaris serentak.',
      ownerId: defaultOwnerId,
      linkedDivisionId: null,
      affiliatedToMain: true,
      ownerJoined: true,
      ownerWelcomed: true,
      memberIds: ['owner'],
      memberRoles: {},
      channels,
      messages,
      unreadByChannel,
    };
    state.subServers.push(sub);
  }

  if (!Array.isArray(sub.channels)) sub.channels = [];
  if (!sub.messages) sub.messages = {};
  if (!sub.unreadByChannel) sub.unreadByChannel = {};
  if (!Array.isArray(sub.memberIds)) sub.memberIds = ['owner'];
  if (!sub.memberRoles) sub.memberRoles = {};

  const requiredChannels = [
    {
      id: 'akpol-registrasi',
      name: 'registrasi',
      topic: 'Wajib daftar di sini sebelum resmi masuk Taruna Akpol. Format: Nama | Pangkat | Siap Baris-Berbaris.',
    },
    {
      id: 'akpol-request',
      name: 'request',
      topic: 'Channel Taruna Akpol memanggil Pelatih / Kalemdiklat untuk datang memimpin baris-berbaris serentak di Kampus Akpol.',
    },
    {
      id: 'akpol-pengumuman',
      name: 'papan-taruna',
      topic: 'Informasi kuota angkatan, jadwal baris-berbaris & pengumuman kelulusan.',
    },
    {
      id: 'akpol-bimbingan',
      name: 'bimbingan-lemdiklat',
      topic: 'Pembinaan etik, log latihan baris-berbaris & tanya jawab Taruna.',
    },
  ];

  for (let i = requiredChannels.length - 1; i >= 0; i--) {
    const req = requiredChannels[i];
    if (!sub.channels.some((c) => c.id === req.id || c.name === req.name)) {
      sub.channels.unshift({ ...req });
    }
    const match = sub.channels.find((c) => c.id === req.id || c.name === req.name);
    if (match) {
      if (!Array.isArray(sub.messages[match.id])) sub.messages[match.id] = [];
      if (typeof sub.unreadByChannel[match.id] !== 'number') sub.unreadByChannel[match.id] = 0;
    }
  }

  if (sub.ownerId !== 'owner' && !(state.members || []).some((m) => m.id === sub.ownerId)) {
    sub.ownerId = defaultOwnerId;
  }

  [kalemdiklatHolder, kanitDiklatHolder].filter(Boolean).forEach((mgr) => {
    if (!sub.memberIds.includes(mgr.id)) sub.memberIds.push(mgr.id);
    if (!sub.memberRoles[mgr.id] || typeof sub.memberRoles[mgr.id] !== 'object') {
      sub.memberRoles[mgr.id] = {
        roleName: mgr.billetId === 'billet-kalemdiklat' ? 'Gubernur Akpol (KALEMDIKLAT)' : 'Pelatih Utama (KANIT DIKLAT)',
        color: '#0EA5E9',
        canManageSubServer: true,
        badge: 'Pengelola Akpol',
      };
    } else {
      sub.memberRoles[mgr.id].canManageSubServer = true;
    }
  });

  const regCh = sub.channels.find((c) => c.name === 'registrasi');
  if (regCh && sub.messages[regCh.id].length === 0) {
    appendSubServerMessage(state, sub.id, regCh.id, {
      authorId: 'system',
      authorName: 'Lemdiklat Akpol',
      authorRole: 'Gerbang #registrasi',
      authorColor: '#0EA5E9',
      isSystem: true,
      text: '📌 GERBANG WAJIB TARUNA AKPOL: Anggota baru wajib bergabung ke sub-server AKADEMI KEPOLISIAN & mengisi pendaftaran di #registrasi sebelum dapat diterima sebagai Taruna.',
    });
  }

  const reqCh = sub.channels.find((c) => c.name === 'request');
  if (reqCh && sub.messages[reqCh.id].length === 0) {
    appendSubServerMessage(state, sub.id, reqCh.id, {
      authorId: 'system',
      authorName: 'Komando Lapangan Akpol',
      authorRole: 'Panggilan Pelatih',
      authorColor: '#22C55E',
      isSystem: true,
      text: '📢 #REQUEST PELATIHAN: Taruna yang sudah siap berbaris sesuai kuota wajib mengirim permintaan di sini agar Kalemdiklat / Pelatih datang memimpin baris-berbaris serentak di Kampus Akpol.',
    });
  }

  return sub;
}

export function isMemberInAkpolSubServer(memberOrId, state) {
  const memberId = typeof memberOrId === 'string' ? memberOrId : memberOrId?.id;
  if (!memberId || !state) return false;
  const sub = (state.subServers || []).find((s) => s.id === AKPOL_SUB_SERVER_ID);
  if (!sub) return false;
  return (sub.memberIds || []).includes(memberId) || sub.ownerId === memberId;
}

export function submitAkpolRegistration(state, memberId, customText = '') {
  const sub = ensureAkpolSubServer(state);
  const member = (state.members || []).find((m) => m.id === memberId);
  if (!sub || !member) return { ok: false, reason: 'Anggota atau sub-server Akpol tidak ditemukan' };

  if (!sub.memberIds.includes(member.id)) sub.memberIds.push(member.id);
  if (!sub.memberRoles) sub.memberRoles = {};
  if (!sub.memberRoles[member.id]) {
    sub.memberRoles[member.id] = {
      roleName: 'Pendaftar #registrasi Akpol',
      color: '#38BDF8',
      canManageSubServer: false,
      badge: 'Calon Taruna Akpol',
    };
  }

  const rank = getRankById(state, member.rankId);
  const regCh = sub.channels.find((c) => c.name === 'registrasi') || sub.channels[0];
  const regText =
    customText ||
    `[FORMULIR #REGISTRASI AKPOL]\nNama IC: ${member.icName} (@${member.username}) | Pangkat: ${rank.name}\nKomitmen: Siap mengikuti baris-berbaris serentak hingga kuota terpenuhi & arahan Pelatih Lemdiklat!`;

  if (regCh && !member.akpolRegistered) {
    appendSubServerMessage(state, sub.id, regCh.id, {
      authorId: member.id,
      authorName: member.icName,
      authorRole: `${rank.name} · Calon Taruna`,
      authorColor: rank.color,
      isOwner: false,
      text: regText,
    });
  }

  member.akpolRegistered = true;
  member.needsWelcome = false;
  member.betahScore = clamp((member.betahScore || 65) + 5, 0, 100);
  return { ok: true, subServer: sub, member };
}

export function getAkpolCohortStatus(state) {
  const enrolledCadets = (state?.members || []).filter((m) => m.academyStatus === 'ENROLLED');
  const onlineCadets = enrolledCadets.filter((m) => m.status === 'online-2d');
  const quota = Math.max(2, Number(state?.academy?.quota) || 4);
  const quotaMet = enrolledCadets.length >= quota;

  const activeTrainerAi = (state?.members || []).find((m) => {
    if (m.status !== 'online-2d' || (m.detainedRemaining || 0) > 0) return false;
    if (m.academyStatus === 'ENROLLED') return false;
    const perms = getMemberEffectiveAuthorities(m.id, state);
    const canTrain = Boolean(perms.canEducate || perms.canLeadAkpolDrill || perms.canRespondAkpolRequest);
    if (!canTrain) return false;
    return m.aiState === 'INSTRUCTING' || isPointInAkpol(m.x, m.y);
  }) || null;

  const playerAtAkpol = Boolean(state?.player && isPointInAkpol(state.player.x, state.player.y));
  const hasTrainer = Boolean(activeTrainerAi || playerAtAkpol);
  const trainerName = activeTrainerAi
    ? activeTrainerAi.icName
    : playerAtAkpol
      ? state.ownerName || 'Kapolda'
      : null;

  return {
    enrolledCadets,
    onlineCadets,
    quota,
    quotaMet,
    activeTrainerAi,
    playerAtAkpol,
    hasTrainer,
    trainerName,
    isDrilling: quotaMet && hasTrainer,
    waitingForQuota: enrolledCadets.length > 0 && !quotaMet,
    waitingForTrainer: quotaMet && !hasTrainer,
  };
}

export function postAkpolTrainingRequest(state, requesterId = null) {
  const sub = ensureAkpolSubServer(state);
  if (!sub) return { ok: false, reason: 'Sub-server Akpol belum siap' };

  const reqCh = sub.channels.find((c) => c.name === 'request') || sub.channels[0];
  const cohort = getAkpolCohortStatus(state);
  const requester =
    (requesterId && requesterId !== 'owner'
      ? (state.members || []).find((m) => m.id === requesterId)
      : null) ||
    cohort.enrolledCadets[0] ||
    null;

  if (!requester && requesterId !== 'owner') {
    return { ok: false, reason: 'Belum ada Taruna aktif untuk mengirim #request latihan' };
  }

  if (requester && !sub.memberIds.includes(requester.id)) {
    sub.memberIds.push(requester.id);
  }
  const rank = requester ? getRankById(state, requester.rankId) : null;
  const senderName = requester ? requester.icName : `${state.ownerName} (Komando)`;
  const senderRole = requester ? `Taruna Akpol · ${rank?.name || 'Taruna'}` : 'Inspektur Akpol';

  const statusNote = cohort.quotaMet
    ? `Kuota angkatan SUDAH PENUH (${cohort.enrolledCadets.length}/${cohort.quota} Taruna berbaris rapi di Lapangan Akpol).`
    : `Saat ini ${cohort.enrolledCadets.length}/${cohort.quota} Taruna berbaris menunggu kuota penuh & pendampingan pelatih.`;

  if (reqCh) {
    appendSubServerMessage(state, sub.id, reqCh.id, {
      authorId: requester ? requester.id : 'owner',
      authorName: senderName,
      authorRole: senderRole,
      authorColor: '#0EA5E9',
      isOwner: requesterId === 'owner',
      isAkpolRequest: true,
      text: `[REQUEST PELATIHAN AKPOL] @KALEMDIKLAT @KANIT_DIKLAT Mohon izin Pelatih hadir ke Lapangan Baris-Berbaris Kampus Akpol! ${statusNote} Siap menerima komando latihan serentak 🫡`,
    });
  }

  if (requester) requester.akpolRequestSent = true;
  if (state.academy) state.academy.lastRequestAt = state.simSeconds;

  return { ok: true, subServer: sub, channel: reqCh, cohort };
}

export function leadAkpolCohortDrill(state, trainerMemberOrNull = null, progressBoost = 26) {
  const status = getAkpolCohortStatus(state);
  if (status.enrolledCadets.length === 0) {
    return { ok: false, reason: 'BELUM_ADA_TARUNA', message: 'Belum ada Taruna di Akademi Kepolisian.' };
  }
  if (!status.quotaMet) {
    return {
      ok: false,
      reason: 'KUOTA_BELUM_PENUH',
      message: `Baris-berbaris belum bisa dimulai! Tunggu kuota penuh terlebih dahulu (${status.enrolledCadets.length}/${status.quota} Taruna).`,
    };
  }

  if (trainerMemberOrNull) {
    const perms = getMemberEffectiveAuthorities(trainerMemberOrNull.id, state);
    if (!perms.canEducate && !perms.canLeadAkpolDrill && !perms.canRespondAkpolRequest) {
      return { ok: false, reason: 'TIDAK_BERWENANG', message: 'Personel tidak memiliki izin melatih Akpol.' };
    }
  }

  const slots = getAkpolFormationSlotCoords(0, status.enrolledCadets.length);
  const edProf = trainerMemberOrNull ? (trainerMemberOrNull.personality?.professionalism ?? 70) : 94;
  const edEmp = trainerMemberOrNull ? (trainerMemberOrNull.personality?.empathy ?? 70) : 88;
  const qualityMult = clamp(0.75 + (edProf / 100) * 0.55, 0.75, 1.3);

  if (trainerMemberOrNull) {
    trainerMemberOrNull.aiState = 'INSTRUCTING';
    trainerMemberOrNull.targetX = slots.trainerX;
    trainerMemberOrNull.targetY = slots.trainerY;
    trainerMemberOrNull.waitTimer = 10;
    trainerMemberOrNull.speechBubble = 'Pimpin Baris-Berbaris!';
    trainerMemberOrNull.speechTimer = 3.0;
  }

  status.enrolledCadets.forEach((cadet, idx) => {
    const pos = getAkpolFormationSlotCoords(idx, status.enrolledCadets.length);
    cadet.aiState = 'TRAINING';
    cadet.targetX = pos.x;
    cadet.targetY = pos.y;
    cadet.trainingProgress = clamp((cadet.trainingProgress || 0) + progressBoost * qualityMult, 0, 100);
    cadet.trainingSessions = (cadet.trainingSessions || 0) + 1;
    cadet.xp += Math.round(14 * qualityMult);
    cadet.betahScore = clamp((cadet.betahScore || 60) + 5, 0, 100);
    if (!cadet.personality) {
      cadet.personality = { professionalism: 60, loyalty: 60, activityDrive: 60, ambition: 55, empathy: 60 };
    }
    cadet.personality.professionalism = clamp(cadet.personality.professionalism + (edProf >= 65 ? 4 : 2), 20, 98);
    cadet.personality.loyalty = clamp(cadet.personality.loyalty + 3, 20, 98);
    cadet.personality.activityDrive = clamp(cadet.personality.activityDrive + 3, 20, 98);
    cadet.personality.empathy = clamp(cadet.personality.empathy + (edEmp >= 65 ? 3 : 1), 20, 98);
    cadet.loyalty = clamp((cadet.loyalty || 60) + 3, 0, 100);
    cadet.speechBubble = `Baris ${Math.round(cadet.trainingProgress)}%`;
    cadet.speechTimer = 2.6;
  });

  const sub = ensureAkpolSubServer(state);
  const trainerLabel = trainerMemberOrNull ? trainerMemberOrNull.icName : `${state.ownerName} (Kapolda)`;
  const guideCh = sub?.channels?.find((c) => c.name === 'bimbingan-lemdiklat');
  if (sub && guideCh) {
    appendSubServerMessage(state, sub.id, guideCh.id, {
      authorId: trainerMemberOrNull ? trainerMemberOrNull.id : 'owner',
      authorName: trainerLabel,
      authorRole: trainerMemberOrNull ? 'Pelatih Akpol' : 'Inspektur Akpol',
      authorColor: '#22C55E',
      isOwner: !trainerMemberOrNull,
      text: `Baris-berbaris serentak ${status.enrolledCadets.length}/${status.quota} Taruna dipimpin langsung di Lapangan Kampus Akpol (+${Math.round(progressBoost * qualityMult)}% progres angkatan).`,
    });
  }

  appendChannelMessage(state, 'akademi-lemdiklat', {
    authorId: trainerMemberOrNull ? trainerMemberOrNull.id : 'owner',
    authorName: trainerLabel,
    authorRole: trainerMemberOrNull ? 'Pelatih Lemdiklat' : 'Inspektur Akpol',
    authorColor: '#22C55E',
    isOwner: !trainerMemberOrNull,
    text: `Latihan baris-berbaris serentak (${status.enrolledCadets.length}/${status.quota} Taruna) selesai dipimpin oleh ${trainerLabel}! Semua Taruna berbaris rapi & progres meningkat bersama.`,
  });

  return { ok: true, count: status.enrolledCadets.length, trainerName: trainerLabel };
}

export function stepAkpolCohortTick(state, dt) {
  const status = getAkpolCohortStatus(state);
  if (status.enrolledCadets.length === 0) return status;

  if (status.activeTrainerAi) {
    const trainerPos = getAkpolFormationSlotCoords(0, status.enrolledCadets.length);
    if (status.activeTrainerAi.aiState === 'INSTRUCTING') {
      status.activeTrainerAi.targetX = trainerPos.trainerX;
      status.activeTrainerAi.targetY = trainerPos.trainerY;
      if (Math.hypot(trainerPos.trainerX - status.activeTrainerAi.x, trainerPos.trainerY - status.activeTrainerAi.y) <= 18) {
        status.activeTrainerAi.angle = Math.PI / 2;
      }
    }
  }

  status.enrolledCadets.forEach((cadet, idx) => {
    if (cadet.status !== 'online-2d' || (cadet.detainedRemaining || 0) > 0) return;
    const pos = getAkpolFormationSlotCoords(idx, status.enrolledCadets.length);
    cadet.aiState = 'TRAINING';
    cadet.targetX = pos.x;
    cadet.targetY = pos.y;

    const atSlot = Math.hypot(pos.x - cadet.x, pos.y - cadet.y) <= 18;
    if (atSlot) {
      cadet.angle = -Math.PI / 2;
      if (status.isDrilling) {
        const p = cadet.personality || { activityDrive: 65 };
        const actMult = 0.85 + ((p.activityDrive || 65) / 100) * 0.3;
        cadet.trainingProgress = clamp((cadet.trainingProgress || 0) + dt * 2.8 * actMult, 0, 100);
        if (!cadet.speechTimer) {
          cadet.speechBubble = idx % 2 === 0 ? 'Siap Gerak!' : 'Baris Serentak!';
          cadet.speechTimer = 2.4;
        }
      } else if (!cadet.speechTimer) {
        cadet.speechBubble = status.waitingForQuota
          ? `Tunggu Kuota (${status.enrolledCadets.length}/${status.quota})`
          : 'Menunggu Pelatih!';
        cadet.speechTimer = 2.6;
      }
    }
  });

  return status;
}
