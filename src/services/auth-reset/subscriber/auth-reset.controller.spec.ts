import { Test, TestingModule } from '@nestjs/testing';
import { AuthResetController } from './auth-reset.controller';

describe('AuthResetController', () => {
  let controller: AuthResetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthResetController],
    }).compile();

    controller = module.get<AuthResetController>(AuthResetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
