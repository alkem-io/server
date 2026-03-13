import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RoleName } from '@common/enums/role.name';
import { KratosSessionData } from '@core/authentication/kratos.session';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Identity } from '@ory/kratos-client';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { UserIdentityService } from './user.identity.service';

describe('UserIdentityService', () => {
  let service: UserIdentityService;

  // Explicit mock functions for dependencies we need to control
  const mockGetUserByAuthenticationID = vi.fn();
  const mockGetUserByEmail = vi.fn();
  const mockCreateUser = vi.fn();
  const mockGetIdentityById = vi.fn();
  const mockGetOrganizationByDomain = vi.fn();
  const mockAssignActorToRole = vi.fn();
  const mockSave = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserIdentityService,
        {
          provide: UserLookupService,
          useValue: {
            getUserByAuthenticationID: mockGetUserByAuthenticationID,
            getUserByEmail: mockGetUserByEmail,
          },
        },
        {
          provide: UserService,
          useValue: {
            createUser: mockCreateUser,
          },
        },
        {
          provide: KratosService,
          useValue: {
            getIdentityById: mockGetIdentityById,
          },
        },
        {
          provide: OrganizationLookupService,
          useValue: {
            getOrganizationByDomain: mockGetOrganizationByDomain,
          },
        },
        {
          provide: RoleSetService,
          useValue: {
            assignActorToRole: mockAssignActorToRole,
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            save: mockSave,
          },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<UserIdentityService>(UserIdentityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildKratosDataFromIdentity', () => {
    it('should extract email from traits', () => {
      const identity = {
        id: 'auth-123',
        traits: {
          email: 'Test@Example.com',
          name: { first: 'John', last: 'Doe' },
        },
        verifiable_addresses: [],
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity);

      expect(result.authenticationID).toBe('auth-123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.emailVerified).toBe(false);
    });

    it('should extract email from verifiable_addresses when traits.email is missing', () => {
      const identity = {
        id: 'auth-456',
        traits: {},
        verifiable_addresses: [
          { value: 'Fallback@Test.com', via: 'email', verified: true },
        ],
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity);

      expect(result.email).toBe('fallback@test.com');
      expect(result.emailVerified).toBe(true);
    });

    it('should force emailVerified when option is set', () => {
      const identity = {
        id: 'auth-789',
        traits: { email: 'user@test.com' },
        verifiable_addresses: [],
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity, {
        forceEmailVerified: true,
      });

      expect(result.emailVerified).toBe(true);
    });

    it('should handle missing traits gracefully', () => {
      const identity = {
        id: 'auth-empty',
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity);

      expect(result.authenticationID).toBe('auth-empty');
      expect(result.email).toBe('');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.emailVerified).toBe(false);
    });

    it('should extract avatar URL from traits.picture', () => {
      const identity = {
        id: 'auth-pic',
        traits: {
          email: 'user@test.com',
          picture: 'https://example.com/avatar.jpg',
        },
        verifiable_addresses: [],
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity);

      expect(result.avatarURL).toBe('https://example.com/avatar.jpg');
    });

    it('should set expiry to undefined', () => {
      const identity = {
        id: 'auth-exp',
        traits: { email: 'user@test.com' },
        verifiable_addresses: [],
      } as unknown as Identity;

      const result = service.buildKratosDataFromIdentity(identity);

      expect(result.expiry).toBeUndefined();
    });
  });

  describe('resolveOrCreateUser', () => {
    const baseKratosData: KratosSessionData = {
      authenticationID: 'auth-id-1',
      email: 'user@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      avatarURL: '',
      expiry: undefined,
    };

    it('should throw on empty email', async () => {
      const kratosData = { ...baseKratosData, email: '  ' };

      await expect(service.resolveOrCreateUser(kratosData)).rejects.toThrow();
    });

    it('should throw when email not verified and requireEmailVerified is true', async () => {
      const kratosData = { ...baseKratosData, emailVerified: false };

      await expect(
        service.resolveOrCreateUser(kratosData, {
          requireEmailVerified: true,
        })
      ).rejects.toThrow();
    });

    it('should return existing user when found by authenticationID', async () => {
      const existingUser = { id: 'user-1', email: 'user@example.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(existingUser);

      const result = await service.resolveOrCreateUser(baseKratosData);

      expect(result.outcome).toBe('existing');
      expect(result.user).toBe(existingUser);
    });

    it('should link authenticationID to existing user found by email', async () => {
      const existingUser = {
        id: 'user-2',
        email: 'user@example.com',
        authenticationID: undefined,
      };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(existingUser);
      mockSave.mockResolvedValue({
        ...existingUser,
        authenticationID: 'auth-id-1',
      });

      const result = await service.resolveOrCreateUser(baseKratosData);

      expect(result.outcome).toBe('linked');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should return existing user by email without linking when no authID', async () => {
      const existingUser = { id: 'user-3', email: 'user@example.com' };
      const kratosData = { ...baseKratosData, authenticationID: '' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(existingUser);

      const result = await service.resolveOrCreateUser(kratosData);

      expect(result.outcome).toBe('existing');
      expect(result.user).toBe(existingUser);
    });

    it('should create new user when not found by authID or email', async () => {
      const newUser = { id: 'user-new', email: 'user@example.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);

      const result = await service.resolveOrCreateUser(baseKratosData);

      expect(result.outcome).toBe('created');
      expect(result.user).toBe(newUser);
    });

    it('should assign to org by domain when option is set and user is created', async () => {
      const newUser = { id: 'user-org', email: 'user@matching.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);

      const mockOrg = {
        id: 'org-1',
        settings: {
          membership: { allowUsersMatchingDomainToJoin: true },
        },
        verification: {
          status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
        },
        roleSet: { id: 'role-set-1' },
      };
      mockGetOrganizationByDomain.mockResolvedValue(mockOrg);
      mockAssignActorToRole.mockResolvedValue(undefined);

      const result = await service.resolveOrCreateUser(baseKratosData, {
        assignToOrgByDomain: true,
      });

      expect(result.outcome).toBe('created');
      expect(mockAssignActorToRole).toHaveBeenCalledWith(
        mockOrg.roleSet,
        RoleName.ASSOCIATE,
        newUser.id
      );
    });

    it('should skip org assignment when org domain matching is disabled', async () => {
      const newUser = { id: 'user-skip', email: 'user@corp.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);

      const mockOrg = {
        id: 'org-disabled',
        settings: {
          membership: { allowUsersMatchingDomainToJoin: false },
        },
        verification: {
          status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
        },
        roleSet: { id: 'role-set-2' },
      };
      mockGetOrganizationByDomain.mockResolvedValue(mockOrg);

      await service.resolveOrCreateUser(baseKratosData, {
        assignToOrgByDomain: true,
      });

      expect(mockAssignActorToRole).not.toHaveBeenCalled();
    });

    it('should skip org assignment when org is not verified', async () => {
      const newUser = { id: 'user-unverified', email: 'user@test.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);

      const mockOrg = {
        id: 'org-unverified',
        settings: {
          membership: { allowUsersMatchingDomainToJoin: true },
        },
        verification: {
          status: OrganizationVerificationEnum.NOT_VERIFIED,
        },
        roleSet: { id: 'role-set-3' },
      };
      mockGetOrganizationByDomain.mockResolvedValue(mockOrg);

      await service.resolveOrCreateUser(baseKratosData, {
        assignToOrgByDomain: true,
      });

      expect(mockAssignActorToRole).not.toHaveBeenCalled();
    });

    it('should skip org assignment when no matching org found', async () => {
      const newUser = { id: 'user-no-org', email: 'user@unknown.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);
      mockGetOrganizationByDomain.mockResolvedValue(null);

      await service.resolveOrCreateUser(baseKratosData, {
        assignToOrgByDomain: true,
      });

      expect(mockAssignActorToRole).not.toHaveBeenCalled();
    });

    it('should throw when org has no roleSet or verification loaded', async () => {
      const newUser = { id: 'user-throw', email: 'user@broken.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);

      const mockOrg = {
        id: 'org-broken',
        settings: {
          membership: { allowUsersMatchingDomainToJoin: true },
        },
        verification: undefined,
        roleSet: undefined,
      };
      mockGetOrganizationByDomain.mockResolvedValue(mockOrg);

      await expect(
        service.resolveOrCreateUser(baseKratosData, {
          assignToOrgByDomain: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('resolveByAuthenticationId', () => {
    it('should return existing user when found by authID', async () => {
      const existingUser = { id: 'user-existing', email: 'test@test.com' };
      mockGetUserByAuthenticationID.mockResolvedValue(existingUser);

      const result = await service.resolveByAuthenticationId('auth-id');

      expect(result).not.toBeNull();
      expect(result?.outcome).toBe('existing');
      expect(result?.user).toBe(existingUser);
    });

    it('should return null when Kratos identity not found', async () => {
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetIdentityById.mockResolvedValue(null);

      const result = await service.resolveByAuthenticationId('unknown-auth');

      expect(result).toBeNull();
    });

    it('should return null when identity has no email', async () => {
      mockGetUserByAuthenticationID.mockResolvedValue(null);
      mockGetIdentityById.mockResolvedValue({
        id: 'auth-no-email',
        traits: {},
        verifiable_addresses: [],
      });

      const result = await service.resolveByAuthenticationId('auth-no-email');

      expect(result).toBeNull();
    });

    it('should resolve or create user from Kratos identity', async () => {
      const newUser = {
        id: 'user-from-kratos',
        email: 'kratos@test.com',
      };
      mockGetUserByAuthenticationID
        .mockResolvedValueOnce(null) // first call in resolveByAuthenticationId
        .mockResolvedValueOnce(null); // second call in resolveOrCreateUser
      mockGetIdentityById.mockResolvedValue({
        id: 'kratos-auth',
        traits: {
          email: 'kratos@test.com',
          name: { first: 'K', last: 'User' },
        },
        verifiable_addresses: [
          { value: 'kratos@test.com', via: 'email', verified: true },
        ],
      });
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(newUser);
      mockGetOrganizationByDomain.mockResolvedValue(null);

      const result = await service.resolveByAuthenticationId('kratos-auth');

      expect(result).not.toBeNull();
      expect(result?.outcome).toBe('created');
    });
  });
});
