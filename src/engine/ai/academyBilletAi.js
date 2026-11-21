// Custom AI-Person Intelligence: Akpol Sub-Server Gate, #request Drill Dispatch, Dynamic Abbreviated Billets & Delegated Sub-Server Takeover
import {
  BILLET_EXPANSION_POOL,
} from '../constants.js';
import {
  canActorManageTarget,
  getMemberEffectiveAuthorities,
  getMemberHierarchy,
} from './hierarchyAi.js';
import { buildSubServerRecruitmentInvite } from './recruitGuides.js';
import { sortCandidatesByMerit } from '../rules/meritocracy.js';

export function runDynamicBilletAndDelegationAi(state, helpers, ctx) {
  const {
    createBilletRecord,
    assignMemberBillet,
    appointUnitLeader,
    takeoverSubServerLeadership,
    appendChannelMessage,
  } = helpers;
  const { actions } = ctx;

  // 1. Appoint KANIT unit leaders inside active divisions that have approved units
  if (appointUnitLeader) {
    const appointer = (state.members || []).find((m) => {
      if (m.status === 'offline' || (m.detainedRemaining || 0) > 0) return false;
      const perms = getMemberEffectiveAuthorities(m, state);
      return Boolean(perms.canAppointUnitLeader || perms.canCreateBillet);
    });
    if (appointer) {
      for (const div of state.divisions || []) {
        if (!Array.isArray(div.units) || div.units.length === 0) continue;
        const unitToFill = div.units.find((u) => {
          const kanitTitle = /^KANIT\s+/i.test(u.roleTitle)
            ? u.roleTitle.toUpperCase()
            : `KANIT ${u.roleTitle.toUpperCase()}`;
          return !(state.members || []).some(
            (m) => m.divisionId === div.id && m.divisionUnitRole?.toUpperCase() === kanitTitle
          );
        });
        if (!unitToFill) continue;
        const candidatePool = (state.members || []).filter(
          (m) =>
            m.id !== appointer.id &&
            m.divisionId === div.id &&
            m.id !== div.headId &&
            m.id !== div.viceHeadId &&
            !m.divisionUnitRole &&
            m.academyStatus !== 'ENROLLED' &&
            (m.detainedRemaining || 0) <= 0
        );
        const candidate = sortCandidatesByMerit(candidatePool, state, { divisionId: div.id, unitRole: unitToFill.roleTitle })[0];
        if (candidate) {
          const kanitTitle = /^KANIT\s+/i.test(unitToFill.roleTitle)
            ? unitToFill.roleTitle.toUpperCase()
            : `KANIT ${unitToFill.roleTitle.toUpperCase()}`;
          if (appointUnitLeader(state, candidate.id, div.id, kanitTitle, appointer.icName)) {
            actions.push({ type: 'AUTO_APPOINT_KANIT', by: appointer.id, target: candidate.id, role: kanitTitle });
            break;
          }
        }
      }
    }
  }

  // 2. Dynamic KADIV <Divisi> / WAKADIV <Divisi> / KANIT <Unit> billet expansion beyond static pool
  if (createBilletRecord && assignMemberBillet && (state.billets || []).length < 22) {
    const creator = (state.members || []).find((m) => {
      if (m.status === 'offline' || (m.detainedRemaining || 0) > 0) return false;
      const perms = getMemberEffectiveAuthorities(m, state);
      return Boolean(perms.canCreateBillet && getMemberHierarchy(m, state) >= 65);
    });
    if (creator) {
      const existingNames = new Set((state.billets || []).map((b) => b.name.toLowerCase()));
      let dynamicCandidate = BILLET_EXPANSION_POOL.find((bp) => !existingNames.has(bp.name.toLowerCase()));
      if (!dynamicCandidate) {
        for (const d of state.divisions || []) {
          const kadivName = `KADIV ${d.name.toUpperCase()}`;
          const wakadivName = `WAKADIV ${d.name.toUpperCase()}`;
          if (!existingNames.has(kadivName.toLowerCase())) {
            dynamicCandidate = {
              name: kadivName,
              description: `Kepala Divisi ${d.name} [${d.callsign}]: pengelola strategis unit, kuota & sub-server internal.`,
              hierarchyOrder: 68,
              minRankOrder: 3,
              extraPermissions: {
                canAcceptRecruit: true,
                canAppointUnitLeader: true,
                canManageDivisionQuota: true,
                canConfigureDivisionDuty: true,
                canCommandPatrol: true,
                canShareSubServerInvite: true,
                canManageSubServerInternal: true,
                canTakeoverSubServer: true,
              },
            };
            break;
          }
          if (!existingNames.has(wakadivName.toLowerCase())) {
            dynamicCandidate = {
              name: wakadivName,
              description: `Wakil Kepala Divisi ${d.name} [${d.callsign}]: mendampingi KADIV & pengelola internal sub-server.`,
              hierarchyOrder: 58,
              minRankOrder: 2,
              extraPermissions: {
                canAcceptRecruit: true,
                canCommandPatrol: true,
                canShareSubServerInvite: true,
                canManageSubServerInternal: true,
                canTakeoverSubServer: true,
              },
            };
            break;
          }
        }
      }

      if (dynamicCandidate && Math.random() < 0.35) {
        createBilletRecord(
          state,
          {
            ...dynamicCandidate,
            permissions: dynamicCandidate.extraPermissions || { canAnnounce: true, canShareSubServerInvite: true },
          },
          creator.icName
        );
        const created = state.billets[state.billets.length - 1];
        const dynamicPool = (state.members || []).filter(
          (m) =>
            m.id !== creator.id &&
            !m.billetId &&
            m.academyStatus !== 'ENROLLED' &&
            (m.detainedRemaining || 0) <= 0 &&
            (m.personality?.professionalism ?? 60) >= 55 &&
            canActorManageTarget(creator.id, m, state).allowed
        );
        const appointee = sortCandidatesByMerit(dynamicPool, state, { billet: created })[0];
        if (created && appointee) {
          assignMemberBillet(state, appointee.id, created.id);
        }
        actions.push({ type: 'AUTO_DYNAMIC_BILLET', by: creator.id, name: dynamicCandidate.name });
      }
    }
  }

  // 3. Delegated Sub-Server Leadership Takeover if owner is offline/detained/inactive
  if (takeoverSubServerLeadership && Array.isArray(state.subServers)) {
    for (const sub of state.subServers) {
      if (sub.ownerId === 'owner') continue;
      const currOwner = (state.members || []).find((m) => m.id === sub.ownerId);
      const ownerUnavailable =
        !currOwner ||
        (currOwner.detainedRemaining || 0) > 0 ||
        (sub.linkedDivisionId && currOwner.divisionId !== sub.linkedDivisionId);
      if (!ownerUnavailable) continue;

      const successor = (state.members || []).find((m) => {
        if (m.id === sub.ownerId || m.status === 'offline' || (m.detainedRemaining || 0) > 0) return false;
        const perms = getMemberEffectiveAuthorities(m, state);
        const isInternalMgr = Boolean(sub.memberRoles?.[m.id]?.canManageSubServer);
        return Boolean(
          isInternalMgr &&
          (perms.canTakeoverSubServer || perms.canManageSubServerInternal || m.divisionId === sub.linkedDivisionId)
        );
      });
      if (successor) {
        takeoverSubServerLeadership(
          state,
          sub.id,
          successor.id,
          successor.id,
          'Owner sebelumnya mutasi / tidak aktif'
        );
        if (appendChannelMessage) {
          actions.push({ type: 'AUTO_SUBSERVER_TAKEOVER', by: successor.id, subServerId: sub.id });
        }
        break;
      }
    }
  }
}

