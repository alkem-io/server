import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { RoomService } from '@domain/communication/room/room.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { Callout } from './callout.entity';
import { ICallout } from './callout.interface';
import { CalloutService } from './callout.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('CalloutService', () => {
  let service: CalloutService;
  let db: any;
  let framingService: CalloutFramingService;
  let contributionDefaultsService: CalloutContributionDefaultsService;
  let contributionService: CalloutContributionService;
  let roomService: RoomService;
  let _namingService: NamingService;
  let userLookupService: UserLookupService;
  let classificationService: ClassificationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let _storageAggregatorResolverService: StorageAggregatorResolverService;

  beforeEach(async () => {
    // Mock static Callout.create to avoid DataSource requirement
    vi.spyOn(Callout, 'create').mockImplementation((input: any) => {
      const entity = new Callout();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutService);
    db = module.get(DRIZZLE);
    framingService = module.get(CalloutFramingService);
    contributionDefaultsService = module.get(
      CalloutContributionDefaultsService
    );
    contributionService = module.get(CalloutContributionService);
    roomService = module.get(RoomService);
    _namingService = module.get(NamingService);
    userLookupService = module.get(UserLookupService);
    classificationService = module.get(ClassificationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    _storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
  });

  describe('createCallout', () => {
    const storageAggregator = { id: 'agg-1' } as any;
    const tagsetTemplates = [] as any[];

    function createCalloutInput(overrides: any = {}) {
      return {
        framing: {
          type: CalloutFramingType.NONE,
          profile: { displayName: 'Test', tagsets: [] },
          tags: [],
          ...overrides.framing,
        },
        settings: overrides.settings,
        contributions: overrides.contributions,
        contributionDefaults: overrides.contributionDefaults,
        sortOrder: overrides.sortOrder,
        classification: overrides.classification,
        ...overrides,
      };
    }

    beforeEach(() => {
      vi.mocked(framingService.createCalloutFraming).mockResolvedValue({
        id: 'framing-1',
        profile: { storageBucket: { id: 'sb-1' } },
      } as any);
      vi.mocked(
        contributionDefaultsService.createCalloutContributionDefaults
      ).mockResolvedValue({ id: 'defaults-1' } as any);
      vi.mocked(classificationService.createClassification).mockReturnValue({
        id: 'classification-1',
      } as any);
    });

    it('should create a callout with default settings', async () => {
      const calloutData = createCalloutInput();

      const result = await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        'user-1'
      );

      expect(result.authorization).toBeDefined();
      expect(result.createdBy).toBe('user-1');
      expect(result.contributions).toEqual([]);
      expect(framingService.createCalloutFraming).toHaveBeenCalled();
      expect(
        contributionDefaultsService.createCalloutContributionDefaults
      ).toHaveBeenCalled();
    });

    it('should default sortOrder to 10 when not provided', async () => {
      const calloutData = createCalloutInput();

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator
      );

      expect(calloutData.sortOrder).toBe(10);
    });

    it('should set publishedDate and publishedBy when visibility is PUBLISHED', async () => {
      const calloutData = createCalloutInput({
        settings: { visibility: CalloutVisibility.PUBLISHED },
      });

      const result = await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        'user-1'
      );

      expect(result.publishedDate).toBeInstanceOf(Date);
      expect(result.publishedBy).toBe('user-1');
    });

    it('should create contributions when userID and contributions data are provided', async () => {
      const calloutData = createCalloutInput({
        contributions: [
          {
            type: CalloutContributionType.POST,
            post: { profileData: { displayName: 'P' } },
          },
        ],
        settings: {
          contribution: { allowedTypes: [CalloutContributionType.POST] },
        },
      });

      vi.mocked(
        contributionService.createCalloutContributions
      ).mockResolvedValue([{ id: 'c-1' }] as any);

      const result = await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        'user-1'
      );

      expect(contributionService.createCalloutContributions).toHaveBeenCalled();
      expect(result.contributions).toHaveLength(1);
    });

    it('should create comments room when callout is not a template and comments are enabled', async () => {
      const calloutData = createCalloutInput({
        settings: { framing: { commentsEnabled: true } },
      });

      vi.mocked(roomService.createRoom).mockResolvedValue({
        id: 'room-1',
      } as any);

      const _result = await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        'user-1'
      );

      expect(roomService.createRoom).toHaveBeenCalled();
    });

    it('should throw ValidationException when whiteboard contributions are allowed but no template', async () => {
      const calloutData = createCalloutInput({
        settings: {
          contribution: {
            allowedTypes: [CalloutContributionType.WHITEBOARD],
          },
        },
        contributionDefaults: {
          // no whiteboardContent
        },
      });

      await expect(
        service.createCallout(calloutData, tagsetTemplates, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when framing type is WHITEBOARD but no whiteboard data', async () => {
      const calloutData = createCalloutInput({
        framing: {
          type: CalloutFramingType.WHITEBOARD,
          profile: { displayName: 'Test', tagsets: [] },
          tags: [],
          // no whiteboard
        },
      });

      await expect(
        service.createCallout(calloutData, tagsetTemplates, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when whiteboard data is provided but framing type is not WHITEBOARD', async () => {
      const calloutData = createCalloutInput({
        framing: {
          type: CalloutFramingType.NONE,
          profile: { displayName: 'Test', tagsets: [] },
          tags: [],
          whiteboard: { profile: { displayName: 'WB' } },
        },
      });

      await expect(
        service.createCallout(calloutData, tagsetTemplates, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('getCalloutOrFail', () => {
    it('should return callout when found', async () => {
      const callout = { id: 'callout-1' } as Callout;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.getCalloutOrFail('callout-1');

      expect(result).toBe(callout);
    });

    it('should throw EntityNotFoundException when callout is not found', async () => {
      db.query.callouts.findFirst.mockResolvedValueOnce(undefined);

      await expect(service.getCalloutOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateCalloutVisibility', () => {
    it('should update callout visibility and save', async () => {
      const callout = {
        id: 'callout-1',
        settings: { visibility: CalloutVisibility.DRAFT },
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);
      db.returning.mockResolvedValueOnce([callout]);

      await service.updateCalloutVisibility({
        calloutID: 'callout-1',
        visibility: CalloutVisibility.PUBLISHED,
      } as any);

      expect(callout.settings.visibility).toBe(CalloutVisibility.PUBLISHED);
    });
  });

  describe('updateCalloutPublishInfo', () => {
    it('should update publishedBy when publisher ID is provided', async () => {
      const callout = { id: 'callout-1' } as any;
      const publisher = { id: 'real-user-id' };

      vi.mocked(userLookupService.getUserByUUID).mockResolvedValue(
        publisher as any
      );
      db.returning.mockResolvedValueOnce([callout]);

      await service.updateCalloutPublishInfo(callout, 'publisher-uuid');

      expect(callout.publishedBy).toBe('real-user-id');
    });

    it('should set publishedBy to empty string when publisher not found', async () => {
      const callout = { id: 'callout-1' } as any;

      vi.mocked(userLookupService.getUserByUUID).mockResolvedValue(
        undefined as any
      );
      db.returning.mockResolvedValueOnce([callout]);

      await service.updateCalloutPublishInfo(callout, 'nonexistent-uuid');

      expect(callout.publishedBy).toBe('');
    });

    it('should update publishedDate when timestamp is provided', async () => {
      const callout = { id: 'callout-1' } as any;
      const timestamp = Date.now();
      db.returning.mockResolvedValueOnce([callout]);

      await service.updateCalloutPublishInfo(callout, undefined, timestamp);

      expect(callout.publishedDate).toBeInstanceOf(Date);
      expect(callout.publishedDate?.getTime()).toBe(timestamp);
    });
  });

  describe('deleteCallout', () => {
    it('should delete all associated entities', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [{ id: 'c-1' }, { id: 'c-2' }],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: { id: 'room-1' },
        authorization: { id: 'auth-1' },
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.deleteCallout('callout-1');

      expect(framingService.delete).toHaveBeenCalledWith(callout.framing);
      expect(contributionService.delete).toHaveBeenCalledTimes(2);
      expect(roomService.deleteRoom).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
      expect(contributionDefaultsService.delete).toHaveBeenCalledWith(
        callout.contributionDefaults
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        callout.authorization
      );
      expect(result.id).toBe('callout-1');
    });

    it('should throw EntityNotInitializedException when callout is not fully initialized', async () => {
      const callout = {
        id: 'callout-1',
        contributionDefaults: undefined,
        settings: undefined,
        contributions: undefined,
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(service.deleteCallout('callout-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should skip deleting comments when callout has no comments room', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: undefined,
        authorization: { id: 'auth-1' },
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await service.deleteCallout('callout-1');

      expect(roomService.deleteRoom).not.toHaveBeenCalled();
    });
  });

  describe('getStorageBucket', () => {
    it('should return storage bucket from framing profile', async () => {
      const storageBucket = { id: 'sb-1' };
      const callout = {
        id: 'callout-1',
        framing: { profile: { storageBucket } },
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.getStorageBucket('callout-1');

      expect(result).toBe(storageBucket);
    });

    it('should throw RelationshipNotFoundException when no storage bucket exists', async () => {
      const callout = {
        id: 'callout-1',
        framing: { profile: { storageBucket: undefined } },
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(service.getStorageBucket('callout-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getClassification', () => {
    it('should return classification when it exists', async () => {
      const classification = { id: 'class-1' };
      const callout = { id: 'callout-1', classification } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.getClassification('callout-1');

      expect(result).toBe(classification);
    });

    it('should throw RelationshipNotFoundException when classification is missing', async () => {
      const callout = {
        id: 'callout-1',
        classification: undefined,
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(service.getClassification('callout-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('updateContributionCalloutsSortOrder', () => {
    it('should update sort order for contributions based on provided IDs', async () => {
      const contributions = [
        { id: 'c-1', sortOrder: 5 },
        { id: 'c-2', sortOrder: 3 },
        { id: 'c-3', sortOrder: 1 },
      ] as any[];
      const callout = {
        id: 'callout-1',
        contributions,
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      vi.mocked(contributionService.save).mockImplementation(
        async (input: any) => input
      );

      const result = await service.updateContributionCalloutsSortOrder(
        'callout-1',
        { contributionIDs: ['c-3', 'c-1', 'c-2'] } as any
      );

      expect(result[0].sortOrder).toBe(1);
      expect(result[1].sortOrder).toBe(2);
      expect(result[2].sortOrder).toBe(3);
    });

    it('should throw EntityNotFoundException when a contribution ID is not found', async () => {
      const callout = {
        id: 'callout-1',
        contributions: [{ id: 'c-1', sortOrder: 1 }],
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(
        service.updateContributionCalloutsSortOrder('callout-1', {
          contributionIDs: ['c-1', 'nonexistent'],
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getContributionDefaults', () => {
    it('should return contribution defaults when initialized', async () => {
      const defaults = { id: 'defaults-1' };
      const callout = {
        id: 'callout-1',
        contributionDefaults: defaults,
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.getContributionDefaults('callout-1');

      expect(result).toBe(defaults);
    });

    it('should throw EntityNotInitializedException when contribution defaults missing', async () => {
      const callout = {
        id: 'callout-1',
        contributionDefaults: undefined,
      } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(
        service.getContributionDefaults('callout-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getCalloutFraming', () => {
    it('should return framing when initialized', async () => {
      const framing = { id: 'framing-1' };
      const callout = { id: 'callout-1', framing } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      const result = await service.getCalloutFraming('callout-1');

      expect(result).toBe(framing);
    });

    it('should throw EntityNotFoundException when framing is not initialized', async () => {
      const callout = { id: 'callout-1', framing: undefined } as any;
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);

      await expect(service.getCalloutFraming('callout-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getActivityCount', () => {
    it('should return contributions count when callout has allowed contribution types', async () => {
      const callout = {
        id: 'callout-1',
        settings: {
          contribution: {
            allowedTypes: [CalloutContributionType.POST],
          },
        },
      } as any;

      vi.mocked(
        contributionService.getContributionsInCalloutCount
      ).mockResolvedValue(5);

      const result = await service.getActivityCount(callout);

      expect(result).toBe(5);
    });

    it('should return comments count when callout has no allowed contribution types', async () => {
      const callout = {
        id: 'callout-1',
        settings: {
          contribution: { allowedTypes: [] },
        },
        comments: { id: 'room-1' },
      } as any;

      // getComments path - needs db mock for getCalloutOrFail
      db.query.callouts.findFirst.mockResolvedValueOnce(callout);
      vi.mocked(roomService.getMessages).mockResolvedValue([{}, {}, {}] as any);

      const result = await service.getActivityCount(callout);

      expect(result).toBe(3);
    });
  });

  describe('getActivityCountBatch', () => {
    /** Helper: creates a contribution-type callout (has allowedTypes). */
    function makeContributionCallout(id: string): ICallout {
      return {
        id,
        settings: {
          contribution: { allowedTypes: ['POST'] },
        },
        comments: undefined,
      } as unknown as ICallout;
    }

    /** Helper: creates a comment-type callout (empty allowedTypes). */
    function makeCommentCallout(id: string, commentsRoom?: any): ICallout {
      return {
        id,
        settings: {
          contribution: { allowedTypes: [] },
        },
        comments: commentsRoom ?? { id: `room-${id}` },
      } as unknown as ICallout;
    }

    it('should handle empty callout list', async () => {
      await service.getActivityCountBatch([]);
      expect(
        contributionService.getContributionsCountBatch
      ).not.toHaveBeenCalled();
    });

    it('should batch contribution-type callouts into a single query', async () => {
      const callout1 = makeContributionCallout('c-1');
      const callout2 = makeContributionCallout('c-2');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(
        new Map([
          ['c-1', 5],
          ['c-2', 12],
        ])
      );

      await service.getActivityCountBatch([callout1, callout2]);

      expect(
        contributionService.getContributionsCountBatch
      ).toHaveBeenCalledTimes(1);
      expect(
        contributionService.getContributionsCountBatch
      ).toHaveBeenCalledWith(['c-1', 'c-2']);

      expect(callout1.activity).toBe(5);
      expect(callout2.activity).toBe(12);
    });

    it('should set activity to 0 for contribution callouts with no contributions', async () => {
      const callout = makeContributionCallout('c-1');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map()); // no entries

      await service.getActivityCountBatch([callout]);

      expect(callout.activity).toBe(0);
    });

    it('should resolve comment-type callouts via room message count', async () => {
      const callout = makeCommentCallout('c-comment');

      (roomService.getMessages as Mock).mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
        { id: 'm3' },
      ]);

      await service.getActivityCountBatch([callout]);

      expect(roomService.getMessages).toHaveBeenCalledWith(callout.comments);
      expect(callout.activity).toBe(3);
    });

    it('should set activity to 0 for comment callouts with no comments room', async () => {
      const callout = makeCommentCallout('c-no-room', undefined);
      // Override to set comments = undefined (no room)
      callout.comments = undefined as any;

      await service.getActivityCountBatch([callout]);

      expect(callout.activity).toBe(0);
    });

    it('should handle mixed contribution and comment callouts', async () => {
      const contrib1 = makeContributionCallout('contrib-1');
      const contrib2 = makeContributionCallout('contrib-2');
      const comment1 = makeCommentCallout('comment-1');
      const comment2 = makeCommentCallout('comment-2');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(
        new Map([
          ['contrib-1', 10],
          ['contrib-2', 20],
        ])
      );

      (roomService.getMessages as Mock)
        .mockResolvedValueOnce([{ id: 'm1' }]) // comment-1 → 1 message
        .mockResolvedValueOnce([{ id: 'm2' }, { id: 'm3' }]); // comment-2 → 2 messages

      await service.getActivityCountBatch([
        contrib1,
        comment1,
        contrib2,
        comment2,
      ]);

      expect(contrib1.activity).toBe(10);
      expect(contrib2.activity).toBe(20);
      expect(comment1.activity).toBe(1);
      expect(comment2.activity).toBe(2);
    });

    it('should not call contribution batch when all callouts are comment-type', async () => {
      const comment = makeCommentCallout('c-1');
      (roomService.getMessages as Mock).mockResolvedValue([]);

      await service.getActivityCountBatch([comment]);

      expect(
        contributionService.getContributionsCountBatch
      ).not.toHaveBeenCalled();
      expect(comment.activity).toBe(0);
    });

    it('should not call room service when all callouts are contribution-type', async () => {
      const contrib = makeContributionCallout('c-1');
      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map([['c-1', 3]]));

      await service.getActivityCountBatch([contrib]);

      expect(roomService.getMessages).not.toHaveBeenCalled();
      expect(contrib.activity).toBe(3);
    });

    it('should mutate callout objects in-place', async () => {
      const callout = makeContributionCallout('c-1');
      expect(callout.activity).toBeUndefined();

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map([['c-1', 7]]));

      await service.getActivityCountBatch([callout]);

      expect(callout.activity).toBe(7);
    });

    it('should parallelize comment RPC calls', async () => {
      const comment1 = makeCommentCallout('c-1');
      const comment2 = makeCommentCallout('c-2');

      (roomService.getMessages as Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return [{ id: 'msg' }];
      });

      await service.getActivityCountBatch([comment1, comment2]);

      expect(roomService.getMessages).toHaveBeenCalledTimes(2);
      expect(comment1.activity).toBe(1);
      expect(comment2.activity).toBe(1);
    });
  });
});
