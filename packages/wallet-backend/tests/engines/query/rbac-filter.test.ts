import { describe, it, expect } from 'vitest';
import {
  passesL1,
  passesPlantFilter,
  resolveCallerTeams,
  getTeamAccess,
  resolveTeamAccess,
  passesL3,
  buildPartnerIdFilter,
  type AppUserDoc,
  type TeamRbacEntry,
} from '../../../src/engines/query/rbac-filter.js';

const SPONSOR_PARAM_ID = '0x6193b497f8e2a1d340b20000';
const VENDOR_PARAM_ID = '0x40Af9B6a3f8b1c2d7e4f0000';

const sponsorUser: AppUserDoc = {
  userId: 'user-sponsor',
  superAppId: 'superapp01',
  role: 'Consignee',
  partnerId: null,
  orgParamId: SPONSOR_PARAM_ID,
  plantTeams: [
    { plant: '1810', teams: ['Admin', 'OSD4'] },
    { plant: '1820', teams: ['Planners'] },
  ],
  isOrgAdmin: true,
  status: 'active',
};

const vendorUser: AppUserDoc = {
  userId: 'user-vendor',
  superAppId: 'superapp01',
  role: 'FF',
  partnerId: 'LSP001',
  orgParamId: VENDOR_PARAM_ID,
  plantTeams: [
    { plant: 'INNSA1', teams: ['FF'] },
    { plant: 'JNPT', teams: ['FF'] },
  ],
  isOrgAdmin: false,
  status: 'active',
};

const samplePermissions: TeamRbacEntry[] = [
  {
    state: 'Contract',
    subState: null,
    microState: null,
    access: {
      'Consignee.Admin': 'RW',
      'Consignee.OSD4': 'RW',
      'Consignee.Planners': 'RO',
      'Consignee.Viewer': 'RO',
      'FF.FF': 'RW',
      'CHA.CHA': 'N/A',
    },
  },
  {
    state: 'Contract',
    subState: 'Booking',
    microState: null,
    access: {
      'Consignee.Admin': 'RW',
      'Consignee.OSD4': 'RW',
      'Consignee.Planners': 'N/A',
      'Consignee.Viewer': 'RO',
      'FF.FF': 'RW',
      'CHA.CHA': 'N/A',
    },
  },
];

// ── passesL1 ──────────────────────────────────────────────────────────────────

describe('passesL1', () => {
  it('passes when caller paramId is in _chain.roles values', () => {
    const doc = { _chain: { roles: { Consignee: SPONSOR_PARAM_ID } } };
    expect(passesL1(doc, SPONSOR_PARAM_ID)).toBe(true);
  });

  it('fails when caller paramId is not in _chain.roles', () => {
    const doc = { _chain: { roles: { Consignee: '0xOther' } } };
    expect(passesL1(doc, SPONSOR_PARAM_ID)).toBe(false);
  });

  it('returns false when _chain.roles is missing', () => {
    expect(passesL1({}, SPONSOR_PARAM_ID)).toBe(false);
  });
});

// ── passesPlantFilter ─────────────────────────────────────────────────────────

describe('passesPlantFilter', () => {
  it('passes when doc plant matches user plant', () => {
    const doc = { _chain: { _sys: { plantIDs: { [SPONSOR_PARAM_ID]: ['1810'] } } } };
    expect(passesPlantFilter(doc, SPONSOR_PARAM_ID, sponsorUser)).toBe(true);
  });

  it('fails when doc plant not in user plants', () => {
    const doc = { _chain: { _sys: { plantIDs: { [SPONSOR_PARAM_ID]: ['9999'] } } } };
    expect(passesPlantFilter(doc, SPONSOR_PARAM_ID, sponsorUser)).toBe(false);
  });

  it('passes when doc has no plant restrictions', () => {
    const doc = { _chain: { _sys: { plantIDs: {} } } };
    expect(passesPlantFilter(doc, SPONSOR_PARAM_ID, sponsorUser)).toBe(true);
  });
});

// ── resolveCallerTeams ────────────────────────────────────────────────────────

describe('resolveCallerTeams', () => {
  it('returns teams for matching plant', () => {
    const teams = resolveCallerTeams(sponsorUser, SPONSOR_PARAM_ID, ['1810']);
    expect(teams).toContain('Admin');
    expect(teams).toContain('OSD4');
    expect(teams).not.toContain('Planners');
  });

  it('returns all teams when no plant restriction', () => {
    const teams = resolveCallerTeams(sponsorUser, SPONSOR_PARAM_ID, []);
    expect(teams).toContain('Admin');
    expect(teams).toContain('OSD4');
    expect(teams).toContain('Planners');
  });
});

