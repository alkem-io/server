import { TemplateType } from '@common/enums/template.type';
import { vi } from 'vitest';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSetResolverFields } from './templates.set.resolver.fields';
import { TemplatesSetService } from './templates.set.service';

describe('TemplatesSetResolverFields', () => {
  let resolver: TemplatesSetResolverFields;
  let templatesSetService: {
    getTemplates: ReturnType<typeof vi.fn>;
    getTemplatesCount: ReturnType<typeof vi.fn>;
    getTemplatesOfType: ReturnType<typeof vi.fn>;
    getTemplatesCountForType: ReturnType<typeof vi.fn>;
  };

  const templatesSet = { id: 'ts-1' } as ITemplatesSet;

  beforeEach(() => {
    templatesSetService = {
      getTemplates: vi.fn(),
      getTemplatesCount: vi.fn(),
      getTemplatesOfType: vi.fn(),
      getTemplatesCountForType: vi.fn(),
    };
    resolver = new TemplatesSetResolverFields(
      templatesSetService as unknown as TemplatesSetService
    );
  });

  it('should resolve templates', async () => {
    const templates = [{ id: 'tpl-1' }];
    templatesSetService.getTemplates.mockResolvedValue(templates);

    const result = await resolver.templates(templatesSet);

    expect(result).toBe(templates);
    expect(templatesSetService.getTemplates).toHaveBeenCalledWith(templatesSet);
  });

  it('should resolve templatesCount', async () => {
    templatesSetService.getTemplatesCount.mockResolvedValue(5);

    const result = await resolver.templatesCount(templatesSet);

    expect(result).toBe(5);
  });

  it('should resolve calloutTemplates', async () => {
    const templates = [{ id: 'tpl-1' }];
    templatesSetService.getTemplatesOfType.mockResolvedValue(templates);

    const result = await resolver.calloutTemplates(templatesSet);

    expect(result).toBe(templates);
    expect(templatesSetService.getTemplatesOfType).toHaveBeenCalledWith(
      templatesSet,
      TemplateType.CALLOUT
    );
  });

  it('should resolve calloutTemplatesCount', async () => {
    templatesSetService.getTemplatesCountForType.mockResolvedValue(3);

    const result = await resolver.calloutTemplatesCount(templatesSet);

    expect(result).toBe(3);
    expect(templatesSetService.getTemplatesCountForType).toHaveBeenCalledWith(
      'ts-1',
      TemplateType.CALLOUT
    );
  });

  it('should resolve spaceTemplates', async () => {
    templatesSetService.getTemplatesOfType.mockResolvedValue([]);

    await resolver.spaceTemplates(templatesSet);

    expect(templatesSetService.getTemplatesOfType).toHaveBeenCalledWith(
      templatesSet,
      TemplateType.SPACE
    );
  });

  it('should resolve spaceTemplatesCount', async () => {
    templatesSetService.getTemplatesCountForType.mockResolvedValue(2);

    const result = await resolver.spaceTemplatesCount(templatesSet);

    expect(result).toBe(2);
  });

  it('should resolve communityGuidelinesTemplates', async () => {
    templatesSetService.getTemplatesOfType.mockResolvedValue([]);

    await resolver.communityGuidelinesTemplates(templatesSet);

    expect(templatesSetService.getTemplatesOfType).toHaveBeenCalledWith(
      templatesSet,
      TemplateType.COMMUNITY_GUIDELINES
    );
  });

  it('should resolve communityGuidelinesTemplatesCount', async () => {
    templatesSetService.getTemplatesCountForType.mockResolvedValue(1);

    const result =
      await resolver.communityGuidelinesTemplatesCount(templatesSet);

    expect(result).toBe(1);
  });

  it('should resolve postTemplates', async () => {
    templatesSetService.getTemplatesOfType.mockResolvedValue([]);

    await resolver.postTemplates(templatesSet);

    expect(templatesSetService.getTemplatesOfType).toHaveBeenCalledWith(
      templatesSet,
      TemplateType.POST
    );
  });

  it('should resolve postTemplatesCount', async () => {
    templatesSetService.getTemplatesCountForType.mockResolvedValue(4);

    const result = await resolver.postTemplatesCount(templatesSet);

    expect(result).toBe(4);
  });

  it('should resolve whiteboardTemplates', async () => {
    templatesSetService.getTemplatesOfType.mockResolvedValue([]);

    await resolver.whiteboardTemplates(templatesSet);

    expect(templatesSetService.getTemplatesOfType).toHaveBeenCalledWith(
      templatesSet,
      TemplateType.WHITEBOARD
    );
  });

  it('should resolve whiteboardTemplatesCount', async () => {
    templatesSetService.getTemplatesCountForType.mockResolvedValue(6);

    const result = await resolver.whiteboardTemplatesCount(templatesSet);

    expect(result).toBe(6);
  });
});
