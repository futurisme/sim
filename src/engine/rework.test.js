import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROLE_CATEGORY_ORDER,
  cleanAwardLabel,
  createInitialState,
  hydrateSimulationState,
  resolveMemberRoleGroups,
  resolveSubServerRoleEntry,
} from './rules.js';
import { getThemePreset, normalizeUserPrefs } from './themeEngine.js';
import {
  createSaveEnvelope,
  validateAndRestoreEnvelope,
} from './persistence/saveManager.js';
import { THEME_PRESETS as CONST_THEMES } from './constants.js';

test('resolveSubServerRoleEntry prevents [object Object] serialization and replaces cluttered Owner Sub-Server prefix', () => {
  const objRole = resolveSubServerRoleEntry(
    { roleName: 'Owner Sub-Server BRM', color: '#8B5CF6', badge: 'VIP' },
    'Anggota BRM',
    '#8B5CF6'
  );
  assert.equal(objRole.roleName, 'Ketua Satuan BRM');
  assert.equal(objRole.color, '#8B5CF6');
  assert.equal(objRole.raw?.badge, 'VIP');
  assert.ok(!String(objRole.roleName).includes('[object Object]'));

  const bareOwner = resolveSubServerRoleEntry('Owner Sub-Server', 'Ketua', '#38BDF8');
  assert.equal(bareOwner.roleName, 'Ketua Satuan');

  const nullRole = resolveSubServerRoleEntry(null, 'Anggota Satuan', '#38BDF8');
  assert.equal(nullRole.roleName, 'Anggota Satuan');
});

test('cleanAwardLabel removes redundant category prefixes while keeping meaningful titles intact', () => {
  assert.equal(cleanAwardLabel('Sertifikat Lulusan Akpol Izumiya', 'Sertifikat'), 'Lulusan Akpol Izumiya');
  assert.equal(cleanAwardLabel('Brevet Bhayangkara Pelopor', 'Brevet'), 'Bhayangkara Pelopor');
  assert.equal(cleanAwardLabel('Penghargaan Bintang Bhayangkara Nararya', 'Penghargaan'), 'Bintang Bhayangkara Nararya');
  assert.equal(cleanAwardLabel('Pin Loyalitas Nusantara', 'Penghargaan'), 'Pin Loyalitas Nusantara');
});

test('resolveMemberRoleGroups produces all 9 strict categories in exact hierarchy order without duplicate prefixes', () => {
  const state = createInitialState();
  const member = state.members[0];
  member.subRole = 'Admin';
  member.billetId = state.billets[0]?.id || null;
  member.awards = ['srt-diklat', 'brv-pelopor', 'med-utama'];

  const sub = state.subServers?.[0];
  if (sub) {
    if (!sub.memberIds.includes(member.id)) sub.memberIds.push(member.id);
    sub.memberRoles[member.id] = { roleName: 'Owner Sub-Server SATLANTAS', color: '#F59E0B' };
  }

  const groups = resolveMemberRoleGroups(member, state);
  const nonEmptyGroupIds = groups.filter((g) => g.items.length > 0).map((g) => g.id);
  const orderedIds = ROLE_CATEGORY_ORDER.map((c) => c.id);

  assert.deepEqual(
    orderedIds,
    [
      'adminServer',
      'jabatanOps',
      'pangkat',
      'divisi',
      'subDivisi',
      'unitDivisi',
      'sertifikat',
      'brevet',
      'penghargaan',
    ]
  );

  // Groups are returned in exact ROLE_CATEGORY_ORDER sequence
  assert.deepEqual(groups.map((g) => g.id), orderedIds);
  assert.ok(nonEmptyGroupIds.includes('adminServer'));
  assert.ok(nonEmptyGroupIds.includes('jabatanOps'));
  assert.ok(nonEmptyGroupIds.includes('pangkat'));

  const adminGroup = groups.find((g) => g.id === 'adminServer');
  assert.ok(adminGroup, 'adminServer group should exist for Admin member');
  assert.ok(adminGroup.items.some((i) => /Admin/i.test(i.label)));
  assert.ok(!JSON.stringify(groups).includes('[object Object]'));
});

test('themeEngine provides 6 distinct theme presets and safely falls back on unknown IDs', () => {
  assert.ok(Array.isArray(CONST_THEMES) && CONST_THEMES.length === 6);
  const emerald = getThemePreset('komando-emerald');
  assert.equal(emerald.id, 'komando-emerald');
  assert.ok(emerald.vars && typeof emerald.vars['--bg-app'] === 'string');

  const fallback = getThemePreset('non-existent-theme-id');
  assert.equal(fallback.id, 'discord-midnight');

  const prefs = normalizeUserPrefs({
    themeId: 'polri-navy-gold',
    defaultSpeed: 2,
    compactChat: true,
    showMinimap: false,
  });
  assert.equal(prefs.themeId, 'polri-navy-gold');
  assert.equal(prefs.defaultSpeed, 2);
  assert.equal(prefs.compactChat, true);
  assert.equal(prefs.showMinimap, false);
});

test('saveManager validates checksums accurately and rejects tampered or corrupted manual save payloads', () => {
  const state = createInitialState();
  state.reputation = 777;
  const prefs = normalizeUserPrefs({ themeId: 'polri-navy-gold' });
  const envelopeObj = createSaveEnvelope(state, prefs, 'Patroli Malam');
  const validEnvelope = JSON.stringify(envelopeObj);

  const okRes = validateAndRestoreEnvelope(validEnvelope, hydrateSimulationState);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.state.reputation, 777);
  assert.equal(okRes.prefs.themeId, 'polri-navy-gold');

  // Tamper payload without updating checksum
  const tamperedObj = JSON.parse(validEnvelope);
  tamperedObj.payload.state.reputation = 99999;
  const tamperedRes = validateAndRestoreEnvelope(JSON.stringify(tamperedObj), hydrateSimulationState);
  assert.equal(tamperedRes.ok, false);
  assert.match(tamperedRes.error, /korup|checksum|rusak|berubah/i);

  // Broken JSON string
  const corruptRes = validateAndRestoreEnvelope('{not valid json!!!', hydrateSimulationState);
  assert.equal(corruptRes.ok, false);
});
