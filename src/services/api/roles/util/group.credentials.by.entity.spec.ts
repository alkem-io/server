import { AuthorizationCredential } from '@common/enums';
import { groupCredentialsByEntity } from './group.credentials.by.entity';

describe('groupCredentialsByEntity', () => {
  it('should return empty map for empty credentials', () => {
    const result = groupCredentialsByEntity([]);
    expect(result.size).toBe(0);
  });

  it('should group space credentials correctly', () => {
    const credentials = [
      {
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: 'space-1',
      },
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      },
      {
        type: AuthorizationCredential.SPACE_LEAD,
        resourceID: 'space-2',
      },
    ];
    const result = groupCredentialsByEntity(credentials);
    const spaces = result.get('spaces');
    expect(spaces).toBeDefined();
    expect(spaces?.get('space-1')).toEqual(
      expect.arrayContaining(['admin', 'member'])
    );
    expect(spaces?.get('space-2')).toEqual(['lead']);
  });

  it('should group organization credentials correctly', () => {
    const credentials = [
      {
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: 'org-1',
      },
      {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: 'org-1',
      },
      {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: 'org-2',
      },
    ];
    const result = groupCredentialsByEntity(credentials);
    const orgs = result.get('organizations');
    expect(orgs).toBeDefined();
    expect(orgs?.get('org-1')).toEqual(
      expect.arrayContaining(['admin', 'owner'])
    );
    expect(orgs?.get('org-2')).toEqual(['associate']);
  });

  it('should handle subspace admin credentials', () => {
    const credentials = [
      {
        type: AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
        resourceID: 'space-1',
      },
    ];
    const result = groupCredentialsByEntity(credentials);
    const spaces = result.get('spaces');
    expect(spaces).toBeDefined();
    expect(spaces?.get('space-1')).toEqual(['subspace-admin']);
  });

  it('should ignore unrecognized credential types', () => {
    const credentials = [
      {
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: 'global',
      },
    ];
    const result = groupCredentialsByEntity(credentials);
    expect(result.get('spaces')).toBeUndefined();
    expect(result.get('organizations')).toBeUndefined();
  });

  it('should separate spaces and organizations', () => {
    const credentials = [
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      },
      {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: 'org-1',
      },
    ];
    const result = groupCredentialsByEntity(credentials);
    expect(result.get('spaces')?.has('space-1')).toBe(true);
    expect(result.get('organizations')?.has('org-1')).toBe(true);
  });
});
