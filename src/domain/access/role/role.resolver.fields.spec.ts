import { AuthorizationCredential } from '@common/enums';
import { RoleResolverFields } from './role.resolver.fields';

describe('RoleResolverFields', () => {
  let resolver: RoleResolverFields;

  beforeEach(() => {
    resolver = new RoleResolverFields();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('credential', () => {
    it('should return the role credential', () => {
      const mockRole = {
        credential: {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'res-1',
        },
      } as any;

      expect(resolver.credential(mockRole)).toEqual(mockRole.credential);
    });
  });

  describe('parentCredentials', () => {
    it('should return parent credentials', () => {
      const mockRole = {
        parentCredentials: [
          {
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: 'res-1',
          },
        ],
      } as any;

      expect(resolver.parentCredentials(mockRole)).toEqual(
        mockRole.parentCredentials
      );
    });
  });

  describe('userPolicy', () => {
    it('should return user policy', () => {
      const mockRole = {
        userPolicy: { minimum: 0, maximum: 100 },
      } as any;

      expect(resolver.userPolicy(mockRole)).toEqual(mockRole.userPolicy);
    });
  });

  describe('organizationPolicy', () => {
    it('should return organization policy', () => {
      const mockRole = {
        organizationPolicy: { minimum: 0, maximum: 10 },
      } as any;

      expect(resolver.organizationPolicy(mockRole)).toEqual(
        mockRole.organizationPolicy
      );
    });
  });

  describe('virtualContributorPolicy', () => {
    it('should return virtual contributor policy', () => {
      const mockRole = {
        virtualContributorPolicy: { minimum: 0, maximum: 5 },
      } as any;

      expect(resolver.virtualContributorPolicy(mockRole)).toEqual(
        mockRole.virtualContributorPolicy
      );
    });
  });
});
