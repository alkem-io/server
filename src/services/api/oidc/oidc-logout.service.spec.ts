import { OidcLogoutService } from './oidc-logout.service';
import { SynapseAdminService } from '@services/infrastructure/synapse/synapse-admin.service';

describe('OidcLogoutService', () => {
  let service: OidcLogoutService;
  const synapseAdminService = {
    terminateSessionsByEmail: jest.fn(),
  } as unknown as SynapseAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    synapseAdminService.terminateSessionsByEmail = jest
      .fn()
      .mockResolvedValue(0);
    service = new OidcLogoutService(synapseAdminService);
  });

  describe('synchronizeMatrixSessions', () => {
    it('returns 0 when subject is undefined', async () => {
      const removed = await service.synchronizeMatrixSessions(undefined);
      expect(removed).toBe(0);
      expect(
        synapseAdminService.terminateSessionsByEmail as jest.Mock
      ).not.toHaveBeenCalled();
    });

    it('removes sessions using extracted email when subject contains pipe', async () => {
      (
        synapseAdminService.terminateSessionsByEmail as jest.Mock
      ).mockResolvedValue(2);

      const removed = await service.synchronizeMatrixSessions(
        'something|user@example.com'
      );

      expect(removed).toBe(2);
      expect(synapseAdminService.terminateSessionsByEmail).toHaveBeenCalledWith(
        'user@example.com'
      );
    });

    it('uses subject directly when no pipe present', async () => {
      (
        synapseAdminService.terminateSessionsByEmail as jest.Mock
      ).mockResolvedValue(1);

      const removed =
        await service.synchronizeMatrixSessions('user@example.com');

      expect(removed).toBe(1);
      expect(synapseAdminService.terminateSessionsByEmail).toHaveBeenCalledWith(
        'user@example.com'
      );
    });
  });
});
