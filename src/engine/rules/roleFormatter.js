import { AWARDS_CATALOG, SUB_ROLES } from '../constants.js';

export const ROLE_CATEGORY_ORDER = [
  { id: 'adminServer', order: 1, title: 'Jabatan Administrasi Server', shortTitle: 'Admin Server', accent: '#F59E0B' },
  { id: 'jabatanOps', order: 2, title: 'Jabatan Operasional / Divisi', shortTitle: 'Jabatan Ops', accent: '#EAB308' },
  { id: 'pangkat', order: 3, title: 'Pangkat', shortTitle: 'Pangkat', accent: '#38BDF8' },
  { id: 'divisi', order: 4, title: 'Divisi', shortTitle: 'Divisi', accent: '#3B82F6' },
  { id: 'subDivisi', order: 5, title: 'Sub-Divisi', shortTitle: 'Sub-Divisi', accent: '#8B5CF6' },
  { id: 'unitDivisi', order: 6, title: 'Unit / Sub+Unit Divisi', shortTitle: 'Unit & Sub-Unit', accent: '#06B6D4' },
  { id: 'sertifikat', order: 7, title: 'Sertifikat', shortTitle: 'Sertifikat', accent: '#22C55E' },
  { id: 'brevet', order: 8, title: 'Brevet', shortTitle: 'Brevet', accent: '#0EA5E9' },
  { id: 'penghargaan', order: 9, title: 'Penghargaan', shortTitle: 'Penghargaan', accent: '#FACC15' },
];

export function resolveSubServerRoleEntry(rawRole, fallbackName = 'Anggota Satuan', fallbackColor = '#94A3B8') {
  const cleanRoleLabel = (txt) => {
    const t = String(txt || '').replace(/^Owner\s+Sub-Server\b/i, 'Ketua Satuan').trim();
    return t || fallbackName;
  };
  if (!rawRole) {
    return { roleName: cleanRoleLabel(fallbackName), color: fallbackColor, raw: null };
  }
  if (typeof rawRole === 'string') {
    return { roleName: cleanRoleLabel(rawRole), color: fallbackColor, raw: rawRole };
  }
  if (typeof rawRole === 'object') {
    const rawLabel =
      (typeof rawRole.roleName === 'string' && rawRole.roleName.trim()) ||
      (typeof rawRole.name === 'string' && rawRole.name.trim()) ||
      fallbackName;
    const color = typeof rawRole.color === 'string' && rawRole.color.startsWith('#')
      ? rawRole.color
      : fallbackColor;
    return {
      roleName: cleanRoleLabel(rawLabel),
      color,
      raw: rawRole,
    };
  }
  return { roleName: cleanRoleLabel(fallbackName), color: fallbackColor, raw: null };
}

