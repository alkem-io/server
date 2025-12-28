import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';
import { ITagset } from '../tagset';
import { UpdateClassificationSelectTagsetValueInput } from './dto/classification.dto.update.select.tagset.value';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ClassificationService } from './classification.service';

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
    @CurrentUser() actorContext: ActorContext,
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
