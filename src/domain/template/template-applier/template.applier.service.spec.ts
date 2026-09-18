import { ForbiddenException } from '@common/exceptions';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { Test, TestingModule } from '@nestjs/testing';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateService } from '../template/template.service';
import { TemplateApplierService } from './template.applier.service';

describe('TemplateApplierService', () => {
  let service: TemplateApplierService;
  let templateService: Mocked<TemplateService>;
  let innovationFlowService: Mocked<InnovationFlowService>;
  let calloutsSetService: Mocked<CalloutsSetService>;
  let calloutService: Mocked<CalloutService>;
  let inputCreatorService: Mocked<InputCreatorService>;
  let storageAggregatorResolverService: Mocked<StorageAggregatorResolverService>;
  let collaborationService: Mocked<CollaborationService>;
  let authorizationService: Mocked<AuthorizationService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateApplierService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateApplierService);
    templateService = module.get(TemplateService) as Mocked<TemplateService>;
    innovationFlowService = module.get(
      InnovationFlowService
    ) as Mocked<InnovationFlowService>;
    calloutsSetService = module.get(
      CalloutsSetService
    ) as Mocked<CalloutsSetService>;
    calloutService = module.get(CalloutService) as Mocked<CalloutService>;
    inputCreatorService = module.get(
      InputCreatorService
    ) as Mocked<InputCreatorService>;
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    ) as Mocked<StorageAggregatorResolverService>;
    collaborationService = module.get(
      CollaborationService
    ) as Mocked<CollaborationService>;
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
  });

  describe('updateCollaborationFromSpaceTemplate', () => {
    it('should throw RelationshipNotFoundException when template has no content space collaboration', async () => {
      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: undefined,
      } as any);

      const updateData = {
        collaborationID: 'collab-1',
        spaceTemplateID: 'tpl-1',
        addCallouts: false,
        deleteExistingCallouts: false,
      };
      const targetCollab = { id: 'collab-1' } as any;

      await expect(
        service.updateCollaborationFromSpaceTemplate(
          updateData,
          targetCollab,
          actorContextData.actorContext
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when contentSpace.collaboration is null', async () => {
      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: { collaboration: undefined },
      } as any);

      const updateData = {
        collaborationID: 'collab-1',
        spaceTemplateID: 'tpl-1',
        addCallouts: false,
        deleteExistingCallouts: false,
      };

      await expect(
        service.updateCollaborationFromSpaceTemplate(
          updateData,
          { id: 'collab-1' } as any,
          actorContextData.actorContext
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when target collaboration is not fully loaded', async () => {
      const templateWithContent = {
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: {
            innovationFlow: { states: [] },
            calloutsSet: { callouts: [] },
          },
        },
      };
      templateService.getTemplateOrFail.mockResolvedValue(
        templateWithContent as any
      );

      // Target collaboration missing innovationFlow
      const targetCollab = {
        id: 'collab-1',
        innovationFlow: undefined,
        calloutsSet: { callouts: [] },
      } as any;

      const updateData = {
        collaborationID: 'collab-1',
        spaceTemplateID: 'tpl-1',
        addCallouts: false,
        deleteExistingCallouts: false,
      };

      await expect(
        service.updateCollaborationFromSpaceTemplate(
          updateData,
          targetCollab,
          actorContextData.actorContext
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete existing callouts when deleteExistingCallouts is true', async () => {
      const sourceCollab = {
        innovationFlow: {
          states: [{ displayName: 'State1' }],
        },
        calloutsSet: { callouts: [] },
      };

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: sourceCollab,
        },
      } as any);

      const existingCallout = { id: 'existing-callout-1' };
      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [{ displayName: 'OldState' }] },
        calloutsSet: { callouts: [existingCallout] },
      } as any;

      calloutService.deleteCallout.mockResolvedValue({} as any);
      inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState.mockReturnValue(
        []
      );
      innovationFlowService.updateInnovationFlowStatesFromTemplate.mockResolvedValue(
        {} as any
      );
      storageAggregatorResolverService.getStorageAggregatorForCollaboration.mockResolvedValue(
        {} as any
      );
      templateService.ensureCalloutsInValidGroupsAndStates.mockReturnValue(
        undefined as any
      );
      collaborationService.save.mockResolvedValue(targetCollab);

      await service.updateCollaborationFromSpaceTemplate(
        {
          collaborationID: 'collab-1',
          spaceTemplateID: 'tpl-1',
          addCallouts: false,
          deleteExistingCallouts: true,
        },
        targetCollab,
        actorContextData.actorContext
      );

      expect(calloutService.deleteCallout).toHaveBeenCalledWith(
        'existing-callout-1'
      );
      expect(targetCollab.calloutsSet.callouts).toEqual([]);
    });

    it('should not delete existing callouts when the flow-state update rejects (atomicity)', async () => {
      const sourceCollab = {
        innovationFlow: {
          states: [{ displayName: 'State1' }],
        },
        calloutsSet: { callouts: [] },
      };

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: sourceCollab,
        },
      } as any);

      const existingCallout = { id: 'existing-callout-1' };
      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [{ displayName: 'OldState' }] },
        calloutsSet: { callouts: [existingCallout] },
      } as any;

      inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState.mockReturnValue(
        []
      );
      // Simulate an L0 overflow rejection from the flow-state update.
      innovationFlowService.updateInnovationFlowStatesFromTemplate.mockRejectedValue(
        new Error('overflow')
      );

      await expect(
        service.updateCollaborationFromSpaceTemplate(
          {
            collaborationID: 'collab-1',
            spaceTemplateID: 'tpl-1',
            addCallouts: false,
            deleteExistingCallouts: true,
          },
          targetCollab,
          actorContextData.actorContext
        )
      ).rejects.toThrow('overflow');

      // Atomicity: no callouts deleted, and the original callout is preserved.
      expect(calloutService.deleteCallout).not.toHaveBeenCalled();
      expect(targetCollab.calloutsSet.callouts).toEqual([existingCallout]);
    });

    it('should add callouts from source when addCallouts is true', async () => {
      const sourceCallouts = [{ id: 'src-callout-1' }];
      const sourceCollab = {
        innovationFlow: { states: [{ displayName: 'New' }] },
        calloutsSet: { callouts: sourceCallouts },
      };

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: sourceCollab,
        },
      } as any);

      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [{ displayName: 'Old' }] },
        calloutsSet: { callouts: [] },
      } as any;

      inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState.mockReturnValue(
        [{ displayName: 'New' }] as any
      );
      innovationFlowService.updateInnovationFlowStatesFromTemplate.mockResolvedValue(
        {} as any
      );
      storageAggregatorResolverService.getStorageAggregatorForCollaboration.mockResolvedValue(
        {} as any
      );
      inputCreatorService.buildCreateCalloutInputsFromCallouts.mockResolvedValue(
        [{ nameID: 'new-callout' }] as any
      );
      calloutsSetService.addCallouts.mockResolvedValue([
        { id: 'new-c-1' },
      ] as any);
      templateService.ensureCalloutsInValidGroupsAndStates.mockReturnValue(
        undefined as any
      );
      collaborationService.save.mockResolvedValue(targetCollab);

      await service.updateCollaborationFromSpaceTemplate(
        {
          collaborationID: 'collab-1',
          spaceTemplateID: 'tpl-1',
          addCallouts: true,
          deleteExistingCallouts: false,
        },
        targetCollab,
        actorContextData.actorContext
      );

      expect(calloutsSetService.addCallouts).toHaveBeenCalled();
    });

    it('should update innovation flow states from source template', async () => {
      const sourceStates = [
        { displayName: 'Explore' },
        { displayName: 'Develop' },
      ];
      const sourceCollab = {
        innovationFlow: { states: sourceStates },
        calloutsSet: { callouts: [] },
      };

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: sourceCollab,
        },
      } as any);

      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [{ displayName: 'Old' }] },
        calloutsSet: { callouts: [] },
      } as any;

      const stateInputs = [
        { displayName: 'Explore' },
        { displayName: 'Develop' },
      ];
      inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState.mockReturnValue(
        stateInputs as any
      );
      innovationFlowService.updateInnovationFlowStatesFromTemplate.mockResolvedValue(
        {
          states: sourceStates,
        } as any
      );
      storageAggregatorResolverService.getStorageAggregatorForCollaboration.mockResolvedValue(
        {} as any
      );
      templateService.ensureCalloutsInValidGroupsAndStates.mockReturnValue(
        undefined as any
      );
      collaborationService.save.mockResolvedValue(targetCollab);

      await service.updateCollaborationFromSpaceTemplate(
        {
          collaborationID: 'collab-1',
          spaceTemplateID: 'tpl-1',
          addCallouts: false,
          deleteExistingCallouts: false,
        },
        targetCollab,
        actorContextData.actorContext
      );

      expect(
        innovationFlowService.updateInnovationFlowStatesFromTemplate
      ).toHaveBeenCalledWith(
        expect.objectContaining({ states: [{ displayName: 'Old' }] }),
        stateInputs
      );
    });

    it('should call ensureCalloutsInValidGroupsAndStates and save', async () => {
      const sourceCollab = {
        innovationFlow: { states: [] },
        calloutsSet: { callouts: [] },
      };

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        contentSpace: {
          id: 'tcs-1',
          collaboration: sourceCollab,
        },
      } as any);

      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [] },
        calloutsSet: { callouts: [] },
      } as any;

      inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState.mockReturnValue(
        []
      );
      innovationFlowService.updateInnovationFlowStatesFromTemplate.mockResolvedValue(
        {} as any
      );
      storageAggregatorResolverService.getStorageAggregatorForCollaboration.mockResolvedValue(
        {} as any
      );
      templateService.ensureCalloutsInValidGroupsAndStates.mockReturnValue(
        undefined as any
      );
      collaborationService.save.mockResolvedValue(targetCollab);

      await service.updateCollaborationFromSpaceTemplate(
        {
          collaborationID: 'collab-1',
          spaceTemplateID: 'tpl-1',
          addCallouts: false,
          deleteExistingCallouts: false,
        },
        targetCollab,
        actorContextData.actorContext
      );

      expect(
        templateService.ensureCalloutsInValidGroupsAndStates
      ).toHaveBeenCalledWith(targetCollab);
      expect(collaborationService.save).toHaveBeenCalledWith(targetCollab);
    });

    // The resolver only authorizes UPDATE on the TARGET collaboration; without a
    // source READ a caller could name any spaceTemplateID and exfiltrate its callouts
    // / whiteboard snapshots (and destroy the target on the way). The source READ MUST
    // gate the whole apply, and MUST sit before the destructive phase (delete existing
    // callouts) and before any source dereference.
    it('RED: a forbidden source READ aborts the apply before any deletion, source read, or creation', async () => {
      const sourceCollab = {
        innovationFlow: { states: [{ displayName: 'State1' }] },
        calloutsSet: { callouts: [{ id: 'src-callout-1' }] },
      };
      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
        authorization: { id: 'src-tpl-auth' },
        contentSpace: { id: 'tcs-1', collaboration: sourceCollab },
      } as any);
      // The initiating actor lacks READ on the source template.
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new ForbiddenException('denied', 'test' as any);
      });

      const existingCallout = { id: 'existing-callout-1' };
      const targetCollab = {
        id: 'collab-1',
        innovationFlow: { states: [{ displayName: 'Old' }] },
        calloutsSet: { callouts: [existingCallout] },
      } as any;

      await expect(
        service.updateCollaborationFromSpaceTemplate(
          {
            collaborationID: 'collab-1',
            spaceTemplateID: 'tpl-1',
            addCallouts: true,
            deleteExistingCallouts: true,
          },
          targetCollab,
          actorContextData.actorContext
        )
      ).rejects.toThrow(ForbiddenException);

      // The READ was demanded on the SOURCE template's authorization policy.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContextData.actorContext,
        expect.objectContaining({ id: 'src-tpl-auth' }),
        expect.anything(),
        expect.any(String)
      );
      // Zero target deletions, zero source-content build/fetch, zero creations,
      // and the target's InnovationFlow is never mutated.
      expect(calloutService.deleteCallout).not.toHaveBeenCalled();
      expect(
        inputCreatorService.buildCreateCalloutInputsFromCallouts
      ).not.toHaveBeenCalled();
      expect(calloutsSetService.addCallouts).not.toHaveBeenCalled();
      expect(
        innovationFlowService.updateInnovationFlowStatesFromTemplate
      ).not.toHaveBeenCalled();
      expect(targetCollab.calloutsSet.callouts).toEqual([existingCallout]);
    });
  });
});
