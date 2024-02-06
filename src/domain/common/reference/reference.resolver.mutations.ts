import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference/reference.interface';
import { DeleteReferenceInput } from '@domain/common/reference/dto/reference.dto.delete';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ReferenceService } from './reference.service';
import { UpdateReferenceInput } from './dto/reference.dto.update';

@Resolver()
export class ReferenceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private referenceService: ReferenceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Updates the specified Reference.',
  })
  async updateReference(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('referenceData') referenceData: UpdateReferenceInput
  ): Promise<IReference> {
    const reference = await this.referenceService.getReferenceOrFail(
      referenceData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      reference.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Reference: ${reference.id}`
    );

    const updatedReference = await this.referenceService.updateReference(
      referenceData
    );
    return updatedReference;
  }

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
