import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { EcosystemModelService } from './ecosystem-model.service';
import {
  ActorGroup,
  CreateActorGroupInput,
  IActorGroup,
} from '@domain/context';
import { AuthorizationRoleGlobal } from '@common/enums';

@Resolver()
export class EcosystemModelResolverMutations {
  constructor(private ecosystemModelService: EcosystemModelService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => ActorGroup, {
    description: 'Create a new Actor Group on the EcosystemModel.',
  })
  @Profiling.api
  async createActorGroup(
    @Args('actorGroupData') actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.ecosystemModelService.createActorGroup(
      actorGroupData
    );
    return actorGroup;
  }
}
