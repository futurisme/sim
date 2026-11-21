// Static Offscreen World Geometry & Cached Vector Painter for Kota Izumiya 2D
import { DISTRICTS, MABES_ZONES, ROAD_X, ROAD_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../constants.js';

export function drawRoundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawWorldGrid(ctx) {
  ctx.fillStyle = '#181E27';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(212, 160, 36, 0.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, WORLD_WIDTH - 24, WORLD_HEIGHT - 24);
}

export function drawDistricts(ctx) {
  for (const d of DISTRICTS) {
    if (d.id === 'mabes' || d.id === 'akademi') continue;
    ctx.fillStyle = d.color;
    drawRoundedRectPath(ctx, d.x, d.y, d.w, d.h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (d.id === 'dermaga') {
      ctx.fillStyle = '#102A43';
      drawRoundedRectPath(ctx, d.x + 14, d.y + d.h - 54, d.w - 28, 40, 8);
      ctx.fill();
    }
  }
}

export function drawRoadsStatic(ctx) {
  const roadW = 46;
  ctx.fillStyle = '#242933';

  for (const ry of ROAD_Y) {
    ctx.fillRect(24, ry - roadW / 2, WORLD_WIDTH - 48, roadW);
  }
  for (const rx of ROAD_X) {
    ctx.fillRect(rx - roadW / 2, 24, roadW, WORLD_HEIGHT - 48);
  }

  ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  for (const ry of ROAD_Y) {
    ctx.beginPath();
    ctx.moveTo(28, ry);
    ctx.lineTo(WORLD_WIDTH - 28, ry);
    ctx.stroke();
  }
  for (const rx of ROAD_X) {
    ctx.beginPath();
    ctx.moveTo(rx, 28);
    ctx.lineTo(rx, WORLD_HEIGHT - 28);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function drawMabesComplex(ctx) {
  const mz = MABES_ZONES;
  const c = mz.compound;

  ctx.fillStyle = '#162030';
  drawRoundedRectPath(ctx, c.x, c.y, c.w, c.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 160, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#242933';
  ctx.fillRect(mz.eastGate.x - 10, mz.eastGate.y - 16, 22, 32);
  ctx.fillRect(mz.southGate.x - 18, mz.southGate.y - 10, 36, 22);

  const hq = mz.hq;
  ctx.fillStyle = '#1E2D42';
  drawRoundedRectPath(ctx, hq.x, hq.y, hq.w, hq.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 160, 36, 0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#EAB308';
  ctx.font = '700 9px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('GEDUNG KOMANDO', hq.x + 10, hq.y + 15);

  const hx = hq.x + hq.w - 30;
  const hy = hq.y + 42;
  ctx.strokeStyle = 'rgba(212, 160, 36, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(212, 160, 36, 0.85)';
  ctx.font = '800 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H', hx, hy);

  const cy = mz.courtyard;
  ctx.fillStyle = '#1D293B';
  drawRoundedRectPath(ctx, cy.x, cy.y, cy.w, cy.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(cy.x + 10, cy.y + 24, cy.w - 20, cy.h - 34);
  ctx.setLineDash([]);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 8.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAPANGAN APEL', cy.x + cy.w / 2, cy.y + 13);

  const po = mz.propamOffice;
  ctx.fillStyle = '#122724';
  drawRoundedRectPath(ctx, po.x, po.y, po.w, po.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#34D399';
  ctx.font = '800 9px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KANTOR PROPAM', po.x + po.w / 2, po.y + 15);
  ctx.fillStyle = 'rgba(167, 243, 208, 0.72)';
  ctx.font = '600 7.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('ETIK & PEMERIKSAAN', po.x + po.w / 2, po.y + 29);

  ctx.fillStyle = '#0B1816';
  drawRoundedRectPath(ctx, po.x + 14, po.y + 44, 38, 22, 4);
  ctx.fill();
  drawRoundedRectPath(ctx, po.x + 64, po.y + 44, 38, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(po.x + po.w / 2, po.y + 82, 6, 0, Math.PI * 2);
  ctx.fill();

  const pr = mz.prison;
  ctx.fillStyle = '#1A141A';
  drawRoundedRectPath(ctx, pr.x, pr.y, pr.w, pr.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.48)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#F87171';
  ctx.font = '800 9px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PENJARA MABES', pr.x + pr.w / 2, pr.y + 13);

  for (let i = 0; i < 3; i++) {
    const cellX = pr.x + 7 + i * 36;
    const cellY = pr.y + 24;
    const cellW = 31;
    const cellH = 56;
    ctx.fillStyle = '#0F0D11';
    drawRoundedRectPath(ctx, cellX, cellY, cellW, cellH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    for (let b = 5; b < cellW - 2; b += 6) {
      ctx.beginPath();
      ctx.moveTo(cellX + b, cellY + cellH - 8);
      ctx.lineTo(cellX + b, cellY + cellH);
      ctx.stroke();
    }
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 7px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SEL ${i + 1}`, cellX + cellW / 2, cellY + 9);
  }

  ctx.fillStyle = '#10B981';
  drawRoundedRectPath(ctx, mz.eastGate.x - 14, mz.eastGate.y - 28, 18, 12, 3);
  ctx.fill();
  drawRoundedRectPath(ctx, mz.southGate.x + 22, mz.southGate.y - 14, 18, 12, 3);
  ctx.fill();
}

export function drawAcademyCampus(ctx) {
  const d = DISTRICTS.find((x) => x.id === 'akademi');
  if (!d) return;

  ctx.fillStyle = '#17263D';
  drawRoundedRectPath(ctx, d.x, d.y, d.w, d.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#242933';
  ctx.fillRect(d.x - 4, 155 - 16, 22, 32);
  ctx.fillRect(1110 - 18, d.y + d.h - 18, 36, 22);

  // Inner campus yard
  ctx.fillStyle = '#1B2E4B';
  drawRoundedRectPath(ctx, d.x + 14, d.y + 32, d.w - 28, d.h - 46, 9);
  ctx.fill();

  // Mimbar Pelatih Podium (center top: trainerX = d.x + d.w * 0.5, trainerY = d.y + 62)
  const podiumX = d.x + d.w * 0.5;
  const podiumY = d.y + 62;
  ctx.fillStyle = '#0F172A';
  drawRoundedRectPath(ctx, podiumX - 42, podiumY - 17, 84, 34, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#FACC15';
  ctx.font = '800 8px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIMBAR PELATIH', podiumX, podiumY - 5);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 7px system-ui, -apple-system, sans-serif';
  ctx.fillText('POS KOMANDO PBB', podiumX, podiumY + 6);

  // Lapangan Baris-Berbaris Formation Pad
  ctx.fillStyle = '#132238';
  drawRoundedRectPath(ctx, d.x + 24, d.y + 92, d.w - 48, 122, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2x4 Baris-Berbaris Formation Slot Markers matching getAkpolFormationSlotCoords
  const cols = 4;
  const startX = d.x + (d.w - (cols - 1) * 52) * 0.5;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = startX + col * 52;
      const sy = d.y + 132 + row * 48;
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
  drawRoundedRectPath(ctx, d.x + 24, d.y + 219, d.w - 48, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#7DD3FC';
  ctx.font = '700 9px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LAPANGAN BARIS-BERBARIS · AKPOL', d.x + d.w * 0.5, d.y + 231);
}

export function drawDistrictLabels(ctx) {
  for (const d of DISTRICTS) {
    const text = d.name.toUpperCase();
    ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
    const tw = ctx.measureText(text).width + 14;
    const lx = d.x + 10;
    const ly = d.y + 8;
    ctx.fillStyle = 'rgba(17, 18, 20, 0.85)';
    drawRoundedRectPath(ctx, lx, ly, tw, 18, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(242, 243, 245, 0.88)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + 7, ly + 9.5);
  }
}
