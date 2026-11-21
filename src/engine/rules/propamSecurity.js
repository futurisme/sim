import {
  ASSIGNMENT_TYPES,
  MABES_ZONES,
  PERMISSION_DEFINITIONS,
  buildEmptyPermissions,
} from '../constants.js';
import {
  clamp,
  getBilletById,
  getDivisionById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';

export function inferAssignmentTypeFromDivision(divisionLike) {
  const txt = `${divisionLike?.id || ''} ${divisionLike?.name || ''} ${divisionLike?.duty || ''}`.toLowerCase();
  if (/propam|etik|provos|paminal|rutan/.test(txt)) return 'INTERNAL_SECURITY';
  if (/lantas|lalu lintas|tilang/.test(txt)) return 'TRAFFIC';
  if (/polair|maritim|dermaga|airud|baharkam/.test(txt)) return 'MARITIME';
  if (/brimob|gegana|densus|taktis|anti/.test(txt)) return 'TACTICAL';
  if (/reskrim|narkoba|inafis|krimum|krimsus|siber|tipikor|penyidik/.test(txt)) return 'INVESTIGATION';
  if (/intel|sandi/.test(txt)) return 'INTEL';
  if (/humas|tik|media|komunikasi/.test(txt)) return 'PUBLIC_RELATIONS';
  if (/binmas|bhabin|k9|satwa|masyarakat/.test(txt)) return 'COMMUNITY';
  if (/dokkes|medis|kesehatan/.test(txt)) return 'MEDICAL';
  if (/lemdiklat|diklat|akademi|akpol|spn/.test(txt)) return 'EDUCATION';
  return 'GENERAL_PATROL';
}

export function normalizeDutyProfile(profilePatch, divisionLike = null) {
  const inferredType =
    profilePatch?.assignmentType && ASSIGNMENT_TYPES[profilePatch.assignmentType]
      ? profilePatch.assignmentType
      : inferAssignmentTypeFromDivision(divisionLike);
  const preset = ASSIGNMENT_TYPES[inferredType] || ASSIGNMENT_TYPES.GENERAL_PATROL;
  return {
    assignmentType: preset.id,
    primaryZones:
      Array.isArray(profilePatch?.primaryZones) && profilePatch.primaryZones.length > 0
        ? [...profilePatch.primaryZones]
        : [...preset.defaultZones],
    mabesPatrolBias: clamp(
      typeof profilePatch?.mabesPatrolBias === 'number' ? profilePatch.mabesPatrolBias : preset.defaultMabesBias,
      0,
      1
    ),
    gateGuardBias: clamp(
      typeof profilePatch?.gateGuardBias === 'number' ? profilePatch.gateGuardBias : preset.defaultGateBias,
      0,
      1
    ),
    preferredIncidents:
      Array.isArray(profilePatch?.preferredIncidents) && profilePatch.preferredIncidents.length > 0
        ? [...profilePatch.preferredIncidents]
        : [...preset.defaultIncidents],
    patrolRadius: clamp(Number(profilePatch?.patrolRadius) || preset.defaultRadius, 140, 700),
  };
}

export function getDivisionDutyProfile(division) {
  if (!division) return normalizeDutyProfile(null, null);
  return normalizeDutyProfile(division.dutyProfile, division);
}

export function setDivisionGateClearance(state, divisionId, allowed) {
  const division = getDivisionById(state, divisionId);
  if (!division) return false;
  division.gateClearance = Boolean(allowed);
  state.lastOwnerActionAt = state.simSeconds;
  return true;
}

export function setDivisionQuota(state, divisionId, quota, actorLabel = 'Kapolda') {
  const division = getDivisionById(state, divisionId);
  if (!division) return false;
  const nextQuota = clamp(Math.round(Number(quota) || 6), 1, 50);
  if (division.quota === nextQuota) return false;
  division.quota = nextQuota;
  state.lastOwnerActionAt = state.simSeconds;
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Manajemen Kuota Satuan',
    authorRole: division.callsign,
    authorColor: division.color || '#38BDF8',
    isSystem: true,
    text: `Kuota personel divisi "${division.name}" disesuaikan menjadi ${nextQuota} anggota oleh ${actorLabel}.`,
  });
  return true;
}

