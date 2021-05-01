import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