export function runAkpolSubServerAndCohortAi(state, helpers, ctx) {
  const {
    ensureAkpolSubServer,
    submitAkpolRegistration,
    postAkpolTrainingRequest,
    leadAkpolCohortDrill,
    getAkpolCohortStatus,
    appendChannelMessage,
    appendSubServerMessage,
    getRankById,
  } = helpers;
  const { actions } = ctx;

  if (!ensureAkpolSubServer || !getAkpolCohortStatus) return;
  const subAkpol = ensureAkpolSubServer(state);
  if (!subAkpol) return;

  // 1. Authorized AI routinely shares AKADEMI KEPOLISIAN #registrasi link into Lobi/OOC
  const lastInvite = state.academy?.lastInviteBroadcastSec ?? -9999;
  if ((state.simSeconds - lastInvite) >= 130 && appendChannelMessage) {
    const sharer = (state.members || []).find((m) => {
      if (m.status === 'offline' || (m.detainedRemaining || 0) > 0) return false;
      const perms = getMemberEffectiveAuthorities(m, state);
      return Boolean(perms.canManageAcademy || perms.canEducate || perms.canShareSubServerInvite);
    });
    if (sharer) {
      const invite = buildSubServerRecruitmentInvite(subAkpol, sharer, state);
      const sRank = getRankById(state, sharer.rankId);
      const regCh = subAkpol.channels.find((c) => c.name === 'registrasi');
      appendChannelMessage(state, 'lobi-rekrutmen', {
        authorId: sharer.id,
        authorName: sharer.icName,
        authorRole: `${sRank.name} · Lemdiklat`,
        authorColor: '#0EA5E9',
        text: `🎓 Pendaftaran Taruna Akpol dibuka! Anggota baru wajib gabung sub-server AKADEMI KEPOLISIAN dan daftar di #registrasi dulu sebelum dilantik.\n${invite.text}`,
        recruitInvite: {
          ...invite.recruitInvite,
          targetChannelId: regCh?.id || invite.recruitInvite.targetChannelId,
        },
      });
      state.academy.lastInviteBroadcastSec = state.simSeconds;
      actions.push({ type: 'AKPOL_INVITE_SHARED', by: sharer.id });
    }
  }

  // 2. Unregistered Taruna/Bharada candidates automatically join AKADEMI KEPOLISIAN and fill #registrasi
  if (submitAkpolRegistration && state.academy?.isOpen) {
    const unregisteredRecruit = (state.members || []).find(
      (m) =>
        m.status !== 'offline' &&
        (m.detainedRemaining || 0) <= 0 &&
        !m.needsWelcome &&
        !m.akpolRegistered &&
        m.academyStatus === 'NONE' &&
        (getRankById(state, m.rankId)?.order || 1) < 2
    );
    if (unregisteredRecruit) {
      const res = submitAkpolRegistration(state, unregisteredRecruit.id);
      if (res?.ok) {
        actions.push({ type: 'AKPOL_SUB_REGISTRASI', by: unregisteredRecruit.id });
      }
    }
  }

  // 3. Synchronized Baris-Berbaris Cohort: Taruna post #request -> Authorized Trainer responds & leads drill
  const cohort = getAkpolCohortStatus(state);
  if (cohort.enrolledCadets.length === 0) return;

  const sinceLastReq = state.simSeconds - (state.academy?.lastRequestAt ?? -9999);

  if (cohort.waitingForQuota && sinceLastReq >= 80 && postAkpolTrainingRequest) {
    postAkpolTrainingRequest(state, cohort.enrolledCadets[0].id);
    actions.push({ type: 'AKPOL_QUOTA_WAIT_NOTICE', count: cohort.enrolledCadets.length });
    return;
  }

  if (cohort.waitingForTrainer && sinceLastReq >= 28 && postAkpolTrainingRequest) {
    const reqRes = postAkpolTrainingRequest(state, cohort.enrolledCadets[0].id);
    if (reqRes?.ok) {
      actions.push({ type: 'AKPOL_REQUEST_SENT', by: cohort.enrolledCadets[0].id });
    }
  }

  if (cohort.quotaMet && leadAkpolCohortDrill) {
    const trainer =
      cohort.activeTrainerAi ||
      (state.members || []).find((m) => {
        if (m.status !== 'online-2d' || (m.detainedRemaining || 0) > 0 || m.academyStatus === 'ENROLLED') return false;
        const perms = getMemberEffectiveAuthorities(m, state);
        return Boolean(perms.canRespondAkpolRequest || perms.canLeadAkpolDrill || perms.canEducate);
      });

    if (trainer) {
      const anyIncomplete = cohort.enrolledCadets.some((c) => (c.trainingProgress || 0) < 100);
      if (anyIncomplete) {
        const reqCh = subAkpol.channels.find((c) => c.name === 'request');
        if (trainer.aiState !== 'INSTRUCTING' && reqCh && appendSubServerMessage) {
          const tRank = getRankById(state, trainer.rankId);
          appendSubServerMessage(state, subAkpol.id, reqCh.id, {
            authorId: trainer.id,
            authorName: trainer.icName,
            authorRole: `${tRank.name} · Pelatih Akpol`,
            authorColor: '#22C55E',
            text: `10-4 Taruna! Saya ${trainer.icName} menanggapi #request & langsung meluncur ke Lapangan Baris-Berbaris Kampus Akpol sekarang!`,
          });
        }
        leadAkpolCohortDrill(state, trainer, 26);
        actions.push({ type: 'AKPOL_COHORT_DRILL', by: trainer.id, count: cohort.enrolledCadets.length });
      }
    }
  }
}
