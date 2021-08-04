import { Inject, UseGuards } from '@nestjs/common';
import { Resolver, Parent, ResolveField, Subscription } from '@nestjs/graphql';
import { User, IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { IAgent } from '@domain/agent/agent';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CommunicationService } from '@src/services/platform/communication/communication.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';
import { CommunityRoom } from '@services/platform/communication';
import { DirectRoom } from '@services/platform/communication/communication.room.dto.direct';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { PubSub } from 'apollo-server-express';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import {
  MESSAGE_RECEIVED_EVENT,
  ROOM_INVITATION_RECEIVED_EVENT,
} from '@services/platform/subscription/subscription.events';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private userService: UserService,
    private communicationService: CommunicationService,
    @Inject(PUB_SUB) private pubSub: PubSub
  ) {}

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user.id);
  }

  @ResolveField('communityRooms', () => [CommunityRoom], {
    nullable: true,
    description: 'The Community rooms this user is a member of',
  })
  @Profiling.api
  async communityRooms(@Parent() user: User): Promise<CommunityRoom[]> {
    return await this.communicationService.getCommunityRooms(user.email);
  }

  @ResolveField('directRooms', () => [DirectRoom], {
    nullable: true,
    description: 'The direct rooms this user is a member of',
  })
  @Profiling.api
  async directRooms(@Parent() user: User): Promise<DirectRoom[]> {
    return await this.communicationService.getDirectRooms(user.email);
  }

  @Subscription(() => CommunicationMessageReceived, {
    resolve: value => {
      return value;
    },
  })
  messageReceived() {
    return this.pubSub.asyncIterator(MESSAGE_RECEIVED_EVENT);
  }

  @Subscription(() => RoomInvitationReceived, {
    resolve: value => {
      return value;
    },
  })
  roomNotificationReceived() {
    return this.pubSub.asyncIterator(ROOM_INVITATION_RECEIVED_EVENT);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('email', () => String, {
    nullable: false,
    description: 'The email address for this User.',
  })
  @Profiling.api
  async email(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    // Need to do inside rather than as decorator so can return a replacement string
    const accessGranted = await this.authorizationEngine.isAccessGranted(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.READ
    );
    if (accessGranted) {
      return user.email;
    }
    return 'not accessible';
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('phone', () => String, {
    nullable: false,
    description: 'The phone number for this User.',
  })
  @Profiling.api
  async phone(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const accessGranted = await this.authorizationEngine.isAccessGranted(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.READ
    );
    if (accessGranted) {
      return user.phone;
    }
    return 'not accessible';
  }
}
