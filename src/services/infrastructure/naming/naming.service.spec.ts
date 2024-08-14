import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NamingService } from './naming.service';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

describe('Naming Service', () => {
  let service: NamingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NamingService,
        repositoryProviderMockFactory(Discussion),
        repositoryProviderMockFactory(InnovationHub),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NamingService);
  });

  describe('createNameIdAvoidingReservedNameIDs', () => {
    it.each([
      { base: 'test', reserved: ['test', 'test-1'], output: 'test-2' },
      { base: 'test', reserved: ['test'], output: 'test-1' },
      { base: 'test', reserved: [], output: 'test' },
    ])('$base, $reserved - $output', async ({ base, reserved, output }) => {
      const nameID = service.createNameIdAvoidingReservedNameIDs(
        base,
        reserved
      );
      expect(nameID).toEqual(output);
    });
  });
});
