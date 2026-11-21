import {
  STORAGE_KEY,
} from './constants.js';
import { soundFX } from './audio.js';
import {
  applyThemeAndPrefs,
  loadUserPrefs,
  saveUserPrefs,
} from './themeEngine.js';
import {
  deleteManualSlot,
  exportSaveJsonString,
  listSaveSlots,
  loadFromManualSlot,
  saveToManualSlot,
  validateAndRestoreEnvelope,
} from './persistence/saveManager.js';
import {
  affiliateSubServer,
  createInitialState,
  createSubServerRecord,
  ensureDivisionHead,
  hydrateSimulationState,
  joinSubServerAsOwner,
  leaveSubServerAsOwner,
  markDmRead,
  postSubServerRecruitmentInvite,
  processOwnerDmMessage,
  processOwnerMessage,
  processOwnerSubServerMessage,
  stepSimulation,
} from './rules.js';
import { attachOrgStoreMethods } from './storeActions.js';

class IzumiyaStore {
  constructor() {
    this.prefs = applyThemeAndPrefs(loadUserPrefs());
    this.state = this._loadState();
    this.listeners = new Set();
    this.ui = {
      screen: 'title',
      activeTab: 'discord',
      activeServerId: 'main',
      activeChannelId: 'obrolan-ooc',
      activeSubChannelId: null,
      activeDmPeerId: null,
      orgSubTab: 'ranks', // 'ranks' | 'divisions' | 'academy' | 'billets' | 'staff'
      authorityTreeOpen: true,
      authoritySubMode: 'editor', // 'editor' | 'delegation'
      selectedAuthorityNode: { kind: 'billet', id: 'billet-wakapolri' },
      collapsedPermGroups: {},
      expandedRankId: null,
      expandedDivisionId: null,
      leftDrawerOpen: false,
      rightDrawerOpen: false,
      inspectedMemberId: null, // 'owner' | ai member id | null
      profileTab: 'roles', // 'roles' | 'bio' | 'manage'
      orgModalType: null,
      managedSubServerId: null,
      settingsOpen: false,
      settingsTab: 'theme', // 'theme' | 'prefs' | 'saves'
      saveNotice: null, // { ok: boolean, message: string } | null
    };
    this._saveAccum = 0;
  }

