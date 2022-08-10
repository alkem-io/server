import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RelationAuthorizationService } from '@domain/collaboration/relation/relation.service.authorization';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { CreateCalloutOnCollaborationInput } from './dto/collaboration.dto.create.callout';
import { DeleteCollaborationInput } from './dto/collaboration.dto.delete';
import { ICallout } from '../callout/callout.interface';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { ICollaboration } from './collaboration.interface';

@Resolver()
export class CollaborationResolverMutations {
  constructor(
    private relationAuthorizationService: RelationAuthorizationService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICollaboration, {
    description: 'Delete Collaboration.',
  })
  @Profiling.api
  async deleteCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCollaborationInput
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.DELETE,
      `delete collaboration: ${collaboration.id}`
    );
    return await this.collaborationService.deleteCollaboration(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRelation, {
    description: 'Create a new Relation on the Collaboration.',
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
      `read relation on collaboration: ${collaboration.id}`
    );
    // Then check if the user can create
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create relation on collaboration: ${collaboration.id}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const collaboriationAuthorizationPolicy =
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
      collaboriationAuthorizationPolicy,
      agentInfo.userID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Create a new Callout on the Collaboration.',
  })
  @Profiling.api
  async createCalloutOnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: CreateCalloutOnCollaborationInput
  ): Promise<ICallout> {
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
      `read callout on collaboration: ${collaboration.id}`
    );
    // Then check if the user can create
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE_CALLOUT,
      `create callout on collaboration: ${collaboration.id}`
    );
    // Load the authorization policy again to avoid the temporary extension above
    const collaboriationAuthorizationPolicy =
      await this.authorizationPolicyService.getAuthorizationPolicyOrFail(
        authorization.id
      );
    const callout =
      await this.collaborationService.createCalloutOnCollaboration(calloutData);

    return await this.calloutAuthorizationService.applyAuthorizationPolicy(
      callout,
      collaboriationAuthorizationPolicy
    );
  }
}
