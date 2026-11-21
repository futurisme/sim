import {
  buildSubServerRecruitmentInvite,
  checkSubServerEligibility,
  generateInterAiReply,
} from '../aiBrain.js';
import {
  clamp,
  formatSimClock,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import { resolveSubServerRoleEntry } from './roleFormatter.js';

export function appendSubServerMessage(state, subServerId, channelId, msg) {
  if (!Array.isArray(state.subServers)) return null;
  const sub = state.subServers.find((s) => s.id === subServerId);
  if (!sub) return null;
  if (!sub.messages) sub.messages = {};
  if (!sub.messages[channelId]) sub.messages[channelId] = [];

  const textContent = msg.text || msg.content || '';
  const entry = {
    id: `submsg-${++state.nextId}`,
    timeLabel: formatSimClock(state.simSeconds),
    reactions: [],
    ...msg,
    text: textContent,
    content: textContent,
  };
  sub.messages[channelId].push(entry);
  if (sub.messages[channelId].length > 55) {
    sub.messages[channelId].shift();
  }
  if (!msg.isOwner) {
    if (!sub.unreadByChannel) sub.unreadByChannel = {};
    sub.unreadByChannel[channelId] = (sub.unreadByChannel[channelId] || 0) + 1;
  }
  return entry;
}

export function createSubServerRecord(state, opts = {}) {
  const cleanName = (opts.name || '').trim();
  if (!cleanName) return null;
  if (!Array.isArray(state.subServers)) state.subServers = [];
  if (state.subServers.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
    return null;
  }

  const ownerId = opts.ownerId || 'owner';
  const aiOwner = ownerId !== 'owner' ? state.members.find((m) => m.id === ownerId) : null;
  const canAff =
    ownerId === 'owner'
      ? opts.affiliate !== false
      : Boolean(opts.affiliate && aiOwner?.personalAuthority?.canAffiliateServer);

  const subId =
    opts.id && !state.subServers.some((s) => s.id === opts.id)
      ? opts.id
      : `sub-${++state.nextId}`;
  const shortCode = (opts.shortCode || cleanName.slice(0, 3)).toUpperCase().slice(0, 4);
  const channels =
    Array.isArray(opts.channels) && opts.channels.length > 0
      ? opts.channels.map((c) => ({ ...c }))
      : [
          { id: `${subId}-umum`, name: 'pengumuman-unit', topic: `Arahan resmi & informasi ${cleanName}.` },
          { id: `${subId}-koordinasi`, name: 'koordinasi-internal', topic: `Diskusi internal anggota & jadwal giat ${cleanName}.` },
        ];

  const matchingMembers = state.members
    .filter((m) => {
      if (m.id === ownerId) return true;
      if (opts.linkedDivisionId && m.divisionId === opts.linkedDivisionId) return true;
      if (opts.category === 'PERWIRA' && (m.billetId || (m.personality?.professionalism ?? 60) >= 72)) return true;
      if (opts.category === 'AKADEMI' && (m.academyStatus === 'ENROLLED' || m.billetId === 'billet-kalemdiklat' || m.billetId === 'billet-instruktur')) return true;
      return false;
    })
    .map((m) => m.id);

  const memberRoles = {};
  if (aiOwner) {
    memberRoles[aiOwner.id] = {
      roleName: 'Owner Sub-Server',
      color: opts.color || '#38BDF8',
      canManageSubServer: true,
      canAffiliate: Boolean(aiOwner.personalAuthority?.canAffiliateServer),
      badge: `Pendiri ${cleanName}`,
    };
  }
  matchingMembers.forEach((mid) => {
    if (mid !== ownerId) {
      memberRoles[mid] = {
        roleName: 'Anggota Satuan',
        color: '#94A3B8',
        canManageSubServer: false,
        canAffiliate: false,
        badge: null,
      };
    }
  });

  const messages = {};
  const unreadByChannel = {};
  channels.forEach((ch, idx) => {
    messages[ch.id] = [];
    unreadByChannel[ch.id] = idx === 0 ? 1 : 0;
  });

  const subServer = {
    id: subId,
    name: cleanName,
    shortCode,
    category: opts.category || 'DIVISI',
    color: opts.color || '#38BDF8',
    description: (opts.description || `Sub-server operasional ${cleanName}.`).trim(),
    ownerId,
    linkedDivisionId: opts.linkedDivisionId || null,
    affiliatedToMain: canAff,
    ownerJoined: ownerId === 'owner',
    ownerWelcomed: ownerId === 'owner',
    memberIds: ownerId === 'owner' ? ['owner', ...matchingMembers] : matchingMembers,
    memberRoles,
    channels,
    messages,
    unreadByChannel,
  };

  state.subServers.push(subServer);
  if (subServer.category === 'DIVISI') {
    ensureSubServerRegistrasiChannel(subServer);
  }

  const creatorLabel = aiOwner ? `${aiOwner.icName} (Owner Sub-Server)` : state.ownerName;
  appendSubServerMessage(state, subId, subServer.channels[0].id, {
    authorId: ownerId,
    authorName: aiOwner ? aiOwner.icName : `${state.ownerName} (Anda)`,
    authorRole: `Owner ${shortCode}`,
    authorColor: subServer.color,
    isOwner: ownerId === 'owner',
    text: `Sub-Server "${cleanName}" resmi didirikan dan dikelola penuh oleh ${creatorLabel}. ${canAff ? 'Status: TERAFILIASI dengan Server Utama!' : 'Status: Mandiri (menunggu otoritas afiliasi ke Server Utama).'}`,
  });

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Jaringan Sub-Server',
    authorRole: canAff ? 'Afiliasi Aktif' : 'Server Mandiri',
    authorColor: subServer.color,
    isSystem: true,
    text: `${creatorLabel} mendirikan sub-server "${cleanName}" [${shortCode}]. ${canAff ? 'Langsung terafiliasi dengan Server Utama Kepolisian Republik Izumiya!' : 'Buka daftar server di kiri Discord untuk melihat atau beri izin Afiliasi.'}`,
  });

  if (canAff) state.reputation += 10;
  return subServer;
}

