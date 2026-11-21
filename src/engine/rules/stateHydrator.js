import {
  INITIAL_BILLETS,
  INITIAL_DIVISIONS,
  INITIAL_RANKS,
  PERMISSION_DEFINITIONS,
  buildAllPermissions,
  buildEmptyPermissions,
} from '../constants.js';
import { getCircadianProfile } from '../aiBrain.js';
import { normalizeDutyProfile } from './propamSecurity.js';
import { ensureSubServerRegistrasiChannel, ensurePerwiraSubServer } from './subServers.js';
import { ensureAkpolSubServer } from './akpolCohort.js';
import { validateAndCleanDivisionAndSubServerOwnership } from './dmOwnership.js';
import {
  buildPersonalityFromProfile,
  clamp,
  createInitialState,
  formatSimClock,
  getRankById,
} from './stateFactory.js';

export function calculateServerAttractiveness(state) {
  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner);
  const rankScore = Math.min(25, nonOwnerRanks.length * 4.2);
  const divisionScore = Math.min(25, state.divisions.length * 6.25);

  const filledBillets = state.billets.filter((b) => Boolean(b.holderId)).length;
  const billetScore = state.billets.length > 0 ? Math.min(20, filledBillets * 7) : 0;

  const avgBetah =
    state.members.length > 0
      ? state.members.reduce((acc, m) => acc + m.betahScore, 0) / state.members.length
      : 50;
  const moraleScore = (avgBetah / 100) * 20;
  const ownerActiveBonus = state.simSeconds - state.lastOwnerActionAt < 900 ? 6 : 2;
  const techBonus = state.tech ? Math.min(4, (state.tech.systemHealth / 100) * 4) : 3;
  const affBonus = Array.isArray(state.subServers)
    ? Math.min(5, state.subServers.filter((s) => s.affiliatedToMain).length * 2)
    : 0;

  const combinedMorale = Math.min(30, moraleScore + ownerActiveBonus + techBonus + affBonus);
  const total = Math.round(clamp(rankScore + divisionScore + billetScore + combinedMorale, 10, 100));
  return {
    total,
    breakdown: {
      rankScore: Math.round(rankScore),
      divisionScore: Math.round(divisionScore),
      billetScore: Math.round(billetScore),
      moraleScore: Math.round(combinedMorale),
    },
  };
}

export function evaluateAgentBetahDelta(agent, state, summary = null) {
  let delta = 0;

  const nonOwnerRanks = summary
    ? summary.sortedNonOwnerRanks
    : state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const nonOwnerCount = nonOwnerRanks.length;
  if (nonOwnerCount >= 5) delta += 0.45;
  else if (nonOwnerCount <= 2) delta -= 0.7;

  if (state.divisions.length >= 3) delta += 0.45;
  else if (state.divisions.length <= 1) delta -= 0.5;

  if (agent.divisionId) delta += 0.35;
  else delta -= 0.65;

  if (agent.needsWelcome) delta -= 0.75;

  const filledBillets = summary
    ? summary.filledBilletsCount
    : state.billets.filter((b) => Boolean(b.holderId)).length;
  delta += filledBillets * 0.2;

  const p = agent.personality || { professionalism: 65, loyalty: 65, activityDrive: 65, ambition: 55, empathy: 65 };

  if (agent.awards && agent.awards.length > 0) delta += 0.15 * agent.awards.length;
  if (agent.subRole) delta += 0.35;
  delta += ((p.loyalty - 50) / 100) * 0.45;
  delta += ((p.empathy - 50) / 100) * 0.2;

  if (agent.billetId && p.professionalism < 45) delta -= 0.35;
  if (state.tech && state.tech.systemHealth < 65) delta -= 0.45;

  const currentRank = summary?.rankMap
    ? summary.rankMap.get(agent.rankId) || state.ranks[0]
    : getRankById(state, agent.rankId);
  const nextRank = nonOwnerRanks.find((r) => r.order > currentRank.order);
  if (nextRank && agent.xp >= nextRank.minXp && agent.academyStatus !== 'ENROLLED' && p.professionalism >= 45) {
    const ambitionPenalty = p.ambition >= 75 ? 1.15 : 0.45;
    delta -= ambitionPenalty;
  }

  const onlineCount = summary
    ? summary.onlineCount
    : state.members.filter((m) => m.status === 'online-2d').length;
  if (onlineCount >= 4) delta += 0.3;

  return clamp(delta, -2.5, 2.5);
}

