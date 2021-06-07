import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { DeleteReferenceInput, IReference } from '@domain/common/reference';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private referenceService: ReferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Deletes the specified Reference.',
  })
  async deleteReference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteReferenceInput
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.DELETE,
      `delete reference: ${reference.id}`
    );
    return await this.referenceService.deleteReference(deleteData);
  }
}
