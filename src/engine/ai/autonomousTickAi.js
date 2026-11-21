// Autonomous Role Tick, Hierarchy Decision-Making, RP Division Pipeline & Staff Effects
import {
  ASSIGNMENT_TYPES,
  AWARDS_CATALOG,
  BILLET_EXPANSION_POOL,
  DIVISION_EXPANSION_POOL,
  RANK_EXPANSION_POOL,
} from '../constants.js';
import {
  assessMemberTrustworthiness,
  canActorManageTarget,
  getCircadianProfile,
  getMemberEffectiveAuthorities,
  getMemberHierarchy,
} from './hierarchyAi.js';
import { buildSubServerRecruitmentInvite } from './recruitGuides.js';
import { runAutonomousSubServerAndStaffTick } from './autonomousSubServerPipeline.js';
import {
  runAkpolSubServerAndCohortAi,
  runDynamicBilletAndDelegationAi,
} from './academyBilletAi.js';
import { sortCandidatesByMerit } from '../rules/meritocracy.js';
import { runAutonomousPurnaTugas } from '../rules/purnaTugas.js';

/**
 * Evaluates autonomous actions by AI-persons holding Billets (with strict Discord hierarchy enforcement & personality effects).
 */
export function runAutonomousRoleTick(state, helpers) {
  const {
    promoteMember,
    demoteMember,
    kickMember,
    assignMemberDivision,
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
  } = helpers;

  const actions = [];
  let actionsBudget = Math.min(12, 6 + Math.floor(state.members.length / 10));
  const circadian = getCircadianProfile(state.simSeconds);

  const divCountMap = new Map();
  for (const d of state.divisions) divCountMap.set(d.id, 0);
  for (const m of state.members) {
    if (m.divisionId && divCountMap.has(m.divisionId)) {
      divCountMap.set(m.divisionId, divCountMap.get(m.divisionId) + 1);
    }
  }
  const rankMap = new Map(state.ranks.map((r) => [r.id, r]));
  const divMap = new Map(state.divisions.map((d) => [d.id, d]));
  const billetMap = new Map(state.billets.map((b) => [b.id, b]));

  const orderedActors = [...state.members]
    .filter((m) => m.status !== 'offline' && (m.detainedRemaining || 0) <= 0)
    .sort((a, b) => getMemberHierarchy(b, state) - getMemberHierarchy(a, state));

  for (const holder of orderedActors) {
    if (actionsBudget <= 0) break;
    const perms = getMemberEffectiveAuthorities(holder, state);
    if (!Object.values(perms).some(Boolean)) continue;

    const billet = holder.billetId ? billetMap.get(holder.billetId) || null : null;
    const div = holder.divisionId ? divMap.get(holder.divisionId) || null : null;
    const holderRank = rankMap.get(holder.rankId) || getRankById(state, holder.rankId);
    const roleTitle = billet ? billet.name : div ? div.name : holderRank.name;
    const trust = assessMemberTrustworthiness(holder);
    let billetActed = false;

    // 0. Power-Abuse Risk
    if (
      trust.level === 'RISIKO_ABUSE' &&
      (perms.canKick || perms.canDemote || perms.canBan || perms.canArrestDetainee) &&
      Math.random() < 0.34
    ) {
      const victim = state.members.find(
        (m) => m.id !== holder.id && canActorManageTarget(holder.id, m, state).allowed && m.betahScore >= 40
      );
      if (victim) {
        victim.betahScore = clamp(victim.betahScore - 9, 0, 100);
        state.reputation = Math.max(0, state.reputation - 6);
        if (perms.canDemote && Math.random() < 0.45) {
          const demoted = demoteMember(state, victim.id, `${holder.icName} (${roleTitle} · Sepihak)`);
          if (demoted) {
            appendChannelMessage(state, 'ruang-komando', {
              authorId: 'system',
              authorName: 'Laporan Propam',
              authorRole: 'Peringatan Abuse',
              authorColor: '#DA373C',
              isSystem: true,
              text: `[PERINGATAN] ${holder.icName} (${roleTitle}, Profesionalisme ${holder.personality?.professionalism ?? 40}%) menyalahgunakan wewenang dengan menurunkan pangkat ${victim.icName} secara sepihak!`,
            });
            actions.push({ type: 'ABUSE_OF_POWER', by: holder.id, target: victim.id });
            actionsBudget--;
            continue;
          }
        } else {
          appendChannelMessage(state, 'ruang-komando', {
            authorId: 'system',
            authorName: 'Laporan Propam',
            authorRole: 'Indikasi Abuse',
            authorColor: '#DA373C',
            isSystem: true,
            text: `[INDISIPLINER] ${holder.icName} (${roleTitle}) bersikap arogan & mengancam ${victim.icName} tanpa alasan jelas. Morale tim turun!`,
          });
          actions.push({ type: 'ABUSE_WARNING', by: holder.id, target: victim.id });
          actionsBudget--;
          continue;
        }
      }
    }

    // 0b. Propam Audit & Rutan
    if (perms.canReleaseDetainee && releaseMemberFromPrison) {
      const doneDetainee = state.members.find((m) => (m.detainedRemaining || 0) > 0 && m.detainedRemaining <= 3);
      if (doneDetainee && Math.random() < 0.4) {
        releaseMemberFromPrison(state, doneDetainee.id, `${holder.icName} (${roleTitle})`);
        actions.push({ type: 'PROPAM_RELEASE', by: holder.id, target: doneDetainee.id });
        actionsBudget--;
        continue;
      }
    }

    if (perms.canArrestDetainee && arrestMemberToPrison) {
      const rogue = state.members.find(
        (m) =>
          m.id !== holder.id &&
          (m.detainedRemaining || 0) <= 0 &&
          canActorManageTarget(holder.id, m, state).allowed &&
          (m.personality?.professionalism ?? 60) < 34 &&
          m.betahScore < 35
      );
      if (rogue && Math.random() < 0.28) {
        arrestMemberToPrison(
          state,
          rogue.id,
          18,
          `Pelanggaran disiplin berat (Audit ${roleTitle} ${holder.icName})`,
          `${holder.icName} (${roleTitle})`
        );
        actions.push({ type: 'PROPAM_ARREST', by: holder.id, target: rogue.id });
        actionsBudget--;
        continue;
      }
    }

    if (perms.canControlPropamGate && togglePropamGate) {
      const hasDetainees = state.members.some((m) => (m.detainedRemaining || 0) > 0);
      if (!hasDetainees && state.mabesSecurity?.gateOpen === false && Math.random() < 0.15) {
        togglePropamGate(state, true, `${holder.icName} (${roleTitle})`);
        actions.push({ type: 'PROPAM_GATE_OPEN', by: holder.id });
        actionsBudget--;
        continue;
      }
    }

    // 1. Structural Creation & Quota Adaptation
    if (perms.canCreateDivision && createDivisionRecord) {
      const totalQuota = state.divisions.reduce((acc, d) => acc + (d.quota || 6), 0);
      const hasCrowdedDivision = state.divisions.some((d) => {
        const count = divCountMap.get(d.id) || 0;
        const threshold = state.divisions.length < 6 ? 0.35 : 0.72;
        return count / Math.max(1, d.quota || 6) >= threshold;
      });
      const overallTight = state.members.length >= Math.max(6, Math.floor(totalQuota * 0.72));
      const needsMoreDivisions = state.divisions.length < 4 || hasCrowdedDivision || overallTight;
      if (needsMoreDivisions && state.divisions.length < 22) {
        const existingDivNames = new Set(state.divisions.map((d) => d.name.toLowerCase()));
        let nextDiv = DIVISION_EXPANSION_POOL.find((dc) => !existingDivNames.has(dc.name.toLowerCase()));
        if (!nextDiv && overallTight) {
          const sectorIdx = state.divisions.length - DIVISION_EXPANSION_POOL.length + 1;
          const overflowTemplates = [
            { name: `Patwal Sektor ${sectorIdx}`, callsign: `PW${sectorIdx}`, color: '#3B82F6', quota: 8, duty: 'Pengawalan & patroli sektor tambahan untuk menampung personel baru.', assignmentType: 'TRAFFIC' },
            { name: `Resmob Sektor ${sectorIdx}`, callsign: `RM${sectorIdx}`, color: '#EF4444', quota: 8, duty: 'Reserse mobile penindakan cepat lintas distrik Izumiya.', assignmentType: 'INVESTIGATION' },
            { name: `Brigade Taktis ${sectorIdx}`, callsign: `BT${sectorIdx}`, color: '#8B5CF6', quota: 8, duty: 'Unit taktis pengamanan wilayah kota padat penduduk.', assignmentType: 'TACTICAL' },
          ];
          const picked = overflowTemplates[(sectorIdx - 1) % overflowTemplates.length];
          if (!existingDivNames.has(picked.name.toLowerCase())) {
            const preset = ASSIGNMENT_TYPES[picked.assignmentType];
            nextDiv = {
              ...picked,
              gateClearance: picked.assignmentType === 'TACTICAL',
              dutyProfile: {
                assignmentType: picked.assignmentType,
                primaryZones: [...preset.defaultZones],
                mabesPatrolBias: preset.defaultMabesBias,
                gateGuardBias: preset.defaultGateBias,
                preferredIncidents: [...preset.defaultIncidents],
                patrolRadius: preset.defaultRadius,
              },
            };
          }
        }
        if (nextDiv) {
          createDivisionRecord(state, nextDiv, `${holder.icName} (${roleTitle})`);
          const createdDiv = state.divisions[state.divisions.length - 1];
          divCountMap.set(createdDiv.id, 0);
          divMap.set(createdDiv.id, createdDiv);
          const candidateTransfer = state.members.find((m) => m.id !== holder.id && m.divisionId && !m.billetId);
          if (candidateTransfer) {
            const oldCount = divCountMap.get(candidateTransfer.divisionId) || 1;
            divCountMap.set(candidateTransfer.divisionId, Math.max(0, oldCount - 1));
            assignMemberDivision(state, candidateTransfer.id, createdDiv.id);
            divCountMap.set(createdDiv.id, 1);
          }
          actions.push({ type: 'AUTO_CREATE_DIV', by: holder.id, name: nextDiv.name });
          actionsBudget--;
          billetActed = true;
        }
      }
    }

    if (!billetActed && perms.canManageDivisionQuota && setDivisionQuota) {
      const fullDiv = state.divisions.find((d) => {
        const count = divCountMap.get(d.id) || 0;
        const quota = d.quota || 6;
        return quota < 30 && count >= Math.max(2, Math.floor(quota * 0.85));
      });
      if (fullDiv) {
        const nextQuota = clamp((fullDiv.quota || 6) + 3, 2, 50);
        setDivisionQuota(state, fullDiv.id, nextQuota, `${holder.icName} (${roleTitle})`);
        actions.push({ type: 'AUTO_ADJUST_QUOTA', by: holder.id, divisionId: fullDiv.id, quota: nextQuota });
        actionsBudget--;
        billetActed = true;
      }
    }

    if (!billetActed && perms.canCreateBillet && createBilletRecord && state.billets.length < 16) {
      const existingBilletNames = new Set(state.billets.map((b) => b.name.toLowerCase()));
      const nextBil = BILLET_EXPANSION_POOL.find((bc) => !existingBilletNames.has(bc.name.toLowerCase()));
      if (nextBil) {
        createBilletRecord(state, nextBil, `${holder.icName} (${roleTitle})`);
        const appointee = state.members.find(
          (m) => m.id !== holder.id && !m.billetId && (m.personality?.professionalism ?? 60) >= 62
        );
        const newBillet = state.billets[state.billets.length - 1];
        if (appointee && newBillet) {
          newBillet.holderId = appointee.id;
          appointee.billetId = newBillet.id;
          billetMap.set(newBillet.id, newBillet);
          if (nextBil.canCreateSubServer) {
            if (!appointee.personalAuthority) appointee.personalAuthority = { canOwnSubServer: true, canAffiliateServer: true };
            else appointee.personalAuthority.canOwnSubServer = true;
          }
          appendChannelMessage(state, 'pengumuman-mabes', {
            authorId: holder.id,
            authorName: holder.icName,
            authorRole: `${holderRank.name} · ${roleTitle}`,
            authorColor: holderRank.color,
            text: `Berdasarkan kebutuhan organisasi, saya membentuk jabatan "${newBillet.name}" dan melantik ${appointee.icName} untuk memimpinnya.`,
          });
        }
        actions.push({ type: 'AUTO_CREATE_BILLET', by: holder.id, name: nextBil.name });
        actionsBudget--;
        billetActed = true;
      }
    }

    if (actionsBudget > 0 && perms.canCreateRank && createRankRecord) {
      const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
      const topRank = nonOwnerRanks[nonOwnerRanks.length - 1];
      const existingRankNames = new Set(state.ranks.map((r) => r.name.toLowerCase()));
      const missingPoolRank = RANK_EXPANSION_POOL.find((rc) => !existingRankNames.has(rc.name.toLowerCase()));
      const hasJenderal = existingRankNames.has('jenderal');
      const topRankReached = Boolean(
        topRank && state.members.some((m) => m.rankId === topRank.id || m.xp >= topRank.minXp * 0.65)
      );
      const needsFullHierarchy = !hasJenderal || nonOwnerRanks.length < 14;

      if (missingPoolRank && (topRankReached || needsFullHierarchy)) {
        createRankRecord(state, missingPoolRank, `${holder.icName} (${roleTitle})`);
        actions.push({ type: 'AUTO_CREATE_RANK', by: holder.id, name: missingPoolRank.name });
        actionsBudget--;
      }
    }

    const canManageBillets = (perms.canCreateBillet || perms.canPromote) && getMemberHierarchy(holder, state) >= 70;
    if (!billetActed && canManageBillets && assignMemberBillet) {
      const holderHierarchy = getMemberHierarchy(holder, state);
      const emptyBillets = (state.billets || [])
        .filter((b) => !b.holderId && (Number(b.hierarchyOrder) || 40) < holderHierarchy);
      if (emptyBillets.length > 0) {
        const targetBil = emptyBillets[0];
        const qualifiedPool = state.members
          .filter((m) =>
            m.id !== holder.id &&
            !m.billetId &&
            m.academyStatus !== 'ENROLLED' &&
            (m.detainedRemaining || 0) <= 0 &&
            (m.personality?.professionalism ?? 60) >= 55 &&
            canActorManageTarget(holder.id, m, state).allowed
          );
        const qualifiedAppointee = sortCandidatesByMerit(qualifiedPool, state, { billet: targetBil })[0];
        if (qualifiedAppointee) {
          assignMemberBillet(state, qualifiedAppointee.id, targetBil.id);
          actions.push({ type: 'AUTO_FILL_BILLET', by: holder.id, billetId: targetBil.id, holderId: qualifiedAppointee.id });
          actionsBudget--;
          billetActed = true;
        }
      }
    }

    const canMutateOrAppointHead = perms.canTransferDivision || perms.canCreateDivision || (perms.canPromote && getMemberHierarchy(holder, state) >= 70);
    if (!billetActed && canMutateOrAppointHead && ensureDivisionHead) {
      const emptyHeadDiv = (state.divisions || []).find((d) => !d.headId);
      if (emptyHeadDiv) {
        const divMembers = state.members.filter((m) => m.divisionId === emptyHeadDiv.id && (m.detainedRemaining || 0) <= 0);
        let headMember = sortCandidatesByMerit(divMembers, state, { divisionId: emptyHeadDiv.id })[0];

        if (!headMember && assignMemberDivision) {
          const candidatePool = state.members
            .filter((m) =>
              m.id !== holder.id &&
              (rankMap.get(m.rankId)?.order || 1) >= 2 &&
              m.academyStatus !== 'ENROLLED' &&
              (m.detainedRemaining || 0) <= 0 &&
              !state.divisions.some((d) => d.headId === m.id) &&
              canActorManageTarget(holder.id, m, state).allowed
            );
          const candidateToMutate = sortCandidatesByMerit(candidatePool, state, { divisionId: emptyHeadDiv.id })[0];

          if (candidateToMutate) {
            assignMemberDivision(state, candidateToMutate.id, emptyHeadDiv.id);
            headMember = candidateToMutate;
          }
        }

        if (headMember) {
          emptyHeadDiv.headId = headMember.id;
          ensureDivisionSubServerAndRegistrasi(state, emptyHeadDiv, headMember);
          actions.push({ type: 'AUTO_FILL_DIVISION_HEAD', by: holder.id, divisionId: emptyHeadDiv.id, headId: headMember.id });
          actionsBudget--;
          billetActed = true;
        }
      }
    }

    if (!billetActed && canManageBillets && setMemberSubRole) {
      const staffCount = state.members.filter((m) => m.subRole).length;
      if (staffCount < 4) {
        const roleToGive = staffCount === 0 ? 'Helper' : staffCount === 1 ? 'Mod' : staffCount === 2 ? 'Developer' : 'Admin';
        const candidateStaffPool = state.members
          .filter((m) =>
            m.id !== holder.id &&
            !m.subRole &&
            m.academyStatus !== 'ENROLLED' &&
            (m.detainedRemaining || 0) <= 0 &&
            (m.personality?.professionalism ?? 60) >= 55 &&
            canActorManageTarget(holder.id, m, state).allowed
          );
        const candidateStaff = sortCandidatesByMerit(candidateStaffPool, state, { targetSubRole: roleToGive })[0];
        if (candidateStaff) {
          setMemberSubRole(state, candidateStaff.id, roleToGive);
          actions.push({ type: 'AUTO_SET_SUB_ROLE', by: holder.id, target: candidateStaff.id, subRole: roleToGive });
          actionsBudget--;
          billetActed = true;
        }
      }
    }

    if (actionsBudget <= 0) break;

    // 2. Recruit Welcome
    if (perms.canAcceptRecruit) {
      const recruit = state.members.find((m) => m.needsWelcome);
      if (recruit && recruit.id !== holder.id) {
        const recruitRank = rankMap.get(recruit.rankId) || getRankById(state, recruit.rankId);
        recruit.needsWelcome = false;
        recruit.betahScore = clamp(recruit.betahScore + 11, 0, 100);
        if (!circadian.isNight || recruit.nightOwl || recruit.billetId) {
          recruit.status = 'online-2d';
        }
        const guidanceText =
          (recruitRank?.order || 1) < 2
            ? `Selamat datang ${recruit.icName}! Atas wewenang ${roleTitle}, kamu resmi diterima di Lobi Mabes. Ikuti diklat Akademi Kepolisian untuk naik ke Bripda sebelum bisa mendaftar ke #registrasi sub-server divisi.`
            : `Selamat datang ${recruit.icName}! Kamu resmi diterima di server. Pantau undangan link sub-server divisi yang disetujui Kapolda dan isi format di #registrasi untuk mengikuti seleksi & Phase Diklat I–IV.`;
        appendChannelMessage(state, 'lobi-rekrutmen', {
          authorId: holder.id,
          authorName: holder.icName,
          authorRole: `${holderRank.name} · ${roleTitle}`,
          authorColor: holderRank.color,
          text: guidanceText,
        });
        actions.push({ type: 'AUTO_WELCOME', by: holder.id, target: recruit.id });
        actionsBudget--;
        if (actionsBudget <= 0) break;
      }
    }

    // 2b. Academy Lemdiklat Actions
    if (actionsBudget > 0 && perms.canGraduateCadet && graduateCadetFromAcademy) {
      const readyCadet = state.members.find(
        (m) =>
          m.academyStatus === 'ENROLLED' &&
          (m.trainingProgress || 0) >= 100 &&
          canActorManageTarget(holder.id, m, state).allowed
      );
      if (readyCadet) {
        const res = graduateCadetFromAcademy(state, readyCadet.id, `${holder.icName} (${roleTitle})`);
        if (res?.ok) {
          actions.push({ type: 'ACADEMY_GRADUATE', by: holder.id, target: readyCadet.id });
          actionsBudget--;
          if (actionsBudget <= 0) break;
        }
      }
    }

    if (actionsBudget > 0 && perms.canFailCadet && failCadetFromAcademy) {
      const minProf = state.academy?.minProfessionalism ?? 35;
      const unfitCadet = state.members.find(
        (m) =>
          m.academyStatus === 'ENROLLED' &&
          canActorManageTarget(holder.id, m, state).allowed &&
          (m.betahScore < 34 ||
            (m.personality?.professionalism ?? 60) < Math.max(22, minProf - 8) ||
            (trust.level === 'RISIKO_ABUSE' && Math.random() < 0.25))
      );
      if (unfitCadet) {
        const reason =
          trust.level === 'RISIKO_ABUSE'
            ? `Keputusan keras sepihak oleh ${roleTitle} (${holder.icName})`
            : 'Tidak memenuhi standar evaluasi & disiplin Lemdiklat';
        failCadetFromAcademy(state, unfitCadet.id, reason, `${holder.icName} (${roleTitle})`);
        actions.push({ type: 'ACADEMY_FAIL', by: holder.id, target: unfitCadet.id });
        actionsBudget--;
        if (actionsBudget <= 0) break;
      }
    }

    if (actionsBudget > 0 && (perms.canEducate || perms.canLeadAkpolDrill) && educateAcademyCadet) {
      const enrolledCadets = state.members.filter((m) => m.academyStatus === 'ENROLLED');
      const quota = Math.max(2, Number(state.academy?.quota) || 4);
      const cadet = enrolledCadets.find((m) => (m.trainingProgress || 0) < 100 && m.id !== holder.id);
      if (cadet && enrolledCadets.length >= quota) {
        educateAcademyCadet(state, cadet.id, holder, 24);
        actions.push({ type: 'ACADEMY_EDUCATE', by: holder.id, target: cadet.id });
        actionsBudget--;
        if (actionsBudget <= 0) break;
      }
    }

    if (actionsBudget > 0 && perms.canManageAcademy && enrollMemberInAcademy && checkAcademyEligibility && state.academy?.isOpen) {
      const targetRankOrder = rankMap.get(state.academy?.targetRankId)?.order || 2;
      const applicant = state.members.find((m) => {
        if (m.id === holder.id) return false;
        if (m.academyStatus !== 'NONE' && m.academyStatus) return false;
        const mRankOrder = rankMap.get(m.rankId)?.order || 1;
        if (mRankOrder >= targetRankOrder) return false;
        return checkAcademyEligibility(m, state).eligible;
      });
      if (applicant) {
        const res = enrollMemberInAcademy(state, applicant.id, `${holder.icName} (${roleTitle})`);
        if (res?.ok) {
          actions.push({ type: 'ACADEMY_ENROLL', by: holder.id, target: applicant.id });
          actionsBudget--;
          if (actionsBudget <= 0) break;
        }
      }
    }

    // 3. Autonomous Promotion
    if (perms.canPromote) {
      const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
      const minProf = trust.level === 'TINGGI' ? 46 : 25;
      const eligibleCandidates = state.members
        .filter((m) => {
          if (!canActorManageTarget(holder.id, m, state).allowed) return false;
          if (m.academyStatus === 'ENROLLED') return false;
          if ((m.violationCount || 0) >= 2) return false;
          const curr = getRankById(state, m.rankId);
          const next = nonOwnerRanks.find((r) => r.order > curr.order);
          return (
            next &&
            m.xp >= next.minXp &&
            m.betahScore >= 52 &&
            (m.personality?.professionalism ?? 60) >= minProf
          );
        });
      const sortedCandidates = sortCandidatesByMerit(eligibleCandidates, state);

      let promotedCount = 0;
      for (const candidate of sortedCandidates) {
        if (promotedCount >= 2 || actionsBudget <= 0) break;
        const nextRank = promoteMember(state, candidate.id, holder.icName, roleTitle);
        if (nextRank) {
          actions.push({ type: 'AUTO_PROMOTE', by: holder.id, target: candidate.id });
          actionsBudget--;
          promotedCount++;
        }
      }
      if (actionsBudget <= 0) break;
    }

    // 4. Autonomous Awards
    if (actionsBudget > 0 && perms.canGrantAwards && grantAwardToMember) {
      const deserving = state.members.find(
        (m) =>
          canActorManageTarget(holder.id, m, state).allowed &&
          m.xp >= 100 &&
          m.betahScore >= 65 &&
          (m.awards?.length || 0) < 3 &&
          (m.personality?.professionalism ?? 60) >= 55
      );
      if (deserving) {
        const missingAward = AWARDS_CATALOG.find((a) => !(deserving.awards || []).includes(a.id));
        if (missingAward) {
          grantAwardToMember(state, deserving.id, missingAward.id, `${holder.icName} (${roleTitle})`);
          actions.push({ type: 'AUTO_AWARD', by: holder.id, target: deserving.id, awardId: missingAward.id });
          actionsBudget--;
          if (actionsBudget <= 0) break;
        }
      }
    }

    // 5. Autonomous Disciplinary Demote / Kick / Ban
    if (perms.canKick || perms.canDemote || perms.canBan) {
      const problemMember = state.members.find((m) => {
        if (!canActorManageTarget(holder.id, m, state).allowed) return false;
        if (state.members.length <= 3) return false;
        const prof = m.personality?.professionalism ?? 60;
        const loy = m.loyalty ?? m.personality?.loyalty ?? 60;
        return (m.violationCount || 0) >= 2 || m.betahScore < 38 || (prof < 42 && loy < 46);
      });
      if (problemMember) {
        const currRank = getRankById(state, problemMember.rankId);
        const canDemoteFurther = (currRank?.order || 1) > 1;
        const severeLow = problemMember.betahScore < 22 && (problemMember.personality?.professionalism ?? 60) < 42;
        if (perms.canBan && severeLow && Math.random() < 0.4) {
          kickMember(state, problemMember.id, true, `Pelanggaran berat & tidak aktif (Ban oleh ${roleTitle} ${holder.icName})`);
          actions.push({ type: 'AUTO_BAN', by: holder.id, target: problemMember.id });
          actionsBudget--;
          continue;
        } else if (perms.canDemote && canDemoteFurther && ((problemMember.violationCount || 0) >= 2 || problemMember.betahScore >= 22 || Math.random() < 0.65)) {
          const demoted = demoteMember(state, problemMember.id, `${holder.icName} (${roleTitle})`);
          if (demoted) {
            actions.push({ type: 'AUTO_DEMOTE', by: holder.id, target: problemMember.id });
            actionsBudget--;
            continue;
          }
        } else if (perms.canKick && problemMember.betahScore < 28) {
          kickMember(state, problemMember.id, false, `Ketidakaktifan & evaluasi disiplin oleh ${roleTitle} (${holder.icName})`);
          actions.push({ type: 'AUTO_KICK', by: holder.id, target: problemMember.id });
          actionsBudget--;
          continue;
        }
      }
    }

    // 6. Autonomous Chat Moderation
    if (perms.canMuteChat) {
      const modChannels = ['laporan-patroli', 'lobi-rekrutmen', 'obrolan-ooc'];
      let moderatedViolation = false;
      for (const chId of modChannels) {
        const chMsgs = state.messages?.[chId] || [];
        const violMsg = [...chMsgs].reverse().find(
          (m) =>
            m.ruleViolation &&
            !m.moderated &&
            m.authorId &&
            m.authorId !== holder.id &&
            canActorManageTarget(holder.id, m.authorId, state).allowed
        );
        if (violMsg) {
          violMsg.moderated = true;
          if (!Array.isArray(violMsg.reactions)) violMsg.reactions = [];
          const exWarn = violMsg.reactions.find((r) => r.emoji === '⚠️');
          if (exWarn) exWarn.count += 1;
          else violMsg.reactions.push({ emoji: '⚠️', count: 1 });

          const violator = state.members.find((m) => m.id === violMsg.authorId);
          if (violator) {
            if (violator.personality) {
              violator.personality.professionalism = clamp((violator.personality.professionalism ?? 50) + 1.5, 1, 99);
            }
            violator.betahScore = clamp(violator.betahScore - 1.5, 0, 100);
          }
          state.reputation += 2;

          const reasonLabel =
            violMsg.violationType === 'OOC_MIXING_IC'
              ? 'campur chat OOC di saluran IC'
              : violMsg.violationType === 'CAPS_SPAM'
                ? 'spam huruf kapital & tanda seru'
                : violMsg.violationType === 'FLOOD_CHIT_CHAT'
                  ? 'flood/OOT di saluran koordinasi'
                  : 'nada ketus tidak kondusif';

          appendChannelMessage(state, chId, {
            authorId: holder.id,
            authorName: holder.icName,
            authorRole: `${holderRank.name} · ${roleTitle}`,
            authorColor: holderRank.color,
            isModerationReply: true,
            replyTo: {
              id: violMsg.id,
              authorName: violMsg.authorName,
              text: violMsg.text.slice(0, 72) + (violMsg.text.length > 72 ? '…' : ''),
            },
            text: `[MODERASI ${roleTitle}] Teguran ringan untuk @${violMsg.authorName} (${reasonLabel}). Mohon perbaiki tata tertib chatting agar server tetap kondusif.`,
          });
          actions.push({ type: 'AUTO_MODERATE', by: holder.id, target: violMsg.authorId, channelId: chId });
          actionsBudget--;
          moderatedViolation = true;
          break;
        }
      }
      if (moderatedViolation) continue;

      if (Math.random() < 0.18) {
        const restless = state.members.find((m) => m.id !== holder.id && m.betahScore < 45 && canActorManageTarget(holder.id, m, state).allowed);
        if (restless) {
          appendChannelMessage(state, 'obrolan-ooc', {
            authorId: holder.id,
            authorName: holder.icName,
            authorRole: `${holderRank.name} · ${roleTitle}`,
            authorColor: holderRank.color,
            text: `Reminder ketertiban obrolan untuk @${restless.icName}: tetap gunakan tata bahasa RP yang sopan ya, kalau ada kendala sampaikan di ruang komando.`,
          });
          actions.push({ type: 'AUTO_MODERATE', by: holder.id, target: restless.id });
          actionsBudget--;
          continue;
        }
      }
    }

    // 7. Autonomous Announcement
    if (perms.canAnnounce && Math.random() < 0.18) {
      const activeCount = state.members.filter((m) => m.status === 'online-2d').length + 1;
      appendChannelMessage(state, 'pengumuman-mabes', {
        authorId: holder.id,
        authorName: holder.icName,
        authorRole: `${holderRank.name} · ${roleTitle}`,
        authorColor: holderRank.color,
        text: `Pengumuman Komando (${roleTitle}): Terpantau ${activeCount} unit aktif menjaga Kota Izumiya. Jaga kerapian formasi dan laporan 10-4!`,
      });
      actions.push({ type: 'AUTO_ANNOUNCE', by: holder.id });
      actionsBudget--;
      continue;
    }
  }

  runAkpolSubServerAndCohortAi(state, helpers, { actions, rankMap });
  runDynamicBilletAndDelegationAi(state, helpers, { actions, rankMap, divMap });

  runAutonomousSubServerAndStaffTick(
    state,
    { ...helpers, buildInvite: buildSubServerRecruitmentInvite },
    { actions, circadian, divCountMap, rankMap, divMap }
  );

  runAutonomousPurnaTugas(state, actions);

  return actions;
}
