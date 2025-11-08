import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationService } from '@services/api/registration/registration.service';
import { UserService } from '@domain/community/user/user.service';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { User } from '@domain/community/user/user.entity';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ConfigService } from '@nestjs/config';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { DuplicateAuthIdException } from '@common/exceptions/user/duplicate.authid.exception';
import { LogContext } from '@common/enums';

const ConfigServiceMock = {
  get: jest.fn().mockReturnValue({
    kratos_admin_base_url_server: 'mockUrl',
  }),
};

describe('RegistrationService authId integration', () => {
  let moduleRef: TestingModule;
  let registrationService: RegistrationService;
  let userService: UserService;
  let userLookupService: jest.Mocked<UserLookupService>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        RegistrationService,
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

    registrationService = moduleRef.get(RegistrationService);
    userService = moduleRef.get(UserService);
    userLookupService = moduleRef.get(UserLookupService);
    userRepository = moduleRef.get(getRepositoryToken(User));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  const buildAgentInfo = (overrides?: Partial<AgentInfo>): AgentInfo => {
    const agentInfo = new AgentInfo();
    agentInfo.email = 'user@example.com';
    agentInfo.firstName = 'First';
    agentInfo.lastName = 'Last';
    agentInfo.emailVerified = true;
    agentInfo.authId = 'kratos-auth-id';
    return Object.assign(agentInfo, overrides);
  };

  it('registers a new user with authId linked via user service', async () => {
    const agentInfo = buildAgentInfo();

    userLookupService.isRegisteredUser.mockResolvedValue(false);
    userRepository.findOne.mockResolvedValue(null);

    const createdUser = { id: 'user-id', email: agentInfo.email } as any;
    const assignedUser = { ...createdUser, authId: agentInfo.authId } as any;

    jest.spyOn(userService, 'createUser').mockResolvedValue(createdUser);
    jest.spyOn(userService, 'assignAuthId').mockResolvedValue(assignedUser);
    const organizationSpy = jest
      .spyOn(registrationService, 'assignUserToOrganizationByDomain')
      .mockResolvedValue(true);

    const result = await registrationService.registerNewUser(agentInfo);

    expect(userService.assignAuthId).toHaveBeenCalledWith(
      createdUser.id,
      agentInfo.authId
    );
    expect(organizationSpy).toHaveBeenCalledWith(assignedUser);
    expect(result).toBe(assignedUser);
  });

  it('propagates DuplicateAuthIdException from user creation', async () => {
    const agentInfo = buildAgentInfo();

    userLookupService.isRegisteredUser.mockResolvedValue(false);
    userRepository.findOne.mockResolvedValue({ id: 'existing-user' } as any);

    const createUserSpy = jest.spyOn(userService, 'createUser');

    await expect(
      registrationService.registerNewUser(agentInfo)
    ).rejects.toBeInstanceOf(DuplicateAuthIdException);

    expect(createUserSpy).not.toHaveBeenCalled();
  });

  it('propagates exceptions from user service', async () => {
    const agentInfo = buildAgentInfo();
    const duplicateError = new DuplicateAuthIdException(
      'kratos-auth-id',
      LogContext.COMMUNITY
    );

    jest
      .spyOn(userService, 'createUserFromAgentInfo')
      .mockRejectedValue(duplicateError);

    await expect(
      registrationService.registerNewUser(agentInfo)
    ).rejects.toBe(duplicateError);
  });
});
