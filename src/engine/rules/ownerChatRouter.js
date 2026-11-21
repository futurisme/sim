import {
  BILLET_EXPANSION_POOL,
  DIVISION_EXPANSION_POOL,
  RANK_EXPANSION_POOL,
  ROAD_X,
  ROAD_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants.js';
import {
  buildContextualAiReply,
  computeSpeechStyle,
  getCircadianProfile,
  getDistrictCoordinates,
  parseOwnerNaturalCommand,
} from '../aiBrain.js';
import {
  clamp,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import {
  arrestMemberToPrison,
  releaseMemberFromPrison,
  setDivisionDutyProfile,
  setDivisionQuota,
  togglePropamGate,
} from './propamSecurity.js';
import {
  assignMemberDivision,
  createBilletRecord,
  createDivisionRecord,
  createRankRecord,
  demoteMember,
  kickMember,
  promoteMember,
} from './orgHierarchy.js';
import {
  enrollMemberInAcademy,
  failCadetFromAcademy,
  graduateCadetFromAcademy,
} from './academy.js';
import {
  getAkpolCohortStatus,
  leadAkpolCohortDrill,
  postAkpolTrainingRequest,
} from './akpolCohort.js';
import {
  affiliateSubServer,
  appendSubServerMessage,
  createSubServerRecord,
  joinSubServerAsOwner,
  postSubServerRecruitmentInvite,
} from './subServers.js';
import { markDmRead, sendOwnerDm } from './dmOwnership.js';
import { respondDivisionProposal } from './divisionPipeline.js';

export function processOwnerDmMessage(state, peerId, rawText) {
  const text = (rawText || '').trim();
  if (!text || !peerId) return { sent: false, replies: [] };
  const peer = state.members.find((m) => m.id === peerId);
  if (!peer) return { sent: false, replies: [] };

  state.lastOwnerActionAt = state.simSeconds;
  markDmRead(state, peerId);

  sendOwnerDm(state, {
    peerId,
    senderId: 'owner',
    text,
    divisionId: peer.divisionId || null,
  });

  const pendingProp = (state.divisionProposals || []).find(
    (p) => p.proposerId === peerId && p.status === 'PENDING'
  );
  const norm = text.toLowerCase();
  const replies = [];

  if (pendingProp && /\b(acc|setuju|setujui|ok|oke|lanjut|gas|izinkan|approved?)\b/i.test(norm)) {
    respondDivisionProposal(state, pendingProp.id, true, 'Disetujui Kapolda via DM', state.ownerName);
    return { sent: true, intent: 'APPROVE_DIVISION_PROPOSAL', replies };
  }
  if (pendingProp && /\b(tolak|batal|jangan|revisi|tunda)\b/i.test(norm)) {
    respondDivisionProposal(state, pendingProp.id, false, text, state.ownerName);
    return { sent: true, intent: 'REJECT_DIVISION_PROPOSAL', replies };
  }

  const div = getDivisionById(state, peer.divisionId);
  const rank = getRankById(state, peer.rankId);
  let replyText = `Siap Kapolda! Selaku ${rank.name}${div ? ` di ${div.name}` : ''}, arahan Anda lewat DM sudah saya catat dan siap dijalankan.`;
  if (div && /(kuota|proposal|unit|sub|registrasi|rekrut)/i.test(norm)) {
    replyText =
      div.proposalStatus === 'APPROVED'
        ? `Laporan Divisi ${div.name}: Kuota hari ini ${div.dailyIntakeCount || 0}/${div.dailyIntakeQuota || 3} terisi, link #registrasi aktif dibagikan ke Lobi!`
        : div.proposalStatus === 'PENDING'
          ? `Proposal Rancangan Unit & Sub-Unit ${div.name} masih menunggu persetujuan Kapolda lewat kartu DM di atas ya Komandan 🙏`
          : `Saya segera menyusun kuota harian & proposal Unit/Sub-Unit ${div.name} untuk dikirim ke Kapolda!`;
  }
  const dmReply = sendOwnerDm(state, {
    peerId,
    senderId: peer.id,
    text: replyText,
    divisionId: div?.id || null,
  });
  if (dmReply) replies.push(dmReply);
  return { sent: true, replies };
}

export function processOwnerSubServerMessage(state, subServerId, channelId, rawText) {
  const text = (rawText || '').trim();
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!text || !sub) return { sent: false, replies: [] };

  state.lastOwnerActionAt = state.simSeconds;
  if (!sub.ownerJoined) {
    joinSubServerAsOwner(state, subServerId);
  }
  const ownerRoleObj = sub.memberRoles?.['owner'];
  const ownerRoleLabel = typeof ownerRoleObj === 'string' ? ownerRoleObj : ownerRoleObj?.roleName;

  appendSubServerMessage(state, subServerId, channelId, {
    authorId: 'owner',
    authorName: `${state.ownerName} (Anda)`,
    authorRole: ownerRoleLabel || 'Kapolda (Tamu VIP)',
    authorColor: '#D4A024',
    isOwner: true,
    text,
  });

  const aiOwner = sub.ownerId !== 'owner' ? state.members.find((m) => m.id === sub.ownerId) : null;
  const fallbackAi = state.members.find((m) => m.status !== 'offline' && sub.memberIds.includes(m.id)) || state.members[0];
  const responder = aiOwner && aiOwner.status !== 'offline' ? aiOwner : fallbackAi;

  const replies = [];
  if (responder) {
    const lower = text.toLowerCase();
    const style = computeSpeechStyle(responder, state);
    let replyText =
      style.register === 'BAKU'
        ? `Siap dilaksanakan Kapolda. Selaku pengelola ${sub.name}, kami menindaklanjuti arahan Anda di #${channelId}.`
        : `Siap Kapolda! Sebagai pengelola ${sub.name}, kami langsung tindak lanjuti arahan Anda di #${channelId}.`;

    if (sub.id === 'sub-akademi' && /(baris|latih|drill|turun|hadir|gas|mulai|pimpin)/i.test(lower)) {
      const cohort = getAkpolCohortStatus(state);
      if (!cohort.quotaMet) {
        replyText = `Siap Kapolda! Saat ini barisan Taruna baru ${cohort.enrolledCadets.length}/${cohort.quota}. Sesuai SOP, latihan serentak menunggu kuota penuh dulu.`;
      } else {
        const res = leadAkpolCohortDrill(state, null, 28);
        replyText = res.ok
          ? `10-4 Kapolda! Seluruh ${res.count} Taruna langsung melaksanakan baris-berbaris serentak di Lapangan Kampus Akpol!`
          : res.message;
      }
    } else if (/(afiliasi|taut|gabung\s*mabes)/i.test(lower)) {
      if (sub.affiliatedToMain) {
        replyText = `Izin Kapolda, sub-server "${sub.name}" saat ini sudah berstatus Terafiliasi Resmi dengan Server Utama Mabes!`;
      } else if (responder.personalAuthority?.canAffiliateServer || sub.ownerId === 'owner') {
        affiliateSubServer(state, sub.id, sub.ownerId === 'owner' ? null : responder);
        replyText = `10-4 Kapolda! Afiliasi sub-server "${sub.name}" ke Server Utama Kepolisian Republik Izumiya aktif!`;
      } else {
        replyText = `Izin Kapolda, saya belum memiliki "Otoritas Perorangan: Afiliasi Server" di profil saya. Tolong aktifkan di profil saya agar saya bisa mengafiliasikan ${sub.name} secara resmi!`;
      }
    } else if (/(rekrut|link|invite|anggota\s*baru)/i.test(lower)) {
      postSubServerRecruitmentInvite(state, sub.id, 'lobi-rekrutmen', responder.id);
      replyText = `86 Kapolda! Tautan undangan rekrutmen beserta format daftar & syarat ${sub.name} sudah saya kirimkan ke #lobi-rekrutmen server utama!`;
    } else if (/(event|acara|latihan|giat)/i.test(lower)) {
      state.members.forEach((m) => {
        m.betahScore = clamp(m.betahScore + 3, 0, 100);
      });
      state.reputation += 5;
      replyText = `86! Pengurus ${sub.name} langsung menyusun giat & koordinasi anggota. Semangat tim naik (+Betah & +5 Rep)!`;
    } else if (/(status|laporan|siapa|anggota)/i.test(lower)) {
      replyText = `Laporan ${sub.name}: ${sub.memberIds.length} anggota terdaftar, status ${sub.affiliatedToMain ? 'Terafiliasi Resmi Mabes' : 'Mandiri'}. Semua unit internal terpantau aktif.`;
    }

    const r = appendSubServerMessage(state, subServerId, channelId, {
      authorId: responder.id,
      authorName: responder.icName,
      authorRole: sub.ownerId === responder.id ? `Owner ${sub.shortCode}` : `Anggota ${sub.shortCode}`,
      authorColor: sub.color,
      isOwner: false,
      text: replyText,
    });
    if (r) replies.push(r);
  }

  return { sent: true, replies };
}

export function runManualTechPatch(state, byName = 'Kapolda & Tim Dev') {
  state.tech.systemHealth = 100;
  state.tech.mapEfficiency = clamp(state.tech.mapEfficiency + 10, 80, 135);
  state.tech.patchCounter += 1;
  state.tech.lastPatchNote = `Patch v1.${state.tech.patchCounter} (${byName}): Optimasi jalur lalu lintas & perbaikan error sistem.`;
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'DevOps Kota Izumiya',
    authorRole: 'Update Sistem',
    authorColor: '#6366F1',
    isSystem: true,
    text: `${state.tech.lastPatchNote} Efisiensi Map kini ${Math.round(state.tech.mapEfficiency)}%.`,
  });
}

