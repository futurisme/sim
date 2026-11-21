// Senior-to-Junior AI Persona Command & Patrol Directive Dispatch Engine
import { DISTRICTS } from '../constants.js';
import { canActorManageTarget, getMemberHierarchy } from './hierarchyAi.js';

export const COMMAND_TYPES = {
  PATROLI_SEKTOR: { id: 'PATROLI_SEKTOR', label: 'Patroli Sektor Wilayah', description: 'Melaksanakan patroli rutin & penjagaan ketat di sektor penugasan.' },
  PENGAMANAN_TKP: { id: 'PENGAMANAN_TKP', label: 'Pengamanan TKP & Lalulintas', description: 'Mengamankan lokasi kejadian perkara, rekayasa arus, dan sterilisasi.' },
  SIAGA_MAP: { id: 'SIAGA_MAP', label: 'Siaga Pleton Markas', description: 'Standby siaga 1 di posko utama untuk mengantisipasi gangguan kamtibmas.' },
  LATIHAN_BARIS: { id: 'LATIHAN_BARIS', label: 'Latihan Baris-Berbaris Akpol', description: 'Mengikuti drill baris-berbaris dan pembinaan fisik taruna di Kampus Akpol.' },
};

export function issueSeniorCommand(state, actorId, targetMemberId, commandTypeId, options = {}) {
  const actor = actorId === 'owner' ? { icName: 'Kapolda (Owner)', rankId: 'rank-jenderal', isOwner: true } : state.members.find((m) => m.id === actorId);
  const target = state.members.find((m) => m.id === targetMemberId);

  if (!actor || !target) {
    return { success: false, error: 'Aktor atau personel target tidak ditemukan.' };
  }

  if (actorId !== 'owner') {
    const actorH = getMemberHierarchy(actor, state);
    const targetH = getMemberHierarchy(target, state);
    if (actorH < targetH) {
      return { success: false, error: 'Penolakan wewenang: Aktor tidak memiliki hierarki senior yang cukup atas target.' };
    }
  }

  const cmdDef = COMMAND_TYPES[commandTypeId] || COMMAND_TYPES.PATROLI_SEKTOR;
  const districtId = options.districtId || target.targetDistrictId || 'mabes';
  const districtObj = DISTRICTS.find((d) => d.id === districtId) || DISTRICTS[0];

  target.currentTask = commandTypeId;
  target.targetDistrictId = districtId;
  target.directiveStatus = 'ACTIVE';
  target.directiveIssuedBy = actorId;
  target.directiveUpdatedAt = state.simSeconds;

  if (!Array.isArray(target.directiveLog)) {
    target.directiveLog = [];
  }
  target.directiveLog.unshift({
    timestamp: state.simSeconds,
    commandId: commandTypeId,
    commandLabel: cmdDef.label,
    districtName: districtObj.name,
    issuedBy: actor.icName,
    status: 'ACTIVE',
  });
  if (target.directiveLog.length > 15) target.directiveLog.pop();

  const actorRank = state.ranks.find((r) => r.id === actor.rankId)?.name || 'Perwira';
  const targetRank = state.ranks.find((r) => r.id === target.rankId)?.name || 'Bintara';

  // Append order message in main command channel
  if (!state.messages) state.messages = {};
  if (!state.messages['obrolan-umum']) state.messages['obrolan-umum'] = [];

  state.messages['obrolan-umum'].push({
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: state.simSeconds,
    authorId: actorId,
    authorName: actor.icName,
    authorRole: actorRank,
    authorColor: actorId === 'owner' ? '#D4A024' : '#3B82F6',
    text: `[PERINTAH TAKTIS] ${actor.icName} (${actorRank}) memerintahkan ${target.icName} (${targetRank}): Segera laksanakan ${cmdDef.label} di Sektor ${districtObj.name}!`,
  });

  // Junior acknowledgment
  state.messages['obrolan-umum'].push({
    id: `ack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: state.simSeconds + 2,
    authorId: target.id,
    authorName: target.icName,
    authorRole: targetRank,
    authorColor: '#10B981',
    text: `10-4 Komandan! Siap laksanakan ${cmdDef.label} di ${districtObj.name}. Laporan berkala segera disusulkan. 🫡`,
  });

  return { success: true, command: cmdDef, target };
}

export function processAutonomousSeniorCommands(state) {
  if (!state.members || state.members.length < 3) return;

  // Find senior AI personnel with free capacity
  const seniors = state.members.filter((m) => {
    if (m.status === 'offline' || (m.detainedRemaining || 0) > 0) return false;
    const h = getMemberHierarchy(m, state);
    return h >= 45; // Perwira / KADIV / WAKADIV / Kanit level
  });

  if (seniors.length === 0) return;

  const senior = seniors[Math.floor(Math.abs(state.simSeconds) % seniors.length)];
  const juniors = state.members.filter((m) => {
    if (m.id === senior.id || m.status === 'offline') return false;
    const isJuniorHier = getMemberHierarchy(m, state) < getMemberHierarchy(senior, state);
    const isIdleOrRoutine = !m.directiveStatus || m.directiveStatus === 'COMPLETED' || Math.random() < 0.2;
    return isJuniorHier && isIdleOrRoutine;
  });

  if (juniors.length === 0) return;

  const junior = juniors[Math.floor(Math.abs(state.simSeconds * 3) % juniors.length)];
  const cmdKeys = Object.keys(COMMAND_TYPES);
  const chosenCmd = cmdKeys[Math.floor(Math.abs(state.simSeconds * 7) % cmdKeys.length)];
  const district = DISTRICTS[Math.floor(Math.abs(state.simSeconds * 11) % DISTRICTS.length)];

  issueSeniorCommand(state, senior.id, junior.id, chosenCmd, { districtId: district.id });
}
