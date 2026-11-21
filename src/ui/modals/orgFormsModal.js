import { ASSIGNMENT_TYPES, BILLET_EXPANSION_POOL } from '../../engine/constants.js';
import { resolveServerProfile, serverLogoEngine } from '../../engine/serverLogoEngine.js';
import { escapeHtml, svgIcons } from '../icons.js';

export function buildRankModal() {
  return `
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto my-2"></div>
    <div class="px-4 flex items-center justify-between pb-3 border-b border-white/[0.07]">
      <h2 class="text-base font-bold text-[#F2F3F5]">Buat Pangkat Baru</h2>
      <button type="button" id="btn-close-sheet" aria-label="Tutup form" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
        ${svgIcons.close}
      </button>
    </div>
    <form id="form-create-rank" class="px-4 py-3 space-y-3">
      <div>
        <label for="inp-rank-name" class="block text-xs font-medium text-[#B5BAC1] mb-1">Nama Pangkat</label>
        <input id="inp-rank-name" type="text" required placeholder="Contoh: Kompol / Kombes" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label for="inp-rank-xp" class="block text-xs font-medium text-[#B5BAC1] mb-1">Syarat XP Patroli</label>
          <input id="inp-rank-xp" type="number" min="0" value="350" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5] font-mono-num" />
        </div>
        <div>
          <label for="inp-rank-color" class="block text-xs font-medium text-[#B5BAC1] mb-1">Warna Badge</label>
          <select id="inp-rank-color" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]">
            <option value="#38BDF8">Biru Langit</option>
            <option value="#22C55E">Hijau Taktis</option>
            <option value="#FACC15">Emas Perwira</option>
            <option value="#F97316">Oranye Komando</option>
            <option value="#A855F7">Ungu Elit</option>
          </select>
        </div>
      </div>
      <p id="form-error" class="text-xs text-[#DA373C] hidden"></p>
      <button type="submit" class="w-full min-h-[46px] rounded-xl theme-accent-btn font-semibold text-sm cursor-pointer">
        Simpan Pangkat
      </button>
    </form>
  `;
}

export function wireRankModalHandlers(container, store) {
  const form = container.querySelector('#form-create-rank');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = container.querySelector('#inp-rank-name').value.trim();
    const minXp = container.querySelector('#inp-rank-xp').value;
    const color = container.querySelector('#inp-rank-color').value;
    if (!name) {
      const err = container.querySelector('#form-error');
      err.textContent = 'Nama pangkat wajib diisi.';
      err.classList.remove('hidden');
      return;
    }
    store.createRank({ name, minXp, color, salary: 400 });
    store.closeOrgModal();
  });
}

export function buildDivisionModal() {
  return `
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto my-2"></div>
    <div class="px-4 flex items-center justify-between pb-3 border-b border-white/[0.07]">
      <h2 class="text-base font-bold text-[#F2F3F5]">Buka Divisi Kepolisian Baru</h2>
      <button type="button" id="btn-close-sheet" aria-label="Tutup form" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
        ${svgIcons.close}
      </button>
    </div>
    <form id="form-create-div" class="px-4 py-3 space-y-3 scroll-y-thin">
      <div class="grid grid-cols-3 gap-2.5">
        <div class="col-span-2">
          <label for="inp-div-name" class="block text-xs font-medium text-[#B5BAC1] mb-1">Nama Divisi</label>
          <input id="inp-div-name" type="text" required placeholder="Contoh: Reskrim / Brimob" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
        </div>
        <div>
          <label for="inp-div-cs" class="block text-xs font-medium text-[#B5BAC1] mb-1">Callsign</label>
          <input id="inp-div-cs" type="text" maxlength="4" placeholder="RSK" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5] uppercase font-mono-num" />
        </div>
      </div>
      <div>
        <label for="inp-div-duty" class="block text-xs font-medium text-[#B5BAC1] mb-1">Tugas Utama</label>
        <input id="inp-div-duty" type="text" placeholder="Contoh: Penyelidikan kriminal & razia malam" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label for="inp-div-quota" class="block text-xs font-medium text-[#B5BAC1] mb-1">Kuota Personel (1–50)</label>
          <input id="inp-div-quota" type="number" min="1" max="50" value="8" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5] font-mono-num" />
        </div>
        <div>
          <label for="inp-div-color" class="block text-xs font-medium text-[#B5BAC1] mb-1">Warna Seragam 2D</label>
          <select id="inp-div-color" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]">
            <option value="#EF4444">Merah Reskrim</option>
            <option value="#8B5CF6">Ungu Brimob</option>
            <option value="#10B981">Emerald Propam</option>
            <option value="#F59E0B">Emas Intelkam</option>
            <option value="#3B82F6">Biru Sabhara</option>
            <option value="#0284C7">Navy Polairud</option>
            <option value="#EC4899">Magenta Humas</option>
          </select>
        </div>
      </div>
      <div>
        <label for="inp-div-assignment" class="block text-xs font-medium text-[#B5BAC1] mb-1">Tipe Penugasan &amp; Kebiasaan Patroli</label>
        <select id="inp-div-assignment" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]">
          ${Object.values(ASSIGNMENT_TYPES)
            .map((at) => `<option value="${at.id}">${escapeHtml(at.label)}</option>`)
            .join('')}
        </select>
      </div>
      <p id="form-error" class="text-xs text-[#DA373C] hidden"></p>
      <button type="submit" class="w-full min-h-[46px] rounded-xl theme-accent-btn font-semibold text-sm cursor-pointer">
        Buka Divisi Sekarang
      </button>
    </form>
  `;
}

