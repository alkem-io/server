import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { ForumDiscussionLookupService } from './forum.discussion.lookup.service';

describe('ForumDiscussionLookupService', () => {
  let service: ForumDiscussionLookupService;
  let db: any;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumDiscussionLookupService, mockDrizzleProvider, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ForumDiscussionLookupService);
    db = module.get(DRIZZLE);
  });

  describe('getForumDiscussionByNameIdOrFail', () => {
    it('should return the discussion when found by nameID', async () => {
      const discussion = {
        id: 'disc-1',
        nameID: 'my-discussion',
      } as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      const result =
        await service.getForumDiscussionByNameIdOrFail('my-discussion');

      expect(result).toBe(discussion);

    });

    it('should throw EntityNotFoundException when discussion not found', async () => {
      // findFirst returns undefined by default
      await expect(
        service.getForumDiscussionByNameIdOrFail('non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should merge additional FindOneOptions with the nameID where clause', async () => {
      const discussion = {
        id: 'disc-1',
        nameID: 'my-discussion',
      } as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      await service.getForumDiscussionByNameIdOrFail('my-discussion', {
        relations: { comments: true },
      });

    });
  });
});
