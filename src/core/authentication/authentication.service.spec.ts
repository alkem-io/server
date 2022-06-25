import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AuthenticationService } from './authentication.service';

describe('AuthService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthenticationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

const ConfigServiceMock = {
  get: jest.fn().mockReturnValue({
    authentication: {
      providers: {
        ory: {
          kratos_public_base_url_server: 'mockUrl',
          kratos_admin_base_url_server: 'mockUrl',
          admin_service_account: {
            username: 'mock',
            password: 'mock',
          },
        },
      },
    },
  }),
};
