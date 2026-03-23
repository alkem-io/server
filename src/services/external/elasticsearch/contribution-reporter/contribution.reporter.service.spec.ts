import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { ActorType } from '@common/enums';
import { ActorService } from '@domain/actor';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockConfigService, MockWinstonProvider } from '@test/mocks';
import { vi } from 'vitest';
import { ContributionReporterService } from './contribution.reporter.service';

describe('ContributionReporterService', () => {
  let service: ContributionReporterService;
  let mockIndex: ReturnType<typeof vi.fn>;
  let mockActorService: {
    getActorOrNull: ReturnType<typeof vi.fn>;
  };
  let mockUserLookupService: {
    getUserByIdOrFail: ReturnType<typeof vi.fn>;
  };

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    mockIndex = vi.fn().mockResolvedValue({ result: 'created' });
    mockActorService = {
      getActorOrNull: vi.fn(),
    };
    mockUserLookupService = {
      getUserByIdOrFail: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionReporterService,
        MockWinstonProvider,
        MockConfigService,
        {
          provide: ELASTICSEARCH_CLIENT_PROVIDER,
          useValue: { index: mockIndex },
        },
        {
          provide: ActorService,
          useValue: mockActorService,
        },
        {
          provide: UserLookupService,
          useValue: mockUserLookupService,
        },
      ],
    }).compile();

    service = module.get<ContributionReporterService>(
      ContributionReporterService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('spaceJoined', () => {
    it('should index a SPACE_JOINED document', async () => {
      const contribution = { id: 'space-1', name: 'Test Space', space: 'root' };
      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'user@example.com',
      });

      service.spaceJoined(contribution, { actorID: 'user-1' });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'SPACE_JOINED',
            id: 'space-1',
          }),
        })
      );
    });
  });

  describe('spaceContentEdited', () => {
    it('should index a SPACE_CONTENT_EDITED document', async () => {
      const contribution = { id: 'space-1', name: 'Test Space', space: 'root' };
      service.spaceContentEdited(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'SPACE_CONTENT_EDITED',
            anonymous: true,
          }),
        })
      );
    });
  });

  describe('subspaceCreated', () => {
    it('should index a SUBSPACE_CREATED document', async () => {
      const contribution = { id: 'sub-1', name: 'Sub Space', space: 'root' };
      service.subspaceCreated(contribution, { guestName: 'Guest' });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'SUBSPACE_CREATED',
            guest: true,
          }),
        })
      );
    });
  });

  describe('subspaceContentEdited', () => {
    it('should index a SUBSPACE_CONTENT_EDITED document', async () => {
      const contribution = { id: 'sub-1', name: 'Sub Space', space: 'root' };
      service.subspaceContentEdited(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'SUBSPACE_CONTENT_EDITED',
          }),
        })
      );
    });
  });

  describe('subspaceJoined', () => {
    it('should index a SUBSPACE_JOINED document', async () => {
      const contribution = { id: 'sub-1', name: 'Sub Space', space: 'root' };
      service.subspaceJoined(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'SUBSPACE_JOINED',
          }),
        })
      );
    });
  });

  describe('calloutCreated', () => {
    it('should index a CALLOUT_CREATED document', async () => {
      const contribution = {
        id: 'callout-1',
        name: 'Test Callout',
        space: 'root',
      };
      service.calloutCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'CALLOUT_CREATED' }),
        })
      );
    });
  });

  describe('calloutCommentCreated', () => {
    it('should index a CALLOUT_COMMENT_CREATED document', async () => {
      const contribution = { id: 'comment-1', name: 'Comment', space: 'root' };
      service.calloutCommentCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CALLOUT_COMMENT_CREATED',
          }),
        })
      );
    });
  });

  describe('calloutPostCreated', () => {
    it('should index a CALLOUT_POST_CREATED document', async () => {
      const contribution = { id: 'post-1', name: 'Post', space: 'root' };
      service.calloutPostCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'CALLOUT_POST_CREATED' }),
        })
      );
    });
  });

  describe('calloutLinkCreated', () => {
    it('should index a CALLOUT_LINK_CREATED document', async () => {
      const contribution = { id: 'link-1', name: 'Link', space: 'root' };
      service.calloutLinkCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'CALLOUT_LINK_CREATED' }),
        })
      );
    });
  });

  describe('calloutWhiteboardCreated', () => {
    it('should index a CALLOUT_WHITEBOARD_CREATED document', async () => {
      const contribution = { id: 'wb-1', name: 'Whiteboard', space: 'root' };
      service.calloutWhiteboardCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CALLOUT_WHITEBOARD_CREATED',
          }),
        })
      );
    });
  });

  describe('calloutMemoCreated', () => {
    it('should index a CALLOUT_MEMO_CREATED document', async () => {
      const contribution = { id: 'memo-1', name: 'Memo', space: 'root' };
      service.calloutMemoCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'CALLOUT_MEMO_CREATED' }),
        })
      );
    });
  });

  describe('calloutPostCommentCreated', () => {
    it('should index a CALLOUT_POST_COMMENT_CREATED document', async () => {
      const contribution = { id: 'pc-1', name: 'Post Comment', space: 'root' };
      service.calloutPostCommentCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CALLOUT_POST_COMMENT_CREATED',
          }),
        })
      );
    });
  });

  describe('calendarEventCreated', () => {
    it('should index a CALENDAR_EVENT_CREATED document', async () => {
      const contribution = {
        id: 'event-1',
        name: 'Calendar Event',
        space: 'root',
      };
      service.calendarEventCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'CALENDAR_EVENT_CREATED' }),
        })
      );
    });
  });

  describe('updateCreated', () => {
    it('should index an UPDATE_CREATED document', async () => {
      const contribution = { id: 'update-1', name: 'Update', space: 'root' };
      service.updateCreated(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'UPDATE_CREATED' }),
        })
      );
    });
  });

  describe('whiteboardContribution', () => {
    it('should index a WHITEBOARD_CONTRIBUTION document', async () => {
      const contribution = { id: 'wb-1', name: 'Whiteboard', space: 'root' };
      service.whiteboardContribution(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'WHITEBOARD_CONTRIBUTION',
          }),
        })
      );
    });
  });

  describe('memoContribution', () => {
    it('should index a MEMO_CONTRIBUTION document', async () => {
      const contribution = { id: 'memo-1', name: 'Memo', space: 'root' };
      service.memoContribution(contribution, { isAnonymous: true });

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ type: 'MEMO_CONTRIBUTION' }),
        })
      );
    });
  });

  describe('pollVoteContribution', () => {
    it('should index a POLL_VOTE_CONTRIBUTION document', async () => {
      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'user@example.com',
      });

      service.pollVoteContribution(
        { id: 'poll-1', name: 'Weekly planning poll', space: 'space-root' },
        { actorID: 'user-1' }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'POLL_VOTE_CONTRIBUTION',
            id: 'poll-1',
            name: 'Weekly planning poll',
            space: 'space-root',
            author: 'user-1',
          }),
        })
      );
    });
  });

  describe('pollResponseAddedContribution', () => {
    it('should index a POLL_RESPONSE_ADDED_CONTRIBUTION document', async () => {
      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'user@example.com',
      });

      service.pollResponseAddedContribution(
        { id: 'poll-2', name: 'Roadmap priorities poll', space: 'space-root' },
        { actorID: 'user-1' }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'POLL_RESPONSE_ADDED_CONTRIBUTION',
            id: 'poll-2',
            name: 'Roadmap priorities poll',
            space: 'space-root',
            author: 'user-1',
          }),
        })
      );
    });
  });

  describe('calloutPollCreated', () => {
    it('should index a CALLOUT_POLL_CREATED document', async () => {
      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'user@example.com',
      });

      service.calloutPollCreated(
        { id: 'callout-1', name: 'Q2 planning poll', space: 'space-root' },
        { actorID: 'user-1' }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CALLOUT_POLL_CREATED',
            id: 'callout-1',
            name: 'Q2 planning poll',
            space: 'space-root',
            author: 'user-1',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle ElasticResponseError when index fails', async () => {
      mockActorService.getActorOrNull.mockResolvedValue(null);
      mockIndex.mockRejectedValue({
        meta: { statusCode: { '500': {} } },
        name: 'ResponseError',
        message: 'Internal Server Error',
        stack: 'Error: ...',
      });

      service.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { isAnonymous: true }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle ErrorResponseBase when index fails', async () => {
      mockActorService.getActorOrNull.mockResolvedValue(null);
      mockIndex.mockRejectedValue({
        status: 400,
        error: { type: 'mapper_parsing_exception' },
      });

      service.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { isAnonymous: true }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle standard Error when index fails', async () => {
      mockActorService.getActorOrNull.mockResolvedValue(null);
      mockIndex.mockRejectedValue(new Error('Connection refused'));

      service.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { isAnonymous: true }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle unknown error when index fails', async () => {
      mockActorService.getActorOrNull.mockResolvedValue(null);
      mockIndex.mockRejectedValue('unknown error string');

      service.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { isAnonymous: true }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });
    });

    it('should return undefined when no client is provided', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContributionReporterService,
          MockWinstonProvider,
          MockConfigService,
          {
            provide: ELASTICSEARCH_CLIENT_PROVIDER,
            useValue: undefined,
          },
          {
            provide: ActorService,
            useValue: mockActorService,
          },
          {
            provide: UserLookupService,
            useValue: mockUserLookupService,
          },
        ],
      }).compile();

      const svcNoClient = module.get<ContributionReporterService>(
        ContributionReporterService
      );

      // Should not throw, just return early
      svcNoClient.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { isAnonymous: true }
      );

      // Give it a tick to run
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockIndex).not.toHaveBeenCalled();
    });

    it('should handle user lookup failure gracefully', async () => {
      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockRejectedValue(
        new Error('User not found')
      );

      service.spaceJoined(
        { id: 'space-1', name: 'Space', space: 'root' },
        { actorID: 'user-1' }
      );

      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            author: 'user-1',
            anonymous: false,
            alkemio: false,
            guest: false,
          }),
        })
      );
    });
  });

  describe('mediaGalleryContribution', () => {
    it('should index a document with MEDIA_GALLERY_CONTRIBUTION type', async () => {
      const contribution = {
        id: 'gallery-1',
        name: 'Media Gallery of Test Callout',
        space: 'space-root',
      };
      const details = { actorID: 'user-1' };

      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-1',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'user@example.com',
      });

      service.mediaGalleryContribution(contribution, details);

      // Allow the async createDocument to complete
      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'MEDIA_GALLERY_CONTRIBUTION',
            id: 'gallery-1',
            name: 'Media Gallery of Test Callout',
            author: 'user-1',
            space: 'space-root',
            anonymous: false,
            guest: false,
            alkemio: false,
          }),
        })
      );
    });

    it('should index a document with anonymous user', async () => {
      const contribution = {
        id: 'gallery-2',
        name: 'Anonymous Gallery',
        space: 'space-root',
      };
      const actorContext = {};

      service.mediaGalleryContribution(contribution, actorContext);

      // Allow the async createDocument to complete
      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'MEDIA_GALLERY_CONTRIBUTION',
            id: 'gallery-2',
            name: 'Anonymous Gallery',
            space: 'space-root',
            anonymous: true,
            guest: false,
            alkemio: false,
          }),
        })
      );
    });

    it('should index a document with guest user', async () => {
      const contribution = {
        id: 'gallery-3',
        name: 'Guest Gallery',
        space: 'space-root',
      };
      const actorContext = { guestName: 'Guest User' };

      service.mediaGalleryContribution(contribution, actorContext);

      // Allow the async createDocument to complete
      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'MEDIA_GALLERY_CONTRIBUTION',
            id: 'gallery-3',
            name: 'Guest Gallery',
            space: 'space-root',
            anonymous: false,
            guest: true,
            guestName: 'Guest User',
            alkemio: false,
          }),
        })
      );
    });

    it('should index a document with Alkemio team member', async () => {
      const contribution = {
        id: 'gallery-4',
        name: 'Alkemio Team Gallery',
        space: 'space-root',
      };
      const details = { actorID: 'user-alkemio' };

      mockActorService.getActorOrNull.mockResolvedValue({
        id: 'user-alkemio',
        type: ActorType.USER,
      });
      mockUserLookupService.getUserByIdOrFail.mockResolvedValue({
        email: 'team@alkem.io',
      });

      service.mediaGalleryContribution(contribution, details);

      // Allow the async createDocument to complete
      await vi.waitFor(() => {
        expect(mockIndex).toHaveBeenCalledTimes(1);
      });

      expect(mockIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'MEDIA_GALLERY_CONTRIBUTION',
            author: 'user-alkemio',
            anonymous: false,
            guest: false,
            alkemio: true,
          }),
        })
      );
    });
  });
});
