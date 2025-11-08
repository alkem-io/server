import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './user.entity';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ConfigService } from '@nestjs/config';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { DuplicateAuthIdException } from '@common/exceptions/user/duplicate.authid.exception';
import { ValidationException } from '@common/exceptions';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLookupService } from '../user-lookup/user.lookup.service';

describe('UserService', () => {
  let service: UserService;
  let userLookupService: jest.Mocked<UserLookupService>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        repositoryProviderMockFactory(User),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(UserService);
    userLookupService = module.get(UserLookupService);
    userRepository = module.get(getRepositoryToken(User));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserFromAgentInfo', () => {
    const buildAgentInfo = (overrides?: Partial<AgentInfo>): AgentInfo => {
      const agentInfo = new AgentInfo();
      agentInfo.email = 'user@example.com';
      agentInfo.firstName = 'First';
      agentInfo.lastName = 'Last';
      agentInfo.authId = 'kratos-auth-id';
      agentInfo.emailVerified = true;
      return Object.assign(agentInfo, overrides);
    };

    it('persists authId when creating a user from agent info', async () => {
      const agentInfo = buildAgentInfo();

      userLookupService.isRegisteredUser.mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue(null);

      const createdUser = { id: 'user-id', email: agentInfo.email } as any;
      const assignedUser = {
        id: 'user-id',
        email: agentInfo.email,
        authId: agentInfo.authId,
      } as any;

      jest.spyOn(service, 'createUser').mockResolvedValue(createdUser);
      jest.spyOn(service, 'assignAuthId').mockResolvedValue(assignedUser);

      const result = await service.createUserFromAgentInfo(agentInfo);

      expect(service.createUser).toHaveBeenCalledWith(
        {
          email: agentInfo.email,
          firstName: agentInfo.firstName,
          lastName: agentInfo.lastName,
          accountUpn: agentInfo.email,
          profileData: expect.objectContaining({
            displayName: `${agentInfo.firstName} ${agentInfo.lastName}`,
          }),
        },
        agentInfo
      );
      expect(service.assignAuthId).toHaveBeenCalledWith(
        createdUser.id,
        agentInfo.authId
      );
      expect(result).toBe(assignedUser);
    });

    it('throws when authId already exists', async () => {
      const agentInfo = buildAgentInfo();

      userLookupService.isRegisteredUser.mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue({ id: 'existing-user' } as any);

      const createUserSpy = jest.spyOn(service, 'createUser');

      await expect(
        service.createUserFromAgentInfo(agentInfo)
      ).rejects.toBeInstanceOf(DuplicateAuthIdException);
      expect(createUserSpy).not.toHaveBeenCalled();
    });

    it('throws when authId is missing', async () => {
      const agentInfo = buildAgentInfo({ authId: '' });

      const createUserSpy = jest.spyOn(service, 'createUser');

      await expect(
        service.createUserFromAgentInfo(agentInfo)
      ).rejects.toBeInstanceOf(ValidationException);
      expect(createUserSpy).not.toHaveBeenCalled();
    });
  });
});

const ConfigServiceMock = {
  get: jest.fn().mockReturnValue({
    kratos_admin_base_url_server: 'mockUrl',
  }),
};
