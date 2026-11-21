import './index.css';
import { store } from './engine/store.js';
import { soundFX } from './engine/audio.js';
import { renderTitleScreen } from './ui/titleScreen.js';
import { DiscordView } from './ui/discordView.js';
import { OrgManagerView } from './ui/orgManagerView.js';
import { GameView } from './ui/gameView.js';
import { renderModals } from './ui/modals.js';
import { svgIcons } from './ui/icons.js';
import { formatSimClock } from './engine/rules.js';

const appEl = document.getElementById('app');
appEl.innerHTML = `<div class="mobile-shell" id="mobile-shell"></div>`;
const shellEl = document.getElementById('mobile-shell');

let screenRoot = null;
let workspaceContent = null;
let bottomNavEl = null;
let modalRootEl = null;

let discordView = null;
let orgView = null;
let gameView = null;
let lastActiveTab = null;
let lastScreen = null;

const keysPressed = new Set();

function mountWorkspace() {
  shellEl.innerHTML = `
    <main id="workspace-content" class="flex-1 min-h-0 relative overflow-clip"></main>
    <nav id="bottom-nav" aria-label="Navigasi Utama" class="h-14 theme-app border-t border-white/[0.08] grid grid-cols-4 items-center shrink-0 z-30">
      <button type="button" id="btn-bottom-left-settings" aria-label="Pengaturan Game & Discord" class="nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer text-[#80848E] hover:text-[#B5BAC1]">
        ${svgIcons.settings}
        <span class="text-[11px] font-semibold">Setelan</span>
      </button>
      <button type="button" data-nav="discord" class="nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer">
        <span class="relative inline-flex items-center justify-center">
          ${svgIcons.discord}
          <span id="nav-discord-badge" class="hidden absolute -top-1.5 -right-3 px-1 min-w-[16px] h-4 rounded-full bg-[#DA373C] text-[10px] font-mono-num font-bold text-white flex items-center justify-center"></span>
        </span>
        <span class="text-[11px] font-semibold">Discord</span>
      </button>
      <button type="button" data-nav="org" class="nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer">
        ${svgIcons.org}
        <span class="text-[11px] font-semibold">Struktur</span>
      </button>
      <button type="button" data-nav="city" class="nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer">
        <span class="relative inline-flex items-center justify-center">
          ${svgIcons.city}
          <span id="nav-city-count" class="absolute -top-1 -right-3.5 text-[10px] font-mono-num font-bold text-[#23A55A]"></span>
        </span>
        <span class="text-[11px] font-semibold">Kota 2D</span>
      </button>
    </nav>
    <div id="modal-root"></div>
  `;

  workspaceContent = shellEl.querySelector('#workspace-content');
  bottomNavEl = shellEl.querySelector('#bottom-nav');
  modalRootEl = shellEl.querySelector('#modal-root');

  const settingsNavBtn = bottomNavEl.querySelector('#btn-bottom-left-settings');
  settingsNavBtn.addEventListener('click', () => {
    if (store.ui.settingsOpen) {
      store.closeSettings();
    } else {
      store.openSettings('theme');
    }
  });

  bottomNavEl.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setActiveTab(btn.dataset.nav);
    });
  });

  discordView = new DiscordView(workspaceContent, store);
  orgView = new OrgManagerView(workspaceContent, store);
  gameView = new GameView(workspaceContent, store);
  lastActiveTab = null;
}

