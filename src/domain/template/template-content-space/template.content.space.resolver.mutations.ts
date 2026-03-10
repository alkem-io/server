import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { UpdateTemplateContentSpaceInput } from './dto/template.content.space.dto.update';
import { ITemplateContentSpace } from './template.content.space.interface';
import { TemplateContentSpaceService } from './template.content.space.service';

@InstrumentResolver()
@Resolver()
export class TemplateContentSpaceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templateContentSpaceService: TemplateContentSpaceService
  ) {}

  @Mutation(() => ITemplateContentSpace, {
    description: 'Updates the TemplateContentSpace.',
  })
  async updateTemplateContentSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('templateContentSpaceData')
    templateContentSpaceData: UpdateTemplateContentSpaceInput
  ): Promise<ITemplateContentSpace> {
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceData.ID,
        {
          relations: {
            about: {
              profile: true,
            },
          },
        }
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templateContentSpace.authorization,
      AuthorizationPrivilege.UPDATE,
      `update TemplateContentSpace: ${templateContentSpace.id}`
    );

    const updatedTemplateContentSpace =
      await this.templateContentSpaceService.update(templateContentSpaceData);

    return updatedTemplateContentSpace;
  }
}
