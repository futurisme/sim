// 100% Custom-Engine Meritocracy & Environmental Priority Scoring for Assignments, Appointments & Sub-Roles

export const PRESTIGIOUS_DIVISION_PATTERNS = [
  /brimob/i,
  /reskrim/i,
  /propam/i,
  /intelkam/i,
  /polairud/i,
  /satlantas|lantas/i,
];

export const PRESTIGIOUS_UNIT_PATTERNS = [
  /gegana/i,
  /jibom/i,
  /krimum|reserse/i,
  /siber|cyber/i,
  /turjawali|patwal/i,
  /inafis|forensik/i,
  /provos/i,
];

export function isPrestigiousDivision(divisionOrName) {
  if (!divisionOrName) return false;
  const name = typeof divisionOrName === 'string' ? divisionOrName : divisionOrName.name || divisionOrName.id || '';
  return PRESTIGIOUS_DIVISION_PATTERNS.some((p) => p.test(name));
}

export function isPrestigiousUnit(unitOrTitle) {
  if (!unitOrTitle) return false;
  const title = typeof unitOrTitle === 'string' ? unitOrTitle : unitOrTitle.roleTitle || unitOrTitle.name || '';
  return PRESTIGIOUS_UNIT_PATTERNS.some((p) => p.test(title));
}

/**
 * Calculates a comprehensive meritocracy score (0..1000+) based on:
 * 1. Performance (professionalism, loyalty, activity drive, betah)
 * 2. Accolades & Accreditations (medals, certificates, brevets)
 * 3. Experience & Longevity (XP, tenure days in server, training sessions)
 * 4. Disciplinary Record (deductions for violations and detention)
 * 5. Environmental & Specialty Fit (synergy with division/unit/administrative tasks)
 */
export function calculateMemberMeritScore(member, state, context = {}) {
  if (!member) {
    return { total: 0, performanceScore: 0, experienceScore: 0, awardsScore: 0, penalties: 0, fitBonus: 0 };
  }

  const p = member.personality || { professionalism: 60, loyalty: 60, activityDrive: 60 };
  const prof = Number(p.professionalism) || 60;
  const loy = Number(member.loyalty ?? p.loyalty) || 60;
  const act = Number(p.activityDrive) || 60;
  const betah = Number(member.betahScore) || 60;

  // 1. Performance component (max ~380)
  const performanceScore = Math.round(prof * 1.5 + loy * 1.1 + act * 0.9 + betah * 0.8);

  // 2. Experience component (XP, tenure, training)
  const simSec = state?.simSeconds || 0;
  const joinedSec = member.joinedAtSec || 0;
  const daysInServer = Math.max(0, (simSec - joinedSec) / 86400);
  const xpPart = Math.min(260, Math.round((member.xp || 0) * 0.18));
  const tenurePart = Math.min(140, Math.round(daysInServer * 18));
  const trainingPart = Math.min(60, (member.trainingSessions || 0) * 6);
  const experienceScore = xpPart + tenurePart + trainingPart;

  // 3. Accolades & Accreditations component
  const awards = Array.isArray(member.awards) ? member.awards : [];
  let medalCount = 0;
  let certCount = 0;
  let brevetCount = 0;

  for (const aw of awards) {
    if (aw.startsWith('med-')) medalCount++;
    else if (aw.startsWith('srt-')) certCount++;
    else if (aw.startsWith('brv-')) brevetCount++;
  }

  const awardsScore = medalCount * 35 + certCount * 25 + brevetCount * 18;

  // 4. Disciplinary penalties
  const violations = Number(member.violationCount) || 0;
  const isDetained = (member.detainedRemaining || 0) > 0;
  const penalties = violations * 45 + (isDetained ? 120 : 0);

  // 5. Environmental & Specialty Fit
  let fitBonus = 0;
  const divId = context.divisionId || member.divisionId;
  const unitRole = context.unitRole || member.divisionUnitRole;
  const billet = context.billet || null;
  const subRole = context.subRole || member.subRole;

  if (divId) {
    const divObj = state?.divisions?.find((d) => d.id === divId);
    const divName = divObj?.name || '';
    if (isPrestigiousDivision(divName)) fitBonus += 25;

    if (/brimob/i.test(divName)) {
      if (awards.includes('brv-taktis')) fitBonus += 30;
      if (awards.includes('brv-gegana')) fitBonus += 30;
      if (awards.includes('srt-patwal')) fitBonus += 20;
    } else if (/reskrim/i.test(divName)) {
      if (awards.includes('brv-reserse')) fitBonus += 30;
      if (awards.includes('srt-investigasi')) fitBonus += 30;
      if (awards.includes('srt-negosiator')) fitBonus += 20;
    } else if (/propam/i.test(divName)) {
      if (awards.includes('brv-propam')) fitBonus += 35;
      if (awards.includes('med-integritas')) fitBonus += 35;
      if (violations === 0) fitBonus += 25;
    } else if (/satlantas|lantas/i.test(divName)) {
      if (awards.includes('brv-pelopor')) fitBonus += 30;
      if (awards.includes('srt-patwal')) fitBonus += 30;
    } else if (/intelkam/i.test(divName)) {
      if (awards.includes('brv-intel')) fitBonus += 30;
      if (awards.includes('brv-siber')) fitBonus += 25;
    }
  }

  if (unitRole && isPrestigiousUnit(unitRole)) {
    fitBonus += 30;
    if (/gegana/i.test(unitRole) && awards.includes('brv-gegana')) fitBonus += 35;
    if (/krimum/i.test(unitRole) && awards.includes('brv-reserse')) fitBonus += 35;
    if (/siber/i.test(unitRole) && awards.includes('brv-siber')) fitBonus += 35;
    if (/turjawali/i.test(unitRole) && awards.includes('brv-pelopor')) fitBonus += 30;
  }

  // Administrative server sub-roles (Developer, Admin, Co-Owner, Mod, Helper)
  if (subRole || context.targetSubRole) {
    const target = subRole || context.targetSubRole;
    if (member.isRetired) {
      // Purnawirawan elder statesman bonus for administrative roles
      fitBonus += 55;
    }
    if (awards.includes('srt-subserver')) fitBonus += 30;
    if (awards.includes('med-karya')) fitBonus += 25;
    if (/developer/i.test(target)) {
      if (awards.includes('brv-siber')) fitBonus += 35;
      if (act >= 75) fitBonus += 20;
    }
    if (/admin|co-owner/i.test(target)) {
      if (awards.includes('srt-komando')) fitBonus += 30;
      if (prof >= 80) fitBonus += 25;
    }
  }

  // Purnawirawan lifetime service bonus
  if (member.isRetired) {
    fitBonus += 40;
  }

  const rawTotal = performanceScore + experienceScore + awardsScore + fitBonus - penalties;
  const total = Math.max(10, rawTotal);

  return {
    total,
    performanceScore,
    experienceScore,
    awardsScore,
    penalties,
    fitBonus,
    daysInServer,
  };
}

/**
 * Sorts a candidate pool strictly by meritocracy score in descending order.
 */
export function sortCandidatesByMerit(candidates, state, context = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  return [...candidates].sort((a, b) => {
    const scoreA = calculateMemberMeritScore(a, state, context).total;
    const scoreB = calculateMemberMeritScore(b, state, context).total;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.xp || 0) - (a.xp || 0);
  });
}
