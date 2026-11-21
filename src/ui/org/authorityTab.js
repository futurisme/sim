import { ASSIGNMENT_TYPES, AUTHORITY_CATEGORIES, PERMISSION_DEFINITIONS } from '../../engine/constants.js';
import { getDivisionDutyProfile, getRankById } from '../../engine/rules.js';
import { escapeHtml, svgIcons } from '../icons.js';

function renderDelegationRouter(state, sortedBillets, delegations) {
  return `
    <div class="p-3 rounded-xl theme-surface border border-[#EAB308]/30 space-y-2.5" data-testid="authority-delegation-panel">
      <div>
        <div class="text-xs font-bold text-[#FACC15]">Pengalihan Otoritas ke Jabatan</div>
        <p class="text-[11px] text-[#B5BAC1] leading-snug mt-0.5">
          Jika otoritas dialihkan ke Jabatan tertentu, izin dari Role Pangkat &amp; Divisi otomatis dinonaktifkan agar wewenang terpusat khusus pada pejabat tersebut.
        </p>
      </div>
      <div class="space-y-1.5">
        ${PERMISSION_DEFINITIONS.map((p) => {
          const targetBilletId = delegations[p.key] || '';
          return `
            <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.06] flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-xs font-semibold text-[#F2F3F5] truncate">${escapeHtml(p.label)}</div>
                <div class="text-[10px] text-[#80848E] truncate">${escapeHtml(p.category)}</div>
              </div>
              <select
                data-delegate-perm="${p.key}"
                aria-label="Alihkan otoritas ${escapeHtml(p.label)}"
                class="min-h-[32px] max-w-[155px] px-2 rounded-lg bg-[#1E1F22] border ${targetBilletId ? 'border-[#EAB308]/60 text-[#FACC15]' : 'border-white/10 text-[#DBDEE1]'} text-[11px] font-semibold"
              >
                <option value="">Umum (Role/Divisi/Jabatan)</option>
                ${sortedBillets
                  .map(
                    (b) =>
                      `<option value="${b.id}" ${targetBilletId === b.id ? 'selected' : ''}>Khusus: ${escapeHtml(b.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderFocusedAuthorityEditor(state, ui, sel, nodeObj, activePermCount, delegations) {
  if (!nodeObj) return '';
  const kindLabel = sel.kind === 'billet' ? 'JABATAN' : sel.kind === 'rank' ? 'ROLE PANGKAT' : 'DIVISI';
  const perms = nodeObj.permissions || {};
  const collapsedGroups = ui.collapsedPermGroups || {};

  let metaPanel = '';
  if (sel.kind === 'billet') {
    const holder = nodeObj.holderId ? state.members.find((m) => m.id === nodeObj.holderId) : null;
    const holderRank = holder ? getRankById(state, holder.rankId) : null;
    const hLevel = nodeObj.hierarchyOrder ?? 40;
    metaPanel = `
      <div class="p-2.5 rounded-lg bg-[#111214] border border-white/[0.05] space-y-2" data-billet-card="${nodeObj.id}">
        <div class="flex items-center justify-between text-[11px]">
          <label for="slider-${nodeObj.id}" class="font-semibold text-[#B5BAC1]">Level Hierarki Jabatan</label>
          <span data-hierarchy-label="${nodeObj.id}" class="font-mono-num font-bold text-[#FACC15]">${hLevel} / 99</span>
        </div>
        <input
          id="slider-${nodeObj.id}"
          type="range"
          min="1"
          max="99"
          value="${hLevel}"
          data-hierarchy-slider="${nodeObj.id}"
          aria-label="Atur hierarki ${escapeHtml(nodeObj.name)}"
          class="w-full h-2 rounded-lg accent-[#5865F2] cursor-pointer"
        />
        <div class="pt-1 flex items-center justify-between gap-2">
          <span class="text-xs text-[#B5BAC1] truncate">
            ${holder ? `${escapeHtml(holderRank.name)} ${escapeHtml(holder.icName)}` : 'Belum ada pejabat'}
          </span>
          <select data-assign-billet="${nodeObj.id}" aria-label="Pilih pejabat untuk ${escapeHtml(nodeObj.name)}" class="min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
            <option value="">-- Lantik AI --</option>
            ${state.members
              .map(
                (m) =>
                  `<option value="${m.id}" ${nodeObj.holderId === m.id ? 'selected' : ''}>${escapeHtml(m.icName)} (Prof ${m.personality?.professionalism ?? 60}%)</option>`
              )
              .join('')}
          </select>
        </div>
      </div>
    `;
  } else if (sel.kind === 'division') {
    const dp = getDivisionDutyProfile(nodeObj);
    metaPanel = `
      <div class="space-y-2">
        <div class="p-2.5 rounded-lg bg-[#111214] border border-white/[0.05] flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs font-semibold text-[#F2F3F5]">Akses Gerbang Penjaga Propam</div>
            <div class="text-[10.5px] text-[#80848E] truncate">Izinkan satuan melintas saat Gerbang Mabes dikunci</div>
          </div>
          <button
            type="button"
            data-toggle-div-gate-node="${nodeObj.id}"
            data-gate-val="${nodeObj.gateClearance !== false ? '0' : '1'}"
            class="min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold border shrink-0 cursor-pointer ${
              nodeObj.gateClearance !== false
                ? 'bg-[#10B981]/20 border-[#10B981]/60 text-[#6EE7B7]'
                : 'bg-[#1E1F22] border-white/10 text-[#FCD34D]'
            }"
          >
            ${nodeObj.gateClearance !== false ? '✓ Diizinkan' : '× Diblokir'}
          </button>
        </div>
        <div class="p-2.5 rounded-lg bg-[#111214] border border-white/[0.05] grid grid-cols-2 gap-2">
          <div>
            <div class="text-[10px] text-[#80848E] mb-1">Kuota Personel</div>
            <div class="flex items-center gap-1">
              <button type="button" data-div-quota-dec="${nodeObj.id}" class="w-7 h-7 rounded bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">-</button>
              <input type="number" min="1" max="50" value="${nodeObj.quota}" data-div-quota-input="${nodeObj.id}" class="w-12 h-7 px-1 text-center rounded bg-[#1E1F22] border border-white/10 text-xs font-mono-num text-[#F2F3F5]" />
              <button type="button" data-div-quota-inc="${nodeObj.id}" class="w-7 h-7 rounded bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">+</button>
            </div>
          </div>
          <div>
            <div class="text-[10px] text-[#80848E] mb-1">Penugasan Harian</div>
            <select data-div-duty-type="${nodeObj.id}" class="w-full h-7 px-1.5 rounded bg-[#1E1F22] border border-white/10 text-[10.5px] font-semibold text-[#F2F3F5]">
              ${Object.values(ASSIGNMENT_TYPES)
                .map(
                  (at) =>
                    `<option value="${at.id}" ${dp.assignmentType === at.id ? 'selected' : ''}>${escapeHtml(at.shortLabel)}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  } else {
    metaPanel = `
      <div class="p-2.5 rounded-lg bg-[#111214] border border-white/[0.05] text-[11px] text-[#B5BAC1] flex items-center justify-between">
        <span>Syarat XP Kenaikan: <strong class="font-mono-num text-[#F2F3F5]">${nodeObj.minXp} XP</strong></span>
        <span>Gaji Pokok: <strong class="font-mono-num text-[#23A55A]">${nodeObj.salary}</strong></span>
      </div>
    `;
  }

  return `
    <div class="p-3 rounded-xl theme-surface border border-white/[0.07] space-y-2.5" data-testid="authority-node-editor">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#5865F2]/25 text-[#C7D2FE]">${kindLabel}</span>
            <span class="text-sm font-bold truncate" style="color:${nodeObj.color || '#F2F3F5'}">${escapeHtml(nodeObj.name)}</span>
          </div>
          <div class="text-[11px] text-[#80848E] truncate mt-0.5">${escapeHtml(nodeObj.description || nodeObj.duty || 'Konfigurasi izin khusus node terpilih')}</div>
        </div>
        <span class="text-xs font-mono-num font-bold text-[#4ADE80] shrink-0">${activePermCount}/${PERMISSION_DEFINITIONS.length}</span>
      </div>

      ${metaPanel}

      <div class="space-y-1.5">
        ${AUTHORITY_CATEGORIES.map((cat) => {
          const catPerms = PERMISSION_DEFINITIONS.filter((p) => p.category === cat.id);
          const enabledInCat = catPerms.filter((p) => Boolean(perms[p.key])).length;
          const isCollapsed = Boolean(collapsedGroups[cat.id]);
          return `
            <div class="rounded-lg bg-[#111214] border border-white/[0.06] overflow-hidden">
              <button
                type="button"
                data-toggle-perm-group="${cat.id}"
                class="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-white/[0.03] cursor-pointer"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="collapse-chevron shrink-0 ${isCollapsed ? '' : 'open'}" style="color:${cat.color}">${svgIcons.chevronRight}</span>
                  <span class="text-[11px] font-bold text-[#F2F3F5] truncate">${escapeHtml(cat.label)}</span>
                </div>
                <span class="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-white/[0.07] text-[#B5BAC1] shrink-0">${enabledInCat}/${catPerms.length}</span>
              </button>
              ${
                isCollapsed
                  ? ''
                  : `<div class="px-2 pb-2 pt-1 grid grid-cols-2 gap-1.5 border-t border-white/[0.04]">
                       ${catPerms
                         .map((p) => {
                           const enabled = Boolean(perms[p.key]);
                           const delegatedTo = delegations[p.key] || null;
                           const isRoutedElsewhere = delegatedTo && (sel.kind !== 'billet' || sel.id !== delegatedTo);
                           const delBillet = delegatedTo ? state.billets.find((b) => b.id === delegatedTo) : null;
                           return `
                             <button
                               type="button"
                               data-node-perm="${sel.kind}:${sel.id}:${p.key}:${enabled ? '0' : '1'}"
                               title="${escapeHtml(p.desc)}"
                               class="min-h-[34px] px-2 py-1 rounded-lg text-[10.5px] font-semibold border text-left cursor-pointer ${
                                 isRoutedElsewhere
                                   ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FCD34D]'
                                   : enabled
                                     ? 'bg-[#23A55A]/20 border-[#23A55A]/60 text-[#4ADE80]'
                                     : 'bg-[#18191C] border-white/10 text-[#80848E]'
                               }"
                             >
                               <div class="truncate">${isRoutedElsewhere ? '↪ ' : enabled ? '✓ ' : ''}${escapeHtml(p.label)}</div>
                               ${isRoutedElsewhere ? `<div class="text-[9px] truncate opacity-80">Ke: ${escapeHtml(delBillet?.name || 'Jabatan')}</div>` : ''}
                             </button>
                           `;
                         })
                         .join('')}
                     </div>`
              }
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function renderAuthorityWorkspace(state, ui) {
  const sortedBillets = [...state.billets].sort(
    (a, b) => (b.hierarchyOrder ?? 40) - (a.hierarchyOrder ?? 40)
  );
  const nonOwnerRanks = [...state.ranks].filter((r) => !r.isOwner).sort((a, b) => b.order - a.order);
  const divisions = state.divisions || [];
  const delegations = state.authorityDelegations || {};
  const delegatedCount = Object.values(delegations).filter(Boolean).length;
  const gateOpen = state.mabesSecurity?.gateOpen !== false;
  const detainees = state.members.filter((m) => (m.detainedRemaining || 0) > 0).length;

  let sel = ui.selectedAuthorityNode || { kind: 'billet', id: sortedBillets[0]?.id };
  let nodeObj = null;
  if (sel.kind === 'billet') {
    nodeObj = sortedBillets.find((b) => b.id === sel.id) || sortedBillets[0];
    if (nodeObj) sel = { kind: 'billet', id: nodeObj.id };
  } else if (sel.kind === 'rank') {
    nodeObj = nonOwnerRanks.find((r) => r.id === sel.id) || nonOwnerRanks[0];
    if (nodeObj) sel = { kind: 'rank', id: nodeObj.id };
  } else if (sel.kind === 'division') {
    nodeObj = divisions.find((d) => d.id === sel.id) || divisions[0];
    if (nodeObj) sel = { kind: 'division', id: nodeObj.id };
  }
  if (!nodeObj && sortedBillets[0]) {
    sel = { kind: 'billet', id: sortedBillets[0].id };
    nodeObj = sortedBillets[0];
  }

  const nodePerms = nodeObj?.permissions || {};
  const activePermCount = PERMISSION_DEFINITIONS.filter((p) => Boolean(nodePerms[p.key])).length;
  const treeOpen = ui.authorityTreeOpen !== false;
  const mode = ui.authoritySubMode === 'delegation' ? 'delegation' : 'editor';

  const treeBranch = (title, accentColor, items, kind) => `
    <div class="space-y-1">
      <div class="text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5" style="color:${accentColor}">
        <span class="w-1.5 h-1.5 rounded-full" style="background:${accentColor}"></span>
        <span>${escapeHtml(title)} (${items.length})</span>
      </div>
      <div class="border-l border-white/15 pl-2.5 ml-1 space-y-1">
        ${items
          .map((item) => {
            const isSelected = sel.kind === kind && sel.id === item.id;
            const pCount = PERMISSION_DEFINITIONS.filter((p) => Boolean(item.permissions?.[p.key])).length;
            const subBadge =
              kind === 'billet'
                ? `LV.${item.hierarchyOrder ?? 40}${item.holderId ? ' · Aktif' : ''}`
                : kind === 'rank'
                  ? `${item.minXp} XP`
                  : `${item.callsign}${item.gateClearance !== false ? ' · Gerbang' : ''}`;
            return `
              <button
                type="button"
                data-auth-node="${kind}:${item.id}"
                class="w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#5865F2]/25 border-[#5865F2] text-white'
                    : 'bg-[#111214] border-white/[0.06] text-[#DBDEE1] hover:bg-[#1B1D22]'
                }"
              >
                <div class="min-w-0 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-sm shrink-0" style="background:${item.color || accentColor}"></span>
                  <span class="text-xs font-semibold truncate">${escapeHtml(item.name)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 text-[10px] font-mono-num">
                  <span class="text-[#80848E]">${escapeHtml(subBadge)}</span>
                  <span class="px-1.5 py-0.2 rounded bg-white/[0.07] text-[#F2F3F5] font-bold">${pCount}</span>
                </div>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;

  return `
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-[#80848E]">Otoritas Terpisah (${AUTHORITY_CATEGORIES.length} Kategori · ${PERMISSION_DEFINITIONS.length} Izin Role)</span>
      <button type="button" id="btn-add-billet" class="min-h-[36px] px-3 rounded-lg theme-accent-btn text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer">
        ${svgIcons.plus}
        <span>Buat Jabatan</span>
      </button>
    </div>

    <div class="p-2.5 rounded-xl bg-[#18191C] border border-[#10B981]/30 flex items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="text-[11px] font-bold text-[#6EE7B7] truncate">Keamanan Mabes &amp; Penjara Propam</div>
        <div class="text-[10.5px] text-[#B5BAC1] font-mono-num">Rutan: ${detainees}/3 Sel · ${delegatedCount} Pengalihan</div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id="btn-toggle-propam-gate-org"
          class="min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
            gateOpen
              ? 'bg-[#10B981]/20 border-[#10B981]/60 text-[#6EE7B7]'
              : 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#FCA5A5]'
          }"
        >
          ${gateOpen ? 'Gerbang: Buka' : 'Gerbang: Kunci'}
        </button>
        <button type="button" id="btn-view-mabes-2d" class="min-h-[32px] px-2.5 rounded-lg bg-[#111214] border border-white/10 text-[11px] font-semibold text-[#F2F3F5] cursor-pointer">
          Kota 2D
        </button>
      </div>
    </div>

    <div class="rounded-xl theme-surface border border-white/[0.07] overflow-hidden" data-testid="authority-hierarchy-tree">
      <button
        type="button"
        id="btn-toggle-auth-tree"
        class="w-full px-3 py-2 flex items-center justify-between gap-2 bg-black/25 hover:bg-black/35 text-left cursor-pointer"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="collapse-chevron text-[#FACC15] shrink-0 ${treeOpen ? 'open' : ''}">${svgIcons.chevronRight}</span>
          <span class="text-xs font-bold text-[#F2F3F5] truncate">Hierarchy Tree Komando</span>
          <span class="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-[#D4A024]/20 text-[#FACC15] shrink-0">LV.100</span>
        </div>
        <span class="text-[10.5px] text-[#80848E] shrink-0">${treeOpen ? 'Minimize' : 'Tampilkan'}</span>
      </button>

      ${
        treeOpen
          ? `<div class="p-2.5 space-y-2.5 border-t border-white/[0.06]">
               <div class="px-2.5 py-1.5 rounded-lg bg-[#D4A024]/15 border border-[#D4A024]/40 flex items-center justify-between text-xs">
                 <span class="font-bold text-[#FACC15]">Kapolda (Owner)</span>
                 <span class="text-[10px] font-mono-num text-[#FDE68A]">LV.100 · Penuh</span>
               </div>
               ${treeBranch('Jabatan Struktural (Terpisah)', '#EAB308', sortedBillets, 'billet')}
               ${treeBranch('Role Pangkat', '#5865F2', nonOwnerRanks, 'rank')}
               ${treeBranch('Divisi Operasional', '#10B981', divisions, 'division')}
             </div>`
          : ''
      }
    </div>

    <div class="grid grid-cols-2 gap-1 p-1 rounded-xl theme-surface border border-white/[0.06]">
      <button
        type="button"
        id="btn-auth-mode-editor"
        class="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
          mode === 'editor' ? 'theme-accent-btn' : 'text-[#B5BAC1]'
        }"
      >
        Edit Wewenang Node
      </button>
      <button
        type="button"
        id="btn-auth-mode-delegation"
        class="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
          mode === 'delegation' ? 'bg-[#EAB308] text-[#111214]' : 'text-[#B5BAC1]'
        }"
      >
        Pengalihan ke Jabatan (${delegatedCount})
      </button>
    </div>

    ${
      mode === 'delegation'
        ? renderDelegationRouter(state, sortedBillets, delegations)
        : renderFocusedAuthorityEditor(state, ui, sel, nodeObj, activePermCount, delegations)
    }
  `;
}
