// Sub-Server Autonomy, 5-Step RP Division Recruitment Pipeline & Sub-Jabatan Staff Effects
import {
  DIVISION_EXPANSION_POOL,
  SUB_SERVER_BLUEPRINTS,
} from '../constants.js';
import {
  buildDivisionRegistrationSubmission,
  checkSubServerEligibility,
} from './recruitGuides.js';
import { generateInterAiReply } from './interAiReply.js';

export function runAutonomousSubServerAndStaffTick(state, helpers, ctx) {
  const {
    createSubServerRecord,
    affiliateSubServer,
    appendSubServerMessage,
    appendChannelMessage,
    getRankById,
    ensureDivisionHead,
    setDivisionDailyQuota,
    createDivisionProposalAndSendDm,
    ensureDivisionSubServerAndRegistrasi,
    submitDivisionRegistration,
    evaluateDivisionCandidate,
    advanceDivisionTraineePhase,
    clamp,
  } = helpers;

  const { actions, circadian, divCountMap, rankMap, divMap } = ctx;

  // 2. Personal Authority & Sub-Server Autonomous Management
  if (createSubServerRecord && Array.isArray(state.subServers)) {
    const serverOwners = state.members.filter((m) => {
      if (m.status === 'offline') return false;
      const billet = m.billetId ? state.billets.find((b) => b.id === m.billetId) : null;
      const isUnitHead = billet && /(kasat|komandan|kanit|kalemdiklat|ketua|kepala|wakapolri)/i.test(billet.name);
      return m.personalAuthority?.canOwnSubServer || isUnitHead;
    });

    for (const actor of serverOwners) {
      const alreadyOwns = state.subServers.some((s) => s.ownerId === actor.id);
      if (!alreadyOwns && state.subServers.length < 8) {
        const billet = actor.billetId ? state.billets.find((b) => b.id === actor.billetId) : null;
        const div = actor.divisionId ? state.divisions.find((d) => d.id === actor.divisionId) : null;
        const expMatch = div ? DIVISION_EXPANSION_POOL.find((e) => e.name.toLowerCase() === div.name.toLowerCase()) : null;

        let chosenBlueprint = null;
        if (billet && /kalemdiklat|instruktur/i.test(billet.name)) {
          chosenBlueprint = SUB_SERVER_BLUEPRINTS.find((b) => b.id === 'sub-akademi');
        } else if (billet && /event/i.test(billet.name)) {
          chosenBlueprint = SUB_SERVER_BLUEPRINTS.find((b) => b.id === 'sub-event');
        } else if ((billet && /brimob/i.test(billet.name)) || (div && /brimob/i.test(div.name))) {
          chosenBlueprint = SUB_SERVER_BLUEPRINTS.find((b) => b.id === 'sub-brimob');
        } else if (billet && /wakapolri/i.test(billet.name)) {
          chosenBlueprint = SUB_SERVER_BLUEPRINTS.find((b) => b.id === 'sub-perwira');
        }

        const unusedBlueprint =
          chosenBlueprint && !state.subServers.some((s) => s.name === chosenBlueprint.name)
            ? chosenBlueprint
            : SUB_SERVER_BLUEPRINTS.find((bp) => !state.subServers.some((s) => s.name === bp.name));

        let payload;
        if (expMatch && !state.subServers.some((s) => s.name.toLowerCase() === expMatch.subServerName.toLowerCase())) {
          payload = {
            name: expMatch.subServerName,
            shortCode: expMatch.subCode,
            category: 'DIVISI',
            color: expMatch.color,
            description: `Sub-server resmi satuan ${expMatch.name} — dikelola mandiri oleh ${actor.icName}.`,
            ownerId: actor.id,
            linkedDivisionId: div.id,
            affiliate: Boolean(actor.personalAuthority?.canAffiliateServer),
          };
        } else if (unusedBlueprint) {
          payload = {
            ...unusedBlueprint,
            ownerId: actor.id,
            linkedDivisionId: div?.id || null,
            affiliate: Boolean(actor.personalAuthority?.canAffiliateServer),
          };
        } else {
          const baseName = div ? `SATUAN ${div.name.toUpperCase()}` : `FORUM ${actor.icName.split(' ')[0].toUpperCase()}`;
          const finalName = state.subServers.some((s) => s.name.toLowerCase() === baseName.toLowerCase())
            ? `${baseName} ${state.subServers.length + 1}`
            : baseName;
          payload = {
            name: finalName,
            shortCode: (div?.callsign || actor.icName.slice(0, 3)).toUpperCase(),
            category: 'DIVISI',
            color: div?.color || '#38BDF8',
            description: `Sub-server unit kerja dipimpin & dikelola penuh oleh ${actor.icName}.`,
            ownerId: actor.id,
            linkedDivisionId: div?.id || null,
            affiliate: Boolean(actor.personalAuthority?.canAffiliateServer),
          };
        }

        const created = createSubServerRecord(state, payload);
        if (created) {
          actions.push({ type: 'SUBSERVER_CREATED', by: actor.id, subServerId: created.id, name: created.name });
          break;
        }
      }
    }

    for (const sub of state.subServers) {
      if (sub.ownerId === 'owner' || sub.affiliatedToMain) continue;
      const subOwner = state.members.find((m) => m.id === sub.ownerId);
      if (!subOwner || subOwner.status === 'offline') continue;
      if (subOwner.personalAuthority?.canAffiliateServer && affiliateSubServer) {
        affiliateSubServer(state, sub.id, subOwner);
        actions.push({ type: 'SUBSERVER_AFFILIATED', by: subOwner.id, subServerId: sub.id });
        break;
      }
    }

    for (const sub of state.subServers) {
      if (sub.ownerId === 'owner') continue;
      const subOwner = state.members.find((m) => m.id === sub.ownerId);
      if (!subOwner || subOwner.status === 'offline') continue;

      if (appendSubServerMessage && sub.channels?.length > 0 && Math.random() < 0.25) {
        const ch = sub.channels[Math.floor(Math.random() * sub.channels.length)];
        const unitTopics =
          sub.category === 'EVENT'
            ? [
                'Persiapan event konvoi & lomba ketangkasan RP! Seluruh anggota yang betah (+Morale) siap meramaikan kota.',
                'Rundown acara komunitas akhir pekan sedang disiapkan, ada usulan hadiah brevet untuk unit terkompak?',
              ]
            : sub.category === 'PERWIRA'
              ? [
                  `Evaluasi internal Perwira: terpantau ${state.members.length} personel aktif, ${state.divisions.length} divisi berjalan, cek integritas pejabat sebelum promosi.`,
                  'Koordinasi pimpinan: pastikan rekrutan baru di lobi disambut hangat dan diberi pembinaan dasar.',
                ]
              : sub.category === 'AKADEMI'
                ? [
                    `Pengarahan Kampus Akpol: ${state.members.filter((m) => m.academyStatus === 'ENROLLED').length} Taruna aktif berlatih di lapangan timur.`,
                    'Evaluasi kurikulum halang rintang & kode etik Polri untuk angkatan Taruna bulan ini.',
                  ]
                : [
                    `Briefing internal ${sub.name}: tingkatkan koordinasi unit & pastikan laporan radio tetap sinkron dengan server utama.`,
                    `Cek kesiapan personel ${sub.shortCode}: tetap jaga profesionalisme saat bertugas di lapangan 2D.`,
                  ];

        const chMsgs = sub.messages?.[ch.id] || [];
        const unitTopic = unitTopics.find((t) => chMsgs[chMsgs.length - 1]?.text !== t) || unitTopics[0];
        if (chMsgs[chMsgs.length - 1]?.text === unitTopic) {
          continue;
        }

        const posted = appendSubServerMessage(state, sub.id, ch.id, {
          authorId: subOwner.id,
          authorName: subOwner.icName,
          authorRole: `Owner ${sub.shortCode}`,
          authorColor: sub.color,
          text: unitTopic,
        });

        if (posted && Math.random() < 0.45) {
          const peer = state.members.find(
            (m) => m.id !== subOwner.id && m.status !== 'offline' && sub.memberIds.includes(m.id)
          );
          if (peer) {
            const peerReply = generateInterAiReply(peer, posted, state, ch.id);
            if (peerReply) {
              const peerRank = getRankById(state, peer.rankId);
              appendSubServerMessage(state, sub.id, ch.id, {
                authorId: peer.id,
                authorName: peer.icName,
                authorRole: `${peerRank.name} · ${sub.shortCode}`,
                authorColor: peerRank.color,
                replyTo: peerReply.replyTo,
                text: peerReply.text,
              });
            }
          }
        }

        if (sub.category === 'EVENT') {
          state.members.forEach((m) => {
            m.betahScore = clamp(m.betahScore + 1.5, 0, 100);
          });
          state.reputation += 2;
        }
        actions.push({ type: 'SUBSERVER_ACTIVITY', by: subOwner.id, subServerId: sub.id });
        break;
      }
    }
  }

  // 2b. Autonomous 5-Step Authentic RP Division Recruitment Pipeline
  if (
    ensureDivisionHead &&
    setDivisionDailyQuota &&
    createDivisionProposalAndSendDm &&
    ensureDivisionSubServerAndRegistrasi &&
    submitDivisionRegistration &&
    evaluateDivisionCandidate &&
    advanceDivisionTraineePhase
  ) {
    const currentRpDay = Math.floor((state.simSeconds || 0) / 86400);
    let pipelineOps = 0;

    for (const div of state.divisions) {
      if (pipelineOps >= 4) break;
      const head = ensureDivisionHead(state, div);
      if (!head || head.status === 'offline' || (head.detainedRemaining || 0) > 0) continue;

      if (div.lastQuotaDay !== currentRpDay || !div.dailyIntakeQuota) {
        const permCount = divCountMap.get(div.id) || 0;
        const remainingCap = Math.max(2, (div.quota || 8) - permCount);
        const dailySlot = clamp(Math.min(remainingCap, Math.ceil((div.quota || 8) * 0.4)), 2, 6);
        setDivisionDailyQuota(state, div.id, dailySlot, head.icName);
        actions.push({ type: 'DIV_QUOTA_SET', by: head.id, divisionId: div.id, quota: dailySlot });
        pipelineOps++;
      }

      if (!div.proposalStatus || div.proposalStatus === 'NONE') {
        const prop = createDivisionProposalAndSendDm(state, div.id, head.id, div.dailyIntakeQuota || 3);
        if (prop) {
          actions.push({ type: 'DIV_PROPOSAL_SENT', by: head.id, divisionId: div.id, proposalId: prop.id });
          pipelineOps++;
          continue;
        }
      }

      if (div.proposalStatus === 'APPROVED' && div.recruitmentOpen) {
        const sub = ensureDivisionSubServerAndRegistrasi(state, div, head);
        const permCount = divCountMap.get(div.id) || 0;
        const hasDailySlot = (div.dailyIntakeCount || 0) < (div.dailyIntakeQuota || 3);
        const hasDivSlot = permCount < (div.quota || 10);
        const isSoloHead = permCount <= 1;
        const broadcastCooldown = isSoloHead ? 135 : 220;

        if (
          sub &&
          hasDailySlot &&
          hasDivSlot &&
          (state.simSeconds - (div.lastInviteBroadcastSec ?? -9999)) >= broadcastCooldown
        ) {
          const delegatedSharer =
            (sub.memberIds || [])
              .map((mid) => state.members.find((m) => m.id === mid))
              .find(
                (m) =>
                  m &&
                  m.status !== 'offline' &&
                  (m.id === div.viceHeadId || sub.memberRoles?.[m.id]?.canManageSubServer) &&
                  m.id !== head.id &&
                  Math.random() < 0.35
              ) || head;
          const invitePayload = helpers.buildInvite(sub, delegatedSharer, state);
          const sharerRank = rankMap.get(delegatedSharer.rankId) || getRankById(state, delegatedSharer.rankId);
          const targetLobby = (state.messages['lobi-rekrutmen']?.length || 0) % 2 === 0 ? 'lobi-rekrutmen' : 'obrolan-ooc';
          appendChannelMessage(state, targetLobby, {
            authorId: delegatedSharer.id,
            authorName: delegatedSharer.icName,
            authorRole:
              delegatedSharer.id === div.headId
                ? `${sharerRank.name} · KADIV ${div.callsign}`
                : delegatedSharer.id === div.viceHeadId
                  ? `${sharerRank.name} · WAKADIV ${div.callsign}`
                  : `${sharerRank.name} · Pengelola ${div.callsign}`,
            authorColor: sharerRank.color,
            text: invitePayload.text,
            recruitInvite: invitePayload.recruitInvite,
          });
          div.lastInviteBroadcastSec = state.simSeconds;
          actions.push({ type: 'DIV_INVITE_BROADCAST', by: delegatedSharer.id, divisionId: div.id, subServerId: sub.id });
          pipelineOps++;
        }
      }
    }

    const openDivisions = state.divisions.filter(
      (d) =>
        d.proposalStatus === 'APPROVED' &&
        d.recruitmentOpen &&
        (d.dailyIntakeCount || 0) < (d.dailyIntakeQuota || 3) &&
        (divCountMap.get(d.id) || 0) < (d.quota || 10)
    );
    if (openDivisions.length > 0 && pipelineOps < 5) {
      const recruitsList = state.divisionRecruits || [];
      const activeAppMemberIds = new Set(
        recruitsList.filter((r) => r.stage !== 'REJECTED' && r.stage !== 'INAUGURATED').map((r) => r.memberId)
      );
      const candidates = state.members.filter(
        (m) =>
          !m.divisionId &&
          !m.needsWelcome &&
          m.status !== 'offline' &&
          (m.detainedRemaining || 0) <= 0 &&
          !activeAppMemberIds.has(m.id)
      );
      const qualifiedCandidate = candidates.find((m) => {
        const rOrder = rankMap.get(m.rankId)?.order || 1;
        return rOrder >= 2 && m.academyStatus !== 'ENROLLED';
      });
      const candidate = qualifiedCandidate || (Math.random() < 0.25 ? candidates[0] : null);
      if (candidate) {
        const chosenDiv = openDivisions.find((d) => {
          const sub = (state.subServers || []).find((s) => s.linkedDivisionId === d.id && s.category === 'DIVISI');
          return sub && checkSubServerEligibility(candidate, sub, state).eligible;
        }) || openDivisions[0];
        const sub = ensureDivisionSubServerAndRegistrasi(state, chosenDiv, ensureDivisionHead(state, chosenDiv));
        const customForm = buildDivisionRegistrationSubmission(candidate, chosenDiv, sub, state);
        const res = submitDivisionRegistration(state, candidate.id, chosenDiv.id, customForm);
        if (res?.ok) {
          actions.push({ type: 'DIV_REGISTRASI_SUBMIT', by: candidate.id, divisionId: chosenDiv.id });
          pipelineOps++;
        }
      }
    }

    const pendingApps = (state.divisionRecruits || []).filter((r) => r.stage === 'APPLIED').slice(0, 2);
    for (const app of pendingApps) {
      const div = divMap.get(app.divisionId);
      if (!div) continue;
      const head = ensureDivisionHead(state, div);
      if (!head || head.status === 'offline') continue;
      const ev = evaluateDivisionCandidate(state, app.id, head.id);
      if (ev?.ok) {
        actions.push({ type: 'DIV_CANDIDATE_EVALUATED', by: head.id, target: app.memberId, decision: ev.stage });
        pipelineOps++;
      }
    }

    const activeTrainees = (state.divisionRecruits || [])
      .filter((r) => r.stage === 'PHASE_1' || r.stage === 'PHASE_2' || r.stage === 'PHASE_3' || r.stage === 'PHASE_4')
      .slice(0, 3);
    for (const tr of activeTrainees) {
      const div = divMap.get(tr.divisionId);
      if (!div) continue;
      const head = ensureDivisionHead(state, div);
      if (!head || head.status === 'offline') continue;
      const adv = advanceDivisionTraineePhase(state, tr.id, head.id, 34);
      if (adv?.ok) {
        actions.push({ type: 'DIV_PHASE_ADVANCE', by: head.id, target: tr.memberId, stage: adv.stage });
      }
    }
  }

  // 3. Sub-Jabatan Staff Effects
  const activeStaff = state.members.filter((m) => m.subRole && m.status !== 'offline');
  const hasDev = activeStaff.some((m) => m.subRole === 'Head Developer' || m.subRole === 'Developer');
  const hasAdmin = activeStaff.some((m) => m.subRole === 'Admin' || m.subRole === 'Co-Owner');
  const hasHelper = activeStaff.some((m) => m.subRole === 'Helper' || m.subRole === 'Mod');

  if (hasDev) {
    const devMember = activeStaff.find((m) => m.subRole === 'Head Developer' || m.subRole === 'Developer');
    const profMult = 0.8 + ((devMember.personality?.professionalism ?? 65) / 100) * 0.4;
    const boost = (devMember.subRole === 'Head Developer' ? 4.5 : 2.8) * profMult;
    const prevHealth = state.tech.systemHealth;
    state.tech.systemHealth = clamp(state.tech.systemHealth + boost, 40, 100);
    state.tech.mapEfficiency = clamp(state.tech.mapEfficiency + boost * 0.85, 65, 135);

    if (prevHealth < 85 && state.tech.systemHealth >= 85) {
      state.tech.patchCounter += 1;
      state.tech.lastPatchNote = `Patch v1.${state.tech.patchCounter} oleh ${devMember.icName} (${devMember.subRole}): Perbaikan jalur patroli & optimasi map 2D (+Efisiensi).`;
      appendChannelMessage(state, 'ruang-komando', {
        authorId: devMember.id,
        authorName: devMember.icName,
        authorRole: devMember.subRole,
        authorColor: '#38BDF8',
        text: `[DEV UPDATE] ${state.tech.lastPatchNote}`,
      });
      actions.push({ type: 'DEV_PATCH', by: devMember.id });
    }
  } else {
    state.tech.systemHealth = clamp(state.tech.systemHealth - 1.1, 45, 100);
    state.tech.mapEfficiency = clamp(state.tech.mapEfficiency - 0.6, 70, 135);
  }

  if (hasAdmin) {
    state.members.forEach((m) => {
      m.betahScore = clamp(m.betahScore + 0.5, 0, 100);
    });
  }

  if (hasHelper) {
    const helper = activeStaff.find((m) => m.subRole === 'Helper' || m.subRole === 'Mod');
    const needy = state.members.find((m) => m.needsWelcome);
    if (needy && helper) {
      const needyRank = rankMap.get(needy.rankId) || getRankById(state, needy.rankId);
      needy.needsWelcome = false;
      needy.betahScore = clamp(needy.betahScore + 7, 0, 100);
      if (!circadian.isNight || needy.nightOwl) needy.status = 'online-2d';
      const guideTip =
        (needyRank?.order || 1) < 2
          ? `Halo @${needy.icName}, selamat datang! Ikuti pendidikan Taruna di Akademi Kepolisian dulu agar bisa naik Bripda & mendaftar ke #registrasi divisi resmi.`
          : `Halo @${needy.icName}, selamat datang! Cek undangan link sub-server divisi yang terbuka dan isi format pendaftaran di #registrasi untuk mulai Phase I–IV.`;
      appendChannelMessage(state, 'lobi-rekrutmen', {
        authorId: helper.id,
        authorName: helper.icName,
        authorRole: helper.subRole,
        authorColor: '#10B981',
        text: guideTip,
      });
      actions.push({ type: 'HELPER_ONBOARD', by: helper.id, target: needy.id });
    }
  }

  const staffMod = activeStaff.find(
    (m) => m.subRole === 'Mod' || m.subRole === 'Admin' || m.subRole === 'Co-Owner'
  );
  if (staffMod) {
    for (const chId of ['laporan-patroli', 'lobi-rekrutmen', 'obrolan-ooc']) {
      const chMsgs = state.messages?.[chId] || [];
      const violMsg = [...chMsgs].reverse().find(
        (m) => m.ruleViolation && !m.moderated && m.authorId && m.authorId !== staffMod.id
      );
      if (violMsg) {
        violMsg.moderated = true;
        if (!Array.isArray(violMsg.reactions)) violMsg.reactions = [];
        const exWarn = violMsg.reactions.find((r) => r.emoji === '⚠️');
        if (exWarn) exWarn.count += 1;
        else violMsg.reactions.push({ emoji: '⚠️', count: 1 });

        const violator = state.members.find((m) => m.id === violMsg.authorId);
        if (violator && violator.personality) {
          violator.personality.professionalism = clamp((violator.personality.professionalism ?? 50) + 1.5, 1, 99);
        }
        state.reputation += 2;
        appendChannelMessage(state, chId, {
          authorId: staffMod.id,
          authorName: staffMod.icName,
          authorRole: staffMod.subRole,
          authorColor: '#10B981',
          isModerationReply: true,
          replyTo: {
            id: violMsg.id,
            authorName: violMsg.authorName,
            text: violMsg.text.slice(0, 72) + (violMsg.text.length > 72 ? '…' : ''),
          },
          text: `[${staffMod.subRole.toUpperCase()} MODERASI] Mohon tertib @${violMsg.authorName}, ikuti etika & aturan kanal ini agar diskusi tetap nyaman.`,
        });
        actions.push({ type: 'STAFF_MODERATE', by: staffMod.id, target: violMsg.authorId, channelId: chId });
        break;
      }
    }
  }

  return actions;
}
