import { SUB_ROLES } from '../../engine/constants.js';
import { escapeHtml } from '../icons.js';

export function renderStaffTab(state) {
  const tech = state.tech || { mapEfficiency: 100, systemHealth: 96, patchCounter: 1, lastPatchNote: '' };
  const staffMembers = state.members.filter((m) => Boolean(m.subRole));

  return `
    <div class="p-3 rounded-xl theme-surface border border-white/[0.06] space-y-2.5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-[#F2F3F5]">Kesehatan Mesin &amp; Map 2D</div>
          <div class="text-[11px] text-[#80848E]">Dikelola otomatis oleh Developer, Admin, &amp; Helper</div>
        </div>
        <button type="button" id="btn-manual-patch" class="px-3 py-1.5 rounded-lg theme-accent-btn text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer">
          Rilis Patch
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-1">
        <div class="p-2.5 rounded-lg bg-[#111214]">
          <div class="text-[10px] text-[#80848E]">Efisiensi Map 2D</div>
          <div class="text-base font-bold font-mono-num text-[#38BDF8]">${Math.round(tech.mapEfficiency)}%</div>
        </div>
        <div class="p-2.5 rounded-lg bg-[#111214]">
          <div class="text-[10px] text-[#80848E]">Stabilitas Sistem</div>
          <div class="text-base font-bold font-mono-num ${tech.systemHealth >= 80 ? 'text-[#23A55A]' : 'text-[#F0B232]'}">${Math.round(tech.systemHealth)}%</div>
        </div>
      </div>
      <p class="text-[11px] text-[#B5BAC1]">${escapeHtml(tech.lastPatchNote)}</p>
    </div>

    <div class="space-y-2">
      <div class="text-xs font-semibold text-[#B5BAC1]">Tim Pengelola Aktif (${staffMembers.length})</div>
      ${
        staffMembers.length === 0
          ? `<div class="p-3 rounded-xl theme-surface text-xs text-[#80848E]">Belum ada AI yang diberi Sub-Jabatan. Ketuk anggota di Discord untuk melantik Developer / Admin / Helper.</div>`
          : staffMembers
              .map((m) => {
                const sr = SUB_ROLES.find((s) => s.id === m.subRole);
                return `
                  <button type="button" data-open-staff="${m.id}" class="w-full p-3 rounded-xl theme-surface hover:brightness-110 border border-white/[0.06] flex items-center justify-between gap-2 text-left cursor-pointer">
                    <div class="min-w-0">
                      <div class="text-sm font-bold text-[#F2F3F5] truncate">${escapeHtml(m.icName)}</div>
                      <div class="text-[11px] text-[#80848E] truncate">${escapeHtml(sr?.effect || '')}</div>
                    </div>
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0" style="background:${sr?.color || '#5865F2'}25; color:#F2F3F5; border: 1px solid ${sr?.color || '#5865F2'}66;">
                      ${escapeHtml(m.subRole)}
                    </span>
                  </button>
                `;
              })
              .join('')
      }
    </div>
  `;
}