export function processOwnerMessage(state, channelId, rawText) {
  const text = (rawText || '').trim();
  if (!text) return { sent: false, replies: [] };

  state.lastOwnerActionAt = state.simSeconds;

  appendChannelMessage(state, channelId, {
    authorId: 'owner',
    authorName: `${state.ownerName} (Anda)`,
    authorRole: 'Kapolda (Owner)',
    authorColor: '#D4A024',
    isOwner: true,
    text,
  });

  const parsed = parseOwnerNaturalCommand(text, state);
  const replies = [];

  if (parsed.intent === 'APPROVE_DIVISION_PROPOSAL' || parsed.intent === 'REJECT_DIVISION_PROPOSAL') {
    const isApprove = parsed.intent === 'APPROVE_DIVISION_PROPOSAL';
    const prop =
      (parsed.targetDivision &&
        (state.divisionProposals || []).find((p) => p.divisionId === parsed.targetDivision.id && p.status === 'PENDING')) ||
      (state.divisionProposals || []).find((p) => p.status === 'PENDING');
    if (prop) {
      respondDivisionProposal(state, prop.id, isApprove, parsed.rawText, state.ownerName);
      return { sent: true, intent: parsed.intent, replies };
    }
  }

  if (parsed.intent === 'RECRUIT_SUB_SERVER_LINK') {
    const targetSub =
      parsed.targetSubServer ||
      (parsed.targetDivision &&
        ((state.subServers || []).find((s) => s.linkedDivisionId === parsed.targetDivision.id && s.category === 'DIVISI') ||
          (state.subServers || []).find((s) => s.linkedDivisionId === parsed.targetDivision.id))) ||
      (state.subServers || [])[0];
    if (targetSub) {
      const inviteMsg = postSubServerRecruitmentInvite(
        state,
        targetSub.id,
        channelId,
        parsed.targetMember?.id || null
      );
      if (inviteMsg) replies.push(inviteMsg);
      return { sent: true, intent: parsed.intent, replies };
    }
  }

  if (parsed.intent === 'ENROLL_ACADEMY' && parsed.targetMember) {
    const res = enrollMemberInAcademy(state, parsed.targetMember.id, state.ownerName);
    if (!res.ok) {
      appendChannelMessage(state, channelId, {
        authorId: 'system',
        authorName: 'Seleksi Akademi',
        authorRole: 'Ditolak',
        authorColor: '#F0B232',
        isSystem: true,
        text: `Pendaftaran Akademi untuk ${parsed.targetMember.icName} ditolak: ${res.reasons.join(', ')}.`,
      });
      return { sent: true, intent: parsed.intent, replies };
    }
  }

  if (parsed.intent === 'CREATE_SUB_SERVER') {
    const div = parsed.targetDivision;
    const aiOwn = parsed.targetMember || state.members.find((m) => m.personalAuthority?.canOwnSubServer) || null;
    const rawTitle = parsed.rawText.replace(/^(buat|bikin|tambah|buka)\s*(sub[\s-]*server|server\s*divisi)\s*/i, '').trim();
    createSubServerRecord(state, {
      name: div ? `SATUAN ${div.name.toUpperCase()}` : (rawTitle ? rawTitle.toUpperCase().slice(0, 22) : 'PANITIA EVENT'),
      shortCode: div ? div.callsign : (rawTitle ? rawTitle.slice(0, 3).toUpperCase() : 'EVT'),
      category: /event/i.test(rawTitle) ? 'EVENT' : /perwira/i.test(rawTitle) ? 'PERWIRA' : 'DIVISI',
      color: div ? div.color : '#8B5CF6',
      ownerId: aiOwn ? aiOwn.id : 'owner',
      linkedDivisionId: div ? div.id : null,
      affiliate: aiOwn ? Boolean(aiOwn.personalAuthority?.canAffiliateServer) : true,
    });
  }

  if (parsed.intent === 'AFFILIATE_SUB_SERVER') {
    const unlinked = parsed.targetSubServer && !parsed.targetSubServer.affiliatedToMain
      ? parsed.targetSubServer
      : (state.subServers || []).find((s) => !s.affiliatedToMain);
    if (unlinked) {
      affiliateSubServer(state, unlinked.id, null);
    }
  }

  if (parsed.intent === 'CREATE_DIVISION') {
    const nextDiv = DIVISION_EXPANSION_POOL.find(
      (dc) => !state.divisions.some((d) => d.name.toLowerCase() === dc.name.toLowerCase())
    );
    if (nextDiv) {
      createDivisionRecord(state, nextDiv, state.ownerName);
    } else if (state.divisions.length < 22) {
      const sectorNo = state.divisions.length + 1;
      createDivisionRecord(
        state,
        {
          name: `Patroli Sektor ${sectorNo}`,
          callsign: `S${String(sectorNo).padStart(2, '0')}`,
          color: '#38BDF8',
          quota: 10,
          assignmentType: 'GENERAL_PATROL',
          duty: `Satuan cadangan sektor ${sectorNo} untuk pemerataan kuota kota`,
        },
        state.ownerName
      );
    }
  }

  if (parsed.intent === 'ADJUST_DIVISION_QUOTA') {
    const targetDiv = parsed.targetDivision || state.divisions[0];
    if (targetDiv) {
      const desired = parsed.targetQuota ?? parsed.explicitQuota ?? ((targetDiv.quota || 8) + (parsed.delta || 3));
      setDivisionQuota(state, targetDiv.id, clamp(desired, 1, 50), state.ownerName);
    }
  }

  if (parsed.intent === 'CONFIGURE_DIVISION_DUTY') {
    const targetDiv = parsed.targetDivision || state.divisions[0];
    if (targetDiv) {
      const patch = {};
      const nextType = parsed.assignmentType || parsed.targetAssignmentType;
      if (nextType) patch.assignmentType = nextType;
      if (parsed.targetDistrict) patch.primaryZones = [parsed.targetDistrict.id];
      setDivisionDutyProfile(state, targetDiv.id, patch, state.ownerName);
    }
  }

  if (parsed.intent === 'CREATE_RANK') {
    const nextRank = RANK_EXPANSION_POOL.find(
      (rc) => !state.ranks.some((r) => r.name.toLowerCase() === rc.name.toLowerCase())
    );
    if (nextRank) createRankRecord(state, nextRank, state.ownerName);
  }

  if (parsed.intent === 'CREATE_BILLET') {
    const nextBil = BILLET_EXPANSION_POOL.find(
      (bc) => !state.billets.some((b) => b.name.toLowerCase() === bc.name.toLowerCase())
    );
    if (nextBil) {
      createBilletRecord(
        state,
        { ...nextBil, permissions: nextBil.extraPermissions || { canAnnounce: true } },
        state.ownerName
      );
    }
  }

  if (parsed.intent === 'LEAD_AKPOL_DRILL') {
    const res = leadAkpolCohortDrill(state, null, 28);
    if (!res.ok) {
      appendChannelMessage(state, channelId, {
        authorId: 'system',
        authorName: 'Lemdiklat Akpol',
        authorRole: 'Info Baris-Berbaris',
        authorColor: '#F59E0B',
        isSystem: true,
        text: res.message,
      });
    }
  }

  if (parsed.intent === 'REQUEST_AKPOL_DRILL') {
    postAkpolTrainingRequest(state, parsed.targetMember?.id || 'owner');
  }

  if (parsed.intent === 'HOST_EVENT') {
    state.reputation += 10;
    state.members.forEach((m) => {
      m.betahScore = clamp(m.betahScore + 6, 0, 100);
    });
    appendChannelMessage(state, 'pengumuman-mabes', {
      authorId: 'system',
      authorName: 'Panitia Event Izumiya',
      authorRole: 'Event Komunitas',
      authorColor: '#EC4899',
      isSystem: true,
      text: `Event Komunitas RP (Latihan Gabungan & Konvoi Kota) digelar atas instruksi ${state.ownerName}! Betah seluruh anggota +6% dan +10 Reputasi.`,
    });
  }

  if (parsed.intent === 'GRADUATE_CADET' && parsed.targetMember) {
    graduateCadetFromAcademy(state, parsed.targetMember.id, state.ownerName);
  }
  if (parsed.intent === 'FAIL_CADET' && parsed.targetMember) {
    failCadetFromAcademy(state, parsed.targetMember.id, 'Keputusan langsung Kapolda', state.ownerName);
  }
  if (parsed.intent === 'PROMOTE_MEMBER' && parsed.targetMember) {
    promoteMember(state, parsed.targetMember.id);
  }
  if (parsed.intent === 'DEMOTE_MEMBER' && parsed.targetMember) {
    demoteMember(state, parsed.targetMember.id);
  }
  if (parsed.intent === 'KICK_MEMBER' && parsed.targetMember) {
    const kicked = kickMember(state, parsed.targetMember.id, false, 'Instruksi langsung Kapolda di chat');
    if (kicked) return { sent: true, intent: parsed.intent, replies };
  }
  if (parsed.intent === 'ASSIGN_DIVISION' && parsed.targetMember && parsed.targetDivision) {
    assignMemberDivision(state, parsed.targetMember.id, parsed.targetDivision.id);
  }
  if (parsed.intent === 'TOGGLE_PROPAM_GATE') {
    togglePropamGate(state, parsed.gateOpen, state.ownerName);
  }
  if (parsed.intent === 'ARREST_MEMBER' && parsed.targetMember) {
    arrestMemberToPrison(state, parsed.targetMember.id, 22, 'Perintah penahanan Kapolda melalui ruang chat', state.ownerName);
  }
  if (parsed.intent === 'RELEASE_MEMBER' && parsed.targetMember) {
    releaseMemberFromPrison(state, parsed.targetMember.id, state.ownerName);
  }
  if (parsed.intent === 'TECH_MAINTENANCE') {
    runManualTechPatch(state, 'Tim Developer');
  }

  let warnTarget = null;
  if (parsed.intent === 'WARN_MODERATION') {
    const searchOrder = [channelId, 'laporan-patroli', 'lobi-rekrutmen', 'obrolan-ooc'];
    let recentViolMsg = null;
    for (const chId of searchOrder) {
      const found = [...(state.messages[chId] || [])].reverse().find((m) => m.ruleViolation && !m.moderated);
      if (found) {
        recentViolMsg = found;
        break;
      }
    }
    warnTarget =
      parsed.targetMember ||
      (recentViolMsg ? state.members.find((m) => m.id === recentViolMsg.authorId) : null);

    for (const chId of searchOrder) {
      (state.messages[chId] || []).forEach((m) => {
        if (m.ruleViolation && !m.moderated && (!warnTarget || m.authorId === warnTarget.id)) {
          m.moderated = true;
          if (!Array.isArray(m.reactions)) m.reactions = [];
          const ex = m.reactions.find((r) => r.emoji === '⚠️');
          if (ex) ex.count += 1;
          else m.reactions.push({ emoji: '⚠️', count: 1 });
        }
      });
    }
    if (warnTarget) {
      if (warnTarget.personality) {
        warnTarget.personality.professionalism = clamp((warnTarget.personality.professionalism ?? 50) + 2, 1, 99);
      }
      warnTarget.needsWelcome = false;
      state.reputation += 1;
    }
  }

  if (parsed.intent === 'PRAISE_MEMBER' && parsed.targetMember) {
    parsed.targetMember.betahScore = clamp(parsed.targetMember.betahScore + 10, 0, 100);
    parsed.targetMember.loyalty = clamp(parsed.targetMember.loyalty + 6, 0, 100);
    parsed.targetMember.needsWelcome = false;
    if (parsed.targetMember.status === 'online-chat') parsed.targetMember.status = 'online-2d';
  }

  if (parsed.intent === 'DIRECTIVE_APEL') {
    state.directive = 'APEL_MABES';
    state.directiveTimer = 24;
    state.members.forEach((m, idx) => {
      if (m.status === 'online-2d' && m.academyStatus !== 'ENROLLED') {
        m.aiState = 'APEL';
        m.targetX = 135 + (idx % 4) * 34;
        m.targetY = 125 + Math.floor(idx / 4) * 34;
        m.speechBubble = 'Siap Apel!';
        m.speechTimer = 3.0;
        m.betahScore = clamp(m.betahScore + 3, 0, 100);
      }
    });
  } else if (parsed.intent === 'DIRECTIVE_RAZIA') {
    state.directive = 'RAZIA_GABUNGAN';
    state.directiveTimer = 28;
    state.members.forEach((m, idx) => {
      if (m.status === 'online-2d' && m.academyStatus !== 'ENROLLED') {
        const coords = parsed.targetDistrict
          ? getDistrictCoordinates(parsed.targetDistrict)
          : { x: ROAD_X[idx % ROAD_X.length], y: ROAD_Y[idx % ROAD_Y.length] };
        m.aiState = 'PATROL';
        m.targetX = clamp(coords.x + ((idx % 3) - 1) * 32, 60, WORLD_WIDTH - 60);
        m.targetY = clamp(coords.y + (Math.floor(idx / 3) - 1) * 28, 60, WORLD_HEIGHT - 60);
        m.speechBubble = '10-4 Razia!';
        m.speechTimer = 3.0;
        m.betahScore = clamp(m.betahScore + 3, 0, 100);
      }
    });
  } else if (parsed.intent === 'DIRECTIVE_PATROL') {
    state.directive = 'PATROLI_BEBAS';
    state.directiveTimer = 0;
    state.members.forEach((m, idx) => {
      if (m.status === 'online-2d' && m.academyStatus !== 'ENROLLED') {
        m.aiState = 'PATROL';
        if (parsed.targetDistrict) {
          const coords = getDistrictCoordinates(parsed.targetDistrict);
          m.targetX = clamp(coords.x + ((idx % 3) - 1) * 30, 60, WORLD_WIDTH - 60);
          m.targetY = clamp(coords.y + 20, 60, WORLD_HEIGHT - 60);
        }
        m.speechBubble = 'Siap Patroli!';
        m.speechTimer = 2.5;
      }
    });
  } else if (parsed.intent === 'WARM_SOCIAL' || channelId === 'lobi-rekrutmen') {
    const unwelcomed = state.members.filter((m) => m.needsWelcome);
    const circadian = getCircadianProfile(state.simSeconds);
    unwelcomed.forEach((m) => {
      m.needsWelcome = false;
      m.betahScore = clamp(m.betahScore + 10, 0, 100);
      if (!circadian.isNight || m.nightOwl || m.billetId) {
        if (m.status !== 'offline') m.status = 'online-2d';
      }
    });
    state.members.forEach((m) => {
      m.betahScore = clamp(m.betahScore + 3.5, 0, 100);
    });
  }

  const activeMembers = state.members.filter((m) => m.status !== 'offline');
  if (activeMembers.length > 0) {
    let responder = null;
    if (parsed.intent === 'WARN_MODERATION' && warnTarget && warnTarget.status !== 'offline') {
      responder = warnTarget;
    } else if (parsed.intent === 'TECH_MAINTENANCE') {
      responder = activeMembers.find((m) => m.subRole === 'Head Developer' || m.subRole === 'Developer');
    } else if (channelId === 'lobi-rekrutmen') {
      responder = activeMembers.find((m) => m.needsWelcome) || activeMembers[activeMembers.length - 1];
    } else if (parsed.targetMember && parsed.targetMember.status !== 'offline') {
      responder = parsed.targetMember;
    }
    if (!responder) {
      responder = activeMembers[(state.nextId + text.length) % activeMembers.length];
    }

    const rank = getRankById(state, responder.rankId);
    const div = getDivisionById(state, responder.divisionId);
    const replyText = buildContextualAiReply(responder, parsed, state, channelId);

    const rolePieces = [rank.name];
    if (div) rolePieces.push(div.name);
    if (responder.subRole) rolePieces.push(responder.subRole);

    const reply = appendChannelMessage(state, channelId, {
      authorId: responder.id,
      authorName: responder.icName,
      authorRole: rolePieces.join(' · '),
      authorColor: rank.color,
      isOwner: false,
      text: replyText,
    });
    replies.push(reply);
  }

  return {
    sent: true,
    intent: parsed.intent,
    directiveTriggered:
      parsed.intent === 'DIRECTIVE_APEL'
        ? 'APEL_MABES'
        : parsed.intent === 'DIRECTIVE_RAZIA'
          ? 'RAZIA_GABUNGAN'
          : undefined,
    replies,
  };
}
