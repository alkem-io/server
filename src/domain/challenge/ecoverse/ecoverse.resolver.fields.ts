import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';
import { Community } from '@domain/community/community';

@Resolver()
export class EcoverseResolverFields {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the ecoverse.',
  })
  @Profiling.api
  async community(@Parent() ecoverse: Ecoverse) {
    const community = await this.ecoverseService.loadCommunity(ecoverse.id);
    return community;
  }
}
