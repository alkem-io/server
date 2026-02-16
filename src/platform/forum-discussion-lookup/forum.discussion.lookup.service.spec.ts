import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { ForumDiscussionLookupService } from './forum.discussion.lookup.service';

describe('ForumDiscussionLookupService', () => {
  let service: ForumDiscussionLookupService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumDiscussionLookupService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ForumDiscussionLookupService);
    entityManager = module.get(EntityManager);
  });

  describe('getForumDiscussionByNameIdOrFail', () => {
    it('should return the discussion when found by nameID', async () => {
      const discussion = {
        id: 'disc-1',
        nameID: 'my-discussion',
      } as Discussion;
      vi.mocked(entityManager.findOne).mockResolvedValue(discussion);

      const result =
        await service.getForumDiscussionByNameIdOrFail('my-discussion');

      expect(result).toBe(discussion);
      expect(entityManager.findOne).toHaveBeenCalledWith(Discussion, {
        where: { nameID: 'my-discussion' },
      });
    });

    it('should throw EntityNotFoundException when discussion not found', async () => {
      vi.mocked(entityManager.findOne).mockResolvedValue(null);

      await expect(
        service.getForumDiscussionByNameIdOrFail('non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should merge additional FindOneOptions with the nameID where clause', async () => {
      const discussion = {
        id: 'disc-1',
        nameID: 'my-discussion',
      } as Discussion;
      vi.mocked(entityManager.findOne).mockResolvedValue(discussion);

      await service.getForumDiscussionByNameIdOrFail('my-discussion', {
        relations: { comments: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(Discussion, {
        relations: { comments: true },
        where: { nameID: 'my-discussion' },
      });
    });
  });
});
