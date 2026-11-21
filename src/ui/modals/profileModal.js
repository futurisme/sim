import { AWARDS_CATALOG, SUB_ROLES } from '../../engine/constants.js';
import { avatarEngine, resolveProfileIdentity } from '../../engine/avatarEngine.js';
import { assessMemberTrustworthiness, getMemberHierarchy } from '../../engine/aiBrain.js';
import {
  checkAcademyEligibility,
  getBilletById,
  getDivisionById,
  getMemberSubServerProfile,
  getRankById,
  resolveMemberRoleGroups,
} from '../../engine/rules.js';
import { escapeHtml, svgIcons } from '../icons.js';

function renderCleanRoleBadge(item) {
  const color = item.color || '#5865F2';
  return `
    <span
      title="${escapeHtml(item.desc || item.meta || item.label)}"
      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight"
      style="background:${color}22; border: 1px solid ${color}66; color:#F2F3F5;"
    >
      <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${color}"></span>
      <span>${escapeHtml(item.label)}</span>
      ${item.meta ? `<span class="text-[9.5px] opacity-75 font-normal">· ${escapeHtml(item.meta)}</span>` : ''}
    </span>
  `;
}

function renderNineTierRoleAccordions(groups) {
  const nonEmpty = groups.filter((g) => g.items && g.items.length > 0);
  if (nonEmpty.length === 0) {
    return `<div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] text-xs text-[#80848E]">Belum ada role atau penghargaan yang tercatat.</div>`;
  }
  return `
    <div class="space-y-1.5" data-testid="role-tiers-list">
      ${nonEmpty
        .map(
          (group, idx) => `
            <details
              ${idx < 6 ? 'open' : ''}
              data-role-tier="${group.id}"
              class="rounded-xl bg-[#111214] border border-white/[0.06] overflow-hidden"
            >
              <summary class="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.03]">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="accordion-chevron text-[#80848E] transition-transform duration-150 shrink-0">${svgIcons.chevronRight}</span>
                  <span class="w-2 h-2 rounded-full shrink-0" style="background:${group.accent}"></span>
                  <span class="text-[11px] font-bold tracking-wide text-[#F2F3F5] truncate">${group.order}. ${escapeHtml(group.title)}</span>
                </div>
                <span class="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-white/[0.07] text-[#B5BAC1] shrink-0">${group.items.length}</span>
              </summary>
              <div class="px-3 pb-2.5 pt-1 border-t border-white/[0.05] flex flex-wrap gap-1.5">
                ${group.items.map((item) => renderCleanRoleBadge(item)).join('')}
              </div>
            </details>
          `
        )
        .join('')}
    </div>
  `;
}

