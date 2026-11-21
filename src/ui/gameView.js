import { CityRenderer } from '../engine/cityRenderer.js';
import { formatSimClock } from '../engine/rules.js';
import { escapeHtml, svgIcons } from './icons.js';

export class GameView {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    this.renderer = null;
    this.mounted = false;
    this.joyVec = { x: 0, y: 0 };
    this.joyActive = false;
    this.joyPointerId = null;
    this.hudDetailsExpanded = false;
  }

  mount() {
    this.root.innerHTML = `
      <div class="relative w-full h-full overflow-hidden select-none" style="background: var(--canvas-bg);">
        <!-- Full-bleed 2D Game Canvas -->
        <canvas data-testid="city-canvas" class="block w-full h-full"></canvas>

        <!-- HUD Overlay (pointer-events-none wrapper, pointer-events-auto controls) -->
        <div class="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5">
          <!-- Top HUD Cluster (compact & collapsible) -->
          <div class="flex items-start justify-between gap-2">
            <div class="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-[#111214]/90 border border-white/10 shadow-lg max-w-[205px]">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-[11px] text-[#80848E] font-mono-num min-w-0">
                  <span id="hud-clock" class="text-[#F2F3F5] font-bold">08:06</span>
                  <span>·</span>
                  <span id="hud-directive" class="text-[#FACC15] font-semibold truncate">PATROLI</span>
                </div>
                <button type="button" id="btn-toggle-city-hud" aria-label="Rincian HUD Kota" class="w-5 h-5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#B5BAC1] cursor-pointer shrink-0">
                  <span id="hud-chevron" class="collapse-chevron ${this.hudDetailsExpanded ? 'open' : ''}">${svgIcons.chevronRight}</span>
                </button>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-[10.5px] font-mono-num">
                <span class="text-[#F2F3F5] font-bold"><span id="hud-officers">4</span> Unit</span>
                <span class="text-[#F59E0B] font-bold"><span id="hud-incidents">2</span> Kasus</span>
                <span id="hud-gate-pill" class="px-1 py-0.2 rounded text-[9.5px] font-semibold bg-[#10B981]/20 text-[#6EE7B7]">Gate Buka</span>
              </div>
              <div id="hud-city-details" class="${this.hudDetailsExpanded ? '' : 'hidden '}mt-1.5 pt-1.5 border-t border-white/10 space-y-1.5">
                <div class="flex items-center justify-between gap-2 text-[10px] font-mono-num text-[#B5BAC1]">
                  <span class="text-[#23A55A] font-bold"><span id="hud-rep">120</span> Rep</span>
                  <span class="text-[#38BDF8] font-bold"><span id="hud-eff">100</span>% Map</span>
                  <span id="hud-zone" class="text-[#F2F3F5]">Mabes</span>
                  <span id="hud-rutan" class="text-[#FCA5A5]">0/3 Rutan</span>
                </div>
                <button type="button" id="btn-toggle-propam-gate" class="w-full min-h-[28px] px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer bg-[#10B981]/20 border-[#10B981]/50 text-[#6EE7B7]">
                  Gerbang Propam: Buka
                </button>
              </div>
            </div>

            <div class="pointer-events-auto flex items-center gap-1">
              <div id="game-speed-bar" class="flex items-center bg-[#111214]/90 rounded-xl p-0.5 border border-white/10" role="group" aria-label="Kecepatan Game">
                <button type="button" data-speed="0" aria-label="Pause Game" class="speed-btn min-w-[34px] min-h-[36px] px-2 text-xs font-mono-num font-bold rounded-lg cursor-pointer">II</button>
                <button type="button" data-speed="1" aria-label="Kecepatan Normal 1X" class="speed-btn min-w-[34px] min-h-[36px] px-2 text-xs font-mono-num font-bold rounded-lg cursor-pointer">1X</button>
                <button type="button" data-speed="2" aria-label="Kecepatan Cepat 2X" class="speed-btn min-w-[34px] min-h-[36px] px-2 text-xs font-mono-num font-bold rounded-lg cursor-pointer">2X</button>
              </div>
              <button type="button" id="btn-mute-audio" aria-label="Bisukan suara" class="min-w-[38px] min-h-[38px] rounded-xl bg-[#111214]/90 border border-white/10 flex items-center justify-center text-[#F2F3F5] cursor-pointer">
                ${svgIcons.volumeOn}
              </button>
            </div>
          </div>

          <!-- Center Pause Indicator (only visible when paused) -->
          <div id="game-paused-banner" class="hidden self-center pointer-events-auto px-4 py-2.5 rounded-xl bg-[#111214]/95 border border-[#DA373C]/60 text-center shadow-xl">
            <div class="text-xs font-bold text-[#F2F3F5]">SIMULASI DIJEDA</div>
            <button type="button" id="btn-resume-game" class="mt-1.5 px-3 py-1 rounded-lg theme-accent-btn text-white text-xs font-semibold cursor-pointer">Lanjutkan (1X)</button>
          </div>

          <!-- Bottom Zone: Live Radio Sync Bar + Ergonomic Thumb Controls -->
          <div class="space-y-2">
            <!-- 1-Line Radio Sync Strip -->
            <button type="button" id="btn-radio-sync" class="pointer-events-auto w-full px-3 py-1.5 rounded-xl bg-[#111214]/88 border border-white/10 flex items-center justify-between gap-2 text-left cursor-pointer">
              <span class="text-[#38BDF8] shrink-0">${svgIcons.radio}</span>
              <span id="hud-radio-text" class="text-[11px] text-[#DBDEE1] truncate flex-1">Radio 10-4 aktif. Semua unit berpatroli.</span>
              <span class="text-[10px] font-semibold text-[#80848E] shrink-0">Discord</span>
            </button>

            <!-- Thumb Controls: Virtual Joystick Left + Action Cluster Right -->
            <div class="flex items-end justify-between pb-1">
              <!-- Virtual Touch Joystick -->
              <div
                id="touch-joystick"
                aria-label="Joystick Gerak Patroli"
                class="pointer-events-auto relative w-[106px] h-[106px] rounded-full bg-[#111214]/75 border border-white/15 flex items-center justify-center touch-none"
              >
                <div class="w-16 h-16 rounded-full border border-white/[0.08] pointer-events-none"></div>
                <div
                  id="joystick-knob"
                  class="absolute w-11 h-11 rounded-full bg-[#D4A024] border-2 border-white/40 shadow-lg pointer-events-none"
                  style="transform: translate(0px, 0px);"
                ></div>
              </div>

              <!-- Action Buttons Right -->
              <div class="pointer-events-auto flex flex-col items-end gap-2">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-siren"
                    aria-label="Nyalakan atau matikan sirine"
                    class="min-w-[48px] min-h-[48px] px-3 rounded-2xl bg-[#1E1F22]/90 border border-white/15 text-[#F2F3F5] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    ${svgIcons.siren}
                    <span class="text-[10px] font-semibold">Sirine</span>
                  </button>
                  <button
                    type="button"
                    id="btn-backup"
                    aria-label="Panggil Backup AI"
                    class="min-w-[48px] min-h-[48px] px-3 rounded-2xl bg-[#1E1F22]/90 border border-white/15 text-[#F2F3F5] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    ${svgIcons.users}
                    <span class="text-[10px] font-semibold">Backup</span>
                  </button>
                </div>
                <button
                  type="button"
                  id="btn-handle-incident"
                  class="min-w-[116px] min-h-[50px] px-4 rounded-2xl theme-accent-btn active:scale-[0.97] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-transform"
                >
                  ${svgIcons.shield}
                  <span>Tangani TKP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = this.root.querySelector('canvas');
    this.renderer = new CityRenderer(canvas);
    this.mounted = true;
    this._wireControls();
    this.updateHud();
  }

  destroy() {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.mounted = false;
  }

  _wireControls() {
    this.root.querySelectorAll('#game-speed-bar .speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setSpeed(Number(btn.dataset.speed));
      });
    });

    this.root.querySelector('#btn-resume-game').addEventListener('click', () => {
      this.store.setSpeed(1);
    });

    this.root.querySelector('#btn-mute-audio').addEventListener('click', () => {
      this.store.toggleMute();
    });

    this.root.querySelector('#btn-siren').addEventListener('click', () => {
      this.store.togglePlayerSiren();
    });

    this.root.querySelector('#btn-backup').addEventListener('click', () => {
      this.store.callBackupToPlayer();
    });

    this.root.querySelector('#btn-handle-incident').addEventListener('click', () => {
      const resolved = this.store.handleNearestIncident();
      if (resolved && this.renderer) {
        this.renderer.emitBurst(resolved.x, resolved.y, resolved.color, 18);
      }
    });

    this.root.querySelector('#btn-radio-sync').addEventListener('click', () => {
      this.store.setActiveChannel('laporan-patroli');
      this.store.setActiveTab('discord');
    });

    const toggleHudBtn = this.root.querySelector('#btn-toggle-city-hud');
    if (toggleHudBtn) {
      toggleHudBtn.addEventListener('click', () => {
        this.hudDetailsExpanded = !this.hudDetailsExpanded;
        const details = this.root.querySelector('#hud-city-details');
        const chev = this.root.querySelector('#hud-chevron');
        if (details) details.classList.toggle('hidden', !this.hudDetailsExpanded);
        if (chev) chev.classList.toggle('open', this.hudDetailsExpanded);
      });
    }

    const gateBtn = this.root.querySelector('#btn-toggle-propam-gate');
    if (gateBtn) {
      gateBtn.addEventListener('click', () => {
        this.store.togglePropamGate();
        this.updateHud();
      });
    }

    // Virtual Analog Touch Joystick (Pointer Events for touch + mouse)
    const joy = this.root.querySelector('#touch-joystick');
    const knob = this.root.querySelector('#joystick-knob');
    const maxRadius = 34;

    const updateJoyFromEvent = (e) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);
      const ox = Math.cos(angle) * clamped;
      const oy = Math.sin(angle) * clamped;
      knob.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
      this.joyVec.x = ox / maxRadius;
      this.joyVec.y = oy / maxRadius;
    };

    const resetJoy = () => {
      this.joyActive = false;
      this.joyPointerId = null;
      this.joyVec.x = 0;
      this.joyVec.y = 0;
      knob.style.transform = 'translate(0px, 0px)';
    };

    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      joy.setPointerCapture(e.pointerId);
      this.joyActive = true;
      this.joyPointerId = e.pointerId;
      updateJoyFromEvent(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (!this.joyActive || e.pointerId !== this.joyPointerId) return;
      updateJoyFromEvent(e);
    });
    joy.addEventListener('pointerup', resetJoy);
    joy.addEventListener('pointercancel', resetJoy);
  }

  getInputVector(keysPressed) {
    let mx = this.joyVec.x;
    let my = this.joyVec.y;
    if (keysPressed.has('ArrowLeft') || keysPressed.has('KeyA')) mx -= 1;
    if (keysPressed.has('ArrowRight') || keysPressed.has('KeyD')) mx += 1;
    if (keysPressed.has('ArrowUp') || keysPressed.has('KeyW')) my -= 1;
    if (keysPressed.has('ArrowDown') || keysPressed.has('KeyS')) my += 1;
    return { moveX: mx, moveY: my };
  }

  renderFrame(rawDt) {
    if (!this.mounted || !this.renderer) return;
    this.renderer.render(this.store.state, rawDt, this.store.prefs);
  }

  updateHud() {
    if (!this.mounted) return;
    const { state } = this.store;
    const activeUnits = state.members.filter((m) => m.status === 'online-2d').length + 1;

    this.root.querySelector('#hud-clock').textContent = formatSimClock(state.simSeconds);
    this.root.querySelector('#hud-officers').textContent = String(activeUnits);
    this.root.querySelector('#hud-rep').textContent = String(Math.round(state.reputation));
    this.root.querySelector('#hud-incidents').textContent = String(state.incidents.length);
    const effEl = this.root.querySelector('#hud-eff');
    if (effEl) effEl.textContent = String(Math.round(state.tech?.mapEfficiency || 100));

    const gateOpen = state.mabesSecurity?.gateOpen !== false;
    const detainees = state.members.filter((m) => (m.detainedRemaining || 0) > 0).length;
    const gatePill = this.root.querySelector('#hud-gate-pill');
    if (gatePill) {
      gatePill.textContent = gateOpen ? 'Gate Buka' : 'Gate Kunci';
      gatePill.className = `px-1 py-0.2 rounded text-[9.5px] font-semibold ${
        gateOpen ? 'bg-[#10B981]/20 text-[#6EE7B7]' : 'bg-[#EF4444]/20 text-[#FCA5A5]'
      }`;
    }

    const gateBtn = this.root.querySelector('#btn-toggle-propam-gate');
    if (gateBtn) {
      gateBtn.textContent = gateOpen ? 'Gerbang Propam: Buka' : 'Gerbang Propam: Dikunci';
      gateBtn.className = `w-full min-h-[28px] px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
        gateOpen
          ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#6EE7B7]'
          : 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#FCA5A5]'
      }`;
    }

    const zoneEl = this.root.querySelector('#hud-zone');
    if (zoneEl) {
      const px = state.player.x;
      const py = state.player.y;
      zoneEl.textContent =
        px >= 44 && px <= 356 && py >= 44 && py <= 322
          ? 'Mabes'
          : px >= 955 && px <= 1270 && py >= 55 && py <= 330
            ? 'Akpol'
            : 'Kota';
    }

    const rutanEl = this.root.querySelector('#hud-rutan');
    if (rutanEl) rutanEl.textContent = `${detainees}/3 Rutan`;

    const dirLabel =
      state.directive === 'APEL_MABES'
        ? 'APEL MABES'
        : state.directive === 'RAZIA_GABUNGAN'
          ? 'RAZIA'
          : 'PATROLI';
    this.root.querySelector('#hud-directive').textContent = dirLabel;

    this.root.querySelector('#game-paused-banner').classList.toggle('hidden', state.speed !== 0);

    this.root.querySelectorAll('#game-speed-bar .speed-btn').forEach((btn) => {
      const sp = Number(btn.dataset.speed);
      const active = state.speed === sp;
      btn.className = `speed-btn min-w-[34px] min-h-[36px] px-2 text-xs font-mono-num font-bold rounded-lg cursor-pointer ${
        active
          ? sp === 0
            ? 'bg-[#DA373C] text-white'
            : 'theme-accent-btn text-white'
          : 'text-[#B5BAC1] hover:text-white'
      }`;
    });

    const muteBtn = this.root.querySelector('#btn-mute-audio');
    muteBtn.innerHTML = state.muted ? svgIcons.volumeOff : svgIcons.volumeOn;
    muteBtn.setAttribute('aria-label', state.muted ? 'Nyalakan suara' : 'Bisukan suara');

    const sirenBtn = this.root.querySelector('#btn-siren');
    sirenBtn.className = `min-w-[48px] min-h-[48px] px-3 rounded-2xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
      state.player.sirenOn
        ? 'bg-[#DA373C] border-white/30 text-white'
        : 'bg-[#1E1F22]/90 border-white/15 text-[#F2F3F5]'
    }`;

    const reports = state.messages['laporan-patroli'] || [];
    const latest = reports[reports.length - 1];
    const radioText = latest
      ? `${latest.authorName}: ${latest.text}`
      : 'Radio 10-4 aktif. Semua unit berpatroli.';
    this.root.querySelector('#hud-radio-text').textContent = radioText;

    const actionBtnLabel = this.root.querySelector('#btn-handle-incident span');
    if (actionBtnLabel) {
      const px = state.player.x;
      const py = state.player.y;
      const nearIncident = state.incidents.some((inc) => Math.hypot(inc.x - px, inc.y - py) < 92);
      const inAcademy = !nearIncident && px >= 955 && px <= 1270 && py >= 55 && py <= 330;
      actionBtnLabel.textContent = inAcademy ? 'Pantau Akpol' : 'Tangani TKP';
    }
  }
}
