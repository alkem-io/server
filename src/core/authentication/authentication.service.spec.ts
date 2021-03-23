import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AuthenticationService } from './authentication.service';

describe('AuthService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
