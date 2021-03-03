import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AuthorisationService } from './authorisation.service';

describe('AuthorisationService', () => {
  let service: AuthorisationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<AuthorisationService>(AuthorisationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
