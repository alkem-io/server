import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { RelationService } from './relation.service';

@Resolver()
export class RelationResolver {
  constructor(private relationService: RelationService) {}

  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the relation with the specified ID',
  })
  async removeRelation(@Args('ID') relationID: number): Promise<boolean> {
    return await this.relationService.removeRelation(relationID);
  }
}
