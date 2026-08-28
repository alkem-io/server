import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ReactionType } from '@common/enums/reaction.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { RoomService } from '@domain/communication/room/room.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { Callout } from './callout.entity';
import { ICallout } from './callout.interface';
import { CalloutService } from './callout.service';
import { TaskBoardService } from './task-board/task.board.service';

describe('CalloutService', () => {
  let service: CalloutService;
  let module: TestingModule;
  let repository: Repository<Callout>;
  let framingService: CalloutFramingService;
  let contributionDefaultsService: CalloutContributionDefaultsService;
  let contributionService: CalloutContributionService;
  let roomService: RoomService;
  let _namingService: NamingService;
  let userLookupService: UserLookupService;
  let classificationService: ClassificationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let reactionService: ReactionService;
  let tagsetTemplateService: TagsetTemplateService;
  let _storageAggregatorResolverService: StorageAggregatorResolverService;
  // Transaction-scoped manager handed to the callback by entityManager.transaction.
  let mockManager: { remove: Mock };
  let mockEntityManager: { transaction: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static Callout.create to avoid DataSource requirement
    vi.spyOn(Callout, 'create').mockImplementation((input: any) => {
      const entity = new Callout();
      Object.assign(entity, input);
      return entity as any;
    });

    // By default transaction runs its callback immediately with the mock
    // manager and returns whatever the callback resolves to. Individual tests
    // can override transaction to simulate a rollback.
    mockManager = {
      remove: vi.fn().mockResolvedValue({ id: undefined }),
    };
    mockEntityManager = {
      transaction: vi.fn(async (cb: (m: typeof mockManager) => unknown) =>
        cb(mockManager)
      ),
    };

    module = await Test.createTestingModule({
      providers: [
        CalloutService,
        // Real column-model logic (validation + detection) so board-creation
        // tests exercise the actual rules rather than an auto-mock.
        TaskBoardService,
        repositoryProviderMockFactory(Callout),
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutService);
    repository = module.get(getRepositoryToken(Callout));
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
    reactionService = module.get(ReactionService);
    tagsetTemplateService = module.get(TagsetTemplateService);
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
        actorContextData.actorContext,
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

    // RED: an anonymous/system context (e.g. bootstrap template seeding) carries
    // actorID='' → userID=''. That must NOT land in the nullable `uuid` createdBy
    // column verbatim (Postgres rejects '' as a uuid, breaking fresh-DB bootstrap);
    // it must map to NULL/undefined.
    it('maps an empty-string userID to an undefined createdBy (never a malformed uuid)', async () => {
      const result = await service.createCallout(
        createCalloutInput(),
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        ''
      );

      expect(result.createdBy).toBeUndefined();
    });

    it('should default sortOrder to 10 when not provided', async () => {
      const calloutData = createCalloutInput();

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext
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
        actorContextData.actorContext,
        'user-1'
      );

      expect(result.publishedDate).toBeInstanceOf(Date);
      expect(result.publishedBy).toBe('user-1');
    });

    // RED (reproduced on the real isolated stack): fresh-DB bootstrap seeds platform
    // templates under the anonymous/system context (actorID='' → userID=''); a PUBLISHED
    // callout then wrote '' into the nullable `uuid` publishedBy column → Postgres
    // "invalid input syntax for type uuid" → BootstrapException, server never boots.
    // The guard maps '' → undefined (NULL), same as createdBy.
    it('maps an empty-string userID to an undefined publishedBy for a PUBLISHED callout', async () => {
      const result = await service.createCallout(
        createCalloutInput({
          settings: { visibility: CalloutVisibility.PUBLISHED },
        }),
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        ''
      );

      expect(result.publishedBy).toBeUndefined();
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
        actorContextData.actorContext,
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
        actorContextData.actorContext,
        'user-1'
      );

      expect(roomService.createRoom).toHaveBeenCalled();
    });

    it('allows whiteboard contributions without a stored default (server seeds an empty board)', async () => {
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
        service.createCallout(
          calloutData,
          tagsetTemplates,
          storageAggregator,
          actorContextData.actorContext
        )
      ).resolves.toBeDefined();
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
        service.createCallout(
          calloutData,
          tagsetTemplates,
          storageAggregator,
          actorContextData.actorContext
        )
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
        service.createCallout(
          calloutData,
          tagsetTemplates,
          storageAggregator,
          actorContextData.actorContext
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('createCallout task board', () => {
    const storageAggregator = { id: 'agg-1' } as any;
    const tagsetTemplates = [] as any[];

    function boardInput(overrides: any = {}) {
      return {
        framing: {
          type: CalloutFramingType.NONE,
          profile: { displayName: 'Board', tagsets: [] },
          tags: [],
        },
        settings: {
          contribution: { allowedTypes: [CalloutContributionType.POST] },
        },
        sortOrder: 10,
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
      // Echo the classification build so the test can read the templates it
      // was handed.
      vi.mocked(classificationService.createClassification).mockImplementation(
        (templates: any) => ({ id: 'classification-1', templates }) as any
      );
      tagsetTemplateService = module.get(TagsetTemplateService);
      // Build a plain template object from the create input (the real service
      // constructs a TagsetTemplate entity — the fields are all that matters
      // here).
      vi.mocked(tagsetTemplateService.createTagsetTemplate).mockImplementation(
        (input: any) => ({ ...input }) as any
      );
      // Persisting the template is a no-op echo in the unit context.
      vi.mocked(tagsetTemplateService.save).mockImplementation(
        async (t: any) => ({ id: 'tpl-1', ...t }) as any
      );
    });

    it('seeds the default columns in order when none supplied', async () => {
      const calloutData = boardInput({ taskBoard: {} });

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        'user-1'
      );

      const savedTemplate = vi.mocked(tagsetTemplateService.save).mock
        .calls[0][0];
      expect(savedTemplate.name).toBe('task');
      expect(savedTemplate.type).toBe('select-one');
      expect(savedTemplate.allowedValues).toEqual([
        'To Do',
        'In Progress',
        'Done',
      ]);
      expect(savedTemplate.defaultSelectedValue).toBe('To Do');
    });

    it('validates and canonicalises supplied custom columns', async () => {
      const calloutData = boardInput({
        taskBoard: { columns: ['  Ideas', 'Doing ', 'Shipped'] },
      });

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        'user-1'
      );

      const savedTemplate = vi.mocked(tagsetTemplateService.save).mock
        .calls[0][0];
      expect(savedTemplate.allowedValues).toEqual([
        'Ideas',
        'Doing',
        'Shipped',
      ]);
      expect(savedTemplate.defaultSelectedValue).toBe('Ideas');
    });

    it('rejects a taskBoard callout that is not POST-only', async () => {
      const calloutData = boardInput({
        settings: {
          contribution: {
            allowedTypes: [
              CalloutContributionType.POST,
              CalloutContributionType.LINK,
            ],
          },
        },
        taskBoard: {},
      });

      await expect(
        service.createCallout(
          calloutData,
          tagsetTemplates,
          storageAggregator,
          actorContextData.actorContext,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
      expect(tagsetTemplateService.save).not.toHaveBeenCalled();
    });

    it('rejects duplicate custom columns (case-insensitive)', async () => {
      const calloutData = boardInput({
        taskBoard: { columns: ['Backlog', 'BACKLOG'] },
      });

      await expect(
        service.createCallout(
          calloutData,
          tagsetTemplates,
          storageAggregator,
          actorContextData.actorContext,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('strips a generic task tagset when no taskBoard block is present', async () => {
      const calloutData = boardInput({
        classification: {
          tagsets: [
            { name: 'task', tags: ['x'] },
            { name: 'keywords', tags: ['k'] },
          ],
        },
      });

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        'user-1'
      );

      // No board created, and the smuggled 'task' tagset was removed.
      expect(tagsetTemplateService.save).not.toHaveBeenCalled();
      expect(
        calloutData.classification.tagsets.map((t: any) => t.name)
      ).toEqual(['keywords']);
    });

    it('strips a generic task tagset even when a taskBoard block is present', async () => {
      const calloutData = boardInput({
        taskBoard: {},
        classification: {
          tagsets: [{ name: 'task', tags: ['smuggled'] }],
        },
      });

      await service.createCallout(
        calloutData,
        tagsetTemplates,
        storageAggregator,
        actorContextData.actorContext,
        'user-1'
      );

      expect(calloutData.classification.tagsets).toEqual([]);
      // The board's own marker template is still created from the taskBoard block.
      expect(tagsetTemplateService.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCalloutOrFail', () => {
    it('should return callout when found', async () => {
      const callout = { id: 'callout-1' } as Callout;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getCalloutOrFail('callout-1');

      expect(result).toBe(callout);
    });

    it('should throw EntityNotFoundException when callout is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

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
      vi.mocked(repository.findOne).mockResolvedValue(callout);
      vi.mocked(repository.save).mockResolvedValue(callout);

      await service.updateCalloutVisibility({
        calloutID: 'callout-1',
        visibility: CalloutVisibility.PUBLISHED,
      } as any);

      expect(callout.settings.visibility).toBe(CalloutVisibility.PUBLISHED);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateCalloutPublishInfo', () => {
    it('should update publishedBy when publisher ID is provided', async () => {
      const callout = { id: 'callout-1' } as any;
      const publisher = { id: 'real-user-id' };

      vi.mocked(userLookupService.getUserById).mockResolvedValue(
        publisher as any
      );
      vi.mocked(repository.save).mockResolvedValue(callout);

      await service.updateCalloutPublishInfo(callout, 'publisher-uuid');

      expect(callout.publishedBy).toBe('real-user-id');
    });

    it('should set publishedBy to empty string when publisher not found', async () => {
      const callout = { id: 'callout-1' } as any;

      vi.mocked(userLookupService.getUserById).mockResolvedValue(
        undefined as any
      );
      vi.mocked(repository.save).mockResolvedValue(callout);

      await service.updateCalloutPublishInfo(callout, 'nonexistent-uuid');

      expect(callout.publishedBy).toBe('');
    });

    it('should update publishedDate when timestamp is provided', async () => {
      const callout = { id: 'callout-1' } as any;
      const timestamp = Date.now();

      vi.mocked(repository.save).mockResolvedValue(callout);

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

      vi.mocked(repository.findOne).mockResolvedValue(callout);

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
      // The callout row is removed via the transaction-scoped manager.
      expect(mockManager.remove).toHaveBeenCalledWith(callout);
      expect(result.id).toBe('callout-1');
    });

    it('should throw EntityNotInitializedException when callout is not fully initialized', async () => {
      const callout = {
        id: 'callout-1',
        contributionDefaults: undefined,
        settings: undefined,
        contributions: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

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

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await service.deleteCallout('callout-1');

      expect(roomService.deleteRoom).not.toHaveBeenCalled();
    });

    it('deletes all reactions and removes the Callout row in the same transaction', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: undefined,
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const callOrder: string[] = [];
      vi.mocked(reactionService.deleteAllForEntity).mockImplementation(
        async () => {
          callOrder.push('deleteAllForEntity');
        }
      );
      mockManager.remove.mockImplementation(async () => {
        callOrder.push('managerRemove');
        return { id: undefined };
      });

      await service.deleteCallout('callout-1');

      // The reaction delete is enrolled in the same transaction: it receives
      // the transaction-scoped manager as its third argument.
      expect(reactionService.deleteAllForEntity).toHaveBeenCalledWith(
        ReactionType.POST,
        'callout-1',
        mockManager
      );
      // Reaction cleanup must happen before the row is removed.
      expect(callOrder.indexOf('deleteAllForEntity')).toBeLessThan(
        callOrder.indexOf('managerRemove')
      );
      // Both DB writes ran inside a single transaction.
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
    });

    it('does not remove the Callout row when the reaction delete fails (transaction rolls back)', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: { id: 'room-1' },
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);
      // The reaction delete throws inside the transaction; a real transaction
      // would roll back and never remove the callout row.
      vi.mocked(reactionService.deleteAllForEntity).mockRejectedValue(
        new Error('reaction delete failed')
      );

      await expect(service.deleteCallout('callout-1')).rejects.toThrow(
        'reaction delete failed'
      );

      // The callout row removal must not run once the reaction delete fails.
      expect(mockManager.remove).not.toHaveBeenCalled();
      // The external Matrix room deletion happens BEFORE the transaction, so it
      // still runs regardless of the DB rollback.
      expect(roomService.deleteRoom).toHaveBeenCalledWith({ roomID: 'room-1' });
    });

    it("removes a board's standalone column template last, after the callout row is gone", async () => {
      const boardTemplate = { id: 'tmpl-1' };
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: undefined,
        authorization: { id: 'auth-1' },
        classification: {
          id: 'cls-1',
          tagsets: [
            {
              name: TagsetReservedName.TASK,
              tags: ['Backlog'],
              tagsetTemplate: boardTemplate,
            },
          ],
        },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const callOrder: string[] = [];
      mockManager.remove.mockImplementation(async () => {
        callOrder.push('managerRemove');
        return { id: undefined };
      });
      vi.mocked(classificationService.deleteClassification).mockImplementation(
        async () => {
          callOrder.push('deleteClassification');
          return {} as any;
        }
      );
      vi.mocked(tagsetTemplateService.removeTagsetTemplate).mockImplementation(
        async () => {
          callOrder.push('removeTagsetTemplate');
          return boardTemplate as any;
        }
      );

      await service.deleteCallout('callout-1');

      // The driving template is a standalone row owned only by the board callout;
      // it can only be dropped once the classification whose marker tagset
      // references it is gone. The callout's own classification is NOT
      // cascade-removed with the callout row, so it is deleted explicitly
      // (releasing the FK) before the template.
      expect(classificationService.deleteClassification).toHaveBeenCalledWith(
        'cls-1'
      );
      expect(tagsetTemplateService.removeTagsetTemplate).toHaveBeenCalledWith(
        boardTemplate
      );
      expect(callOrder.indexOf('managerRemove')).toBeLessThan(
        callOrder.indexOf('deleteClassification')
      );
      expect(callOrder.indexOf('deleteClassification')).toBeLessThan(
        callOrder.indexOf('removeTagsetTemplate')
      );
    });

    it('leaves the template service untouched for a plain (non-board) callout', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: { contribution: {} },
        comments: undefined,
        authorization: { id: 'auth-1' },
        classification: {
          id: 'cls-1',
          tagsets: [{ name: TagsetReservedName.KEYWORDS, tags: ['x'] }],
        },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await service.deleteCallout('callout-1');

      expect(tagsetTemplateService.removeTagsetTemplate).not.toHaveBeenCalled();
      // The explicit classification cleanup is board-only (guarded by the
      // presence of a standalone board template); a plain callout skips it.
      expect(classificationService.deleteClassification).not.toHaveBeenCalled();
    });
  });

  describe('getStorageBucket', () => {
    it('should return storage bucket from framing profile', async () => {
      const storageBucket = { id: 'sb-1' };
      const callout = {
        id: 'callout-1',
        framing: { profile: { storageBucket } },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getStorageBucket('callout-1');

      expect(result).toBe(storageBucket);
    });

    it('should throw RelationshipNotFoundException when no storage bucket exists', async () => {
      const callout = {
        id: 'callout-1',
        framing: { profile: { storageBucket: undefined } },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await expect(service.getStorageBucket('callout-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getClassification', () => {
    it('should return classification when it exists', async () => {
      const classification = { id: 'class-1' };
      const callout = { id: 'callout-1', classification } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getClassification('callout-1');

      expect(result).toBe(classification);
    });

    it('should throw RelationshipNotFoundException when classification is missing', async () => {
      const callout = {
        id: 'callout-1',
        classification: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

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

      vi.mocked(repository.findOne).mockResolvedValue(callout);
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

      vi.mocked(repository.findOne).mockResolvedValue(callout);

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

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getContributionDefaults('callout-1');

      expect(result).toBe(defaults);
    });

    it('should throw EntityNotInitializedException when contribution defaults missing', async () => {
      const callout = {
        id: 'callout-1',
        contributionDefaults: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await expect(
        service.getContributionDefaults('callout-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getCalloutFraming', () => {
    it('should return framing when initialized', async () => {
      const framing = { id: 'framing-1' };
      const callout = { id: 'callout-1', framing } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getCalloutFraming('callout-1');

      expect(result).toBe(framing);
    });

    it('should throw EntityNotFoundException when framing is not initialized', async () => {
      const callout = { id: 'callout-1', framing: undefined } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await expect(service.getCalloutFraming('callout-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateCallout', () => {
    it('should update callout framing, settings, classification, and save', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1' },
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          contribution: { allowedTypes: [] },
          framing: { commentsEnabled: false },
        },
        classification: { id: 'class-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        isTemplate: false,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);
      vi.mocked(repository.save).mockResolvedValue(callout);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);

      vi.mocked(framingService.updateCalloutFraming).mockResolvedValue({
        id: 'framing-1-updated',
      } as any);
      vi.mocked(classificationService.updateClassification).mockReturnValue({
        id: 'class-updated',
      } as any);

      const contributionDefaultsService = module.get(
        CalloutContributionDefaultsService
      );
      vi.mocked(
        contributionDefaultsService.updateCalloutContributionDefaults
      ).mockReturnValue({ id: 'defaults-updated' } as any);

      const result = await service.updateCallout(
        callout,
        {
          framing: { profile: { displayName: 'Updated' } },
          settings: { contribution: { enabled: true } },
          classification: { tagsets: [] },
          contributionDefaults: {},
          sortOrder: 5,
        } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(framingService.updateCalloutFraming).toHaveBeenCalled();
      expect(classificationService.updateClassification).toHaveBeenCalled();
      expect(result.sortOrder).toBe(5);
    });

    it('should throw EntityNotInitializedException when contributionDefaults is missing', async () => {
      const callout = {
        id: 'callout-1',
        contributionDefaults: undefined,
        settings: { contribution: undefined },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);

      await expect(
        service.updateCallout(callout, {} as any, actorContextData.actorContext)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should create comments room when enabled and not existing', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'test',
        framing: { id: 'framing-1' },
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          contribution: { allowedTypes: [] },
          framing: { commentsEnabled: true },
        },
        classification: { id: 'class-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        isTemplate: false,
        comments: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);
      vi.mocked(repository.save).mockResolvedValue(callout);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);
      vi.mocked(roomService.createRoom).mockResolvedValue({
        id: 'new-room',
      } as any);

      await service.updateCallout(
        callout,
        {} as any,
        actorContextData.actorContext
      );

      expect(roomService.createRoom).toHaveBeenCalled();
    });

    // Regression: changing a CONTRIBUTORS callout to another framing type must
    // strip the stored contributors settings block, otherwise
    // validateAndNormalizeContributorsSettings throws on a non-CONTRIBUTORS
    // framing that still carries contributors and the callout gets stuck.
    it('strips the stale contributors settings block when the framing type changes away from CONTRIBUTORS', async () => {
      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1', type: CalloutFramingType.CONTRIBUTORS },
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          contribution: { allowedTypes: [] },
          framing: {
            commentsEnabled: false,
            contributors: {
              contributorTypes: ['user'],
              defaultContributorType: 'user',
              defaultView: 'list',
            },
          },
        },
        classification: { id: 'class-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        isTemplate: false,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);
      vi.mocked(repository.save).mockResolvedValue(callout);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);

      // The framing type is cleared to NONE on this update.
      vi.mocked(framingService.updateCalloutFraming).mockResolvedValue({
        id: 'framing-1',
        type: CalloutFramingType.NONE,
      } as any);
      // Capture the settings the validation receives — it must no longer carry
      // a contributors block (so the real validation would not throw).
      vi.mocked(
        framingService.validateAndNormalizeContributorsSettings
      ).mockImplementation((_type, settings) => settings as any);
      // workspace#025: validateAndNormalizeSelectionSettings must also be a
      // pass-through here so callout.settings.framing stays a plain object.
      vi.mocked(
        framingService.validateAndNormalizeSelectionSettings
      ).mockImplementation((_type, settings) => settings as any);

      await service.updateCallout(
        callout,
        { framing: { type: CalloutFramingType.NONE } } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(callout.settings.framing.contributors).toBeUndefined();
      expect(
        framingService.validateAndNormalizeContributorsSettings
      ).toHaveBeenCalledWith(
        CalloutFramingType.NONE,
        expect.not.objectContaining({ contributors: expect.anything() })
      );
    });
  });

  describe('getComments', () => {
    it('should return comments when they exist', async () => {
      const comments = { id: 'room-1' };
      const callout = { id: 'callout-1', comments } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getComments('callout-1');

      expect(result).toBe(comments);
    });

    it('should return undefined when no comments', async () => {
      const callout = { id: 'callout-1', comments: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getComments('callout-1');

      expect(result).toBeUndefined();
    });
  });

  describe('getContributions', () => {
    it('should return all contributions when no IDs specified', async () => {
      const contributions = [{ id: 'c-1' }, { id: 'c-2' }];
      const callout = { id: 'callout-1', contributions } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getContributions(callout);

      expect(result).toHaveLength(2);
    });

    it('should return only matching contributions when IDs specified', async () => {
      const contributions = [{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }];
      const callout = { id: 'callout-1', contributions } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getContributions(callout, ['c-1', 'c-3']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c-1');
      expect(result[1].id).toBe('c-3');
    });

    it('should throw EntityNotFoundException when contributions not initialized', async () => {
      const callout = { id: 'callout-1', contributions: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await expect(service.getContributions(callout)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should skip non-matching contribution IDs silently', async () => {
      const contributions = [{ id: 'c-1' }];
      const callout = { id: 'callout-1', contributions } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const result = await service.getContributions(callout, [
        'c-1',
        'nonexistent',
      ]);

      expect(result).toHaveLength(1);
    });
  });

  describe('createContributionOnCallout', () => {
    it('should create a contribution and set default sort order', async () => {
      const callout = {
        id: 'callout-1',
        settings: { contribution: { allowedTypes: [] } },
        contributions: [{ sortOrder: 5 }, { sortOrder: 3 }],
        posts: [],
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const _namingServiceRef = module.get(NamingService);
      vi.mocked(
        _namingServiceRef.getReservedNameIDsInCalloutContributions
      ).mockResolvedValue([]);

      const storageAggregatorResolverService = module.get(
        StorageAggregatorResolverService
      );
      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);

      const contribution = { id: 'contrib-1', callout: undefined } as any;
      vi.mocked(
        contributionService.createCalloutContribution
      ).mockResolvedValue(contribution);
      vi.mocked(contributionService.save).mockResolvedValue(contribution);

      const result = await service.createContributionOnCallout(
        { calloutID: 'callout-1' } as any,
        actorContextData.actorContext,
        'user-1'
      );

      expect(result).toBe(contribution);
      expect(contribution.callout).toBe(callout);
    });

    it('injects the Callout-owned canonical default when a Whiteboard contribution is profile-only', async () => {
      const callout = {
        id: 'callout-1',
        settings: { contribution: { allowedTypes: [] } },
        contributionDefaults: { whiteboardContent: 'canonical-default' },
        framing: { profile: { storageBucket: { id: 'callout-bucket' } } },
        contributions: [],
        posts: [],
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(callout);
      vi.mocked(
        _namingService.getReservedNameIDsInCalloutContributions
      ).mockResolvedValue([]);
      vi.mocked(
        _storageAggregatorResolverService.getStorageAggregatorForCallout
      ).mockResolvedValue({ id: 'agg-1' } as any);
      const contribution = { id: 'contrib-1' } as any;
      vi.mocked(
        contributionService.createCalloutContribution
      ).mockResolvedValue(contribution);
      vi.mocked(contributionService.save).mockResolvedValue(contribution);
      const input = {
        calloutID: 'callout-1',
        whiteboard: { profile: { displayName: 'New Whiteboard' } },
      } as any;

      await service.createContributionOnCallout(
        input,
        actorContextData.actorContext,
        'user-1'
      );

      expect(input.whiteboard).toMatchObject({
        content: 'canonical-default',
        sourceStorageBucketID: 'callout-bucket',
      });
      expect(
        contributionService.createCalloutContribution
      ).toHaveBeenCalledWith(
        input,
        { id: 'agg-1' },
        callout.settings.contribution,
        undefined,
        actorContextData.actorContext,
        'user-1',
        undefined
      );
    });

    it('should throw EntityNotInitializedException when contributions setting is missing', async () => {
      const callout = {
        id: 'callout-1',
        settings: { contribution: undefined },
        contributions: [],
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      await expect(
        service.createContributionOnCallout(
          { calloutID: 'callout-1' } as any,
          actorContextData.actorContext,
          'user-1'
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when contributions are not loaded', async () => {
      const callout = {
        id: 'callout-1',
        settings: { contribution: { allowedTypes: [] } },
        contributions: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(callout);

      const _namingServiceRef = module.get(NamingService);
      vi.mocked(
        _namingServiceRef.getReservedNameIDsInCalloutContributions
      ).mockResolvedValue([]);

      await expect(
        service.createContributionOnCallout(
          { calloutID: 'callout-1' } as any,
          actorContextData.actorContext,
          'user-1'
        )
      ).rejects.toThrow(EntityNotInitializedException);
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
      } as any;

      // getComments path
      vi.mocked(repository.findOne).mockResolvedValue({
        ...callout,
        comments: { id: 'room-1' },
      });
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
