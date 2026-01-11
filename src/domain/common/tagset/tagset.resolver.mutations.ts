import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TagsetService } from './tagset.service';
import { CurrentActor } from '@common/decorators';
import { ITagset } from './tagset.interface';
import { UpdateTagsetInput } from './dto/tagset.dto.update';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateTagsetInput
  ): Promise<ITagset> {
    const tagset = await this.tagsetService.getTagsetOrFail(updateData.ID);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      tagset.authorization,
      AuthorizationPrivilege.UPDATE,
      `update tagset: ${tagset.id}`
    );
    return await this.tagsetService.updateTagset(updateData);
  }
}
