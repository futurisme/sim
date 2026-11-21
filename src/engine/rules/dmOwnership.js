import { getMemberHierarchy } from '../aiBrain.js';
import {
  clamp,
  formatSimClock,
  getDivisionById,
  getRankById,
} from './stateFactory.js';

export function sendOwnerDm(state, { peerId, senderId, text, proposalId = null, divisionId = null }) {
  if (!peerId || !text) return null;
  if (!Array.isArray(state.dms)) state.dms = [];
  const peer = state.members.find((m) => m.id === peerId);
  const sender = senderId === 'owner' ? null : state.members.find((m) => m.id === senderId);
  const senderRank = sender ? getRankById(state, sender.rankId) : null;
  const senderDiv = sender ? getDivisionById(state, sender.divisionId) : null;

  const entry = {
    id: `dm-${++state.nextId}`,
    peerId,
    senderId,
    senderName: senderId === 'owner' ? `${state.ownerName} (Anda)` : sender?.icName || peer?.icName || 'Pejabat Divisi',
    senderRole:
      senderId === 'owner'
        ? 'Kapolda (Owner)'
        : senderDiv
          ? `${senderRank?.name || 'Perwira'} · Ketua ${senderDiv.name}`
          : senderRank?.name || 'Perwira',
    senderColor: senderId === 'owner' ? '#D4A024' : senderDiv?.color || senderRank?.color || '#38BDF8',
    isOwner: senderId === 'owner',
    text: String(text).trim(),
    timeLabel: formatSimClock(state.simSeconds),
    proposalId,
    divisionId,
    read: senderId === 'owner',
  };
  state.dms.push(entry);
  if (state.dms.length > 140) {
    state.dms.shift();
  }
  return entry;
}

export function markDmRead(state, peerId) {
  if (!Array.isArray(state.dms)) return 0;
  let count = 0;
  state.dms.forEach((m) => {
    if (m.peerId === peerId && !m.read) {
      m.read = true;
      count++;
    }
  });
  return count;
}

export function validateAndCleanDivisionAndSubServerOwnership(state) {
  if (!state || !Array.isArray(state.divisions) || !Array.isArray(state.members)) return;
  const commandRoleCounts = new Map();

  state.divisions.forEach((div) => {
    if (div.headId) {
      const head = state.members.find((m) => m.id === div.headId);
      const isSameDiv = head && head.divisionId === div.id;
      const divMembersCount = state.members.filter((m) => m.divisionId === div.id).length;
      const rank = head ? getRankById(state, head.rankId) : null;
      const isQualifiedPerwira = rank && (rank.order || 1) >= 4;
      const count = commandRoleCounts.get(div.headId) || 0;

      if (!isSameDiv && (divMembersCount > 0 || !isQualifiedPerwira || count >= 2)) {
        div.headId = null;
      } else if (div.headId) {
        commandRoleCounts.set(div.headId, (commandRoleCounts.get(div.headId) || 0) + 1);
      }
    }
    if (!div.headId) {
      ensureDivisionHead(state, div);
      if (div.headId) {
        commandRoleCounts.set(div.headId, (commandRoleCounts.get(div.headId) || 0) + 1);
      }
    }
    if (div.viceHeadId) {
      const vice = state.members.find((m) => m.id === div.viceHeadId && m.divisionId === div.id);
      if (!vice || div.viceHeadId === div.headId) {
        div.viceHeadId = null;
      }
    }
  });

  if (Array.isArray(state.subServers)) {
    state.subServers.forEach((sub) => {
      if (sub.ownerId && sub.ownerId !== 'owner') {
        const owner = state.members.find((m) => m.id === sub.ownerId);
        const billet = owner && owner.billetId ? state.billets.find((b) => b.id === owner.billetId) : null;
        const isMabesExec = billet && /(wakapolri|kabag|kalemdiklat|kapolda)/i.test(billet.name);
        const isSameDiv = sub.linkedDivisionId && owner && owner.divisionId === sub.linkedDivisionId;
        const isGenericSub =
          !sub.linkedDivisionId &&
          owner &&
          (owner.personalAuthority?.canOwnSubServer || sub.memberRoles?.[owner.id]?.canManageSubServer);

        if (!owner || (!isSameDiv && !isMabesExec && !isGenericSub)) {
          const div = sub.linkedDivisionId ? state.divisions.find((d) => d.id === sub.linkedDivisionId) : null;
          const properHead = div ? ensureDivisionHead(state, div) : null;
          const delegatedMgr = (sub.memberIds || [])
            .map((mid) => state.members.find((m) => m.id === mid))
            .find((m) => m && m.id !== sub.ownerId && sub.memberRoles?.[m.id]?.canManageSubServer);
          const candidateId = properHead?.id || delegatedMgr?.id || 'owner';
          sub.ownerId = candidateId;
          if (candidateId === 'owner') sub.ownerJoined = true;
        }
      }
    });
  }
}

export function ensureDivisionHead(state, division) {
  if (!division) return null;
  if (division.headId) {
    const existing = state.members.find(
      (m) => m.id === division.headId && m.divisionId === division.id && (m.detainedRemaining || 0) <= 0
    );
    if (existing) return existing;
    division.headId = null;
  }
  let divMembers = state.members
    .filter((m) => m.divisionId === division.id && (m.detainedRemaining || 0) <= 0)
    .sort((a, b) => {
      const ha = getMemberHierarchy(a, state);
      const hb = getMemberHierarchy(b, state);
      if (hb !== ha) return hb - ha;
      return (b.xp || 0) - (a.xp || 0);
    });

  if (divMembers.length === 0) {
    const unassigned = state.members
      .filter((m) =>
        !m.divisionId &&
        !m.billetId &&
        (getRankById(state, m.rankId)?.order || 1) >= 2 &&
        (m.detainedRemaining || 0) <= 0 &&
        m.academyStatus !== 'ENROLLED'
      )
      .sort((a, b) => {
        const ha = getMemberHierarchy(a, state);
        const hb = getMemberHierarchy(b, state);
        if (hb !== ha) return hb - ha;
        return (b.xp || 0) - (a.xp || 0);
      });
    if (unassigned.length > 0) {
      const chosen = unassigned[0];
      chosen.divisionId = division.id;
      divMembers = [chosen];
    }
  }

  const chosen = divMembers[0] || null;
  division.headId = chosen ? chosen.id : null;
  if (!division.viceHeadId && divMembers.length > 1) {
    division.viceHeadId = divMembers[1].id;
  }
  return chosen;
}

export function setDivisionDailyQuota(state, divisionId, quota, actorLabel = 'Ketua Divisi') {
  const div = getDivisionById(state, divisionId);
  if (!div) return false;
  const currentDay = Math.floor((state.simSeconds || 0) / 86400);
  const cleanQuota = clamp(Math.round(Number(quota) || 3), 1, 20);
  div.dailyIntakeQuota = cleanQuota;
  if (div.lastQuotaDay !== currentDay) {
    div.dailyIntakeCount = 0;
    div.lastQuotaDay = currentDay;
  }
  if (div.units && Array.isArray(div.units)) {
    const openProp = (state.divisionProposals || []).find(
      (p) => p.divisionId === div.id && p.status === 'PENDING'
    );
    if (openProp) openProp.dailyQuota = cleanQuota;
  }
  if (actorLabel === state.ownerName) {
    state.lastOwnerActionAt = state.simSeconds;
  }
  return true;
}
