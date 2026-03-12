import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { createMock } from '@golevelup/ts-vitest';
import { InputCreatorResolverFields } from './input.creator.resolver.fields';
import { InputCreatorService } from './input.creator.service';

const actorContext = { actorID: 'user-1' } as any;
const mockAuth = { id: 'auth-1' };

describe('InputCreatorResolverFields', () => {
  let resolver: InputCreatorResolverFields;
  let inputCreatorService: ReturnType<typeof createMock<InputCreatorService>>;
  let collaborationService: ReturnType<typeof createMock<CollaborationService>>;
  let whiteboardService: ReturnType<typeof createMock<WhiteboardService>>;
  let calloutService: ReturnType<typeof createMock<CalloutService>>;
  let guidelinesService: ReturnType<
    typeof createMock<CommunityGuidelinesService>
  >;
  let innovationFlowService: ReturnType<
    typeof createMock<InnovationFlowService>
  >;

  beforeEach(() => {
    inputCreatorService = createMock<InputCreatorService>();
    collaborationService = createMock<CollaborationService>();
    const authService = createMock<AuthorizationService>();
    innovationFlowService = createMock<InnovationFlowService>();
    whiteboardService = createMock<WhiteboardService>();
    calloutService = createMock<CalloutService>();
    guidelinesService = createMock<CommunityGuidelinesService>();

    guidelinesService.getCommunityGuidelinesOrFail.mockResolvedValue({
      id: 'guide-1',
      authorization: mockAuth,
    } as any);
    innovationFlowService.getInnovationFlowOrFail.mockResolvedValue({
      id: 'flow-1',
      authorization: mockAuth,
    } as any);
    calloutService.getCalloutOrFail.mockResolvedValue({
      id: 'callout-1',
      authorization: mockAuth,
    } as any);
    whiteboardService.getWhiteboardOrFail.mockResolvedValue({
      id: 'wb-1',
      authorization: mockAuth,
    } as any);
    collaborationService.getCollaborationOrFail.mockResolvedValue({
      id: 'collab-1',
      authorization: mockAuth,
    } as any);

    inputCreatorService.buildCreateCommunityGuidelinesInputFromCommunityGuidelines.mockReturnValue(
      { profile: {} } as any
    );
    inputCreatorService.buildCreateInnovationFlowInputFromInnovationFlow.mockResolvedValue(
      { profile: {} } as any
    );
    inputCreatorService.buildCreateCalloutInputFromCallout.mockResolvedValue(
      {} as any
    );
    inputCreatorService.buildCreateWhiteboardInputFromWhiteboard.mockReturnValue(
      { content: '' } as any
    );
    inputCreatorService.buildCreateCollaborationInputFromCollaboration.mockResolvedValue(
      {} as any
    );

    resolver = new InputCreatorResolverFields(
      inputCreatorService,
      collaborationService,
      authService,
      innovationFlowService,
      whiteboardService,
      calloutService,
      guidelinesService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve communityGuidelines', async () => {
    const result = await resolver.communityGuidelines(actorContext, 'guide-1');
    expect(result).toBeDefined();
    expect(guidelinesService.getCommunityGuidelinesOrFail).toHaveBeenCalledWith(
      'guide-1',
      expect.any(Object)
    );
  });

  it('should resolve innovationFlow', async () => {
    const result = await resolver.innovationFlow(actorContext, 'flow-1');
    expect(result).toBeDefined();
    expect(innovationFlowService.getInnovationFlowOrFail).toHaveBeenCalledWith(
      'flow-1',
      expect.any(Object)
    );
  });

  it('should resolve callout', async () => {
    const result = await resolver.callout(actorContext, 'callout-1');
    expect(result).toBeDefined();
    expect(calloutService.getCalloutOrFail).toHaveBeenCalledWith('callout-1');
  });

  it('should resolve whiteboard', async () => {
    const result = await resolver.whiteboard(actorContext, 'wb-1');
    expect(result).toBeDefined();
    expect(whiteboardService.getWhiteboardOrFail).toHaveBeenCalledWith('wb-1');
  });

  it('should throw when whiteboard input is null', async () => {
    inputCreatorService.buildCreateWhiteboardInputFromWhiteboard.mockReturnValue(
      undefined as any
    );
    await expect(resolver.whiteboard(actorContext, 'wb-1')).rejects.toThrow(
      RelationshipNotFoundException
    );
  });

  it('should resolve collaboration', async () => {
    const result = await resolver.collaboration(actorContext, 'collab-1');
    expect(result).toBeDefined();
    expect(collaborationService.getCollaborationOrFail).toHaveBeenCalledWith(
      'collab-1'
    );
  });
});
