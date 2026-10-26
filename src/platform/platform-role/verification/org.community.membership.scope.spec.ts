import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listSourceFiles } from './source.scan';

/**
 * Platform Support's membership privilege is granted ONLY on organization
 * role sets. Asserted by where the privilege can appear at all, rather than
 * by a runtime role-set-type guard: the single granting file is the
 * organization authorization service, and the only other reader is the
 * shared Community-tab gate. A rule naming it on a Space role set, on the
 * platform root, or for any other credential would have to live in another
 * file and fails here.
 */
describe('PLATFORM_SUPPORT_ORG_MEMBERSHIP scope', () => {
  const TOKEN = /AuthorizationPrivilege\.PLATFORM_SUPPORT_ORG_MEMBERSHIP\b/;

  it('is referenced only by the organization rule and the shared gate', () => {
    const referencing = listSourceFiles().filter(file =>
      TOKEN.test(readFileSync(join(process.cwd(), file), 'utf-8'))
    );
    expect(referencing.sort()).toEqual([
      'src/domain/access/role-set/org.community.gate.service.ts',
      'src/domain/community/organization/organization.service.authorization.ts',
    ]);
  });
});
