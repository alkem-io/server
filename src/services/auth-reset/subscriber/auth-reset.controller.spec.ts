import { Test, TestingModule } from '@nestjs/testing';
import { AuthResetController } from './auth-reset.controller';
import { MockSpaceService, MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('AuthResetController', () => {
  let controller: AuthResetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockWinstonProvider, MockSpaceService],
      controllers: [AuthResetController],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get<AuthResetController>(AuthResetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
