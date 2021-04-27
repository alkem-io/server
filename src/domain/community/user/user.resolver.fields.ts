import { Roles } from '@common/decorators/roles.decorator';
import { User } from '@domain/community/user/user.entity';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import {
  CommunicationRoomDetailsResult,
  CommunicationRoomResult,
} from '@src/services/communication';
import { CommunicationService } from '@src/services/communication/communication.service';
import { MemberOf } from './memberof.composite';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolverFields {
  constructor(
    private userService: UserService,
    private communicationService: CommunicationService
  ) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('memberof', () => MemberOf, {
    nullable: true,
    description:
      'An overview of the groups this user is a memberof. Note: all groups are returned without members to avoid recursion.',
  })
  @Profiling.api
  async membership(@Parent() user: User) {
    const memberships = await this.userService.getMemberOf(user);
    // Find all challenges the user is a member of
    return memberships;
  }

  @UseGuards(GqlAuthGuard)
  @ResolveField('rooms', () => [CommunicationRoomResult], {
    nullable: true,
    description: 'An overview of the rooms this user is a member of',
  })
  @Profiling.api
  async rooms(@Parent() user: User): Promise<CommunicationRoomResult[]> {
    return await this.communicationService.getRooms(user.email);
  }

  @UseGuards(GqlAuthGuard)
  @ResolveField('room', () => CommunicationRoomDetailsResult, {
    nullable: true,
    description: 'An overview of the rooms this user is a member of',
  })
  @Profiling.api
  async room(
    @Parent() user: User,
    @Args('roomID') roomID: string
  ): Promise<CommunicationRoomDetailsResult> {
    return await this.communicationService.getRoom(roomID, user.email);
  }
}
