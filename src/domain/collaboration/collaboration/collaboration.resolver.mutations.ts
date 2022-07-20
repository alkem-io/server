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
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';

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
  async createRelation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('relationData') relationData: CreateRelationInput
  ): Promise<IRelation> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        relationData.parentID
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
    const relation = await this.collaborationService.createRelation(
      relationData
    );
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
}
