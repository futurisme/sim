import { getMemberEffectiveAuthorities } from '../aiBrain.js';
import { appendChannelMessage } from './stateHydrator.js';
import { appendSubServerMessage } from './subServers.js';

const INTERNAL_ADMIN_REGEX = /^(kanit|kadiv|wakadiv|kalemdiklat|danden|dankie|ketua|wakil|pengelola|admin|mod|owner)/i;

export function canMemberManageSubServer(memberOrId, subServer, state) {
  if (!subServer || !state) return false;
  if (memberOrId === 'owner' || memberOrId?.id === 'owner') return true;
  const member =
    typeof memberOrId === 'string'
      ? (state.members || []).find((m) => m.id === memberOrId)
      : memberOrId;
  if (!member) return false;
  if (subServer.ownerId === member.id) return true;

  const roleEntry = subServer.memberRoles?.[member.id];
  if (roleEntry && typeof roleEntry === 'object' && roleEntry.canManageSubServer) {
    return true;
  }
  if (typeof roleEntry === 'string' && INTERNAL_ADMIN_REGEX.test(roleEntry.trim())) {
    return true;
  }

  const linkedDiv = subServer.linkedDivisionId
    ? (state.divisions || []).find((d) => d.id === subServer.linkedDivisionId)
    : null;
  if (linkedDiv) {
    if (linkedDiv.headId === member.id || linkedDiv.viceHeadId === member.id) {
      return true;
    }
    if (
      member.divisionId === linkedDiv.id &&
      member.divisionUnitRole &&
      INTERNAL_ADMIN_REGEX.test(member.divisionUnitRole.trim())
    ) {
      return true;
    }
  }

  const perms = getMemberEffectiveAuthorities(member.id, state);
  const isMemberOfSub = (subServer.memberIds || []).includes(member.id);
  if (perms.canManageSubServerInternal && (isMemberOfSub || linkedDiv?.id === member.divisionId)) {
    return true;
  }
  if (
    subServer.id === 'sub-akademi' &&
    (perms.canManageAcademy || perms.canManageSubServerInternal)
  ) {
    return true;
  }
  if (member.billetId === 'billet-wakapolri') return true;
  return false;
}

export function canMemberShareSubServerInvite(memberOrId, subServer, state) {
  if (!subServer || !state) return false;
  if (canMemberManageSubServer(memberOrId, subServer, state)) return true;
  const memberId = typeof memberOrId === 'string' ? memberOrId : memberOrId?.id;
  if (!memberId) return false;
  const perms = getMemberEffectiveAuthorities(memberId, state);
  const isMember = (subServer.memberIds || []).includes(memberId);
  if (subServer.id === 'sub-akademi') {
    return Boolean(perms.canShareSubServerInvite || perms.canManageAcademy || perms.canEducate || perms.canLeadAkpolDrill);
  }
  return Boolean(isMember && perms.canShareSubServerInvite);
}

export function canMemberTakeoverSubServer(memberOrId, subServer, state) {
  if (!subServer || !state) return false;
  if (memberOrId === 'owner' || memberOrId?.id === 'owner') return true;
  if (canMemberManageSubServer(memberOrId, subServer, state)) return true;
  const memberId = typeof memberOrId === 'string' ? memberOrId : memberOrId?.id;
  if (!memberId) return false;
  const perms = getMemberEffectiveAuthorities(memberId, state);
  return Boolean(perms.canTakeoverSubServer);
}

export function getSubServerManagers(subServer, state) {
  if (!subServer || !state) return [];
  return (state.members || []).filter((m) => canMemberManageSubServer(m, subServer, state));
}

export function updateSubServerConfig(state, subServerId, patch = {}, actorId = 'owner') {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!sub) return { ok: false, reason: 'Sub-server tidak ditemukan' };
  if (!canMemberManageSubServer(actorId, sub, state)) {
    return { ok: false, reason: 'Tidak memiliki akses pengelola internal sub-server' };
  }

  if (typeof patch.name === 'string' && patch.name.trim()) {
    sub.name = patch.name.trim().slice(0, 36);
  }
  if (typeof patch.shortCode === 'string' && patch.shortCode.trim()) {
    sub.shortCode = patch.shortCode.trim().toUpperCase().slice(0, 4);
  }
  if (typeof patch.description === 'string' && patch.description.trim()) {
    sub.description = patch.description.trim().slice(0, 180);
  }
  if (typeof patch.color === 'string' && patch.color.startsWith('#')) {
    sub.color = patch.color;
  }

  const actor = actorId === 'owner' ? null : (state.members || []).find((m) => m.id === actorId);
  const actorName = actor ? actor.icName : state.ownerName;
  const firstCh = sub.channels?.[0]?.id;
  if (firstCh) {
    appendSubServerMessage(state, sub.id, firstCh, {
      authorId: actor ? actor.id : 'owner',
      authorName: actorName,
      authorRole: `Pengelola ${sub.shortCode}`,
      authorColor: sub.color,
      isOwner: actorId === 'owner',
      text: `Konfigurasi internal sub-server "${sub.name}" [${sub.shortCode}] diperbarui oleh ${actorName}.`,
    });
  }
  if (actorId === 'owner') state.lastOwnerActionAt = state.simSeconds;
  return { ok: true, sub };
}

