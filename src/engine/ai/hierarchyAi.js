// AI Hierarchy, Circadian Profile, Authority Resolution & Trustworthiness Engine
import { DISTRICTS, PERMISSION_DEFINITIONS, ROAD_X, ROAD_Y, SUB_ROLES } from '../constants.js';

export function getCircadianProfile(simSeconds) {
  const hour = Math.floor((simSeconds / 3600) % 24);
  if (hour >= 23 || hour < 5) {
    return {
      hour,
      phase: 'NIGHT_SLEEP',
      label: 'Jam Tidur Malam',
      onlineRatio: 0.3,
      incidentRateMultiplier: 0.55,
      isNight: true,
    };
  }
  if (hour >= 5 && hour < 11) {
    return {
      hour,
      phase: 'MORNING_APEL',
      label: 'Pagi · Apel & Sibuk',
      onlineRatio: 0.78,
      incidentRateMultiplier: 0.95,
      isNight: false,
    };
  }
  if (hour >= 11 && hour < 17) {
    return {
      hour,
      phase: 'DAY_PATROL',
      label: 'Siang · Patroli Aktif',
      onlineRatio: 0.85,
      incidentRateMultiplier: 1.15,
      isNight: false,
    };
  }
  return {
    hour,
    phase: 'PRIME_TIME',
    label: 'Prime Time Ramai',
    onlineRatio: 1.0,
    incidentRateMultiplier: 1.35,
    isNight: false,
  };
}

/**
 * Computes effective Discord-style hierarchy power (1..100) from Billet, SubRole, and Rank.
 * Owner is always 100. Lower-hierarchy roles cannot execute commands on equal/higher roles.
 */
export function getMemberHierarchy(memberOrId, state) {
  if (!memberOrId || memberOrId === 'owner') return 100;
  const member =
    typeof memberOrId === 'string'
      ? state.members.find((m) => m.id === memberOrId)
      : memberOrId;
  if (!member) return 0;

  const billet = member.billetId ? state.billets.find((b) => b.id === member.billetId) : null;
  const billetLevel = billet ? Math.min(99, Math.max(1, Number(billet.hierarchyOrder) || 40)) : 0;

  const subRoleObj = member.subRole ? SUB_ROLES.find((s) => s.id === member.subRole) : null;
  const subRoleLevel = subRoleObj ? subRoleObj.hierarchyBonus || 0 : 0;

  const rankObj = state.ranks.find((r) => r.id === member.rankId);
  if (rankObj?.isOwner) return 100;
  const rankLevel = rankObj ? Math.min(72, (Number(rankObj.order) || 1) * 4) : 4;

  return Math.max(billetLevel, subRoleLevel, rankLevel);
}

/**
 * Anti-Abuse Hierarchy Enforcement:
 * Only an actor strictly higher in hierarchy (actorLevel > targetLevel) may manage the target.
 */
export function canActorManageTarget(actorOrId, targetOrId, state) {
  if (!targetOrId) return { allowed: false, actorLevel: 0, targetLevel: 0 };
  if (targetOrId === 'owner' || targetOrId?.id === 'owner') {
    return { allowed: false, actorLevel: getMemberHierarchy(actorOrId, state), targetLevel: 100 };
  }
  if (actorOrId === 'owner' || actorOrId?.id === 'owner') {
    return { allowed: true, actorLevel: 100, targetLevel: getMemberHierarchy(targetOrId, state) };
  }
  const actorId = typeof actorOrId === 'string' ? actorOrId : actorOrId?.id;
  const targetId = typeof targetOrId === 'string' ? targetOrId : targetOrId?.id;
  if (!actorId || !targetId || actorId === targetId) {
    return { allowed: false, actorLevel: 0, targetLevel: 0 };
  }
  const actorLevel = getMemberHierarchy(actorOrId, state);
  const targetLevel = getMemberHierarchy(targetOrId, state);
  return {
    allowed: actorLevel > targetLevel,
    actorLevel,
    targetLevel,
  };
}

/**
 * Resolves separated Role (Rank), Division, and Billet permissions alongside
 * exclusive Authority Delegations (Pengalihan Otoritas ke Jabatan).
 */
