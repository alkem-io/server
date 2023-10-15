import { Test, TestingModule } from '@nestjs/testing';
import { AuthResetService } from './auth-reset.service';
import { EntityManagerProvider, MockAuthResetService } from '@test/mocks';
import { MockTaskService } from '@test/mocks/task.service.mock';

describe('AuthResetService', () => {
  let service: AuthResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResetService,
        MockTaskService,
        MockAuthResetService,
        EntityManagerProvider,
      ],
    }).compile();

    service = module.get<AuthResetService>(AuthResetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