export function buildOwnerProfileSheet(state, ui) {
  const activeTab = ['roles', 'bio', 'manage'].includes(ui?.profileTab) ? ui.profileTab : 'roles';
  const activeSubServer =
    ui?.activeServerId && ui.activeServerId !== 'main' && ui.activeServerId !== 'dm'
      ? (state.subServers || []).find((s) => s.id === ui.activeServerId) || null
      : null;

  const ownerIdentity = resolveProfileIdentity({
    isOwner: true,
    rank: (state.ranks || []).find((r) => r.isOwner),
    awards: state.ownerProfile.awards,
  });
  const avatarSvg = avatarEngine.renderSvg('owner', 'kapolda_izumiya', {
    isOwner: true,
    state,
    sizeClass: 'w-14 h-14 rounded-full overflow-hidden block',
  });
  const roleGroups = resolveMemberRoleGroups('owner', state, { activeSubServer });
  const totalRolesCount = roleGroups.reduce((sum, g) => sum + g.items.length, 0);

  let tabBody = '';
  if (activeTab === 'roles') {
    tabBody = `
      <div class="text-[10.5px] text-[#80848E] px-0.5">
        Urutan 9 kategori resmi dari Administrasi Server hingga Penghargaan (${totalRolesCount} item aktif). Ketuk kategori untuk lipat/buka.
      </div>
      ${renderNineTierRoleAccordions(roleGroups)}
    `;
  } else if (activeTab === 'bio') {
    tabBody = `
      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2">
        <div class="text-[11px] font-bold tracking-wide text-[#80848E]">TENTANG KAPOLDA (BIO)</div>
        <textarea id="inp-owner-bio" rows="3" maxlength="180" class="w-full p-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#DBDEE1] leading-relaxed">${escapeHtml(state.ownerProfile.bio)}</textarea>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10.5px] text-[#80848E]">Frame: ${escapeHtml(ownerIdentity.frameMeta.label)}</span>
          <button type="button" id="btn-save-owner-bio" class="px-3.5 py-1.5 rounded-lg theme-accent-btn text-xs font-semibold cursor-pointer">Simpan Bio</button>
        </div>
      </div>
      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] grid grid-cols-3 gap-2 text-center">
        <div>
          <div class="text-sm font-extrabold font-mono-num text-[#FACC15]">${Math.round(state.reputation)}</div>
          <div class="text-[10px] text-[#80848E]">Reputasi</div>
        </div>
        <div>
          <div class="text-sm font-extrabold font-mono-num text-[#38BDF8]">${state.members.length}</div>
          <div class="text-[10px] text-[#80848E]">Personel AI</div>
        </div>
        <div>
          <div class="text-sm font-extrabold font-mono-num text-[#23A55A]">${state.stats?.incidentsResolved || 0}</div>
          <div class="text-[10px] text-[#80848E]">TKP Tuntas</div>
        </div>
      </div>
    `;
  } else {
    tabBody = `
      <details open class="rounded-xl bg-[#111214] border border-white/[0.06] overflow-hidden">
        <summary class="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03]">
          <span class="text-[11px] font-bold tracking-wide text-[#FACC15]">SEMATKAN BREVET, MEDALI &amp; SERTIFIKAT</span>
          <span class="text-[10px] font-mono-num text-[#B5BAC1]">${(state.ownerProfile.awards || []).length} Terpasang</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] flex flex-wrap gap-1.5">
          ${AWARDS_CATALOG.map((aw) => {
            const has = (state.ownerProfile.awards || []).includes(aw.id);
            return `
              <button type="button" title="${escapeHtml(aw.desc || aw.category)}" data-toggle-award="${aw.id}" class="px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer border ${
                has ? 'bg-[#5865F2]/25 border-[#5865F2] text-white' : 'bg-[#1E1F22] border-white/10 text-[#B5BAC1]'
              }">
                ${has ? '✓ ' : '+ '}${escapeHtml(aw.name)}
              </button>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }

  return `
    <!-- Compact Top Banner (zero floating overlapping avatar) -->
    <div class="relative h-12 shrink-0 flex items-center justify-between px-3.5" style="background: linear-gradient(135deg, #451A03 0%, #B45309 100%);">
      <span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/40 text-[#FDE68A]">
        PROFIL PIMPINAN TERTINGGI
      </span>
      <button type="button" id="btn-close-sheet" aria-label="Tutup profil" class="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center cursor-pointer">
        ${svgIcons.close}
      </button>
    </div>

    <!-- Dedicated Non-Overlapping Header Identity Strip -->
    <div class="px-4 py-3 border-b border-white/[0.07] bg-[#18191C] flex items-center gap-3 shrink-0" data-testid="profile-identity-header">
      <div class="relative shrink-0 w-14 h-14 rounded-full ring-2 ring-[#D4A024] bg-[#111214]">
        ${avatarSvg}
        <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#23A55A] border-2 border-[#18191C]"></span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <h2 class="text-base font-extrabold text-[#FACC15] truncate">${escapeHtml(state.ownerName)}</h2>
          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#D4A024]/20 text-[#FACC15] shrink-0">OWNER</span>
        </div>
        <div class="text-[11px] text-[#B5BAC1] truncate">@${escapeHtml(state.ownerProfile.username)} · LV.100 Komando</div>
        <div class="text-[10.5px] font-semibold truncate mt-0.5" style="color:${ownerIdentity.frameMeta.accent}">
          Frame: ${escapeHtml(ownerIdentity.frameMeta.label)}
        </div>
      </div>
    </div>

    <!-- Switch Tabs -->
    <div class="px-4 pt-2.5 pb-1.5 shrink-0">
      <div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#111214] border border-white/[0.06]" role="tablist" aria-label="Tab Profil">
        <button type="button" data-profile-tab="roles" class="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'roles' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Role (${totalRolesCount})
        </button>
        <button type="button" data-profile-tab="bio" class="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'bio' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Bio &amp; Info
        </button>
        <button type="button" data-profile-tab="manage" class="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold cursor-pointer ${activeTab === 'manage' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Atribut
        </button>
      </div>
    </div>

    <div class="scroll-y-thin flex-1 px-4 pb-5 pt-1 space-y-2.5">
      ${tabBody}
    </div>
  `;
}