export function shouldNewApplicantJoin(state, rngValue = 0.5) {
  const totalQuota = state.divisions.reduce((sum, d) => sum + (Number(d.quota) || 6), 0);
  const maxRoster = Math.min(100, Math.max(14, totalQuota + 8));
  if (state.members.length >= maxRoster) return false;

  const circadian = getCircadianProfile(state.simSeconds);
  const { total: attractiveness } = calculateServerAttractiveness(state);
  const baseChance = clamp((attractiveness - 18) / 100, 0.14, 0.82);
  const joinChance = clamp(baseChance * (circadian.isNight ? 0.45 : 1.05), 0.08, 0.88);
  return rngValue < joinChance;
}

export function selectBestDivisionForAgent(divisions, members, countMap = null) {
  if (!divisions || divisions.length === 0) return null;
  let counts = countMap;
  if (!counts) {
    counts = new Map();
    for (const m of members) {
      if (m.divisionId) counts.set(m.divisionId, (counts.get(m.divisionId) || 0) + 1);
    }
  }
  let best = null;
  let bestRoom = -Infinity;
  for (const div of divisions) {
    const count = counts.get(div.id) || 0;
    const room = (div.quota || 6) - count;
    if (room > bestRoom) {
      bestRoom = room;
      best = div;
    }
  }
  return best ? best.id : divisions[0].id;
}

export function appendChannelMessage(state, channelId, msg) {
  if (!state.messages[channelId]) {
    state.messages[channelId] = [];
  }
  const entry = {
    id: `msg-${++state.nextId}`,
    timeLabel: formatSimClock(state.simSeconds),
    reactions: [],
    ...msg,
  };
  state.messages[channelId].push(entry);
  if (state.messages[channelId].length > 65) {
    state.messages[channelId].shift();
  }
  if (!msg.isOwner) {
    state.unreadByChannel[channelId] = (state.unreadByChannel[channelId] || 0) + 1;
  }
  return entry;
}

