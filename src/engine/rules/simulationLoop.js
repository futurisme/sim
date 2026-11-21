import {
  AI_NAME_POOL,
  DISTRICTS,
  MABES_ZONES,
  MAX_AI_MEMBERS,
  RECRUIT_INTROS,
  ROAD_X,
  ROAD_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants.js';
import {
  generateInterAiReply,
  generateOrganicAiChatter,
  getCircadianProfile,
  runAutonomousRoleTick,
} from '../aiBrain.js';
import {
  clamp,
  createAiMember,
  formatSimClock,
  generateUniqueAiProfile,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import {
  appendChannelMessage,
  evaluateAgentBetahDelta,
  selectBestDivisionForAgent,
  shouldNewApplicantJoin,
} from './stateHydrator.js';
import {
  arrestMemberToPrison,
  getDivisionDutyProfile,
  releaseMemberFromPrison,
  setDivisionQuota,
  togglePropamGate,
} from './propamSecurity.js';
import {
  appointUnitLeader,
  assignMemberBillet,
  assignMemberDivision,
  clearMemberFromDivisionUnits,
  createBilletRecord,
  createDivisionRecord,
  createRankRecord,
  demoteMember,
  grantAwardToMember,
  kickMember,
  promoteMember,
  setMemberSubRole,
} from './orgHierarchy.js';
import {
  checkAcademyEligibility,
  educateAcademyCadet,
  enrollMemberInAcademy,
  failCadetFromAcademy,
  graduateCadetFromAcademy,
} from './academy.js';
import {
  ensureAkpolSubServer,
  getAkpolCohortStatus,
  leadAkpolCohortDrill,
  postAkpolTrainingRequest,
  stepAkpolCohortTick,
  submitAkpolRegistration,
} from './akpolCohort.js';
import {
  affiliateSubServer,
  appendSubServerMessage,
  createSubServerRecord,
} from './subServers.js';
import {
  canMemberManageSubServer,
  canMemberShareSubServerInvite,
  takeoverSubServerLeadership,
} from './subServerGovernance.js';
import {
  ensureDivisionHead,
  setDivisionDailyQuota,
  validateAndCleanDivisionAndSubServerOwnership,
} from './dmOwnership.js';
import {
  advanceDivisionTraineePhase,
  createDivisionProposalAndSendDm,
  ensureDivisionSubServerAndRegistrasi,
  evaluateDivisionCandidate,
  submitDivisionRegistration,
} from './divisionPipeline.js';
import {
  resolveIncident,
  spawnIncident,
  syncCircadianStatus,
} from './tickWorldHelpers.js';

export function stepSimulation(state, rawDt, input = { moveX: 0, moveY: 0 }, rng = Math.random) {
  if (state.speed === 0) return [];
  const dt = Math.min(rawDt, 0.05) * state.speed;
  const events = [];

  validateAndCleanDivisionAndSubServerOwnership(state);

  const prevHour = Math.floor((state.simSeconds / 3600) % 24);
  state.simSeconds += dt * 60;
  const currHour = Math.floor((state.simSeconds / 3600) % 24);

  if (currHour !== prevHour) {
    const { circadian, changed } = syncCircadianStatus(state);
    if (currHour === 23) {
      appendChannelMessage(state, 'obrolan-ooc', {
        authorId: 'system',
        authorName: 'Jadwal Kota 24J',
        authorRole: circadian.label,
        authorColor: '#80848E',
        isSystem: true,
        text: `Memasuki jam malam (${formatSimClock(state.simSeconds)}). Sebagian anggota pamit tidur; unit piket malam tetap berpatroli.`,
      });
    } else if (currHour === 6) {
      appendChannelMessage(state, 'obrolan-ooc', {
        authorId: 'system',
        authorName: 'Jadwal Kota 24J',
        authorRole: circadian.label,
        authorColor: '#FACC15',
        isSystem: true,
        text: `Selamat pagi Izumiya (${formatSimClock(state.simSeconds)})! Anggota mulai login kembali untuk giat patroli pagi.`,
      });
    } else if (currHour === 18) {
      appendChannelMessage(state, 'obrolan-ooc', {
        authorId: 'system',
        authorName: 'Jadwal Kota 24J',
        authorRole: circadian.label,
        authorColor: '#23A55A',
        isSystem: true,
        text: `Memasuki Prime Time Malam (${formatSimClock(state.simSeconds)})! Kota Izumiya dalam jam paling ramai.`,
      });
    }
    if (changed.length > 0) events.push({ type: 'CIRCADIAN_SHIFT', circadian });
  }

  if (state.directiveTimer > 0) {
    state.directiveTimer -= dt;
    if (state.directiveTimer <= 0) {
      state.directive = 'PATROLI_BEBAS';
      state.directiveTimer = 0;
    }
  }

  const effMult = clamp((state.tech?.mapEfficiency || 100) / 100, 0.75, 1.35);

  const mag = Math.hypot(input.moveX || 0, input.moveY || 0);
  if (mag > 0.08) {
    const nx = (input.moveX || 0) / Math.max(1, mag);
    const ny = (input.moveY || 0) / Math.max(1, mag);
    const boost = state.player.sirenOn ? 1.25 : 1.0;
    state.player.vx = nx * state.player.speed * boost * effMult;
    state.player.vy = ny * state.player.speed * boost * effMult;
    state.player.x = clamp(state.player.x + state.player.vx * dt, 36, WORLD_WIDTH - 36);
    state.player.y = clamp(state.player.y + state.player.vy * dt, 36, WORLD_HEIGHT - 36);
    state.player.angle = Math.atan2(ny, nx);
    state.player.walkPhase += dt * 8 * boost;
  } else {
    state.player.vx = 0;
    state.player.vy = 0;
  }
  if (state.player.speechTimer > 0) {
    state.player.speechTimer = Math.max(0, state.player.speechTimer - dt);
  }

  for (const civ of state.civilians) {
    if (civ.horizontal) {
      civ.x += civ.dir * civ.speed * dt;
      if (civ.x > WORLD_WIDTH - 30) civ.dir = -1;
      if (civ.x < 30) civ.dir = 1;
    } else {
      civ.y += civ.dir * civ.speed * dt;
      if (civ.y > WORLD_HEIGHT - 30) civ.dir = -1;
      if (civ.y < 30) civ.dir = 1;
    }
  }

  const memberById = new Map();
  for (const m of state.members) memberById.set(m.id, m);
  const rankById = new Map();
  for (const r of state.ranks) rankById.set(r.id, r);
  const divById = new Map();
  for (const d of state.divisions) divById.set(d.id, d);
  const billetById = new Map();
  for (const b of state.billets) billetById.set(b.id, b);
  const districtById = new Map();
  for (const d of DISTRICTS) districtById.set(d.id, d);

  const incByOfficerId = new Map();
  for (const inc of state.incidents) {
    if (inc.assignedOfficerId) {
      const assigned = memberById.get(inc.assignedOfficerId);
      if (
        !assigned ||
        assigned.status !== 'online-2d' ||
        assigned.academyStatus === 'ENROLLED' ||
        (assigned.detainedRemaining || 0) > 0 ||
        assigned.aiState !== 'RESPONDING'
      ) {
        inc.assignedOfficerId = null;
      } else {
        incByOfficerId.set(inc.assignedOfficerId, inc);
      }
    }
  }

  const academyDist = districtById.get('akademi');
  const gateOpen = state.mabesSecurity?.gateOpen !== false;
  const comp = MABES_ZONES.compound;
  const delegatedGateBilletId = state.authorityDelegations?.canControlPropamGate || null;

  stepAkpolCohortTick(state, dt);

  for (const ai of state.members) {
    if (ai.status !== 'online-2d') continue;
    if (ai.speechTimer > 0) ai.speechTimer = Math.max(0, ai.speechTimer - dt);

    if ((ai.detainedRemaining || 0) > 0) {
      const cellIdx = typeof ai.prisonCell === 'number' ? ai.prisonCell : 0;
      const cell = MABES_ZONES.prison.cells[cellIdx % MABES_ZONES.prison.cells.length];
      ai.aiState = 'DETAINED';
      ai.x = cell.x;
      ai.y = cell.y;
      ai.targetX = cell.x;
      ai.targetY = cell.y;
      ai.vx = 0;
      ai.vy = 0;
      ai.detainedRemaining = Math.max(0, ai.detainedRemaining - dt);
      if (ai.detainedRemaining <= 0) {
        releaseMemberFromPrison(state, ai.id, 'Sistem Rutan Mabes');
        events.push({ type: 'PROPAM_RELEASE', target: ai.id });
      }
      continue;
    }

    const div = ai.divisionId ? divById.get(ai.divisionId) || null : null;
    const billet = ai.billetId ? billetById.get(ai.billetId) || null : null;
    const rank = rankById.get(ai.rankId) || state.ranks[0];
    const dutyProfile = getDivisionDutyProfile(div);

    const hasPermGate = delegatedGateBilletId
      ? billet?.id === delegatedGateBilletId && Boolean(billet?.permissions?.canControlPropamGate)
      : Boolean(
          billet?.permissions?.canControlPropamGate ||
          div?.permissions?.canControlPropamGate ||
          rank?.permissions?.canControlPropamGate
        );

    const hasGateClearance = Boolean(
      div?.gateClearance ||
      div?.id === 'div-propam' ||
      dutyProfile.assignmentType === 'INTERNAL_SECURITY' ||
      ai.billetId === 'billet-wakapolri' ||
      ai.billetId === 'billet-kanit-propam' ||
      hasPermGate
    );

    if (ai.academyStatus === 'ENROLLED' && academyDist) {
      ai.aiState = 'TRAINING';
    } else if (state.directive !== 'APEL_MABES' && ai.aiState === 'PATROL') {
      let bestIncident = null;
      let bestScore = Infinity;
      const maxRadius = dutyProfile.patrolRadius;
      const isInternalSec = dutyProfile.assignmentType === 'INTERNAL_SECURITY';

      for (const inc of state.incidents) {
        if (inc.assignedOfficerId) continue;
        const dInc = Math.hypot(inc.x - ai.x, inc.y - ai.y);
        if (dInc > maxRadius) continue;
        const preferred = dutyProfile.preferredIncidents.includes(inc.type);
        if (isInternalSec && !preferred && dInc > 180) continue;
        const score = preferred ? dInc * 0.55 : dInc * 1.35;
        if (score < bestScore) {
          bestScore = score;
          bestIncident = inc;
        }
      }

      if (bestIncident) {
        bestIncident.assignedOfficerId = ai.id;
        incByOfficerId.set(ai.id, bestIncident);
        ai.aiState = 'RESPONDING';
        ai.targetX = bestIncident.x;
        ai.targetY = bestIncident.y;
        ai.speechBubble = isInternalSec ? 'Amankan Sekitar Mabes!' : 'Meluncur TKP!';
        ai.speechTimer = 2.0;
      }
    }

    if (!gateOpen && !hasGateClearance) {
      const inMabes =
        ai.x >= comp.x - 6 &&
        ai.x <= comp.x + comp.w + 6 &&
        ai.y >= comp.y - 6 &&
        ai.y <= comp.y + comp.h + 6;
      const targetingMabes =
        ai.targetX >= comp.x - 4 &&
        ai.targetX <= comp.x + comp.w + 4 &&
        ai.targetY >= comp.y - 4 &&
        ai.targetY <= comp.y + comp.h + 4;
      if (inMabes || targetingMabes) {
        if (inMabes) {
          ai.x = comp.x + comp.w + 22;
          ai.y = MABES_ZONES.eastGate.y;
        }
        ai.targetX = 480;
        ai.targetY = 355;
        ai.aiState = 'PATROL';
        if (!ai.speechTimer) {
          ai.speechBubble = 'Gerbang Kunci!';
          ai.speechTimer = 2.0;
        }
      }
    }

    const dx = ai.targetX - ai.x;
    const dy = ai.targetY - ai.y;
    const dist = Math.hypot(dx, dy);

    const p = ai.personality || { professionalism: 65, loyalty: 65, activityDrive: 65 };
    const actMult = 0.84 + (p.activityDrive / 100) * 0.28;
    const profMult = 0.88 + (p.professionalism / 100) * 0.22;

    if (dist > 14) {
      const moveSpeed = (ai.aiState === 'RESPONDING' ? 94 : 66) * effMult * actMult;
      ai.vx = (dx / dist) * moveSpeed;
      ai.vy = (dy / dist) * moveSpeed;
      ai.x = clamp(ai.x + ai.vx * dt, 40, WORLD_WIDTH - 40);
      ai.y = clamp(ai.y + ai.vy * dt, 40, WORLD_HEIGHT - 40);
      ai.angle = Math.atan2(dy, dx);
      ai.walkPhase += dt * 7 * actMult;
    } else {
      ai.vx = 0;
      ai.vy = 0;
      if (ai.aiState === 'TRAINING' && academyDist) {
        // Cohort baris-berbaris positions & synchronized progress are governed by stepAkpolCohortTick
      } else if (ai.aiState === 'INSTRUCTING') {
        ai.waitTimer -= dt;
        if (ai.waitTimer <= 0) ai.aiState = 'PATROL';
      } else if (ai.aiState === 'RESPONDING') {
        const inc = incByOfficerId.get(ai.id) || state.incidents.find((i) => i.assignedOfficerId === ai.id);
        if (inc) {
          inc.progress += dt * effMult * profMult;
          if (inc.progress >= inc.duration) {
            const resolved = resolveIncident(state, inc.id, ai.id);
            if (resolved) events.push({ type: 'INCIDENT_RESOLVED', incident: resolved, by: ai.id });
          }
        } else {
          ai.aiState = 'PATROL';
        }
      } else if (ai.aiState === 'APEL') {
        if (state.directive !== 'APEL_MABES') ai.aiState = 'PATROL';
      } else {
        ai.waitTimer -= dt;
        if (ai.waitTimer <= 0) {
          const canEnterMabes = gateOpen || hasGateClearance;
          const doMabes = canEnterMabes && rng() < dutyProfile.mabesPatrolBias;

          if (doMabes) {
            if (rng() < dutyProfile.gateGuardBias) {
              const gate = rng() < 0.52 ? MABES_ZONES.eastGate : MABES_ZONES.southGate;
              ai.targetX = clamp(gate.x + (rng() - 0.5) * 26, comp.x + 12, comp.x + comp.w + 18);
              ai.targetY = clamp(gate.y + (rng() - 0.5) * 24, comp.y + 12, comp.y + comp.h + 18);
              ai.waitTimer = 2.8 + rng() * 2.6;
              if (rng() < 0.35 && !ai.speechTimer) {
                ai.speechBubble = 'Jaga Gerbang';
                ai.speechTimer = 2.0;
              }
            } else {
              const subRoll = rng();
              if (subRoll < 0.36) {
                const po = MABES_ZONES.propamOffice;
                ai.targetX = po.x + 16 + rng() * (po.w - 32);
                ai.targetY = po.y + 18 + rng() * (po.h - 36);
              } else if (subRoll < 0.66) {
                const pr = MABES_ZONES.prison;
                ai.targetX = pr.x + 16 + rng() * (pr.w - 32);
                ai.targetY = pr.y + pr.h + 8;
              } else {
                const cy = MABES_ZONES.courtyard;
                ai.targetX = cy.x + 16 + rng() * (cy.w - 32);
                ai.targetY = cy.y + 16 + rng() * (cy.h - 32);
              }
              ai.waitTimer = 2.2 + rng() * 2.4;
              if (dutyProfile.assignmentType === 'INTERNAL_SECURITY' && rng() < 0.25 && !ai.speechTimer) {
                ai.speechBubble = 'Patroli Mabes';
                ai.speechTimer = 1.9;
              }
            }
          } else {
            const zoneIds = dutyProfile.primaryZones.filter((zid) => canEnterMabes || zid !== 'mabes');
            const chosenZoneId = zoneIds.length > 0 ? zoneIds[Math.floor(rng() * zoneIds.length)] : null;
            const zone = chosenZoneId ? districtById.get(chosenZoneId) : null;

            if (zone && dutyProfile.assignmentType === 'TRAFFIC' && rng() < 0.68) {
              const nearX = ROAD_X.reduce(
                (best, rx) => (Math.abs(rx - (zone.x + zone.w / 2)) < Math.abs(best - (zone.x + zone.w / 2)) ? rx : best),
                ROAD_X[0]
              );
              const nearY = ROAD_Y.reduce(
                (best, ry) => (Math.abs(ry - (zone.y + zone.h / 2)) < Math.abs(best - (zone.y + zone.h / 2)) ? ry : best),
                ROAD_Y[0]
              );
              ai.targetX = clamp(nearX + (rng() - 0.5) * 110, 60, WORLD_WIDTH - 60);
              ai.targetY = clamp(nearY + (rng() - 0.5) * 90, 60, WORLD_HEIGHT - 60);
            } else if (zone) {
              ai.targetX = clamp(zone.x + 28 + rng() * (zone.w - 56), 60, WORLD_WIDTH - 60);
              ai.targetY = clamp(zone.y + 36 + rng() * (zone.h - 64), 60, WORLD_HEIGHT - 60);
            } else {
              const rx = ROAD_X[Math.floor(rng() * ROAD_X.length)];
              const ry = ROAD_Y[Math.floor(rng() * ROAD_Y.length)];
              ai.targetX = clamp(rx + (rng() - 0.5) * 90, 60, WORLD_WIDTH - 60);
              ai.targetY = clamp(ry + (rng() - 0.5) * 90, 60, WORLD_HEIGHT - 60);
            }
            ai.waitTimer = 1.5 + rng() * 2.5;
          }
        }
      }
    }
  }

  state.cooldowns.moraleTick -= dt;
  if (state.cooldowns.moraleTick <= 0) {
    state.cooldowns.moraleTick = 4.5;
    const circadian = getCircadianProfile(state.simSeconds);
    const sortedNonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
    const filledBilletsCount = state.billets.filter((b) => Boolean(b.holderId)).length;
    const onlineCount = state.members.filter((m) => m.status === 'online-2d').length;
    const betahSummary = { sortedNonOwnerRanks, filledBilletsCount, onlineCount, rankMap: rankById };

    for (let i = state.members.length - 1; i >= 0; i--) {
      const m = state.members[i];
      const p = m.personality || { loyalty: 65, activityDrive: 65 };
      const delta = evaluateAgentBetahDelta(m, state, betahSummary);
      m.betahScore = clamp(m.betahScore + delta, 0, 100);
      const xpMult = 0.72 + (p.activityDrive / 100) * 0.55;
      m.xp += (m.status === 'online-2d' ? 2.5 : m.status === 'online-chat' ? 0.6 : 0) * xpMult;

      if (!circadian.isNight || m.nightOwl) {
        if (m.betahScore >= 60 && m.status === 'online-chat' && !m.needsWelcome) {
          m.status = 'online-2d';
        } else if (m.betahScore < 35 && m.status === 'online-2d') {
          m.status = 'online-chat';
        }
      }

      const leaveThreshold = p.loyalty >= 75 ? 10 : p.loyalty < 45 ? 20 : 15;
      if (m.betahScore < leaveThreshold && state.members.length > 2) {
        const left = state.members.splice(i, 1)[0];
        clearMemberFromDivisionUnits(state, left.id);
        if (Array.isArray(state.divisionRecruits)) {
          state.divisionRecruits = state.divisionRecruits.filter((r) => r.memberId !== left.id);
        }
        state.billets.forEach((b) => {
          if (b.holderId === left.id) b.holderId = null;
        });
        state.incidents.forEach((inc) => {
          if (inc.assignedOfficerId === left.id) inc.assignedOfficerId = null;
        });
        if (Array.isArray(state.subServers)) {
          state.subServers.forEach((sub) => {
            sub.memberIds = (sub.memberIds || []).filter((id) => id !== left.id);
            if (sub.memberRoles) delete sub.memberRoles[left.id];
            if (sub.ownerId === left.id) {
              const delegated = sub.memberIds.find(
                (id) => id !== 'owner' && sub.memberRoles?.[id]?.canManageSubServer
              );
              const replacement = delegated || sub.memberIds.find((id) => id !== 'owner');
              sub.ownerId = replacement || 'owner';
              if (sub.ownerId === 'owner') sub.ownerJoined = true;
            }
          });
        }
        state.stats.totalLeaves += 1;
        appendChannelMessage(state, 'obrolan-ooc', {
          authorId: 'system',
          authorName: 'Info Server',
          authorRole: 'Sistem',
          authorColor: '#DA373C',
          isSystem: true,
          text: `${left.icName} keluar dari server karena merasa struktur/promosi kurang aktif.`,
        });
        events.push({ type: 'MEMBER_LEFT', member: left });
      }
    }
  }

  state.cooldowns.autonomyTick = (state.cooldowns.autonomyTick ?? 5.0) - dt;
  if (state.cooldowns.autonomyTick <= 0) {
    state.cooldowns.autonomyTick = 7.5;
    const autoActions = runAutonomousRoleTick(state, {
      promoteMember,
      demoteMember,
      kickMember,
      assignMemberDivision,
      selectBestDivisionForAgent,
      grantAwardToMember,
      createRankRecord,
      createDivisionRecord,
      createBilletRecord,
      setDivisionQuota,
      checkAcademyEligibility,
      enrollMemberInAcademy,
      educateAcademyCadet,
      graduateCadetFromAcademy,
      failCadetFromAcademy,
      ensureAkpolSubServer,
      submitAkpolRegistration,
      postAkpolTrainingRequest,
      leadAkpolCohortDrill,
      getAkpolCohortStatus,
      appointUnitLeader,
      takeoverSubServerLeadership,
      canMemberManageSubServer,
      canMemberShareSubServerInvite,
      createSubServerRecord,
      affiliateSubServer,
      appendSubServerMessage,
      appendChannelMessage,
      getRankById,
      arrestMemberToPrison,
      releaseMemberFromPrison,
      togglePropamGate,
      ensureDivisionHead,
      setDivisionDailyQuota,
      createDivisionProposalAndSendDm,
      ensureDivisionSubServerAndRegistrasi,
      submitDivisionRegistration,
      evaluateDivisionCandidate,
      advanceDivisionTraineePhase,
      assignMemberBillet,
      setMemberSubRole,
      clamp,
    });
    for (const act of autoActions) {
      events.push({ type: 'AUTONOMY_ACTION', detail: act });
    }
  }

  state.cooldowns.incidentTick -= dt;
  if (state.cooldowns.incidentTick <= 0) {
    const circadian = getCircadianProfile(state.simSeconds);
    state.cooldowns.incidentTick = (7.5 + rng() * 5.0) / circadian.incidentRateMultiplier;
    const spawned = spawnIncident(state, rng(), rng());
    if (spawned) events.push({ type: 'INCIDENT_SPAWNED', incident: spawned });
  }

  state.cooldowns.joinTick -= dt;
  if (state.cooldowns.joinTick <= 0) {
    state.cooldowns.joinTick = state.members.length < 30 ? 9.5 + rng() * 5.0 : 11.5 + rng() * 6.0;
    if (shouldNewApplicantJoin(state, rng())) {
      const existingUsernames = new Set(state.members.map((m) => m.username));
      const existingIcNames = new Set(state.members.map((m) => (m.icName || '').toLowerCase()));
      const bannedSet = new Set(state.bannedUsernames || []);
      const available = AI_NAME_POOL.filter(
        (p) => !existingUsernames.has(p.username) && !existingIcNames.has((p.icName || '').toLowerCase()) && !bannedSet.has(p.username)
      );
      const chosen =
        available.length > 0
          ? available[Math.floor(rng() * available.length)]
          : state.members.length < MAX_AI_MEMBERS
            ? generateUniqueAiProfile(
                new Set([...existingUsernames, ...bannedSet]),
                existingIcNames,
                state.nextId + state.members.length
              )
            : null;
      if (chosen) {
        const lowestRank =
          [...state.ranks.filter((r) => !r.isOwner)].sort((a, b) => a.order - b.order)[0] ||
          state.ranks[0];
        const circadian = getCircadianProfile(state.simSeconds);
        const newMember = createAiMember(chosen, {
          id: `ai-${++state.nextId}`,
          rankId: lowestRank.id,
          divisionId: null,
          betahScore: 68,
          status: circadian.isNight && !chosen.nightOwl ? 'offline' : 'online-chat',
          needsWelcome: true,
          x: 150 + rng() * 70,
          y: 140 + rng() * 50,
          joinedAtSec: state.simSeconds,
        });
        state.members.push(newMember);
        state.stats.totalJoins += 1;
        const intro = RECRUIT_INTROS[Math.floor(rng() * RECRUIT_INTROS.length)];
        appendChannelMessage(state, 'lobi-rekrutmen', {
          authorId: newMember.id,
          authorName: newMember.icName,
          authorRole: lowestRank.name,
          authorColor: lowestRank.color,
          isOwner: false,
          actionMemberId: newMember.id,
          text: intro,
        });
        events.push({ type: 'MEMBER_JOINED', member: newMember });
      }
    }
  }

  state.cooldowns.chatTick -= dt;
  if (state.cooldowns.chatTick <= 0) {
    state.cooldowns.chatTick = 6.5 + rng() * 4.5;
    const activePeers = state.members.filter((m) => m.status !== 'offline');
    if (activePeers.length > 0) {
      let repliedToPeer = false;

      const candidateChans = ['obrolan-ooc', 'lobi-rekrutmen', 'laporan-patroli'];
      const priorityThread = candidateChans
        .map((chId) => {
          const lastPeer = [...(state.messages[chId] || [])]
            .reverse()
            .find((m) => m.authorId && m.authorId !== 'owner' && m.authorId !== 'system');
          return { chId, lastPeer };
        })
        .find(
          (item) =>
            item.lastPeer &&
            ((item.lastPeer.ruleViolation && !item.lastPeer.moderated) ||
              item.lastPeer.stance === 'MILD_PROTEST' ||
              item.lastPeer.topicTag?.startsWith('DISCUSSION_'))
        );

      const replyChance = priorityThread ? 0.68 : 0.48;

      if (activePeers.length >= 2 && rng() < replyChance) {
        const chosenCh = priorityThread
          ? priorityThread.chId
          : candidateChans[Math.floor(rng() * candidateChans.length)];
        const chMsgs = state.messages[chosenCh] || [];
        const recentPeerMsg = priorityThread
          ? priorityThread.lastPeer
          : [...chMsgs]
              .reverse()
              .find((m) => m.authorId && m.authorId !== 'owner' && m.authorId !== 'system');

        if (recentPeerMsg) {
          const responder =
            (recentPeerMsg.applicationForSubServerId &&
              (() => {
                const targetSub = (state.subServers || []).find(
                  (s) => s.id === recentPeerMsg.applicationForSubServerId
                );
                if (!targetSub) return null;
                return (
                  activePeers.find((m) => m.id === targetSub.ownerId) ||
                  activePeers.find((m) => canMemberManageSubServer(m, targetSub, state))
                );
              })()) ||
            (recentPeerMsg.ruleViolation &&
              activePeers.find(
                (m) =>
                  m.id !== recentPeerMsg.authorId &&
                  (m.subRole === 'Mod' ||
                    m.subRole === 'Admin' ||
                    m.subRole === 'Helper' ||
                    (m.personality?.professionalism ?? 60) >= 68)
              )) ||
            activePeers.find((m) => m.id !== recentPeerMsg.authorId);

          if (responder && responder.id !== recentPeerMsg.authorId) {
            const interReply = generateInterAiReply(responder, recentPeerMsg, state, chosenCh, rng);
            if (interReply) {
              const rRank = getRankById(state, responder.rankId);
              const rDiv = getDivisionById(state, responder.divisionId);
              appendChannelMessage(state, chosenCh, {
                authorId: responder.id,
                authorName: responder.icName,
                authorRole: rDiv ? `${rRank.name} · ${rDiv.name}` : rRank.name,
                authorColor: rRank.color,
                isOwner: false,
                text: interReply.text,
                replyTo: interReply.replyTo,
                applicationForSubServerId: interReply.applicationForSubServerId,
                applicationEligible: interReply.applicationEligible,
                isModerationReply: Boolean(interReply.isModerationReply),
              });
              if (rng() < 0.65) {
                const emoji = interReply.isModerationReply
                  ? '⚠️'
                  : recentPeerMsg.recruitInvite
                    ? '📋'
                    : recentPeerMsg.stance === 'MILD_PROTEST'
                      ? '💬'
                      : responder.archetype === 'ramah'
                        ? '🔥'
                        : '🫡';
                const ex = recentPeerMsg.reactions.find((r) => r.emoji === emoji);
                if (ex) ex.count += 1;
                else recentPeerMsg.reactions.push({ emoji, count: 1 });
              }
              events.push({ type: 'CHAT_MESSAGE', channelId: chosenCh });
              repliedToPeer = true;
            }
          }
        }
      }

      if (!repliedToPeer) {
        const organic = generateOrganicAiChatter(state, rng);
        if (organic && organic.text) {
          if (organic.ruleViolation && organic.speaker) {
            organic.speaker.violationCount = (organic.speaker.violationCount || 0) + 1;
          }
          appendChannelMessage(state, organic.channelId, {
            authorId: organic.speaker.id,
            authorName: organic.speaker.icName,
            authorRole: organic.div ? `${organic.rank.name} · ${organic.div.name}` : organic.rank.name,
            authorColor: organic.rank.color,
            isOwner: false,
            actionMemberId: organic.actionMemberId,
            recruitInvite: organic.recruitInvite,
            topicTag: organic.topicTag,
            stance: organic.stance,
            ruleViolation: Boolean(organic.ruleViolation),
            violationType: organic.violationType || null,
            moderated: false,
            text: organic.text,
          });
          events.push({ type: 'CHAT_MESSAGE', channelId: organic.channelId });
        }
      }
    }
  }

  return events;
}
