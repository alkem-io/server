import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import {
  AuthorizationSelfManagement,
  AuthorizationGlobalRoles,
  GraphqlGuard,
  AuthorizationRolesGlobal,
} from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  User,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(private readonly userService: UserService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => User, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    return await this.userService.createUser(userData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @AuthorizationSelfManagement()
  @UseGuards(GraphqlGuard)
  @Mutation(() => User, {
    description: 'Updates the User. Note: email address cannot be updated.',
  })
  @Profiling.api
  async updateUser(
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.updateUser(userData);
    return user;
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => User, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    return await this.userService.deleteUser(deleteData);
  }
}
