import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { InnovationFlowService } from '../innovation-flow/innovation.flow.service';
import { Collaboration } from './collaboration.entity';
import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let repository: Repository<Collaboration>;
  let calloutsSetService: CalloutsSetService;
  let innovationFlowService: InnovationFlowService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let timelineService: TimelineService;
  let licenseService: LicenseService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static Collaboration.create to avoid DataSource requirement
    vi.spyOn(Collaboration, 'create').mockImplementation((input: any) => {
      const entity = new Collaboration();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        repositoryProviderMockFactory(Collaboration),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            findOne: vi.fn(),
            find: vi.fn(),
            connection: {
              query: vi.fn(),
            },
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationService);
    repository = module.get(getRepositoryToken(Collaboration));
    calloutsSetService = module.get(CalloutsSetService);
    innovationFlowService = module.get(InnovationFlowService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    timelineService = module.get(TimelineService);
    licenseService = module.get(LicenseService);
  });

  describe('createCollaboration', () => {
    const storageAggregator = { id: 'agg-1' } as any;

    it('should throw RelationshipNotFoundException when calloutsSetData is missing', async () => {
      const collaborationData = {
        calloutsSetData: undefined,
        innovationFlowData: { states: [] },
      } as any;

      await expect(
        service.createCollaboration(collaborationData, storageAggregator)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when innovationFlowData is missing', async () => {
      const collaborationData = {
        calloutsSetData: { calloutsData: [] },
        innovationFlowData: undefined,
      } as any;

      await expect(
        service.createCollaboration(collaborationData, storageAggregator)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should create a non-template collaboration with timeline', async () => {
      const collaborationData = {
        calloutsSetData: { calloutsData: [] },
        innovationFlowData: {
          states: [{ displayName: 'State A', sortOrder: 1 }],
          currentStateDisplayName: 'State A',
        },
        isTemplate: false,
      } as any;

      const calloutsSet = {
        id: 'cs-1',
        callouts: [],
        tagsetTemplateSet: {
          id: 'tts-1',
          tagsetTemplates: [],
        },
      } as any;

      vi.mocked(calloutsSetService.createCalloutsSet).mockReturnValue(
        calloutsSet
      );
      vi.mocked(calloutsSetService.addTagsetTemplate).mockReturnValue({
        id: 'tts-1',
        tagsetTemplates: [
          {
            name: 'flow-state',
            allowedValues: ['State A'],
          },
        ],
      } as any);
      vi.mocked(calloutsSetService.save).mockResolvedValue(calloutsSet);
      vi.mocked(calloutsSetService.getTagsetTemplate).mockReturnValue({
        name: 'flow-state',
        allowedValues: ['State A'],
      } as any);
      vi.mocked(timelineService.createTimeline).mockReturnValue({
        id: 'timeline-1',
      } as any);
      vi.mocked(licenseService.createLicense).mockReturnValue({
        id: 'license-1',
      } as any);
      vi.mocked(innovationFlowService.createInnovationFlow).mockResolvedValue({
        id: 'flow-1',
      } as any);

      const result = await service.createCollaboration(
        collaborationData,
        storageAggregator
      );

      expect(result.authorization).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.isTemplate).toBe(false);
      expect(timelineService.createTimeline).toHaveBeenCalled();
    });

    it('should create a template collaboration without timeline', async () => {
      const collaborationData = {
        calloutsSetData: { calloutsData: [] },
        innovationFlowData: {
          states: [{ displayName: 'State A', sortOrder: 1 }],
        },
        isTemplate: true,
      } as any;

      const calloutsSet = {
        id: 'cs-1',
        callouts: [],
        tagsetTemplateSet: { id: 'tts-1', tagsetTemplates: [] },
      } as any;

      vi.mocked(calloutsSetService.createCalloutsSet).mockReturnValue(
        calloutsSet
      );
      vi.mocked(calloutsSetService.addTagsetTemplate).mockReturnValue({
        id: 'tts-1',
        tagsetTemplates: [{ name: 'flow-state', allowedValues: ['State A'] }],
      } as any);
      vi.mocked(calloutsSetService.save).mockResolvedValue(calloutsSet);
      vi.mocked(calloutsSetService.getTagsetTemplate).mockReturnValue({
        name: 'flow-state',
        allowedValues: ['State A'],
      } as any);
      vi.mocked(licenseService.createLicense).mockReturnValue({
        id: 'license-1',
      } as any);
      vi.mocked(innovationFlowService.createInnovationFlow).mockResolvedValue({
        id: 'flow-1',
      } as any);

      const result = await service.createCollaboration(
        collaborationData,
        storageAggregator
      );

      expect(result.isTemplate).toBe(true);
      expect(result.timeline).toBeUndefined();
      expect(timelineService.createTimeline).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when flow states tagset template is not found', async () => {
      const collaborationData = {
        calloutsSetData: { calloutsData: [] },
        innovationFlowData: {
          states: [{ displayName: 'State A', sortOrder: 1 }],
        },
      } as any;

      const calloutsSet = {
        id: 'cs-1',
        callouts: [],
        tagsetTemplateSet: { id: 'tts-1', tagsetTemplates: [] },
      } as any;

      vi.mocked(calloutsSetService.createCalloutsSet).mockReturnValue(
        calloutsSet
      );
      vi.mocked(calloutsSetService.addTagsetTemplate).mockReturnValue({
        id: 'tts-1',
        tagsetTemplates: [],
      } as any);
      vi.mocked(calloutsSetService.save).mockResolvedValue(calloutsSet);
      vi.mocked(calloutsSetService.getTagsetTemplate).mockReturnValue(
        undefined
      );
      vi.mocked(licenseService.createLicense).mockReturnValue({
        id: 'license-1',
      } as any);

      await expect(
        service.createCollaboration(collaborationData, storageAggregator)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('getCollaborationOrFail', () => {
    it('should return collaboration when found', async () => {
      const collaboration = { id: 'collab-1' } as Collaboration;
      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      const result = await service.getCollaborationOrFail('collab-1');

      expect(result).toBe(collaboration);
    });

    it('should throw EntityNotFoundException when collaboration is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getCollaborationOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deleteCollaborationOrFail', () => {
    it('should delete all associated entities', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: { id: 'cs-1' },
        timeline: { id: 'tl-1' },
        innovationFlow: { id: 'flow-1' },
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);
      vi.mocked(repository.remove).mockResolvedValue(collaboration);

      await service.deleteCollaborationOrFail('collab-1');

      expect(calloutsSetService.deleteCalloutsSet).toHaveBeenCalledWith('cs-1');
      expect(timelineService.deleteTimeline).toHaveBeenCalledWith('tl-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        collaboration.authorization
      );
      expect(innovationFlowService.deleteInnovationFlow).toHaveBeenCalledWith(
        'flow-1'
      );
      expect(licenseService.removeLicenseOrFail).toHaveBeenCalledWith('lic-1');
    });

    it('should throw RelationshipNotFoundException when missing child entities', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: undefined,
        innovationFlow: { id: 'flow-1' },
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      await expect(
        service.deleteCollaborationOrFail('collab-1')
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should skip deleting timeline when collaboration has no timeline (template)', async () => {
      const collaboration = {
        id: 'collab-1',
        calloutsSet: { id: 'cs-1' },
        timeline: undefined,
        innovationFlow: { id: 'flow-1' },
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);
      vi.mocked(repository.remove).mockResolvedValue(collaboration);

      await service.deleteCollaborationOrFail('collab-1');

      expect(timelineService.deleteTimeline).not.toHaveBeenCalled();
    });
  });

  describe('getTimelineOrFail', () => {
    it('should return timeline when it exists', async () => {
      const timeline = { id: 'tl-1' };
      const collaboration = { id: 'collab-1', timeline } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      const result = await service.getTimelineOrFail('collab-1');

      expect(result).toBe(timeline);
    });

    it('should throw EntityNotFoundException when timeline is missing', async () => {
      const collaboration = {
        id: 'collab-1',
        timeline: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      await expect(service.getTimelineOrFail('collab-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getChildCollaborationsOrFail', () => {
    let entityManager: any;

    beforeEach(() => {
      entityManager = {
        findOne: vi.fn(),
        find: vi.fn(),
        connection: { query: vi.fn() },
      };
      // Access the private entityManager via the service
      (service as any).entityManager = entityManager;
    });

    it('should throw EntityNotFoundException when space is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getChildCollaborationsOrFail('collab-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return collaborations for L0 space', async () => {
      const space = { id: 'space-1', level: 0 };
      entityManager.findOne.mockResolvedValue(space);
      entityManager.find.mockResolvedValue([
        { id: 'sub-1', level: 1, collaboration: { id: 'collab-sub-1' } },
        { id: 'sub-2', level: 1, collaboration: { id: 'collab-sub-2' } },
      ]);

      const result = await service.getChildCollaborationsOrFail('collab-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'collab-sub-1' });
    });

    it('should throw EntityNotInitializedException when L0 subspace has no collaboration', async () => {
      const space = { id: 'space-1', level: 0 };
      entityManager.findOne.mockResolvedValue(space);
      entityManager.find.mockResolvedValue([
        { id: 'sub-1', level: 1, collaboration: undefined },
      ]);

      await expect(
        service.getChildCollaborationsOrFail('collab-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should return collaborations for L1 space with subspaces', async () => {
      const space = {
        id: 'space-1',
        level: 1,
        subspaces: [
          { id: 'ss-1', collaboration: { id: 'collab-ss-1' } },
          { id: 'ss-2', collaboration: { id: 'collab-ss-2' } },
        ],
      };
      entityManager.findOne.mockResolvedValue(space);

      const result = await service.getChildCollaborationsOrFail('collab-1');

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotInitializedException when L1 subspaces are missing', async () => {
      const space = {
        id: 'space-1',
        level: 1,
        subspaces: undefined,
      };
      entityManager.findOne.mockResolvedValue(space);

      await expect(
        service.getChildCollaborationsOrFail('collab-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L1 subsubspace has no collaboration', async () => {
      const space = {
        id: 'space-1',
        level: 1,
        subspaces: [{ id: 'ss-1', collaboration: undefined }],
      };
      entityManager.findOne.mockResolvedValue(space);

      await expect(
        service.getChildCollaborationsOrFail('collab-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should return empty array for space level other than L0 or L1', async () => {
      const space = {
        id: 'space-1',
        level: 2,
        subspaces: [],
      };
      entityManager.findOne.mockResolvedValue(space);

      const result = await service.getChildCollaborationsOrFail('collab-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPostsCount', () => {
    let entityManager: any;

    beforeEach(() => {
      entityManager = {
        findOne: vi.fn(),
        find: vi.fn(),
        connection: { query: vi.fn() },
      };
      (service as any).entityManager = entityManager;
    });

    it('should return the posts count from raw query', async () => {
      entityManager.connection.query.mockResolvedValue([{ postsCount: 5 }]);

      const result = await service.getPostsCount({ id: 'cs-1' } as any);

      expect(result).toBe(5);
      expect(entityManager.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('callout_contribution'),
        expect.arrayContaining(['cs-1'])
      );
    });
  });

  describe('getWhiteboardsCount', () => {
    let entityManager: any;

    beforeEach(() => {
      entityManager = {
        findOne: vi.fn(),
        find: vi.fn(),
        connection: { query: vi.fn() },
      };
      (service as any).entityManager = entityManager;
    });

    it('should return the whiteboards count from raw query', async () => {
      entityManager.connection.query.mockResolvedValue([
        { whiteboardsCount: 3 },
      ]);

      const result = await service.getWhiteboardsCount({
        id: 'cs-1',
      } as any);

      expect(result).toBe(3);
      expect(entityManager.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('whiteboardId'),
        expect.arrayContaining(['cs-1'])
      );
    });
  });

  describe('getInnovationFlow', () => {
    it('should return innovation flow when it exists', async () => {
      const innovationFlow = { id: 'flow-1' };
      const collaboration = { id: 'collab-1', innovationFlow } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      const result = await service.getInnovationFlow('collab-1');

      expect(result).toBe(innovationFlow);
    });

    it('should throw RelationshipNotFoundException when innovation flow is missing', async () => {
      const collaboration = {
        id: 'collab-1',
        innovationFlow: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(collaboration);

      await expect(service.getInnovationFlow('collab-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