export function ensureSubServerRegistrasiChannel(subServer) {
  if (!subServer) return null;
  if (!Array.isArray(subServer.channels)) subServer.channels = [];
  if (!subServer.messages) subServer.messages = {};
  if (!subServer.unreadByChannel) subServer.unreadByChannel = {};
  let regCh = subServer.channels.find((c) => c.name === 'registrasi');
  if (!regCh) {
    regCh = {
      id: `${subServer.id}-registrasi`,
      name: 'registrasi',
      topic: `Pendaftaran resmi anggota baru sesuai format divisi ${subServer.name}, seleksi berkas & pengumuman Phase I–IV.`,
    };
    subServer.channels.unshift(regCh);
  }
  if (!Array.isArray(subServer.messages[regCh.id])) {
    subServer.messages[regCh.id] = [];
  }
  if (typeof subServer.unreadByChannel[regCh.id] !== 'number') {
    subServer.unreadByChannel[regCh.id] = 0;
  }
  return regCh;
}

export function getMemberSubServerProfile(member, subServer, state) {
  if (!member || !subServer) return null;
  const isOwner = subServer.ownerId === member.id;
  const isServerOwner = member.id === 'owner';
  const linkedDiv = subServer.linkedDivisionId ? getDivisionById(state, subServer.linkedDivisionId) : null;
  const divCode = subServer.shortCode || (linkedDiv ? linkedDiv.callsign : 'DIV');

  const rawCustomRole = subServer.memberRoles?.[member.id];
  const resolvedCustom = resolveSubServerRoleEntry(rawCustomRole, '', subServer.color || '#38BDF8');
  const customObj = rawCustomRole && typeof rawCustomRole === 'object' ? rawCustomRole : {};

  let roleTitle = resolvedCustom.roleName;
  if (!roleTitle) {
    if (isOwner) {
      roleTitle = subServer.category === 'DIVISI' ? `KADIV ${divCode}` : `Owner ${divCode}`;
    } else if (isServerOwner) {
      roleTitle = 'Pimpinan Tertinggi Mabes';
    } else if (linkedDiv && linkedDiv.headId === member.id) {
      roleTitle = `KADIV ${divCode}`;
    } else if (linkedDiv && linkedDiv.viceHeadId === member.id) {
      roleTitle = `WAKADIV ${divCode}`;
    } else if (member.divisionUnitRole) {
      roleTitle = member.divisionUnitRole;
    } else {
      roleTitle = `Anggota Satuan ${divCode}`;
    }
  }

  const internalUnit =
    customObj.internalUnit ||
    member.divisionUnitRole ||
    (isOwner ? 'Komando Markas Satuan' : `Regu Operasional ${divCode}`);

  const internalDutyStatus =
    customObj.internalDutyStatus ||
    (isOwner ? 'Pimpinan Siaga Satuan' : 'Aktif Dinas Satuan');

  const divisionalAwards = [...(customObj.divisionalAwards || [])];
  if (isOwner && !divisionalAwards.includes(`Lencana Komando ${divCode}`)) {
    divisionalAwards.unshift(`Lencana Komando ${divCode}`);
  }
  if (member.divisionUnitRole && !divisionalAwards.includes(`SK Penempatan: ${member.divisionUnitRole}`)) {
    divisionalAwards.push(`SK Penempatan: ${member.divisionUnitRole}`);
  }
  if (divisionalAwards.length === 0) {
    divisionalAwards.push(`Brevet Satuan ${divCode}`);
  }

  return {
    subServerId: subServer.id,
    roleTitle,
    roleColor: resolvedCustom.color || subServer.color || '#38BDF8',
    color: resolvedCustom.color || subServer.color || '#38BDF8',
    internalUnit,
    internalDutyStatus,
    badge: customObj.badge || (isOwner ? `Komandan ${divCode}` : `Personel ${divCode}`),
    divisionalAwards,
    subServerName: subServer.name,
    shortCode: divCode,
    isSubOwner: isOwner,
  };
}

