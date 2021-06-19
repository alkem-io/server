import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateUserInput,
  UpdateUserInput,
  IUser,
  DeleteUserInput,
} from '@domain/community/user';
import { UserService } from './user.service';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { UserAuthorizationService } from './user.service.authorization';
import { CommunicationService } from '@src/services/platform/communication/communication.service';
import { CommunicationSendMessageInput } from '@src/services/platform/communication/communication.dto.send.msg';

@Resolver(() => IUser)
export class UserResolverMutations {
  constructor(
    private readonly communicationService: CommunicationService,
    private authorizationEngine: AuthorizationEngineService,
    private readonly userService: UserService,
    private readonly userAuthorizationService: UserAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Creates a new User on the platform.',
  })
  @Profiling.api
  async createUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: CreateUserInput
  ): Promise<IUser> {
    const authorization = this.userAuthorizationService.createUserAuthorizationDefinition(
      agentInfo.email
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.CREATE,
      `create new User: ${agentInfo.email}`
    );
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('userData') userData: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(userData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteUserInput
  ): Promise<IUser> {
    const user = await this.userService.getUserOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
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
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const receiver = await this.userService.getUserOrFail(msgData.receiverID);

    return await this.communicationService.sendMsg(agentInfo.email, {
      ...msgData,
      receiverID: receiver.email,
    });
  }
}
