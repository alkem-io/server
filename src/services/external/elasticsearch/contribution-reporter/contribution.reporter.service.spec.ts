import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { ActorType } from '@common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { ActorService } from '@domain/actor';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
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
