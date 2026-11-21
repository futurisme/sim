import {
  canMemberManageSubServer,
  canMemberShareSubServerInvite,
  canMemberTakeoverSubServer,
  getRankById,
  getSubServerManagers,
} from '../../engine/rules.js';
import { serverLogoEngine } from '../../engine/serverLogoEngine.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function buildSubServerManageModal(state, subId) {
  const sub = (state.subServers || []).find((s) => s.id === subId);
  if (!sub) return '';

  const ownerName =
    sub.ownerId === 'owner'
      ? state.ownerName
      : state.members.find((m) => m.id === sub.ownerId)?.icName || 'Unit';
  const managers = getSubServerManagers(sub, state);
  const subMembers = (sub.memberIds || [])
    .filter((id) => id !== 'owner')
    .map((id) => state.members.find((m) => m.id === id))
    .filter(Boolean);

  const takeoverCandidates = state.members.filter(
    (m) =>
      m.id !== sub.ownerId &&
      ((sub.memberIds || []).includes(m.id) ||
        canMemberTakeoverSubServer(m, sub, state) ||
        m.billetId)
  );

  return `
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto my-2"></div>
    <div class="px-4 flex items-center justify-between pb-3 border-b border-white/[0.07] shrink-0">
      <div class="flex items-center gap-2.5 min-w-0">
        ${serverLogoEngine.renderSubServerLogo(sub, { sizeClass: 'w-9 h-9 shrink-0', compact: true })}
        <div class="min-w-0">
          <h2 class="text-sm font-bold text-[#F2F3F5] truncate">Kelola Internal · ${escapeHtml(sub.name)}</h2>
          <div class="text-[10.5px] text-[#80848E] truncate">Owner: ${escapeHtml(ownerName)} · ${managers.length} Pengelola Internal</div>
        </div>
      </div>
      <button type="button" id="btn-close-sheet" aria-label="Tutup kelola sub-server" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer shrink-0">
        ${svgIcons.close}
      </button>
    </div>

    <div class="scroll-y-thin flex-1 px-4 py-3 space-y-3" data-testid="subserver-manage-body">
      <div class="p-2.5 rounded-xl bg-[#5865F2]/12 border border-[#5865F2]/35 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-bold text-[#C7D2FE]">Bagikan Link Undangan #registrasi</div>
          <div class="text-[10.5px] text-[#94A3B8] truncate">
            ${canMemberShareSubServerInvite('owner', sub, state) ? 'Owner & Pejabat internal dapat rutin membagikan tautan.' : ''}
          </div>
        </div>
        <button type="button" id="btn-modal-share-sub-invite" data-sub-id="${escapeHtml(sub.id)}" class="min-h-[34px] px-3 rounded-lg theme-accent-btn text-[11px] font-bold whitespace-nowrap cursor-pointer shrink-0">
          Sebar Link
        </button>
      </div>

      <form id="form-subserver-config" class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2.5">
        <div class="text-[10px] font-bold tracking-wider text-[#80848E] uppercase">Konfigurasi Sub-Server</div>
        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-2">
            <label for="inp-manage-sub-name" class="block text-[10px] text-[#B5BAC1] mb-0.5">Nama Sub-Server</label>
            <input id="inp-manage-sub-name" type="text" value="${escapeHtml(sub.name)}" class="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]" />
          </div>
          <div>
            <label for="inp-manage-sub-code" class="block text-[10px] text-[#B5BAC1] mb-0.5">Kode</label>
            <input id="inp-manage-sub-code" type="text" maxlength="4" value="${escapeHtml(sub.shortCode)}" class="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs font-mono-num uppercase text-[#F2F3F5]" />
          </div>
        </div>
        <div>
          <label for="inp-manage-sub-desc" class="block text-[10px] text-[#B5BAC1] mb-0.5">Deskripsi &amp; SOP Internal</label>
          <input id="inp-manage-sub-desc" type="text" value="${escapeHtml(sub.description || '')}" class="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <label for="inp-manage-sub-color" class="text-[10px] text-[#B5BAC1]">Aksen:</label>
            <select id="inp-manage-sub-color" class="min-h-[32px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-[11px] text-[#F2F3F5]">
              ${[
                ['#0EA5E9', 'Biru Akpol'],
                ['#8B5CF6', 'Ungu Taktis'],
                ['#EF4444', 'Merah Reskrim'],
                ['#10B981', 'Emerald Propam'],
                ['#F59E0B', 'Emas Komando'],
                ['#EC4899', 'Magenta Event'],
              ]
                .map(([hex, label]) => `<option value="${hex}" ${sub.color === hex ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </div>
          <button type="submit" class="min-h-[34px] px-3 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-semibold cursor-pointer">
            Simpan Config
          </button>
        </div>
      </form>

      <div class="p-3 rounded-xl bg-[#111214] border border-white/[0.06] space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold tracking-wider text-[#FACC15] uppercase">Pejabat &amp; Pengelola Internal (${managers.length})</span>
          <span class="text-[10px] text-[#80848E]">Bisa sebar link &amp; edit internal</span>
        </div>
        <div class="space-y-1.5 max-h-48 scroll-y-thin pr-1">
          ${
            subMembers.length === 0
              ? `<div class="text-xs text-[#80848E]">Belum ada anggota AI di sub-server ini.</div>`
              : subMembers
                  .map((m) => {
                    const isMgr = canMemberManageSubServer(m, sub, state);
                    const isSubOwner = sub.ownerId === m.id;
                    const rank = getRankById(state, m.rankId);
                    const rObj = sub.memberRoles?.[m.id];
                    const rLabel = typeof rObj === 'object' ? rObj.roleName : rObj || 'Anggota Satuan';
                    return `
                      <div class="p-2 rounded-lg bg-[#1E1F22] border border-white/[0.05] flex items-center justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-bold text-[#F2F3F5] truncate">${escapeHtml(m.icName)} ${isSubOwner ? '· OWNER' : ''}</div>
                          <div class="text-[10px] text-[#94A3B8] truncate">${escapeHtml(rank.name)} · ${escapeHtml(rLabel)}</div>
                        </div>
                        <button
                          type="button"
                          data-toggle-sub-mgr="${m.id}"
                          data-mgr-next="${isMgr ? '0' : '1'}"
                          ${isSubOwner ? 'disabled' : ''}
                          class="min-h-[30px] px-2.5 rounded-lg text-[10.5px] font-semibold border shrink-0 cursor-pointer ${
                            isSubOwner
                              ? 'bg-[#D4A024]/20 border-[#D4A024]/50 text-[#FACC15] cursor-default'
                              : isMgr
                                ? 'bg-[#8B5CF6]/25 border-[#8B5CF6]/60 text-[#DDD6FE]'
                                : 'bg-[#111214] border-white/10 text-[#94A3B8]'
                          }"
                        >
                          ${isSubOwner ? 'Pemilik' : isMgr ? '✓ Pengelola' : '+ Beri Akses'}
                        </button>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      </div>

      <div class="p-3 rounded-xl bg-[#111214] border border-[#F59E0B]/30 space-y-2">
        <div class="text-[10px] font-bold tracking-wider text-[#FBBF24] uppercase">Alih Kepemimpinan Sub-Server</div>
        <p class="text-[11px] text-[#94A3B8] leading-snug">
          Jika owner lama mutasi divisi, pensiun, atau nonaktif, pejabat internal berwenang dapat mengambil alih kepemimpinan agar sub-server tetap berjalan.
        </p>
        <div class="flex items-center gap-2">
          <select id="sel-takeover-owner" class="flex-1 min-h-[36px] px-2 rounded-lg bg-[#1E1F22] border border-white/10 text-xs text-[#F2F3F5]">
            ${sub.ownerId !== 'owner' ? `<option value="owner">${escapeHtml(state.ownerName)} (Kapolda · Ambil Alih)</option>` : ''}
            ${takeoverCandidates
              .map((m) => `<option value="${m.id}">${escapeHtml(m.icName)}</option>`)
              .join('')}
          </select>
          <button type="button" id="btn-subserver-takeover" data-sub-id="${escapeHtml(sub.id)}" class="min-h-[36px] px-3 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#111214] text-xs font-extrabold whitespace-nowrap cursor-pointer">
            Alihkan Owner
          </button>
        </div>
      </div>
    </div>
  `;
}

export function wireSubServerManageModalHandlers(container, store, subId) {
  const shareBtn = container.querySelector('#btn-modal-share-sub-invite');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      store.sendSubServerInviteToChat(subId, 'lobi-rekrutmen');
      store.closeSubServerManage();
      store.setActiveServer('main');
      store.setActiveChannel('lobi-rekrutmen');
    });
  }

  const form = container.querySelector('#form-subserver-config');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#inp-manage-sub-name').value;
      const shortCode = container.querySelector('#inp-manage-sub-code').value;
      const description = container.querySelector('#inp-manage-sub-desc').value;
      const color = container.querySelector('#inp-manage-sub-color').value;
      store.updateSubServerInfo(subId, { name, shortCode, description, color });
    });
  }

  container.querySelectorAll('[data-toggle-sub-mgr]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleSubServerInternalRole(subId, btn.dataset.toggleSubMgr, {
        canManageSubServer: btn.dataset.mgrNext === '1',
      });
    });
  });

  const takeoverBtn = container.querySelector('#btn-subserver-takeover');
  if (takeoverBtn) {
    takeoverBtn.addEventListener('click', () => {
      const sel = container.querySelector('#sel-takeover-owner');
      if (sel && sel.value) {
        store.takeoverSubServer(subId, sel.value, 'Penetapan estafet kepemimpinan internal');
      }
    });
  }
}