export function getMemberAuthorityBreakdown(memberOrId, state) {
  const empty = { fromRank: [], fromDivision: [], fromBillet: [], delegatedOut: [], effective: {} };
  if (!state) return empty;
  if (memberOrId === 'owner' || memberOrId?.id === 'owner') {
    const eff = {};
    for (const p of PERMISSION_DEFINITIONS) eff[p.key] = true;
    return { ...empty, fromRank: PERMISSION_DEFINITIONS.map((p) => p.key), effective: eff };
  }
  const member =
    typeof memberOrId === 'string'
      ? state.members.find((m) => m.id === memberOrId)
      : memberOrId;
  if (!member) return empty;

  const rank = state.ranks.find((r) => r.id === member.rankId);
  if (rank?.isOwner) {
    const eff = {};
    for (const p of PERMISSION_DEFINITIONS) eff[p.key] = true;
    return { ...empty, fromRank: PERMISSION_DEFINITIONS.map((p) => p.key), effective: eff };
  }

  const division = member.divisionId ? state.divisions.find((d) => d.id === member.divisionId) : null;
  const billet = member.billetId ? state.billets.find((b) => b.id === member.billetId) : null;
  const delegations = state.authorityDelegations || {};

  const fromRank = [];
  const fromDivision = [];
  const fromBillet = [];
  const delegatedOut = [];
  const effective = {};

  for (const def of PERMISSION_DEFINITIONS) {
    const key = def.key;
    const delegatedBilletId = delegations[key] || null;

    if (delegatedBilletId) {
      if (billet && billet.id === delegatedBilletId) {
        effective[key] = true;
        fromBillet.push(key);
      } else {
        effective[key] = false;
        if (rank?.permissions?.[key] || division?.permissions?.[key] || billet?.permissions?.[key]) {
          delegatedOut.push(key);
        }
      }
      continue;
    }

    const rHas = Boolean(rank?.permissions?.[key]);
    const dHas = Boolean(division?.permissions?.[key]);
    const bHas = Boolean(billet?.permissions?.[key]);

    if (rHas) fromRank.push(key);
    if (dHas) fromDivision.push(key);
    if (bHas) fromBillet.push(key);
    effective[key] = rHas || dHas || bHas;
  }

  return { fromRank, fromDivision, fromBillet, delegatedOut, effective };
}

export function getMemberEffectiveAuthorities(memberOrId, state) {
  return getMemberAuthorityBreakdown(memberOrId, state).effective;
}

/**
 * Evaluates AI-person personality percentages into trustworthiness & abuse-risk assessment.
 */
export function assessMemberTrustworthiness(member) {
  const p = member?.personality || {
    professionalism: 60,
    loyalty: 60,
    activityDrive: 60,
    ambition: 55,
    empathy: 60,
  };

  const ambitionGap = Math.max(0, p.ambition - p.professionalism);
  const score = Math.round(
    Math.max(
      0,
      Math.min(100, p.professionalism * 0.52 + p.loyalty * 0.34 + p.empathy * 0.14 - ambitionGap * 0.25)
    )
  );

  if (p.professionalism < 48 || (p.ambition >= 76 && p.loyalty < 48)) {
    return {
      score,
      level: 'RISIKO_ABUSE',
      label: 'Rawan Abuse',
      color: '#DA373C',
      summary: 'Profesionalisme/loyalitas rendah. Rawan menyalahgunakan wewenang Kick/Demosi bila dilantik sembarangan.',
    };
  }
  if (score >= 73 && p.professionalism >= 72) {
    return {
      score,
      level: 'TINGGI',
      label: 'Layak Dipercaya',
      color: '#23A55A',
      summary: 'Disiplin dan loyalitas tinggi. Aman diberi jabatan strategis serta otonomi penuh.',
    };
  }
  return {
    score,
    level: 'SEDANG',
    label: 'Cukup Stabil',
    color: '#F0B232',
    summary: 'Cocok untuk peran operasional rutin; pantau kinerja sebelum diberi otoritas hukuman.',
  };
}

export function getDistrictCoordinates(district) {
  if (!district) {
    return {
      x: ROAD_X[Math.floor(Math.random() * ROAD_X.length)],
      y: ROAD_Y[Math.floor(Math.random() * ROAD_Y.length)],
    };
  }
  return {
    x: district.x + district.w * 0.5,
    y: district.y + district.h * 0.5,
  };
}

export function getDistrictById(id) {
  return DISTRICTS.find((d) => d.id === id) || null;
}
