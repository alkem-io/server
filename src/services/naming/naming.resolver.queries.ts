import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { NamingService } from './naming.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';

@Resolver()
export class NamingResolverQueries {
  constructor(private namingService: NamingService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Query(() => Boolean, {
    nullable: false,
    description: 'Is the supplied nameID available? ',
  })
  @Profiling.api
  async isNameAvailable(@Args('nameID') nameID: string): Promise<boolean> {
    return await this.namingService, this.isNameAvailable(nameID);
  }
}
