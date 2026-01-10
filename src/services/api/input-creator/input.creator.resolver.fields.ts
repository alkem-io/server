import { Args, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { ActorContext } from '@core/actor-context';
import { InputCreatorQueryResults } from '@services/api/input-creator/dto';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { InputCreatorService } from './input.creator.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';

@Resolver(() => InputCreatorQueryResults)
export class InputCreatorResolverFields {
  constructor(
    private inputCreatorService: InputCreatorService,
    private collaborationService: CollaborationService,
    private authorizationService: AuthorizationService,
    private innovationFlowService: InnovationFlowService,
    private whiteboardService: WhiteboardService,
    private calloutService: CalloutService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  @ResolveField(() => CreateCommunityGuidelinesInput, {
    nullable: true,
    description: 'Create an input based on the provided Community Guidelines',
  })
  async communityGuidelines(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateCommunityGuidelinesInput> {
    const guidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(id, {
        relations: {
          authorization: true,
          profile: {
            references: true,
            location: true,
            tagsets: true,
          },
        },
      });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      guidelines.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator Community guidelines: ${guidelines.id}`
    );

    return this.inputCreatorService.buildCreateCommunityGuidelinesInputFromCommunityGuidelines(
      guidelines
    );
  }

  @ResolveField(() => CreateInnovationFlowInput, {
    nullable: true,
    description: 'Create an input based on the provided InnovationFlow',
  })
  async innovationFlow(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateInnovationFlowInput> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id, {
        relations: {
          authorization: true,
          profile: {
            references: true,
            location: true,
            tagsets: true,
          },
        },
      });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationFlow.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator InnovationFlow: ${innovationFlow.id}`
    );

    return this.inputCreatorService.buildCreateInnovationFlowInputFromInnovationFlow(
      innovationFlow
    );
  }

  @ResolveField(() => CreateCalloutInput, {
    nullable: true,
    description: 'Create an input based on the provided Callout',
  })
  async callout(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateCalloutInput> {
    const callout = await this.calloutService.getCalloutOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator callout: ${callout.id}`
    );

    return await this.inputCreatorService.buildCreateCalloutInputFromCallout(
      callout.id
    );
  }

  @ResolveField(() => CreateWhiteboardInput, {
    nullable: true,
    description: 'Create an input based on the provided Whiteboard',
  })
  async whiteboard(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateWhiteboardInput> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator whiteboard: ${whiteboard.id}`
    );

    const whiteboardInput =
      this.inputCreatorService.buildCreateWhiteboardInputFromWhiteboard(
        whiteboard
      );
    if (!whiteboardInput) {
      throw new RelationshipNotFoundException(
        `Unable to create input for whiteboard: ${whiteboard.id}`,
        LogContext.INPUT_CREATOR
      );
    }
    return whiteboardInput;
  }

  @ResolveField(() => CreateCollaborationInput, {
    nullable: true,
    description: 'Create an input based on the provided Collaboration',
  })
  async collaboration(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<CreateCollaborationInput> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator Collaboration: ${collaboration.id}`
    );

    return await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
      collaboration.id
    );
  }
}
