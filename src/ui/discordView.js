import { CHANNELS } from '../engine/constants.js';
import { getCircadianProfile } from '../engine/aiBrain.js';
import { serverLogoEngine } from '../engine/serverLogoEngine.js';
import { formatSimClock, getDivisionById, resolveSubServerRoleEntry } from '../engine/rules.js';
import { escapeHtml, svgIcons } from './icons.js';
import { createMessageNode, renderReactionsHtml } from './discord/messageBuilder.js';
import { renderLeftDrawer } from './discord/leftDrawer.js';
import { renderRightDrawer } from './discord/rightDrawer.js';

export class DiscordView {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    this.draft = '';
    this.rendered = false;
    this.renderedChannelId = null;
    this.renderedMsgIds = [];
    this.memberSearchQuery = '';
    this.isPinnedToBottom = true;
    this._programmaticScroll = false;
    this._scrollRafId = null;
    this._lastTimestampPref = store.prefs?.showTimestamps !== false;
  }

  mount() {
    this.root.innerHTML = `
      <div class="relative flex flex-col h-full theme-surface overflow-clip">
        <!-- Compact Mobile Discord Header (48px) with Theme Gradient -->
        <header class="h-12 px-2 flex items-center justify-between theme-header-grad border-b border-white/[0.08] shrink-0">
          <div class="flex items-center gap-1 min-w-0">
            <button type="button" id="btn-open-channels" aria-label="Buka daftar channel" class="tap-target flex items-center justify-center text-[#B5BAC1] hover:text-white cursor-pointer relative">
              ${svgIcons.menu}
              <span id="total-unread-badge" class="hidden absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#DA373C]"></span>
            </button>
            <div class="flex items-center gap-1 min-w-0">
              <span id="active-channel-icon" class="text-[#80848E]">${svgIcons.hash}</span>
              <span id="active-channel-name" class="text-sm font-bold text-[#F2F3F5] truncate">obrolan-ooc</span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <div id="discord-speed-bar" class="flex items-center theme-app rounded-lg p-0.5 border border-white/[0.06]" role="group" aria-label="Kecepatan simulasi">
              <button type="button" data-speed="0" aria-label="Pause simulasi" class="speed-btn px-2 py-1 text-[11px] font-mono-num font-semibold rounded-md cursor-pointer">II</button>
              <button type="button" data-speed="1" aria-label="Kecepatan 1X" class="speed-btn px-2 py-1 text-[11px] font-mono-num font-semibold rounded-md cursor-pointer">1X</button>
              <button type="button" data-speed="2" aria-label="Kecepatan 2X" class="speed-btn px-2 py-1 text-[11px] font-mono-num font-semibold rounded-md cursor-pointer">2X</button>
            </div>
            <button type="button" id="btn-open-members" aria-label="Buka daftar anggota" class="tap-target flex items-center justify-center text-[#B5BAC1] hover:text-white cursor-pointer">
              ${svgIcons.users}
            </button>
          </div>
        </header>

        <!-- Slim 24H Clock & Channel Topic Strip -->
        <div id="channel-topic-bar" class="px-3 py-1 bg-black/25 border-b border-white/[0.05] flex items-center justify-between text-[11px] text-[#80848E] shrink-0">
          <span id="channel-topic-text" class="truncate pr-2"></span>
          <span id="discord-clock" class="font-mono-num text-[#B5BAC1] shrink-0">08:06 · Pagi</span>
        </div>

        <!-- Dynamic Sub-Server Header Strip (visible only when viewing a Sub-Server / DM) -->
        <div id="subserver-context-bar" class="hidden px-3 py-1.5 bg-black/35 border-b border-white/[0.07] shrink-0"></div>

        <!-- Keyed, Jitter-Free & Scroll-Locked Chat Message Feed -->
        <div class="relative flex-1 min-h-0 flex flex-col theme-surface">
          <div id="chat-feed" class="flex-1 scroll-y-thin chat-feed-scroll px-3 py-2.5 theme-surface" data-testid="chat-feed"></div>
          <button
            type="button"
            id="btn-jump-bottom"
            aria-label="Lompat ke pesan terbaru"
            class="hidden absolute bottom-2.5 right-3 px-3 py-1.5 rounded-lg theme-accent-btn text-[11px] font-semibold shadow-lg border border-white/15 cursor-pointer z-10"
          >
            ↓ Pesan Terbaru
          </button>
        </div>

        <!-- Quick RP Command Chips + Composer -->
        <div class="theme-surface border-t border-white/[0.07] px-2.5 pt-1.5 pb-2 shrink-0">
          <div id="quick-chips" class="flex items-center gap-1.5 scroll-x-none pb-1.5">
            <button type="button" data-cmd="Seluruh unit merapat untuk Apel di Mabes!" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">Apel Mabes</button>
            <button type="button" data-cmd="Laksanakan Razia Gabungan di Pasar!" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">Razia Pasar</button>
            <button type="button" data-cmd="Bagaimana kondisi kota sekarang?" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">Cek Kota</button>
            <button type="button" data-cmd="Kirim link rekrutmen sub-server ke chat!" class="px-2.5 py-1 rounded-lg bg-[#5865F2]/25 border border-[#5865F2]/40 hover:bg-[#5865F2]/40 text-[11px] font-semibold text-[#C7D2FE] whitespace-nowrap shrink-0 cursor-pointer">Link Sub-Server</button>
            <button type="button" data-cmd="Buat divisi baru dan perluas satuan!" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">+ Divisi</button>
            <button type="button" data-cmd="Ayo gelar event komunitas RP bersama!" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">Event RP</button>
            <button type="button" data-cmd="Selamat bergabung rekan baru, semangat patroli!" class="px-2.5 py-1 rounded-lg theme-elevated hover:brightness-110 text-[11px] font-medium text-[#F2F3F5] whitespace-nowrap shrink-0 cursor-pointer">Sambut</button>
          </div>

          <form id="chat-form" class="flex items-center gap-2">
            <input
              id="chat-input"
              type="text"
              autocomplete="off"
              placeholder="Ketik pesan, perintah, atau mention anggota..."
              class="flex-1 min-h-[42px] px-3 rounded-xl theme-elevated border border-white/[0.08] text-sm text-[#F2F3F5] placeholder-[#80848E]"
            />
            <button
              type="button"
              id="btn-send-msg"
              aria-label="Kirim pesan"
              class="min-w-[42px] min-h-[42px] rounded-xl theme-accent-btn flex items-center justify-center shrink-0 cursor-pointer"
            >
              ${svgIcons.send}
            </button>
          </form>
        </div>

        <!-- Drawer Backdrop & Side Drawers -->
        <div id="discord-drawer-backdrop" class="drawer-backdrop"></div>
        <aside id="left-channel-drawer" class="drawer-left" aria-label="Navigasi Server & Channel"></aside>
        <aside id="right-member-drawer" class="drawer-right" aria-label="Daftar Anggota AI"></aside>
      </div>
    `;

    this.rendered = true;
    this.renderedChannelId = null;
    this.renderedMsgIds = [];
    this._wireStaticHandlers();
    this.update();
  }

  _wireStaticHandlers() {
    this.root.querySelector('#btn-open-channels').addEventListener('click', () => {
      this.store.toggleLeftDrawer(true);
    });
    this.root.querySelector('#btn-open-members').addEventListener('click', () => {
      this.store.toggleRightDrawer(true);
    });
    this.root.querySelector('#discord-drawer-backdrop').addEventListener('click', () => {
      this.store.toggleLeftDrawer(false);
      this.store.toggleRightDrawer(false);
    });

    this.root.querySelectorAll('#discord-speed-bar .speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setSpeed(Number(btn.dataset.speed));
      });
    });

    this.root.querySelectorAll('#quick-chips button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.isPinnedToBottom = true;
        this.store.sendOwnerChat(btn.dataset.cmd);
      });
    });

    const subBar = this.root.querySelector('#subserver-context-bar');
    if (subBar) {
      subBar.addEventListener('click', (e) => {
        const manageBtn = e.target.closest('#btn-manage-subserver');
        if (manageBtn) {
          this.store.openSubServerManage(manageBtn.dataset.subId);
          return;
        }
        const shareBtn = e.target.closest('#btn-share-sub-invite');
        if (shareBtn) {
          this.isPinnedToBottom = true;
          this.store.sendSubServerInviteToChat(shareBtn.dataset.subId, 'lobi-rekrutmen');
          this.store.setActiveServer('main');
          this.store.setActiveChannel('lobi-rekrutmen');
          return;
        }
        const joinBtn = e.target.closest('#btn-join-subserver');
        if (joinBtn) {
          this.isPinnedToBottom = true;
          this.store.joinSubServer(joinBtn.dataset.subId);
          return;
        }
        const leaveBtn = e.target.closest('#btn-leave-subserver');
        if (leaveBtn) {
          this.store.leaveSubServer(leaveBtn.dataset.subId);
          return;
        }
        const affBtn = e.target.closest('#btn-affiliate-subserver');
        if (affBtn) {
          this.isPinnedToBottom = true;
          this.store.affiliateSubServerByOwner(affBtn.dataset.subId);
          return;
        }
        const backBtn = e.target.closest('#btn-back-main-server');
        if (backBtn) {
          this.store.setActiveServer('main');
          return;
        }
        const dmApproveBtn = e.target.closest('[data-dm-approve-prop]');
        if (dmApproveBtn) {
          this.isPinnedToBottom = true;
          this.store.approveDivisionProposal(dmApproveBtn.dataset.dmApproveProp, true);
          return;
        }
        const dmRejectBtn = e.target.closest('[data-dm-reject-prop]');
        if (dmRejectBtn) {
          this.isPinnedToBottom = true;
          this.store.approveDivisionProposal(dmRejectBtn.dataset.dmRejectProp, false);
          return;
        }
        const openDivsBtn = e.target.closest('[data-open-org-divs]');
        if (openDivsBtn) {
          this.store.setExpandedDivision(openDivsBtn.dataset.openOrgDivs);
          this.store.setOrgSubTab('divisions');
          this.store.setActiveTab('org');
        }
      });
    }

    const input = this.root.querySelector('#chat-input');
    input.addEventListener('input', (e) => {
      this.draft = e.target.value;
    });

    const submitMsg = () => {
      const text = input.value.trim();
      if (!text) return;
      this.isPinnedToBottom = true;
      this.store.sendOwnerChat(text);
      this.draft = '';
      input.value = '';
    };

    this.root.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitMsg();
    });
    this.root.querySelector('#btn-send-msg').addEventListener('click', submitMsg);

    const feedEl = this.root.querySelector('#chat-feed');
    const jumpBtn = this.root.querySelector('#btn-jump-bottom');
    feedEl.addEventListener(
      'scroll',
      () => {
        if (this._programmaticScroll) return;
        const distFromBottom = feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight;
        this.isPinnedToBottom = distFromBottom <= 30;
        if (jumpBtn) jumpBtn.classList.toggle('hidden', this.isPinnedToBottom);
      },
      { passive: true }
    );

    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        this.isPinnedToBottom = true;
        jumpBtn.classList.add('hidden');
        this._pinFeedToBottom(feedEl);
      });
    }

    feedEl.addEventListener('click', (e) => {
      const dmApproveBtn = e.target.closest('[data-dm-approve-prop]');
      if (dmApproveBtn) {
        this.isPinnedToBottom = true;
        this.store.approveDivisionProposal(dmApproveBtn.dataset.dmApproveProp, true);
        return;
      }
      const dmRejectBtn = e.target.closest('[data-dm-reject-prop]');
      if (dmRejectBtn) {
        this.isPinnedToBottom = true;
        this.store.approveDivisionProposal(dmRejectBtn.dataset.dmRejectProp, false);
        return;
      }
      const openDivsBtn = e.target.closest('[data-open-org-divs]');
      if (openDivsBtn) {
        this.store.setExpandedDivision(openDivsBtn.dataset.openOrgDivs);
        this.store.setOrgSubTab('divisions');
        this.store.setActiveTab('org');
        return;
      }
      const leadAkpolBtn = e.target.closest('[data-lead-akpol-drill]');
      if (leadAkpolBtn) {
        this.isPinnedToBottom = true;
        this.store.leadAkpolDrill();
        return;
      }
      const joinSubLinkBtn = e.target.closest('[data-join-subserver-link]');
      if (joinSubLinkBtn) {
        this.isPinnedToBottom = true;
        this.store.joinSubServerFromChat(joinSubLinkBtn.dataset.joinSubserverLink);
        return;
      }
      const profileBtn = e.target.closest('[data-open-profile]');
      if (profileBtn) {
        this.store.openMemberInspector(profileBtn.dataset.openProfile);
        return;
      }
      const inspectBtn = e.target.closest('[data-inspect-member]');
      if (inspectBtn) {
        this.store.openMemberInspector(inspectBtn.dataset.inspectMember);
        return;
      }
      const reactBtn = e.target.closest('[data-react-msg]');
      if (reactBtn) {
        if (this.store.ui.activeServerId === 'dm') return;
        const activeChanId =
          this.store.ui.activeServerId === 'main'
            ? this.store.ui.activeChannelId
            : this.store.ui.activeSubChannelId;
        if (activeChanId) {
          this.store.addReaction(activeChanId, reactBtn.dataset.reactMsg, reactBtn.dataset.emoji);
        }
      }
    });
  }

  _pinFeedToBottom(feedEl) {
    if (!feedEl) return;
    this._programmaticScroll = true;
    feedEl.scrollTop = feedEl.scrollHeight;
    if (this._scrollRafId) cancelAnimationFrame(this._scrollRafId);
    this._scrollRafId = requestAnimationFrame(() => {
      this._scrollRafId = null;
      if (!feedEl.isConnected) {
        this._programmaticScroll = false;
        return;
      }
      feedEl.scrollTop = feedEl.scrollHeight;
      this._programmaticScroll = false;
    });
  }

  update() {
    if (!this.rendered) return;
    const { state, ui, prefs } = this.store;
    const circadian = getCircadianProfile(state.simSeconds);

    let activeSub = null;
    const isDmMode = ui.activeServerId === 'dm';
    if (!isDmMode && ui.activeServerId && ui.activeServerId !== 'main') {
      activeSub = (state.subServers || []).find((s) => s.id === ui.activeServerId) || null;
      if (!activeSub) {
        ui.activeServerId = 'main';
      }
    }

    const iconSlot = this.root.querySelector('#active-channel-icon');
    if (iconSlot) {
      iconSlot.innerHTML = isDmMode ? svgIcons.dm : svgIcons.hash;
    }

    let channel;
    let msgs;
    let feedKey;
    let activeDmPeer = null;
    if (isDmMode) {
      const peerId = ui.activeDmPeerId || this.store._resolveDefaultDmPeerId();
      if (peerId && ui.activeDmPeerId !== peerId) ui.activeDmPeerId = peerId;
      activeDmPeer = peerId ? state.members.find((m) => m.id === peerId) || null : null;
      const peerDiv = activeDmPeer
        ? getDivisionById(state, activeDmPeer.divisionId) ||
          (state.divisions || []).find((d) => d.headId === activeDmPeer.id) ||
          null
        : null;
      msgs = peerId ? (state.dms || []).filter((d) => d.peerId === peerId) : [];
      feedKey = `dm:${peerId || 'none'}`;
      this.root.querySelector('#active-channel-name').textContent = activeDmPeer
        ? `DM · ${activeDmPeer.icName}`
        : 'DM Kapolda';
      this.root.querySelector('#channel-topic-text').textContent = activeDmPeer
        ? `Direct Message Kapolda ↔ ${activeDmPeer.icName}${peerDiv ? ` (Ketua ${peerDiv.callsign})` : ''}`
        : 'Kotak Masuk Direct Message & Proposal Divisi';
    } else if (activeSub) {
      channel = activeSub.channels.find((c) => c.id === ui.activeSubChannelId) || activeSub.channels[0];
      if (channel && ui.activeSubChannelId !== channel.id) {
        ui.activeSubChannelId = channel.id;
      }
      msgs = (activeSub.messages && channel && activeSub.messages[channel.id]) || [];
      feedKey = `${activeSub.id}:${channel ? channel.id : 'none'}`;
      this.root.querySelector('#active-channel-name').textContent = channel ? channel.name : activeSub.name;
      this.root.querySelector('#channel-topic-text').textContent = `[${activeSub.shortCode}] ${channel?.topic || activeSub.description}`;
    } else {
      channel = CHANNELS.find((c) => c.id === ui.activeChannelId) || CHANNELS[0];
      msgs = state.messages[channel.id] || [];
      feedKey = `main:${channel.id}`;
      this.root.querySelector('#active-channel-name').textContent = channel.name;
      this.root.querySelector('#channel-topic-text').textContent = channel.topic;
    }

    this.root.querySelector('#discord-clock').textContent = `${formatSimClock(state.simSeconds)} · ${circadian.isNight ? 'Malam' : circadian.phase === 'PRIME_TIME' ? 'Ramai' : 'Siang'}`;

    const subBar = this.root.querySelector('#subserver-context-bar');
    if (subBar) {
      if (isDmMode) {
        const pendingProp = activeDmPeer
          ? (state.divisionProposals || []).find((p) => p.proposerId === activeDmPeer.id && p.status === 'PENDING')
          : null;
        const dmPeerDiv = activeDmPeer
          ? getDivisionById(state, activeDmPeer.divisionId) ||
            (state.divisions || []).find((d) => d.headId === activeDmPeer.id) ||
            null
          : null;
        if (pendingProp || dmPeerDiv) {
          subBar.classList.remove('hidden');
          subBar.innerHTML = `
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-extrabold text-[#F2F3F5] truncate">${escapeHtml(activeDmPeer?.icName || 'Ketua Divisi')}</span>
                  ${
                    pendingProp
                      ? `<span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-[#F0B232]/20 text-[#FACC15]">PROPOSAL MENUNGGU ACC</span>`
                      : dmPeerDiv?.proposalStatus === 'APPROVED'
                        ? `<span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-[#23A55A]/20 text-[#4ADE80]">DIVISI TERBUKA (${dmPeerDiv.dailyIntakeCount || 0}/${dmPeerDiv.dailyIntakeQuota || 3})</span>`
                        : ''
                  }
                </div>
                <div class="text-[10.5px] text-[#80848E] truncate">
                  ${
                    pendingProp
                      ? `Proposal ${escapeHtml(pendingProp.divisionName)} · Kuota Hari Ini ${pendingProp.dailyQuota} slot`
                      : dmPeerDiv
                        ? `Divisi ${escapeHtml(dmPeerDiv.name)} [${escapeHtml(dmPeerDiv.callsign)}]`
                        : 'Direct Message Privat Kapolda'
                  }
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${
                  pendingProp
                    ? `<button type="button" data-dm-approve-prop="${pendingProp.id}" class="min-h-[30px] px-2.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-[10.5px] font-bold whitespace-nowrap cursor-pointer">✓ ACC</button>
                       <button type="button" data-dm-reject-prop="${pendingProp.id}" class="min-h-[30px] px-2 rounded-lg bg-[#DA373C]/20 border border-[#DA373C]/50 text-[#FCA5A5] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Tolak</button>`
                    : dmPeerDiv
                      ? `<button type="button" data-open-org-divs="${dmPeerDiv.id}" class="min-h-[30px] px-2 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#C7D2FE] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Detail Divisi →</button>`
                      : ''
                }
                <button type="button" id="btn-back-main-server" class="min-h-[30px] px-2 rounded-lg bg-[#2B2D31] text-[#B5BAC1] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Mabes</button>
              </div>
            </div>
          `;
        } else {
          subBar.classList.add('hidden');
          subBar.innerHTML = '';
        }
      } else if (!activeSub) {
        subBar.classList.add('hidden');
        subBar.innerHTML = '';
      } else {
        subBar.classList.remove('hidden');
        const subOwner =
          activeSub.ownerId === 'owner'
            ? { icName: state.ownerName }
            : state.members.find((m) => m.id === activeSub.ownerId);
        const resolvedOwnerSubRole = resolveSubServerRoleEntry(
          activeSub.memberRoles?.['owner'],
          'Tamu VIP',
          '#4ADE80'
        );
        subBar.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              ${serverLogoEngine.renderSubServerLogo(activeSub, { sizeClass: 'w-8 h-8 shrink-0', compact: true })}
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-extrabold text-[#F2F3F5] truncate">${escapeHtml(activeSub.name)}</span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                    activeSub.affiliatedToMain ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#F0B232]/20 text-[#FACC15]'
                  }">
                    ${activeSub.affiliatedToMain ? 'Afiliasi Mabes' : 'Mandiri'}
                  </span>
                </div>
                <div class="text-[10.5px] text-[#80848E] truncate mt-0.5">
                  Owner: ${escapeHtml(subOwner?.icName || 'Unit')} · ${
                    activeSub.ownerJoined
                      ? `Role Anda: ${escapeHtml(resolvedOwnerSubRole.roleName)}`
                      : 'Anda belum gabung sub-server ini'
                  }
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" id="btn-manage-subserver" data-sub-id="${activeSub.id}" class="min-h-[30px] px-2 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-[#DDD6FE] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Kelola</button>
              <button type="button" id="btn-share-sub-invite" data-sub-id="${activeSub.id}" class="min-h-[30px] px-2 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#C7D2FE] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Sebar Link</button>
              ${
                !activeSub.affiliatedToMain
                  ? `<button type="button" id="btn-affiliate-subserver" data-sub-id="${activeSub.id}" class="min-h-[30px] px-2 rounded-lg bg-[#23A55A]/20 border border-[#23A55A]/50 text-[#4ADE80] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Afiliasikan</button>`
                  : ''
              }
              ${
                !activeSub.ownerJoined
                  ? `<button type="button" id="btn-join-subserver" data-sub-id="${activeSub.id}" class="min-h-[30px] px-2.5 rounded-lg theme-accent-btn text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Gabung</button>`
                  : activeSub.ownerId !== 'owner'
                    ? `<button type="button" id="btn-leave-subserver" data-sub-id="${activeSub.id}" class="min-h-[30px] px-2 rounded-lg bg-[#2B2D31] text-[#B5BAC1] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer">Keluar</button>`
                    : ''
              }
            </div>
          </div>
        `;
      }
    }

    const mainUnread = Object.entries(state.unreadByChannel || {}).reduce(
      (sum, [cid, count]) => (ui.activeServerId === 'main' && cid === ui.activeChannelId ? sum : sum + count),
      0
    );
    const subUnread = (state.subServers || []).reduce((sum, s) => {
      const uMap = s.unreadByChannel || {};
      return (
        sum +
        Object.entries(uMap).reduce(
          (acc, [cid, cnt]) => (ui.activeServerId === s.id && cid === ui.activeSubChannelId ? acc : acc + cnt),
          0
        )
      );
    }, 0);
    const dmUnread = (state.dms || []).filter((d) => !d.read && !d.isOwner).length;
    const totalUnread = mainUnread + subUnread + dmUnread;
    const unreadBadge = this.root.querySelector('#total-unread-badge');
    unreadBadge.classList.toggle('hidden', totalUnread === 0);

    this.root.querySelectorAll('#discord-speed-bar .speed-btn').forEach((btn) => {
      const sp = Number(btn.dataset.speed);
      const active = state.speed === sp;
      btn.className = `speed-btn px-2 py-1 text-[11px] font-mono-num font-semibold rounded-md cursor-pointer ${
        active ? (sp === 0 ? 'bg-[#DA373C] text-white' : 'theme-accent-btn') : 'text-[#B5BAC1] hover:text-white'
      }`;
    });

    this._syncMessagesIncremental(feedKey, msgs, state, prefs);

    const backdrop = this.root.querySelector('#discord-drawer-backdrop');
    const leftDrawer = this.root.querySelector('#left-channel-drawer');
    const rightDrawer = this.root.querySelector('#right-member-drawer');

    const anyOpen = ui.leftDrawerOpen || ui.rightDrawerOpen;
    backdrop.classList.toggle('open', anyOpen);
    leftDrawer.classList.toggle('open', ui.leftDrawerOpen);
    rightDrawer.classList.toggle('open', ui.rightDrawerOpen);

    if (ui.leftDrawerOpen) {
      renderLeftDrawer(leftDrawer, this.store, () => {
        this.isPinnedToBottom = true;
      });
    }
    if (ui.rightDrawerOpen) {
      renderRightDrawer(
        rightDrawer,
        this.store,
        this.memberSearchQuery,
        (nextQuery) => {
          this.memberSearchQuery = nextQuery;
          renderRightDrawer(rightDrawer, this.store, this.memberSearchQuery, () => {}, () => {
            this.isPinnedToBottom = true;
          });
        },
        () => {
          this.isPinnedToBottom = true;
        }
      );
    }
  }

  _syncMessagesIncremental(channelId, msgs, state, prefs = {}) {
    const feedEl = this.root.querySelector('#chat-feed');
    if (!feedEl) return;

    const showTimestamps = prefs.showTimestamps !== false;
    const timestampPrefChanged = this._lastTimestampPref !== showTimestamps;
    this._lastTimestampPref = showTimestamps;

    const jumpBtn = this.root.querySelector('#btn-jump-bottom');
    const channelSwitched = this.renderedChannelId !== channelId;
    if (channelSwitched) {
      this.isPinnedToBottom = true;
      if (jumpBtn) jumpBtn.classList.add('hidden');
    }

    let needsFullRebuild =
      channelSwitched || timestampPrefChanged || this.renderedMsgIds.length === 0 || msgs.length === 0;

    if (!needsFullRebuild && msgs[0]?.id !== this.renderedMsgIds[0]) {
      const shiftIdx = this.renderedMsgIds.indexOf(msgs[0].id);
      if (shiftIdx > 0) {
        let removedHeight = 0;
        for (let k = 0; k < shiftIdx; k++) {
          const child = feedEl.firstElementChild;
          if (child) {
            removedHeight += child.offsetHeight;
            child.remove();
          }
        }
        this.renderedMsgIds.splice(0, shiftIdx);
        if (!this.isPinnedToBottom && removedHeight > 0) {
          this._programmaticScroll = true;
          feedEl.scrollTop = Math.max(0, feedEl.scrollTop - removedHeight);
          this._programmaticScroll = false;
        }
      } else {
        needsFullRebuild = true;
      }
    }

    const prefixMatches =
      !needsFullRebuild &&
      this.renderedMsgIds.length <= msgs.length &&
      this.renderedMsgIds.every((id, idx) => msgs[idx]?.id === id);

    if (needsFullRebuild || !prefixMatches) {
      feedEl.innerHTML = '';
      this.renderedMsgIds = [];
      this.renderedChannelId = channelId;

      if (msgs.length === 0) {
        feedEl.innerHTML = `
          <div class="py-10 text-center text-xs text-[#80848E]">
            Belum ada pesan di channel ini. Mulai percakapan sebagai Kapolda!
          </div>
        `;
        return;
      }

      const frag = document.createDocumentFragment();
      msgs.forEach((m, idx) => {
        const prev = idx > 0 ? msgs[idx - 1] : null;
        frag.appendChild(createMessageNode(m, prev, state, false, prefs));
        this.renderedMsgIds.push(m.id);
      });
      feedEl.appendChild(frag);
      if (this.isPinnedToBottom && prefs.autoScrollChat !== false) {
        this._pinFeedToBottom(feedEl);
      }
      return;
    }

    const savedScrollTop = feedEl.scrollTop;
    let domMutated = false;

    for (let i = 0; i < this.renderedMsgIds.length; i++) {
      const m = msgs[i];
      const existingEl = feedEl.children[i];
      if (existingEl && existingEl.dataset.msgId === m.id) {
        const reactSlot = existingEl.querySelector('[data-react-slot]');
        const newReactHtml = renderReactionsHtml(m);
        if (reactSlot && reactSlot.dataset.hash !== newReactHtml) {
          reactSlot.innerHTML = newReactHtml;
          reactSlot.dataset.hash = newReactHtml;
          domMutated = true;
        }
      }
    }

    if (msgs.length > this.renderedMsgIds.length) {
      const frag = document.createDocumentFragment();
      for (let i = this.renderedMsgIds.length; i < msgs.length; i++) {
        const prev = i > 0 ? msgs[i - 1] : null;
        frag.appendChild(createMessageNode(msgs[i], prev, state, true, prefs));
        this.renderedMsgIds.push(msgs[i].id);
      }
      feedEl.appendChild(frag);
      domMutated = true;
    }

    if (this.isPinnedToBottom && prefs.autoScrollChat !== false) {
      if (domMutated) this._pinFeedToBottom(feedEl);
    } else if (domMutated && Math.abs(feedEl.scrollTop - savedScrollTop) > 1) {
      this._programmaticScroll = true;
      feedEl.scrollTop = savedScrollTop;
      this._programmaticScroll = false;
    }
  }
}
