import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { InnovationFlowResolverMutations } from './innovation.flow.resolver.mutations';
import { InnovationFlowService } from './innovation.flow.service';

describe('InnovationFlowResolverMutations', () => {
  let resolver: InnovationFlowResolverMutations;
  let innovationFlowService: InnovationFlowService;
  let innovationFlowStateService: InnovationFlowStateService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationFlowResolverMutations);
    innovationFlowService = module.get(InnovationFlowService);
    innovationFlowStateService = module.get(InnovationFlowStateService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createStateOnInnovationFlow', () => {
    it('should check authorization and create state', async () => {
      const flow = {
        id: 'flow-1',
        authorization: { id: 'auth-1' },
        states: [],
      } as any;
      const newState = {
        id: 'state-new',
        authorization: { id: 'state-auth' },
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(
        innovationFlowService.createStateOnInnovationFlow
      ).mockResolvedValue(newState);
      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(newState);

      const stateAuthService = (resolver as any)
        .innovationFlowStateAuthorizationService;
      vi.mocked(stateAuthService.applyAuthorizationPolicy).mockReturnValue({
        id: 'updated-auth',
      } as any);

      const actorContext = { actorID: 'user-1' } as any;

      const _result = await resolver.createStateOnInnovationFlow(actorContext, {
        innovationFlowID: 'flow-1',
        displayName: 'New State',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flow.authorization,
        AuthorizationPrivilege.CREATE,
        expect.any(String)
      );
      expect(
        innovationFlowService.createStateOnInnovationFlow
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.save).toHaveBeenCalled();
    });
  });

  describe('deleteStateOnInnovationFlow', () => {
    it('should check authorization and delete state', async () => {
      const flow = {
        id: 'flow-1',
        authorization: { id: 'auth-1' },
        states: [{ id: 's-1' }, { id: 's-2' }],
      } as any;
      const deletedState = { id: 's-1' } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(
        innovationFlowService.deleteStateOnInnovationFlow
      ).mockResolvedValue(deletedState);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.deleteStateOnInnovationFlow(actorContext, {
        innovationFlowID: 'flow-1',
        ID: 's-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flow.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(result).toBe(deletedState);
    });
  });

  describe('updateInnovationFlow', () => {
    it('should check authorization and update flow', async () => {
      const flow = { id: 'flow-1', authorization: { id: 'auth-1' } } as any;
      const updatedFlow = {
        id: 'flow-1',
        profile: { displayName: 'Updated' },
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(innovationFlowService.updateInnovationFlow).mockResolvedValue(
        updatedFlow
      );

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateInnovationFlow(actorContext, {
        innovationFlowID: 'flow-1',
        profileData: { displayName: 'Updated' },
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flow.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(updatedFlow);
    });
  });

  describe('updateInnovationFlowCurrentState', () => {
    it('should check authorization and update current state', async () => {
      const flow = { id: 'flow-1', authorization: { id: 'auth-1' } } as any;
      const updatedFlow = { id: 'flow-1', currentStateID: 's-2' } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(innovationFlowService.updateCurrentState).mockResolvedValue(
        updatedFlow
      );

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateInnovationFlowCurrentState(
        actorContext,
        {
          innovationFlowID: 'flow-1',
          currentStateID: 's-2',
        } as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flow.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(updatedFlow);
    });
  });

  describe('updateInnovationFlowState', () => {
    it('should check authorization and update state', async () => {
      const flowState = {
        id: 'state-1',
        authorization: { id: 'state-auth' },
        innovationFlow: { id: 'flow-1' },
      } as any;
      const updatedState = { id: 'state-1', displayName: 'Updated' } as any;

      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(flowState);
      vi.mocked(
        innovationFlowService.updateInnovationFlowState
      ).mockResolvedValue(updatedState);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateInnovationFlowState(actorContext, {
        innovationFlowStateID: 'state-1',
        displayName: 'Updated',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flowState.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(updatedState);
    });

    it('should throw EntityNotInitializedException when state has no innovationFlow', async () => {
      const flowState = {
        id: 'state-1',
        authorization: { id: 'state-auth' },
        innovationFlow: undefined,
      } as any;

      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(flowState);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.updateInnovationFlowState(actorContext, {
          innovationFlowStateID: 'state-1',
          displayName: 'Updated',
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('updateInnovationFlowStatesSortOrder', () => {
    it('should check authorization and update sort order', async () => {
      const flow = {
        id: 'flow-1',
        authorization: { id: 'auth-1' },
        states: [{ id: 's-1' }, { id: 's-2' }],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(innovationFlowService.updateStatesSortOrder).mockResolvedValue([
        { id: 's-2' },
        { id: 's-1' },
      ] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateInnovationFlowStatesSortOrder(
        actorContext,
        {
          innovationFlowID: 'flow-1',
          stateIDs: ['s-2', 's-1'],
        } as any
      );

      expect(result).toHaveLength(2);
    });

    it('should throw ValidationException when stateIDs is empty', async () => {
      const flow = {
        id: 'flow-1',
        authorization: { id: 'auth-1' },
        states: [{ id: 's-1' }],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.updateInnovationFlowStatesSortOrder(actorContext, {
          innovationFlowID: 'flow-1',
          stateIDs: [],
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when stateIDs count does not match', async () => {
      const flow = {
        id: 'flow-1',
        authorization: { id: 'auth-1' },
        states: [{ id: 's-1' }, { id: 's-2' }],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.updateInnovationFlowStatesSortOrder(actorContext, {
          innovationFlowID: 'flow-1',
          stateIDs: ['s-1'],
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('setDefaultCalloutTemplateOnInnovationFlowState', () => {
    it('should check authorization and set template', async () => {
      const flowState = {
        id: 'state-1',
        authorization: { id: 'state-auth' },
      } as any;
      const updatedState = {
        id: 'state-1',
        defaultCalloutTemplate: { id: 'template-1' },
      } as any;

      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(flowState);
      vi.mocked(
        innovationFlowStateService.setDefaultCalloutTemplate
      ).mockResolvedValue(updatedState);

      const actorContext = { actorID: 'user-1' } as any;

      const result =
        await resolver.setDefaultCalloutTemplateOnInnovationFlowState(
          actorContext,
          {
            flowStateID: 'state-1',
            templateID: 'template-1',
          } as any
        );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        flowState.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(updatedState);
    });
  });

  describe('removeDefaultCalloutTemplateOnInnovationFlowState', () => {
    it('should check authorization and remove template', async () => {
      const flowState = {
        id: 'state-1',
        authorization: { id: 'state-auth' },
      } as any;
      const updatedState = {
        id: 'state-1',
        defaultCalloutTemplate: undefined,
      } as any;

      vi.mocked(
        innovationFlowStateService.getInnovationFlowStateOrFail
      ).mockResolvedValue(flowState);
      vi.mocked(
        innovationFlowStateService.removeDefaultCalloutTemplate
      ).mockResolvedValue(updatedState);

      const actorContext = { actorID: 'user-1' } as any;

      const result =
        await resolver.removeDefaultCalloutTemplateOnInnovationFlowState(
          actorContext,
          { flowStateID: 'state-1' } as any
        );

      expect(result).toBe(updatedState);
    });
  });
});
