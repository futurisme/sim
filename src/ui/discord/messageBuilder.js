import { avatarEngine } from '../../engine/avatarEngine.js';
import { serverLogoEngine } from '../../engine/serverLogoEngine.js';
import { escapeHtml } from '../icons.js';

export function renderReactionsHtml(m) {
  const existing = (m.reactions || [])
    .map(
      (r) => `
      <button type="button" data-react-msg="${m.id}" data-emoji="${r.emoji}" class="px-2 py-0.5 rounded-md bg-[#2B2D31] hover:bg-[#35373C] text-[11px] text-[#F2F3F5] border border-white/[0.06] cursor-pointer font-mono-num">
        ${r.emoji} ${r.count}
      </button>
    `
    )
    .join('');
  return `${existing}<button type="button" data-react-msg="${m.id}" data-emoji="🫡" aria-label="Beri reaksi salut" class="px-1.5 py-0.5 rounded-md bg-transparent hover:bg-[#2B2D31] text-[11px] text-[#80848E] cursor-pointer">+ 🫡</button>`;
}

export function createMessageNode(m, prevMsg, state, animate, prefs = {}) {
  const wrapper = document.createElement('div');
  wrapper.dataset.msgId = m.id;

  const showTimestamps = prefs.showTimestamps !== false;
  const isDmMsg = Boolean(m.peerId);
  const authorId = m.authorId || m.senderId || (m.isOwner ? 'owner' : m.peerId);
  const authorName = m.authorName || m.senderName || (m.isOwner ? `${state.ownerName} (Anda)` : 'Anggota');
  const authorRole = m.authorRole || m.senderRole || '';
  const authorColor = m.authorColor || m.senderColor || '#F2F3F5';

  const prevAuthorId = prevMsg
    ? prevMsg.authorId || prevMsg.senderId || (prevMsg.isOwner ? 'owner' : prevMsg.peerId)
    : null;
  const prevAuthorName = prevMsg ? prevMsg.authorName || prevMsg.senderName : null;

  const sameAuthor =
    prevMsg &&
    prevAuthorId === authorId &&
    !m.actionMemberId &&
    !prevMsg.actionMemberId &&
    !m.replyTo &&
    !prevMsg.replyTo &&
    !m.recruitInvite &&
    !prevMsg.recruitInvite &&
    !m.proposalId &&
    !prevMsg.proposalId &&
    !m.isSystem &&
    !prevMsg.isSystem &&
    prevAuthorName === authorName;

  const canOpenProfile = authorId && authorId !== 'system';
  const memberObj =
    authorId && authorId !== 'owner' && authorId !== 'system'
      ? state.members.find((mem) => mem.id === authorId)
      : null;

  const actionMember = m.actionMemberId
    ? state.members.find((mem) => mem.id === m.actionMemberId)
    : null;

  const avatarSvg =
    authorId === 'system'
      ? `<div class="w-9 h-9 rounded-full bg-[#35373C] flex items-center justify-center text-[11px] font-bold text-[#FACC15]">SYS</div>`
      : avatarEngine.renderSvg(authorId || authorName, authorName, {
          isOwner: m.isOwner,
          member: memberObj,
          state,
          sizeClass: 'w-9 h-9 rounded-full overflow-hidden block',
        });

  const formattedTextHtml = escapeHtml(m.text || '').replaceAll('\n', '<br>');
  const reactHtml = isDmMsg ? '' : renderReactionsHtml(m);

  const replyQuoteHtml = m.replyTo
    ? `
      <div class="flex items-center gap-1.5 text-[11px] text-[#949BA4] mb-0.5 pl-2 border-l-2 border-[#5865F2]/70 truncate">
        <span class="text-[#80848E] shrink-0">↩</span>
        <span class="font-semibold text-[#B5BAC1] shrink-0">@${escapeHtml(m.replyTo.authorName)}</span>
        <span class="truncate opacity-85">${escapeHtml(m.replyTo.snippet)}</span>
      </div>
    `
    : '';

  let proposalCardHtml = '';
  if (m.proposalId) {
    const prop = (state.divisionProposals || []).find((p) => p.id === m.proposalId);
    if (prop) {
      const statusBadge =
        prop.status === 'PENDING'
          ? `<span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#F0B232]/20 text-[#FACC15]">MENUNGGU ACC</span>`
          : prop.status === 'APPROVED'
            ? `<span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#23A55A]/20 text-[#4ADE80]">✓ DISETUJUI</span>`
            : `<span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#DA373C]/20 text-[#FCA5A5]">✕ DITOLAK</span>`;

      const unitsHtml = (prop.units || [])
        .map(
          (u, idx) => `
            <div class="p-2 rounded-lg bg-[#1E1F22] border border-white/[0.05]">
              <div class="flex items-center justify-between gap-2 text-[11px] font-bold text-[#F2F3F5]">
                <span>${idx + 1}. ${escapeHtml(u.name)}</span>
                <span class="text-[10px] font-normal text-[#93C5FD]">${escapeHtml(u.roleTitle)}</span>
              </div>
              <div class="mt-1 space-y-0.5 pl-2">
                ${(u.subUnits || [])
                  .map(
                    (su) => `
                      <div class="flex items-center justify-between gap-2 text-[10.5px] text-[#B5BAC1]">
                        <span>• ${escapeHtml(su.name)} (${escapeHtml(su.roleTitle)})</span>
                        <span class="font-mono-num text-[#80848E]">0/${su.quota}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </div>
          `
        )
        .join('');

      proposalCardHtml = `
        <div class="mt-2 rounded-xl bg-[#111214] border border-white/[0.1] overflow-hidden max-w-md" style="border-left: 3.5px solid ${escapeHtml(prop.divisionColor || '#5865F2')}">
          <div class="p-2.5 bg-[#18191C] border-b border-white/[0.06] flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-extrabold text-[#F2F3F5] truncate">Rancangan Unit &amp; Sub-Unit · ${escapeHtml(prop.divisionName)}</div>
              <div class="text-[10.5px] text-[#80848E]">Kuota Hari Ini: <strong class="text-[#F2F3F5] font-mono-num">${prop.dailyQuota} slot</strong> · Pengusul: ${escapeHtml(prop.proposerName)}</div>
            </div>
            ${statusBadge}
          </div>
          <div class="p-2.5 space-y-1.5">
            ${unitsHtml}
            ${
              prop.status === 'PENDING'
                ? `<div class="pt-1.5 flex items-center gap-2">
                     <button type="button" data-dm-approve-prop="${prop.id}" class="flex-1 min-h-[36px] px-3 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-bold cursor-pointer">
                       ✓ ACC &amp; Buka #registrasi
                     </button>
                     <button type="button" data-dm-reject-prop="${prop.id}" class="min-h-[36px] px-3 rounded-lg bg-[#2B2D31] hover:bg-[#DA373C]/30 border border-white/10 text-[#FCA5A5] text-xs font-semibold cursor-pointer">
                       ✕ Tolak
                     </button>
                   </div>`
                : `<div class="pt-1 flex items-center justify-between gap-2">
                     <span class="text-[10.5px] text-[#80848E]">${escapeHtml(prop.reviewerNote || 'Sudah ditindaklanjuti Kapolda')}</span>
                     <button type="button" data-open-org-divs="${prop.divisionId}" class="text-[11px] font-semibold text-[#93C5FD] hover:underline cursor-pointer">
                       Lihat Struktur Unit →
                     </button>
                   </div>`
            }
          </div>
        </div>
      `;
    }
  }

  let recruitCardHtml = '';
  if (m.recruitInvite) {
    const inv = m.recruitInvite;
    const targetSub = (state.subServers || []).find((s) => s.id === inv.subServerId);
    const logoSubObj = targetSub || {
      id: inv.subServerId,
      name: inv.subServerName,
      shortCode: inv.shortCode,
      category: inv.category,
      color: inv.color || '#5865F2',
      description: inv.purposeText || '',
    };
    const isJoined = targetSub?.ownerJoined;
    const memberCount = targetSub ? targetSub.memberIds.length : inv.memberCount || 1;
    const formatHtml = escapeHtml(inv.formatText || '').replaceAll('\n', '<br>');
    const reqHtml = escapeHtml(inv.requirementsText || '').replaceAll('\n', '<br>');

    recruitCardHtml = `
      <div class="mt-2 rounded-xl bg-[#111214] border border-white/[0.1] overflow-hidden max-w-md" style="border-left: 3.5px solid ${escapeHtml(inv.color || '#5865F2')}">
        <div class="p-2.5 bg-[#18191C] border-b border-white/[0.06] flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            ${serverLogoEngine.renderSubServerLogo(logoSubObj, { sizeClass: 'w-11 h-11 shrink-0', compact: false })}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-extrabold text-[#F2F3F5] truncate">${escapeHtml(inv.subServerName)}</span>
                <span class="text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                  inv.affiliatedToMain ? 'bg-[#23A55A]/20 text-[#4ADE80]' : 'bg-[#F0B232]/20 text-[#FACC15]'
                }">${inv.affiliatedToMain ? 'Afiliasi Mabes' : 'Mandiri'}</span>
              </div>
              <div class="text-[10.5px] font-mono-num text-[#93C5FD] truncate">${escapeHtml(inv.inviteSlug || 'discord.gg/izumiya')}</div>
              <div class="text-[10px] text-[#80848E] truncate">${escapeHtml(inv.category || 'DIVISI')} · ${memberCount} Anggota</div>
            </div>
          </div>
        </div>

        <div class="p-2.5 space-y-2 text-[11.5px]">
          ${inv.purposeText ? `<div class="text-[#B5BAC1] leading-snug">${escapeHtml(inv.purposeText)}</div>` : ''}
          ${
            reqHtml
              ? `<div class="p-2 rounded-lg bg-[#1E1F22] border border-white/[0.05]">
                  <div class="text-[10px] font-bold tracking-wider text-[#FACC15] mb-1">SYARAT PENDAFTARAN</div>
                  <div class="text-[#DBDEE1] leading-relaxed">${reqHtml}</div>
                </div>`
              : ''
          }
          ${
            formatHtml
              ? `<div class="p-2 rounded-lg bg-[#1E1F22] border border-white/[0.05]">
                  <div class="text-[10px] font-bold tracking-wider text-[#93C5FD] mb-1">FORMAT REKRUTMEN</div>
                  <div class="font-mono-num text-[11px] text-[#DBDEE1] leading-relaxed select-all">${formatHtml}</div>
                </div>`
              : ''
          }
          <div class="pt-0.5 flex items-center justify-between gap-2">
            <span class="text-[10px] text-[#80848E]">Ketuk tautan untuk gabung &amp; verifikasi</span>
            <button
              type="button"
              data-join-subserver-link="${escapeHtml(inv.subServerId)}"
              class="min-h-[34px] px-3 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                isJoined ? 'bg-[#23A55A] hover:bg-[#1E8E4C] text-white' : 'theme-accent-btn'
              }"
            >
              ${isJoined ? 'Buka #registrasi →' : 'Gabung & Masuk Sub-Server'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (sameAuthor) {
    wrapper.className = `chat-msg-row pl-[46px] pr-1 py-0.5 hover:bg-white/[0.02] rounded-md ${animate ? 'msg-enter' : ''}`;
    wrapper.innerHTML = `
      <p class="chat-msg-text text-[13.5px] text-[#DBDEE1] leading-snug break-words">${formattedTextHtml}</p>
      ${isDmMsg ? '' : `<div data-react-slot class="mt-1 flex items-center flex-wrap gap-1">${reactHtml}</div>`}
    `;
  } else {
    const violationStyle = m.ruleViolation ? 'border-l-2 border-[#F0B232]/55 pl-1.5 bg-[#F0B232]/[0.03]' : '';
    wrapper.className = `chat-msg-row flex items-start gap-2.5 pt-2.5 pb-0.5 hover:bg-white/[0.02] rounded-md ${violationStyle} ${animate ? 'msg-enter' : ''}`;
    const avatarBtnAttr = canOpenProfile
      ? `type="button" data-open-profile="${escapeHtml(authorId)}" aria-label="Buka profil ${escapeHtml(authorName)}" class="w-9 h-9 rounded-full overflow-hidden shrink-0 mt-0.5 cursor-pointer hover:brightness-110 transition-[filter]"`
      : `class="w-9 h-9 rounded-full overflow-hidden shrink-0 mt-0.5"`;

    const nameTag = canOpenProfile
      ? `<button type="button" data-open-profile="${escapeHtml(authorId)}" class="text-sm font-bold truncate hover:underline cursor-pointer text-left" style="color:${authorColor}">${escapeHtml(authorName)}</button>`
      : `<span class="text-sm font-bold truncate" style="color:${authorColor}">${escapeHtml(authorName)}</span>`;

    const subRoleBadge =
      memberObj?.subRole
        ? `<span class="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#5865F2]/20 text-[#93C5FD]">${escapeHtml(memberObj.subRole)}</span>`
        : '';
    const modTag = m.ruleViolation
      ? `<span class="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#F0B232]/20 text-[#FACC15]">OOC/Etik</span>`
      : m.stance === 'MILD_PROTEST'
        ? `<span class="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#FBBF24]">Aspirasi</span>`
        : '';

    const timeSuffix = showTimestamps && m.timeLabel ? ` · ${escapeHtml(m.timeLabel)}` : '';

    wrapper.innerHTML = `
      <${canOpenProfile ? 'button' : 'div'} ${avatarBtnAttr}>
        ${avatarSvg}
      </${canOpenProfile ? 'button' : 'div'}>
      <div class="min-w-0 flex-1">
        ${replyQuoteHtml}
        <div class="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
          ${nameTag}
          ${subRoleBadge}
          ${modTag}
          <span class="text-[11px] text-[#80848E]">${escapeHtml(authorRole)}${timeSuffix}</span>
        </div>
        <p class="chat-msg-text text-[13.5px] text-[#DBDEE1] leading-snug mt-0.5 break-words">${formattedTextHtml}</p>
        ${
          m.isAkpolRequest
            ? `<div class="mt-1.5 flex flex-wrap gap-1.5">
                 <button type="button" data-lead-akpol-drill="1" class="px-2.5 py-1 rounded-lg bg-[#0EA5E9]/20 hover:bg-[#0EA5E9]/35 border border-[#0EA5E9]/50 text-[11px] font-bold text-[#7DD3FC] cursor-pointer">
                   Pimpin Baris-Berbaris Serentak Akpol
                 </button>
               </div>`
            : ''
        }
        ${proposalCardHtml}
        ${recruitCardHtml}
        ${
          actionMember
            ? `<div class="mt-1.5 flex flex-wrap gap-1.5">
                <button type="button" data-inspect-member="${actionMember.id}" class="px-2.5 py-1 rounded-lg bg-[#2B2D31] hover:bg-[#35373C] text-xs font-semibold text-[#F2F3F5] border border-white/10 cursor-pointer">
                  Lihat Profil &amp; Atur ${escapeHtml(actionMember.icName.split(' ')[0])}
                </button>
              </div>`
            : ''
        }
        ${isDmMsg ? '' : `<div data-react-slot class="mt-1 flex items-center flex-wrap gap-1">${reactHtml}</div>`}
      </div>
    `;
  }

  const slot = wrapper.querySelector('[data-react-slot]');
  if (slot) slot.dataset.hash = reactHtml;
  return wrapper;
}