function syncBottomNav() {
  if (!bottomNavEl) return;
  const { state, ui } = store;

  const settingsNavBtn = bottomNavEl.querySelector('#btn-bottom-left-settings');
  if (settingsNavBtn) {
    settingsNavBtn.className = `nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
      ui.settingsOpen ? 'text-[#F2F3F5] bg-white/[0.06]' : 'text-[#80848E] hover:text-[#B5BAC1]'
    }`;
  }

  bottomNavEl.querySelectorAll('[data-nav]').forEach((btn) => {
    const active = !ui.settingsOpen && btn.dataset.nav === ui.activeTab;
    btn.className = `nav-btn h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer relative ${
      active ? 'text-[#F2F3F5] bg-white/[0.04]' : 'text-[#80848E] hover:text-[#B5BAC1]'
    }`;
  });

  const mainUnread = Object.values(state.unreadByChannel || {}).reduce((a, b) => a + b, 0);
  const subUnread = (state.subServers || []).reduce(
    (sum, s) => sum + Object.values(s.unreadByChannel || {}).reduce((a, b) => a + b, 0),
    0
  );
  const totalUnread = mainUnread + subUnread;
  const badge = bottomNavEl.querySelector('#nav-discord-badge');
  if (totalUnread > 0 && ui.activeTab !== 'discord') {
    badge.textContent = String(totalUnread > 9 ? '9+' : totalUnread);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  const cityUnits = state.members.filter((m) => m.status === 'online-2d').length + 1;
  bottomNavEl.querySelector('#nav-city-count').textContent = `${cityUnits}`;
}

function syncUI(reason = 'state') {
  const { ui, state } = store;

  if (ui.screen === 'title') {
    if (lastScreen !== 'title') {
      if (gameView) gameView.destroy();
      lastScreen = 'title';
      lastActiveTab = null;
      shellEl.innerHTML = `<div id="title-root" class="h-full"></div>`;
      screenRoot = shellEl.querySelector('#title-root');
      renderTitleScreen(screenRoot, store);
    } else if (reason === 'full') {
      renderTitleScreen(screenRoot, store);
    }
    const titleModalRoot = screenRoot?.querySelector('#title-modal-root');
    if (titleModalRoot && (ui.settingsOpen || titleModalRoot.firstElementChild || reason === 'prefs' || reason === 'saves' || reason === 'ui')) {
      renderModals(titleModalRoot, store);
    }
    return;
  }

  if (lastScreen !== 'playing') {
    lastScreen = 'playing';
    mountWorkspace();
  }

  // Switch active tab view cleanly without destroying canvas unnecessarily
  if (lastActiveTab !== ui.activeTab) {
    if (lastActiveTab === 'city' && gameView) {
      gameView.destroy();
    }
    lastActiveTab = ui.activeTab;
    if (ui.activeTab === 'discord') {
      discordView.mount();
    } else if (ui.activeTab === 'org') {
      orgView.render();
    } else if (ui.activeTab === 'city') {
      gameView.mount();
    }
  } else {
    if (ui.activeTab === 'discord' && (reason !== 'saves' && (reason !== 'ui' || !ui.settingsOpen))) {
      discordView.update();
    } else if (ui.activeTab === 'org' && (reason === 'org' || reason === 'ui' || reason === 'full' || reason === 'sim-event')) {
      orgView.render(reason);
    } else if (ui.activeTab === 'city') {
      gameView.updateHud();
    }
  }

  syncBottomNav();

  if (
    (reason === 'ui' || reason === 'org' || reason === 'full' || reason === 'chat' || reason === 'prefs' || reason === 'saves') &&
    (ui.inspectedMemberId || ui.orgModalType || ui.settingsOpen || ui.managedSubServerId || modalRootEl?.firstElementChild)
  ) {
    renderModals(modalRootEl, store);
  }
}

// Subscribe store updates
store.subscribe((_state, _ui, reason) => {
  syncUI(reason);
});

// Keyboard shortcuts (WASD/Arrows for 2D patrol, Enter/Space for Title start, P to Pause/Resume)
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

  if (store.ui.screen === 'title' && !isTyping && !store.ui.settingsOpen && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    store.setScreen('playing');
    return;
  }

  if (isTyping) return;

  if (e.code === 'KeyP') {
    store.setSpeed(store.state.speed === 0 ? 1 : 0);
    return;
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
    keysPressed.add(e.code);
  }

  if (e.code === 'Space' && store.ui.screen === 'playing' && store.ui.activeTab === 'city') {
    e.preventDefault();
    const resolved = store.handleNearestIncident();
    if (resolved && gameView?.renderer) {
      gameView.renderer.emitBurst(resolved.x, resolved.y, resolved.color, 18);
    }
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed.delete(e.code);
});

window.addEventListener('blur', () => {
  keysPressed.clear();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) keysPressed.clear();
});

// Support ?autostart=1 URL param for instant gameplay entry
const params = new URLSearchParams(window.location.search);
soundFX.setMuted(store.state.muted);
if (params.get('autostart') === '1') {
  store.setScreen('playing');
} else {
  store.setScreen('title');
}

// 60Hz Custom Simulation & Render Loop
let lastTime = performance.now();
let lastClockMinute = '';
let hudThrottle = 0;

function frameLoop(now) {
  const rawDt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (store.ui.screen === 'playing') {
    const input =
      store.ui.activeTab === 'city' && gameView
        ? gameView.getInputVector(keysPressed)
        : { moveX: 0, moveY: 0 };

    const events = store.tick(rawDt, input);

    if (store.ui.activeTab === 'city' && gameView?.mounted) {
      for (const ev of events) {
        if (ev.type === 'INCIDENT_RESOLVED' && gameView.renderer) {
          gameView.renderer.emitBurst(ev.incident.x, ev.incident.y, ev.incident.color, 16);
        }
      }
      gameView.renderFrame(rawDt);
      hudThrottle += rawDt;
      if (hudThrottle >= 0.25) {
        hudThrottle = 0;
        gameView.updateHud();
      }
    }

    // Update Discord clock once per RP minute without re-rendering full feed
    const currentClock = formatSimClock(store.state.simSeconds);
    if (currentClock !== lastClockMinute) {
      lastClockMinute = currentClock;
      const clockEl = document.getElementById('discord-clock');
      if (clockEl) {
        const hour = Math.floor((store.state.simSeconds / 3600) % 24);
        const phaseTxt = hour >= 23 || hour < 5 ? 'Malam' : hour >= 17 ? 'Ramai' : hour < 11 ? 'Pagi' : 'Siang';
        clockEl.textContent = `${currentClock} · ${phaseTxt}`;
      }
    }
  }

  requestAnimationFrame(frameLoop);
}

requestAnimationFrame(frameLoop);
