import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorization/authorization.roles';
import { GqlAuthGuard } from '@utils/authorization/graphql.guard';
import { Roles } from '@utils/authorization/roles.decorator';
import { ReferenceService } from './reference.service';

@Resolver()
export class ReferenceResolver {
  constructor(private referenceService: ReferenceService) {}

  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the reference  with the specified ID',
  })
  async removeReference(@Args('ID') referenceID: number): Promise<boolean> {
    return await this.referenceService.removeReference(referenceID);
  }
}
