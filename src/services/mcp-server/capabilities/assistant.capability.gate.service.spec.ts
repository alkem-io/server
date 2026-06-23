import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import {
  AssistantCapabilityGateService,
  CAPABILITY_DISABLED_REASON,
} from './assistant.capability.gate.service';

/**
 * T022 (write FIRST) — the per-tool capability gate (FR-018/SC-009):
 *  - the gate refuses a capability the user disabled even though the user could
 *    perform it directly (FR-018 #1);
 *  - enabling it allows the call;
 *  - it is layered ON TOP of the AuthorizationService (the toggle never widens
 *    access) — see also the access-bound-to-user test in
 *    auth/mcp-delegation.strategy.spec.ts (SC-003), and the underlying-privilege
 *    revocation case (FR-018 #2) which fails at the AuthorizationService layer
 *    inside the tool, regardless of the toggle.
 *  - a NON-delegated call is not gated here (bounded solely by authorization).
 */
describe('AssistantCapabilityGateService.checkToolAllowed', () => {
  const USER_ID = 'user-1';
  const TOOL = 'create_whiteboard';

  const delegatedContext = (): ActorContext =>
    Object.assign(new ActorContext(), {
      actorID: USER_ID,
      isAnonymous: false,
      delegationContext: {
        assistantActorId: 'assistant-1',
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
    const virtualAssistantService = {
      getVirtualAssistantOrFail: vi.fn(),
    };
    const logger = { verbose: vi.fn() };
    return new AssistantCapabilityGateService(
      userRepository as any,
      virtualAssistantService as any,
      logger as any
    );
  };

  it('refuses a capability the user disabled (even if the user could do it directly)', async () => {
    const gate = buildGate([{ capability: TOOL, enabled: false }]);
    const reason = await gate.checkToolAllowed(TOOL, delegatedContext());
    expect(reason).toBe(CAPABILITY_DISABLED_REASON);
  });

  it('refuses a capability absent from the grant (absence = disabled)', async () => {
    const gate = buildGate([{ capability: 'search_content', enabled: true }]);
    const reason = await gate.checkToolAllowed(TOOL, delegatedContext());
    expect(reason).toBe(CAPABILITY_DISABLED_REASON);
  });

  it('allows a capability the user enabled', async () => {
    const gate = buildGate([{ capability: TOOL, enabled: true }]);
    const reason = await gate.checkToolAllowed(TOOL, delegatedContext());
    expect(reason).toBeNull();
  });

  it('does NOT gate a non-delegated call (no delegationContext)', async () => {
    const gate = buildGate([{ capability: TOOL, enabled: false }]);
    const plain = Object.assign(new ActorContext(), {
      actorID: USER_ID,
      isAnonymous: false,
    });
    const reason = await gate.checkToolAllowed(TOOL, plain);
    expect(reason).toBeNull();
  });

  it('re-reads the grant each call (no cached stale grant)', async () => {
    const userRepository = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce({
          settings: { assistant: { enabledCapabilities: [] } },
        })
        .mockResolvedValueOnce({
          settings: {
            assistant: {
              enabledCapabilities: [{ capability: TOOL, enabled: true }],
            },
          },
        }),
    };
    const gate = new AssistantCapabilityGateService(
      userRepository as any,
      { getVirtualAssistantOrFail: vi.fn() } as any,
      { verbose: vi.fn() } as any
    );

    expect(await gate.checkToolAllowed(TOOL, delegatedContext())).toBe(
      CAPABILITY_DISABLED_REASON
    );
    expect(await gate.checkToolAllowed(TOOL, delegatedContext())).toBeNull();
    expect(userRepository.findOne).toHaveBeenCalledTimes(2);
  });
});
