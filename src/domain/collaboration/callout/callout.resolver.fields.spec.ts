import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { CalloutResolverFields } from './callout.resolver.fields';

function makeCallout(
  id: string,
  allowedTypes: string[],
  activity?: number
): ICallout {
  return {
    id,
    activity,
    settings: { contribution: { allowedTypes } },
  } as unknown as ICallout;
}

describe('CalloutResolverFields', () => {
  let resolver: CalloutResolverFields;
  let calloutService: Mocked<CalloutService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CalloutResolverFields>(CalloutResolverFields);
    calloutService = module.get<CalloutService>(
      CalloutService
    ) as Mocked<CalloutService>;
  });

  describe('activity', () => {
    it('should return pre-computed activity without calling loader', async () => {
      const callout = makeCallout('c-1', ['POST'], 42);
      const loader = {
        load: vi.fn().mockResolvedValue(10),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(42);
      expect(loader.load).not.toHaveBeenCalled();
      expect(calloutService.getActivityCount).not.toHaveBeenCalled();
    });

    it('should use DataLoader for contribution-type callouts', async () => {
      const callout = makeCallout('c-2', ['POST']);
      const loader = {
        load: vi.fn().mockResolvedValue(7),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(7);
      expect(loader.load).toHaveBeenCalledWith('c-2');
    });

    it('should fall back to service for comment-type callouts', async () => {
      const callout = makeCallout('c-3', []);
      const loader = {
        load: vi.fn(),
      } as unknown as ILoader<number>;
      calloutService.getActivityCount.mockResolvedValue(3);

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(3);
      expect(loader.load).not.toHaveBeenCalled();
      expect(calloutService.getActivityCount).toHaveBeenCalledWith(callout);
    });

    it('should prioritize pre-computed activity even for contribution-type callouts', async () => {
      const callout = makeCallout('c-4', ['WHITEBOARD'], 99);
      const loader = {
        load: vi.fn().mockResolvedValue(1),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(99);
      expect(loader.load).not.toHaveBeenCalled();
    });
  });
});