export function wireOwnerProfileHandlers(container, store) {
  container.querySelectorAll('[data-profile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => store.setProfileTab(btn.dataset.profileTab));
  });
  const saveBio = container.querySelector('#btn-save-owner-bio');
  if (saveBio) {
    saveBio.addEventListener('click', () => {
      const val = container.querySelector('#inp-owner-bio').value;
      store.updateBio('owner', val);
    });
  }
  container.querySelectorAll('[data-toggle-award]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleAward('owner', btn.dataset.toggleAward);
    });
  });
}

export function buildMemberProfileSheet(member, state, ui = null) {
  const activeTab = ['roles', 'bio', 'manage'].includes(ui?.profileTab) ? ui.profileTab : 'roles';
  const isInsideSubServer = Boolean(ui?.activeServerId && ui.activeServerId !== 'main' && ui.activeServerId !== 'dm');
  const activeSubServer = isInsideSubServer
    ? (state.subServers || []).find((s) => s.id === ui.activeServerId) || null
    : (member.divisionId ? (state.subServers || []).find((s) => s.linkedDivisionId === member.divisionId && s.category === 'DIVISI') : null);
  const subProfile = activeSubServer ? getMemberSubServerProfile(member, activeSubServer, state) : null;

  const rank = getRankById(state, member.rankId);
  const div = getDivisionById(state, member.divisionId);
  const billet = getBilletById(state, member.billetId);
  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const nextRank = nonOwnerRanks.find((r) => r.order > rank.order);
  const prevRank = [...nonOwnerRanks].reverse().find((r) => r.order < rank.order);

  const bannerBg = isInsideSubServer && activeSubServer
    ? activeSubServer.color || avatarEngine.getBannerColor(member.id)
    : avatarEngine.getBannerColor(member.id);
  const memIdentity = resolveProfileIdentity({
    isOwner: false,
    rank,
    division: div,
    billet,
    awards: member.awards,
  });
  const avatarSvg = avatarEngine.renderSvg(member.id, member.username, {
    member,
    state,
    sizeClass: 'w-14 h-14 rounded-full overflow-hidden block',
  });
  const statusColor =
    member.status === 'online-2d' ? '#23A55A' : member.status === 'online-chat' ? '#F0B232' : '#80848E';
  const statusText = isInsideSubServer && subProfile
    ? `${subProfile.internalDutyStatus} · ${activeSubServer.shortCode}`
    : member.status === 'online-2d'
      ? 'Patroli Kota 2D'
      : member.status === 'online-chat'
        ? 'Online Discord'
        : 'Offline · Tidur';

  const roleGroups = resolveMemberRoleGroups(member, state, { activeSubServer });
  const totalRolesCount = roleGroups.reduce((sum, g) => sum + g.items.length, 0);

  const p = member.personality || {
    professionalism: 60,
    loyalty: 60,
    activityDrive: 60,
    ambition: 55,
    empathy: 60,
  };
  const trust = assessMemberTrustworthiness(member);
  const hierarchyLevel = getMemberHierarchy(member, state);
  const pa = member.personalAuthority || { canOwnSubServer: false, canAffiliateServer: false };

  const traitRows = [
    { label: 'Profesionalisme', val: p.professionalism, color: p.professionalism >= 70 ? '#23A55A' : p.professionalism < 48 ? '#DA373C' : '#F0B232' },
    { label: 'Loyalitas', val: p.loyalty, color: p.loyalty >= 70 ? '#38BDF8' : p.loyalty < 48 ? '#DA373C' : '#F0B232' },
    { label: 'Keaktifan', val: p.activityDrive, color: '#22C55E' },
    { label: 'Ambisi', val: p.ambition, color: p.ambition >= 80 ? '#F59E0B' : '#A855F7' },
    { label: 'Empati & Etika', val: p.empathy, color: '#EC4899' },
  ];

  let tabContent = '';
  if (activeTab === 'roles') {
    tabContent = `
      ${
        isInsideSubServer && activeSubServer && subProfile
          ? `<div class="p-2.5 rounded-xl border flex items-center justify-between gap-2" style="background:${activeSubServer.color}14; border-color:${activeSubServer.color}40;">
               <div class="min-w-0">
                 <div class="text-[9.5px] font-bold tracking-wider uppercase text-[#80848E]">Konteks Sub-Server Aktif</div>
                 <div class="text-xs font-bold truncate text-[#F2F3F5]">${escapeHtml(activeSubServer.name)} · ${escapeHtml(subProfile.internalUnit)}</div>
               </div>
               <span class="text-[10.5px] font-semibold px-2 py-0.5 rounded shrink-0" style="background:${activeSubServer.color}25; color:${activeSubServer.color};">
                 ${escapeHtml(subProfile.roleTitle)}
               </span>
             </div>`
          : ''
      }
      <div class="text-[10.5px] text-[#80848E] px-0.5">
        Tersusun rapi 9 tingkat (Admin Server → Jabatan Ops → Pangkat → Divisi → Sub-Divisi → Unit → Sertifikat → Brevet → Penghargaan).
      </div>
      ${renderNineTierRoleAccordions(roleGroups)}
    `;
  } else if (activeTab === 'bio') {
    tabContent = `
      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2">
        <div class="text-[10px] font-bold tracking-wider text-[#80848E]">BIO ANGGOTA</div>
        <p class="text-xs text-[#DBDEE1] leading-relaxed">${escapeHtml(member.bio || 'Anggota aktif Kepolisian Republik Izumiya.')}</p>
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05] text-[10.5px] text-[#80848E]">
          <span>Arketipe: <strong class="text-[#F2F3F5]">${escapeHtml(member.archetype)}</strong></span>
          <span>Gaya Bicara: <strong class="text-[#93C5FD]">${escapeHtml(member.speechQuirk || 'standar')}</strong></span>
        </div>
      </div>

      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2" data-testid="personality-matrix">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold tracking-wider text-[#80848E] truncate">KEPRIBADIAN &amp; INTEGRITAS</span>
          <span class="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded whitespace-nowrap shrink-0" style="background:${trust.color}22; color:${trust.color};">
            ${escapeHtml(trust.label)} · ${trust.score}%
          </span>
        </div>

        <div class="space-y-1.5">
          ${traitRows
            .map(
              (tr) => `
            <div>
              <div class="flex items-center justify-between text-[11px] mb-0.5">
                <span class="text-[#B5BAC1]">${tr.label}</span>
                <span class="font-mono-num font-bold text-[#F2F3F5]">${Math.round(tr.val)}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-[#1E1F22] overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, Math.max(0, Math.round(tr.val)))}%; background:${tr.color}"></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <p class="text-[11px] leading-snug pt-1 border-t border-white/[0.05]" style="color:${trust.level === 'RISIKO_ABUSE' ? '#FCA5A5' : '#B5BAC1'}">
          ${escapeHtml(trust.summary)}
        </p>
      </div>
    `;
  } else {
    const elig = checkAcademyEligibility(member, state);
    tabContent = `
      <!-- Quick Owner Actions -->
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          id="btn-promote-member"
          ${nextRank ? '' : 'disabled'}
          class="min-h-[40px] px-3 rounded-xl font-semibold text-xs text-white cursor-pointer ${
            nextRank ? 'theme-accent-btn' : 'bg-[#2B2D31] text-[#80848E] opacity-60 cursor-not-allowed'
          }"
        >
          ${nextRank ? `Promosi → ${escapeHtml(nextRank.name)}` : 'Pangkat Tertinggi'}
        </button>
        <button
          type="button"
          id="btn-praise-member"
          class="min-h-[40px] px-3 rounded-xl font-semibold text-xs bg-[#23A55A] hover:bg-[#1E8E4C] text-white cursor-pointer"
        >
          Sambut &amp; Apresiasi
        </button>
        ${
          member.isRetired
            ? `<div class="col-span-2 px-3 py-2 rounded-xl bg-[#27272A] border border-[#FDE047]/40 flex items-center justify-between text-xs">
                 <span class="text-[#FDE047] font-bold">🎖️ Status: Purna-Tugas (Purnawirawan)</span>
                 <span class="text-[10px] text-[#A1A1AA]">Dibebastugaskan ops</span>
               </div>`
            : `<button
                 type="button"
                 id="btn-purna-member"
                 class="col-span-2 min-h-[36px] px-3 rounded-xl font-semibold text-xs bg-[#B45309]/20 border border-[#F59E0B]/50 text-[#FDE047] hover:bg-[#B45309]/35 cursor-pointer"
               >
                 Wisuda Purna-Tugas Kehormatan 🎖️
               </button>`
        }
      </div>

      ${
        member.academyStatus === 'ENROLLED'
          ? `<div class="grid grid-cols-3 gap-1.5">
               <button type="button" id="btn-sheet-acad-train" class="min-h-[36px] px-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-[11px] font-semibold cursor-pointer">Baris-Berbaris</button>
               <button type="button" id="btn-sheet-acad-grad" class="min-h-[36px] px-2 rounded-xl bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-[11px] font-semibold cursor-pointer">Luluskan</button>
               <button type="button" id="btn-sheet-acad-fail" class="min-h-[36px] px-2 rounded-xl bg-[#DA373C]/20 border border-[#DA373C]/50 text-[#F87171] text-[11px] font-semibold cursor-pointer">Gugurkan</button>
             </div>`
          : member.academyStatus !== 'GRADUATED'
            ? `<div class="space-y-1.5">
                 ${
                   !member.akpolRegistered
                     ? `<button type="button" id="btn-sheet-akpol-reg" class="w-full min-h-[34px] px-3 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/45 text-[#7DD3FC] text-[11px] font-semibold cursor-pointer">
                          Daftarkan ke Sub-Server AKADEMI KEPOLISIAN (#registrasi)
                        </button>`
                     : ''
                 }
                 <button
                   type="button"
                   id="btn-sheet-acad-enroll"
                   ${elig.eligible ? '' : 'disabled'}
                   class="w-full min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                     elig.eligible
                       ? 'bg-[#0EA5E9]/20 border-[#0EA5E9]/60 text-[#38BDF8] hover:bg-[#0EA5E9]/30'
                       : 'bg-[#111214] border-white/10 text-[#80848E] opacity-70 cursor-not-allowed'
                   }"
                 >
                   ${elig.eligible ? 'Daftarkan ke Barisan Taruna Akpol' : `Akpol: ${escapeHtml(elig.reasons[0])}`}
                 </button>
               </div>`
            : ''
      }

      <!-- Collapsible Structural Assignment -->
      <details open class="rounded-xl bg-[#111214] border border-white/[0.06] overflow-hidden">
        <summary class="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.03]">
          <span class="text-[11px] font-bold tracking-wide text-[#F2F3F5]">PENUGASAN DIVISI &amp; JABATAN</span>
          <span class="text-[10px] text-[#80848E]">Ubah Langsung</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] space-y-2.5">
          <div>
            <label for="select-member-div" class="block text-[11px] font-semibold text-[#B5BAC1] mb-1">Divisi Operasional</label>
            <select id="select-member-div" class="w-full min-h-[38px] px-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
              <option value="">-- Belum Ada Divisi --</option>
              ${state.divisions
                .map(
                  (d) =>
                    `<option value="${d.id}" ${member.divisionId === d.id ? 'selected' : ''}>${escapeHtml(d.name)} (${escapeHtml(d.callsign)})</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="select-member-billet" class="block text-[11px] font-semibold text-[#B5BAC1] mb-1">Jabatan Komando</label>
              <select id="select-member-billet" class="w-full min-h-[38px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
                <option value="">-- Tanpa Jabatan --</option>
                ${state.billets
                  .map(
                    (b) =>
                      `<option value="${b.id}" ${member.billetId === b.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label for="select-member-subrole" class="block text-[11px] font-semibold text-[#B5BAC1] mb-1">Admin Server</label>
              <select id="select-member-subrole" class="w-full min-h-[38px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
                <option value="">-- Anggota Biasa --</option>
                ${SUB_ROLES.map(
                  (sr) =>
                    `<option value="${sr.id}" ${member.subRole === sr.id ? 'selected' : ''}>${escapeHtml(sr.name)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          ${
            isInsideSubServer && activeSubServer
              ? `<div>
                   <label for="select-sub-member-role" class="block text-[11px] font-semibold text-[#B5BAC1] mb-1">Role Sub-Server (${escapeHtml(activeSubServer.shortCode)})</label>
                   <select id="select-sub-member-role" class="w-full min-h-[38px] px-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
                     <option value="">-- Standar Anggota Satuan --</option>
                     ${(activeSubServer.customRoles || [])
                       .map(
                         (cr) =>
                           `<option value="${escapeHtml(cr.name)}" ${
                             (typeof activeSubServer.memberRoles?.[member.id] === 'object'
                               ? activeSubServer.memberRoles[member.id]?.roleName
                               : activeSubServer.memberRoles?.[member.id]) === cr.name
                               ? 'selected'
                               : ''
                           }>${escapeHtml(cr.name)}</option>`
                       )
                       .join('')}
                   </select>
                 </div>`
              : ''
          }
        </div>
      </details>

      <!-- Collapsible Personal Authority -->
      <details class="rounded-xl bg-[#111214] border border-[#5865F2]/30 overflow-hidden" data-testid="personal-authority-panel">
        <summary class="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.03]">
          <span class="text-[11px] font-bold tracking-wide text-[#93C5FD]">OTORITAS SUB-SERVER PERORANGAN</span>
          <span class="text-[10px] text-[#80848E]">${pa.canOwnSubServer ? 'Owner Sub' : 'Standar'}</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-toggle-pa="canOwnSubServer"
            data-pa-val="${pa.canOwnSubServer ? '0' : '1'}"
            class="min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border text-left cursor-pointer ${
              pa.canOwnSubServer
                ? 'bg-[#23A55A]/20 border-[#23A55A]/60 text-[#4ADE80]'
                : 'bg-[#1E1F22] border-white/10 text-[#B5BAC1]'
            }"
          >
            ${pa.canOwnSubServer ? '✓ ' : '+ '}Kelola Sub-Server
          </button>
          <button
            type="button"
            data-toggle-pa="canAffiliateServer"
            data-pa-val="${pa.canAffiliateServer ? '0' : '1'}"
            class="min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border text-left cursor-pointer ${
              pa.canAffiliateServer
                ? 'bg-[#0EA5E9]/20 border-[#0EA5E9]/60 text-[#38BDF8]'
                : 'bg-[#1E1F22] border-white/10 text-[#B5BAC1]'
            }"
          >
            ${pa.canAffiliateServer ? '✓ ' : '+ '}Afiliasi Mabes
          </button>
        </div>
      </details>

      <!-- Collapsible Brevet, Medali & Sertifikat Picker -->
      <details class="rounded-xl bg-[#111214] border border-white/[0.06] overflow-hidden">
        <summary class="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.03]">
          <span class="text-[11px] font-bold tracking-wide text-[#FACC15]">SEMATKAN BREVET / MEDALI / SERTIFIKAT</span>
          <span class="text-[10px] font-mono-num text-[#B5BAC1]">${(member.awards || []).length} Terpasang</span>
        </summary>
        <div class="p-3 pt-2 border-t border-white/[0.05] flex flex-wrap gap-1.5">
          ${AWARDS_CATALOG.map((aw) => {
            const has = (member.awards || []).includes(aw.id);
            return `
              <button type="button" title="${escapeHtml(aw.desc || aw.category)}" data-toggle-award="${aw.id}" class="px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer border ${
                has ? 'bg-[#5865F2]/25 border-[#5865F2] text-white' : 'bg-[#1E1F22] border-white/10 text-[#B5BAC1]'
              }">
                ${has ? '✓ ' : '+ '}${escapeHtml(aw.name)}
              </button>
            `;
          }).join('')}
        </div>
      </details>

      <!-- Propam & Disciplinary Actions -->
      <div class="grid grid-cols-2 gap-2 pt-0.5">
        ${
          (member.detainedRemaining || 0) > 0
            ? `<button type="button" id="btn-release-member" class="min-h-[38px] rounded-xl text-xs font-semibold bg-[#10B981]/20 border border-[#10B981]/50 text-[#6EE7B7] hover:bg-[#10B981]/30 cursor-pointer">
                 Bebas Rutan (${Math.ceil(member.detainedRemaining)}d)
               </button>`
            : `<button type="button" id="btn-arrest-member" class="min-h-[38px] rounded-xl text-xs font-semibold bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FCA5A5] hover:bg-[#EF4444]/25 cursor-pointer">
                 Tahan Rutan
               </button>`
        }
        <button
          type="button"
          id="btn-demote-member"
          ${prevRank ? '' : 'disabled'}
          class="min-h-[38px] rounded-xl text-xs font-semibold border border-white/10 cursor-pointer ${
            prevRank ? 'bg-[#2B2D31] text-[#F0B232] hover:bg-[#35373C]' : 'bg-[#1E1F22] text-[#80848E] opacity-40 cursor-not-allowed'
          }"
        >
          Demosi
        </button>
        <button type="button" id="btn-kick-member" class="min-h-[38px] rounded-xl text-xs font-semibold bg-[#DA373C]/15 border border-[#DA373C]/40 text-[#F87171] hover:bg-[#DA373C]/25 cursor-pointer">
          Kick
        </button>
        <button type="button" id="btn-ban-member" class="min-h-[38px] rounded-xl text-xs font-semibold bg-[#DA373C] text-white hover:bg-[#B91C1C] cursor-pointer">
          Ban Permanen
        </button>
      </div>
    `;
  }

  return `
    <!-- Slim Non-Overlapping Banner -->
    <div class="relative h-12 shrink-0 flex items-center justify-between px-3.5" style="background: linear-gradient(135deg, ${bannerBg} 0%, #111214 100%);">
      <span class="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-black/50 text-[#F2F3F5] truncate max-w-[230px]">
        ${escapeHtml(statusText)}
      </span>
      <button type="button" id="btn-close-sheet" aria-label="Tutup profil" class="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center cursor-pointer shrink-0">
        ${svgIcons.close}
      </button>
    </div>

    <!-- Dedicated Non-Overlapping Header Identity Row -->
    <div class="px-4 py-2.5 border-b border-white/[0.07] bg-[#18191C] flex items-center gap-3 shrink-0" data-testid="profile-identity-header">
      <div class="relative shrink-0 w-14 h-14 rounded-full bg-[#111214]" style="box-shadow: 0 0 0 2px ${memIdentity.frameMeta.accent};">
        ${avatarSvg}
        <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#18191C]" style="background:${statusColor}"></span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-base font-extrabold text-[#F2F3F5] truncate">${escapeHtml(member.icName)}</h2>
          <span class="text-xs font-bold font-mono-num shrink-0 ${member.betahScore >= 60 ? 'text-[#23A55A]' : 'text-[#F0B232]'}">
            ${Math.round(member.betahScore)}% Betah
          </span>
        </div>
        <div class="flex items-center justify-between gap-2 text-[11px] text-[#80848E]">
          <span class="truncate">@${escapeHtml(member.username)} · Hierarki ${hierarchyLevel}/99</span>
          <span class="font-mono-num text-[#B5BAC1] shrink-0">${Math.round(member.xp)} XP</span>
        </div>
        <div class="text-[10.5px] font-semibold truncate mt-0.5" style="color:${memIdentity.frameMeta.accent}">
          ${escapeHtml(memIdentity.frameMeta.label)}${memIdentity.awardItems.length > 0 ? ` · ${memIdentity.awardItems.length} Medali` : ''}
        </div>
      </div>
    </div>

    <!-- Switch Tabs (Role & Pangkat | Bio & Karakter | Kelola & Aksi) -->
    <div class="px-4 pt-2.5 pb-1.5 shrink-0">
      <div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#111214] border border-white/[0.06]" role="tablist" aria-label="Tab Profil Anggota">
        <button type="button" data-profile-tab="roles" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer truncate ${activeTab === 'roles' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Role (${totalRolesCount})
        </button>
        <button type="button" data-profile-tab="bio" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer truncate ${activeTab === 'bio' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Bio &amp; Karakter
        </button>
        <button type="button" data-profile-tab="manage" class="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold cursor-pointer truncate ${activeTab === 'manage' ? 'theme-accent-btn' : 'text-[#B5BAC1] hover:text-white'}">
          Kelola &amp; Aksi
        </button>
      </div>
    </div>

    <div class="scroll-y-thin flex-1 px-4 pb-5 pt-1 space-y-2.5">
      ${tabContent}
    </div>
  `;
}

export function wireMemberProfileHandlers(container, store, member) {
  container.querySelectorAll('[data-profile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => store.setProfileTab(btn.dataset.profileTab));
  });

  const promoBtn = container.querySelector('#btn-promote-member');
  if (promoBtn) promoBtn.addEventListener('click', () => store.promote(member.id));

  const demoteBtn = container.querySelector('#btn-demote-member');
  if (demoteBtn) demoteBtn.addEventListener('click', () => store.demote(member.id));

  const praiseBtn = container.querySelector('#btn-praise-member');
  if (praiseBtn) praiseBtn.addEventListener('click', () => store.praiseMember(member.id));

  const purnaBtn = container.querySelector('#btn-purna-member');
  if (purnaBtn) {
    purnaBtn.addEventListener('click', () => {
      store.purnaTugas(member.id);
    });
  }

  const kickBtn = container.querySelector('#btn-kick-member');
  if (kickBtn) kickBtn.addEventListener('click', () => store.kickOrBan(member.id, false));

  const banBtn = container.querySelector('#btn-ban-member');
  if (banBtn) banBtn.addEventListener('click', () => store.kickOrBan(member.id, true));

  const arrestBtn = container.querySelector('#btn-arrest-member');
  if (arrestBtn) {
    arrestBtn.addEventListener('click', () => {
      store.arrestMember(member.id, 24, 'Penahanan etik melalui profil personel');
    });
  }
  const releaseBtn = container.querySelector('#btn-release-member');
  if (releaseBtn) {
    releaseBtn.addEventListener('click', () => store.releaseMember(member.id));
  }

  const divSel = container.querySelector('#select-member-div');
  if (divSel) {
    divSel.addEventListener('change', (e) => {
      if (e.target.value) store.setMemberDivision(member.id, e.target.value);
    });
  }
  const billetSel = container.querySelector('#select-member-billet');
  if (billetSel) {
    billetSel.addEventListener('change', (e) => {
      if (e.target.value) store.setMemberBillet(member.id, e.target.value);
    });
  }
  const subRoleSel = container.querySelector('#select-member-subrole');
  if (subRoleSel) {
    subRoleSel.addEventListener('change', (e) => {
      store.setSubRole(member.id, e.target.value);
    });
  }

  const subMemberRoleSel = container.querySelector('#select-sub-member-role');
  if (subMemberRoleSel && store.setSubServerMemberRole && store.ui.activeServerId !== 'main') {
    subMemberRoleSel.addEventListener('change', (e) => {
      store.setSubServerMemberRole(store.ui.activeServerId, member.id, e.target.value);
    });
  }

  container.querySelectorAll('[data-toggle-award]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleAward(member.id, btn.dataset.toggleAward);
    });
  });

  container.querySelectorAll('[data-toggle-pa]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.togglePersonalAuthority(member.id, btn.dataset.togglePa, btn.dataset.paVal === '1');
    });
  });

  const akpolRegBtn = container.querySelector('#btn-sheet-akpol-reg');
  if (akpolRegBtn) akpolRegBtn.addEventListener('click', () => store.submitAkpolReg(member.id));

  const acadEnroll = container.querySelector('#btn-sheet-acad-enroll');
  if (acadEnroll) acadEnroll.addEventListener('click', () => store.enrollInAcademy(member.id));

  const acadTrain = container.querySelector('#btn-sheet-acad-train');
  if (acadTrain) {
    acadTrain.addEventListener('click', () => {
      const ok = store.trainAcademyCadet(member.id);
      if (!ok) store.requestAkpolDrill(member.id);
    });
  }

  const acadGrad = container.querySelector('#btn-sheet-acad-grad');
  if (acadGrad) acadGrad.addEventListener('click', () => store.graduateAcademyCadet(member.id));

  const acadFail = container.querySelector('#btn-sheet-acad-fail');
  if (acadFail) acadFail.addEventListener('click', () => store.failAcademyCadet(member.id));
}
