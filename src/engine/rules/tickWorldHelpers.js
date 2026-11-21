import {
  DISTRICTS,
  INCIDENT_TYPES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants.js';
import { getCircadianProfile } from '../aiBrain.js';
import {
  clamp,
  getDivisionById,
  getRankById,
} from './stateFactory.js';
import { appendChannelMessage } from './stateHydrator.js';

export function spawnIncident(state, rng1 = Math.random(), rng2 = Math.random()) {
  if (state.incidents.length >= 6) return null;
  const template = INCIDENT_TYPES[Math.floor(rng1 * INCIDENT_TYPES.length) % INCIDENT_TYPES.length];
  const district = DISTRICTS[1 + (Math.floor(rng2 * (DISTRICTS.length - 1)) % (DISTRICTS.length - 1))];
  const x = clamp(district.x + district.w * (0.25 + rng1 * 0.5), 90, WORLD_WIDTH - 90);
  const y = clamp(district.y + district.h * (0.25 + rng2 * 0.5), 90, WORLD_HEIGHT - 90);

  const incident = {
    id: `inc-${++state.nextId}`,
    type: template.type,
    label: template.label,
    x,
    y,
    rewardXp: template.rewardXp,
    rewardRep: template.rewardRep,
    color: template.color,
    progress: 0,
    duration: template.duration,
    assignedOfficerId: null,
    districtName: district.name,
  };
  state.incidents.push(incident);
  return incident;
}

export function resolveIncident(state, incidentId, officerId) {
  const idx = state.incidents.findIndex((i) => i.id === incidentId);
  if (idx === -1) return null;
  const incident = state.incidents[idx];
  state.incidents.splice(idx, 1);

  if (incident.assignedOfficerId && incident.assignedOfficerId !== officerId) {
    const prevAssigned = state.members.find((m) => m.id === incident.assignedOfficerId);
    if (prevAssigned && prevAssigned.aiState === 'RESPONDING') {
      prevAssigned.aiState = 'PATROL';
    }
  }

  state.stats.incidentsResolved += 1;
  state.reputation += incident.rewardRep;

  if (officerId === 'owner') {
    state.player.speechBubble = 'Kasus Tuntas!';
    state.player.speechTimer = 2.4;
    state.members.forEach((m) => {
      m.betahScore = clamp(m.betahScore + 1.5, 0, 100);
    });
    appendChannelMessage(state, 'laporan-patroli', {
      authorId: 'owner',
      authorName: `${state.ownerName} (Anda)`,
      authorRole: 'Kapolda (Owner)',
      authorColor: '#D4A024',
      isOwner: true,
      text: `Penanganan ${incident.label} di ${incident.districtName} selesai. +${incident.rewardRep} Reputasi Kota.`,
    });
  } else {
    const officer = state.members.find((m) => m.id === officerId);
    if (officer) {
      officer.xp += incident.rewardXp;
      officer.betahScore = clamp(officer.betahScore + 3, 0, 100);
      officer.aiState = 'PATROL';
      officer.speechBubble = '86 Selesai!';
      officer.speechTimer = 2.4;

      const rank = getRankById(state, officer.rankId);
      const div = getDivisionById(state, officer.divisionId);
      appendChannelMessage(state, 'laporan-patroli', {
        authorId: officer.id,
        authorName: officer.icName,
        authorRole: div ? `${rank.name} · ${div.name}` : rank.name,
        authorColor: rank.color,
        isOwner: false,
        text: `10-4! Penindakan "${incident.label}" di ${incident.districtName} tuntas (+${incident.rewardXp} XP).`,
      });
    }
  }
  return incident;
}

export function syncCircadianStatus(state) {
  const circadian = getCircadianProfile(state.simSeconds);
  const changed = [];

  for (const m of state.members) {
    if (circadian.isNight) {
      if (!m.nightOwl && m.status !== 'offline' && !m.billetId) {
        m.status = 'offline';
        changed.push({ member: m, action: 'sleep' });
      }
    } else {
      if (m.status === 'offline' && m.betahScore >= 30) {
        m.status = m.needsWelcome ? 'online-chat' : 'online-2d';
        changed.push({ member: m, action: 'wake' });
      }
    }
  }

  return { circadian, changed };
}
