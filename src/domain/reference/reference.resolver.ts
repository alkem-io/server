import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolver {
  constructor(private referenceService: ReferenceService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the reference  with the specified ID',
  })
  async removeReference(@Args('ID') referenceID: number): Promise<boolean> {
    return await this.referenceService.removeReference(referenceID);
  }
}
