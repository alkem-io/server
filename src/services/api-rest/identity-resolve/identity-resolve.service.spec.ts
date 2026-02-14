import { AlkemioErrorStatus } from '@common/enums';
import {
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
} from '@common/exceptions';
import {
  BadRequestHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationService } from '@services/api/registration/registration.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { IdentityResolveService } from './identity-resolve.service';

describe('IdentityResolveService', () => {
  let service: IdentityResolveService;
  let userLookupService: Record<string, Mock>;
  let kratosService: Record<string, Mock>;
  let agentInfoService: Record<string, Mock>;
  let registrationService: Record<string, Mock>;

  const meta = { ip: '127.0.0.1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentityResolveService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(IdentityResolveService);
    userLookupService = module.get(
      UserLookupService
    ) as unknown as Record<string, Mock>;
    kratosService = module.get(
      KratosService
    ) as unknown as Record<string, Mock>;
    agentInfoService = module.get(
      AgentInfoService
    ) as unknown as Record<string, Mock>;
    registrationService = module.get(
      RegistrationService
    ) as unknown as Record<string, Mock>;
  });

  describe('resolveUser', () => {
    it('should return existing user when found by authenticationID and agent exists', async () => {
      const existingUser = {
        id: 'user-1',
        agent: { id: 'agent-1' },
      };
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(existingUser);

      const result = await service.resolveUser('auth-id-1', meta);

      expect(result).toEqual(existingUser);
      expect(kratosService.getIdentityById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundHttpException when existing user has no agent', async () => {
      const existingUser = {
        id: 'user-1',
        agent: undefined,
      };
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(existingUser);

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(NotFoundHttpException);
    });

    it('should throw NotFoundHttpException when Kratos identity is not found', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue(null);

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(NotFoundHttpException);
    });

    it('should throw BadRequestHttpException when Kratos identity has no email', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'kratos-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: undefined,
      });

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(BadRequestHttpException);
    });

    it('should register new user and return user with agent when registration succeeds', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'auth-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: 'test@example.com',
        emailVerified: false,
      });
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(null);

      const registeredUser = {
        id: 'user-new',
        authenticationID: 'auth-id-1',
      };
      vi.mocked(registrationService.registerNewUser).mockResolvedValue(
        registeredUser as any
      );

      const userWithAgent = {
        id: 'user-new',
        authenticationID: 'auth-id-1',
        agent: { id: 'agent-new' },
      };
      vi.mocked(userLookupService.getUserOrFail).mockResolvedValue(
        userWithAgent as any
      );

      const result = await service.resolveUser('auth-id-1', meta);

      expect(result).toEqual(userWithAgent);
      expect(registrationService.registerNewUser).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true })
      );
    });

    it('should throw BadRequestHttpException when user is already registered', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'auth-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: 'test@example.com',
      });
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(null);
      vi.mocked(registrationService.registerNewUser).mockRejectedValue(
        new UserAlreadyRegisteredException('Already registered')
      );

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(BadRequestHttpException);
    });

    it('should throw BadRequestHttpException when user email is not verified', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'auth-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: 'test@example.com',
      });
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(null);
      vi.mocked(registrationService.registerNewUser).mockRejectedValue(
        new UserNotVerifiedException('Not verified', {} as any)
      );

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(BadRequestHttpException);
    });

    it('should throw BadRequestHttpException when registration email is invalid', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'auth-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: 'bad-email',
      });
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(null);
      vi.mocked(registrationService.registerNewUser).mockRejectedValue(
        new UserRegistrationInvalidEmail('Invalid email')
      );

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(BadRequestHttpException);
    });

    it('should throw BadRequestHttpException when registered user has no authenticationID', async () => {
      vi.mocked(
        userLookupService.getUserByAuthenticationID
      ).mockResolvedValue(null);
      vi.mocked(kratosService.getIdentityById).mockResolvedValue({
        id: 'auth-id-1',
      });
      vi.mocked(
        agentInfoService.buildAgentInfoFromOryIdentity
      ).mockReturnValue({
        email: 'test@example.com',
      });
      vi.mocked(userLookupService.getUserByEmail).mockResolvedValue(null);
      vi.mocked(registrationService.registerNewUser).mockResolvedValue({
        id: 'user-new',
        authenticationID: undefined,
      } as any);

      await expect(
        service.resolveUser('auth-id-1', meta)
      ).rejects.toThrow(BadRequestHttpException);
    });
  });
});
