import { AuthorizationCredential } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { groupCredentialsByEntity } from './group.credentials.by.entity';

const makeCredential = (
  type: AuthorizationCredential,
  resourceID: string
): ICredentialDefinition =>
  ({
    type,
    resourceID,
  }) as ICredentialDefinition;

describe('groupCredentialsByEntity', () => {
  it('should return an empty map for empty credentials', () => {
    const result = groupCredentialsByEntity([]);
    expect(result.size).toBe(0);
  });

  it('should group space credentials under "spaces"', () => {
    const credentials = [
      makeCredential(AuthorizationCredential.SPACE_ADMIN, 'space-1'),
      makeCredential(AuthorizationCredential.SPACE_MEMBER, 'space-1'),
      makeCredential(AuthorizationCredential.SPACE_LEAD, 'space-2'),
    ];

    const result = groupCredentialsByEntity(credentials);
    const spacesMap = result.get('spaces');

    expect(spacesMap).toBeDefined();
    expect(spacesMap!.get('space-1')).toEqual([
      RoleName.ADMIN,
      RoleName.MEMBER,
    ]);
    expect(spacesMap!.get('space-2')).toEqual([RoleName.LEAD]);
  });

  it('should group organization credentials under "organizations"', () => {
    const credentials = [
      makeCredential(AuthorizationCredential.ORGANIZATION_ADMIN, 'org-1'),
      makeCredential(AuthorizationCredential.ORGANIZATION_OWNER, 'org-1'),
      makeCredential(AuthorizationCredential.ORGANIZATION_ASSOCIATE, 'org-2'),
    ];

    const result = groupCredentialsByEntity(credentials);
    const orgsMap = result.get('organizations');

    expect(orgsMap).toBeDefined();
    expect(orgsMap!.get('org-1')).toEqual([RoleName.ADMIN, RoleName.OWNER]);
    expect(orgsMap!.get('org-2')).toEqual([RoleName.ASSOCIATE]);
  });

  it('should map SPACE_SUBSPACE_ADMIN to SUBSPACE_ADMIN role', () => {
    const credentials = [
      makeCredential(AuthorizationCredential.SPACE_SUBSPACE_ADMIN, 'space-1'),
    ];

    const result = groupCredentialsByEntity(credentials);
    const spacesMap = result.get('spaces');

    expect(spacesMap).toBeDefined();
    expect(spacesMap!.get('space-1')).toEqual([
      RoleSetRoleImplicit.SUBSPACE_ADMIN,
    ]);
  });

  it('should ignore credentials that do not match any known category', () => {
    const credentials = [
      makeCredential(AuthorizationCredential.GLOBAL_ADMIN, 'global-1'),
    ];

    const result = groupCredentialsByEntity(credentials);
    expect(result.get('spaces')).toBeUndefined();
    expect(result.get('organizations')).toBeUndefined();
  });

  it('should handle mixed space and organization credentials', () => {
    const credentials = [
      makeCredential(AuthorizationCredential.SPACE_ADMIN, 'space-1'),
      makeCredential(AuthorizationCredential.ORGANIZATION_OWNER, 'org-1'),
      makeCredential(AuthorizationCredential.SPACE_MEMBER, 'space-2'),
    ];

    const result = groupCredentialsByEntity(credentials);
    expect(result.get('spaces')!.size).toBe(2);
    expect(result.get('organizations')!.size).toBe(1);
  });
});
