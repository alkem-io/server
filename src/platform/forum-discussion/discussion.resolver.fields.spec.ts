import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { DiscussionResolverFields } from './discussion.resolver.fields';
import { DiscussionService } from './discussion.service';

describe('DiscussionResolverFields', () => {
  let resolver: DiscussionResolverFields;
  let discussionService: Mocked<DiscussionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(DiscussionResolverFields);
    discussionService = module.get(
      DiscussionService
    ) as Mocked<DiscussionService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('timestamp', () => {
    it('should return timestamp in milliseconds from createdDate', async () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const discussion = { id: 'disc-1', createdDate: date } as any;

      const result = await resolver.timestamp(discussion);

      expect(result).toBe(date.getTime());
    });
  });

  describe('createdBy', () => {
    it('should return createdBy when set', async () => {
      const discussion = { id: 'disc-1', createdBy: 'user-1' } as any;

      const result = await resolver.createdBy(discussion);

      expect(result).toBe('user-1');
    });

    it('should return null and log warning when createdBy is falsy', async () => {
      const discussion = { id: 'disc-1', createdBy: null } as any;

      const result = await resolver.createdBy(discussion);

      expect(result).toBeNull();
    });

    it('should return null when createdBy is undefined', async () => {
      const discussion = { id: 'disc-1', createdBy: undefined } as any;

      const result = await resolver.createdBy(discussion);

      expect(result).toBeNull();
    });

    it('should return null when createdBy is empty string', async () => {
      const discussion = { id: 'disc-1', createdBy: '' } as any;

      const result = await resolver.createdBy(discussion);

      expect(result).toBeNull();
    });
  });

  describe('comments', () => {
    it('should return comments room from discussion service', async () => {
      const discussion = { id: 'disc-1' } as any;
      const room = { id: 'room-1' } as any;
      discussionService.getComments.mockResolvedValue(room);

      const result = await resolver.comments(discussion);

      expect(result).toBe(room);
      expect(discussionService.getComments).toHaveBeenCalledWith('disc-1');
    });
  });
});
