import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { IAiPersona } from './ai.persona.interface';
import { AiPersonaService } from './ai.persona.service';
import { DeleteAiPersonaInput, UpdateAiPersonaInput } from './dto';

@InstrumentResolver()
@Resolver(() => IAiPersona)
export class AiPersonaResolverMutations {
  constructor(
    private aiPersonaService: AiPersonaService,
    private authorizationService: AuthorizationService
  ) {}

  @Mutation(() => IAiPersona, {
    description: 'Updates the specified AI Persona.',
  })
  async aiServerUpdateAiPersona(
    @CurrentActor() actorContext: ActorContext,
    @Args('aiPersonaData')
    aiPersonaServiceData: UpdateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersonaService = await this.aiPersonaService.getAiPersonaOrFail(
      aiPersonaServiceData.ID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      aiPersonaService.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${aiPersonaService.id}`
    );

    return await this.aiPersonaService.updateAiPersona(aiPersonaServiceData);
  }

  @Mutation(() => IAiPersona, {
    description: 'Deletes the specified AiPersona.',
  })
  async aiServerDeleteAiPersona(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteAiPersonaInput
  ): Promise<IAiPersona> {
    const aiPersonaService = await this.aiPersonaService.getAiPersonaOrFail(
      deleteData.ID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      aiPersonaService.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${aiPersonaService.id}`
    );
    return await this.aiPersonaService.deleteAiPersona(deleteData);
  }
}