export function setDivisionDutyProfile(state, divisionId, patch = {}, actorLabel = 'Kapolda') {
  const division = getDivisionById(state, divisionId);
  if (!division) return false;
  const resetPreset =
    patch.assignmentType && patch.assignmentType !== division.dutyProfile?.assignmentType && ASSIGNMENT_TYPES[patch.assignmentType]
      ? ASSIGNMENT_TYPES[patch.assignmentType]
      : null;
  const baseProfile = resetPreset
    ? {
        assignmentType: resetPreset.id,
        primaryZones: patch.primaryZones || resetPreset.defaultZones,
        mabesPatrolBias: patch.mabesPatrolBias ?? resetPreset.defaultMabesBias,
        gateGuardBias: patch.gateGuardBias ?? resetPreset.defaultGateBias,
        preferredIncidents: patch.preferredIncidents || resetPreset.defaultIncidents,
        patrolRadius: patch.patrolRadius ?? resetPreset.defaultRadius,
      }
    : { ...(division.dutyProfile || {}), ...patch };
  division.dutyProfile = normalizeDutyProfile(baseProfile, division);
  if (typeof patch.duty === 'string' && patch.duty.trim()) {
    division.duty = patch.duty.trim().slice(0, 140);
  } else if (resetPreset) {
    division.duty = resetPreset.label;
  }
  if (division.dutyProfile.assignmentType === 'INTERNAL_SECURITY') {
    division.gateClearance = true;
  }
  state.lastOwnerActionAt = state.simSeconds;
  const activePreset = ASSIGNMENT_TYPES[division.dutyProfile.assignmentType];
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Penugasan & SOP Divisi',
    authorRole: division.callsign,
    authorColor: division.color || '#10B981',
    isSystem: true,
    text: `Tugas & zona patroli divisi "${division.name}" diatur ke mode ${activePreset?.label || division.dutyProfile.assignmentType} (Zona: ${division.dutyProfile.primaryZones.join(', ')}) oleh ${actorLabel}.`,
  });
  return true;
}

export function delegateAuthorityToBillet(state, permKey, billetIdOrNull) {
  const validPerm = PERMISSION_DEFINITIONS.some((p) => p.key === permKey);
  if (!validPerm) return false;
  if (!state.authorityDelegations) state.authorityDelegations = {};

  if (!billetIdOrNull) {
    delete state.authorityDelegations[permKey];
    state.lastOwnerActionAt = state.simSeconds;
    return true;
  }

  const billet = getBilletById(state, billetIdOrNull);
  if (!billet) return false;
  state.authorityDelegations[permKey] = billet.id;
  if (!billet.permissions) billet.permissions = buildEmptyPermissions();
  billet.permissions[permKey] = true;
  state.lastOwnerActionAt = state.simSeconds;

  const permDef = PERMISSION_DEFINITIONS.find((p) => p.key === permKey);
  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Delegasi Otoritas Mabes',
    authorRole: 'Pengalihan Jabatan',
    authorColor: '#FACC15',
    isSystem: true,
    text: `Wewenang "${permDef?.label || permKey}" resmi dialihkan khusus ke Jabatan "${billet.name}" (otoritas Role Pangkat/Divisi lain dinonaktifkan sementara).`,
  });
  return true;
}

export function togglePropamGate(state, gateOpen, actorLabel = 'Kapolda') {
  if (!state.mabesSecurity) {
    state.mabesSecurity = { gateOpen: true, gateUpdatedBy: actorLabel, lastAuditAt: state.simSeconds };
  }
  const nextOpen = typeof gateOpen === 'boolean' ? gateOpen : !state.mabesSecurity.gateOpen;
  state.mabesSecurity.gateOpen = nextOpen;
  state.mabesSecurity.gateUpdatedBy = actorLabel;
  state.mabesSecurity.lastAuditAt = state.simSeconds;
  state.lastOwnerActionAt = state.simSeconds;

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Gerbang Penjaga Propam',
    authorRole: nextOpen ? 'Portal Dibuka' : 'Portal Dikunci',
    authorColor: nextOpen ? '#10B981' : '#EF4444',
    isSystem: true,
    text: `Gerbang Penjaga Propam Mabes kini ${nextOpen ? 'DIBUKA untuk akses satuan' : 'DIKUNCI KETAT (hanya divisi berizin Propam yang bisa masuk kompleks Mabes)'} oleh ${actorLabel}.`,
  });
  return nextOpen;
}

