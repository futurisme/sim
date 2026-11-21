import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants.js';
import { soundFX } from './audio.js';
import {
  advanceDivisionTraineePhase,
  appendChannelMessage,
  arrestMemberToPrison,
  assignMemberBillet,
  assignMemberDivision,
  clamp,
  createBilletRecord,
  createDivisionProposalAndSendDm,
  createDivisionRecord,
  createRankRecord,
  delegateAuthorityToBillet,
  demoteMember,
  educateAcademyCadet,
  enrollMemberInAcademy,
  ensureDivisionHead,
  evaluateDivisionCandidate,
  failCadetFromAcademy,
  graduateCadetFromAcademy,
  kickMember,
  leadAkpolCohortDrill,
  normalizeRankOrders,
  postAkpolTrainingRequest,
  promoteMember,
  releaseMemberFromPrison,
  resolveIncident,
  respondDivisionProposal,
  runManualTechPatch,
  setBilletHierarchy,
  setBilletPermission,
  setDivisionDailyQuota,
  setDivisionDutyProfile,
  setDivisionGateClearance,
  setDivisionPermission,
  setDivisionQuota,
  setMemberPersonalAuthority,
  setMemberSubRole,
  setRankPermission,
  setSubServerInternalAccess,
  submitAkpolRegistration,
  takeoverSubServerLeadership,
  toggleAwardOnMember,
  togglePropamGate,
  updateAcademySettings,
  updateSubServerConfig,
  retireMemberPurnaTugas,
} from './rules.js';

