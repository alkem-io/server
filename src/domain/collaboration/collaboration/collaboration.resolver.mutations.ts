import { UseGuards, Inject } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RelationAuthorizationService } from '@domain/collaboration/relation/relation.service.authorization';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { ClientProxy } from '@nestjs/microservices';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { CreateCalloutOnCollaborationInput } from './dto/collaboration.dto.create.callout';

@Resolver()
export class CollaborationResolverMutations {
  constructor(
    private relationAuthorizationService: RelationAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createRelationOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('relationData') relationData: CreateRelationOnCollaborationInput
  ): Promise<IRelation> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        relationData.collaborationID
      );
    // Extend the authorization definition to use for creating the relation
    const authorization =
      this.relationAuthorizationService.localExtendAuthorizationPolicy(
        collaboration.authorization
      );
    // First check if the user has read access
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      `read relation: ${collaboration.id}`
    );
    // Then check if the user can create
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create relation: ${collaboration.id}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const oppAuthorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const relation =
      await this.collaborationService.createRelationOnCollaboration(
        relationData
      );
    // TODO: Fix interested in collaboration notification in separate task
    // const payload =
    //   this.notificationsPayloadBuilder.buildCommunityCollaborationInterestPayload(
    //     agentInfo.userID,
    //     collaboration
    //   );
    // this.notificationsClient.emit(
    //   EventType.COMMUNITY_COLLABORATION_INTEREST,
    //   payload
    // );
    return await this.relationAuthorizationService.applyAuthorizationPolicy(
      relation,
      oppAuthorization,
      agentInfo.userID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Opportunity.',
  })
  @Profiling.api
  async createCalloutOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('relationData') calloutData: CreateCalloutOnCollaborationInput
  ): Promise<IRelation> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        calloutData.collaborationID
      );
    // Extend the authorization definition to use for creating the relation
    const authorization =
      this.relationAuthorizationService.localExtendAuthorizationPolicy(
        collaboration.authorization
      );
    // First check if the user has read access
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.READ,
      `read callout: ${collaboration.id}`
    );
    // Then check if the user can create
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create callout: ${collaboration.id}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const oppAuthorization =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const callout =
      await this.collaborationService.createCalloutOnCollaboration(calloutData);

    return await this.relationAuthorizationService.applyAuthorizationPolicy(
      callout,
      oppAuthorization,
      agentInfo.userID
    );
  }
}
