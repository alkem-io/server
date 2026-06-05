import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import {
  AssistantCapabilityGateService,
  CAPABILITY_DISABLED_REASON,
} from '../capabilities/assistant.capability.gate.service';
import { CreateWhiteboardTool } from './create-whiteboard.tool';
import { UpdateWhiteboardContentTool } from './update-whiteboard-content.tool';

/**
 * US2 (T024/T025) — delegated WRITE tools are authorization- AND gate-enforced
 * server-side. The confirmation FLOW lives in assistant-service; the server only
 * enforces (a) entity authorization via the SAME AuthorizationService as GraphQL,
 * and (b) the per-tool capability gate over the write tools.
 *
 *  - T024 (FR-012): a delegated `create_whiteboard` / `update_whiteboard_content`
 *    runs under the on-behalf-of user's ActorContext through the byte-identical
 *    AuthorizationService — a permitted user's write succeeds; an unpermitted
 *    user's is REFUSED with a clear reason (never executes the mutation).
 *  - T025 (FR-018/SC-009): the capability gate (T021) covers the write tools — a
 *    delegated call whose write capability is disabled → `capability_disabled`,
 *    even when the user could perform the write directly.
 *
 * Authorization is the SAME path as GraphQL — these tests assert the write tools
 * delegate to it under the DELEGATED ActorContext, never re-implementing auth.
 */
describe('US2 — delegated writes are authorization-enforced (T024)', () => {
  const USER_ACTOR_ID = 'user-actor-1';
  const ASSISTANT_ACTOR_ID = 'assistant-actor-1';

  /** A DELEGATED context: authorization basis is the USER (effective ⊆ user). */
  const delegatedUserContext = (): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: USER_ACTOR_ID,
      isAnonymous: false,
      credentials: [{ type: 'space-member', resourceID: 'space-1' }],
      delegationContext: {
        assistantActorId: ASSISTANT_ACTOR_ID,
        onBehalfOfUserId: USER_ACTOR_ID,
      },
    });

  const validScene = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    elements: [],
    appState: {},
  });

  describe('update_whiteboard_content', () => {
    const whiteboardId = 'wb-1';
    const authorization = { id: 'auth-policy-1' };

    const buildTool = (granted: boolean) => {
      const whiteboardService = {
        getWhiteboardOrFail: vi
          .fn()
          .mockResolvedValue({ id: whiteboardId, authorization }),
        updateWhiteboardContent: vi
          .fn()
          .mockResolvedValue({ id: whiteboardId, nameID: 'wb-1-name' }),
      };
      const authorizationService = {
        isAccessGranted: vi.fn().mockReturnValue(granted),
      };
      const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const tool = new UpdateWhiteboardContentTool(
        whiteboardService as any,
        authorizationService as any,
        {
          getWhiteboardUrlPath: vi
            .fn()
            .mockResolvedValue('https://example/whiteboards/wb-1'),
        } as any,
        // templateService — only used for the fromTemplateId path; these tests
        // pass explicit `content`, so a bare mock suffices.
        { getTemplateOrFail: vi.fn(), getWhiteboard: vi.fn() } as any,
        { emit: vi.fn() } as any,
        logger as any
      );
      return { tool, whiteboardService, authorizationService };
    };

    it("a PERMITTED user's delegated write succeeds, authorizing as the user (UPDATE_CONTENT)", async () => {
      const { tool, whiteboardService, authorizationService } = buildTool(true);
      const ctx = delegatedUserContext();

      const result = await tool.execute(
        { whiteboardId, content: validScene },
        ctx
      );

      // Authorization flows through the SAME AuthorizationService as GraphQL,
      // against the DELEGATED user context (effective ⊆ user privileges).
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        ctx,
        authorization,
        AuthorizationPrivilege.UPDATE_CONTENT
      );
      expect(result.isError).toBeFalsy();
      expect(whiteboardService.updateWhiteboardContent).toHaveBeenCalledWith(
        whiteboardId,
        validScene
      );
    });

    it("an UNPERMITTED user's delegated write is REFUSED and never executes (FR-012)", async () => {
      const { tool, whiteboardService } = buildTool(false);

      const result = await tool.execute(
        { whiteboardId, content: validScene },
        delegatedUserContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Access denied/);
      // The mutation must NOT run when authorization is refused.
      expect(whiteboardService.updateWhiteboardContent).not.toHaveBeenCalled();
    });
  });

  describe('create_whiteboard', () => {
    const calloutId = 'callout-1';

    const buildTool = (permitted: boolean) => {
      const calloutResolverMutations = {
        createContributionOnCallout: permitted
          ? vi.fn().mockResolvedValue({ id: 'contribution-1' })
          : vi
              .fn()
              .mockRejectedValue(
                new Error('Authorization: unable to access Callout')
              ),
      };
      const contributionRepository = {
        findOne: vi.fn().mockResolvedValue({
          id: 'contribution-1',
          whiteboard: { id: 'wb-new', nameID: 'wb-new', profile: {} },
        }),
      };
      const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const tool = new CreateWhiteboardTool(
        calloutResolverMutations as any,
        contributionRepository as any,
        {
          getWhiteboardUrlPath: vi
            .fn()
            .mockResolvedValue('https://example/whiteboards/wb-new'),
        } as any,
        logger as any
      );
      return { tool, calloutResolverMutations };
    };

    it("a PERMITTED user's delegated create succeeds, delegating to the GraphQL mutation path", async () => {
      const { tool, calloutResolverMutations } = buildTool(true);
      const ctx = delegatedUserContext();

      const result = await tool.execute(
        { calloutId, displayName: 'My board', content: validScene },
        ctx
      );

      // Auth (CONTRIBUTE) is enforced inside the SAME resolver path as GraphQL,
      // invoked with the DELEGATED user context.
      expect(
        calloutResolverMutations.createContributionOnCallout
      ).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ calloutID: calloutId })
      );
      expect(result.isError).toBeFalsy();
    });

    it("an UNPERMITTED user's delegated create is REFUSED with a reason (FR-012)", async () => {
      const { tool } = buildTool(false);

      const result = await tool.execute(
        { calloutId, displayName: 'My board', content: validScene },
        delegatedUserContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Could not create whiteboard/);
    });
  });
});

