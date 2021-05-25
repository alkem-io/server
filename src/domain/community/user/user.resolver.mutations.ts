import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  AuthorizationSelfRegistration,
  AuthorizationGlobalRoles,
  GraphqlGuard,
} from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UserInfo } from '@core/authentication';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private readonly userService: UserService
  ) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @AuthorizationSelfRegistration()
  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    return await this.userService.createUser(userData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Updates the User.',
  })
  @Profiling.api
  async updateUser(
    @CurrentUser() userInfo: UserInfo,
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(userData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo.credentials,
      user.authorizationRules,
      AuthorizationPrivilege.UPDATE,
      `userUpdate: ${user.nameID}`
    );
    return await this.userService.updateUser(userData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    return await this.userService.deleteUser(deleteData);
  }
}
