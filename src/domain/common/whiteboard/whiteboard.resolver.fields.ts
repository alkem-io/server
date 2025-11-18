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
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverFields {
  constructor(
    private whiteboardService: WhiteboardService,
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

  @ResolveField('guestContributionsAllowed', () => Boolean, {
    nullable: false,
    description:
      'Whether guest users are allowed to contribute to this Whiteboard.',
  })
  async guestContributionsAllowed(
    @Parent() whiteboard: Whiteboard
  ): Promise<boolean> {
    const authorization = whiteboard.authorization;
    if (!authorization || !authorization.credentialRules) {
      return false;
    }

    // Check if there's a credential rule for GLOBAL_GUEST
    const guestRule = authorization.credentialRules.find(rule =>
      rule.criterias.some(
        criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
      )
    );

    console.log({ guestRule });
    if (!guestRule) {
      return false;
    }

    // Check if the rule grants READ, UPDATE, and CONTRIBUTE privileges
    const requiredPrivileges = [
      AuthorizationPrivilege.READ,
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.UPDATE_CONTENT,
    ];

    const hasAllPrivileges = requiredPrivileges.every(privilege =>
      guestRule.grantedPrivileges.includes(privilege)
    );

    return hasAllPrivileges;
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
}
