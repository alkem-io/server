import { RelationshipNotFoundException } from '@common/exceptions';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from '@platform/platform/platform.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { PlatformTemplatesService } from './platform.templates.service';

describe('PlatformTemplatesService', () => {
  let service: PlatformTemplatesService;
  let platformService: PlatformService;
  let templatesManagerService: TemplatesManagerService;
  let templateService: TemplateService;
  let inputCreatorService: InputCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformTemplatesService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformTemplatesService);
    platformService = module.get(PlatformService);
    templatesManagerService = module.get(TemplatesManagerService);
    templateService = module.get(TemplateService);
    inputCreatorService = module.get(InputCreatorService);
  });

  describe('getCreateCalloutInputsFromTemplate', () => {
    it('should throw RelationshipNotFoundException when contentSpace has no collaboration', async () => {
      const template = { id: 'template-1' };
      const templateManager = { id: 'tm-1' };

      vi.mocked(platformService.getTemplatesManagerOrFail).mockResolvedValue(
        templateManager as any
      );
      vi.mocked(
        templatesManagerService.getTemplateFromTemplateDefault
      ).mockResolvedValue(template as any);
      vi.mocked(templateService.getTemplateContentSpace).mockResolvedValue({
        id: 'cs-1',
        collaboration: undefined,
      } as any);

      await expect(
        service.getCreateCalloutInputsFromTemplate('COLLABORATION' as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return callout inputs from the template collaboration', async () => {
      const template = { id: 'template-1' };
      const templateManager = { id: 'tm-1' };
      const calloutInputs = [{ displayName: 'Callout 1' }];

      vi.mocked(platformService.getTemplatesManagerOrFail).mockResolvedValue(
        templateManager as any
      );
      vi.mocked(
        templatesManagerService.getTemplateFromTemplateDefault
      ).mockResolvedValue(template as any);
      vi.mocked(templateService.getTemplateContentSpace).mockResolvedValue({
        id: 'cs-1',
        collaboration: { id: 'collab-1' },
      } as any);
      vi.mocked(
        inputCreatorService.buildCreateCollaborationInputFromCollaboration
      ).mockResolvedValue({
        calloutsSetData: { calloutsData: calloutInputs },
      } as any);

      const result = await service.getCreateCalloutInputsFromTemplate(
        'COLLABORATION' as any
      );

      expect(result).toBe(calloutInputs);
    });

    it('should return empty array when calloutsData is undefined', async () => {
      const template = { id: 'template-1' };
      const templateManager = { id: 'tm-1' };

      vi.mocked(platformService.getTemplatesManagerOrFail).mockResolvedValue(
        templateManager as any
      );
      vi.mocked(
        templatesManagerService.getTemplateFromTemplateDefault
      ).mockResolvedValue(template as any);
      vi.mocked(templateService.getTemplateContentSpace).mockResolvedValue({
        id: 'cs-1',
        collaboration: { id: 'collab-1' },
      } as any);
      vi.mocked(
        inputCreatorService.buildCreateCollaborationInputFromCollaboration
      ).mockResolvedValue({
        calloutsSetData: { calloutsData: undefined },
      } as any);

      const result = await service.getCreateCalloutInputsFromTemplate(
        'COLLABORATION' as any
      );

      expect(result).toEqual([]);
    });
  });
});
