import {
  ASSIGNMENT_TYPES,
  buildEmptyPermissions,
} from '../constants.js';
import { getCircadianProfile } from '../aiBrain.js';
import {
  clamp,
  getAwardById,
  getBilletById,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';
import { normalizeDutyProfile } from './propamSecurity.js';
import { appendSubServerMessage, ensurePerwiraSubServer, isMemberPerwira } from './subServers.js';

export function promoteMember(state, memberId, actorName = null, actorRole = null) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return null;
  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const currentRank = getRankById(state, member.rankId);
  const nextRank = nonOwnerRanks.find((r) => r.order > currentRank.order);
  if (!nextRank) return null;

  member.rankId = nextRank.id;
  member.betahScore = clamp(member.betahScore + 18, 0, 100);
  member.loyalty = clamp(member.loyalty + 14, 0, 100);
  member.promotionAsked = false;
  member.needsWelcome = false;
  member.speechBubble = `Naik ${nextRank.name}!`;
  member.speechTimer = 3.2;
  state.stats.promotionsGiven += 1;
  state.reputation += 12;
  if (!actorName) state.lastOwnerActionAt = state.simSeconds;

  const byText = actorName ? ` (ditetapkan oleh ${actorRole || 'Pejabat'} ${actorName})` : '';
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'SKep Mabes Izumiya',
    authorRole: 'Pengumuman Resmi',
    authorColor: '#D4A024',
    isSystem: true,
    text: `Selamat kepada ${member.icName} atas kenaikan pangkat menjadi ${nextRank.name}!${byText}`,
  });

  appendChannelMessage(state, 'obrolan-ooc', {
    authorId: member.id,
    authorName: member.icName,
    authorRole: nextRank.name,
    authorColor: nextRank.color,
    isOwner: false,
    text: actorName
      ? `Makasih banyak ${actorName} atas promosi ke ${nextRank.name}! Siap makin aktif patroli 🫡`
      : `Makasih banyak Kapolda atas promosi ke ${nextRank.name}! Makin betah di server ini 🫡`,
  });

  if (isMemberPerwira(member, state)) {
    const subPrw = ensurePerwiraSubServer(state);
    if (subPrw && !subPrw.memberIds.includes(member.id)) {
      subPrw.memberIds.push(member.id);
    }
    const rapatCh = subPrw?.channels?.find((c) => c.name === 'rapat-pimpinan') || subPrw?.channels?.[0];
    if (rapatCh) {
      appendSubServerMessage(state, subPrw.id, rapatCh.id, {
        authorId: 'system',
        authorName: 'Protokoler Mabes',
        authorRole: 'Klasifikasi Rahasia',
        authorColor: '#EAB308',
        isSystem: true,
        text: `🎖️ [PROMOSI PERWIRA] ${member.icName} resmi menyandang pangkat ${nextRank.name} dan otomatis diwajibkan bergabung di Sub-Server PERWIRA-ONLY untuk koordinasi tingkat pimpinan.`,
      });
    }
  }

  return nextRank;
}

export function demoteMember(state, memberId, reasonBy = 'Kapolda') {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return null;
  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const currentRank = getRankById(state, member.rankId);
  const prevRank = [...nonOwnerRanks].reverse().find((r) => r.order < currentRank.order);
  if (!prevRank) return null;

  member.rankId = prevRank.id;
  member.betahScore = clamp(member.betahScore - 10, 0, 100);
  member.violationCount = Math.max(0, (member.violationCount || 0) - 2);
  member.speechBubble = `Demosi ${prevRank.name}`;
  member.speechTimer = 2.6;

  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'SKep Mabes Izumiya',
    authorRole: 'Disiplin',
    authorColor: '#F0B232',
    isSystem: true,
    text: `${member.icName} diturunkan pangkat ke ${prevRank.name} oleh ${reasonBy}.`,
  });

  return prevRank;
}

