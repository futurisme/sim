import { ASSIGNMENT_TYPES, DIVISION_TRAINING_PHASES, PERMISSION_DEFINITIONS } from '../../engine/constants.js';
import { serverLogoEngine } from '../../engine/serverLogoEngine.js';
import { getDivisionDutyProfile, getRankById } from '../../engine/rules.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function renderDivisionsTab(state, ui) {
  const totalQuota = state.divisions.reduce((sum, d) => sum + (Number(d.quota) || 6), 0);
  const pendingPropsCount = (state.divisionProposals || []).filter((p) => p.status === 'PENDING').length;
  const phaseLabelMap = new Map(DIVISION_TRAINING_PHASES.map((ph) => [ph.id, ph]));
  const memberById = new Map(state.members.map((m) => [m.id, m]));

  return `
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <span class="text-xs text-[#80848E]">Divisi (${state.divisions.length}) · Kuota ${totalQuota}</span>
      <div class="flex items-center gap-1.5">
        <button type="button" id="btn-open-dm-from-org" class="min-h-[36px] px-2.5 rounded-lg theme-elevated hover:brightness-110 border border-white/10 text-xs font-semibold text-[#F2F3F5] inline-flex items-center gap-1.5 cursor-pointer">
          <span>DM Proposal</span>
          ${pendingPropsCount > 0 ? `<span class="px-1.5 py-0.2 rounded bg-[#F0B232] text-[#111214] text-[10px] font-mono-num font-bold">${pendingPropsCount}</span>` : ''}
        </button>
        <button type="button" id="btn-add-div" class="min-h-[36px] px-3 rounded-lg theme-accent-btn text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
          ${svgIcons.plus}
          <span>Buka Divisi</span>
        </button>
      </div>
    </div>
    <div class="space-y-1.5">
      ${state.divisions
        .map((d) => {
          const divMembers = state.members.filter((m) => m.divisionId === d.id);
          const count = divMembers.length;
          const linkedSub =
            (state.subServers || []).find((s) => s.linkedDivisionId === d.id && s.category === 'DIVISI') ||
            (state.subServers || []).find((s) => s.linkedDivisionId === d.id);
          const activePerms = PERMISSION_DEFINITIONS.filter((p) => Boolean(d.permissions?.[p.key]));
          const isExpanded = ui.expandedDivisionId === d.id;
          const dp = getDivisionDutyProfile(d);
          const preset = ASSIGNMENT_TYPES[dp.assignmentType] || ASSIGNMENT_TYPES.GENERAL_PATROL;
          const headMember = d.headId ? memberById.get(d.headId) || null : null;
          const viceMember = d.viceHeadId ? memberById.get(d.viceHeadId) || null : null;
          const activeProp =
            (state.divisionProposals || []).find((p) => p.divisionId === d.id && p.status === 'PENDING') ||
            (state.divisionProposals || []).find((p) => p.divisionId === d.id && p.status === 'APPROVED') ||
            null;
          const divRecruits = (state.divisionRecruits || []).filter(
            (r) => r.divisionId === d.id && r.stage !== 'INAUGURATED' && r.stage !== 'REJECTED'
          );
          const headPool = divMembers.length > 0 ? divMembers : state.members.filter((m) => (getRankById(state, m.rankId)?.order || 1) >= 2);
          const vicePool = headPool.filter((m) => m.id !== d.headId);
          const units = Array.isArray(d.units) ? d.units : [];

          return `
            <div class="rounded-xl theme-surface border border-white/[0.06] overflow-hidden">
              <div class="p-2.5 flex items-center justify-between gap-2">
                <button type="button" data-expand-div="${d.id}" class="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
                  <span class="collapse-chevron text-[#80848E] shrink-0 ${isExpanded ? 'open' : ''}">${svgIcons.chevronRight}</span>
                  <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${d.color}"></span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(d.name)}</span>
                      <span class="text-[10px] font-mono-num text-[#B5BAC1]">[${escapeHtml(d.callsign)}]</span>
                      <span class="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#5865F2]/20 text-[#C7D2FE]">${escapeHtml(preset.shortLabel)}</span>
                      ${
                        d.proposalStatus === 'PENDING'
                          ? `<span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-[#F0B232]/20 text-[#FACC15]">Proposal DM</span>`
                          : d.recruitmentOpen
                            ? `<span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-[#23A55A]/20 text-[#4ADE80]">#registrasi Buka</span>`
                            : ''
                      }
                      ${
                        divRecruits.length > 0
                          ? `<span class="text-[9.5px] font-mono-num font-semibold px-1.5 py-0.2 rounded bg-[#38BDF8]/20 text-[#7DD3FC]">${divRecruits.length} Calon/Diklat</span>`
                          : ''
                      }
                    </div>
                    <div class="text-[10.5px] text-[#80848E] font-mono-num truncate">
                      ${count}/${d.quota} personel · Ka: ${escapeHtml(headMember?.icName || '-')} · Waka: ${escapeHtml(viceMember?.icName || '-')} · ${activePerms.length} Izin
                    </div>
                  </div>
                </button>
                <button type="button" data-del-div="${d.id}" aria-label="Hapus divisi ${escapeHtml(d.name)}" class="w-8 h-8 flex items-center justify-center text-[#80848E] hover:text-[#DA373C] cursor-pointer shrink-0">
                  ${svgIcons.trash}
                </button>
              </div>
              ${
                isExpanded
                  ? `<div class="px-3 pb-3 pt-2 border-t border-white/[0.05] bg-black/25 space-y-2.5">
                       <div class="text-[11px] text-[#B5BAC1]">${escapeHtml(d.duty)}</div>
                       ${
                         linkedSub
                           ? `<div class="flex items-center justify-between gap-2 flex-wrap">
                                <div class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${linkedSub.affiliatedToMain ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#F0B232]/20 text-[#FACC15]'}">
                                  ${serverLogoEngine.renderSubServerLogo(linkedSub, { sizeClass: 'w-4 h-4 shrink-0', compact: true })}
                                  <span>Sub-Server: ${escapeHtml(linkedSub.shortCode)} · ${linkedSub.affiliatedToMain ? 'Afiliasi' : 'Mandiri'}</span>
                                </div>
                                <button type="button" data-open-sub-registrasi="${linkedSub.id}" class="text-[10.5px] font-semibold text-[#93C5FD] hover:underline cursor-pointer">
                                  Buka #registrasi →
                                </button>
                              </div>`
                           : ''
                       }

                       <!-- Kepala & Wakil Kepala Divisi + Kuota Harian -->
                       <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                         <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.05] space-y-1.5">
                           <div>
                             <label for="sel-head-${d.id}" class="block text-[10px] font-semibold text-[#80848E] mb-1">Kepala Divisi</label>
                             <select id="sel-head-${d.id}" data-div-head="${d.id}" class="w-full h-8 px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-[11px] font-semibold text-[#F2F3F5]">
                               <option value="">-- Otomatis Senior --</option>
                               ${headPool
                                 .map(
                                   (m) =>
                                     `<option value="${m.id}" ${d.headId === m.id ? 'selected' : ''}>${escapeHtml(m.icName)} (${escapeHtml(getRankById(state, m.rankId)?.name || '')})</option>`
                                 )
                                 .join('')}
                             </select>
                           </div>
                           <div>
                             <label for="sel-vice-${d.id}" class="block text-[10px] font-semibold text-[#80848E] mb-1">Wakil Kepala Divisi</label>
                             <select id="sel-vice-${d.id}" data-div-vice-head="${d.id}" class="w-full h-8 px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-[11px] font-semibold text-[#F2F3F5]">
                               <option value="">-- Belum Ditunjuk --</option>
                               ${vicePool
                                 .map(
                                   (m) =>
                                     `<option value="${m.id}" ${d.viceHeadId === m.id ? 'selected' : ''}>${escapeHtml(m.icName)} (${escapeHtml(getRankById(state, m.rankId)?.name || '')})</option>`
                                 )
                                 .join('')}
                             </select>
                           </div>
                         </div>
                         <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.05]">
                           <div class="text-[10px] font-semibold text-[#80848E] mb-1">Kuota Penerimaan Hari Ini (${d.dailyIntakeCount || 0}/${d.dailyIntakeQuota || 3})</div>
                           <div class="flex items-center gap-1.5">
                             <button type="button" data-div-daily-dec="${d.id}" class="w-8 h-8 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">-</button>
                             <input type="number" min="1" max="20" value="${d.dailyIntakeQuota || 3}" data-div-daily-input="${d.id}" aria-label="Kuota harian divisi ${escapeHtml(d.name)}" class="w-16 h-8 px-2 text-center rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num font-bold text-[#F2F3F5]" />
                             <button type="button" data-div-daily-inc="${d.id}" class="w-8 h-8 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">+</button>
                           </div>
                         </div>
                       </div>

                       <!-- Proposal DM & Status Pembukaan #registrasi -->
                       <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.06] space-y-1.5">
                         <div class="flex items-center justify-between gap-2 flex-wrap">
                           <div class="text-[10.5px] font-bold text-[#F2F3F5]">
                             Alur Proposal &amp; Seleksi Divisi:
                             <span class="${
                               d.proposalStatus === 'APPROVED'
                                 ? 'text-[#4ADE80]'
                                 : d.proposalStatus === 'PENDING'
                                   ? 'text-[#FACC15]'
                                   : 'text-[#94A3B8]'
                             }">
                               ${
                                 d.proposalStatus === 'APPROVED'
                                   ? 'Disetujui · #registrasi Aktif'
                                   : d.proposalStatus === 'PENDING'
                                     ? 'Menunggu ACC Kapolda (DM)'
                                     : 'Belum Ada Proposal Hari Ini'
                               }
                             </span>
                           </div>
                           ${
                             headMember
                               ? `<button type="button" data-open-dm-peer="${headMember.id}" class="text-[10.5px] font-semibold text-[#93C5FD] hover:underline cursor-pointer">Buka DM Ketua →</button>`
                               : ''
                           }
                         </div>
                         <div class="flex items-center gap-1.5 flex-wrap">
                           ${
                             activeProp && activeProp.status === 'PENDING'
                               ? `<button type="button" data-approve-proposal="${activeProp.id}" class="min-h-[30px] px-2.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-[10.5px] font-bold cursor-pointer">✓ ACC Proposal &amp; Buka #registrasi</button>
                                  <button type="button" data-reject-proposal="${activeProp.id}" class="min-h-[30px] px-2.5 rounded-lg bg-[#DA373C]/20 border border-[#DA373C]/50 text-[#FCA5A5] text-[10.5px] font-semibold cursor-pointer">✕ Tolak</button>`
                               : d.proposalStatus !== 'APPROVED'
                                 ? `<button type="button" data-send-proposal="${d.id}" class="min-h-[30px] px-2.5 rounded-lg theme-accent-btn text-[10.5px] font-semibold cursor-pointer">Kirim Proposal Unit via DM</button>`
                                 : `<span class="text-[10px] text-[#80848E]">Link #registrasi disebar rutin; pendaftar dinilai bertahap Phase I–IV hingga Pelantikan.</span>`
                           }
                         </div>
                       </div>

                       <!-- Rancangan 2 Unit & 2 Sub-Unit -->
                       <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.06] space-y-1.5">
                         <div class="text-[10px] font-bold tracking-wider text-[#93C5FD]">STRUKTUR 2 UNIT &amp; SUB-UNIT (${units.length || 0} UNIT)</div>
                         ${
                           units.length === 0
                             ? `<div class="text-[10.5px] text-[#80848E]">Belum disahkan. Kirim &amp; ACC Proposal DM untuk membentuk 2 Unit dan mengisi kekosongan jabatan Sub-Unit.</div>`
                             : `<div class="space-y-1.5">
                                  ${units
                                    .map(
                                      (u) => `
                                        <div class="p-1.5 rounded-md bg-[#18191C] border border-white/[0.05]">
                                          <div class="flex items-center justify-between text-[10.5px] font-bold text-[#F2F3F5]">
                                            <span>${escapeHtml(u.name)}</span>
                                            <span class="text-[9.5px] font-normal text-[#93C5FD]">${escapeHtml(u.roleTitle)}</span>
                                          </div>
                                          <div class="mt-1 space-y-1 pl-1.5">
                                            ${(u.subUnits || [])
                                              .map((su) => {
                                                const assignedIds = su.assignedMemberIds || [];
                                                const assignedNames = assignedIds
                                                  .map((id) => memberById.get(id)?.icName)
                                                  .filter(Boolean);
                                                const vacantCount = Math.max(0, (su.quota || 2) - assignedNames.length);
                                                return `
                                                  <div class="text-[10px] flex items-center justify-between gap-2">
                                                    <div class="min-w-0">
                                                      <span class="text-[#DBDEE1] font-medium">• ${escapeHtml(su.name)}</span>
                                                      <span class="text-[#80848E]">(${escapeHtml(su.roleTitle)})</span>
                                                      <div class="text-[9.5px] ${assignedNames.length > 0 ? 'text-[#4ADE80]' : 'text-[#FACC15]'} truncate">
                                                        ${assignedNames.length > 0 ? escapeHtml(assignedNames.join(', ')) : 'Slot Kosong'}
                                                        ${vacantCount > 0 && assignedNames.length > 0 ? ` (+${vacantCount} kosong)` : ''}
                                                      </div>
                                                    </div>
                                                    <span class="font-mono-num text-[#B5BAC1] shrink-0">${assignedNames.length}/${su.quota}</span>
                                                  </div>
                                                `;
                                              })
                                              .join('')}
                                          </div>
                                        </div>
                                      `
                                    )
                                    .join('')}
                                </div>`
                         }
                       </div>

                       <!-- Pendaftar #registrasi & Peserta Diklat Phase I-IV -->
                       <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.06] space-y-1.5">
                         <div class="text-[10px] font-bold tracking-wider text-[#FACC15]">PENDAFTAR #REGISTRASI &amp; DIKLAT PHASE I–IV (${divRecruits.length})</div>
                         ${
                           divRecruits.length === 0
                             ? `<div class="text-[10.5px] text-[#80848E]">Belum ada calon/peserta diklat aktif saat ini.</div>`
                             : `<div class="space-y-1">
                                  ${divRecruits
                                    .map((r) => {
                                      const ph = phaseLabelMap.get(r.stage);
                                      const stageText = r.stage === 'APPLIED' ? 'Berkas Baru' : ph?.shortLabel || r.stage;
                                      return `
                                        <div class="p-1.5 rounded-md bg-[#18191C] border border-white/[0.05] flex items-center justify-between gap-2">
                                          <div class="min-w-0">
                                            <div class="text-[11px] font-bold text-[#F2F3F5] truncate">${escapeHtml(r.memberName)}</div>
                                            <div class="text-[10px] text-[#80848E] font-mono-num">${escapeHtml(stageText)} · Progres ${Math.round(r.phaseProgress || 0)}%</div>
                                          </div>
                                          ${
                                            r.stage === 'APPLIED'
                                              ? `<button type="button" data-eval-recruit="${r.id}" class="min-h-[28px] px-2 rounded-md theme-accent-btn text-[10px] font-semibold cursor-pointer shrink-0">Seleksi Berkas</button>`
                                              : `<button type="button" data-advance-recruit="${r.id}" class="min-h-[28px] px-2 rounded-md bg-[#23A55A] text-white text-[10px] font-semibold cursor-pointer shrink-0">${r.stage === 'PHASE_4' ? 'Lantik ke Unit →' : 'Lanjut Phase →'}</button>`
                                          }
                                        </div>
                                      `;
                                    })
                                    .join('')}
                                </div>`
                         }
                       </div>

                       <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                         <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.05]">
                           <div class="text-[10px] font-semibold text-[#80848E] mb-1">Kuota Maksimal Satuan (1–50)</div>
                           <div class="flex items-center gap-1.5">
                             <button type="button" data-div-quota-dec="${d.id}" class="w-8 h-8 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">-</button>
                             <input type="number" min="1" max="50" value="${d.quota}" data-div-quota-input="${d.id}" aria-label="Kuota divisi ${escapeHtml(d.name)}" class="w-16 h-8 px-2 text-center rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num font-bold text-[#F2F3F5]" />
                             <button type="button" data-div-quota-inc="${d.id}" class="w-8 h-8 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-bold text-[#F2F3F5] cursor-pointer">+</button>
                           </div>
                         </div>
                         <div class="p-2 rounded-lg bg-[#111214] border border-white/[0.05]">
                           <label for="sel-duty-${d.id}" class="block text-[10px] font-semibold text-[#80848E] mb-1">Tipe Penugasan &amp; Kebiasaan</label>
                           <select id="sel-duty-${d.id}" data-div-duty-type="${d.id}" class="w-full h-8 px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-[11px] font-semibold text-[#F2F3F5]">
                             ${Object.values(ASSIGNMENT_TYPES)
                               .map(
                                 (at) =>
                                   `<option value="${at.id}" ${dp.assignmentType === at.id ? 'selected' : ''}>${escapeHtml(at.label)}</option>`
                               )
                               .join('')}
                           </select>
                         </div>
                       </div>
                       <div class="flex items-center justify-between gap-2 text-[10px] text-[#80848E]">
                         <span>Bias Mabes: <strong class="text-[#F2F3F5] font-mono-num">${Math.round(dp.mabesPatrolBias * 100)}%</strong> · Jaga Gerbang: <strong class="text-[#6EE7B7] font-mono-num">${Math.round(dp.gateGuardBias * 100)}%</strong></span>
                         <span>TKP Prioritas: <strong class="text-[#93C5FD]">${escapeHtml(dp.preferredIncidents.join(', '))}</strong></span>
                       </div>
                       <div class="flex items-center justify-between gap-2 pt-1">
                         <button type="button" data-toggle-div-gate="${d.id}" data-gate-val="${d.gateClearance !== false ? '0' : '1'}" class="min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                           d.gateClearance !== false
                             ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#6EE7B7]'
                             : 'bg-[#111214] border-white/10 text-[#FCD34D]'
                         }">
                           ${d.gateClearance !== false ? '✓ Lolos Gerbang Propam' : '× Tertahan Saat Gerbang Kunci'}
                         </button>
                         <button type="button" data-jump-authority="division:${d.id}" class="text-[11px] font-semibold text-[#38BDF8] hover:underline cursor-pointer shrink-0">
                           Atur Wewenang →
                         </button>
                       </div>
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
