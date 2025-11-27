import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import {
  UserAuthenticationLinkMatch,
  UserAuthenticationLinkOutcome,
  UserAuthenticationLinkResult,
} from '@domain/community/user-authentication-link/user.authentication.link.types';

describe('AgentInfoService', () => {
  const email = 'user@example.com';
  const authenticationId = 'auth-123';
  let logger: {
    log: jest.Mock;
    verbose: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let linkService: { resolveExistingUser: jest.Mock };
  let service: AgentInfoService;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      verbose: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    linkService = {
      resolveExistingUser: jest.fn(),
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
      authenticationId,
      email,
      expect.objectContaining({ conflictMode: 'log' })
    );
    const callOptions =
      linkService.resolveExistingUser.mock.calls[0][2] ?? ({} as any);
    expect(callOptions.lookupByAuthenticationId).toBeUndefined();
    expect(metadata?.authenticationID).toEqual(authenticationId);
  });

  it('logs mismatched authentication ID without overwriting existing value', async () => {
    const existingAuthenticationId = 'existing-auth';
    const user = {
      id: 'user-2',
      email,
      authenticationID: existingAuthenticationId,
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
