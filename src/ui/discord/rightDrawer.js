import { avatarEngine } from '../../engine/avatarEngine.js';
import { getBilletById, getRankById, resolveSubServerRoleEntry } from '../../engine/rules.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function renderRightDrawer(drawerEl, store, searchQuery, onSearchChange, onPinToBottom) {
  const { state, ui } = store;
  const activeSub =
    ui && ui.activeServerId !== 'main' && ui.activeServerId !== 'dm'
      ? (state.subServers || []).find((s) => s.id === ui.activeServerId) || null
      : null;

  const memberSig = state.members
    .map(
      (m) =>
        `${m.id}:${m.status}:${m.rankId}:${m.divisionId || ''}:${m.billetId || ''}:${m.subRole || ''}:${(
          m.awards || []
        ).join('+')}:${Math.round(m.betahScore || 0)}`
    )
    .join(',');
  const rightKey = `${ui?.activeServerId || 'main'}|${activeSub ? `${activeSub.ownerJoined}:${activeSub.memberIds.length}` : ''}|q=${searchQuery || ''}|${memberSig}`;
  if (drawerEl.dataset.renderKey === rightKey && drawerEl.firstElementChild) {
    return;
  }
  drawerEl.dataset.renderKey = rightKey;

  if (activeSub) {
    const subOwnerMember =
      activeSub.ownerId === 'owner'
        ? null
        : state.members.find((m) => m.id === activeSub.ownerId);
    const subMembers = state.members.filter(
      (m) => m.id !== activeSub.ownerId && activeSub.memberIds.includes(m.id)
    );
    const ownerSubRoleResolved = resolveSubServerRoleEntry(
      activeSub.memberRoles?.['owner'],
      'Tamu VIP',
      '#4ADE80'
    );
    const ownerAvatar = avatarEngine.renderSvg('owner', 'kapolda_izumiya', {
      isOwner: true,
      state,
      sizeClass: 'w-9 h-9 rounded-full overflow-hidden block',
    });

    const renderSubRow = (m, isSubOwner = false) => {
      const rank = getRankById(state, m.rankId);
      const resolvedSubRole = resolveSubServerRoleEntry(
        activeSub.memberRoles?.[m.id],
        isSubOwner ? `Ketua ${activeSub.shortCode}` : 'Anggota',
        activeSub.color || '#8B5CF6'
      );
      const avatarSvg = avatarEngine.renderSvg(m.id, m.username, {
        member: m,
        state,
        sizeClass: 'w-9 h-9 rounded-full overflow-hidden block',
      });
      const statusDotColor =
        m.status === 'online-2d' ? '#23A55A' : m.status === 'online-chat' ? '#F0B232' : '#4E5058';

      return `
        <button
          type="button"
          data-member-id="${m.id}"
          class="w-full min-h-[50px] px-2 py-1.5 rounded-xl hover:bg-[#2B2D31] flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative shrink-0">
              ${avatarSvg}
              <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1E1F22]" style="background:${statusDotColor}"></span>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate flex items-center gap-1" style="color:${isSubOwner ? activeSub.color : rank.color}">
                <span class="truncate">${escapeHtml(m.icName)}</span>
              </div>
              <div class="text-[11px] text-[#80848E] truncate">
                ${escapeHtml(resolvedSubRole.roleName)} · ${escapeHtml(rank.name)}
              </div>
            </div>
          </div>
          ${isSubOwner ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D4A024]/20 text-[#FACC15] shrink-0">KETUA</span>` : ''}
        </button>
      `;
    };

    drawerEl.innerHTML = `
      <div class="p-3 border-b border-white/[0.07] flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-sm font-bold text-[#F2F3F5] truncate">${escapeHtml(activeSub.name)}</div>
          <div class="text-[11px] text-[#80848E]">${activeSub.memberIds.length} Anggota Sub-Server</div>
        </div>
        <button type="button" id="btn-close-right-drawer" aria-label="Tutup daftar anggota" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
          ${svgIcons.close}
        </button>
      </div>

      <div class="flex-1 scroll-y-thin p-2 space-y-3.5">
        <div>
          <div class="px-2 pb-1 text-[10px] font-bold tracking-wider" style="color:${activeSub.color}">PENGELOLA SUB-SERVER</div>
          ${
            activeSub.ownerId === 'owner'
              ? `<button type="button" data-member-id="owner" class="w-full px-2 py-2 rounded-xl bg-[#2B2D31]/70 hover:bg-[#35373C] flex items-center gap-2.5 text-left cursor-pointer">
                  <div class="relative shrink-0">${ownerAvatar}<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-[#23A55A]"></span></div>
                  <div class="min-w-0">
                    <div class="text-sm font-bold text-[#FACC15] truncate">${escapeHtml(state.ownerName)} (Anda)</div>
                    <div class="text-[11px] text-[#B5BAC1] truncate">Owner &amp; Pendiri Sub-Server</div>
                  </div>
                </button>`
              : subOwnerMember
                ? renderSubRow(subOwnerMember, true)
                : '<div class="px-2 text-xs text-[#80848E]">Pengelola tidak aktif</div>'
          }
        </div>

        ${
          activeSub.ownerId !== 'owner'
            ? `<div>
                <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#D4A024]">STATUS KAPOLDA DI SUB-SERVER</div>
                ${
                  activeSub.ownerJoined
                    ? `<button type="button" data-member-id="owner" class="w-full px-2 py-2 rounded-xl bg-[#2B2D31]/70 hover:bg-[#35373C] flex items-center gap-2.5 text-left cursor-pointer">
                        <div class="relative shrink-0">${ownerAvatar}<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-[#23A55A]"></span></div>
                        <div class="min-w-0">
                          <div class="text-sm font-bold text-[#FACC15] truncate">${escapeHtml(state.ownerName)} (Anda)</div>
                          <div class="text-[11px] text-[#4ADE80] truncate">${escapeHtml(ownerSubRoleResolved.roleName)}</div>
                          ${ownerSubRoleResolved.raw?.badge ? `<div class="text-[10px] text-[#B5BAC1] truncate">${escapeHtml(ownerSubRoleResolved.raw.badge)}</div>` : ''}
                        </div>
                      </button>`
                    : `<div class="p-2.5 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2">
                        <div class="text-[11px] text-[#B5BAC1]">Anda belum bergabung ke sub-server ini.</div>
                        <button type="button" id="btn-right-join-sub" class="w-full min-h-[34px] rounded-lg theme-accent-btn text-xs font-semibold cursor-pointer">Gabung Sub-Server</button>
                      </div>`
                }
              </div>`
            : ''
        }

        <div>
          <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#B5BAC1]">ANGGOTA SATUAN (${subMembers.length})</div>
          <div class="space-y-0.5">
            ${
              subMembers.length > 0
                ? subMembers.map((m) => renderSubRow(m, false)).join('')
                : '<div class="px-2 text-xs text-[#80848E]">Belum ada anggota lain di sub-server ini.</div>'
            }
          </div>
        </div>
      </div>
    `;

    drawerEl.querySelector('#btn-close-right-drawer').addEventListener('click', () => {
      store.toggleRightDrawer(false);
    });
    const rJoin = drawerEl.querySelector('#btn-right-join-sub');
    if (rJoin) {
      rJoin.addEventListener('click', () => {
        if (onPinToBottom) onPinToBottom();
        store.joinSubServer(activeSub.id);
      });
    }
    drawerEl.querySelectorAll('[data-member-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.openMemberInspector(btn.dataset.memberId);
      });
    });
    return;
  }

  const q = (searchQuery || '').trim().toLowerCase();
  const rankMap = new Map(state.ranks.map((r) => [r.id, r]));
  const divMap = new Map(state.divisions.map((d) => [d.id, d]));
  const matchesQuery = (m) => {
    if (!q) return true;
    const rName = rankMap.get(m.rankId)?.name?.toLowerCase() || '';
    const dName = (m.divisionId && divMap.get(m.divisionId)?.name?.toLowerCase()) || '';
    return (
      m.icName.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      rName.includes(q) ||
      dName.includes(q)
    );
  };

  const filteredMembers = state.members.filter(matchesQuery);
  const inCity = filteredMembers.filter((m) => m.status === 'online-2d');
  const inChat = filteredMembers.filter((m) => m.status === 'online-chat');
  const sleeping = filteredMembers.filter((m) => m.status === 'offline');

  const renderMemberRow = (m) => {
    const rank = rankMap.get(m.rankId) || state.ranks[0];
    const div = m.divisionId ? divMap.get(m.divisionId) || null : null;
    const billet = getBilletById(state, m.billetId);
    const avatarSvg = avatarEngine.renderSvg(m.id, m.username, {
      member: m,
      state,
      sizeClass: 'w-9 h-9 rounded-full overflow-hidden block',
    });
    const statusDotColor =
      m.status === 'online-2d' ? '#23A55A' : m.status === 'online-chat' ? '#F0B232' : '#4E5058';

    return `
      <button
        type="button"
        data-member-id="${m.id}"
        class="w-full min-h-[50px] px-2 py-1.5 rounded-xl hover:bg-[#2B2D31] flex items-center justify-between gap-2 text-left cursor-pointer ${
          m.status === 'offline' ? 'opacity-60' : ''
        }"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative shrink-0">
            ${avatarSvg}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1E1F22]" style="background:${statusDotColor}"></span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold truncate flex items-center gap-1.5" style="color:${rank.color}">
              <span class="truncate">${escapeHtml(m.icName)}</span>
              ${m.subRole ? `<span class="text-[9.5px] px-1 rounded bg-[#5865F2]/25 text-[#A5B4FC] shrink-0">${escapeHtml(m.subRole)}</span>` : ''}
            </div>
            <div class="text-[11px] text-[#80848E] truncate">
              ${escapeHtml(rank.name)}${div ? ` · ${escapeHtml(div.name)}` : ''}${billet ? ` · ${escapeHtml(billet.name)}` : ''}
            </div>
          </div>
        </div>
        <span class="text-[11px] font-mono-num shrink-0 ${m.betahScore >= 60 ? 'text-[#23A55A]' : 'text-[#F0B232]'}">${Math.round(m.betahScore)}%</span>
      </button>
    `;
  };

  const ownerAvatar = avatarEngine.renderSvg('owner', 'kapolda_izumiya', {
    isOwner: true,
    state,
    sizeClass: 'w-9 h-9 rounded-full overflow-hidden block',
  });

  const wasSearchFocused = document.activeElement?.id === 'inp-member-search';

  drawerEl.innerHTML = `
    <div class="p-3 border-b border-white/[0.07] space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-bold text-[#F2F3F5]">Anggota Server (${state.members.length + 1})</div>
          <div class="text-[11px] text-[#80848E]">Ketuk profil untuk 9 kategori role &amp; bio</div>
        </div>
        <button type="button" id="btn-close-right-drawer" aria-label="Tutup daftar anggota" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
          ${svgIcons.close}
        </button>
      </div>
      <input
        id="inp-member-search"
        type="search"
        value="${escapeHtml(searchQuery || '')}"
        placeholder="Cari nama, pangkat, atau divisi..."
        class="w-full h-8 px-2.5 rounded-lg bg-[#111214] border border-white/10 text-xs text-[#F2F3F5] placeholder-[#80848E] focus:outline-none focus:border-[var(--accent-blurple)]"
      />
    </div>

    <div class="flex-1 scroll-y-thin p-2 space-y-3.5">
      <div>
        <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#D4A024]">PENDIRI &amp; KAPOLDA (1)</div>
        <button type="button" data-member-id="owner" class="w-full px-2 py-2 rounded-xl bg-[#2B2D31]/70 hover:bg-[#35373C] flex items-center gap-2.5 text-left cursor-pointer">
          <div class="relative shrink-0">
            ${ownerAvatar}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-[#23A55A]"></span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-[#FACC15] truncate">${escapeHtml(state.ownerName)} (Anda)</div>
            <div class="text-[11px] text-[#B5BAC1]">Owner · Founder Kepolisian</div>
          </div>
        </button>
      </div>

      <div>
        <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#23A55A]">PATROLI DI KOTA 2D (${inCity.length})</div>
        <div class="space-y-0.5">${inCity.map(renderMemberRow).join('')}</div>
      </div>

      ${
        inChat.length > 0
          ? `<div>
              <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#F0B232]">ONLINE DI LOBI (${inChat.length})</div>
              <div class="space-y-0.5">${inChat.map(renderMemberRow).join('')}</div>
            </div>`
          : ''
      }

      ${
        sleeping.length > 0
          ? `<div>
              <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#80848E]">OFFLINE · TIDUR MALAM (${sleeping.length})</div>
              <div class="space-y-0.5">${sleeping.map(renderMemberRow).join('')}</div>
            </div>`
          : ''
      }
    </div>
  `;

  const searchInput = drawerEl.querySelector('#inp-member-search');
  if (searchInput) {
    if (wasSearchFocused) {
      searchInput.focus();
      const len = searchInput.value.length;
      searchInput.setSelectionRange(len, len);
    }
    searchInput.addEventListener('input', (e) => {
      if (onSearchChange) onSearchChange(e.target.value);
    });
  }

  drawerEl.querySelector('#btn-close-right-drawer').addEventListener('click', () => {
    store.toggleRightDrawer(false);
  });
  drawerEl.querySelectorAll('[data-member-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.openMemberInspector(btn.dataset.memberId);
    });
  });
}
