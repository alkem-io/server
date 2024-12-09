import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { IAiServer } from './ai.server.interface';
import { AiServerService } from './ai.server.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAiPersonaService } from '@services/ai-server/ai-persona-service';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@Resolver(() => IAiServer)
export class AiServerResolverFields {
  constructor(private aiServerService: AiServerService) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    description: 'The authorization policy for the aiServer',
    nullable: false,
  })
  authorization(@Parent() aiServer: IAiServer): IAuthorizationPolicy {
    return this.aiServerService.getAuthorizationPolicy(aiServer);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('defaultAiPersonaService', () => IAiPersonaService, {
    nullable: false,
    description: 'The default AiPersonaService in use on the aiServer.',
  })
  @UseGuards(GraphqlGuard)
  async defaultAiPersonaService(): Promise<IAiPersonaService> {
    return await this.aiServerService.getDefaultAiPersonaServiceOrFail();
  }

  @ResolveField(() => [IAiPersonaService], {
    nullable: false,
    description: 'The AiPersonaServices on this aiServer',
  })
  async aiPersonaServices(): Promise<IAiPersonaService[]> {
    return await this.aiServerService.getAiPersonaServices();
  }

  @ResolveField(() => IAiPersonaService, {
    nullable: false,
    description: 'A particular AiPersonaService',
  })
  async aiPersonaService(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IAiPersonaService> {
    return await this.aiServerService.getAiPersonaServiceOrFail(id);
  }
}
