import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceVisibility } from '@common/enums/space.visibility';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAccount } from '@domain/space/account/account.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { CreateInnovationHubInput, UpdateInnovationHubInput } from './dto';
import { InnovationHub } from './innovation.hub.entity';
import { InnovationHubService } from './innovation.hub.service';
import { InnovationHubType } from './innovation.hub.type.enum';

describe('InnovationHubService', () => {
  let service: InnovationHubService;
  let innovationHubRepository: Repository<InnovationHub>;

  beforeEach(async () => {
    // Mock the static BaseEntity.create method to avoid DataSource requirement
    vi.spyOn(InnovationHub, 'create').mockImplementation((input: any) => {
      const hub = new InnovationHub();
      Object.assign(hub, input);
      return hub as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationHubService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(InnovationHub),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InnovationHubService>(InnovationHubService);
    innovationHubRepository = module.get<Repository<InnovationHub>>(
      getRepositoryToken(InnovationHub)
    );
  });

  /**
   * Helper to configure naming service mocks via direct assignment
   * because createMock objects do not expose methods as own properties
   * that vi.spyOn can intercept.
   */
  const setupNamingServiceMocks = (overrides: {
    isInnovationHubSubdomainAvailable?: () => Promise<boolean>;
    getReservedNameIDsInHubs?: () => Promise<string[]>;
    createNameIdAvoidingReservedNameIDs?: () => string;
  }) => {
    const ns = service['namingService'] as any;
    if (overrides.isInnovationHubSubdomainAvailable) {
      ns.isInnovationHubSubdomainAvailable =
        overrides.isInnovationHubSubdomainAvailable;
    }
    if (overrides.getReservedNameIDsInHubs) {
      ns.getReservedNameIDsInHubs = overrides.getReservedNameIDsInHubs;
    }
    if (overrides.createNameIdAvoidingReservedNameIDs) {
      ns.createNameIdAvoidingReservedNameIDs =
        overrides.createNameIdAvoidingReservedNameIDs;
    }
  };

  /**
   * Helper to configure profile service mocks for hub creation
   */
  const setupProfileServiceMocksForCreate = (
    profile: Record<string, unknown> = { id: 'profile-1' }
  ) => {
    const ps = service['profileService'] as any;
    ps.createProfile = vi.fn().mockResolvedValue(profile);
    ps.addOrUpdateTagsetOnProfile = vi.fn().mockResolvedValue({});
    ps.addVisualsOnProfile = vi.fn().mockResolvedValue({});
  };

  /**
   * Helper to set up all the common mocks needed for a successful createInnovationHub call
   */
  const setupSuccessfulCreateMocks = (
    profile: Record<string, unknown> = { id: 'profile-1' }
  ) => {
    setupNamingServiceMocks({
      isInnovationHubSubdomainAvailable: vi
        .fn()
        .mockResolvedValue(true),
      getReservedNameIDsInHubs: vi.fn().mockResolvedValue([]),
      createNameIdAvoidingReservedNameIDs: vi
        .fn()
        .mockReturnValue('generated-name-id'),
    });
    setupProfileServiceMocksForCreate(profile);
    vi.spyOn(innovationHubRepository, 'save').mockImplementation(hub =>
      Promise.resolve(hub as any)
    );
  };

  describe('createInnovationHub', () => {
    const baseCreateInput: CreateInnovationHubInput = {
      subdomain: 'test-hub',
      type: InnovationHubType.VISIBILITY,
      spaceVisibilityFilter: SpaceVisibility.ACTIVE,
      profileData: {
        displayName: 'Test Hub',
      },
    };

    const mockAccount = {
      id: 'account-1',
      storageAggregator: { id: 'storage-1' },
    } as IAccount;

    it('should create an innovation hub with VISIBILITY type when input is valid', async () => {
      // Arrange
      const mockProfile = { id: 'profile-1', displayName: 'Test Hub' };
      setupSuccessfulCreateMocks(mockProfile);

      // Act
      const result = await service.createInnovationHub(
        baseCreateInput,
        mockAccount
      );

      // Assert
      expect(result.profile).toBe(mockProfile);
      expect(result.listedInStore).toBe(true);
      expect(result.account).toBe(mockAccount);
      expect(result.authorization).toBeDefined();
    });

    it('should generate a nameID when none is provided', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        ...baseCreateInput,
        nameID: undefined,
      };
      const createNameIdSpy = vi.fn().mockReturnValue('generated-name-id');
      setupNamingServiceMocks({
        isInnovationHubSubdomainAvailable: vi
          .fn()
          .mockResolvedValue(true),
        getReservedNameIDsInHubs: vi.fn().mockResolvedValue([]),
        createNameIdAvoidingReservedNameIDs: createNameIdSpy,
      });
      setupProfileServiceMocksForCreate();
      vi.spyOn(innovationHubRepository, 'save').mockImplementation(hub =>
        Promise.resolve(hub as any)
      );

      // Act
      await service.createInnovationHub(input, mockAccount);

      // Assert
      expect(createNameIdSpy).toHaveBeenCalledWith('Test Hub', []);
    });

    it('should use provided nameID when it is available', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        ...baseCreateInput,
        nameID: 'custom-name-id',
      };
      setupSuccessfulCreateMocks();

      // Act
      const result = await service.createInnovationHub(input, mockAccount);

      // Assert
      expect(result.nameID).toBe('custom-name-id');
    });

    it('should throw ValidationException when subdomain is already taken', async () => {
      // Arrange
      setupNamingServiceMocks({
        isInnovationHubSubdomainAvailable: vi
          .fn()
          .mockResolvedValue(false),
        getReservedNameIDsInHubs: vi.fn().mockResolvedValue([]),
        createNameIdAvoidingReservedNameIDs: vi
          .fn()
          .mockReturnValue('test-hub'),
      });

      // Act & Assert
      await expect(
        service.createInnovationHub(baseCreateInput, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when nameID is already taken', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        ...baseCreateInput,
        nameID: 'taken-name',
      };
      setupNamingServiceMocks({
        isInnovationHubSubdomainAvailable: vi
          .fn()
          .mockResolvedValue(true),
        getReservedNameIDsInHubs: vi
          .fn()
          .mockResolvedValue(['taken-name']),
      });

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotFoundException when account has no storageAggregator', async () => {
      // Arrange
      const accountWithoutStorage = {
        id: 'account-no-storage',
        storageAggregator: undefined,
      } as unknown as IAccount;

      // Act & Assert
      await expect(
        service.createInnovationHub(baseCreateInput, accountWithoutStorage)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ValidationException when LIST type has spaceVisibilityFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'list-hub',
        type: InnovationHubType.LIST,
        spaceVisibilityFilter: SpaceVisibility.ACTIVE,
        profileData: { displayName: 'List Hub' },
      };

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when LIST type has invalid space IDs in spaceListFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'list-hub',
        type: InnovationHubType.LIST,
        spaceListFilter: ['space-1', 'space-invalid'],
        profileData: { displayName: 'List Hub' },
      };
      (service['spaceLookupService'] as any).spacesExist = vi
        .fn()
        .mockResolvedValue(['space-invalid']);

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when VISIBILITY type has no spaceVisibilityFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'vis-hub',
        type: InnovationHubType.VISIBILITY,
        spaceVisibilityFilter: undefined,
        profileData: { displayName: 'Vis Hub' },
      };

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when VISIBILITY type has spaceListFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'vis-hub',
        type: InnovationHubType.VISIBILITY,
        spaceVisibilityFilter: SpaceVisibility.ACTIVE,
        spaceListFilter: ['space-1'],
        profileData: { displayName: 'Vis Hub' },
      };

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).rejects.toThrow(ValidationException);
    });

    it('should allow LIST type with valid spaceListFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'list-hub',
        type: InnovationHubType.LIST,
        spaceListFilter: ['space-1', 'space-2'],
        profileData: { displayName: 'List Hub' },
      };
      (service['spaceLookupService'] as any).spacesExist = vi
        .fn()
        .mockResolvedValue(true);
      setupSuccessfulCreateMocks();

      // Act
      const result = await service.createInnovationHub(input, mockAccount);

      // Assert
      expect(result.account).toBe(mockAccount);
    });

    it('should allow LIST type with no spaceListFilter', async () => {
      // Arrange
      const input: CreateInnovationHubInput = {
        subdomain: 'list-hub-empty',
        type: InnovationHubType.LIST,
        profileData: { displayName: 'List Hub Empty' },
      };
      setupSuccessfulCreateMocks();

      // Act & Assert
      await expect(
        service.createInnovationHub(input, mockAccount)
      ).resolves.toBeDefined();
    });
  });

  describe('updateOrFail', () => {
    const existingHub = {
      id: 'hub-1',
      nameID: 'existing-hub',
      type: InnovationHubType.VISIBILITY,
      spaceVisibilityFilter: SpaceVisibility.ACTIVE,
      profile: { id: 'profile-1' },
    } as unknown as InnovationHub;

    beforeEach(() => {
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(
        // Return a fresh copy each time to avoid state leakage
        { ...existingHub } as InnovationHub
      );
      vi.spyOn(innovationHubRepository, 'save').mockImplementation(hub =>
        Promise.resolve(hub as any)
      );
    });

    it('should update spaceVisibilityFilter when hub type is VISIBILITY', async () => {
      // Arrange
      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        spaceVisibilityFilter: SpaceVisibility.DEMO,
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.spaceVisibilityFilter).toBe(SpaceVisibility.DEMO);
    });

    it('should update profile when profileData is provided', async () => {
      // Arrange
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      (service['profileService'] as any).updateProfile = vi
        .fn()
        .mockResolvedValue(updatedProfile);

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        profileData: { displayName: 'Updated' } as any,
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.profile).toBe(updatedProfile);
    });

    it('should update listedInStore when provided as boolean', async () => {
      // Arrange
      const hubWithListedInStore = {
        ...existingHub,
        listedInStore: true,
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(
        hubWithListedInStore
      );

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        listedInStore: false,
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.listedInStore).toBe(false);
    });

    it('should update nameID when new nameID is available', async () => {
      // Arrange
      setupNamingServiceMocks({
        getReservedNameIDsInHubs: vi.fn().mockResolvedValue([]),
      });

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        nameID: 'new-name-id',
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.nameID).toBe('new-name-id');
    });

    it('should throw ValidationException when new nameID is already taken', async () => {
      // Arrange
      setupNamingServiceMocks({
        getReservedNameIDsInHubs: vi
          .fn()
          .mockResolvedValue(['taken-name']),
      });

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        nameID: 'taken-name',
      };

      // Act & Assert
      await expect(service.updateOrFail(input)).rejects.toThrow(
        ValidationException
      );
    });

    it('should not check name availability when nameID is unchanged', async () => {
      // Arrange
      const getReservedSpy = vi.fn().mockResolvedValue([]);
      setupNamingServiceMocks({
        getReservedNameIDsInHubs: getReservedSpy,
      });

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        nameID: 'existing-hub', // same as current
      };

      // Act
      await service.updateOrFail(input);

      // Assert
      expect(getReservedSpy).not.toHaveBeenCalled();
    });

    it('should validate and update spaceListFilter when hub type is LIST', async () => {
      // Arrange
      const listHub = {
        ...existingHub,
        type: InnovationHubType.LIST,
        spaceListFilter: ['space-old'],
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(listHub);
      (service['spaceLookupService'] as any).spacesExist = vi
        .fn()
        .mockResolvedValue(true);

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        spaceListFilter: ['space-1', 'space-2'],
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.spaceListFilter).toEqual(['space-1', 'space-2']);
    });

    it('should throw Error when updating LIST hub with empty spaceListFilter', async () => {
      // Arrange
      const listHub = {
        ...existingHub,
        type: InnovationHubType.LIST,
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(listHub);

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        spaceListFilter: [],
      };

      // Act & Assert
      await expect(service.updateOrFail(input)).rejects.toThrow(
        /At least one Space needs to be provided/
      );
    });

    it('should throw Error when updating LIST hub with non-existent space IDs', async () => {
      // Arrange
      const listHub = {
        ...existingHub,
        type: InnovationHubType.LIST,
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(listHub);
      (service['spaceLookupService'] as any).spacesExist = vi
        .fn()
        .mockResolvedValue(['bad-id-1', 'bad-id-2']);

      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        spaceListFilter: ['space-1', 'bad-id-1', 'bad-id-2'],
      };

      // Act & Assert
      await expect(service.updateOrFail(input)).rejects.toThrow(
        /Spaces with the following identifiers not found/
      );
    });

    it('should update searchVisibility when provided', async () => {
      // Arrange
      const input: UpdateInnovationHubInput = {
        ID: 'hub-1',
        searchVisibility: SearchVisibility.PUBLIC,
      };

      // Act
      const result = await service.updateOrFail(input);

      // Assert
      expect(result.searchVisibility).toBe(SearchVisibility.PUBLIC);
    });
  });

  describe('delete', () => {
    it('should delete hub along with profile and authorization', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as InnovationHub;

      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);
      vi.spyOn(innovationHubRepository, 'remove').mockResolvedValue({
        ...hub,
        id: '',
      } as any);

      const deleteProfileSpy = vi.fn().mockResolvedValue({ id: 'profile-1' });
      (service['profileService'] as any).deleteProfile = deleteProfileSpy;

      const deleteAuthSpy = vi.fn().mockResolvedValue({});
      (service['authorizationPolicyService'] as any).delete = deleteAuthSpy;

      // Act
      const result = await service.delete('hub-1');

      // Assert
      expect(deleteProfileSpy).toHaveBeenCalledWith('profile-1');
      expect(deleteAuthSpy).toHaveBeenCalledWith(hub.authorization);
      expect(result.id).toBe('hub-1');
    });

    it('should skip profile deletion when hub has no profile', async () => {
      // Arrange
      const hub = {
        id: 'hub-2',
        profile: undefined,
        authorization: { id: 'auth-2' },
      } as unknown as InnovationHub;

      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);
      vi.spyOn(innovationHubRepository, 'remove').mockResolvedValue({
        ...hub,
        id: '',
      } as any);

      const deleteProfileSpy = vi.fn();
      (service['profileService'] as any).deleteProfile = deleteProfileSpy;

      const deleteAuthSpy = vi.fn().mockResolvedValue({});
      (service['authorizationPolicyService'] as any).delete = deleteAuthSpy;

      // Act
      await service.delete('hub-2');

      // Assert
      expect(deleteProfileSpy).not.toHaveBeenCalled();
    });

    it('should skip authorization deletion when hub has no authorization', async () => {
      // Arrange
      const hub = {
        id: 'hub-3',
        profile: { id: 'profile-3' },
        authorization: undefined,
      } as unknown as InnovationHub;

      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);
      vi.spyOn(innovationHubRepository, 'remove').mockResolvedValue({
        ...hub,
        id: '',
      } as any);

      const deleteProfileSpy = vi.fn().mockResolvedValue({});
      (service['profileService'] as any).deleteProfile = deleteProfileSpy;

      const deleteAuthSpy = vi.fn();
      (service['authorizationPolicyService'] as any).delete = deleteAuthSpy;

      // Act
      await service.delete('hub-3');

      // Assert
      expect(deleteAuthSpy).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when hub does not exist', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('non-existent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getInnovationHubOrFail', () => {
    it('should return the hub when it exists', async () => {
      // Arrange
      const hub = { id: 'hub-1', nameID: 'test' } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);

      // Act
      const result = await service.getInnovationHubOrFail('hub-1');

      // Assert
      expect(result).toBe(hub);
    });

    it('should pass options to repository findOne', async () => {
      // Arrange
      const hub = { id: 'hub-1', nameID: 'test' } as InnovationHub;
      const findOneSpy = vi
        .spyOn(innovationHubRepository, 'findOne')
        .mockResolvedValue(hub);

      const options = { relations: { profile: true } };

      // Act
      await service.getInnovationHubOrFail('hub-1', options as any);

      // Assert
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'hub-1' },
        relations: { profile: true },
      });
    });

    it('should throw EntityNotFoundException when hub does not exist', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getInnovationHubOrFail('non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getInnovationHubByNameIdOrFail', () => {
    it('should return the hub when found by nameID', async () => {
      // Arrange
      const hub = { id: 'hub-1', nameID: 'my-hub' } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);

      // Act
      const result = await service.getInnovationHubByNameIdOrFail('my-hub');

      // Assert
      expect(result).toBe(hub);
    });

    it('should query repository with nameID in where clause', async () => {
      // Arrange
      const hub = { id: 'hub-1', nameID: 'my-hub' } as InnovationHub;
      const findOneSpy = vi
        .spyOn(innovationHubRepository, 'findOne')
        .mockResolvedValue(hub);

      // Act
      await service.getInnovationHubByNameIdOrFail('my-hub');

      // Assert
      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { nameID: 'my-hub' } })
      );
    });

    it('should throw EntityNotFoundException when no hub matches the nameID', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getInnovationHubByNameIdOrFail('unknown')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getInnovationHubFlexOrFail', () => {
    it('should return the hub when found by idOrNameId', async () => {
      // Arrange
      const hub = { id: 'hub-1', nameID: 'my-hub' } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);

      // Act
      const result = await service.getInnovationHubFlexOrFail({
        idOrNameId: 'hub-1',
      });

      // Assert
      expect(result).toBe(hub);
    });

    it('should return the hub when found by subdomain', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        subdomain: 'test-sub',
      } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);

      // Act
      const result = await service.getInnovationHubFlexOrFail({
        subdomain: 'test-sub',
      });

      // Assert
      expect(result).toBe(hub);
    });

    it('should throw Error when no criteria are provided', async () => {
      // Act & Assert
      await expect(
        service.getInnovationHubFlexOrFail({})
      ).rejects.toThrow(
        'No criteria provided for fetching the Innovation Hub'
      );
    });

    it('should throw EntityNotFoundException when no hub matches any criteria', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getInnovationHubFlexOrFail({ idOrNameId: 'no-match' })
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should build where clause with id, nameID, and subdomain from args', async () => {
      // Arrange
      const hub = { id: 'hub-1' } as InnovationHub;
      const findOneSpy = vi
        .spyOn(innovationHubRepository, 'findOne')
        .mockResolvedValue(hub);

      // Act
      await service.getInnovationHubFlexOrFail({
        idOrNameId: 'hub-1',
        subdomain: 'sub',
      });

      // Assert - without options.where, the default where is used
      const callArgs = findOneSpy.mock.calls[0][0] as any;
      expect(callArgs.where).toEqual([
        { id: 'hub-1' },
        { subdomain: 'sub' },
        { nameID: 'hub-1' },
      ]);
    });

    it('should search by subdomain only when idOrNameId is not provided', async () => {
      // Arrange
      const hub = { id: 'hub-1', subdomain: 'my-sub' } as InnovationHub;
      const findOneSpy = vi
        .spyOn(innovationHubRepository, 'findOne')
        .mockResolvedValue(hub);

      // Act
      await service.getInnovationHubFlexOrFail({ subdomain: 'my-sub' });

      // Assert
      const callArgs = findOneSpy.mock.calls[0][0] as any;
      expect(callArgs.where).toEqual([
        { id: undefined },
        { subdomain: 'my-sub' },
        { nameID: undefined },
      ]);
    });
  });

  describe('getSpaceListFilterOrFail', () => {
    it('should return spaceListFilter when hub exists', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        spaceListFilter: ['space-1', 'space-2'],
      } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOneBy').mockResolvedValue(hub);

      // Act
      const result = await service.getSpaceListFilterOrFail('hub-1');

      // Assert
      expect(result).toEqual(['space-1', 'space-2']);
    });

    it('should return undefined when hub exists but has no spaceListFilter', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        spaceListFilter: undefined,
      } as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOneBy').mockResolvedValue(hub);

      // Act
      const result = await service.getSpaceListFilterOrFail('hub-1');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should throw EntityNotFoundException when hub does not exist', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOneBy').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSpaceListFilterOrFail('non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getProvider', () => {
    it('should return the provider when hub and account exist', async () => {
      // Arrange
      const mockProvider = { id: 'provider-1', nameID: 'org-1' };
      const hub = {
        id: 'hub-1',
        account: { id: 'account-1' },
      } as unknown as InnovationHub;

      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);
      (service['accountLookupService'] as any).getHost = vi
        .fn()
        .mockResolvedValue(mockProvider);

      // Act
      const result = await service.getProvider('hub-1');

      // Assert
      expect(result).toBe(mockProvider);
    });

    it('should throw RelationshipNotFoundException when hub is not found', async () => {
      // Arrange
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProvider('non-existent')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when hub has no account', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        account: undefined,
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);

      // Act & Assert
      await expect(service.getProvider('hub-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when provider is null', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        account: { id: 'account-1' },
      } as unknown as InnovationHub;
      vi.spyOn(innovationHubRepository, 'findOne').mockResolvedValue(hub);
      (service['accountLookupService'] as any).getHost = vi
        .fn()
        .mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProvider('hub-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should load hub with account relation', async () => {
      // Arrange
      const hub = {
        id: 'hub-1',
        account: { id: 'account-1' },
      } as unknown as InnovationHub;
      const findOneSpy = vi
        .spyOn(innovationHubRepository, 'findOne')
        .mockResolvedValue(hub);
      (service['accountLookupService'] as any).getHost = vi
        .fn()
        .mockResolvedValue({ id: 'p' });

      // Act
      await service.getProvider('hub-1');

      // Assert
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'hub-1' },
        relations: { account: true },
      });
    });
  });

  describe('save', () => {
    it('should delegate to repository save', async () => {
      // Arrange
      const hub = { id: 'hub-1' } as InnovationHub;
      const saveSpy = vi
        .spyOn(innovationHubRepository, 'save')
        .mockResolvedValue(hub);

      // Act
      const result = await service.save(hub);

      // Assert
      expect(saveSpy).toHaveBeenCalledWith(hub);
      expect(result).toBe(hub);
    });
  });

  describe('getInnovationHubs', () => {
    it('should delegate to repository find with options', async () => {
      // Arrange
      const hubs = [
        { id: 'hub-1' } as InnovationHub,
        { id: 'hub-2' } as InnovationHub,
      ];
      const findSpy = vi
        .spyOn(innovationHubRepository, 'find')
        .mockResolvedValue(hubs);
      const options = { where: { type: InnovationHubType.LIST } };

      // Act
      const result = await service.getInnovationHubs(options as any);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(options);
      expect(result).toBe(hubs);
    });

    it('should return all hubs when no options are provided', async () => {
      // Arrange
      const hubs = [{ id: 'hub-1' } as InnovationHub];
      vi.spyOn(innovationHubRepository, 'find').mockResolvedValue(hubs);

      // Act
      const result = await service.getInnovationHubs();

      // Assert
      expect(result).toBe(hubs);
    });
  });
});