export function arrestMemberToPrison(
  state,
  memberId,
  durationSec = 22,
  reason = 'Pelanggaran etik & disiplin Propam',
  actorLabel = 'Propam Mabes'
) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) return false;

  const usedCells = new Set(
    state.members
      .filter((m) => m.id !== memberId && (m.detainedRemaining || 0) > 0 && typeof m.prisonCell === 'number')
      .map((m) => m.prisonCell)
  );
  let cellIdx = 0;
  for (let i = 0; i < MABES_ZONES.prison.cells.length; i++) {
    if (!usedCells.has(i)) {
      cellIdx = i;
      break;
    }
  }
  const cell = MABES_ZONES.prison.cells[cellIdx] || MABES_ZONES.prison.cells[0];

  member.detainedRemaining = clamp(Number(durationSec) || 22, 6, 90);
  member.detentionReason = reason;
  member.prisonCell = cellIdx;
  member.aiState = 'DETAINED';
  member.status = 'online-2d';
  member.x = cell.x;
  member.y = cell.y;
  member.targetX = cell.x;
  member.targetY = cell.y;
  member.vx = 0;
  member.vy = 0;
  member.betahScore = clamp(member.betahScore - 8, 0, 100);
  member.violationCount = (member.violationCount || 0) + 1;
  member.speechBubble = `Ditahan Sel ${cellIdx + 1}!`;
  member.speechTimer = 3.2;

  state.incidents.forEach((inc) => {
    if (inc.assignedOfficerId === member.id) inc.assignedOfficerId = null;
  });
  state.lastOwnerActionAt = state.simSeconds;

  appendChannelMessage(state, 'pengumuman-mabes', {
    authorId: 'system',
    authorName: 'Kantor Propam & Rutan Mabes',
    authorRole: `Sel #${cellIdx + 1}`,
    authorColor: '#EF4444',
    isSystem: true,
    text: `${member.icName} resmi diamankan di Penjara Mabes (Sel #${cellIdx + 1}) selama ${Math.round(member.detainedRemaining)} detik simulasi oleh ${actorLabel}. Alasan: ${reason}.`,
  });
  return true;
}

export function releaseMemberFromPrison(state, memberId, actorLabel = 'Propam Mabes') {
  const member = state.members.find((m) => m.id === memberId);
  if (
    !member ||
    ((member.detainedRemaining || 0) <= 0 && member.aiState !== 'DETAINED' && member.prisonCell === null)
  ) {
    return false;
  }

  member.detainedRemaining = 0;
  member.detentionReason = '';
  member.prisonCell = null;
  member.aiState = 'PATROL';
  member.x = MABES_ZONES.southGate.x;
  member.y = MABES_ZONES.southGate.y + 28;
  member.targetX = 480;
  member.targetY = 355;
  member.speechBubble = 'Bebas Rutan!';
  member.speechTimer = 2.6;
  if (member.personality) {
    member.personality.professionalism = clamp((member.personality.professionalism ?? 50) + 5, 20, 98);
  }
  state.lastOwnerActionAt = state.simSeconds;

  appendChannelMessage(state, 'ruang-komando', {
    authorId: 'system',
    authorName: 'Kantor Propam & Rutan Mabes',
    authorRole: 'Pembebasan',
    authorColor: '#10B981',
    isSystem: true,
    text: `${member.icName} selesai menjalani pembinaan & dibebaskan dari Penjara Mabes oleh ${actorLabel}.`,
  });
  return true;
}
