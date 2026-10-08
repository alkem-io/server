import {
  A5_INTENDED_OWNERS,
  A12_INTENDED_OWNERS,
} from '@common/constants/authorization/audit.intended.owners';
import { A13_INTENDED_OWNERS } from '@common/constants/authorization/license.definition.policy';
import type { AuthorizationCredential } from '@common/enums/authorization.credential';
import { A_ROW_SURFACES, type ARowId } from './a.row.surfaces';

/**
 * Audit writers attribute against shared owner constants rather than the
 * census itself — production code never imports this directory. This spec
 * keeps the two from drifting: every census entry an audit writer covers
 * must declare exactly the owners that writer passes.
 */
const AUDITED_SURFACES: readonly {
  readonly constant: string;
  readonly owners: readonly AuthorizationCredential[];
  readonly row: ARowId;
  readonly members: readonly string[];
}[] = [
  {
    constant: 'A5_INTENDED_OWNERS',
    owners: A5_INTENDED_OWNERS,
    row: 'A5',
    members: [
      'deleteUser',
      'adminIdentityDeleteKratosIdentity',
      'adminUserAccountDelete',
    ],
  },
  {
    constant: 'A12_INTENDED_OWNERS',
    owners: A12_INTENDED_OWNERS,
    row: 'A12',
    members: [
      'assignLicensePlanToAccount',
      'assignLicensePlanToSpace',
      'revokeLicensePlanFromAccount',
      'revokeLicensePlanFromSpace',
      'updateBaselineLicensePlanOnAccount',
    ],
  },
  {
    constant: 'A13_INTENDED_OWNERS',
    owners: A13_INTENDED_OWNERS,
    row: 'A13',
    members: [
      'deleteLicensePlan',
      'updateLicensePlan',
      'adminLicensePolicyDeleteCredentialRule',
      'adminLicensePolicyUpdateCredentialRule',
      'adminLicensePolicyCreateCredentialRule',
      'createLicensePlan',
    ],
  },
];

describe('audit owner constants match the census', () => {
  for (const { constant, owners, row, members } of AUDITED_SURFACES) {
    for (const member of members) {
      it(`${constant} ≡ ${row}#${member} intendedOwners`, () => {
        const surfaces = A_ROW_SURFACES[row].filter(s => s.member === member);
        expect(surfaces.length).toBeGreaterThan(0);
        for (const surface of surfaces) {
          expect([...surface.intendedOwners].sort()).toEqual(
            [...owners].sort()
          );
        }
      });
    }
  }
});
