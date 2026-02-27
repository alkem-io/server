import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { ITagset } from '../tagset';
import { ClassificationService } from './classification.service';
import { UpdateClassificationSelectTagsetValueInput } from './dto/classification.dto.update.select.tagset.value';

@InstrumentResolver()
@Resolver()
export class ClassificationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private classificationService: ClassificationService
  ) {}

  @Mutation(() => ITagset, {
    description: 'Updates a Tagset on a Classification.',
  })
  async updateClassificationTagset(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateClassificationSelectTagsetValueInput
  ): Promise<ITagset> {
    const classification =
      await this.classificationService.getClassificationOrFail(
        updateData.classificationID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      classification.authorization,
      AuthorizationPrivilege.UPDATE,
      `classification: ${classification.id}`
    );
    return await this.classificationService.updateSelectTagsetValue(updateData);
  }
}
