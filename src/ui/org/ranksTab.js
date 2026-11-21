import { PERMISSION_DEFINITIONS, RANK_EXPANSION_POOL } from '../../engine/constants.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function renderRanksTab(state, ui) {
  const sorted = [...state.ranks].sort((a, b) => b.order - a.order);
  const nonOwner = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const topNonOwner = nonOwner[nonOwner.length - 1];
  const hasJenderal = nonOwner.some((r) => /jenderal/i.test(r.name) && !/brigjen|irjen|komjen/i.test(r.name));
  const fullLadderTotal = 6 + RANK_EXPANSION_POOL.length;

  return `
    <div class="flex items-center justify-between">
      <span class="text-xs text-[#80848E]">Hierarki kepangkatan (${state.ranks.length})</span>
      <button type="button" id="btn-add-rank" class="min-h-[36px] px-3 rounded-lg theme-accent-btn text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
        ${svgIcons.plus}
        <span>Buat Pangkat</span>
      </button>
    </div>
    <div class="px-2.5 py-2 rounded-xl theme-surface border border-white/[0.06] flex items-center justify-between gap-2 text-[11px]">
      <div class="min-w-0">
        <span class="text-[#80848E]">Puncak Saat Ini:</span>
        <strong class="ml-1" style="color:${topNonOwner?.color || '#FACC15'}">${escapeHtml(topNonOwner?.name || 'Taruna')}</strong>
      </div>
      <span class="font-mono-num shrink-0 px-1.5 py-0.5 rounded ${hasJenderal ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#F59E0B]/15 text-[#FCD34D]'}">
        ${hasJenderal ? 'Lengkap Taruna–Jenderal 4★' : `${nonOwner.length}/${fullLadderTotal} Jenjang`}
      </span>
    </div>
    <div class="space-y-1.5">
      ${sorted
        .map((r) => {
          const count = r.isOwner ? 1 : state.members.filter((m) => m.rankId === r.id).length;
          const activePerms = PERMISSION_DEFINITIONS.filter((p) => Boolean(r.permissions?.[p.key]));
          const isExpanded = ui.expandedRankId === r.id;
          return `
            <div class="rounded-xl theme-surface border border-white/[0.06] overflow-hidden">
              <div class="p-2.5 flex items-center justify-between gap-2">
                <button type="button" data-expand-rank="${r.id}" class="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
                  <span class="collapse-chevron text-[#80848E] shrink-0 ${isExpanded ? 'open' : ''}">${svgIcons.chevronRight}</span>
                  <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${r.color}"></span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(r.name)}</span>
                      <span class="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-[#111214] text-[#93C5FD] shrink-0">${activePerms.length} Izin</span>
                    </div>
                    <div class="text-[10.5px] text-[#80848E] font-mono-num truncate">
                      ${r.isOwner ? 'Pimpinan Tertinggi · Otoritas Penuh' : `Syarat ${r.minXp} XP · ${count} Personel`}
                    </div>
                  </div>
                </button>
                ${
                  r.isOwner
                    ? `<span class="text-[11px] font-semibold text-[#D4A024] shrink-0">Owner</span>`
                    : `<button type="button" data-del-rank="${r.id}" aria-label="Hapus pangkat ${escapeHtml(r.name)}" class="w-8 h-8 flex items-center justify-center text-[#80848E] hover:text-[#DA373C] cursor-pointer shrink-0">${svgIcons.trash}</button>`
                }
              </div>
              ${
                isExpanded
                  ? `<div class="px-3 pb-2.5 pt-1.5 border-t border-white/[0.05] bg-black/25 space-y-2">
                       <div class="flex flex-wrap gap-1">
                         ${
                           activePerms.length === 0
                             ? `<span class="text-[10.5px] text-[#80848E]">Belum ada wewenang role khusus.</span>`
                             : activePerms
                                 .map(
                                   (p) =>
                                     `<span class="text-[10px] px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#C7D2FE]">${escapeHtml(p.label)}</span>`
                                 )
                                 .join('')
                         }
                       </div>
                       ${
                         r.isOwner
                           ? ''
                           : `<button type="button" data-jump-authority="rank:${r.id}" class="text-[11px] font-semibold text-[#38BDF8] hover:underline cursor-pointer">
                                Kelola Wewenang Role di Tree Otoritas →
                              </button>`
                       }
                     </div>`
                  : ''
              }
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}
