import { Test, TestingModule } from '@nestjs/testing';
import {
  EntityManagerProvider,
  MockAuthResetService,
  MockWinstonProvider,
} from '@test/mocks';
import { MockTaskService } from '@test/mocks/task.service.mock';
import { AuthResetService } from './auth-reset.service';

describe('AuthResetService', () => {
  let service: AuthResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResetService,
        MockAuthResetService,
        MockTaskService,
        EntityManagerProvider,
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<AuthResetService>(AuthResetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
