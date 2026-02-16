import { SpaceLevel } from '@common/enums/space.level';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { spaceCommunityApplicationForm } from './definitions/space.community.role.application.form';
import { spaceCommunityRoles } from './definitions/space.community.roles';
import { subspaceCommunityApplicationForm } from './definitions/subspace.community.role.application.form';
import { subspaceCommunityRoles } from './definitions/subspace.community.roles';
import { SpaceDefaultsService } from './space.defaults.service';

describe('SpaceDefaultsService', () => {
  let service: SpaceDefaultsService;
  let templateService: TemplateService;
  let inputCreatorService: InputCreatorService;
  let calloutsSetService: CalloutsSetService;
  let platformTemplatesService: PlatformTemplatesService;
  let templatesManagerService: TemplatesManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceDefaultsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceDefaultsService);
    templateService = module.get(TemplateService);
    inputCreatorService = module.get(InputCreatorService);
    calloutsSetService = module.get(CalloutsSetService);
    platformTemplatesService = module.get(PlatformTemplatesService);
    templatesManagerService = module.get(TemplatesManagerService);
  });

  describe('getRoleSetCommunityRoles', () => {
    it('should return spaceCommunityRoles for L0 level', () => {
      // Act
      const result = service.getRoleSetCommunityRoles(SpaceLevel.L0);

      // Assert
      expect(result).toBe(spaceCommunityRoles);
    });

    it('should return subspaceCommunityRoles for L1 level', () => {
      // Act
      const result = service.getRoleSetCommunityRoles(SpaceLevel.L1);

      // Assert
      expect(result).toBe(subspaceCommunityRoles);
    });

    it('should return subspaceCommunityRoles for L2 level', () => {
      // Act
      const result = service.getRoleSetCommunityRoles(SpaceLevel.L2);

      // Assert
      expect(result).toBe(subspaceCommunityRoles);
    });

    it('should throw EntityNotInitializedException for invalid space level', () => {
      // Act & Assert
      expect(() => service.getRoleSetCommunityRoles(99 as SpaceLevel)).toThrow(
        'Invalid space level: 99'
      );
    });
  });

  describe('getRoleSetCommunityApplicationForm', () => {
    it('should return spaceCommunityApplicationForm for L0 level', () => {
      // Act
      const result = service.getRoleSetCommunityApplicationForm(SpaceLevel.L0);

      // Assert
      expect(result).toBe(spaceCommunityApplicationForm);
    });

    it('should return subspaceCommunityApplicationForm for L1 level', () => {
      // Act
      const result = service.getRoleSetCommunityApplicationForm(SpaceLevel.L1);

      // Assert
      expect(result).toBe(subspaceCommunityApplicationForm);
    });

    it('should return subspaceCommunityApplicationForm for L2 level', () => {
      // Act
      const result = service.getRoleSetCommunityApplicationForm(SpaceLevel.L2);

      // Assert
      expect(result).toBe(subspaceCommunityApplicationForm);
    });
  });

  describe('createCollaborationInput', () => {
    it('should throw RelationshipNotFoundException when template has no collaboration', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: null,
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: null,
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        service.createCollaborationInput(collaborationData, templateContent)
      ).rejects.toThrow('Collaboration not found');
    });

    it('should throw ValidationException when no innovation flow data and template provides none', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: null,
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: null,
          calloutsSetData: { calloutsData: [] },
        });

      // Act & Assert
      await expect(
        service.createCollaborationInput(collaborationData, templateContent)
      ).rejects.toThrow('No innovation flow data provided');
    });

    it('should throw RelationshipNotFoundException when innovation flow settings missing from template', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: {
          states: [{ displayName: 'state1' }],
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: { settings: undefined },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: {
            states: [],
            settings: {},
          },
          calloutsSetData: { calloutsData: [] },
        });

      // Act & Assert
      await expect(
        service.createCollaborationInput(collaborationData, templateContent)
      ).rejects.toThrow('Innovation flow settings not found in template');
    });

    it('should throw ValidationException when max < min number of states', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: {
          states: [{ displayName: 'state1' }],
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 1, minimumNumberOfStates: 5 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: { states: [], settings: {} },
          calloutsSetData: { calloutsData: [] },
        });

      // Act & Assert
      await expect(
        service.createCollaborationInput(collaborationData, templateContent)
      ).rejects.toThrow('Invalid min (5)/max (1) number of states.');
    });

    it('should truncate states when exceeding maximum', async () => {
      // Arrange
      const states = [
        { displayName: 's1' },
        { displayName: 's2' },
        { displayName: 's3' },
        { displayName: 's4' },
      ];
      const collaborationData = {
        innovationFlowData: {
          states,
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 2, minimumNumberOfStates: 1 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: { states: [], settings: {} },
          calloutsSetData: { calloutsData: [] },
        });
      calloutsSetService.moveCalloutsToDefaultFlowState = vi.fn();

      // Act
      const result = await service.createCollaborationInput(
        collaborationData,
        templateContent
      );

      // Assert
      expect(result.innovationFlowData!.states).toHaveLength(2);
      expect(result.innovationFlowData!.states[0].displayName).toBe('s1');
      expect(result.innovationFlowData!.states[1].displayName).toBe('s2');
    });

    it('should throw ValidationException when states fewer than minimum after processing', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: {
          states: [{ displayName: 's1' }],
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 3 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: { states: [], settings: {} },
          calloutsSetData: { calloutsData: [] },
        });

      // Act & Assert
      await expect(
        service.createCollaborationInput(collaborationData, templateContent)
      ).rejects.toThrow('Innovation flow must have at least 3 states.');
    });

    it('should clear callouts data when addCallouts is false', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: {
          states: [{ displayName: 's1' }, { displayName: 's2' }],
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [{ id: 'existing' }] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: { states: [], settings: {} },
          calloutsSetData: { calloutsData: [{ id: 'template-callout' }] },
        });
      calloutsSetService.moveCalloutsToDefaultFlowState = vi.fn();

      // Act
      const result = await service.createCollaborationInput(
        collaborationData,
        templateContent
      );

      // Assert
      expect(result.calloutsSetData.calloutsData).toEqual([]);
    });

    it('should call moveCalloutsToDefaultFlowState with valid flow state names', async () => {
      // Arrange
      const collaborationData = {
        innovationFlowData: {
          states: [{ displayName: 'active' }, { displayName: 'done' }],
          settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
        },
        calloutsSetData: { calloutsData: [] },
        addCallouts: false,
      } as any;
      const templateContent = {
        id: 'template-1',
        collaboration: {
          id: 'collab-1',
          innovationFlow: {
            settings: { maximumNumberOfStates: 8, minimumNumberOfStates: 1 },
          },
        },
      } as any;

      inputCreatorService.buildCreateCollaborationInputFromCollaboration = vi
        .fn()
        .mockResolvedValue({
          innovationFlowData: { states: [], settings: {} },
          calloutsSetData: { calloutsData: [] },
        });
      const moveCalloutsSpy = vi.fn();
      calloutsSetService.moveCalloutsToDefaultFlowState = moveCalloutsSpy;

      // Act
      await service.createCollaborationInput(
        collaborationData,
        templateContent
      );

      // Assert
      expect(moveCalloutsSpy).toHaveBeenCalledWith(['active', 'done'], []);
    });
  });

  describe('getTemplateSpaceContentToAugmentFrom', () => {
    it('should use provided spaceTemplateID when given', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-1',
        contentSpace: { id: 'content-1' },
      };
      templateService.getTemplateOrFail = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplateSpaceContentToAugmentFrom(
        SpaceLevel.L0,
        'template-1'
      );

      // Assert
      expect(result).toBe('content-1');
      expect(templateService.getTemplateOrFail).toHaveBeenCalledWith(
        'template-1'
      );
    });

    it('should throw ValidationException when template has no contentSpace', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-1',
        contentSpace: undefined,
      };
      templateService.getTemplateOrFail = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        service.getTemplateSpaceContentToAugmentFrom(
          SpaceLevel.L0,
          'template-1'
        )
      ).rejects.toThrow('Have template without template content space to use');
    });

    it('should use platform default for L0 when no templateID provided', async () => {
      // Arrange
      const mockTemplate = {
        id: 'platform-template',
        contentSpace: { id: 'platform-content' },
      };
      platformTemplatesService.getPlatformDefaultTemplateByType = vi
        .fn()
        .mockResolvedValue(mockTemplate);
      templateService.getTemplateOrFail = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplateSpaceContentToAugmentFrom(
        SpaceLevel.L0
      );

      // Assert
      expect(result).toBe('platform-content');
    });

    it('should throw ValidationException when no template found for level', async () => {
      // Arrange
      platformTemplatesService.getPlatformDefaultTemplateByType = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        service.getTemplateSpaceContentToAugmentFrom(SpaceLevel.L0)
      ).rejects.toThrow('Unable to get template content space to use');
    });

    it('should try space templates manager first for L1 then fall back to platform default', async () => {
      // Arrange
      const mockTemplatesManager = { id: 'tm-1' };
      const platformTemplate = {
        id: 'platform-subspace-template',
        contentSpace: { id: 'platform-subspace-content' },
      };

      templatesManagerService.getTemplateFromTemplateDefault = vi
        .fn()
        .mockRejectedValue(new Error('No default template'));
      platformTemplatesService.getPlatformDefaultTemplateByType = vi
        .fn()
        .mockResolvedValue(platformTemplate);
      templateService.getTemplateOrFail = vi
        .fn()
        .mockResolvedValue(platformTemplate);

      // Act
      const result = await service.getTemplateSpaceContentToAugmentFrom(
        SpaceLevel.L1,
        undefined,
        mockTemplatesManager as any
      );

      // Assert
      expect(result).toBe('platform-subspace-content');
      expect(
        templatesManagerService.getTemplateFromTemplateDefault
      ).toHaveBeenCalled();
    });
  });
});