export function setSubServerInternalAccess(state, subServerId, targetMemberId, config = {}, actorId = 'owner') {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  const target = (state.members || []).find((m) => m.id === targetMemberId);
  if (!sub || !target) return { ok: false, reason: 'Sub-server atau anggota tidak ditemukan' };
  if (!canMemberManageSubServer(actorId, sub, state)) {
    return { ok: false, reason: 'Tidak memiliki izin mengelola role internal sub-server' };
  }

  if (!Array.isArray(sub.memberIds)) sub.memberIds = [];
  if (!sub.memberIds.includes(target.id)) sub.memberIds.push(target.id);
  if (!sub.memberRoles) sub.memberRoles = {};

  const prev = typeof sub.memberRoles[target.id] === 'object' ? sub.memberRoles[target.id] : {};
  const canManage = typeof config.canManageSubServer === 'boolean'
    ? config.canManageSubServer
    : !prev.canManageSubServer;
  const roleName =
    (typeof config.roleName === 'string' && config.roleName.trim()) ||
    (canManage ? `Pengelola Internal ${sub.shortCode}` : `Anggota Satuan ${sub.shortCode}`);
  const badge =
    (typeof config.badge === 'string' && config.badge.trim()) ||
    (canManage ? `Admin ${sub.shortCode}` : `Personel ${sub.shortCode}`);

  sub.memberRoles[target.id] = {
    ...prev,
    roleName,
    color: config.color || (canManage ? '#8B5CF6' : sub.color || '#38BDF8'),
    canManageSubServer: canManage,
    badge,
  };

  const actor = actorId === 'owner' ? null : (state.members || []).find((m) => m.id === actorId);
  const actorName = actor ? actor.icName : state.ownerName;
  const firstCh = sub.channels?.[0]?.id;
  if (firstCh) {
    appendSubServerMessage(state, sub.id, firstCh, {
      authorId: actor ? actor.id : 'owner',
      authorName: actorName,
      authorRole: `Pengelola ${sub.shortCode}`,
      authorColor: '#8B5CF6',
      isOwner: actorId === 'owner',
      text: `${target.icName} kini ditetapkan sebagai "${roleName}" (Akses Kelola Internal & Bagikan Link: ${canManage ? 'AKTIF' : 'DICABUT'}) oleh ${actorName}.`,
    });
  }
  if (actorId === 'owner') state.lastOwnerActionAt = state.simSeconds;
  return { ok: true, role: sub.memberRoles[target.id] };
}

export function takeoverSubServerLeadership(
  state,
  subServerId,
  newOwnerId,
  actorId = 'owner',
  reason = 'Owner lama mutasi / restrukturisasi internal'
) {
  const sub = (state.subServers || []).find((s) => s.id === subServerId);
  if (!sub) return { ok: false, reason: 'Sub-server tidak ditemukan' };
  if (!canMemberTakeoverSubServer(actorId, sub, state)) {
    return { ok: false, reason: 'Tidak memiliki otoritas pengambilalihan kepemimpinan sub-server' };
  }
  const newOwner = newOwnerId === 'owner' ? null : (state.members || []).find((m) => m.id === newOwnerId);
  if (newOwnerId !== 'owner' && !newOwner) {
    return { ok: false, reason: 'Calon pimpinan pengganti tidak ditemukan' };
  }

  const prevOwnerId = sub.ownerId;
  if (prevOwnerId === newOwnerId) {
    return { ok: false, reason: 'Personel tersebut sudah menjadi pemilik sub-server saat ini' };
  }

  if (!Array.isArray(sub.memberIds)) sub.memberIds = [];
  if (!sub.memberIds.includes(newOwnerId)) sub.memberIds.unshift(newOwnerId);
  if (!sub.memberRoles) sub.memberRoles = {};

  if (prevOwnerId && prevOwnerId !== 'owner' && sub.memberRoles[prevOwnerId]) {
    const prevRole = typeof sub.memberRoles[prevOwnerId] === 'object' ? sub.memberRoles[prevOwnerId] : {};
    sub.memberRoles[prevOwnerId] = {
      ...prevRole,
      roleName: `Mantan Pimpinan ${sub.shortCode}`,
      canManageSubServer: false,
      badge: `Alumni Komando ${sub.shortCode}`,
    };
  }

  sub.ownerId = newOwnerId;
  if (newOwnerId === 'owner') sub.ownerJoined = true;

  const prevNewRole = typeof sub.memberRoles[newOwnerId] === 'object' ? sub.memberRoles[newOwnerId] : {};
  sub.memberRoles[newOwnerId] = {
    ...prevNewRole,
    roleName: `Ketua Satuan ${sub.shortCode}`,
    color: sub.color || '#D4A024',
    canManageSubServer: true,
    badge: `Pimpinan ${sub.name}`,
  };

  const actor = actorId === 'owner' ? null : (state.members || []).find((m) => m.id === actorId);
  const actorName = actor ? actor.icName : state.ownerName;
  const newOwnerName = newOwner ? newOwner.icName : state.ownerName;

  const firstCh = sub.channels?.[0]?.id;
  if (firstCh) {
    appendSubServerMessage(state, sub.id, firstCh, {
      authorId: actor ? actor.id : 'owner',
      authorName: actorName,
      authorRole: 'Serah Terima Pimpinan',
      authorColor: '#F59E0B',
      isOwner: actorId === 'owner',
      text: `[ALIH KEPEMIMPINAN SUB-SERVER] Kepemimpinan "${sub.name}" resmi diambil alih oleh ${newOwnerName} (ditetapkan: ${actorName}). Alasan: ${reason}.`,
    });
  }

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Tata Kelola Sub-Server',
    authorRole: sub.shortCode,
    authorColor: sub.color || '#8B5CF6',
    isSystem: true,
    text: `Kepemimpinan sub-server "${sub.name}" [${sub.shortCode}] dialihkan ke ${newOwnerName} (${reason}).`,
  });

  if (actorId === 'owner') state.lastOwnerActionAt = state.simSeconds;
  return { ok: true, sub, newOwnerId };
}
