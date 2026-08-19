import { beforeEach, describe, expect, it, vi } from 'vitest';

// `jose` (SignJWT) is only used on the success path, which these error-mapping
// tests never reach; stub it so the module imports without the real dep.
vi.mock('jose', () => ({ SignJWT: vi.fn() }));

import {
  NonInteractiveLoginInvalidCredentialsError,
  NonInteractiveLoginKratosUnavailableError,
  NonInteractiveLoginRateLimitedError,
  NonInteractiveLoginService,
} from './non-interactive-login.service';

// Maps a Kratos login-flow failure to the right domain error:
//   429      -> RateLimited      (distinct from a bad password)
//   other 4xx-> InvalidCredentials
//   5xx/net  -> KratosUnavailable
describe('NonInteractiveLoginService — Kratos error mapping', () => {
  let updateLoginFlow: ReturnType<typeof vi.fn>;
  let emit: ReturnType<typeof vi.fn>;
  let service: NonInteractiveLoginService;

  beforeEach(() => {
    updateLoginFlow = vi.fn();
    emit = vi.fn();
    const kratosService = {
      kratosFrontEndClient: {
        createNativeLoginFlow: vi
          .fn()
          .mockResolvedValue({ data: { id: 'f1' } }),
        updateLoginFlow,
      },
    } as any;
    const config = { enabled: true, secretKey: Buffer.alloc(32) } as any;
    const logger = { error: vi.fn(), warn: vi.fn(), log: vi.fn() } as any;
    service = new NonInteractiveLoginService(
      kratosService,
      {} as any, // identityResolveService — not reached on the error path
      config,
      { emit } as any,
      logger
    );
  });

  const mintWithKratosStatus = (status: number): Promise<unknown> => {
    updateLoginFlow.mockRejectedValue({ response: { status } });
    return service.mint('admin@alkem.io', 'pw');
  };

  it('maps Kratos 429 to RateLimited (not invalid_credentials)', async () => {
    await expect(mintWithKratosStatus(429)).rejects.toBeInstanceOf(
      NonInteractiveLoginRateLimitedError
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'non_interactive_login.rate_limited',
        error_code: 'kratos_429',
      })
    );
  });

  it('maps a Kratos 401 to InvalidCredentials', async () => {
    await expect(mintWithKratosStatus(401)).rejects.toBeInstanceOf(
      NonInteractiveLoginInvalidCredentialsError
    );
  });

  it('maps a Kratos 5xx to KratosUnavailable', async () => {
    await expect(mintWithKratosStatus(503)).rejects.toBeInstanceOf(
      NonInteractiveLoginKratosUnavailableError
    );
  });
});