export function attachOrgStoreMethods(IzumiyaStore) {
  Object.assign(IzumiyaStore.prototype, {
    purnaTugas(memberId, reason = 'Wisuda Purna-Bhakti Kehormatan') {
      const res = retireMemberPurnaTugas(this.state, memberId, this.state.ownerName, reason);
      if (res?.ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      }
      return res;
    },

    promote(memberId) {
      const rank = promoteMember(this.state, memberId);
      if (rank) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      }
      return rank;
    },

    demote(memberId) {
      const rank = demoteMember(this.state, memberId);
      if (rank) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return rank;
    },

    kickOrBan(memberId, isBan = false) {
      const removed = kickMember(this.state, memberId, isBan);
      if (removed) {
        if (this.ui.inspectedMemberId === memberId) {
          this.ui.inspectedMemberId = null;
        }
        soundFX.radioBeep();
        this.saveNow();
        this.emit('org');
      }
      return removed;
    },

    setMemberDivision(memberId, divisionId) {
      const ok = assignMemberDivision(this.state, memberId, divisionId);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setMemberBillet(memberId, billetId) {
      const ok = assignMemberBillet(this.state, memberId, billetId);
      if (ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setSubRole(memberId, subRole) {
      const ok = setMemberSubRole(this.state, memberId, subRole);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    toggleAward(memberId, awardId) {
      const ok = toggleAwardOnMember(this.state, memberId, awardId);
      if (ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    updateBio(memberId, bioText) {
      const clean = (bioText || '').trim().slice(0, 180);
      if (memberId === 'owner') {
        this.state.ownerProfile.bio = clean;
      } else {
        const m = this.state.members.find((x) => x.id === memberId);
        if (m) m.bio = clean;
      }
      soundFX.tap();
      this.saveNow();
      this.emit('org');
    },

    togglePermission(billetId, permKey, value) {
      const ok = setBilletPermission(this.state, billetId, permKey, value);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setRankPermission(rankId, permKey, value) {
      const ok = setRankPermission(this.state, rankId, permKey, value);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setDivisionPermission(divisionId, permKey, value) {
      const ok = setDivisionPermission(this.state, divisionId, permKey, value);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setDivisionGateClearance(divisionId, allowed) {
      const ok = setDivisionGateClearance(this.state, divisionId, allowed);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setDivisionQuota(divisionId, quota) {
      const ok = setDivisionQuota(this.state, divisionId, quota, this.state.ownerName);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    setDivisionDutyProfile(divisionId, patch) {
      const ok = setDivisionDutyProfile(this.state, divisionId, patch, this.state.ownerName);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    delegateAuthority(permKey, billetIdOrNull) {
      const ok = delegateAuthorityToBillet(this.state, permKey, billetIdOrNull || null);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    togglePropamGate(gateOpen) {
      const nextOpen = togglePropamGate(this.state, gateOpen, this.state.ownerName);
      soundFX.radioBeep();
      this.saveNow();
      this.emit('org');
      return nextOpen;
    },

    arrestMember(memberId, durationSec = 22, reason = 'Penahanan etik oleh Kapolda') {
      const ok = arrestMemberToPrison(this.state, memberId, durationSec, reason, this.state.ownerName);
      if (ok) {
        soundFX.radioBeep();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    releaseMember(memberId) {
      const ok = releaseMemberFromPrison(this.state, memberId, this.state.ownerName);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    selectAuthorityNode(kind, id) {
      this.ui.selectedAuthorityNode = { kind, id };
      soundFX.tap();
      this.emit('ui');
    },

    setAuthoritySubMode(mode) {
      this.ui.authoritySubMode = mode;
      soundFX.tap();
      this.emit('ui');
    },

    toggleAuthorityTree(open) {
      this.ui.authorityTreeOpen = open ?? !this.ui.authorityTreeOpen;
      soundFX.tap();
      this.emit('ui');
    },

    togglePermGroup(catId) {
      if (!this.ui.collapsedPermGroups) this.ui.collapsedPermGroups = {};
      this.ui.collapsedPermGroups[catId] = !this.ui.collapsedPermGroups[catId];
      soundFX.tap();
      this.emit('ui');
    },

    setExpandedRank(rankId) {
      this.ui.expandedRankId = this.ui.expandedRankId === rankId ? null : rankId;
      soundFX.tap();
      this.emit('ui');
    },

    setExpandedDivision(divisionId) {
      this.ui.expandedDivisionId = this.ui.expandedDivisionId === divisionId ? null : divisionId;
      soundFX.tap();
      this.emit('ui');
    },

    setBilletHierarchyOrder(billetId, hierarchyOrder) {
      const ok = setBilletHierarchy(this.state, billetId, hierarchyOrder);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    triggerTechPatch() {
      runManualTechPatch(this.state, 'Kapolda & Tim Developer');
      soundFX.success();
      this.saveNow();
      this.emit('org');
    },

    praiseMember(memberId) {
      const member = this.state.members.find((m) => m.id === memberId);
      if (!member) return;
      member.betahScore = clamp(member.betahScore + 12, 0, 100);
      member.loyalty = clamp(member.loyalty + 8, 0, 100);
      member.needsWelcome = false;
      if (member.status === 'online-chat') member.status = 'online-2d';
      member.speechBubble = 'Siap Kapolda!';
      member.speechTimer = 2.6;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      appendChannelMessage(this.state, 'obrolan-ooc', {
        authorId: 'owner',
        authorName: `${this.state.ownerName} (Anda)`,
        authorRole: 'Kapolda (Owner)',
        authorColor: '#D4A024',
        isOwner: true,
        text: `Kerja bagus @${member.icName}! Terus pertahankan dedikasi di Kepolisian Republik Izumiya.`,
      });
      soundFX.success();
      this.saveNow();
      this.emit('chat');
    },

    createRank({ name, minXp, salary, color }) {
      const ok = createRankRecord(this.state, { name, minXp, salary, color });
      if (!ok) return false;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      soundFX.success();
      this.saveNow();
      this.emit('org');
      return true;
    },

    deleteRank(rankId) {
      const rank = this.state.ranks.find((r) => r.id === rankId);
      if (!rank || rank.isOwner) return false;
      const nonOwner = this.state.ranks.filter((r) => !r.isOwner && r.id !== rankId);
      if (nonOwner.length < 2) return false;
      const fallback = nonOwner.sort((a, b) => a.order - b.order)[0];
      this.state.members.forEach((m) => {
        if (m.rankId === rankId) m.rankId = fallback.id;
      });
      if (this.state.academy && this.state.academy.targetRankId === rankId) {
        this.state.academy.targetRankId = fallback.id;
      }
      this.state.ranks = this.state.ranks.filter((r) => r.id !== rankId);
      normalizeRankOrders(this.state);
      soundFX.tap();
      this.saveNow();
      this.emit('org');
      return true;
    },

    createDivision({ name, callsign, duty, color, quota, assignmentType }) {
      const ok = createDivisionRecord(this.state, { name, callsign, duty, color, quota, assignmentType });
      if (!ok) return false;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      soundFX.promoteFanfare();
      this.saveNow();
      this.emit('org');
      return true;
    },

    deleteDivision(divisionId) {
      if (this.state.divisions.length <= 1) return false;
      this.state.divisions = this.state.divisions.filter((d) => d.id !== divisionId);
      this.state.members.forEach((m) => {
        if (m.divisionId === divisionId) {
          m.divisionId = null;
          m.divisionUnitId = null;
          m.divisionSubUnitId = null;
          m.divisionUnitRole = null;
        }
      });
      if (Array.isArray(this.state.divisionProposals)) {
        this.state.divisionProposals = this.state.divisionProposals.filter((p) => p.divisionId !== divisionId);
      }
      if (Array.isArray(this.state.divisionRecruits)) {
        this.state.divisionRecruits = this.state.divisionRecruits.filter((r) => r.divisionId !== divisionId);
      }
      if (Array.isArray(this.state.subServers)) {
        this.state.subServers.forEach((sub) => {
          if (sub.linkedDivisionId === divisionId) sub.linkedDivisionId = null;
        });
      }
      soundFX.tap();
      this.saveNow();
      this.emit('org');
      return true;
    },

    approveDivisionProposal(proposalId, approve = true, note = '') {
      const res = respondDivisionProposal(this.state, proposalId, approve, note, this.state.ownerName);
      if (res?.ok) {
        if (approve) soundFX.promoteFanfare();
        else soundFX.radioBeep();
        this.saveNow();
        this.emit('org');
      }
      return res;
    },

    setDivisionHead(divisionId, memberId) {
      const div = (this.state.divisions || []).find((d) => d.id === divisionId);
      if (!div) return false;
      div.headId = memberId || null;
      if (!div.headId) ensureDivisionHead(this.state, div);
      if (div.viceHeadId && div.viceHeadId === div.headId) div.viceHeadId = null;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      soundFX.tap();
      this.saveNow();
      this.emit('org');
      return true;
    },

    setDivisionViceHead(divisionId, memberId) {
      const div = (this.state.divisions || []).find((d) => d.id === divisionId);
      if (!div) return false;
      div.viceHeadId = memberId && memberId !== div.headId ? memberId : null;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      soundFX.tap();
      this.saveNow();
      this.emit('org');
      return true;
    },

    setDivisionDailyIntake(divisionId, quota) {
      const ok = setDivisionDailyQuota(this.state, divisionId, quota, this.state.ownerName);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    sendDivisionProposalManual(divisionId) {
      const div = (this.state.divisions || []).find((d) => d.id === divisionId);
      if (!div) return null;
      const head = ensureDivisionHead(this.state, div);
      if (!head) return null;
      const prop = createDivisionProposalAndSendDm(this.state, divisionId, head.id, div.dailyIntakeQuota || 3);
      if (prop) {
        soundFX.messagePing();
        this.saveNow();
        this.emit('org');
      }
      return prop;
    },

    evaluateRecruitManual(recruitId) {
      const res = evaluateDivisionCandidate(this.state, recruitId, null);
      if (res?.ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return res;
    },

    advanceRecruitManual(recruitId) {
      const res = advanceDivisionTraineePhase(this.state, recruitId, null, 34);
      if (res?.ok) {
        if (res.stage === 'INAUGURATED') soundFX.promoteFanfare();
        else soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return res;
    },

    createBillet({ name, description, minRankOrder, hierarchyOrder, permissions }) {
      const ok = createBilletRecord(this.state, { name, description, minRankOrder, hierarchyOrder, permissions });
      if (!ok) return false;
      this.state.lastOwnerActionAt = this.state.simSeconds;
      soundFX.success();
      this.saveNow();
      this.emit('org');
      return true;
    },

    updateAcademyConfig(patch) {
      const ok = updateAcademySettings(this.state, patch);
      if (ok) {
        soundFX.tap();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    enrollInAcademy(memberId) {
      const res = enrollMemberInAcademy(this.state, memberId, this.state.ownerName);
      if (res.ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    trainAcademyCadet(cadetId) {
      const ok = educateAcademyCadet(this.state, cadetId, null, 28);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    graduateAcademyCadet(cadetId) {
      const res = graduateCadetFromAcademy(this.state, cadetId, `${this.state.ownerName} (Kapolda)`);
      if (res.ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      }
      return res;
    },

    failAcademyCadet(cadetId, reason = 'Evaluasi kedisiplinan & hasil diklat Lemdiklat') {
      const ok = failCadetFromAcademy(this.state, cadetId, reason, `${this.state.ownerName} (Kapolda)`);
      if (ok) {
        soundFX.radioBeep();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    handleNearestIncident() {
      const px = this.state.player.x;
      const py = this.state.player.y;
      let closest = null;
      let minD = 92;
      for (const inc of this.state.incidents) {
        const d = Math.hypot(inc.x - px, inc.y - py);
        if (d < minD) {
          minD = d;
          closest = inc;
        }
      }
      if (closest) {
        const resolved = resolveIncident(this.state, closest.id, 'owner');
        if (resolved) {
          soundFX.success();
          this.saveNow();
          this.emit('incident');
        }
        return resolved;
      }

      if (px >= 955 && px <= 1270 && py >= 55 && py <= 330) {
        const res = leadAkpolCohortDrill(this.state, null, 25);
        if (res.ok) {
          this.state.player.speechBubble = `Pimpin ${res.count} Taruna!`;
          this.state.player.speechTimer = 2.4;
          soundFX.promoteFanfare();
          this.saveNow();
          this.emit('org');
          return { x: px, y: py, color: '#22C55E', academyDrill: true };
        }
        const cadets = this.state.members.filter((m) => m.academyStatus === 'ENROLLED');
        this.state.player.speechBubble =
          cadets.length > 0
            ? `Tunggu Kuota (${cadets.length}/${this.state.academy?.quota || 4})`
            : 'Kampus Akpol Siaga';
        this.state.player.speechTimer = 2.0;
        soundFX.radioBeep();
        this.emit('hud');
        return { x: px, y: py, color: '#0EA5E9', academyDrill: true };
      }

      this.state.player.speechBubble = 'Area Aman';
      this.state.player.speechTimer = 1.6;
      soundFX.radioBeep();
      this.emit('hud');
      return null;
    },

    callBackupToPlayer() {
      const px = this.state.player.x;
      const py = this.state.player.y;
      let count = 0;
      this.state.members.forEach((m, idx) => {
        if (m.status === 'online-2d' && count < 3) {
          m.aiState = 'RESPONDING';
          m.targetX = clamp(px + (idx - 1) * 38, 50, WORLD_WIDTH - 50);
          m.targetY = clamp(py + 32, 50, WORLD_HEIGHT - 50);
          m.speechBubble = 'Backup OTW!';
          m.speechTimer = 2.8;
          count += 1;
        }
      });
      this.state.player.speechBubble = 'Minta Backup!';
      this.state.player.speechTimer = 2.2;
      appendChannelMessage(this.state, 'ruang-komando', {
        authorId: 'owner',
        authorName: `${this.state.ownerName} (Anda)`,
        authorRole: 'Kapolda (Owner)',
        authorColor: '#D4A024',
        isOwner: true,
        text: `Permintaan backup unit ke koordinat (${Math.round(px)}, ${Math.round(py)}) di Kota Izumiya 2D!`,
      });
      soundFX.radioBeep();
      this.saveNow();
      this.emit('chat');
    },

    togglePersonalAuthority(memberId, key, val) {
      const ok = setMemberPersonalAuthority(this.state, memberId, key, val);
      if (ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      }
      return ok;
    },

    submitAkpolReg(memberId) {
      const res = submitAkpolRegistration(this.state, memberId);
      if (res.ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    requestAkpolDrill(requesterId = 'owner') {
      const res = postAkpolTrainingRequest(this.state, requesterId);
      if (res.ok) {
        soundFX.messagePing();
        this.saveNow();
        this.emit('chat');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    leadAkpolDrill() {
      const res = leadAkpolCohortDrill(this.state, null, 28);
      if (res.ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    updateSubServerInfo(subId, patch) {
      const res = updateSubServerConfig(this.state, subId, patch, 'owner');
      if (res.ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    toggleSubServerInternalRole(subId, memberId, config) {
      const res = setSubServerInternalAccess(this.state, subId, memberId, config, 'owner');
      if (res.ok) {
        soundFX.success();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },

    takeoverSubServer(subId, newOwnerId, reason) {
      const res = takeoverSubServerLeadership(this.state, subId, newOwnerId, 'owner', reason);
      if (res.ok) {
        soundFX.promoteFanfare();
        this.saveNow();
        this.emit('org');
      } else {
        soundFX.radioBeep();
      }
      return res;
    },
  });
}
