import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '../decorators/roles.decorator';
import { GqlAuthGuard } from '../authentication/graphql.guard';
import { RestrictedGroupNames } from '../../domain/user-group/user-group.entity';
import { AccountService } from './account.service';

@Resolver()
export class AccountResolver {
  constructor(private accountService: AccountService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Creates a new account on the identity provider for the user profile with the given ID and with the given one time password',
  })
  async createUserAccount(
    @Args('userID') userID: number,
    @Args('password') password: string
  ): Promise<boolean> {
    const success = await this.accountService.createUserAccount(
      userID,
      password
    );
    return success;
  }
}
