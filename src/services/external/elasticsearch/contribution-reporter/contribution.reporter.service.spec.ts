import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { MockConfigService, MockWinstonProvider } from '@test/mocks';
import { vi } from 'vitest';
import { ContributionReporterService } from './contribution.reporter.service';

describe('ContributionReporterService', () => {
  let service: ContributionReporterService;
  let mockIndex: ReturnType<typeof vi.fn>;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    mockIndex = vi.fn().mockResolvedValue({ result: 'created' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionReporterService,
        MockWinstonProvider,
        MockConfigService,
        {
          provide: ELASTICSEARCH_CLIENT_PROVIDER,
          useValue: { index: mockIndex },
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
      const details = { id: 'user-1', email: 'user1@test.com' };

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
          }),
        })
      );
    });
  });
});
