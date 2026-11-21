import { THEME_PRESETS } from '../../engine/constants.js';
import { escapeHtml, svgIcons } from '../icons.js';

function renderPrefToggle(id, label, desc, checked) {
  return `
    <button
      type="button"
      data-pref-toggle="${id}"
      data-pref-val="${checked ? '0' : '1'}"
      aria-pressed="${checked}"
      class="w-full p-2.5 rounded-xl bg-[#111214] border ${checked ? 'border-[#23A55A]/45' : 'border-white/[0.06]'} flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-[#16181C]"
    >
      <div class="min-w-0">
        <div class="text-xs font-bold text-[#F2F3F5]">${escapeHtml(label)}</div>
        <div class="text-[10.5px] text-[#80848E] leading-snug">${escapeHtml(desc)}</div>
      </div>
      <span class="px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 ${
        checked ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#2B2D31] text-[#B5BAC1]'
      }">
        ${checked ? 'AKTIF' : 'NONAKTIF'}
      </span>
    </button>
  `;
}

export function buildSettingsModal(store) {
  const { state, prefs, ui } = store;
  const activeTab = ['theme', 'prefs', 'saves'].includes(ui.settingsTab) ? ui.settingsTab : 'theme';
  const slots = store.listManualSaves();
  const notice = ui.saveNotice;

  let bodyHtml = '';
  if (activeTab === 'theme') {
    bodyHtml = `
      <div class="text-[11px] text-[#B5BAC1] leading-snug">
        Pilih preset warna &amp; gradasi untuk seluruh antarmuka Discord, panel struktur, dan HUD Kota 2D secara instan.
      </div>
      <div class="grid grid-cols-1 gap-2" data-testid="theme-presets-grid">
        ${THEME_PRESETS.map((preset) => {
          const active = prefs.themeId === preset.id;
          return `
            <button
              type="button"
              data-theme-preset="${preset.id}"
              aria-pressed="${active}"
              class="w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                active
                  ? 'bg-white/[0.07] border-[var(--accent-blurple)] ring-1 ring-[var(--accent-blurple)]'
                  : 'bg-[#111214] border-white/[0.07] hover:bg-white/[0.04]'
              }"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="min-w-0">
                  <div class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(preset.name)}</div>
                  <div class="text-[10.5px] text-[#80848E] truncate">${escapeHtml(preset.subtitle)}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  ${preset.swatches
                    .map(
                      (sw) =>
                        `<span class="w-4 h-4 rounded-full border border-white/25" style="background:${sw}"></span>`
                    )
                    .join('')}
                  ${active ? `<span class="text-[#4ADE80] ml-1">${svgIcons.check}</span>` : ''}
                </div>
              </div>
              <div class="h-2 w-full rounded-full overflow-hidden border border-white/10" style="background:${preset.vars['--accent-gradient']}"></div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  } else if (activeTab === 'prefs') {
    bodyHtml = `
      <div class="space-y-2">
        <div class="text-[10px] font-bold tracking-wider uppercase text-[#80848E]">DISCORD &amp; TAMPILAN CHAT</div>
        ${renderPrefToggle('compactChat', 'Mode Chat Padat (Compact)', 'Rapatkan jarak pesan Discord agar muat lebih banyak riwayat di layar ponsel.', prefs.compactChat)}
        ${renderPrefToggle('showTimestamps', 'Tampilkan Jam Pesan', 'Tampilkan stempel waktu simulasi di header setiap pesan AI.', prefs.showTimestamps)}
        ${renderPrefToggle('autoScrollChat', 'Auto-Scroll Pesan Baru', 'Otomatis gulir ke pesan terbaru saat berada di bawah feed.', prefs.autoScrollChat)}
      </div>

      <div class="space-y-2 pt-1">
        <div class="text-[10px] font-bold tracking-wider uppercase text-[#80848E]">KOTA 2D, RENDER &amp; AUDIO</div>
        ${renderPrefToggle('showMinimap', 'Radar Minimap Kota 2D', 'Tampilkan radar minimap posisi Kapolda, unit patroli, dan TKP di pojok kanan.', prefs.showMinimap)}
        ${renderPrefToggle('showNameTags', 'Tag Nama Personel 2D', 'Tampilkan label callsign & pangkat personel di atas karakter pada peta.', prefs.showNameTags)}
        ${renderPrefToggle('showNightLighting', 'Efek Cahaya Malam &amp; Lampu Jalan', 'Aktifkan atmosfer malam dinamis beserta sorot lampu patroli.', prefs.showNightLighting)}
        <button
          type="button"
          id="btn-pref-toggle-mute"
          class="w-full p-2.5 rounded-xl bg-[#111214] border border-white/[0.06] flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div class="text-xs font-bold text-[#F2F3F5]">Efek Suara &amp; Sirine</div>
            <div class="text-[10.5px] text-[#80848E]">Web Audio synth (tap, notif pesan, sirine, pelantikan)</div>
          </div>
          <span class="px-2.5 py-1 rounded-lg text-[10.5px] font-bold ${state.muted ? 'bg-[#DA373C]/20 text-[#FCA5A5]' : 'bg-[#23A55A]/20 text-[#4ADE80]'}">
            ${state.muted ? 'BISU' : 'NYALA'}
          </span>
        </button>
      </div>

      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-[#F2F3F5]">Kecepatan Default Awal</span>
          <div class="flex items-center gap-1" role="group" aria-label="Kecepatan Default">
            ${[0, 1, 2]
              .map(
                (sp) => `
                  <button
                    type="button"
                    data-default-speed="${sp}"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-bold cursor-pointer ${
                      prefs.defaultSpeed === sp ? 'theme-accent-btn' : 'bg-[#1E1F22] text-[#B5BAC1]'
                    }"
                  >
                    ${sp === 0 ? 'II' : `${sp}X`}
                  </button>
                `
              )
              .join('')}
          </div>
        </div>
      </div>

      <details class="rounded-xl bg-[#111214] border border-[#DA373C]/35 overflow-hidden">
        <summary class="px-3 py-2.5 text-xs font-bold text-[#FCA5A5] cursor-pointer flex items-center justify-between">
          <span>Reset Total Server ke Kondisi Awal</span>
          <span class="text-[10px] font-normal">Buka Konfirmasi</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] space-y-2">
          <p class="text-[11px] text-[#B5BAC1] leading-snug">
            Menghapus progres berjalan dan memulai server Kepolisian Republik Izumiya dari awal. Slot simpanan manual Anda tetap aman.
          </p>
          <button type="button" id="btn-confirm-reset-sim" class="w-full min-h-[38px] rounded-lg bg-[#DA373C] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer">
            Konfirmasi Reset Server Sekarang
          </button>
        </div>
      </details>
    `;
  } else {
    bodyHtml = `
      ${
        notice
          ? `<div data-testid="save-status-banner" class="p-2.5 rounded-xl border text-xs font-semibold ${
              notice.ok
                ? 'bg-[#23A55A]/15 border-[#23A55A]/50 text-[#4ADE80]'
                : 'bg-[#DA373C]/15 border-[#DA373C]/50 text-[#FCA5A5]'
            }">
               ${escapeHtml(notice.message)}
             </div>`
          : ''
      }

      <!-- Create Named Manual Save Slot -->
      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.07] space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold tracking-wider uppercase text-[#FACC15]">SIMPAN MANUAL FLEKSIBEL</span>
          <span class="text-[10px] text-[#80848E] font-mono-num">Anti-Corrupt FNV-1a</span>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="inp-save-slot-name"
            type="text"
            maxlength="48"
            placeholder="Contoh: Pra-Operasi Malam / Minggu ke-2"
            class="flex-1 min-h-[40px] px-3 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5] placeholder-[#80848E]"
          />
          <button type="button" id="btn-create-manual-save" class="min-h-[40px] px-3 rounded-lg theme-accent-btn text-xs font-bold whitespace-nowrap cursor-pointer">
            Simpan Baru
          </button>
        </div>
      </div>

      <!-- Saved Manual Slots -->
      <div class="space-y-1.5" data-testid="manual-save-slots">
        <div class="flex items-center justify-between px-0.5">
          <span class="text-[10.5px] font-bold tracking-wider text-[#B5BAC1]">DAFTAR SLOT SIMPANAN (${slots.length}/8)</span>
          <span class="text-[10px] text-[#80848E]">Validasi Checksum Otomatis</span>
        </div>
        ${
          slots.length === 0
            ? `<div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] text-xs text-[#80848E]">Belum ada slot simpanan manual. Buat simpanan baru atau ekspor ke file .json.</div>`
            : slots
                .map((slot) => {
                  const env = slot.envelope;
                  const sum = env.summary || {};
                  const timeStr = new Date(slot.updatedAt || env.savedAt).toLocaleString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  });
                  return `
                    <div class="p-2.5 rounded-xl bg-[#111214] border ${slot.integrityOk ? 'border-white/[0.07]' : 'border-[#DA373C]/60'} space-y-2" data-slot-card="${slot.id}">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(env.slotName)}</span>
                            <span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              slot.integrityOk ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#DA373C]/20 text-[#FCA5A5]'
                            }">
                              ${slot.integrityOk ? '✓ Valid' : '✕ Korup'}
                            </span>
                          </div>
                          <div class="text-[10.5px] text-[#80848E] font-mono-num truncate mt-0.5">
                            ${sum.memberCount ?? 0} Anggota · ${sum.divisionCount ?? 0} Divisi · ${sum.reputation ?? 0} Rep · ${escapeHtml(sum.clock || '--:--')} · ${escapeHtml(timeStr)}
                          </div>
                        </div>
                      </div>
                      <div class="grid grid-cols-3 gap-1.5">
                        <button type="button" data-load-slot="${slot.id}" class="min-h-[32px] px-2 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-[11px] font-bold cursor-pointer">
                          Muat
                        </button>
                        <button type="button" data-overwrite-slot="${slot.id}" data-slot-label="${escapeHtml(env.slotName)}" class="min-h-[32px] px-2 rounded-lg bg-[#2B2D31] hover:bg-[#35373C] text-[#F2F3F5] text-[11px] font-semibold cursor-pointer">
                          Timpa
                        </button>
                        <button type="button" data-delete-slot="${slot.id}" class="min-h-[32px] px-2 rounded-lg bg-[#DA373C]/15 border border-[#DA373C]/40 text-[#FCA5A5] text-[11px] font-semibold cursor-pointer">
                          Hapus
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>

      <!-- JSON File Export & Flexible Restore -->
      <details class="rounded-xl bg-[#111214] border border-white/[0.06] overflow-hidden">
        <summary class="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03]">
          <span class="text-[11px] font-bold tracking-wide text-[#93C5FD]">EKSPOR / IMPOR FILE BACKUP (.JSON)</span>
          <span class="text-[10px] text-[#80848E]">Portabel</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="btn-export-save-json" class="min-h-[38px] px-2.5 rounded-lg bg-[#1E1F22] hover:bg-[#2B2D31] border border-white/10 text-xs font-semibold text-[#F2F3F5] inline-flex items-center justify-center gap-1.5 cursor-pointer">
              ${svgIcons.download}
              <span>Unduh .JSON</span>
            </button>
            <label for="inp-import-save-file" class="min-h-[38px] px-2.5 rounded-lg bg-[#1E1F22] hover:bg-[#2B2D31] border border-white/10 text-xs font-semibold text-[#F2F3F5] inline-flex items-center justify-center gap-1.5 cursor-pointer">
              ${svgIcons.upload}
              <span>Pilih File .JSON</span>
            </label>
            <input id="inp-import-save-file" type="file" accept=".json,application/json" class="sr-only" />
          </div>
          <div>
            <label for="inp-paste-save-json" class="block text-[10.5px] font-semibold text-[#B5BAC1] mb-1">Atau Tempel JSON Save untuk Verifikasi &amp; Muat</label>
            <textarea id="inp-paste-save-json" rows="3" placeholder='{"format":"IZUMIYA_SAVE_V2",...}' class="w-full p-2 rounded-lg bg-[#1E1F22] border border-white/10 text-[11px] font-mono-num text-[#DBDEE1]"></textarea>
            <button type="button" id="btn-load-paste-json" class="mt-1.5 w-full min-h-[36px] rounded-lg theme-accent-btn text-xs font-bold cursor-pointer">
              Validasi Checksum &amp; Muat JSON
            </button>
          </div>
        </div>
      </details>
    `;
  }

  return `
    <div class="relative px-4 py-3 shrink-0 theme-header-grad border-b border-white/[0.08] flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-[#FACC15] shrink-0">${svgIcons.settings}</span>
        <div class="min-w-0">
          <h2 class="text-sm font-extrabold text-[#F2F3F5] truncate">Pengaturan Game &amp; Discord</h2>
          <div class="text-[10.5px] text-[#80848E] truncate">Tema Gradasi, Preferensi, &amp; Save/Load Anti-Corrupt</div>
        </div>
      </div>
      <button type="button" id="btn-close-sheet" aria-label="Tutup pengaturan" class="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center cursor-pointer shrink-0">
        ${svgIcons.close}
      </button>
    </div>

    <div class="px-4 pt-2.5 pb-1.5 shrink-0">
      <div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#111214] border border-white/[0.06]" role="tablist" aria-label="Kategori Pengaturan">
        <button type="button" data-settings-tab="theme" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'theme' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Tema &amp; Warna
        </button>
        <button type="button" data-settings-tab="prefs" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'prefs' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Preferensi
        </button>
        <button type="button" data-settings-tab="saves" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'saves' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Save &amp; Load
        </button>
      </div>
    </div>

    <div class="scroll-y-thin flex-1 px-4 pb-5 pt-1.5 space-y-2.5">
      ${bodyHtml}
    </div>
  `;
}

