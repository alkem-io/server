import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupService } from './user-group.service';

describe('UserGroupService', () => {
  let service: UserGroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserGroupService],
    }).compile();

    service = module.get<UserGroupService>(UserGroupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
