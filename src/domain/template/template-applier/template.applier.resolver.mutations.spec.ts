import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutsSetAuthorizationService } from '@domain/collaboration/callouts-set/callouts.set.service.authorization';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowAuthorizationService } from '@domain/collaboration/innovation-flow/innovation.flow.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LoggerService } from '@nestjs/common';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { TemplateApplierResolverMutations } from './template.applier.resolver.mutations';
import { TemplateApplierService } from './template.applier.service';

describe('TemplateApplierResolverMutations', () => {
  let resolver: TemplateApplierResolverMutations;
  let authorizationService: { grantAccessOrFail: ReturnType<typeof vi.fn> };
  let collaborationService: {
    getCollaborationOrFail: ReturnType<typeof vi.fn>;
  };
  let calloutsSetAuthorizationService: {
    applyAuthorizationPolicy: ReturnType<typeof vi.fn>;
  };
  let innovationFlowAuthorizationService: {
    applyAuthorizationPolicy: ReturnType<typeof vi.fn>;
  };
  let templateApplierService: {
    updateCollaborationFromSpaceTemplate: ReturnType<typeof vi.fn>;
  };
  let authorizationPolicyService: { saveAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authorizationService = { grantAccessOrFail: vi.fn() };
    collaborationService = { getCollaborationOrFail: vi.fn() };
    calloutsSetAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
    innovationFlowAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
    templateApplierService = {
      updateCollaborationFromSpaceTemplate: vi.fn(),
    };
    authorizationPolicyService = { saveAll: vi.fn() };

    resolver = new TemplateApplierResolverMutations(
      authorizationService as unknown as AuthorizationService,
      collaborationService as unknown as CollaborationService,
      calloutsSetAuthorizationService as unknown as CalloutsSetAuthorizationService,
      innovationFlowAuthorizationService as unknown as InnovationFlowAuthorizationService,
      templateApplierService as unknown as TemplateApplierService,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateCollaborationFromSpaceTemplate', () => {
    it('should throw RelationshipNotFoundException when callouts not loaded after update', async () => {
      const initialCollab = {
        id: 'collab-1',
        authorization: { id: 'collab-auth' },
      };
      const updatedCollab = { id: 'collab-1' };
      const reloadedCollab = {
        id: 'collab-1',
        calloutsSet: undefined,
        innovationFlow: { id: 'if-1', states: [] },
        authorization: { id: 'collab-auth' },
      };

      collaborationService.getCollaborationOrFail
        .mockResolvedValueOnce(initialCollab)
        .mockResolvedValueOnce(reloadedCollab);

      templateApplierService.updateCollaborationFromSpaceTemplate.mockResolvedValue(
        updatedCollab
      );

      const actorContext = { actorID: 'user-1' } as any;
      const updateData = {
        collaborationID: 'collab-1',
        spaceTemplateID: 'tpl-1',
        addCallouts: false,
        deleteExistingCallouts: false,
      };

      await expect(
        resolver.updateCollaborationFromSpaceTemplate(actorContext, updateData)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply authorization policies and return collaboration', async () => {
      const initialCollab = {
        id: 'collab-1',
        authorization: { id: 'collab-auth' },
      };
      const updatedCollab = { id: 'collab-1' };
      const reloadedCollab = {
        id: 'collab-1',
        calloutsSet: { callouts: [{ id: 'c-1' }] },
        innovationFlow: { id: 'if-1', states: [] },
        authorization: { id: 'collab-auth' },
      };
      const finalCollab = { id: 'collab-1' };

      collaborationService.getCollaborationOrFail
        .mockResolvedValueOnce(initialCollab)
        .mockResolvedValueOnce(reloadedCollab)
        .mockResolvedValueOnce(finalCollab);

      templateApplierService.updateCollaborationFromSpaceTemplate.mockResolvedValue(
        updatedCollab
      );
      calloutsSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'callout-auth' }]
      );
      innovationFlowAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'if-auth' }]
      );

      const actorContext = { actorID: 'user-1' } as any;
      const updateData = {
        collaborationID: 'collab-1',
        spaceTemplateID: 'tpl-1',
        addCallouts: true,
        deleteExistingCallouts: false,
      };

      const result = await resolver.updateCollaborationFromSpaceTemplate(
        actorContext,
        updateData
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        templateApplierService.updateCollaborationFromSpaceTemplate
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
      expect(result).toBe(finalCollab);
    });
  });
});
