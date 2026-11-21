import {
  buildMemberProfileSheet,
  buildOwnerProfileSheet,
  wireMemberProfileHandlers,
  wireOwnerProfileHandlers,
} from './modals/profileModal.js';
import {
  buildBilletModal,
  buildDivisionModal,
  buildRankModal,
  buildSubServerModal,
  wireBilletModalHandlers,
  wireDivisionModalHandlers,
  wireRankModalHandlers,
  wireSubServerModalHandlers,
} from './modals/orgFormsModal.js';
import { buildSettingsModal, wireSettingsModalHandlers } from './modals/settingsModal.js';
import { buildSubServerManageModal, wireSubServerManageModalHandlers } from './modals/subServerManageModal.js';

export function renderModals(container, store) {
  if (!container) return;
  const { state, ui } = store;
  const inspectedId = ui.inspectedMemberId;
  const member =
    inspectedId && inspectedId !== 'owner'
      ? state.members.find((m) => m.id === inspectedId)
      : null;
  const isOwnerProfile = inspectedId === 'owner';
  const modalType = ui.orgModalType;
  const isSettingsOpen = Boolean(ui.settingsOpen);
  const managedSubId = ui.managedSubServerId;

  if (!member && !isOwnerProfile && !modalType && !isSettingsOpen && !managedSubId) {
    container.replaceChildren();
    return;
  }

  let sheetContent = '';
  if (isSettingsOpen) {
    sheetContent = buildSettingsModal(store);
  } else if (managedSubId) {
    sheetContent = buildSubServerManageModal(state, managedSubId);
  } else if (isOwnerProfile) {
    sheetContent = buildOwnerProfileSheet(state, ui);
  } else if (member) {
    sheetContent = buildMemberProfileSheet(member, state, ui);
  } else if (modalType === 'rank') {
    sheetContent = buildRankModal();
  } else if (modalType === 'division') {
    sheetContent = buildDivisionModal();
  } else if (modalType === 'billet') {
    sheetContent = buildBilletModal();
  } else if (modalType === 'subserver') {
    sheetContent = buildSubServerModal(state);
  }

  const prevScrollTop = container.querySelector('.bottom-sheet .scroll-y-thin')?.scrollTop || 0;

  container.innerHTML = `
    <div class="drawer-backdrop open" id="modal-backdrop"></div>
    <div class="bottom-sheet open overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label="Profil & Pengaturan">
      ${sheetContent}
    </div>
  `;

  const scroller = container.querySelector('.bottom-sheet .scroll-y-thin');
  if (scroller && prevScrollTop > 0) {
    scroller.scrollTop = prevScrollTop;
  }

  const closeAll = () => {
    store.closeMemberInspector();
    store.closeOrgModal();
    store.closeSubServerManage();
    store.closeSettings();
  };

  container.querySelector('#modal-backdrop').addEventListener('click', closeAll);
  const closeBtn = container.querySelector('#btn-close-sheet');
  if (closeBtn) closeBtn.addEventListener('click', closeAll);

  if (isSettingsOpen) {
    wireSettingsModalHandlers(container, store);
  } else if (managedSubId) {
    wireSubServerManageModalHandlers(container, store, managedSubId);
  } else if (isOwnerProfile) {
    wireOwnerProfileHandlers(container, store);
  } else if (member) {
    wireMemberProfileHandlers(container, store, member);
  } else if (modalType === 'rank') {
    wireRankModalHandlers(container, store);
  } else if (modalType === 'division') {
    wireDivisionModalHandlers(container, store);
  } else if (modalType === 'billet') {
    wireBilletModalHandlers(container, store);
  } else if (modalType === 'subserver') {
    wireSubServerModalHandlers(container, store);
  }
}
