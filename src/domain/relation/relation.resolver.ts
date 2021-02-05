import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { RelationService } from './relation.service';

@Resolver()
export class RelationResolver {
  constructor(private relationService: RelationService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the relation with the specified ID',
  })
  async removeRelation(@Args('ID') relationID: number): Promise<boolean> {
    return await this.relationService.removeRelation(relationID);
  }
}
