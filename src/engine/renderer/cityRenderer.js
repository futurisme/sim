// Modular 2D City Renderer Coordinator with Offscreen Caching, Zero-GC Particles & Prefs Support
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants.js';
import { clamp } from '../rules.js';
import {
  drawAcademyCampus,
  drawDistrictLabels,
  drawDistricts,
  drawMabesComplex,
  drawRoadsStatic,
  drawWorldGrid,
} from './staticLayers.js';
import {
  drawCivilians,
  drawDynamicOverlayMarkings,
  drawIncidents,
  drawMinimap,
  drawNightAtmosphere,
  drawOfficers,
  drawPlayerCruiser,
} from './entityPainter.js';

const MAX_PARTICLES = 64;

export class CityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 390;
    this.height = 520;
    this.dpr = 1;
    this.camX = 180;
    this.camY = 180;
    this.time = 0;

    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#FACC15',
      size: 3,
    }));
    this.particleCursor = 0;

    this._resizeObserver = null;
    this._staticWorldCanvas = null;
    this._lampGlowCanvas = null;
    this._textWidthCache = new Map();
    this._bindResize();
  }

  measureWidth(ctx, font, text) {
    if (ctx.font !== font) ctx.font = font;
    const key = `${font}|${text}`;
    let w = this._textWidthCache.get(key);
    if (w !== undefined) return w;
    w = ctx.measureText(text).width;
    if (this._textWidthCache.size >= 500) {
      const firstKey = this._textWidthCache.keys().next().value;
      if (firstKey !== undefined) this._textWidthCache.delete(firstKey);
    }
    this._textWidthCache.set(key, w);
    return w;
  }

  _bindResize() {
    this.resize();
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this.resize());
      this._resizeObserver.observe(this.canvas.parentElement);
    }
  }

  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  emitBurst(x, y, color = '#FACC15', count = 14) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 28 + Math.random() * 68;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = 0;
      p.maxLife = 0.45 + Math.random() * 0.3;
      p.color = color;
      p.size = 2.5 + Math.random() * 2.5;
    }
  }

  ensureStaticWorldLayer() {
    if (this._staticWorldCanvas || typeof document === 'undefined') return;
    const off = document.createElement('canvas');
    off.width = WORLD_WIDTH;
    off.height = WORLD_HEIGHT;
    const octx = off.getContext('2d', { alpha: false });
    if (!octx) return;

    drawWorldGrid(octx);
    drawDistricts(octx);
    drawRoadsStatic(octx);
    drawMabesComplex(octx);
    drawAcademyCampus(octx);
    drawDistrictLabels(octx);
    this._staticWorldCanvas = off;
  }

  ensureLampGlowSprite() {
    if (this._lampGlowCanvas || typeof document === 'undefined') return null;
    const size = 112;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d');
    if (!gctx) return null;
    const r = size / 2;
    const grad = gctx.createRadialGradient(r, r, 4, r, r, r - 2);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    this._lampGlowCanvas = c;
    return c;
  }

  _updateAndDrawParticles(ctx, dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      ctx.globalAlpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  render(state, rawDt = 0.016, prefs = {}) {
    const ctx = this.ctx;
    if (!ctx) return;

    const showMinimap = prefs.showMinimap !== false;
    const showNameTags = prefs.showNameTags !== false;
    const showNightLighting = prefs.showNightLighting !== false;

    this.time += rawDt * (state.speed === 0 ? 0.15 : state.speed);

    const targetCamX = clamp(state.player.x, this.width * 0.45, WORLD_WIDTH - this.width * 0.45);
    const targetCamY = clamp(state.player.y + 42, this.height * 0.38, WORLD_HEIGHT - this.height * 0.28);
    this.camX += (targetCamX - this.camX) * Math.min(1, rawDt * 7);
    this.camY += (targetCamY - this.camY) * Math.min(1, rawDt * 7);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = '#151921';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    const offsetX = Math.round(this.width / 2 - this.camX);
    const offsetY = Math.round(this.height / 2 - this.camY);
    ctx.translate(offsetX, offsetY);

    this.ensureStaticWorldLayer();
    if (this._staticWorldCanvas) {
      ctx.drawImage(this._staticWorldCanvas, 0, 0);
    } else {
      drawWorldGrid(ctx);
      drawDistricts(ctx);
      drawRoadsStatic(ctx);
      drawMabesComplex(ctx);
      drawAcademyCampus(ctx);
      drawDistrictLabels(ctx);
    }

    const halfW = this.width * 0.5 + 80;
    const halfH = this.height * 0.5 + 80;
    const viewBounds = {
      minX: this.camX - halfW,
      maxX: this.camX + halfW,
      minY: this.camY - halfH,
      maxY: this.camY + halfH,
    };

    const rankMap = new Map();
    for (const r of state.ranks) rankMap.set(r.id, r);
    const divMap = new Map();
    for (const d of state.divisions) divMap.set(d.id, d);

    drawDynamicOverlayMarkings(this, ctx, state);
    drawIncidents(this, ctx, state, viewBounds);
    drawCivilians(ctx, state, viewBounds);
    drawOfficers(this, ctx, state, viewBounds, rankMap, divMap, showNameTags);
    drawPlayerCruiser(this, ctx, state, showNameTags);
    this._updateAndDrawParticles(ctx, rawDt);
    if (showNightLighting) {
      drawNightAtmosphere(this, ctx, state);
    }

    ctx.restore();

    if (showMinimap) {
      drawMinimap(this, ctx, state);
    }

    ctx.restore();
  }
}