export function cleanAwardLabel(name, category = '') {
  let clean = String(name || '').trim();
  if (!clean) return '';
  if (category === 'Sertifikat') {
    clean = clean.replace(/^sertifikat\s+/i, '');
  } else if (category === 'Brevet') {
    clean = clean.replace(/^brevet\s+/i, '');
  } else if (category === 'Medali') {
    clean = clean.replace(/^medali\s+/i, '');
  } else if (category === 'Penghargaan') {
    clean = clean.replace(/^penghargaan\s+/i, '');
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function addUniqueBadge(bucket, badge) {
  if (!badge || !badge.label) return;
  const key = `${badge.categoryId}:${badge.label.toLowerCase()}`;
  if (!bucket._seen) bucket._seen = new Set();
  if (bucket._seen.has(key)) return;
  bucket._seen.add(key);
  bucket.items.push(badge);
}

export function resolveMemberRoleGroups(memberOrOwner, state, options = {}) {
  const isOwner = memberOrOwner === 'owner' || memberOrOwner?.id === 'owner' || memberOrOwner?.isOwner;
  const activeSubServer = options.activeSubServer || null;
  const buckets = new Map();
  for (const cat of ROLE_CATEGORY_ORDER) {
    buckets.set(cat.id, { ...cat, items: [], _seen: new Set() });
  }

  const pushBadge = (categoryId, label, color, meta = '') => {
    const bucket = buckets.get(categoryId);
    if (!bucket) return;
    addUniqueBadge(bucket, {
      categoryId,
      categoryOrder: bucket.order,
      categoryTitle: bucket.title,
      label: String(label || '').trim(),
      color: color || bucket.accent || '#38BDF8',
      meta: String(meta || '').trim(),
    });
  };

  if (isOwner) {
    const ownerRank = (state.ranks || []).find((r) => r.isOwner) || { name: 'Kapolda (Owner)', color: '#D4A024' };
    pushBadge('adminServer', 'Owner & Founder Server', '#F59E0B', 'Tertinggi');
    pushBadge('jabatanOps', 'Kapolda Republik Izumiya', '#D4A024', 'Komando Tertinggi');
    pushBadge('pangkat', ownerRank.name.replace(/\s*\(Owner\)/i, ''), ownerRank.color || '#D4A024');

    if (activeSubServer) {
      const subEntry = resolveSubServerRoleEntry(
        activeSubServer.memberRoles?.['owner'],
        activeSubServer.ownerId === 'owner' ? 'Pendiri Sub-Server' : 'Tamu Kehormatan Kapolda',
        activeSubServer.color || '#D4A024'
      );
      pushBadge('subDivisi', `${activeSubServer.shortCode} · ${subEntry.roleName}`, subEntry.color, activeSubServer.name);
    }

    const ownerAwards = state.ownerProfile?.awards || [];
    for (const awId of ownerAwards) {
      const aw = AWARDS_CATALOG.find((a) => a.id === awId);
      if (!aw) continue;
      if (aw.category === 'Sertifikat') {
        pushBadge('sertifikat', cleanAwardLabel(aw.name, 'Sertifikat'), aw.color);
      } else if (aw.category === 'Brevet') {
        pushBadge('brevet', cleanAwardLabel(aw.name, 'Brevet'), aw.color);
      } else {
        pushBadge('penghargaan', cleanAwardLabel(aw.name, aw.category), aw.color);
      }
    }
  } else if (memberOrOwner) {
    const member = memberOrOwner;
    const rank = (state.ranks || []).find((r) => r.id === member.rankId) || (state.ranks || [])[0] || { name: 'Taruna', color: '#94A3B8' };
    const div = member.divisionId ? (state.divisions || []).find((d) => d.id === member.divisionId) || null : null;
    const billet = member.billetId ? (state.billets || []).find((b) => b.id === member.billetId) || null : null;
    const subRoleObj = member.subRole ? SUB_ROLES.find((s) => s.id === member.subRole) : null;

    // 1. Jabatan Administrasi Server teratas
    if (subRoleObj) {
      pushBadge('adminServer', subRoleObj.name, subRoleObj.color, 'Staf Server');
    } else if (member.subRole) {
      pushBadge('adminServer', member.subRole, '#6366F1', 'Staf Server');
    }
    const managedSubs = (state.subServers || []).filter(
      (s) => s.ownerId === member.id || s.memberRoles?.[member.id]?.canManageSubServer
    );
    if (managedSubs.length > 0 && !subRoleObj) {
      const ownsCount = managedSubs.filter((s) => s.ownerId === member.id).length;
      const label = ownsCount > 0 ? `Owner ${ownsCount} Sub-Server` : `Pengelola ${managedSubs.length} Sub-Server`;
      pushBadge('adminServer', label, '#8B5CF6', 'Akses Sub-Server');
    }

    // 2. Jabatan Operasional / Divisi (KADIV, WAKADIV, KANIT, Billets)
    if (billet) {
      pushBadge('jabatanOps', billet.name, billet.color || '#EAB308', 'Komando Mabes');
    }
    for (const d of state.divisions || []) {
      const divLabel = d.name.toUpperCase();
      if (d.headId === member.id) {
        pushBadge('jabatanOps', `KADIV ${divLabel}`, d.color || '#F59E0B', d.callsign);
      }
      if (d.viceHeadId === member.id) {
        pushBadge('jabatanOps', `WAKADIV ${divLabel}`, d.color || '#38BDF8', d.callsign);
      }
    }
    if (member.divisionUnitRole && /^(kanit|kadiv|wakadiv|kalemdiklat|danden|dankie|kagadiksus|ka|ketua|wakil)/i.test(member.divisionUnitRole)) {
      pushBadge('jabatanOps', member.divisionUnitRole, div?.color || '#38BDF8', div ? `Unit ${div.callsign}` : 'Operasional');
    }

    // 3. Pangkat
    pushBadge('pangkat', rank.name, rank.color || '#38BDF8');

    // 4. Divisi
    if (div) {
      pushBadge('divisi', `${div.name} [${div.callsign}]`, div.color || '#3B82F6');
    }
    const activeRec = (state.divisionRecruits || []).find(
      (r) => r.memberId === member.id && r.stage !== 'REJECTED' && r.stage !== 'INAUGURATED'
    );
    if (activeRec) {
      const recDiv = (state.divisions || []).find((d) => d.id === activeRec.divisionId);
      pushBadge(
        'divisi',
        `Seleksi ${recDiv?.callsign || 'Divisi'} · ${activeRec.stage} (${Math.round(activeRec.phaseProgress || 0)}%)`,
        recDiv?.color || '#F59E0B',
        'Diklat Divisi'
      );
    }

    // 5. Sub-Divisi (Sub-Server affiliation / satuan internal — NEVER [object Object])
    for (const sub of state.subServers || []) {
      const isMember = (sub.memberIds || []).includes(member.id);
      const isSubOwner = sub.ownerId === member.id;
      if (!isMember && !isSubOwner) continue;
      const rawRole = sub.memberRoles?.[member.id];
      const fallbackRole = isSubOwner
        ? sub.category === 'DIVISI'
          ? `Ketua Satuan ${sub.shortCode}`
          : `Pendiri ${sub.shortCode}`
        : `Anggota ${sub.shortCode}`;
      const resolved = resolveSubServerRoleEntry(rawRole, fallbackRole, sub.color || '#8B5CF6');
      const cleanedSubRole = resolved.roleName
        .replace(/^Owner\s+Sub-Server\b/i, 'Ketua Satuan')
        .trim() || fallbackRole;
      const affMark = sub.affiliatedToMain ? ' ★' : '';
      pushBadge(
        'subDivisi',
        `${sub.shortCode} · ${cleanedSubRole}${affMark}`,
        resolved.color || sub.color,
        sub.name
      );
    }

    // 6. Unit / Sub+Unit Divisi
    if (div && (member.divisionUnitId || member.divisionSubUnitId || member.divisionUnitRole)) {
      let unitObj = null;
      let subUnitObj = null;
      for (const u of div.units || []) {
        if (u.id === member.divisionUnitId) unitObj = u;
        const foundSu = (u.subUnits || []).find((su) => su.id === member.divisionSubUnitId);
        if (foundSu) {
          unitObj = unitObj || u;
          subUnitObj = foundSu;
        }
      }
      if (unitObj && subUnitObj) {
        pushBadge(
          'unitDivisi',
          `${unitObj.name} · ${subUnitObj.name}`,
          div.color || '#06B6D4',
          member.divisionUnitRole || subUnitObj.roleTitle || ''
        );
      } else if (member.divisionUnitRole) {
        pushBadge('unitDivisi', member.divisionUnitRole, div.color || '#06B6D4', div.callsign);
      }
    }

    // 7, 8, 9: Sertifikat, Brevet, Penghargaan
    for (const awId of member.awards || []) {
      const aw = AWARDS_CATALOG.find((a) => a.id === awId);
      if (!aw) continue;
      if (aw.category === 'Sertifikat') {
        pushBadge('sertifikat', cleanAwardLabel(aw.name, 'Sertifikat'), aw.color);
      } else if (aw.category === 'Brevet') {
        pushBadge('brevet', cleanAwardLabel(aw.name, 'Brevet'), aw.color);
      } else {
        pushBadge('penghargaan', cleanAwardLabel(aw.name, aw.category), aw.color);
      }
    }

    // Divisional awards from active sub-server (if viewing inside or linked)
    const subSource = activeSubServer || (div ? (state.subServers || []).find((s) => s.linkedDivisionId === div.id) : null);
    if (subSource) {
      const roleObj = subSource.memberRoles?.[member.id];
      const divAwards = roleObj && typeof roleObj === 'object' && Array.isArray(roleObj.divisionalAwards)
        ? roleObj.divisionalAwards
        : [];
      for (const da of divAwards) {
        const label = typeof da === 'string' ? da : da?.name;
        const color = typeof da === 'object' && da?.color ? da.color : subSource.color;
        if (!label) continue;
        if (/^sertifikat/i.test(label)) {
          pushBadge('sertifikat', cleanAwardLabel(label, 'Sertifikat'), color || '#22C55E', subSource.shortCode);
        } else if (/^brevet/i.test(label)) {
          pushBadge('brevet', cleanAwardLabel(label, 'Brevet'), color || '#0EA5E9', subSource.shortCode);
        } else {
          pushBadge('penghargaan', label, color || '#FACC15', subSource.shortCode);
        }
      }
    }

    // Academy & Propam status badges mapped neatly to Sertifikat / Penghargaan
    if (member.academyStatus === 'GRADUATED') {
      pushBadge('sertifikat', 'Alumni Akademi Kepolisian (Akpol)', '#23A55A');
    } else if (member.academyStatus === 'ENROLLED') {
      pushBadge('sertifikat', `Taruna Akpol Aktif (${Math.round(member.trainingProgress || 0)}%)`, '#0EA5E9');
    } else if (member.academyStatus === 'FAILED') {
      pushBadge('penghargaan', 'Evaluasi Akpol: Belum Lulus', '#DA373C');
    }

    if ((member.detainedRemaining || 0) > 0) {
      pushBadge('penghargaan', `Ditahan Rutan Mabes (${Math.ceil(member.detainedRemaining)}d)`, '#EF4444', 'Propam');
    }
  }

  return Array.from(buckets.values()).map(({ _seen, ...rest }) => rest);
}

export function flattenOrderedRoles(memberOrOwner, state, options = {}) {
  const groups = resolveMemberRoleGroups(memberOrOwner, state, options);
  const flat = [];
  for (const g of groups) {
    for (const item of g.items) {
      flat.push(item);
    }
  }
  return flat;
}
