import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserFilterInput } from '@core/filtering';
import { PaginatedUsers, PaginationArgs } from '@core/pagination';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { UsersQueryArgs } from './dto/users.query.args';
import { IUser } from './user.interface';
import { UserService } from './user.service';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private userService: UserService
  ) {}

  @Query(() => [IUser], {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  async users(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: true }) args: UsersQueryArgs
  ): Promise<IUser[]> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${actorContext.actorID}`
    );
    return await this.userService.getUsersForQuery(args);
  }

  @Query(() => PaginatedUsers, {
    nullable: false,
    description: 'The users who have profiles on this platform',
  })
  async usersPaginated(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args({
      name: 'withTags',
      nullable: true,
      description: 'Return only users with tags',
    })
    withTags?: boolean,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `users query: ${actorContext.actorID}`
    );

    return this.userService.getPaginatedUsers(pagination, withTags, filter);
  }

  @Query(() => IUser, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  async user(
    @CurrentActor() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user query: ${actorContext.actorID}`
    );
    return await this.userService.getUserByIdOrFail(id);
  }
}
