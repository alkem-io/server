import { SchedulerRegistry } from '@nestjs/schedule';
import { SessionSyncService } from './session-sync.service';
import { SynapseAdminService } from '@services/infrastructure/synapse/synapse-admin.service';
import { KratosSessionRepository } from '@services/session-sync/kratos-session.repository';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { LoggerService } from '@nestjs/common';

describe('SessionSyncService', () => {
  const sessionSyncConfig = {
    enabled: true,
    interval_ms: 120000,
    kratos_database: {
      database: 'kratos',
    },
    synapse_database: {
      host: 'postgres',
      port: 5432,
      username: 'synapse',
      password: 'synapse',
      database: 'synapse',
    },
  } as AlkemioConfig['identity']['authentication']['providers']['oidc']['session_sync'];

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'identity.authentication.providers.oidc.session_sync') {
        return sessionSyncConfig;
      }
      return undefined;
    }),
  } as unknown as ConfigService<AlkemioConfig, true>;

  const schedulerRegistry = new SchedulerRegistry();

  const synapseAdminService = {
    terminateSessionsByEmail: jest.fn(),
  } as unknown as SynapseAdminService;

  const kratosSessionRepository = {
    findExpiredSessions: jest.fn(),
    getIdentityTraits: jest.fn(),
    markSessionInactive: jest.fn(),
  } as unknown as KratosSessionRepository;

  const logger: LoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as LoggerService;

  let service: SessionSyncService;
  const invokeSync = () =>
    (
      service as unknown as { syncExpiredSessions: () => Promise<void> }
    ).syncExpiredSessions();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionSyncService(
      configService,
      schedulerRegistry,
      synapseAdminService,
      kratosSessionRepository,
      logger
    );
  });

  describe('syncExpiredSessions (internal)', () => {
    it('logs and exits when no expired sessions are found', async () => {
      (
        kratosSessionRepository.findExpiredSessions as jest.Mock
      ).mockResolvedValue([]);

      await invokeSync();

      expect(
        synapseAdminService.terminateSessionsByEmail
      ).not.toHaveBeenCalled();
    });

    it('terminates sessions and marks Kratos session inactive when email found', async () => {
      (
        kratosSessionRepository.findExpiredSessions as jest.Mock
      ).mockResolvedValue([{ id: 'session-1', identity_id: 'identity-1' }]);
      (
        kratosSessionRepository.getIdentityTraits as jest.Mock
      ).mockResolvedValue({
        email: 'user@example.com',
      });
      (
        synapseAdminService.terminateSessionsByEmail as jest.Mock
      ).mockResolvedValue(2);

      await invokeSync();

      expect(synapseAdminService.terminateSessionsByEmail).toHaveBeenCalledWith(
        'user@example.com'
      );
      expect(kratosSessionRepository.markSessionInactive).toHaveBeenCalledWith(
        'session-1'
      );
    });

    it('skips sessions without email', async () => {
      (
        kratosSessionRepository.findExpiredSessions as jest.Mock
      ).mockResolvedValue([{ id: 'session-2', identity_id: 'identity-2' }]);
      (
        kratosSessionRepository.getIdentityTraits as jest.Mock
      ).mockResolvedValue({});

      await invokeSync();

      expect(
        synapseAdminService.terminateSessionsByEmail
      ).not.toHaveBeenCalled();
      expect(
        kratosSessionRepository.markSessionInactive
      ).not.toHaveBeenCalled();
    });
  });
});
