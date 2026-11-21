// 100% Custom-Engine Purna-Tugas (Retirement & Purnawirawan) System
// Allows members to retire after 2-7 days in server, freeing operational commands while retaining server administrative roles.

import { clamp, formatSimClock, getRankById } from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';

export function checkMemberPurnaTugasEligibility(member, state, opts = {}) {
  const reasons = [];
  if (!member) {
    return { eligible: false, reasons: ['Data personel tidak ditemukan'], daysInServer: 0 };
  }
  if (member.id === 'owner') {
    return { eligible: false, reasons: ['Kapolda (Owner) adalah pemegang mandat pendiri server'], daysInServer: 0 };
  }
  if (member.isRetired) {
    return { eligible: false, reasons: ['Personel sudah berstatus Purnawirawan'], daysInServer: 0 };
  }
  if ((member.detainedRemaining || 0) > 0) {
    return { eligible: false, reasons: ['Personel sedang menjalani masa tahanan Rutan Propam'], daysInServer: 0 };
  }

  const simSec = state?.simSeconds || 0;
  const joinedSec = member.joinedAtSec || 0;
  const daysInServer = Math.max(0, (simSec - joinedSec) / 86400);

  const minDays = opts.forceByKapolda ? 0.8 : 2.0;
  if (daysInServer < minDays) {
    reasons.push(`Masa dinas baru ${daysInServer.toFixed(1)} hari (minimal ${minDays} hari berada di server)`);
  }

  const rank = getRankById(state, member.rankId);
  const rankOrder = rank?.order || 1;
  if (rankOrder < 2 && !opts.forceByKapolda) {
    reasons.push('Personel masih berstatus Taruna baru dan belum menyelesaikan masa dinas');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    daysInServer,
  };
}

export function retireMemberPurnaTugas(state, memberId, actorName = 'Kapolda Izumiya', reason = 'Pengabdian paripurna') {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, reason: 'Personel tidak ditemukan' };
  if (member.isRetired) return { ok: false, reason: 'Personel sudah purnawirawan' };

  const simSec = state?.simSeconds || 0;
  const joinedSec = member.joinedAtSec || 0;
  const daysInServer = Math.max(0.5, (simSec - joinedSec) / 86400);

  const rank = getRankById(state, member.rankId);
  const oldRankName = rank?.name || 'Perwira';
  const oldRankOrder = rank?.order || 3;

  // 1. Relieve from operational division & units
  if (member.divisionId) {
    const div = state.divisions.find((d) => d.id === member.divisionId);
    if (div) {
      if (div.headId === member.id) div.headId = null;
      if (div.viceHeadId === member.id) div.viceHeadId = null;
      if (Array.isArray(div.units)) {
        div.units.forEach((u) => {
          (u.subUnits || []).forEach((su) => {
            if (Array.isArray(su.assignedMemberIds)) {
              su.assignedMemberIds = su.assignedMemberIds.filter((id) => id !== member.id);
            }
          });
        });
      }
    }
    member.divisionId = null;
    member.divisionUnitId = null;
    member.divisionSubUnitId = null;
    member.divisionUnitRole = null;
  }

  // 2. Relieve from operational command billet
  if (member.billetId) {
    const bil = state.billets.find((b) => b.id === member.billetId);
    if (bil && bil.holderId === member.id) {
      bil.holderId = null;
    }
    member.billetId = null;
  }

  // 3. Clear active academy enrollment
  if (member.academyStatus === 'ENROLLED') {
    member.academyStatus = 'RETIRED';
  } else {
    member.academyStatus = 'RETIRED';
  }

  // 4. Mark Purnawirawan status (preserves administrative subRole: Developer, Admin, Co-Owner, Mod, Helper!)
  member.isRetired = true;
  member.retiredAtSec = simSec;
  member.retiredRankId = member.rankId;
  member.retiredRankOrder = oldRankOrder;
  member.retiredRankName = oldRankName;

  // 5. Award Purna-Tugas Accolades
  if (!Array.isArray(member.awards)) member.awards = [];
  if (!member.awards.includes('med-purna')) member.awards.push('med-purna');
  if (!member.awards.includes('srt-purna')) member.awards.push('srt-purna');
  if (!member.awards.includes('brv-kehormatan')) member.awards.push('brv-kehormatan');

  // 6. 2D & Discord status updates
  member.aiState = 'PATROL';
  member.status = 'online-2d';
  member.betahScore = clamp(member.betahScore + 15, 0, 100);
  member.speechBubble = 'Purna-Tugas 🫡';
  member.speechTimer = 3.6;

  // 7. Channel announcements
  const daysText = daysInServer.toFixed(1);
  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Wisuda Purna-Bhakti',
    authorRole: 'Purnawirawan',
    authorColor: '#E2E8F0',
    isSystem: true,
    text: `🎖️ [UPACARA WISUDA PURNA-BHAKTI] Selamat kepada ${member.icName} (${oldRankName}) yang resmi purna-tugas setelah mengabdi ${daysText} hari di Kepolisian Republik Izumiya! Dianugerahi Bintang Bhayangkara Purnawirawan & Sertifikat Purna Bhakti. Posisi operasional telah dikosongkan agar estafet kepemimpinan generasi muda terus bertumbuh.`,
  });

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'SKep Purnawirawan',
    authorRole: 'Administrasi Mabes',
    authorColor: '#FACC15',
    isSystem: true,
    text: `SKep Purna-Tugas disahkan untuk ${member.icName} oleh ${actorName}. Catatan: sub-jabatan administrasi server (seperti Developer/Admin) tetap dapat diemban sebagai dewan penasihat/pengembang.`,
  });

  state.reputation += 12;
  return { ok: true, member, daysInServer };
}

export function runAutonomousPurnaTugas(state, actions = []) {
  if (!Array.isArray(state.members) || state.members.length <= 4) return actions;
  const simSec = state.simSeconds || 0;

  for (const m of state.members) {
    if (m.id === 'owner' || m.isRetired || (m.detainedRemaining || 0) > 0) continue;
    const daysInServer = Math.max(0, (simSec - (m.joinedAtSec || 0)) / 86400);

    // Eligible between 2.0 and 7.0 days
    if (daysInServer >= 2.0) {
      const rank = getRankById(state, m.rankId);
      const isSenior = (rank?.order || 1) >= 4 || (m.xp || 0) >= 350;
      const mustRetire = daysInServer >= 6.8;
      const voluntaryChance = isSenior ? 0.28 : 0.14;

      if (mustRetire || Math.random() < voluntaryChance) {
        const res = retireMemberPurnaTugas(state, m.id, 'Komando Mabes (Otomatis Masa Dinas)', 'Masa dinas 2–7 hari terpenuhi');
        if (res.ok) {
          actions.push({ type: 'AUTO_PURNA_TUGAS', target: m.id, days: daysInServer });
          break; // One retirement per autonomy cycle is sufficient to avoid mass sudden vacancies
        }
      }
    }
  }

  return actions;
}
