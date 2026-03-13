import { RelationshipNotFoundException } from '@common/exceptions';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateContentSpaceService } from './template.content.space.service';
import { TemplateContentSpaceLicenseService } from './template.content.space.service.license';

describe('TemplateContentSpaceLicenseService', () => {
  let service: TemplateContentSpaceLicenseService;
  let templateContentSpaceService: Mocked<TemplateContentSpaceService>;
  let collaborationLicenseService: Mocked<CollaborationLicenseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateContentSpaceLicenseService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateContentSpaceLicenseService);
    templateContentSpaceService = module.get(
      TemplateContentSpaceService
    ) as Mocked<TemplateContentSpaceService>;
    collaborationLicenseService = module.get(
      CollaborationLicenseService
    ) as Mocked<CollaborationLicenseService>;
  });

  it('should throw RelationshipNotFoundException when collaboration is missing', async () => {
    templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
      {
        id: 'tcs-1',
        collaboration: undefined,
      } as any
    );

    await expect(service.applyLicensePolicy('tcs-1')).rejects.toThrow(
      RelationshipNotFoundException
    );
  });

  it('should create license and apply to collaboration', async () => {
    templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
      {
        id: 'tcs-1',
        collaboration: { id: 'collab-1' },
      } as any
    );

    const mockLicense = { id: 'license-1' } as any;
    templateContentSpaceService.createLicenseTemplateContentSpace.mockReturnValue(
      mockLicense
    );

    const collaborationLicenses = [{ id: 'collab-license' } as any];
    collaborationLicenseService.applyLicensePolicy.mockResolvedValue(
      collaborationLicenses
    );

    const result = await service.applyLicensePolicy('tcs-1');

    expect(
      templateContentSpaceService.createLicenseTemplateContentSpace
    ).toHaveBeenCalled();
    expect(collaborationLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
      'collab-1',
      mockLicense
    );
    expect(result).toEqual(collaborationLicenses);
  });
});
