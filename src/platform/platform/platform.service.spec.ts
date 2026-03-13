import { EntityNotFoundException } from '@common/exceptions';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForumService } from '@platform/forum/forum.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { Platform } from './platform.entity';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let repo: MockType<Repository<Platform>>;
  let forumService: ForumService;
  let messagingService: MessagingService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        repositoryProviderMockFactory(Platform),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformService);
    repo = module.get(getRepositoryToken(Platform));
    forumService = module.get(ForumService);
    messagingService = module.get(MessagingService);
  });

  describe('getPlatformOrFail', () => {
    it('should return platform when found', async () => {
      const platform = { id: 'p1', settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getPlatformOrFail();

      expect(result).toBe(platform);
    });

    it('should initialize notificationEmailBlacklist when integration exists but blacklist is missing', async () => {
      const platform = {
        id: 'p1',
        settings: { integration: {} },
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getPlatformOrFail();

      expect(result.settings.integration.notificationEmailBlacklist).toEqual(
        []
      );
    });

    it('should not overwrite existing notificationEmailBlacklist', async () => {
      const platform = {
        id: 'p1',
        settings: {
          integration: { notificationEmailBlacklist: ['test@test.com'] },
        },
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getPlatformOrFail();

      expect(result.settings.integration.notificationEmailBlacklist).toEqual([
        'test@test.com',
      ]);
    });

    it('should throw EntityNotFoundException when platform not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.getPlatformOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('savePlatform', () => {
    it('should save and return platform', async () => {
      const platform = { id: 'p1' } as any;
      repo.save!.mockResolvedValue(platform);

      const result = await service.savePlatform(platform);

      expect(result).toBe(platform);
      expect(repo.save).toHaveBeenCalledWith(platform);
    });
  });

  describe('getLibraryOrFail', () => {
    it('should return library when found', async () => {
      const library = { id: 'lib-1' } as any;
      const platform = { id: 'p1', library, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getLibraryOrFail();

      expect(result).toBe(library);
    });

    it('should throw EntityNotFoundException when library is undefined', async () => {
      const platform = { id: 'p1', library: undefined, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(service.getLibraryOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getForumOrFail', () => {
    it('should return forum when found', async () => {
      const forum = { id: 'forum-1' } as any;
      const platform = { id: 'p1', forum, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getForumOrFail();

      expect(result).toBe(forum);
    });

    it('should throw EntityNotFoundException when forum is undefined', async () => {
      const platform = { id: 'p1', forum: undefined, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(service.getForumOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getTemplatesManagerOrFail', () => {
    it('should return templates manager when found', async () => {
      const templatesManager = { id: 'tm-1' } as any;
      const platform = {
        id: 'p1',
        templatesManager,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getTemplatesManagerOrFail();

      expect(result).toBe(templatesManager);
    });

    it('should throw when templates manager is undefined', async () => {
      const platform = {
        id: 'p1',
        templatesManager: undefined,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(service.getTemplatesManagerOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('ensureForumCreated', () => {
    it('should return existing forum if already created', async () => {
      const forum = { id: 'forum-1' } as any;
      const platform = { id: 'p1', forum, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.ensureForumCreated();

      expect(result).toBe(forum);
      expect(forumService.createForum as Mock).not.toHaveBeenCalled();
    });

    it('should create a new forum when not present', async () => {
      const platform = { id: 'p1', forum: undefined, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const newForum = { id: 'new-forum' } as any;
      (forumService.createForum as Mock).mockResolvedValue(newForum);
      repo.save!.mockResolvedValue({ ...platform, forum: newForum });

      const result = await service.ensureForumCreated();

      expect(forumService.createForum).toHaveBeenCalled();
      expect(result).toBe(newForum);
    });
  });

  describe('ensureMessagingCreated', () => {
    it('should return existing messaging if already created', async () => {
      const messaging = { id: 'msg-1' } as any;
      const platform = { id: 'p1', messaging, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.ensureMessagingCreated();

      expect(result).toBe(messaging);
    });

    it('should create messaging when not present', async () => {
      const platform = {
        id: 'p1',
        messaging: undefined,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const newMessaging = { id: 'new-msg' } as any;
      (messagingService.createMessaging as Mock).mockResolvedValue(
        newMessaging
      );
      repo.save!.mockResolvedValue({ ...platform, messaging: newMessaging });

      const result = await service.ensureMessagingCreated();

      expect(messagingService.createMessaging).toHaveBeenCalled();
      expect(result).toBe(newMessaging);
    });
  });

  describe('getStorageAggregator', () => {
    it('should return storage aggregator when found', async () => {
      const storageAggregator = { id: 'sa-1' } as any;
      const platform = {
        id: 'p1',
        storageAggregator,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getStorageAggregator({ id: 'p1' } as any);

      expect(result).toBe(storageAggregator);
    });

    it('should throw when storage aggregator not found', async () => {
      const platform = {
        id: 'p1',
        storageAggregator: undefined,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(
        service.getStorageAggregator({ id: 'p1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getLicensingFramework', () => {
    it('should return licensing framework when found', async () => {
      const licensingFramework = { id: 'lf-1' } as any;
      const platform = {
        id: 'p1',
        licensingFramework,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getLicensingFramework({ id: 'p1' } as any);

      expect(result).toBe(licensingFramework);
    });

    it('should throw when licensing framework not found', async () => {
      const platform = {
        id: 'p1',
        licensingFramework: undefined,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(
        service.getLicensingFramework({ id: 'p1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getRoleSetOrFail', () => {
    it('should return role set when found', async () => {
      const roleSet = { id: 'rs-1' } as any;
      const platform = { id: 'p1', roleSet, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.getRoleSetOrFail();

      expect(result).toBe(roleSet);
    });

    it('should throw when role set not found', async () => {
      const platform = {
        id: 'p1',
        roleSet: undefined,
        settings: {},
      } as any;
      repo.findOne!.mockResolvedValue(platform);

      await expect(service.getRoleSetOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getAuthorizationPolicy', () => {
    it('should return authorization when present', () => {
      const authorization = { id: 'auth-1' } as any;
      const platform = { id: 'p1', authorization } as any;

      const result = service.getAuthorizationPolicy(platform);

      expect(result).toBe(authorization);
    });

    it('should throw when authorization is undefined', () => {
      const platform = { id: 'p1', authorization: undefined } as any;

      expect(() => service.getAuthorizationPolicy(platform)).toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('ensureConversationsSetCreated (deprecated)', () => {
    it('should delegate to ensureMessagingCreated', async () => {
      const messaging = { id: 'msg-1' } as any;
      const platform = { id: 'p1', messaging, settings: {} } as any;
      repo.findOne!.mockResolvedValue(platform);

      const result = await service.ensureConversationsSetCreated();

      expect(result).toBe(messaging);
    });
  });
});