export function wireSettingsModalHandlers(container, store) {
  container.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    btn.addEventListener('click', () => store.setSettingsTab(btn.dataset.settingsTab));
  });

  container.querySelectorAll('[data-theme-preset]').forEach((btn) => {
    btn.addEventListener('click', () => store.setThemePreset(btn.dataset.themePreset));
  });

  container.querySelectorAll('[data-pref-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.updatePrefs({ [btn.dataset.prefToggle]: btn.dataset.prefVal === '1' });
    });
  });

  const muteBtn = container.querySelector('#btn-pref-toggle-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      store.toggleMute();
      store.emit('prefs');
    });
  }

  container.querySelectorAll('[data-default-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sp = Number(btn.dataset.defaultSpeed);
      store.updatePrefs({ defaultSpeed: sp });
      store.setSpeed(sp);
    });
  });

  const resetBtn = container.querySelector('#btn-confirm-reset-sim');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      store.resetSimulation();
    });
  }

  const createSaveBtn = container.querySelector('#btn-create-manual-save');
  if (createSaveBtn) {
    createSaveBtn.addEventListener('click', () => {
      const nameInp = container.querySelector('#inp-save-slot-name');
      const name = (nameInp?.value || '').trim() || `Simpanan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      store.saveManualSlot(name);
    });
  }

  container.querySelectorAll('[data-load-slot]').forEach((btn) => {
    btn.addEventListener('click', () => store.loadManualSlot(btn.dataset.loadSlot));
  });

  container.querySelectorAll('[data-overwrite-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.saveManualSlot(btn.dataset.slotLabel || 'Simpanan Manual', btn.dataset.overwriteSlot);
    });
  });

  container.querySelectorAll('[data-delete-slot]').forEach((btn) => {
    btn.addEventListener('click', () => store.deleteManualSlot(btn.dataset.deleteSlot));
  });

  const exportBtn = container.querySelector('#btn-export-save-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const slotName = (container.querySelector('#inp-save-slot-name')?.value || '').trim() || 'Izumiya-Backup';
      const jsonStr = store.exportManualSaveJson(slotName);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slotName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      store.ui.saveNotice = { ok: true, message: 'File backup .json berhasil dibuat dan diunduh.' };
      store.emit('saves');
    });
  }

  const fileInput = container.querySelector('#inp-import-save-file');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        store.importManualSaveJson(String(reader.result || ''));
      };
      reader.readAsText(file);
    });
  }

  const pasteLoadBtn = container.querySelector('#btn-load-paste-json');
  if (pasteLoadBtn) {
    pasteLoadBtn.addEventListener('click', () => {
      const raw = container.querySelector('#inp-paste-save-json')?.value || '';
      store.importManualSaveJson(raw);
    });
  }
}
