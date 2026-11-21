import { calculateServerAttractiveness } from '../engine/rules.js';
import { renderRanksTab } from './org/ranksTab.js';
import { renderDivisionsTab } from './org/divisionsTab.js';
import { renderAcademyTab } from './org/academyTab.js';
import { renderAuthorityWorkspace } from './org/authorityTab.js';
import { renderStaffTab } from './org/staffTab.js';

export class OrgManagerView {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    this.academyNotice = '';
  }

  render(reason = 'state') {
    const active = document.activeElement;
    if (
      active &&
      ((active.dataset && active.dataset.hierarchySlider) ||
        (reason === 'sim-event' &&
          active.closest &&
          active.closest('#org-scroll-container') &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)))
    ) {
      return;
    }

    const prevScroller = this.root.querySelector('#org-scroll-container');
    const savedScroll = prevScroller ? prevScroller.scrollTop : 0;

    const { state, ui } = this.store;
    const attr = calculateServerAttractiveness(state);
    const avgBetah =
      state.members.length > 0
        ? Math.round(state.members.reduce((s, m) => s + m.betahScore, 0) / state.members.length)
        : 0;

    this.root.innerHTML = `
      <div class="flex flex-col h-full theme-app">
        <header class="h-12 px-3 flex items-center justify-between theme-header-grad border-b border-white/[0.08] shrink-0">
          <h1 class="text-sm font-bold text-[#F2F3F5] truncate">Struktur, Akses &amp; Sistem</h1>
          <span class="text-xs font-mono-num font-semibold text-[#D4A024]">${state.reputation} Rep</span>
        </header>

        <div id="org-scroll-container" class="flex-1 scroll-y-thin p-3 space-y-3">
          <section class="p-3 rounded-2xl theme-surface border border-white/[0.07]">
            <div class="flex items-baseline justify-between">
              <div>
                <div class="text-xs text-[#80848E]">Daya Tarik Komunitas RP</div>
                <div class="text-2xl font-extrabold font-mono-num text-[#F2F3F5] mt-0.5">${attr.total}%</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-[#80848E]">Rata-rata Betah</div>
                <div class="text-lg font-bold font-mono-num ${avgBetah >= 65 ? 'text-[#23A55A]' : 'text-[#F0B232]'}">${avgBetah}%</div>
              </div>
            </div>

            <div class="mt-2.5 grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-white/[0.06]">
              <div>
                <div class="text-xs font-bold font-mono-num text-[#F2F3F5]">${attr.breakdown.rankScore}/25</div>
                <div class="text-[10px] text-[#80848E]">Pangkat</div>
              </div>
              <div>
                <div class="text-xs font-bold font-mono-num text-[#F2F3F5]">${attr.breakdown.divisionScore}/25</div>
                <div class="text-[10px] text-[#80848E]">Divisi</div>
              </div>
              <div>
                <div class="text-xs font-bold font-mono-num text-[#F2F3F5]">${attr.breakdown.billetScore}/20</div>
                <div class="text-[10px] text-[#80848E]">Jabatan</div>
              </div>
              <div>
                <div class="text-xs font-bold font-mono-num text-[#F2F3F5]">${attr.breakdown.moraleScore}/30</div>
                <div class="text-[10px] text-[#80848E]">Morale</div>
              </div>
            </div>
          </section>

          <div class="grid grid-cols-5 gap-1 p-1 rounded-xl theme-surface border border-white/[0.06]" role="tablist" aria-label="Kategori Struktur">
            <button type="button" role="tab" aria-selected="${ui.orgSubTab === 'ranks'}" data-subtab="ranks" class="min-h-[38px] px-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap truncate cursor-pointer ${ui.orgSubTab === 'ranks' ? 'theme-accent-btn' : 'text-[#B5BAC1]'}">
              Pangkat
            </button>
            <button type="button" role="tab" aria-selected="${ui.orgSubTab === 'divisions'}" data-subtab="divisions" class="min-h-[38px] px-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap truncate cursor-pointer ${ui.orgSubTab === 'divisions' ? 'theme-accent-btn' : 'text-[#B5BAC1]'}">
              Divisi
            </button>
            <button type="button" role="tab" aria-selected="${ui.orgSubTab === 'academy'}" data-subtab="academy" class="min-h-[38px] px-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap truncate cursor-pointer ${ui.orgSubTab === 'academy' ? 'bg-[#0EA5E9] text-white' : 'text-[#B5BAC1]'}">
              Akademi
            </button>
            <button type="button" role="tab" aria-selected="${ui.orgSubTab === 'billets'}" data-subtab="billets" class="min-h-[38px] px-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap truncate cursor-pointer ${ui.orgSubTab === 'billets' ? 'theme-accent-btn' : 'text-[#B5BAC1]'}">
              Otoritas
            </button>
            <button type="button" role="tab" aria-selected="${ui.orgSubTab === 'staff'}" data-subtab="staff" class="min-h-[38px] px-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap truncate cursor-pointer ${ui.orgSubTab === 'staff' ? 'theme-accent-btn' : 'text-[#B5BAC1]'}">
              Dev/Staf
            </button>
          </div>

          <section id="org-subtab-content" class="space-y-2.5">
            ${this._renderSubTab(state, ui)}
          </section>
        </div>
      </div>
    `;

    this._wireHandlers();

    const newScroller = this.root.querySelector('#org-scroll-container');
    if (newScroller && savedScroll > 0) {
      newScroller.scrollTop = savedScroll;
    }
  }

  _renderSubTab(state, ui) {
    if (ui.orgSubTab === 'ranks') return renderRanksTab(state, ui);
    if (ui.orgSubTab === 'divisions') return renderDivisionsTab(state, ui);
    if (ui.orgSubTab === 'academy') return renderAcademyTab(state, this.academyNotice);
    if (ui.orgSubTab === 'billets') return renderAuthorityWorkspace(state, ui);
    return renderStaffTab(state);
  }

  _wireHandlers() {
    this.root.querySelectorAll('[data-subtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setOrgSubTab(btn.dataset.subtab);
      });
    });

    const addRank = this.root.querySelector('#btn-add-rank');
    if (addRank) addRank.addEventListener('click', () => this.store.openOrgModal('rank'));

    const addDiv = this.root.querySelector('#btn-add-div');
    if (addDiv) addDiv.addEventListener('click', () => this.store.openOrgModal('division'));

    const addBillet = this.root.querySelector('#btn-add-billet');
    if (addBillet) addBillet.addEventListener('click', () => this.store.openOrgModal('billet'));

    const patchBtn = this.root.querySelector('#btn-manual-patch');
    if (patchBtn) patchBtn.addEventListener('click', () => this.store.triggerTechPatch());

    this.root.querySelectorAll('[data-del-rank]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.deleteRank(btn.dataset.delRank));
    });

    this.root.querySelectorAll('[data-del-div]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.deleteDivision(btn.dataset.delDiv));
    });

    this.root.querySelectorAll('[data-expand-rank]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.setExpandedRank(btn.dataset.expandRank));
    });

    this.root.querySelectorAll('[data-expand-div]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.setExpandedDivision(btn.dataset.expandDiv));
    });

    this.root.querySelectorAll('[data-jump-authority]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [kind, id] = btn.dataset.jumpAuthority.split(':');
        this.store.selectAuthorityNode(kind, id);
        this.store.setAuthoritySubMode('editor');
        this.store.setOrgSubTab('billets');
      });
    });

    this.root.querySelectorAll('[data-toggle-div-gate], [data-toggle-div-gate-node]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const divId = btn.dataset.toggleDivGate || btn.dataset.toggleDivGateNode;
        this.store.setDivisionGateClearance(divId, btn.dataset.gateVal === '1');
      });
    });

    this.root.querySelectorAll('[data-div-quota-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const div = this.store.state.divisions.find((d) => d.id === btn.dataset.divQuotaDec);
        if (div) this.store.setDivisionQuota(div.id, Math.max(1, (div.quota || 6) - 1));
      });
    });

    this.root.querySelectorAll('[data-div-quota-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const div = this.store.state.divisions.find((d) => d.id === btn.dataset.divQuotaInc);
        if (div) this.store.setDivisionQuota(div.id, Math.min(50, (div.quota || 6) + 1));
      });
    });

    this.root.querySelectorAll('[data-div-quota-input]').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        this.store.setDivisionQuota(inp.dataset.divQuotaInput, Number(e.target.value));
      });
    });

    this.root.querySelectorAll('[data-div-duty-type]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        this.store.setDivisionDutyProfile(sel.dataset.divDutyType, { assignmentType: e.target.value });
      });
    });

    const openDmOrgBtn = this.root.querySelector('#btn-open-dm-from-org');
    if (openDmOrgBtn) {
      openDmOrgBtn.addEventListener('click', () => this.store.openDmInbox());
    }

    this.root.querySelectorAll('[data-open-dm-peer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.openDmInbox(btn.dataset.openDmPeer || null);
      });
    });

    this.root.querySelectorAll('[data-open-sub-registrasi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.joinSubServerFromChat(btn.dataset.openSubRegistrasi);
      });
    });

    this.root.querySelectorAll('[data-div-head]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        this.store.setDivisionHead(sel.dataset.divHead, e.target.value || null);
      });
    });

    this.root.querySelectorAll('[data-div-vice-head]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        this.store.setDivisionViceHead(sel.dataset.divViceHead, e.target.value || null);
      });
    });

    this.root.querySelectorAll('[data-div-daily-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const div = this.store.state.divisions.find((d) => d.id === btn.dataset.divDailyDec);
        if (div) this.store.setDivisionDailyIntake(div.id, Math.max(1, (div.dailyIntakeQuota || 3) - 1));
      });
    });

    this.root.querySelectorAll('[data-div-daily-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const div = this.store.state.divisions.find((d) => d.id === btn.dataset.divDailyInc);
        if (div) this.store.setDivisionDailyIntake(div.id, Math.min(20, (div.dailyIntakeQuota || 3) + 1));
      });
    });

    this.root.querySelectorAll('[data-div-daily-input]').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        this.store.setDivisionDailyIntake(inp.dataset.divDailyInput, Number(e.target.value));
      });
    });

    this.root.querySelectorAll('[data-send-proposal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.sendDivisionProposalManual(btn.dataset.sendProposal);
      });
    });

    this.root.querySelectorAll('[data-approve-proposal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.approveDivisionProposal(btn.dataset.approveProposal, true);
      });
    });

    this.root.querySelectorAll('[data-reject-proposal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.approveDivisionProposal(btn.dataset.rejectProposal, false);
      });
    });

    this.root.querySelectorAll('[data-eval-recruit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.evaluateRecruitManual(btn.dataset.evalRecruit);
      });
    });

    this.root.querySelectorAll('[data-advance-recruit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.advanceRecruitManual(btn.dataset.advanceRecruit);
      });
    });

    const toggleTreeBtn = this.root.querySelector('#btn-toggle-auth-tree');
    if (toggleTreeBtn) {
      toggleTreeBtn.addEventListener('click', () => this.store.toggleAuthorityTree());
    }

    const modeEditorBtn = this.root.querySelector('#btn-auth-mode-editor');
    if (modeEditorBtn) {
      modeEditorBtn.addEventListener('click', () => this.store.setAuthoritySubMode('editor'));
    }

    const modeDelBtn = this.root.querySelector('#btn-auth-mode-delegation');
    if (modeDelBtn) {
      modeDelBtn.addEventListener('click', () => this.store.setAuthoritySubMode('delegation'));
    }

    const propamGateOrgBtn = this.root.querySelector('#btn-toggle-propam-gate-org');
    if (propamGateOrgBtn) {
      propamGateOrgBtn.addEventListener('click', () => this.store.togglePropamGate());
    }

    const viewMabes2d = this.root.querySelector('#btn-view-mabes-2d');
    if (viewMabes2d) {
      viewMabes2d.addEventListener('click', () => this.store.setActiveTab('city'));
    }

    this.root.querySelectorAll('[data-auth-node]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [kind, id] = btn.dataset.authNode.split(':');
        this.store.selectAuthorityNode(kind, id);
      });
    });

    this.root.querySelectorAll('[data-toggle-perm-group]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.togglePermGroup(btn.dataset.togglePermGroup);
      });
    });

    this.root.querySelectorAll('[data-node-perm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [kind, id, key, valStr] = btn.dataset.nodePerm.split(':');
        const val = valStr === '1';
        if (kind === 'billet') this.store.togglePermission(id, key, val);
        else if (kind === 'rank') this.store.setRankPermission(id, key, val);
        else if (kind === 'division') this.store.setDivisionPermission(id, key, val);
      });
    });

    this.root.querySelectorAll('[data-delegate-perm]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        this.store.delegateAuthority(sel.dataset.delegatePerm, e.target.value || null);
      });
    });

    this.root.querySelectorAll('[data-assign-billet]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        if (e.target.value) {
          this.store.setMemberBillet(e.target.value, sel.dataset.assignBillet);
        }
      });
    });

    this.root.querySelectorAll('[data-hierarchy-slider]').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const billetId = slider.dataset.hierarchySlider;
        const lbl = this.root.querySelector(`[data-hierarchy-label="${billetId}"]`);
        if (lbl) lbl.textContent = `${e.target.value} / 99`;
      });
      slider.addEventListener('change', (e) => {
        this.store.setBilletHierarchyOrder(slider.dataset.hierarchySlider, Number(e.target.value));
      });
    });

    this.root.querySelectorAll('[data-open-staff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.openMemberInspector(btn.dataset.openStaff);
      });
    });

    const toggleAcadOpen = this.root.querySelector('#btn-toggle-academy-open');
    if (toggleAcadOpen) {
      toggleAcadOpen.addEventListener('click', () => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ isOpen: !this.store.state.academy?.isOpen });
      });
    }

    const gotoAcadChan = this.root.querySelector('#btn-goto-academy-channel');
    if (gotoAcadChan) {
      gotoAcadChan.addEventListener('click', () => {
        this.store.setActiveChannel('akademi-lemdiklat');
        this.store.setActiveTab('discord');
      });
    }

    const gotoAkpolReg = this.root.querySelector('#btn-goto-akpol-reg');
    if (gotoAkpolReg) {
      gotoAkpolReg.addEventListener('click', () => {
        this.store.setActiveServer('sub-akademi');
        this.store.setActiveSubChannel('akpol-registrasi');
        this.store.setActiveTab('discord');
      });
    }

    const gotoAkpolReq = this.root.querySelector('#btn-goto-akpol-req');
    if (gotoAkpolReq) {
      gotoAkpolReq.addEventListener('click', () => {
        this.store.setActiveServer('sub-akademi');
        this.store.setActiveSubChannel('akpol-request');
        this.store.setActiveTab('discord');
      });
    }

    const postAkpolReq = this.root.querySelector('#btn-post-akpol-request');
    if (postAkpolReq) {
      postAkpolReq.addEventListener('click', () => {
        const res = this.store.requestAkpolDrill('owner');
        this.academyNotice = res.ok
          ? 'Permintaan pelatihan telah dikirim ke #request sub-server AKADEMI KEPOLISIAN.'
          : res.reason;
        this.render('org');
      });
    }

    const leadCohortBtn = this.root.querySelector('#btn-lead-akpol-cohort');
    if (leadCohortBtn) {
      leadCohortBtn.addEventListener('click', () => {
        const res = this.store.leadAkpolDrill();
        this.academyNotice = res.ok
          ? `Baris-berbaris serentak ${res.count} Taruna dipimpin oleh ${res.trainerName}.`
          : res.message;
        this.render('org');
      });
    }

    const acadQuota = this.root.querySelector('#acad-quota');
    if (acadQuota) {
      acadQuota.addEventListener('change', (e) => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ quota: Number(e.target.value) });
      });
    }

    const acadRank = this.root.querySelector('#acad-target-rank');
    if (acadRank) {
      acadRank.addEventListener('change', (e) => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ targetRankId: e.target.value });
      });
    }

    const acadMinProf = this.root.querySelector('#acad-min-prof');
    if (acadMinProf) {
      acadMinProf.addEventListener('change', (e) => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ minProfessionalism: Number(e.target.value) });
      });
    }

    const acadMinAct = this.root.querySelector('#acad-min-act');
    if (acadMinAct) {
      acadMinAct.addEventListener('change', (e) => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ minActivityDrive: Number(e.target.value) });
      });
    }

    const acadBonusXp = this.root.querySelector('#acad-bonus-xp');
    if (acadBonusXp) {
      acadBonusXp.addEventListener('change', (e) => {
        this.academyNotice = '';
        this.store.updateAcademyConfig({ graduateBonusXp: Number(e.target.value) });
      });
    }

    this.root.querySelectorAll('[data-acad-register]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = this.store.submitAkpolReg(btn.dataset.acadRegister);
        this.academyNotice = res.ok
          ? `${res.member.icName} berhasil mengirim #registrasi di sub-server AKADEMI KEPOLISIAN.`
          : res.reason || 'Gagal mengirim #registrasi.';
        this.render('org');
      });
    });

    this.root.querySelectorAll('[data-acad-enroll]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = this.store.enrollInAcademy(btn.dataset.acadEnroll);
        if (!res.ok) {
          this.academyNotice = `Pendaftaran ditolak: ${res.reasons.join(', ')}.`;
          this.render('org');
        } else {
          this.academyNotice = '';
        }
      });
    });

    this.root.querySelectorAll('[data-acad-train]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ok = this.store.trainAcademyCadet(btn.dataset.acadTrain);
        if (!ok) {
          const cur = this.store.state.members.filter((m) => m.academyStatus === 'ENROLLED').length;
          const q = this.store.state.academy?.quota || 4;
          this.academyNotice = `Baris-berbaris Akpol tidak bisa perorangan! Tunggu kuota penuh terlebih dahulu (${cur}/${q} Taruna).`;
          this.render('org');
        } else {
          this.academyNotice = 'Baris-berbaris serentak sukses meningkatkan progres angkatan!';
        }
      });
    });

    this.root.querySelectorAll('[data-acad-graduate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.academyNotice = '';
        this.store.graduateAcademyCadet(btn.dataset.acadGraduate);
      });
    });

    this.root.querySelectorAll('[data-acad-fail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.academyNotice = '';
        this.store.failAcademyCadet(btn.dataset.acadFail);
      });
    });
  }
}
