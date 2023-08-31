import { Test, TestingModule } from '@nestjs/testing';
import { AuthResetService } from './auth-reset.service';
import { EntityManagerProvider, MockAuthResetService } from '@test/mocks';

describe('AuthResetService', () => {
  let service: AuthResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResetService,
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