export function clearMemberFromDivisionUnits(state, memberId) {
  (state.divisions || []).forEach((div) => {
    if (div.headId === memberId) div.headId = null;
    if (div.viceHeadId === memberId) div.viceHeadId = null;
    (div.units || []).forEach((u) => {
      (u.subUnits || []).forEach((su) => {
        if (Array.isArray(su.assignedMemberIds)) {
          su.assignedMemberIds = su.assignedMemberIds.filter((id) => id !== memberId);
        }
      });
    });
  });
}

export function kickMember(state, memberId, isBan = false, reason = 'Evaluasi disiplin oleh pimpinan') {
  const idx = state.members.findIndex((m) => m.id === memberId);
  if (idx === -1) return null;
  const [removed] = state.members.splice(idx, 1);

  clearMemberFromDivisionUnits(state, removed.id);
  if (Array.isArray(state.divisionRecruits)) {
    state.divisionRecruits = state.divisionRecruits.filter((r) => r.memberId !== removed.id);
  }
  state.billets.forEach((b) => {
    if (b.holderId === removed.id) b.holderId = null;
  });
  state.incidents.forEach((inc) => {
    if (inc.assignedOfficerId === removed.id) inc.assignedOfficerId = null;
  });
  if (Array.isArray(state.subServers)) {
    state.subServers.forEach((sub) => {
      sub.memberIds = (sub.memberIds || []).filter((id) => id !== removed.id);
      if (sub.memberRoles) delete sub.memberRoles[removed.id];
      if (sub.ownerId === removed.id) {
        const delegated = sub.memberIds.find(
          (id) => id !== 'owner' && sub.memberRoles?.[id]?.canManageSubServer
        );
        const replacement = delegated || sub.memberIds.find((id) => id !== 'owner');
        sub.ownerId = replacement || 'owner';
        if (sub.ownerId === 'owner') sub.ownerJoined = true;
      }
    });
  }
  if (isBan && !state.bannedUsernames.includes(removed.username)) {
    state.bannedUsernames.push(removed.username);
  }
  state.stats.totalLeaves += 1;

  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Sistem Keamanan Server',
    authorRole: isBan ? 'BAN' : 'KICK',
    authorColor: '#DA373C',
    isSystem: true,
    text: `${removed.icName} (@${removed.username}) telah di-${isBan ? 'BAN permanen' : 'KICK'} dari server. Alasan: ${reason}.`,
  });

  return removed;
}