export function wireDivisionModalHandlers(container, store) {
  const form = container.querySelector('#form-create-div');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = container.querySelector('#inp-div-name').value.trim();
    const callsign = container.querySelector('#inp-div-cs').value.trim();
    const duty = container.querySelector('#inp-div-duty').value.trim();
    const quota = container.querySelector('#inp-div-quota').value;
    const color = container.querySelector('#inp-div-color').value;
    const assignmentType = container.querySelector('#inp-div-assignment')?.value || undefined;
    if (!name) {
      const err = container.querySelector('#form-error');
      err.textContent = 'Nama divisi wajib diisi.';
      err.classList.remove('hidden');
      return;
    }
    store.createDivision({ name, callsign, duty, quota, color, assignmentType });
    store.closeOrgModal();
  });
}

export function buildBilletModal() {
  const quickPresets = BILLET_EXPANSION_POOL.slice(0, 8);
  return `
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto my-2"></div>
    <div class="px-4 flex items-center justify-between pb-3 border-b border-white/[0.07]">
      <h2 class="text-base font-bold text-[#F2F3F5]">Buat Jabatan &amp; Peran Baru</h2>
      <button type="button" id="btn-close-sheet" aria-label="Tutup form" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
        ${svgIcons.close}
      </button>
    </div>
    <form id="form-create-billet" class="px-4 py-3 space-y-3 scroll-y-thin">
      <div>
        <div class="text-[10px] font-bold tracking-wider text-[#FACC15] uppercase mb-1">Preset Singkatan Resmi (KADIV / WAKADIV / KANIT)</div>
        <div class="flex flex-wrap gap-1">
          ${quickPresets
            .map(
              (bp, idx) => `
              <button type="button" data-billet-preset="${idx}" class="px-2 py-1 rounded-lg bg-[#111214] hover:bg-[#2B2D31] border border-white/10 text-[10.5px] font-semibold text-[#DBDEE1] cursor-pointer">
                ${escapeHtml(bp.name)}
              </button>
            `
            )
            .join('')}
        </div>
      </div>
      <div>
        <label for="inp-billet-name" class="block text-xs font-medium text-[#B5BAC1] mb-1">Nama Jabatan</label>
        <input id="inp-billet-name" type="text" required placeholder="Contoh: KADIV RESKRIM / KANIT JATANRAS" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
      </div>
      <div>
        <label for="inp-billet-desc" class="block text-xs font-medium text-[#B5BAC1] mb-1">Wewenang &amp; Peran</label>
        <input id="inp-billet-desc" type="text" placeholder="Contoh: Mengkoordinir penyelidikan dan pembinaan anggota" class="w-full min-h-[44px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
      </div>
      <div>
        <div class="flex items-center justify-between text-xs font-medium text-[#B5BAC1] mb-1">
          <label for="inp-billet-hierarchy">Posisi Hierarki Awal</label>
          <span id="lbl-billet-hierarchy" class="font-mono-num font-bold text-[#FACC15]">50 / 99</span>
        </div>
        <input id="inp-billet-hierarchy" type="range" min="1" max="99" value="50" class="w-full h-2 accent-[#5865F2] cursor-pointer" />
      </div>
      <p id="form-error" class="text-xs text-[#DA373C] hidden"></p>
      <button type="submit" class="w-full min-h-[46px] rounded-xl theme-accent-btn font-semibold text-sm cursor-pointer">
        Tambah Jabatan
      </button>
    </form>
  `;
}

