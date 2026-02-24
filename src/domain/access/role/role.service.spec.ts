import { AuthorizationCredential } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { IActorRolePolicy } from './actor.role.policy.interface';
import { CreateRoleInput } from './dto/role.dto.create';
import { Role } from './role.entity';
import { IRole } from './role.interface';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: Repository<Role>;

  const defaultPolicy: IActorRolePolicy = {
    minimum: 0,
    maximum: 100,
  };

  const buildCreateRoleInput = (
    overrides: Partial<CreateRoleInput> = {}
  ): CreateRoleInput => {
    return {
      name: RoleName.MEMBER,
      requiresEntryRole: false,
      requiresSameRoleInParentRoleSet: false,
      credentialData: {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'resource-1',
      },
      parentCredentialsData: [
        {
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: 'resource-1',
        },
      ],
      userPolicyData: defaultPolicy,
      organizationPolicyData: defaultPolicy,
      virtualContributorPolicyData: defaultPolicy,
      ...overrides,
    };
  };

  beforeEach(async () => {
    // Mock static Role.create to avoid DataSource requirement
    vi.spyOn(Role, 'create').mockImplementation((input: any) => {
      const entity = new Role();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        repositoryProviderMockFactory(Role),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  describe('createRole', () => {
    it('should create a role with credential from input', () => {
      const input = buildCreateRoleInput();

      const result = service.createRole(input);

      expect(result.credential).toEqual(input.credentialData);
    });

    it('should assign parent credentials from input', () => {
      const parentCredentials: ICredentialDefinition[] = [
        {
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: 'res-1',
        },
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const input = buildCreateRoleInput({
        parentCredentialsData: parentCredentials,
      });

      const result = service.createRole(input);

      expect(result.parentCredentials).toEqual(parentCredentials);
      expect(result.parentCredentials).toHaveLength(2);
    });

    it('should assign user policy from input', () => {
      const userPolicy: IActorRolePolicy = {
        minimum: 1,
        maximum: 50,
      };
      const input = buildCreateRoleInput({ userPolicyData: userPolicy });

      const result = service.createRole(input);

      expect(result.userPolicy).toEqual(userPolicy);
    });

    it('should assign organization policy from input', () => {
      const orgPolicy: IActorRolePolicy = {
        minimum: 0,
        maximum: 10,
      };
      const input = buildCreateRoleInput({
        organizationPolicyData: orgPolicy,
      });

      const result = service.createRole(input);

      expect(result.organizationPolicy).toEqual(orgPolicy);
    });

    it('should assign virtual contributor policy from input', () => {
      const vcPolicy: IActorRolePolicy = {
        minimum: 0,
        maximum: 5,
      };
      const input = buildCreateRoleInput({
        virtualContributorPolicyData: vcPolicy,
      });

      const result = service.createRole(input);

      expect(result.virtualContributorPolicy).toEqual(vcPolicy);
    });
  });

  describe('removeRole', () => {
    it('should call repository remove and return true', async () => {
      const mockRole = { id: 'role-1', name: RoleName.MEMBER } as Role;
      vi.spyOn(roleRepository, 'remove').mockResolvedValue(mockRole);

      const result = await service.removeRole(mockRole);

      expect(result).toBe(true);
      expect(roleRepository.remove).toHaveBeenCalledWith(mockRole);
    });
  });

  describe('getCredentialsForRoleWithParents', () => {
    it('should return parent credentials concatenated with the role credential', () => {
      const roleCredential: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'res-1',
      };
      const parentCredential1: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: 'res-1',
      };
      const parentCredential2: ICredentialDefinition = {
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      };

      const mockRole = {
        id: 'role-1',
        credential: roleCredential,
        parentCredentials: [parentCredential1, parentCredential2],
      } as IRole;

      const result = service.getCredentialsForRoleWithParents(mockRole);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(parentCredential1);
      expect(result[1]).toEqual(parentCredential2);
      expect(result[2]).toEqual(roleCredential);
    });

    it('should return only the role credential when there are no parent credentials', () => {
      const roleCredential: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'res-1',
      };

      const mockRole = {
        id: 'role-1',
        credential: roleCredential,
        parentCredentials: [],
      } as unknown as IRole;

      const result = service.getCredentialsForRoleWithParents(mockRole);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(roleCredential);
    });

    it('should preserve the order: parent credentials first, then role credential', () => {
      const roleCredential: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'res-1',
      };
      const parentCredential: ICredentialDefinition = {
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: 'res-1',
      };

      const mockRole = {
        id: 'role-1',
        credential: roleCredential,
        parentCredentials: [parentCredential],
      } as IRole;

      const result = service.getCredentialsForRoleWithParents(mockRole);

      expect(result[result.length - 1]).toEqual(roleCredential);
      expect(result[0]).toEqual(parentCredential);
    });
  });
});