export function assignMemberDivision(state, memberId, divisionId) {
  const member = state.members.find((m) => m.id === memberId);
  const division = getDivisionById(state, divisionId);
  if (!member || !division) return false;

  const oldDivisionId = member.divisionId;
  const rank = getRankById(state, member.rankId);

  if (oldDivisionId && oldDivisionId !== division.id) {
    (state.divisions || []).forEach((d) => {
      if (d.headId === member.id && d.id !== division.id) d.headId = null;
      if (d.viceHeadId === member.id && d.id !== division.id) d.viceHeadId = null;
      (d.units || []).forEach((u) => {
        (u.subUnits || []).forEach((su) => {
          if (Array.isArray(su.assignedMemberIds)) {
            su.assignedMemberIds = su.assignedMemberIds.filter((id) => id !== member.id);
          }
        });
      });
    });
    member.divisionUnitId = null;
    member.divisionSubUnitId = null;
    member.divisionUnitRole = null;

    if (Array.isArray(state.subServers)) {
      state.subServers.forEach((sub) => {
        if (sub.linkedDivisionId === oldDivisionId && sub.category === 'DIVISI') {
          if (Array.isArray(sub.memberIds) && sub.memberIds.includes(member.id)) {
            const chId = sub.channels?.[0]?.id || null;
            if (chId) {
              appendSubServerMessage(state, sub.id, chId, {
                authorId: member.id,
                authorName: member.icName,
                authorRole: `${rank.name} · Mutasi`,
                authorColor: '#F59E0B',
                text: `Izin pamit undur diri dari sub-server ${sub.name} karena telah terbit SK mutasi ke ${division.name} [${division.callsign}]. Terima kasih atas kerja sama dan bimbingan rekan-rekan selama bertugas di sini 🫡`,
              });
            }
            sub.memberIds = sub.memberIds.filter((id) => id !== member.id);
            if (sub.memberRoles) delete sub.memberRoles[member.id];
            if (sub.ownerId === member.id) {
              const delegated = (sub.memberIds || []).find(
                (id) => id !== 'owner' && id !== member.id && sub.memberRoles?.[id]?.canManageSubServer
              );
              const replacement = delegated || (sub.memberIds || []).find((id) => id !== 'owner' && id !== member.id);
              sub.ownerId = replacement || 'owner';
              if (sub.ownerId === 'owner') sub.ownerJoined = true;
            }
          }
        }
      });
    }
  }

  member.divisionId = division.id;
  member.needsWelcome = false;
  if (member.status === 'offline') {
    const circadian = getCircadianProfile(state.simSeconds);
    if (!circadian.isNight || member.nightOwl) member.status = 'online-2d';
  } else {
    member.status = 'online-2d';
  }
  member.betahScore = clamp(member.betahScore + 10, 0, 100);
  member.speechBubble = `Unit ${division.callsign}`;
  member.speechTimer = 2.6;
  state.lastOwnerActionAt = state.simSeconds;

  appendChannelMessage(state, 'ruang-komando', {
    authorId: member.id,
    authorName: member.icName,
    authorRole: `${rank.name} · ${division.name}`,
    authorColor: rank.color,
    isOwner: false,
    text: `Siap bertugas di Divisi ${division.name} (${division.callsign}). Menyesuaikan sektor patroli di kota 2D.`,
  });

  if (Array.isArray(state.subServers)) {
    const newSub = state.subServers.find((s) => s.linkedDivisionId === division.id && s.category === 'DIVISI');
    if (newSub) {
      if (!Array.isArray(newSub.memberIds)) newSub.memberIds = [];
      if (!newSub.memberIds.includes(member.id)) {
        newSub.memberIds.push(member.id);
      }
      if (!newSub.memberRoles) newSub.memberRoles = {};
      const isHead = division.headId === member.id;
      const isVice = division.viceHeadId === member.id;
      newSub.memberRoles[member.id] = {
        roleName: isHead
          ? `KADIV ${division.callsign}`
          : isVice
            ? `WAKADIV ${division.callsign}`
            : `Anggota ${division.callsign}`,
        color: division.color || '#38BDF8',
        canManageSubServer: isHead || isVice,
        canAffiliate: false,
        badge: `Personel ${division.callsign}`,
        internalUnit: member.divisionUnitRole || `Staf Operasional ${division.callsign}`,
        internalDutyStatus: 'Aktif Dinas Satuan',
        divisionalAwards: [`Sertifikat Penempatan ${division.callsign}`],
      };

      const newChId = newSub.channels?.[0]?.id || null;
      if (newChId) {
        appendSubServerMessage(state, newSub.id, newChId, {
          authorId: member.id,
          authorName: member.icName,
          authorRole: `${rank.name} · ${division.callsign}`,
          authorColor: rank.color,
          text: `Izin melapor resmi bergabung di sub-server ${newSub.name} sesuai penugasan divisi. Siap berkoordinasi dan menjalankan tugas operasional 🫡`,
        });
      }
    }
  }

  return true;
}

