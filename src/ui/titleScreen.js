import { policeCrestSvg, svgIcons } from './icons.js';
import { calculateServerAttractiveness } from '../engine/rules.js';

export function renderTitleScreen(container, store) {
  const { state } = store;
  const attractiveness = calculateServerAttractiveness(state).total;

  container.innerHTML = `
    <div class="relative flex flex-col justify-between h-full px-6 py-7 theme-app text-[#F2F3F5]">
      <div class="flex items-center justify-between text-xs text-[#80848E] font-mono-num">
        <span>REPUBLIK IZUMIYA</span>
        <span>${state.members.length} ANGGOTA TERDAFTAR</span>
      </div>

      <div class="flex flex-col items-center text-center my-auto py-3">
        <div class="mb-4">${policeCrestSvg('w-24 h-24')}</div>
        <h1 class="text-2xl font-extrabold tracking-tight text-[#F2F3F5] leading-snug max-w-[290px]" style="text-wrap: balance;">
          Kepolisian Republik Izumiya
        </h1>
        <p class="mt-2.5 text-sm text-[#B5BAC1] leading-relaxed max-w-[330px]" style="text-wrap: balance;">
          Bangun komunitas roleplay layaknya Discord, susun pangkat &amp; divisi agar AI-person betah, lalu patroli di kota 2D.
        </p>

        <div class="mt-5 w-full max-w-[300px] grid grid-cols-3 gap-2 py-3 px-3 rounded-xl theme-surface border border-white/[0.07]">
          <div class="text-center">
            <div class="text-base font-bold font-mono-num text-[#FACC15]">${state.ranks.length}</div>
            <div class="text-[11px] text-[#80848E]">Pangkat</div>
          </div>
          <div class="text-center border-x border-white/[0.07]">
            <div class="text-base font-bold font-mono-num text-[#38BDF8]">${state.divisions.length}</div>
            <div class="text-[11px] text-[#80848E]">Divisi</div>
          </div>
          <div class="text-center">
            <div class="text-base font-bold font-mono-num text-[#23A55A]">${attractiveness}%</div>
            <div class="text-[11px] text-[#80848E]">Daya Tarik</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          data-start="true"
          id="btn-start-sim"
          class="w-full min-h-[48px] rounded-xl theme-accent-btn active:scale-[0.98] text-white font-semibold text-sm transition-transform cursor-pointer shadow-lg"
        >
          Masuk ke Server &amp; Markas
        </button>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            id="btn-title-settings"
            class="min-h-[44px] px-3 rounded-xl theme-surface hover:bg-[#2B2D31] text-[#F2F3F5] font-semibold text-xs border border-white/[0.08] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ${svgIcons.settings}
            <span>Pengaturan</span>
          </button>
          <button
            type="button"
            id="btn-reset-save"
            class="min-h-[44px] px-3 rounded-xl theme-surface hover:bg-[#2B2D31] text-[#B5BAC1] font-medium text-xs border border-white/[0.07] cursor-pointer"
          >
            Reset Data Awal
          </button>
        </div>

        <p class="text-center text-[11px] text-[#80848E] pt-0.5">
          Mode Ponsel · Custom Engine &amp; AI · Tekan Enter untuk mulai
        </p>
      </div>
      <div id="title-modal-root"></div>
    </div>
  `;

  const startBtn = container.querySelector('#btn-start-sim');
  startBtn.addEventListener('click', () => {
    startBtn.blur();
    store.setScreen('playing');
  });

  const settingsBtn = container.querySelector('#btn-title-settings');
  settingsBtn.addEventListener('click', () => {
    store.openSettings('theme');
  });

  const resetBtn = container.querySelector('#btn-reset-save');
  resetBtn.addEventListener('click', () => {
    store.resetSimulation();
    store.setScreen('playing');
  });
}
