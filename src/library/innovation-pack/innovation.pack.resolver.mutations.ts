import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { InnovationPackService } from './innovaton.pack.service';

import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationPack } from './innovation.pack.interface';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';

@Resolver()
export class InnovationPackResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description: 'Updates the InnovationPack.',
  })
  @Profiling.api
  async updateInnovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationPackData') innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        innovationPackData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationPack.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationPack: ${innovationPack.nameID}`
    );

    // ensure working with UUID
    innovationPackData.ID = innovationPack.id;

    return await this.innovationPackService.update(innovationPackData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description: 'Deletes the specified InnovationPack.',
  })
  async deleteInnovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationPack.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteInnovationPack: ${innovationPack.nameID}`
    );
    return await this.innovationPackService.deleteInnovationPack(deleteData);
  }
}