export function assignMemberBillet(state, memberId, billetId) {
  const billet = getBilletById(state, billetId);
  const member = state.members.find((m) => m.id === memberId);
  if (!billet || !member) return false;

  state.billets.forEach((b) => {
    if (b.holderId === memberId) b.holderId = null;
  });
  if (billet.holderId) {
    const prev = state.members.find((m) => m.id === billet.holderId);
    if (prev) prev.billetId = null;
  }

  billet.holderId = member.id;
  member.billetId = billet.id;
  member.betahScore = clamp(member.betahScore + 15, 0, 100);
  member.loyalty = clamp(member.loyalty + 12, 0, 100);
  state.reputation += 15;
  state.lastOwnerActionAt = state.simSeconds;

  const rank = getRankById(state, member.rankId);
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'SKep Mabes Izumiya',
    authorRole: 'Pelantikan',
    authorColor: '#D4A024',
    isSystem: true,
    text: `${member.icName} (${rank.name}) resmi dilantik sebagai ${billet.name}!`,
  });

  return true;
}

export function setMemberSubRole(state, memberId, subRole) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return false;
  member.subRole = subRole || null;
  member.betahScore = clamp(member.betahScore + (subRole ? 10 : 0), 0, 100);
  state.lastOwnerActionAt = state.simSeconds;

  if (subRole) {
    appendChannelMessage(state, 'ruang-komando', {
      authorId: 'system',
      authorName: 'Admin Komunitas',
      authorRole: 'Sub-Jabatan',
      authorColor: '#38BDF8',
      isSystem: true,
      text: `${member.icName} ditetapkan mengemban sub-jabatan "${subRole}" untuk mendukung pengelolaan server & game 2D.`,
    });
  }
  return true;
}

export function toggleAwardOnMember(state, memberId, awardId) {
  const award = getAwardById(awardId);
  if (!award) return false;

  if (memberId === 'owner') {
    const list = state.ownerProfile.awards;
    const idx = list.indexOf(awardId);
    if (idx === -1) list.push(awardId);
    else list.splice(idx, 1);
    return true;
  }

  const member = state.members.find((m) => m.id === memberId);
  if (!member) return false;
  if (!member.awards) member.awards = [];
  const idx = member.awards.indexOf(awardId);
  if (idx === -1) {
    member.awards.push(awardId);
    member.betahScore = clamp(member.betahScore + 8, 0, 100);
    member.loyalty = clamp(member.loyalty + 6, 0, 100);
    appendChannelMessage(state, 'pengumuman-mabes', {
      authorId: 'system',
      authorName: 'Penghargaan Mabes',
      authorRole: award.category,
      authorColor: award.color,
      isSystem: true,
      text: `${member.icName} dianugerahi ${award.category}: "${award.name}".`,
    });
  } else {
    member.awards.splice(idx, 1);
  }
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function grantAwardToMember(state, memberId, awardId, actorLabel = null) {
  const award = getAwardById(awardId);
  if (!award) return false;
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return false;
  if (!member.awards) member.awards = [];
  if (member.awards.includes(awardId)) return false;

  member.awards.push(awardId);
  member.betahScore = clamp(member.betahScore + 8, 0, 100);
  member.loyalty = clamp(member.loyalty + 6, 0, 100);
  const byText = actorLabel ? ` atas usulan ${actorLabel}` : '';
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Penghargaan Mabes',
    authorRole: award.category,
    authorColor: award.color,
    isSystem: true,
    text: `${member.icName} dianugerahi ${award.category}: "${award.name}"${byText}.`,
  });
  return true;
}

