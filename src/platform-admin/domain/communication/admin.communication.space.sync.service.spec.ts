import { Room } from '@domain/communication/room/room.entity';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { AdminCommunicationSpaceSyncService } from './admin.communication.space.sync.service';

describe('AdminCommunicationSpaceSyncService', () => {
  let service: AdminCommunicationSpaceSyncService;
  let communicationAdapter: CommunicationAdapter;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCommunicationSpaceSyncService,
        repositoryProviderMockFactory(Space),
        repositoryProviderMockFactory(Forum),
        repositoryProviderMockFactory(Room),
        repositoryProviderMockFactory(User),
        repositoryProviderMockFactory(VirtualContributor),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminCommunicationSpaceSyncService);
    communicationAdapter = module.get(CommunicationAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncForumSpaces (isPublic=false — RULING 1)', () => {
    it('creates the forum and category Matrix spaces with isPublic=false when neither exists', async () => {
      const forumRepository = (service as any).forumRepository;
      forumRepository.find = vi.fn().mockResolvedValue([
        {
          id: 'forum-1',
          discussionCategories: ['RELEASES', 'GENERAL'],
        },
      ]);
      (communicationAdapter.getSpace as Mock).mockResolvedValue(undefined);
      (communicationAdapter.createSpace as Mock).mockResolvedValue(true);

      await (service as any).syncForumSpaces();

      expect(communicationAdapter.createSpace).toHaveBeenCalledTimes(3); // forum + 2 categories
      for (const call of (communicationAdapter.createSpace as Mock).mock
        .calls) {
        // isPublic is the 6th positional argument on every createSpace call
        expect(call[5]).toBe(false);
      }
    });

    it('re-asserts isPublic=false on updateSpace for the forum and category spaces that already exist (the retraction vehicle)', async () => {
      const forumRepository = (service as any).forumRepository;
      forumRepository.find = vi.fn().mockResolvedValue([
        {
          id: 'forum-1',
          discussionCategories: ['RELEASES'],
        },
      ]);
      (communicationAdapter.getSpace as Mock).mockResolvedValue({
        id: 'already-exists',
        children: [],
      });
      (communicationAdapter.updateSpace as Mock).mockResolvedValue(true);

      await (service as any).syncForumSpaces();

      expect(communicationAdapter.updateSpace).toHaveBeenCalledTimes(2); // forum + 1 category
      for (const call of (communicationAdapter.updateSpace as Mock).mock
        .calls) {
        // isPublic is the 6th positional argument on every updateSpace call
        expect(call[5]).toBe(false);
      }
    });
  });
});
