import {
  AKPOL_SUB_SERVER_ID,
  checkAcademyEligibility,
  getAcademyEnrolledCount,
  getAkpolCohortStatus,
  getRankById,
} from '../../engine/rules.js';
import { escapeHtml } from '../icons.js';

export function renderAcademyTab(state, academyNotice) {
  const ac = state.academy || {
    isOpen: true,
    quota: 4,
    minProfessionalism: 38,
    minActivityDrive: 45,
    minBetah: 50,
    targetRankId: 'rank-bripda',
    graduateBonusXp: 85,
    graduatesCount: 0,
    failedCount: 0,
  };
  const cohort = getAkpolCohortStatus(state);
  const enrolledCount = getAcademyEnrolledCount(state);
  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const enrolledCadets = state.members.filter((m) => m.academyStatus === 'ENROLLED');
  const candidates = state.members.filter((m) => m.academyStatus !== 'ENROLLED');
  const educators = state.billets.filter((b) => {
    const perms = b.permissions || {};
    return (
      perms.canEducate ||
      perms.canGraduateCadet ||
      perms.canFailCadet ||
      perms.canManageAcademy ||
      perms.canLeadAkpolDrill
    );
  });

  const akpolSub = (state.subServers || []).find((s) => s.id === AKPOL_SUB_SERVER_ID);

  return `
    <div class="p-3 rounded-xl theme-surface border border-[#0EA5E9]/30 space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-bold text-[#38BDF8]">Akademi Kepolisian &amp; Lemdiklat</div>
          <div class="text-[11px] text-[#80848E] truncate">Gerbang Sub-Server #registrasi · Baris-Berbaris Serentak</div>
        </div>
        <button
          type="button"
          id="btn-toggle-academy-open"
          class="min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer border ${
            ac.isOpen
              ? 'bg-[#23A55A]/20 border-[#23A55A]/60 text-[#4ADE80]'
              : 'bg-[#DA373C]/20 border-[#DA373C]/60 text-[#F87171]'
          }"
        >
          ${ac.isOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
        </button>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center pt-1">
        <div class="p-2 rounded-lg bg-[#111214]">
          <div class="text-sm font-extrabold font-mono-num text-[#38BDF8]">${enrolledCount} / ${ac.quota}</div>
          <div class="text-[10px] text-[#80848E]">Kuota Taruna</div>
        </div>
        <div class="p-2 rounded-lg bg-[#111214]">
          <div class="text-sm font-extrabold font-mono-num text-[#23A55A]">${ac.graduatesCount || 0}</div>
          <div class="text-[10px] text-[#80848E]">Lulusan Akpol</div>
        </div>
        <div class="p-2 rounded-lg bg-[#111214]">
          <div class="text-sm font-extrabold font-mono-num text-[#F87171]">${ac.failedCount || 0}</div>
          <div class="text-[10px] text-[#80848E]">Gugur Diklat</div>
        </div>
      </div>

      <!-- Gate Sub-Server & Synchronized Baris-Berbaris Card -->
      <div class="p-2.5 rounded-lg bg-[#0F172A] border border-[#0EA5E9]/30 space-y-2" data-testid="akpol-cohort-card">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10.5px] font-bold text-[#7DD3FC] uppercase tracking-wider">Baris-Berbaris Serentak &amp; #request</div>
            <div class="text-[11px] text-[#CBD5E1] mt-0.5 truncate">
              ${
                cohort.isDrilling
                  ? `Aktif dipimpin ${escapeHtml(cohort.trainerName || 'Pelatih')}`
                  : cohort.waitingForTrainer
                    ? 'Kuota penuh! Menunggu Pelatih datang via #request.'
                    : cohort.waitingForQuota
                      ? `Formasi menunggu kuota penuh (${enrolledCount}/${ac.quota}).`
                      : `Daftar wajib lewat Sub-Server ${escapeHtml(akpolSub?.name || 'AKADEMI KEPOLISIAN')}.`
              }
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
            cohort.isDrilling
              ? 'bg-[#23A55A]/25 text-[#4ADE80]'
              : cohort.quotaMet
                ? 'bg-[#F59E0B]/25 text-[#FBBF24]'
                : 'bg-[#0EA5E9]/20 text-[#38BDF8]'
          }">
            ${cohort.isDrilling ? 'PBB AKTIF' : cohort.quotaMet ? 'SIAP PELATIH' : 'TUNGGU KUOTA'}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" id="btn-post-akpol-request" class="min-h-[34px] px-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#0EA5E9]/40 text-[11px] font-semibold text-[#7DD3FC] cursor-pointer">
            Kirim #request Pelatih
          </button>
          <button
            type="button"
            id="btn-lead-akpol-cohort"
            class="min-h-[34px] px-2 rounded-lg text-[11px] font-bold cursor-pointer ${
              cohort.quotaMet
                ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16]'
                : 'bg-[#1E293B] border border-white/10 text-[#94A3B8]'
            }"
          >
            Pimpin Baris-Berbaris
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 text-[10.5px] pt-0.5">
          <button type="button" id="btn-goto-akpol-reg" class="text-[#38BDF8] hover:underline font-semibold cursor-pointer">Buka Sub-Server #registrasi</button>
          <button type="button" id="btn-goto-akpol-req" class="text-[#4ADE80] hover:underline font-semibold cursor-pointer">Buka Channel #request →</button>
        </div>
      </div>

      <div class="p-2.5 rounded-lg bg-[#111214] border border-white/[0.06] space-y-2">
        <div class="text-[10px] font-bold tracking-wider text-[#80848E]">KUOTA, SYARAT SELEKSI &amp; TARGET KELULUSAN</div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="acad-quota" class="block text-[10px] text-[#B5BAC1] mb-0.5">Kuota Angkatan (Min 2)</label>
            <input id="acad-quota" type="number" min="2" max="10" value="${ac.quota}" class="w-full min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num text-[#F2F3F5]" />
          </div>
          <div>
            <label for="acad-target-rank" class="block text-[10px] text-[#B5BAC1] mb-0.5">Pangkat Lulus</label>
            <select id="acad-target-rank" class="w-full min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
              ${nonOwnerRanks
                .map(
                  (r) => `<option value="${r.id}" ${ac.targetRankId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          <div>
            <label for="acad-min-prof" class="block text-[10px] text-[#B5BAC1] mb-0.5">Min Prof (%)</label>
            <input id="acad-min-prof" type="number" min="10" max="90" value="${ac.minProfessionalism}" class="w-full min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num text-[#F2F3F5]" />
          </div>
          <div>
            <label for="acad-min-act" class="block text-[10px] text-[#B5BAC1] mb-0.5">Min Aktif (%)</label>
            <input id="acad-min-act" type="number" min="10" max="90" value="${ac.minActivityDrive}" class="w-full min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num text-[#F2F3F5]" />
          </div>
          <div>
            <label for="acad-bonus-xp" class="block text-[10px] text-[#B5BAC1] mb-0.5">Bonus XP</label>
            <input id="acad-bonus-xp" type="number" min="20" max="400" step="5" value="${ac.graduateBonusXp}" class="w-full min-h-[34px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num text-[#F2F3F5]" />
          </div>
        </div>
      </div>

      <div class="text-[11px] text-[#B5BAC1] flex items-center justify-between gap-2 pt-0.5">
        <span class="truncate">Pelatih Lemdiklat: ${educators.length} jabatan aktif</span>
        <button type="button" id="btn-goto-academy-channel" class="text-[#38BDF8] font-semibold whitespace-nowrap shrink-0 cursor-pointer">#akademi-lemdiklat →</button>
      </div>
      ${academyNotice ? `<p class="text-[11px] text-[#F0B232] bg-[#F0B232]/10 border border-[#F0B232]/30 rounded-lg px-2.5 py-1.5">${escapeHtml(academyNotice)}</p>` : ''}
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-[#F2F3F5]">Barisan Taruna di Kampus (${enrolledCadets.length}/${ac.quota})</span>
        <span class="text-[10px] text-[#80848E]">Serentak setelah kuota penuh</span>
      </div>
      ${
        enrolledCadets.length === 0
          ? `<div class="p-3 rounded-xl theme-surface border border-white/[0.06] text-xs text-[#80848E]">Belum ada Taruna berbaris. Kandidat wajib isi #registrasi di sub-server AKADEMI KEPOLISIAN dahulu.</div>`
          : enrolledCadets
              .map((c) => {
                const prog = Math.round(c.trainingProgress || 0);
                const p = c.personality || { professionalism: 60, loyalty: 60 };
                return `
                  <div class="p-3 rounded-xl theme-surface border border-[#0EA5E9]/25 space-y-2" data-cadet-card="${c.id}">
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-sm font-bold text-[#F2F3F5] truncate">${escapeHtml(c.icName)}</div>
                        <div class="text-[11px] font-mono-num text-[#80848E]">Prof ${p.professionalism}% · Loyal ${p.loyalty}% · ${Math.round(c.xp)} XP</div>
                      </div>
                      <span class="text-xs font-mono-num font-bold px-2 py-0.5 rounded bg-[#0EA5E9]/20 text-[#38BDF8] shrink-0">${prog}%</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[#111214] overflow-hidden">
                      <div class="h-full rounded-full bg-[#22C55E]" style="width:${Math.min(100, prog)}%"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        data-acad-train="${c.id}"
                        class="min-h-[36px] rounded-lg text-[11px] font-semibold cursor-pointer ${
                          cohort.quotaMet ? 'theme-accent-btn' : 'bg-[#1E1F22] border border-white/10 text-[#94A3B8]'
                        }"
                      >
                        ${cohort.quotaMet ? 'PBB Serentak' : 'Tunggu Kuota'}
                      </button>
                      <button type="button" data-acad-graduate="${c.id}" class="min-h-[36px] rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-[11px] font-semibold cursor-pointer">
                        Luluskan
                      </button>
                      <button type="button" data-acad-fail="${c.id}" class="min-h-[36px] rounded-lg bg-[#DA373C]/20 border border-[#DA373C]/50 text-[#F87171] text-[11px] font-semibold cursor-pointer">
                        Gugurkan
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')
      }
    </div>

    <div class="space-y-2">
      <div class="text-xs font-bold text-[#F2F3F5]">Seleksi &amp; Gerbang #registrasi (${candidates.length})</div>
      ${candidates
        .map((m) => {
          const rank = getRankById(state, m.rankId);
          const elig = checkAcademyEligibility(m, state);
          const statusBadge =
            m.academyStatus === 'GRADUATED'
              ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#23A55A]/20 text-[#4ADE80]">Alumni</span>`
              : m.academyStatus === 'FAILED'
                ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#DA373C]/20 text-[#F87171]">Pernah Gugur</span>`
                : m.akpolRegistered
                  ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0EA5E9]/20 text-[#38BDF8]">#registrasi ✓</span>`
                  : '';
          return `
            <div class="p-2.5 rounded-xl theme-surface border border-white/[0.06] flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(m.icName)}</span>
                  <span class="text-[10px] text-[#80848E] shrink-0">${escapeHtml(rank.name)}</span>
                  ${statusBadge}
                </div>
                <div class="text-[10.5px] ${elig.eligible ? 'text-[#4ADE80]' : 'text-[#F0B232]'} truncate mt-0.5">
                  ${elig.eligible ? `Lolos Syarat #registrasi (Prof ${m.personality?.professionalism ?? 60}% · Aktif ${m.personality?.activityDrive ?? 60}%)` : escapeHtml(elig.reasons[0])}
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${
                  !m.akpolRegistered && m.academyStatus !== 'GRADUATED'
                    ? `<button type="button" data-acad-register="${m.id}" class="min-h-[34px] px-2 rounded-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/50 text-[#7DD3FC] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">
                         #registrasi
                       </button>`
                    : ''
                }
                <button
                  type="button"
                  data-acad-enroll="${m.id}"
                  ${elig.eligible ? '' : 'disabled'}
                  class="min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    elig.eligible
                      ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                      : 'bg-[#111214] text-[#80848E] opacity-55 cursor-not-allowed'
                  }"
                >
                  Daftar
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}
