import { ActorType } from '@common/enums/actor.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ForumResolverFields } from './forum.resolver.fields';

describe('ForumResolverFields', () => {
  let resolver: ForumResolverFields;
  let actorLookupService: ActorLookupService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ForumResolverFields);
    actorLookupService = module.get(ActorLookupService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('mentionableContributors', () => {
    it('queries the all-platform scope and forwards filter / limit / types', async () => {
      const results = [
        { id: 'a-1', type: ActorType.USER },
        { id: 'a-2', type: ActorType.VIRTUAL_CONTRIBUTOR },
      ] as any;
      vi.mocked(
        actorLookupService.findMentionableContributors
      ).mockResolvedValue(results);

      const result = await resolver.mentionableContributors(
        { displayName: 'jo' },
        50,
        [ActorType.USER]
      );

      expect(
        actorLookupService.findMentionableContributors
      ).toHaveBeenCalledWith(
        { allPlatform: true },
        [ActorType.USER],
        { displayName: 'jo' },
        50
      );
      expect(result).toBe(results);
    });

    it('forwards undefined filter / limit / types when omitted by the caller', async () => {
      vi.mocked(
        actorLookupService.findMentionableContributors
      ).mockResolvedValue([]);

      await resolver.mentionableContributors();

      expect(
        actorLookupService.findMentionableContributors
      ).toHaveBeenCalledWith(
        { allPlatform: true },
        undefined,
        undefined,
        undefined
      );
    });
  });
});