export function setBilletPermission(state, billetId, permKey, value) {
  const billet = getBilletById(state, billetId);
  if (!billet) return false;
  if (!billet.permissions) billet.permissions = buildEmptyPermissions();
  billet.permissions[permKey] = Boolean(value);
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function setRankPermission(state, rankId, permKey, value) {
  const rank = state.ranks.find((r) => r.id === rankId);
  if (!rank || rank.isOwner) return false;
  if (!rank.permissions) rank.permissions = buildEmptyPermissions();
  rank.permissions[permKey] = Boolean(value);
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function setDivisionPermission(state, divisionId, permKey, value) {
  const division = getDivisionById(state, divisionId);
  if (!division) return false;
  if (!division.permissions) division.permissions = buildEmptyPermissions();
  division.permissions[permKey] = Boolean(value);
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function setBilletHierarchy(state, billetId, hierarchyOrder) {
  const billet = getBilletById(state, billetId);
  if (!billet) return false;
  billet.hierarchyOrder = clamp(Math.round(Number(hierarchyOrder) || 40), 1, 99);
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function normalizeRankOrders(state) {
  const nonOwner = state.ranks
    .filter((r) => !r.isOwner)
    .sort((a, b) => (Number(a.minXp) || 0) - (Number(b.minXp) || 0) || (Number(a.order) || 0) - (Number(b.order) || 0));
  nonOwner.forEach((r, idx) => {
    r.order = idx + 1;
  });
  const ownerRank = state.ranks.find((r) => r.isOwner);
  if (ownerRank) ownerRank.order = 99;
}

export function createRankRecord(state, { name, minXp, salary, color, permissions }, actorLabel = null) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  state.ranks.push({
    id: `rank-${++state.nextId}`,
    name: trimmed,
    order: state.ranks.length + 1,
    minXp: Math.max(0, Number(minXp) || 0),
    salary: Math.max(100, Number(salary) || 300),
    color: color || '#38BDF8',
    permissions: buildEmptyPermissions(permissions),
  });
  normalizeRankOrders(state);
  state.members.forEach((m) => {
    m.betahScore = clamp(m.betahScore + 4, 0, 100);
  });
  const byText = actorLabel ? ` oleh ${actorLabel}` : '';
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'SKep Mabes Izumiya',
    authorRole: 'Struktur Baru',
    authorColor: '#D4A024',
    isSystem: true,
    text: `Jenjang pangkat baru "${trimmed}" resmi ditambahkan ke hierarki Kepolisian Republik Izumiya${byText}!`,
  });
  return true;
}

export function createDivisionRecord(
  state,
  { name, callsign, duty, color, quota, gateClearance, permissions, dutyProfile, assignmentType },
  actorLabel = null
) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  const cs = ((callsign || trimmed.slice(0, 3)).trim() || 'DIV').toUpperCase().slice(0, 4);
  const resolvedProfile = normalizeDutyProfile(
    dutyProfile || (assignmentType ? { assignmentType } : null),
    { name: trimmed, duty }
  );
  const preset = ASSIGNMENT_TYPES[resolvedProfile.assignmentType];
  const newDiv = {
    id: `div-${++state.nextId}`,
    name: trimmed,
    callsign: cs,
    color: color || '#10B981',
    quota: clamp(Math.round(Number(quota) || 8), 1, 50),
    headId: null,
    viceHeadId: null,
    dailyIntakeQuota: clamp(Math.ceil((Number(quota) || 8) * 0.4), 2, 6),
    dailyIntakeCount: 0,
    lastQuotaDay: Math.floor((state.simSeconds || 0) / 86400),
    proposalStatus: 'NONE',
    units: [],
    recruitmentOpen: false,
    lastInviteBroadcastSec: -9999,
    duty: (duty || preset?.label || 'Operasional khusus wilayah Republik Izumiya').trim(),
    gateClearance:
      typeof gateClearance === 'boolean'
        ? gateClearance
        : resolvedProfile.assignmentType === 'INTERNAL_SECURITY' ||
          resolvedProfile.assignmentType === 'MEDICAL' ||
          resolvedProfile.assignmentType === 'EDUCATION',
    dutyProfile: resolvedProfile,
    permissions: buildEmptyPermissions(permissions || { canCommandPatrol: true }),
  };
  state.divisions.push(newDiv);
  state.members.forEach((m) => {
    m.betahScore = clamp(m.betahScore + 6, 0, 100);
  });
  const byText = actorLabel ? ` oleh ${actorLabel}` : '';
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'SKep Mabes Izumiya',
    authorRole: 'Divisi Baru',
    authorColor: '#D4A024',
    isSystem: true,
    text: `Divisi baru "${trimmed} (${cs})" resmi dibuka${byText} [${preset?.shortLabel || 'Operasional'} · Kuota ${newDiv.quota}]! Pendaftar baru dapat memilih satuan ini.`,
  });
  return true;
}

