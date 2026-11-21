import { CHANNELS } from '../../engine/constants.js';
import { avatarEngine } from '../../engine/avatarEngine.js';
import { serverLogoEngine } from '../../engine/serverLogoEngine.js';
import { calculateServerAttractiveness, getDivisionById } from '../../engine/rules.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function renderLeftDrawer(drawerEl, store, onPinToBottom) {
  const { state, ui } = store;
  const attractiveness = calculateServerAttractiveness(state).total;
  const subServers = state.subServers || [];
  const isDmMode = ui.activeServerId === 'dm';
  const activeSub =
    !isDmMode && ui.activeServerId !== 'main'
      ? subServers.find((s) => s.id === ui.activeServerId) || null
      : null;

  const mainUnreadCount = Object.values(state.unreadByChannel || {}).reduce((a, b) => a + b, 0);
  const dmUnreadCount = (state.dms || []).filter((d) => !d.read && !d.isOwner).length;
  const pendingProposals = (state.divisionProposals || []).filter((p) => p.status === 'PENDING');
  const subUnreads = subServers
    .map(
      (s) =>
        `${s.id}:${s.affiliatedToMain ? 1 : 0}:${s.ownerJoined ? 1 : 0}:${s.memberIds?.length || 0}:${Object.values(
          s.unreadByChannel || {}
        ).reduce((a, b) => a + b, 0)}`
    )
    .join('|');
  const mainChanUnreads = Object.entries(state.unreadByChannel || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  const propSig = pendingProposals.map((p) => p.id).join(',');
  const renderKey = `${ui.activeServerId}|${ui.activeChannelId}|${ui.activeSubChannelId}|${ui.activeDmPeerId || ''}|${state.members.length}|${subServers.length}|${attractiveness}|${mainUnreadCount}|${dmUnreadCount}|${(state.dms || []).length}|${propSig}|${mainChanUnreads}|${subUnreads}`;
  if (drawerEl.dataset.renderKey === renderKey && drawerEl.firstElementChild) {
    return;
  }
  drawerEl.dataset.renderKey = renderKey;

  const grouped = {};
  for (const c of CHANNELS) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  const renderChannelPane = () => {
    if (isDmMode) {
      const peerIds = [];
      const seen = new Set();
      for (const p of pendingProposals) {
        if (p.proposerId && !seen.has(p.proposerId)) {
          seen.add(p.proposerId);
          peerIds.push(p.proposerId);
        }
      }
      for (let i = (state.dms || []).length - 1; i >= 0; i--) {
        const d = state.dms[i];
        if (d.peerId && !seen.has(d.peerId)) {
          seen.add(d.peerId);
          peerIds.push(d.peerId);
        }
      }
      for (const div of state.divisions || []) {
        if (div.headId && !seen.has(div.headId)) {
          seen.add(div.headId);
          peerIds.push(div.headId);
        }
      }

      const peerRowsHtml = peerIds
        .map((pid) => {
          const m = state.members.find((mem) => mem.id === pid);
          if (!m) return '';
          const active = ui.activeDmPeerId === m.id;
          const threadMsgs = (state.dms || []).filter((d) => d.peerId === m.id);
          const lastMsg = threadMsgs[threadMsgs.length - 1];
          const unread = threadMsgs.filter((d) => !d.read && !d.isOwner).length;
          const hasPending = pendingProposals.some((p) => p.proposerId === m.id);
          const peerDiv =
            getDivisionById(state, m.divisionId) ||
            (state.divisions || []).find((d) => d.headId === m.id) ||
            null;
          const avatarSvg = avatarEngine.renderSvg(m.id, m.username, {
            member: m,
            state,
            sizeClass: 'w-8 h-8 rounded-full overflow-hidden block shrink-0',
          });
          return `
            <button
              type="button"
              data-dm-peer="${m.id}"
              class="w-full px-2 py-2 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer ${
                active ? 'bg-[#35373C] text-white' : 'text-[#949BA4] hover:bg-[#2B2D31] hover:text-[#DBDEE1]'
              }"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                ${avatarSvg}
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(m.icName)}</span>
                    ${hasPending ? `<span class="text-[8.5px] font-bold px-1 rounded bg-[#F0B232]/25 text-[#FACC15] shrink-0">ACC</span>` : ''}
                  </div>
                  <div class="text-[10px] text-[#80848E] truncate">
                    ${
                      lastMsg
                        ? escapeHtml(lastMsg.text.slice(0, 38))
                        : peerDiv
                          ? `Ketua ${escapeHtml(peerDiv.callsign)}`
                          : 'Ketuk untuk DM'
                    }
                  </div>
                </div>
              </div>
              ${
                unread > 0 && !active
                  ? `<span class="px-1.5 py-0.5 rounded-md bg-[#DA373C] text-white text-[10px] font-mono-num font-bold shrink-0">${unread}</span>`
                  : ''
              }
            </button>
          `;
        })
        .join('');

      return `
        <div class="p-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-bold text-[#F2F3F5] truncate">Direct Messages</div>
            <div class="text-[11px] text-[#80848E] font-mono-num">${pendingProposals.length} Proposal · ${dmUnreadCount} Belum Dibaca</div>
          </div>
          <button type="button" id="btn-close-left-drawer" aria-label="Tutup menu DM" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
            ${svgIcons.close}
          </button>
        </div>
        <div class="flex-1 scroll-y-thin p-2 space-y-1">
          <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#80848E]">KETUA DIVISI &amp; KONTAK (${peerIds.length})</div>
          ${peerRowsHtml || '<div class="px-2 py-4 text-xs text-[#80848E]">Belum ada DM masuk.</div>'}
        </div>
      `;
    }

    if (!activeSub) {
      return `
        <div class="p-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-bold text-[#F2F3F5] truncate">Kepolisian R. Izumiya</div>
            <div class="text-[11px] text-[#80848E] font-mono-num">${state.members.length + 1} Member · Daya Tarik ${attractiveness}%</div>
          </div>
          <button type="button" id="btn-close-left-drawer" aria-label="Tutup menu channel" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
            ${svgIcons.close}
          </button>
        </div>

        <div class="flex-1 scroll-y-thin p-2 space-y-4">
          ${Object.entries(grouped)
            .map(
              ([cat, chans]) => `
              <div>
                <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#80848E]">${escapeHtml(cat)}</div>
                <div class="space-y-0.5">
                  ${chans
                    .map((c) => {
                      const active = c.id === ui.activeChannelId;
                      const unread = state.unreadByChannel[c.id] || 0;
                      return `
                        <button
                          type="button"
                          data-channel-id="${c.id}"
                          class="w-full min-h-[40px] px-2.5 rounded-lg flex items-center justify-between text-left cursor-pointer ${
                            active ? 'bg-[#35373C] text-white font-semibold' : 'text-[#949BA4] hover:bg-[#2B2D31] hover:text-[#DBDEE1]'
                          }"
                        >
                          <span class="flex items-center gap-2 min-w-0">
                            <span class="text-[#80848E]">${svgIcons.hash}</span>
                            <span class="text-sm truncate">${escapeHtml(c.name)}</span>
                          </span>
                          ${
                            unread > 0 && !active
                              ? `<span class="px-1.5 py-0.5 rounded-md bg-[#DA373C] text-white text-[10px] font-mono-num font-bold">${unread}</span>`
                              : ''
                          }
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      `;
    }

    const subOwner =
      activeSub.ownerId === 'owner'
        ? { icName: state.ownerName }
        : state.members.find((m) => m.id === activeSub.ownerId);
    return `
      <div class="p-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          ${serverLogoEngine.renderSubServerLogo(activeSub, { sizeClass: 'w-8 h-8 shrink-0', compact: true })}
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-sm font-bold text-[#F2F3F5] truncate">${escapeHtml(activeSub.name)}</span>
            </div>
            <div class="text-[11px] text-[#80848E] truncate">
              Owner: ${escapeHtml(subOwner?.icName || 'Unit')} · ${activeSub.affiliatedToMain ? 'Terafiliasi' : 'Mandiri'}
            </div>
          </div>
        </div>
        <button type="button" id="btn-close-left-drawer" aria-label="Tutup menu channel" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
          ${svgIcons.close}
        </button>
      </div>

      <div class="flex-1 scroll-y-thin p-2 space-y-3">
        <div class="p-2.5 rounded-xl bg-[#18191C] border border-white/[0.06] space-y-1.5">
          <div class="text-[11px] text-[#B5BAC1] leading-snug">${escapeHtml(activeSub.description)}</div>
          <div class="flex items-center gap-1.5 pt-0.5">
            ${
              !activeSub.ownerJoined
                ? `<button type="button" data-drawer-join="${activeSub.id}" class="flex-1 min-h-[32px] rounded-lg theme-accent-btn text-[11px] font-semibold cursor-pointer">Gabung Sub-Server</button>`
                : `<span class="flex-1 text-[10.5px] font-semibold text-[#4ADE80]">✓ Anda Telah Bergabung</span>`
            }
            ${
              !activeSub.affiliatedToMain
                ? `<button type="button" data-drawer-aff="${activeSub.id}" class="min-h-[32px] px-2.5 rounded-lg bg-[#23A55A]/20 border border-[#23A55A]/50 text-[#4ADE80] text-[11px] font-semibold cursor-pointer">Afiliasi</button>`
                : ''
            }
          </div>
        </div>

        <div>
          <div class="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#80848E]">CHANNEL SUB-SERVER (${activeSub.channels.length})</div>
          <div class="space-y-0.5">
            ${activeSub.channels
              .map((c) => {
                const active = c.id === ui.activeSubChannelId;
                const unread = (activeSub.unreadByChannel && activeSub.unreadByChannel[c.id]) || 0;
                return `
                  <button
                    type="button"
                    data-sub-channel-id="${c.id}"
                    class="w-full min-h-[40px] px-2.5 rounded-lg flex items-center justify-between text-left cursor-pointer ${
                      active ? 'bg-[#35373C] text-white font-semibold' : 'text-[#949BA4] hover:bg-[#2B2D31] hover:text-[#DBDEE1]'
                    }"
                  >
                    <span class="flex items-center gap-2 min-w-0">
                      <span class="text-[#80848E]">${svgIcons.hash}</span>
                      <span class="text-sm truncate">${escapeHtml(c.name)}</span>
                    </span>
                    ${
                      unread > 0 && !active
                        ? `<span class="px-1.5 py-0.5 rounded-md bg-[#DA373C] text-white text-[10px] font-mono-num font-bold">${unread}</span>`
                        : ''
                    }
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  };

  drawerEl.innerHTML = `
    <div class="flex flex-1 min-h-0">
      <!-- Left Discord Server Rail -->
      <div class="w-16 theme-app py-2.5 flex flex-col items-center gap-2 border-r border-white/[0.06] shrink-0" data-testid="server-rail">
        <div class="relative w-full flex justify-center">
          ${isDmMode ? '<span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white"></span>' : ''}
          <button
            type="button"
            data-server-id="dm"
            title="Direct Message & Proposal Divisi"
            aria-label="Direct Message Kapolda"
            class="relative w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-colors ${
              isDmMode ? 'theme-accent-btn' : 'bg-[#2B2D31] text-[#B5BAC1] hover:bg-[var(--accent-blurple)] hover:text-white'
            }"
          >
            ${svgIcons.dm}
            ${
              (dmUnreadCount > 0 || pendingProposals.length > 0) && !isDmMode
                ? `<span class="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full ${pendingProposals.length > 0 ? 'bg-[#F0B232] text-[#111214]' : 'bg-[#DA373C] text-white'} text-[9.5px] font-mono-num font-bold flex items-center justify-center">${dmUnreadCount || pendingProposals.length}</span>`
                : ''
            }
          </button>
        </div>

        <div class="relative w-full flex justify-center">
          ${ui.activeServerId === 'main' ? '<span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white"></span>' : ''}
          <button
            type="button"
            data-server-id="main"
            aria-label="Server Utama Kepolisian Republik Izumiya"
            class="relative w-12 h-12 rounded-2xl bg-[#111827] border-2 flex items-center justify-center cursor-pointer ${
              ui.activeServerId === 'main' ? 'border-[#D4A024] ring-2 ring-[#D4A024]/30' : 'border-white/10 hover:border-white/30'
            }"
          >
            ${serverLogoEngine.renderMainLogo('w-9 h-9')}
            ${
              mainUnreadCount > 0 && ui.activeServerId !== 'main'
                ? `<span class="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#DA373C] text-white text-[9.5px] font-mono-num font-bold flex items-center justify-center">${mainUnreadCount}</span>`
                : ''
            }
          </button>
        </div>

        <div class="w-8 h-[1px] bg-white/10 shrink-0"></div>

        <div class="flex-1 w-full scroll-y-thin flex flex-col items-center gap-2 py-0.5">
          ${subServers
            .map((sub) => {
              const isActive = ui.activeServerId === sub.id;
              const unread = Object.values(sub.unreadByChannel || {}).reduce((a, b) => a + b, 0);
              return `
                <div class="relative w-full flex justify-center">
                  ${isActive ? '<span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white"></span>' : ''}
                  <button
                    type="button"
                    data-server-id="${sub.id}"
                    title="${escapeHtml(sub.name)}"
                    aria-label="Sub-Server ${escapeHtml(sub.name)}"
                    class="relative w-11 h-11 flex items-center justify-center cursor-pointer transition-all ${
                      isActive ? 'rounded-xl ring-2 ring-white bg-[#1B1D22]' : 'rounded-2xl hover:rounded-xl opacity-90 hover:opacity-100 bg-[#18191C]'
                    }"
                  >
                    ${serverLogoEngine.renderSubServerLogo(sub, { sizeClass: 'w-9 h-9', compact: true })}
                    <span
                      title="${sub.affiliatedToMain ? 'Terafiliasi Server Utama' : 'Mandiri (Belum Afiliasi)'}"
                      class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111214]"
                      style="background:${sub.affiliatedToMain ? '#23A55A' : '#F0B232'}"
                    ></span>
                    ${
                      unread > 0 && !isActive
                        ? `<span class="absolute -top-1 -right-1 px-1 min-w-[15px] h-4 rounded-full bg-[#DA373C] text-white text-[9px] font-bold flex items-center justify-center">${unread}</span>`
                        : ''
                    }
                  </button>
                </div>
              `;
            })
            .join('')}

          <button
            type="button"
            id="drawer-add-subserver"
            aria-label="Buat Sub-Server Baru"
            title="Buat Sub-Server Baru"
            class="w-11 h-11 rounded-2xl bg-[#1E1F22] hover:bg-[#23A55A] text-[#23A55A] hover:text-white border border-dashed border-[#23A55A]/50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ${svgIcons.plus}
          </button>
        </div>

        <div class="w-8 h-[1px] bg-white/10 shrink-0"></div>
        <button type="button" id="drawer-go-org" aria-label="Buka Manajemen Struktur" class="w-10 h-10 rounded-xl bg-[#2B2D31] hover:bg-[var(--accent-blurple)] text-[#B5BAC1] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0">
          ${svgIcons.org}
        </button>
        <button type="button" id="drawer-go-city" aria-label="Masuk ke Kota 2D" class="w-10 h-10 rounded-xl bg-[#2B2D31] hover:bg-[#23A55A] text-[#B5BAC1] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0">
          ${svgIcons.city}
        </button>
        <button type="button" id="drawer-open-settings" aria-label="Buka Pengaturan Game & Discord" title="Pengaturan" class="w-10 h-10 rounded-xl bg-[#2B2D31] hover:bg-[var(--accent-blurple)] text-[#FACC15] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0">
          ${svgIcons.settings}
        </button>
      </div>

      <!-- Right Channel List Pane -->
      <div class="flex-1 flex flex-col min-w-0 theme-surface">
        ${renderChannelPane()}
      </div>
    </div>
  `;

  drawerEl.querySelector('#btn-close-left-drawer').addEventListener('click', () => {
    store.toggleLeftDrawer(false);
  });
  drawerEl.querySelector('#drawer-go-org').addEventListener('click', () => {
    store.setActiveTab('org');
  });
  drawerEl.querySelector('#drawer-go-city').addEventListener('click', () => {
    store.setActiveTab('city');
  });
  drawerEl.querySelector('#drawer-open-settings').addEventListener('click', () => {
    store.openSettings('theme');
  });
  drawerEl.querySelector('#drawer-add-subserver').addEventListener('click', () => {
    store.toggleLeftDrawer(false);
    store.openOrgModal('subserver');
  });
  drawerEl.querySelectorAll('[data-server-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (onPinToBottom) onPinToBottom();
      store.setActiveServer(btn.dataset.serverId);
    });
  });
  drawerEl.querySelectorAll('[data-dm-peer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (onPinToBottom) onPinToBottom();
      store.setActiveDmPeer(btn.dataset.dmPeer);
    });
  });
  drawerEl.querySelectorAll('[data-channel-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setActiveChannel(btn.dataset.channelId);
    });
  });
  drawerEl.querySelectorAll('[data-sub-channel-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setActiveSubChannel(btn.dataset.subChannelId);
    });
  });
  const drawerJoin = drawerEl.querySelector('[data-drawer-join]');
  if (drawerJoin) {
    drawerJoin.addEventListener('click', () => {
      if (onPinToBottom) onPinToBottom();
      store.joinSubServer(drawerJoin.dataset.drawerJoin);
    });
  }
  const drawerAff = drawerEl.querySelector('[data-drawer-aff]');
  if (drawerAff) {
    drawerAff.addEventListener('click', () => {
      store.affiliateSubServerByOwner(drawerAff.dataset.drawerAff);
    });
  }
}