export function affiliateSubServer(state, subServerId, actorMember = null) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!sub || sub.affiliatedToMain) return false;
  if (actorMember && !actorMember.personalAuthority?.canAffiliateServer) return false;

  sub.affiliatedToMain = true;
  state.reputation += 10;
  state.members.forEach((m) => {
    m.betahScore = clamp(m.betahScore + 3, 0, 100);
  });

  const actorName = actorMember ? actorMember.icName : state.ownerName;
  appendSubServerMessage(state, sub.id, sub.channels[0].id, {
    authorId: actorMember ? actorMember.id : 'owner',
    authorName: actorName,
    authorRole: 'Afiliasi Resmi',
    authorColor: '#23A55A',
    isOwner: !actorMember,
    text: `Sub-Server "${sub.name}" resmi TERAFILIASI dengan Kepolisian Republik Izumiya! Reputasi & sinergi anggota meningkat.`,
  });

  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Afiliasi Server Mabes',
    authorRole: 'Sub-Server Resmi',
    authorColor: sub.color,
    isSystem: true,
    text: `Sub-Server "${sub.name}" (dikelola oleh ${actorName}) resmi berafiliasi dengan server utama Kepolisian Republik Izumiya!`,
  });
  return true;
}

export function joinSubServerAsOwner(state, subServerId) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!sub) return null;
  sub.ownerJoined = true;
  if (!sub.memberIds.includes('owner')) {
    sub.memberIds.unshift('owner');
  }
  state.lastOwnerActionAt = state.simSeconds;

  const aiOwner = sub.ownerId !== 'owner' ? state.members.find((m) => m.id === sub.ownerId) : null;
  if (aiOwner && !sub.ownerWelcomed) {
    sub.ownerWelcomed = true;
    const isGoodOwner = (aiOwner.personality?.empathy ?? 65) >= 55 || (aiOwner.personality?.loyalty ?? 65) >= 55;
    const grantedRoleName = isGoodOwner ? 'Dewan Pembina Kehormatan (VIP & Mod)' : 'Tamu Kehormatan Kapolda';
    const grantedBadge = isGoodOwner ? 'Badge Apresiasi Pimpinan Afiliasi' : 'Notice Kehadiran Pimpinan';

    sub.memberRoles['owner'] = {
      roleName: grantedRoleName,
      color: '#D4A024',
      canManageSubServer: isGoodOwner,
      canAffiliate: true,
      badge: grantedBadge,
    };

    aiOwner.betahScore = clamp(aiOwner.betahScore + 10, 0, 100);
    aiOwner.loyalty = clamp(aiOwner.loyalty + 8, 0, 100);
    state.reputation += 6;

    const firstCh = sub.channels[0]?.id;
    if (firstCh) {
      const ownerDisplay = /kapolda/i.test(state.ownerName) ? state.ownerName : `Kapolda ${state.ownerName}`;
      appendSubServerMessage(state, sub.id, firstCh, {
        authorId: aiOwner.id,
        authorName: aiOwner.icName,
        authorRole: `Owner ${sub.shortCode}`,
        authorColor: sub.color,
        isOwner: false,
        text: `Selamat datang ${ownerDisplay} di server "${sub.name}"! Sebagai bentuk hormat pengelola sub-server, saya sematkan role "${grantedRoleName}" beserta "${grantedBadge}" untuk Anda 🫡`,
      });
    }
  } else if (!sub.memberRoles['owner']) {
    sub.memberRoles['owner'] = {
      roleName: 'Pendiri & Pembina',
      color: '#D4A024',
      canManageSubServer: true,
      canAffiliate: true,
      badge: 'Kapolda Izumiya',
    };
  }

  return sub;
}

