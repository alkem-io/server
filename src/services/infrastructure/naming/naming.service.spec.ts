import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { NamingService } from './naming.service';

describe('Naming Service', () => {
  let service: NamingService;
  let entityManager: { find: Mock; findOne: Mock };
  let discussionRepository: { countBy: Mock; createQueryBuilder: Mock };
  let innovationHubRepository: { countBy: Mock };

  beforeEach(async () => {
    entityManager = {
      find: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NamingService,
        repositoryProviderMockFactory(Discussion),
        repositoryProviderMockFactory(InnovationHub),
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NamingService);
    discussionRepository = module.get(`${Discussion.name}Repository`) as any;
    innovationHubRepository = module.get(
      `${InnovationHub.name}Repository`
    ) as any;
  });

  describe('createNameIdAvoidingReservedNameIDs', () => {
    it.each([
      { base: 'mytest', reserved: [], expected: 'mytest' },
      { base: 'mytest', reserved: ['mytest'], expected: 'mytest-1' },
      {
        base: 'mytest',
        reserved: ['mytest', 'mytest-1'],
        expected: 'mytest-2',
      },
      {
        base: 'mytest',
        reserved: ['mytest', 'mytest-1', 'mytest-3'],
        expected: 'mytest-2',
      },
    ])('$base, $reserved - $output', async ({ base, reserved, expected }) => {
      const received = service.createNameIdAvoidingReservedNameIDs(
        base,
        reserved
      );
      expect(received).toEqual(expected);
    });
  });

  describe('getReservedNameIDsInLevelZeroSpace', () => {
    it('should return nameIDs of subspaces within the level zero space', async () => {
      entityManager.find.mockResolvedValue([
        { id: '1', nameID: 'sub-a' },
        { id: '2', nameID: 'sub-b' },
      ]);

      const result =
        await service.getReservedNameIDsInLevelZeroSpace('space-1');

      expect(result).toEqual(['sub-a', 'sub-b']);
    });

    it('should return empty array when no subspaces exist', async () => {
      entityManager.find.mockResolvedValue([]);

      const result =
        await service.getReservedNameIDsInLevelZeroSpace('space-1');

      expect(result).toEqual([]);
    });
  });

  describe('getReservedNameIDsLevelZeroSpaces', () => {
    it('should return lowercase nameIDs plus restricted names', async () => {
      entityManager.find.mockResolvedValue([
        { id: '1', nameID: 'MySpace' },
        { id: '2', nameID: 'Another' },
      ]);

      const result = await service.getReservedNameIDsLevelZeroSpaces();

      expect(result).toContain('myspace');
      expect(result).toContain('another');
      // Should also include restricted names
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe('getReservedNameIDsInForum', () => {
    it('should return nameIDs of discussions in the forum', async () => {
      entityManager.find.mockResolvedValue([
        { nameID: 'disc-1' },
        { nameID: 'disc-2' },
      ]);

      const result = await service.getReservedNameIDsInForum('forum-1');

      expect(result).toEqual(['disc-1', 'disc-2']);
    });

    it('should return empty array when no discussions found', async () => {
      entityManager.find.mockResolvedValue(null);

      const result = await service.getReservedNameIDsInForum('forum-1');

      expect(result).toEqual([]);
    });
  });

  describe('getReservedNameIDsInCalloutsSet', () => {
    it('should return nameIDs of callouts in the set', async () => {
      entityManager.find.mockResolvedValue([
        { nameID: 'callout-1' },
        { nameID: 'callout-2' },
      ]);

      const result =
        await service.getReservedNameIDsInCalloutsSet('callouts-set-1');

      expect(result).toEqual(['callout-1', 'callout-2']);
    });
  });

  describe('getReservedNameIDsInTemplatesSet', () => {
    it('should return nameIDs of templates in the set', async () => {
      entityManager.find.mockResolvedValue([{ nameID: 'template-1' }]);

      const result =
        await service.getReservedNameIDsInTemplatesSet('templates-set-1');

      expect(result).toEqual(['template-1']);
    });
  });

  describe('getReservedNameIDsInCalendar', () => {
    it('should return nameIDs of events in the calendar', async () => {
      entityManager.find.mockResolvedValue([
        { nameID: 'event-a' },
        { nameID: 'event-b' },
      ]);

      const result = await service.getReservedNameIDsInCalendar('calendar-1');

      expect(result).toEqual(['event-a', 'event-b']);
    });
  });

  describe('getReservedNameIDsInInnovationPacks', () => {
    it('should return nameIDs of all innovation packs', async () => {
      entityManager.find.mockResolvedValue([
        { nameID: 'pack-1' },
        { nameID: 'pack-2' },
      ]);

      const result = await service.getReservedNameIDsInInnovationPacks();

      expect(result).toEqual(['pack-1', 'pack-2']);
    });
  });

  describe('getReservedNameIDsInHubs', () => {
    it('should return nameIDs of all innovation hubs', async () => {
      entityManager.find.mockResolvedValue([{ nameID: 'hub-1' }]);

      const result = await service.getReservedNameIDsInHubs();

      expect(result).toEqual(['hub-1']);
    });
  });

  describe('getReservedNameIDsInUsers', () => {
    it('should return nameIDs of all users', async () => {
      entityManager.find.mockResolvedValue([
        { id: '1', nameID: 'user-a' },
        { id: '2', nameID: 'user-b' },
      ]);

      const result = await service.getReservedNameIDsInUsers();

      expect(result).toEqual(['user-a', 'user-b']);
    });
  });

  describe('getReservedNameIDsInVirtualContributors', () => {
    it('should return nameIDs of all virtual contributors', async () => {
      entityManager.find.mockResolvedValue([{ id: '1', nameID: 'vc-1' }]);

      const result = await service.getReservedNameIDsInVirtualContributors();

      expect(result).toEqual(['vc-1']);
    });
  });

  describe('getReservedNameIDsInOrganizations', () => {
    it('should return nameIDs of all organizations', async () => {
      entityManager.find.mockResolvedValue([
        { id: '1', nameID: 'org-1' },
        { id: '2', nameID: 'org-2' },
      ]);

      const result = await service.getReservedNameIDsInOrganizations();

      expect(result).toEqual(['org-1', 'org-2']);
    });
  });

  describe('getReservedNameIDsInCalloutContributions', () => {
    it('should return nameIDs from whiteboards, posts, and memos in contributions', async () => {
      entityManager.findOne.mockResolvedValue({
        contributions: [
          {
            whiteboard: { nameID: 'wb-1' },
            post: { nameID: 'post-1' },
            memo: null,
          },
          { whiteboard: null, post: null, memo: { nameID: 'memo-1' } },
        ],
      });

      const result =
        await service.getReservedNameIDsInCalloutContributions('callout-1');

      expect(result).toEqual(['wb-1', 'post-1', 'memo-1']);
    });

    it('should return empty array when callout not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result =
        await service.getReservedNameIDsInCalloutContributions('callout-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when callout has no contributions', async () => {
      entityManager.findOne.mockResolvedValue({ contributions: [] });

      const result =
        await service.getReservedNameIDsInCalloutContributions('callout-1');

      expect(result).toEqual([]);
    });
  });

  describe('isDiscussionDisplayNameAvailableInForum', () => {
    it('should return true when no discussion with that display name exists', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      discussionRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.isDiscussionDisplayNameAvailableInForum(
        'New Discussion',
        'forum-1'
      );

      expect(result).toBe(true);
    });

    it('should return false when a discussion with that display name exists', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'existing-discussion' }),
      };
      discussionRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.isDiscussionDisplayNameAvailableInForum(
        'Existing Name',
        'forum-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('isInnovationHubSubdomainAvailable', () => {
    it('should return true when no hubs with that subdomain exist', async () => {
      innovationHubRepository.countBy = vi.fn().mockResolvedValue(0);

      const result = await service.isInnovationHubSubdomainAvailable('my-hub');

      expect(result).toBe(true);
    });

    it('should return false when a hub with that subdomain exists', async () => {
      innovationHubRepository.countBy = vi.fn().mockResolvedValue(1);

      const result =
        await service.isInnovationHubSubdomainAvailable('taken-hub');

      expect(result).toBe(false);
    });
  });
});