export function hydrateSimulationState(parsed) {
  if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.ranks) || !parsed.tech) {
    return null;
  }
  const defaults = createInitialState();

  parsed.members.forEach((m) => {
    if (!m.personality) m.personality = buildPersonalityFromProfile(m);
    if (!m.speechQuirk) m.speechQuirk = 'standar';
    if (!m.academyStatus) m.academyStatus = 'NONE';
    if (typeof m.akpolRegistered !== 'boolean') {
      m.akpolRegistered = m.academyStatus === 'ENROLLED' || m.academyStatus === 'GRADUATED';
    }
    if (typeof m.akpolRequestSent !== 'boolean') m.akpolRequestSent = false;
    if (typeof m.trainingProgress !== 'number') m.trainingProgress = 0;
    if (typeof m.trainingSessions !== 'number') m.trainingSessions = 0;
    if (typeof m.detainedRemaining !== 'number') m.detainedRemaining = 0;
    if (typeof m.detentionReason !== 'string') m.detentionReason = '';
    if (m.prisonCell === undefined) m.prisonCell = null;
    if (m.divisionUnitId === undefined) m.divisionUnitId = null;
    if (m.divisionSubUnitId === undefined) m.divisionSubUnitId = null;
    if (m.divisionUnitRole === undefined) m.divisionUnitRole = null;
    if (typeof m.violationCount !== 'number') m.violationCount = 0;
    if (!m.personalAuthority) {
      m.personalAuthority = {
        canOwnSubServer: m.id === 'ai-1' || m.id === 'ai-2' || Boolean(m.billetId),
        canAffiliateServer: m.id === 'ai-1',
      };
    }
  });

  if (!Array.isArray(parsed.dms)) parsed.dms = [];
  if (!Array.isArray(parsed.divisionProposals)) parsed.divisionProposals = [];
  if (!Array.isArray(parsed.divisionRecruits)) parsed.divisionRecruits = [];
  if (!Array.isArray(parsed.bannedUsernames)) parsed.bannedUsernames = [];
  if (!Array.isArray(parsed.civilians)) parsed.civilians = defaults.civilians;
  if (!Array.isArray(parsed.incidents)) parsed.incidents = [];
  if (!parsed.ownerProfile) parsed.ownerProfile = defaults.ownerProfile;
  if (!parsed.unreadByChannel) parsed.unreadByChannel = defaults.unreadByChannel;
  if (!parsed.cooldowns) parsed.cooldowns = defaults.cooldowns;
  if (!parsed.stats) parsed.stats = defaults.stats;

  if (!Array.isArray(parsed.subServers)) {
    parsed.subServers = defaults.subServers;
  } else {
    parsed.subServers.forEach((s) => {
      if (!Array.isArray(s.memberIds)) s.memberIds = s.ownerId && s.ownerId !== 'owner' ? [s.ownerId] : ['owner'];
      if (!s.memberRoles) s.memberRoles = {};
      if (!s.messages) s.messages = {};
      if (!s.unreadByChannel) s.unreadByChannel = {};
      if (s.category === 'DIVISI') ensureSubServerRegistrasiChannel(s);
    });
  }

  if (!parsed.academy) parsed.academy = defaults.academy;
  if (!parsed.messages['akademi-lemdiklat']) parsed.messages['akademi-lemdiklat'] = [];
  if (!parsed.authorityDelegations) parsed.authorityDelegations = {};
  if (!parsed.mabesSecurity) parsed.mabesSecurity = defaults.mabesSecurity;

  parsed.ranks.forEach((r) => {
    const def = INITIAL_RANKS.find((ir) => ir.id === r.id);
    r.permissions = r.isOwner
      ? buildAllPermissions()
      : buildEmptyPermissions(r.permissions || def?.permissions || {});
  });

  if (!Array.isArray(parsed.divisions)) {
    parsed.divisions = defaults.divisions;
  } else {
    const propamDef = INITIAL_DIVISIONS.find((d) => d.id === 'div-propam');
    if (propamDef && !parsed.divisions.some((d) => d.id === 'div-propam')) {
      parsed.divisions.push({
        ...propamDef,
        dutyProfile: normalizeDutyProfile(propamDef.dutyProfile, propamDef),
        permissions: buildEmptyPermissions(propamDef.permissions),
      });
    }
    parsed.divisions.forEach((d) => {
      const def = INITIAL_DIVISIONS.find((id) => id.id === d.id);
      if (typeof d.gateClearance !== 'boolean') d.gateClearance = def ? def.gateClearance !== false : true;
      if (d.headId === undefined) d.headId = d.id === 'div-sabhara' ? 'ai-2' : d.id === 'div-lantas' ? 'ai-1' : null;
      if (d.viceHeadId === undefined) d.viceHeadId = null;
      if (typeof d.dailyIntakeQuota !== 'number') d.dailyIntakeQuota = 3;
      if (typeof d.dailyIntakeCount !== 'number') d.dailyIntakeCount = 0;
      if (typeof d.lastQuotaDay !== 'number') d.lastQuotaDay = 0;
      if (!d.proposalStatus) d.proposalStatus = 'NONE';
      if (!Array.isArray(d.units)) d.units = [];
      if (typeof d.recruitmentOpen !== 'boolean') d.recruitmentOpen = false;
      if (typeof d.lastInviteBroadcastSec !== 'number') d.lastInviteBroadcastSec = -9999;
      d.dutyProfile = normalizeDutyProfile(d.dutyProfile || def?.dutyProfile, d);
      d.permissions = buildEmptyPermissions(d.permissions || def?.permissions || {});
    });
  }

  if (Array.isArray(parsed.billets)) {
    for (const def of INITIAL_BILLETS) {
      if (!parsed.billets.some((b) => b.id === def.id)) {
        parsed.billets.push({ ...def, permissions: { ...def.permissions } });
      }
    }
    parsed.billets.forEach((b, idx) => {
      const def = INITIAL_BILLETS.find((ib) => ib.id === b.id);
      if (typeof b.hierarchyOrder !== 'number') {
        b.hierarchyOrder = def ? def.hierarchyOrder : Math.max(20, 70 - idx * 12);
      }
      if (!b.permissions) b.permissions = {};
      for (const p of PERMISSION_DEFINITIONS) {
        if (typeof b.permissions[p.key] !== 'boolean') {
          b.permissions[p.key] = def?.permissions?.[p.key] ?? false;
        }
      }
    });
  } else {
    parsed.billets = defaults.billets;
  }

  ensureAkpolSubServer(parsed);
  ensurePerwiraSubServer(parsed);
  validateAndCleanDivisionAndSubServerOwnership(parsed);
  return parsed;
}
