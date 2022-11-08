import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AspectService } from './aspect.service';
import {
  DeleteAspectInput,
  UpdateAspectInput,
  IAspect,
} from '@domain/collaboration/aspect';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CreateReferenceOnAspectInput } from './dto/aspect.dto.create.reference';
import { IReference } from '@domain/common/reference/reference.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ReferenceService } from '@domain/common/reference/reference.service';

@Resolver()
export class AspectResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aspectService: AspectService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private referenceService: ReferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAspectInput
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.DELETE,
      `delete aspect: ${aspect.displayName}`
    );
    return await this.aspectService.deleteAspect(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Updates the specified Aspect.',
  })
  async updateAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(aspectData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.UPDATE,
      `update aspect: ${aspect.nameID}`
    );
    return await this.aspectService.updateAspect(aspectData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Creates a new Reference on the specified Aspect.',
  })
  async createReferenceOnAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceData') referenceInput: CreateReferenceOnAspectInput
  ): Promise<IReference> {
    const aspect = await this.aspectService.getAspectOrFail(
      referenceInput.aspectID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.CREATE,
      `create reference on aspect: ${aspect.id}`
    );
    const reference = await this.aspectService.createReference(referenceInput);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        aspect.authorization
      );
    return await this.referenceService.saveReference(reference);
  }
}