/**
 * T025 — the per-tool capability gate (T021) covers the WRITE tools: a delegated
 * call whose write capability is disabled in the user's grant is refused
 * (`capability_disabled`) BEFORE the tool executes, even though the user could
 * perform the write directly (it is layered ON TOP of authorization).
 */
describe('US2 — the capability gate covers writes (T025)', () => {
  const USER_ID = 'user-actor-1';

  const delegatedContext = (): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: USER_ID,
      isAnonymous: false,
      delegationContext: {
        assistantActorId: 'assistant-actor-1',
        onBehalfOfUserId: USER_ID,
      },
    });

  const buildGate = (
    enabledCapabilities: { capability: string; enabled: boolean }[]
  ) => {
    const userRepository = {
      findOne: vi.fn().mockResolvedValue({
        settings: { assistant: { enabledCapabilities } },
      }),
    };
    const virtualAssistantService = { getVirtualAssistantOrFail: vi.fn() };
    const logger = { verbose: vi.fn() };
    return new AssistantCapabilityGateService(
      userRepository as any,
      virtualAssistantService as any,
      logger as any
    );
  };

  for (const writeTool of ['create_whiteboard', 'update_whiteboard_content']) {
    it(`refuses '${writeTool}' when the write capability is disabled (capability_disabled)`, async () => {
      const gate = buildGate([{ capability: writeTool, enabled: false }]);
      const reason = await gate.checkToolAllowed(writeTool, delegatedContext());
      expect(reason).toBe(CAPABILITY_DISABLED_REASON);
    });

    it(`refuses '${writeTool}' when absent from the grant (absence = disabled)`, async () => {
      const gate = buildGate([{ capability: 'search_content', enabled: true }]);
      const reason = await gate.checkToolAllowed(writeTool, delegatedContext());
      expect(reason).toBe(CAPABILITY_DISABLED_REASON);
    });

    it(`allows '${writeTool}' when the write capability is enabled`, async () => {
      const gate = buildGate([{ capability: writeTool, enabled: true }]);
      const reason = await gate.checkToolAllowed(writeTool, delegatedContext());
      expect(reason).toBeNull();
    });
  }
});
