import { Test, TestingModule } from '@nestjs/testing';
import { Search2Service } from './search2.service';

describe('Search2Service', () => {
  let service: Search2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Search2Service],
    }).compile();

    service = module.get<Search2Service>(Search2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
