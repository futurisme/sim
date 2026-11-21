import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarEngine, PROFILE_FRAME_META, resolveProfileIdentity } from './avatarEngine.js';
import {
  AI_NAME_POOL,
  ASSIGNMENT_TYPES,
  AUTHORITY_CATEGORIES,
  AWARDS_CATALOG,
  BILLET_EXPANSION_POOL,
  DISTRICTS,
  DIVISION_EXPANSION_POOL,
  MABES_ZONES,
  MAX_AI_MEMBERS,
  PERMISSION_DEFINITIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants.js';
import { serverLogoEngine, resolveServerProfile } from './serverLogoEngine.js';
import {
  assessMemberTrustworthiness,
  canActorManageTarget,
  computeSpeechStyle,
  generateInterAiReply,
  generateOrganicAiChatter,
  getCircadianProfile,
  getMemberAuthorityBreakdown,
  getMemberEffectiveAuthorities,
  getMemberHierarchy,
  parseOwnerNaturalCommand,
} from './aiBrain.js';
import {
  AKPOL_SUB_SERVER_ID,
  advanceDivisionTraineePhase,
  affiliateSubServer,
  appendChannelMessage,
  applyAiToSubServer,
  arrestMemberToPrison,
  assignMemberBillet,
  assignMemberDivision,
  calculateServerAttractiveness,
  canMemberManageSubServer,
  canMemberShareSubServerInvite,
  canMemberTakeoverSubServer,
  checkAcademyEligibility,
  createDivisionProposalAndSendDm,
  createInitialState,
  createRankRecord,
  createSubServerRecord,
  delegateAuthorityToBillet,
  educateAcademyCadet,
  enrollMemberInAcademy,
  ensureDivisionHead,
  evaluateAgentBetahDelta,
  evaluateDivisionCandidate,
  failCadetFromAcademy,
  formatSimClock,
  generateUniqueAiProfile,
  getAkpolCohortStatus,
  getDivisionDutyProfile,
  getMemberSubServerProfile,
  graduateCadetFromAcademy,
  joinSubServerAsOwner,
  leadAkpolCohortDrill,
  normalizeRankOrders,
  postAkpolTrainingRequest,
  postSubServerRecruitmentInvite,
  processOwnerDmMessage,
  processOwnerMessage,
  processOwnerSubServerMessage,
  promoteMember,
  releaseMemberFromPrison,
  resolveIncident,
  resolveMemberRoleGroups,
  respondDivisionProposal,
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
  shouldNewApplicantJoin,
  stepSimulation,
  submitAkpolRegistration,
  submitDivisionRegistration,
  syncCircadianStatus,
  takeoverSubServerLeadership,
  toggleAwardOnMember,
  togglePropamGate,
  updateAcademySettings,
  updateSubServerConfig,
  validateAndCleanDivisionAndSubServerOwnership,
} from './rules.js';

test('custom avatarEngine generates 100 unique portraits without duplicates', () => {
  const sigs = new Set();
  for (let i = 0; i < 100; i++) {
    const t = avatarEngine.getTraitsForMember(`test-member-${i}`, `user_${i}`);
    const sig = `${t.skinIdx}-${t.hairStyle}-${t.hairColorIdx}-${t.bgIdx}-${t.outfitIdx}-${t.accessory}-${t.expression}`;
    assert.equal(sigs.has(sig), false, `Duplicate avatar trait signature detected at index ${i}`);
    sigs.add(sig);
    const svg = avatarEngine.renderSvg(`test-member-${i}`, `user_${i}`);
    assert.ok(svg.startsWith('<svg'), 'Avatar output should be valid inline SVG');
  }
  assert.equal(sigs.size, 100);
});

test('24-hour circadian cycle switches regular members to offline sleep at night and wakes them up in daytime', () => {
  const state = createInitialState();
  state.simSeconds = 1 * 3600 + 30 * 60;
  const nightInfo = syncCircadianStatus(state);
  assert.equal(nightInfo.circadian.isNight, true);
  assert.equal(nightInfo.circadian.phase, 'NIGHT_SLEEP');
  const sleepingCount = state.members.filter((m) => m.status === 'offline').length;
  const nightShiftCount = state.members.filter((m) => m.status === 'online-2d').length;
  assert.ok(sleepingCount >= 1, 'Expected non-nightOwl AI to sleep at 01:30 AM');
  assert.ok(nightShiftCount >= 1, 'Expected nightOwl AI piket malam to remain active');

  state.simSeconds = 20 * 3600;
  const primeInfo = syncCircadianStatus(state);
  assert.equal(primeInfo.circadian.phase, 'PRIME_TIME');
  assert.equal(state.members.filter((m) => m.status === 'offline').length, 0);
});

test('autonomous role permissions allow WAKAPOLRI AI to welcome recruits without bypassing division #registrasi', () => {
  const state = createInitialState();
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canAcceptRecruit', true);

  const recruit = state.members.find((m) => m.id === 'ai-4');
  recruit.needsWelcome = true;
  recruit.divisionId = null;

  state.cooldowns.autonomyTick = 0.01;
  const events = stepSimulation(state, 0.04);
  assert.equal(recruit.needsWelcome, false, 'WAKAPOLRI should autonomously welcome recruit');
  assert.equal(recruit.divisionId, null, 'Recruit/Taruna must NOT bypass Akpol + #registrasi directly into a division');
  assert.ok(events.some((e) => e.type === 'AUTONOMY_ACTION'));
});

test('sub-jabatan Developer heals systemHealth and increases mapEfficiency in simulation', () => {
  const state = createInitialState();
  state.tech.systemHealth = 70;
  state.tech.mapEfficiency = 90;
  setMemberSubRole(state, 'ai-2', 'Head Developer');
  state.cooldowns.autonomyTick = 0.01;
  stepSimulation(state, 0.04);
  assert.ok(state.tech.systemHealth > 70, 'Head Developer should heal systemHealth');
  assert.ok(state.tech.mapEfficiency > 90, 'Head Developer should improve mapEfficiency');
});

test('natural language parser & owner chat execute inline promotion and status queries', () => {
  const state = createInitialState();
  const parsed = parseOwnerNaturalCommand('tolong naikkan pangkat dimas sekarang', state);
  assert.equal(parsed.intent, 'PROMOTE_MEMBER');
  assert.equal(parsed.targetMember.id, 'ai-1');

  const res = processOwnerMessage(state, 'obrolan-ooc', 'bagaimana kondisi kota sekarang?');
  assert.equal(res.intent, 'STATUS_QUERY');
  assert.ok(res.replies[0].text.includes('Efisiensi map') || res.replies[0].text.includes('efisiensi map'));
});

test('awards (Brevet/Medali/Sertifikat) and attractiveness scoring work properly', () => {
  const state = createInitialState();
  const baseScore = calculateServerAttractiveness(state).total;
  const target = state.members.find((m) => m.id === 'ai-1');
  const beforeBetah = target.betahScore;

  toggleAwardOnMember(state, 'ai-1', 'med-bhayangkara');
  assert.ok(target.awards.includes('med-bhayangkara'));
  assert.ok(target.betahScore > beforeBetah);
  assert.ok(getCircadianProfile(19 * 3600).onlineRatio === 1.0);
  assert.ok(evaluateAgentBetahDelta(target, state) > 0);
  assert.ok(baseScore > 0);
});

test('2X speed advances simulation clock twice as fast and Pause freezes clock & movement', () => {
  const state = createInitialState();
  const startClock = state.simSeconds;
  const startX = state.player.x;

  state.speed = 0;
  stepSimulation(state, 0.05, { moveX: 1, moveY: 0 });
  assert.equal(state.simSeconds, startClock);
  assert.equal(state.player.x, startX);

  state.speed = 1;
  stepSimulation(state, 0.05, { moveX: 1, moveY: 0 });
  const delta1x = state.simSeconds - startClock;

  const midClock = state.simSeconds;
  state.speed = 2;
  stepSimulation(state, 0.05, { moveX: 1, moveY: 0 });
  const delta2x = state.simSeconds - midClock;

  assert.ok(Math.abs(delta2x - delta1x * 2) < 0.001);
});

test('resolving 2D incident syncs to #laporan-patroli and formats clock cleanly', () => {
  const state = createInitialState();
  const beforeMsgs = state.messages['laporan-patroli'].length;
  const resolved = resolveIncident(state, state.incidents[0].id, 'owner');
  assert.ok(resolved);
  assert.equal(state.messages['laporan-patroli'].length, beforeMsgs + 1);
  assert.equal(shouldNewApplicantJoin(state, 0.1), true);
  assignMemberDivision(state, 'ai-4', 'div-sabhara');
  assert.equal(formatSimClock(23 * 3600 + 5 * 60), '23:05');
});

test('Discord hierarchy anti-abuse blocks lower roles from acting on higher roles and responds to slider updates', () => {
  const state = createInitialState();
  // ai-1 gets WAKAPOLRI (85), ai-2 gets Instruktur Diklat (48)
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  assignMemberBillet(state, 'ai-2', 'billet-instruktur');

  assert.equal(getMemberHierarchy('owner', state), 100);
  assert.equal(getMemberHierarchy('ai-1', state), 85);
  assert.equal(getMemberHierarchy('ai-2', state), 48);

  // Higher hierarchy can manage lower, lower cannot manage higher or owner
  assert.equal(canActorManageTarget('ai-1', 'ai-2', state).allowed, true);
  assert.equal(canActorManageTarget('ai-2', 'ai-1', state).allowed, false);
  assert.equal(canActorManageTarget('ai-1', 'owner', state).allowed, false);

  // Swap hierarchy via slider helper: Instruktur -> 90 (above Wakapolri 85)
  setBilletHierarchy(state, 'billet-instruktur', 90);
  assert.equal(canActorManageTarget('ai-1', 'ai-2', state).allowed, false);
  assert.equal(canActorManageTarget('ai-2', 'ai-1', state).allowed, true);
});

test('AI personality percentages drive trustworthiness assessment, XP speed, and autonomous grantAwards', () => {
  const state = createInitialState();
  const trusted = state.members.find((m) => m.id === 'ai-1');
  const risky = state.members.find((m) => m.id === 'ai-4');

  assert.equal(assessMemberTrustworthiness(trusted).level, 'TINGGI');
  assert.equal(assessMemberTrustworthiness(risky).level, 'RISIKO_ABUSE');

  // Verify activityDrive scales XP progression
  const highAct = state.members.find((m) => m.id === 'ai-3'); // activityDrive 88
  const lowAct = state.members.find((m) => m.id === 'ai-4'); // activityDrive 62
  highAct.xp = 0;
  lowAct.xp = 0;
  state.cooldowns.moraleTick = 0.01;
  stepSimulation(state, 0.04);
  assert.ok(highAct.xp > lowAct.xp, 'Higher activityDrive AI should gain more patrol XP per tick');

  // Verify autonomous award granting respects hierarchy
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canAcceptRecruit', false);
  setBilletPermission(state, 'billet-wakapolri', 'canPromote', false);
  setBilletPermission(state, 'billet-wakapolri', 'canManageAcademy', false);
  setBilletPermission(state, 'billet-wakapolri', 'canGrantAwards', true);
  const recipient = state.members.find((m) => m.id === 'ai-2');
  recipient.xp = 140;
  recipient.betahScore = 80;
  recipient.awards = [];
  state.cooldowns.autonomyTick = 0.01;
  const events = stepSimulation(state, 0.04);
  assert.ok(
    events.some((e) => e.type === 'AUTONOMY_ACTION' && e.detail.type === 'AUTO_AWARD'),
    'WAKAPOLRI with canGrantAwards should autonomously grant awards to lower-hierarchy members'
  );
  assert.equal(recipient.awards.length, 1);
});

test('channel message ring buffer caps at 65 entries by shifting oldest head messages', () => {
  const state = createInitialState();
  for (let i = 0; i < 80; i++) {
    appendChannelMessage(state, 'obrolan-ooc', {
      authorId: 'owner',
      authorName: 'Kapolda',
      authorRole: 'Owner',
      authorColor: '#D4A024',
      isOwner: true,
      text: `Pesan uji ke-${i}`,
    });
  }
  assert.equal(state.messages['obrolan-ooc'].length, 65);
  assert.ok(state.messages['obrolan-ooc'][64].text.includes('ke-79'));
});

test('expanded 2D map includes Akademi Kepolisian district and eastern logistics sector', () => {
  assert.equal(WORLD_WIDTH, 1320);
  assert.equal(WORLD_HEIGHT, 900);
  const akpol = DISTRICTS.find((d) => d.id === 'akademi');
  assert.ok(akpol, 'Akademi Kepolisian district must exist');
  assert.equal(akpol.isAcademy, true);
});

test('Akademi Kepolisian enforces sub-server #registrasi gate, quota, synchronized cohort drill, graduation, and failure', () => {
  const state = createInitialState();
  updateAcademySettings(state, {
    isOpen: true,
    quota: 2,
    minProfessionalism: 60,
    minActivityDrive: 60,
    minBetah: 50,
    targetRankId: 'rank-ipda',
    graduateBonusXp: 120,
  });

  // ai-3 has high stats, but has NOT joined & submitted #registrasi in sub-akademi -> rejected!
  const cadet = state.members.find((m) => m.id === 'ai-3');
  const blockedUnreg = enrollMemberInAcademy(state, 'ai-3');
  assert.equal(blockedUnreg.ok, false);
  assert.ok(blockedUnreg.reasons.some((r) => /#registrasi/i.test(r)));

  // ai-4 submits #registrasi, but professionalism 42 (< 60) -> still rejected
  const lowCandidate = state.members.find((m) => m.id === 'ai-4');
  submitAkpolRegistration(state, 'ai-4');
  const lowElig = checkAcademyEligibility(lowCandidate, state);
  assert.equal(lowElig.eligible, false);
  assert.equal(enrollMemberInAcademy(state, 'ai-4').ok, false);

  // Register and enroll first cadet (ai-3) -> 1/2
  assert.equal(submitAkpolRegistration(state, 'ai-3').ok, true);
  const okRes = enrollMemberInAcademy(state, 'ai-3');
  assert.equal(okRes.ok, true);
  assert.equal(cadet.academyStatus, 'ENROLLED');
  assert.equal(cadet.aiState, 'TRAINING');

  // Cannot train solo while quota is incomplete (1/2) even with an authorized instructor
  assignMemberBillet(state, 'ai-1', 'billet-instruktur');
  const educator = state.members.find((m) => m.id === 'ai-1');
  assert.equal(educateAcademyCadet(state, 'ai-3', educator, 40), false);

  // Register and enroll second cadet (ai-2) -> quota full 2/2
  const cadet2 = state.members.find((m) => m.id === 'ai-2');
  assert.equal(submitAkpolRegistration(state, 'ai-2').ok, true);
  assert.equal(enrollMemberInAcademy(state, 'ai-2').ok, true);

  // Quota is 2 -> additional candidate blocked by quota
  const fifthMember = {
    ...cadet2,
    id: 'ai-extra-quota',
    username: 'extra_q',
    icName: 'Extra Taruna',
    academyStatus: 'NONE',
    akpolRegistered: true,
  };
  state.members.push(fifthMember);
  const akpolSub = state.subServers.find((s) => s.id === AKPOL_SUB_SERVER_ID);
  akpolSub.memberIds.push(fifthMember.id);
  const quotaBlock = checkAcademyEligibility(fifthMember, state);
  assert.equal(quotaBlock.eligible, false);
  assert.ok(quotaBlock.reasons.some((r) => r.includes('Kuota penuh')));

  // Now quota is met (2/2) -> synchronized drill by educator boosts both cadets together!
  const profBefore = cadet.personality.professionalism;
  const loyBefore = cadet.personality.loyalty;
  const xpBefore = cadet.xp;
  assert.equal(educateAcademyCadet(state, 'ai-3', educator, 40), true);
  assert.ok(cadet.trainingProgress > 35);
  assert.ok(cadet2.trainingProgress > 35, 'Synchronized cohort drill must progress all cadets simultaneously');
  assert.ok(cadet.xp > xpBefore);
  assert.ok(cadet.personality.professionalism > profBefore);
  assert.ok(cadet.personality.loyalty > loyBefore);

  // Graduate cadet -> gets rank-ipda, +120 XP, certificate srt-diklat & srt-baris, graduatesCount + 1
  const xpPreGrad = cadet.xp;
  const gradRes = graduateCadetFromAcademy(state, 'ai-3', 'Kalemdiklat');
  assert.equal(gradRes.ok, true);
  assert.equal(cadet.academyStatus, 'GRADUATED');
  assert.equal(cadet.rankId, 'rank-ipda');
  assert.equal(cadet.xp, xpPreGrad + 120);
  assert.ok(cadet.awards.includes('srt-diklat'));
  assert.ok(cadet.awards.includes('srt-baris'));
  assert.equal(state.academy.graduatesCount, 1);

  // Fail cadet2 -> marks FAILED & increments failedCount
  assert.equal(failCadetFromAcademy(state, 'ai-2', 'Pelanggaran etika Taruna'), true);
  assert.equal(cadet2.academyStatus, 'FAILED');
  assert.equal(state.academy.failedCount, 1);
});

test('autonomous Kalemdiklat AI role trains and graduates ready cadets in stepSimulation', () => {
  const state = createInitialState();
  state.members.forEach((m) => {
    m.needsWelcome = false;
    if (!m.divisionId) m.divisionId = 'div-sabhara';
  });
  assignMemberBillet(state, 'ai-1', 'billet-kalemdiklat');
  const cadet = state.members.find((m) => m.id === 'ai-3');
  submitAkpolRegistration(state, 'ai-3');
  assert.equal(enrollMemberInAcademy(state, 'ai-3').ok, true);
  cadet.trainingProgress = 100;

  state.cooldowns.autonomyTick = 0.01;
  const events = stepSimulation(state, 0.04);
  assert.ok(
    events.some((e) => e.type === 'AUTONOMY_ACTION' && e.detail.type === 'ACADEMY_GRADUATE'),
    'Kalemdiklat should autonomously graduate cadet when trainingProgress >= 100'
  );
  assert.equal(cadet.academyStatus, 'GRADUATED');
});

test('AI with canCreateDivision/Billet/Rank creates new divisions/billets/ranks when divisions are few/crowded even alongside other permissions', () => {
  const state = createInitialState();
  state.members.forEach((m) => {
    m.needsWelcome = false;
  });
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canAcceptRecruit', true);
  setBilletPermission(state, 'billet-wakapolri', 'canGrantAwards', true);
  setBilletPermission(state, 'billet-wakapolri', 'canCreateDivision', true);
  setBilletPermission(state, 'billet-wakapolri', 'canCreateBillet', true);
  setBilletPermission(state, 'billet-wakapolri', 'canCreateRank', true);

  const divBefore = state.divisions.length;
  const billetBefore = state.billets.length;
  const rankBefore = state.ranks.length;

  // Run 2 autonomy cycles to let AI execute structural expansion reliably
  for (let i = 0; i < 2; i++) {
    state.cooldowns.autonomyTick = 0.01;
    stepSimulation(state, 0.04);
  }

  assert.ok(state.divisions.length > divBefore, 'AI Wakapolri must create a new division when divisions are few/crowded');
  assert.ok(state.billets.length > billetBefore || state.ranks.length > rankBefore, 'AI must also expand billets or ranks without starvation');
});

test('personalAuthority is independent from main role permissions and lets AI create & affiliate its own Sub-Server', () => {
  const state = createInitialState();
  const officer = state.members.find((m) => m.id === 'ai-3');
  officer.billetId = null; // No main server command role
  officer.divisionId = 'div-lantas';
  officer.subRole = null;
  officer.status = 'online-2d';
  officer.needsWelcome = false;

  // Toggle personal authority independently
  setMemberPersonalAuthority(state, 'ai-3', 'canOwnSubServer', true);
  setMemberPersonalAuthority(state, 'ai-3', 'canAffiliateServer', false);
  assert.equal(officer.personalAuthority.canOwnSubServer, true);
  assert.equal(officer.personalAuthority.canAffiliateServer, false);

  const createdSub = createSubServerRecord(state, {
    name: 'FORUM PRIBADI',
    shortCode: 'FPB',
    category: 'DIVISI',
    ownerId: 'ai-3',
    affiliate: false,
  });

  assert.ok(createdSub, 'AI with personalAuthority.canOwnSubServer should create a sub-server');
  assert.equal(createdSub.ownerId, 'ai-3');
  assert.equal(createdSub.affiliatedToMain, false, 'Without canAffiliateServer, sub-server starts unaffiliated');

  // Grant personal affiliation authority -> affiliate sub-server
  setMemberPersonalAuthority(state, 'ai-3', 'canAffiliateServer', true);
  affiliateSubServer(state, createdSub.id, officer);
  assert.equal(createdSub.affiliatedToMain, true, 'AI with canAffiliateServer should affiliate its sub-server to Main Server');
});

test('joining an AI-owned Sub-Server triggers AI owner welcome, grants Kapolda VIP role/badge, and routes sub-server chat', () => {
  const state = createInitialState();
  const sub = createSubServerRecord(state, {
    name: 'KORPS BRIMOB',
    shortCode: 'BRM',
    category: 'DIVISI',
    color: '#8B5CF6',
    ownerId: 'ai-1',
    affiliate: true,
  });
  assert.ok(sub);
  assert.equal(sub.ownerJoined, false);

  joinSubServerAsOwner(state, sub.id);
  assert.equal(sub.ownerJoined, true);
  assert.equal(sub.ownerWelcomed, true);
  assert.ok(sub.memberIds.includes('owner'));
  assert.ok(sub.memberRoles['owner']?.roleName, 'AI sub-server owner must grant a role to Kapolda upon joining');
  assert.ok(sub.memberRoles['owner']?.badge, 'AI sub-server owner must grant an appreciation badge/notice');

  const firstChan = sub.channels[0].id;
  const beforeMsgs = sub.messages[firstChan].length;
  const res = processOwnerSubServerMessage(state, sub.id, firstChan, 'Siap pantau giat Brimob!');
  assert.equal(res.sent, true);
  assert.ok(sub.messages[firstChan].length >= beforeMsgs + 2, 'Owner message + AI sub-server owner reply should append to sub-server channel');
});

test('expanded NLP recognizes CREATE_SUB_SERVER, CREATE_DIVISION, HOST_EVENT, and Indonesian slang commands', () => {
  const state = createInitialState();
  assert.equal(parseOwnerNaturalCommand('tolong bikin sub-server untuk Brimob sekarang', state).intent, 'CREATE_SUB_SERVER');
  assert.equal(parseOwnerNaturalCommand('buka divisi baru untuk pengamanan kota', state).intent, 'CREATE_DIVISION');
  assert.equal(parseOwnerNaturalCommand('ayo gelar event komunitas RP malam ini', state).intent, 'HOST_EVENT');
  assert.equal(parseOwnerNaturalCommand('bang tolong naekin pangkat dimas dong', state).intent, 'PROMOTE_MEMBER');
  assert.equal(parseOwnerNaturalCommand('brp anggota aktif skrg min?', state).intent, 'STATUS_QUERY');
  assert.equal(parseOwnerNaturalCommand('kirim link rekrutmen sub-server dong!', state).intent, 'RECRUIT_SUB_SERVER_LINK');

  const divBefore = state.divisions.length;
  const chatRes = processOwnerMessage(state, 'obrolan-ooc', 'buka divisi baru Reskrim segera!');
  assert.equal(chatRes.intent, 'CREATE_DIVISION');
  assert.ok(state.divisions.length > divBefore, 'Owner natural command should trigger AI to create a new division');
  assert.equal(typeof affiliateSubServer, 'function');
});

test('serverLogoEngine produces distinct procedural SVG emblems tailored per server type and division', () => {
  const mainLogo = serverLogoEngine.renderMainLogo('w-12 h-12');
  assert.ok(mainLogo.startsWith('<svg') && mainLogo.includes('</svg>'));

  const brimobSub = { id: 's1', name: 'KORPS BRIMOB', shortCode: 'BRM', category: 'DIVISI', color: '#8B5CF6' };
  const reskrimSub = { id: 's2', name: 'RESKRIM KHUSUS', shortCode: 'RSK', category: 'DIVISI', color: '#F43F5E' };
  const propamSub = { id: 's3', name: 'PROPAM & ETIK', shortCode: 'PRP', category: 'DIVISI', color: '#EAB308' };
  const akpolSub = { id: 's4', name: 'AKADEMI KEPOLISIAN', shortCode: 'AKP', category: 'AKADEMI', color: '#0EA5E9' };
  const eventSub = { id: 's5', name: 'HUMAS & EVENT', shortCode: 'EVT', category: 'EVENT', color: '#EC4899' };

  assert.equal(resolveServerProfile(brimobSub), 'BRIMOB');
  assert.equal(resolveServerProfile(reskrimSub), 'RESKRIM');
  assert.equal(resolveServerProfile(propamSub), 'PROPAM');
  assert.equal(resolveServerProfile(akpolSub), 'AKADEMI');
  assert.equal(resolveServerProfile(eventSub), 'EVENT');

  const svgs = [brimobSub, reskrimSub, propamSub, akpolSub, eventSub].map((s) =>
    serverLogoEngine.renderSubServerLogo(s, { sizeClass: 'w-10 h-10', compact: false })
  );
  svgs.forEach((svg) => assert.ok(svg.startsWith('<svg') && svg.includes('</svg>')));
  assert.equal(new Set(svgs).size, 5, 'Every division/category logo must be visually unique');
});

test('rank creation sorts hierarchy ascending by minXp and normalizeRankOrders keeps owner at 99', () => {
  const state = createInitialState();
  // Default highest non-owner rank is AKP (680 XP); add Iptu with 560 XP
  createRankRecord(state, { name: 'Iptu', minXp: 560, salary: 580, color: '#F59E0B' });
  const iptu = state.ranks.find((r) => r.name === 'Iptu');
  const akp = state.ranks.find((r) => r.name === 'AKP');
  const kapolda = state.ranks.find((r) => r.isOwner);
  assert.ok(iptu.order < akp.order, 'Lower minXp rank (Iptu 560) must have lower order than higher minXp rank (AKP 680)');
  assert.equal(kapolda.order, 99, 'Owner rank order must remain 99');

  // Remove Iptu and re-normalize -> AKP order shifts back to 6
  state.ranks = state.ranks.filter((r) => r.id !== iptu.id);
  normalizeRankOrders(state);
  assert.equal(akp.order, 6);
});

test('attractiveness moraleScore never exceeds 30 and orphaned incident locks clear when officer leaves or enrolls', () => {
  const state = createInitialState();
  state.reputation = 500;
  state.members.forEach((m) => {
    m.betahScore = 100;
  });
  const attr = calculateServerAttractiveness(state);
  assert.ok(attr.breakdown.moraleScore <= 30, 'moraleScore breakdown must be capped at 30');
  assert.ok(attr.total <= 100, 'Total attractiveness score must be capped at 100');

  const inc = state.incidents[0];
  const officer = state.members.find((m) => m.id === 'ai-1');
  inc.assignedOfficerId = officer.id;
  // Set all members offline at nighttime so no replacement re-claims it immediately
  state.simSeconds = 1 * 3600 + 30 * 60;
  state.members.forEach((m) => {
    m.status = 'offline';
  });
  stepSimulation(state, 0.04);
  assert.equal(inc.assignedOfficerId, null, 'Orphaned incident lock must clear when assigned officer goes offline');
});

test('AI sends sub-server recruitment invite link with formatText & requirementsText and processes peer applications', () => {
  const state = createInitialState();
  createSubServerRecord(state, {
    name: 'DIVISI SABHARA',
    shortCode: 'SBR',
    category: 'DIVISI',
    ownerId: 'ai-2',
  });
  const res = processOwnerMessage(state, 'lobi-rekrutmen', 'kirim link rekrutmen sub-server sekarang!');
  assert.equal(res.intent, 'RECRUIT_SUB_SERVER_LINK');

  const inviteMsg = state.messages['lobi-rekrutmen'].find((m) => m.recruitInvite);
  assert.ok(inviteMsg, 'Recruitment invite card message must be posted in channel');
  assert.ok(inviteMsg.recruitInvite.inviteSlug.startsWith('discord.gg/'));
  assert.ok(inviteMsg.recruitInvite.formatText.includes('Nama IC'), 'Invite must include recruitment format text');
  assert.ok(/syarat rekrutmen/i.test(inviteMsg.recruitInvite.requirementsText), 'Invite must include recruitment requirements text');

  const sub = state.subServers[0];
  const appRes = applyAiToSubServer(state, sub.id, 'ai-2');
  assert.equal(typeof appRes.ok, 'boolean');

  const styleHigh = computeSpeechStyle(state.members.find((m) => m.id === 'ai-1'), state); // prof 89, emp 74
  const styleLow = computeSpeechStyle(state.members.find((m) => m.id === 'ai-4'), state); // prof 41, emp 38
  assert.equal(styleHigh.register, 'BAKU');
  assert.equal(styleLow.register, 'SANTAI');
  assert.notEqual(styleHigh.courtesy, styleLow.courtesy);
  assert.equal(typeof postSubServerRecruitmentInvite, 'function');
});

test('custom avatarEngine renders 6-tier profile frames, dynamic rank uniforms, and dynamic chest medal rack', () => {
  const tiers = [
    { rank: { name: 'Taruna', order: 1 }, expectedTier: 'TARUNA' },
    { rank: { name: 'Bhayangkara', order: 2 }, expectedTier: 'BHAYANGKARA' },
    { rank: { name: 'Briptu', order: 3 }, expectedTier: 'BINTARA' },
    { rank: { name: 'Ipda', order: 5 }, expectedTier: 'PERWIRA_MUDA' },
    { rank: { name: 'AKP', order: 6 }, expectedTier: 'PERWIRA' },
    { rank: { name: 'Brigjen', order: 8 }, expectedTier: 'PERWIRA_TINGGI' },
  ];

  const svgsNoAwards = [];
  tiers.forEach(({ rank, expectedTier }) => {
    const id = resolveProfileIdentity({ rank, awards: [] });
    assert.equal(id.uniformTier, expectedTier);
    assert.equal(id.frameTier, expectedTier);
    assert.equal(id.frameMeta.label, PROFILE_FRAME_META[expectedTier].label);

    const svg = avatarEngine.renderSvg('test-uniform-agent', 'seed_u', {
      rank,
      awards: [],
    });
    assert.ok(svg.startsWith('<svg') && svg.includes('</svg>'));
    svgsNoAwards.push(svg);
  });

  // Every rank tier must produce a visually distinct SVG (frame + uniform insignia)
  assert.equal(new Set(svgsNoAwards).size, 6, 'All 6 rank tiers must render distinct frames & uniforms');

  // Taruna must be non-border (no r="45" / r="44.8" / r="45.2" outer ring stroke)
  assert.equal(/r="44\.8"|r="45"|r="45\.2"/.test(svgsNoAwards[0]), false, 'Taruna must have non-border frame');
  // Perwira Tinggi / Owner must have ceremonial laurel & crown elements
  assert.ok(svgsNoAwards[5].includes('r="45"'), 'Perwira Tinggi must render ornate frame ring');

  // Dynamic chest mini medal/brevet rack grows when awards are granted
  const svgWithAwards = avatarEngine.renderSvg('test-uniform-agent', 'seed_u', {
    rank: { name: 'AKP', order: 6 },
    awards: ['med-bhayangkara', 'brv-brimob', 'srt-diklat'],
  });
  const rectCountNoAward = (svgsNoAwards[4].match(/<rect\b/g) || []).length;
  const rectCountWithAward = (svgWithAwards.match(/<rect\b/g) || []).length;
  assert.ok(
    rectCountWithAward > rectCountNoAward + 2,
    'Mini medal/brevet rack must dynamically render ribbon bars on the uniform chest'
  );
});

test('AI-person generates contextual discussions, mild protests, stats-driven rule violations, and logical peer/Mod moderation', () => {
  const state = createInitialState();
  state.members.forEach((m) => {
    m.needsWelcome = false;
    m.status = 'online-2d';
  });

  // Low-professionalism/low-empathy member can emit RULE_VIOLATION under low rng roll
  const risky = state.members.find((m) => m.id === 'ai-4');
  risky.personality.professionalism = 28;
  risky.personality.empathy = 30;
  risky.betahScore = 40;
  risky.xp = 0;

  let foundViolation = null;
  for (let i = 0; i < 40 && !foundViolation; i++) {
    // Pass deterministic rng favoring ai-4 and low roll
    let call = 0;
    const seq = [0.85, 0.02, (i % 4) * 0.25 + 0.05, 0.2, 0.5];
    const chatter = generateOrganicAiChatter(state, () => seq[call++ % seq.length]);
    if (chatter?.ruleViolation) foundViolation = chatter;
  }
  assert.ok(foundViolation, 'Low-professionalism AI should occasionally emit a mild chat rule violation');

  // High-professionalism leader moderates the rule violation logically
  const senior = state.members.find((m) => m.id === 'ai-1');
  assignMemberBillet(state, senior.id, 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canMuteChat', true);

  const violEntry = appendChannelMessage(state, foundViolation.channelId, {
    authorId: foundViolation.speaker.id,
    authorName: foundViolation.speaker.icName,
    authorRole: 'Taruna',
    authorColor: '#94A3B8',
    ruleViolation: true,
    violationType: foundViolation.violationType,
    moderated: false,
    text: foundViolation.text,
  });

  const modReply = generateInterAiReply(senior, violEntry, state, foundViolation.channelId, () => 0.1);
  assert.ok(modReply?.isModerationReply, 'Senior/Mod AI should produce a moderation reply to rule violation');
  assert.equal(violEntry.moderated, true, 'Inter-AI moderation should mark violation as moderated');

  // Also test OWNER WARN_MODERATION command on an unmoderated violation
  const violEntry2 = appendChannelMessage(state, 'obrolan-ooc', {
    authorId: risky.id,
    authorName: risky.icName,
    authorRole: 'Taruna',
    authorColor: '#94A3B8',
    ruleViolation: true,
    violationType: 'CAPS_SPAM',
    moderated: false,
    text: 'WOYY BACKUP CEPETTT!!',
  });
  const profBefore = risky.personality.professionalism;
  const warnRes = processOwnerMessage(state, 'obrolan-ooc', 'tolong jangan spam capslock, jaga etika chat!');
  assert.equal(warnRes.intent, 'WARN_MODERATION');
  assert.equal(violEntry2.moderated, true, 'Owner WARN_MODERATION must flag recent violation as moderated');
  assert.ok(risky.personality.professionalism > profBefore, 'Coaching/warning should nudge violator professionalism');

  // Test light discussions & mild protest mediation replies
  const protestMsg = {
    id: 'msg-protest-test',
    authorId: risky.id,
    authorName: risky.icName,
    stance: 'MILD_PROTEST',
    topicTag: 'PROTEST_TECH',
    text: 'Kesehatan sistem turun terus nih.',
  };
  const protestReply = generateInterAiReply(senior, protestMsg, state, 'obrolan-ooc', () => 0.2);
  assert.ok(protestReply?.text.length > 15, 'Leader should logically respond to mild protest');

  const discussMsg = {
    id: 'msg-discuss-test',
    authorId: risky.id,
    authorName: risky.icName,
    topicTag: 'DISCUSSION_PATROL',
    text: 'Menurut kalian mending fokus patroli Simpang Utama dulu?',
  };
  const discussReply = generateInterAiReply(senior, discussMsg, state, 'obrolan-ooc', () => 0.2);
  assert.ok(discussReply?.text.length > 15, 'Peer AI should give contextual counterpoint/tip on light discussion');
});

test('separated Role (Pangkat), Divisi, and Jabatan authorities resolve cleanly and honor exclusive delegation', () => {
  assert.equal(AUTHORITY_CATEGORIES.length, 5);
  assert.equal(PERMISSION_DEFINITIONS.length, 30);

  const state = createInitialState();
  assert.ok(state.divisions.some((d) => d.id === 'div-propam'), 'Starter Propam division must exist');
  assert.ok(state.billets.some((b) => b.id === 'billet-kanit-propam'), 'Starter Kanit Propam billet must exist');

  // ai-2 starts at rank-bripda & div-sabhara without billet
  const member = state.members.find((m) => m.id === 'ai-2');
  member.billetId = null;
  setRankPermission(state, 'rank-bripda', 'canPromote', true);
  setDivisionPermission(state, 'div-sabhara', 'canAuditIntegrity', true);

  let breakdown = getMemberAuthorityBreakdown(member, state);
  assert.equal(breakdown.effective.canPromote, true, 'Rank permission grants canPromote independently');
  assert.equal(breakdown.effective.canAuditIntegrity, true, 'Division permission grants canAuditIntegrity independently');
  assert.ok(breakdown.fromRank.includes('canPromote'));
  assert.ok(breakdown.fromDivision.includes('canAuditIntegrity'));

  // Delegate canPromote exclusively to billet-wakapolri -> suppressed for non-holder ai-2!
  assert.equal(delegateAuthorityToBillet(state, 'canPromote', 'billet-wakapolri'), true);
  breakdown = getMemberAuthorityBreakdown(member, state);
  assert.equal(breakdown.effective.canPromote, false, 'Delegated permission must be suppressed on Rank/Division non-holders');
  assert.ok(breakdown.delegatedOut.includes('canPromote'));

  // Assign ai-1 to billet-wakapolri -> ai-1 exclusively holds canPromote
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  const effWakapolri = getMemberEffectiveAuthorities('ai-1', state);
  assert.equal(effWakapolri.canPromote, true);

  // Clear delegation -> returns to Rank/Division layering
  assert.equal(delegateAuthorityToBillet(state, 'canPromote', null), true);
  assert.equal(getMemberEffectiveAuthorities(member, state).canPromote, true);
});

test('Mabes Propam gate clearance, Rutan prison confinement/auto-release, and Propam NLP commands work end-to-end', () => {
  const state = createInitialState();
  state.members.forEach((m) => {
    m.needsWelcome = false;
    m.status = 'online-2d';
  });

  // Lock Propam gate -> Satlantas (gateClearance: false) gets redirected outside Mabes compound
  const gateRes = togglePropamGate(state, false, 'Kapolda');
  assert.equal(gateRes, false);
  assert.equal(state.mabesSecurity.gateOpen, false);

  const lantasUnit = state.members.find((m) => m.id === 'ai-1'); // div-lantas (gateClearance false)
  lantasUnit.x = MABES_ZONES.compound.x + 80;
  lantasUnit.y = MABES_ZONES.compound.y + 80;
  lantasUnit.targetX = MABES_ZONES.courtyard.x;
  lantasUnit.targetY = MABES_ZONES.courtyard.y;
  stepSimulation(state, 0.05);
  assert.ok(
    lantasUnit.targetX > MABES_ZONES.compound.x + MABES_ZONES.compound.w,
    'Uncleared Satlantas unit must be deflected outside Mabes compound when Propam gate is locked'
  );

  // Grant gateClearance to Satlantas -> allowed back inside Mabes
  assert.equal(setDivisionGateClearance(state, 'div-lantas', true), true);
  assert.equal(state.divisions.find((d) => d.id === 'div-lantas').gateClearance, true);

  // Arrest ai-4 into Mabes Rutan -> placed inside prison cell & clears incident lock
  const target = state.members.find((m) => m.id === 'ai-4');
  const inc = state.incidents[0];
  inc.assignedOfficerId = target.id;
  assert.equal(arrestMemberToPrison(state, target.id, 6, 'Uji penahanan Propam', 'Kanit Propam'), true);
  assert.equal(target.aiState, 'DETAINED');
  assert.equal(typeof target.prisonCell, 'number');
  assert.equal(inc.assignedOfficerId, null, 'Arresting member must release active incident lock');
  const cell = MABES_ZONES.prison.cells[target.prisonCell];
  assert.ok(Math.abs(target.x - cell.x) < 2 && Math.abs(target.y - cell.y) < 2);

  // Advance simulation past detention timer -> auto-releases detainee
  target.detainedRemaining = 0.04;
  stepSimulation(state, 0.1);
  assert.equal(target.detainedRemaining, 0);
  assert.equal(target.prisonCell, null);
  assert.notEqual(target.aiState, 'DETAINED');

  // Re-arrest & test manual release + Propam NLP intents
  arrestMemberToPrison(state, target.id, 15, 'Uji manual', 'Kapolda');
  assert.equal(releaseMemberFromPrison(state, target.id, 'Kapolda'), true);
  assert.equal(target.detainedRemaining, 0);

  assert.equal(parseOwnerNaturalCommand('tolong kunci gerbang propam mabes sekarang', state).intent, 'TOGGLE_PROPAM_GATE');
  assert.equal(parseOwnerNaturalCommand('masukkan bagas ke penjara rutan propam!', state).intent, 'ARREST_MEMBER');
  assert.equal(parseOwnerNaturalCommand('bebaskan bagas dari rutan sekarang', state).intent, 'RELEASE_MEMBER');

  const chatGate = processOwnerMessage(state, 'ruang-komando', 'buka gerbang propam sekarang');
  assert.equal(chatGate.intent, 'TOGGLE_PROPAM_GATE');
  assert.equal(state.mabesSecurity.gateOpen, true);
});

test('100-agent roster scaling has zero duplicate usernames/names and runs fast 60Hz ticks', () => {
  assert.equal(MAX_AI_MEMBERS, 100);
  assert.equal(AI_NAME_POOL.length, 100);
  const poolUsernames = new Set(AI_NAME_POOL.map((p) => p.username));
  const poolIcNames = new Set(AI_NAME_POOL.map((p) => p.icName.toLowerCase()));
  assert.equal(poolUsernames.size, 100, 'AI_NAME_POOL must have 100 unique usernames');
  assert.equal(poolIcNames.size, 100, 'AI_NAME_POOL must have 100 unique IC names');

  const fallback = generateUniqueAiProfile(poolUsernames, poolIcNames, 101);
  assert.equal(poolUsernames.has(fallback.username), false);
  assert.equal(poolIcNames.has(fallback.icName.toLowerCase()), false);

  const state = createInitialState();
  // Raise quotas across divisions so 95+ roster is eligible to join
  state.divisions.forEach((d) => setDivisionQuota(state, d.id, 30, 'Test'));
  state.ranks.push({ id: 'rank-test-ext', name: 'Bripka', order: 7, minXp: 900, salary: 400, color: '#38BDF8', permissions: {} });
  state.reputation = 95;
  assert.equal(shouldNewApplicantJoin(state, 0.05), true);

  // Fill to 100 members and simulate 20 ticks cleanly
  for (let i = state.members.length; i < MAX_AI_MEMBERS; i++) {
    const p = AI_NAME_POOL[i];
    state.members.push({
      ...state.members[0],
      id: `ai-scale-${i}`,
      username: p.username,
      icName: p.icName,
      speechQuirk: p.speechQuirk,
      divisionId: state.divisions[i % state.divisions.length].id,
      status: 'online-2d',
      x: 150 + (i % 10) * 90,
      y: 120 + Math.floor(i / 10) * 70,
    });
  }
  assert.equal(state.members.length, 100);
  assert.equal(shouldNewApplicantJoin(state, 0.01), false, 'Should strictly enforce 100 AI cap');

  const t0 = Date.now();
  for (let tick = 0; tick < 20; tick++) {
    stepSimulation(state, 0.016);
  }
  const elapsedMs = Date.now() - t0;
  assert.ok(elapsedMs < 500, `20 ticks with 100 AI should complete swiftly (<500ms), got ${elapsedMs}ms`);
});

test('division duty specialization routes Propam to Mabes gates/compound and Satlantas to traffic incidents', () => {
  const state = createInitialState();
  state.incidents = [];
  state.members.forEach((m) => {
    m.needsWelcome = false;
    m.status = 'online-2d';
  });

  // Propam unit inside Mabes with waitTimer=0 should sample Mabes gates or compound interior (never far coastal pier)
  const propamAgent = state.members.find((m) => m.id === 'ai-2');
  assignMemberDivision(state, propamAgent.id, 'div-propam');
  const propamDp = getDivisionDutyProfile(state.divisions.find((d) => d.id === 'div-propam'));
  assert.equal(propamDp.assignmentType, 'INTERNAL_SECURITY');
  assert.ok(propamDp.mabesPatrolBias >= 0.8);
  assert.ok(propamDp.gateGuardBias >= 0.5);

  propamAgent.aiState = 'PATROL';
  propamAgent.x = MABES_ZONES.courtyard.x;
  propamAgent.y = MABES_ZONES.courtyard.y;
  propamAgent.targetX = propamAgent.x;
  propamAgent.targetY = propamAgent.y;
  propamAgent.waitTimer = 0;

  // Deterministic rng=0.1 triggers doMabes + gateGuardBias -> targets East or South gate!
  stepSimulation(state, 0.05, { moveX: 0, moveY: 0 }, () => 0.1);
  const comp = MABES_ZONES.compound;
  assert.ok(
    propamAgent.targetX >= comp.x && propamAgent.targetX <= comp.x + comp.w + 25 &&
    propamAgent.targetY >= comp.y && propamAgent.targetY <= comp.y + comp.h + 25,
    'Propam unit should target Mabes gate/compound patrol zone'
  );

  // Far traffic incident at Dermaga must be skipped by Propam (outside 240px radius), but Satlantas prioritizes TILANG
  state.incidents.push({
    id: 'inc-far-tilang',
    type: 'TILANG',
    label: 'Tilang Pelabuhan',
    x: 1050,
    y: 740,
    rewardXp: 35,
    rewardRep: 3,
    color: '#F59E0B',
    progress: 0,
    duration: 5,
    assignedOfficerId: null,
    districtName: 'Dermaga',
  });
  stepSimulation(state, 0.05, { moveX: 0, moveY: 0 }, () => 0.2);
  assert.equal(state.incidents[0].assignedOfficerId, null, 'Propam should ignore distant city traffic tilang');

  // Satlantas unit within 480px picks up TILANG
  const lantasUnit = state.members.find((m) => m.id === 'ai-1');
  lantasUnit.aiState = 'PATROL';
  lantasUnit.x = 760;
  lantasUnit.y = 560;
  stepSimulation(state, 0.05, { moveX: 0, moveY: 0 }, () => 0.5);
  assert.equal(state.incidents[0].assignedOfficerId, lantasUnit.id, 'Satlantas should intercept TILANG incident');
});

test('autonomous rank authority completes full Polri ladder up to Jenderal (Bintang 4) & manages quotas/divisions', () => {
  const state = createInitialState();
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canCreateRank', true);
  setBilletPermission(state, 'billet-wakapolri', 'canCreateDivision', true);
  setBilletPermission(state, 'billet-wakapolri', 'canManageDivisionQuota', true);

  // Give ai-1 AKP rank so top non-owner rank is occupied -> triggers rank ladder expansion without artificial <12 cap
  const akpRank = state.ranks.find((r) => r.name === 'AKP');
  state.members.find((m) => m.id === 'ai-1').rankId = akpRank.id;

  // Fill div-sabhara above 90% quota to trigger division expansion or quota increase
  state.divisions.find((d) => d.id === 'div-sabhara').quota = 2;
  state.members.find((m) => m.id === 'ai-2').divisionId = 'div-sabhara';
  state.members.find((m) => m.id === 'ai-4').divisionId = 'div-sabhara';

  // Run several autonomy ticks
  for (let i = 0; i < 16; i++) {
    state.cooldowns.autonomyTick = 0.01;
    stepSimulation(state, 0.05);
  }

  const rankNames = state.ranks.map((r) => r.name);
  assert.ok(rankNames.includes('Jenderal'), `Expected full Polri rank ladder to include Jenderal (Bintang 4), got: ${rankNames.join(', ')}`);
  assert.ok(state.divisions.length >= 4, 'Expected autonomous division creation when active divisions fill up');

  // Test manual & NLP quota and duty profile changes
  assert.equal(setDivisionQuota(state, 'div-sabhara', 25, 'Kapolda'), true);
  assert.equal(state.divisions.find((d) => d.id === 'div-sabhara').quota, 25);

  assert.equal(
    setDivisionDutyProfile(state, 'div-sabhara', { assignmentType: 'MARITIME' }, 'Kapolda'),
    true
  );
  assert.equal(getDivisionDutyProfile(state.divisions.find((d) => d.id === 'div-sabhara')).assignmentType, 'MARITIME');

  const qRes = processOwnerMessage(state, 'ruang-komando', 'naikkan kuota divisi propam menjadi 18');
  assert.equal(qRes.intent, 'ADJUST_DIVISION_QUOTA');
  assert.equal(state.divisions.find((d) => d.id === 'div-propam').quota, 18);

  const dRes = processOwnerMessage(state, 'ruang-komando', 'atur tugas divisi sabhara jaga gerbang mabes');
  assert.equal(dRes.intent, 'CONFIGURE_DIVISION_DUTY');
  assert.equal(getDivisionDutyProfile(state.divisions.find((d) => d.id === 'div-sabhara')).assignmentType, 'INTERNAL_SECURITY');
});

test('custom avatarEngine & serverLogoEngine distinguish full Polri ranks and 16+ specialized divisions', () => {
  const star1 = resolveProfileIdentity({ rank: { name: 'Brigjen', order: 14 }, division: { name: 'Sabhara' } });
  const star4 = resolveProfileIdentity({ rank: { name: 'Jenderal', order: 17 }, division: { name: 'Mabes' } });
  const bharada = resolveProfileIdentity({ rank: { name: 'Bharada', order: 2 }, division: { name: 'Brimob' } });
  const aiptu = resolveProfileIdentity({ rank: { name: 'Aiptu', order: 7 }, division: { name: 'Propam' } });

  assert.equal(star1.uniformTier, 'PERWIRA_TINGGI');
  assert.equal(star1.pipCount, 1);
  assert.equal(star4.uniformTier, 'PERWIRA_TINGGI');
  assert.equal(star4.pipCount, 4);
  assert.equal(bharada.uniformTier, 'BHAYANGKARA');
  assert.equal(bharada.pipCount, 1);
  assert.equal(aiptu.uniformTier, 'BINTARA');
  assert.equal(aiptu.pipCount, 3);

  // Render SVG with PATI 4-star Jenderal rank
  const state = createInitialState();
  state.ranks.push({ id: 'rank-jend-t', name: 'Jenderal', order: 17, minXp: 8200, color: '#FACC15', salary: 1150, permissions: {} });
  const jendSvg = avatarEngine.renderSvg('test-jend', 'jenderal_izumi', {
    member: { ...state.members[0], rankId: 'rank-jend-t', divisionId: 'div-propam' },
    state,
  });
  assert.ok(jendSvg.includes('polygon'), 'Jenderal avatar should render star shoulder insignia');

  // Server logo engine handles new expansion division profiles distinctly
  assert.equal(DIVISION_EXPANSION_POOL.length, 16);
  const densusProf = resolveServerProfile({ name: 'SATUAN DENSUS 88 AT', shortCode: 'D88', category: 'DIVISI' });
  const dokkesProf = resolveServerProfile({ name: 'SATUAN DOKKES & MEDIS', shortCode: 'DKS', category: 'DIVISI' });
  assert.equal(densusProf, 'DENSUS');
  assert.equal(dokkesProf, 'DOKKES');
  const d88Svg = serverLogoEngine.renderSubServerLogo({ id: 'sub-d88', name: 'SATUAN DENSUS 88 AT', shortCode: 'D88', category: 'DIVISI' });
  assert.ok(d88Svg.startsWith('<svg'));
});

test('autonomy fixes raise rank hierarchy ceiling above 30, promote eligible personnel, and demote violators', () => {
  const state = createInitialState();
  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canPromote', true);
  setBilletPermission(state, 'billet-wakapolri', 'canDemote', true);

  // Give ai-1 Komjen-level rank (order 16) to verify getMemberHierarchy no longer saturates at 30
  state.ranks.push({ id: 'rank-komjen', name: 'Komjen', order: 16, minXp: 4000, salary: 1000, color: '#FACC15', permissions: {} });
  const waka = state.members.find((m) => m.id === 'ai-1');
  waka.rankId = 'rank-komjen';
  waka.xp = 4500;
  assert.ok(getMemberHierarchy(waka, state) > 30, 'High-rank hierarchy must exceed legacy cap of 30');

  // Eligible non-cadet member promotes cleanly while ENROLLED cadet is skipped
  const promoTarget = state.members.find((m) => m.id === 'ai-2');
  const beforeRankOrder = state.ranks.find((r) => r.id === promoTarget.rankId).order;
  promoTarget.xp = 2000;
  promoTarget.betahScore = 82;
  promoTarget.violationCount = 0;

  const enrolledCadet = state.members.find((m) => m.id === 'ai-4');
  enrolledCadet.academyStatus = 'ENROLLED';
  enrolledCadet.xp = 2000;
  enrolledCadet.betahScore = 85;
  const cadetRankBefore = enrolledCadet.rankId;

  state.cooldowns.autonomyTick = 0.01;
  stepSimulation(state, 0.05);
  const afterRankOrder = state.ranks.find((r) => r.id === promoTarget.rankId).order;
  assert.ok(afterRankOrder > beforeRankOrder, 'Eligible member should be promoted autonomously');
  assert.equal(enrolledCadet.rankId, cadetRankBefore, 'Enrolled Akpol cadet must not receive premature rank promotion');

  // Member with >= 2 violations is demoted autonomously
  const violator = state.members.find((m) => m.id === 'ai-3');
  violator.rankId = 'rank-brigadir';
  violator.violationCount = 3;
  violator.betahScore = 36;
  state.cooldowns.autonomyTick = 0.01;
  stepSimulation(state, 0.05);
  const brigadirOrderAfter = state.ranks.find((r) => r.id === 'rank-brigadir').order;
  const violatorOrderAfter = state.ranks.find((r) => r.id === violator.rankId).order;
  assert.notEqual(violator.rankId, 'rank-brigadir', 'Violator should leave Brigadir rank upon demotion');
  assert.ok(violatorOrderAfter < brigadirOrderAfter, 'Member with violations & low betah should be autonomously demoted below Brigadir');
  assert.ok(violator.violationCount < 3, 'Demotion should reset violation tally by 2');
});

test('full 5-step RP division pipeline: daily quota -> DM proposal -> #registrasi gate -> Phase I-IV -> Pelantikan & Unit staffing', () => {
  const state = createInitialState();
  const sabhara = state.divisions.find((d) => d.id === 'div-sabhara');
  sabhara.units = [];
  sabhara.proposalStatus = 'NONE';
  sabhara.recruitmentOpen = false;

  // Step 1: Active Division Head sets daily quota
  const head = ensureDivisionHead(state, sabhara);
  assert.ok(head, 'Division should have an active Ketua Divisi');
  assert.equal(setDivisionDailyQuota(state, sabhara.id, 2, head.icName), true);
  assert.equal(sabhara.dailyIntakeQuota, 2);

  // Step 2: Ketua Divisi builds 2-Unit x 2-Sub-Unit proposal and sends DM to Owner
  const prop = createDivisionProposalAndSendDm(state, sabhara.id, head.id, 2);
  assert.ok(prop);
  assert.equal(prop.status, 'PENDING');
  assert.equal(prop.units.length, 2);
  assert.equal(prop.units[0].subUnits.length, 2);
  assert.ok(state.dms.some((d) => d.proposalId === prop.id && d.peerId === head.id));

  // Step 3: Owner approves via DM message ('acc') -> #registrasi sub-server opens
  const dmRes = processOwnerDmMessage(state, head.id, 'acc lanjut buka registrasi');
  assert.equal(dmRes.intent, 'APPROVE_DIVISION_PROPOSAL');
  assert.equal(prop.status, 'APPROVED');
  assert.equal(sabhara.recruitmentOpen, true);
  const sub = state.subServers.find((s) => s.linkedDivisionId === sabhara.id && s.category === 'DIVISI');
  assert.ok(sub, 'Division sub-server should exist after approval');
  assert.ok(sub.channels.some((c) => c.name === 'registrasi'), 'Sub-server must contain #registrasi channel');

  // Step 4a: Unranked Taruna applying to #registrasi is evaluated and REJECTED
  const taruna = state.members.find((m) => m.id === 'ai-4');
  taruna.divisionId = null;
  taruna.needsWelcome = false;
  const tarunaSubRes = submitDivisionRegistration(state, taruna.id, sabhara.id);
  assert.equal(tarunaSubRes.ok, true);
  const tarunaEval = evaluateDivisionCandidate(state, tarunaSubRes.recruit.id, head.id);
  assert.equal(tarunaEval.stage, 'REJECTED');
  assert.equal(taruna.divisionId, null, 'Taruna must remain unassigned after #registrasi rejection');

  // Step 4b: Qualified graduate (Bripda+) applies, passes selection, advances Phase I -> II -> III -> IV -> Pelantikan
  const grad = state.members.find((m) => m.id === 'ai-3');
  grad.divisionId = null;
  grad.needsWelcome = false;
  grad.academyStatus = 'GRADUATED';
  grad.rankId = 'rank-bripda';
  grad.personality = { professionalism: 82, loyalty: 80, activityDrive: 80, ambition: 65, empathy: 75 };
  grad.loyalty = 80;

  const gradSubRes = submitDivisionRegistration(state, grad.id, sabhara.id);
  assert.equal(gradSubRes.ok, true);
  assert.equal(sub.memberRoles[grad.id].roleName, 'Calon Pendaftar (#registrasi)');
  assert.equal(grad.divisionId, null, 'Applicant must NOT become permanent member before Pelantikan');

  const evalRes = evaluateDivisionCandidate(state, gradSubRes.recruit.id, head.id);
  assert.equal(evalRes.stage, 'PHASE_1');
  assert.equal(sabhara.dailyIntakeCount, 1);

  // Advance through Phase II, III, IV, and Pelantikan (INAUGURATED)
  const p2 = advanceDivisionTraineePhase(state, gradSubRes.recruit.id, head.id, 30);
  assert.equal(p2.stage, 'PHASE_2');
  const p3 = advanceDivisionTraineePhase(state, gradSubRes.recruit.id, head.id, 30);
  assert.equal(p3.stage, 'PHASE_3');
  const p4 = advanceDivisionTraineePhase(state, gradSubRes.recruit.id, head.id, 25);
  assert.equal(p4.stage, 'PHASE_4');
  const pel = advanceDivisionTraineePhase(state, gradSubRes.recruit.id, head.id, 25);

  // Step 5: Permanent division membership & vacant Unit/Sub-Unit slot filled
  assert.equal(pel.stage, 'INAUGURATED');
  assert.equal(grad.divisionId, sabhara.id, 'Graduated trainee becomes permanent member upon Pelantikan');
  assert.ok(grad.divisionUnitId, 'Member assigned to a Unit after Pelantikan');
  assert.ok(grad.divisionSubUnitId, 'Member assigned to a Sub-Unit after Pelantikan');
  assert.ok(grad.divisionUnitRole, 'Member receives Sub-Unit billet role title');
  assert.ok(sub.memberRoles[grad.id].roleName.startsWith('Anggota Tetap'));
  const assignedSubUnit = sabhara.units.flatMap((u) => u.subUnits).find((su) => su.id === grad.divisionSubUnitId);
  assert.ok(assignedSubUnit.assignedMemberIds.includes(grad.id));
});

test('strict division and sub-server ownership realism prevents cross-division head and sub-server overlaps', () => {
  const state = createInitialState();
  const sabhara = state.divisions.find((d) => d.id === 'div-sabhara');
  const intel = state.divisions.find((d) => d.id === 'div-intelkam') || state.divisions[1];
  const polairud = state.divisions.find((d) => d.id === 'div-polairud') || state.divisions[2] || sabhara;

  const agentSabhara = state.members.find((m) => m.divisionId === sabhara.id);
  assert.ok(agentSabhara);

  intel.headId = agentSabhara.id;
  validateAndCleanDivisionAndSubServerOwnership(state);
  assert.notEqual(intel.headId, agentSabhara.id, 'Cross-division head assignment should be automatically cleaned up');

  const subPolairud = createSubServerRecord(state, {
    name: 'POLAIRUD SEKTOR',
    shortCode: 'PLR',
    category: 'DIVISI',
    ownerId: agentSabhara.id,
    linkedDivisionId: polairud.id !== sabhara.id ? polairud.id : null,
  });
  if (polairud.id !== sabhara.id && subPolairud) {
    validateAndCleanDivisionAndSubServerOwnership(state);
    const updatedSub = state.subServers.find((s) => s.id === subPolairud.id);
    assert.notEqual(updatedSub.ownerId, agentSabhara.id, 'Agent from Sabhara should not own an unrelated division sub-server');
  }
});

test('autonomous authority automatically fills empty billets and division heads and enforces same division for sub-servers', () => {
  const state = createInitialState();
  state.billets.forEach((b) => (b.holderId = null));
  state.divisions.forEach((d) => (d.headId = null));

  assignMemberBillet(state, 'ai-1', 'billet-wakapolri');
  setBilletPermission(state, 'billet-wakapolri', 'canPromote', true);
  setBilletPermission(state, 'billet-wakapolri', 'canAcceptRecruit', true);

  for (let i = 0; i < 5; i++) {
    state.cooldowns.autonomyTick = 0.01;
    stepSimulation(state, 0.05);
  }

  const filledBillets = state.billets.filter((b) => Boolean(b.holderId)).length;
  assert.ok(filledBillets > 0, 'Autonomous role tick should fill empty command chain billets');

  state.divisions.forEach((div) => {
    if (div.headId) {
      const head = state.members.find((m) => m.id === div.headId);
      assert.ok(head, 'Division head must be a valid existing member');
      assert.equal(head.divisionId, div.id, 'Division head must belong to the exact same division');
    }
  });
});

test('division mutation automatically triggers sub-server leave farewell and join greeting with isolated sub-server profiles', () => {
  const state = createInitialState();
  const sabhara = state.divisions.find((d) => d.id === 'div-sabhara');
  const lantas = state.divisions.find((d) => d.id === 'div-lantas');
  assert.ok(sabhara && lantas);

  // Set up Sabhara Sub-Server
  const sabharaSub = createSubServerRecord(state, {
    name: 'KORPS SABHARA POLDA',
    shortCode: 'SBR',
    category: 'DIVISI',
    ownerId: sabhara.headId || 'ai-2',
    linkedDivisionId: sabhara.id,
  });
  assert.ok(sabharaSub);

  // Set up Lantas Sub-Server
  const lantasSub = createSubServerRecord(state, {
    name: 'DITLANTAS POLDA',
    shortCode: 'LTS',
    category: 'DIVISI',
    ownerId: lantas.headId || 'ai-1',
    linkedDivisionId: lantas.id,
  });
  assert.ok(lantasSub);

  // Pick an officer in Sabhara who is not the head
  let member = state.members.find((m) => m.divisionId === sabhara.id && m.id !== sabharaSub.ownerId);
  if (!member) {
    member = state.members.find((m) => m.id !== sabharaSub.ownerId && m.id !== lantasSub.ownerId);
    member.divisionId = sabhara.id;
  }
  // Ensure member is in sabharaSub
  if (!sabharaSub.memberIds.includes(member.id)) {
    sabharaSub.memberIds.push(member.id);
  }
  if (!sabharaSub.memberRoles) sabharaSub.memberRoles = {};
  sabharaSub.memberRoles[member.id] = 'Patroli Perintis Presisi';

  const oldChannelId = sabharaSub.channels[0]?.id;
  assert.ok(oldChannelId);
  const initialOldMsgsCount = (sabharaSub.messages[oldChannelId] || []).length;

  const newChannelId = lantasSub.channels[0]?.id;
  assert.ok(newChannelId);
  const initialNewMsgsCount = (lantasSub.messages[newChannelId] || []).length;

  // Now mutate member to Lantas
  const mutateOk = assignMemberDivision(state, member.id, lantas.id);
  assert.equal(mutateOk, true);
  assert.equal(member.divisionId, lantas.id);

  // 1. Must have left Sabhara sub-server
  assert.ok(!sabharaSub.memberIds.includes(member.id), 'Member must be removed from old sub-server memberIds');
  assert.ok(!sabharaSub.memberRoles[member.id], 'Member role in old sub-server must be cleared');

  // 2. Old sub-server channel must have a leave/izin mutasi farewell message
  const oldMsgs = sabharaSub.messages[oldChannelId] || [];
  assert.ok(oldMsgs.length > initialOldMsgsCount, 'Farewell message must be sent to old sub-server');
  const farewellMsg = oldMsgs.find((m) => m.authorId === member.id && /mutasi|pamit|izin/i.test(m.content));
  assert.ok(farewellMsg, 'Member must post an authentic RP farewell message in old sub-server');

  // 3. Member must automatically join Lantas sub-server
  assert.ok(lantasSub.memberIds.includes(member.id), 'Member must be added to new sub-server memberIds');
  assert.ok(lantasSub.memberRoles[member.id], 'Member must receive a starting sub-server role in new division');

  // 4. New sub-server channel must have a greeting/lapor mutasi message
  const newMsgs = lantasSub.messages[newChannelId] || [];
  assert.ok(newMsgs.length > initialNewMsgsCount, 'Greeting message must be sent to new sub-server');
  const greetingMsg = newMsgs.find((m) => m.authorId === member.id && /lapor|bergabung|mutasi/i.test(m.content));
  assert.ok(greetingMsg, 'Member must post an authentic RP arrival message in new sub-server');

  // 5. Verify isolated sub-server profile
  const subProfile = getMemberSubServerProfile(member, lantasSub, state);
  assert.ok(subProfile);
  assert.equal(subProfile.subServerId, lantasSub.id);
  assert.ok(subProfile.roleTitle);
  assert.ok(subProfile.internalUnit);
  assert.ok(subProfile.internalDutyStatus);
  assert.ok(Array.isArray(subProfile.divisionalAwards));
});

test('30-authority permissions, abbreviated KADIV/WAKADIV/KANIT billets, and 24-award Polri catalog work seamlessly', () => {
  assert.equal(AUTHORITY_CATEGORIES.length, 5);
  assert.equal(PERMISSION_DEFINITIONS.length, 30);
  const permKeys = new Set(PERMISSION_DEFINITIONS.map((p) => p.key));
  assert.equal(permKeys.size, 30, 'All 30 permission keys must be unique');
  [
    'canAppointUnitLeader',
    'canLeadAkpolDrill',
    'canRespondAkpolRequest',
    'canShareSubServerInvite',
    'canManageSubServerInternal',
    'canTakeoverSubServer',
  ].forEach((k) => assert.ok(permKeys.has(k), `New permission ${k} must exist`));

  // Awards catalog: 9 Brevet, 9 Sertifikat, 9 Medali/Penghargaan with descriptions
  assert.equal(AWARDS_CATALOG.length, 27);
  assert.equal(AWARDS_CATALOG.filter((a) => a.category === 'Brevet').length, 9);
  assert.equal(AWARDS_CATALOG.filter((a) => a.category === 'Sertifikat').length, 9);
  assert.equal(AWARDS_CATALOG.filter((a) => a.category === 'Medali').length, 9);
  AWARDS_CATALOG.forEach((a) => {
    assert.ok(a.desc && a.desc.length > 10, `Award ${a.id} must have a meaningful description`);
  });

  const state = createInitialState();
  // Default abbreviated billets & BILLET_EXPANSION_POOL presets
  const billetNames = state.billets.map((b) => b.name);
  assert.ok(billetNames.includes('WAKAPOLRI'));
  assert.ok(billetNames.includes('KALEMDIKLAT'));
  assert.ok(billetNames.includes('KANIT PROPAM'));
  assert.ok(BILLET_EXPANSION_POOL.length >= 16);
  assert.ok(BILLET_EXPANSION_POOL.some((b) => b.name.startsWith('KADIV ')));
  assert.ok(BILLET_EXPANSION_POOL.some((b) => b.name.startsWith('WAKADIV ')));
  assert.ok(BILLET_EXPANSION_POOL.some((b) => b.name.startsWith('KANIT ')));

  // 9-tier profile grouping renders awards cleanly
  const member = state.members[0];
  member.awards = ['brv-gegana', 'srt-baris', 'med-nararya'];
  const groups = resolveMemberRoleGroups(member, state);
  assert.equal(groups.find((g) => g.id === 'brevet').items.length, 1);
  assert.equal(groups.find((g) => g.id === 'sertifikat').items.length, 1);
  assert.equal(groups.find((g) => g.id === 'penghargaan').items.length, 1);
});

test('Akpol #request training flow, trainer presence requirement, and synchronized cohort baris-berbaris', () => {
  const state = createInitialState();
  updateAcademySettings(state, { isOpen: true, quota: 2, minProfessionalism: 40, minActivityDrive: 40, minBetah: 40 });
  const akpolSub = state.subServers.find((s) => s.id === AKPOL_SUB_SERVER_ID);
  assert.ok(akpolSub, 'sub-akademi AKADEMI KEPOLISIAN must exist on state creation');
  assert.ok(akpolSub.channels.some((c) => c.name === 'registrasi'));
  assert.ok(akpolSub.channels.some((c) => c.name === 'request'));

  // Register & enroll 2 cadets to reach quota 2/2
  submitAkpolRegistration(state, 'ai-2');
  submitAkpolRegistration(state, 'ai-3');
  assert.equal(enrollMemberInAcademy(state, 'ai-2').ok, true);
  assert.equal(enrollMemberInAcademy(state, 'ai-3').ok, true);

  const reqRes = postAkpolTrainingRequest(state, 'ai-2');
  assert.equal(reqRes.ok, true);
  const reqCh = akpolSub.channels.find((c) => c.name === 'request');
  const lastReq = akpolSub.messages[reqCh.id][akpolSub.messages[reqCh.id].length - 1];
  assert.equal(lastReq.isAkpolRequest, true);

  // Authorized trainer leads cohort drill synchronously
  const trainer = state.members.find((m) => m.id === 'ai-1');
  assignMemberBillet(state, trainer.id, 'billet-kalemdiklat');
  const drillRes = leadAkpolCohortDrill(state, trainer, 30);
  assert.equal(drillRes.ok, true);
  assert.equal(drillRes.count, 2);

  const cohortStatus = getAkpolCohortStatus(state);
  assert.equal(cohortStatus.quotaMet, true);
  assert.equal(cohortStatus.isDrilling, true);
  assert.equal(cohortStatus.trainerName, trainer.icName);
});

test('Delegated Sub-Server internal management allows non-owner KADIV/KANIT/delegated managers to config, share links, and takeover leadership', () => {
  const state = createInitialState();
  const sabhara = state.divisions.find((d) => d.id === 'div-sabhara');
  const oldOwner = state.members.find((m) => m.id === 'ai-2');
  const viceMgr = state.members.find((m) => m.id === 'ai-3');
  assignMemberDivision(state, oldOwner.id, sabhara.id);
  assignMemberDivision(state, viceMgr.id, sabhara.id);
  sabhara.headId = oldOwner.id;

  const sub = createSubServerRecord(state, {
    name: 'SATUAN SABHARA SUB',
    shortCode: 'SBS',
    category: 'DIVISI',
    ownerId: oldOwner.id,
    linkedDivisionId: sabhara.id,
  });
  assert.ok(sub);

  // Initially viceMgr is not yet owner or delegated internal manager
  assert.equal(canMemberManageSubServer(viceMgr, sub, state), false);

  // Delegate internal management permission to viceMgr
  const grantRes = setSubServerInternalAccess(
    state,
    sub.id,
    viceMgr.id,
    { canManageSubServer: true, roleName: 'WAKADIV SABHARA' },
    oldOwner.id
  );
  assert.equal(grantRes.ok, true);
  assert.equal(canMemberManageSubServer(viceMgr, sub, state), true);
  assert.equal(canMemberShareSubServerInvite(viceMgr, sub, state), true);
  assert.equal(canMemberTakeoverSubServer(viceMgr, sub, state), true);

  // Non-owner delegated manager updates sub-server config
  const cfgRes = updateSubServerConfig(
    state,
    sub.id,
    { name: 'SABHARA PRESISI JAYA', shortCode: 'SPJ' },
    viceMgr.id
  );
  assert.equal(cfgRes.ok, true);
  assert.equal(sub.name, 'SABHARA PRESISI JAYA');
  assert.equal(sub.shortCode, 'SPJ');

  // Leadership takeover when oldOwner moves division / leaves
  const takeRes = takeoverSubServerLeadership(
    state,
    sub.id,
    viceMgr.id,
    viceMgr.id,
    'Owner lama pindah divisi'
  );
  assert.equal(takeRes.ok, true);
  assert.equal(sub.ownerId, viceMgr.id);
});





