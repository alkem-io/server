import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAiPersona } from '@services/ai-server/ai-persona';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { IAiServer } from './ai.server.interface';
import { AiServerService } from './ai.server.service';

@Resolver(() => IAiServer)
export class AiServerResolverFields {
  constructor(private aiServerService: AiServerService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    description: 'The authorization policy for the aiServer',
    nullable: false,
  })
  authorization(@Parent() aiServer: IAiServer): IAuthorizationPolicy {
    return this.aiServerService.getAuthorizationPolicy(aiServer);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('defaultAiPersona', () => IAiPersona, {
    nullable: false,
    description: 'The default AiPersona in use on the aiServer.',
  })
  async defaultAiPersona(): Promise<IAiPersona> {
    return await this.aiServerService.getDefaultAiPersonaOrFail();
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(() => [IAiPersona], {
    nullable: false,
    description: 'The AiPersonas on this aiServer',
  })
  async aiPersonas(): Promise<IAiPersona[]> {
    return await this.aiServerService.getAiPersonas();
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(() => IAiPersona, {
    nullable: false,
    description: 'A particular AiPersona',
  })
  async aiPersona(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IAiPersona> {
    return await this.aiServerService.getAiPersonaOrFail(id);
  }
}