// ── getTeamAccess ─────────────────────────────────────────────────────────────

describe('getTeamAccess', () => {
  it('returns RW for Consignee.Admin at Contract state', () => {
    expect(getTeamAccess(samplePermissions, 'Consignee', 'Admin', 'Contract', null, null)).toBe('RW');
  });

  it('returns RO for Consignee.Planners at Contract state', () => {
    expect(getTeamAccess(samplePermissions, 'Consignee', 'Planners', 'Contract', null, null)).toBe('RO');
  });

  it('returns N/A for CHA.CHA at Contract state', () => {
    expect(getTeamAccess(samplePermissions, 'CHA', 'CHA', 'Contract', null, null)).toBe('N/A');
  });

  it('returns N/A for Consignee.Planners at Contract/Booking subState', () => {
    expect(getTeamAccess(samplePermissions, 'Consignee', 'Planners', 'Contract', 'Booking', null)).toBe('N/A');
  });

  it('falls back to state-level when subState entry missing', () => {
    // Planners at a subState not in the matrix → falls back to state level
    expect(getTeamAccess(samplePermissions, 'Consignee', 'Planners', 'Contract', 'Unknown', null)).toBe('RO');
  });
});

// ── resolveTeamAccess ─────────────────────────────────────────────────────────

describe('resolveTeamAccess', () => {
  it('returns most permissive (RW) across teams', () => {
    const access = resolveTeamAccess(samplePermissions, 'Consignee', ['Planners', 'Admin'], 'Contract', null, null);
    expect(access).toBe('RW');
  });

  it('returns RO when no RW team', () => {
    const access = resolveTeamAccess(samplePermissions, 'Consignee', ['Planners', 'Viewer'], 'Contract', null, null);
    expect(access).toBe('RO');
  });

  it('returns N/A when all teams are N/A', () => {
    const access = resolveTeamAccess(samplePermissions, 'CHA', ['CHA'], 'Contract', null, null);
    expect(access).toBe('N/A');
  });

  it('returns N/A for empty teams array', () => {
    expect(resolveTeamAccess(samplePermissions, 'Consignee', [], 'Contract', null, null)).toBe('N/A');
  });
});

// ── passesL3 ──────────────────────────────────────────────────────────────────

describe('passesL3', () => {
  it('passes when restrictedTo is empty', () => {
    const doc = { _chain: { _sys: { restrictedTo: [] } } };
    expect(passesL3(doc, 'user1', 'Consignee', ['OSD4'])).toBe(true);
  });

  it('passes when caller is in restrictedTo', () => {
    const doc = {
      _chain: {
        _sys: {
          restrictedTo: [{ userId: 'user1', role: 'Consignee', team: 'OSD4' }],
        },
      },
    };
    expect(passesL3(doc, 'user1', 'Consignee', ['OSD4'])).toBe(true);
  });

  it('blocks when caller team has entries but user is not listed', () => {
    const doc = {
      _chain: {
        _sys: {
          restrictedTo: [{ userId: 'other-user', role: 'Consignee', team: 'OSD4' }],
        },
      },
    };
    expect(passesL3(doc, 'user1', 'Consignee', ['OSD4'])).toBe(false);
  });

  it('passes when caller team has NO entries (L3 does not apply to them)', () => {
    const doc = {
      _chain: {
        _sys: {
          // Only OSD4 is restricted — Planners team has no entry
          restrictedTo: [{ userId: 'other-user', role: 'Consignee', team: 'OSD4' }],
        },
      },
    };
    expect(passesL3(doc, 'user1', 'Consignee', ['Planners'])).toBe(true);
  });

  it('passes for different role with no entries', () => {
    const doc = {
      _chain: {
        _sys: {
          restrictedTo: [{ userId: 'other-user', role: 'Consignee', team: 'OSD4' }],
        },
      },
    };
    expect(passesL3(doc, 'user1', 'FF', ['FF'])).toBe(true);
  });
});

// ── buildPartnerIdFilter ──────────────────────────────────────────────────────

describe('buildPartnerIdFilter', () => {
  it('returns null for sponsor users (callerIsSponsor=true)', () => {
    expect(buildPartnerIdFilter('FF', true, 'LSP001')).toBeNull();
  });

  it('returns null when no partner_id param', () => {
    expect(buildPartnerIdFilter('FF', false, undefined)).toBeNull();
  });

  it('returns filter for vendor users with partner_id', () => {
    const filter = buildPartnerIdFilter('FF', false, 'LSP001');
    expect(filter).toEqual({ '_participants.FF.C_InternalID': 'LSP001' });
  });
});
