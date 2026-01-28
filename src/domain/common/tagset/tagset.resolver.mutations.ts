import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { UpdateTagsetInput } from './dto/tagset.dto.update';
import { ITagset } from './tagset.interface';
import { TagsetService } from './tagset.service';

@InstrumentResolver()
@Resolver()
export class TagsetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private tagsetService: TagsetService
  ) {}

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
