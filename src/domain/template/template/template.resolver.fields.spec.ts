import { TemplateType } from '@common/enums/template.type';
import { vi } from 'vitest';
import { ITemplate } from './template.interface';
import { TemplateResolverFields } from './template.resolver.fields';
import { TemplateService } from './template.service';

describe('TemplateResolverFields', () => {
  let resolver: TemplateResolverFields;
  let templateService: {
    getCommunityGuidelines: ReturnType<typeof vi.fn>;
    getCallout: ReturnType<typeof vi.fn>;
    getWhiteboard: ReturnType<typeof vi.fn>;
    getSpaceContent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    templateService = {
      getCommunityGuidelines: vi.fn(),
      getCallout: vi.fn(),
      getWhiteboard: vi.fn(),
      getSpaceContent: vi.fn(),
    };
    resolver = new TemplateResolverFields(
      templateService as unknown as TemplateService
    );
  });

  describe('communityGuidelines', () => {
    it('should return undefined when template type is not COMMUNITY_GUIDELINES', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
      } as ITemplate;

      const result = await resolver.communityGuidelines(template);

      expect(result).toBeUndefined();
      expect(templateService.getCommunityGuidelines).not.toHaveBeenCalled();
    });

    it('should call getCommunityGuidelines when template type is COMMUNITY_GUIDELINES', async () => {
      const guidelines = { id: 'cg-1' };
      templateService.getCommunityGuidelines.mockResolvedValue(guidelines);

      const template = {
        id: 'tpl-1',
        type: TemplateType.COMMUNITY_GUIDELINES,
      } as ITemplate;

      const result = await resolver.communityGuidelines(template);

      expect(result).toBe(guidelines);
      expect(templateService.getCommunityGuidelines).toHaveBeenCalledWith(
        'tpl-1'
      );
    });
  });

  describe('callout', () => {
    it('should return undefined when template type is not CALLOUT', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
      } as ITemplate;

      const result = await resolver.callout(template);

      expect(result).toBeUndefined();
    });

    it('should call getCallout when template type is CALLOUT', async () => {
      const callout = { id: 'co-1' };
      templateService.getCallout.mockResolvedValue(callout);

      const template = {
        id: 'tpl-1',
        type: TemplateType.CALLOUT,
      } as ITemplate;

      const result = await resolver.callout(template);

      expect(result).toBe(callout);
      expect(templateService.getCallout).toHaveBeenCalledWith('tpl-1');
    });
  });

  describe('whiteboard', () => {
    it('should return undefined when template type is not WHITEBOARD', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
      } as ITemplate;

      const result = await resolver.whiteboard(template);

      expect(result).toBeUndefined();
    });

    it('should call getWhiteboard when template type is WHITEBOARD', async () => {
      const whiteboard = { id: 'wb-1' };
      templateService.getWhiteboard.mockResolvedValue(whiteboard);

      const template = {
        id: 'tpl-1',
        type: TemplateType.WHITEBOARD,
      } as ITemplate;

      const result = await resolver.whiteboard(template);

      expect(result).toBe(whiteboard);
    });
  });

  describe('contentSpace', () => {
    it('should return undefined when template type is not SPACE', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
      } as ITemplate;

      const result = await resolver.contentSpace(template);

      expect(result).toBeUndefined();
    });

    it('should call getSpaceContent when template type is SPACE', async () => {
      const contentSpace = { id: 'tcs-1' };
      templateService.getSpaceContent.mockResolvedValue(contentSpace);

      const template = {
        id: 'tpl-1',
        type: TemplateType.SPACE,
      } as ITemplate;

      const result = await resolver.contentSpace(template);

      expect(result).toBe(contentSpace);
    });
  });
});
