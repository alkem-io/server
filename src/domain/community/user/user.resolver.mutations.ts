import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { SelfManagement } from '@common/decorators';
import {
  CreateUserInput,
  UpdateUserInput,
  User,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { CommunicationService } from '@src/services/communication/communication.service';
import { UserInfo } from '@core/authentication/user-info';
import { CommunicationSendMessageInput } from '@src/services/communication/communication.dto.send.msg';

@Resolver(() => User)
export class UserResolverMutations {
  constructor(
    private readonly userService: UserService,
    private readonly communicationService: CommunicationService
  ) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    return await this.userService.createUser(userData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @SelfManagement()
  @UseGuards(GqlAuthGuard)
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

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    return await this.userService.removeUser(deleteData);
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, {
    description: 'Sends a message on the specified User`s behalf.',
  })
  @Profiling.api
  async message(
    @Args('msgData') msgData: CommunicationSendMessageInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<void> {
    await this.communicationService.sendMsg(userInfo.email, msgData);
  }
}