  _loadState() {
    if (typeof localStorage === 'undefined') {
      const fresh = createInitialState();
      fresh.speed = this.prefs.defaultSpeed;
      return fresh;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createInitialState();
        fresh.speed = this.prefs.defaultSpeed;
        return fresh;
      }
      const parsed = JSON.parse(raw);
      return hydrateSimulationState(parsed) || createInitialState();
    } catch {
      const fresh = createInitialState();
      fresh.speed = this.prefs.defaultSpeed;
      return fresh;
    }
  }

  saveNow() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota errors
    }
  }

  resetSimulation() {
    this.state = createInitialState();
    this.state.speed = this.prefs.defaultSpeed;
    this.ui.activeServerId = 'main';
    this.ui.activeChannelId = 'obrolan-ooc';
    this.ui.activeSubChannelId = null;
    this.ui.activeDmPeerId = null;
    this.ui.inspectedMemberId = null;
    this.ui.orgModalType = null;
    this.ui.managedSubServerId = null;
    this.ui.settingsOpen = false;
    this.saveNow();
    this.emit('full');
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(reason = 'state') {
    for (const fn of this.listeners) {
      fn(this.state, this.ui, reason);
    }
  }

  setScreen(screen) {
    this.ui.screen = screen;
    if (typeof document !== 'undefined') {
      document.body.dataset.state =
        screen === 'title' ? 'title' : this.state.speed === 0 ? 'paused' : 'playing';
    }
    this.emit('ui');
  }

  setActiveTab(tab) {
    this.ui.activeTab = tab;
    this.ui.leftDrawerOpen = false;
    this.ui.rightDrawerOpen = false;
    if (tab === 'discord') {
      if (this.ui.activeServerId === 'main') {
        this.state.unreadByChannel[this.ui.activeChannelId] = 0;
      } else if (this.ui.activeServerId === 'dm') {
        if (this.ui.activeDmPeerId) {
          markDmRead(this.state, this.ui.activeDmPeerId);
        }
      } else {
        const sub = (this.state.subServers || []).find((s) => s.id === this.ui.activeServerId);
        if (sub && sub.unreadByChannel && this.ui.activeSubChannelId) {
          sub.unreadByChannel[this.ui.activeSubChannelId] = 0;
        }
      }
    }
    soundFX.tap();
    this.emit('ui');
  }

  // ---- Theme & User Preferences + Unified Settings Modal ----
  openSettings(tab = 'theme') {
    this.ui.settingsOpen = true;
    this.ui.settingsTab = tab || 'theme';
    this.ui.leftDrawerOpen = false;
    this.ui.rightDrawerOpen = false;
    this.ui.inspectedMemberId = null;
    this.ui.orgModalType = null;
    this.ui.managedSubServerId = null;
    this.ui.saveNotice = null;
    soundFX.tap();
    this.emit('ui');
  }

  closeSettings() {
    this.ui.settingsOpen = false;
    this.ui.saveNotice = null;
    this.emit('ui');
  }

  setSettingsTab(tab) {
    this.ui.settingsTab = tab;
    this.ui.saveNotice = null;
    soundFX.tap();
    this.emit('ui');
  }

  setThemePreset(themeId) {
    this.prefs = applyThemeAndPrefs(saveUserPrefs({ ...this.prefs, themeId }));
    soundFX.tap();
    this.emit('prefs');
  }

  updatePrefs(patch) {
    this.prefs = applyThemeAndPrefs(saveUserPrefs({ ...this.prefs, ...patch }));
    soundFX.tap();
    this.emit('prefs');
  }

  // ---- Anti-Corrupt Flexible Manual Save / Load ----
  listManualSaves() {
    return listSaveSlots();
  }

  saveManualSlot(slotName = 'Simpanan Manual', overwriteId = null) {
    const res = saveToManualSlot(this.state, this.prefs, slotName, overwriteId);
    this.ui.saveNotice = res.ok
      ? { ok: true, message: `Tersimpan di "${res.slot.envelope.slotName}" (Checksum OK)` }
      : { ok: false, message: res.error || 'Gagal menyimpan slot.' };
    if (res.ok) soundFX.success();
    else soundFX.radioBeep();
    this.emit('saves');
    return res;
  }

  loadManualSlot(slotId) {
    const res = loadFromManualSlot(slotId, hydrateSimulationState);
    if (!res.ok) {
      this.ui.saveNotice = { ok: false, message: res.error };
      soundFX.radioBeep();
      this.emit('saves');
      return res;
    }
    this._applyRestoredSession(res);
    this.ui.saveNotice = {
      ok: true,
      message: `Slot "${res.envelope.slotName}" dimuat utuh tanpa korupsi.`,
    };
    soundFX.promoteFanfare();
    this.emit('full');
    return res;
  }

  deleteManualSlot(slotId) {
    deleteManualSlot(slotId);
    this.ui.saveNotice = { ok: true, message: 'Slot simpanan dihapus.' };
    soundFX.tap();
    this.emit('saves');
  }

  exportManualSaveJson(slotName = 'Backup Izumiya') {
    return exportSaveJsonString(this.state, this.prefs, slotName);
  }

  importManualSaveJson(rawJsonText) {
    const res = validateAndRestoreEnvelope(rawJsonText, hydrateSimulationState);
    if (!res.ok) {
      this.ui.saveNotice = { ok: false, message: res.error };
      soundFX.radioBeep();
      this.emit('saves');
      return res;
    }
    this._applyRestoredSession(res);
    this.ui.saveNotice = {
      ok: true,
      message: `Backup "${res.envelope.slotName}" tervalidasi & berhasil dimuat.`,
    };
    soundFX.promoteFanfare();
    this.emit('full');
    return res;
  }

  _applyRestoredSession(res) {
    this.state = res.state;
    if (res.prefs) {
      this.prefs = applyThemeAndPrefs(saveUserPrefs(res.prefs));
    }
    soundFX.setMuted(Boolean(this.state.muted));
    this.ui.activeServerId = 'main';
    this.ui.activeChannelId = 'obrolan-ooc';
    this.ui.activeSubChannelId = null;
    this.ui.activeDmPeerId = null;
    this.ui.inspectedMemberId = null;
    this.ui.orgModalType = null;
    this.saveNow();
  }

  _resolveDefaultDmPeerId() {
    const unreadDm = (this.state.dms || []).find((d) => !d.read && !d.isOwner);
    if (unreadDm) return unreadDm.peerId;
    const pendingProp = (this.state.divisionProposals || []).find((p) => p.status === 'PENDING');
    if (pendingProp) return pendingProp.proposerId;
    const anyDm = (this.state.dms || [])[0];
    if (anyDm) return anyDm.peerId;
    for (const div of this.state.divisions || []) {
      const h = ensureDivisionHead(this.state, div);
      if (h) return h.id;
    }
    return this.state.members?.[0]?.id || null;
  }

  setActiveServer(serverId) {
    const targetId = serverId || 'main';
    if (targetId === 'main') {
      this.ui.activeServerId = 'main';
      this.state.unreadByChannel[this.ui.activeChannelId] = 0;
    } else if (targetId === 'dm') {
      this.ui.activeServerId = 'dm';
      const validPeer = this.ui.activeDmPeerId && this.state.members.some((m) => m.id === this.ui.activeDmPeerId);
      if (!validPeer) {
        this.ui.activeDmPeerId = this._resolveDefaultDmPeerId();
      }
      if (this.ui.activeDmPeerId) {
        markDmRead(this.state, this.ui.activeDmPeerId);
      }
    } else {
      const sub = (this.state.subServers || []).find((s) => s.id === targetId);
      if (!sub) return;
      this.ui.activeServerId = sub.id;
      const validChan = sub.channels.some((c) => c.id === this.ui.activeSubChannelId)
        ? this.ui.activeSubChannelId
        : sub.channels[0]?.id || null;
      this.ui.activeSubChannelId = validChan;
      if (validChan && sub.unreadByChannel) {
        sub.unreadByChannel[validChan] = 0;
      }
    }
    soundFX.tap();
    this.emit('ui');
  }

  openDmInbox(peerId = null) {
    this.ui.activeTab = 'discord';
    this.ui.activeServerId = 'dm';
    this.ui.activeDmPeerId = peerId || this._resolveDefaultDmPeerId();
    if (this.ui.activeDmPeerId) {
      markDmRead(this.state, this.ui.activeDmPeerId);
    }
    this.ui.leftDrawerOpen = false;
    this.ui.rightDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  setActiveDmPeer(peerId) {
    if (!peerId) return;
    this.ui.activeServerId = 'dm';
    this.ui.activeDmPeerId = peerId;
    markDmRead(this.state, peerId);
    this.ui.leftDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  setActiveChannel(channelId) {
    this.ui.activeServerId = 'main';
    this.ui.activeChannelId = channelId;
    this.state.unreadByChannel[channelId] = 0;
    this.ui.leftDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  setActiveSubChannel(channelId) {
    const sub = (this.state.subServers || []).find((s) => s.id === this.ui.activeServerId);
    if (!sub) return;
    this.ui.activeSubChannelId = channelId;
    if (sub.unreadByChannel) sub.unreadByChannel[channelId] = 0;
    this.ui.leftDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  joinSubServer(subServerId) {
    const sub = joinSubServerAsOwner(this.state, subServerId);
    if (sub) {
      soundFX.promoteFanfare();
      this.saveNow();
      this.emit('chat');
    }
    return sub;
  }

  joinSubServerFromChat(subServerId) {
    const sub = (this.state.subServers || []).find((s) => s.id === subServerId);
    if (!sub) return null;
    if (!sub.ownerJoined) {
      joinSubServerAsOwner(this.state, sub.id);
    }
    const regCh = sub.channels?.find((c) => c.name === 'registrasi');
    this.ui.activeTab = 'discord';
    this.ui.activeServerId = sub.id;
    this.ui.activeSubChannelId = regCh?.id || sub.channels?.[0]?.id || null;
    if (this.ui.activeSubChannelId && sub.unreadByChannel) {
      sub.unreadByChannel[this.ui.activeSubChannelId] = 0;
    }
    this.ui.leftDrawerOpen = false;
    this.ui.rightDrawerOpen = false;
    soundFX.promoteFanfare();
    this.saveNow();
    this.emit('chat');
    return sub;
  }

  sendSubServerInviteToChat(subServerId, channelId = 'lobi-rekrutmen') {
    const msg = postSubServerRecruitmentInvite(this.state, subServerId, channelId);
    if (msg) {
      soundFX.messagePing();
      this.saveNow();
      this.emit('chat');
    }
    return msg;
  }

  leaveSubServer(subServerId) {
    const ok = leaveSubServerAsOwner(this.state, subServerId);
    if (ok) {
      soundFX.tap();
      this.saveNow();
      this.emit('ui');
    }
    return ok;
  }

  setSubServerMemberRole(subServerId, memberId, roleName) {
    const sub = (this.state.subServers || []).find((s) => s.id === subServerId);
    if (!sub) return false;
    if (!sub.memberRoles) sub.memberRoles = {};
    if (roleName) {
      sub.memberRoles[memberId] = roleName;
    } else {
      delete sub.memberRoles[memberId];
    }
    soundFX.tap();
    this.saveNow();
    this.emit('org');
    return true;
  }

  createSubServer(payload) {
    const sub = createSubServerRecord(this.state, payload);
    if (!sub) return null;
    this.ui.activeServerId = sub.id;
    this.ui.activeSubChannelId = sub.channels[0]?.id || null;
    if (this.ui.activeSubChannelId && sub.unreadByChannel) {
      sub.unreadByChannel[this.ui.activeSubChannelId] = 0;
    }
    this.ui.leftDrawerOpen = false;
    soundFX.promoteFanfare();
    this.saveNow();
    this.emit('org');
    return sub;
  }

  affiliateSubServerByOwner(subServerId) {
    const ok = affiliateSubServer(this.state, subServerId, null);
    if (ok) {
      soundFX.promoteFanfare();
      this.saveNow();
      this.emit('org');
    }
    return ok;
  }

  setOrgSubTab(subTab) {
    this.ui.orgSubTab = subTab;
    soundFX.tap();
    this.emit('ui');
  }

  toggleLeftDrawer(open) {
    this.ui.leftDrawerOpen = open ?? !this.ui.leftDrawerOpen;
    if (this.ui.leftDrawerOpen) this.ui.rightDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  toggleRightDrawer(open) {
    this.ui.rightDrawerOpen = open ?? !this.ui.rightDrawerOpen;
    if (this.ui.rightDrawerOpen) this.ui.leftDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  openMemberInspector(memberId) {
    this.ui.inspectedMemberId = memberId;
    this.ui.profileTab = 'roles';
    this.ui.settingsOpen = false;
    this.ui.managedSubServerId = null;
    this.ui.rightDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  setProfileTab(tab) {
    this.ui.profileTab = tab;
    soundFX.tap();
    this.emit('ui');
  }

  closeMemberInspector() {
    this.ui.inspectedMemberId = null;
    this.emit('ui');
  }

  openOrgModal(type) {
    this.ui.orgModalType = type;
    this.ui.managedSubServerId = null;
    this.ui.settingsOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  closeOrgModal() {
    this.ui.orgModalType = null;
    this.emit('ui');
  }

  openSubServerManage(subId) {
    if (!subId) return;
    this.ui.managedSubServerId = subId;
    this.ui.orgModalType = null;
    this.ui.inspectedMemberId = null;
    this.ui.settingsOpen = false;
    this.ui.leftDrawerOpen = false;
    this.ui.rightDrawerOpen = false;
    soundFX.tap();
    this.emit('ui');
  }

  closeSubServerManage() {
    this.ui.managedSubServerId = null;
    this.emit('ui');
  }

  setSpeed(speed) {
    this.state.speed = speed;
    if (typeof document !== 'undefined' && this.ui.screen === 'playing') {
      document.body.dataset.state = speed === 0 ? 'paused' : 'playing';
    }
    soundFX.tap();
    this.saveNow();
    this.emit('speed');
  }

  toggleMute() {
    this.state.muted = !this.state.muted;
    soundFX.setMuted(this.state.muted);
    if (!this.state.muted) soundFX.tap();
    this.saveNow();
    this.emit('audio');
  }

  togglePlayerSiren() {
    this.state.player.sirenOn = !this.state.player.sirenOn;
    if (this.state.player.sirenOn) soundFX.sirenBlip();
    else soundFX.tap();
    this.emit('state');
  }

  sendOwnerChat(text) {
    let res;
    if (this.ui.activeServerId === 'main') {
      res = processOwnerMessage(this.state, this.ui.activeChannelId, text);
    } else if (this.ui.activeServerId === 'dm') {
      const peerId = this.ui.activeDmPeerId || this._resolveDefaultDmPeerId();
      this.ui.activeDmPeerId = peerId;
      res = peerId ? processOwnerDmMessage(this.state, peerId, text) : { sent: false, replies: [] };
    } else {
      const sub = (this.state.subServers || []).find((s) => s.id === this.ui.activeServerId);
      const chanId = this.ui.activeSubChannelId || sub?.channels[0]?.id;
      res = sub && chanId
        ? processOwnerSubServerMessage(this.state, sub.id, chanId, text)
        : { sent: false, replies: [] };
    }
    if (res.sent) {
      soundFX.messagePing();
      this.saveNow();
      this.emit('chat');
    }
    return res;
  }

  addReaction(channelId, messageId, emoji) {
    let list;
    if (this.ui.activeServerId === 'main') {
      list = this.state.messages[channelId];
    } else {
      const sub = (this.state.subServers || []).find((s) => s.id === this.ui.activeServerId);
      list = sub?.messages?.[channelId];
    }
    if (!list) return;
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return;
    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) existing.count += 1;
    else msg.reactions.push({ emoji, count: 1 });
    soundFX.tap();
    this.saveNow();
    this.emit('chat');
  }

  tick(rawDt, input) {
    if (this.ui.screen !== 'playing') return [];
    const events = stepSimulation(this.state, rawDt, input);
    this._saveAccum += rawDt;
    if (this._saveAccum >= 4.0) {
      this._saveAccum = 0;
      this.saveNow();
    }
    for (const ev of events) {
      if (ev.type === 'MEMBER_JOINED') soundFX.messagePing();
      else if (ev.type === 'INCIDENT_RESOLVED') soundFX.radioBeep();
    }
    if (events.length > 0) {
      this.emit('sim-event');
    }
    return events;
  }
}

attachOrgStoreMethods(IzumiyaStore);

export const store = new IzumiyaStore();
