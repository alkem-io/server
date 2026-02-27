import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
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
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateTagsetInput
  ): Promise<ITagset> {
    const tagset = await this.tagsetService.getTagsetOrFail(updateData.ID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      tagset.authorization,
      AuthorizationPrivilege.UPDATE,
      `update tagset: ${tagset.id}`
    );
    return await this.tagsetService.updateTagset(updateData);
  }
}
