import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SpaceDefaultsService } from './space.defaults.service';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { UpdateSpaceDefaultsInput } from './dto/space.defaults.dto.update';
import { ISpaceDefaults } from './space.defaults.interface';

@Resolver()
export class SpaceDefaultsResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private spaceDefaultsService: SpaceDefaultsService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpaceDefaults, {
    description: 'Updates the specified SpaceDefaults.',
  })
  async updateSpaceDefaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceDefaultsData') spaceDefaultsData: UpdateSpaceDefaultsInput
  ): Promise<ISpaceDefaults> {
    const spaceDefaults =
      await this.spaceDefaultsService.getSpaceDefaultsOrFail(
        spaceDefaultsData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      spaceDefaults.authorization,
      AuthorizationPrivilege.UPDATE,
      `update spaceDefaults: ${spaceDefaults.id}`
    );
    return await this.spaceDefaultsService.updateSpaceDefaults(
      spaceDefaultsData
    );
  }
}
