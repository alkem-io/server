import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import {
  UserAuthenticationLinkMatch,
  UserAuthenticationLinkOutcome,
  UserAuthenticationLinkResult,
} from '@domain/community/user-authentication-link/user.authentication.link.types';
import { type Mock, vi } from 'vitest';

describe('AgentInfoService', () => {
  const email = 'user@example.com';
  const authenticationId = 'auth-123';
  let logger: {
    log: Mock;
    verbose: Mock;
    warn: Mock;
    error: Mock;
  };
  let linkService: { resolveExistingUser: Mock };
  let service: AgentInfoService;

  beforeEach(() => {
    logger = {
      log: vi.fn(),
      verbose: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    linkService = {
      resolveExistingUser: vi.fn(),
    };
    service = new AgentInfoService(
      linkService as any,
      {} as any,
      logger as unknown as any
    );
  });

  it('links missing authentication ID when provided via options', async () => {
    const user = {
      id: 'user-1',
      email,
      authenticationID: authenticationId,
      communicationID: 'comm-1',
      agent: {
        id: 'agent-1',
        credentials: [],
      },
    };

    const resolveResult: UserAuthenticationLinkResult = {
      user: user as any,
      matchedBy: UserAuthenticationLinkMatch.EMAIL,
      outcome: UserAuthenticationLinkOutcome.LINKED,
    };

    linkService.resolveExistingUser.mockResolvedValueOnce(resolveResult);

    const metadata = await service.getAgentInfoMetadata(email, {
      authenticationId,
    });

    expect(linkService.resolveExistingUser).toHaveBeenCalledWith(
      expect.objectContaining({ email }),
      expect.objectContaining({ conflictMode: 'log' })
    );
    const callOptions =
      linkService.resolveExistingUser.mock.calls[0][1] ?? ({} as any);
    expect(callOptions.lookupByAuthenticationId).toBeUndefined();
    expect(metadata?.authenticationID).toEqual(authenticationId);
  });

  it('logs mismatched authentication ID without overwriting existing value', async () => {
    const existingAuthenticationId = 'existing-auth';
    const user = {
      id: 'user-2',
      email,
      authenticationID: existingAuthenticationId,
      communicationID: 'comm-2',
      agent: {
        id: 'agent-2',
        credentials: [],
      },
    };

    const resolveResult: UserAuthenticationLinkResult = {
      user: user as any,
      matchedBy: UserAuthenticationLinkMatch.EMAIL,
      outcome: UserAuthenticationLinkOutcome.CONFLICT,
    };

    linkService.resolveExistingUser.mockResolvedValueOnce(resolveResult);

    const metadata = await service.getAgentInfoMetadata(email, {
      authenticationId,
    });

    expect(metadata?.authenticationID).toEqual(existingAuthenticationId);
  });
});
