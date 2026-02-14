import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { NamingService } from './naming.service';

describe('Naming Service', () => {
  let service: NamingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NamingService, mockDrizzleProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(NamingService);
  });

  describe('createNameIdAvoidingReservedNameIDs', () => {
    it.each([
      { base: 'mytest', reserved: [], expected: 'mytest' },
      { base: 'mytest', reserved: ['mytest'], expected: 'mytest-1' },
      {
        base: 'mytest',
        reserved: ['mytest', 'mytest-1'],
        expected: 'mytest-2',
      },
      {
        base: 'mytest',
        reserved: ['mytest', 'mytest-1', 'mytest-3'],
        expected: 'mytest-2',
      },
    ])('$base, $reserved - $output', async ({ base, reserved, expected }) => {
      const received = service.createNameIdAvoidingReservedNameIDs(
        base,
        reserved
      );
      expect(received).toEqual(expected);
    });
  });
});