export function leaveSubServerAsOwner(state, subServerId) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!sub || sub.ownerId === 'owner') return false;
  sub.ownerJoined = false;
  sub.memberIds = sub.memberIds.filter((id) => id !== 'owner');
  return true;
}

export function postSubServerRecruitmentInvite(state, subServerId, channelId = 'lobi-rekrutmen', actorId = null) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId) || state.subServers?.[0];
  if (!sub) return null;

  const sender =
    (actorId && state.members.find((m) => m.id === actorId)) ||
    (sub.ownerId !== 'owner' ? state.members.find((m) => m.id === sub.ownerId) : null) ||
    state.members.find((m) => m.status !== 'offline') ||
    state.members[0];

  if (!sender) return null;
  const invite = buildSubServerRecruitmentInvite(sub, sender, state);
  const rank = getRankById(state, sender.rankId);
  const div = getDivisionById(state, sender.divisionId);

  const msg = appendChannelMessage(state, channelId, {
    authorId: sender.id,
    authorName: sender.icName,
    authorRole:
      sub.ownerId === sender.id
        ? `Owner ${sub.shortCode} · ${rank.name}`
        : div
          ? `${rank.name} · ${div.name}`
          : rank.name,
    authorColor: sub.color || rank.color,
    isOwner: false,
    text: invite.text,
    recruitInvite: invite.recruitInvite,
  });

  const peer = state.members.find(
    (m) => m.id !== sender.id && m.status !== 'offline' && !sub.memberIds.includes(m.id)
  );
  if (peer && msg) {
    const appReply = generateInterAiReply(peer, msg, state, channelId);
    if (appReply) {
      const peerRank = getRankById(state, peer.rankId);
      const peerDiv = getDivisionById(state, peer.divisionId);
      const appMsg = appendChannelMessage(state, channelId, {
        authorId: peer.id,
        authorName: peer.icName,
        authorRole: peerDiv ? `${peerRank.name} · ${peerDiv.name}` : peerRank.name,
        authorColor: peerRank.color,
        isOwner: false,
        text: appReply.text,
        replyTo: appReply.replyTo,
        applicationForSubServerId: appReply.applicationForSubServerId,
        applicationEligible: appReply.applicationEligible,
      });
      const senderCanEval =
        sub.ownerId === sender.id || Boolean(sub.memberRoles?.[sender.id]?.canManageSubServer);
      if (appMsg && senderCanEval) {
        const evalReply = generateInterAiReply(sender, appMsg, state, channelId);
        if (evalReply) {
          appendChannelMessage(state, channelId, {
            authorId: sender.id,
            authorName: sender.icName,
            authorRole: sub.ownerId === sender.id ? `Owner ${sub.shortCode} · ${rank.name}` : `Pengelola ${sub.shortCode} · ${rank.name}`,
            authorColor: sub.color || rank.color,
            isOwner: false,
            text: evalReply.text,
            replyTo: evalReply.replyTo,
          });
        }
      }
    }
  }

  return msg;
}

export function applyAiToSubServer(state, subServerId, applicantId) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  const applicant = state.members.find((m) => m.id === applicantId);
  if (!sub || !applicant) return { ok: false, reasons: ['Data tidak ditemukan'] };
  const check = checkSubServerEligibility(applicant, sub, state);
  if (!check.eligible) return { ok: false, reasons: check.reasons };
  if (!sub.memberIds.includes(applicant.id)) {
    sub.memberIds.push(applicant.id);
    if (!sub.memberRoles) sub.memberRoles = {};
    sub.memberRoles[applicant.id] = {
      roleName: 'Anggota Terverifikasi',
      color: sub.color,
      canManageSubServer: false,
      canAffiliate: false,
      badge: null,
    };
    applicant.betahScore = clamp(applicant.betahScore + 6, 0, 100);
  }
  return { ok: true, sub };
}

export function isMemberPerwira(member, state) {
  if (!member) return false;
  if (member.id === 'owner' || member.isOwner) return true;
  if (member.isRetired) {
    if ((member.retiredRankOrder || 0) >= 5) return true;
    if (/(ipda|iptu|akp|kompol|akbp|kombes|brigjen|irjen|komjen|jenderal|kapolda|perwira|pama|pamen|pati)/i.test(member.retiredRankName || '')) return true;
  }
  const rank = getRankById(state, member.rankId);
  if (rank?.isOwner) return true;
  if ((rank?.order || 1) >= 5) return true;
  if (/(ipda|iptu|akp|kompol|akbp|kombes|brigjen|irjen|komjen|jenderal|kapolda|perwira\s*tinggi|perwira\s*menengah|perwira\s*muda|perwira(?!\s*non))/i.test(rank?.name || '')) return true;
  const billet = member.billetId ? state.billets?.find((b) => b.id === member.billetId) : null;
  if ((billet?.hierarchyOrder || 0) >= 60) return true;
  return false;
}

