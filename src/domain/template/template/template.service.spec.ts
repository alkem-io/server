import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { TemplateContentSpaceService } from '../template-content-space/template.content.space.service';
import { TemplateDefault } from '../template-default/template.default.entity';
import { Template } from './template.entity';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('TemplateService', () => {
  let service: TemplateService;
  let profileService: Mocked<ProfileService>;
  let communityGuidelinesService: Mocked<CommunityGuidelinesService>;
  let whiteboardService: Mocked<WhiteboardService>;
  let templateContentSpaceService: Mocked<TemplateContentSpaceService>;
  let calloutService: Mocked<CalloutService>;
  let calloutsSetService: Mocked<CalloutsSetService>;
  let db: any;

  beforeEach(async () => {
    // Mock static Template.create to avoid DataSource requirement
    vi.spyOn(Template, 'create').mockImplementation((input: any) => {
      const entity = new Template();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateService);
    profileService = module.get(ProfileService) as Mocked<ProfileService>;
    communityGuidelinesService = module.get(
      CommunityGuidelinesService
    ) as Mocked<CommunityGuidelinesService>;
    whiteboardService = module.get(
      WhiteboardService
    ) as Mocked<WhiteboardService>;
    templateContentSpaceService = module.get(
      TemplateContentSpaceService
    ) as Mocked<TemplateContentSpaceService>;
    calloutService = module.get(CalloutService) as Mocked<CalloutService>;
    calloutsSetService = module.get(
      CalloutsSetService
    ) as Mocked<CalloutsSetService>;
    db = module.get(DRIZZLE);
  });

  describe('getTemplateOrFail', () => {
    it('should return the template when exactly one is found', async () => {
      const expected = { id: 'tpl-1', type: TemplateType.POST } as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplateOrFail('tpl-1');

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when no template is found', async () => {

      await expect(service.getTemplateOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when multiple templates are found', async () => {

      await expect(service.getTemplateOrFail('duplicated')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass options and merge where clause with the ID', async () => {
      const expected = { id: 'tpl-1' } as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(expected);

      await service.getTemplateOrFail('tpl-1', {
        relations: { profile: true },
        where: { type: TemplateType.POST },
      });

    });
  });

  describe('createTemplate', () => {
    const baseInput = (
      type: TemplateType,
      overrides: Record<string, any> = {}
    ) => ({
      type,
      profileData: {
        displayName: 'Test Template',
        visuals: [],
      },
      tags: ['tag1'],
      ...overrides,
    });

    const storageAggregator = {} as any;

    beforeEach(() => {
      profileService.createProfile.mockResolvedValue({
        id: 'profile-1',
      } as any);
      profileService.addOrUpdateTagsetOnProfile.mockResolvedValue({} as any);
      profileService.addVisualsOnProfile.mockResolvedValue({} as any);
    });

    it('should throw ValidationException for POST type when no description provided', async () => {
      await expect(
        service.createTemplate(
          baseInput(TemplateType.POST) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create a POST template with default description', async () => {
      const input = baseInput(TemplateType.POST, {
        postDefaultDescription: 'Default post desc',
      });

      db.returning.mockResolvedValueOnce([{ ...input, id: 'tpl-1', postDefaultDescription: 'Default post desc' }]);

      const result = await service.createTemplate(
        input as any,
        storageAggregator
      );

      expect(result.postDefaultDescription).toBe('Default post desc');
    });

    it('should throw ValidationException for COMMUNITY_GUIDELINES type when no guidelines provided', async () => {
      await expect(
        service.createTemplate(
          baseInput(TemplateType.COMMUNITY_GUIDELINES) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create a COMMUNITY_GUIDELINES template with guidelines data', async () => {
      const guidelinesInput = { profile: { displayName: 'Guidelines' } };
      communityGuidelinesService.createCommunityGuidelines.mockResolvedValue({
        id: 'cg-1',
      } as any);

      const input = baseInput(TemplateType.COMMUNITY_GUIDELINES, {
        communityGuidelinesData: guidelinesInput,
      });

      db.returning.mockResolvedValueOnce([{ ...input, id: 'tpl-1', communityGuidelines: { id: 'cg-1' } }]);

      const result = await service.createTemplate(
        input as any,
        storageAggregator
      );

      expect(result.communityGuidelines).toEqual({ id: 'cg-1' });
      expect(
        communityGuidelinesService.createCommunityGuidelines
      ).toHaveBeenCalledWith(guidelinesInput, storageAggregator);
    });

    it('should throw ValidationException for SPACE type when no contentSpaceData provided', async () => {
      await expect(
        service.createTemplate(
          baseInput(TemplateType.SPACE) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create a SPACE template and mark collaboration as template', async () => {
      templateContentSpaceService.createTemplateContentSpace.mockResolvedValue({
        id: 'tcs-1',
      } as any);

      const input = baseInput(TemplateType.SPACE, {
        contentSpaceData: {
          collaborationData: {
            calloutsSetData: { calloutsData: [] },
            innovationFlowData: { states: [{ displayName: 'State' }] },
          },
          about: {},
          subspaces: [],
        },
      });

      db.returning.mockResolvedValueOnce([{ ...input, id: 'tpl-1', contentSpace: { id: 'tcs-1' } }]);

      const result = await service.createTemplate(
        input as any,
        storageAggregator
      );

      expect(result.contentSpace).toEqual({ id: 'tcs-1' });
      expect(
        templateContentSpaceService.createTemplateContentSpace
      ).toHaveBeenCalled();
    });

    it('should throw ValidationException for WHITEBOARD type when no whiteboard provided', async () => {
      await expect(
        service.createTemplate(
          baseInput(TemplateType.WHITEBOARD) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create a WHITEBOARD template', async () => {
      whiteboardService.createWhiteboard.mockResolvedValue({
        id: 'wb-1',
      } as any);

      const input = baseInput(TemplateType.WHITEBOARD, {
        whiteboard: { content: '{}', previewSettings: {} },
      });

      db.returning.mockResolvedValueOnce([{ ...input, id: 'tpl-1', whiteboard: { id: 'wb-1' } }]);

      const result = await service.createTemplate(
        input as any,
        storageAggregator
      );

      expect(result.whiteboard).toEqual({ id: 'wb-1' });
    });

    it('should throw ValidationException for CALLOUT type when no callout provided', async () => {
      await expect(
        service.createTemplate(
          baseInput(TemplateType.CALLOUT) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should create a CALLOUT template and mark it as template', async () => {
      calloutService.createCallout.mockResolvedValue({ id: 'co-1' } as any);

      const calloutData = {
        nameID: '',
        isTemplate: false,
        sortOrder: 0,
      };
      const input = baseInput(TemplateType.CALLOUT, { calloutData });

      db.returning.mockResolvedValueOnce([{ id: 'tpl-1' }]);

      await service.createTemplate(input as any, storageAggregator);

      // The calloutData should have been mutated to set isTemplate=true
      expect(calloutData.isTemplate).toBe(true);
    });

    it('should throw ValidationException for unknown template type', async () => {
      await expect(
        service.createTemplate(
          baseInput('unknown' as TemplateType) as any,
          storageAggregator
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('updateTemplate', () => {
    it('should update profile when profile data is provided', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
        profile: { id: 'p-1' },
      } as unknown as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(template);

      profileService.updateProfile.mockResolvedValue({
        id: 'p-1',
        displayName: 'Updated',
      } as any);

      db.returning.mockResolvedValueOnce([template]);

      const _result = await service.updateTemplate(
        { id: 'tpl-1', type: TemplateType.POST } as ITemplate,
        { ID: 'tpl-1', profile: { displayName: 'Updated' } } as any
      );

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p-1' }),
        { displayName: 'Updated' }
      );
    });

    it('should update postDefaultDescription for POST templates', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.POST,
        profile: { id: 'p-1' },
        postDefaultDescription: 'old desc',
      } as unknown as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(template);
      db.returning.mockResolvedValueOnce([{ ...template, postDefaultDescription: 'new desc' }]);

      const result = await service.updateTemplate(
        { id: 'tpl-1', type: TemplateType.POST } as ITemplate,
        { ID: 'tpl-1', postDefaultDescription: 'new desc' } as any
      );

      expect(result.postDefaultDescription).toBe('new desc');
    });

    it('should update whiteboard content for WHITEBOARD templates', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.WHITEBOARD,
        profile: { id: 'p-1' },
        whiteboard: { id: 'wb-1', content: 'old content' },
      } as unknown as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(template);
      db.returning.mockResolvedValueOnce([{ ...template, whiteboard: { ...template.whiteboard, content: 'new content' } }]);

      const result = await service.updateTemplate(
        { id: 'tpl-1', type: TemplateType.WHITEBOARD } as ITemplate,
        { ID: 'tpl-1', whiteboardContent: 'new content' } as any
      );

      expect(result.whiteboard?.content).toBe('new content');
    });

    it('should not update postDefaultDescription when template type is not POST', async () => {
      const template = {
        id: 'tpl-1',
        type: TemplateType.WHITEBOARD,
        profile: { id: 'p-1' },
        whiteboard: { id: 'wb-1', content: 'content' },
      } as unknown as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(template);
      db.returning.mockResolvedValueOnce([template]);

      const result = await service.updateTemplate(
        { id: 'tpl-1', type: TemplateType.WHITEBOARD } as ITemplate,
        { ID: 'tpl-1', postDefaultDescription: 'should be ignored' } as any
      );

      expect(result.postDefaultDescription).toBeUndefined();
    });
  });

  describe('delete', () => {
    const makeTemplate = (
      type: TemplateType,
      overrides: Record<string, any> = {}
    ) =>
      ({
        id: 'tpl-1',
        type,
        profile: { id: 'p-1' },
        authorization: { id: 'auth-1' },
        ...overrides,
      }) as unknown as Template;

    beforeEach(() => {
      profileService.deleteProfile.mockResolvedValue({} as any);
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', profile: undefined, authorization: { id: 'auth-1' } });

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', profile: { id: 'p-1' }, authorization: undefined });

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete community guidelines for COMMUNITY_GUIDELINES template', async () => {
      const template = makeTemplate(TemplateType.COMMUNITY_GUIDELINES, {
        communityGuidelines: { id: 'cg-1' },
      });
      db.query.templates.findFirst.mockResolvedValueOnce(template);
      communityGuidelinesService.deleteCommunityGuidelines.mockResolvedValue(
        {} as any
      );

      await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(
        communityGuidelinesService.deleteCommunityGuidelines
      ).toHaveBeenCalledWith('cg-1');
      expect(profileService.deleteProfile).toHaveBeenCalledWith('p-1');
    });

    it('should throw RelationshipNotFoundException for COMMUNITY_GUIDELINES when guidelines are missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce(makeTemplate(TemplateType.COMMUNITY_GUIDELINES));

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete callout for CALLOUT template', async () => {
      const template = makeTemplate(TemplateType.CALLOUT, {
        callout: { id: 'co-1' },
      });
      db.query.templates.findFirst.mockResolvedValueOnce(template);
      calloutService.deleteCallout.mockResolvedValue({} as any);

      await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(calloutService.deleteCallout).toHaveBeenCalledWith('co-1');
    });

    it('should throw RelationshipNotFoundException for CALLOUT when callout is missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce(makeTemplate(TemplateType.CALLOUT));

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete whiteboard for WHITEBOARD template', async () => {
      const template = makeTemplate(TemplateType.WHITEBOARD, {
        whiteboard: { id: 'wb-1' },
      });
      db.query.templates.findFirst.mockResolvedValueOnce(template);
      whiteboardService.deleteWhiteboard.mockResolvedValue({} as any);

      await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
    });

    it('should throw RelationshipNotFoundException for WHITEBOARD when whiteboard is missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce(makeTemplate(TemplateType.WHITEBOARD));

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should delete content space for SPACE template', async () => {
      const template = makeTemplate(TemplateType.SPACE, {
        contentSpace: { id: 'tcs-1' },
      });
      db.query.templates.findFirst.mockResolvedValueOnce(template);
      templateContentSpaceService.deleteTemplateContentSpaceOrFail.mockResolvedValue(
        {} as any
      );

      await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(
        templateContentSpaceService.deleteTemplateContentSpaceOrFail
      ).toHaveBeenCalledWith('tcs-1');
    });

    it('should throw RelationshipNotFoundException for SPACE when contentSpace is missing', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce(makeTemplate(TemplateType.SPACE));

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should not delete any related entity for POST template type', async () => {
      const template = makeTemplate(TemplateType.POST);
      db.query.templates.findFirst.mockResolvedValueOnce(template);

      await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(
        communityGuidelinesService.deleteCommunityGuidelines
      ).not.toHaveBeenCalled();
      expect(calloutService.deleteCallout).not.toHaveBeenCalled();
      expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
      expect(
        templateContentSpaceService.deleteTemplateContentSpaceOrFail
      ).not.toHaveBeenCalled();
      expect(profileService.deleteProfile).toHaveBeenCalledWith('p-1');
    });

    it('should throw EntityNotFoundException for unrecognized template type', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce(makeTemplate('unknown' as TemplateType));

      await expect(
        service.delete({ id: 'tpl-1' } as ITemplate)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should restore template id after remove', async () => {
      const template = makeTemplate(TemplateType.POST);
      db.query.templates.findFirst.mockResolvedValueOnce(template);

      const result = await service.delete({ id: 'tpl-1' } as ITemplate);

      expect(result.id).toBe('tpl-1');
    });
  });

  describe('ensureCalloutsInValidGroupsAndStates', () => {
    it('should throw RelationshipNotFoundException when innovationFlow is missing', () => {
      const collaboration = {
        id: 'collab-1',
        innovationFlow: undefined,
        calloutsSet: { callouts: [] },
      } as any;

      expect(() =>
        service.ensureCalloutsInValidGroupsAndStates(collaboration)
      ).toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when calloutsSet.callouts is missing', () => {
      const collaboration = {
        id: 'collab-1',
        innovationFlow: { states: [] },
        calloutsSet: undefined,
      } as any;

      expect(() =>
        service.ensureCalloutsInValidGroupsAndStates(collaboration)
      ).toThrow(RelationshipNotFoundException);
    });

    it('should call moveCalloutsToDefaultFlowState with valid state names', () => {
      const collaboration = {
        id: 'collab-1',
        innovationFlow: {
          states: [{ displayName: 'Explore' }, { displayName: 'Develop' }],
        },
        calloutsSet: {
          callouts: [{ id: 'c-1' }],
        },
      } as any;

      service.ensureCalloutsInValidGroupsAndStates(collaboration);

      expect(
        calloutsSetService.moveCalloutsToDefaultFlowState
      ).toHaveBeenCalledWith(
        ['Explore', 'Develop'],
        collaboration.calloutsSet.callouts
      );
    });
  });

  describe('getCommunityGuidelines', () => {
    it('should return community guidelines when loaded', async () => {
      const guidelines = { id: 'cg-1' };

      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', communityGuidelines: guidelines });

      const result = await service.getCommunityGuidelines('tpl-1');

      expect(result).toBe(guidelines);
    });

    it('should throw RelationshipNotFoundException when guidelines are not loaded', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', communityGuidelines: undefined });

      await expect(service.getCommunityGuidelines('tpl-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getCallout', () => {
    it('should return callout when loaded', async () => {
      const callout = { id: 'co-1' };

      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', callout });

      const result = await service.getCallout('tpl-1');

      expect(result).toBe(callout);
    });

    it('should throw RelationshipNotFoundException when callout is not loaded', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', callout: undefined });

      await expect(service.getCallout('tpl-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getWhiteboard', () => {
    it('should return whiteboard when loaded', async () => {
      const whiteboard = { id: 'wb-1' };

      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', whiteboard });

      const result = await service.getWhiteboard('tpl-1');

      expect(result).toBe(whiteboard);
    });

    it('should throw RelationshipNotFoundException when whiteboard is not loaded', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', whiteboard: undefined });

      await expect(service.getWhiteboard('tpl-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getTemplateContentSpace', () => {
    it('should return content space when loaded', async () => {
      const contentSpace = { id: 'tcs-1', collaboration: {} };

      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', contentSpace });

      const result = await service.getTemplateContentSpace('tpl-1');

      expect(result).toBe(contentSpace);
    });

    it('should throw RelationshipNotFoundException when content space is not loaded', async () => {
      db.query.templates.findFirst.mockResolvedValueOnce({ id: 'tpl-1', contentSpace: undefined });

      await expect(service.getTemplateContentSpace('tpl-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getTemplateByNameIDInTemplatesSetOrFail', () => {
    it('should return the template when found by nameID', async () => {
      const expected = { id: 'tpl-1', nameID: 'my-template' } as Template;

      db.query.templates.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplateByNameIDInTemplatesSetOrFail(
        'ts-1',
        'my-template'
      );

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when template is not found by nameID', async () => {

      await expect(
        service.getTemplateByNameIDInTemplatesSetOrFail('ts-1', 'missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isTemplateInUseInTemplateDefault', () => {
    it('should return true when template defaults reference the template', async () => {
      db.query.templateDefaults.findMany.mockResolvedValueOnce([{ id: 'td-1' }]);

      const result = await service.isTemplateInUseInTemplateDefault('tpl-1');

      expect(result).toBe(true);

    });

    it('should return false when no template defaults reference the template', async () => {
      db.query.templateDefaults.findMany.mockResolvedValueOnce([]);

      const result = await service.isTemplateInUseInTemplateDefault('tpl-1');

      expect(result).toBe(false);
    });
  });
});
