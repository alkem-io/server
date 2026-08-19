import { AuthorizationCredential } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { IActivity } from '@platform/activity';
import { ActivityService } from '@platform/activity/activity.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { CommunityActivitySummaryTool } from './community-activity-summary.tool';

describe('CommunityActivitySummaryTool', () => {
  let tool: CommunityActivitySummaryTool;
  let activityService: ActivityService;
  let spaceLookupService: SpaceLookupService;
  let collaborationService: CollaborationService;
  let authorizationService: AuthorizationService;

  // Test data
  const mockUserId = 'user-123';
  const mockSpaceId = 'space-456';
  const mockCollaborationId = 'collab-789';

  const createMockActorContext = (
    options: Partial<ActorContext> = {}
  ): ActorContext => {
    const agentInfo = new ActorContext();
    agentInfo.actorID = mockUserId;
    agentInfo.credentials = [
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: mockSpaceId,
      },
    ];
    Object.assign(agentInfo, options);
    return agentInfo;
  };

  const createMockActivity = (overrides: Partial<IActivity> = {}): IActivity =>
    ({
      id: `activity-${Math.random().toString(36).slice(2)}`,
      type: ActivityEventType.CALLOUT_POST_CREATED,
      collaborationID: mockCollaborationId,
      triggeredBy: mockUserId,
      resourceID: 'resource-123',
      parentID: 'parent-123',
      visibility: true,
      createdDate: new Date(),
      updatedDate: new Date(),
      ...overrides,
    }) as IActivity;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseResultContent = (result: {
    content: Array<{ text?: string }>;
  }): any => {
    const text = result.content[0]?.text;
    if (!text) throw new Error('No text content in result');
    return JSON.parse(text);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunityActivitySummaryTool, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    tool = module.get<CommunityActivitySummaryTool>(
      CommunityActivitySummaryTool
    );
    activityService = module.get<ActivityService>(ActivityService);
    spaceLookupService = module.get<SpaceLookupService>(SpaceLookupService);
    collaborationService =
      module.get<CollaborationService>(CollaborationService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('community_activity_summary');
      expect(definition.description).toContain('summary of recent activity');
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
    });

    it('should include all expected parameters in schema', () => {
      const definition = tool.getDefinition();
      const properties = definition.inputSchema.properties as Record<
        string,
        unknown
      >;

      expect(properties).toHaveProperty('analysisType');
      expect(properties).toHaveProperty('limit');
      expect(properties).toHaveProperty('types');
      expect(properties).toHaveProperty('daysBack');
    });

    it('should define valid analysis types', () => {
      const definition = tool.getDefinition();
      const analysisType = (
        definition.inputSchema.properties as Record<string, { enum?: string[] }>
      ).analysisType;

      expect(analysisType.enum).toEqual(['summary', 'detailed', 'semantic']);
    });
  });

  describe('execute', () => {
    describe('authentication', () => {
      it('should return error when user is not authenticated', async () => {
        const agentInfo = createMockActorContext({ actorID: undefined });

        const result = await tool.execute({}, agentInfo);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Authentication required');
      });
    });

    describe('no memberships', () => {
      it('should return appropriate message when user has no space credentials', async () => {
        const agentInfo = createMockActorContext({ credentials: [] });

        const result = await tool.execute({}, agentInfo);

        expect(result.isError).toBeFalsy();
        const content = parseResultContent(result);
        expect(content.message).toContain('not a member of any communities');
      });
    });

    describe('with memberships', () => {
      beforeEach(() => {
        // Mock space lookup
        vi.mocked(spaceLookupService.getCollaborationOrFail).mockResolvedValue({
          id: mockCollaborationId,
          authorization: { id: 'auth-123' },
        } as any);

        vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
          id: mockSpaceId,
          nameID: 'test-space',
          about: {
            profile: {
              displayName: 'Test Space',
            },
          },
        } as any);

        // Mock authorization check
        vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

        // Mock collaboration service
        vi.mocked(
          collaborationService.getChildCollaborationsOrFail
        ).mockResolvedValue([]);
      });

      it('should return summary analysis by default', async () => {
        const mockActivities = [
          createMockActivity({ type: ActivityEventType.CALLOUT_POST_CREATED }),
          createMockActivity({ type: ActivityEventType.CALLOUT_POST_COMMENT }),
          createMockActivity({
            type: ActivityEventType.MEMBER_JOINED,
            triggeredBy: 'other-user',
          }),
        ];

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        const result = await tool.execute({}, agentInfo);

        expect(result.isError).toBeFalsy();
        const content = parseResultContent(result);

        expect(content).toHaveProperty('userId', mockUserId);
        expect(content).toHaveProperty('totalSpaces', 1);
        expect(content).toHaveProperty('summary');
        expect(content.summary).toHaveProperty('totalActivities', 3);
        expect(content.summary).toHaveProperty('myActivities', 2);
        expect(content).toHaveProperty('spaces');
        expect(content).toHaveProperty('hint');
      });

      it('should return detailed analysis when requested', async () => {
        const mockActivities = [
          createMockActivity({
            type: ActivityEventType.CALLOUT_POST_CREATED,
            description: 'New post created',
          }),
        ];

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        const result = await tool.execute(
          { analysisType: 'detailed' },
          agentInfo
        );

        expect(result.isError).toBeFalsy();
        const content = parseResultContent(result);

        expect(content).toHaveProperty('totalActivities');
        expect(content).toHaveProperty('recentActivities');
        expect(content).toHaveProperty('activitiesBySpace');
        expect(Array.isArray(content.recentActivities)).toBe(true);
      });

      it('should return semantic analysis when requested', async () => {
        const mockActivities = [
          createMockActivity({
            type: ActivityEventType.CALLOUT_POST_CREATED,
            description: 'New post about climate action',
          }),
          createMockActivity({
            type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
            description: 'New whiteboard for brainstorming',
          }),
        ];

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        const result = await tool.execute(
          { analysisType: 'semantic' },
          agentInfo
        );

        expect(result.isError).toBeFalsy();
        const content = parseResultContent(result);

        expect(content).toHaveProperty('stats');
        expect(content).toHaveProperty('interpretation');
        expect(content).toHaveProperty('spaces');
        expect(content).toHaveProperty('recentHighlights');
        expect(Array.isArray(content.interpretation)).toBe(true);
      });

      it('should filter activities by type when specified', async () => {
        const mockActivities = [
          createMockActivity({ type: ActivityEventType.CALLOUT_POST_CREATED }),
        ];

        const getActivitySpy = vi
          .mocked(activityService.getActivityForCollaborations)
          .mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        await tool.execute({ types: ['post-created'] }, agentInfo);

        expect(getActivitySpy).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            types: [ActivityEventType.CALLOUT_POST_CREATED],
          })
        );
      });

      it('should respect limit parameter', async () => {
        const mockActivities = Array.from({ length: 50 }, () =>
          createMockActivity()
        );

        const getActivitySpy = vi
          .mocked(activityService.getActivityForCollaborations)
          .mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        await tool.execute({ limit: 10 }, agentInfo);

        expect(getActivitySpy).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            limit: 10,
          })
        );
      });

      it('should cap limit at maximum of 100', async () => {
        const getActivitySpy = vi
          .mocked(activityService.getActivityForCollaborations)
          .mockResolvedValue([]);

        const agentInfo = createMockActorContext();
        await tool.execute({ limit: 500 }, agentInfo);

        expect(getActivitySpy).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            limit: 100,
          })
        );
      });

      it('should filter activities by daysBack parameter', async () => {
        const recentActivity = createMockActivity({
          createdDate: new Date(), // Today
        });
        const oldActivity = createMockActivity({
          createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        });

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue([recentActivity, oldActivity]);

        const agentInfo = createMockActorContext();
        const result = await tool.execute({ daysBack: 30 }, agentInfo);

        const content = parseResultContent(result);
        // Only the recent activity should be included
        expect(content.summary.totalActivities).toBe(1);
      });

      it('should identify top contributors correctly', async () => {
        const mockActivities = [
          createMockActivity({ triggeredBy: 'user-a' }),
          createMockActivity({ triggeredBy: 'user-a' }),
          createMockActivity({ triggeredBy: 'user-a' }),
          createMockActivity({ triggeredBy: 'user-b' }),
          createMockActivity({ triggeredBy: 'user-b' }),
          createMockActivity({ triggeredBy: 'user-c' }),
        ];

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        const result = await tool.execute({}, agentInfo);

        const content = parseResultContent(result);
        const topContributors = content.spaces[0].topContributors;

        expect(topContributors).toBeDefined();
        expect(topContributors[0].userId).toBe('user-a');
        expect(topContributors[0].count).toBe(3);
      });

      it('should calculate participation rate correctly in semantic mode', async () => {
        const mockActivities = [
          createMockActivity({ triggeredBy: mockUserId }),
          createMockActivity({ triggeredBy: mockUserId }),
          createMockActivity({ triggeredBy: 'other-user' }),
          createMockActivity({ triggeredBy: 'other-user' }),
        ];

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockResolvedValue(mockActivities);

        const agentInfo = createMockActorContext();
        const result = await tool.execute(
          { analysisType: 'semantic' },
          agentInfo
        );

        const content = parseResultContent(result);

        // 2 out of 4 = 50%
        expect(content.interpretation).toContain(
          'Your participation rate: 50%'
        );
      });
    });

    describe('error handling', () => {
      it('should handle space lookup errors gracefully', async () => {
        vi.mocked(spaceLookupService.getCollaborationOrFail).mockRejectedValue(
          new Error('Space not found')
        );

        const agentInfo = createMockActorContext();
        const result = await tool.execute({}, agentInfo);

        // Should not throw, but return empty result
        expect(result.isError).toBeFalsy();
        const content = parseResultContent(result);
        expect(content.message).toContain('not a member of any communities');
      });

      it('should handle activity service errors', async () => {
        vi.mocked(spaceLookupService.getCollaborationOrFail).mockResolvedValue({
          id: mockCollaborationId,
          authorization: { id: 'auth-123' },
        } as any);

        vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
          id: mockSpaceId,
          nameID: 'test-space',
          about: { profile: { displayName: 'Test Space' } },
        } as any);

        vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

        vi.mocked(
          collaborationService.getChildCollaborationsOrFail
        ).mockResolvedValue([]);

        vi.mocked(
          activityService.getActivityForCollaborations
        ).mockRejectedValue(new Error('Database error'));

        const agentInfo = createMockActorContext();
        const result = await tool.execute({}, agentInfo);

        // Should still return a result, but with empty activities for that space
        expect(result.isError).toBeFalsy();
      });
    });

    describe('authorization', () => {
      it('should skip spaces where user lacks read access', async () => {
        vi.mocked(spaceLookupService.getCollaborationOrFail).mockResolvedValue({
          id: mockCollaborationId,
          authorization: { id: 'auth-123' },
        } as any);

        // User doesn't have read access
        vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

        const agentInfo = createMockActorContext();
        const result = await tool.execute({}, agentInfo);

        const content = parseResultContent(result);
        expect(content.message).toContain('not a member of any communities');
      });
    });
  });
});
