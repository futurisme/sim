// Dynamic Entity, Incident, Speech, Atmosphere & Minimap Painter
import { DISTRICTS, MABES_ZONES, ROAD_X, ROAD_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../constants.js';
import { clamp, getAkpolCohortStatus, getDivisionById, getRankById } from '../rules.js';
import { drawRoundedRectPath } from './staticLayers.js';

export function drawDynamicOverlayMarkings(renderer, ctx, state) {
  const mz = MABES_ZONES;
  if (state.directive === 'APEL_MABES') {
    const cy = mz.courtyard;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(cy.x + 6, cy.y + 6, cy.w - 12, cy.h - 12);
    ctx.setLineDash([]);
  }

  const gateOpen = state.mabesSecurity?.gateOpen !== false;
  const gateColor = gateOpen ? '#10B981' : '#EF4444';
  const pulse = 0.65 + 0.35 * Math.sin(renderer.time * 5);

  ctx.save();
  ctx.strokeStyle = gateColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(mz.eastGate.x, mz.eastGate.y - 16);
  if (gateOpen) ctx.lineTo(mz.eastGate.x + 14, mz.eastGate.y - 24);
  else ctx.lineTo(mz.eastGate.x, mz.eastGate.y + 16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mz.southGate.x - 18, mz.southGate.y);
  if (gateOpen) ctx.lineTo(mz.southGate.x - 26, mz.southGate.y - 14);
  else ctx.lineTo(mz.southGate.x + 18, mz.southGate.y);
  ctx.stroke();

  ctx.globalAlpha = pulse;
  ctx.fillStyle = gateColor;
  ctx.beginPath();
  ctx.arc(mz.eastGate.x - 5, mz.eastGate.y - 22, 3.5, 0, Math.PI * 2);
  ctx.arc(mz.southGate.x + 31, mz.southGate.y - 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const gateLabel = gateOpen ? 'GERBANG PROPAM: BUKA' : 'GERBANG PROPAM: KUNCI';
  const glw = renderer.measureWidth(ctx, '700 8px system-ui, -apple-system, sans-serif', gateLabel) + 10;
  ctx.fillStyle = 'rgba(17, 18, 20, 0.9)';
  drawRoundedRectPath(ctx, mz.southGate.x - glw / 2, mz.southGate.y + 12, glw, 14, 4);
  ctx.fill();
  ctx.strokeStyle = gateColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = gateOpen ? '#6EE7B7' : '#FCA5A5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gateLabel, mz.southGate.x, mz.southGate.y + 19);

  const detainees = state.members.filter((m) => (m.detainedRemaining || 0) > 0).length;
  const rutLabel = detainees > 0 ? `${detainees} TAHANAN AKTIF` : 'RUTAN KOSONG';
  ctx.fillStyle = detainees > 0 ? 'rgba(239, 68, 68, 0.28)' : 'rgba(15, 23, 42, 0.78)';
  drawRoundedRectPath(ctx, mz.prison.x + 14, mz.prison.y + mz.prison.h - 22, mz.prison.w - 28, 15, 4);
  ctx.fill();
  ctx.fillStyle = detainees > 0 ? '#FCA5A5' : '#94A3B8';
  ctx.font = '700 7.5px system-ui, -apple-system, sans-serif';
  ctx.fillText(rutLabel, mz.prison.x + mz.prison.w / 2, mz.prison.y + mz.prison.h - 14.5);

  const akad = DISTRICTS.find((d) => d.id === 'akademi');
  if (akad) {
    const cohort = getAkpolCohortStatus(state);
    let cohortText = `AKPOL GATE #REGISTRASI · ${cohort.enrolledCadets.length}/${cohort.quota}`;
    let cohortCol = '#38BDF8';
    if (cohort.isDrilling) {
      cohortText = `PBB SERENTAK (${cohort.enrolledCadets.length}/${cohort.quota}) · ${cohort.trainerName}`;
      cohortCol = '#22C55E';
    } else if (cohort.waitingForTrainer) {
      cohortText = `KUOTA PENUH (${cohort.enrolledCadets.length}/${cohort.quota}) · BUTUH PELATIH`;
      cohortCol = '#F59E0B';
    } else if (cohort.waitingForQuota) {
      cohortText = `TUNGGU KUOTA PBB (${cohort.enrolledCadets.length}/${cohort.quota})`;
      cohortCol = '#7DD3FC';
    }
    const cw = Math.min(akad.w - 16, renderer.measureWidth(ctx, '700 8px system-ui, -apple-system, sans-serif', cohortText) + 14);
    const cx = akad.x + akad.w * 0.5;
    const cy = akad.y + akad.h + 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    drawRoundedRectPath(ctx, cx - cw * 0.5, cy - 7, cw, 15, 4);
    ctx.fill();
    ctx.strokeStyle = cohortCol;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cohortCol;
    ctx.font = '700 8px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cohortText, cx, cy + 0.5);
  }
  ctx.restore();

  const phase = Math.floor(renderer.time * 0.45) % 2;
  const devUpgraded = (state.tech?.mapEfficiency || 100) >= 105;
  for (const rx of ROAD_X) {
    for (const ry of ROAD_Y) {
      ctx.fillStyle = '#11141B';
      ctx.beginPath();
      ctx.arc(rx - 27, ry - 27, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase === 0 ? '#23A55A' : '#EF4444';
      ctx.beginPath();
      ctx.arc(rx - 27, ry - 27, 3, 0, Math.PI * 2);
      ctx.fill();

      if (devUpgraded) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx + 26, ry - 26, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

export function drawNightAtmosphere(renderer, ctx, state) {
  const hour = Math.floor((state.simSeconds / 3600) % 24);
  const isNight = hour >= 21 || hour < 5;
  const isDusk = (hour >= 18 && hour < 21) || hour === 5;
  if (!isNight && !isDusk) return;

  ctx.save();
  ctx.fillStyle = isNight ? 'rgba(6, 10, 24, 0.42)' : 'rgba(25, 18, 42, 0.18)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  if (isNight) {
    const lampSprite = renderer.ensureLampGlowSprite();
    if (lampSprite) {
      for (const rx of ROAD_X) {
        for (const ry of ROAD_Y) {
          ctx.drawImage(lampSprite, rx - 56, ry - 56);
        }
      }
    }

    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const beam = ctx.createLinearGradient(14, 0, 96, 0);
    beam.addColorStop(0, 'rgba(254, 249, 195, 0.35)');
    beam.addColorStop(1, 'rgba(254, 249, 195, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(14, -7);
    ctx.lineTo(96, -28);
    ctx.lineTo(96, 28);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawIncidents(renderer, ctx, state, viewBounds) {
  const pulse = 0.5 + 0.5 * Math.sin(renderer.time * 5);
  for (const inc of state.incidents) {
    if (
      viewBounds &&
      (inc.x < viewBounds.minX || inc.x > viewBounds.maxX || inc.y < viewBounds.minY || inc.y > viewBounds.maxY)
    ) {
      continue;
    }
    ctx.strokeStyle = inc.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3 + pulse * 0.45;
    ctx.beginPath();
    ctx.arc(inc.x, inc.y, 18 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#111214';
    ctx.beginPath();
    ctx.arc(inc.x, inc.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = inc.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = inc.color;
    ctx.font = '800 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', inc.x, inc.y);

    if (inc.progress > 0) {
      const pct = clamp(inc.progress / inc.duration, 0, 1);
      ctx.strokeStyle = '#23A55A';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(inc.x, inc.y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
    }

    const capText = inc.type.replace('_', ' ');
    const labelW = Math.min(130, renderer.measureWidth(ctx, '600 9px system-ui, -apple-system, sans-serif', capText) + 18);
    ctx.fillStyle = 'rgba(17, 18, 20, 0.88)';
    drawRoundedRectPath(ctx, inc.x - labelW / 2, inc.y + 17, labelW, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#F2F3F5';
    ctx.fillText(capText, inc.x, inc.y + 25);
  }
}

export function drawCivilians(ctx, state, viewBounds) {
  for (const civ of state.civilians) {
    if (
      viewBounds &&
      (civ.x < viewBounds.minX || civ.x > viewBounds.maxX || civ.y < viewBounds.minY || civ.y > viewBounds.maxY)
    ) {
      continue;
    }
    ctx.save();
    ctx.translate(civ.x, civ.y);
    ctx.rotate(civ.horizontal ? (civ.dir > 0 ? 0 : Math.PI) : civ.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    drawRoundedRectPath(ctx, -11, -6, 24, 14, 4);
    ctx.fill();
    ctx.fillStyle = civ.color;
    drawRoundedRectPath(ctx, -12, -7, 24, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#1E293B';
    drawRoundedRectPath(ctx, -3, -5, 9, 10, 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawSpeechBubble(renderer, ctx, x, y, text, borderColor) {
  ctx.save();
  const w = renderer.measureWidth(ctx, '600 9.5px system-ui, -apple-system, sans-serif', text) + 12;
  ctx.fillStyle = '#1E1F22';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.2;
  drawRoundedRectPath(ctx, x - w / 2, y - 10, w, 17, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F2F3F5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - 1.5);
  ctx.restore();
}

export function drawOfficers(renderer, ctx, state, viewBounds, rankMap, divMap, showNameTags = true) {
  const officers = state.members.filter((m) => m.status === 'online-2d');
  const compactTags = officers.length > 35;
  const defaultRank = state.ranks[0];
  const tagFont = '600 9.5px system-ui, -apple-system, sans-serif';

  for (const ai of officers) {
    if (
      viewBounds &&
      (ai.x < viewBounds.minX || ai.x > viewBounds.maxX || ai.y < viewBounds.minY || ai.y > viewBounds.maxY)
    ) {
      continue;
    }
    const rank = rankMap ? rankMap.get(ai.rankId) || defaultRank : getRankById(state, ai.rankId);
    const div = divMap && ai.divisionId ? divMap.get(ai.divisionId) || null : getDivisionById(state, ai.divisionId);
    const isCadet = ai.academyStatus === 'ENROLLED';
    const isDetained = (ai.detainedRemaining || 0) > 0;
    const isPropamGuard = Boolean(
      !isDetained &&
      !isCadet &&
      (div?.dutyProfile?.assignmentType === 'INTERNAL_SECURITY' || div?.id === 'div-propam')
    );
    const uniformColor = isDetained ? '#EF4444' : isCadet ? '#0EA5E9' : div ? div.color : '#38BDF8';
    const bob = isDetained ? 0 : Math.sin(ai.walkPhase) * 1.4;

    ctx.save();
    ctx.translate(ai.x, ai.y + bob);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10 - bob, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDetained ? '#450A0A' : '#1E293B';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = uniformColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = isDetained ? '#FCA5A5' : isCadet ? '#FACC15' : rank.color;
    ctx.beginPath();
    ctx.arc(Math.cos(ai.angle) * 4, Math.sin(ai.angle) * 4, 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (isPropamGuard) {
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(8, -8, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (isCadet && !isDetained) {
      const pct = clamp((ai.trainingProgress || 0) / 100, 0, 1);
      ctx.fillStyle = 'rgba(17, 18, 20, 0.88)';
      drawRoundedRectPath(ctx, -16, -20 - bob, 32, 5, 2);
      ctx.fill();
      ctx.fillStyle = '#22C55E';
      drawRoundedRectPath(ctx, -15, -19 - bob, Math.max(2, 30 * pct), 3, 1.5);
      ctx.fill();
    }

    if (showNameTags) {
      const firstToken = ai.icName.split(' ')[0];
      const tag = isDetained
        ? `[RUTAN ${Math.ceil(ai.detainedRemaining)}d] ${firstToken}`
        : isCadet
          ? `[AKPOL] ${firstToken}`
          : compactTags
            ? div
              ? `${div.callsign} · ${firstToken}`
              : firstToken
            : div
              ? `[${div.callsign}] ${firstToken}`
              : firstToken;
      const tw = renderer.measureWidth(ctx, tagFont, tag) + (compactTags ? 8 : 10);
      ctx.fillStyle = isDetained ? 'rgba(69, 10, 10, 0.92)' : 'rgba(17, 18, 20, 0.82)';
      drawRoundedRectPath(ctx, -tw / 2, 13 - bob, tw, 14, 4);
      ctx.fill();
      ctx.fillStyle = isDetained ? '#FCA5A5' : isCadet ? '#7DD3FC' : '#E2E8F0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, 0, 20 - bob);
    }

    if (ai.speechTimer > 0 && ai.speechBubble) {
      drawSpeechBubble(renderer, ctx, 0, isCadet ? -30 - bob : -22 - bob, ai.speechBubble, uniformColor);
    }

    ctx.restore();
  }
}

export function drawPlayerCruiser(renderer, ctx, state, showNameTags = true) {
  const p = state.player;
  const bob = Math.sin(p.walkPhase) * 1.5;

  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.strokeStyle = 'rgba(212, 160, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(p.angle);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  drawRoundedRectPath(ctx, -16, -9, 34, 20, 6);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  drawRoundedRectPath(ctx, -17, -10, 34, 20, 6);
  ctx.fill();
  ctx.strokeStyle = '#D4A024';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-5, -9, 10, 18);

  ctx.fillStyle = '#38BDF8';
  drawRoundedRectPath(ctx, 4, -7, 6, 14, 2);
  ctx.fill();

  const flash = p.sirenOn ? Math.floor(renderer.time * 12) % 2 : -1;
  ctx.fillStyle = flash === 0 ? '#EF4444' : flash === 1 ? '#60A5FA' : '#94A3B8';
  ctx.fillRect(-2, -7, 3.5, 7);
  ctx.fillStyle = flash === 1 ? '#EF4444' : flash === 0 ? '#60A5FA' : '#94A3B8';
  ctx.fillRect(-2, 0, 3.5, 7);

  if (p.sirenOn) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = flash === 0 ? '#EF4444' : '#3B82F6';
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  if (showNameTags) {
    const label = 'KAPOLDA (ANDA)';
    const lw = renderer.measureWidth(ctx, '700 10px system-ui, -apple-system, sans-serif', label) + 12;
    ctx.fillStyle = 'rgba(17, 18, 20, 0.9)';
    drawRoundedRectPath(ctx, -lw / 2, 18, lw, 15, 4);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 25.5);
  }

  if (p.speechTimer > 0 && p.speechBubble) {
    drawSpeechBubble(renderer, ctx, 0, -26, p.speechBubble, '#D4A024');
  }

  ctx.restore();
}

export function drawMinimap(renderer, ctx, state) {
  const mw = 86;
  const mh = 64;
  const mx = renderer.width - mw - 12;
  const my = 58;

  ctx.save();
  ctx.fillStyle = 'rgba(17, 18, 20, 0.82)';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  drawRoundedRectPath(ctx, mx, my, mw, mh, 6);
  ctx.fill();
  ctx.stroke();

  const sx = mw / WORLD_WIDTH;
  const sy = mh / WORLD_HEIGHT;

  const comp = MABES_ZONES.compound;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
  ctx.fillRect(mx + comp.x * sx, my + comp.y * sy, comp.w * sx, comp.h * sy);

  const akad = DISTRICTS.find((d) => d.id === 'akademi');
  if (akad) {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
    ctx.fillRect(mx + akad.x * sx, my + akad.y * sy, akad.w * sx, akad.h * sy);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (const ry of ROAD_Y) ctx.fillRect(mx + 2, my + ry * sy, mw - 4, 2);
  for (const rx of ROAD_X) ctx.fillRect(mx + rx * sx, my + 2, 2, mh - 4);

  for (const inc of state.incidents) {
    ctx.fillStyle = inc.color;
    ctx.beginPath();
    ctx.arc(mx + inc.x * sx, my + inc.y * sy, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ai of state.members) {
    if (ai.status !== 'online-2d') continue;
    ctx.fillStyle = (ai.detainedRemaining || 0) > 0 ? '#EF4444' : '#38BDF8';
    ctx.fillRect(mx + ai.x * sx - 1.5, my + ai.y * sy - 1.5, 3, 3);
  }

  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
