import { TemplateType } from '@common/enums/template.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ITemplate } from '@domain/template/template/template.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mock, vi } from 'vitest';
import { TemplateNavigatorTool } from './template-navigator.tool';

describe('TemplateNavigatorTool', () => {
  let tool: TemplateNavigatorTool;
  let templateService: TemplateService;
  let authorizationService: AuthorizationService;
  let innovationPackRepository: { createQueryBuilder: Mock; findOne: Mock };

  const mockUserId = 'user-123';

  const createMockActorContext = (
    options: Partial<ActorContext> = {}
  ): ActorContext => {
    const agentInfo = new ActorContext();
    agentInfo.actorID = mockUserId;
    agentInfo.credentials = [];
    Object.assign(agentInfo, options);
    return agentInfo;
  };

  const createMockInnovationPack = (
    overrides: Partial<InnovationPack> = {}
  ): InnovationPack => {
    const pack = new InnovationPack();
    pack.id = `pack-${Math.random().toString(36).slice(2)}`;
    pack.nameID = 'test-pack';
    pack.listedInStore = true;
    pack.profile = {
      id: 'profile-1',
      displayName: 'Test Innovation Pack',
      description: 'A test pack for templates',
      tagsets: [{ name: 'default', tags: ['test'] }],
    } as any;
    pack.templatesSet = { id: 'templates-set-1' } as any;
    pack.authorization = { id: 'auth-1' } as any;
    Object.assign(pack, overrides);
    return pack;
  };

  const createMockTemplate = (overrides: Partial<ITemplate> = {}): ITemplate =>
    ({
      id: `template-${Math.random().toString(36).slice(2)}`,
      nameID: 'test-template',
      type: TemplateType.SPACE,
      profile: {
        id: 'profile-1',
        displayName: 'Test Template',
        description: 'A test template',
        tagsets: [{ name: 'default', tags: ['test', 'space'] }],
      },
      authorization: { id: 'auth-1' },
      ...overrides,
    }) as ITemplate;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseResultContent = (result: {
    content: Array<{ text?: string }>;
  }): any => {
    const text = result.content[0]?.text;
    if (!text) throw new Error('No text content in result');
    return JSON.parse(text);
  };

  beforeEach(async () => {
    // Create mock repository
    innovationPackRepository = {
      createQueryBuilder: vi.fn().mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      }),
      findOne: vi.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateNavigatorTool,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(InnovationPack),
          useValue: innovationPackRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    tool = module.get<TemplateNavigatorTool>(TemplateNavigatorTool);
    templateService = module.get<TemplateService>(TemplateService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('navigate_templates');
      expect(definition.description).toContain(
        'Navigate and discover templates'
      );
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
    });

    it('should define required action parameter', () => {
      const definition = tool.getDefinition();
      expect(definition.inputSchema.required).toContain('action');
    });

    it('should include all expected parameters', () => {
      const definition = tool.getDefinition();
      const properties = definition.inputSchema.properties as Record<
        string,
        unknown
      >;

      expect(properties).toHaveProperty('action');
      expect(properties).toHaveProperty('templateType');
      expect(properties).toHaveProperty('searchQuery');
      expect(properties).toHaveProperty('templateId');
      expect(properties).toHaveProperty('innovationPackId');
      expect(properties).toHaveProperty('outputMode');
      expect(properties).toHaveProperty('limit');
    });
  });

  describe('execute - list action', () => {
    it('should return message when no innovation packs found', async () => {
      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'list' }, agentInfo);

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.message).toContain('No accessible innovation packs');
    });

    it('should list templates from accessible packs', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [
        createMockTemplate({ type: TemplateType.SPACE }),
        createMockTemplate({ type: TemplateType.CALLOUT }),
      ];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'list' }, agentInfo);

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.summary.totalTemplates).toBe(2);
      expect(content.templates).toHaveLength(2);
    });

    it('should filter templates by type', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [
        createMockTemplate({ type: TemplateType.SPACE }),
        createMockTemplate({ type: TemplateType.CALLOUT }),
        createMockTemplate({ type: TemplateType.WHITEBOARD }),
      ];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'list', templateType: 'space' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.summary.totalTemplates).toBe(1);
      expect(content.templates[0].type).toBe(TemplateType.SPACE);
    });

    it('should respect limit parameter', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = Array.from({ length: 10 }, () =>
        createMockTemplate()
      );

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'list', limit: 3 },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.templates).toHaveLength(3);
    });

    it('should return detailed output when requested', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [createMockTemplate()];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'list', outputMode: 'detailed' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content).toHaveProperty('innovationPacks');
      expect(content).toHaveProperty('templates');
    });

    it('should return semantic output when requested', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [createMockTemplate()];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'list', outputMode: 'semantic' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content).toHaveProperty('stats');
      expect(content).toHaveProperty('interpretation');
      expect(content).toHaveProperty('byType');
    });
  });

  describe('execute - search action', () => {
    it('should return error when search query is missing', async () => {
      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'search' }, agentInfo);

      expect(result.isError).toBe(true);
      const content = parseResultContent(result);
      expect(content.error).toContain('Search query is required');
    });

    it('should search templates by name', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [
        createMockTemplate({
          profile: {
            displayName: 'Innovation Space Template',
            tagsets: [{ name: 'default', tags: ['innovation'] }],
          } as any,
        }),
        createMockTemplate({
          profile: {
            displayName: 'Basic Template',
            tagsets: [{ name: 'default', tags: ['basic'] }],
          } as any,
        }),
      ];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'search', searchQuery: 'innovation' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.query).toBe('innovation');
      expect(content.totalMatches).toBeGreaterThan(0);
    });

    it('should search templates by tags', async () => {
      const mockPack = createMockInnovationPack();
      const mockTemplates = [
        createMockTemplate({
          profile: {
            displayName: 'Space Template',
            tagsets: [{ name: 'default', tags: ['workspace', 'team'] }],
          } as any,
        }),
      ];

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockPack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue(
        mockTemplates
      );

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'search', searchQuery: 'team' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.totalMatches).toBe(1);
    });
  });

  describe('execute - details action', () => {
    it('should return error when template ID is missing', async () => {
      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'details' }, agentInfo);

      expect(result.isError).toBe(true);
      const content = parseResultContent(result);
      expect(content.error).toContain('Template ID is required');
    });

    it('should return template details', async () => {
      const mockTemplate = createMockTemplate({
        id: 'template-123',
        type: TemplateType.SPACE,
      });

      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue(
        mockTemplate
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'details', templateId: 'template-123' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.id).toBe('template-123');
      expect(content.type).toBe(TemplateType.SPACE);
      expect(content).toHaveProperty('usage');
    });

    it('should return error when user lacks access', async () => {
      const mockTemplate = createMockTemplate({
        id: 'template-123',
        authorization: { id: 'auth-1' } as any,
      });

      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue(
        mockTemplate
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'details', templateId: 'template-123' },
        agentInfo
      );

      expect(result.isError).toBe(true);
      const content = parseResultContent(result);
      expect(content.error).toContain('do not have access');
    });

    it('should surface the whiteboard scene for a whiteboard template', async () => {
      const scene = JSON.stringify({
        type: 'excalidraw',
        elements: [{ id: 'a', type: 'rectangle' }],
        files: {},
      });
      const mockTemplate = createMockTemplate({
        id: 'wb-template-1',
        type: TemplateType.WHITEBOARD,
      });

      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue(
        mockTemplate
      );
      // The Whiteboard entity's @AfterLoad already decompresses `content` to
      // plain Excalidraw JSON, so the tool receives a decompressed string.
      vi.mocked(templateService.getWhiteboard).mockResolvedValue({
        content: scene,
      } as any);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'details', templateId: 'wb-template-1' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.content.type).toBe('whiteboard');
      expect(content.content.hasContent).toBe(true);
      // Scene is surfaced as a JSON string that update_whiteboard_content accepts.
      expect(content.content.scene).toBe(scene);
      expect(JSON.parse(content.content.scene).elements).toHaveLength(1);
    });

    it('should degrade gracefully when the whiteboard scene is not valid JSON', async () => {
      const mockTemplate = createMockTemplate({
        id: 'wb-template-2',
        type: TemplateType.WHITEBOARD,
      });

      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue(
        mockTemplate
      );
      vi.mocked(templateService.getWhiteboard).mockResolvedValue({
        content: 'not-json{',
      } as any);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'details', templateId: 'wb-template-2' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.content.type).toBe('whiteboard');
      // hasContent is kept for back-compat; scene is omitted on parse failure.
      expect(content.content.hasContent).toBe(true);
      expect(content.content.scene).toBeUndefined();
    });

    it('should report no content for an empty whiteboard template', async () => {
      const mockTemplate = createMockTemplate({
        id: 'wb-template-3',
        type: TemplateType.WHITEBOARD,
      });

      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue(
        mockTemplate
      );
      vi.mocked(templateService.getWhiteboard).mockResolvedValue({
        content: '',
      } as any);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

      const agentInfo = createMockActorContext();
      const result = await tool.execute(
        { action: 'details', templateId: 'wb-template-3' },
        agentInfo
      );

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.content.type).toBe('whiteboard');
      expect(content.content.hasContent).toBe(false);
      expect(content.content.scene).toBeUndefined();
    });
  });

  describe('execute - error handling', () => {
    it('should return error for unknown action', async () => {
      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'unknown' }, agentInfo);

      expect(result.isError).toBe(true);
      const content = parseResultContent(result);
      expect(content.error).toContain('Unknown action');
    });

    it('should handle service errors gracefully', async () => {
      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'list' }, agentInfo);

      expect(result.isError).toBe(true);
      const content = parseResultContent(result);
      expect(content.error).toBe('Database error');
    });
  });

  describe('authorization', () => {
    it('should filter out packs user cannot access', async () => {
      const accessiblePack = createMockInnovationPack({
        id: 'pack-1',
        authorization: { id: 'auth-1' } as any,
      });
      const inaccessiblePack = createMockInnovationPack({
        id: 'pack-2',
        authorization: { id: 'auth-2' } as any,
      });

      innovationPackRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([accessiblePack, inaccessiblePack]),
      });

      vi.mocked(authorizationService.isAccessGranted).mockImplementation(
        (_, auth) => {
          return (auth as any)?.id === 'auth-1';
        }
      );

      vi.mocked(templateService.getTemplatesInTemplatesSet).mockResolvedValue([
        createMockTemplate(),
      ]);

      const agentInfo = createMockActorContext();
      const result = await tool.execute({ action: 'list' }, agentInfo);

      expect(result.isError).toBeFalsy();
      const content = parseResultContent(result);
      expect(content.summary.innovationPacks).toBe(1);
    });
  });
});
