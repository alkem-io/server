import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RoleName } from '@common/enums/role.name';
import {
  RelationshipNotFoundException,
  UserRegistrationInvalidEmail,
} from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { UserIdentityService } from './user.identity.service';

describe('UserIdentityService', () => {
  let service: UserIdentityService;
  let userLookupService: {
    getUserByAuthenticationID: Mock;
    getUserByEmail: Mock;
  };
  let userService: { createUser: Mock };
  let kratosService: { getIdentityById: Mock };
  let organizationLookupService: { getOrganizationByDomain: Mock };
  let roleSetService: { assignActorToRole: Mock };
  let userRepository: { save: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserIdentityService,
        repositoryProviderMockFactory(User),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(UserIdentityService);
    userLookupService = module.get(UserLookupService) as any;
    userService = module.get(UserService) as any;
    kratosService = module.get(KratosService) as any;
    organizationLookupService = module.get(OrganizationLookupService) as any;
    roleSetService = module.get(RoleSetService) as any;
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildKratosDataFromIdentity', () => {
    it('should extract email from traits', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: { email: 'Test@EXAMPLE.com' },
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.email).toBe('test@example.com');
      expect(result.authenticationID).toBe('kratos-id-1');
    });

    it('should extract email from verifiable_addresses fallback', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: {},
        verifiable_addresses: [{ value: 'fallback@example.com' }],
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.email).toBe('fallback@example.com');
    });

    it('should extract name fields', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: {
          email: 'test@example.com',
          name: { first: 'John', last: 'Doe' },
        },
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should extract avatarURL from picture trait', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: {
          email: 'test@example.com',
          picture: 'https://example.com/avatar.png',
        },
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.avatarURL).toBe('https://example.com/avatar.png');
    });

    it('should detect email verified status from verifiable_addresses', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: { email: 'test@example.com' },
        verifiable_addresses: [
          { via: 'email', verified: true, value: 'test@example.com' },
        ],
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.emailVerified).toBe(true);
    });

    it('should set emailVerified to false when not verified', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: { email: 'test@example.com' },
        verifiable_addresses: [
          { via: 'email', verified: false, value: 'test@example.com' },
        ],
      } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.emailVerified).toBe(false);
    });

    it('should force emailVerified when option is set', () => {
      const identity = {
        id: 'kratos-id-1',
        traits: { email: 'test@example.com' },
      } as any;

      const result = service.buildKratosDataFromIdentity(identity, {
        forceEmailVerified: true,
      });
      expect(result.emailVerified).toBe(true);
    });

    it('should handle missing traits gracefully', () => {
      const identity = { id: 'kratos-id-1' } as any;

      const result = service.buildKratosDataFromIdentity(identity);
      expect(result.email).toBe('');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.avatarURL).toBe('');
    });
  });

  describe('resolveOrCreateUser', () => {
    it('should throw UserRegistrationInvalidEmail when email is empty', async () => {
      await expect(
        service.resolveOrCreateUser({
          authenticationID: 'auth-1',
          email: '',
          emailVerified: true,
          firstName: '',
          lastName: '',
          avatarURL: '',
          expiry: undefined,
        })
      ).rejects.toThrow(UserRegistrationInvalidEmail);
    });

    it('should throw UserNotVerifiedException when requireEmailVerified is true and email not verified', async () => {
      await expect(
        service.resolveOrCreateUser(
          {
            authenticationID: 'auth-1',
            email: 'test@example.com',
            emailVerified: false,
            firstName: '',
            lastName: '',
            avatarURL: '',
            expiry: undefined,
          },
          { requireEmailVerified: true }
        )
      ).rejects.toThrow(UserNotVerifiedException);
    });

    it('should return existing user when found by authenticationID', async () => {
      const existingUser = { id: 'user-1' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(
        existingUser
      );

      const result = await service.resolveOrCreateUser({
        authenticationID: 'auth-1',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        avatarURL: '',
        expiry: undefined,
      });

      expect(result.outcome).toBe('existing');
      expect(result.user).toBe(existingUser);
    });

    it('should link authenticationID to existing user found by email', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        authenticationID: null,
      };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(existingUser);
      userRepository.save.mockResolvedValue({
        ...existingUser,
        authenticationID: 'auth-1',
      });

      const result = await service.resolveOrCreateUser({
        authenticationID: 'auth-1',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        avatarURL: '',
        expiry: undefined,
      });

      expect(result.outcome).toBe('linked');
    });

    it('should return existing user by email when no authID provided', async () => {
      const existingUser = { id: 'user-1', email: 'test@example.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(existingUser);

      const result = await service.resolveOrCreateUser({
        authenticationID: '',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        avatarURL: '',
        expiry: undefined,
      });

      expect(result.outcome).toBe('existing');
      expect(result.user).toBe(existingUser);
    });

    it('should create new user when not found by authID or email', async () => {
      const newUser = { id: 'new-user-1', email: 'new@example.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);

      const result = await service.resolveOrCreateUser({
        authenticationID: 'auth-1',
        email: 'new@example.com',
        emailVerified: true,
        firstName: 'Jane',
        lastName: 'Doe',
        avatarURL: '',
        expiry: undefined,
      });

      expect(result.outcome).toBe('created');
      expect(result.user).toBe(newUser);
    });

    it('should assign to org by domain when option is set', async () => {
      const newUser = { id: 'new-user-1', email: 'new@orgdomain.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: {
          status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
        },
        roleSet: { id: 'rs-1' },
      });
      roleSetService.assignActorToRole.mockResolvedValue(undefined);

      const result = await service.resolveOrCreateUser(
        {
          authenticationID: 'auth-1',
          email: 'new@orgdomain.com',
          emailVerified: true,
          firstName: 'Jane',
          lastName: 'Doe',
          avatarURL: '',
          expiry: undefined,
        },
        { assignToOrgByDomain: true }
      );

      expect(result.outcome).toBe('created');
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rs-1' }),
        RoleName.ASSOCIATE,
        'new-user-1'
      );
    });

    it('should skip org assignment when org not found', async () => {
      const newUser = { id: 'new-user-1', email: 'new@nodomain.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(null);

      const result = await service.resolveOrCreateUser(
        {
          authenticationID: 'auth-1',
          email: 'new@nodomain.com',
          emailVerified: true,
          firstName: 'Jane',
          lastName: 'Doe',
          avatarURL: '',
          expiry: undefined,
        },
        { assignToOrgByDomain: true }
      );

      expect(result.outcome).toBe('created');
      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('should skip org assignment when org setting disabled', async () => {
      const newUser = { id: 'new-user-1', email: 'new@org.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: false } },
      });

      await service.resolveOrCreateUser(
        {
          authenticationID: 'auth-1',
          email: 'new@org.com',
          emailVerified: true,
          firstName: 'Jane',
          lastName: 'Doe',
          avatarURL: '',
          expiry: undefined,
        },
        { assignToOrgByDomain: true }
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('should skip org assignment when org not verified', async () => {
      const newUser = { id: 'new-user-1', email: 'new@org.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: {
          status: OrganizationVerificationEnum.NOT_VERIFIED,
        },
        roleSet: { id: 'rs-1' },
      });

      await service.resolveOrCreateUser(
        {
          authenticationID: 'auth-1',
          email: 'new@org.com',
          emailVerified: true,
          firstName: 'Jane',
          lastName: 'Doe',
          avatarURL: '',
          expiry: undefined,
        },
        { assignToOrgByDomain: true }
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('should throw when org relations are missing for domain assignment', async () => {
      const newUser = { id: 'new-user-1', email: 'new@org.com' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: null,
        roleSet: null,
      });

      await expect(
        service.resolveOrCreateUser(
          {
            authenticationID: 'auth-1',
            email: 'new@org.com',
            emailVerified: true,
            firstName: 'Jane',
            lastName: 'Doe',
            avatarURL: '',
            expiry: undefined,
          },
          { assignToOrgByDomain: true }
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('resolveByAuthenticationId', () => {
    it('should return existing user when found by authenticationID', async () => {
      const existingUser = { id: 'user-1' };
      userLookupService.getUserByAuthenticationID.mockResolvedValue(
        existingUser
      );

      const result = await service.resolveByAuthenticationId('auth-1');
      expect(result).toBeDefined();
      expect(result!.outcome).toBe('existing');
      expect(result!.user).toBe(existingUser);
    });

    it('should return null when Kratos identity not found', async () => {
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      kratosService.getIdentityById.mockResolvedValue(null);

      const result = await service.resolveByAuthenticationId('unknown-auth');
      expect(result).toBeNull();
    });

    it('should return null when Kratos identity has no email', async () => {
      userLookupService.getUserByAuthenticationID.mockResolvedValue(null);
      kratosService.getIdentityById.mockResolvedValue({
        id: 'kratos-1',
        traits: {},
      });

      const result = await service.resolveByAuthenticationId('kratos-1');
      expect(result).toBeNull();
    });

    it('should create user from Kratos identity when not found locally', async () => {
      const newUser = { id: 'new-user-1', email: 'new@example.com' };
      userLookupService.getUserByAuthenticationID
        .mockResolvedValueOnce(null) // first call in resolveByAuthenticationId
        .mockResolvedValueOnce(null); // second call in resolveOrCreateUser
      kratosService.getIdentityById.mockResolvedValue({
        id: 'kratos-1',
        traits: {
          email: 'new@example.com',
          name: { first: 'Jane', last: 'Doe' },
        },
      });
      userLookupService.getUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(newUser);
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(null);

      const result = await service.resolveByAuthenticationId('kratos-1');
      expect(result).toBeDefined();
      expect(result!.outcome).toBe('created');
    });
  });
});