export function wireBilletModalHandlers(container, store) {
  const form = container.querySelector('#form-create-billet');
  const slider = container.querySelector('#inp-billet-hierarchy');
  const lbl = container.querySelector('#lbl-billet-hierarchy');
  const nameInp = container.querySelector('#inp-billet-name');
  const descInp = container.querySelector('#inp-billet-desc');
  let selectedPresetPerms = null;

  if (slider && lbl) {
    slider.addEventListener('input', (e) => {
      lbl.textContent = `${e.target.value} / 99`;
    });
  }
  container.querySelectorAll('[data-billet-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bp = BILLET_EXPANSION_POOL[Number(btn.dataset.billetPreset)];
      if (!bp) return;
      if (nameInp) nameInp.value = bp.name;
      if (descInp) descInp.value = bp.description || '';
      if (slider && lbl) {
        slider.value = String(bp.hierarchyOrder || 55);
        lbl.textContent = `${slider.value} / 99`;
      }
      selectedPresetPerms = bp.permissions || null;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInp.value.trim();
    const description = descInp.value.trim();
    const hierarchyOrder = slider ? Number(slider.value) : 50;
    if (!name) {
      const err = container.querySelector('#form-error');
      err.textContent = 'Nama jabatan wajib diisi.';
      err.classList.remove('hidden');
      return;
    }
    store.createBillet({ name, description, minRankOrder: 2, hierarchyOrder, permissions: selectedPresetPerms || undefined });
    store.closeOrgModal();
  });
}

export function buildSubServerModal(state) {
  return `
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto my-2"></div>
    <div class="px-4 flex items-center justify-between pb-3 border-b border-white/[0.07]">
      <h2 class="text-base font-bold text-[#F2F3F5]">Buat Sub-Server Divisi / Komunitas</h2>
      <button type="button" id="btn-close-sheet" aria-label="Tutup form" class="tap-target flex items-center justify-center text-[#B5BAC1] cursor-pointer">
        ${svgIcons.close}
      </button>
    </div>
    <form id="form-create-subserver" class="px-4 py-3 space-y-3 scroll-y-thin">
      <div class="p-2.5 rounded-xl bg-[#111214] border border-white/[0.06] flex items-center gap-3">
        <div id="subserver-logo-preview" class="shrink-0">
          ${serverLogoEngine.renderSubServerLogo({ id: 'preview', name: 'KORPS BRIMOB', shortCode: 'BRM', category: 'DIVISI', color: '#8B5CF6' }, { sizeClass: 'w-12 h-12' })}
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold tracking-wider text-[#80848E]">PREVIEW LOGO PROSEDURAL</div>
          <div id="subserver-profile-label" class="text-xs font-semibold text-[#F2F3F5] truncate mt-0.5">Profil Heraldry: BRIMOB</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5">
        <div class="col-span-2">
          <label for="inp-sub-name" class="block text-xs font-medium text-[#B5BAC1] mb-1">Nama Sub-Server</label>
          <input id="inp-sub-name" type="text" required placeholder="Contoh: KORPS BRIMOB / PANITIA EVENT" class="w-full min-h-[42px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5]" />
        </div>
        <div>
          <label for="inp-sub-code" class="block text-xs font-medium text-[#B5BAC1] mb-1">Singkatan</label>
          <input id="inp-sub-code" type="text" maxlength="4" placeholder="BRM" class="w-full min-h-[42px] px-3 rounded-xl bg-[#111214] border border-white/10 text-sm text-[#F2F3F5] uppercase font-mono-num" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label for="inp-sub-cat" class="block text-xs font-medium text-[#B5BAC1] mb-1">Kategori</label>
          <select id="inp-sub-cat" class="w-full min-h-[42px] px-2.5 rounded-xl bg-[#111214] border border-white/10 text-xs text-[#F2F3F5]">
            <option value="DIVISI">Divisi / Satuan Kerja</option>
            <option value="PERWIRA">Perwira-Only / Pimpinan</option>
            <option value="AKADEMI">Akademi / Lemdiklat</option>
            <option value="EVENT">Panitia Event RP</option>
          </select>
        </div>
        <div>
          <label for="inp-sub-color" class="block text-xs font-medium text-[#B5BAC1] mb-1">Warna Ikon</label>
          <select id="inp-sub-color" class="w-full min-h-[42px] px-2.5 rounded-xl bg-[#111214] border border-white/10 text-xs text-[#F2F3F5]">
            <option value="#8B5CF6">Ungu Brimob</option>
            <option value="#EAB308">Emas Perwira</option>
            <option value="#0EA5E9">Biru Akademi</option>
            <option value="#EC4899">Pink Panitia Event</option>
            <option value="#EF4444">Merah Reskrim</option>
            <option value="#10B981">Emerald Propam</option>
          </select>
        </div>
      </div>

      <div>
        <label for="inp-sub-owner" class="block text-xs font-medium text-[#B5BAC1] mb-1">Owner Pengelola Sub-Server</label>
        <select id="inp-sub-owner" class="w-full min-h-[42px] px-2.5 rounded-xl bg-[#111214] border border-white/10 text-xs text-[#F2F3F5]">
          <option value="owner">${escapeHtml(state.ownerName)} (Kapolda · Anda)</option>
          ${state.members
            .map(
              (m) =>
                `<option value="${m.id}">${escapeHtml(m.icName)}${m.personalAuthority?.canOwnSubServer ? ' (Punya Izin Sub-Server)' : ''}</option>`
            )
            .join('')}
        </select>
      </div>

      <label class="flex items-center gap-2 text-xs text-[#DBDEE1] cursor-pointer">
        <input id="inp-sub-aff" type="checkbox" checked class="w-4 h-4 accent-[#23A55A]" />
        <span>Langsung afiliasikan dengan Server Utama Mabes</span>
      </label>

      <p id="form-error" class="text-xs text-[#DA373C] hidden"></p>
      <button type="submit" class="w-full min-h-[46px] rounded-xl theme-accent-btn font-semibold text-sm cursor-pointer">
        Dirikan Sub-Server
      </button>
    </form>
  `;
}

