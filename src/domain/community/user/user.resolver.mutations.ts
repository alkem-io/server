import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationGlobalRoles, GraphqlGuard } from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { CommunicationService } from '@src/services/communication/communication.service';
import { CommunicationSendMessageInput } from '@src/services/communication/communication.dto.send.msg';
import { AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UserInfo } from '@core/authentication';
import { UserAuthorizationService } from './user.service.authorization';
import { AuthorizationSelfRegistration } from '@core/authorization/decorators';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private readonly communicationService: CommunicationService,
    private authorizationEngine: AuthorizationEngineService,
    private readonly userService: UserService,
    private readonly userAuthorizationService: UserAuthorizationService
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
    let user = await this.userService.createUser(userData);
    user = await this.userAuthorizationService.grantCredentials(user);
    return await this.userAuthorizationService.applyAuthorizationRules(user);
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
      userInfo,
      user.authorization,
      AuthorizationPrivilege.UPDATE,
      `userUpdate: ${user.nameID}`
    );
    return await this.userService.updateUser(userData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Deletes the specified User.',
  })
  @Profiling.api
  async deleteUser(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      user.authorization,
      AuthorizationPrivilege.DELETE,
      `user delete: ${user.nameID}`
    );
    return await this.userService.deleteUser(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Sends a message on the specified User`s behalf and returns the room id',
  })
  @Profiling.api
  async message(
    @Args('msgData') msgData: CommunicationSendMessageInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<string> {
    const receiver = await this.userService.getUserOrFail(msgData.receiverID);

    return await this.communicationService.sendMsg(userInfo.email, {
      ...msgData,
      receiverID: receiver.email,
    });
  }
}