export function ensurePerwiraSubServer(state) {
  if (!Array.isArray(state.subServers)) state.subServers = [];
  let sub = state.subServers.find((s) => s.id === 'sub-perwira' || s.category === 'PERWIRA' || /perwira-only/i.test(s.name));

  if (!sub) {
    sub = {
      id: 'sub-perwira',
      name: 'PERWIRA-ONLY',
      shortCode: 'PRW',
      category: 'PERWIRA',
      color: '#EAB308',
      description: 'Forum rahasia tertutup pimpinan, perwira non-anggota, dan rapat koordinasi strategis Mabes Izumiya.',
      secret: true,
      perwiraOnly: true,
      ownerId: 'owner',
      linkedDivisionId: null,
      affiliatedToMain: true,
      ownerJoined: true,
      ownerWelcomed: true,
      memberIds: ['owner'],
      memberRoles: {
        owner: {
          roleName: 'Kapolda / Pimpinan Tertinggi',
          color: '#EAB308',
          canManageSubServer: true,
          canAffiliate: true,
          badge: 'Kapolda Izumiya',
        },
      },
      channels: [
        { id: 'perwira-rapat', name: 'rapat-pimpinan', topic: 'Diskusi strategi pimpinan, promosi jabatan & evaluasi komando.' },
        { id: 'perwira-evaluasi', name: 'evaluasi-anggota', topic: 'Catatan performa, audit disiplin & seleksi penempatan perwira.' },
        { id: 'perwira-intel', name: 'intel-rahasia', topic: 'Briefing tertutup, operasi senyap & laporan intelijen internal perwira.' },
      ],
      messages: {
        'perwira-rapat': [],
        'perwira-evaluasi': [],
        'perwira-intel': [],
      },
      unreadByChannel: {
        'perwira-rapat': 0,
        'perwira-evaluasi': 0,
        'perwira-intel': 0,
      },
    };
    state.subServers.push(sub);

    appendSubServerMessage(state, 'sub-perwira', 'perwira-rapat', {
      authorId: 'owner',
      authorName: state.ownerName || 'Kapolda Izumiya',
      authorRole: 'Kapolda Izumiya',
      authorColor: '#EAB308',
      isOwner: true,
      text: 'Selamat datang di Forum Tertutup PERWIRA-ONLY (Klasifikasi Rahasia). Seluruh perwira yang naik pangkat (Ipda ke atas) otomatis diwajibkan bergabung di sini.',
    });
  }

  sub.secret = true;
  sub.perwiraOnly = true;

  if (!sub.channels.some((c) => c.name === 'intel-rahasia')) {
    sub.channels.push({
      id: 'perwira-intel',
      name: 'intel-rahasia',
      topic: 'Briefing tertutup, operasi senyap & laporan intelijen internal perwira.',
    });
    if (!sub.messages['perwira-intel']) sub.messages['perwira-intel'] = [];
    if (typeof sub.unreadByChannel['perwira-intel'] !== 'number') sub.unreadByChannel['perwira-intel'] = 0;
  }

  if (Array.isArray(state.members)) {
    for (const m of state.members) {
      const isPerwira = isMemberPerwira(m, state);
      if (isPerwira) {
        if (!sub.memberIds.includes(m.id)) {
          sub.memberIds.push(m.id);
        }
        if (!sub.memberRoles) sub.memberRoles = {};
        if (!sub.memberRoles[m.id]) {
          const rank = getRankById(state, m.rankId);
          const rName = rank?.name || 'Perwira';
          const rOrder = rank?.order || 5;
          const roleLabel =
            m.isRetired
              ? 'Dewan Purnawirawan Perwira'
              : rOrder >= 9
                ? 'Perwira Tinggi (Pati)'
                : rOrder >= 7
                  ? 'Perwira Menengah (Pamen)'
                  : 'Perwira Pertama (Pama)';
          sub.memberRoles[m.id] = {
            roleName: roleLabel,
            color: '#FACC15',
            canManageSubServer: rOrder >= 8 || m.billetId === 'billet-wakapolri',
            canAffiliate: false,
            badge: `${rName} Izumiya`,
          };
        }
      } else if (m.id !== 'owner') {
        if (sub.memberIds.includes(m.id)) {
          sub.memberIds = sub.memberIds.filter((id) => id !== m.id);
          if (sub.memberRoles) delete sub.memberRoles[m.id];
        }
      }
    }
  }

  return sub;
}
