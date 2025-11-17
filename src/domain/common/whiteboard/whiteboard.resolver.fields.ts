import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { Loader } from '@core/dataloader/decorators';
import { IProfile } from '../profile/profile.interface';
import { IWhiteboard } from './whiteboard.interface';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverFields {
  constructor(
    private whiteboardService: WhiteboardService,
    private whiteboardGuestAccessService: WhiteboardGuestAccessService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField(() => Boolean, {
    nullable: false,
    description: 'Whether the Whiteboard is multi-user enabled on Space level.',
  })
  public isMultiUser(@Parent() whiteboard: IWhiteboard): Promise<boolean> {
    return this.whiteboardService.isMultiUser(whiteboard.id);
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Whiteboard',
  })
  async createdBy(
    @Parent() whiteboard: IWhiteboard,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    const createdBy = whiteboard.createdBy;
    if (!createdBy) {
      this.logger?.warn(
        `CreatedBy not set on Whiteboard with id ${whiteboard.id}`,
        LogContext.COLLABORATION
      );
      return null;
    }

    return loader.load(createdBy);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Whiteboard.',
  })
  @Profiling.api
  async profile(
    @Parent() whiteboard: IWhiteboard,
    @Loader(ProfileLoaderCreator, { parentClassRef: Whiteboard })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(whiteboard.id);
  }

  @ResolveField(() => Boolean, {
    nullable: false,
    description:
      'Indicates whether guest collaborators are currently allowed via GLOBAL_GUEST permissions.',
  })
  async guestContributionsAllowed(
    @Parent() whiteboard: IWhiteboard
  ): Promise<boolean> {
    if (typeof whiteboard.guestContributionsAllowed === 'boolean') {
      return whiteboard.guestContributionsAllowed;
    }

    const whiteboardWithAuthorization =
      await this.whiteboardService.getWhiteboardOrFail(whiteboard.id, {
        loadEagerRelations: false,
        relations: {
          authorization: true,
        },
        select: {
          id: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
      });

    const value = this.whiteboardGuestAccessService.isGuestAccessEnabled(
      whiteboardWithAuthorization.authorization
    );

    whiteboard.guestContributionsAllowed = value;
    return value;
  }
}