export function wireSubServerModalHandlers(container, store) {
  const form = container.querySelector('#form-create-subserver');
  const previewEl = container.querySelector('#subserver-logo-preview');
  const profileLabel = container.querySelector('#subserver-profile-label');
  const nameInput = container.querySelector('#inp-sub-name');
  const codeInput = container.querySelector('#inp-sub-code');
  const catInput = container.querySelector('#inp-sub-cat');
  const colorInput = container.querySelector('#inp-sub-color');

  const updatePreview = () => {
    if (!previewEl) return;
    const sample = {
      id: 'preview',
      name: nameInput.value.trim() || 'KORPS BRIMOB',
      shortCode: codeInput.value.trim() || (nameInput.value.trim().slice(0, 3) || 'BRM'),
      category: catInput.value,
      color: colorInput.value,
    };
    previewEl.innerHTML = serverLogoEngine.renderSubServerLogo(sample, { sizeClass: 'w-12 h-12' });
    if (profileLabel) {
      profileLabel.textContent = `Profil Heraldry: ${resolveServerProfile(sample)}`;
    }
  };

  nameInput.addEventListener('input', updatePreview);
  codeInput.addEventListener('input', updatePreview);
  catInput.addEventListener('change', updatePreview);
  colorInput.addEventListener('change', updatePreview);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = container.querySelector('#inp-sub-name').value.trim();
    const shortCode = container.querySelector('#inp-sub-code').value.trim();
    const category = container.querySelector('#inp-sub-cat').value;
    const color = container.querySelector('#inp-sub-color').value;
    const ownerId = container.querySelector('#inp-sub-owner').value;
    const affiliate = container.querySelector('#inp-sub-aff').checked;

    if (!name) {
      const err = container.querySelector('#form-error');
      err.textContent = 'Nama sub-server wajib diisi.';
      err.classList.remove('hidden');
      return;
    }

    if (ownerId !== 'owner') {
      const aiOwner = store.state.members.find((m) => m.id === ownerId);
      if (aiOwner) {
        if (!aiOwner.personalAuthority) {
          aiOwner.personalAuthority = { canOwnSubServer: true, canAffiliateServer: affiliate };
        } else {
          aiOwner.personalAuthority.canOwnSubServer = true;
          if (affiliate) aiOwner.personalAuthority.canAffiliateServer = true;
        }
      }
    }

    const created = store.createSubServer({
      name,
      shortCode,
      category,
      color,
      ownerId,
      affiliate,
    });
    if (!created) {
      const err = container.querySelector('#form-error');
      err.textContent = 'Sub-server dengan nama tersebut sudah ada.';
      err.classList.remove('hidden');
      return;
    }
    store.closeOrgModal();
  });
}
