import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
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
