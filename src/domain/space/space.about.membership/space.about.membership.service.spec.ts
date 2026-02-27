import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceAboutMembershipService } from './space.about.membership.service';

/**
 * SpaceAboutMembershipService currently has no methods or logic.
 * Tests will be added when the service acquires behavior.
 * The single test below verifies the module can compile and instantiate the service.
 */
describe('SpaceAboutMembershipService', () => {
  let service: SpaceAboutMembershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceAboutMembershipService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceAboutMembershipService);
  });

  it('should instantiate successfully', () => {
    // This service currently has no methods; this test verifies DI wiring.
    expect(service).toBeDefined();
  });
});