export function createBilletRecord(state, { name, description, minRankOrder, hierarchyOrder, permissions }, actorLabel = null) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  const newBillet = {
    id: `billet-${++state.nextId}`,
    name: trimmed,
    color: '#38BDF8',
    hierarchyOrder: clamp(Math.round(Number(hierarchyOrder) || 45), 1, 99),
    minRankOrder: Math.max(1, Number(minRankOrder) || 2),
    bonusMorale: 8,
    description: (description || 'Jabatan komando & pembinaan anggota').trim(),
    holderId: null,
    permissions: buildEmptyPermissions(permissions || { canAnnounce: true }),
  };
  state.billets.push(newBillet);
  if (actorLabel) {
    appendChannelMessage(state, 'ruang-komando', {
      authorId: 'system',
      authorName: 'SKep Mabes Izumiya',
      authorRole: 'Jabatan Baru',
      authorColor: '#38BDF8',
      isSystem: true,
      text: `Jabatan baru "${trimmed}" (Hierarki ${newBillet.hierarchyOrder}/99) dibentuk oleh ${actorLabel}.`,
    });
  }
  return true;
}

export function appointUnitLeader(state, memberId, divisionId, roleTitle = 'KANIT', actorLabel = 'Pimpinan Mabes') {
  const member = state.members.find((m) => m.id === memberId);
  const div = getDivisionById(state, divisionId);
  if (!member || !div) return false;
  if (member.divisionId !== div.id) member.divisionId = div.id;
  member.divisionUnitRole = roleTitle;
  member.betahScore = clamp(member.betahScore + 8, 0, 100);
  const sub = (state.subServers || []).find((s) => s.linkedDivisionId === div.id && s.category === 'DIVISI');
  if (sub) {
    if (!sub.memberIds.includes(member.id)) sub.memberIds.push(member.id);
    if (!sub.memberRoles) sub.memberRoles = {};
    sub.memberRoles[member.id] = {
      ...(typeof sub.memberRoles[member.id] === 'object' ? sub.memberRoles[member.id] : {}),
      roleName: roleTitle,
      color: div.color || '#38BDF8',
      canManageSubServer: true,
      badge: `Pejabat ${div.callsign}`,
      internalUnit: roleTitle,
    };
  }
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'SKep Jabatan Satuan',
    authorRole: div.callsign,
    authorColor: div.color,
    isSystem: true,
    text: `${member.icName} dilantik sebagai ${roleTitle} pada Divisi ${div.name} [${div.callsign}] oleh ${actorLabel} (otomatis mendapat akses internal sub-server).`,
  });
  return true;
}

export function setMemberPersonalAuthority(state, memberId, key, val) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return false;
  if (!member.personalAuthority) {
    member.personalAuthority = { canOwnSubServer: false, canAffiliateServer: false };
  }
  member.personalAuthority[key] = Boolean(val);
  state.lastOwnerActionAt = state.simSeconds;

  const label =
    key === 'canOwnSubServer'
      ? 'Otoritas Perorangan: Bikin & Kelola Sub-Server Mandiri'
      : 'Otoritas Perorangan: Afiliasi Sub-Server ke Server Utama';
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Otoritas Perorangan',
    authorRole: val ? 'Diberikan' : 'Dicabut',
    authorColor: val ? '#23A55A' : '#F0B232',
    isSystem: true,
    text: `${member.icName} kini ${val ? 'MEMILIKI' : 'TIDAK lagi memiliki'} ${label} (terpisah dari izin role server utama).`,
  });
  return true;
}
