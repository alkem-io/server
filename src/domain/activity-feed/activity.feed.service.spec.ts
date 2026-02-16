import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ActivityFeedService } from './activity.feed.service';

function makeSpace(
  id: string,
  level: SpaceLevel,
  collabId: string,
  levelZeroSpaceID = id
): Space {
  return {
    id,
    level,
    levelZeroSpaceID,
    collaboration: {
      id: collabId,
      authorization: { id: `auth-${collabId}` },
    },
  } as unknown as Space;
}

function makeCredential(spaceId: string): ICredentialDefinition {
  return {
    type: AuthorizationCredential.SPACE_MEMBER,
    resourceID: spaceId,
  } as ICredentialDefinition;
}

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;
  let db: any;
  let authorizationService: Mocked<AuthorizationService>;
  let spaceLookupService: Mocked<SpaceLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityFeedService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ActivityFeedService>(ActivityFeedService);
    db = module.get(DRIZZLE);
    authorizationService = module.get<AuthorizationService>(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    spaceLookupService = module.get<SpaceLookupService>(
      SpaceLookupService
    ) as Mocked<SpaceLookupService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllAuthorizedCollaborations (via getActivityFeed)', () => {
    it('should not query DB when no qualifying spaces', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      await service.getActivityFeed(agentInfo, { spaceIds: [] });

      expect(db.query.spaces.findMany).not.toHaveBeenCalled();
    });

    it('should batch-load spaces with collaborations in a single query for L2 spaces', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');

      db.query.spaces.findMany.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-1', 'space-2'],
      });

      // 1 batch query for spaces (L2 has no children)
      expect(db.query.spaces.findMany).toHaveBeenCalledTimes(1);
    });

    it('should batch-load L0 child spaces in a single additional query', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      const childL1 = makeSpace(
        'space-l1',
        SpaceLevel.L1,
        'collab-l1',
        'space-l0'
      );

      db.query.spaces.findMany
        .mockResolvedValueOnce([l0Space])
        .mockResolvedValueOnce([childL1]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-l0'],
      });

      // 2 calls: 1 for parent spaces + 1 for L0 account children
      expect(db.query.spaces.findMany).toHaveBeenCalledTimes(2);
    });

    it('should batch-load L1 subspaces in a single additional query', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l1')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l1Space = makeSpace('space-l1', SpaceLevel.L1, 'collab-l1');
      const childL2 = makeSpace('space-l2', SpaceLevel.L2, 'collab-l2');

      db.query.spaces.findMany
        .mockResolvedValueOnce([l1Space])
        .mockResolvedValueOnce([childL2]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-l1'],
      });

      // 2 calls: 1 for parent spaces + 1 for L1 subspaces
      expect(db.query.spaces.findMany).toHaveBeenCalledTimes(2);
    });

    it('should use isAccessGranted to filter collaborations', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');

      db.query.spaces.findMany.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-1', 'space-2'],
      });

      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(2);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        agentInfo,
        space1.collaboration!.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('should skip spaces without collaboration', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-no-collab')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const spaceNoCollab = {
        id: 'space-no-collab',
        level: SpaceLevel.L2,
        collaboration: undefined,
      } as unknown as Space;

      db.query.spaces.findMany.mockResolvedValueOnce([spaceNoCollab]);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-no-collab'],
      });

      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('should deduplicate child collaboration IDs that overlap with parent', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      // L0 account query returns the L0 space itself + a child
      const l0SpaceDuplicate = makeSpace(
        'space-l0',
        SpaceLevel.L0,
        'collab-l0',
        'space-l0'
      );
      const childL1 = makeSpace(
        'space-l1',
        SpaceLevel.L1,
        'collab-l1',
        'space-l0'
      );

      db.query.spaces.findMany
        .mockResolvedValueOnce([l0Space])
        .mockResolvedValueOnce([l0SpaceDuplicate, childL1]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-l0'],
      });

      // l0 parent: 1 call, l0 duplicate child: skipped, l1 child: 1 call = 2 total
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed L0 and L1 spaces with 3 batch queries', async () => {
      const agentInfo = Object.assign(new AgentInfo(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0'), makeCredential('space-l1')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      const l1Space = makeSpace('space-l1', SpaceLevel.L1, 'collab-l1');
      const l0Child = makeSpace(
        'space-l0-child',
        SpaceLevel.L1,
        'collab-l0-child',
        'space-l0'
      );
      const l1Child = makeSpace('space-l2', SpaceLevel.L2, 'collab-l2');

      db.query.spaces.findMany
        .mockResolvedValueOnce([l0Space, l1Space]) // parent spaces
        .mockResolvedValueOnce([l0Child]) // L0 children
        .mockResolvedValueOnce([l1Child]); // L1 children

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(agentInfo, {
        spaceIds: ['space-l0', 'space-l1'],
      });

      // 3 calls: parent spaces + L0 children + L1 children
      expect(db.query.spaces.findMany).toHaveBeenCalledTimes(3);
    });
  });
});
