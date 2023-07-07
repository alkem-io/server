import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TagsetService } from './tagset.service';
import { CurrentUser } from '@common/decorators';
import { ITagset } from './tagset.interface';
import { UpdateTagsetInput } from './dto/tagset.dto.update';

@Resolver()
export class TagsetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private tagsetService: TagsetService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITagset, {
    description: 'Updates the specified Tagset.',
  })
  async updateTagset(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateTagsetInput
  ): Promise<ITagset> {
    const tagset = await this.tagsetService.getTagsetOrFail(updateData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      tagset.authorization,
      AuthorizationPrivilege.UPDATE,
      `update tagset: ${tagset.id}`
    );
    return await this.tagsetService.updateTagset(updateData);
  }
}
