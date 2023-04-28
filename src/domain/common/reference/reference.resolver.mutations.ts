import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference/reference.interface';
import { DeleteReferenceInput } from '@domain/common/reference/reference.dto.delete';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.DELETE,
      `delete reference: ${reference.id}`
    );
    return await this.referenceService.deleteReference(deleteData);
  }
}
